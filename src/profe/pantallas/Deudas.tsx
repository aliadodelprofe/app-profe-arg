// ============================================================================
// Quién te debe — una SECCIÓN de la pantalla de Cobros, no una pantalla.
//
// Es la pregunta que hoy se contesta cruzando una planilla a mano. Acá es una
// consulta sobre la vista student_account.
//
// Un alumno puede deber y a la vez tener un pago declarado esperando: en ese
// caso la deuda no es real, es tuya la tarea de confirmarlo. Por eso se
// muestran las dos cosas juntas y no una sola.
// ============================================================================
import { plata } from '../datos';
import type { FilaDeuda } from '../datos';
import {
  Aviso, Vacio, Seccion, Dato, Lista, Fila, Esqueleto, EnEspera,
} from '../../comun/ui';

export default function QuienDebe({
  deudas: datos,
  error,
}: {
  deudas: FilaDeuda[] | null;
  error: string | null;
}) {

  const deudores = datos?.filter((f) => f.saldo > 0) ?? [];
  const alDia = datos?.filter((f) => f.saldo <= 0).length ?? 0;
  // Quienes pagaron de más o por adelantado. Es plata que ya está en tu cuenta
  // y que se va a ir descontando de lo que les toque: conviene saber quiénes
  // son antes de reclamarles algo.
  const conCredito = datos?.filter((f) => f.aFavor > 0) ?? [];
  const totalCredito = conCredito.reduce((s, f) => s + f.aFavor, 0);
  const total = deudores.reduce((s, f) => s + f.saldo, 0);
  const porConfirmar = deudores.reduce((s, f) => s + f.pendiente, 0);
  const cuantosEsperan = deudores.filter((f) => f.pendiente > 0).length;

  return (
    <>
      {error && <Aviso>{error}</Aviso>}
      {!datos && !error && <Esqueleto />}

      {datos && deudores.length === 0 && (
        <Vacio>No te debe nadie.{alDia > 0 && ` ${alDia} alumnos al día.`}</Vacio>
      )}

      {deudores.length > 0 && (
        <>
          <div className="mb-4">
            <Dato
              valor={plata(total)}
              al={`${deudores.length} ${deudores.length === 1 ? 'alumno debe' : 'alumnos deben'}${alDia > 0 ? ` · ${alDia} al día` : ''}`}
              tono="alerta"
            />
          </div>

          {/* ESTO NO ES UNA ACLARACIÓN, ES UNA TAREA.
              
              Era una línea de 14px colgada abajo del número, del mismo tamaño
              que cualquier nota al pie. Y dice algo que le cambia el sentido a
              la cifra grande de arriba: parte de esa deuda no es deuda, es
              plata que ya está y que falta que el profesor dé por buena.
              
              Mismo bloque que ve el alumno de su lado, a propósito. Es el
              mismo hecho mirado desde las dos puntas: él espera que vos
              confirmes, vos tenés que confirmar. */}
          {porConfirmar > 0 && (
            <div className="mb-4">
              <EnEspera titulo={`${plata(porConfirmar)} esperando que los confirmes`}>
                {cuantosEsperan === 1
                  ? 'De un alumno. Hasta que lo confirmes, esa plata sigue contando como deuda acá arriba.'
                  : `De ${cuantosEsperan} alumnos. Hasta que los confirmes, esa plata sigue contando como deuda acá arriba.`}
              </EnEspera>
            </div>
          )}

          <Lista>
            {[...deudores]
              .sort((a, b) => b.saldo - a.saldo)
              .map((f) => (
                <Fila
                  key={f.alumno.id}
                  avatar={f.alumno.full_name}
                  foto={f.alumno.avatar_url}
                  titulo={f.alumno.full_name}
                  detalle={
                    f.pendiente > 0
                      ? `declaró ${plata(f.pendiente)} · falta que lo confirmes`
                      : null
                  }
                  valor={<span className="text-alerta">{plata(f.saldo)}</span>}
                />
              ))}
          </Lista>
        </>
      )}

      {/* ----------------------------------------------------- pagado de más
          Va después de los deudores porque no es una tarea: no hay nada que
          hacer con esta plata, se aplica sola a lo que vaya venciendo. Está
          para que no le reclames a alguien que está adelantado. */}
      {conCredito.length > 0 && (
        <>
          <Seccion acotacion={plata(totalCredito)}>Pagaron por adelantado</Seccion>
          <p className="mb-3 text-sm text-tenue">
            Se descuenta solo de lo que les vaya venciendo.
          </p>
          <Lista>
            {[...conCredito]
              .sort((a, b) => b.aFavor - a.aFavor)
              .map((f) => (
                <Fila
                  key={f.alumno.id}
                  avatar={f.alumno.full_name}
                  foto={f.alumno.avatar_url}
                  titulo={f.alumno.full_name}
                  valor={<span className="text-acento">{plata(f.aFavor)}</span>}
                />
              ))}
          </Lista>
        </>
      )}
    </>
  );
}
