-- ============================================================================
-- PRUEBA DE disciplines / tenant_disciplines  (migración 0037)
--
-- Lo que enseña una escuela no es un dato sensible, pero sí es un dato de
-- alguien: el profe decide qué pone en SU escuela y nadie más. Y el día que
-- exista un buscador, esta tabla va a ser lo que lo alimente, así que lo que
-- se verifica acá es que hoy esté bien cerrada.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
--
-- REQUISITOS: aislamiento_cargos.sql y aislamiento_alumno.sql ya corridos.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Como Profe 2: le pone dos actividades a su escuela.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

select set_config('prueba.escuela',
  (select id::text from public.tenants where name = 'Escuela de Prueba 2'), false);

insert into public.tenant_disciplines (tenant_id, slug)
select nullif(current_setting('prueba.escuela', true), '')::uuid, s
  from (values ('bachata'), ('salsa')) as v(s)
on conflict do nothing;

do $$
declare
  v_escuela uuid := nullif(current_setting('prueba.escuela', true), '')::uuid;
  v_n int;
begin
  -- 1. El catálogo se lee: sin esto el menú de la pantalla queda vacío.
  select count(*) into v_n from public.disciplines;
  perform set_config('prueba.v1',
    case when v_n >= 20 then 'PASA - ' || v_n || ' actividades en el catalogo'
         else 'FALLA - solo ' || v_n || ' actividades' end, false);

  -- 2. Ve las suyas.
  select count(*) into v_n
    from public.tenant_disciplines where tenant_id = v_escuela;
  perform set_config('prueba.v2',
    case when v_n = 2 then 'PASA' else 'FALLA - ve ' || v_n end, false);

  -- 3. La misma actividad dos veces no se apila.
  begin
    insert into public.tenant_disciplines (tenant_id, slug) values (v_escuela, 'bachata');
    perform set_config('prueba.v3', 'FALLA - la cargo dos veces', false);
  exception when unique_violation then
    perform set_config('prueba.v3', 'PASA - la base lo rechazo', false);
  end;

  -- 4. Una actividad que no existe en el catálogo no entra. Es lo que evita
  --    que vuelva el texto libre por la ventana.
  begin
    insert into public.tenant_disciplines (tenant_id, slug) values (v_escuela, 'malambo-espacial');
    perform set_config('prueba.v4', 'FALLA - acepto una que no esta en el catalogo', false);
  exception when others then
    perform set_config('prueba.v4', 'PASA - la base lo rechazo', false);
  end;

  -- 5. Nadie escribe el catálogo desde la app: no hay politica de insert, y
  --    sin politica RLS no deja pasar.
  begin
    insert into public.disciplines (slug, name) values ('inventada', 'Inventada');
    perform set_config('prueba.v5', 'FALLA - pudo agregar al catalogo', false);
  exception when others then
    perform set_config('prueba.v5', 'PASA - la base lo rechazo (' || sqlstate || ')', false);
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 6 y 7. Profe 1 no toca ni ve lo de Profe 2.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_escuela uuid := nullif(current_setting('prueba.escuela', true), '')::uuid;
  v_n int;
begin
  select count(*) into v_n
    from public.tenant_disciplines where tenant_id = v_escuela;
  perform set_config('prueba.v6',
    case when v_n = 0 then 'PASA' else 'FALLA - ve ' || v_n || ' de una escuela ajena' end,
    false);

  begin
    insert into public.tenant_disciplines (tenant_id, slug) values (v_escuela, 'yoga');
    perform set_config('prueba.v7', 'FALLA - le puso una actividad a la escuela de otro', false);
  exception when others then
    perform set_config('prueba.v7', 'PASA - la base le devolvio error (' || sqlstate || ')', false);
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 8 y 9. El alumno ve lo que enseña SU escuela, y no lo cambia.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'alumno1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_escuela uuid := nullif(current_setting('prueba.escuela', true), '')::uuid;
  v_n int;
begin
  select count(*) into v_n
    from public.tenant_disciplines where tenant_id = v_escuela;
  perform set_config('prueba.v8',
    case when v_n = 2 then 'PASA' else 'FALLA - ve ' || v_n || ' en vez de 2' end, false);

  begin
    delete from public.tenant_disciplines
     where tenant_id = v_escuela and slug = 'salsa';
    get diagnostics v_n = row_count;
    perform set_config('prueba.v9',
      case when v_n = 0 then 'PASA - no borro ninguna'
           else 'FALLA - borro ' || v_n end, false);
  exception when others then
    perform set_config('prueba.v9', 'PASA - la base le devolvio error', false);
  end;
end $$;

select 'El catalogo se puede leer' as prueba,
       coalesce(current_setting('prueba.v1', true), 'NO SE EJECUTO') as resultado
union all
select 'El profe ve las de su escuela',
       coalesce(current_setting('prueba.v2', true), 'NO SE EJECUTO')
union all
select 'La misma actividad dos veces no se apila',
       coalesce(current_setting('prueba.v3', true), 'NO SE EJECUTO')
union all
select 'Una actividad fuera del catalogo no entra',
       coalesce(current_setting('prueba.v4', true), 'NO SE EJECUTO')
union all
select 'Nadie escribe el catalogo desde la app',
       coalesce(current_setting('prueba.v5', true), 'NO SE EJECUTO')
union all
select 'Profe 1 NO ve las de la escuela de Profe 2',
       coalesce(current_setting('prueba.v6', true), 'NO SE EJECUTO')
union all
select 'Profe 1 NO le pone actividades a una escuela ajena',
       coalesce(current_setting('prueba.v7', true), 'NO SE EJECUTO')
union all
select 'El alumno SI ve que ensena su escuela',
       coalesce(current_setting('prueba.v8', true), 'NO SE EJECUTO')
union all
select 'El alumno NO se las puede cambiar',
       coalesce(current_setting('prueba.v9', true), 'NO SE EJECUTO');

rollback;
