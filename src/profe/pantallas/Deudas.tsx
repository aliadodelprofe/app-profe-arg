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
import { Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga } from '../ui';

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
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-2xl font-semibold text-brand-cream">{plata(total)}</p>
            <p className="text-sm text-brand-taupe">
              {deudores.length} {deudores.length === 1 ? 'alumno debe' : 'alumnos deben'}
              {alDia > 0 && ` · ${alDia} al día`}
            </p>
            {porConfirmar > 0 && (
              <p className="mt-1 text-sm text-brand-sand">
                {plata(porConfirmar)} esperando que confirmes
              </p>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {deudores
              .sort((a, b) => b.saldo - a.saldo)
              .map((f) => (
                <li key={f.alumno.id}>
                  <Tarjeta>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-brand-cream">{f.alumno.full_name}</p>
                      <p className="shrink-0 text-red-300">{plata(f.saldo)}</p>
                    </div>
                    {f.pendiente > 0 && (
                      <p className="text-sm text-brand-sand">
                        declaró {plata(f.pendiente)} · falta que lo confirmes
                      </p>
                    )}
                  </Tarjeta>
                </li>
              ))}
          </ul>
        </>
      )}
    </Marco>
  );
}
