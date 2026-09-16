-- ============================================================================
-- Migración 0015 — El alumno acepta antes de quedar anotado
--
-- Hasta acá, reclamar_ficha() enganchaba sola: el profesor escribía un correo,
-- la persona se registraba con ese correo, y quedaba anotada en su curso sin
-- que nadie le preguntara. Con cargos generándose a su nombre.
--
-- El enganche no es un trámite: es aceptar que alguien te cobre. Tiene que ser
-- una decisión, y tiene que poder decirse que no.
--
-- Queda igual lo que ya estaba bien: el profesor arma su lista la primera
-- noche, sin depender de que nadie se registre. Esa lista no son cuentas, son
-- renglones con un nombre y un correo. La cuenta la crea siempre la persona.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Para acordarse de un "no soy yo".
--
-- Sin esto, la invitación rechazada reaparece cada vez que la persona entra, y
-- a la tercera termina aceptando cualquier cosa para sacársela de encima.
-- ----------------------------------------------------------------------------
alter table public.students add column invite_rejected_at timestamptz;

comment on column public.students.invite_rejected_at is
  'Cuándo la persona dijo "no soy yo". Se limpia si el profesor corrige el correo.';


-- ----------------------------------------------------------------------------
-- 1. QUÉ INVITACIONES ME ESPERAN
--
-- Devuelve las fichas libres cuyo correo coincide con el correo confirmado de
-- quien pregunta. Le muestra de qué escuela es, con qué nombre la anotaron y a
-- qué grupos, que es lo que necesita para decidir si es ella o no.
--
-- "security definer" porque justamente son fichas que TODAVÍA no son suyas.
-- Por eso el filtro por correo confirmado no es negociable: es lo único que
-- separa "esta invitación es para mí" de "me registré con el correo de otro".
-- ----------------------------------------------------------------------------
create or replace function public.invitaciones_pendientes()
returns table (
  student_id    uuid,
  escuela       text,
  disciplina    text,
  anotado_como  text,
  grupos        text
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
           coalesce(string_agg(g.name, ', ' order by g.name), 'sin grupo todavía')
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


-- ----------------------------------------------------------------------------
-- 2. ACEPTAR
--
-- Una invitación por vez, a propósito: aceptar que dos profesores distintos te
-- cobren son dos decisiones, no una.
-- ----------------------------------------------------------------------------
create or replace function public.aceptar_invitacion(p_student_id uuid)
returns void
language plpgsql
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
    raise exception 'Confirmá tu correo antes de aceptar';
  end if;

  update public.students s
     set user_id = auth.uid()
   where s.id = p_student_id
     and s.user_id is null
     and s.invite_rejected_at is null
     and lower(s.email) = lower(v_correo);

  if not found then
    raise exception 'Esa invitación ya no está disponible';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- 3. RECHAZAR
--
-- No borra nada del profesor: su renglón queda, con la marca de que esa
-- persona dijo que no es ella. Lo que hace falta ahí es que el profesor lo vea
-- y corrija el correo, no que la ficha desaparezca sin explicación.
-- ----------------------------------------------------------------------------
create or replace function public.rechazar_invitacion(p_student_id uuid)
returns void
language plpgsql
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
    raise exception 'Confirmá tu correo antes de responder';
  end if;

  update public.students s
     set invite_rejected_at = now()
   where s.id = p_student_id
     and s.user_id is null
     and lower(s.email) = lower(v_correo);

  if not found then
    raise exception 'Esa invitación ya no está disponible';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- 4. Fuera el enganche automático.
--
-- Es la razón de ser de esta migración: quedarse con las dos formas sería
-- dejar abierta la que no pregunta.
-- ----------------------------------------------------------------------------
drop function if exists public.reclamar_ficha();


revoke all on function public.invitaciones_pendientes() from public;
revoke all on function public.aceptar_invitacion(uuid)  from public;
revoke all on function public.rechazar_invitacion(uuid) from public;

grant execute on function public.invitaciones_pendientes() to authenticated;
grant execute on function public.aceptar_invitacion(uuid)  to authenticated;
grant execute on function public.rechazar_invitacion(uuid) to authenticated;
