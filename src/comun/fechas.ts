// ============================================================================
// Cuentas de fechas — sin nada de Supabase adentro, a propósito.
//
// Es la lógica más fácil de arruinar de todo el proyecto y la que menos se
// nota cuando falla: una clase que aparece un día corrido no rompe nada, solo
// deja a un alumno parado en la puerta. Vive separada para poder probarla
// sola, sin base de datos ni navegador.
//
// Todas las cuentas van en UTC. Sumar días en hora local corre una fecha
// cuando cambia el horario de verano, y aparece una clase el lunes que tenía
// que ser martes.
// ============================================================================
export const NOMBRE_DIA = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
];

function aFecha(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

export function sumarDias(iso: string, dias: number): string {
  const f = aFecha(iso);
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
}

export function diaSemana(iso: string): string {
  return NOMBRE_DIA[aFecha(iso).getUTCDay()];
}

export function mesDe(iso: string): string {
  return iso.slice(0, 7);
}

// El día de hoy según el reloj del profesor, no según UTC: si son las 22 en
// Buenos Aires, hoy es hoy y no mañana.
export function hoyISO(): string {
  const f = new Date();
  const mm = String(f.getMonth() + 1).padStart(2, '0');
  const dd = String(f.getDate()).padStart(2, '0');
  return `${f.getFullYear()}-${mm}-${dd}`;
}

export function fechasSemanales(desde: string, cuantas: number): string[] {
  return Array.from({ length: cuantas }, (_, i) => sumarDias(desde, i * 7));
}

// ----------------------------------------------------------------------------
// Acá vivían finDelMesSiguiente, ocurrencias y clasesFaltantes: la regla de qué
// clases faltan crear en un grupo con horario fijo.
//
// Se mudaron a la base en la migración 0018, a la función asegurar_clases().
// El motivo: esa regla ahora también la corre una tarea programada, sin
// navegador, y una regla que se ejecuta desde dos lados tiene que vivir en un
// solo lado. Si estuviera en los dos, el día que cambiemos una y nos olvidemos
// de la otra, la app y la tarea van a crear clases distintas sin avisar.
//
// Se prueba en supabase/tests/clases_automaticas.sql.
// ----------------------------------------------------------------------------

export const NOMBRE_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// '2026-09' -> 'septiembre 2026'
export function mesEnPalabras(period: string): string {
  const [a, m] = period.split('-').map(Number);
  return `${NOMBRE_MES[m - 1]} ${a}`;
}

// El último día de ese mes, que es el vencimiento natural de una cuota.
export function finDelMes(period: string): string {
  const [a, m] = period.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

// El primer día de ese mes. Es el vencimiento de una cuota mensual: se cobra
// al empezar el mes, no al terminarlo. Si venciera al final, el alumno cursa
// las cuatro clases y recién ahí se ve que no pagó — y para entonces ya cursó.
export function inicioDelMes(period: string): string {
  return `${period}-01`;
}

// '2026-09' -> '2026-10'
export function mesSiguiente(period: string): string {
  const [a, m] = period.split('-').map(Number);
  return new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 7);
}

// ---------------------------------------------------------------------------
// Formato para mostrar. Viven acá porque las usan las dos apps, la del
// profesor y la del alumno.
// ---------------------------------------------------------------------------
export function fecha(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function plata(n: number | null): string {
  if (n === null) return '—';
  return '$' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}
