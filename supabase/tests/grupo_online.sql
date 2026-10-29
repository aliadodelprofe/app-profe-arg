-- ============================================================================
-- PRUEBA DE online / meeting_url  (migración 0032)
--
-- La regla dice que una clase online no puede tener dirección. Es una
-- contradicción guardada —"entrá por videollamada, en Corrientes 1234"— y las
-- contradicciones guardadas son las que después aparecen en la pantalla de
-- alguien.
--
-- Hasta hoy la regla vivía sin prueba, y la app acaba de empezar a ofrecer
-- online para CUALQUIER formato y no solo para las particulares. Una regla que
-- de golpe se usa en el triple de casos es justo la que conviene tener atada.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
--
-- REQUISITOS: aislamiento_cargos.sql ya corrido (necesita profe2).
-- ============================================================================

begin;

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

select set_config('prueba.escuela',
  (select id::text from public.tenants where name = 'Escuela de Prueba 2'), false);

do $$
declare
  v_escuela uuid := nullif(current_setting('prueba.escuela', true), '')::uuid;
  v_id uuid;
begin
  -- 1. Un grupo online, sin sala, con su enlace.
  insert into public.groups (tenant_id, name, format, status, online, meeting_url)
  values (v_escuela, 'PRUEBA online', 'regular', 'active', true,
          'https://meet.google.com/abc-defg-hij')
  returning id into v_id;
  perform set_config('prueba.v1',
    case when v_id is not null then 'PASA' else 'FALLA - no lo guardo' end, false);

  -- 2. Y el enlace queda guardado donde va, no mezclado con la dirección.
  perform set_config('prueba.v2',
    case when exists (
      select 1 from public.groups
       where id = v_id and online and address is null
         and meeting_url = 'https://meet.google.com/abc-defg-hij')
     then 'PASA' else 'FALLA' end, false);

  -- 3. Online CON dirección: la contradicción no entra.
  begin
    insert into public.groups (tenant_id, name, format, status, online, address)
    values (v_escuela, 'PRUEBA online con direccion', 'regular', 'active', true,
            'Av. Corrientes 1234');
    perform set_config('prueba.v3', 'FALLA - guardo una clase online con direccion', false);
  exception when check_violation then
    perform set_config('prueba.v3', 'PASA - la base lo rechazo', false);
  end;

  -- 4. Ni con sala, que es la otra mitad de la misma regla.
  begin
    insert into public.groups (tenant_id, name, format, status, online, venue)
    values (v_escuela, 'PRUEBA online con sala', 'regular', 'active', true, 'Vibras');
    perform set_config('prueba.v4', 'FALLA - guardo una clase online con sala', false);
  exception when check_violation then
    perform set_config('prueba.v4', 'PASA - la base lo rechazo', false);
  end;

  -- 5. Y pasar a online un grupo que YA tiene sala tampoco: la regla tiene que
  --    valer al editar, no solo al crear. Es el camino por el que se cuelan
  --    las contradicciones cuando la regla se escribió pensando en el alta.
  insert into public.groups (tenant_id, name, format, status, venue, address)
  values (v_escuela, 'PRUEBA presencial', 'regular', 'active', 'Vibras', 'Corrientes 1234')
  returning id into v_id;
  begin
    update public.groups set online = true where id = v_id;
    perform set_config('prueba.v5', 'FALLA - lo dejo pasar a online con la sala puesta', false);
  exception when check_violation then
    perform set_config('prueba.v5', 'PASA - la base lo rechazo', false);
  end;

  -- 6. Vaciando la sala en el mismo movimiento, sí. Es lo que hace la app.
  update public.groups
     set online = true, venue = null, address = null
   where id = v_id;
  perform set_config('prueba.v6',
    case when exists (select 1 from public.groups where id = v_id and online)
     then 'PASA' else 'FALLA' end, false);

  -- 7. Un grupo presencial sigue pudiendo tener su dirección: la regla recorta
  --    un caso, no todos.
  perform set_config('prueba.v7',
    case when exists (
      select 1 from public.groups
       where tenant_id = v_escuela and name = 'PRUEBA online' and not coalesce(online, false))
     then 'FALLA - el online quedo presencial'
     else 'PASA' end, false);
end $$;

select 'Un grupo online se guarda sin sala' as prueba,
       coalesce(current_setting('prueba.v1', true), 'NO SE EJECUTO') as resultado
union all
select 'El enlace va en su columna, no en la direccion',
       coalesce(current_setting('prueba.v2', true), 'NO SE EJECUTO')
union all
select 'Online CON direccion no entra',
       coalesce(current_setting('prueba.v3', true), 'NO SE EJECUTO')
union all
select 'Online CON sala tampoco',
       coalesce(current_setting('prueba.v4', true), 'NO SE EJECUTO')
union all
select 'Pasar a online con la sala puesta se rechaza',
       coalesce(current_setting('prueba.v5', true), 'NO SE EJECUTO')
union all
select 'Vaciando la sala en el mismo movimiento, si',
       coalesce(current_setting('prueba.v6', true), 'NO SE EJECUTO')
union all
select 'La regla recorta un caso, no todos',
       coalesce(current_setting('prueba.v7', true), 'NO SE EJECUTO');

rollback;
