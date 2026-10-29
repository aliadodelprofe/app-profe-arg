-- ============================================================================
-- Migración 0039 — De qué es este grupo
--
-- La 0037 le puso actividades a la ESCUELA. Pero un profe que da bachata y
-- salsa no da las dos en el mismo grupo: tiene un grupo de bachata los martes
-- y uno de salsa los jueves. Saber qué enseña la escuela no alcanza para
-- decirle al alumno de qué es la clase a la que se está anotando.
--
-- UNA SOLA POR GRUPO, Y OPCIONAL.
--
-- Una, porque un grupo es una cosa: "Regulares martes" es de bachata. Si
-- alguna vez alguien hace un grupo mixto, el nombre del grupo lo dice mejor
-- que dos etiquetas.
--
-- Opcional, porque la mayoría de los profesores da una sola actividad y
-- preguntárselo en cada grupo sería hacerle repetir lo que ya dijo en su
-- escuela. La pantalla lo pregunta solo cuando la escuela tiene más de una.
--
-- La referencia es al catálogo y no a lo que da la escuela: si mañana el profe
-- saca "salsa" de su escuela, los grupos de salsa que dio siguen diciendo de
-- qué eran. Borrarles la etiqueta sería reescribir su historia.
-- ============================================================================

alter table public.groups
  add column if not exists discipline_slug text
  references public.disciplines(slug) on delete restrict;

create index if not exists groups_discipline_idx
  on public.groups(discipline_slug);

comment on column public.groups.discipline_slug is
  'De qué actividad es este grupo. Null = la que da la escuela, que casi '
  'siempre es una sola.';
