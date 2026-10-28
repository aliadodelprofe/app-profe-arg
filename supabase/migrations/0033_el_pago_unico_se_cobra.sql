-- ============================================================================
-- Migración 0033 — El pago único también se cobra
--
-- "Pago único" existía desde el primer día: está en el check de enrollments,
-- en el precio del grupo y en el formulario de inscripción. Lo que no existía
-- era el cargo.
--
-- asegurar_cargos() tenía dos ramas, por mes y por clase, y ninguna para el
-- pago único. El profesor anotaba a alguien en un taller con precio total,
-- la app decía que sí, y no le generaba NADA — ni ese día ni nunca. El alumno
-- figuraba al día debiendo el taller entero.
--
-- Es el peor tipo de agujero: no falla, no avisa, y solo se nota el día que
-- alguien cruza lo cobrado contra lo que tendría que haber entrado.
--
-- Esta migración agrega la tercera rama. Es la misma función de la 0016 con
-- el agregado: se reemplaza entera porque una función se reemplaza entera.
-- ============================================================================
create or replace function public.asegurar_cargos(p_grupo_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_meses  text[] := array['enero','febrero','marzo','abril','mayo','junio',
                           'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  v_grupo  public.groups;
  v_ins    record;
  v_clase  record;
  v_desde  date;
  v_mes    date;
  v_creados int := 0;
begin
  select * into v_grupo from public.groups where id = p_grupo_id;
  if v_grupo.id is null then
    raise exception 'Ese grupo no existe, o no pertenece a un espacio tuyo';
  end if;

  for v_ins in
    select e.id, e.student_id, e.billing_mode, e.start_date, e.end_date
      from public.enrollments e
     where e.group_id = p_grupo_id
       and e.status = 'active'
       and (e.end_date is null or e.end_date >= current_date)
  loop
    v_desde := greatest(current_date, coalesce(v_ins.start_date, current_date));

    -- ---------------------------------------------------------------- por mes
    if v_ins.billing_mode = 'per_period' and v_grupo.price_per_period is not null then
      v_mes := date_trunc('month', current_date)::date;   -- el mes EN CURSO

      if (v_ins.start_date is null or v_mes >= date_trunc('month', v_ins.start_date)::date)
         and (v_ins.end_date is null or v_mes <= v_ins.end_date)
      then
        if not exists (
          select 1 from public.charges c
           where c.enrollment_id = v_ins.id
             and c.period = to_char(v_mes, 'YYYY-MM')
             and c.status = 'active'
        ) then
          insert into public.charges
            (tenant_id, enrollment_id, student_id, concept, amount, period, due_date)
          values
            (v_grupo.tenant_id, v_ins.id, v_ins.student_id,
             'Cuota ' || v_meses[extract(month from v_mes)] || ' ' || extract(year from v_mes),
             v_grupo.price_per_period,
             to_char(v_mes, 'YYYY-MM'),
             v_mes);
          v_creados := v_creados + 1;
        end if;
      end if;

    -- -------------------------------------------------------------- por clase
    elsif v_ins.billing_mode = 'per_session' and v_grupo.price_per_session is not null then
      select s.id, s.date into v_clase
        from public.sessions s
       where s.group_id = p_grupo_id
         and s.status = 'scheduled'
         and s.date >= v_desde
         and (v_ins.end_date is null or s.date <= v_ins.end_date)
       order by s.date, s.start_time nulls first
       limit 1;

      if v_clase.id is not null and not exists (
        select 1 from public.charges c
         where c.enrollment_id = v_ins.id
           and c.session_id = v_clase.id
           and c.status = 'active'
      ) then
        insert into public.charges
          (tenant_id, enrollment_id, student_id, session_id, concept, amount, due_date)
        values
          (v_grupo.tenant_id, v_ins.id, v_ins.student_id, v_clase.id,
           'Clase ' || to_char(v_clase.date, 'DD/MM'),
           v_grupo.price_per_session,
           v_clase.date);
        v_creados := v_creados + 1;
      end if;
    -- ------------------------------------------------------------ pago único
    elsif v_ins.billing_mode = 'one_time' and v_grupo.price_one_time is not null then
      -- UNA sola vez, y nunca más. Se reconoce por period = 'unico': sin esa
      -- marca habría que preguntar "¿ya tiene algún cargo?", y eso lo
      -- bloquearía cualquier cargo suelto que el profesor le haya puesto
      -- —materiales, un recupero— y el taller quedaría sin cobrar.
      if not exists (
        select 1 from public.charges c
         where c.enrollment_id = v_ins.id
           and c.period = 'unico'
           and c.status = 'active'
      ) then
        insert into public.charges
          (tenant_id, enrollment_id, student_id, concept, amount, period, due_date)
        values
          (v_grupo.tenant_id, v_ins.id, v_ins.student_id,
           v_grupo.name,
           v_grupo.price_one_time,
           'unico',
           -- Vence hoy. Un taller que se paga entero se paga por adelantado:
           -- esa es la mitad de la razón por la que un profesor lo ofrece.
           current_date);
        v_creados := v_creados + 1;
      end if;

    end if;
  end loop;

  return v_creados;
end;
$$;
