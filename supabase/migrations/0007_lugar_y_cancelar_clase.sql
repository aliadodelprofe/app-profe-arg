-- ============================================================================
-- Migración 0007 — El lugar, y poder cancelar una clase
--
-- Dos agregados chicos que hacen falta antes de poder generar clases en serie.
-- No se toca ninguna tabla existente más allá de sumarles columnas, y ninguna
-- regla de seguridad cambia: las políticas trabajan por fila, no por columna,
-- así que lo que ya está protegido sigue protegido igual.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. EL LUGAR
--
-- Hasta ahora no existía en ningún lado, y es de las primeras cosas que un
-- alumno necesita saber: dónde es la clase.
--
-- Va en los dos niveles a propósito:
--   groups.location    el lugar de siempre. Se carga una vez.
--   sessions.location  vacío = donde siempre. Con algo = ese día fue en otro
--                      lado, porque la sala estaba ocupada o llovió.
--
-- Es texto libre y no una tabla de salas. Un profesor independiente alquila
-- dos o tres lugares y los escribe como se le canta. Una tabla de salas sería
-- pedirle que administre un catálogo para no escribir dos palabras.
-- ----------------------------------------------------------------------------
alter table public.groups   add column location text;
alter table public.sessions add column location text;


-- ----------------------------------------------------------------------------
-- 2. CANCELAR UNA CLASE
--
-- Feriado, lluvia, la sala se cayó. La clase estaba anunciada y no va a pasar.
--
-- Se marca como cancelada en vez de borrarla. Borrarla se llevaría puesto lo
-- que ya está colgado de ella —asistencias, cargos— y dejaría al alumno sin
-- entender por qué desapareció del calendario una clase que él vio anunciada.
-- Una clase cancelada sigue siendo parte de la historia del grupo.
--
-- Ojo: cancelar NO anula los cargos que esa clase haya generado. Eso es otra
-- decisión, la del saldo a favor, que sigue pendiente en docs/ESTADO.md.
-- ----------------------------------------------------------------------------
alter table public.sessions
  add column status text not null default 'scheduled'
  check (status in ('scheduled', 'cancelled'));


-- ----------------------------------------------------------------------------
-- Nada más. En particular, NO se guarda acá el patrón de repetición del grupo
-- (día de la semana y hora fija), a propósito: falta decidir si un grupo puede
-- tener varios días por semana —"principiantes, martes y jueves"—, y esa
-- decisión define si el patrón es una columna o una tabla aparte. Mientras
-- tanto, el generador de clases pregunta el día y la hora cada vez.
-- ----------------------------------------------------------------------------
