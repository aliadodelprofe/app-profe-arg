-- ============================================================================
-- Migración 0034 — Un grupo puede tener más de un día
--
-- Hasta ahora el horario fijo era UNA columna: `weekday`. Eso dejaba afuera un
-- caso que no es raro — es lo normal: un taller que se da martes y jueves, un
-- regular que tiene clase dos veces por semana, una particular que el alumno
-- toma lunes a las 15 y miércoles a las 19.
--
-- Y no se arregla agregando `weekday2`. Eso sería poner un número arbitrario
-- —¿dos días?, ¿tres?— y además perder el horario de cada uno: martes a las 20
-- y jueves a las 19 no comparten hora.
--
-- Un horario es una LISTA de encuentros semanales, y una lista es una tabla.
--
-- LAS TRES COLUMNAS VIEJAS SE BORRAN. Podrían quedarse "por las dudas", y esa
-- es exactamente la decisión que deja un sistema con dos lugares donde dice la
-- misma cosa: tarde o temprano uno se actualiza y el otro no, y nadie sabe
-- cuál manda. Se migran los datos y se van.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. LA TABLA
--
-- Una fila por encuentro semanal. "martes 20:00 90min" y "jueves 19:00 60min"
-- son dos filas del mismo grupo.
--
-- start_time admite nulo solo porque los grupos viejos podían tener día sin
-- hora. El formulario la exige: una clase sin hora es una clase a la que nadie
-- sabe cuándo ir.
-- ----------------------------------------------------------------------------
create table public.group_schedule (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  group_id     uuid not null references public.groups(id) on delete cascade,
  weekday      int  not null check (weekday between 0 and 6),
  start_time   time,
  duration_min int,
  created_at   timestamptz not null default now(),
  -- El mismo día a la misma hora dos veces es un error de carga, no un grupo
  -- que se junta dos veces seguidas.
  unique (group_id, weekday, start_time)
);

create index group_schedule_group_idx on public.group_schedule(group_id);

comment on table public.group_schedule is
  'El horario fijo de un grupo: una fila por encuentro semanal.';


-- ----------------------------------------------------------------------------
-- 2. EL CANDADO
--
-- El profesor escribe los de sus espacios. El alumno LEE los de los grupos en
-- los que está anotado: todavía no se muestra en su app, pero el horario de la
-- clase a la que va no es un secreto, y la regla es más fácil de escribir
-- ahora que de recordar después.
-- ----------------------------------------------------------------------------
alter table public.group_schedule enable row level security;

create policy "acceso a horarios de mis espacios"
  on public.group_schedule for all to authenticated
  using      ( tenant_id in (select public.my_tenant_ids()) )
  with check ( tenant_id in (select public.my_tenant_ids()) );

create policy "un alumno ve el horario de sus grupos"
  on public.group_schedule for select to authenticated
  using ( group_id in (select public.my_enrolled_group_ids()) );


-- ----------------------------------------------------------------------------
-- 3. MUDAR LO QUE YA ESTÁ
--
-- Antes de borrar nada. Si esto fallara, la migración entera se deshace y los
-- datos siguen donde estaban.
-- ----------------------------------------------------------------------------
insert into public.group_schedule (tenant_id, group_id, weekday, start_time, duration_min)
select g.tenant_id, g.id, g.weekday, g.default_start_time, g.default_duration_min
  from public.groups g
 where g.weekday is not null
on conflict do nothing;


-- ----------------------------------------------------------------------------
-- 4. LA FUNCIÓN QUE CREA LAS CLASES
--
-- Antes generaba los días que coincidían con una columna. Ahora recorre la
-- lista y hace lo mismo con cada encuentro.
--
-- El "no existe ya una clase ese día" sigue siendo por FECHA y no por fecha y
-- hora, a propósito: si un grupo se junta martes y jueves, nunca hay dos
-- encuentros el mismo día. Dejarlo por fecha es lo que evita que una clase
-- cargada a mano —un recupero el martes— se duplique cuando pase la tarea.
-- ----------------------------------------------------------------------------
create or replace function public.asegurar_clases(p_grupo_id uuid)
returns setof date
language plpgsql
set search_path = public
as $$
declare
  v_grupo  public.groups;
  v_fila   record;
  v_desde  date;
  v_hasta  date;
begin
  select * into v_grupo from public.groups where id = p_grupo_id;
  if v_grupo.id is null then
    raise exception 'Ese grupo no existe, o no pertenece a un espacio tuyo';
  end if;

  -- Un grupo terminado no genera más.
  if v_grupo.status <> 'active' then
    return;
  end if;

  -- Dos ejecuciones a la vez sobre el mismo grupo —la tarea programada y el
  -- profe abriendo la app en el mismo segundo— crearían la misma clase dos
  -- veces: las dos consultan antes de que la otra inserte. El candado hace que
  -- la segunda espere a que la primera termine. Se suelta sola al cerrar la
  -- transacción.
  perform pg_advisory_xact_lock(hashtext(p_grupo_id::text));

  v_desde := greatest(current_date, coalesce(v_grupo.start_date, current_date));

  -- El último día del mes que viene.
  v_hasta := (date_trunc('month', current_date) + interval '2 months' - interval '1 day')::date;
  if v_grupo.end_date is not null and v_grupo.end_date < v_hasta then
    v_hasta := v_grupo.end_date;
  end if;

  if v_desde > v_hasta then
    return;
  end if;

  for v_fila in
    select weekday, start_time, duration_min
      from public.group_schedule
     where group_id = p_grupo_id
     order by weekday, start_time
  loop
    return query
    insert into public.sessions (tenant_id, group_id, date, start_time, duration_min)
    select v_grupo.tenant_id, v_grupo.id, d::date, v_fila.start_time, v_fila.duration_min
      from generate_series(v_desde, v_hasta, interval '1 day') as d
     where extract(dow from d) = v_fila.weekday
       and not exists (
         select 1 from public.sessions s
          where s.group_id = v_grupo.id
            and s.date = d::date
       )
    returning date;
  end loop;
end;
$$;

revoke all on function public.asegurar_clases(uuid) from public;
grant execute on function public.asegurar_clases(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 5. Y AHORA SÍ, BORRAR LAS VIEJAS
--
-- Con los datos ya mudados y la función leyendo del lugar nuevo. Dejarlas
-- sería dejar dos verdades sobre lo mismo.
-- ----------------------------------------------------------------------------
alter table public.groups
  drop column weekday,
  drop column default_start_time,
  drop column default_duration_min;
