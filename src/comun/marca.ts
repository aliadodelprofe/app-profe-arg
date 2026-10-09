// ============================================================================
// El nombre del producto, en un archivo propio.
//
// EL NOMBRE ES PROVISORIO. Vive acá, solo, y no adentro de comun/ui.tsx, por
// una razón de arranque: main.tsx es la puerta de las TRES apps y carga la que
// corresponde con un import dinámico, para que entrando por la raíz no se baje
// el código de la app nueva ni al revés. Si main.tsx importara ui.tsx para
// leer el nombre, ese módulo entraría en el arranque de todas.
//
// Un archivo de dos líneas sin React no rompe nada de eso.
// ============================================================================
export const NOMBRE = 'Aria';
