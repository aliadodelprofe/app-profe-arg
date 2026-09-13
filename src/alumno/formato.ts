// Piezas de formato del lado del alumno. El link al mapa se arma con la
// dirección, igual que en la app del profesor: un link pegado se rompe, una
// dirección escrita sirve para siempre.
export { fecha, plata, hoyISO } from '../comun/fechas';

export function linkMapaDe(direccion: string): string {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(direccion);
}
