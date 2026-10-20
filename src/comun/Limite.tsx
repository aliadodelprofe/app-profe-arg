// ============================================================================
// EL LÍMITE — qué se ve cuando la app se rompe
//
// Hasta ahora las tres apps compartían el ErrorBoundary de la app de la
// comunidad, así que un error en la app del profesor mostraba el logo de la
// comunidad y un título que no tiene nada que ver con este producto. Peor que
// confuso: su botón de "limpiar datos" borra el almacenamiento de ESA app.
//
// Este es el de la app nueva. Dice dos cosas y ofrece dos salidas, que es todo
// lo que sirve cuando algo ya se rompió: volver a intentar la misma pantalla,
// o volver al principio. No ofrece borrar nada: acá lo único que se guarda en
// el navegador es la sesión, y borrarla sería echar al usuario por un error
// que no cometió.
//
// Es un componente de clase porque React todavía no tiene otra forma de
// atrapar un error de renderizado.
// ============================================================================
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { NOMBRE } from './marca';

type Props = { children: ReactNode };
type Estado = { error: Error | null };

export class Limite extends Component<Props, Estado> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Queda en la consola con el árbol de componentes: sin eso, un error en
    // producción es un mensaje suelto sin pantalla ni causa.
    console.error('[' + NOMBRE + ']', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const inicio = window.location.pathname.startsWith('/alumno') ? '/alumno' : '/profe';

    return (
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-md rounded-2xl border border-linea bg-panel p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-alerta">
            Algo se rompió
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-tinta">
            Esta pantalla no se pudo mostrar
          </h1>
          <p className="mt-2 text-sm text-tenue">
            No se perdió nada: lo que ya estaba guardado sigue en su lugar. Probá de nuevo
            y, si vuelve a pasar, contale a quien te dio acceso qué estabas haciendo.
          </p>

          <pre className="mt-4 overflow-x-auto rounded-xl border border-linea bg-campo px-4 py-3 text-xs text-alerta">
            {error.message}
          </pre>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-acento px-4 py-2.5 font-medium text-sobre-acento transition active:scale-[0.98]"
            >
              Volver a intentar
            </button>
            <button
              onClick={() => { window.location.href = inicio; }}
              className="rounded-xl border border-linea px-4 py-2.5 font-medium text-tinta transition hover:border-acento/40"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
