// ============================================================================
// Lo que entró.
//
// El número del mes va primero y grande, y el detalle abajo. El orden no es
// estético: la pregunta que trae al profesor a esta pantalla casi siempre es
// "¿cómo vengo este mes?", y esa se responde con un número. "¿Este me pagó?"
// viene después y necesita la lista.
//
// La comparación con el mes anterior se muestra sin adjetivos. Un mes flojo no
// necesita que la app se lo subraye, y uno bueno tampoco necesita festejo: el
// profesor sabe leer dos números.
// ============================================================================
import { useState } from 'react';
import type { Cobro } from '../datos';
import { fecha, plata, mesDe, mesEnPalabras, hoyISO } from '../datos';
import { Vacio, Tarjeta } from '../../comun/ui';

export default function Cobrado({ cobros }: { cobros: Cobro[] }) {
  const [mes, setMes] = useState(mesDe(hoyISO()));

  // Los meses que existen en los datos, más el actual aunque esté vacío: si
  // arrancó el mes y todavía no cobró nada, la respuesta correcta es "$0",
  // no una pantalla que se olvidó de este mes.
  const meses = [...new Set([mesDe(hoyISO()), ...cobros.map((c) => mesDe(c.fecha))])]
    .sort()
    .reverse();

  const delMes = cobros.filter((c) => mesDe(c.fecha) === mes);
  const total = delMes.reduce((s, c) => s + c.amount, 0);

  const anterior = mesAnterior(mes);
  const totalAnterior = cobros
    .filter((c) => mesDe(c.fecha) === anterior)
    .reduce((s, c) => s + c.amount, 0);

  const hayConQueComparar = totalAnterior > 0;
  const diferencia = total - totalAnterior;
  const porcentaje = hayConQueComparar ? Math.round((diferencia / totalAnterior) * 100) : 0;

  return (
    <>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-taupe">
        Cobrado
      </h2>

      {meses.length > 1 && (
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="mb-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-brand-cream"
        >
          {meses.map((m) => (
            <option key={m} value={m}>{mesEnPalabras(m)}</option>
          ))}
        </select>
      )}

      <div className="mb-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-3xl font-semibold text-brand-cream">{plata(total)}</p>
        <p className="text-sm text-brand-taupe">
          entraron en {mesEnPalabras(mes)}
          {delMes.length > 0 && ` · ${delMes.length} ${delMes.length === 1 ? 'pago' : 'pagos'}`}
        </p>

        {hayConQueComparar && (
          <p className="mt-1 text-sm text-brand-taupe">
            {diferencia === 0
              ? `Igual que en ${mesEnPalabras(anterior)}.`
              : `${plata(Math.abs(diferencia))} ${diferencia > 0 ? 'más' : 'menos'} que en ` +
                `${mesEnPalabras(anterior)} (${Math.abs(porcentaje)}%).`}
          </p>
        )}
      </div>

      {delMes.length === 0 ? (
        <Vacio>
          {mes === mesDe(hoyISO())
            ? 'Todavía no confirmaste ningún pago este mes.'
            : 'No hubo cobros en ese mes.'}
        </Vacio>
      ) : (
        <ul className="flex flex-col gap-2">
          {delMes.map((c) => (
            <li key={c.id}>
              <Tarjeta>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-brand-cream">{c.alumno}</p>
                    <p className="text-sm text-brand-taupe">{fecha(c.fecha)}</p>
                    {c.note && <p className="text-sm text-brand-taupe">{c.note}</p>}
                    {/* Que el comprobante no esté no es lo mismo que no haberlo
                        mandado. A los 6 meses se borra solo. */}
                    {c.comprobante_borrado && (
                      <p className="text-xs text-brand-taupe/70">
                        El comprobante se borró por antigüedad.
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-lg text-brand-cream">{plata(c.amount)}</p>
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// '2026-09' -> '2026-08'
function mesAnterior(period: string): string {
  const [a, m] = period.split('-').map(Number);
  return new Date(Date.UTC(a, m - 2, 1)).toISOString().slice(0, 7);
}
