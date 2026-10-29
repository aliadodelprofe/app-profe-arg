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
//   la raíz     → la puerta de entrada del producto nuevo
//
// La carga es dinámica a propósito: entrando por cualquiera de esas tres, el
// código de Firebase no se descarga y no hay manera de tocar la base de
// producción de la comunidad.
//
// QUIÉN SE QUEDA CON LA RAÍZ, Y POR QUÉ SE DECIDE POR DOMINIO.
//
// Hasta hoy la raíz servía la app de la comunidad, que es otro producto
// contra otra base. Eso no era solo desprolijo: cuando Supabase rechazó una
// redirección de autenticación y cayó a su destino de respaldo, dejó al
// usuario adentro del producto equivocado, con el token colgando en la
// dirección. La raíz tiene que ser de una sola app.
//
// Se decide por DOMINIO y no por una variable de entorno a propósito. Una
// variable hay que acordarse de ponerla en cada despliegue, y el día que uno
// se olvide, el dominio nuevo serviría la app de la comunidad contra el
// Firebase de producción — exactamente el accidente que esto viene a evitar.
// Con el dominio, el que tiene que acordarse de algo es el que publica la app
// VIEJA, que está congelada y vive en un lugar que ya existe.
const ruta = window.location.pathname;

// Los dominios donde vive la app de la comunidad. El `.web.app` y el
// `.firebaseapp.com` son los que Firebase Hosting da solos, además del
// dominio propio.
const DOMINIOS_COMUNIDAD = [
  'tabachata-academy.com',
  'www.tabachata-academy.com',
  'ta-bachata-academy.web.app',
  'ta-bachata-academy.firebaseapp.com',
];

// `/comunidad` es la puerta de servicio: sirve para abrirla en localhost el
// día que haya que arreglarle un bug, sin tener que tocar esta lista.
const esComunidad =
  DOMINIOS_COMUNIDAD.includes(window.location.hostname) || ruta.startsWith('/comunidad');

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

if (esComunidad) {
  import('./App').then((m) => montar(m.default, false));
} else if (ruta.startsWith('/profe')) {
  marcarAppNueva();
  import('./profe/AppProfe').then((m) => montar(m.default, true));
} else if (ruta.startsWith('/alumno')) {
  marcarAppNueva();
  import('./alumno/AppAlumno').then((m) => montar(m.default, true));
} else {
  marcarAppNueva();
  import('./inicio/Inicio').then((m) => montar(m.default, true));
}
