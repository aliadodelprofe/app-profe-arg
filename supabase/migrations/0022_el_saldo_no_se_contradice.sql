-- ============================================================================
-- Migración 0022 — Deber y tener a favor dejan de poder pasar a la vez
--
-- LO QUE SE ROMPIÓ EN LA 0021
--
-- La 0021 definió `a_favor` como "lo confirmado menos lo imputado", y dejó
-- `saldo` como "los cargos menos lo imputado". Con esas dos definiciones, un
-- alumno con un cargo de $10.000 sin cubrir y $25.000 sin imputar aparece
-- debiendo $10.000 Y teniendo $25.000 a favor. Las dos cifras son correctas
-- según su definición y juntas no tienen sentido.
--
-- En pantalla es peor que un número raro: el alumno figura en "Quién me debe"
-- y en "Pagaron por adelantado" al mismo tiempo, y él ve "debés $10.000"
-- teniendo plata del profesor de sobra.
--
-- POR QUÉ NO ALCANZABA CON "IMPUTAR SIEMPRE DESPUÉS"
--
-- La 0021 dejaba la corrección dependiendo de que todo el que cree un cargo se
-- acuerde de imputar a continuación. La tarea nocturna lo hace y la pantalla
-- del grupo también, pero el alta manual de un cargo no: entre que el profesor
-- crea el cargo y la próxima corrida pasan horas, y en esas horas el alumno
-- puede abrir la app.
--
-- Un invariante sostenido por convención se rompe el día que alguien agrega
-- una cuarta manera de crear un cargo. Así que se sostiene por construcción.
--
-- CÓMO QUEDA
--
--   total_pagado    lo que el alumno ENTREGÓ (pagos confirmados)
--   saldo           cargos − entregado, nunca negativo: lo que debe
--   a_favor         entregado − cargos, nunca negativo: lo que tiene
--   total_imputado  (nuevo) lo repartido entre cargos concretos
--
-- Exactamente uno de `saldo` y `a_favor` puede ser distinto de cero. Y no
-- depende de que nadie haya corrido nada.
--
-- `asegurar_imputaciones()` no sobra: sigue siendo la que hace que cada cuota
-- aparezca como "Pagada" en la lista del alumno. Lo que deja de ser es la
-- condición para que el saldo esté bien.
-- ============================================================================

create or replace view public.student_account
with (security_invoker = true) as
with gente as (
  select tenant_id, student_id from public.charges  where status = 'active'
  union
  select tenant_id, student_id from public.payments where status = 'confirmed'
),
cargos as (
  select tenant_id, student_id, sum(amount) as total
    from public.charges where status = 'active'
   group by tenant_id, student_id
),
entregado as (
  select tenant_id, student_id, sum(amount) as total
    from public.payments where status = 'confirmed'
   group by tenant_id, student_id
),
imputado as (
  select c.tenant_id, c.student_id, sum(a.amount) as total
    from public.charges c
    join public.payment_allocations a on a.charge_id = c.id
   where c.status = 'active'
   group by c.tenant_id, c.student_id
)
select
  g.tenant_id,
  g.student_id,
  coalesce(ca.total, 0::numeric) as total_cargos,
  coalesce(en.total, 0::numeric) as total_pagado,
  -- Las dos caras de la misma resta, cada una recortada en cero. Por eso no
  -- pueden contradecirse: si una es positiva, la otra es exactamente cero.
  greatest(coalesce(ca.total, 0::numeric) - coalesce(en.total, 0::numeric), 0::numeric) as saldo,
  greatest(coalesce(en.total, 0::numeric) - coalesce(ca.total, 0::numeric), 0::numeric) as a_favor,
  coalesce(im.total, 0::numeric) as total_imputado
from gente g
left join cargos    ca on ca.tenant_id = g.tenant_id and ca.student_id = g.student_id
left join entregado en on en.tenant_id = g.tenant_id and en.student_id = g.student_id
left join imputado  im on im.tenant_id = g.tenant_id and im.student_id = g.student_id;
