-- ============================================================================
-- Migración 0032 — Una clase puede ser online
--
-- Hasta ahora un grupo tenía estudio y dirección, y nada más. Eso alcanzaba
-- para una clase grupal, que siempre pasa en una sala. No alcanza para una
-- particular: un profesor que da clases a distancia no tiene dirección que
-- poner, y hoy la app le exige inventar una o dejarla vacía — y el alumno
-- termina sin saber adónde ir ni dónde entrar.
--
-- Dos columnas y no una, a propósito.
--
-- "online" es el HECHO: esta clase no pasa en ningún lado físico. De eso
-- depende que el formulario deje de pedir dirección, que la pantalla del
-- alumno deje de ofrecerle un mapa y que no se le muestre "sin dirección"
-- como si faltara algo.
--
-- "meeting_url" es el DATO: el enlace para entrar. Va aparte y no metido en
-- "address" porque son cosas distintas y la app las usa distinto: una
-- dirección abre un mapa, un enlace abre una videollamada. Guardar una URL en
-- la columna de la dirección funciona hasta que alguien escribe el link de
-- Google Maps de la sala, y ahí ya nadie sabe cuál es cuál.
-- ============================================================================
alter table public.groups
  add column if not exists online      boolean not null default false,
  add column if not exists meeting_url text;

comment on column public.groups.online is
  'La clase no pasa en una sala. El alumno no ve mapa; ve el enlace.';
comment on column public.groups.meeting_url is
  'Dónde entrar cuando es online. Es un enlace, no una dirección.';

-- Una clase online con dirección es una contradicción, y una contradicción
-- guardada es la que después aparece en la pantalla de alguien. Que lo impida
-- la base y no el formulario: una regla que solo vive en la pantalla se saltea
-- con una pestaña del navegador.
alter table public.groups
  add constraint groups_online_sin_direccion
  check (not online or (venue is null and address is null));
