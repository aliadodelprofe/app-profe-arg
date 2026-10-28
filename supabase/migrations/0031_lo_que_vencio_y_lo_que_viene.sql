-- ============================================================================
-- Migración 0031 — Una clase que todavía no pasó no es una deuda
--
-- El alumno abría su app y leía "$45.000, es lo que debés". Adentro: cinco
-- cargos, y dos eran de clases que todavía no habían pasado. La app le estaba
-- cobrando el futuro y asustándolo con un número que no era cierto.
--
-- El error no está en que esos cargos existan: existen a propósito. La regla
-- de asegurar_cargos() es que toda inscripción activa tiene un cargo pendiente
-- por lo que viene, y eso es lo que permite que el alumno sepa cuánto le va a
-- salir antes de que le salga. El error es que el saldo los sumaba como si
-- ya se los hubieran reclamado.
--
-- La diferencia la marca una columna que ya estaba ahí sin usarse para esto:
-- due_date. Un cargo vencido es plata que se debe; uno que vence la semana que
-- viene es plata que se va a deber.
--
-- Esto cambia el número que ven LOS DOS. El alumno deja de ver una deuda
-- inflada, y el profesor deja de ver como deudor a alguien que está al día y
-- tiene la clase del jueves por delante. El segundo cambio es tan importante
-- como el primero: reclamarle a alguien que no debe nada es la forma más
-- rápida de perderlo.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- La vista, rehecha POR CARGO en vez de por totales
--
-- La versión anterior sumaba todos los cargos, sumaba todos los pagos y
-- restaba. Eso servía mientras todos los cargos fueran iguales, pero ahora hay
-- que separarlos por fecha, y para eso hace falta saber cuánto le falta a CADA
-- cargo — no cuánto falta en total.
--
-- Se calcula una vez por cargo cuánto tiene cubierto, y recién después se
-- suman los dos grupos. Es la misma plata contada con más cuidado.
-- ----------------------------------------------------------------------------
create or replace view public.student_account
with (security_invoker = true) as
with gente as (
  select tenant_id, student_id from public.charges  where status = 'active'
  union
  select tenant_id, student_id from public.payments where status = 'confirmed'
),
cargo_a_cargo as (
  select
    c.tenant_id,
    c.student_id,
    c.amount,
    c.due_date,
    coalesce((
      select sum(a.amount) from public.payment_allocations a where a.charge_id = c.id
    ), 0::numeric) as cubierto
  from public.charges c
  where c.status = 'active'
),
cargos as (
  select
    tenant_id,
    student_id,
    sum(amount) as total,
    -- Sin fecha de vencimiento cuenta como vencido: un cargo que nadie fechó
    -- es un cargo que se debe ahora. Dejarlo del otro lado lo escondería.
    coalesce(sum(greatest(amount - cubierto, 0::numeric))
             filter (where due_date is null or due_date <= current_date), 0::numeric) as vencido,
    coalesce(sum(greatest(amount - cubierto, 0::numeric))
             filter (where due_date > current_date), 0::numeric) as por_vencer
  from cargo_a_cargo
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
  coalesce(ca.total, 0::numeric)  as total_cargos,
  coalesce(en.total, 0::numeric)  as total_pagado,

  -- SALDO es ahora lo vencido y nada más. Es el único número que se puede
  -- reclamar sin mentir.
  coalesce(ca.vencido, 0::numeric) as saldo,

  -- Y lo que viene se muestra aparte, que no es lo mismo que esconderlo. El
  -- alumno tiene que poder ver lo que se le viene; lo que no tiene que pasar
  -- es que lo lea como una deuda.
  coalesce(ca.por_vencer, 0::numeric) as por_vencer,

  -- A favor sigue siendo la plata que entró y todavía no se aplicó a ningún
  -- cargo. No cambia: un pago adelantado se imputa igual contra un cargo
  -- futuro, y en ese momento deja de estar a favor y pasa a estar usado.
  greatest(coalesce(en.total, 0::numeric) - coalesce(ca.total, 0::numeric), 0::numeric) as a_favor,

  coalesce(im.total, 0::numeric) as total_imputado
from gente g
left join cargos    ca on ca.tenant_id = g.tenant_id and ca.student_id = g.student_id
left join entregado en on en.tenant_id = g.tenant_id and en.student_id = g.student_id
left join imputado  im on im.tenant_id = g.tenant_id and im.student_id = g.student_id;

comment on view public.student_account is
  'Estado de cuenta por alumno. "saldo" es SOLO lo vencido; lo que todavía no '
  'venció va en "por_vencer". Una clase que no pasó no es una deuda.';
