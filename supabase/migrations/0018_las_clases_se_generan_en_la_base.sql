-- ============================================================================
-- Migración 0018 — La regla de qué clases faltan se muda a la base
--
-- Hasta ahora esa regla vivía en TypeScript (src/comun/fechas.ts) y la
-- ejecutaba el navegador del profesor al abrir el grupo. Funcionaba, pero
-- tenía un techo: si el profe no abre la app, las clases del mes que viene no
-- existen, y el alumno abre su portal y no ve nada.
--
-- Para que una tarea programada pueda generarlas sola, la regla tiene que
-- poder correr sin navegador. Y una regla que corre desde dos lados tiene que
-- vivir en UN lado: si la copiáramos, el día que cambiemos una y nos olvidemos
-- de la otra, la app y la tarea van a crear clases distintas sin avisar.
--
-- Así que se muda entera acá, y la app pasa a llamarla en vez de calcularla.
--
-- La regla, textual, es la misma de siempre:
--   - Nunca hacia atrás: solo de hoy en adelante.
--   - Hasta el final del mes que viene.
--   - Nunca una fecha que ya tiene clase, AUNQUE ESTÉ CANCELADA. Si el profe
--     canceló el 25 por feriado, esa fila existe y se saltea. Sin esto,
--     cancelar sería inútil: la clase volvería sola.
--   - Nunca fuera de los límites del grupo, ni antes de su inicio ni después
--     de su fin.
--   - Nada si el grupo no tiene día fijo o no está activo.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- SEGURIDAD — por qué esta función NO es security definer
--
-- Es "security invoker", que es el modo por defecto: corre con los permisos de
-- quien la llama. Eso significa que cuando la llama el profesor desde el
-- navegador, las políticas de RLS se aplican igual que siempre: si el grupo no
-- es de un espacio suyo, el `select` de abajo no devuelve nada y la función
-- corta con un error. No hace falta que la función verifique nada a mano —
-- el candado de la base ya está puesto y esta función no lo saltea.
--
-- Cuando la llame la tarea programada (migración 0019), quien llama es el rol
-- `postgres`, que por ser dueño de las tablas no está sujeto a RLS y por lo
-- tanto ve todos los grupos de todos los profesores. Que es exactamente lo que
-- una tarea de mantenimiento necesita.
--
-- Una misma función, dos permisos distintos según quién la llama. Si fuera
-- security definer, el profesor también vería todos los grupos y tendríamos
-- que escribir a mano el control que hoy hace RLS sola.
-- ----------------------------------------------------------------------------
create or replace function public.asegurar_clases(p_grupo_id uuid)
returns setof date
language plpgsql
set search_path = public
as $$
declare
  v_grupo  public.groups;
  v_desde  date;
  v_hasta  date;
begin
  select * into v_grupo from public.groups where id = p_grupo_id;
  if v_grupo.id is null then
    raise exception 'Ese grupo no existe, o no pertenece a un espacio tuyo';
  end if;

  -- Sin día fijo no hay nada que deducir, y un grupo terminado no genera más.
  if v_grupo.weekday is null or v_grupo.status <> 'active' then
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

  return query
  insert into public.sessions (tenant_id, group_id, date, start_time, duration_min)
  select v_grupo.tenant_id, v_grupo.id, d::date,
         v_grupo.default_start_time, v_grupo.default_duration_min
    from generate_series(v_desde, v_hasta, interval '1 day') as d
   where extract(dow from d) = v_grupo.weekday
     and not exists (
       select 1 from public.sessions s
        where s.group_id = v_grupo.id
          and s.date = d::date
     )
  returning date;
end;
$$;

revoke all on function public.asegurar_clases(uuid) from public;
grant execute on function public.asegurar_clases(uuid) to authenticated;
