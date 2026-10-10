// ============================================================================
// Lo que ve el alumno: sus clases y su cuenta.
//
// El recap va arriba de todo a propósito. Es el motivo por el que un alumno
// abre la app: quiere acordarse de las figuras que vio. El estado de cuenta
// es importante para el profesor, no para el alumno — ponerlo primero sería
// recibirlo con una factura.
// ============================================================================
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  misClases, misCargos, miSaldo, misPagos, declararPago,
  subirComprobante, COMPROBANTE_MAX_MB, misArreglos,
} from '../datos';
import type { MiFicha } from '../datos';
import type { Pestana } from '../../comun/ui';
import { fecha, plata, hoyISO, linkMapaDe } from '../formato';
import {
  Marco, Aviso, Vacio, Tarjeta, useCarga, Campo, Texto, Boton, BotonSecundario,
  Titulo, Seccion, Navegacion, IconoClases, IconoCobros, Hoja, Esqueleto, Avatar,
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

  const hoy = hoyISO();
  const proximas = clases.datos?.filter((c) => c.date >= hoy).reverse() ?? [];
  const pasadas = clases.datos?.filter((c) => c.date < hoy).slice(0, 8) ?? [];
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
        <>
      <Seccion>Próximas clases</Seccion>
      {clases.error && <Aviso>{clases.error}</Aviso>}
      {!clases.datos && !clases.error && <Esqueleto />}
      {clases.datos && proximas.length === 0 && <Vacio>No hay clases cargadas todavía.</Vacio>}

      <ul className="mb-8 flex flex-col gap-2">
        {proximas.map((c) => {
          const venue = c.venue ?? c.grupo?.venue ?? null;
          const address = c.address ?? c.grupo?.address ?? null;
          const cancelada = c.status === 'cancelled';
          return (
            <li key={c.id}>
              <Tarjeta>
                <div className={cancelada ? 'opacity-50' : undefined}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-tinta">
                        {c.grupo?.name ?? 'Clase'}
                        {cancelada && (
                          <span className="ml-2 rounded-full border border-linea px-2 py-0.5 text-xs text-tenue">
                            cancelada
                          </span>
                        )}
                      </p>
                      {venue && <p className="text-sm text-tenue">{venue}</p>}
                      {address && (
                        <a
                          href={linkMapaDe(address)} target="_blank" rel="noreferrer"
                          className="text-sm text-acento underline"
                        >
                          cómo llegar
                        </a>
                      )}
                    </div>
                    <p className="shrink-0 text-sm text-tenue">
                      {fecha(c.date)}
                      {c.start_time ? ` · ${c.start_time.slice(0, 5)}` : ''}
                    </p>
                  </div>
                </div>
              </Tarjeta>
            </li>
          );
        })}
      </ul>

      {/* ------------------------------------------------------------- recaps */}
      {pasadas.length > 0 && (
        <>
          <Seccion>Lo que vimos</Seccion>
          <ul className="mb-8 flex flex-col gap-2">
            {pasadas.map((c) => (
              <li key={c.id}>
                <Tarjeta>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-tinta">{c.title ?? c.grupo?.name ?? 'Clase'}</p>
                    <p className="shrink-0 text-sm text-tenue">{fecha(c.date)}</p>
                  </div>
                  {c.recap
                    ? <p className="mt-1 text-sm text-tenue">{c.recap}</p>
                    : <p className="mt-1 text-sm text-tenue/60">Sin resumen todavía.</p>}
                </Tarjeta>
              </li>
            ))}
          </ul>
        </>
      )}
        </>
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
