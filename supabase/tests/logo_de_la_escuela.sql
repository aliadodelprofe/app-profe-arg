-- ============================================================================
-- PRUEBA DEL LOGO DE LA ESCUELA  (migración 0026)
--
-- Dos cosas distintas que se prueban juntas porque juntas forman la función:
-- la COLUMNA avatar_url en tenants, y el DEPÓSITO donde vive la imagen.
--
-- Lo que no puede pasar: que un profesor le cambie la cara a la escuela de
-- otro, que un alumno se la cambie a la suya, y que alguien suba un archivo a
-- la carpeta de un espacio ajeno.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
-- REQUISITOS: aislamiento.sql y aislamiento_alumno.sql ya corridos.
-- AVISO: dispara la alerta de Supabase.
-- ============================================================================

begin;

select set_config('prueba.espacio_1',
  (select id::text from public.tenants where name = 'Escuela de Prueba 1' limit 1), false);
select set_config('prueba.espacio_2',
  (select id::text from public.tenants where name = 'Escuela de Prueba 2' limit 1), false);


-- ----------------------------------------------------------------------------
-- PARTE 1 — El dueño le pone cara a su escuela
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_mio   uuid := nullif(current_setting('prueba.espacio_2', true), '')::uuid;
  v_ajeno uuid := nullif(current_setting('prueba.espacio_1', true), '')::uuid;
  v_n     int;
begin
  -- ---------------------------------------------------------------------- 1
  update public.tenants set avatar_url = 'https://ejemplo/logo2.png' where id = v_mio;
  get diagnostics v_n = row_count;

  perform set_config('prueba.v1',
    case when v_n = 1 then 'PASA' else 'FALLA - el dueño no pudo ponerle logo a su escuela' end, false);

  -- ---------------------------------------------------------------------- 2
  update public.tenants set avatar_url = 'https://ejemplo/intruso.png' where id = v_ajeno;
  get diagnostics v_n = row_count;

  perform set_config('prueba.v2',
    case when v_n = 0 then 'PASA'
         else 'FALLA - le cambio el logo a la escuela de otro profesor' end, false);

  -- ---------------------------------------------------------------------- 3
  -- Sube el archivo a la carpeta de su espacio.
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('logos', v_mio::text || '/prueba.png', auth.uid());
    perform set_config('prueba.v3', 'PASA', false);
  exception when others then
    perform set_config('prueba.v3',
      'FALLA - el dueño no pudo subir su logo (' || sqlstate || ')', false);
  end;

  -- ---------------------------------------------------------------------- 4
  -- Y no a la de otro.
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('logos', v_ajeno::text || '/intruso.png', auth.uid());
    perform set_config('prueba.v4',
      'FALLA - subio un archivo a la carpeta de otro espacio', false);
  exception when insufficient_privilege or others then
    perform set_config('prueba.v4', 'PASA - la base le devolvio error (' || sqlstate || ')', false);
  end;
end $$;


-- ----------------------------------------------------------------------------
-- PARTE 2 — El alumno lo ve y no lo toca
-- ----------------------------------------------------------------------------
reset role;

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'alumno1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_n   int;
  v_url text;
begin
  -- ---------------------------------------------------------------------- 5
  -- Se mira LA ESCUELA DE LA PRUEBA y no "la primera de sus escuelas que tenga
  -- logo". Lo segundo funcionó hasta que una escuela de verdad tuvo logo de
  -- verdad: el "limit 1" devolvía esa y la fila fallaba sin que nada estuviera
  -- roto. Una prueba tiene que mirar lo que ella misma puso.
  select t.avatar_url into v_url
    from public.tenants t
   where t.id = nullif(current_setting('prueba.espacio_2', true), '')::uuid
     and t.id in (select public.my_student_tenant_ids());

  perform set_config('prueba.v5',
    case when v_url = 'https://ejemplo/logo2.png' then 'PASA'
         else 'FALLA - no ve el logo de su propia escuela, vio '
              || coalesce(v_url, 'nada') end, false);

  -- ---------------------------------------------------------------------- 6
  update public.tenants set avatar_url = 'https://ejemplo/del-alumno.png'
   where id = nullif(current_setting('prueba.espacio_2', true), '')::uuid;
  get diagnostics v_n = row_count;

  perform set_config('prueba.v6',
    case when v_n = 0 then 'PASA'
         else 'FALLA - el alumno le cambio el logo a su escuela' end, false);

  -- ---------------------------------------------------------------------- 7
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('logos',
            nullif(current_setting('prueba.espacio_2', true), '') || '/del-alumno.png',
            auth.uid());
    perform set_config('prueba.v7',
      'FALLA - el alumno subio un archivo a la carpeta de su escuela', false);
  exception when insufficient_privilege or others then
    perform set_config('prueba.v7', 'PASA - la base le devolvio error (' || sqlstate || ')', false);
  end;
end $$;


-- ----------------------------------------------------------------------------
-- Resultado
-- ----------------------------------------------------------------------------
reset role;

select * from (values
  ('El dueño le pone logo a su escuela',        current_setting('prueba.v1', true)),
  ('NO le cambia el logo a la escuela de otro', current_setting('prueba.v2', true)),
  ('El dueño sube el archivo a su carpeta',     current_setting('prueba.v3', true)),
  ('NO sube a la carpeta de otro espacio',      current_setting('prueba.v4', true)),
  ('El alumno VE el logo de su escuela',        current_setting('prueba.v5', true)),
  ('El alumno NO le cambia el logo',            current_setting('prueba.v6', true)),
  ('El alumno NO sube archivos al deposito',    current_setting('prueba.v7', true))
) as r(prueba, resultado);

rollback;
