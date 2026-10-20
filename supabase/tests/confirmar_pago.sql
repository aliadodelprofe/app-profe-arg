-- ============================================================================
-- PRUEBA DE confirmar_pago  (migración 0006)
--
-- Esta función mueve plata: marca un pago como confirmado y reparte el monto
-- entre los cargos del alumno. Se prueban las cuatro cosas que importan:
--
--   1. que un profesor NO pueda confirmar el pago de otro
--   2. que el ALUMNO no pueda confirmarse el pago solo
--   3. que el profesor dueño SÍ pueda, y que reparta bien
--   4. que confirmar dos veces no impute la plata dos veces
--
-- Todo corre dentro de una sola transacción que se DESHACE al final, así que
-- la base queda igual que antes y la prueba se puede repetir sin límite.
--
-- REQUISITOS: aislamiento_cargos.sql y aislamiento_alumno.sql ya corridos
-- (crean el espacio de Profe 2, a "Alumno Portal" y su cargo de $5.000).
--
-- AVISO: dispara la alerta de "destructive operations" de Supabase. Es
-- esperable: la función que se está probando hace un update sobre payments.
-- No queda nada escrito.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Profe 2 registra que su alumno declaró una transferencia de $8.000
--
-- El cargo de $5.000 LO CREA ESTA PRUEBA.
--
-- Antes daba por hecho que el alumno ya tenía uno abierto, porque lo había
-- dejado otra prueba. Dejó de ser cierto: desde la 0021, asegurar_imputaciones
-- corre todas las noches y va cubriendo los cargos con la plata que haya a
-- favor. Cuando esta prueba corría, el alumno ya no debía nada, así que la
-- función imputaba 0 y la prueba decía FALLA sin que nada estuviera roto.
--
-- Una prueba no se apoya en el estado que dejó otra: se arma el suyo. Si no,
-- lo que verifica depende de qué corrió antes y de cuánto hace que no corre
-- la tarea de la noche.
--
-- Se declaran $8.000 contra un cargo de $5.000 a propósito, para ver también
-- qué hace la función con lo que sobra.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

insert into public.charges (tenant_id, student_id, concept, amount, due_date)
select s.tenant_id, s.id, 'PRUEBA confirmar_pago', 5000, current_date
  from public.students s
  join public.tenants t on t.id = s.tenant_id
 where t.name = 'Escuela de Prueba 2'
   and s.full_name = 'Alumno Portal'
 limit 1;

with nuevo as (
  insert into public.payments (tenant_id, student_id, amount, status, note)
  select s.tenant_id, s.id, 8000, 'declared', 'Transferencia de prueba'
    from public.students s
    join public.tenants t on t.id = s.tenant_id
   where t.name = 'Escuela de Prueba 2'
     and s.full_name = 'Alumno Portal'
   limit 1
  returning id
)
select set_config('prueba.pago_id', (select id::text from nuevo), false);


-- ----------------------------------------------------------------------------
-- 2. Profe 1 intenta confirmar ese pago. No es suyo.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_id uuid := nullif(current_setting('prueba.pago_id', true), '')::uuid;
begin
  if v_id is null then
    perform set_config('prueba.v1', 'SIN DATOS - no se pudo crear el pago', false);
    return;
  end if;
  perform * from public.confirmar_pago(v_id);
  perform set_config('prueba.v1', 'FALLA - confirmo un pago ajeno', false);
exception
  when others then
    perform set_config('prueba.v1', 'PASA', false);
end $$;


-- ----------------------------------------------------------------------------
-- 3. El propio alumno intenta darse por pagado.
--
-- Es el intento más tentador de todos: la plata es suya, el pago es suyo.
-- Lo único que lo separa de confirmarlo es que no tiene regla de escritura.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'alumno1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_id     uuid := nullif(current_setting('prueba.pago_id', true), '')::uuid;
  v_estado text;
