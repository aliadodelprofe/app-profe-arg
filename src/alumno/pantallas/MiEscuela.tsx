// ============================================================================
// Lo que ve el alumno: sus clases y su cuenta.
//
// El recap va arriba de todo a propósito. Es el motivo por el que un alumno
// abre la app: quiere acordarse de las figuras que vio. El estado de cuenta
// es importante para el profesor, no para el alumno — ponerlo primero sería
// recibirlo con una factura.
// ============================================================================
import { Fragment, useState } from 'react';
import type { FormEvent } from 'react';
import {
  misClases, misCargos, miSaldo, misPagos, declararPago,
  subirComprobante, COMPROBANTE_MAX_MB, misArreglos, misMediosDePago,
} from '../datos';
import type {
  MiFicha, MiClase, MiCargo, MiPago, MiSaldo, MiArreglo, DondeTransferir as TipoDestino,
} from '../datos';
import type { Pestana } from '../../comun/ui';
import { fecha, plata, hoyISO, linkMapaDe, mesDeCorte, porMes } from '../formato';
import {
  Marco, Aviso, Vacio, Tarjeta, useCarga, Campo, Texto, Boton, BotonSecundario,
  Titulo, Seccion, Navegacion, IconoClases, IconoCobros, Hoja, Esqueleto, Avatar,
  Lista, Fila, Segmentos, ChipFecha, Etiqueta, CorteDeMes, Dato, CopiarDato,
} from '../../comun/ui';
import ComoPago from './ComoPago';
import Perfil from './Perfil';

