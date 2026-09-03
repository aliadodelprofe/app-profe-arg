-- ============================================================================
-- PRUEBA DE AISLAMIENTO ENTRE PROFESORES
--
-- Comprueba que un profesor no puede ver ni tocar los datos de otro.
-- Correr después de CUALQUIER cambio en el esquema o en las políticas.
--
-- Requisito previo: crear dos usuarios en Authentication > Users
--   profe1@prueba.com
--   profe2@prueba.com
-- ============================================================================


-- ----------------------------------------------------------------------------
-- PARTE 1 — Preparación: un espacio para cada profesor
-- (correr UNA sola vez; si la repetís, crea espacios duplicados)
-- ----------------------------------------------------------------------------

begin;
  select set_config('request.jwt.claims',
    json_build_object(
      'sub', (select id from auth.users where email = 'profe1@prueba.com'),
      'role','authenticated')::text, true);
  set local role authenticated;
  select public.create_tenant('Escuela de Prueba 1', 'bachata') as espacio_de_profe1;
commit;

begin;
  select set_config('request.jwt.claims',
    json_build_object(
      'sub', (select id from auth.users where email = 'profe2@prueba.com'),
      'role','authenticated')::text, true);
  set local role authenticated;
  select public.create_tenant('Escuela de Prueba 2', 'yoga') as espacio_de_profe2;
commit;


-- ----------------------------------------------------------------------------
-- PARTE 2 — La prueba
-- (se puede correr todas las veces que quieras)
-- ----------------------------------------------------------------------------

begin;
  select set_config('request.jwt.claims',
    json_build_object(
      'sub', (select id from auth.users where email = 'profe1@prueba.com'),
      'role','authenticated')::text, true);
  set local role authenticated;

  select
    'Profe 1 ve sus espacios' as prueba,
    case when count(*) = 1 then 'PASA' else 'FALLA' end as resultado,
    count(*) as ve_espacios,
    coalesce(string_agg(name, ', '), '(ninguno)') as cuales
  from public.tenants

  union all

  select
    'Profe 1 NO ve el espacio de Profe 2',
    case when count(*) = 0 then 'PASA' else 'FALLA - FUGA DE DATOS' end,
    count(*),
    coalesce(string_agg(name, ', '), '(ninguno, correcto)')
  from public.tenants
  where name = 'Escuela de Prueba 2'

  union all

  select
    'Profe 1 NO ve miembros de otros espacios',
    case when count(*) = 1 then 'PASA' else 'FALLA - FUGA DE DATOS' end,
    count(*),
    'deberia ver solo su propia membresia'
  from public.tenant_members;
commit;
