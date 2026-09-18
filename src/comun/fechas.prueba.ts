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
  mesEnPalabras, finDelMes, inicioDelMes, mesSiguiente,
} from './fechas';

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

console.log(fallos === 0 ? '\nTodo bien.\n' : `\n${fallos} fallaron.\n`);
process.exit(fallos === 0 ? 0 : 1);
