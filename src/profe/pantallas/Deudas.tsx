// ============================================================================
// Quién me debe
//
// Es la pregunta que hoy se contesta cruzando una planilla a mano. Acá es una
// consulta sobre la vista student_account.
//
// Un alumno puede deber y a la vez tener un pago declarado esperando: en ese
// caso la deuda no es real, es tuya la tarea de confirmarlo. Por eso se
// muestran las dos cosas juntas y no una sola.
// ============================================================================
import { traerDeudas, plata } from '../datos';
import type { Espacio } from '../datos';
import { Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga } from '../../comun/ui';

export default function Deudas({
  espacio,
  alVolver,
}: {
  espacio: Espacio;
  alVolver: () => void;
}) {
  const { datos, error } = useCarga(() => traerDeudas(espacio.id), [espacio.id]);

  const deudores = datos?.filter((f) => f.saldo > 0) ?? [];
  const alDia = datos?.filter((f) => f.saldo <= 0).length ?? 0;
  // Quienes pagaron de más o por adelantado. Es plata que ya está en tu cuenta
  // y que se va a ir descontando de lo que les toque: conviene saber quiénes
  // son antes de reclamarles algo.
  const conCredito = datos?.filter((f) => f.aFavor > 0) ?? [];
  const totalCredito = conCredito.reduce((s, f) => s + f.aFavor, 0);
  const total = deudores.reduce((s, f) => s + f.saldo, 0);
  const porConfirmar = deudores.reduce((s, f) => s + f.pendiente, 0);

  return (
    <Marco>
      <Encabezado
        titulo="Quién me debe"
        bajada={espacio.name}
        volver={{ texto: 'Mis grupos', alTocar: alVolver }}
      />

      {error && <Aviso>{error}</Aviso>}
      {!datos && !error && <Vacio>Buscando…</Vacio>}

      {datos && deudores.length === 0 && (
        <Vacio>No te debe nadie. {alDia > 0 && `${alDia} alumnos al día.`}</Vacio>
      )}

      {deudores.length > 0 && (
        <>
          <div className="mb-4 rounded-xl border border-linea bg-panel px-4 py-3">
            <p className="text-2xl font-semibold text-tinta">{plata(total)}</p>
            <p className="text-sm text-tenue">
              {deudores.length} {deudores.length === 1 ? 'alumno debe' : 'alumnos deben'}
              {alDia > 0 && ` · ${alDia} al día`}
            </p>
            {porConfirmar > 0 && (
              <p className="mt-1 text-sm text-acento">
                {plata(porConfirmar)} esperando que confirmes
              </p>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {[...deudores]
              .sort((a, b) => b.saldo - a.saldo)
              .map((f) => (
                <li key={f.alumno.id}>
                  <Tarjeta>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-tinta">{f.alumno.full_name}</p>
                      <p className="shrink-0 text-alerta">{plata(f.saldo)}</p>
                    </div>
                    {f.pendiente > 0 && (
                      <p className="text-sm text-acento">
                        declaró {plata(f.pendiente)} · falta que lo confirmes
                      </p>
                    )}
                  </Tarjeta>
                </li>
              ))}
          </ul>
        </>
      )}

      {/* ----------------------------------------------------- pagado de más
          Va después de los deudores porque no es una tarea: no hay nada que
          hacer con esta plata, se aplica sola a lo que vaya venciendo. Está
          para que no le reclames a alguien que está adelantado. */}
      {conCredito.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-tenue">
            Pagaron por adelantado
          </h2>
          <p className="mb-3 text-sm text-tenue">
            {plata(totalCredito)} a favor de {conCredito.length}{' '}
            {conCredito.length === 1 ? 'alumno' : 'alumnos'}. Se descuenta solo de lo que
            les vaya venciendo.
          </p>
          <ul className="flex flex-col gap-2">
            {[...conCredito]
              .sort((a, b) => b.aFavor - a.aFavor)
              .map((f) => (
                <li key={f.alumno.id}>
                  <Tarjeta>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-tinta">{f.alumno.full_name}</p>
                      <p className="shrink-0 text-acento">{plata(f.aFavor)}</p>
                    </div>
                  </Tarjeta>
                </li>
              ))}
          </ul>
        </div>
      )}
    </Marco>
  );
}
