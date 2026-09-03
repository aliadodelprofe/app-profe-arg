-- ============================================================================
-- Migración 0003 — Núcleo académico
--
-- Alumnos, grupos, clases, inscripciones y asistencias.
-- Todo cuelga de un tenant y hereda el mismo candado de la 0001.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- ALUMNOS
-- user_id es opcional: un alumno puede existir sin cuenta (lo carga el profe)
-- y más adelante vincularse cuando se registre en la app.
-- ----------------------------------------------------------------------------
create table public.students (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  full_name  text not null,
  email      text,
  phone      text,
  doc_id     text,                                    -- DNI u otro documento
  user_id    uuid references auth.users(id) on delete set null,
  status     text not null default 'active',          -- active|inactive
  notes      text,
  created_at timestamptz not null default now()
);
create index students_tenant_idx on public.students(tenant_id);


-- ----------------------------------------------------------------------------
-- GRUPOS — los tres formatos del producto
--
--   cycle    formación o workshop. Grupo cerrado, con fin.
--   regular  clase recurrente, abierta, sin fin. (lo que hace la mayoría)
--   private  clase particular, uno a uno.
-- ----------------------------------------------------------------------------
create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  name       text not null,
  format     text not null check (format in ('cycle','regular','private')),
  level      text,
  capacity   int,
  start_date date,
  end_date   date,                                    -- null si es regular
  status     text not null default 'active',
  created_at timestamptz not null default now()
);
create index groups_tenant_idx on public.groups(tenant_id);


-- ----------------------------------------------------------------------------
-- CLASES — cada encuentro concreto de un grupo
-- El recap de lo visto vive acá: es el motivo principal por el que un alumno
-- abre la app.
-- ----------------------------------------------------------------------------
create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  group_id     uuid not null references public.groups(id) on delete cascade,
  date         date not null,
  start_time   time,
  duration_min int,
  title        text,
  recap        text,
  created_at   timestamptz not null default now()
);
create index sessions_tenant_idx on public.sessions(tenant_id);
create index sessions_group_idx  on public.sessions(group_id, date);


-- ----------------------------------------------------------------------------
-- INSCRIPCIONES — el punto clave del modelo
--
-- Acá vive CÓMO PAGA cada alumno, no en el grupo. Por eso dentro de una misma
-- clase regular puede haber alumnos pagando por clase y otros pagando el mes
-- con descuento.
--
--   per_session  paga cada clase
--   per_period   paga por mes (formación, o regular con descuento)
--   one_time     pago único (workshop)
-- ----------------------------------------------------------------------------
create table public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  group_id     uuid not null references public.groups(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  billing_mode text not null check (billing_mode in ('per_session','per_period','one_time')),
  agreed_price numeric(12,2),
  discount     numeric(12,2) not null default 0,
  start_date   date not null default current_date,
  end_date     date,
  status       text not null default 'active',
  created_at   timestamptz not null default now()
);
create index enrollments_tenant_idx  on public.enrollments(tenant_id);
create index enrollments_group_idx   on public.enrollments(group_id);
create index enrollments_student_idx on public.enrollments(student_id);


-- ----------------------------------------------------------------------------
-- ASISTENCIAS — una fila por alumno por clase
-- ----------------------------------------------------------------------------
create table public.attendance (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status     text not null default 'present' check (status in ('present','absent','excused')),
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);
create index attendance_tenant_idx on public.attendance(tenant_id);


-- ----------------------------------------------------------------------------
-- EL CANDADO — mismo patrón para las cinco tablas
--
-- Regla única y siempre igual: solo accedés a filas de tus propios espacios.
-- "using" controla lo que podés LEER; "with check" lo que podés ESCRIBIR,
-- para que nadie pueda crear una fila dentro del espacio de otro.
-- ----------------------------------------------------------------------------
alter table public.students    enable row level security;
alter table public.groups      enable row level security;
alter table public.sessions    enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance  enable row level security;

create policy "acceso a alumnos de mis espacios"
  on public.students for all to authenticated
  using      ( tenant_id in (select public.my_tenant_ids()) )
  with check ( tenant_id in (select public.my_tenant_ids()) );

create policy "acceso a grupos de mis espacios"
  on public.groups for all to authenticated
  using      ( tenant_id in (select public.my_tenant_ids()) )
  with check ( tenant_id in (select public.my_tenant_ids()) );

create policy "acceso a clases de mis espacios"
  on public.sessions for all to authenticated
  using      ( tenant_id in (select public.my_tenant_ids()) )
  with check ( tenant_id in (select public.my_tenant_ids()) );

create policy "acceso a inscripciones de mis espacios"
  on public.enrollments for all to authenticated
  using      ( tenant_id in (select public.my_tenant_ids()) )
  with check ( tenant_id in (select public.my_tenant_ids()) );

create policy "acceso a asistencias de mis espacios"
  on public.attendance for all to authenticated
  using      ( tenant_id in (select public.my_tenant_ids()) )
  with check ( tenant_id in (select public.my_tenant_ids()) );

-- Pendiente para más adelante: las políticas que le permiten a un ALUMNO
-- ver sus propias clases y su estado de cuenta. Se agregan cuando armemos
-- el portal del alumno.
