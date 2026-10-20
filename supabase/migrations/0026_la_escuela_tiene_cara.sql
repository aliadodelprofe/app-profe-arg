-- ============================================================================
-- Migración 0026 — La escuela tiene cara
--
-- Un alumno que cursa con dos profesores ve dos renglones de texto y tiene que
-- leerlos para saber cuál es cuál. Con una imagen no los lee: los reconoce.
--
-- Y hay un problema más concreto que estético: hasta ahora, arriba de la
-- pantalla del alumno, al lado del nombre de la escuela estaba la foto DEL
-- ALUMNO. Dos caras, la de la escuela ausente y la propia puesta donde no va.
--
-- El logo es lo contrario de un comprobante. Un comprobante es un documento
-- privado de una persona y vive en un depósito cerrado (migración 0014). Un
-- logo es una marca: existe para que la vean. Por eso este depósito es
-- público y el enlace no se firma. Lo que sí está cerrado es quién lo SUBE.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. La columna
-- ----------------------------------------------------------------------------
alter table public.tenants add column if not exists avatar_url text;

comment on column public.tenants.avatar_url is
  'El logo de la escuela. Lo ven sus alumnos; lo cambia solo el dueño.';


-- ----------------------------------------------------------------------------
-- 2. El depósito
--
-- "public: true" es la diferencia con comprobantes: cualquiera que tenga el
-- enlace ve la imagen, sin pedirle permiso a nadie. Es lo correcto para un
-- logo y hay que decirlo en voz alta: no subas acá nada que no quieras que se
-- vea. La app sube logos y nada más.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 3. Quién puede escribir ahí
--
--     logos/<tenant_id>/<archivo>
--
-- Misma idea que en comprobantes: la primera carpeta dice de qué espacio es el
-- archivo, y de ahí sale el permiso. Pero acá la regla mira
-- my_owned_tenant_ids() y no my_tenant_ids(): el logo lo cambia el DUEÑO, no
-- cualquier miembro del equipo. Es la misma línea que ya separa quién puede
-- renombrar la escuela (migración 0002), y por la misma razón: la identidad de
-- la escuela es de quien la fundó.
--
-- A diferencia de los comprobantes, acá sí se puede reemplazar y borrar. Un
-- comprobante es la prueba de una discusión sobre plata y por eso es
-- inmutable; un logo es una marca y las marcas cambian.
-- ----------------------------------------------------------------------------
create policy "el dueño sube el logo de su escuela"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (select public.my_owned_tenant_ids()::text)
  );

create policy "el dueño reemplaza el logo de su escuela"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (select public.my_owned_tenant_ids()::text)
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (select public.my_owned_tenant_ids()::text)
  );

create policy "el dueño borra el logo de su escuela"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (select public.my_owned_tenant_ids()::text)
  );
