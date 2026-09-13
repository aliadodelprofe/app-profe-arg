-- ============================================================================
-- Migración 0013 — Enlazar al alumno con su usuario
--
-- Las políticas del portal del alumno existen desde la 0005 y están probadas,
-- pero no le abren la puerta a nadie: miran students.user_id, y esa columna
-- está vacía en todas las fichas.
--
-- Acá se llena. El profesor anota al alumno con su correo; el alumno se
-- registra con ese mismo correo; y esta función los une.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- reclamar_ficha() — "soy yo, esta ficha es mía"
--
-- La llama el alumno recién registrado. Busca fichas cuyo correo coincida con
-- el suyo y se las enlaza.
--
-- Tres candados, y ninguno es adorno:
--
--   1. EL CORREO TIENE QUE ESTAR CONFIRMADO. Es el único candado de verdad.
--      Sin esto, cualquiera se registra con el correo de otro alumno y se
--      queda con su historial y su estado de cuenta. Que Supabase exija
--      confirmar el correo no es una comodidad: es lo que sostiene todo esto.
--
--   2. SOLO FICHAS LIBRES (user_id is null). Una ficha ya enlazada no se le
--      saca a nadie, ni siquiera a alguien con el mismo correo.
--
--   3. Es "security definer" porque tiene que mirar fichas que todavía NO son
--      de quien llama —si ya fueran suyas, no habría nada que enlazar—. Por
--      eso hace una sola cosa, con una sola condición, y devuelve un número:
--      una función con permisos elevados tiene que ser chica y aburrida.
--
-- Puede enlazar más de una ficha, y está bien: la misma persona puede ser
-- alumna de dos profesores distintos, con una ficha en cada espacio.
-- ----------------------------------------------------------------------------
create or replace function public.reclamar_ficha()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correo text;
  v_enlazadas int;
begin
  if auth.uid() is null then
    raise exception 'Hay que estar logueado';
  end if;

  select u.email into v_correo
    from auth.users u
   where u.id = auth.uid()
     and u.email_confirmed_at is not null;

  if v_correo is null then
    raise exception 'Confirmá tu correo desde el mail que te mandamos y volvé a entrar';
  end if;

  update public.students s
     set user_id = auth.uid()
   where lower(s.email) = lower(v_correo)
     and s.user_id is null;

  get diagnostics v_enlazadas = row_count;
  return v_enlazadas;
end;
$$;

revoke all on function public.reclamar_ficha() from public;
grant execute on function public.reclamar_ficha() to authenticated;


-- ----------------------------------------------------------------------------
-- Y una ayuda para el profesor: saber si un alumno ya entró alguna vez.
--
-- Sin esto, el profe no tiene forma de distinguir "todavía no se registró" de
-- "se registró con otro correo y no lo sabe". Es leer, no escribir: la política
-- de la 0003 ya le deja ver las fichas de sus espacios, y user_id es una
-- columna más de esas fichas.
-- ----------------------------------------------------------------------------
comment on column public.students.user_id is
  'Usuario de Supabase Auth que reclamó esta ficha. Vacío = todavía no entró a la app.';
