-- ============================================================================
-- PRUEBA DE LOS MEDIOS DE PAGO  (migración 0024)
--
-- Lo que importa acá no es que el alumno vea el CBU de su profe: eso se ve a
-- simple vista al abrir la app. Es lo que NO puede pasar:
--
--   - que el alumno vea el CBU de otro profesor;
--   - que el alumno pueda cambiar el CBU de su profesor, que sería cobrarle
--     a sus compañeros en su propia cuenta;
--   - que un profesor vea o toque los medios de otro;
--   - que quede cargado un medio sin ningún destino adonde transferir.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
-- REQUISITOS: aislamiento.sql y aislamiento_alumno.sql ya corridos.
-- AVISO: dispara la alerta de Supabase.
-- ============================================================================

begin;

-- Anotado antes de cambiar de rol: después RLS esconde lo que no es de uno.
select set_config('prueba.espacio_1',
  (select id::text from public.tenants where name = 'Escuela de Prueba 1' limit 1), false);
select set_config('prueba.espacio_2',
  (select id::text from public.tenants where name = 'Escuela de Prueba 2' limit 1), false);


-- ----------------------------------------------------------------------------
-- PARTE 1 — El profesor carga su cuenta
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
  v_id    uuid;
  v_n     int;
begin
  -- -------------------------------------------------------------------- 1
  -- Carga un medio en su propio espacio.
  insert into public.payment_methods (tenant_id, holder, alias, bank)
  values (v_mio, 'PRUEBA Titular', 'prueba.alias.profe2', 'Banco de Prueba')
  returning id into v_id;

  perform set_config('prueba.medio_id', v_id::text, false);
  perform set_config('prueba.v1',
    case when v_id is not null then 'PASA' else 'FALLA - no pudo cargar su medio' end, false);

  -- -------------------------------------------------------------------- 2
  -- No puede cargar uno en el espacio de otro profesor.
  begin
    insert into public.payment_methods (tenant_id, holder, alias)
    values (v_ajeno, 'PRUEBA Intruso', 'prueba.alias.intruso');
    perform set_config('prueba.v2',
      'FALLA - cargo un medio de pago en el espacio de otro profesor', false);
  exception when insufficient_privilege or others then
    perform set_config('prueba.v2', 'PASA - la base le devolvio error (' || sqlstate || ')', false);
  end;

  -- -------------------------------------------------------------------- 3
  -- No ve ningún medio que no sea de sus espacios. Se mide por propiedad y no
  -- contando filas: contar sus propios medios no prueba nada.
  select count(*) into v_n
    from public.payment_methods m
   where m.tenant_id not in (select public.my_tenant_ids());

  perform set_config('prueba.v3',
    case when v_n = 0 then 'PASA'
         else 'FALLA - FUGA DE DATOS: ve ' || v_n || ' medios de pago ajenos' end, false);

  -- -------------------------------------------------------------------- 4
  -- Un medio sin alias y sin CBU no entra: no hay adónde transferir.
  begin
    insert into public.payment_methods (tenant_id, holder)
    values (v_mio, 'PRUEBA Sin Destino');
    perform set_config('prueba.v4',
      'FALLA - guardo un medio de pago sin alias ni CBU', false);
  exception when check_violation then
    perform set_config('prueba.v4', 'PASA - la base lo rechazo', false);
  end;
end $$;


-- ----------------------------------------------------------------------------
-- PARTE 2 — El alumno lo lee, y nada más
-- ----------------------------------------------------------------------------
reset role;

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'alumno1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_medio uuid := nullif(current_setting('prueba.medio_id', true), '')::uuid;
  v_n     int;
begin
  -- -------------------------------------------------------------------- 5
  -- Ve el de SU escuela.
  select count(*) into v_n
    from public.payment_methods m
   where m.id = v_medio;

  perform set_config('prueba.v5',
    case when v_n = 1 then 'PASA'
         else 'FALLA - no ve donde transferirle a su propio profe' end, false);

  -- -------------------------------------------------------------------- 6
  -- No ve ninguno de una escuela donde no tiene ficha.
  select count(*) into v_n
    from public.payment_methods m
   where m.tenant_id not in (select public.my_student_tenant_ids());

  perform set_config('prueba.v6',
    case when v_n = 0 then 'PASA'
         else 'FALLA - FUGA DE DATOS: ve ' || v_n || ' medios de pago de otras escuelas' end, false);

  -- -------------------------------------------------------------------- 7
  -- No puede cambiarle el CBU a su profesor. Esto es lo que separa "for
  -- select" de "for all": con permiso de escritura, el alumno podría
  -- redirigir a su cuenta la plata de todos sus compañeros.
  update public.payment_methods
     set alias = 'prueba.alias.del.alumno', cbu = '0000000000000000000000'
   where id = v_medio;
  get diagnostics v_n = row_count;

  perform set_config('prueba.v7',
    case when v_n = 0 then 'PASA'
         else 'FALLA - el alumno le cambio el CBU a su profesor' end, false);

  -- -------------------------------------------------------------------- 8
  -- Tampoco puede cargar uno nuevo en la escuela de su profesor.
  begin
    insert into public.payment_methods (tenant_id, holder, alias)
    select m.tenant_id, 'PRUEBA Alumno Vivo', 'prueba.alias.alumno'
      from public.payment_methods m where m.id = v_medio;
    perform set_config('prueba.v8',
      'FALLA - el alumno cargo un medio de pago en la escuela de su profe', false);
  exception when insufficient_privilege or others then
    perform set_config('prueba.v8', 'PASA - la base le devolvio error (' || sqlstate || ')', false);
  end;
end $$;


-- ----------------------------------------------------------------------------
-- PARTE 3 — Lo archivado no se muestra
-- ----------------------------------------------------------------------------
reset role;

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

update public.payment_methods
   set status = 'archived'
 where id = nullif(current_setting('prueba.medio_id', true), '')::uuid;

reset role;

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'alumno1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_medio uuid := nullif(current_setting('prueba.medio_id', true), '')::uuid;
  v_n     int;
begin
  -- -------------------------------------------------------------------- 9
  select count(*) into v_n from public.payment_methods m where m.id = v_medio;

  perform set_config('prueba.v9',
    case when v_n = 0 then 'PASA'
         else 'FALLA - le sigue mostrando una cuenta que el profe archivo' end, false);
end $$;


-- ----------------------------------------------------------------------------
-- Resultado
-- ----------------------------------------------------------------------------
reset role;

select * from (values
  ('El profe carga su cuenta',                       current_setting('prueba.v1', true)),
  ('El profe NO carga en el espacio de otro',        current_setting('prueba.v2', true)),
  ('El profe NO ve medios de pago ajenos',           current_setting('prueba.v3', true)),
  ('Sin alias ni CBU no se guarda',                  current_setting('prueba.v4', true)),
  ('El alumno ve donde transferirle a su profe',     current_setting('prueba.v5', true)),
  ('El alumno NO ve los de otras escuelas',          current_setting('prueba.v6', true)),
  ('El alumno NO le cambia el CBU a su profe',       current_setting('prueba.v7', true)),
  ('El alumno NO carga un medio de pago',            current_setting('prueba.v8', true)),
  ('Lo archivado no le llega al alumno',             current_setting('prueba.v9', true))
) as r(prueba, resultado);

rollback;
