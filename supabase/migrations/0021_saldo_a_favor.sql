-- ============================================================================
-- Migración 0021 — El saldo a favor deja de ser plata invisible
--
-- EL AGUJERO QUE CIERRA
--
-- `confirmar_pago()` reparte el pago entre los cargos abiertos del alumno y,
-- si sobra plata, lo informa: "quedaron $18.000 a favor, sin cargo al que
-- aplicarse". Hasta hoy eso era todo lo que pasaba con esa plata.
--
-- El motivo es que la vista `student_account` calcula lo pagado sumando
-- IMPUTACIONES, no pagos. Plata confirmada que no se imputó a ningún cargo no
-- baja ningún saldo y no aparece en ninguna pantalla.
--
-- La consecuencia, con un alumno que paga dos meses juntos en octubre:
--   - el 1 de noviembre la tarea nocturna crea la cuota de noviembre
--   - el alumno la ve como deuda, habiendo entregado la plata un mes antes
--   - el profesor lo ve en "Quién me debe"
--   - lo persigue por WhatsApp. Al que ya pagó.
--
-- La tarea programada de la 0019 empeoró esto: antes la cuota aparecía solo
-- cuando el profe abría el grupo, así que el choque era esporádico. Ahora
-- pasa solo, todos los días 1, sin que nadie lo mire.
--
-- SE CIERRA CON TRES PIEZAS
--   1. la vista expone `a_favor`
--   2. `asegurar_imputaciones()` aplica esa plata a los cargos que aparezcan
--   3. la tarea nocturna la llama después de generar los cargos
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. LA VISTA MUESTRA LO QUE HAY A FAVOR
--
-- `total_cargos`, `total_pagado` y `saldo` siguen significando exactamente lo
-- mismo que antes, para no mover el piso de las pantallas que ya los usan. Se
-- agrega `a_favor`: lo confirmado menos lo imputado.
--
-- Hay un cambio de forma necesario. La vista anterior salía de `charges`, así
-- que un alumno que pagó y no tiene ningún cargo no aparecía — y es justo el
-- caso del que pagó por adelantado. Ahora la base de la vista es la unión de
-- quienes tienen cargos y quienes tienen pagos.
--
-- `security_invoker = true` se mantiene, y es lo que importa: la vista no tiene
-- permisos propios, cada uno ve a través de la vista exactamente lo que podría
-- ver consultando las tablas a mano. Por eso agregar `payments` acá no abre
-- nada nuevo: el alumno ya podía leer sus pagos (0005) y el profesor los de
-- sus espacios (0004).
-- ----------------------------------------------------------------------------
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
imputado as (
  select c.tenant_id, c.student_id, sum(a.amount) as total
    from public.charges c
    join public.payment_allocations a on a.charge_id = c.id
   where c.status = 'active'
   group by c.tenant_id, c.student_id
),
cobrado as (
  select tenant_id, student_id, sum(amount) as total
    from public.payments where status = 'confirmed'
   group by tenant_id, student_id
),
usado as (
  select p.tenant_id, p.student_id, sum(a.amount) as total
    from public.payments p
    join public.payment_allocations a on a.payment_id = p.id
   where p.status = 'confirmed'
   group by p.tenant_id, p.student_id
)
select
  g.tenant_id,
  g.student_id,
  coalesce(ca.total, 0::numeric)                               as total_cargos,
  coalesce(im.total, 0::numeric)                               as total_pagado,
  coalesce(ca.total, 0::numeric) - coalesce(im.total, 0::numeric) as saldo,
  coalesce(co.total, 0::numeric) - coalesce(us.total, 0::numeric) as a_favor
from gente g
left join cargos   ca on ca.tenant_id = g.tenant_id and ca.student_id = g.student_id
left join imputado im on im.tenant_id = g.tenant_id and im.student_id = g.student_id
left join cobrado  co on co.tenant_id = g.tenant_id and co.student_id = g.student_id
left join usado    us on us.tenant_id = g.tenant_id and us.student_id = g.student_id;


