-- ============================================================================
-- Migración 0006 — Confirmar un pago
--
-- El momento clave de la conciliación: el alumno declaró una transferencia y
-- el profesor la da por buena.
--
-- Confirmar son DOS cosas, no una:
--   1. marcar el pago como confirmado
--   2. repartir esa plata entre los cargos que el alumno tiene abiertos
--
-- La segunda es la que hace bajar la deuda. La vista student_account no mira
-- el estado del pago: suma las imputaciones. Un pago confirmado y sin imputar
-- deja al alumno debiendo lo mismo que antes.
--
-- Va como función de la base y no como código de la pantalla porque son
-- varios pasos sobre plata. Si el navegador se corta en el medio, quedaría un
-- pago confirmado a medio imputar. Acá es todo o nada: si algo falla, no pasó
-- nada.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Reparte el pago entre los cargos abiertos del alumno, del más viejo al más
-- nuevo, hasta que se acaba la plata.
--
-- Ese orden —el más viejo primero— es la convención de cualquier estado de
-- cuenta y es la que menos discusiones genera: lo que se paga primero es lo
-- que se debe hace más tiempo.
--
-- Devuelve dos números: cuánto se imputó y cuánto sobró.
--
-- Que sobre no es un error: es el alumno que pagó de más, o por adelantado.
-- Hoy esa plata queda registrada en el pago pero sin cargo al que agarrarse,
-- y por eso no baja ningún saldo. Es el agujero del modelo que quedó anotado
-- en docs/ESTADO.md como "saldo a favor". La función lo informa en vez de
-- taparlo, para que la pantalla te lo pueda decir.
--
-- La función NO es "security definer": corre con los permisos de quien la
-- llama. O sea que el candado sigue puesto — un profesor no puede confirmar
-- un pago de otro, porque directamente no lo ve.
-- ----------------------------------------------------------------------------
create or replace function public.confirmar_pago(p_pago_id uuid)
returns table (imputado numeric, sin_imputar numeric)
language plpgsql
set search_path = public
as $$
declare
  v_pago      public.payments;
  v_restante  numeric;
  v_cargo     record;
  v_pendiente numeric;
  v_monto     numeric;
begin
  select * into v_pago from public.payments where id = p_pago_id;

  if v_pago.id is null then
    raise exception 'Ese pago no existe, o no pertenece a un espacio tuyo';
  end if;

  if v_pago.status = 'confirmed' then
    raise exception 'Ese pago ya estaba confirmado';
  end if;

  update public.payments
     set status       = 'confirmed',
         confirmed_by = auth.uid(),
         confirmed_at = now()
   where id = p_pago_id;

  v_restante := v_pago.amount;

  for v_cargo in
    select c.id,
           c.amount,
           coalesce((select sum(a.amount)
                       from public.payment_allocations a
                      where a.charge_id = c.id), 0) as ya_cubierto
      from public.charges c
     where c.student_id = v_pago.student_id
       and c.status = 'active'
     order by c.due_date nulls last, c.created_at
  loop
    exit when v_restante <= 0;

    v_pendiente := v_cargo.amount - v_cargo.ya_cubierto;

    if v_pendiente > 0 then
      v_monto := least(v_pendiente, v_restante);

      insert into public.payment_allocations (tenant_id, payment_id, charge_id, amount)
      values (v_pago.tenant_id, p_pago_id, v_cargo.id, v_monto);

      v_restante := v_restante - v_monto;
    end if;
  end loop;

  return query select v_pago.amount - v_restante, v_restante;
end;
$$;

revoke all on function public.confirmar_pago(uuid) from public;
grant execute on function public.confirmar_pago(uuid) to authenticated;
