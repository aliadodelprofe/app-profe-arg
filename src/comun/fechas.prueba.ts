// ============================================================================
// Prueba de las cuentas de fechas que quedaron en TypeScript.
//
// Correr con:  npm run prueba:fechas
//
// No necesita base de datos ni navegador: fechas.ts no depende de nada.
//
// Ojo: la regla de qué clases faltan crear ya NO se prueba acá. Se mudó a la
// base en la migración 0018 y su prueba es supabase/tests/clases_automaticas.sql.
// ============================================================================
import {
  sumarDias, diaSemana, mesDe, fechasSemanales,
  mesEnPalabras, finDelMes, inicioDelMes, mesSiguiente, duracionEnPalabras,
} from './fechas';
import { compararFormas, porClaseDentroDeLaCuota, clasesPorAnioDe } from './precios';
import { idUnico } from './id';

let fallos = 0;

function esperar(nombre: string, obtenido: unknown, esperado: unknown) {
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  if (a === b) {
    console.log(`  PASA  ${nombre}`);
  } else {
    fallos++;
    console.log(`  FALLA ${nombre}\n        esperaba ${b}\n        obtuvo   ${a}`);
  }
}

console.log('\nCuentas básicas');
esperar('1 de septiembre de 2026 es martes', diaSemana('2026-09-01'), 'martes');
esperar('sumar días cruzando el fin de mes', sumarDias('2026-09-29', 7), '2026-10-06');
esperar('sumar días cruzando el año', sumarDias('2026-12-29', 7), '2027-01-05');
esperar('sumar días sobre un cambio de horario', sumarDias('2026-03-28', 7), '2026-04-04');
esperar('el mes al que pertenece una fecha', mesDe('2026-09-30'), '2026-09');

console.log('\nClases sueltas cargadas a mano, una por semana');
esperar('cuatro martes seguidos',
  fechasSemanales('2026-09-08', 4),
  ['2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29']);
esperar('cruzando el fin de mes',
  fechasSemanales('2026-09-29', 2),
  ['2026-09-29', '2026-10-06']);

console.log('\nEl mes de una cuota');
esperar('en palabras', mesEnPalabras('2026-09'), 'septiembre 2026');
esperar('la cuota vence el 1, no al terminar el mes', inicioDelMes('2026-09'), '2026-09-01');
esperar('último día de un mes de 30', finDelMes('2026-09'), '2026-09-30');
esperar('último día de diciembre', finDelMes('2026-12'), '2026-12-31');
esperar('febrero de un año no bisiesto', finDelMes('2027-02'), '2027-02-28');
esperar('febrero de un año bisiesto', finDelMes('2028-02'), '2028-02-29');
esperar('el mes siguiente', mesSiguiente('2026-09'), '2026-10');
esperar('el mes siguiente cruzando el año', mesSiguiente('2026-12'), '2027-01');

console.log('\nLa cuenta de por clase contra por mes');
// Los números de prueba: $5.000 la clase, $18.000 la cuota.
esperar('cada clase dentro de la cuota, sobre 52 al año',
  Math.round(porClaseDentroDeLaCuota(18000)), 4154);
esperar('el ahorro anual real, no el de un mes de cuatro',
  compararFormas(5000, 18000)?.ahorroAnual, 44000);
esperar('y en porcentaje es 17, no 10',
  compararFormas(5000, 18000)?.porcentaje, 17);
esperar('una cuota que no conviene se marca como tal',
  compararFormas(5000, 25000)?.conviene, false);
esperar('sin uno de los dos precios no hay comparación',
  compararFormas(5000, null), null);
esperar('el techo: la cuota a la que el descuento es cero',
  Math.round(compararFormas(5000, 18000)!.cuotaSinDescuento), 21667);

console.log('\nCuantas clases hay en un anio');
const semanal = [{ por_mes: null }];
const martesYJueves = [{ por_mes: null }, { por_mes: null }];
esperar('un dia todas las semanas', clasesPorAnioDe(semanal), 52);
esperar('dos dias todas las semanas', clasesPorAnioDe(martesYJueves), 104);
esperar('un dia, dos veces por mes', clasesPorAnioDe([{ por_mes: 2 }]), 24);
esperar('un dia, una vez por mes', clasesPorAnioDe([{ por_mes: 1 }]), 12);
esperar('mezclado: martes semanal y jueves quincenal',
  clasesPorAnioDe([{ por_mes: null }, { por_mes: 2 }]), 76);
