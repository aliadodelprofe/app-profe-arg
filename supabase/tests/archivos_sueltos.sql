-- ============================================================================
-- PRUEBA DE limpiar_archivos_sueltos  (migración 0041)
--
-- Esta tarea, cuando se le encienda el borrado, va a borrar archivos de
-- verdad. Lo que hay que verificar antes de encenderla es lo único que
-- importa: que NO confunda un archivo en uso con uno suelto. Un falso positivo
-- acá es la foto de alguien que desaparece.
--
-- Y que mientras esté en modo observación no pida ningún borrado, que es la
-- promesa con la que se aplicó.
--
-- Correr como `postgres`: la función no tiene permiso para nadie más, igual
-- que las otras dos tareas de la noche.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Tres archivos inventados en el depósito, con tres situaciones distintas.
-- Se insertan con fecha vieja para saltear los siete días de gracia.
-- ----------------------------------------------------------------------------
insert into storage.objects (bucket_id, name, owner, created_at, updated_at)
values
  ('avatares', 'prueba-suelto/viejo-sin-duenio.jpg', null, now() - interval '30 days', now()),
  ('avatares', 'prueba-usado/la-que-esta-en-uso.jpg', null, now() - interval '30 days', now()),
  ('avatares', 'prueba-reciente/recien-subida.jpg',  null, now() - interval '1 hour',  now())
on conflict do nothing;

-- La del medio la usa una ficha, con la dirección pública completa, que es
-- como la guarda la app de verdad.
update public.students
   set avatar_url = 'https://ejemplo.supabase.co/storage/v1/object/public/avatares/prueba-usado/la-que-esta-en-uso.jpg'
 where id = (select id from public.students order by created_at limit 1);

do $$
declare
  v_enc int;
  v_ped int;
begin
  select encontrados, pedidos into v_enc, v_ped
    from public.limpiar_archivos_sueltos();

  -- 1. La vieja y sin dueño queda anotada.
  perform set_config('prueba.v1',
    case when exists (
      select 1 from public.archivos_sueltos
       where nombre = 'prueba-suelto/viejo-sin-duenio.jpg')
     then 'PASA' else 'FALLA - no la vio' end, false);

  -- 2. LA QUE ESTÁ EN USO NO SE ANOTA. Es la fila que importa de toda esta
  --    prueba: si esto falla, encender el borrado borra fotos de gente.
  perform set_config('prueba.v2',
    case when not exists (
      select 1 from public.archivos_sueltos
       where nombre = 'prueba-usado/la-que-esta-en-uso.jpg')
     then 'PASA' else 'FALLA - dio por suelta una foto EN USO' end, false);

  -- 3. La recién subida tampoco: los siete días de gracia existen para que
  --    una subida a medio terminar no cuente como basura.
  perform set_config('prueba.v3',
    case when not exists (
      select 1 from public.archivos_sueltos
       where nombre = 'prueba-reciente/recien-subida.jpg')
     then 'PASA' else 'FALLA - no respeto los dias de gracia' end, false);

  -- 4. En modo observación no pide ningún borrado.
  perform set_config('prueba.v4',
    case when v_ped = 0 then 'PASA - no pidio ningun borrado'
         else 'FALLA - pidio ' || v_ped || ' borrados estando en modo observacion' end,
    false);

  -- 5. Correrla de nuevo no duplica la fila: cuenta las noches.
  perform public.limpiar_archivos_sueltos();
  perform set_config('prueba.v5',
    case when (select veces from public.archivos_sueltos
                where nombre = 'prueba-suelto/viejo-sin-duenio.jpg') = 2
     then 'PASA - va por la segunda noche'
     else 'FALLA - no conto las noches' end, false);

  -- 6. Con el borrado encendido, igual NO toca la que lleva dos noches: hacen
  --    falta siete. Es el freno que hace que una corrida rara no se lleve
  --    puesto nada.
  select encontrados, pedidos into v_enc, v_ped
    from public.limpiar_archivos_sueltos(true);
  perform set_config('prueba.v6',
    case when v_ped = 0 then 'PASA - espera las siete noches'
         else 'FALLA - borro una de dos noches' end, false);
end $$;

-- ----------------------------------------------------------------------------
-- 7. Un profesor no puede ejecutarla ni leer el cuaderno.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.limpiar_archivos_sueltos();
  perform set_config('prueba.v7', 'FALLA - un profesor pudo ejecutarla', false);
exception when others then
  perform set_config('prueba.v7', 'PASA - la base lo rechazo (' || sqlstate || ')', false);
end $$;

do $$
declare v_n int;
begin
  select count(*) into v_n from public.archivos_sueltos;
  perform set_config('prueba.v8',
    case when v_n = 0 then 'PASA - no ve ninguna fila'
         else 'FALLA - ve ' || v_n end, false);
end $$;

reset role;

select 'Una foto vieja y sin dueño queda anotada' as prueba,
       coalesce(current_setting('prueba.v1', true), 'NO SE EJECUTO') as resultado
union all
select 'Una foto EN USO no se anota nunca',
       coalesce(current_setting('prueba.v2', true), 'NO SE EJECUTO')
union all
select 'Una recien subida tampoco: hay dias de gracia',
       coalesce(current_setting('prueba.v3', true), 'NO SE EJECUTO')
union all
select 'En modo observacion no pide ningun borrado',
       coalesce(current_setting('prueba.v4', true), 'NO SE EJECUTO')
union all
select 'Correrla de nuevo cuenta las noches, no duplica',
       coalesce(current_setting('prueba.v5', true), 'NO SE EJECUTO')
union all
select 'Con el borrado encendido espera las siete noches',
       coalesce(current_setting('prueba.v6', true), 'NO SE EJECUTO')
union all
select 'Un profesor NO puede ejecutarla',
       coalesce(current_setting('prueba.v7', true), 'NO SE EJECUTO')
union all
select 'Un profesor NO ve el cuaderno',
       coalesce(current_setting('prueba.v8', true), 'NO SE EJECUTO');

rollback;
