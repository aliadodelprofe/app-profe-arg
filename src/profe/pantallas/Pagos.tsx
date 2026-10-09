// ============================================================================
// Para confirmar — una SECCIÓN de la pantalla de Cobros, no una pantalla.
//
// Dejó de ser pantalla propia cuando las tres vistas de plata se juntaron:
// quién debe, qué falta confirmar y qué entró son tres preguntas sobre lo
// mismo, y tenerlas en tres lugares distintos obligaba a recorrer la app para
// entender un solo tema.
//
// Reemplaza al WhatsApp con la captura de pantalla. El alumno declaró una
// transferencia; acá la das por buena con un toque y el estado de cuenta se
// acomoda solo.
//
// Y abajo queda lo cobrado, que antes se perdía: un pago confirmado salía de
// esta lista y no volvía a aparecer en ningún lado.
//
// El monto va escrito en el botón. Es plata: que diga "Confirmar $8.000" y no
// solo "Confirmar" es lo que evita el toque distraído.
// ============================================================================
import { useState } from 'react';
import { traerPagosPorConfirmar, confirmarPago, rechazarPago, fecha, plata } from '../datos';
import type { Espacio, PagoPorConfirmar, ResultadoConfirmacion } from '../datos';
import { Aviso, Vacio, Tarjeta, Seccion, useCarga } from '../../comun/ui';

export default function ParaConfirmar({ espacio }: { espacio: Espacio }) {
  const { datos, error } = useCarga(() => traerPagosPorConfirmar(espacio.id), [espacio.id]);

  // Lo que ya se resolvió en esta pantalla, para sacarlo de la lista sin
  // tener que volver a preguntarle a la base.
  const [resueltos, setResueltos] = useState<Record<string, string>>({});
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  async function confirmar(p: PagoPorConfirmar) {
    setTrabajando(p.id);
    setErrorAccion(null);
    try {
      const r: ResultadoConfirmacion = await confirmarPago(p.id);
      setResueltos((m) => ({ ...m, [p.id]: mensaje(r) }));
    } catch (e) {
      setErrorAccion((e as Error).message);
    }
    setTrabajando(null);
  }

  async function rechazar(p: PagoPorConfirmar) {
    setTrabajando(p.id);
    setErrorAccion(null);
    try {
      await rechazarPago(p.id);
      setResueltos((m) => ({ ...m, [p.id]: 'Rechazado.' }));
    } catch (e) {
      setErrorAccion((e as Error).message);
    }
    setTrabajando(null);
  }

  const pendientes = datos?.filter((p) => !resueltos[p.id]) ?? [];

  return (
    <>
      <Seccion acotacion={pendientes.length > 0 ? `${pendientes.length}` : undefined}>
        Para confirmar
      </Seccion>

      {error && <Aviso>{error}</Aviso>}
      {errorAccion && <div className="mb-4"><Aviso>{errorAccion}</Aviso></div>}
      {!datos && !error && <Vacio>Buscando…</Vacio>}

      {/* Lo que se acaba de resolver, para que quede constancia en pantalla */}
      {Object.entries(resueltos).map(([id, texto]) => (
        <p key={id} className="mb-2 rounded-lg border border-acento/30 bg-acento/5 px-3 py-2 text-sm text-acento">
          {texto}
        </p>
      ))}

      {datos && pendientes.length === 0 && (
        <Vacio>No hay pagos esperando. Todo al día.</Vacio>
      )}

      <ul className="flex flex-col gap-2">
        {pendientes.map((p) => (
          <li key={p.id}>
            <Tarjeta>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-tinta">{p.alumno}</p>
                  <p className="text-sm text-tenue">
                    declarado {fecha(p.declared_at.slice(0, 10))}
                    {p.paid_on && ` · transferido ${fecha(p.paid_on)}`}
                  </p>
                  {p.note && <p className="text-sm text-tenue">{p.note}</p>}
                  {p.enlace ? (
                    <a
                      href={p.enlace} target="_blank" rel="noreferrer"
                      className="text-sm text-acento underline"
                    >
                      ver comprobante
                    </a>
                  ) : p.receipt_url ? (
                    <p className="text-sm text-tenue">
                      Mandó comprobante, pero no se pudo abrir. Recargá la página.
                    </p>
                  ) : (
                    <p className="text-sm text-tenue">Sin comprobante.</p>
                  )}
                </div>
                <p className="shrink-0 text-lg text-tinta">{plata(p.amount)}</p>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => confirmar(p)}
                  disabled={trabajando === p.id}
                  className="rounded-lg bg-acento px-3 py-1.5 text-sm font-medium text-sobre-acento disabled:opacity-50"
                >
                  {trabajando === p.id ? 'Confirmando…' : `Confirmar ${plata(p.amount)}`}
                </button>
                <button
                  onClick={() => rechazar(p)}
                  disabled={trabajando === p.id}
                  className="rounded-lg border border-linea px-3 py-1.5 text-sm text-tenue disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </Tarjeta>
          </li>
        ))}
      </ul>

    </>
  );
}

// El sobrante no se esconde: es plata del alumno que todavía no tiene un cargo
// al que imputarse. Desde la 0021 ya no se pierde de vista — queda como saldo a
// favor y la imputación automática la aplica a lo que vaya venciendo.
function mensaje(r: ResultadoConfirmacion): string {
  if (r.sinImputar > 0) {
    return `Confirmado. Imputé ${plata(r.imputado)} y quedaron ${plata(r.sinImputar)} a favor del alumno. Se van a descontar solos de lo que le vaya venciendo.`;
  }
  return `Confirmado. Imputé ${plata(r.imputado)}.`;
}