begin
  begin
    perform * from public.confirmar_pago(v_id);
    perform set_config('prueba.v2b', 'AVISO - la funcion no le devolvio error', false);
  exception
    when others then
      perform set_config('prueba.v2b', 'PASA - le devolvio error (' || sqlstate || ')', false);
  end;

  -- Lo que de verdad importa: ¿quedó confirmado o no?
  select status into v_estado from public.payments where id = v_id;
  perform set_config('prueba.v2a',
    case when v_estado = 'declared' then 'PASA'
         when v_estado is null      then 'PASA (ni siquiera lo ve)'
         else 'FALLA - el pago quedo en ' || v_estado end, false);
end $$;


-- ----------------------------------------------------------------------------
-- 4. Ahora sí, el profesor dueño. Y después, el doble toque.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_id  uuid := nullif(current_setting('prueba.pago_id', true), '')::uuid;
  v_imp numeric;
  v_sin numeric;
  v_saldo numeric;
  v_cubierto numeric;
begin
  begin
    select imputado, sin_imputar into v_imp, v_sin from public.confirmar_pago(v_id);

    -- Cuánto de ese pago fue a parar al cargo que creó ESTA prueba.
    --
    -- Se mira el cargo propio y no el total imputado, porque la función
    -- reparte del cargo más viejo al más nuevo: si el alumno tenía otras
    -- deudas anteriores, parte de los $8.000 se va a ellas y el total deja de
    -- ser predecible. Lo que sí tiene que pasar siempre es que el cargo de
    -- $5.000 quede cubierto, y que la plata no se evapore: lo imputado más lo
    -- que sobra tiene que dar los $8.000 declarados.
    select coalesce(sum(a.amount), 0) into v_cubierto
      from public.payment_allocations a
      join public.charges c on c.id = a.charge_id
     where a.payment_id = v_id
       and c.concept = 'PRUEBA confirmar_pago';

    perform set_config('prueba.v3',
      case when v_cubierto = 5000 and (v_imp + v_sin) = 8000 then 'PASA'
           else 'FALLA - al cargo de la prueba le imputo ' || v_cubierto
                || ' (se esperaban 5000), y el pago repartio ' || v_imp
                || ' + ' || v_sin || ' de 8000' end, false);
  exception
    when others then
      perform set_config('prueba.v3', 'FALLA - ' || sqlerrm, false);
  end;

  -- Segundo toque sobre el mismo pago.
  begin
    perform * from public.confirmar_pago(v_id);
    perform set_config('prueba.v4', 'FALLA - dejo confirmar dos veces', false);
  exception
    when others then
      perform set_config('prueba.v4', 'PASA', false);
  end;

  -- Y el saldo del alumno tiene que haber quedado en cero.
  select saldo into v_saldo
    from public.student_account
   where student_id = (select id from public.students where full_name = 'Alumno Portal');
  perform set_config('prueba.v5',
    case when coalesce(v_saldo, -1) = 0 then 'PASA'
         else 'FALLA - el saldo quedo en ' || coalesce(v_saldo::text, 'nulo') end, false);
end $$;


-- ----------------------------------------------------------------------------
-- 5. Veredictos
-- ----------------------------------------------------------------------------
select 'Profe 1 NO puede confirmar un pago de Profe 2' as prueba,
       coalesce(current_setting('prueba.v1', true), 'NO SE EJECUTO') as resultado
union all
select 'El alumno NO logra confirmarse el pago',
       coalesce(current_setting('prueba.v2a', true), 'NO SE EJECUTO')
union all
select 'Y la funcion le avisa con un error',
       coalesce(current_setting('prueba.v2b', true), 'NO SE EJECUTO')
union all
select 'Profe 2 SI confirma: cubre el cargo de 5000 y no pierde plata',
       coalesce(current_setting('prueba.v3', true), 'NO SE EJECUTO')
union all
select 'Confirmar dos veces no imputa dos veces',
       coalesce(current_setting('prueba.v4', true), 'NO SE EJECUTO')
union all
select 'La deuda del alumno quedo en cero',
       coalesce(current_setting('prueba.v5', true), 'NO SE EJECUTO');

rollback;
