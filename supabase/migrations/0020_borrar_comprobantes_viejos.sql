-- ============================================================================
-- Migración 0020 — Los comprobantes se borran a los 6 meses de confirmado el
-- pago
--
-- Es una promesa que la app ya le hace al alumno y que hasta hoy no cumplía:
-- sube la foto del comprobante y esa foto se quedaba en el depósito para
-- siempre. Guardar indefinidamente datos de alguien que no los necesita más es
-- una deuda que solo crece.
--
-- POR QUÉ ESTO NO SE PUEDE HACER CON UN `delete`
--
-- En Supabase, borrar la fila de `storage.objects` con SQL **no borra el
-- archivo**: lo deja huérfano en el depósito, ocupando lugar y sin nada que lo
-- referencie. Está documentado. El único borrado de verdad es el de la API de
-- Storage, que es HTTP.
--
-- Por eso esta migración necesita dos piezas nuevas:
--   - pg_net, para que la base pueda hacer pedidos HTTP.
--   - Vault, para guardar la llave con la que se autentican esos pedidos.
--
-- ANTES DE CORRER ESTO:
--   1. Habilitar `pg_net` en el panel (Database → Extensions).
--   2. Cargar los dos secretos. Ese paso NO está en este archivo a propósito —
--      ver el bloque de seguridad más abajo.
-- ============================================================================

create extension if not exists pg_net;


-- ----------------------------------------------------------------------------
-- 1. QUEDA REGISTRO DE QUE SE BORRÓ
--
-- Cuando el comprobante desaparece, `receipt_url` queda en null. Si solo
-- hiciéramos eso, dentro de un año el profesor abriría un pago viejo y vería
-- exactamente lo mismo que si el alumno nunca hubiera adjuntado nada. Son dos
-- situaciones distintas y conviene poder distinguirlas.
-- ----------------------------------------------------------------------------
alter table public.payments
  add column if not exists receipt_deleted_at timestamptz;


-- ============================================================================
-- SEGURIDAD — LEER ESTO ANTES DE SEGUIR
--
-- La llave que se usa acá es la `service_role`. No es una contraseña más: es la
-- llave maestra del proyecto. Ignora RLS por completo. Con ella se lee y se
-- escribe cualquier fila de cualquier profesor y de cualquier alumno. Por eso
-- la regla de siempre: **la service_role NUNCA va al front-end.** En el
-- navegador solo vive la `anon`, que sí está sujeta a RLS.
--
-- Cómo se protege acá:
--
--   a) NO ESTÁ EN ESTE ARCHIVO. Los dos secretos se cargan a mano, una sola
--      vez por proyecto, desde el SQL Editor. Si estuvieran escritos acá,
--      quedarían en el repositorio de GitHub para siempre — y el historial de
--      Git no se limpia borrando la línea después.
--
--      Se cargan así (NO pegar esto en ningún archivo del repo):
--
--          select vault.create_secret('https://TU-PROYECTO.supabase.co', 'proyecto_url');
--          select vault.create_secret('LA-CLAVE-SERVICE-ROLE',           'service_role_key');
--
--      Van los dos, y no solo la clave, porque la URL cambia entre aliado-dev
--      y aliado-prod. Leyéndolas de Vault, esta misma migración sirve para los
--      dos proyectos sin editar una letra.
--
--   b) Vault las guarda cifradas. Se leen por `vault.decrypted_secrets`, que
--      solo puede consultar `postgres`. Ni `authenticated` ni `anon` la ven.
--
--   c) La función de abajo no tiene `grant` para nadie. Solo la ejecuta el
--      programador de tareas.
--
-- QUÉ SIGUE SIENDO CIERTO, PARA QUE NO HAYA SORPRESAS: cualquiera que pueda
-- abrir el SQL Editor del proyecto puede leer esa llave. Eso ya era así antes
-- de Vault — la llave está a la vista en la configuración del panel. Lo que
-- Vault agrega es que la llave no viaja en un archivo ni queda en el
-- historial de Git. Es una protección real, pero es esa y no otra.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 2. LA LIMPIEZA
--
-- Funciona en dos pasos, y el orden importa:
--
--   PASO 1 — Los comprobantes vencidos que YA NO ESTÁN en el depósito: se les
--            suelta la referencia y se anota la fecha de borrado.
--   PASO 2 — Los comprobantes vencidos que TODAVÍA ESTÁN: se pide a la API de
--            Storage que los borre.
--
-- Es el mismo patrón declarativo de asegurar_cargos: en vez de acordarse de
-- hacer algo cuando pasa un evento, cada corrida verifica una regla —"ningún
-- comprobante confirmado hace más de 6 meses sigue existiendo"— y arregla lo
-- que falte.
--
-- Eso da algo importante gratis: **la confirmación no depende de la respuesta
-- HTTP.** pg_net es asincrónico, la respuesta llega después y en otra tabla. Si
-- tuviéramos que leerla, habría que guardar el número de pedido, esperar, e
-- interpretarlo. Acá no hace falta: si el pedido falló, el archivo sigue ahí y
-- mañana se vuelve a pedir. Si funcionó, el archivo ya no está y mañana el
-- paso 1 lo da por cerrado. Se repara sola.
--
-- La tanda está limitada a 50 por corrida. Corriendo todas las noches alcanza
-- de sobra, y evita que un día raro dispare cientos de pedidos de una.
-- ----------------------------------------------------------------------------
create or replace function public.borrar_comprobantes_viejos()
returns table (cerrados int, pedidos int)
language plpgsql
set search_path = public
as $$
declare
  TANDA    constant int := 50;
  v_corte  timestamptz := now() - interval '6 months';
  v_url    text;
  v_clave  text;
  v_p      record;
  v_cerrados int := 0;
  v_pedidos  int := 0;
