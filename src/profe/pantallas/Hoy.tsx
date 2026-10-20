// ============================================================================
// Hoy — la pantalla que se abre antes de entrar a dar clase.
//
// No inventa datos: compone los que ya existen y los ordena por URGENCIA, que
// es lo que ninguna otra pantalla hacía. Antes, para saber si tenía algo que
// hacer, el profesor tenía que entrar a tres lugares distintos y acordarse de
// los tres.
//
// El orden no es caprichoso:
//   1. La clase que viene, porque es lo que está por pasar y tiene una acción
//      concreta a un toque (tomar asistencia).
//   2. Lo que espera una decisión suya: transferencias declaradas. Si no las
//      confirma, el estado de cuenta de sus alumnos miente.
//   3. Lo que debe mirar pero no hoy: las deudas.
//
// Lo que no hay que hacer no se muestra. Una pantalla de inicio que siempre
// tiene seis tarjetas, estén vacías o no, deja de leerse a la semana.
// ============================================================================
import {
  traerClasesDelEspacio, traerDeudas, traerPagosPorConfirmar,
  fecha, plata, hoyISO, sumarDias,
} from '../datos';
import type { Espacio, ClaseDelEspacio } from '../datos';
import { Marco, Aviso, Vacio, Tarjeta, Titulo, Seccion, Dato, useCarga } from '../../comun/ui';

export default function Hoy({
  espacio,
  alVerCobros,
  alTomarAsistencia,
}: {
  espacio: Espacio;
  alVerCobros: () => void;
  alTomarAsistencia: (clase: ClaseDelEspacio) => void;
}) {
  const hoy = hoyISO();

  // Dos semanas alcanzan: lo que pasa más allá no es "hoy", y para eso está
  // la pantalla del grupo.
  const clases = useCarga(
    () => traerClasesDelEspacio(espacio.id, hoy, sumarDias(hoy, 14)),
    [espacio.id],
  );
  const deudas = useCarga(() => traerDeudas(espacio.id), [espacio.id]);
  const pagos = useCarga(() => traerPagosPorConfirmar(espacio.id), [espacio.id]);

  const proximas = (clases.datos ?? []).filter((c) => c.status === 'scheduled');
  const deHoy = proximas.filter((c) => c.date === hoy);
  const siguientes = proximas.filter((c) => c.date > hoy).slice(0, 3);

  const deudores = (deudas.datos ?? []).filter((f) => f.saldo > 0);
  const totalDeuda = deudores.reduce((s, f) => s + f.saldo, 0);
  const porConfirmar = pagos.datos ?? [];
  const totalPorConfirmar = porConfirmar.reduce((s, p) => s + p.amount, 0);

  const cargando = !clases.datos || !deudas.datos || !pagos.datos;
  const error = clases.error ?? deudas.error ?? pagos.error;

  return (
    <Marco conBarra>
      <Titulo>Hoy</Titulo>
      <p className="mb-2 text-sm text-tenue">{espacio.name}</p>

      {error && <div className="mt-4"><Aviso>{error}</Aviso></div>}
      {cargando && !error && <div className="mt-4"><Vacio>Buscando…</Vacio></div>}

      {!cargando && !error && (
        <>
          {/* ------------------------------------------------- la clase que viene */}
          <Seccion acotacion={deHoy.length > 0 ? fecha(hoy) : undefined}>
            {deHoy.length > 0 ? 'Tu clase de hoy' : 'Lo que viene'}
          </Seccion>

          {deHoy.length === 0 && siguientes.length === 0 && (
            <Vacio>No hay clases cargadas en los próximos quince días.</Vacio>
          )}

          <ul className="flex flex-col gap-2">
            {(deHoy.length > 0 ? deHoy : siguientes).map((c) => (
              <li key={c.id}>
                <Tarjeta>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-tinta">{c.grupo?.name ?? 'Clase'}</p>
                      <p className="text-sm text-tenue">
                        {c.date === hoy ? 'hoy' : fecha(c.date)}
                        {c.start_time ? ` · ${c.start_time.slice(0, 5)}` : ''}
                        {c.venue ? ` · ${c.venue}` : ''}
                      </p>
                    </div>
                    {c.date === hoy && (
                      <button
                        onClick={() => alTomarAsistencia(c)}
                        className="shrink-0 rounded-lg bg-acento px-3 py-1.5 text-sm font-medium text-sobre-acento"
                      >
                        Asistencia
                      </button>
                    )}
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>

          {/* ------------------------------------------------ lo que espera decisión */}
          {porConfirmar.length > 0 && (
            <>
              <Seccion>Te están esperando</Seccion>
              <button onClick={alVerCobros} className="block w-full text-left">
                <Dato
                  valor={plata(totalPorConfirmar)}
                  al={`${porConfirmar.length} ${porConfirmar.length === 1 ? 'transferencia declarada' : 'transferencias declaradas'} · tocá para confirmarlas`}
                  tono="ok"
                />
              </button>
            </>
          )}

          {/* ------------------------------------------------------------ la deuda */}
          {deudores.length > 0 && (
            <>
              <Seccion>Quién te debe</Seccion>
              <button onClick={alVerCobros} className="block w-full text-left">
                <Dato
                  valor={plata(totalDeuda)}
                  al={`${deudores.length} ${deudores.length === 1 ? 'alumno' : 'alumnos'}`}
                  tono="alerta"
                />
              </button>
            </>
          )}

          {porConfirmar.length === 0 && deudores.length === 0 && (
            <>
              <Seccion>La plata</Seccion>
              <Dato valor="Al día" al="nadie te debe y no hay nada esperando que confirmes" tono="ok" />
            </>
          )}
        </>
      )}
    </Marco>
  );
}
