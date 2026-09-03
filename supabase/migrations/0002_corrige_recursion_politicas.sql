-- ============================================================================
-- Migración 0002 — Corrige recursión infinita en las políticas
--
-- PROBLEMA: en la 0001 quedaron dos políticas que consultaban la tabla
-- tenant_members directamente. Al leer tenant_members, Postgres evalúa su
-- política; esa política consulta tenant_members; que vuelve a evaluar la
-- política... y así al infinito.
--
-- SOLUCIÓN: mover esa consulta adentro de una función "security definer",
-- que se ejecuta con permisos elevados y por lo tanto no dispara las
-- políticas de nuevo. Es el mismo truco que ya usaba my_tenant_ids().
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Nueva función: los espacios donde soy DUEÑO (no solo miembro)
-- ----------------------------------------------------------------------------
create or replace function public.my_owned_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.tenant_members
  where user_id = auth.uid()
    and role = 'owner'
$$;

revoke all on function public.my_owned_tenant_ids() from public;
grant execute on function public.my_owned_tenant_ids() to authenticated;


-- ----------------------------------------------------------------------------
-- 2. Reemplazar las dos políticas que causaban la recursión
-- ----------------------------------------------------------------------------
drop policy if exists "gestionar miembros siendo owner" on public.tenant_members;
drop policy if exists "editar mis tenants siendo owner" on public.tenants;

-- Solo el dueño edita los datos de su espacio.
create policy "editar mis tenants siendo owner"
  on public.tenants for update
  to authenticated
  using      ( id in (select public.my_owned_tenant_ids()) )
  with check ( id in (select public.my_owned_tenant_ids()) );

-- Solo el dueño invita o saca gente de su espacio.
create policy "gestionar miembros siendo owner"
  on public.tenant_members for all
  to authenticated
  using      ( tenant_id in (select public.my_owned_tenant_ids()) )
  with check ( tenant_id in (select public.my_owned_tenant_ids()) );
