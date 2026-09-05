-- ============================================================================
-- SEMILLA — dos transferencias declaradas, para probar la pantalla de
-- "Pagos por confirmar" sin tener todavía el portal del alumno.
--
-- Simula lo que en el producto terminado hace el alumno desde su celular:
-- avisar que transfirió. Acá lo escribimos desde la sesión de Profe 2.
--
-- Se puede correr las veces que haga falta: cada vez deja dos pagos nuevos
-- esperando confirmación.
--
-- No corras esto en aliado-prod.
-- ============================================================================
begin;
  select set_config('request.jwt.claims',
    json_build_object(
      'sub', (select id from auth.users where email = 'profe2@prueba.com'),
      'role','authenticated')::text, true);
  set local role authenticated;

  -- $8.000 para Alumno Portal, que debe $5.000.
  -- Al confirmarlo van a sobrar $3.000: es el "saldo a favor" a la vista.
  insert into public.payments (tenant_id, student_id, amount, status, paid_on, note)
  select s.tenant_id, s.id, 8000, 'declared', current_date, 'Transferencia Mercado Pago'
    from public.students s
    join public.tenants t on t.id = s.tenant_id
   where t.name = 'Escuela de Prueba 2' and s.full_name = 'Alumno Portal';

  -- $6.000 para Alumna de Prueba 2, que debe exactamente $6.000.
  -- Al confirmarlo tiene que quedar en cero, sin sobrante.
  insert into public.payments (tenant_id, student_id, amount, status, paid_on, note)
  select s.tenant_id, s.id, 6000, 'declared', current_date, 'Transferencia banco'
    from public.students s
    join public.tenants t on t.id = s.tenant_id
   where t.name = 'Escuela de Prueba 2' and s.full_name = 'Alumna de Prueba 2';
commit;

select p.amount as monto, s.full_name as alumno, p.status as estado, p.note as nota
  from public.payments p
  join public.students s on s.id = p.student_id
 where p.status = 'declared'
 order by s.full_name;
