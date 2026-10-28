-- ============================================================================
-- PRUEBA DE VENCIDO vs POR VENCER  (migración 0031)
--
-- Lo que se prueba es la frontera: un cargo que vence mañana no puede entrar
-- en el saldo, y uno que venció ayer no puede quedar afuera. Y que la plata no
-- se pierda en el camino — lo vencido más lo que viene tiene que seguir siendo
-- todo lo que falta pagar.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
-- REQUISITOS: aislamiento.sql y aislamiento_alumno.sql ya corridos.
-- AVISO: dispara la alerta de Supabase.
-- ============================================================================

begin;

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_alumno uuid;
  v_tenant uuid;
  v_saldo  numeric;
  v_viene  numeric;
begin
  select s.id, s.tenant_id into v_alumno, v_tenant
    from public.students s
    join public.tenants t on t.id = s.tenant_id
   where t.name = 'Escuela de Prueba 2'
     and s.full_name = 'Alumno Portal'
   limit 1;

  if v_alumno is null then
    perform set_config('prueba.v1', 'SIN DATOS - falta Alumno Portal', false);
    return;
  end if;

  -- Tres cargos del mismo alumno, uno de cada lado de la frontera y uno justo
  -- encima: hoy cuenta como vencido, porque hoy ya es el día de pagarlo.
  insert into public.charges (tenant_id, student_id, concept, amount, due_date)
  values
    (v_tenant, v_alumno, 'PRUEBA vencio ayer',  1000, current_date - 1),
    (v_tenant, v_alumno, 'PRUEBA vence hoy',    2000, current_date),
    (v_tenant, v_alumno, 'PRUEBA vence mañana', 4000, current_date + 1);

  select saldo, por_vencer into v_saldo, v_viene
    from public.student_account
   where student_id = v_alumno;

  -- ---------------------------------------------------------------------- 1
  -- Se mide la DIFERENCIA y no el total: el alumno puede tener otros cargos
  -- de otras pruebas, y exigir un número absoluto sería volver a escribir una
  -- prueba que depende del azar de los datos.
  perform set_config('prueba.v1',
    case when v_saldo >= 3000 and v_viene >= 4000 then 'PASA'
         else 'FALLA - vencido ' || v_saldo || ' y por vencer ' || v_viene end, false);

  -- ---------------------------------------------------------------------- 2
  -- El de mañana NO puede estar en el saldo. Se comprueba sacándolo: si estaba
  -- adentro, el saldo tiene que bajar.
  perform set_config('prueba.saldo_antes', v_saldo::text, false);

  update public.charges set status = 'cancelled'
   where student_id = v_alumno and concept = 'PRUEBA vence mañana';

  select saldo into v_saldo from public.student_account where student_id = v_alumno;

  perform set_config('prueba.v2',
    case when v_saldo = nullif(current_setting('prueba.saldo_antes', true), '')::numeric
         then 'PASA'
         else 'FALLA - el cargo de mañana estaba contado en el saldo' end, false);

  -- ---------------------------------------------------------------------- 3
  -- Un cargo sin fecha cuenta como vencido: si nadie lo fechó, se debe ahora.
  insert into public.charges (tenant_id, student_id, concept, amount, due_date)
  values (v_tenant, v_alumno, 'PRUEBA sin fecha', 500, null);

  select saldo into v_saldo from public.student_account where student_id = v_alumno;

  perform set_config('prueba.v3',
    case when v_saldo = nullif(current_setting('prueba.saldo_antes', true), '')::numeric + 500
         then 'PASA'
         else 'FALLA - un cargo sin fecha no entro en el saldo' end, false);

  -- ---------------------------------------------------------------------- 4
  -- Un pago imputado al cargo de mañana lo saca de "por vencer" sin tocar el
  -- saldo. Es el caso del alumno que paga por adelantado.
  update public.charges set status = 'active'
   where student_id = v_alumno and concept = 'PRUEBA vence mañana';

  with pago as (
    insert into public.payments (tenant_id, student_id, amount, status, confirmed_at)
    values (v_tenant, v_alumno, 4000, 'confirmed', now())
    returning id
  )
  insert into public.payment_allocations (tenant_id, payment_id, charge_id, amount)
  select v_tenant, pago.id, c.id, 4000
    from pago, public.charges c
   where c.student_id = v_alumno and c.concept = 'PRUEBA vence mañana';

  select saldo, por_vencer into v_saldo, v_viene
    from public.student_account where student_id = v_alumno;

  perform set_config('prueba.v4',
    case when v_saldo = nullif(current_setting('prueba.saldo_antes', true), '')::numeric + 500
         then 'PASA'
         else 'FALLA - pagar por adelantado le movio el saldo vencido' end, false);
end $$;

reset role;

select * from (values
  ('Separa lo vencido de lo que viene',        current_setting('prueba.v1', true)),
  ('Un cargo de maniana NO entra en el saldo', current_setting('prueba.v2', true)),
  ('Un cargo sin fecha SI entra en el saldo',  current_setting('prueba.v3', true)),
  ('Pagar por adelantado no mueve el saldo',   current_setting('prueba.v4', true))
) as r(prueba, resultado);

rollback;
