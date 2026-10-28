-- ============================================================================
-- PRUEBA DEL PAGO ÚNICO  (migración 0033)
--
-- "Pago único" existía en el formulario pero no generaba ningún cargo: el
-- alumno figuraba al día debiendo el taller entero. Lo que se prueba es que
-- ahora se cobre, que se cobre UNA vez, y que un cargo suelto del profesor no
-- lo tape ni lo duplique.
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
  v_tenant uuid;
  v_alumno uuid;
  v_grupo  uuid;
  v_ins    uuid;
  v_n      int;
  v_cargo  public.charges;
begin
  select t.id into v_tenant from public.tenants t
   where t.name = 'Escuela de Prueba 2' limit 1;

  select s.id into v_alumno from public.students s
   where s.tenant_id = v_tenant and s.full_name = 'Alumno Portal' limit 1;

  if v_alumno is null then
    perform set_config('prueba.v1', 'SIN DATOS - falta Alumno Portal', false);
    return;
  end if;

  -- Un taller de un solo día, con precio total y sin precio por clase ni por
  -- mes: es exactamente la forma que antes no generaba nada.
  insert into public.groups
    (tenant_id, name, format, status, start_date, end_date, price_one_time)
  values
    (v_tenant, 'PRUEBA taller de un dia', 'cycle', 'active',
     current_date, current_date, 30000)
  returning id into v_grupo;

  insert into public.enrollments (tenant_id, group_id, student_id, billing_mode, status)
  values (v_tenant, v_grupo, v_alumno, 'one_time', 'active')
  returning id into v_ins;

  -- ---------------------------------------------------------------------- 1
  v_n := public.asegurar_cargos(v_grupo);

  select * into v_cargo from public.charges
   where enrollment_id = v_ins and period = 'unico' and status = 'active';

  perform set_config('prueba.v1',
    case when v_cargo.id is not null and v_cargo.amount = 30000
         then 'PASA'
         else 'FALLA - no genero el cargo del taller (creo ' || v_n || ')' end, false);

  -- ---------------------------------------------------------------------- 2
  -- Vence hoy: un taller que se paga entero se paga por adelantado.
  perform set_config('prueba.v2',
    case when v_cargo.due_date = current_date then 'PASA'
         else 'FALLA - vence el ' || coalesce(v_cargo.due_date::text, 'nunca') end, false);

  -- ---------------------------------------------------------------------- 3
  -- Correrla de nuevo no cobra el taller dos veces.
  v_n := public.asegurar_cargos(v_grupo);

  select count(*) into v_n from public.charges
   where enrollment_id = v_ins and period = 'unico' and status = 'active';

  perform set_config('prueba.v3',
    case when v_n = 1 then 'PASA'
         else 'FALLA - hay ' || v_n || ' cargos del mismo taller' end, false);

  -- ---------------------------------------------------------------------- 4
  -- Y un cargo suelto del profesor —materiales, un recupero— no lo confunde:
  -- ni lo tapa ni lo duplica. Es la razón por la que el cargo del taller se
  -- reconoce por su marca y no por "¿ya tiene algún cargo?".
  insert into public.charges
    (tenant_id, enrollment_id, student_id, concept, amount, due_date)
  values (v_tenant, v_ins, v_alumno, 'PRUEBA materiales', 1000, current_date);

  perform public.asegurar_cargos(v_grupo);

  select count(*) into v_n from public.charges
   where enrollment_id = v_ins and period = 'unico' and status = 'active';

  perform set_config('prueba.v4',
    case when v_n = 1 then 'PASA'
         else 'FALLA - con un cargo suelto encima quedaron ' || v_n || ' del taller' end, false);
end $$;

reset role;

select * from (values
  ('El taller con precio total genera su cargo', current_setting('prueba.v1', true)),
  ('Vence hoy: se paga por adelantado',          current_setting('prueba.v2', true)),
  ('Correrla de nuevo no lo cobra dos veces',    current_setting('prueba.v3', true)),
  ('Un cargo suelto no lo tapa ni lo duplica',   current_setting('prueba.v4', true))
) as r(prueba, resultado);

rollback;
