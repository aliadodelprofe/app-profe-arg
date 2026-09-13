-- ============================================================================
-- Migración 0014 — Comprobantes de transferencia
--
-- El alumno avisa que transfirió; el profesor confirma. Entre esas dos cosas
-- falta lo que hoy se manda por WhatsApp: la captura del comprobante.
--
-- Un comprobante bancario tiene nombre, banco, a veces CBU y CUIT. No es una
-- foto cualquiera: es un documento con datos de una persona. Por eso el
-- depósito es PRIVADO y con reglas propias, no una carpeta pública con
-- direcciones difíciles de adivinar. Una dirección difícil de adivinar sigue
-- siendo pública para quien la tiene.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. El depósito
--
-- "public: false" es lo importante. Con eso, nadie llega al archivo por su
-- URL: hay que pedirle a Supabase un enlace temporal, y para eso hay que estar
-- autorizado por las reglas de abajo.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 2. Cómo se ordenan los archivos
--
--     comprobantes/<tenant_id>/<student_id>/<archivo>
--
-- Esa forma no es decorativa: es lo que hace posibles las reglas. La primera
-- carpeta dice de qué espacio es —y de ahí sale el permiso del profesor—, y la
-- segunda de qué alumno —y de ahí el del alumno—. Sin esa estructura habría
-- que abrir el archivo para saber de quién es, y para entonces ya lo abriste.
--
-- storage.foldername(name) devuelve esas carpetas como lista: [1] es la
-- primera, [2] la segunda.
-- ----------------------------------------------------------------------------

-- El alumno sube su comprobante, y solo en su propia carpeta.
create policy "un alumno sube su comprobante"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[2] in (select public.my_student_ids()::text)
  );

-- Y lo ve, para poder revisar lo que mandó.
create policy "un alumno ve sus comprobantes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[2] in (select public.my_student_ids()::text)
  );

-- El profesor ve los de su espacio. Los de otro espacio no existen para él,
-- igual que con todo lo demás.
create policy "un profesor ve los comprobantes de sus espacios"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] in (select public.my_tenant_ids()::text)
  );

-- Nadie borra ni pisa comprobantes. Ni el alumno ni el profesor.
--
-- Es a propósito y es la decisión más fuerte de esta migración: un comprobante
-- es la prueba de una discusión sobre plata. Si se pudiera reemplazar, dejaría
-- de servir para lo único que sirve. Si alguien se equivoca de archivo, sube
-- otro y avisa; el equivocado queda, y que quede es parte del punto.
