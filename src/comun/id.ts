// ============================================================================
// UN NOMBRE DE ARCHIVO QUE NO SE REPITA
//
// Cada imagen que se sube —un logo, una foto de perfil, el comprobante de una
// transferencia— necesita un nombre propio. Si dos se llamaran igual, la
// segunda pisaría a la primera, y en el caso del comprobante eso es borrar la
// prueba de que alguien pagó.
//
// POR QUÉ NO ALCANZA CON crypto.randomUUID().
//
// Es la función obvia y funciona en producción, pero el navegador la esconde
// cuando la página NO viene por https: en un "contexto no seguro" simplemente
// no existe, y la app se rompe con "crypto.randomUUID is not a function".
//
// Eso pasa justo en el caso en que más molesta: probando la app desde el
// celular, entrando por la IP de la computadora. Ahí no hay https, el alumno
// de prueba toca "Avisar que transferí" y la app se cae sin explicar nada.
//
// crypto.getRandomValues, en cambio, SÍ está disponible sin https, y es el
// mismo generador. Así que lo que falta no es azar: es armar el formato a
// mano. Y si ni eso existiera —un navegador muy viejo— queda Math.random, que
// no sirve para criptografía pero acá no hace falta: lo único que se le pide
// a este nombre es no chocar con otro.
// ============================================================================

function azar(bytes: Uint8Array): Uint8Array {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

// Un UUID v4, con el mismo formato que devuelve crypto.randomUUID.
export function idUnico(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();

  const b = azar(new Uint8Array(16));
  // Los dos retoques que distinguen a un UUID versión 4: el cuarto grupo
  // empieza con 4, y el quinto con 8, 9, a o b.
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;

  const hex = Array.from(b, (n) => n.toString(16).padStart(2, '0')).join('');
  return (
    hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-'
    + hex.slice(16, 20) + '-' + hex.slice(20)
  );
}
