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
import { confirmarPago, rechazarPago, fecha, diaLocal, plata } from '../datos';
import type { PagoPorConfirmar, ResultadoConfirmacion } from '../datos';
import { Aviso, Vacio, Lista, Fila, Esqueleto, Boton, BotonSecundario } from '../../comun/ui';

// LAS DOS FECHAS DE UN AVISO, Y CUÁNDO VALE LA PENA MOSTRAR LAS DOS.
//
// Un pago tiene dos fechas que no significan lo mismo y casi siempre son la
// misma:
//
//   · paid_on     — el día que el alumno dice que transfirió. Lo escribe él.
//   · declared_at — el día que tocó el botón en la app. Lo pone la app sola.
//
// Como el campo del formulario viene con hoy puesto, el caso normal es que
// coincidan. Y ahí la lista decía "declaró el 30/10 · transfirió el 30/10":
// el mismo dato dos veces con dos nombres distintos. Eso es peor que no decir
// nada, porque obliga al profesor a buscarle una diferencia que no existe.
//
// La fecha que le sirve es cuándo salió la plata: es la que va a buscar en el
// resumen del banco. La otra solo importa cuando NO coinciden —transfirió el
// viernes y avisó el lunes—, y ahí sí hay algo que entender, así que se
// nombra el hueco en vez de esconderlo.
function cuandoDice(p: { declared_at: string; paid_on: string | null }): string {
  const aviso = diaLocal(p.declared_at);
  if (!p.paid_on) return `avisó el ${fecha(aviso)}`;
  if (p.paid_on === aviso) return `transfirió el ${fecha(p.paid_on)}`;
  return `transfirió el ${fecha(p.paid_on)} · avisó el ${fecha(aviso)}`;
}

export default function ParaConfirmar({
  pagos: datos,
  error,
  alResolver,
}: {
  pagos: PagoPorConfirmar[] | null;
  error: string | null;
  alResolver: () => void;
}) {

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
      alResolver();
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
      alResolver();
    } catch (e) {
      setErrorAccion((e as Error).message);
    }
    setTrabajando(null);
  }

  const pendientes = datos?.filter((p) => !resueltos[p.id]) ?? [];

  return (
    <>
      {error && <Aviso>{error}</Aviso>}
      {errorAccion && <div className="mb-4"><Aviso>{errorAccion}</Aviso></div>}
      {!datos && !error && <Esqueleto />}

      {/* Lo que se acaba de resolver, para que quede constancia en pantalla */}
      {Object.entries(resueltos).map(([id, texto]) => (
        <p key={id} className="mb-2 rounded-lg border border-acento/25 bg-acento-suave px-3 py-2 text-sm text-acento">
          {texto}
        </p>
      ))}

      {datos && pendientes.length === 0 && (
        <Vacio>No hay transferencias esperando. Todo al día.</Vacio>
      )}

      {pendientes.length > 0 && (
        <Lista>
          {pendientes.map((p) => (
            <Fila
              key={p.id}
              avatar={p.alumno}
              foto={p.foto}
              titulo={p.alumno}
              detalle={cuandoDice(p)}
              valor={plata(p.amount)}
            >
              {p.note && <p className="mb-2 text-sm text-tenue">{p.note}</p>}

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

              {/* El monto va escrito en el botón. Es plata: que diga
                  "Confirmar $8.000" y no solo "Confirmar" es lo que evita el
                  toque distraído. */}
              <div className="mt-3 flex flex-wrap gap-2">
                <Boton
                  type="button"
                  onClick={() => confirmar(p)}
                  disabled={trabajando === p.id}
                >
                  {trabajando === p.id ? 'Confirmando…' : `Confirmar ${plata(p.amount)}`}
                </Boton>
                <BotonSecundario
                  type="button"
                  onClick={() => rechazar(p)}
                  disabled={trabajando === p.id}
                >
                  Rechazar
                </BotonSecundario>
              </div>
            </Fila>
          ))}
        </Lista>
      )}
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
