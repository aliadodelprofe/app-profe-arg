// ============================================================================
// LA PUERTA DE ENTRADA
//
// Lo que ve alguien que llega sin saber qué es esto. Hasta ahora la raíz
// servía la app de la comunidad —otro producto, contra otra base— y eso no era
// solo desprolijo: cualquier redirección de autenticación que se cayera al
// destino de respaldo dejaba al usuario adentro del producto equivocado.
//
// QUÉ DICE Y QUÉ NO DICE.
//
// Acá no se promete nada que la app no haga hoy. Ni "crecé tu academia", ni
// "la plataforma líder", ni funciones que están en la lista de pendientes. Lo
// único que se cuenta es lo que efectivamente pasa cuando alguien la usa, y
// con el detalle suficiente para que un profesor reconozca su propio problema
// en la descripción. Un profesor independiente ya probó tres herramientas que
// prometían de más; lo que lo convence no es el entusiasmo, es que alguien le
// describa bien el lío que tiene.
// ============================================================================
import { Marca, Boton, BotonSecundario } from '../comun/ui';
import { NOMBRE } from '../comun/marca';

function ir(donde: string) {
  window.location.href = donde;
}

// Un bloque de los que explican. Ícono, qué pasa, y por qué importa.
function Punto({
  icono,
  titulo,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acento-suave text-acento">
        {icono}
      </span>
      <h3 className="text-lg font-bold tracking-[-0.01em] text-tinta">{titulo}</h3>
      <p className="text-[0.9375rem] leading-relaxed text-tenue">{children}</p>
    </div>
  );
}

// Un paso del "cómo es". El número pesa: es lo que hace que se lea como una
// secuencia corta y no como otra lista de características.
function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="plata shrink-0 text-2xl font-bold leading-none text-acento/35">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-tinta">{titulo}</h3>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-tenue">{children}</p>
      </div>
    </div>
  );
}

const icono = 'h-5 w-5';

export default function Inicio() {
  return (
    <div className="min-h-screen bg-fondo">
      <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-7">
        <Marca />

        {/* --------------------------------------------------------------
            LO PRIMERO, Y EN UNA FRASE

            La tentación es abrir con lo que la app ES ("una plataforma de
            gestión para…"). A nadie le duele no tener una plataforma de
            gestión: le duele estar persiguiendo plata por WhatsApp. Así que
            se abre por el dolor y no por la categoría.
           -------------------------------------------------------------- */}
        <h1 className="mt-8 text-pretty text-[2.5rem] font-bold leading-[1.05] tracking-[-0.035em] text-tinta sm:text-[3rem]">
          Dejá de perseguir
          <br />
          la plata por WhatsApp
        </h1>

        <p className="mt-5 text-pretty text-lg leading-relaxed text-tenue">
          {NOMBRE} lleva las cuentas de tus clases: quién te debe, cuánto, y desde
          cuándo. Tus alumnos ven lo mismo que vos, así que no hace falta que se
          lo recuerdes.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Boton onClick={() => ir('/profe')}>Doy clases</Boton>
          <BotonSecundario onClick={() => ir('/alumno')}>Soy alumno</BotonSecundario>
        </div>

        <p className="mt-3 text-sm text-tenue">
          Si ya tenés cuenta, cualquiera de los dos te lleva a entrar.
        </p>

        {/* --------------------------------------------------------------
            QUÉ HACE, EN TRES COSAS QUE PASAN SOLAS

            Las tres son automatismos reales de la app, no promesas: las
            clases las crea asegurar_clases(), los cargos asegurar_cargos(),
            y el estado de cuenta sale de student_account. Si algún día una
            de las tres deja de ser cierta, esta pantalla miente.
           -------------------------------------------------------------- */}
        <div className="mt-16 border-t border-linea pt-12">
          <h2 className="mb-8 text-2xl font-bold tracking-[-0.02em] text-tinta">
            Tres cosas que dejás de hacer
          </h2>

          <div className="flex flex-col gap-10">
            <Punto
              titulo="Cargar las clases del mes"
              icono={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={icono}>
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
                </svg>
              }
            >
              Decís que tu grupo es los martes de 20 a 21:30 y las clases aparecen
              solas, hasta fin del mes que viene. Si una no se da, la cancelás y
              no vuelve. Si el grupo es martes y jueves, o un martes por medio,
              también.
            </Punto>

            <Punto
              titulo="Acordarte de quién pagó"
              icono={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={icono}>
                  <rect x="2.5" y="6" width="19" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              }
            >
              Cada alumno elige si paga por clase o por mes, y los cargos se generan
              con ese arreglo. Cuando alguien transfiere, te avisa desde su app con
              el comprobante: vos confirmás de un toque y la cuenta se acomoda sola,
              incluso si pagó de más.
            </Punto>

            <Punto
              titulo="Mandar el recordatorio incómodo"
              icono={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={icono}>
                  <path d="M12 3a6 6 0 0 0-6 6c0 4-1.5 5.5-1.5 5.5h15S18 13 18 9a6 6 0 0 0-6-6z" strokeLinejoin="round" />
                  <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
                </svg>
              }
            >
              Tu alumno entra con su correo y ve lo mismo que vos: qué debe, qué
              vence hoy y qué todavía no venció. Y ve adónde transferirte, con el
              alias y el CBU listos para copiar.
            </Punto>
          </div>
        </div>

        {/* --------------------------------------------------------------
            CÓMO EMPIEZA, QUE ES LA OBJECIÓN REAL

            Nadie duda de que la app sirva: duda de cuánto trabajo es ponerla
            en marcha, porque ya migró datos a algo una vez y le llevó un fin
            de semana. Tres pasos, y ninguno es "importá tu base de datos".
           -------------------------------------------------------------- */}
        <div className="mt-16 border-t border-linea pt-12">
          <h2 className="mb-8 text-2xl font-bold tracking-[-0.02em] text-tinta">
            Cómo arranca
          </h2>

          <div className="flex flex-col gap-7">
            <Paso n={1} titulo="Creás tu espacio">
              El nombre con el que te conocen tus alumnos, qué enseñás y, si querés,
              tu logo. Dos minutos.
            </Paso>
            <Paso n={2} titulo="Cargás un grupo y sus alumnos">
              El día, la hora y el precio. De cada alumno, el nombre y el correo:
              con eso le llega su acceso.
            </Paso>
            <Paso n={3} titulo="Listo">
              Las clases y los cargos ya se generan solos. Vos tomás asistencia y
              confirmás las transferencias que te avisen.
            </Paso>
          </div>
        </div>

        {/* --------------------------------------------------------------
            EL CIERRE

            Repite los dos accesos porque quien llegó hasta acá scrolleando no
            va a volver arriba a buscarlos.
           -------------------------------------------------------------- */}
        <div className="mt-16 border-t border-linea pt-12">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-tinta">
            Empezá cuando quieras
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-tenue">
            No hace falta migrar nada ni avisarle a nadie. Cargá un grupo, mirá
            cómo queda, y si no te sirve lo dejás.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Boton onClick={() => ir('/profe')}>Doy clases</Boton>
            <BotonSecundario onClick={() => ir('/alumno')}>Soy alumno</BotonSecundario>
          </div>
        </div>

        <p className="mt-16 border-t border-linea pt-6 text-xs text-tenue">
          {NOMBRE} · hecho en Buenos Aires
        </p>
      </div>
    </div>
  );
}
