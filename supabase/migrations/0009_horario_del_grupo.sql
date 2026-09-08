-- ============================================================================
-- Migración 0009 — El horario fijo del grupo
--
-- Una clase regular pasa siempre el mismo día, a la misma hora, en el mismo
-- lugar. Hasta ahora eso había que volver a escribirlo cada vez que se
-- cargaban clases. Se guarda una sola vez, en el grupo, y las clases se crean
-- solas a partir de acá.
--
-- Las excepciones —feriado, lluvia, la sala ocupada— no se resuelven acá: se
-- resuelven editando o cancelando esa clase puntual, que ya se puede desde la
-- 0007.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- weekday: qué día de la semana se junta el grupo.
--
--   0 = domingo, 1 = lunes, 2 = martes, 3 = miércoles,
--   4 = jueves,  5 = viernes, 6 = sábado
--
-- Es la numeración de "extract(dow ...)" de Postgres y también la de
-- JavaScript, así que la base y la app cuentan igual y no hay que traducir en
-- el medio. Traducir numeraciones de días es una fuente clásica de errores de
-- un día.
--
-- Vacío significa "este grupo no tiene horario fijo": nada se genera solo, y
-- las clases se cargan a mano. Es lo correcto para una formación con fechas
-- salteadas o para clases particulares.
--
-- UN SOLO DÍA POR GRUPO, a propósito. Se evaluó permitir varios y se descartó
-- el 7/9/2026: si los del martes y los del jueves pueden ser gente distinta,
-- entonces son dos grupos, porque un grupo es quiénes cursan juntos. El
-- razonamiento completo está en docs/ESTADO.md.
-- ----------------------------------------------------------------------------
alter table public.groups
  add column weekday smallint check (weekday between 0 and 6);


-- ----------------------------------------------------------------------------
-- La hora y la duración de siempre.
--
-- Son el molde con el que se crean las clases nuevas, no una verdad sobre las
-- que ya existen: cambiar el horario del grupo no toca ninguna clase ya
-- cargada. Si el profe quiere mover una clase que ya estaba, la edita; si
-- quiere mover todas, cambia el molde y las que vengan salen con el horario
-- nuevo. Pisar clases pasadas al cambiar un valor del grupo sería reescribir
-- la historia.
-- ----------------------------------------------------------------------------
alter table public.groups add column default_start_time   time;
alter table public.groups add column default_duration_min int;
