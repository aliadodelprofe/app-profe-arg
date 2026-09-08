-- ============================================================================
-- PRUEBA DE asegurar_cargos  (migración 0011)
--
-- La función crea deuda sola. Si se equivoca, le cobra de más a un alumno o
-- deja de cobrarle a otro, y en los dos casos el profesor se entera tarde.
--
-- Todo corre dentro de una transacción que se DESHACE al final: la base queda
-- igual que antes y la prueba se puede repetir sin límite.
--
-- REQUISITOS: aislamiento_cargos.sql y aislamiento_alumno.sql ya corridos.
-- AVISO: dispara la alerta de Supabase. La función hace inserts, y la
-- preparación también.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Preparación, como Profe 2:
--   - el grupo pasa a tener precios: $5.000 la clase, $18.000 el mes
--   - una clase futura, para que haya "próxima clase"
--   - Alumno Portal paga POR CLASE, Alumna de Prueba 2 paga POR MES
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

update public.groups
   set price_per_session = 5000,
       price_per_period  = 18000
 where name = 'Grupo de Prueba';

insert into public.sessions (tenant_id, group_id, date, title)
select g.tenant_id, g.id, current_date + 3, 'Clase futura'
  from public.groups g
 where g.name = 'Grupo de Prueba';

update public.enrollments e
   set billing_mode = 'per_session', status = 'active', end_date = null
  from public.students s
 where s.id = e.student_id and s.full_name = 'Alumno Portal';

update public.enrollments e
   set billing_mode = 'per_period', status = 'active', end_date = null
  from public.students s
 where s.id = e.student_id and s.full_name = 'Alumna de Prueba 2';

select set_config('prueba.grupo_id',
  (select id::text from public.groups where name = 'Grupo de Prueba'), false);

-- ----------------------------------------------------------------------------
-- Las llamadas y sus veredictos
-- ----------------------------------------------------------------------------
do $$
declare
  v_grupo   uuid := nullif(current_setting('prueba.grupo_id', true), '')::uuid;
  v_primera int;
  v_segunda int;
  v_cuota   record;
  v_clase   record;
  v_baja    int;
