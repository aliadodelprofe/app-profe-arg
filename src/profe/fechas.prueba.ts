// ============================================================================
// Prueba de las cuentas de fechas.
//
// Correr con:  npm run prueba:fechas
//
// No necesita base de datos ni navegador: fechas.ts no depende de nada.
// ============================================================================
import {
  sumarDias, diaSemana, finDelMesSiguiente, ocurrencias, clasesFaltantes,
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

const MARTES = 2;
const grupo = {
  weekday: MARTES as number | null,
  status: 'active',
  start_date: null as string | null,
  end_date: null as string | null,
};

console.log('\nCuentas básicas');
esperar('1 de septiembre de 2026 es martes', diaSemana('2026-09-01'), 'martes');
esperar('sumar días cruzando el fin de mes', sumarDias('2026-09-29', 7), '2026-10-06');
esperar('sumar días cruzando el año', sumarDias('2026-12-29', 7), '2027-01-05');
esperar('sumar días sobre un cambio de horario', sumarDias('2026-03-28', 7), '2026-04-04');

console.log('\nHasta cuándo se mantienen creadas las clases');
esperar('desde septiembre, hasta fin de octubre', finDelMesSiguiente('2026-09-08'), '2026-10-31');
esperar('desde diciembre, hasta fin de enero del año que viene', finDelMesSiguiente('2026-12-15'), '2027-01-31');
esperar('febrero de un año no bisiesto', finDelMesSiguiente('2027-01-10'), '2027-02-28');

console.log('\nTodos los martes entre dos fechas');
esperar('septiembre 2026 tiene cinco martes',
  ocurrencias(MARTES, '2026-09-01', '2026-09-30'),
  ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29']);
esperar('si la fecha de inicio ya es martes, cuenta',
  ocurrencias(MARTES, '2026-09-08', '2026-09-15'),
  ['2026-09-08', '2026-09-15']);

console.log('\nQué clases faltan crear');
esperar('un grupo nuevo, los martes, desde el 8 de septiembre',
  clasesFaltantes(grupo, [], '2026-09-08'),
  ['2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29',
   '2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27']);

esperar('una clase CANCELADA no se vuelve a crear',
  clasesFaltantes(grupo, ['2026-09-15'], '2026-09-08').includes('2026-09-15'),
  false);

esperar('las que ya existen no se duplican',
  clasesFaltantes(grupo, ['2026-09-08', '2026-09-15', '2026-09-22'], '2026-09-08').length,
  5);

esperar('nunca hacia atrás',
  clasesFaltantes(grupo, [], '2026-09-08').some((f) => f < '2026-09-08'),
  false);

esperar('respeta la fecha de fin del grupo',
  clasesFaltantes({ ...grupo, end_date: '2026-09-30' }, [], '2026-09-08'),
  ['2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29']);

esperar('no empieza antes de que empiece el grupo',
  clasesFaltantes({ ...grupo, start_date: '2026-10-01' }, [], '2026-09-08'),
  ['2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27']);

esperar('un grupo que ya terminó no genera nada',
  clasesFaltantes({ ...grupo, end_date: '2026-08-31' }, [], '2026-09-08'),
  []);

esperar('sin día fijo no se genera nada',
  clasesFaltantes({ ...grupo, weekday: null }, [], '2026-09-08'),
  []);

esperar('un grupo que no está activo no genera nada',
  clasesFaltantes({ ...grupo, status: 'archived' }, [], '2026-09-08'),
  []);

console.log(fallos === 0 ? '\nTodo bien.\n' : `\n${fallos} fallaron.\n`);
process.exit(fallos === 0 ? 0 : 1);
