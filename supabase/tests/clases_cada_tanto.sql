-- ============================================================================
-- PRUEBA DE por_mes  (migración 0036)
--
-- Un día fijo no siempre es todas las semanas. "Un martes por medio" son dos
-- por mes, y si la app genera cuatro, al alumno que cobra por clase le llegan
-- cuatro cargos por dos clases acordadas. Le cobra el doble.
--
-- Lo que se verifica es que por_mes recorte las fechas al primer, segundo…
-- enésimo encuentro de CADA MES, y que null siga generando todos.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
--
-- REQUISITOS: aislamiento_cargos.sql ya corrido (necesita profe2).
-- AVISO: dispara la alerta de Supabase, porque la preparación inserta grupos.
-- ============================================================================

begin;

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe2@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

-- Tres grupos iguales en todo salvo cuántas veces por mes se juntan. Mismo
-- día (martes), misma hora. Es lo único que tiene que explicar la diferencia.
with nuevos as (
  insert into public.groups (tenant_id, name, format, status)
  select t.id, n.nombre, 'private', 'active'
    from public.tenants t,
         (values
           ('PRUEBA martes todas', null::int),
           ('PRUEBA martes dos',   2),
           ('PRUEBA martes uno',   1)
         ) as n(nombre, cuantas)
   where t.name = 'Escuela de Prueba 2'
  returning id, tenant_id, name
)
insert into public.group_schedule (tenant_id, group_id, weekday, start_time, duration_min, por_mes)
select nuevos.tenant_id, nuevos.id, 2, '15:00', 60,
       case nuevos.name
         when 'PRUEBA martes dos' then 2
         when 'PRUEBA martes uno' then 1
         else null
       end
  from nuevos;

do $$
declare
  v_todas uuid := (select id from public.groups where name = 'PRUEBA martes todas');
  v_dos   uuid := (select id from public.groups where name = 'PRUEBA martes dos');
  v_uno   uuid := (select id from public.groups where name = 'PRUEBA martes uno');
  v_mes   date := date_trunc('month', current_date + interval '1 month')::date;
  v_fin   date := (date_trunc('month', current_date) + interval '2 months' - interval '1 day')::date;
  v_n     int;
  v_ord   int[];
  v_esp   int;
begin
  perform public.asegurar_clases(v_todas);
  perform public.asegurar_clases(v_dos);
  perform public.asegurar_clases(v_uno);

  -- Se mira SOLO el mes que viene: el actual puede estar empezado, y ahí la
  -- cuenta correcta es "los que faltan", que depende del día de hoy. El mes
  -- que viene se genera entero y es comparable siempre.

  -- 1. Sin por_mes se crean todos los martes del mes.
  select count(*) into v_n
    from public.sessions
   where group_id = v_todas and date >= v_mes and date <= v_fin;
  select count(*) into v_esp
    from generate_series(v_mes, v_fin, interval '1 day') d
   where extract(dow from d) = 2;
  perform set_config('prueba.v1',
    case when v_n = v_esp then 'PASA - ' || v_n || ' martes, todos los del mes'
         else 'FALLA - creo ' || v_n || ' y el mes tiene ' || v_esp end, false);

  -- 2. Con dos por mes, dos.
  select count(*) into v_n
    from public.sessions
   where group_id = v_dos and date >= v_mes and date <= v_fin;
  perform set_config('prueba.v2',
    case when v_n = 2 then 'PASA'
         else 'FALLA - creo ' || v_n || ' en vez de 2' end, false);

  -- 3. Y son el PRIMERO y el TERCERO, no dos martes cualquiera.
  select array_agg(((extract(day from s.date)::int - 1) / 7) + 1 order by s.date) into v_ord
    from public.sessions s
   where s.group_id = v_dos and s.date >= v_mes and s.date <= v_fin;
  perform set_config('prueba.v3',
    case when v_ord = array[1, 3] then 'PASA - el 1er y el 3er martes'
         else 'FALLA - cayeron en el ' || coalesce(v_ord::text, 'ninguno') end, false);

  -- 4. Con uno por mes, uno, y es el primero.
  select count(*) into v_n
    from public.sessions
   where group_id = v_uno and date >= v_mes and date <= v_fin;
  select array_agg(((extract(day from s.date)::int - 1) / 7) + 1 order by s.date) into v_ord
    from public.sessions s
   where s.group_id = v_uno and s.date >= v_mes and s.date <= v_fin;
  perform set_config('prueba.v4',
    case when v_n = 1 and v_ord = array[1] then 'PASA'
         else 'FALLA - creo ' || v_n || ' y cayo en el ' || coalesce(v_ord::text,'ninguno') end,
    false);

  -- 5. Todas caen un martes. Recortar la cantidad no puede mover el día.
  select count(*) into v_n
    from public.sessions s
   where s.group_id in (v_todas, v_dos, v_uno) and extract(dow from s.date) <> 2;
  perform set_config('prueba.v5',
    case when v_n = 0 then 'PASA'
         else 'FALLA - ' || v_n || ' clases cayeron otro dia' end, false);

  -- 6. Correrla de nuevo no agrega nada.
  select count(*) into v_esp from public.sessions where group_id = v_dos;
  perform public.asegurar_clases(v_dos);
  select count(*) into v_n from public.sessions where group_id = v_dos;
  perform set_config('prueba.v6',
    case when v_n = v_esp then 'PASA'
         else 'FALLA - paso de ' || v_esp || ' a ' || v_n end, false);
end $$;

-- ----------------------------------------------------------------------------
-- 7. La base no acepta un número que no se puede cumplir. Un mes tiene cuatro
--    martes o cinco, nunca seis: prometer 5 por mes es prometer algo que ocho
--    meses al año queda corto.
-- ----------------------------------------------------------------------------
do $$
declare v_g uuid := (select id from public.groups where name = 'PRUEBA martes uno');
begin
  insert into public.group_schedule (tenant_id, group_id, weekday, start_time, por_mes)
  select tenant_id, v_g, 4, '10:00', 5 from public.groups where id = v_g;
  perform set_config('prueba.v7', 'FALLA - acepto 5 por mes', false);
exception when others then
  perform set_config('prueba.v7', 'PASA - la base lo rechazo', false);
end $$;

select 'Sin por_mes se crean todos los dias del mes' as prueba,
       coalesce(current_setting('prueba.v1', true), 'NO SE EJECUTO') as resultado
union all
select 'Dos por mes crea exactamente dos',
       coalesce(current_setting('prueba.v2', true), 'NO SE EJECUTO')
union all
select 'Y son el 1ro y el 3ro: un martes por medio',
       coalesce(current_setting('prueba.v3', true), 'NO SE EJECUTO')
union all
select 'Uno por mes crea el primero y nada mas',
       coalesce(current_setting('prueba.v4', true), 'NO SE EJECUTO')
union all
select 'Recortar la cantidad no mueve el dia',
       coalesce(current_setting('prueba.v5', true), 'NO SE EJECUTO')
union all
select 'Correrla de nuevo no duplica',
       coalesce(current_setting('prueba.v6', true), 'NO SE EJECUTO')
union all
select 'Cinco por mes no se puede prometer',
       coalesce(current_setting('prueba.v7', true), 'NO SE EJECUTO');

rollback;
