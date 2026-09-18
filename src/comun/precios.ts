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
export const CLASES_POR_ANIO = 52;
export const MESES_POR_ANIO = 12;

// 4,33. No se redondea a 4: redondear es justamente el error que se corrige.
export const CLASES_POR_MES = CLASES_POR_ANIO / MESES_POR_ANIO;

// Cuánto termina saliendo cada clase cuando se paga la cuota. Es el número más
// útil de todos: es el único que se puede comparar con el precio por clase sin
// tener que pensar.
export function porClaseDentroDeLaCuota(precioPorMes: number): number {
  return (precioPorMes * MESES_POR_ANIO) / CLASES_POR_ANIO;
}

export type Comparacion = {
  anualSuelto: number;     // lo que paga en un año viniendo clase por clase
  anualConCuota: number;   // lo que paga en un año con la cuota
  ahorroAnual: number;     // positivo si la cuota conviene
  porcentaje: number;      // el ahorro, en porcentaje del suelto
  porClaseConCuota: number;
  conviene: boolean;
};

// null si falta alguno de los dos precios: sin los dos no hay nada que comparar.
export function compararFormas(
  precioPorClase: number | null,
  precioPorMes: number | null,
): Comparacion | null {
  if (!precioPorClase || !precioPorMes) return null;

  const anualSuelto = precioPorClase * CLASES_POR_ANIO;
  const anualConCuota = precioPorMes * MESES_POR_ANIO;
  const ahorroAnual = anualSuelto - anualConCuota;

  return {
    anualSuelto,
    anualConCuota,
    ahorroAnual,
    porcentaje: Math.round((ahorroAnual / anualSuelto) * 100),
    porClaseConCuota: porClaseDentroDeLaCuota(precioPorMes),
    conviene: ahorroAnual > 0,
  };
}
