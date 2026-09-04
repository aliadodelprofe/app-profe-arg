-- ============================================================================
-- PRUEBA DEL PORTAL DEL ALUMNO  (para la migración 0005)
--
-- Las pruebas anteriores comprueban que un PROFESOR no ve lo de otro profesor.
-- Esta comprueba al tercer actor: el ALUMNO.
--
-- Hay dos riesgos distintos y los dos se prueban acá:
--   1. Que un alumno vea datos de otra escuela.
--   2. Que un alumno vea datos de SUS PROPIOS COMPAÑEROS de grupo. Este es el
--      riesgo nuevo que trajo la 0005, y el más fácil de dejar abierto: están
--      en el mismo espacio, en el mismo grupo y en la misma clase.
--
-- Y prueba las cuatro cosas que un alumno podría intentar escribir.
--
-- REQUISITOS
--   - Usuario alumno1@prueba.com creado en Authentication > Users
--   - aislamiento_cargos.sql ya corrido (crea a "Alumna de Prueba 2", que acá
--     hace de compañera de grupo)
--
-- AVISO: esta prueba SÍ dispara la alerta de "destructive operations" de
-- Supabase, porque intenta a propósito modificar un cargo para comprobar que
-- no puede. Es esperable. Todo lo que escribe se deshace solo.
--
-- Se puede repetir todas las veces que quieras.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Anotamos el usuario del alumno antes de bajar de nivel
--
-- La tabla auth.users no es accesible una vez que nos ponemos en la piel de
-- un usuario común, así que el id se busca ahora y se guarda en la memoria
-- de la conexión.
-- ----------------------------------------------------------------------------
select set_config('prueba.alumno_uid',
       coalesce((select id::text from auth.users where email = 'alumno1@prueba.com'), ''),
       false);


-- ----------------------------------------------------------------------------
-- 2. Profe 2 arma la clase: un grupo, una sesión, dos alumnas inscriptas
--
-- "Alumno Portal" es quien va a entrar al portal.
-- "Alumna de Prueba 2" es la compañera: misma escuela, mismo grupo, misma
-- clase, y con plata propia. Todo lo suyo tiene que quedar invisible.
-- ----------------------------------------------------------------------------
begin;
  select set_config('request.jwt.claims',
    json_build_object(
      'sub', (select id from auth.users where email = 'profe2@prueba.com'),
      'role','authenticated')::text, true);
  set local role authenticated;

  -- la ficha del alumno, enlazada a su usuario: esto es lo que la 0005 mira
  insert into public.students (tenant_id, full_name, user_id)
  select t.id, 'Alumno Portal',
         nullif(current_setting('prueba.alumno_uid', true), '')::uuid
    from public.tenants t
   where t.name = 'Escuela de Prueba 2'
     and nullif(current_setting('prueba.alumno_uid', true), '') is not null
     and not exists (select 1 from public.students s
                      where s.tenant_id = t.id and s.full_name = 'Alumno Portal');

  insert into public.groups (tenant_id, name, format, level)
  select t.id, 'Grupo de Prueba', 'regular', 'Principiante'
    from public.tenants t
   where t.name = 'Escuela de Prueba 2'
     and not exists (select 1 from public.groups g
                      where g.tenant_id = t.id and g.name = 'Grupo de Prueba');

  insert into public.enrollments (tenant_id, group_id, student_id, billing_mode, agreed_price)
  select g.tenant_id, g.id, s.id, 'per_session', 5000
    from public.groups g
    join public.students s on s.tenant_id = g.tenant_id
   where g.name = 'Grupo de Prueba'
     and s.full_name in ('Alumno Portal', 'Alumna de Prueba 2')
     and not exists (select 1 from public.enrollments e
                      where e.group_id = g.id and e.student_id = s.id);

  insert into public.sessions (tenant_id, group_id, date, title, recap)
  select g.tenant_id, g.id, current_date, 'Clase de prueba',
         'Figuras vistas: paseo, sombrero, doble giro'
    from public.groups g
   where g.name = 'Grupo de Prueba'
     and not exists (select 1 from public.sessions x
                      where x.group_id = g.id and x.title = 'Clase de prueba');

  -- las dos presentes en la misma clase
  insert into public.attendance (tenant_id, session_id, student_id, status)
  select x.tenant_id, x.id, s.id, 'present'
    from public.sessions x
    join public.students s on s.tenant_id = x.tenant_id
   where x.title = 'Clase de prueba'
     and s.full_name in ('Alumno Portal', 'Alumna de Prueba 2')
     and not exists (select 1 from public.attendance a
                      where a.session_id = x.id and a.student_id = s.id);

  -- un cargo propio del alumno del portal
  insert into public.charges (tenant_id, student_id, concept, amount)
  select s.tenant_id, s.id, 'Clase de prueba', 5000
    from public.students s
   where s.full_name = 'Alumno Portal'
     and not exists (select 1 from public.charges c
                      where c.student_id = s.id and c.concept = 'Clase de prueba');
