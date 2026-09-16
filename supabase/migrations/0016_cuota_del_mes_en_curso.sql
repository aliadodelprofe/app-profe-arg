-- ============================================================================
-- Migración 0016 — No cobrar meses que todavía no empezaron, y contarle al
-- alumno cómo le van a cobrar antes de que acepte
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. LA CUOTA ES DEL MES EN CURSO, NO DEL QUE VIENE
--
-- Efecto que se vio en uso: alguien se suma a mediados de septiembre eligiendo
-- pagar por mes. Se le arman dos inscripciones —lo que queda de septiembre por
-- clase, y la cuota desde el 1 de octubre—, y asegurar_cargos le generaba YA la
-- cuota de octubre, porque tomaba la fecha de inicio de esa inscripción como
-- punto de partida.
--
-- Técnicamente no estaba mal: el cargo vence el 1 de octubre. Pero el alumno
-- abre la app a mediados de septiembre, todavía no terminó de cursar el mes, y
-- ve una deuda de un mes que no empezó. Parece que le están cobrando de más.
--
-- La regla pasa a ser: se cobra el mes en curso. Una inscripción que empieza el
-- mes que viene no genera nada hasta que ese mes llegue.
-- ----------------------------------------------------------------------------
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
    end if;
  end loop;

  return v_creados;
end;
$$;


-- ----------------------------------------------------------------------------
-- 2. LA INVITACIÓN DICE CÓMO LE VAN A COBRAR
--
-- Aceptar una invitación es aceptar que alguien te cobre. Que no diga cuánto
-- ni cómo es pedirle a alguien que firme sin leer.
--
-- Se devuelven las formas de pago en crudo —modo, precio, desde, hasta— y no
-- una frase armada. La frase la arma la app: en la base, componer castellano
-- termina siendo imposible de cambiar sin una migración.
--
-- Son varias porque pueden serlo: quien se suma a mitad de mes tiene el resto
-- del mes por clase y la cuota desde el 1. El alumno tiene que ver las dos.
-- ----------------------------------------------------------------------------
create or replace function public.invitaciones_pendientes()
returns table (
  student_id      uuid,
  escuela         text,
  disciplina      text,
  anotado_como    text,
  grupos          text,
  formas_de_pago  jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_correo text;
begin
  select u.email into v_correo
    from auth.users u
   where u.id = auth.uid()
     and u.email_confirmed_at is not null;

  if v_correo is null then
    return;
  end if;

  return query
    select s.id,
           t.name,
           t.discipline,
           s.full_name,
           coalesce(string_agg(distinct g.name, ', '), 'sin grupo todavía'),
           coalesce(
             jsonb_agg(
               jsonb_build_object(
                 'grupo',  g.name,
                 'modo',   e.billing_mode,
                 'precio', case e.billing_mode
                             when 'per_session' then g.price_per_session
                             when 'per_period'  then g.price_per_period
                             else                    g.price_one_time
                           end,
                 'desde',  e.start_date,
                 'hasta',  e.end_date
               )
               order by e.start_date
             ) filter (where e.id is not null),
             '[]'::jsonb
           )
      from public.students s
      join public.tenants t on t.id = s.tenant_id
      left join public.enrollments e on e.student_id = s.id and e.status = 'active'
      left join public.groups g on g.id = e.group_id
     where lower(s.email) = lower(v_correo)
       and s.user_id is null
       and s.invite_rejected_at is null
     group by s.id, t.name, t.discipline, s.full_name;
end;
$$;
