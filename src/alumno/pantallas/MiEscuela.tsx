// ============================================================================
// Lo que ve el alumno: sus clases y su cuenta.
//
// El recap va arriba de todo a propósito. Es el motivo por el que un alumno
// abre la app: quiere acordarse de las figuras que vio. El estado de cuenta
// es importante para el profesor, no para el alumno — ponerlo primero sería
// recibirlo con una factura.
// ============================================================================
import { Fragment, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  misClases, misCargos, miSaldo, misPagos, declararPago,
  subirComprobante, COMPROBANTE_MAX_MB, misArreglos,
} from '../datos';
import type { MiFicha, MiClase } from '../datos';
import type { Pestana } from '../../comun/ui';
import { fecha, plata, hoyISO, linkMapaDe, mesDeCorte, porMes } from '../formato';
import {
  Marco, Aviso, Vacio, Tarjeta, useCarga, Campo, Texto, Boton, BotonSecundario,
  Titulo, Seccion, Navegacion, IconoClases, IconoCobros, Hoja, Esqueleto, Avatar,
  Lista, Fila, Segmentos, ChipFecha, Etiqueta, CorteDeMes,
} from '../../comun/ui';
import ComoPago from './ComoPago';
import MiPerfil from './MiPerfil';
import { supabase } from '../../lib/supabase';
import { fotoDeGoogle } from '../datos';
import Salir from './Salir';

