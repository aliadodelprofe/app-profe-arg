-- ============================================================================
-- PRUEBA DEL SALDO A FAVOR  (migración 0021)
--
-- Es plata. Si esto se equivoca hay dos formas de hacerlo y las dos son malas:
-- imputar de menos deja al alumno debiendo algo que ya pagó, e imputar de más
-- inventa plata que nadie entregó.
--
-- Se trabaja con un alumno NUEVO, creado acá, sin historia previa: así los
-- números son exactos y no hay que adivinar qué arrastraba de antes.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
--
-- REQUISITOS: aislamiento_cargos.sql ya corrido (necesita profe1 y profe2).
-- AVISO: dispara la alerta de Supabase — la preparación inserta alumno, cargos
-- y un pago.
-- ============================================================================

begin;

-- El espacio del otro profesor se anota antes de ponerse el rol: después RLS
-- lo esconde y la última fila no tendría con qué probar.
select set_config('prueba.espacio_ajeno',
  (select id::text from public.tenants where name = 'Escuela de Prueba 1'), false);

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

-- ----------------------------------------------------------------------------
-- Preparación: un alumno que pagó $25.000 teniendo un solo cargo de $10.000.
-- O sea, $15.000 a favor.
-- ----------------------------------------------------------------------------
insert into public.students (tenant_id, full_name)
select id, 'PRUEBA Saldo A Favor' from public.tenants where name = 'Escuela de Prueba 2';

insert into public.charges (tenant_id, student_id, concept, amount, due_date)
select s.tenant_id, s.id, 'PRUEBA cargo viejo', 10000, current_date - 10
  from public.students s where s.full_name = 'PRUEBA Saldo A Favor';

insert into public.payments
  (tenant_id, student_id, amount, status, confirmed_at, note)
select s.tenant_id, s.id, 25000, 'confirmed', now() - interval '1 day', 'PRUEBA pago grande'
  from public.students s where s.full_name = 'PRUEBA Saldo A Favor';


do $$
declare
  v_alumno   uuid;
  v_espacio  uuid;
  v_ajeno    uuid := nullif(current_setting('prueba.espacio_ajeno', true), '')::uuid;
  v_cuenta   record;
  v_n        int;
  v_total    numeric;
  v_pago     numeric;
begin
  select id, tenant_id into v_alumno, v_espacio
    from public.students where full_name = 'PRUEBA Saldo A Favor';

  -- ---------------------------------------------------------------------- 1
  -- Antes de imputar nada, la vista ya tiene que MOSTRAR la plata a favor.
  -- Esto es lo que hasta la 0021 era invisible: el pago estaba en la base y
  -- ninguna pantalla lo sabía.
  select * into v_cuenta
    from public.student_account where student_id = v_alumno;

  perform set_config('prueba.v1',
    case when v_cuenta.a_favor = 15000 then 'PASA'
         else 'FALLA - a favor dice ' || coalesce(v_cuenta.a_favor::text, 'nada')
              || ' y deberia decir 15000' end, false);

  -- ---------------------------------------------------------------------- 2
  -- La imputación cubre el cargo viejo con esa plata.
  v_n := public.asegurar_imputaciones(v_espacio);

  select * into v_cuenta
    from public.student_account where student_id = v_alumno;

  perform set_config('prueba.v2',
    case when v_cuenta.saldo = 0 and v_cuenta.a_favor = 15000 then 'PASA'
         else 'FALLA - saldo ' || v_cuenta.saldo || ' / a favor ' || v_cuenta.a_favor
              || ' (se esperaba 0 y 15000)' end, false);

  -- ---------------------------------------------------------------------- 3
  -- Aparece un cargo nuevo —el caso de la cuota del mes que viene— y la plata
  -- a favor lo cubre sola. Es el escenario que motivó toda la migración.
  insert into public.charges (tenant_id, student_id, concept, amount, due_date)
  values (v_espacio, v_alumno, 'PRUEBA cuota nueva', 8000, current_date);

  v_n := public.asegurar_imputaciones(v_espacio);

  select * into v_cuenta
    from public.student_account where student_id = v_alumno;

  perform set_config('prueba.v3',
    case when v_cuenta.saldo = 0 and v_cuenta.a_favor = 7000 then 'PASA'
         else 'FALLA - saldo ' || v_cuenta.saldo || ' / a favor ' || v_cuenta.a_favor
              || ' (se esperaba 0 y 7000)' end, false);

  -- ---------------------------------------------------------------------- 4
  -- Llamarla de nuevo no imputa nada. Es lo que permite correrla todas las
  -- noches sin miedo.
  v_n := public.asegurar_imputaciones(v_espacio);
  perform set_config('prueba.v4',
    case when v_n = 0 then 'PASA'
         else 'FALLA - la segunda corrida creo ' || v_n || ' imputaciones mas' end, false);

  -- ---------------------------------------------------------------------- 5
  -- NUNCA imputa más de lo que el alumno entregó. Si esta fila fallara, la
  -- app estaría inventando plata que nadie pagó.
  select coalesce(sum(a.amount), 0) into v_total
    from public.payment_allocations a
    join public.payments p on p.id = a.payment_id
   where p.student_id = v_alumno;

  select amount into v_pago
    from public.payments where student_id = v_alumno;

  perform set_config('prueba.v5',
    case when v_total <= v_pago then 'PASA'
         else 'FALLA - imputo ' || v_total || ' de un pago de ' || v_pago end, false);

  -- ---------------------------------------------------------------------- 6
  -- Nadie imputa en el espacio de otro profesor. La función no verifica nada
  -- a mano: es security invoker, así que RLS no le deja ni leer esos pagos.
  if v_ajeno is null then
    perform set_config('prueba.v6',
      'FALLA - no se pudo anotar el espacio ajeno antes de cambiar de rol', false);
  else
    begin
      v_n := public.asegurar_imputaciones(v_ajeno);
      perform set_config('prueba.v6',
        case when v_n = 0 then 'PASA'
             else 'FALLA - imputo ' || v_n || ' veces en el espacio de otro' end, false);
    exception when others then
      perform set_config('prueba.v6', 'PASA', false);
    end;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- Resultado
-- ----------------------------------------------------------------------------
reset role;

select * from (values
  ('La vista muestra la plata a favor',              current_setting('prueba.v1', true)),
  ('Cubre el cargo viejo y el resto queda a favor',  current_setting('prueba.v2', true)),
  ('Un cargo nuevo se cubre solo con lo que habia',  current_setting('prueba.v3', true)),
  ('Correrla de nuevo no imputa nada',               current_setting('prueba.v4', true)),
  ('Nunca imputa mas de lo que el alumno pago',      current_setting('prueba.v5', true)),
  ('Nadie imputa en el espacio de otro',             current_setting('prueba.v6', true))
) as r(prueba, resultado);

rollback;
