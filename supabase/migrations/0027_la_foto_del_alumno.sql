-- ============================================================================
-- Migración 0027 — El alumno sube su foto
--
-- Desde la 0023 el alumno es dueño de su ficha y puede cambiarse el nombre y
-- la foto. Pero "cambiarse la foto" quería decir una sola cosa: usar la que
-- Google ya tenía. Quien entró con correo y contraseña no tenía ninguna, y
-- quien entró con Google no podía usar otra.
--
-- Falta el depósito, que es esto. La columna ya existe (students.avatar_url,
-- migración 0023) y la función que la escribe también (actualizar_mi_ficha).
--
-- Igual que los logos y al revés que los comprobantes: público para leer,
-- cerrado para escribir. Una foto de perfil existe para que la vean —su
-- profesor, en la lista de asistencia— y no tiene sentido firmarle un enlace
-- temporal a una imagen que aparece en cada pantalla.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. El depósito
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', true)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 2. Quién puede escribir ahí
--
--     avatares/<user_id>/<archivo>
--
-- La carpeta es el USUARIO y no el alumno. Es a propósito y es la diferencia
-- con todo lo demás de esta app: una ficha es por escuela, pero la cara es de
-- la persona. Quien cursa con dos profesores tiene dos fichas y una sola foto,
-- igual que tiene un solo nombre.
--
-- Esto además hace que el depósito sirva para cualquiera que tenga cuenta: el
-- día que un profesor quiera ponerse una foto, la regla ya está escrita.
--
-- Se puede reemplazar y borrar, como el logo. Una foto de perfil es lo más
-- parecido a una marca personal que tiene esta app; nadie firma nada con ella.
-- ----------------------------------------------------------------------------
create policy "cada uno sube su propia foto"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "cada uno reemplaza su propia foto"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "cada uno borra su propia foto"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
