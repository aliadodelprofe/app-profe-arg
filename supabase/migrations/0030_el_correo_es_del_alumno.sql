-- ============================================================================
-- Migración 0030 — El correo también es del alumno
--
-- Desde la 0023 el alumno es dueño de su nombre y su foto, pero el correo
-- seguía siendo del profesor: era la columna que el profesor escribió al
-- anotarlo, y la función actualizar_mi_ficha la evita a propósito.
--
-- Esa evitación tenía un motivo bueno y hay que conservarlo: si el alumno
-- pudiera escribir ahí lo que quisiera, podría ponerse el correo de otra
-- persona y quedarse con las invitaciones dirigidas a esa persona (0015).
-- Cambiar el correo a mano nunca puede ser libre.
--
-- Pero hay un camino donde el correo YA ESTÁ VERIFICADO: cuando la persona lo
-- cambia en su cuenta. Supabase le manda un enlace a la dirección nueva y no
-- la cambia hasta que lo abre. Después de eso, su JWT trae esa dirección —
-- firmada por Supabase, no escrita por ella.
--
-- Entonces esta función no RECIBE un correo: lo LEE del JWT y lo copia a las
-- fichas. No hay parámetro que falsificar. Un alumno puede sincronizar su
-- correo; no puede elegir cuál.
-- ============================================================================
create or replace function public.sincronizar_mi_correo()
returns integer                      -- cuántas fichas actualizó
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Del JWT y no de un parámetro: esa es toda la seguridad de esta función.
  -- Se lee de las claims en vez de auth.email() para no depender de un
  -- ayudante que Supabase marcó como viejo.
  v_correo  text := nullif(
    current_setting('request.jwt.claims', true)::json ->> 'email', '');
  v_cuantas int;
begin
  if v_correo is null then
    return 0;
  end if;

  -- Solo las fichas de esta persona, y solo las que estén desactualizadas.
  update public.students
     set email = v_correo
   where user_id = auth.uid()
     and email is distinct from v_correo;

  get diagnostics v_cuantas = row_count;
  return v_cuantas;
end;
$$;

revoke all on function public.sincronizar_mi_correo() from public;
grant execute on function public.sincronizar_mi_correo() to authenticated;
