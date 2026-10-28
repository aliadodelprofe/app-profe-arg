// ============================================================================
// Piezas visuales compartidas por las pantallas del profesor.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { NOMBRE } from './marca';
import { guardarTema, temaGuardado } from './tema';
import type { Tema } from './tema';
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
    <div className={'min-h-screen bg-fondo px-5 pt-7 ' + (conBarra ? 'pb-28 sm:pb-12' : 'pb-12')}>
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
          className="group -ml-2 mb-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-tenue transition hover:bg-linea/50 hover:text-tinta"
        >
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            aria-hidden="true"
            className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5"
          >
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {volver.texto}
        </button>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Titulo>{titulo}</Titulo>
          {bajada && <p className="mt-1 text-sm text-tenue">{bajada}</p>}
        </div>
        {derecha}
      </div>
    </div>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="anim-aparecer flex items-start gap-2.5 rounded-xl border border-alerta/25 bg-alerta-suave px-3.5 py-3 text-sm text-alerta"
    >
      {/* El ícono no es decoración: un bloque de texto rojo se puede confundir
          con un dato en rojo —una deuda, por ejemplo—. El triángulo dice
          "esto es un problema" antes de que empieces a leer. */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0"
      >
        <path d="M12 9v4M12 17h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
              strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

// ----------------------------------------------------------------------------
// EL VACÍO
//
// Antes era una frase gris suelta en el medio de la nada, que es como se ve
// una app rota. Un vacío bien hecho hace tres cosas: ocupa el lugar donde iba
// el contenido —así la pantalla no se desinfla—, dice en una línea por qué no
// hay nada, y ofrece la salida si la hay.
// ----------------------------------------------------------------------------
export function Vacio({
  children,
  accion,
}: {
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="anim-aparecer flex flex-col items-center gap-3 rounded-2xl border border-dashed border-linea px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-acento-suave text-acento">
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          aria-hidden="true" className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 13.5h7" strokeLinecap="round" />
        </svg>
      </span>
      <p className="max-w-sm text-sm leading-relaxed text-tenue">{children}</p>
      {accion}
    </div>
  );
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
    'w-full rounded-2xl border border-contorno bg-panel p-4 text-left shadow-apoyo';
  if (!alTocar) return <div className={clases}>{children}</div>;
  // Una tarjeta que se toca tiene que avisar que se toca. En el celular no
  // hay `hover`, así que lo que comunica es el `active`: el hundido de medio
  // píxel al apretar es lo que separa "esto es una app" de "esto es un div".
  return (
    <button
      onClick={alTocar}
      className={
        clases +
        ' flex items-start justify-between gap-3 transition duration-150' +
        ' hover:border-acento/40 hover:shadow-flota' +
        ' active:scale-[0.99] active:bg-acento-suave'
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
// Alto de 44px, anillo de foco teñido en vez del borde que cambia de color, y
// el `placeholder` más apagado que el texto: sin esa diferencia, un campo con
// pista escrita se lee como un campo ya completado.
const claseInput =
  'w-full rounded-xl bg-campo border border-linea px-3.5 py-2.5 text-tinta ' +
  'placeholder:text-tenue/50 outline-none transition ' +
  'focus:border-acento focus:ring-4 focus:ring-acento/15 ' +
  'disabled:opacity-50';

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
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-tinta">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-xs leading-relaxed text-tenue">{ayuda}</span>}
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
            'min-h-10 rounded-xl border px-3.5 py-2 text-sm font-medium transition ' +
            'active:scale-[0.97] ' +
            (valor === o.valor
              ? 'border-acento bg-acento text-sobre-acento shadow-apoyo'
              : 'border-linea bg-panel text-tenue hover:border-acento/40 hover:text-tinta')
          }
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// LOS DOS BOTONES
//
// La diferencia entre los dos tiene que ser de JERARQUÍA, no de "uno es un
// botón y el otro casi". El secundario de antes era un rectángulo con borde
// gris y texto gris: a un metro de distancia se lee idéntico a un control
// deshabilitado, y eso hace que la gente no lo toque.
//
// Ahora el secundario está TEÑIDO con el color de acción. Sigue siendo
// claramente menos importante que el primario —no tiene fondo lleno— pero se
// lee como algo que se puede tocar, que es todo lo que tenía que decir.
//
// Los dos tienen alto mínimo de 44px. No es un número estético: es el tamaño
// por debajo del cual un dedo empieza a errarle, y es la diferencia entre una
// app que se usa parado en una sala y una que hay que usar sentado.
// ----------------------------------------------------------------------------
const baseBoton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 ' +
  'font-medium transition-[transform,background-color,box-shadow,border-color] duration-150 ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45';

export function Boton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        baseBoton +
        ' bg-acento text-sobre-acento shadow-apoyo' +
        ' hover:brightness-[1.07] hover:shadow-flota'
      }
    >
      {children}
    </button>
  );
}

