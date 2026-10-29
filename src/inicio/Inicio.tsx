// ============================================================================
// LA PUERTA DE ENTRADA
//
// Lo que ve alguien que llega sin saber qué es esto. Hasta hace poco la raíz
// servía la app de la comunidad —otro producto, contra otra base— y eso no era
// solo desprolijo: cualquier redirección de autenticación que se cayera al
// destino de respaldo dejaba al usuario adentro del producto equivocado.
//
// LE HABLA A DOS PERSONAS, Y NO SON LA MISMA.
//
// La primera versión le hablaba solo al profesor, y eso deja afuera a la
// mayoría: por cada profe hay veinte alumnos, y el alumno llega acá por un
// enlace que le mandaron, sin saber qué es. Si la página le habla a otro, se
// va. Así que el cuerpo son dos bloques gemelos, uno para cada uno, con lo que
// esa persona gana — no con lo que la app tiene.
//
// Y ES CORTA A PROPÓSITO.
//
// Nadie lee una landing: la barre con la vista. Cada punto entra en un
// renglón. Lo que no entra en un renglón no lo lee nadie, así que no está.
//
// QUÉ DICE Y QUÉ NO.
//
// Nada que la app no haga hoy. Ni "crecé tu academia", ni "la plataforma
// líder", ni funciones que están en la lista de pendientes. Cada punto de acá
// corresponde a algo que efectivamente pasa: las clases las crea
// asegurar_clases(), los cargos asegurar_cargos(), el estado de cuenta sale de
// student_account. El día que uno deje de ser cierto, esta pantalla miente.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Boton, BotonSecundario } from '../comun/ui';
import { NOMBRE } from '../comun/marca';

function ir(donde: string) {
  window.location.href = donde;
}

// ----------------------------------------------------------------------------
// LO QUE ENTRA CUANDO LLEGA A LA PANTALLA
//
// Un bloque envuelto acá arranca invisible y se revela cuando el scroll lo
// alcanza. No es adorno: es lo que hace que una página larga se lea como un
// recorrido en vez de como un volcado. El usuario baja y la página le va
// contestando.
//
// El observador se desconecta después de la primera vez. Si no, una sección
// que entra y sale de cuadro parpadearía cada vez que uno sube y baja, y eso
// no es diseño: es mareo.
//
// Y si el navegador no tiene IntersectionObserver —uno muy viejo— el bloque se
// muestra de una. Una animación que no se puede correr no puede ser la razón
// por la que alguien no ve la mitad de la página.
// ----------------------------------------------------------------------------
function Aparece({ children, demora = 0 }: { children: ReactNode; demora?: number }) {
  const caja = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        }
      },
      // Un poco adentro del borde: el bloque se revela cuando ya se ve de
      // verdad, no cuando asoma un píxel abajo de todo.
      { rootMargin: '0px 0px -12% 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={caja}
      className={'revelar' + (visible ? ' visible' : '')}
      style={{ animationDelay: `${demora}ms` }}
    >
      {children}
    </div>
  );
}

const icono = 'h-[18px] w-[18px]';

const IconoCalendario = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={icono}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
);
const IconoPlata = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={icono}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);
const IconoGente = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={icono}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" strokeLinecap="round" />
    <path d="M17 11.5a3 3 0 1 0-1.6-5.5M18 20c0-2.2-.7-3.9-1.9-5" strokeLinecap="round" />
  </svg>
);
const IconoReloj = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={icono}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" />
  </svg>
);
const IconoCheck = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={icono}>
    <path d="M4 12.5l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconoCopiar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={icono}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" strokeLinecap="round" />
  </svg>
);

// ----------------------------------------------------------------------------
// LA ONDA QUE SEPARA DOS FRANJAS
//
// La página pasa por cuatro colores: el papel del encabezado, el blanco de los
// dos bloques, el papel otra vez, y el terracota del cierre. Cortados en
// recto, esos cuatro se leen como cuatro pantallas pegadas con cinta. La onda
// los hace pasar de uno al otro.
//
// CÓMO FUNCIONA, QUE NO ES OBVIO.
//
// Hacen falta LOS DOS colores, y esto es lo que se me pasó la primera vez: el
// dibujo se pinta del color que viene, pero la franja donde vive el dibujo
// tiene que llevar el color que termina. Si no, lo que queda alrededor de la
// curva es el fondo de la página, que suele ser uno de los dos, y entonces la
// onda directamente no se ve.
//
// `preserveAspectRatio="none"` la deja estirarse a lo ancho sin importar la
// pantalla: una onda tiene que ocupar todo el ancho siempre, y que se achate o
// se estire no se nota. Y el `-mb-px` tapa la rayita que algunos navegadores
// dejan entre el borde del SVG y lo que sigue, por redondeo.
//
// `espejada` la da vuelta en horizontal, no en vertical. En vertical cambiaría
// de lugar el relleno y la curva apuntaría para el lado equivocado; en
// horizontal es la misma onda con otra cara, que es lo único que se busca:
// que las tres de la página no sean el mismo dibujo tres veces.
// ----------------------------------------------------------------------------
function Onda({
  desde,
  hasta,
  espejada = false,
}: {
  desde: string;   // el color de la franja que termina
  hasta: string;   // el de la que empieza
  espejada?: boolean;
}) {
  return (
    <div aria-hidden="true" className="-mb-px block leading-[0]" style={{ background: desde }}>
      <svg
        viewBox="0 0 1440 110"
        preserveAspectRatio="none"
        className={'block h-14 w-full sm:h-20 ' + (espejada ? 'scale-x-[-1]' : '')}
      >
        <path
          d="M0,42 C180,100 340,4 600,34 C860,64 1040,106 1240,74 C1330,60 1390,44 1440,28 L1440,110 L0,110 Z"
          fill={hasta}
        />
      </svg>
    </div>
  );
}

