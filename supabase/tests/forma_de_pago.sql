-- ============================================================================
-- PRUEBA DE cambiar_forma_de_pago  (migración 0017)
--
-- La función deja que el alumno cambie cómo le cobran, escribiendo sobre una
-- tabla en la que no tiene permiso de escritura. Los dos riesgos: que toque
-- inscripciones que no son suyas, y que cambiar de opinión dos veces le deje
-- dos arreglos pisándose, con cargos dobles.
--
-- Todo corre en una transacción que se DESHACE al final.
--
-- REQUISITOS: aislamiento_cargos.sql y aislamiento_alumno.sql ya corridos.
-- AVISO: dispara la alerta de Supabase.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Preparación, como Profe 2: el grupo con los dos precios, y Alumno Portal
-- pagando por clase, sin fecha de fin.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

update public.groups
   set price_per_session = 5000, price_per_period = 18000
 where name = 'Grupo de Prueba';

update public.enrollments e
   set billing_mode = 'per_session', status = 'active',
       end_date = null, start_date = current_date - 30
  from public.students s
 where s.id = e.student_id and s.full_name = 'Alumno Portal';

select set_config('prueba.grupo',
  (select id::text from public.groups where name = 'Grupo de Prueba'), false);

-- ----------------------------------------------------------------------------
-- Como el alumno.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'alumno1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_grupo  uuid := nullif(current_setting('prueba.grupo', true), '')::uuid;
  v_desde  date;
  v_fin    date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  v_inicio date := (date_trunc('month', current_date) + interval '1 month')::date;
  v_ficha  uuid;
  v_n      int;
  v_modo   text;
  v_hasta  date;
begin
  select id into v_ficha from public.students where user_id = auth.uid() limit 1;

  -- 1. Cambiar a mensual: vale desde el 1 del mes que viene.
  v_desde := public.cambiar_forma_de_pago(v_grupo, 'per_period');
  perform set_config('prueba.v1',
    case when v_desde = v_inicio then 'PASA'
         else 'FALLA - dijo que vale desde ' || v_desde || ' y deberia ser ' || v_inicio end,
    false);

  -- 2. La inscripción de ahora queda cerrada a fin de mes.
  select end_date into v_hasta
    from public.enrollments
   where group_id = v_grupo and student_id = v_ficha and billing_mode = 'per_session'
   order by start_date limit 1;
  perform set_config('prueba.v2',
    case when v_hasta = v_fin then 'PASA'
         else 'FALLA - la de por clase termina el ' || coalesce(v_hasta::text,'nunca') end,
    false);

  -- 3. Y hay una nueva, mensual, arrancando el 1.
  select count(*) into v_n
    from public.enrollments
   where group_id = v_grupo and student_id = v_ficha
     and billing_mode = 'per_period' and start_date = v_inicio and status = 'active';
  perform set_config('prueba.v3',
    case when v_n = 1 then 'PASA'
         else 'FALLA - hay ' || v_n || ' inscripciones mensuales desde el 1' end, false);

  -- 4. Cambiar de opinión no apila arreglos: corrige el que ya estaba.
  perform public.cambiar_forma_de_pago(v_grupo, 'per_session');
  select count(*) into v_n
    from public.enrollments
   where group_id = v_grupo and student_id = v_ficha
     and start_date = v_inicio and status = 'active';
  select billing_mode into v_modo
    from public.enrollments
   where group_id = v_grupo and student_id = v_ficha
     and start_date = v_inicio and status = 'active' limit 1;
  perform set_config('prueba.v4',
    case when v_n = 1 and v_modo = 'per_session' then 'PASA'
         else 'FALLA - quedaron ' || v_n || ' arreglos, el ultimo ' || coalesce(v_modo,'ninguno') end,
    false);
end $$;

-- ----------------------------------------------------------------------------
-- 5. Sin precio para esa forma, no se puede elegir.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;
update public.groups set price_per_period = null where name = 'Grupo de Prueba';

reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'alumno1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_grupo uuid := nullif(current_setting('prueba.grupo', true), '')::uuid;
begin
  perform public.cambiar_forma_de_pago(v_grupo, 'per_period');
  perform set_config('prueba.v5', 'FALLA - dejo elegir una forma sin precio', false);
exception when others then
  perform set_config('prueba.v5', 'PASA', false);
end $$;

-- ----------------------------------------------------------------------------
-- 6. Alguien sin ficha en esa escuela no puede tocar nada.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_grupo uuid := nullif(current_setting('prueba.grupo', true), '')::uuid;
begin
  perform public.cambiar_forma_de_pago(v_grupo, 'per_session');
  perform set_config('prueba.v6', 'FALLA - cambio la forma de pago en una escuela ajena', false);
exception when others then
  perform set_config('prueba.v6', 'PASA', false);
end $$;

select 'El cambio vale desde el 1 del mes que viene'        as prueba,
       coalesce(current_setting('prueba.v1', true), 'NO SE EJECUTO') as resultado
union all
select 'La forma de ahora se cierra a fin de mes',
       coalesce(current_setting('prueba.v2', true), 'NO SE EJECUTO')
union all
select 'Queda una sola inscripcion nueva, desde el 1',
       coalesce(current_setting('prueba.v3', true), 'NO SE EJECUTO')
union all
select 'Cambiar de opinion corrige, no apila',
       coalesce(current_setting('prueba.v4', true), 'NO SE EJECUTO')
union all
select 'No se puede elegir una forma sin precio',
       coalesce(current_setting('prueba.v5', true), 'NO SE EJECUTO')
union all
select 'Alguien sin ficha en esa escuela no puede cambiar nada',
       coalesce(current_setting('prueba.v6', true), 'NO SE EJECUTO');

rollback;
