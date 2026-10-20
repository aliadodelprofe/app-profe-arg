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
import { plata, mesDe, mesEnPalabras, hoyISO } from '../datos';
import { Vacio, Dato, Lista, Fila, ChipFecha } from '../../comun/ui';

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
      {meses.length > 1 && (
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="mb-3 rounded-lg border border-linea bg-campo px-3 py-2 text-sm text-tinta"
        >
          {meses.map((m) => (
            <option key={m} value={m}>{mesEnPalabras(m)}</option>
          ))}
        </select>
      )}

      <div className="mb-3">
        <Dato
          valor={plata(total)}
          al={`entraron en ${mesEnPalabras(mes)}` +
              (delMes.length > 0 ? ` · ${delMes.length} ${delMes.length === 1 ? 'pago' : 'pagos'}` : '')}
          tono={total > 0 ? 'ok' : 'normal'}
        >
          {hayConQueComparar && (
            <p className="mt-2 text-sm text-tenue">
              {diferencia === 0
                ? `Igual que en ${mesEnPalabras(anterior)}.`
                : `${plata(Math.abs(diferencia))} ${diferencia > 0 ? 'más' : 'menos'} que en ` +
                  `${mesEnPalabras(anterior)} (${Math.abs(porcentaje)}%).`}
            </p>
          )}
        </Dato>
      </div>

      {delMes.length === 0 ? (
        <Vacio>
          {mes === mesDe(hoyISO())
            ? 'Todavía no confirmaste ningún pago este mes.'
            : 'No hubo cobros en ese mes.'}
        </Vacio>
      ) : (
        <Lista>
          {delMes.map((c) => (
            <Fila
              key={c.id}
              principal={<ChipFecha iso={c.fecha} />}
              titulo={c.alumno}
              detalle={c.note}
              valor={plata(c.amount)}
            >
              {/* Que el comprobante no esté no es lo mismo que no haberlo
                  mandado. A los 6 meses se borra solo. */}
              {c.comprobante_borrado && (
                <p className="text-xs text-tenue/70">
                  El comprobante se borró por antigüedad.
                </p>
              )}
            </Fila>
          ))}
        </Lista>
      )}
    </>
  );
}

// '2026-09' -> '2026-08'
function mesAnterior(period: string): string {
  const [a, m] = period.split('-').map(Number);
  return new Date(Date.UTC(a, m - 2, 1)).toISOString().slice(0, 7);
}