begin
  -- 1 y 2. Crea los dos cargos, y llamarla de nuevo no crea nada.
  v_primera := public.asegurar_cargos(v_grupo);
  v_segunda := public.asegurar_cargos(v_grupo);

  perform set_config('prueba.v1',
    case when v_primera = 2 then 'PASA'
         else 'FALLA - creo ' || v_primera || ' y se esperaban 2' end, false);

  perform set_config('prueba.v2',
    case when v_segunda = 0 then 'PASA'
         else 'FALLA - llamarla de nuevo creo ' || v_segunda || ' cargos mas' end, false);

  -- 3. La cuota del mes: monto, período y vencimiento el día 1.
  select c.amount, c.period, c.due_date into v_cuota
    from public.charges c
    join public.enrollments e on e.id = c.enrollment_id
    join public.students s    on s.id = e.student_id
   where s.full_name = 'Alumna de Prueba 2'
     and c.period is not null
   order by c.created_at desc limit 1;

  perform set_config('prueba.v3',
    case when v_cuota.amount = 18000
          and v_cuota.period = to_char(current_date, 'YYYY-MM')
          and v_cuota.due_date = date_trunc('month', current_date)::date
         then 'PASA'
         else 'FALLA - ' || coalesce(v_cuota.amount::text,'sin cargo')
              || ' / ' || coalesce(v_cuota.period,'sin periodo')
              || ' / vence ' || coalesce(v_cuota.due_date::text,'nunca') end, false);

  -- 4. El cargo por clase apunta a la próxima clase, no a una pasada.
  select c.amount, x.date into v_clase
    from public.charges c
    join public.sessions x    on x.id = c.session_id
    join public.enrollments e on e.id = c.enrollment_id
    join public.students s    on s.id = e.student_id
   where s.full_name = 'Alumno Portal'
   order by c.created_at desc limit 1;

  perform set_config('prueba.v4',
    case when v_clase.amount = 5000 and v_clase.date >= current_date then 'PASA'
         else 'FALLA - ' || coalesce(v_clase.amount::text,'sin cargo')
              || ' para el ' || coalesce(v_clase.date::text,'ninguna clase') end, false);

  -- 5. A quien se dio de baja no se le cobra nada más.
  update public.enrollments e
     set status = 'ended', end_date = current_date
    from public.students s
   where s.id = e.student_id and s.full_name = 'Alumno Portal';

  -- Se borra su cargo para que, si la función se equivocara, lo vuelva a crear.
  delete from public.charges c
   using public.enrollments e, public.students s
   where c.enrollment_id = e.id and e.student_id = s.id
     and s.full_name = 'Alumno Portal' and c.session_id is not null;

  v_baja := public.asegurar_cargos(v_grupo);
  perform set_config('prueba.v5',
    case when v_baja = 0 then 'PASA'
         else 'FALLA - le genero ' || v_baja || ' cargo(s) a alguien dado de baja' end, false);

  -- 7. Una inscripción que sigue ACTIVA pero cuya fecha de fin ya pasó
  --    tampoco genera nada.
  --
  --    Es el caso de quien se suma a mitad de mes queriendo pagar por mes: su
  --    tramo por clase termina el 30 y desde el 1 le corre la cuota. Si esta
  --    fila fallara, en octubre pagaría las dos cosas a la vez. Es el bug que
  --    la 0011 tenía y arregló la 0012.
  update public.enrollments e
     set status = 'active', end_date = current_date - 1, billing_mode = 'per_session'
    from public.students s
   where s.id = e.student_id and s.full_name = 'Alumna de Prueba 2';

  delete from public.charges c
   using public.enrollments e, public.students s
   where c.enrollment_id = e.id and e.student_id = s.id
     and s.full_name = 'Alumna de Prueba 2';

  v_baja := public.asegurar_cargos(v_grupo);
  perform set_config('prueba.v7',
    case when v_baja = 0 then 'PASA'
         else 'FALLA - genero ' || v_baja || ' cargo(s) para una inscripcion ya terminada' end,
    false);
end $$;

-- ----------------------------------------------------------------------------
-- 6. Profe 1 no puede generar cargos en el grupo de Profe 2.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_grupo uuid := nullif(current_setting('prueba.grupo_id', true), '')::uuid;
begin
  perform public.asegurar_cargos(v_grupo);
  perform set_config('prueba.v6', 'FALLA - genero cargos en un grupo ajeno', false);
exception
  when others then
    perform set_config('prueba.v6', 'PASA', false);
end $$;

select 'Genera los dos cargos que faltaban'                   as prueba,
       coalesce(current_setting('prueba.v1', true), 'NO SE EJECUTO') as resultado
union all
select 'Llamarla de nuevo no duplica nada',
       coalesce(current_setting('prueba.v2', true), 'NO SE EJECUTO')
union all
select 'La cuota: monto, mes y vencimiento el dia 1',
       coalesce(current_setting('prueba.v3', true), 'NO SE EJECUTO')
union all
select 'El cargo por clase apunta a la proxima, no a una pasada',
       coalesce(current_setting('prueba.v4', true), 'NO SE EJECUTO')
union all
select 'A quien se dio de baja no se le cobra mas',
       coalesce(current_setting('prueba.v5', true), 'NO SE EJECUTO')
union all
select 'Una inscripcion con fecha de fin pasada no genera nada',
       coalesce(current_setting('prueba.v7', true), 'NO SE EJECUTO')
union all
select 'Profe 1 no puede generar cargos en el grupo de Profe 2',
       coalesce(current_setting('prueba.v6', true), 'NO SE EJECUTO');

rollback;
