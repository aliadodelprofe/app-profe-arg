-- ============================================================================
-- Migración 0008 — Separar el estudio de la dirección
--
-- La 0007 dejó una sola columna, "location". Está mal: son dos datos con dos
-- usos distintos.
--
--   venue    el nombre del estudio: "Vibras", "Bunker". Es como el profe y sus
--            alumnos hablan del lugar. Va en la pantalla.
--   address  la dirección. Es lo que sirve para abrir el mapa y llegar.
--
-- Con un solo campo había que elegir cuál perder: o el alumno lee "Vibras" y
-- no sabe dónde queda, o lee una dirección y no reconoce el lugar del que le
-- hablaron. Con los dos, la app puede mostrar "Vibras" y ofrecer "ver en el
-- mapa" al lado.
--
-- No se guarda un link de Google Maps: se guarda la dirección y el link lo
-- arma la app. Un link pegado se rompe, caduca y obliga al profe a ir a buscar
-- la dirección a otro lado antes de poder cargarla.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- "location" pasa a llamarse "address", que es lo que en realidad va a tener.
--
-- Renombrar una columna de una migración ya aplicada se puede hacer HOY porque
-- nadie la usa todavía: se creó hace un rato, está vacía y ninguna pantalla la
-- lee. Dentro de un mes, con datos adentro y código leyéndola, esto mismo sería
-- una operación delicada y la columna se quedaría con el nombre equivocado para
-- siempre. Los nombres se arreglan temprano o no se arreglan.
--
-- (Que la 0007 quede "mal" está bien: las migraciones aplicadas no se editan.
-- Lo que pasó queda escrito, y la 0008 lo corrige.)
-- ----------------------------------------------------------------------------
alter table public.groups   rename column location to address;
alter table public.sessions rename column location to address;


-- ----------------------------------------------------------------------------
-- Y el nombre del estudio, en los dos niveles, igual que la dirección:
-- lo del grupo es lo de siempre, lo de la clase solo si ese día cambió.
-- ----------------------------------------------------------------------------
alter table public.groups   add column venue text;
alter table public.sessions add column venue text;
