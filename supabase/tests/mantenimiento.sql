-- ============================================================================
-- PRUEBA DE LA TAREA PROGRAMADA  (migración 0019)
--
-- La tarea es la única pieza del sistema que corre sin que haya nadie mirando.
-- Si se rompe, no salta ningún error en pantalla: simplemente un día el alumno
-- abre su portal y no están las clases del mes. Por eso se prueba a mano.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
--
-- IMPORTANTE: esta prueba se corre como `postgres` (que es lo que sos en el
-- SQL Editor). Es el único rol que puede ejecutar la tarea, y eso mismo se
-- verifica en las filas 5 y 6.
--
-- AVISO: dispara la alerta de Supabase — la tarea inserta clases y cargos.
-- ============================================================================

begin;

do $$
declare
  v_activos   int;
  v_primera   record;
  v_segunda   record;
  v_programada int;
begin
  -- ---------------------------------------------------------------------- 1
  -- La tarea quedó programada, y todas las noches.
  select count(*) into v_programada
    from cron.job
   where jobname = 'mantenimiento-diario'
     and schedule = '0 6 * * *'
     and active;

  perform set_config('prueba.v1',
    case when v_programada = 1 then 'PASA'
         else 'FALLA - no esta programada, o quedo con otro horario' end, false);

  -- ------------------------------------------------------------------ 2 y 3
  -- Corre sin errores, y recorre los grupos de TODOS los profesores.
  --
  -- La fila 3 es la que importa de verdad: una tarea que solo viera los grupos
  -- de un profesor dejaría a los demás sin clases y nadie se enteraría.
  select count(*) into v_activos from public.groups where status = 'active';

  perform public.mantenimiento_diario();
  select * into v_primera from public.mantenimiento_log order by id desc limit 1;

  perform set_config('prueba.v2',
    case when v_primera.errores = 0 then 'PASA'
         else 'FALLA - ' || v_primera.errores || ' errores: '
              || coalesce(v_primera.detalle, 'sin detalle') end, false);

  perform set_config('prueba.v3',
    case when v_primera.grupos = v_activos then 'PASA'
         else 'FALLA - recorrio ' || v_primera.grupos || ' grupos y hay '
              || v_activos || ' activos en todo el sistema' end, false);

  -- ---------------------------------------------------------------------- 4
  -- Llamarla de nuevo no genera nada. Es lo que permite correrla todas las
  -- noches sin miedo: si anoche ya hizo el trabajo, hoy no duplica nada.
  perform public.mantenimiento_diario();
  select * into v_segunda from public.mantenimiento_log order by id desc limit 1;

  perform set_config('prueba.v4',
    case when v_segunda.clases = 0 and v_segunda.cargos = 0 then 'PASA'
         else 'FALLA - la segunda corrida creo ' || v_segunda.clases
              || ' clases y ' || v_segunda.cargos || ' cargos' end, false);

end $$;


-- ----------------------------------------------------------------------------
-- 5 y 6 — Nadie logueado puede ejecutar la tarea ni leer su registro.
--
-- Son dos candados distintos: el de la fila 5 es un permiso de ejecución
-- (`revoke`), el de la fila 6 es RLS. Si el primero fallara, cualquier alumno
-- podría poner a la base a trabajar sobre los datos de todos los profesores.
--
-- El cambio de rol va acá afuera y no adentro del bloque: PL/pgSQL no acepta
-- `set local role`.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_pudo  boolean := true;
  v_filas int;
begin
  begin
    perform public.mantenimiento_diario();
  exception when others then
    v_pudo := false;
  end;

  perform set_config('prueba.v5',
    case when not v_pudo then 'PASA'
         else 'FALLA - un profesor logueado pudo ejecutar la tarea' end, false);

  -- Dos formas de estar cerrado y las dos valen: que RLS devuelva cero filas,
  -- o que la base ni siquiera le deje mirar la tabla.
  begin
    select count(*) into v_filas from public.mantenimiento_log;
  exception when insufficient_privilege then
    v_filas := 0;
  end;

  perform set_config('prueba.v6',
    case when v_filas = 0 then 'PASA'
         else 'FALLA - un profesor vio ' || v_filas || ' filas del registro' end, false);
end $$;


-- ----------------------------------------------------------------------------
-- Resultado
-- ----------------------------------------------------------------------------
reset role;

select * from (values
  ('La tarea quedo programada para todas las noches', current_setting('prueba.v1', true)),
  ('Corre sin errores',                               current_setting('prueba.v2', true)),
  ('Recorre los grupos de TODOS los profesores',      current_setting('prueba.v3', true)),
  ('Correrla de nuevo no genera nada',                current_setting('prueba.v4', true)),
  ('Un profesor NO puede ejecutarla',                 current_setting('prueba.v5', true)),
  ('Un profesor NO puede leer el registro',           current_setting('prueba.v6', true))
) as r(prueba, resultado);

rollback;
