-- ============================================================================
-- Migración 0036 — Un día fijo no siempre es todas las semanas
--
-- El horario fijo de la 0034 dice QUÉ DÍA y A QUÉ HORA, y da por sentado lo
-- tercero: que es todas las semanas. Para un grupo regular es verdad. Para una
-- particular no:
--
--   "Los martes de 15 a 16"            → todas las semanas
--   "Un martes por medio"              → dos por mes
--   "Un martes al mes"                 → uno por mes
--
-- Son el mismo día y la misma hora, y hoy la app las trata a las tres igual:
-- genera todos los martes. Al alumno que pactó dos por mes le aparecen cuatro
-- clases, y con el cobro por clase le aparecen cuatro cargos. La app le cobra
-- el doble de lo que acordaron.
--
-- LA COLUMNA ES "CUÁNTAS POR MES", NO "CADA CUÁNTAS SEMANAS.
--
-- Las dos formas de decirlo parecen equivalentes y no lo son. "Cada dos
-- semanas" tiene que arrastrar desde qué semana se cuenta, y cruzando el fin
-- de mes se desfasa: un mes caen dos y al siguiente tres. "Dos por mes" es lo
-- que el profesor y el alumno acuerdan de verdad —porque es lo que se paga—
-- y no necesita un punto de partida. Son el primer y el tercer martes del mes,
-- siempre, todos los meses.
--
-- null = todas las semanas, que es lo que hacían todas las filas que ya
-- existen. Por eso no hay que tocar ninguna.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. LA COLUMNA
--
-- El tope es 4 porque es el techo de lo que se puede prometer: un mes puede
-- tener cuatro martes o cinco, y nunca menos de cuatro. Pedir "5 por mes" es
-- pedir algo que ocho meses al año no se puede cumplir.
-- ----------------------------------------------------------------------------
-- "if not exists" y la regla aparte: correr una migración dos veces no tiene
-- que ser un problema. La primera vez crea las dos cosas; la segunda no hace
-- nada y sigue de largo hasta la función, que sí se puede reemplazar siempre.
alter table public.group_schedule
  add column if not exists por_mes int;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.group_schedule'::regclass
       and conname = 'group_schedule_por_mes_valido'
  ) then
    alter table public.group_schedule
      add constraint group_schedule_por_mes_valido
      check (por_mes is null or por_mes between 1 and 4);
  end if;
end $$;

comment on column public.group_schedule.por_mes is
  'Cuántas veces por mes se da este encuentro. null = todas las semanas. '
  '2 son el primer y el tercero del mes; 1 es el primero.';


-- ----------------------------------------------------------------------------
-- 2. LA FUNCIÓN QUE CREA LAS CLASES
--
-- El único cambio es el filtro de abajo. El resto es la 0034 tal cual.
--
-- CÓMO SE CUENTA CUÁL MARTES ES:
--
--   ((día del mes - 1) / 7) + 1
--
-- Los días 1 al 7 caen en el 1, del 8 al 14 en el 2, y así. Como de cada día
-- de la semana hay exactamente uno en cada una de esas franjas, el número que
-- sale es "el enésimo martes del mes". No hace falta mirar qué día empieza el
-- mes ni contar hacia atrás.
--
-- Y CUÁLES SE ELIGEN: LOS REPARTIDOS, NO LOS PRIMEROS.
--
-- Dos por mes NO son el primer y el segundo martes. Eso serían dos semanas
-- seguidas y después veinte días sin verse, que no es lo que nadie acuerda
-- cuando dice "un martes por medio". Son el PRIMERO y el TERCERO.
--
--   (i - 1) * 4 / N + 1,  para i de 1 a N
--
--   N=1 → 1          un martes al mes, el primero
--   N=2 → 1, 3       un martes por medio
--   N=3 → 1, 2, 3
--   N=4 → 1, 2, 3, 4 todos, salvo el quinto martes de los meses que lo tienen
--
-- Si el mes ya está empezado, los que ya pasaron no se recuperan: con dos por
-- mes y hoy 20 de marzo, el primer y el tercer martes ya fueron, y lo correcto
-- es no crear nada en marzo. Ese es el acuerdo, no una clase que falta.
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
  -- Qué encuentros del mes toman: {1,3} para dos por mes. null = todos.
  v_cuales int[];
begin
  select * into v_grupo from public.groups where id = p_grupo_id;
  if v_grupo.id is null then
    raise exception 'Ese grupo no existe, o no pertenece a un espacio tuyo';
  end if;

  if v_grupo.status <> 'active' then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_grupo_id::text));

  v_desde := greatest(current_date, coalesce(v_grupo.start_date, current_date));

  v_hasta := (date_trunc('month', current_date) + interval '2 months' - interval '1 day')::date;
  if v_grupo.end_date is not null and v_grupo.end_date < v_hasta then
    v_hasta := v_grupo.end_date;
  end if;

  if v_desde > v_hasta then
    return;
  end if;

  for v_fila in
    select weekday, start_time, duration_min, por_mes
      from public.group_schedule
     where group_id = p_grupo_id
     order by weekday, start_time
  loop
    if v_fila.por_mes is null then
      v_cuales := null;
    else
      select array_agg((i - 1) * 4 / v_fila.por_mes + 1)
        into v_cuales
        from generate_series(1, v_fila.por_mes) as i;
    end if;

    return query
    insert into public.sessions (tenant_id, group_id, date, start_time, duration_min)
    select v_grupo.tenant_id, v_grupo.id, d::date, v_fila.start_time, v_fila.duration_min
      from generate_series(v_desde, v_hasta, interval '1 day') as d
     where extract(dow from d) = v_fila.weekday
       and (
         v_cuales is null
         or (((extract(day from d)::int - 1) / 7) + 1) = any(v_cuales)
       )
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
