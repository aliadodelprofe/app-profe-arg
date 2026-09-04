-- ============================================================================
-- Migración 0004 — Cargos, pagos y conciliación
--
-- En Argentina se cobra por transferencia. El producto NO procesa pagos:
-- CONCILIA. El alumno declara lo que transfirió, el profe confirma con un
-- toque, y el estado de cuenta se actualiza solo.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- CARGOS — lo que un alumno debe
--
-- Se generan según cómo paga cada inscripción:
--   per_session  un cargo por clase (se puede atar a la clase con session_id)
--   per_period   un cargo por mes   (el mes va en "period", ej: 2026-09)
--   one_time     un cargo al inscribirse (workshop)
--
-- "status" acá NO dice si está pagado: dice si el cargo sigue vigente o fue
-- anulado. Si está pagado o no se calcula con los pagos, más abajo.
-- ----------------------------------------------------------------------------
create table public.charges (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  student_id    uuid not null references public.students(id) on delete cascade,
  session_id    uuid references public.sessions(id) on delete set null,
  concept       text not null,                       -- "Clase 12/09", "Cuota septiembre"
  amount        numeric(12,2) not null,
  period        text,                                -- '2026-09' si es mensual
  due_date      date,
  status        text not null default 'active' check (status in ('active','cancelled')),
  created_at    timestamptz not null default now()
);
create index charges_tenant_idx  on public.charges(tenant_id);
create index charges_student_idx on public.charges(student_id);


-- ----------------------------------------------------------------------------
-- PAGOS — la transferencia que el alumno declara
--
-- Nace como 'declared' (el alumno dice "transferí esto") y el profe la pasa
-- a 'confirmed' con un toque. Ese es el flujo que reemplaza al WhatsApp con
-- la captura de pantalla.
-- ----------------------------------------------------------------------------
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  amount       numeric(12,2) not null,
  method       text not null default 'transfer' check (method in ('transfer','cash','other')),
  declared_at  timestamptz not null default now(),
  paid_on      date,                                 -- fecha real de la transferencia
  receipt_url  text,                                 -- comprobante
  note         text,
  status       text not null default 'declared' check (status in ('declared','confirmed','rejected')),
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index payments_tenant_idx  on public.payments(tenant_id);
create index payments_student_idx on public.payments(student_id);


-- ----------------------------------------------------------------------------
-- IMPUTACIONES — qué pago cubre qué cargo
--
-- Existe porque un pago puede cubrir varios cargos (pagó tres clases juntas)
-- y un cargo puede cubrirse con varios pagos (pagó la mitad ahora).
-- ----------------------------------------------------------------------------
create table public.payment_allocations (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  charge_id  uuid not null references public.charges(id) on delete cascade,
  amount     numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index payment_allocations_tenant_idx  on public.payment_allocations(tenant_id);
create index payment_allocations_payment_idx on public.payment_allocations(payment_id);
create index payment_allocations_charge_idx  on public.payment_allocations(charge_id);


-- ----------------------------------------------------------------------------
-- EL CANDADO
-- ----------------------------------------------------------------------------
alter table public.charges             enable row level security;
alter table public.payments            enable row level security;
alter table public.payment_allocations enable row level security;

create policy "acceso a cargos de mis espacios"
  on public.charges for all to authenticated
  using      ( tenant_id in (select public.my_tenant_ids()) )
  with check ( tenant_id in (select public.my_tenant_ids()) );

create policy "acceso a pagos de mis espacios"
  on public.payments for all to authenticated
  using      ( tenant_id in (select public.my_tenant_ids()) )
  with check ( tenant_id in (select public.my_tenant_ids()) );

create policy "acceso a imputaciones de mis espacios"
  on public.payment_allocations for all to authenticated
  using      ( tenant_id in (select public.my_tenant_ids()) )
  with check ( tenant_id in (select public.my_tenant_ids()) );


-- ----------------------------------------------------------------------------
-- ESTADO DE CUENTA — "¿quién me debe y cuánto?"
--
-- Esta es la pregunta que hoy resolvés cruzando una planilla a mano.
-- Acá es una consulta.
--
-- "security_invoker = true" es CRÍTICO: hace que la vista respete las reglas
-- del que pregunta. Sin eso, la vista mostraría datos de todos los espacios.
-- ----------------------------------------------------------------------------
create view public.student_account
with (security_invoker = true) as
select
  c.tenant_id,
  c.student_id,
  sum(c.amount)                                        as total_cargos,
  coalesce(sum(pa.imputado), 0)                        as total_pagado,
  sum(c.amount) - coalesce(sum(pa.imputado), 0)        as saldo
from public.charges c
left join lateral (
  select sum(a.amount) as imputado
  from public.payment_allocations a
  where a.charge_id = c.id
) pa on true
where c.status = 'active'
group by c.tenant_id, c.student_id;
