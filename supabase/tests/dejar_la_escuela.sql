-- ============================================================================
-- PRUEBA DE dejar_la_escuela / volver_a_la_escuela  (migración 0040)
--
-- La función escribe sobre una ficha que puede estar reclamada por su dueño, y
-- para eso corre con permisos elevados. Esa es exactamente la clase de función
-- que hay que atar: si la comprobación de quién llama estuviera mal, un
-- profesor podría dar de baja a los alumnos de otro.
--
-- Y lo otro que se verifica es lo que NO hace: no toca la plata. Dar de baja
-- no es perdonar una deuda, y una app que borra lo que alguien debe cuando se
-- va es una app en la que no se puede confiar.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
--
-- REQUISITOS: aislamiento_cargos.sql y aislamiento_alumno.sql ya corridos.
-- ============================================================================

begin;

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

-- La ficha que esta prueba crea y da de baja. Propia, para no medir la suerte
-- de los datos ni dejar a nadie de verdad afuera si algo sale mal.
with nueva as (
  insert into public.students (tenant_id, full_name, email)
  select t.id, 'PRUEBA Se Fue', 'prueba-se-fue@ejemplo.com'
    from public.tenants t where t.name = 'Escuela de Prueba 2'
  returning id
)
select set_config('prueba.alumno', (select id::text from nueva), false);

do $$
declare
  v_alumno uuid := nullif(current_setting('prueba.alumno', true), '')::uuid;
  v_grupo  uuid := (select id from public.groups where name = 'Grupo de Prueba');
  v_n      int;
  v_cerradas int;
begin
  insert into public.enrollments (tenant_id, group_id, student_id, billing_mode, status)
  select tenant_id, v_grupo, v_alumno, 'per_session', 'active'
    from public.groups where id = v_grupo;

  insert into public.charges (tenant_id, student_id, concept, amount, due_date)
  select tenant_id, v_alumno, 'PRUEBA lo que quedo debiendo', 9999, current_date - 5
    from public.students where id = v_alumno;

  -- 1. Se va, y la función dice cuántas inscripciones cerró.
  v_cerradas := public.dejar_la_escuela(v_alumno);
  perform set_config('prueba.v1',
    case when v_cerradas >= 1 then 'PASA - cerro ' || v_cerradas
         else 'FALLA - no cerro ninguna' end, false);

  -- 2. Queda marcado inactivo.
  perform set_config('prueba.v2',
    case when exists (select 1 from public.students where id = v_alumno and status = 'inactive')
     then 'PASA' else 'FALLA - sigue activo' end, false);

  -- 3. Ninguna inscripción suya queda activa: es lo que corta los cargos.
  select count(*) into v_n
    from public.enrollments where student_id = v_alumno and status = 'active';
  perform set_config('prueba.v3',
    case when v_n = 0 then 'PASA' else 'FALLA - le quedaron ' || v_n end, false);

  -- 4. Y asegurar_cargos no le genera nada nuevo.
  perform public.asegurar_cargos(v_grupo);
  select count(*) into v_n from public.charges where student_id = v_alumno;
  perform set_config('prueba.v4',
    case when v_n = 1 then 'PASA'
         else 'FALLA - tiene ' || v_n || ' cargos en vez de 1' end, false);

  -- 5. LO QUE DEBÍA LO SIGUE DEBIENDO. Irse no borra una deuda.
  perform set_config('prueba.v5',
    case when exists (
      select 1 from public.charges
       where student_id = v_alumno and amount = 9999 and status = 'active')
     then 'PASA' else 'FALLA - se llevo puesta la deuda' end, false);

  -- 6. Vuelve: queda activo otra vez.
  perform public.volver_a_la_escuela(v_alumno);
  perform set_config('prueba.v6',
    case when exists (select 1 from public.students where id = v_alumno and status = 'active')
     then 'PASA' else 'FALLA' end, false);

  -- 7. Pero NO se le reabren las inscripciones. Volver a la escuela no es
  --    volver al mismo grupo, al mismo precio y con la misma forma de pago.
  select count(*) into v_n
    from public.enrollments where student_id = v_alumno and status = 'active';
  perform set_config('prueba.v7',
    case when v_n = 0 then 'PASA' else 'FALLA - le reabrio ' || v_n end, false);

  -- 8. Un estado que no existe no entra.
  begin
    update public.students set status = 'de licencia' where id = v_alumno;
    perform set_config('prueba.v8', 'FALLA - acepto un estado inventado', false);
  exception when others then
    perform set_config('prueba.v8', 'PASA - la base lo rechazo', false);
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 9. Profe 1 no puede dar de baja a un alumno de Profe 2. Es lo que justifica
--    que la función corra con permisos elevados: si esto falla, los permisos
--    elevados son una puerta abierta.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_alumno uuid := nullif(current_setting('prueba.alumno', true), '')::uuid;
begin
  perform public.dejar_la_escuela(v_alumno);
  perform set_config('prueba.v9', 'FALLA - dio de baja a un alumno ajeno', false);
exception when others then
  perform set_config('prueba.v9', 'PASA - la base le devolvio error (' || sqlstate || ')', false);
end $$;

-- ----------------------------------------------------------------------------
-- 10. Y el alumno tampoco se da de baja solo. Irse de una escuela es una
--     conversación con el profesor, no un botón.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'alumno1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_alumno uuid := nullif(current_setting('prueba.alumno', true), '')::uuid;
begin
  perform public.dejar_la_escuela(v_alumno);
  perform set_config('prueba.v10', 'FALLA - el alumno se dio de baja solo', false);
exception when others then
  perform set_config('prueba.v10', 'PASA - la base le devolvio error (' || sqlstate || ')', false);
end $$;

select 'Se va y cierra sus inscripciones' as prueba,
       coalesce(current_setting('prueba.v1', true), 'NO SE EJECUTO') as resultado
union all
select 'Queda marcado inactivo',
       coalesce(current_setting('prueba.v2', true), 'NO SE EJECUTO')
union all
select 'No le queda ninguna inscripcion activa',
       coalesce(current_setting('prueba.v3', true), 'NO SE EJECUTO')
union all
select 'Y no se le generan cargos nuevos',
       coalesce(current_setting('prueba.v4', true), 'NO SE EJECUTO')
union all
select 'Lo que debia lo sigue debiendo',
       coalesce(current_setting('prueba.v5', true), 'NO SE EJECUTO')
union all
select 'Vuelve y queda activo',
       coalesce(current_setting('prueba.v6', true), 'NO SE EJECUTO')
union all
select 'Pero NO se le reabren las inscripciones',
       coalesce(current_setting('prueba.v7', true), 'NO SE EJECUTO')
union all
select 'Un estado inventado no entra',
       coalesce(current_setting('prueba.v8', true), 'NO SE EJECUTO')
union all
select 'Profe 1 NO da de baja a un alumno de Profe 2',
       coalesce(current_setting('prueba.v9', true), 'NO SE EJECUTO')
union all
select 'El alumno NO se da de baja solo',
       coalesce(current_setting('prueba.v10', true), 'NO SE EJECUTO');

rollback;
