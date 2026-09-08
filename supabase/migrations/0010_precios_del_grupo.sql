-- ============================================================================
-- Migración 0010 — Los precios viven en el grupo
--
-- CORRECCIÓN DE MODELO. Hasta acá el precio estaba en la inscripción
-- (enrollments.agreed_price), o sea uno por alumno. Está mal: el precio es de
-- la clase, no de la persona.
--
-- Lo que cambia por alumno es CÓMO PAGA —por clase, o el mes con descuento—,
-- y eso ya vive en enrollments.billing_mode, que está bien donde está. Lo que
-- no cambia por alumno es cuánto sale cada una de esas opciones.
--
-- Dicho de otra forma: dos alumnos del mismo grupo pueden pagar montos
-- distintos, pero no porque se les haya negociado distinto, sino porque uno
-- eligió por clase y el otro el mes.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Un precio por cada forma de pago. Los tres nombres se corresponden uno a uno
-- con los tres valores de enrollments.billing_mode, así no hay que interpretar
-- nada en el medio:
--
--   per_session -> price_per_session   lo que sale venir a una clase
--   per_period  -> price_per_period    la cuota del mes, con su descuento ya
--                                      aplicado: es un precio, no un cálculo
--   one_time    -> price_one_time      el pago único de un workshop
--
-- El descuento del mes se guarda ya hecho, como precio final, y no como un
-- porcentaje sobre el precio por clase. Un porcentaje obliga a decidir sobre
-- cuántas clases se aplica —¿4 o 5 en el mes que tiene 5?— y ese cálculo
-- terminaría discutiéndose con cada alumno. Un número cerrado no se discute.
-- ----------------------------------------------------------------------------
alter table public.groups add column price_per_session numeric(12,2);
alter table public.groups add column price_per_period  numeric(12,2);
alter table public.groups add column price_one_time    numeric(12,2);


-- ----------------------------------------------------------------------------
-- enrollments.agreed_price NO se borra, pero cambia de significado.
--
-- Deja de ser "el precio de este alumno" y pasa a ser una excepción: vacío
-- —que va a ser lo normal— significa "paga el precio del grupo según cómo
-- eligió pagar". Con un número adentro significa que a esta persona en
-- particular se le acordó otra cosa.
--
-- La app NO lo va a pedir. Queda como puerta de salida para el día que haga
-- falta —una beca, un canje, el que ayuda a acomodar la sala— sin tener que
-- tocar el esquema a las apuradas. Si con el tiempo nunca se usa, se borra.
-- ----------------------------------------------------------------------------
comment on column public.enrollments.agreed_price is
  'Excepción. Vacío = paga el precio del grupo según su billing_mode.';
