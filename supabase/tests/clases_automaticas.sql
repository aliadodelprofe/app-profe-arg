-- ============================================================================
-- PRUEBA DE asegurar_clases  (migración 0018)
--
-- La función crea las clases solas a partir del horario fijo del grupo. Si se
-- equivoca, o el alumno abre su portal y no ve las clases que vienen, o le
-- aparecen clases que el profesor había cancelado.
--
-- Esta regla vivía en TypeScript y se probaba con npm run prueba:fechas. Se
-- mudó a la base en la 0018, así que su prueba también se muda acá.
--
-- Todo corre dentro de una transacción que se DESHACE al final: la base queda
-- igual que antes y la prueba se puede repetir sin límite.
--
-- REQUISITOS: aislamiento_cargos.sql ya corrido (necesita profe1 y profe2).
-- AVISO: dispara la alerta de Supabase, porque la preparación inserta grupos.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Preparación, como Profe 2.
--
-- Se crean cuatro grupos nuevos en vez de reusar el de siempre. Cada uno
-- prueba una condición distinta, y ninguno arrastra clases viejas que
-- ensucien la cuenta.
--
-- El día fijo es MARTES (2) en todos. Da igual cuál sea: lo que se verifica es
-- que las fechas creadas caigan todas en ese día.
-- ----------------------------------------------------------------------------
-- El grupo del OTRO profesor se anota ahora, antes de ponerse el rol: después
-- RLS lo esconde y la fila 8 no tendría con qué probar.
select set_config('prueba.grupo_ajeno',
  (select g.id::text from public.groups g
     join public.tenants t on t.id = g.tenant_id
    where t.name = 'Escuela de Prueba 1' limit 1), false);

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

insert into public.groups
  (tenant_id, name, format, status, weekday, default_start_time, default_duration_min, end_date)
select t.id, n.nombre, 'regular', n.estado, n.dia, '20:00', 90, n.fin
  from public.tenants t,
       (values
         ('PRUEBA horario normal',   'active',   2, null::date),
         ('PRUEBA horario con fin',  'active',   2, (current_date + 10)),
         ('PRUEBA sin dia fijo',     'active',   null, null::date),
         ('PRUEBA archivado',        'archived', 2, null::date)
       ) as n(nombre, estado, dia, fin)
 where t.name = 'Escuela de Prueba 2';


-- ----------------------------------------------------------------------------
-- Las llamadas y sus veredictos
-- ----------------------------------------------------------------------------
do $$
declare
  MARTES    constant int := 2;
  v_normal  uuid;
  v_confin  uuid;
  v_sindia  uuid;
  v_archiv  uuid;
  v_ajeno   uuid;
  v_hasta   date := (date_trunc('month', current_date) + interval '2 months' - interval '1 day')::date;
  v_creadas date[];
  v_esperadas date[];
  v_otra    int;
  v_cancelada date;
  v_tras_cancelar date[];
  v_n       int;
