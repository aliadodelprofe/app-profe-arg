-- ============================================================================
-- CONTROL GENERAL — ninguna tabla puede quedar abierta
--
-- Correr después de CADA migración. Si alguna tabla dice ABIERTA, hay que
-- ponerle el candado antes de seguir.
-- ============================================================================
select
  c.relname as tabla,
  case when c.relrowsecurity then 'ok' else '>>> ABIERTA <<<' end as candado,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as reglas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relrowsecurity asc, c.relname;