export default function MiEscuela({
  ficha,
  derecha,
  alCambiarPerfil,
}: {
  ficha: MiFicha;
  derecha?: React.ReactNode;
  alCambiarPerfil?: () => void;
}) {
  const clases = useCarga(() => misClases(ficha.tenant_id), [ficha.tenant_id]);
  const cargos = useCarga(() => misCargos(ficha.tenant_id), [ficha.tenant_id]);
  const saldo = useCarga(() => miSaldo(ficha.tenant_id), [ficha.tenant_id]);
  const pagos = useCarga(() => misPagos(ficha.tenant_id), [ficha.tenant_id]);
  const arreglos = useCarga(() => misArreglos(ficha.tenant_id), [ficha.tenant_id]);
  const [declarando, setDeclarando] = useState(false);
  // Dos pestañas y no cinco secciones apiladas. El alumno abre la app por una
  // de dos razones muy distintas —ver qué viene y repasar lo que vio, o mirar
  // cómo está de plata— y antes tenía que recorrer una página larga para
  // llegar a cualquiera de las dos.
  type Tab = 'clases' | 'cuenta';
  const [tab, setTab] = useState<Tab>('clases');
  const [perfil, setPerfil] = useState(false);
  const [fotoGoogle, setFotoGoogle] = useState<string | null>(null);

  // La foto que Google ya tiene, para poder ofrecerla con un toque.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setFotoGoogle(fotoDeGoogle(data.user));
    });
  }, []);

  const pestanas: Pestana<Tab>[] = [
    { id: 'clases', texto: 'Clases', icono: IconoClases },
    { id: 'cuenta', texto: 'Mi cuenta', icono: IconoCobros },
  ];

  const declarados = pagos.datos?.filter((p) => p.status === 'declared') ?? [];
  // Lo que ya está confirmado, del más nuevo al más viejo. Es la respuesta a
  // "¿yo no había pagado marzo?", que hasta ahora la app no podía dar.
  const confirmados = (pagos.datos?.filter((p) => p.status === 'confirmed') ?? [])
    .map((p) => ({ ...p, cuando: p.paid_on ?? p.confirmed_at?.slice(0, 10) ?? p.declared_at.slice(0, 10) }))
    .sort((a, b) => (a.cuando < b.cuando ? 1 : -1));

  return (
    <>
      <Navegacion<Tab> activa={tab} alElegir={setTab} pestanas={pestanas} />

      <Marco conBarra>
      {/* La foto es el botón del perfil. Es dónde la busca cualquiera que
          haya usado una app en los últimos diez años. */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          onClick={() => setPerfil(true)}
          className="flex min-w-0 items-center gap-3 rounded-xl text-left transition active:opacity-70"
        >
          <Avatar nombre={ficha.full_name} foto={ficha.avatar_url} />
          <div className="min-w-0">
            <Titulo>{ficha.escuela?.name ?? 'Mis clases'}</Titulo>
            <p className="truncate text-sm text-tenue">{ficha.full_name}</p>
          </div>
        </button>
        {derecha ?? <Salir />}
      </div>

      {perfil && (
        <Hoja titulo="Mi perfil" alCerrar={() => setPerfil(false)}>
          <MiPerfil
            ficha={ficha}
            fotoSugerida={fotoGoogle}
            alCerrar={() => setPerfil(false)}
            alGuardar={() => { setPerfil(false); alCambiarPerfil?.(); }}
          />
        </Hoja>
      )}

      {tab === 'clases' && (
        <MisClases
          clases={clases.datos}
          error={clases.error}
        />
      )}

      {tab === 'cuenta' && (
        <>

      {/* --------------------------------------------------------- cómo pago */}
      {arreglos.error && <Aviso>{arreglos.error}</Aviso>}
      <ComoPago
        arreglos={arreglos.datos ?? []}
        alCambiar={() => {
          arreglos.recargar();
          cargos.recargar();
          saldo.recargar();
        }}
      />

      {/* -------------------------------------------------------- mi cuenta */}
      <Seccion>Mi cuenta</Seccion>

      {saldo.error && <Aviso>{saldo.error}</Aviso>}

      {/* Tres estados, no dos. "Al día" y "debés $X" dejaban afuera al que pagó
          por adelantado, que es el que más merece que la app lo reconozca. */}
      <div className="mb-3 rounded-xl border border-linea bg-panel px-4 py-3">
        <p className="text-2xl font-semibold text-tinta">
          {saldo.datos === null
            ? '…'
            : saldo.datos.debe > 0
              ? plata(saldo.datos.debe)
              : saldo.datos.aFavor > 0
                ? plata(saldo.datos.aFavor)
                : 'Al día'}
        </p>
        <p className="text-sm text-tenue">
          {saldo.datos === null
            ? ''
            : saldo.datos.debe > 0
              ? 'es lo que debés'
              : saldo.datos.aFavor > 0
                ? 'tenés a favor: se va a descontar de lo que venga'
                : 'no debés nada'}
        </p>
        {declarados.length > 0 && (
          <p className="mt-1 text-sm text-acento">
            Avisaste {plata(declarados.reduce((s, p) => s + p.amount, 0))}. Tu profe lo tiene
            que confirmar.
          </p>
        )}
      </div>

      {cargos.datos && cargos.datos.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {cargos.datos.map((c) => {
            const saldado = c.pagado >= c.amount;
            const aMedias = c.pagado > 0 && !saldado;
            return (
              <li key={c.id}>
                <Tarjeta>
                  <div className={saldado ? 'opacity-60' : undefined}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-tinta">{c.concept}</p>
                      <p className="shrink-0 text-sm text-acento">{plata(c.amount)}</p>
                    </div>

                    {/* Lo primero que se dice de un cargo es si está saldado.
                        El vencimiento solo importa mientras siga debiéndose. */}
                    {saldado ? (
                      <p className="text-sm text-acento">Pagada</p>
                    ) : aMedias ? (
                      <p className="text-sm text-tenue">
                        Pagaste {plata(c.pagado)} · falta {plata(c.amount - c.pagado)}
                        {c.due_date && ` · vence el ${fecha(c.due_date)}`}
                      </p>
                    ) : c.due_date ? (
                      <p className="text-sm text-tenue">vence el {fecha(c.due_date)}</p>
                    ) : null}
                  </div>
                </Tarjeta>
              </li>
            );
          })}
        </ul>
      )}

      <Boton onClick={() => setDeclarando(true)}>Ya transferí</Boton>

      {declarando && (
        <Hoja titulo="Avisar que transferí" alCerrar={() => setDeclarando(false)}>
          <FormularioAviso
            ficha={ficha}
            sugerido={saldo.datos?.debe ?? 0}
            alCerrar={() => setDeclarando(false)}
            alAvisar={() => {
              setDeclarando(false);
              pagos.recargar();
              saldo.recargar();
            }}
          />
        </Hoja>
      )}

      {/* ------------------------------------------------------- lo que pagué
          Va al final y no arriba: el alumno abre la app para ver sus clases
          y sus recaps. Lo que ya pagó es una consulta puntual, no algo con
          lo que quiera que lo reciban. */}
      {confirmados.length > 0 && (
        <div className="mb-8 mt-6">
          <Seccion>Lo que pagué</Seccion>
          <ul className="flex flex-col gap-2">
            {confirmados.map((p) => (
              <li key={p.id}>
                <Tarjeta>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-tinta">{plata(p.amount)}</p>
                      <p className="text-sm text-tenue">{fecha(p.cuando)}</p>
                      {p.note && <p className="text-sm text-tenue">{p.note}</p>}
                    </div>
                    <p className="shrink-0 text-sm text-acento">confirmado</p>
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>
        </div>
      )}
        </>
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
  sugerido,
  alCerrar,
  alAvisar,
}: {
  ficha: MiFicha;
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
