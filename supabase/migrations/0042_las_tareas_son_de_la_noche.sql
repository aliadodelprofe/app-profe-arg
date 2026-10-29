-- ============================================================================
-- Migración 0042 — Las tareas de la noche no las ejecuta nadie más
--
-- Las tres tareas programadas —el mantenimiento, el borrado de comprobantes
-- viejos y la limpieza de archivos sueltos— terminan con la misma línea:
--
--     revoke all on function ... from public;
--
-- Y esa línea NO alcanza. En Supabase, el proyecto viene con permisos por
-- omisión que le dan EXECUTE sobre las funciones nuevas del esquema public a
-- los roles `anon` y `authenticated`. Son concesiones a esos roles en
-- concreto, no a PUBLIC, así que revocarle a PUBLIC no las toca: quedan.
--
-- CÓMO SE DESCUBRIÓ, QUE ES LO INTERESANTE.
--
-- Las pruebas de las dos tareas viejas dicen "un profesor NO puede
-- ejecutarla" y vienen pasando hace meses. Pasaban por el motivo equivocado:
-- el profesor SÍ podía ejecutarlas, y lo que fallaba adentro era otra cosa —
-- un `insert` en una tabla sin políticas, una lectura de Vault que su rol no
-- tiene. La función reventaba, la prueba veía un error y lo daba por bueno.
--
-- La tercera tarea no tuvo esa suerte: en modo observación no escribe nada ni
-- lee Vault, así que corrió hasta el final sin error y la prueba lo dijo. Un
-- caso que no se rompe por accidente es el que destapa que la protección era
-- un accidente.
--
-- POR QUÉ IMPORTA, AUNQUE HOY NO PASE NADA.
--
-- Hoy ninguna de las tres hace daño en manos de un usuario: RLS le tapa las
-- escrituras y Vault no le abre los secretos. Pero esa es una defensa de
-- segunda línea, y la primera no estaba puesta. El día que a una de estas
-- funciones se le agregue algo que no choque contra RLS —y a la de archivos
-- hay que encenderle el borrado— el agujero se abre solo, sin que nadie haya
-- tocado la línea que lo protegía.
-- ============================================================================

revoke execute on function public.mantenimiento_diario()            from anon, authenticated;
revoke execute on function public.borrar_comprobantes_viejos()      from anon, authenticated;
revoke execute on function public.limpiar_archivos_sueltos(boolean) from anon, authenticated;

-- Y a PUBLIC también, por si el día de mañana alguien recrea una de estas
-- funciones sin acordarse: `create or replace` conserva los permisos, pero un
-- `drop` y `create` los vuelve a poner.
revoke all on function public.mantenimiento_diario()            from public;
revoke all on function public.borrar_comprobantes_viejos()      from public;
revoke all on function public.limpiar_archivos_sueltos(boolean) from public;

-- El programador de tareas corre como el dueño de la base, que no necesita
-- ningún permiso explícito. Por eso no hay un `grant` acá: estas funciones no
-- las llama nadie, se ejecutan solas.
