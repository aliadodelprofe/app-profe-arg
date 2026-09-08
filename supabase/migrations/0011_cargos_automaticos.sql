-- ============================================================================
-- Migración 0011 — Los cargos se generan solos
--
-- Dos cosas:
--   1. Se elimina enrollments.agreed_price. El precio es del grupo.
--   2. Se agrega asegurar_cargos(), que mantiene al día lo que cada alumno
--      debe por lo que viene.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Fuera el precio por alumno
--
-- Quedó sin uso con la 0010: el precio es del grupo y lo que elige el alumno
-- es la forma de pago. Se borra ahora, que está vacía y nadie la lee. Una
-- columna que no se usa pero existe es una invitación a que alguien la use
-- mal más adelante.
-- ----------------------------------------------------------------------------
alter table public.enrollments drop column agreed_price;


-- ----------------------------------------------------------------------------
-- 2. LA REGLA
--
-- "Toda inscripción activa tiene un cargo pendiente por lo que viene."
--
-- Está escrita como una regla que se verifica, y no como una reacción a un
-- evento. La diferencia importa: si se programara por eventos —"al anotarse,
-- crear el cargo"— un evento perdido deja un cargo que no existe y nadie se
-- entera nunca. Verificando, cada vez que alguien mira se completa lo que
-- falte, y un día sin abrir la app no rompe nada.
--
-- La consecuencia práctica es que esta función se puede llamar mil veces
-- seguidas sin que pase nada: si el cargo ya está, no hace nada.
--
--   Por clase  el cargo de la PRÓXIMA clase programada. Cuando esa clase pasa,
--              la próxima es otra y se genera la siguiente. Uno por vez: nadie
--              debe tres clases que todavía no tomó.
--   Por mes    el cargo del mes en curso. Cuando el mes termina, el mes en
--              curso es otro y se genera el que sigue.
--
-- Nunca se cobra dos veces lo mismo: para el mes, la marca es el período;
-- para la clase, la clase misma.
--
-- No es "security definer": corre con los permisos de quien llama, así que un
-- profesor no puede generar cargos en el espacio de otro.
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
    select e.id, e.student_id, e.billing_mode, e.start_date
      from public.enrollments e
     where e.group_id = p_grupo_id
       and e.status = 'active'
  loop
    -- Desde cuándo corresponde cobrarle: nunca antes de que empiece a cursar.
    v_desde := greatest(current_date, coalesce(v_ins.start_date, current_date));

    -- ---------------------------------------------------------------- por mes
    if v_ins.billing_mode = 'per_period' and v_grupo.price_per_period is not null then
      v_mes := date_trunc('month', v_desde)::date;

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
           v_mes);   -- vence el día 1: se paga para cursar, no después de cursar
        v_creados := v_creados + 1;
      end if;

    -- -------------------------------------------------------------- por clase
    elsif v_ins.billing_mode = 'per_session' and v_grupo.price_per_session is not null then
      select s.id, s.date into v_clase
        from public.sessions s
       where s.group_id = p_grupo_id
         and s.status = 'scheduled'
         and s.date >= v_desde
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

revoke all on function public.asegurar_cargos(uuid) from public;
grant execute on function public.asegurar_cargos(uuid) to authenticated;
