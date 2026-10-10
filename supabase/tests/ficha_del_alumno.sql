-- ============================================================================
-- PRUEBA DE QUIÉN PUEDE TOCAR LA FICHA  (migración 0023)
--
-- Lo que se prueba acá no es que el alumno pueda cambiar su nombre: eso se ve
-- a simple vista. Es lo contrario — que NO pueda cambiar lo que no es suyo.
--
-- Es la prueba que justifica que esto sea una función y no una política de
-- RLS: con una política de update, el alumno podría cambiar cualquier columna
-- de su fila, incluida la escuela a la que pertenece.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
-- REQUISITOS: aislamiento_alumno.sql ya corrido (necesita alumno1@prueba.com).
-- AVISO: dispara la alerta de Supabase.
-- ============================================================================

begin;

-- Anotado antes de cambiar de rol: después RLS esconde el otro espacio.
select set_config('prueba.espacio_ajeno',
  (select id::text from public.tenants where name = 'Escuela de Prueba 1'), false);
select set_config('prueba.alumno_id',
  (select s.id::text from public.students s
     join auth.users u on u.id = s.user_id
    where u.email = 'alumno1@prueba.com' limit 1), false);

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'alumno1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_alumno  uuid := nullif(current_setting('prueba.alumno_id', true), '')::uuid;
  v_ajeno   uuid := nullif(current_setting('prueba.espacio_ajeno', true), '')::uuid;
  v_antes   public.students;
  v_despues public.students;
  v_n       int;
  v_pudo    boolean;
begin
  if v_alumno is null then
    perform set_config('prueba.v1', 'FALLA - no hay ficha enganchada a alumno1@prueba.com', false);
    return;
  end if;

  select * into v_antes from public.students where id = v_alumno;

  -- ---------------------------------------------------------------------- 1
  -- Puede cambiarse el nombre y ponerse una foto.
  v_n := public.actualizar_mi_ficha('Nombre Elegido Por El Alumno', 'https://ejemplo/f.jpg');
  select * into v_despues from public.students where id = v_alumno;

  perform set_config('prueba.v1',
    case when v_despues.full_name = 'Nombre Elegido Por El Alumno'
          and v_despues.avatar_url = 'https://ejemplo/f.jpg'
         then 'PASA'
         else 'FALLA - quedo ' || coalesce(v_despues.full_name, 'sin nombre') end, false);

  -- ---------------------------------------------------------------------- 2
  -- La función NO toca el correo, aunque el correo esté en la misma fila.
  -- Si lo tocara, cambiárselo por el de otra persona engancharía las
  -- invitaciones dirigidas a esa otra persona.
  perform set_config('prueba.v2',
    case when v_despues.email is not distinct from v_antes.email then 'PASA'
         else 'FALLA - le cambio el correo de '
              || coalesce(v_antes.email,'nulo') || ' a ' || coalesce(v_despues.email,'nulo') end, false);

  -- ---------------------------------------------------------------------- 3
  -- Y no puede mudarse a la escuela de otro profesor por su cuenta. Es lo que
  -- haría posible una política de update sobre la fila entera.
  v_pudo := true;
  begin
    update public.students set tenant_id = v_ajeno where id = v_alumno;
    -- Si RLS no deja, el update afecta cero filas en vez de fallar.
    get diagnostics v_n = row_count;
    if v_n = 0 then v_pudo := false; end if;
  exception when others then
    v_pudo := false;
  end;

  perform set_config('prueba.v3',
    case when not v_pudo then 'PASA'
         else 'FALLA - el alumno se mudo de escuela solo' end, false);

  -- ---------------------------------------------------------------------- 4
  -- Un nombre vacío no se guarda: dejaría a la persona sin forma de ser
  -- nombrada en las listas del profesor.
  v_pudo := true;
  begin
    perform public.actualizar_mi_ficha('   ');
  exception when others then
    v_pudo := false;
  end;

  perform set_config('prueba.v4',
    case when not v_pudo then 'PASA' else 'FALLA - acepto un nombre vacio' end, false);
end $$;


-- ----------------------------------------------------------------------------
-- 5 y 6 — El profesor: puede corregir lo que nadie reclamó, no lo reclamado.
-- ----------------------------------------------------------------------------
reset role;

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_sin_duenio uuid;
  v_reclamada  uuid;
  v_n          int;
begin
  -- Una ficha sin dueño, creada acá mismo.
  insert into public.students (tenant_id, full_name, email)
  select id, 'PRUEBA Sin Duenio', 'prueba-sin-duenio@ejemplo.com'
    from public.tenants where name = 'Escuela de Prueba 2'
  returning id into v_sin_duenio;

  update public.students set full_name = 'PRUEBA Corregido' where id = v_sin_duenio;
  get diagnostics v_n = row_count;

  perform set_config('prueba.v5',
    case when v_n = 1 then 'PASA'
         else 'FALLA - no pudo corregir una ficha que nadie reclamo' end, false);

  -- Una que sí tiene dueño.
  select s.id into v_reclamada
    from public.students s
   where s.user_id is not null
     and s.tenant_id in (select public.my_tenant_ids())
   limit 1;

  if v_reclamada is null then
    perform set_config('prueba.v6',
      'NO SE PUDO PROBAR - no hay ninguna ficha reclamada en este espacio', false);
  else
    update public.students set full_name = 'PRUEBA No Deberia Entrar' where id = v_reclamada;
    get diagnostics v_n = row_count;

    perform set_config('prueba.v6',
      case when v_n = 0 then 'PASA'
           else 'FALLA - el profesor edito una ficha que el alumno ya reclamo' end, false);
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- Resultado
-- ----------------------------------------------------------------------------
reset role;

select * from (values
  ('El alumno cambia su nombre y su foto',          current_setting('prueba.v1', true)),
  ('La funcion NO le toca el correo',               current_setting('prueba.v2', true)),
  ('El alumno NO puede mudarse de escuela',         current_setting('prueba.v3', true)),
  ('Un nombre vacio no se guarda',                  current_setting('prueba.v4', true)),
  ('El profe corrige una ficha sin reclamar',       current_setting('prueba.v5', true)),
  ('El profe NO edita una ficha ya reclamada',      current_setting('prueba.v6', true))
) as r(prueba, resultado);

rollback;