export function BotonSecundario({
  children,
  className = '',
  ...props
}: React.ComponentPropsWithRef<'button'>) {
  return (
    <button
      {...props}
      className={
        baseBoton +
        ' bg-acento-suave text-acento text-sm' +
        ' hover:brightness-[0.97] ' +
        className
      }
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
      className="anim-aparecer fixed inset-0 z-50 flex items-center justify-center bg-tinta/40 p-5 backdrop-blur-md"
      onClick={() => { if (!trabajando) alCancelar(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        // Sin esto, un clic adentro del cartel llega al fondo y lo cierra.
        onClick={(e) => e.stopPropagation()}
        className="anim-entrar w-full max-w-sm rounded-3xl border border-contorno bg-panel p-5 shadow-tapa"
      >
        <p className="mb-2 text-lg font-bold tracking-tight text-tinta">{titulo}</p>
        <div className="mb-5 text-sm leading-relaxed text-tenue">{children}</div>
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
    <div className="mb-8 flex items-center gap-2.5">
      {/* Un cuadrado con la inicial. No es un logo —todavía no hay— pero es
          una marca: algo que ocupa lugar y se reconoce de lejos. Un nombre
          suelto en texto se lee como el título de un documento. */}
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-acento text-lg font-bold text-sobre-acento shadow-apoyo">
        {NOMBRE.slice(0, 1)}
      </span>
      <span className="text-lg font-bold tracking-tight text-tinta">{NOMBRE}</span>
    </div>
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
// Nivel 1 — el nombre de la pantalla.
//
// Más grande y más apretado que antes. `text-2xl` con tracking normal es el
// tamaño de un encabezado de página web; una app usa un título que ocupa el
// ancho con confianza y letras juntas. El `text-balance` evita que un nombre
// largo deje una palabra sola colgando en la segunda línea.
export function Titulo({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-pretty text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-tinta">
      {children}
    </h1>
  );
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
    <div className="mb-3 mt-9 flex items-baseline justify-between gap-3 first:mt-0">
      <h2 className="text-[1.0625rem] font-bold tracking-[-0.01em] text-tinta">{children}</h2>
      {acotacion && (
        <span className="shrink-0 text-xs font-medium text-tenue">{acotacion}</span>
      )}
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
  // El bloque entero se tiñe según el estado, no solo el número. Un $32.000
  // rojo sobre un panel blanco se lee como un número que alguien pintó; el
  // mismo número sobre una superficie teñida se lee como una situación.
  const estilo = {
    normal: { texto: 'text-tinta', caja: 'border-contorno bg-panel' },
    alerta: { texto: 'text-alerta', caja: 'border-alerta/20 bg-alerta-suave' },
    ok:     { texto: 'text-ok',     caja: 'border-ok/20 bg-ok-suave' },
  }[tono];
  return (
    <div className={`anim-aparecer rounded-2xl border p-5 shadow-apoyo ${estilo.caja}`}>
      <p className={`plata text-[2.5rem] font-bold leading-none tracking-[-0.03em] ${estilo.texto}`}>
        {valor}
      </p>
      <p className="mt-2 text-sm leading-snug text-tenue">{al}</p>
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
  // Rellenas y sin borde. Una etiqueta de borde fino compite visualmente con
  // los campos y los botones, que también son rectángulos con borde; una
  // pastilla llena se lee de inmediato como "estado", no como "control".
  const estilo = {
    normal: 'bg-linea/60 text-tenue',
    acento: 'bg-acento-suave text-acento',
    alerta: 'bg-alerta-suave text-alerta',
    ok: 'bg-ok-suave text-ok',
  }[tono];
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium leading-none ${estilo}`}
    >
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
  // En el celular, la pestaña activa se marca con una PASTILLA detrás del
  // ícono, no solo con color. Es lo que hace que de un vistazo —sin leer, sin
  // comparar tonos— sepas dónde estás parado. Un ícono naranja al lado de dos
  // grises obliga a mirar los tres para decidir cuál es el distinto.
  const boton = (p: Pestana<T>, vertical: boolean) => {
    const activo = p.id === activa;
    if (vertical) {
      return (
        <button
          key={p.id}
          onClick={() => alElegir(p.id)}
          aria-current={activo ? 'page' : undefined}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition active:scale-95"
        >
          <span
            className={
              'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 ' +
              (activo ? 'bg-acento-suave text-acento' : 'text-tenue')
            }
          >
            {p.icono}
          </span>
          <span className={activo ? 'text-acento' : 'text-tenue'}>{p.texto}</span>
        </button>
      );
    }
    return (
      <button
        key={p.id}
        onClick={() => alElegir(p.id)}
        aria-current={activo ? 'page' : undefined}
        className={
          'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ' +
          (activo
            ? 'bg-acento-suave text-acento'
            : 'text-tenue hover:bg-linea/50 hover:text-tinta')
        }
      >
        {p.icono}
        {p.texto}
      </button>
    );
  };

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
        className="sticky top-0 z-40 hidden border-b border-linea bg-fondo/80 backdrop-blur-xl sm:block"
        aria-label="Secciones"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-1 px-5 py-2.5">
          <span className="mr-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-acento text-sm font-bold text-sobre-acento">
              {NOMBRE.slice(0, 1)}
            </span>
            <span className="font-bold tracking-tight text-tinta">{NOMBRE}</span>
          </span>
          {pestanas.map((p) => boton(p, false))}
        </div>
      </nav>

      {/* Celular: fija abajo, donde llega el pulgar. Al ser `fixed`, dónde
          esté en el documento no cambia dónde se dibuja. El padding de abajo
          respeta la zona del gesto de inicio en los iPhone sin botón. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-linea bg-panel/85 px-2 pt-1 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl sm:hidden"
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

export const IconoEscuela = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={svg}>
    <path d="M3 10.5 12 4l9 6.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 10v9h14v-9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 19v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconoPerfil = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={svg}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" strokeLinecap="round" />
  </svg>
);

export const IconoClases = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={svg}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
);

// ============================================================================
// LAS PIEZAS QUE HACEN QUE ESTO SE SIENTA UNA APP Y NO UN SISTEMA
//
// Son cinco y ninguna agrega información: cambian cómo se recorre la misma.
// Juntas son la diferencia entre una tabla con bordes y una lista que se
// puede barrer con el pulgar.
// ============================================================================

// ----------------------------------------------------------------------------
// AVATAR
//
// Antes no había una sola inicial en toda la app, y esa es la razón número uno
// por la que se veía a "sistema de gestión": las listas de personas sin caras
// se leen como filas de una planilla.
//
// El color sale del nombre, así que el mismo alumno tiene siempre el mismo y
// en una lista de doce la variedad de tonos permite encontrar a alguien sin
// leer. La saturación y la luminosidad viven en index.css porque son lo que
// cambia entre modo claro y oscuro.
// ----------------------------------------------------------------------------
function tonoDe(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) % 360;
  return h;
}

// Dos iniciales como mucho. "María de los Ángeles Pérez" es MP, no MDLAP.
function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter((p) => p.length > 2);
  const uso = partes.length > 0 ? partes : nombre.trim().split(/\s+/);
  return (uso[0]?.[0] ?? '?').concat(uso.length > 1 ? uso[uso.length - 1][0] : '').toUpperCase();
}

export function Avatar({
  nombre,
  foto,
  tam = 'normal',
}: {
  nombre: string;
  foto?: string | null;
  // 'nav' es el de la barra de secciones, donde reemplaza al ícono: la cara
  // de uno es mejor señal de "acá estoy yo" que cualquier dibujo.
  tam?: 'nav' | 'chico' | 'normal';
}) {
  const h = tonoDe(nombre);
  // Si la dirección de la foto no carga, se cae a las iniciales. Se reinicia
  // cuando cambia la foto: una dirección nueva merece un intento nuevo.
  const [roto, setRoto] = useState(false);
  useEffect(() => { setRoto(false); }, [foto]);

  const medida =
    tam === 'nav' ? 'h-5 w-5 sm:h-4 sm:w-4' : tam === 'chico' ? 'h-8 w-8' : 'h-10 w-10';

  // Con foto, la foto. Las iniciales son el plan B, no el plan.
  //
  // El plan B tiene que DIBUJARSE, no limitarse a esconder la imagen rota. La
  // versión anterior le ponía display:none al <img> cuando fallaba, y eso deja
  // un hueco: ni foto ni iniciales, un círculo vacío donde va una cara. Ahora
  // el fallo cambia el estado y abajo se dibujan las letras, que es lo que
  // había antes de que existiera la foto.
  if (foto && !roto) {
    return (
      <img
        src={foto}
        alt=""
        // El aro de adentro despega la foto del fondo. Sin él, una foto con
        // el borde claro sobre un panel claro se derrama y el círculo deja de
        // leerse como círculo.
        className={`${medida} shrink-0 rounded-full object-cover ring-1 ring-tinta/10 ring-inset`}
        // Una dirección de Google puede dejar de funcionar si la persona
        // cambia su foto allá. Lo mismo si el archivo se borró del depósito.
        onError={() => setRoto(true)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        backgroundColor: `hsl(${h} var(--avatar-sat) var(--avatar-fondo))`,
        color: `hsl(${h} var(--avatar-sat) var(--avatar-letra))`,
      }}
      className={
        'flex shrink-0 items-center justify-center rounded-full font-semibold ' +
        'ring-1 ring-tinta/5 ring-inset ' +
        medida + (tam === 'normal' ? ' text-sm' : tam === 'chico' ? ' text-xs' : ' text-[8px]')
      }
    >
      {inicialesDe(nombre)}
    </span>
  );
}


// ----------------------------------------------------------------------------
// LISTA Y FILA
//
// El cambio más grande de todos. Antes cada elemento era una tarjeta con marco
// y aire alrededor, una debajo de la otra: eso es una tabla disfrazada, y se
// lee como una tabla.
//
// Una app usa renglones pegados, separados por una rayita, **de borde a
// borde**. En el celular la lista rompe el margen de la página (`-mx-5`) y
// toca los dos lados de la pantalla, que es lo que hace que se sienta parte
// del aparato y no un documento adentro de una ventana. En pantalla grande
// vuelve a ser una tarjeta redondeada, porque ahí el borde a borde sería una
// línea de un metro.
// ----------------------------------------------------------------------------
export function Lista({ children }: { children: ReactNode }) {
  return (
    <ul className="anim-escalera -mx-5 divide-y divide-linea border-y border-contorno bg-panel shadow-apoyo sm:mx-0 sm:rounded-2xl sm:border">
      {children}
    </ul>
  );
}

export function Fila({
  avatar,
  foto,
  principal,
  titulo,
  detalle,
  valor,
  bajoValor,
  alTocar,
  children,
}: {
  avatar?: string;              // el nombre del que sale la inicial
  foto?: string | null;         // si la persona tiene una
  principal?: ReactNode;        // o algo propio a la izquierda, en vez del avatar
  titulo: ReactNode;
  detalle?: ReactNode;
  valor?: ReactNode;            // lo que va a la derecha: un monto, una hora
  bajoValor?: ReactNode;
  alTocar?: () => void;
  children?: ReactNode;         // lo que cuelga abajo: botones, avisos
}) {
  const cuerpo = (
    <>
      <div className="flex items-center gap-3">
        {principal ?? (avatar !== undefined ? <Avatar nombre={avatar} foto={foto} /> : null)}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium leading-snug text-tinta">{titulo}</div>
          {detalle && (
            <div className="truncate text-sm leading-snug text-tenue">{detalle}</div>
          )}
        </div>
        {(valor || bajoValor) && (
          <div className="shrink-0 text-right">
            {valor && <div className="plata font-semibold leading-snug text-tinta">{valor}</div>}
            {bajoValor && <div className="text-xs leading-snug text-tenue">{bajoValor}</div>}
          </div>
        )}
        {/* La flechita se corre un poco al pasar el mouse. Es un detalle de dos
            píxeles y es de los que más hacen: dice "esto lleva a algún lado"
            antes de que toques nada. */}
        {alTocar && (
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-tenue/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-acento"
          >
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </>
  );

  return (
    <li>
      {alTocar ? (
        <button
          onClick={alTocar}
          className="group w-full px-5 py-3.5 text-left transition-colors duration-150 hover:bg-acento-suave/40 active:bg-acento-suave sm:px-4"
        >
          {cuerpo}
        </button>
      ) : (
        <div className="px-5 py-3.5 sm:px-4">{cuerpo}</div>
      )}
    </li>
  );
}


// ----------------------------------------------------------------------------
// UN DATO PARA COPIAR
//
// Un alias o un CBU no se leen: se copian. Mostrarlos como texto suelto deja
// al alumno tipeando veintidós dígitos en la app del banco, que es justo donde
// un error cuesta plata.
//
// El botón confirma por dos segundos y vuelve solo. Sin esa confirmación, en
// el celular no hay forma de saber si el toque entró, y la gente copia tres
// veces por las dudas.
// ----------------------------------------------------------------------------
export function CopiarDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles —pasa en páginas sin https— no se puede
      // hacer nada por el usuario salvo dejarle el dato a mano para que lo
      // seleccione. Que no sea un error en la cara.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-linea px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-tenue">{etiqueta}</p>
        <p className="truncate font-mono text-sm text-tinta">{valor}</p>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-lg border border-linea px-3 py-1.5 text-sm text-tenue transition hover:border-acento/40 active:scale-[0.98]"
      >
        {copiado ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}


// ----------------------------------------------------------------------------
// EL MODO CLARO Y EL OSCURO
//
// Tres opciones y no un interruptor de dos. "Como el sistema" tiene que
// existir y tiene que ser elegible: para mucha gente es lo correcto —el
// celular se pone oscuro de noche solo— y sin esa opción, quien alguna vez
// tocó el control queda atado a su elección para siempre.
//
// El claro es el que viene puesto. La paleta está construida sobre papel
// cálido y terracota, y eso es lo que la distingue de cualquier panel de
// administración; en oscuro ese papel desaparece.
// ----------------------------------------------------------------------------
export function SelectorDeTema() {
  const [tema, setTema] = useState<Tema>(() => temaGuardado());

  return (
    <div>
      <p className="mb-2 text-sm text-tenue">Cómo se ve la app</p>
      <Opciones<Tema>
        valor={tema}
        alElegir={(t) => { setTema(t); guardarTema(t); }}
        opciones={[
          { valor: 'claro', texto: 'Claro' },
          { valor: 'oscuro', texto: 'Oscuro' },
          { valor: 'sistema', texto: 'Como el sistema' },
        ]}
      />
    </div>
  );
}


// ----------------------------------------------------------------------------
// EL CORTE POR MES
//
// Una lista larga de clases son cuarenta renglones iguales donde el ojo no
// tiene dónde apoyarse. La alternativa clásica es un selector de mes, pero un
// filtro es un control que le cobra atención a todo el mundo en cada visita
// para resolver un problema que aparece pocas veces. Un corte por mes no pide
// nada: ubicás el mes de un vistazo mientras pasás el dedo, y aguanta dos años
// de historia sin cambiar nada.
//
// Se pega arriba, así que mientras recorrés septiembre la pantalla sigue
// diciendo septiembre. En las pantallas que tienen la barra de secciones
// arriba —solo en computadora; en el celular la barra va abajo— hay que
// correrlo para que la barra no lo tape.
// ----------------------------------------------------------------------------
export function CorteDeMes({
  children,
  cuantas,
  bajoBarra = false,
}: {
  children: ReactNode;
  cuantas?: number;
  bajoBarra?: boolean;
}) {
  return (
    <li
      className={
        // El fondo de la página, no el del panel: contra las filas, que son
        // panel, el corte se lee como una franja y no como un renglón más.
        // La primera versión era gris chiquito sobre el mismo color de las
        // filas y, pegado arriba, directamente no se veía.
        'sticky z-20 flex items-baseline justify-between gap-3 bg-fondo px-5 py-2 sm:px-4 sm:first:rounded-t-2xl ' +
        (bajoBarra ? 'top-0 sm:top-14' : 'top-0')
      }
    >
      <span className="text-sm font-semibold uppercase tracking-wide text-tinta">
        {children}
      </span>
      {cuantas !== undefined && (
        <span className="shrink-0 text-xs tabular-nums text-tenue">
          {cuantas} {cuantas === 1 ? 'clase' : 'clases'}
        </span>
      )}
    </li>
  );
}


// ----------------------------------------------------------------------------
// HOJA — el formulario que sube desde abajo
//
// Antes los formularios se abrían ADENTRO de la página y empujaban todo lo de
// abajo. Eso tiene dos problemas: perdés de vista dónde estabas, y la pantalla
// cambia de alto de golpe mientras la estás mirando.
//
// Una hoja tapa lo de atrás sin borrarlo, y al cerrarse devuelve la pantalla
// intacta. En el celular sube desde abajo —queda al alcance del pulgar—; en
// pantalla grande es un cuadro centrado, porque una hoja pegada al borde
// inferior de un monitor queda lejísimos del ojo.
// ----------------------------------------------------------------------------
export function Hoja({
  titulo,
  alCerrar,
  children,
}: {
  titulo: string;
  alCerrar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') alCerrar();
    }
    document.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = antes;
    };
  }, [alCerrar]);

  return (
    <div
      className="anim-aparecer fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 backdrop-blur-md sm:items-center sm:p-5"
      onClick={alCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="anim-subir max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border-t border-contorno bg-panel shadow-tapa sm:max-w-lg sm:rounded-3xl sm:border"
      >
        {/* El tirador. No hace nada: está porque es lo que le dice a cualquiera
            que esto es una hoja y que se cierra tirándola para abajo. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-11 rounded-full bg-linea" />
        </div>

        {/* El encabezado se pega arriba: en una hoja larga —el recortador, un
            formulario con seis campos— perder el título al scrollear te deja
            sin saber qué estás completando. */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-contorno bg-panel/90 px-5 pb-3 pt-4 backdrop-blur-xl">
          <h2 className="text-lg font-bold tracking-tight text-tinta">{titulo}</h2>
          <button
            onClick={alCerrar}
            aria-label="Cerrar"
            className="-mr-1 rounded-full p-1.5 text-tenue transition hover:bg-acento-suave hover:text-tinta"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}


// ----------------------------------------------------------------------------
// ESQUELETO
//
// Reemplaza a la palabra "Buscando…". No es cosmético: un texto que dice
// "buscando" no te anticipa nada, y cuando llegan los datos la pantalla salta.
// El esqueleto ocupa desde el principio el lugar y la forma de lo que viene,
// así que cuando aparece el contenido no se mueve nada.
// ----------------------------------------------------------------------------
// El reflejo que recorre cada bloque. Va como constante y no suelto en cada
// div porque son cuatro clases largas repetidas cinco veces.
const brillo =
  'bg-linea bg-[linear-gradient(90deg,transparent,var(--color-panel),transparent)] ' +
  'bg-[length:200%_100%] [animation:brillo_1.6s_ease-in-out_infinite] ' +
  'motion-reduce:animate-none';

export function Esqueleto({ filas = 3 }: { filas?: number }) {
  return (
    <div className="-mx-5 divide-y divide-linea border-y border-contorno bg-panel shadow-apoyo sm:mx-0 sm:rounded-2xl sm:border">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5 sm:px-4">
          <div className={`h-10 w-10 shrink-0 rounded-full ${brillo}`} />
          <div className="min-w-0 flex-1">
            {/* Anchos distintos en cada fila. Tres bloques idénticos se leen
                como un patrón decorativo; irregulares se leen como texto que
                todavía no llegó. */}
            <div className={`h-3.5 rounded ${brillo}`} style={{ width: `${34 + i * 9}%` }} />
            <div className={`mt-2 h-3 rounded ${brillo}`} style={{ width: `${48 - i * 6}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}


// ----------------------------------------------------------------------------
// SEGMENTOS — las solapas de adentro de una pantalla
//
// Para cortar una pantalla larga en dos vistas que compiten por el mismo
// lugar. No es lo mismo que la navegación de abajo: aquella te lleva a otra
// parte de la app, esta cambia qué estás mirando sin moverte.
// ----------------------------------------------------------------------------
export function Segmentos<T extends string>({
  valor,
  opciones,
  alElegir,
}: {
  valor: T;
  opciones: { id: T; texto: string; cuantos?: number }[];
  alElegir: (id: T) => void;
}) {
  return (
    <div className="mb-4 flex gap-1 rounded-2xl bg-linea/50 p-1">
      {opciones.map((o) => (
        <button
          key={o.id}
          onClick={() => alElegir(o.id)}
          className={
            'flex-1 rounded-xl px-3 py-2 text-sm font-medium transition duration-150 ' +
            'active:scale-[0.98] ' +
            (o.id === valor
              ? 'bg-panel text-tinta shadow-apoyo'
              : 'text-tenue hover:text-tinta')
          }
        >
          {o.texto}
          {o.cuantos !== undefined && (
            <span
              className={
                'ml-1.5 inline-block min-w-5 rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums ' +
                (o.id === valor ? 'bg-acento-suave text-acento' : 'bg-linea/70 text-tenue')
              }
            >
              {o.cuantos}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}


// ----------------------------------------------------------------------------
// CHIP DE FECHA
//
// El lugar del avatar, cuando la fila no es una persona sino un día. En una
// lista de clases el dato que se busca con el ojo es la fecha, no el título:
// "¿cuándo es la próxima?" se contesta mirando una columna de números, no
// leyendo renglones.
// ----------------------------------------------------------------------------
const DIA_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function ChipFecha({ iso, apagado = false }: { iso: string; apagado?: boolean }) {
  const [a, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return (
    <span
      aria-hidden="true"
      className={
        'flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border ' +
        (apagado
          ? 'border-linea text-tenue'
          : 'border-acento/25 bg-acento-suave text-acento')
      }
    >
      <span className="text-[10px] uppercase leading-none opacity-70">{DIA_CORTO[dow]}</span>
      <span className="text-base font-semibold leading-tight tabular-nums">{d}</span>
    </span>
  );
}
