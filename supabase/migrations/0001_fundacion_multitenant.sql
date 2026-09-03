-- ============================================================================
-- Migración 0001 — Fundación multi-tenant
--
-- Crea las dos tablas base del sistema y, sobre todo, el mecanismo que
-- garantiza que un profesor NUNCA vea datos de otro.
--
-- Todo lo que venga después (alumnos, grupos, pagos) se apoya en esto.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TENANTS — el espacio de trabajo de un profesor o proyecto
--
-- "Tenant" = inquilino. Cada profesor (o dupla, como Tomás y Astrid) tiene
-- su propio espacio. Todos los datos del sistema van a colgar de acá.
-- ----------------------------------------------------------------------------
create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  discipline  text,                                    -- bachata, yoga, etc.
  plan        text not null default 'trial',           -- trial|esencial|pro|estudio|multi
  created_at  timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 2. TENANT_MEMBERS — quién puede entrar a cada espacio
--
-- Conecta una persona (usuario de Supabase Auth) con un tenant.
-- Permite que Tomás y Astrid compartan el mismo espacio, y más adelante
-- habilita el plan Multi (varios profesores en una misma escuela).
-- ----------------------------------------------------------------------------
create table public.tenant_members (
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'teacher',          -- owner|teacher|assistant
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index tenant_members_user_idx on public.tenant_members(user_id);


-- ----------------------------------------------------------------------------
-- 3. LA FUNCIÓN CLAVE — ¿a qué espacios pertenece quien está preguntando?
--
-- Devuelve la lista de tenants del usuario logueado. Todas las reglas de
-- seguridad del sistema van a usar esta función.
--
-- "security definer" hace que la función se ejecute con permisos elevados.
-- Esto es necesario para evitar una recursión infinita: sin esto, la regla
-- de tenant_members necesitaría consultar tenant_members para decidir si
-- puede consultar tenant_members.
-- ----------------------------------------------------------------------------
create or replace function public.my_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.tenant_members
  where user_id = auth.uid()
$$;

revoke all on function public.my_tenant_ids() from public;
grant execute on function public.my_tenant_ids() to authenticated;


-- ----------------------------------------------------------------------------
-- 4. ENCENDER EL CANDADO
--
-- A partir de acá, estas tablas niegan TODO por defecto.
-- Solo pasa lo que las reglas de abajo permitan explícitamente.
-- ----------------------------------------------------------------------------
alter table public.tenants        enable row level security;
alter table public.tenant_members enable row level security;


-- ----------------------------------------------------------------------------
-- 5. REGLAS DE ACCESO
-- ----------------------------------------------------------------------------

-- TENANTS: solo ves los espacios de los que sos miembro.
create policy "ver mis tenants"
  on public.tenants for select
  to authenticated
  using ( id in (select public.my_tenant_ids()) );

-- TENANTS: solo el dueño puede modificar los datos del espacio.
create policy "editar mis tenants siendo owner"
  on public.tenants for update
  to authenticated
  using (
    exists (
      select 1 from public.tenant_members m
      where m.tenant_id = tenants.id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

-- TENANT_MEMBERS: ves a los miembros de tus propios espacios.
create policy "ver miembros de mis tenants"
  on public.tenant_members for select
  to authenticated
  using ( tenant_id in (select public.my_tenant_ids()) );

-- TENANT_MEMBERS: solo el dueño invita o saca gente de su espacio.
create policy "gestionar miembros siendo owner"
  on public.tenant_members for all
  to authenticated
  using (
    exists (
      select 1 from public.tenant_members m
      where m.tenant_id = tenant_members.tenant_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

-- Nota: no hay política de INSERT sobre tenants. Crear un espacio se hace
-- solo con la función de abajo, para que nunca quede un tenant sin dueño.


-- ----------------------------------------------------------------------------
-- 6. CREAR UN ESPACIO NUEVO
--
-- Crea el tenant y, en la misma operación, deja al usuario como dueño.
-- Si algo falla, no queda nada a medias.
-- ----------------------------------------------------------------------------
create or replace function public.create_tenant(p_name text, p_discipline text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Hay que estar logueado para crear un espacio';
  end if;

  insert into public.tenants (name, discipline)
  values (p_name, p_discipline)
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, auth.uid(), 'owner');

  return v_tenant_id;
end;
$$;

revoke all on function public.create_tenant(text, text) from public;
grant execute on function public.create_tenant(text, text) to authenticated;
