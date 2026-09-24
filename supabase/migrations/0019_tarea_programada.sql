-- ============================================================================
-- Migración 0019 — La tarea programada: la app deja de depender de que alguien
-- la abra
--
-- Hasta ahora las clases y los cargos se generaban cuando el profesor abría el
-- grupo. Funciona, pero deja un agujero: si el profe no entra en toda la
-- primera semana de octubre, el alumno abre su portal y no ve las clases de
-- octubre ni su cuota. La app parece rota cuando en realidad nadie la despertó.
--
-- Esta migración pone a la base a hacerlo sola, todas las noches.
--
-- ANTES DE CORRER ESTO: hay que habilitar la extensión pg_cron desde el panel
-- de Supabase (Database → Extensions → buscar "pg_cron" → habilitar). El
-- `create extension` de abajo no molesta si ya está habilitada.
-- ============================================================================

create extension if not exists pg_cron;


-- ----------------------------------------------------------------------------
-- 1. EL REGISTRO DE LO QUE HIZO
--
-- Sin esto, "¿corrió anoche?" no se puede responder. Guarda una fila por
-- ejecución con cuántos grupos recorrió y cuánto generó.
--
-- SEGURIDAD: tiene el candado puesto y NINGUNA política, a propósito. RLS con
-- cero políticas significa "nadie". Ni un profesor ni un alumno pueden leer
-- esta tabla desde la app — no es asunto suyo, y las filas dicen cuántos
-- grupos hay en TODO el sistema, que es justamente lo que un profesor no tiene
-- que poder ver de los demás.
--
-- Quien sí la lee es el rol `postgres` desde el SQL Editor, que por ser dueño
-- de la tabla no está sujeto a RLS. Ojo con esto al correr control_general.sql:
-- esta tabla va a decir "ok" con 0 reglas, y está bien. Cero reglas es lo más
-- cerrado que existe, no lo más abierto.
-- ----------------------------------------------------------------------------
create table if not exists public.mantenimiento_log (
  id        bigint generated always as identity primary key,
  corrio_a  timestamptz not null default now(),
  grupos    int  not null default 0,
  clases    int  not null default 0,
  cargos    int  not null default 0,
  errores   int  not null default 0,
  detalle   text
);

alter table public.mantenimiento_log enable row level security;


-- ----------------------------------------------------------------------------
-- 2. LA TAREA
--
-- Recorre TODOS los grupos activos de TODOS los profesores y, para cada uno,
-- hace lo mismo que hace la app cuando el profe abre el grupo: primero las
-- clases, después los cargos. En ese orden, porque el cargo del que paga por
-- clase apunta a la próxima clase y la clase tiene que existir antes.
--
-- SEGURIDAD — dos decisiones que conviene entender:
--
-- a) NO es `security definer`. Corre con los permisos de quien la llama, y
--    quien la llama es el rol `postgres` (así programa pg_cron las tareas).
--    `postgres` es dueño de las tablas, así que no está sujeto a RLS y ve todos
--    los grupos de todos los profesores. Que es lo que una tarea de
--    mantenimiento necesita.
--
-- b) NO se le da permiso a `authenticated`. Se revoca de `public` y no se
--    otorga a nadie. Si alguien logueado intentara llamarla desde el navegador,
--    la base le contesta "permiso denegado" antes de ejecutar una sola línea.
--    Esto es importante: si se pudiera llamar, cualquier alumno podría hacer
--    trabajar a la base sobre los datos de todos los profesores del sistema.
--
-- Cada grupo va en su propio bloque con `exception`: si uno falla, se anota y
-- se sigue con los demás. Sin eso, un grupo con datos raros frenaría la tarea
-- para todo el resto y nadie se enteraría hasta que un alumno reclame.
-- ----------------------------------------------------------------------------
create or replace function public.mantenimiento_diario()
returns void
language plpgsql
set search_path = public
as $$
declare
  v_grupo   record;
  v_grupos  int := 0;
  v_clases  int := 0;
  v_cargos  int := 0;
  v_errores int := 0;
  v_detalle text := '';
begin
  for v_grupo in
    select g.id, g.name from public.groups g where g.status = 'active'
  loop
    v_grupos := v_grupos + 1;
    begin
      v_clases := v_clases + (select count(*) from public.asegurar_clases(v_grupo.id));
      v_cargos := v_cargos + public.asegurar_cargos(v_grupo.id);
    exception when others then
      v_errores := v_errores + 1;
      v_detalle := v_detalle || v_grupo.name || ': ' || sqlerrm || ' | ';
    end;
  end loop;

  insert into public.mantenimiento_log (grupos, clases, cargos, errores, detalle)
  values (v_grupos, v_clases, v_cargos, v_errores, nullif(left(v_detalle, 2000), ''));
end;
$$;

revoke all on function public.mantenimiento_diario() from public;
-- Y a propósito, ningún `grant`: esta función es solo para el programador de
-- tareas. Nadie la llama desde la app.


-- ----------------------------------------------------------------------------
-- 3. EL HORARIO
--
-- Todas las noches a las 06:00 UTC, que en Buenos Aires son las 03:00. Hora
-- muerta: nadie está usando la app y si algo tarda, no molesta a nadie.
--
-- Todos los días y no una vez por mes, por dos razones. Una, se repara sola:
-- si una noche falla, la siguiente arregla lo que faltó. Dos, es barata — con
-- todo ya creado, la tarea no hace nada y termina en milisegundos.
--
-- El `unschedule` de arriba hace que correr esta migración dos veces no deje
-- dos tareas haciendo lo mismo.
-- ----------------------------------------------------------------------------
select cron.unschedule('mantenimiento-diario')
 where exists (select 1 from cron.job where jobname = 'mantenimiento-diario');

select cron.schedule(
  'mantenimiento-diario',
  '0 6 * * *',
  $$ select public.mantenimiento_diario() $$
);
