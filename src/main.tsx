import { StrictMode } from 'react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Limite } from './comun/Limite';
import './index.css';
import { NOMBRE } from './comun/marca';
import { aplicarTema, temaGuardado } from './comun/tema';

const root = createRoot(document.getElementById('root')!);

// Cada app con su red de contención. Compartirlas era un error silencioso: la
// app nueva mostraba el logo y el título de la app de la comunidad al
// romperse, y su botón de "limpiar datos" borra el almacenamiento de ESA app.
function montar(Componente: ComponentType, nueva: boolean) {
  const Red = nueva ? Limite : ErrorBoundary;
  root.render(
    <StrictMode>
      <Red>
        <Componente />
      </Red>
    </StrictMode>,
  );
}

// Tres apps conviviendo en el mismo proyecto:
//   /profe...   → la app del profesor, contra Supabase
//   /alumno...  → el portal del alumno, contra Supabase
//   cualquier otra dirección → la app de la comunidad, contra Firebase
//
// La carga es dinámica a propósito: entrando por /profe o /alumno el código de
// Firebase no se descarga y no hay manera de tocar la base de producción.
const ruta = window.location.pathname;

// Marca el documento como "Sala" antes de montar nada. De eso cuelga el
// fondo de la página en index.css, que es la única hoja de estilos y la
// comparten las tres apps: sin esta marca, la paleta nueva le cambiaría el
// fondo a la app de la comunidad.
// El <title> de index.html es el de la app de la comunidad, y la hoja es una
// sola. Se cambia acá, igual que el fondo, en vez de editar el html.
//
// El nombre es provisorio: si cambia, se tocan esta función y el componente
// Marca de comun/ui.tsx. Nada más.
function marcarAppNueva() {
  document.documentElement.dataset.app = 'nueva';
  document.title = NOMBRE;

  // Antes de dibujar nada: si esto esperara a que monte un componente, la app
  // aparecería un instante en el modo equivocado y daría un salto de color.
  aplicarTema(temaGuardado());

  // La tipografía se carga ACÁ y no con un @import en el CSS, porque la hoja
  // de estilos es una sola para las tres apps: un @import se descargaría
  // también al entrar a la app de la comunidad, que no la usa.
  const fuente = document.createElement('link');
  fuente.rel = 'stylesheet';
  fuente.href =
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
  document.head.appendChild(fuente);
}

if (ruta.startsWith('/profe')) {
  marcarAppNueva();
  import('./profe/AppProfe').then((m) => montar(m.default, true));
} else if (ruta.startsWith('/alumno')) {
  marcarAppNueva();
  import('./alumno/AppAlumno').then((m) => montar(m.default, true));
} else {
  import('./App').then((m) => montar(m.default, false));
}