export default function MiEscuela({
  ficha,
  alCambiarPerfil,
  alCambiarEscuela,
}: {
  ficha: MiFicha;
  alCambiarPerfil?: () => void;
  // Solo viene cuando la persona cursa en más de una escuela. Vive en el menú
  // del perfil, que es donde ya está su foto: cambiar de escuela es cambiar de
  // contexto, no una acción de esta pantalla.
  alCambiarEscuela?: () => void;
}) {
  const clases = useCarga(() => misClases(ficha.tenant_id), [ficha.tenant_id]);
  const cargos = useCarga(() => misCargos(ficha.tenant_id), [ficha.tenant_id]);
  const saldo = useCarga(() => miSaldo(ficha.tenant_id), [ficha.tenant_id]);
  const pagos = useCarga(() => misPagos(ficha.tenant_id), [ficha.tenant_id]);
  const arreglos = useCarga(() => misArreglos(ficha.tenant_id), [ficha.tenant_id]);
  const destinos = useCarga(() => misMediosDePago(ficha.tenant_id), [ficha.tenant_id]);
  // Dos pestañas y no cinco secciones apiladas. El alumno abre la app por una
  // de dos razones muy distintas —ver qué viene y repasar lo que vio, o mirar
  // cómo está de plata— y antes tenía que recorrer una página larga para
  // llegar a cualquiera de las dos.
  type Tab = 'clases' | 'cuenta' | 'perfil';
  const [tab, setTab] = useState<Tab>('clases');
  const escuela = ficha.escuela?.name ?? 'Mis clases';

  const pestanas: Pestana<Tab>[] = [
    { id: 'clases', texto: 'Clases', icono: IconoClases },
    { id: 'cuenta', texto: 'Mi cuenta', icono: IconoCobros },
    // En vez del muñequito genérico, su propia cara. Es la señal más clara
    // de "acá estoy yo", y de paso saca del encabezado la foto que antes
    // quedaba suelta al lado del nombre de la escuela.
    {
      id: 'perfil',
      texto: 'Perfil',
      icono: <Avatar nombre={ficha.full_name} foto={ficha.avatar_url} tam="nav" />,
    },
  ];

  return (
    <>
      <Navegacion<Tab> activa={tab} alElegir={setTab} pestanas={pestanas} />

      <Marco conBarra>
      {/* A la izquierda la escuela, a la derecha vos. Antes estaban las dos
          caras del mismo lado: al lado del nombre de la escuela iba la foto
          DEL ALUMNO, y abajo la misma foto otra vez en el perfil.

          Y como la escuela está a la izquierda, tocarla es cambiar de
          escuela. Es donde lo busca cualquiera que haya usado una app con
          varias cuentas: se toca el lugar que dice dónde estás parado. */}
      <div className="mb-4 flex items-center gap-3">
        {alCambiarEscuela ? (
          <button
            onClick={alCambiarEscuela}
            className="flex min-w-0 items-center gap-3 rounded-xl text-left transition active:opacity-70"
          >
            <Avatar nombre={escuela} foto={ficha.escuela?.avatar_url} />
            <div className="min-w-0">
              <Titulo>{escuela}</Titulo>
              <p className="truncate text-xs text-tenue">tocá para cambiar de escuela</p>
            </div>
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar nombre={escuela} foto={ficha.escuela?.avatar_url} />
            <div className="min-w-0">
              <Titulo>{escuela}</Titulo>
              {ficha.escuela?.discipline && (
                <p className="truncate text-sm text-tenue">{ficha.escuela.discipline}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {tab === 'clases' && (
        <MisClases
          clases={clases.datos}
          error={clases.error}
        />
      )}

      {tab === 'perfil' && (
        <Perfil ficha={ficha} alGuardar={() => alCambiarPerfil?.()} />
      )}

      {tab === 'cuenta' && (
        <MiCuenta
          ficha={ficha}
          saldo={saldo.datos}
          errorSaldo={saldo.error}
          cargos={cargos.datos}
          pagos={pagos.datos}
          arreglos={arreglos.datos ?? []}
          errorArreglos={arreglos.error}
          destinos={destinos.datos ?? []}
          alCambiarArreglo={() => {
            arreglos.recargar();
            cargos.recargar();
            saldo.recargar();
          }}
          alAvisar={() => {
            pagos.recargar();
            saldo.recargar();
          }}
        />
      )}

    </Marco>
    </>
  );
}

// ----------------------------------------------------------------------------
// Avisar una transferencia.
//
// No cobra nada ni mueve plata: deja anotado que el alumno dice haber
// transferido, y el profesor lo confirma. Es el paso que hoy es una captura de
// pantalla por WhatsApp.
// ----------------------------------------------------------------------------
function FormularioAviso({
  ficha,
  destinos,
  sugerido,
  alCerrar,
  alAvisar,
}: {
  ficha: MiFicha;
  destinos: TipoDestino[];
  sugerido: number;
  alCerrar: () => void;
  alAvisar: () => void;
}) {
  const [monto, setMonto] = useState(sugerido > 0 ? String(sugerido) : '');
  const [cuando, setCuando] = useState(hoyISO());
  const [nota, setNota] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const falta = sugerido > 0 && Number(monto) > 0 && Number(monto) < sugerido;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      // Primero el archivo y después el aviso: si el archivo falla, no queda
      // un aviso diciendo que hay comprobante cuando no lo hay.
      let comprobante: string | null = null;
      if (archivo) {
        comprobante = await subirComprobante(archivo, ficha.tenant_id, ficha.id);
      }
      await declararPago({
        tenant_id: ficha.tenant_id,
        student_id: ficha.id,
        amount: Number(monto),
        paid_on: cuando || null,
        note: nota.trim() || null,
        receipt_url: comprobante,
      });
      alAvisar();
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="flex flex-col gap-3"
    >
      {/* Los datos para transferir viven ACÁ y en ningún otro lado. Estuvieron
          un rato también como sección suelta en "Mi cuenta", y era ruido: un
          alias no se consulta, se usa en un único momento. Ese momento es
          este — el alumno abre esta hoja para avisar que pagó y, si todavía no
          pagó, acá tiene el alias para hacerlo sin cerrar nada. */}
      {destinos.map((d) => (
        <div
          key={d.id}
          className="flex flex-col gap-2 rounded-xl border border-linea bg-campo/50 p-3"
        >
          <p className="text-sm text-tenue">
            Transferile a <span className="text-tinta">{d.holder}</span>
            {d.bank ? ` · ${d.bank}` : ''}
          </p>
          {d.alias && <CopiarDato etiqueta="Alias" valor={d.alias} />}
          {d.cbu && <CopiarDato etiqueta="CBU / CVU" valor={d.cbu} />}
          {d.note && <p className="text-sm text-tenue">{d.note}</p>}
        </div>
      ))}

      <Campo etiqueta="Cuánto">
        <Texto
          type="number" min="1" step="any" required value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
      </Campo>

      <Campo etiqueta="Cuándo">
        <Texto type="date" value={cuando} onChange={(e) => setCuando(e.target.value)} />
      </Campo>

      {falta && (
        <p className="rounded-lg border border-linea px-3 py-2 text-xs text-tenue">
          Estás avisando menos de lo que debés. Está bien si es una seña o un pago
          parcial — se va a descontar de lo que debés y el resto queda pendiente.
        </p>
      )}

      {/* Este campo NO va dentro de <Campo>, a diferencia de todos los demás.
          Campo envuelve a sus hijos en un <label>, y un campo de archivo
          adentro de su propio label se rompe: el clic abre el selector y el
          label le reenvía un segundo clic al mismo input, que lo cierra en el
          acto. Parece que el botón no hace nada. */}
      <div className="flex flex-col gap-1">
        <span className="text-sm text-tenue">Comprobante (opcional)</span>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > COMPROBANTE_MAX_MB * 1024 * 1024) {
              setError(`El archivo pesa más de ${COMPROBANTE_MAX_MB} MB. Probá con una foto más chica.`);
              setArchivo(null);
              e.target.value = '';
              return;
            }
            setError(null);
            setArchivo(f);
          }}
          className="w-full rounded-lg border border-linea bg-campo px-3 py-2 text-sm text-tinta file:mr-3 file:rounded file:border-0 file:bg-acento file:px-3 file:py-1 file:text-sobre-acento"
        />
        <span className="text-xs text-tenue/70">
          Una foto o el PDF del banco. Hasta {COMPROBANTE_MAX_MB} MB.
        </span>
        {archivo && (
          <span className="text-xs text-acento">{archivo.name}</span>
        )}
      </div>

      <Campo etiqueta="Algo que quieras aclarar (opcional)">
        <Texto
          value={nota} placeholder="Transferencia desde Mercado Pago"
          onChange={(e) => setNota(e.target.value)}
        />
      </Campo>

      {error && <Aviso>{error}</Aviso>}

      <p className="text-xs text-tenue">
        Esto le avisa a tu profe. Tu cuenta se actualiza cuando él lo confirme.
      </p>

      <div className="flex gap-2">
        <Boton type="submit" disabled={enviando}>
          {enviando ? (archivo ? 'Subiendo…' : 'Avisando…') : 'Avisar'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------------------
// MI CUENTA
//
// Antes esto eran cinco bloques apilados, cada uno con su propia caja: la
// tarjeta de "cómo pago" con los dos precios y un botón, el recuadro del
// saldo, una tarjeta por cada cargo, el botón de avisar y una tarjeta por cada
// pago. Todo cajas, todas del mismo peso: nada se destacaba y encontrar algo
// era recorrer la página entera.
//
// Ahora hay UNA caja y tres listas, en el orden de las preguntas que trae al
// alumno acá:
//
//   1. ¿Cuánto debo? — el número grande, con el botón de avisar adentro.
//      Pregunta y acción en el mismo bloque: si debe, lo que sigue es avisar
//      que transfirió.
//   2. ¿Por qué? — los cargos pendientes, en una lista plana.
//   3. ¿Qué pagué? — el historial, de a cinco.
//   4. ¿Cómo pago? — abajo del todo, porque es una decisión que se toma una
//      vez cada varios meses, no algo que se consulte. Cada grupo es un
//      renglón; el detalle y el cambio se abren tocándolo.
// ----------------------------------------------------------------------------
const PAGOS_DE_A = 5;

function MiCuenta({
  ficha,
  saldo,
  errorSaldo,
  cargos,
  pagos,
  arreglos,
  errorArreglos,
  destinos,
  alCambiarArreglo,
  alAvisar,
}: {
  ficha: MiFicha;
  saldo: MiSaldo | null;
  errorSaldo: string | null;
  cargos: MiCargo[] | null;
  pagos: MiPago[] | null;
  arreglos: MiArreglo[];
  errorArreglos: string | null;
  destinos: TipoDestino[];
  alCambiarArreglo: () => void;
  alAvisar: () => void;
}) {
  const [declarando, setDeclarando] = useState(false);
  const [cuantosPagos, setCuantosPagos] = useState(PAGOS_DE_A);

  const declarados = pagos?.filter((p) => p.status === 'declared') ?? [];
  const totalDeclarado = declarados.reduce((s, p) => s + p.amount, 0);

  // Lo que ya está confirmado, del más nuevo al más viejo. Es la respuesta a
  // "¿yo no había pagado marzo?", que hasta ahora la app no podía dar.
  const confirmados = (pagos?.filter((p) => p.status === 'confirmed') ?? [])
    .map((p) => ({ ...p, cuando: p.paid_on ?? p.confirmed_at?.slice(0, 10) ?? p.declared_at.slice(0, 10) }))
    .sort((a, b) => (a.cuando < b.cuando ? 1 : -1));

  const pendientes = (cargos ?? []).filter((c) => c.pagado < c.amount);

  return (
    <>
      {errorSaldo && <div className="mb-4"><Aviso>{errorSaldo}</Aviso></div>}

      {/* ------------------------------------------------------ el número */}
      <Dato
        valor={
          saldo === null
            ? '…'
            : saldo.debe > 0
              ? plata(saldo.debe)
              : saldo.aFavor > 0
                ? plata(saldo.aFavor)
                : 'Al día'
        }
        al={
          saldo === null
            ? ''
            : saldo.debe > 0
              ? 'es lo que debés'
              : saldo.aFavor > 0
                ? 'tenés a favor: se va a descontar de lo que venga'
                : 'no debés nada'
        }
        tono={saldo === null ? 'normal' : saldo.debe > 0 ? 'alerta' : 'ok'}
      >
        {declarados.length > 0 && (
          <p className="mt-2 text-sm text-acento">
            Avisaste {plata(totalDeclarado)}. Tu profe lo tiene que confirmar.
          </p>
        )}
        <div className="mt-4">
          <Boton onClick={() => setDeclarando(true)}>Ya transferí</Boton>
        </div>
      </Dato>

      {declarando && (
        <Hoja titulo="Avisar que transferí" alCerrar={() => setDeclarando(false)}>
          <FormularioAviso
            ficha={ficha}
            destinos={destinos}
            sugerido={saldo?.debe ?? 0}
            alCerrar={() => setDeclarando(false)}
            alAvisar={() => { setDeclarando(false); alAvisar(); }}
          />
        </Hoja>
      )}

      {/* --------------------------------------------------- qué falta pagar */}
      {pendientes.length > 0 && (
        <>
          <Seccion acotacion={`${pendientes.length} ${pendientes.length === 1 ? 'cargo' : 'cargos'}`}>
            Qué te falta pagar
          </Seccion>
          <Lista>
            {pendientes.map((c) => (
              <Fila
                key={c.id}
                titulo={c.concept}
                detalle={
                  c.pagado > 0
                    ? `pagaste ${plata(c.pagado)} · falta ${plata(c.amount - c.pagado)}` +
                      (c.due_date ? ` · vence el ${fecha(c.due_date)}` : '')
                    : c.due_date
                      ? `vence el ${fecha(c.due_date)}`
                      : null
                }
                valor={plata(c.amount - c.pagado)}
              />
            ))}
          </Lista>
        </>
      )}

      {/* ------------------------------------------------------ lo que pagué */}
      {confirmados.length > 0 && (
        <>
          <Seccion>Lo que pagaste</Seccion>
          <Lista>
            {confirmados.slice(0, cuantosPagos).map((p) => (
              <Fila
                key={p.id}
                principal={<ChipFecha iso={p.cuando} />}
                titulo={plata(p.amount)}
                detalle={p.note}
                bajoValor="confirmado"
              />
            ))}
          </Lista>
          {confirmados.length > cuantosPagos && (
            <div className="mt-3 flex justify-center">
              <BotonSecundario
                type="button"
                onClick={() => setCuantosPagos((n) => n + PAGOS_DE_A)}
              >
                Ver {Math.min(PAGOS_DE_A, confirmados.length - cuantosPagos)} más
              </BotonSecundario>
            </div>
          )}
        </>
      )}

      {/* --------------------------------------------------------- cómo pago */}
      {errorArreglos && <div className="mt-6"><Aviso>{errorArreglos}</Aviso></div>}
      <ComoPago arreglos={arreglos} alCambiar={alCambiarArreglo} />
    </>
  );
}

// ----------------------------------------------------------------------------
// LAS CLASES DEL ALUMNO
//
// Antes esto eran dos listas infinitas, una abajo de la otra: todas las clases
// que vienen y todas las que pasaron. Con un grupo semanal eso son cuarenta
// renglones iguales en los que no hay dónde apoyar la vista, y lo que el
// alumno realmente venía a buscar —cuándo es la próxima, qué vimos la última
// vez— quedaba enterrado.
//
// Ahora hay tres cosas, en el orden en que se necesitan:
//
//   1. La próxima clase, sola y grande. Es la pregunta que trae al alumno a
//      la app. Si la contesta de un vistazo, no hace falta que lea nada más.
//   2. Dos solapas, no dos listas apiladas: "Próximas" y "Ya vimos".
//   3. Filas cortas con el chip de fecha adelante, de a ocho. El detalle
//      completo —la dirección, el mapa, el resumen de lo que se vio— se abre
//      tocando la fila, en una hoja. Una lista se recorre; un detalle se mira.
// ----------------------------------------------------------------------------
const DE_A = 8;

function MisClases({
  clases,
  error,
}: {
  clases: MiClase[] | null;
  error: string | null;
}) {
  type Cual = 'proximas' | 'vimos';
  const [cual, setCual] = useState<Cual>('proximas');
  const [limite, setLimite] = useState(DE_A);
  const [abierta, setAbierta] = useState<MiClase | null>(null);

  const hoy = hoyISO();
  // La base las trae de la más nueva a la más vieja. Las que vienen hay que
  // darlas vuelta: lo primero que se busca es lo más cercano.
  const proximas = (clases ?? []).filter((c) => c.date >= hoy).reverse();
  const vimos = (clases ?? []).filter((c) => c.date < hoy);
  const lista = cual === 'proximas' ? proximas : vimos;

  // La próxima de verdad: una clase cancelada no es la próxima clase.
  const proxima = proximas.find((c) => c.status !== 'cancelled') ?? null;

  // Lo que efectivamente se dibuja, ya cortado por mes.
  const tramos = porMes(lista.slice(0, limite), (c) => c.date);

  function elegir(c: Cual) {
    setCual(c);
    setLimite(DE_A);
  }

  if (error) return <Aviso>{error}</Aviso>;
  if (!clases) return <Esqueleto />;
  if (clases.length === 0) return <Vacio>No hay clases cargadas todavía.</Vacio>;

  return (
    <>
      {proxima && (
        <button
          onClick={() => setAbierta(proxima)}
          className="anim-aparecer mb-5 w-full rounded-2xl border border-acento/30 bg-acento/5 px-5 py-4 text-left transition active:scale-[0.99]"
        >
          <p className="text-xs uppercase tracking-wide text-acento">Tu próxima clase</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-tinta">
            {diaLargo(proxima.date)}
            {proxima.start_time ? ` · ${proxima.start_time.slice(0, 5)}` : ''}
          </p>
          <p className="mt-0.5 truncate text-sm text-tenue">
            {proxima.grupo?.name ?? 'Clase'}
            {lugarDe(proxima) ? ` · ${lugarDe(proxima)}` : ''}
          </p>
        </button>
      )}

      <Segmentos<Cual>
        valor={cual}
        alElegir={elegir}
        opciones={[
          { id: 'proximas', texto: 'Próximas', cuantos: proximas.length },
          { id: 'vimos', texto: 'Ya vimos', cuantos: vimos.length },
        ]}
      />

      {lista.length === 0 && (
        <Vacio>
          {cual === 'proximas'
            ? 'No hay clases cargadas para adelante.'
            : 'Todavía no pasó ninguna clase.'}
        </Vacio>
      )}

      {lista.length > 0 && (
        <Lista>
          {tramos.map((t) => (
            <Fragment key={t.mes}>
              {/* El corte aparece solo si hay más de un mes a la vista. Un
                  encabezado "octubre" arriba de una lista que es toda de
                  octubre no separa nada: es un renglón más. */}
              {tramos.length > 1 && (
                <CorteDeMes bajoBarra cuantas={t.items.length}>
                  {mesDeCorte(t.mes, hoy)}
                </CorteDeMes>
              )}
              {t.items.map((c) => {
                const cancelada = c.status === 'cancelled';
                return (
                  <Fila
                    key={c.id}
                    principal={<ChipFecha iso={c.date} apagado={cancelada} />}
                    titulo={
                      <span className={cancelada ? 'line-through opacity-60' : undefined}>
                        {cual === 'vimos' ? (c.title ?? c.grupo?.name ?? 'Clase') : (c.grupo?.name ?? 'Clase')}
                      </span>
                    }
                    detalle={
                      cancelada
                        ? 'cancelada'
                        : cual === 'vimos'
                          ? (c.recap ?? 'sin resumen todavía')
                          : lugarDe(c)
                    }
                    valor={c.start_time ? c.start_time.slice(0, 5) : undefined}
                    alTocar={() => setAbierta(c)}
                  />
                );
              })}
            </Fragment>
          ))}
        </Lista>
      )}

      {lista.length > limite && (
        <div className="mt-3 flex justify-center">
          <BotonSecundario type="button" onClick={() => setLimite((n) => n + DE_A)}>
            Ver {Math.min(DE_A, lista.length - limite)} más
          </BotonSecundario>
        </div>
      )}

      {abierta && (
        <Hoja titulo={abierta.grupo?.name ?? 'Clase'} alCerrar={() => setAbierta(null)}>
          <DetalleClase clase={abierta} />
        </Hoja>
      )}
    </>
  );
}

// El lugar de una clase: el suyo si lo tiene, si no el del grupo.
function lugarDe(c: MiClase): string | null {
  return c.venue ?? c.grupo?.venue ?? null;
}

function direccionDe(c: MiClase): string | null {
  return c.address ?? c.grupo?.address ?? null;
}

// 'jueves 23 de octubre'. En la tarjeta de la próxima clase la fecha se lee,
// no se compara: ahí el día de la semana vale más que el número.
const DIA_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function diaLargo(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIA_LARGO[dow]} ${d} de ${MES_LARGO[m - 1]}`;
}

// ----------------------------------------------------------------------------
// El detalle de una clase. Lo que antes estaba desparramado en cada renglón de
// la lista —el lugar, el mapa, el resumen— vive acá, donde hay lugar para
// mostrarlo entero sin que la lista deje de ser una lista.
// ----------------------------------------------------------------------------
function DetalleClase({ clase }: { clase: MiClase }) {
  const venue = lugarDe(clase);
  const address = direccionDe(clase);
  const cancelada = clase.status === 'cancelled';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold tracking-tight text-tinta">
            {diaLargo(clase.date)}
          </p>
          {cancelada && <Etiqueta>cancelada</Etiqueta>}
        </div>
        <p className="mt-0.5 text-sm text-tenue">
          {fecha(clase.date)}
          {clase.start_time ? ` · ${clase.start_time.slice(0, 5)}` : ''}
        </p>
      </div>

      {(venue || address) && (
        <div>
          <p className="text-sm text-tenue">Dónde</p>
          {venue && <p className="text-tinta">{venue}</p>}
          {address && (
            <a
              href={linkMapaDe(address)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-acento underline"
            >
              cómo llegar
            </a>
          )}
        </div>
      )}

      <div>
        <p className="text-sm text-tenue">Lo que vimos</p>
        {clase.recap
          ? <p className="whitespace-pre-wrap text-tinta">{clase.recap}</p>
          : <p className="text-tenue/60">Todavía no hay resumen de esta clase.</p>}
      </div>
    </div>
  );
}
