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

// 'octubre' si es de este año, 'octubre 2025' si no. El año solo aparece
// cuando agrega algo: en una lista de clases del año en curso, repetir 2026
// doce veces no informa nada.
export function mesDeCorte(period: string, hoy: string): string {
  const [a, m] = period.split('-').map(Number);
  return a === Number(hoy.slice(0, 4)) ? NOMBRE_MES[m - 1] : `${NOMBRE_MES[m - 1]} ${a}`;
}

// Parte una lista YA ORDENADA en tramos por mes, respetando ese orden. No
// ordena ni agrupa por su cuenta: si la lista viene de la más nueva a la más
// vieja, los tramos salen igual. Agrupar y reordenar al mismo tiempo es cómo
// una lista termina mostrando noviembre arriba de diciembre.
export function porMes<T>(items: T[], fechaDe: (x: T) => string): { mes: string; items: T[] }[] {
  const tramos: { mes: string; items: T[] }[] = [];
  for (const x of items) {
    const mes = mesDe(fechaDe(x));
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && ultimo.mes === mes) ultimo.items.push(x);
    else tramos.push({ mes, items: [x] });
  }
  return tramos;
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

// Acepta undefined además de null, y no porque dé lo mismo: un dato que falta
// es un dato que falta y se muestra como raya. Lo que no puede pasar es que
// una columna que no vino en una consulta tire abajo la pantalla entera, que
// es exactamente lo que pasaba cuando acá entraba un undefined.
export function plata(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return '$' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

// La duración se guarda en minutos porque es lo que necesita el cálculo, pero
// nadie piensa una clase en minutos: piensa "hora y media". Esto traduce el
// número a como se dice, para mostrarlo debajo del campo mientras se escribe.
// Devuelve null cuando no hay nada que traducir —vacío, cero, basura— y ahí
// la pantalla muestra su ayuda de siempre.
export function duracionEnPalabras(min: number | null | undefined): string | null {
  if (min === null || min === undefined || Number.isNaN(min) || min <= 0) return null;
  const horas = Math.floor(min / 60);
  const resto = min % 60;
  const minutos = (n: number) => `${n} ${n === 1 ? 'minuto' : 'minutos'}`;
  if (horas === 0) return minutos(resto);
  const h = horas === 1 ? '1 hora' : `${horas} horas`;
  if (resto === 0) return h;
  if (resto === 30) return `${h} y media`;
  return `${h} y ${minutos(resto)}`;
}
