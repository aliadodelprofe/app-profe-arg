-- ============================================================================
-- PRUEBA DE borrar_comprobantes_viejos  (migración 0020)
--
-- Lo que se prueba acá es a QUIÉN toca y a quién no. Es lo peligroso: una
-- función que borra archivos y elige mal el corte destruye comprobantes que
-- todavía servían, y eso no se deshace.
--
-- LO QUE **NO** SE PRUEBA ACÁ: el borrado real en el depósito. pg_net no manda
-- los pedidos hasta que la transacción se confirma, y esta prueba termina en
-- rollback. O sea que correrla es seguro —no borra ningún archivo de verdad—
-- pero tampoco demuestra que la parte HTTP funcione. Eso se verifica a ojo,
-- una vez, con las instrucciones que están al pie.
--
-- Correr como `postgres` (que es lo que sos en el SQL Editor).
-- AVISO: dispara la alerta de Supabase — la preparación inserta pagos.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Preparación: tres pagos que se distinguen solo por lo que los hace elegibles.
-- Ninguno de los tres archivos existe en el depósito, así que el paso 1 debería
-- cerrar únicamente al que corresponde.
-- ----------------------------------------------------------------------------
insert into public.payments
  (tenant_id, student_id, amount, status, confirmed_at, receipt_url, note)
select s.tenant_id, s.id, 1000, c.estado, c.cuando, c.ruta, c.nota
  from public.students s,
       (values
         ('confirmed', now() - interval '7 months', 'PRUEBA/viejo.jpg',    'PRUEBA vencido'),
         ('confirmed', now() - interval '2 months', 'PRUEBA/reciente.jpg', 'PRUEBA reciente'),
         ('declared',  null::timestamptz,          'PRUEBA/sin-confirmar.jpg', 'PRUEBA sin confirmar')
       ) as c(estado, cuando, ruta, nota)
 where s.full_name = 'Alumno Portal'
 limit 3;


do $$
declare
  v_secretos int;
  v_tarea    int;
  v_r        record;
  v_viejo    record;
  v_reciente record;
  v_nuevo    record;
begin
  -- ---------------------------------------------------------------------- 1
  -- Los dos secretos están cargados. Se verifica por NOMBRE: el valor no se
  -- lee ni se muestra nunca en una prueba.
  select count(*) into v_secretos
    from vault.secrets
   where name in ('proyecto_url', 'service_role_key');

  perform set_config('prueba.v1',
    case when v_secretos = 2 then 'PASA'
         else 'FALLA - hay ' || v_secretos || ' de 2 secretos cargados en Vault' end, false);

  -- ---------------------------------------------------------------------- 2
  select count(*) into v_tarea
    from cron.job
   where jobname = 'borrar-comprobantes-viejos' and active;

  perform set_config('prueba.v2',
    case when v_tarea = 1 then 'PASA'
         else 'FALLA - la tarea no quedo programada' end, false);

  -- ------------------------------------------------------------------ 3 a 5
  if v_secretos < 2 then
    perform set_config('prueba.v3', 'NO SE PUDO PROBAR - faltan los secretos', false);
    perform set_config('prueba.v4', 'NO SE PUDO PROBAR - faltan los secretos', false);
    perform set_config('prueba.v5', 'NO SE PUDO PROBAR - faltan los secretos', false);
  else
    select * into v_r from public.borrar_comprobantes_viejos();

    select receipt_url, receipt_deleted_at into v_viejo
      from public.payments where note = 'PRUEBA vencido';
    select receipt_url into v_reciente
      from public.payments where note = 'PRUEBA reciente';
    select receipt_url into v_nuevo
      from public.payments where note = 'PRUEBA sin confirmar';

    -- 3. El vencido se cierra Y queda la marca de que se borró.
    perform set_config('prueba.v3',
      case when v_viejo.receipt_url is null and v_viejo.receipt_deleted_at is not null
           then 'PASA'
           else 'FALLA - quedo ' || coalesce(v_viejo.receipt_url, 'sin ruta')
                || ' / marca ' || coalesce(v_viejo.receipt_deleted_at::text, 'vacia') end, false);

    -- 4. El de dos meses NO se toca. Es el corte: si fallara, se estarían
    --    borrando comprobantes que el profesor todavía puede necesitar.
    perform set_config('prueba.v4',
      case when v_reciente.receipt_url = 'PRUEBA/reciente.jpg' then 'PASA'
           else 'FALLA - toco un comprobante de hace dos meses' end, false);

    -- 5. Un pago que el profesor nunca confirmó no se toca, por viejo que sea.
    --    Su comprobante es justamente lo que falta mirar.
    perform set_config('prueba.v5',
      case when v_nuevo.receipt_url = 'PRUEBA/sin-confirmar.jpg' then 'PASA'
           else 'FALLA - toco el comprobante de un pago sin confirmar' end, false);
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 6 — Un profesor logueado no puede ejecutarla.
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_pudo boolean := true;
begin
  begin
    perform public.borrar_comprobantes_viejos();
  exception when others then
    v_pudo := false;
  end;

  perform set_config('prueba.v6',
    case when not v_pudo then 'PASA'
         else 'FALLA - un profesor logueado pudo ejecutar el borrado' end, false);
end $$;


-- ----------------------------------------------------------------------------
-- Resultado
-- ----------------------------------------------------------------------------
reset role;

select * from (values
  ('Los dos secretos estan cargados en Vault',        current_setting('prueba.v1', true)),
  ('La tarea quedo programada',                       current_setting('prueba.v2', true)),
  ('Un comprobante de hace 7 meses se cierra',        current_setting('prueba.v3', true)),
  ('Uno de hace 2 meses NO se toca',                  current_setting('prueba.v4', true)),
  ('Uno de un pago sin confirmar NO se toca',         current_setting('prueba.v5', true)),
  ('Un profesor NO puede ejecutarla',                 current_setting('prueba.v6', true))
) as r(prueba, resultado);

rollback;


-- ============================================================================
-- LA VERIFICACIÓN QUE ESTA PRUEBA NO PUEDE HACER
--
-- Para comprobar que el borrado real funciona, una sola vez y a mano:
--
--   1. Subí un comprobante desde el portal del alumno y confirmá el pago.
--   2. Envejecelo a mano:
--        update public.payments set confirmed_at = now() - interval '7 months'
--         where id = 'EL-ID-DEL-PAGO';
--   3. select public.borrar_comprobantes_viejos();     -- pide el borrado
--   4. Esperá unos segundos y mirá la respuesta HTTP:
--        select status_code, content from net._http_response order by id desc limit 5;
--      Tiene que decir 200.
--   5. select public.borrar_comprobantes_viejos();     -- ahora lo da por cerrado
--   6. Confirmá que el archivo ya no está en Storage → comprobantes.
-- ============================================================================