commit;


-- ----------------------------------------------------------------------------
-- 3. Anotamos el id de la compañera, para después intentar usurparla
-- ----------------------------------------------------------------------------
select set_config('prueba.companera_id',
       coalesce((select s.id::text
                   from public.students s
                   join public.tenants t on t.id = s.tenant_id
                  where t.name = 'Escuela de Prueba 2'
                    and s.full_name = 'Alumna de Prueba 2'), ''),
       false);


-- ----------------------------------------------------------------------------
-- 4. La prueba, desde la sesión del alumno
-- ----------------------------------------------------------------------------
begin;
  select set_config('request.jwt.claims',
    json_build_object(
      'sub', nullif(current_setting('prueba.alumno_uid', true), '')::uuid,
      'role','authenticated')::text, true);
  set local role authenticated;

  -- Los cuatro intentos de escritura.
  -- Cada uno se deshace solo: cuando la operación entra, forzamos un error
  -- a propósito para que Postgres la revierta. El veredicto queda guardado
  -- en una variable, que no se revierte.
  do $$
  declare
    v_alumno    uuid;
    v_tenant    uuid;
    v_companera uuid := nullif(current_setting('prueba.companera_id', true), '')::uuid;
    v_filas     int;
    v_w1 text := 'FALLA - el candado rechazo un pago propio valido';
    v_w2 text := 'FALLA - dejo auto-confirmarse el pago';
    v_w3 text := 'FALLA - dejo declarar un pago a nombre ajeno';
    v_w4 text := 'FALLA - dejo modificar un cargo propio';
  begin
    select s.id, s.tenant_id into v_alumno, v_tenant
      from public.students s where s.user_id = auth.uid() limit 1;

    if v_alumno is null then
      perform set_config('prueba.w1', 'SIN DATOS - falta el usuario alumno1@prueba.com', false);
      perform set_config('prueba.w2', 'SIN DATOS', false);
      perform set_config('prueba.w3', 'SIN DATOS', false);
      perform set_config('prueba.w4', 'SIN DATOS', false);
      return;
    end if;

    -- W1 (positiva): declarar un pago propio bien formado. TIENE que entrar.
    begin
      insert into public.payments (tenant_id, student_id, amount, status, note)
      values (v_tenant, v_alumno, 3000, 'declared', 'Pago declarado por el alumno');
      v_w1 := 'PASA';
      raise exception 'deshacer' using errcode = 'P0001';
    exception
      when sqlstate 'P0001' then null;
      when others then v_w1 := 'FALLA - rechazado con ' || sqlstate;
    end;

    -- W2: el mismo pago, pero dándose el visto bueno solo.
    begin
      insert into public.payments (tenant_id, student_id, amount, status, note, confirmed_at)
      values (v_tenant, v_alumno, 3000, 'confirmed', 'Pago auto-confirmado', now());
      v_w2 := 'FALLA - dejo auto-confirmarse el pago';
      raise exception 'deshacer' using errcode = 'P0001';
    exception
      when sqlstate 'P0001' then null;
      when others then v_w2 := 'PASA';
    end;

    -- W3: declarar un pago a nombre de la compañera.
    if v_companera is null then
      v_w3 := 'SIN DATOS - correr antes aislamiento_cargos.sql';
    else
      begin
        insert into public.payments (tenant_id, student_id, amount, status, note)
        values (v_tenant, v_companera, 9999, 'declared', 'Pago a nombre ajeno');
        v_w3 := 'FALLA - dejo declarar un pago a nombre ajeno';
        raise exception 'deshacer' using errcode = 'P0001';
      exception
        when sqlstate 'P0001' then null;
        when others then v_w3 := 'PASA';
      end;
    end if;

    -- W4: bajarse la propia deuda a cero. El alumno no tiene ninguna regla
    -- de escritura sobre cargos, asi que no deberia alcanzar ni una fila.
    begin
      update public.charges set amount = 0 where student_id = v_alumno;
      get diagnostics v_filas = row_count;
      if v_filas = 0 then
        v_w4 := 'PASA';
      else
        v_w4 := 'FALLA - modifico ' || v_filas || ' cargo(s)';
      end if;
      raise exception 'deshacer' using errcode = 'P0001';
    exception
      when sqlstate 'P0001' then null;
      when others then v_w4 := 'PASA (rechazado con ' || sqlstate || ')';
    end;

    perform set_config('prueba.w1', v_w1, false);
    perform set_config('prueba.w2', v_w2, false);
    perform set_config('prueba.w3', v_w3, false);
    perform set_config('prueba.w4', v_w4, false);
  end $$;


  -- Lo que el alumno TIENE que ver, lo que NO tiene que ver, y los veredictos.
  select 'Requisito: existe el usuario alumno1@prueba.com'      as prueba,
         case when nullif(current_setting('prueba.alumno_uid', true), '') is null
              then 'FALTA - crealo en Authentication > Users' else 'OK' end as resultado,
         0::bigint                                              as filas

  union all
  select 'SI ve su propia ficha',
         case when count(*) = 1 then 'PASA' else 'FALLA - no ve lo suyo' end, count(*)
    from public.students where user_id = auth.uid()

  union all
  select 'NO ve la ficha de su companera de grupo',
         case when count(*) = 0 then 'PASA' else 'FALLA - FUGA DE DATOS' end, count(*)
    from public.students where user_id is distinct from auth.uid()

  union all
  select 'SI ve su escuela',
         case when count(*) = 1 then 'PASA' else 'FALLA' end, count(*)
    from public.tenants

  union all
  select 'SI ve su grupo',
         case when count(*) = 1 then 'PASA' else 'FALLA' end, count(*)
    from public.groups

  union all
  select 'SI ve la clase de su grupo (el recap)',
         case when count(*) = 1 then 'PASA' else 'FALLA' end, count(*)
    from public.sessions

  union all
  select 'Ve UNA sola inscripcion, la suya (no la de su companera)',
         case when count(*) = 1 then 'PASA' else 'FALLA - FUGA DE DATOS' end, count(*)
    from public.enrollments

  union all
  select 'Ve UNA sola asistencia, la suya (no la de su companera)',
         case when count(*) = 1 then 'PASA' else 'FALLA - FUGA DE DATOS' end, count(*)
    from public.attendance

  union all
  select 'SI ve su cargo',
         case when count(*) = 1 then 'PASA' else 'FALLA' end, count(*)
    from public.charges where concept = 'Clase de prueba'

  union all
  select 'NO ve los cargos de su companera',
         case when count(*) = 0 then 'PASA' else 'FALLA - FUGA DE DATOS' end, count(*)
    from public.charges where concept = 'Cuota de prueba'

  union all
  select 'NO ve los pagos de su companera',
         case when count(*) = 0 then 'PASA' else 'FALLA - FUGA DE DATOS' end, count(*)
    from public.payments where note = 'Pago de prueba'

  union all
  select 'SI ve su estado de cuenta, y solo el suyo',
         case when count(*) = 1 then 'PASA' else 'FALLA' end, count(*)
    from public.student_account

  union all
  select 'SI puede declarar un pago propio',
         coalesce(current_setting('prueba.w1', true), 'NO SE EJECUTO'), 0::bigint

  union all
  select 'NO puede confirmarse el pago solo',
         coalesce(current_setting('prueba.w2', true), 'NO SE EJECUTO'), 0::bigint

  union all
  select 'NO puede declarar un pago a nombre de otro',
         coalesce(current_setting('prueba.w3', true), 'NO SE EJECUTO'), 0::bigint

  union all
  select 'NO puede bajarse la deuda',
         coalesce(current_setting('prueba.w4', true), 'NO SE EJECUTO'), 0::bigint;
commit;
