// ============================================================================
// Lo que ve el alumno: sus clases y su cuenta.
//
// El recap va arriba de todo a propósito. Es el motivo por el que un alumno
// abre la app: quiere acordarse de las figuras que vio. El estado de cuenta
// es importante para el profesor, no para el alumno — ponerlo primero sería
// recibirlo con una factura.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { misClases, misCargos, miSaldo, misPagos, declararPago } from '../datos';
import type { MiFicha } from '../datos';
import { fecha, plata, hoyISO, linkMapaDe } from '../formato';
import {
  Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga, Campo, Texto, Boton, BotonSecundario,
} from '../../comun/ui';
import Salir from './Salir';

export default function MiEscuela({
  ficha,
  derecha,
}: {
  ficha: MiFicha;
  derecha?: React.ReactNode;
}) {
  const clases = useCarga(() => misClases(ficha.tenant_id), [ficha.tenant_id]);
  const cargos = useCarga(() => misCargos(ficha.tenant_id), [ficha.tenant_id]);
  const saldo = useCarga(() => miSaldo(ficha.tenant_id), [ficha.tenant_id]);
  const pagos = useCarga(() => misPagos(ficha.tenant_id), [ficha.tenant_id]);
  const [declarando, setDeclarando] = useState(false);

  const hoy = hoyISO();
  const proximas = clases.datos?.filter((c) => c.date >= hoy).reverse() ?? [];
  const pasadas = clases.datos?.filter((c) => c.date < hoy).slice(0, 8) ?? [];
  const declarados = pagos.datos?.filter((p) => p.status === 'declared') ?? [];

  return (
    <Marco>
      <Encabezado
        titulo={ficha.escuela?.name ?? 'Mis clases'}
        bajada={ficha.full_name}
        derecha={derecha ?? <Salir />}
      />

      {/* ---------------------------------------------------- próximas clases */}
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-taupe">
        Próximas clases
      </h2>
      {clases.error && <Aviso>{clases.error}</Aviso>}
      {!clases.datos && !clases.error && <Vacio>Buscando…</Vacio>}
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
                      <p className="text-brand-cream">
                        {c.grupo?.name ?? 'Clase'}
                        {cancelada && (
                          <span className="ml-2 rounded-full border border-white/20 px-2 py-0.5 text-xs text-brand-taupe">
                            cancelada
                          </span>
                        )}
                      </p>
                      {venue && <p className="text-sm text-brand-taupe">{venue}</p>}
                      {address && (
                        <a
                          href={linkMapaDe(address)} target="_blank" rel="noreferrer"
                          className="text-sm text-brand-sand underline"
                        >
                          cómo llegar
                        </a>
                      )}
                    </div>
                    <p className="shrink-0 text-sm text-brand-taupe">
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
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-taupe">
            Lo que vimos
          </h2>
          <ul className="mb-8 flex flex-col gap-2">
            {pasadas.map((c) => (
              <li key={c.id}>
                <Tarjeta>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-brand-cream">{c.title ?? c.grupo?.name ?? 'Clase'}</p>
                    <p className="shrink-0 text-sm text-brand-taupe">{fecha(c.date)}</p>
                  </div>
                  {c.recap
                    ? <p className="mt-1 text-sm text-brand-taupe">{c.recap}</p>
                    : <p className="mt-1 text-sm text-brand-taupe/60">Sin resumen todavía.</p>}
                </Tarjeta>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* -------------------------------------------------------- mi cuenta */}
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-taupe">
        Mi cuenta
      </h2>

      {saldo.error && <Aviso>{saldo.error}</Aviso>}

      <div className="mb-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-2xl font-semibold text-brand-cream">
          {saldo.datos === null ? '…' : saldo.datos > 0 ? plata(saldo.datos) : 'Al día'}
        </p>
        <p className="text-sm text-brand-taupe">
          {saldo.datos !== null && saldo.datos > 0 ? 'es lo que debés' : 'no debés nada'}
        </p>
        {declarados.length > 0 && (
          <p className="mt-1 text-sm text-brand-sand">
            Avisaste {plata(declarados.reduce((s, p) => s + p.amount, 0))}. Tu profe lo tiene
            que confirmar.
          </p>
        )}
      </div>

      {cargos.datos && cargos.datos.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {cargos.datos.map((c) => (
            <li key={c.id}>
              <Tarjeta>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-brand-cream">{c.concept}</p>
                  <p className="shrink-0 text-sm text-brand-sand">{plata(c.amount)}</p>
                </div>
                {c.due_date && (
                  <p className="text-sm text-brand-taupe">vence el {fecha(c.due_date)}</p>
                )}
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}

      {declarando ? (
        <FormularioAviso
          ficha={ficha}
          sugerido={saldo.datos ?? 0}
          alCerrar={() => setDeclarando(false)}
          alAvisar={() => {
            setDeclarando(false);
            pagos.recargar();
            saldo.recargar();
          }}
        />
      ) : (
        <BotonSecundario onClick={() => setDeclarando(true)}>Ya transferí</BotonSecundario>
      )}
    </Marco>
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
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await declararPago({
        tenant_id: ficha.tenant_id,
        student_id: ficha.id,
        amount: Number(monto),
        paid_on: cuando || null,
        note: nota.trim() || null,
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
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <p className="text-brand-cream">Avisar que transferí</p>

      <Campo etiqueta="Cuánto">
        <Texto
          type="number" min="1" step="100" required value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
      </Campo>

      <Campo etiqueta="Cuándo">
        <Texto type="date" value={cuando} onChange={(e) => setCuando(e.target.value)} />
      </Campo>

      <Campo etiqueta="Algo que quieras aclarar (opcional)">
        <Texto
          value={nota} placeholder="Transferencia desde Mercado Pago"
          onChange={(e) => setNota(e.target.value)}
        />
      </Campo>

      {error && <Aviso>{error}</Aviso>}

      <p className="text-xs text-brand-taupe">
        Esto le avisa a tu profe. Tu cuenta se actualiza cuando él lo confirme.
      </p>

      <div className="flex gap-2">
        <Boton type="submit" disabled={enviando}>
          {enviando ? 'Avisando…' : 'Avisar'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
