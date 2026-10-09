// ============================================================================
// Piezas visuales compartidas por las pantallas del profesor.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { NOMBRE } from './marca';
import type React from 'react';

// `conBarra` deja lugar abajo para la navegación fija del celular. Sin eso,
// la última tarjeta de cualquier lista queda tapada por la barra y nadie se
// da cuenta hasta que un alumno reclama que "no le aparece" algo que sí está.
export function Marco({
  children,
  conBarra = false,
}: {
  children: ReactNode;
  conBarra?: boolean;
}) {
  return (
    <div className={'min-h-screen bg-fondo px-5 py-6 ' + (conBarra ? 'pb-28 sm:pb-10' : 'pb-10')}>
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </div>
  );
}

export function Encabezado({
  titulo,
  bajada,
  derecha,
  volver,
}: {
  titulo: string;
  bajada?: string;
  derecha?: ReactNode;
  volver?: { texto: string; alTocar: () => void };
}) {
  return (
    <div className="mb-6">
      {volver && (
        <button
          onClick={volver.alTocar}
          className="mb-3 text-sm text-tenue hover:text-acento"
        >
          ← {volver.texto}
        </button>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-tinta">{titulo}</h1>
          {bajada && <p className="text-sm text-tenue">{bajada}</p>}
        </div>
        {derecha}
      </div>
    </div>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm text-alerta">
      {children}
    </p>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="text-tenue">{children}</p>;
}

export function Tarjeta({
  children,
  alTocar,
}: {
  children: ReactNode;
  alTocar?: () => void;
}) {
  // La sombra es mínima y solo se nota en modo claro, que es donde una
  // tarjeta sin sombra sobre fondo casi blanco se lee como un rectángulo
  // dibujado y no como algo apoyado.
  const clases =
    'w-full rounded-2xl border border-linea bg-panel p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
  if (!alTocar) return <div className={clases}>{children}</div>;
  // Una tarjeta que se toca tiene que avisar que se toca. En el celular no
  // hay `hover`, así que lo que comunica es el `active`: el hundido de medio
  // píxel al apretar es lo que separa "esto es una app" de "esto es un div".
  return (
    <button
      onClick={alTocar}
      className={
        clases +
        ' flex items-start justify-between gap-3 transition hover:border-acento/40' +
        ' active:scale-[0.99] active:bg-acento/5'
      }
    >
      <span className="min-w-0 flex-1">{children}</span>
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        aria-hidden="true"
        className="mt-1 h-4 w-4 shrink-0 text-tenue"
      >
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Carga de datos: pide, y devuelve una de tres cosas — todavía nada, un error,
// o los datos. Las pantallas se limitan a mostrar cuál de las tres es.
//
// Y vuelve a preguntar cuando la pestaña recupera el foco. Esto no es un lujo:
// el alumno avisa que transfirió desde su celular, el profe confirma desde el
// suyo, y si la pantalla del alumno no se entera queda mostrando una deuda que
// ya no existe. Nadie recarga una app a mano para ver si cambió algo.
// ---------------------------------------------------------------------------
export function useCarga<T>(pedir: () => Promise<T>, claves: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Se incrementa para pedir los datos de nuevo, después de crear algo.
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    let vivo = true;
    setDatos(null);
    setError(null);
    pedir()
      .then((d) => { if (vivo) setDatos(d); })
      .catch((e: Error) => { if (vivo) setError(e.message); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...claves, vuelta]);

  // Al volver a la pestaña, preguntar de nuevo. Con un mínimo de tres segundos
  // entre una y otra, para que alternar rápido entre ventanas no se convierta
  // en una ráfaga de consultas.
  const ultima = useRef(0);
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return;
      const ahora = Date.now();
      if (ahora - ultima.current < 3000) return;
      ultima.current = ahora;
      setVuelta((v) => v + 1);
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, []);

  return { datos, error, recargar: () => setVuelta((v) => v + 1) };
}

// ---------------------------------------------------------------------------
// Piezas de formulario
// ---------------------------------------------------------------------------
const claseInput =
  'w-full rounded-lg bg-campo border border-linea px-3 py-2 text-tinta outline-none focus:border-acento';

export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-tenue">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-xs text-tenue/70">{ayuda}</span>}
    </label>
  );
}

export function Texto(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={claseInput} />;
}

export function Area(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={claseInput + ' min-h-24 resize-y'} />;
}

export function Opciones<T extends string>({
  valor,
  opciones,
  alElegir,
}: {
  valor: T;
  opciones: { valor: T; texto: string }[];
  alElegir: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => alElegir(o.valor)}
          className={
            'rounded-lg border px-3 py-1.5 text-sm ' +
            (valor === o.valor
              ? 'border-acento bg-acento text-sobre-acento'
              : 'border-linea text-tenue hover:border-acento/40')
          }
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function Boton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-xl bg-acento px-4 py-2.5 font-medium text-sobre-acento transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}

export function BotonSecundario({
  children,
  ...props
}: React.ComponentPropsWithRef<'button'>) {
  return (
    <button
      {...props}
      className="rounded-xl border border-linea px-4 py-2.5 text-sm text-tenue transition hover:border-acento/40 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

// ----------------------------------------------------------------------------
// Confirmación antes de una acción que el alumno no puede deshacer solo.
//
// No es un "¿estás seguro?" decorativo: el texto tiene que decir exactamente
// qué va a pasar y desde cuándo. Un cartel que no informa nada solo entrena a
// la gente a apretar "Sí" sin leer.
//
// El foco arranca en Cancelar a propósito. Si alguien abrió esto sin querer,
// la tecla Enter tiene que sacarlo, no confirmarle el cambio.
// ----------------------------------------------------------------------------
export function Confirmacion({
  titulo,
  children,
  confirmar,
  trabajando = false,
  alConfirmar,
  alCancelar,
}: {
  titulo: string;
  children: ReactNode;
  confirmar: string;
  trabajando?: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  const cancelarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelarRef.current?.focus();
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape' && !trabajando) alCancelar();
    }
    document.addEventListener('keydown', tecla);
    // Mientras el cartel está abierto, la página de atrás no se mueve.
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = antes;
    };
  }, [alCancelar, trabajando]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
      onClick={() => { if (!trabajando) alCancelar(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        // Sin esto, un clic adentro del cartel llega al fondo y lo cierra.
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-linea bg-panel p-5 shadow-xl"
      >
        <p className="mb-2 text-lg text-tinta">{titulo}</p>
        <div className="mb-4 text-sm text-tenue">{children}</div>
        <div className="flex gap-2">
          <Boton type="button" onClick={alConfirmar} disabled={trabajando}>
            {trabajando ? 'Cambiando…' : confirmar}
          </Boton>
          <BotonSecundario ref={cancelarRef} type="button" onClick={alCancelar} disabled={trabajando}>
            Cancelar
          </BotonSecundario>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// La marca.
//
// EL NOMBRE ES PROVISORIO. Está acá, en un solo lugar, justamente porque
// todavía se está decidiendo: cambiarlo es editar esta línea y una más en
// main.tsx. Ninguna pantalla lo escribe a mano, y los tokens de color se
// llaman `acento` y `tinta` y no "el naranja de Aria", así que la identidad
// visual tampoco depende del nombre.
//
// Por ahora es la palabra sola, sin logo.
//
// Aparece únicamente en las pantallas de entrada. Adentro de la app el
// encabezado lo ocupa el nombre de la escuela del profesor, que es lo que le
// importa a quien está mirando: la marca del producto ya cumplió su función
// cuando la persona entró.
// ----------------------------------------------------------------------------
export function Marca() {
  return (
    <p className="mb-8 text-lg font-semibold tracking-tight text-acento">{NOMBRE}</p>
  );
}


// ============================================================================
// JERARQUÍA
//
// El problema que resuelven estas piezas no es estético: antes casi todo el
// texto de la app era `text-sm` y los títulos de sección eran mayúsculas
// chiquitas en gris. Con todo del mismo peso, el ojo no tiene por dónde
// entrar y hay que leer la pantalla entera para encontrar un dato.
//
// Son cuatro niveles y alcanzan. Más niveles es volver al mismo problema por
// el otro lado.
// ============================================================================

// Nivel 1 — de qué se trata esta pantalla. Uno por pantalla.
export function Titulo({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-semibold tracking-tight text-tinta">{children}</h1>;
}

// Nivel 2 — los bloques adentro de una pantalla.
//
// Antes eran mayúsculas chiquitas en gris, que es la forma más común de
// escribir un título que nadie lee. Ahora pesan de verdad y se separan del
// bloque anterior, que es lo que hace que una pantalla larga se pueda recorrer
// saltando en vez de leyendo.
export function Seccion({
  children,
  acotacion,
}: {
  children: ReactNode;
  acotacion?: ReactNode;
}) {
  return (
    <div className="mb-3 mt-8 flex items-baseline justify-between gap-3 first:mt-0">
      <h2 className="text-lg font-semibold tracking-tight text-tinta">{children}</h2>
      {acotacion && <span className="shrink-0 text-sm text-tenue">{acotacion}</span>}
    </div>
  );
}

// Nivel 3 — EL número. Cuánto te deben, cuánto entró, cuánto debés.
//
// Es la razón por la que alguien abre la pantalla, así que se ve antes de
// leer nada. `tabular-nums` alinea los dígitos para que dos cifras una debajo
// de la otra se puedan comparar de un vistazo.
export function Dato({
  valor,
  al,
  tono = 'normal',
  children,
}: {
  valor: string;
  al: string;
  tono?: 'normal' | 'alerta' | 'ok';
  children?: ReactNode;
}) {
  const color =
    tono === 'alerta' ? 'text-alerta' : tono === 'ok' ? 'text-ok' : 'text-tinta';
  return (
    <div className="rounded-xl border border-linea bg-panel p-4">
      <p className={`text-3xl font-semibold tabular-nums tracking-tight ${color}`}>{valor}</p>
      <p className="mt-0.5 text-sm text-tenue">{al}</p>
      {children}
    </div>
  );
}

// Nivel 4 — la marquita al costado de algo: un formato, un estado.
export function Etiqueta({
  children,
  tono = 'normal',
}: {
  children: ReactNode;
  tono?: 'normal' | 'acento' | 'alerta' | 'ok';
}) {
  const estilo = {
    normal: 'border-linea text-tenue',
    acento: 'border-acento/40 text-acento',
    alerta: 'border-alerta/40 text-alerta',
    ok: 'border-ok/40 text-ok',
  }[tono];
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${estilo}`}>
      {children}
    </span>
  );
}


// ============================================================================
// NAVEGACIÓN
//
// Antes las secciones colgaban una de otra: "quién me debe" y "pagos" vivían
// adentro de "grupos", así que para ir de una a la otra había que volver
// atrás primero. Son hermanas, no hijas, y ahora se ven las tres siempre.
//
// Abajo en el celular —donde llega el pulgar— y arriba en la computadora,
// que es donde el ojo busca una navegación. Es la misma lista renderizada dos
// veces con `sm:`, y no dos componentes: un menú que se puede desincronizar
// consigo mismo es un menú que en algún momento va a mentir.
// ============================================================================
export type Pestana<T extends string> = {
  id: T;
  texto: string;
  icono: ReactNode;
};

export function Navegacion<T extends string>({
  pestanas,
  activa,
  alElegir,
}: {
  pestanas: Pestana<T>[];
  activa: T;
  alElegir: (id: T) => void;
}) {
  const boton = (p: Pestana<T>, vertical: boolean) => (
    <button
      key={p.id}
      onClick={() => alElegir(p.id)}
      aria-current={p.id === activa ? 'page' : undefined}
      className={
        (vertical
          ? 'flex flex-1 flex-col items-center gap-1 py-2 text-xs'
          : 'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm') +
        ' ' +
        (p.id === activa
          ? 'text-acento ' + (vertical ? '' : 'bg-acento/10 font-medium')
          : 'text-tenue hover:text-tinta')
      }
    >
      {p.icono}
      {p.texto}
    </button>
  );

  return (
    <>
      {/* Computadora: arriba. Va PRIMERO en el documento a propósito.
          
          Antes estaba después del contenido y era `sticky`, que solo pega un
          elemento al borde cuando el scroll lo alcanza: puesto al final,
          aparecía abajo de toda la página. Un menú "arriba" que se dibuja
          abajo no es un detalle de estilo, es orden del documento.
          
          El contenido interno se alinea con el de las pantallas (mismo ancho
          máximo y mismo margen lateral) para que el menú y el título queden
          sobre la misma línea vertical. */}
      <nav
        className="sticky top-0 z-40 hidden border-b border-linea bg-fondo/85 backdrop-blur sm:block"
        aria-label="Secciones"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-1 px-5 py-2.5">
          <span className="mr-4 font-semibold tracking-tight text-acento">{NOMBRE}</span>
          {pestanas.map((p) => boton(p, false))}
        </div>
      </nav>

      {/* Celular: fija abajo, donde llega el pulgar. Al ser `fixed`, dónde
          esté en el documento no cambia dónde se dibuja. El padding de abajo
          respeta la zona del gesto de inicio en los iPhone sin botón. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-linea bg-panel px-2 pb-[env(safe-area-inset-bottom,0px)] sm:hidden"
        aria-label="Secciones"
      >
        {pestanas.map((p) => boton(p, true))}
      </nav>
    </>
  );
}

// Los íconos son tres formas propias y no una librería: tres dibujos no
// justifican una dependencia, y cualquier set que bajemos va a tener el estilo
// de otro producto.
const svg = 'h-5 w-5 sm:h-4 sm:w-4';

export const IconoHoy = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={svg}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" />
  </svg>
);

export const IconoGrupos = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={svg}>
    <circle cx="8" cy="9" r="3" />
    <circle cx="16" cy="9" r="3" />
    <path d="M3 19c0-2.8 2.2-5 5-5M21 19c0-2.8-2.2-5-5-5" strokeLinecap="round" />
  </svg>
);

export const IconoCobros = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={svg}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const IconoClases = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={svg}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
);