begin
  select id into v_normal from public.groups where name = 'PRUEBA horario normal';
  select id into v_confin from public.groups where name = 'PRUEBA horario con fin';
  select id into v_sindia from public.groups where name = 'PRUEBA sin dia fijo';
  select id into v_archiv from public.groups where name = 'PRUEBA archivado';

  -- ------------------------------------------------------------------ 1 y 2
  -- Crea todos los martes desde hoy hasta fin del mes que viene, y llamarla
  -- de nuevo no duplica nada.
  select array_agg(d order by d) into v_creadas
    from public.asegurar_clases(v_normal) d;

  select array_agg(d::date order by d) into v_esperadas
    from generate_series(current_date, v_hasta, interval '1 day') d
   where extract(dow from d) = MARTES;

  perform set_config('prueba.v1',
    case when v_creadas = v_esperadas then 'PASA'
         else 'FALLA - creo ' || coalesce(array_length(v_creadas,1),0)
              || ' y se esperaban ' || coalesce(array_length(v_esperadas,1),0)
              || ' (' || coalesce(v_creadas::text,'ninguna') || ')' end, false);

  select count(*) into v_otra from public.asegurar_clases(v_normal) d;
  perform set_config('prueba.v2',
    case when v_otra = 0 then 'PASA'
         else 'FALLA - llamarla de nuevo creo ' || v_otra || ' clases mas' end, false);

  -- ---------------------------------------------------------------------- 3
  -- Ninguna hacia atrás. Es la que evita generarle deuda a alguien por clases
  -- que nunca se dieron.
  select count(*) into v_n
    from public.sessions
   where group_id = v_normal and date < current_date;

  perform set_config('prueba.v3',
    case when v_n = 0 then 'PASA'
         else 'FALLA - creo ' || v_n || ' clases con fecha pasada' end, false);

  -- ---------------------------------------------------------------------- 4
  -- Una clase CANCELADA no vuelve a aparecer. Si volviera, cancelar no
  -- serviría de nada: la clase reaparecería sola al día siguiente.
  select date into v_cancelada
    from public.sessions where group_id = v_normal order by date limit 1;

  update public.sessions set status = 'cancelled'
   where group_id = v_normal and date = v_cancelada;

  select array_agg(d) into v_tras_cancelar
    from public.asegurar_clases(v_normal) d;

  perform set_config('prueba.v4',
    case when v_tras_cancelar is null then 'PASA'
         else 'FALLA - volvio a crear la clase cancelada del ' || v_cancelada end, false);

  -- ---------------------------------------------------------------------- 5
  -- Respeta la fecha de fin del grupo: no genera clases después de que el
  -- grupo terminó.
  select count(*) into v_n
    from public.asegurar_clases(v_confin) d
   where d > current_date + 10;

  perform set_config('prueba.v5',
    case when v_n = 0 then 'PASA'
         else 'FALLA - creo ' || v_n || ' clases despues del fin del grupo' end, false);

  -- ------------------------------------------------------------------ 6 y 7
  -- Sin día fijo no hay nada que deducir. Y un grupo archivado no genera más.
  select count(*) into v_n from public.asegurar_clases(v_sindia) d;
  perform set_config('prueba.v6',
    case when v_n = 0 then 'PASA'
         else 'FALLA - creo ' || v_n || ' clases en un grupo sin dia fijo' end, false);

  select count(*) into v_n from public.asegurar_clases(v_archiv) d;
  perform set_config('prueba.v7',
    case when v_n = 0 then 'PASA'
         else 'FALLA - creo ' || v_n || ' clases en un grupo archivado' end, false);

  -- ---------------------------------------------------------------------- 8
  -- Nadie genera clases en el espacio de otro profesor.
  --
  -- La función no verifica nada a mano: es security invoker, así que el
  -- `select * from groups` de adentro pasa por RLS igual que cualquier
  -- consulta. Si el grupo no es de un espacio suyo, no lo encuentra y corta.
  -- Esta fila es la que confirma que eso sigue siendo cierto.
  v_ajeno := nullif(current_setting('prueba.grupo_ajeno', true), '')::uuid;

  if v_ajeno is null then
    perform set_config('prueba.v8',
      'FALLA - no hay ningun grupo en Escuela de Prueba 1 para probar', false);
  else
    begin
      perform public.asegurar_clases(v_ajeno);
      perform set_config('prueba.v8',
        'FALLA - genero clases en el espacio de otro profesor', false);
    exception when others then
      perform set_config('prueba.v8', 'PASA', false);
    end;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- Resultado
-- ----------------------------------------------------------------------------
reset role;

select * from (values
  ('Crea todos los martes hasta fin del mes que viene', current_setting('prueba.v1', true)),
  ('Llamarla de nuevo no duplica',                      current_setting('prueba.v2', true)),
  ('Nunca crea una clase con fecha pasada',             current_setting('prueba.v3', true)),
  ('Una clase cancelada no vuelve a aparecer',          current_setting('prueba.v4', true)),
  ('Respeta la fecha de fin del grupo',                 current_setting('prueba.v5', true)),
  ('Un grupo sin dia fijo no genera nada',              current_setting('prueba.v6', true)),
  ('Un grupo archivado no genera nada',                 current_setting('prueba.v7', true)),
  ('Nadie genera clases en el espacio de otro',         current_setting('prueba.v8', true))
) as r(prueba, resultado);

rollback;
