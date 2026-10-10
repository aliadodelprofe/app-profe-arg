-- ============================================================================
-- Migración 0023 — El alumno es dueño de su ficha
--
-- Hasta ahora la ficha era del profesor: él la creaba y él la editaba, para
-- siempre. El alumno la miraba.
--
-- Está al revés. El profesor necesita crear la ficha —es él quien anota a
-- alguien en su grupo y sabe su correo— pero el nombre con el que esa persona
-- quiere que la llamen, y su foto, son suyos. Un profesor que escribe "Juan
-- (el alto)" en el campo nombre está nombrando a alguien que no eligió ese
-- nombre y lo ve en su propia app.
--
-- A partir de acá:
--   - El profesor CREA la ficha y puede corregirla MIENTRAS NADIE LA RECLAMÓ.
--     Ese período existe para poder arreglar un correo mal tipeado, que es lo
--     único que impide que el alumno entre.
--   - Una vez que el alumno la reclamó (`user_id` dejó de ser nulo), el nombre
--     y la foto son suyos.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. LA FOTO
--
-- Guarda la dirección de la imagen, no la imagen. Cuando el alumno entra con
-- Google, Google ya tiene una foto suya y la ofrece: traerla es gratis y
-- evita pedirle que suba algo.
--
-- Queda anotado el límite: esa dirección es de Google y puede dejar de
-- funcionar si la persona cambia su foto o cierra su cuenta. Si algún día
-- molesta, la solución es copiar la imagen a nuestro depósito al reclamar la
-- ficha. Hoy no vale la complejidad.
-- ----------------------------------------------------------------------------
alter table public.students
  add column if not exists avatar_url text;


-- ============================================================================
-- 2. POR QUÉ ESTO NO ES UNA POLÍTICA DE RLS
--
-- La tentación es obvia: "que el alumno pueda hacer update de su propia fila".
-- Sería una línea:
--
--     create policy "un alumno edita su ficha"
--       on public.students for update to authenticated
--       using ( user_id = auth.uid() );
--
-- Y sería un agujero grande, por la misma razón que ya nos mordió antes:
-- **RLS protege FILAS, no COLUMNAS.** Esa política le deja cambiar cualquier
-- campo de su fila, y en esa fila hay tres que no son suyos:
--
--   tenant_id  — cambiarlo lo mueve a la escuela de otro profesor, con sus
--                cargos y su historial encima
--   email      — cambiarlo por el de otra persona engancha las invitaciones
--                dirigidas a esa otra persona
--   status     — se daría de alta solo después de que el profesor lo dio de baja
--
-- Por eso va como función `security definer` que escribe EXACTAMENTE dos
-- columnas. Lo que no está en el `update` no se puede tocar, y eso no depende
-- de que nadie se acuerde de nada.
-- ============================================================================
create or replace function public.actualizar_mi_ficha(
  p_nombre     text,
  p_avatar_url text default null
)
returns integer                      -- cuántas fichas actualizó
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuantas int;
begin
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'El nombre no puede quedar vacío';
  end if;

  -- Una persona puede tener ficha en varias escuelas. El nombre y la foto son
  -- de la persona, no de la relación con cada profesor: se actualizan todas.
  update public.students
     set full_name  = trim(p_nombre),
         avatar_url = coalesce(p_avatar_url, avatar_url)
   where user_id = auth.uid();

  get diagnostics v_cuantas = row_count;
  return v_cuantas;
end;
$$;

revoke all on function public.actualizar_mi_ficha(text, text) from public;
grant execute on function public.actualizar_mi_ficha(text, text) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. EL PROFESOR DEJA DE EDITAR UNA FICHA RECLAMADA
--
-- La política de la 0003 le daba `for all` sobre los alumnos de sus espacios.
-- Se reemplaza por cuatro, separadas por operación, para poder poner la
-- condición solo donde corresponde:
--
--   - LEER y BORRAR: todo lo de sus espacios, como antes.
--   - CREAR: todo lo de sus espacios, como antes.
--   - MODIFICAR: solo las fichas que NADIE RECLAMÓ todavía.
--
-- El `with check` además de `using` no es redundante: `using` decide qué filas
-- puede tocar, `with check` decide cómo pueden quedar. Sin el segundo, podría
-- modificar una ficha suya para dejarla en el espacio de otro.
--
-- Qué pasa si el profesor se equivocó en el correo y el alumno ya reclamó la
-- ficha con el correo equivocado: no puede pasar. Reclamar una ficha exige
-- que el correo del usuario coincida con el de la ficha (0015), así que si el
-- correo estaba mal, nadie pudo haberla reclamado.
-- ----------------------------------------------------------------------------
drop policy if exists "un profesor administra los alumnos de sus espacios" on public.students;

do $$
declare
  v_nombre text;
begin
  -- El nombre exacto de la política vieja puede variar según cómo se escribió
  -- en la 0003. Se borra la que sea que exista sobre `for all`.
  for v_nombre in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'students' and cmd = 'ALL'
  loop
    execute format('drop policy %I on public.students', v_nombre);
  end loop;
end $$;

create policy "un profesor ve los alumnos de sus espacios"
  on public.students for select to authenticated
  using ( tenant_id in (select public.my_tenant_ids()) );

create policy "un profesor crea alumnos en sus espacios"
  on public.students for insert to authenticated
  with check ( tenant_id in (select public.my_tenant_ids()) );

create policy "un profesor corrige una ficha que nadie reclamo"
  on public.students for update to authenticated
  using (
        tenant_id in (select public.my_tenant_ids())
    and user_id is null
  )
  with check (
        tenant_id in (select public.my_tenant_ids())
    and user_id is null
  );

create policy "un profesor borra alumnos de sus espacios"
  on public.students for delete to authenticated
  using ( tenant_id in (select public.my_tenant_ids()) );