esperar('sin horario fijo se supone semanal', clasesPorAnioDe([]), 52);

console.log('\nUn grupo que se junta dos veces por semana');
// El caso real que destapo el error: martes y jueves, $15.000 la clase.
// Suelto son $30.000 por semana, no $15.000, asi que el techo se duplica.
const dosPorSemana = clasesPorAnioDe(martesYJueves);
esperar('el techo con dos encuentros',
  Math.round(compararFormas(15000, 100000, dosPorSemana)!.cuotaSinDescuento), 130000);
esperar('y una cuota de 100.000 SI conviene',
  compararFormas(15000, 100000, dosPorSemana)?.conviene, true);
esperar('la misma cuota con un solo encuentro NO conviene',
  compararFormas(15000, 100000, clasesPorAnioDe(semanal))?.conviene, false);
esperar('cada clase dentro de la cuota, yendo dos veces',
  Math.round(porClaseDentroDeLaCuota(100000, dosPorSemana)), 11538);
esperar('sin decir cuantas, se suponen 52',
  compararFormas(15000, 100000)?.cuotaSinDescuento,
  compararFormas(15000, 100000, 52)?.cuotaSinDescuento);
esperar('cero clases no divide por cero',
  Number.isFinite(compararFormas(15000, 100000, 0)!.porClaseConCuota), true);

console.log('\nY uno que se junta dos veces por mes');
// Dos clases por mes a $15.000 son $30.000 por mes viniendo suelto. Una cuota
// de $100.000 ahi es un disparate, y la app tiene que decirlo.
const quincenal = clasesPorAnioDe([{ por_mes: 2 }]);
esperar('el techo baja a 30.000',
  Math.round(compararFormas(15000, 100000, quincenal)!.cuotaSinDescuento), 30000);
esperar('100.000 por dos clases al mes NO conviene',
  compararFormas(15000, 100000, quincenal)?.conviene, false);
esperar('25.000 por dos clases al mes SI conviene',
  compararFormas(15000, 25000, quincenal)?.conviene, true);

console.log('\nLa duracion dicha como se dice');
esperar('media hora', duracionEnPalabras(30), '30 minutos');
esperar('una clase de 45', duracionEnPalabras(45), '45 minutos');
esperar('la hora redonda', duracionEnPalabras(60), '1 hora');
esperar('hora y cuarto', duracionEnPalabras(75), '1 hora y 15 minutos');
esperar('hora y media, que es lo mas comun', duracionEnPalabras(90), '1 hora y media');
esperar('dos horas', duracionEnPalabras(120), '2 horas');
esperar('dos y media', duracionEnPalabras(150), '2 horas y media');
esperar('el singular del minuto suelto', duracionEnPalabras(61), '1 hora y 1 minuto');
esperar('vacio no dice nada', duracionEnPalabras(null), null);
esperar('cero tampoco', duracionEnPalabras(0), null);
esperar('ni la basura', duracionEnPalabras(Number('abc')), null);

console.log('\nEl nombre unico de los archivos que se suben');
// Lo que se verifica no es el azar —eso lo pone el navegador— sino que el
// formato sea el de siempre y que dos no choquen. Un comprobante pisado es
// la prueba de un pago que desaparece.
const FORMA = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
esperar('tiene la forma de un uuid v4', FORMA.test(idUnico()), true);
const muchos = new Set(Array.from({ length: 5000 }, () => idUnico()));
esperar('cinco mil seguidos y ninguno se repite', muchos.size, 5000);
esperar('todos con la misma forma',
  [...muchos].every((x) => FORMA.test(x)), true);

console.log(fallos === 0 ? '\nTodo bien.\n' : `\n${fallos} fallaron.\n`);
process.exit(fallos === 0 ? 0 : 1);
