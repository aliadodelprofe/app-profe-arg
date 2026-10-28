-- ============================================================================
-- Migración 0035 — Una ficha sin correo no le sirve a nadie
--
-- El correo es con lo que el alumno entra a su app: ve sus clases, sus recaps,
-- lo que debe y adónde transferir. Una ficha sin correo existe en la base del
-- profesor y para esa persona no existe en ningún lado — no puede entrar hoy
-- ni el mes que viene, y el profesor no se entera hasta que el alumno
-- pregunta por qué no le anda.
--
-- Ya estaba exigido en los tres formularios que cargan una ficha. Esto lo baja
-- a donde no se saltea: una validación que solo vive en la pantalla se esquiva
-- con una pestaña del navegador, y acá lo que se pierde es el acceso de una
-- persona a sus propios datos.
--
-- ANTES DE CORRER ESTO hay que no tener ninguna ficha sin correo. Si queda
-- alguna, el ALTER falla y dice cuál: eso es lo correcto, porque significa que
-- hay alguien que no puede entrar.
--
--     select t.name, s.full_name
--       from public.students s
--       join public.tenants t on t.id = s.tenant_id
--      where s.email is null or btrim(s.email) = '';
-- ============================================================================
alter table public.students
  add constraint students_necesita_correo
  check (email is not null and btrim(email) <> '');

comment on constraint students_necesita_correo on public.students is
  'Sin correo el alumno no puede entrar a su app. Una ficha asi no le sirve a nadie.';
