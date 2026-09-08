-- ============================================================================
-- Migración 0012 — Los cargos respetan la fecha de fin de la inscripción
--
-- La 0011 dejó a asegurar_cargos mirando solo status = 'active'. Falta mirar
-- también la fecha de fin, y hace falta ya:
--
-- Cuando alguien se suma a mitad de mes eligiendo pagar por mes, no se le
-- cobra el mes entero por clases que ya pasaron. Se le arma lo que queda de
-- este mes por clase, y la cuota le arranca el 1 del mes que viene. Eso son
-- DOS inscripciones: una por clase que TERMINA el 30, y otra por mes que
-- EMPIEZA el 1.
--
-- Sin este arreglo, la primera seguiría generando clases sueltas en octubre
-- además de la cuota. El alumno pagaría dos veces lo mismo.
--
-- No hace falta una tabla nueva ni un campo nuevo: una inscripción ya tiene
-- forma de pago, fecha de inicio y fecha de fin. Dos arreglos de cobro que se
-- suceden en el tiempo son dos inscripciones, que es exactamente para lo que
-- esa tabla existe.
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
       -- Lo agregado en esta migración: una inscripción que ya terminó no
       -- genera más nada, aunque todavía figure activa.
       and (e.end_date is null or e.end_date >= current_date)
  loop
    v_desde := greatest(current_date, coalesce(v_ins.start_date, current_date));

    -- ---------------------------------------------------------------- por mes
    if v_ins.billing_mode = 'per_period' and v_grupo.price_per_period is not null then
      v_mes := date_trunc('month', v_desde)::date;

      -- Y tampoco se cobra un mes que empieza después de que la inscripción
      -- termina.
      if v_ins.end_date is null or v_mes <= v_ins.end_date then
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
         -- Ni una clase posterior al fin de la inscripción.
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
    end if;
  end loop;

  return v_creados;
end;
$$;
