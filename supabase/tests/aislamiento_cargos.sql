-- ============================================================================
-- PRUEBA DE AISLAMIENTO — CARGOS Y PAGOS  (para la migración 0004)
--
-- aislamiento.sql comprueba "tenants" y "tenant_members".
-- Esta comprueba las tablas de plata: charges, payments, payment_allocations
-- y la vista student_account.
--
-- Hace las dos cosas que exige CLAUDE.md: desde la sesión de Profe 1 intenta
-- LEER datos de Profe 2, y también intenta ESCRIBIR dentro de su espacio.
--
-- Requisito: la PARTE 1 de aislamiento.sql ya corrida (los dos espacios de
-- prueba tienen que existir).
--
-- Se puede repetir todas las veces que quieras.
-- ============================================================================


-- Nota: esta prueba NO borra ni modifica nada. Solo agrega los datos de
-- prueba de Profe 2 (una vez) y hace intentos de lectura desde Profe 1.
-- Si Supabase te advierte de "destructive operations" al correrla, algo
-- cambió y hay que mirarlo antes de darle Run.


-- ----------------------------------------------------------------------------
-- 1. Profe 2 carga plata en SU espacio
--
-- Una alumna, un cargo de $10.000 y un pago de $4.000 imputado a ese cargo.
-- Los "not exists" hacen que repetir el archivo no duplique nada.
-- ----------------------------------------------------------------------------
begin;
  select set_config('request.jwt.claims',
    json_build_object(
      'sub', (select id from auth.users where email = 'profe2@prueba.com'),
      'role','authenticated')::text, true);
  set local role authenticated;

  insert into public.students (tenant_id, full_name)
  select t.id, 'Alumna de Prueba 2'
    from public.tenants t
   where t.name = 'Escuela de Prueba 2'
     and not exists (select 1 from public.students s
                      where s.tenant_id = t.id
                        and s.full_name = 'Alumna de Prueba 2');

  insert into public.charges (tenant_id, student_id, concept, amount)
  select s.tenant_id, s.id, 'Cuota de prueba', 10000
    from public.students s
   where s.full_name = 'Alumna de Prueba 2'
     and not exists (select 1 from public.charges c
                      where c.student_id = s.id
                        and c.concept = 'Cuota de prueba');

  insert into public.payments (tenant_id, student_id, amount, status, note)
  select s.tenant_id, s.id, 4000, 'confirmed', 'Pago de prueba'
    from public.students s
   where s.full_name = 'Alumna de Prueba 2'
     and not exists (select 1 from public.payments p
                      where p.student_id = s.id
                        and p.note = 'Pago de prueba');

  insert into public.payment_allocations (tenant_id, payment_id, charge_id, amount)
  select p.tenant_id, p.id, c.id, 4000
    from public.payments p
    join public.charges c
      on c.student_id = p.student_id
     and c.concept    = 'Cuota de prueba'
   where p.note = 'Pago de prueba'
     and not exists (select 1 from public.payment_allocations a
                      where a.payment_id = p.id
                        and a.charge_id  = c.id);
commit;


-- ----------------------------------------------------------------------------
-- 2. Anotamos los ids del espacio ajeno en la memoria de la conexión
--
-- Profe 1 justamente NO puede ver estos ids. Por eso hay que averiguarlos
-- acá, sin el candado puesto, para después tener contra qué atacar.
-- ----------------------------------------------------------------------------
select set_config('prueba.tenant_ajeno', t.id::text, false),
       set_config('prueba.alumno_ajeno', s.id::text, false)
  from public.tenants t
  join public.students s on s.tenant_id = t.id
 where t.name      = 'Escuela de Prueba 2'
   and s.full_name = 'Alumna de Prueba 2'
 limit 1;


-- ----------------------------------------------------------------------------
-- 3. La prueba, desde la sesión de Profe 1
-- ----------------------------------------------------------------------------
begin;
  select set_config('request.jwt.claims',
    json_build_object(
      'sub', (select id from auth.users where email = 'profe1@prueba.com'),
      'role','authenticated')::text, true);
  set local role authenticated;

  -- Intento de ESCRITURA: crear un cargo adentro del espacio de Profe 2.
  -- Si el candado funciona, Postgres lo rechaza con el error 42501 y
  -- guardamos "PASA". Si entra, es la peor falla posible.
  do $$
  declare
    v_tenant uuid := nullif(current_setting('prueba.tenant_ajeno', true), '')::uuid;
    v_alumno uuid := nullif(current_setting('prueba.alumno_ajeno', true), '')::uuid;
  begin
    if v_tenant is null or v_alumno is null then
      perform set_config('prueba.veredicto',
        'SIN DATOS - correr antes la Parte 1 de aislamiento.sql', false);
      return;
    end if;

    insert into public.charges (tenant_id, student_id, concept, amount)
    values (v_tenant, v_alumno, 'CARGO INTRUSO', 999);

    perform set_config('prueba.veredicto', 'FALLA - ESCRITURA AJENA', false);
  exception
    when insufficient_privilege then
      perform set_config('prueba.veredicto', 'PASA', false);
    when others then
      perform set_config('prueba.veredicto', 'PASA (rechazado con ' || sqlstate || ')', false);
  end $$;

  -- Intentos de LECTURA + el veredicto de la escritura, todo en una tabla.
  select
    'Profe 1 NO ve cargos de Profe 2'                       as prueba,
    case when count(*) = 0 then 'PASA' else 'FALLA - FUGA DE DATOS' end as resultado,
    count(*)                                                as filas_visibles
  from public.charges
  where concept = 'Cuota de prueba'

  union all
  select 'Profe 1 NO ve pagos de Profe 2',
         case when count(*) = 0 then 'PASA' else 'FALLA - FUGA DE DATOS' end,
         count(*)
  from public.payments
  where note = 'Pago de prueba'

  union all
  select 'Profe 1 NO ve imputaciones de Profe 2',
         case when count(*) = 0 then 'PASA' else 'FALLA - FUGA DE DATOS' end,
         count(*)
  from public.payment_allocations

  union all
  select 'Profe 1 NO ve el estado de cuenta de Profe 2',
         case when count(*) = 0 then 'PASA' else 'FALLA - FUGA DE DATOS' end,
         count(*)
  from public.student_account

  union all
  select 'Profe 1 NO puede crear un cargo en el espacio de Profe 2',
         coalesce(current_setting('prueba.veredicto', true), 'NO SE EJECUTO'),
         0::bigint;
commit;

-- Si la última fila dijera FALLA, además del problema grave de seguridad
-- queda una fila basura en "charges" con el concepto CARGO INTRUSO.
-- Avisame y te paso la línea para borrarla.
