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
-- El alumno tiene un cargo de $5.000. Se declaran $8.000 a propósito, para
-- ver también qué hace la función con lo que sobra.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

with nuevo as (
  insert into public.payments (tenant_id, student_id, amount, status, note)
  select s.tenant_id, s.id, 8000, 'declared', 'Transferencia de prueba'
    from public.students s
    join public.tenants t on t.id = s.tenant_id
   where t.name = 'Escuela de Prueba 2'
     and s.full_name = 'Alumno Portal'
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
begin
  begin
    select imputado, sin_imputar into v_imp, v_sin from public.confirmar_pago(v_id);
    perform set_config('prueba.v3',
      case when v_imp = 5000 and v_sin = 3000 then 'PASA'
           else 'FALLA - imputo ' || v_imp || ' y dejo ' || v_sin
                || ' (se esperaba 5000 y 3000)' end, false);
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
select 'Profe 2 SI confirma: imputa 5000 y deja 3000 a favor',
       coalesce(current_setting('prueba.v3', true), 'NO SE EJECUTO')
union all
select 'Confirmar dos veces no imputa dos veces',
       coalesce(current_setting('prueba.v4', true), 'NO SE EJECUTO')
union all
select 'La deuda del alumno quedo en cero',
       coalesce(current_setting('prueba.v5', true), 'NO SE EJECUTO');

rollback;
