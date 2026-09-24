// ============================================================================
// Pagos — lo que falta confirmar y lo que ya entró
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
import { traerPagosPorConfirmar, traerCobros, confirmarPago, rechazarPago, fecha, plata } from '../datos';
import type { Espacio, PagoPorConfirmar, ResultadoConfirmacion } from '../datos';
import { Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga } from '../../comun/ui';
import Cobrado from './Cobrado';

export default function Pagos({
  espacio,
  alVolver,
}: {
  espacio: Espacio;
  alVolver: () => void;
}) {
  const { datos, error } = useCarga(() => traerPagosPorConfirmar(espacio.id), [espacio.id]);
  const cobros = useCarga(() => traerCobros(espacio.id), [espacio.id]);

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
      cobros.recargar();   // la plata que acaba de entrar tiene que aparecer abajo
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
    <Marco>
      <Encabezado
        titulo="Pagos"
        bajada={espacio.name}
        volver={{ texto: 'Mis grupos', alTocar: alVolver }}
      />

      {error && <Aviso>{error}</Aviso>}
      {errorAccion && <div className="mb-4"><Aviso>{errorAccion}</Aviso></div>}
      {!datos && !error && <Vacio>Buscando…</Vacio>}

      {/* Lo que se acaba de resolver, para que quede constancia en pantalla */}
      {Object.entries(resueltos).map(([id, texto]) => (
        <p key={id} className="mb-2 rounded-lg border border-brand-sand/30 bg-brand-sand/5 px-3 py-2 text-sm text-brand-sand">
          {texto}
        </p>
      ))}

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-taupe">
        Para confirmar
      </h2>

      {datos && pendientes.length === 0 && (
        <Vacio>No hay pagos esperando. Todo al día.</Vacio>
      )}

      <ul className="flex flex-col gap-2">
        {pendientes.map((p) => (
          <li key={p.id}>
            <Tarjeta>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-brand-cream">{p.alumno}</p>
                  <p className="text-sm text-brand-taupe">
                    declarado {fecha(p.declared_at.slice(0, 10))}
                    {p.paid_on && ` · transferido ${fecha(p.paid_on)}`}
                  </p>
                  {p.note && <p className="text-sm text-brand-taupe">{p.note}</p>}
                  {p.enlace ? (
                    <a
                      href={p.enlace} target="_blank" rel="noreferrer"
                      className="text-sm text-brand-sand underline"
                    >
                      ver comprobante
                    </a>
                  ) : p.receipt_url ? (
                    <p className="text-sm text-brand-taupe">
                      Mandó comprobante, pero no se pudo abrir. Recargá la página.
                    </p>
                  ) : (
                    <p className="text-sm text-brand-taupe">Sin comprobante.</p>
                  )}
                </div>
                <p className="shrink-0 text-lg text-brand-cream">{plata(p.amount)}</p>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => confirmar(p)}
                  disabled={trabajando === p.id}
                  className="rounded-lg bg-brand-sand px-3 py-1.5 text-sm font-medium text-brand-dark disabled:opacity-50"
                >
                  {trabajando === p.id ? 'Confirmando…' : `Confirmar ${plata(p.amount)}`}
                </button>
                <button
                  onClick={() => rechazar(p)}
                  disabled={trabajando === p.id}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-brand-taupe disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </Tarjeta>
          </li>
        ))}
      </ul>

      {/* ------------------------------------------------------- lo cobrado */}
      <div className="mt-8">
        {cobros.error && <Aviso>{cobros.error}</Aviso>}
        {cobros.datos && <Cobrado cobros={cobros.datos} />}
      </div>
    </Marco>
  );
}

// El sobrante no se esconde: es plata del alumno que quedó sin cargo al que
// imputarse, y el profe tiene que saberlo.
function mensaje(r: ResultadoConfirmacion): string {
  if (r.sinImputar > 0) {
    return `Confirmado. Imputé ${plata(r.imputado)} y quedaron ${plata(r.sinImputar)} a favor del alumno, sin cargo al que aplicarse.`;
  }
  return `Confirmado. Imputé ${plata(r.imputado)}.`;
}
