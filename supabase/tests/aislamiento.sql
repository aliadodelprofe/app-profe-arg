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
-- (se puede correr todas las veces que quieras: si el espacio ya existe,
--  no crea otro)
-- ----------------------------------------------------------------------------

begin;
  select set_config('request.jwt.claims',
    json_build_object(
      'sub', (select id from auth.users where email = 'profe1@prueba.com'),
      'role','authenticated')::text, true);
  set local role authenticated;
  select public.create_tenant('Escuela de Prueba 1', 'bachata') as espacio_de_profe1
   where not exists (select 1 from public.tenants where name = 'Escuela de Prueba 1');
commit;

begin;
  select set_config('request.jwt.claims',
    json_build_object(
      'sub', (select id from auth.users where email = 'profe2@prueba.com'),
      'role','authenticated')::text, true);
  set local role authenticated;
  select public.create_tenant('Escuela de Prueba 2', 'yoga') as espacio_de_profe2
   where not exists (select 1 from public.tenants where name = 'Escuela de Prueba 2');
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

  -- ==========================================================================
  -- VERIFICADO POR PROPIEDAD, NO POR CANTIDAD (10/10/2026)
  --
  -- Antes estas filas preguntaban `count(*) = 1`: un espacio, una membresía.
  -- Era cierto el día que se escribieron. Dejó de serlo porque la base de
  -- desarrollo se usa: hoy hay dos espacios llamados "Escuela de Prueba 1",
  -- así que Profe 1 ve dos — y la prueba gritaba FUGA DE DATOS por ver DOS
  -- COSAS PROPIAS.
  --
  -- Contar no verifica aislamiento. Lo único que importa es que no haya NI UNA
  -- fila visible que no sea suya, y eso es cierto con un espacio y con diez.
  -- ==========================================================================
  select
    'SI ve al menos un espacio suyo' as prueba,
    case when count(*) >= 1 then 'PASA' else 'FALLA - no ve lo suyo' end as resultado,
    count(*) as filas,
    coalesce(string_agg(name, ', '), '(ninguno)') as cuales
  from public.tenants

  union all

  select
    'NO ve ningun espacio donde no sea miembro',
    case when count(*) = 0 then 'PASA' else 'FALLA - FUGA DE DATOS' end,
    count(*),
    coalesce(string_agg(t.name, ', '), '(ninguno, correcto)')
  from public.tenants t
  where t.id not in (
    select m.tenant_id from public.tenant_members m where m.user_id = auth.uid()
  )

  union all

  select
    'NO ve el espacio de Profe 2',
    case when count(*) = 0 then 'PASA' else 'FALLA - FUGA DE DATOS' end,
    count(*),
    coalesce(string_agg(name, ', '), '(ninguno, correcto)')
  from public.tenants
  where name = 'Escuela de Prueba 2'

  union all

  select
    'NO ve ninguna membresia de otra persona',
    case when count(*) = 0 then 'PASA' else 'FALLA - FUGA DE DATOS' end,
    count(*),
    'cada fila visible tiene que ser suya'
  from public.tenant_members m
  where m.user_id is distinct from auth.uid();
commit;
