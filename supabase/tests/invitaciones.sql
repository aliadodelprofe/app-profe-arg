-- ============================================================================
-- PRUEBA DE LAS INVITACIONES  (migración 0015)
--
-- Estas tres funciones son "security definer": miran fichas que todavía NO son
-- de quien pregunta. Es la única forma de mostrarle una invitación a alguien
-- —si ya fuera suya no habría nada que aceptar— y por eso mismo es donde un
-- error se paga caro: mostrarle a una persona la invitación de otra es
-- mostrarle en qué escuela está anotada esa otra.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
--
-- REQUISITOS: aislamiento_cargos.sql y aislamiento_alumno.sql ya corridos.
-- AVISO: dispara la alerta de Supabase. Inserta y actualiza; no queda nada.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Profe 2 anota a dos personas: una con el correo de alumno1, otra con un
-- correo ajeno. La segunda es el control: alumno1 no tiene que verla nunca.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

insert into public.students (tenant_id, full_name, email)
select t.id, 'Invitado de Prueba', 'alumno1@prueba.com'
  from public.tenants t where t.name = 'Escuela de Prueba 2';

insert into public.students (tenant_id, full_name, email)
select t.id, 'Invitado Para Rechazar', 'alumno1@prueba.com'
  from public.tenants t where t.name = 'Escuela de Prueba 2';

insert into public.students (tenant_id, full_name, email)
select t.id, 'Persona Ajena', 'otra.persona@prueba.com'
  from public.tenants t where t.name = 'Escuela de Prueba 2';

-- ----------------------------------------------------------------------------
-- Ahora, como alumno1.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'alumno1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_total   int;
  v_ajenas  int;
  v_aceptar uuid;
  v_rechazar uuid;
  v_dueno   uuid;
  v_marca   timestamptz;
begin
  -- 1. Ve las dos que son para su correo.
  select count(*) into v_total from public.invitaciones_pendientes();
  perform set_config('prueba.v1',
    case when v_total = 2 then 'PASA'
         else 'FALLA - ve ' || v_total || ' y deberian ser 2' end, false);

  -- 2. Y ninguna que sea de otro correo.
  select count(*) into v_ajenas
    from public.invitaciones_pendientes()
   where anotado_como = 'Persona Ajena';
  perform set_config('prueba.v2',
    case when v_ajenas = 0 then 'PASA'
         else 'FALLA - FUGA: ve la invitacion de otra persona' end, false);

  select student_id into v_aceptar
    from public.invitaciones_pendientes() where anotado_como = 'Invitado de Prueba';
  select student_id into v_rechazar
    from public.invitaciones_pendientes() where anotado_como = 'Invitado Para Rechazar';

  -- 3. Aceptar engancha la ficha.
  perform public.aceptar_invitacion(v_aceptar);
  select user_id into v_dueno from public.students where id = v_aceptar;
  perform set_config('prueba.v3',
    case when v_dueno = auth.uid() then 'PASA'
         else 'FALLA - la ficha no quedo enlazada' end, false);

  -- 4. Aceptar de nuevo la misma tiene que fallar.
  begin
    perform public.aceptar_invitacion(v_aceptar);
    perform set_config('prueba.v4', 'FALLA - dejo aceptar dos veces', false);
  exception when others then
    perform set_config('prueba.v4', 'PASA', false);
  end;

  -- 5. Rechazar deja la marca y la saca de la lista.
  perform public.rechazar_invitacion(v_rechazar);
  select invite_rejected_at into v_marca from public.students where id = v_rechazar;
  select count(*) into v_total from public.invitaciones_pendientes();
  perform set_config('prueba.v5',
    case when v_marca is not null and v_total = 0 then 'PASA'
         else 'FALLA - marca ' || coalesce(v_marca::text,'vacia')
              || ', quedan ' || v_total || ' invitaciones' end, false);

  -- 6. Y una vez rechazada, ya no se puede aceptar.
  begin
    perform public.aceptar_invitacion(v_rechazar);
    perform set_config('prueba.v6', 'FALLA - acepto una invitacion rechazada', false);
  exception when others then
    perform set_config('prueba.v6', 'PASA', false);
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 7. Y el control de siempre: Profe 1 no puede aceptar nada de Profe 2.
--    Su correo no coincide con ninguna ficha, así que no ve ni una invitación.
-- ----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_n int;
begin
  select count(*) into v_n from public.invitaciones_pendientes();
  perform set_config('prueba.v7',
    case when v_n = 0 then 'PASA'
         else 'FALLA - FUGA: ve ' || v_n || ' invitaciones que no son suyas' end, false);
end $$;

select 'Ve las invitaciones que son para su correo'          as prueba,
       coalesce(current_setting('prueba.v1', true), 'NO SE EJECUTO') as resultado
union all
select 'NO ve invitaciones dirigidas a otro correo',
       coalesce(current_setting('prueba.v2', true), 'NO SE EJECUTO')
union all
select 'Aceptar engancha la ficha a su cuenta',
       coalesce(current_setting('prueba.v3', true), 'NO SE EJECUTO')
union all
select 'No se puede aceptar dos veces la misma',
       coalesce(current_setting('prueba.v4', true), 'NO SE EJECUTO')
union all
select 'Rechazar deja marca y la saca de la lista',
       coalesce(current_setting('prueba.v5', true), 'NO SE EJECUTO')
union all
select 'Una invitacion rechazada ya no se puede aceptar',
       coalesce(current_setting('prueba.v6', true), 'NO SE EJECUTO')
union all
select 'Otro usuario no ve ninguna invitacion ajena',
       coalesce(current_setting('prueba.v7', true), 'NO SE EJECUTO');

rollback;
