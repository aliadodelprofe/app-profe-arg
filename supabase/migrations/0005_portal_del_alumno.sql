-- ============================================================================
-- Migración 0005 — Portal del alumno
--
-- Hasta acá todas las reglas del sistema eran para el PROFESOR: "accedo a lo
-- que pasa en mis espacios", y quién sos se define por tenant_members.
--
-- Esta migración agrega el segundo tipo de usuario: el ALUMNO. Entra a ver
-- SUS clases, SUS asistencias y SU estado de cuenta, y a declarar SUS
-- transferencias. Nada más.
--
-- Un alumno NO es miembro de un tenant. Se lo reconoce por students.user_id,
-- la columna que enlaza su ficha con su usuario de Supabase Auth.
--
-- IMPORTANTE: estas reglas no le abren la puerta a nadie hasta que las fichas
-- de alumno tengan user_id cargado. Una ficha con user_id vacío es un alumno
-- que el profe anotó a mano y que todavía no puede entrar a la app.
--
-- Estas reglas SUMAN a las que ya existen, no las reemplazan. Postgres deja
-- pasar una fila si CUALQUIERA de las reglas de esa tabla la permite. Por eso
-- el profesor sigue viendo todo lo suyo exactamente igual que antes.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. ¿QUIÉN ES EL ALUMNO QUE ESTÁ PREGUNTANDO?
--
-- Mismo truco que my_tenant_ids() en la 0001: funciones "security definer",
-- que miran por encima del candado para contestar una sola pregunta chica.
-- Sin esto, la regla de students necesitaría consultar students para decidir
-- si puede consultar students: la recursión infinita que hubo que arreglar
-- en la 0002.
--
-- Devuelven varias fichas y no una porque la misma persona puede ser alumna
-- de dos profesores distintos, cada uno con su espacio.
-- ----------------------------------------------------------------------------

-- Las fichas de alumno de la persona logueada.
create or replace function public.my_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.students
  where user_id = auth.uid()
$$;

-- Los espacios donde esa persona es alumna (NO donde es profesora).
create or replace function public.my_student_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.students
  where user_id = auth.uid()
$$;

-- Los grupos en los que está inscripta.
create or replace function public.my_enrolled_group_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.group_id
  from public.enrollments e
  where e.student_id in (select id from public.students where user_id = auth.uid())
    and e.status = 'active'
$$;

-- Los pagos que declaró.
create or replace function public.my_payment_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.payments p
  where p.student_id in (select id from public.students where user_id = auth.uid())
$$;

revoke all on function public.my_student_ids()        from public;
revoke all on function public.my_student_tenant_ids() from public;
revoke all on function public.my_enrolled_group_ids() from public;
revoke all on function public.my_payment_ids()        from public;

grant execute on function public.my_student_ids()        to authenticated;
grant execute on function public.my_student_tenant_ids() to authenticated;
grant execute on function public.my_enrolled_group_ids() to authenticated;
grant execute on function public.my_payment_ids()        to authenticated;


-- ----------------------------------------------------------------------------
-- 2. LO QUE EL ALUMNO PUEDE LEER
--
-- Todas son "for select": mirar, nunca tocar. La única excepción está en el
-- punto 3.
-- ----------------------------------------------------------------------------

-- Su propia ficha, y solo la suya. No ve a sus compañeros de grupo.
create policy "un alumno ve su propia ficha"
  on public.students for select to authenticated
  using ( user_id = auth.uid() );

-- El espacio del que forma parte, para poder mostrar de quién es la clase.
create policy "un alumno ve su escuela"
  on public.tenants for select to authenticated
  using ( id in (select public.my_student_tenant_ids()) );

-- Los grupos en los que está inscripto.
create policy "un alumno ve sus grupos"
  on public.groups for select to authenticated
  using ( id in (select public.my_enrolled_group_ids()) );

-- Las clases de esos grupos. Acá vive el recap: el motivo principal por el
-- que un alumno abre la app.
create policy "un alumno ve las clases de sus grupos"
  on public.sessions for select to authenticated
  using ( group_id in (select public.my_enrolled_group_ids()) );

-- Sus inscripciones, que es donde vive el precio que acordó.
create policy "un alumno ve sus inscripciones"
  on public.enrollments for select to authenticated
  using ( student_id in (select public.my_student_ids()) );

-- Sus asistencias. Las de los demás no.
create policy "un alumno ve sus asistencias"
  on public.attendance for select to authenticated
  using ( student_id in (select public.my_student_ids()) );

-- Lo que debe.
create policy "un alumno ve sus cargos"
  on public.charges for select to authenticated
  using ( student_id in (select public.my_student_ids()) );

-- Lo que pagó, incluidos los pagos que el profe todavía no confirmó.
create policy "un alumno ve sus pagos"
  on public.payments for select to authenticated
  using ( student_id in (select public.my_student_ids()) );

-- Qué pago cubrió qué cargo. Sin esta regla la vista student_account le
-- mostraría al alumno que pagó $0 y le debe todo: la vista suma los cargos
-- y las imputaciones, y solo ve lo que el que pregunta tiene permitido ver.
create policy "un alumno ve las imputaciones de sus pagos"
  on public.payment_allocations for select to authenticated
  using ( payment_id in (select public.my_payment_ids()) );


-- ----------------------------------------------------------------------------
-- 3. LO ÚNICO QUE EL ALUMNO PUEDE ESCRIBIR: DECLARAR UNA TRANSFERENCIA
--
-- Este es el corazón de la conciliación. El alumno crea la fila del pago;
-- el profesor la confirma. El "with check" es lo que impide las tres formas
-- de hacer trampa:
--
--   1. declarar un pago a nombre de otro alumno   -> student_id tiene que ser suyo
--   2. meter el pago en el espacio de otro profe  -> tenant_id tiene que ser el suyo
--   3. auto-confirmarse el pago                   -> status obligado a 'declared'
--                                                     y los campos de confirmación
--                                                     tienen que quedar vacíos
--
-- El alumno no tiene ninguna regla de escritura más allá de esta, a
-- propósito: una vez declarado, el pago lo corrige o lo anula solo el profe. Si el alumno se equivocó en el
-- monto, se lo pide al profesor. Es un pago: la trazabilidad importa más que
-- la comodidad.
-- ----------------------------------------------------------------------------
create policy "un alumno declara un pago suyo"
  on public.payments for insert to authenticated
  with check (
        student_id in (select public.my_student_ids())
    and tenant_id  in (select public.my_student_tenant_ids())
    and status = 'declared'
    and confirmed_by is null
    and confirmed_at is null
  );


-- ----------------------------------------------------------------------------
-- Qué NO hace esta migración, a propósito:
--
-- - No enlaza fichas de alumno con usuarios (students.user_id sigue vacío).
--   Ese flujo (el profe invita, el alumno se registra) es trabajo de la app.
-- - No le deja al alumno ver a sus compañeros de grupo.
-- - No le deja corregir ni borrar un pago ya declarado.
-- - No toca ninguna regla existente del profesor.
-- ----------------------------------------------------------------------------
