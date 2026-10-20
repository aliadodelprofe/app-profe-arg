-- ============================================================================
-- Migración 0024 — Dónde transferirle al profe
--
-- Hasta ahora la app le pedía al alumno que avisara que transfirió, pero no le
-- decía adónde. El alias seguía viajando por WhatsApp, que es exactamente el
-- paso que esta app vino a sacar del medio.
--
-- Arranca con transferencia y nada más, pero la forma es una TABLA y no tres
-- columnas sueltas en tenants, por dos razones concretas:
--
--   1. Un profesor puede tener más de un destino (la cuenta del banco y el
--      Mercado Pago), y eso con columnas se resuelve duplicando columnas.
--   2. Cuando se sume efectivo o un link de pago, es una fila más y un valor
--      más en el "check", no una migración que toque tenants —que es la tabla
--      de la que cuelga absolutamente todo.
--
-- SOBRE LA PRIVACIDAD DEL CBU. Esto no es un secreto que haya que esconder del
-- alumno: es un dato que el profesor publica a propósito para que le paguen, y
-- con un CBU nadie puede sacar plata de una cuenta, solo ponerla. Lo que sí
-- tiene que estar garantizado es que no cruce de espacio: el alumno de un
-- profesor no puede ver el CBU de otro profesor. De eso se encarga la política
-- de abajo, que es la única puerta.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. LA TABLA
--
-- "holder" es el titular de la cuenta y es obligatorio: cuando el nombre del
-- alias no coincide con el de quien cobra, el alumno frena y pregunta. Decirlo
-- de antemano evita esa fricción.
--
-- "alias" y "cbu" son opcionales por separado, pero no los dos a la vez:
-- una fila sin ninguno de los dos es un cartel vacío que el alumno igual va a
-- leer. Eso lo impide el check de abajo, no la pantalla: una regla que solo
-- vive en el formulario se saltea con una pestaña del navegador.
-- ----------------------------------------------------------------------------
create table public.payment_methods (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  kind       text not null default 'transfer' check (kind in ('transfer')),
  holder     text not null check (length(btrim(holder)) > 0),
  alias      text,
  cbu        text,
  bank       text,
  note       text,
  status     text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  constraint payment_methods_necesita_destino
    check (coalesce(btrim(alias), '') <> '' or coalesce(btrim(cbu), '') <> '')
);

create index payment_methods_tenant_idx on public.payment_methods(tenant_id);

comment on table public.payment_methods is
  'Dónde le transfieren al profesor. Lo ven sus alumnos, y solo sus alumnos.';


-- ----------------------------------------------------------------------------
-- 2. EL CANDADO
--
-- Dos políticas, y la diferencia entre las dos es el punto de toda la
-- migración:
--
--   El PROFESOR tiene "for all" sobre los medios de SUS espacios: los carga,
--   los corrige y los archiva.
--
--   El ALUMNO tiene "for select" y nada más, y solo sobre los espacios donde
--   tiene ficha. No puede crear ni editar un medio de pago: si pudiera,
--   podría cambiarle el CBU a su profesor y cobrarle a sus compañeros.
--
-- Además el alumno solo ve los activos. Un medio archivado es una cuenta que
-- el profesor dejó de usar; mostrarla sería mandar plata a un lugar que ya no
-- mira.
-- ----------------------------------------------------------------------------
alter table public.payment_methods enable row level security;

create policy "acceso a medios de pago de mis espacios"
  on public.payment_methods for all to authenticated
  using      ( tenant_id in (select public.my_tenant_ids()) )
  with check ( tenant_id in (select public.my_tenant_ids()) );

create policy "un alumno ve donde transferirle a su profe"
  on public.payment_methods for select to authenticated
  using (
    status = 'active'
    and tenant_id in (select public.my_student_tenant_ids())
  );