begin
  -- PASO 1 -------------------------------------------------------------------
  with cerrados as (
    update public.payments p
       set receipt_url = null,
           receipt_deleted_at = now()
     where p.receipt_url is not null
       and p.status = 'confirmed'
       and p.confirmed_at < v_corte
       and not exists (
         select 1 from storage.objects o
          where o.bucket_id = 'comprobantes'
            and o.name = p.receipt_url
       )
    returning 1
  )
  select count(*) into v_cerrados from cerrados;

  -- PASO 2 -------------------------------------------------------------------
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'proyecto_url';
  select decrypted_secret into v_clave
    from vault.decrypted_secrets where name = 'service_role_key';

  if v_url is null or v_clave is null then
    raise exception
      'Faltan los secretos proyecto_url y/o service_role_key en Vault. Ver la migración 0020.';
  end if;

  for v_p in
    select p.receipt_url
      from public.payments p
     where p.receipt_url is not null
       and p.status = 'confirmed'
       and p.confirmed_at < v_corte
       and exists (
         select 1 from storage.objects o
          where o.bucket_id = 'comprobantes'
            and o.name = p.receipt_url
       )
     order by p.confirmed_at
     limit TANDA
  loop
    perform net.http_delete(
      url := v_url || '/storage/v1/object/comprobantes/' || v_p.receipt_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_clave,
        'apikey', v_clave
      )
    );
    v_pedidos := v_pedidos + 1;
  end loop;

  return query select v_cerrados, v_pedidos;
end;
$$;

revoke all on function public.borrar_comprobantes_viejos() from public;
-- Sin `grant`, igual que mantenimiento_diario(). Nadie la llama desde la app.


-- ----------------------------------------------------------------------------
-- 3. EL HORARIO
--
-- Media hora después del mantenimiento, para que no se pisen: 06:30 UTC son
-- las 03:30 en Buenos Aires.
-- ----------------------------------------------------------------------------
select cron.unschedule('borrar-comprobantes-viejos')
 where exists (select 1 from cron.job where jobname = 'borrar-comprobantes-viejos');

select cron.schedule(
  'borrar-comprobantes-viejos',
  '30 6 * * *',
  $$ select public.borrar_comprobantes_viejos() $$
);
