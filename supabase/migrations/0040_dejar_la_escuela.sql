-- ============================================================================
-- Migración 0040 — Dejar la escuela, no un grupo
--
-- `students.status` existe desde la 0003 con los valores 'active' e
-- 'inactive', y en dos años nadie lo escribió nunca. Dar de baja a alguien es
-- sacarlo de UN grupo; de la escuela no se va jamás. El que dejó de venir hace
-- seis meses sigue apareciendo en cada lista, y el profesor termina leyendo
-- nombres que ya no le importan todos los días.
--
-- POR QUÉ ES UNA FUNCIÓN Y NO UN UPDATE.
--
-- Desde la 0023 la ficha es del alumno: el profesor solo puede modificarla
-- mientras nadie la haya reclamado. Esa regla es correcta y no se toca — el
-- nombre y la foto son de la persona, no de la escuela.
--
-- Pero el ESTADO no es parte de la identidad del alumno: es la relación de la
-- escuela con él. Que el profesor no pueda decir "esta persona ya no viene"
-- porque la persona se creó una cuenta es confundir dos cosas distintas. La
-- función separa las dos: deja cambiar el estado y nada más, sobre cualquier
-- ficha del espacio, reclamada o no.
--
-- QUÉ SE LLEVA PUESTO Y QUÉ NO.
--
-- Cierra todas las inscripciones activas, que es lo que corta la generación de
-- cargos y de clases. No toca la plata: lo que el alumno debe lo sigue
-- debiendo, y lo que pagó sigue estando. Dar de baja no es perdonar una deuda,
-- y una app que borra lo que alguien debe cuando se va es una app en la que no
-- se puede confiar.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. QUE EL ESTADO SEA UNO DE LOS DOS
--
-- La columna decía 'active|inactive' en un comentario, que es una regla que no
-- rige. Un día alguien escribe 'inactivo' y la mitad de las consultas deja de
-- encontrarlo, sin error y sin aviso.
-- ----------------------------------------------------------------------------
update public.students
   set status = 'active'
 where status is null or status not in ('active', 'inactive');

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.students'::regclass
       and conname = 'students_estado_valido'
  ) then
    alter table public.students
      add constraint students_estado_valido
      check (status in ('active', 'inactive'));
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 2. DEJAR LA ESCUELA
--
-- `security definer` para poder escribir sobre una ficha reclamada, y por eso
-- mismo lo primero que hace es comprobar a mano que quien llama sea del
-- espacio: una función con este permiso que no verifica es una puerta abierta.
--
-- El `update` de las inscripciones repite la lógica de la baja por grupo: lo
-- que todavía no arrancó se cierra igual, porque una inscripción con fin
-- anterior al comienzo es como la base dice "esto no corre" y asegurar_cargos
-- la ignora.
-- ----------------------------------------------------------------------------
create or replace function public.dejar_la_escuela(p_alumno uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_cerradas int;
begin
  select tenant_id into v_tenant from public.students where id = p_alumno;
  if v_tenant is null then
    raise exception 'Esa ficha no existe';
  end if;
  if v_tenant not in (select public.my_tenant_ids()) then
    raise exception 'Esa ficha no es de un espacio tuyo' using errcode = '42501';
  end if;

  update public.enrollments
     set status = 'ended',
         end_date = least(coalesce(end_date, current_date), current_date)
   where student_id = p_alumno
     and status = 'active';
  get diagnostics v_cerradas = row_count;

  update public.students
     set status = 'inactive'
   where id = p_alumno;

  return v_cerradas;
end;
$$;

revoke all on function public.dejar_la_escuela(uuid) from public;
grant execute on function public.dejar_la_escuela(uuid) to authenticated;

comment on function public.dejar_la_escuela(uuid) is
  'El alumno deja de venir a la escuela entera. Cierra sus inscripciones y '
  'lo marca inactivo. No toca la plata: lo que debe lo sigue debiendo.';


-- ----------------------------------------------------------------------------
-- 3. Y VOLVER
--
-- La vuelta NO reabre las inscripciones. Alguien que vuelve después de un año
-- no vuelve necesariamente al mismo grupo, al mismo precio ni con la misma
-- forma de pago, y reabrir a ciegas le generaría cargos de un arreglo que ya
-- nadie acordó. Vuelve a estar en la escuela; a los grupos se lo anota de
-- nuevo, que es una decisión que toma el profesor.
-- ----------------------------------------------------------------------------
create or replace function public.volver_a_la_escuela(p_alumno uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.students where id = p_alumno;
  if v_tenant is null then
    raise exception 'Esa ficha no existe';
  end if;
  if v_tenant not in (select public.my_tenant_ids()) then
    raise exception 'Esa ficha no es de un espacio tuyo' using errcode = '42501';
  end if;

  update public.students set status = 'active' where id = p_alumno;
end;
$$;

revoke all on function public.volver_a_la_escuela(uuid) from public;
grant execute on function public.volver_a_la_escuela(uuid) to authenticated;
