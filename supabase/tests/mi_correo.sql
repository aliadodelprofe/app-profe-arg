-- ============================================================================
-- PRUEBA DE LA SINCRONIZACIÓN DEL CORREO  (migración 0030)
--
-- Lo que se prueba no es que copie el correo: es que lo copie DEL JWT y de
-- ningún otro lado, y solo a las fichas de quien lo trae.
--
-- Estas pruebas pueden armar el JWT a mano, que es justo lo que un alumno no
-- puede hacer: el suyo lo firma Supabase. Acá se usa esa libertad para
-- comprobar que la función no mira nada más que esa claim.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
-- REQUISITOS: aislamiento_alumno.sql ya corrido (necesita alumno1@prueba.com).
-- AVISO: dispara la alerta de Supabase.
-- ============================================================================

begin;

select set_config('prueba.alumno_user',
  (select id::text from auth.users where email = 'alumno1@prueba.com' limit 1), false);
select set_config('prueba.otro_user',
  (select id::text from auth.users where email = 'profe1@prueba.com' limit 1), false);


-- ----------------------------------------------------------------------------
-- PARTE 1 — Con un correo en el JWT, sincroniza
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub',   current_setting('prueba.alumno_user', true),
    'email', 'correo.nuevo@ejemplo.com',
    'role',  'authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_n int;
begin
  -- ---------------------------------------------------------------------- 1
  v_n := public.sincronizar_mi_correo();

  perform set_config('prueba.v1',
    case when v_n >= 1 then 'PASA - sincronizo ' || v_n || ' ficha(s)'
         else 'FALLA - no actualizo ninguna ficha' end, false);

  -- ---------------------------------------------------------------------- 2
  -- Llamarla de nuevo no hace nada: ya está al día.
  v_n := public.sincronizar_mi_correo();

  perform set_config('prueba.v2',
    case when v_n = 0 then 'PASA'
         else 'FALLA - volvio a escribir ' || v_n || ' ficha(s) que ya estaban bien' end, false);

end $$;

-- Sin disfraz: con el rol puesto, RLS ya esconde las fichas ajenas, así que
-- contarlas desde adentro daría cero aunque estuvieran mal.
reset role;

do $$
declare
  v_yo  uuid := nullif(current_setting('prueba.alumno_user', true), '')::uuid;
  v_mal int;
begin
  -- ---------------------------------------------------------------------- 3
  select count(*) into v_mal
    from public.students s
   where s.email = 'correo.nuevo@ejemplo.com'
     and s.user_id is distinct from v_yo;

  perform set_config('prueba.v3',
    case when v_mal = 0 then 'PASA'
         else 'FALLA - le puso el correo a ' || v_mal || ' ficha(s) ajenas' end, false);
end $$;


-- ----------------------------------------------------------------------------
-- PARTE 2 — Sin correo en el JWT, no hace nada
--
-- Es el caso de un token raro o viejo. Una función que ante la duda escribe
-- es peor que una que no hace nada.
-- ----------------------------------------------------------------------------
reset role;

select set_config('request.jwt.claims',
  json_build_object(
    'sub',  current_setting('prueba.alumno_user', true),
    'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_n int;
begin
  -- ---------------------------------------------------------------------- 4
  v_n := public.sincronizar_mi_correo();

  perform set_config('prueba.v4',
    case when v_n = 0 then 'PASA'
         else 'FALLA - escribio ' || v_n || ' ficha(s) sin saber que correo poner' end, false);
end $$;


-- ----------------------------------------------------------------------------
-- PARTE 3 — Otra persona con el mismo correo en su JWT no se lleva las fichas
--
-- Es el ataque que esto tiene que resistir: si la función mirara el correo en
-- vez del usuario, quien pusiera ese correo en su token se quedaría con las
-- fichas de otro. Mira user_id, así que no.
-- ----------------------------------------------------------------------------
reset role;

select set_config('request.jwt.claims',
  json_build_object(
    'sub',   current_setting('prueba.otro_user', true),
    'email', 'correo.nuevo@ejemplo.com',
    'role',  'authenticated')::text, true);
set local role authenticated;

select public.sincronizar_mi_correo();

-- El control se hace SIN disfraz: con el rol puesto, RLS esconde las fichas
-- que no son de uno, así que "no veo ninguna mal" no probaría nada. El cambio
-- de rol va a nivel de sentencia porque adentro de un bloque PL/pgSQL no se
-- puede.
reset role;

do $$
declare
  v_yo uuid := nullif(current_setting('prueba.alumno_user', true), '')::uuid;
  v_n  int;
begin
  -- ---------------------------------------------------------------------- 5
  -- Las fichas del alumno siguen siendo del alumno.
  select count(*) into v_n
    from public.students s
   where s.email = 'correo.nuevo@ejemplo.com'
     and s.user_id is distinct from v_yo;

  perform set_config('prueba.v5',
    case when v_n = 0 then 'PASA'
         else 'FALLA - otra persona se llevo ' || v_n || ' ficha(s) poniendo ese correo' end, false);
end $$;


-- ----------------------------------------------------------------------------
-- Resultado
-- ----------------------------------------------------------------------------
reset role;

select * from (values
  ('Sincroniza el correo del JWT',            current_setting('prueba.v1', true)),
  ('Llamarla de nuevo no escribe nada',       current_setting('prueba.v2', true)),
  ('NO toca fichas ajenas',                   current_setting('prueba.v3', true)),
  ('Sin correo en el token no hace nada',     current_setting('prueba.v4', true)),
  ('Otro con el mismo correo no se las lleva', current_setting('prueba.v5', true))
) as r(prueba, resultado);

rollback;
