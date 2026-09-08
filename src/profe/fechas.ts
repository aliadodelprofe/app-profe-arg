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

// El último día del mes que viene: hasta ahí se mantienen creadas las clases.
export function finDelMesSiguiente(iso: string): string {
  const [a, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m + 1, 0)).toISOString().slice(0, 10);
}

// Todas las veces que cae ese día de la semana entre dos fechas, inclusive.
export function ocurrencias(weekday: number, desde: string, hasta: string): string[] {
  const salto = (weekday - aFecha(desde).getUTCDay() + 7) % 7;
  const salida: string[] = [];
  let f = sumarDias(desde, salto);
  while (f <= hasta) {
    salida.push(f);
    f = sumarDias(f, 7);
  }
  return salida;
}

export function fechasSemanales(desde: string, cuantas: number): string[] {
  return Array.from({ length: cuantas }, (_, i) => sumarDias(desde, i * 7));
}

// ----------------------------------------------------------------------------
// Qué clases faltan crear para un grupo con horario fijo.
//
//   - Nunca hacia atrás: solo de hoy en adelante.
//   - Nunca una fecha que ya tiene clase, AUNQUE ESTÉ CANCELADA. Si el profe
//     canceló el 25 por feriado, esa fila existe y se saltea. Sin esto,
//     cancelar sería inútil: la clase volvería sola.
//   - Nunca fuera de los límites del grupo, ni antes de su inicio ni después
//     de su fin.
//   - Nada si el grupo no tiene día fijo o no está activo.
// ----------------------------------------------------------------------------
export type GrupoConHorario = {
  weekday: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

export function clasesFaltantes(
  grupo: GrupoConHorario,
  yaCargadas: string[],
  hoy: string,
): string[] {
  if (grupo.weekday === null || grupo.status !== 'active') return [];

  const desde = grupo.start_date && grupo.start_date > hoy ? grupo.start_date : hoy;
  let hasta = finDelMesSiguiente(hoy);
  if (grupo.end_date && grupo.end_date < hasta) hasta = grupo.end_date;
  if (desde > hasta) return [];

  return ocurrencias(grupo.weekday, desde, hasta).filter((f) => !yaCargadas.includes(f));
}
