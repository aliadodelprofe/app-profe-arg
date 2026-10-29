-- ============================================================================
-- Migración 0041 — Fotos que no usa nadie
--
-- Cada vez que alguien cambia su foto, la anterior se queda en el depósito
-- para siempre. Nadie la mira, nadie la borra, y ocupa lugar que se paga. Con
-- tres profesores no se nota; con trescientos, y cada uno cambiando el logo
-- dos veces al año, es una carpeta que solo crece.
--
-- POR AHORA NO BORRA NADA. SOLO MIRA.
--
-- Esta tarea borra archivos de verdad y eso no se deshace. Un error en la
-- consulta que decide qué está suelto se lleva puesta la foto de alguien, y no
-- hay vuelta atrás. Así que arranca en modo observación: corre todas las
-- noches, anota qué borraría, y no toca nada.
--
-- Dentro de una semana se mira la tabla. Si lo que anotó es lo que uno
-- esperaba —fotos viejas de gente que cambió la suya, y nada más— se le
-- enciende el borrado con una migración de dos líneas. Un error en modo
-- observación se paga con una fila en una tabla.
--
-- CÓMO SE SABE QUE UN ARCHIVO ESTÁ SUELTO.
--
-- La app guarda en la base la DIRECCIÓN PÚBLICA de la imagen, no el nombre del
-- archivo. Así que un archivo está en uso si su nombre aparece al final de
-- alguna de esas direcciones. Dos lugares y nada más: tenants.avatar_url para
-- los logos y students.avatar_url para las fotos de las personas.
--
-- Y hay una sutileza que importa: la foto de un alumno está repetida en TODAS
-- sus fichas, una por escuela. Alcanza con que una la use para que el archivo
-- esté en uso — por eso la condición se pregunta sobre la tabla entera y no
-- sobre una fila.
--
-- LOS SIETE DÍAS DE GRACIA.
--
-- Un archivo recién subido todavía no está referenciado: la app lo sube y
-- después guarda la dirección. Entre las dos cosas hay segundos, pero si algo
-- se corta en el medio —se cae la conexión, el alumno cierra la app— el
-- archivo queda solo un rato sin que eso signifique nada. Siete días es mucho
-- más de lo que hace falta y no cuesta nada: lo que se gana es no tener que
-- pensar nunca en esa carrera.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. EL CUADERNO
--
-- Una fila por archivo suelto, no una por corrida. `veces` cuenta cuántas
-- noches seguidas apareció: un archivo que lleva siete noches suelto es mucho
-- más seguro de borrar que uno que apareció hoy por primera vez.
--
-- Nadie la lee desde la app. Es para mirar desde el SQL Editor mientras dure
-- el modo observación.
-- ----------------------------------------------------------------------------
create table if not exists public.archivos_sueltos (
  bucket       text not null,
  nombre       text not null,
  primera_vez  timestamptz not null default now(),
  ultima_vez   timestamptz not null default now(),
  veces        int not null default 1,
  borrado_en   timestamptz,
  primary key (bucket, nombre)
);

alter table public.archivos_sueltos enable row level security;
-- Sin políticas: ni `authenticated` ni `anon` la tocan. Igual que
-- mantenimiento_log.

comment on table public.archivos_sueltos is
  'Archivos del depósito que ninguna fila referencia. Mientras dure el modo '
  'observación, la tarea solo escribe acá.';


-- ----------------------------------------------------------------------------
-- 2. LA TAREA
--
-- `p_borrar` viene en false y el programador la llama sin pasarlo. Encender el
-- borrado es cambiar cómo se la llama, y eso es una migración de dos líneas
-- que se puede revisar sola.
--
-- El borrado, cuando se encienda, usa la misma mecánica que la limpieza de
-- comprobantes (migración 0020): un pedido a la API de Storage con la llave
-- `service_role` que vive en Vault. La respuesta no se lee, y no hace falta:
-- si el pedido falló, el archivo sigue ahí y mañana se vuelve a pedir. Se
-- repara sola.
-- ----------------------------------------------------------------------------
create or replace function public.limpiar_archivos_sueltos(p_borrar boolean default false)
returns table (encontrados int, pedidos int)
language plpgsql
set search_path = public
as $$
declare
  TANDA   constant int := 50;
  GRACIA  constant interval := interval '7 days';
  v_url   text;
  v_clave text;
  v_o     record;
  v_encontrados int := 0;
  v_pedidos     int := 0;
begin
  -- Se anota todo lo que está suelto. El `on conflict` es lo que hace que la
  -- cuenta de noches sea una cuenta y no un montón de filas repetidas.
  with sueltos as (
    select o.bucket_id, o.name
      from storage.objects o
     where o.bucket_id in ('avatares', 'logos')
       and o.created_at < now() - GRACIA
       and not exists (
         select 1 from public.tenants t
          where t.avatar_url is not null and t.avatar_url like '%' || o.name
       )
       and not exists (
         select 1 from public.students s
          where s.avatar_url is not null and s.avatar_url like '%' || o.name
       )
  ), anotados as (
    insert into public.archivos_sueltos (bucket, nombre)
    select bucket_id, name from sueltos
    on conflict (bucket, nombre) do update
      set ultima_vez = now(),
          veces = public.archivos_sueltos.veces + 1
    returning 1
  )
  select count(*) into v_encontrados from anotados;

  if not p_borrar then
    return query select v_encontrados, 0;
    return;
  end if;

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'proyecto_url';
  select decrypted_secret into v_clave
    from vault.decrypted_secrets where name = 'service_role_key';

  if v_url is null or v_clave is null then
    raise exception
      'Faltan los secretos proyecto_url y/o service_role_key en Vault. Ver la migración 0020.';
  end if;

  for v_o in
    select a.bucket, a.nombre
      from public.archivos_sueltos a
     where a.borrado_en is null
       -- Siete noches seguidas suelto. Un archivo que apareció hoy por primera
       -- vez puede ser una subida a medio terminar; uno que lleva una semana
       -- no lo es.
       and a.veces >= 7
     order by a.primera_vez
     limit TANDA
  loop
    perform net.http_delete(
      url := v_url || '/storage/v1/object/' || v_o.bucket || '/' || v_o.nombre,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_clave,
        'apikey', v_clave
      )
    );
    update public.archivos_sueltos
       set borrado_en = now()
     where bucket = v_o.bucket and nombre = v_o.nombre;
    v_pedidos := v_pedidos + 1;
  end loop;

  return query select v_encontrados, v_pedidos;
end;
$$;

revoke all on function public.limpiar_archivos_sueltos(boolean) from public;
-- Sin `grant`, igual que las otras dos tareas. Nadie la llama desde la app.


-- ----------------------------------------------------------------------------
-- 3. EL HORARIO
--
-- 07:00 UTC, media hora después de la limpieza de comprobantes, para que las
-- tres tareas de la noche no se pisen.
--
-- Se la llama SIN argumento, así que corre en modo observación. Encenderle el
-- borrado es volver a programarla con `true`.
-- ----------------------------------------------------------------------------
select cron.unschedule('limpiar-archivos-sueltos')
 where exists (select 1 from cron.job where jobname = 'limpiar-archivos-sueltos');

select cron.schedule(
  'limpiar-archivos-sueltos',
  '0 7 * * *',
  $$ select public.limpiar_archivos_sueltos() $$
);