// Un renglón de un bloque. Ícono, y una frase que entra de una pasada.
function Renglon({ icono: ic, children }: { icono: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-acento">{ic}</span>
      <span className="text-[0.9375rem] leading-snug text-tinta">{children}</span>
    </li>
  );
}

// Uno de los dos bloques. Son gemelos a propósito: nadie es el principal.
function Bloque({
  para,
  titulo,
  children,
  accion,
  adonde,
  primario,
}: {
  para: string;
  titulo: string;
  children: ReactNode;
  accion: string;
  adonde: string;
  primario: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-3xl bg-fondo p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-acento">
          {para}
        </p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-[-0.02em] text-tinta">
          {titulo}
        </h2>
      </div>
      <ul className="flex flex-col gap-3">{children}</ul>
      <div className="mt-1">
        {primario
          ? <Boton onClick={() => ir(adonde)}>{accion}</Boton>
          : <BotonSecundario onClick={() => ir(adonde)}>{accion}</BotonSecundario>}
      </div>
    </div>
  );
}

export default function Inicio() {
  return (
    // ----------------------------------------------------------------------
    // CUATRO FRANJAS, SEPARADAS POR ONDAS
    //
    // Antes era una sola columna sobre un fondo: todo el contenido a la misma
    // distancia del ojo, y la página se terminaba porque se acababa el texto.
    // Ahora pasa por cuatro superficies —papel, blanco, papel, terracota— y
    // cada cambio llega con una onda.
    //
    // La onda no es decoración sola: marca que empieza otra cosa. Por eso van
    // justo donde cambia el color, y no repartidas "cada tanto" para que
    // quede lindo. Una onda entre dos franjas del mismo color no separa nada.
    // ----------------------------------------------------------------------
    <div className="min-h-screen bg-fondo">

      {/* ---------------------------------------------- 1. EL ENCABEZADO */}
      <section className="relative overflow-hidden bg-fondo">
        {/* LAS FORMAS

            Manchas de color muy difuminadas, moviéndose despacio. No dibujan
            nada ni quieren decir nada: le sacan a la página el aire de
            documento. Van en una capa aparte, sin eventos y sin lugar en el
            texto, así que ningún lector de pantalla las anuncia.

            Difuminadas y no nítidas porque una forma nítida compite con el
            título; así quedan como luz y no como objeto. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="flota-a absolute -left-24 -top-28 h-80 w-80 rounded-full bg-acento/25 blur-3xl" />
          <div className="flota-b absolute -right-28 top-16 h-72 w-72 rounded-full bg-ok/20 blur-3xl" />
          <div className="flota-c absolute left-1/4 top-72 h-64 w-64 rounded-full bg-acento/15 blur-3xl" />

          {/* EL CORTE DE ABAJO, QUE SE VEÍA COMO UNA RAYA.

              Las manchas viven adentro de una caja que las recorta, porque si
              no se desbordarían a los costados y aparecería una barra de
              scroll horizontal. Pero recortar un difuminado deja un borde
              recto: justo lo que un difuminado no tiene, y por eso saltaba a
              la vista como una línea cruzando la pantalla.

              Este degradado disuelve el color contra el fondo antes de llegar
              al final de la franja. Donde la caja corta, ya no hay nada que
              cortar. */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-fondo" />
        </div>

        <div className="relative mx-auto w-full max-w-2xl px-5 pb-24 pt-8">
          {/* El encabezado entra escalonado: marca, título, bajada, botones.
              Cada pieza un pelito después que la anterior, así la página se
              arma a la vista en vez de aparecer entera de golpe. */}
          <Aparece>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-acento text-lg font-bold text-sobre-acento shadow-apoyo">
                {NOMBRE.slice(0, 1)}
              </span>
              <span className="text-lg font-bold tracking-tight text-tinta">{NOMBRE}</span>
            </div>
          </Aparece>

          <Aparece demora={120}>
            <h1 className="mt-14 text-pretty text-[2.75rem] font-bold leading-[1] tracking-[-0.04em] text-tinta sm:text-[3.5rem]">
              Tus clases
              <br />
              en orden.
              <br />
              <span className="text-acento">Tu plata también.</span>
            </h1>
          </Aparece>

          <Aparece demora={260}>
            <p className="mt-6 text-pretty text-lg leading-snug text-tenue">
              La app del profe y la de sus alumnos, mirando la misma cuenta.
            </p>
          </Aparece>

          <Aparece demora={380}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Boton onClick={() => ir('/profe')}>Doy clases</Boton>
              <BotonSecundario onClick={() => ir('/alumno')}>Tomo clases</BotonSecundario>
            </div>
          </Aparece>
        </div>
      </section>

      <Onda desde="var(--color-fondo)" hasta="var(--color-panel)" />

      {/* ------------------------------------------------ 2. LOS DOS BLOQUES

          Gemelos: mismo tamaño, misma forma, misma cantidad de renglones. Que
          uno fuera más grande diría que el otro es el invitado. */}
      <section className="bg-panel">
        <div className="mx-auto w-full max-w-2xl px-5 pb-24">
          <Aparece>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-5 [&>*]:flex-1">
              <Bloque
                para="Si das clases"
                titulo="No persigas la plata"
                accion="Entrar como profe"
                adonde="/profe"
                primario
              >
                <Renglon icono={IconoCalendario}>Las clases del mes se crean solas.</Renglon>
                <Renglon icono={IconoPlata}>Los cobros, también.</Renglon>
                <Renglon icono={IconoGente}>Ves quién te debe y desde cuándo.</Renglon>
                <Renglon icono={IconoCheck}>Confirmás una transferencia de un toque.</Renglon>
              </Bloque>

              <Bloque
                para="Si tomás clases"
                titulo="Enterate sin preguntar"
                accion="Entrar como alumno"
                adonde="/alumno"
                primario={false}
              >
                <Renglon icono={IconoReloj}>Cuándo es la próxima y dónde.</Renglon>
                <Renglon icono={IconoCheck}>Qué vimos la clase pasada.</Renglon>
                <Renglon icono={IconoPlata}>Qué debés hoy y qué todavía no.</Renglon>
                <Renglon icono={IconoCopiar}>El alias de tu profe, listo para copiar.</Renglon>
              </Bloque>
            </div>
          </Aparece>
        </div>
      </section>

      <Onda desde="var(--color-panel)" hasta="var(--color-fondo)" espejada />

      {/* -------------------------------------------------- 3. CÓMO ARRANCA

          La objeción real no es si sirve: es cuánto trabajo es ponerla en
          marcha, porque esta persona ya migró datos a algo una vez y le llevó
          un fin de semana. Tres pasos, y ninguno dice "importá". */}
      <section className="bg-fondo">
        <div className="mx-auto w-full max-w-2xl px-5 pb-24">
          <Aparece>
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.02em] text-tinta">
                Arrancar lleva dos minutos
              </h2>

              <ol className="mt-6 flex flex-col gap-4">
                {[
                  ['Creás tu espacio', 'El nombre con el que te conocen.'],
                  ['Cargás un grupo', 'Día, hora y precio.'],
                  ['Anotás a tus alumnos', 'Nombre y correo: con eso les llega su acceso.'],
                ].map(([titulo, bajada], i) => (
                  <li
                    key={titulo}
                    className="anim-entrar flex items-center gap-4 rounded-2xl bg-panel p-5 shadow-apoyo"
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    <span className="plata flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-acento-suave text-base font-bold text-acento">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold leading-snug text-tinta">{titulo}</span>
                      <span className="block text-sm leading-snug text-tenue">{bajada}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-5 text-[0.9375rem] leading-relaxed text-tenue">
                De ahí en más las clases y los cobros van solos. Vos tomás asistencia.
              </p>
            </div>
          </Aparece>
        </div>
      </section>

      <Onda desde="var(--color-fondo)" hasta="var(--color-acento)" />

      {/* ------------------------------------------------------ 4. EL CIERRE

          Repite los dos accesos: quien llegó hasta acá scrolleando no va a
          volver arriba a buscarlos. Y es la única superficie de todo el
          producto donde el acento ocupa una pantalla entera — funciona porque
          es lo último: cierra la página con color en vez de desvanecerse. */}
      <section className="bg-acento">
        <div className="mx-auto w-full max-w-2xl px-5 pb-14 text-center">
          <Aparece>
            <div>
              <p className="text-pretty text-3xl font-bold leading-tight tracking-[-0.03em] text-sobre-acento">
                Probala con un grupo
              </p>
              <p className="mx-auto mt-3 max-w-sm text-[0.9375rem] leading-snug text-sobre-acento/80">
                No hay que migrar nada ni avisarle a nadie.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => ir('/profe')}
                  className="min-h-11 rounded-xl bg-sobre-acento px-5 py-2.5 font-medium text-acento transition active:scale-[0.97]"
                >
                  Doy clases
                </button>
                <button
                  type="button"
                  onClick={() => ir('/alumno')}
                  className="min-h-11 rounded-xl border border-sobre-acento/40 px-5 py-2.5 font-medium text-sobre-acento transition hover:bg-sobre-acento/10 active:scale-[0.97]"
                >
                  Tomo clases
                </button>
              </div>
            </div>
          </Aparece>

          <p className="mt-14 text-xs text-sobre-acento/60">
            {NOMBRE} · hecho en Buenos Aires
          </p>
        </div>
      </section>
    </div>
  );
}
