import { StrictMode } from 'react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const root = createRoot(document.getElementById('root')!);

function montar(Componente: ComponentType) {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <Componente />
      </ErrorBoundary>
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

if (ruta.startsWith('/profe')) {
  import('./profe/AppProfe').then((m) => montar(m.default));
} else if (ruta.startsWith('/alumno')) {
  import('./alumno/AppAlumno').then((m) => montar(m.default));
} else {
  import('./App').then((m) => montar(m.default));
}
