-- ============================================================================
-- Migración 0028 — Para poder cambiar una imagen hay que poder verla
--
-- Las 0026 y 0027 le dieron a cada depósito reglas de insert, update y delete,
-- y ninguna de select. Parecía suficiente: los dos depósitos son públicos, y
-- la imagen se baja por HTTP sin pasar por SQL.
--
-- Pero Postgres aplica las políticas de SELECT también cuando un update o un
-- delete tiene que LEER las filas para encontrarlas — y el "where" de un
-- update las lee. Sin regla de lectura, el dueño no ve su propia fila desde
-- SQL, así que el update no encuentra nada: cero filas y ningún error. Es la
-- peor forma de fallar, porque parece que funcionó.
--
-- Lo descubrió la prueba avatares.sql, en la fila "Reemplaza la suya".
--
-- La lectura va acotada igual que la escritura, aunque los depósitos sean
-- públicos: lo que hace pública a una imagen es la dirección por la que se
-- baja, no el permiso de leer su fila en una tabla. Dar lectura amplia acá
-- sería regalar la lista de todos los archivos de todos los espacios sin que
-- nadie gane nada.
-- ============================================================================

-- El logo: lo ve quien lo puede cambiar, o sea el dueño del espacio.
create policy "el dueño ve el logo de su escuela"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (select public.my_owned_tenant_ids()::text)
  );

-- La foto: cada uno la suya.
create policy "cada uno ve su propia foto"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
