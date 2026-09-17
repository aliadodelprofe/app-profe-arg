-- ============================================================================
-- Migración 0017 — El alumno cambia su forma de pago
--
-- Decidido el 16/9/2026: la forma de pago la elige el alumno, sin que el
-- profesor tenga que aprobar nada. El profesor ya jugó su carta antes, cuando
-- fijó los dos precios: el descuento del mes es su herramienta para que al
-- alumno le convenga comprometerse. Si la cuota no seduce, el alumno viene
-- suelto — y eso es información para el profesor, no un problema del sistema.
--
-- El cambio vale desde el 1 del mes siguiente. Ni antes ni a mitad de mes:
-- el mes en curso ya se cobró o ya se cursó, y rehacerlo para atrás sería
-- discutir plata que ya está contada.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- No hace falta ningún concepto nuevo.
--
-- Una inscripción ya tiene forma de pago, fecha de inicio y fecha de fin. Dos
-- arreglos de cobro que se suceden en el tiempo son dos inscripciones — es lo
-- mismo que ya se hace con quien se suma a mitad de mes. Cambiar de forma de
-- pago es cerrar la de ahora a fin de mes y empezar otra el día 1.
--
-- Trabaja sobre el GRUPO y no sobre una inscripción puntual, a propósito: el
-- alumno piensa "en esta clase quiero pagar por mes", no "quiero modificar la
-- inscripción tal". Y si ya tenía dos tramos —el resto del mes por clase y la
-- cuota desde el 1—, lo que hay que cambiar es el segundo, no el primero. La
-- función se ocupa de eso sola.
--
-- "security definer" porque el alumno no tiene permiso de escritura sobre
-- enrollments, y no debería tenerlo: con permiso de escritura libre podría
-- cambiarse el grupo, el precio o la escuela. Acá solo puede hacer una cosa,
-- sobre sus propias inscripciones, y hacia adelante.
-- ----------------------------------------------------------------------------
create or replace function public.cambiar_forma_de_pago(
  p_grupo_id uuid,
  p_modo     text
)
returns date          -- desde cuándo vale
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo    public.groups;
  v_ficha    uuid;
  v_precio   numeric;
  v_fin_mes  date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  v_inicio   date := (date_trunc('month', current_date) + interval '1 month')::date;
  v_futura   uuid;
begin
  if p_modo not in ('per_session', 'per_period') then
    raise exception 'Forma de pago desconocida';
  end if;

  select * into v_grupo from public.groups where id = p_grupo_id;
  if v_grupo.id is null then
    raise exception 'Ese grupo no existe';
  end if;

  -- ¿Quién es esta persona en esa escuela? Si no tiene ficha ahí, no tiene
  -- nada que cambiar.
  select s.id into v_ficha
    from public.students s
   where s.user_id = auth.uid()
     and s.tenant_id = v_grupo.tenant_id;

  if v_ficha is null then
    raise exception 'No estás anotado en esa escuela';
  end if;

  -- Y que el grupo tenga precio para esa forma. Sin precio, el alumno
  -- quedaría cursando sin que se le genere ningún cargo: parecería gratis
  -- hasta que alguien se diera cuenta.
  v_precio := case p_modo
                when 'per_session' then v_grupo.price_per_session
                else                    v_grupo.price_per_period
              end;
  if v_precio is null then
    raise exception 'Esa clase todavía no tiene precio para esa forma de pago. Pedíselo a tu profe.';
  end if;

  -- 1. Cerrar a fin de mes lo que hoy está vigente y llegaría al mes que viene.
  --    Lo que ya venía con fecha de fin antes del 30 se deja como está: alguien
  --    ya decidió eso.
  update public.enrollments e
     set end_date = v_fin_mes
   where e.group_id = p_grupo_id
     and e.student_id = v_ficha
     and e.status = 'active'
     and e.start_date <= v_fin_mes
     and (e.end_date is null or e.end_date > v_fin_mes);

  -- 2. El arreglo del mes que viene. Si ya existe uno —porque se sumó a mitad
  --    de mes, o porque ya cambió de opinión antes— se le corrige la forma en
  --    vez de crear otro. Si no, se crea.
  select e.id into v_futura
    from public.enrollments e
   where e.group_id = p_grupo_id
     and e.student_id = v_ficha
     and e.status = 'active'
     and e.start_date = v_inicio
   limit 1;

  if v_futura is not null then
    update public.enrollments set billing_mode = p_modo where id = v_futura;
  else
    insert into public.enrollments
      (tenant_id, group_id, student_id, billing_mode, start_date, status)
    values
      (v_grupo.tenant_id, p_grupo_id, v_ficha, p_modo, v_inicio, 'active');
  end if;

  return v_inicio;
end;
$$;

revoke all on function public.cambiar_forma_de_pago(uuid, text) from public;
grant execute on function public.cambiar_forma_de_pago(uuid, text) to authenticated;
