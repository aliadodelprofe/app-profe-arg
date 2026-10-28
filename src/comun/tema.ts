// ============================================================================
// EL MODO CLARO Y EL OSCURO
//
// Quién elige: la persona. El sistema operativo es solo el valor por omisión
// para quien nunca eligió nada.
//
// Esto vive en su propio archivo, sin React, porque main.tsx lo llama ANTES de
// dibujar la primera pantalla. Si esperara a que un componente se monte, la
// app aparecería un instante en el modo equivocado y después daría un salto
// de color: el parpadeo que delata a una app que no pensó en esto.
// ============================================================================
export type Tema = 'claro' | 'oscuro' | 'sistema';

const LLAVE = 'tema';

export function temaGuardado(): Tema {
  try {
    const v = localStorage.getItem(LLAVE);
    if (v === 'claro' || v === 'oscuro' || v === 'sistema') return v;
  } catch {
    // Navegación privada, almacenamiento bloqueado. No es un error: es que
    // esta persona no tiene preferencia guardada.
  }
  return 'sistema';
}

export function aplicarTema(tema: Tema): void {
  // 'sistema' no escribe el atributo: sin él mandan las reglas de
  // `prefers-color-scheme`, que es exactamente lo que "como el sistema"
  // quiere decir.
  if (tema === 'sistema') delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = tema;

  // Para que el navegador pinte del color correcto lo que no es la página:
  // las barras de scroll, el fondo detrás del rebote en iOS, los controles de
  // un formulario nativo.
  document.documentElement.style.colorScheme =
    tema === 'sistema' ? 'light dark' : tema === 'oscuro' ? 'dark' : 'light';
}

export function guardarTema(tema: Tema): void {
  try {
    localStorage.setItem(LLAVE, tema);
  } catch {
    // Si no se puede guardar, el cambio igual vale para esta sesión.
  }
  aplicarTema(tema);
}
