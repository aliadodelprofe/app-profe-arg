// ============================================================================
// La cuenta que decide si alguien se compromete por mes o viene suelto.
//
// EL NÚMERO QUE IMPORTA NO ES CUATRO.
//
// Un grupo semanal no da 4 clases por mes: da 52 por año, o sea 4,33 por mes.
// La app mostraba la comparación contra 4 clases sueltas, y eso mentía para los
// dos lados:
//
//   - Al profesor le decía que estaba resignando un 10% cuando resignaba 17%.
//     Con su precio puesto sobre un mes de cuatro, en el año regalaba cuatro
//     clases por alumno mensual sin haberlo decidido.
//   - Al alumno le mostraba un descuento más chico que el real.
//
//
// La consecuencia práctica es que el mes de cinco clases deja de ser un
// problema: ya está pago dentro del promedio. La cuota es fija, el profesor se
// come el mes de cinco y gana el de cuatro, y el alumno paga siempre lo mismo.
// Por eso no hay un segundo precio para meses de cinco: sería tapar con un
// parche un precio mal pensado de entrada.
// ============================================================================

// 52 semanas al año. Algunos años tienen 53 de un día determinado, pero esa
// diferencia es menor que el redondeo de cualquier precio.
export const SEMANAS_POR_ANIO = 52;
export const MESES_POR_ANIO = 12;

// Y EL OTRO NÚMERO QUE NO ES UNO: CUÁNTAS VECES AL AÑO SE JUNTAN.
//
// La cuenta de arriba daba por sentado que un grupo se junta una vez por
// semana. Dos cosas la rompen:
//
//   - Desde la 0034 un grupo puede tener dos encuentros semanales —martes y
//     jueves— y ahí todo se duplica: el alumno que viene suelto paga dos veces
//     por semana. Con 52 clavado, la app miraba un martes y jueves a $15.000
//     y le decía al profesor que una cuota de $100.000 "le sale más que venir
//     suelto". Venir suelto le salía $130.000: le estaba diciendo que bajara
//     un precio que ya era barato.
//   - Desde la 0036 un encuentro puede ser dos veces por mes en vez de todas
//     las semanas, y ahí son 24 al año y no 52.
//
// Por eso el número sale del horario y no de una constante.
export function clasesPorAnioDe(horarios: { por_mes: number | null }[]): number {
  if (horarios.length === 0) return SEMANAS_POR_ANIO;
  return horarios.reduce(
    (total, h) => total + (h.por_mes ? h.por_mes * MESES_POR_ANIO : SEMANAS_POR_ANIO),
    0,
  );
}

// Cuánto termina saliendo cada clase cuando se paga la cuota. Es el número más
// útil de todos: es el único que se puede comparar con el precio por clase sin
// tener que pensar.
export function porClaseDentroDeLaCuota(
  precioPorMes: number,
  clasesPorAnio = SEMANAS_POR_ANIO,
): number {
  return (precioPorMes * MESES_POR_ANIO) / Math.max(1, clasesPorAnio);
}

export type Comparacion = {
  anualSuelto: number;      // lo que paga en un año viniendo clase por clase
  anualConCuota: number;    // lo que paga en un año con la cuota
  ahorroAnual: number;      // positivo si la cuota conviene
  porcentaje: number;       // el ahorro, en porcentaje del suelto
  porClaseConCuota: number;
  cuotaSinDescuento: number; // la cuota a la que el descuento es cero: el techo
  conviene: boolean;
};

// null si falta alguno de los dos precios: sin los dos no hay nada que comparar.
//
// `clasesPorAnio` sale de clasesPorAnioDe(grupo.horarios). Por omisión vale 52,
// que es lo que la cuenta suponía antes de que un grupo pudiera tener varios
// días o juntarse cada dos semanas.
export function compararFormas(
  precioPorClase: number | null,
  precioPorMes: number | null,
  clasesAlAnio = SEMANAS_POR_ANIO,
): Comparacion | null {
  if (!precioPorClase || !precioPorMes) return null;

  const porAnio = Math.max(1, clasesAlAnio);
  const anualSuelto = precioPorClase * porAnio;
  const anualConCuota = precioPorMes * MESES_POR_ANIO;
  const ahorroAnual = anualSuelto - anualConCuota;

  return {
    anualSuelto,
    anualConCuota,
    ahorroAnual,
    porcentaje: Math.round((ahorroAnual / anualSuelto) * 100),
    porClaseConCuota: porClaseDentroDeLaCuota(precioPorMes, porAnio),
    // El techo: por encima de esto la cuota sale más que venir suelto. Sirve
    // para decirle al profesor qué número escribir, en vez de solo avisarle
    // que el que puso está mal.
    cuotaSinDescuento: (precioPorClase * porAnio) / MESES_POR_ANIO,
    conviene: ahorroAnual > 0,
  };
}