-- ----------------------------------------------------------------------------
-- 2. LA PLATA A FAVOR SE APLICA A LO QUE VAYA APARECIENDO
--
-- Mismo patrón declarativo que `asegurar_cargos()` y `asegurar_clases()`: en
-- vez de acordarse de hacer algo cuando pasa un evento, se verifica una regla
-- en cada corrida y se arregla lo que falte. La regla acá es:
--
--   "ningún cargo pendiente coexiste con plata sin imputar del mismo alumno"
--
-- Del cargo más viejo al más nuevo, igual que `confirmar_pago()`. Es la
-- convención de cualquier estado de cuenta y la que menos discusiones genera:
-- lo que se paga primero es lo que se debe hace más tiempo.
--
-- SEGURIDAD: es "security invoker", como las otras dos. Llamada por el profesor
-- desde la app, RLS la limita a sus espacios sin que la función verifique nada.
-- Llamada por la tarea nocturna, quien llama es `postgres` y alcanza a todos.
-- Un alumno logueado puede llamarla, pero no puede escribir en
-- `payment_allocations` —esa tabla es de solo lectura para él (0005)—, así que
-- el `insert` se lo rechaza la base y la función no hace nada.
-- ----------------------------------------------------------------------------
create or replace function public.asegurar_imputaciones(p_tenant_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_pago    record;
  v_cargo   record;
  v_libre   numeric;
  v_pend    numeric;
  v_monto   numeric;
  v_creadas int := 0;
begin
  -- Sin este candado, dos corridas simultáneas sobre el mismo espacio podrían
  -- imputar la misma plata dos veces: las dos leen antes de que la otra
  -- escriba. Se suelta solo al cerrar la transacción.
  perform pg_advisory_xact_lock(hashtext(p_tenant_id::text));

  for v_pago in
    select p.id, p.student_id, p.tenant_id,
           p.amount - coalesce((
             select sum(a.amount) from public.payment_allocations a
              where a.payment_id = p.id
           ), 0) as libre
      from public.payments p
     where p.tenant_id = p_tenant_id
       and p.status = 'confirmed'
     order by p.confirmed_at
  loop
    v_libre := v_pago.libre;
    continue when v_libre <= 0;

    for v_cargo in
      select c.id, c.amount,
             coalesce((
               select sum(a.amount) from public.payment_allocations a
                where a.charge_id = c.id
             ), 0) as cubierto
        from public.charges c
       where c.student_id = v_pago.student_id
         and c.status = 'active'
       order by c.due_date nulls last, c.created_at
    loop
      exit when v_libre <= 0;

      v_pend := v_cargo.amount - v_cargo.cubierto;
      if v_pend > 0 then
        v_monto := least(v_pend, v_libre);

        insert into public.payment_allocations (tenant_id, payment_id, charge_id, amount)
        values (v_pago.tenant_id, v_pago.id, v_cargo.id, v_monto);

        v_libre   := v_libre - v_monto;
        v_creadas := v_creadas + 1;
      end if;
    end loop;
  end loop;

  return v_creadas;
end;
$$;

revoke all on function public.asegurar_imputaciones(uuid) from public;
grant execute on function public.asegurar_imputaciones(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. LA TAREA NOCTURNA LA LLAMA, Y DESPUÉS DE LOS CARGOS
--
-- El orden importa: primero las clases, después los cargos, al final las
-- imputaciones. La plata a favor se aplica a los cargos que acaban de nacer,
-- así que esos cargos tienen que existir antes.
--
-- Las imputaciones van por ESPACIO y no por grupo, porque la plata a favor es
-- del alumno y puede cubrir un cargo de cualquier grupo en el que esté anotado.
-- ----------------------------------------------------------------------------
alter table public.mantenimiento_log
  add column if not exists imputaciones int not null default 0;

create or replace function public.mantenimiento_diario()
returns void
language plpgsql
set search_path = public
as $$
declare
  v_grupo    record;
  v_espacio  record;
  v_grupos   int := 0;
  v_clases   int := 0;
  v_cargos   int := 0;
  v_imput    int := 0;
  v_errores  int := 0;
  v_detalle  text := '';
begin
  for v_grupo in
    select g.id, g.name from public.groups g where g.status = 'active'
  loop
    v_grupos := v_grupos + 1;
    begin
      v_clases := v_clases + (select count(*) from public.asegurar_clases(v_grupo.id));
      v_cargos := v_cargos + public.asegurar_cargos(v_grupo.id);
    exception when others then
      v_errores := v_errores + 1;
      v_detalle := v_detalle || v_grupo.name || ': ' || sqlerrm || ' | ';
    end;
  end loop;

  -- Recién ahora, con los cargos del mes ya creados, se aplica lo que haya
  -- a favor. Si esto corriera antes, la plata quedaría otra vez esperando.
  for v_espacio in select t.id, t.name from public.tenants t
  loop
    begin
      v_imput := v_imput + public.asegurar_imputaciones(v_espacio.id);
    exception when others then
      v_errores := v_errores + 1;
      v_detalle := v_detalle || v_espacio.name || ' (imputaciones): ' || sqlerrm || ' | ';
    end;
  end loop;

  insert into public.mantenimiento_log
    (grupos, clases, cargos, imputaciones, errores, detalle)
  values
    (v_grupos, v_clases, v_cargos, v_imput, v_errores, nullif(left(v_detalle, 2000), ''));
end;
$$;

revoke all on function public.mantenimiento_diario() from public;
-- Sin `grant`: sigue siendo solo para el programador de tareas.
