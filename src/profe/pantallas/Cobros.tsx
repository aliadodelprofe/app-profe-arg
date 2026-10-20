// ============================================================================
// Cobros — todo lo que es plata, en un solo lugar.
//
// Antes esto eran tres pantallas en tres lugares distintos: "quién me debe" y
// "pagos por confirmar" colgaban de la lista de grupos, y lo cobrado estaba
// adentro de pagos. Juntarlas fue lo correcto, pero quedaron APILADAS: cinco
// bloques, cada uno con su título y sus tarjetas, uno abajo del otro. Son tres
// preguntas distintas sobre el mismo tema, y leerlas de corrido obligaba a
// recorrer la pantalla entera para encontrar una.
//
// Ahora son tres solapas hermanas, con el número de cada una a la vista:
//
//   PARA CONFIRMAR — lo único que pide una decisión tuya hoy. Mientras no lo
//                    confirmes, el estado de cuenta de ese alumno está mal.
//   QUIÉN TE DEBE  — hay que mirarlo, pero no es de hoy.
//   COBRADO        — el registro. No pide nada, se consulta.
//
// Y la pantalla ABRE EN LA QUE TIENE TRABAJO: si hay transferencias esperando,
// abre ahí; si no, en quién te debe; si no debe nadie, en lo cobrado. El
// profesor no tiene que acordarse de revisar: la app le muestra primero lo que
// está esperando por él.
//
// Los datos cargan una sola vez acá arriba y bajan por props. Antes cada
// sección hacía su propia consulta, así que abrir Cobros disparaba cuatro
// viajes a la base para una pantalla sola.
// ============================================================================
import { useState } from 'react';
import { traerCobros, traerDeudas, traerPagosPorConfirmar, traerMediosDePago } from '../datos';
import type { Espacio } from '../datos';
import { Marco, Aviso, Titulo, Segmentos, Esqueleto, useCarga } from '../../comun/ui';
import ParaConfirmar from './Pagos';
import QuienDebe from './Deudas';
import Cobrado from './Cobrado';
import ComoMePagan from './ComoMePagan';

type Cual = 'confirmar' | 'deben' | 'cobrado';

export default function Cobros({ espacio }: { espacio: Espacio }) {
  const pagos = useCarga(() => traerPagosPorConfirmar(espacio.id), [espacio.id]);
  const deudas = useCarga(() => traerDeudas(espacio.id), [espacio.id]);
  const cobros = useCarga(() => traerCobros(espacio.id), [espacio.id]);
  const medios = useCarga(() => traerMediosDePago(espacio.id), [espacio.id]);

  // null = todavía no elegiste; manda la sugerencia. Así la solapa se acomoda
  // sola cuando llegan los datos, pero deja de moverse apenas tocás una.
  const [elegida, setElegida] = useState<Cual | null>(null);

  const porConfirmar = pagos.datos?.length ?? 0;
  const deudores = deudas.datos?.filter((f) => f.saldo > 0).length ?? 0;
  const sugerida: Cual = porConfirmar > 0 ? 'confirmar' : deudores > 0 ? 'deben' : 'cobrado';
  const cual = elegida ?? sugerida;

  // Sin medio de pago cargado, el alumno no sabe adónde transferirte: eso es
  // urgente y va arriba. Una vez cargado deja de serlo y se va al final, con
  // lo que se consulta y no se hace.
  const sinMedio = medios.datos !== null && medios.datos.length === 0;

  return (
    <Marco conBarra>
      <Titulo>Cobros</Titulo>
      <p className="mb-4 text-sm text-tenue">{espacio.name}</p>

      {sinMedio && (
        <ComoMePagan espacio={espacio} medios={[]} destacado alCambiar={medios.recargar} />
      )}

      <Segmentos<Cual>
        valor={cual}
        alElegir={setElegida}
        opciones={[
          { id: 'confirmar', texto: 'Para confirmar', cuantos: porConfirmar },
          { id: 'deben', texto: 'Te deben', cuantos: deudores },
          { id: 'cobrado', texto: 'Cobrado' },
        ]}
      />

      {cual === 'confirmar' && (
        <ParaConfirmar
          pagos={pagos.datos}
          error={pagos.error}
          alResolver={() => {
            deudas.recargar();
            cobros.recargar();
          }}
        />
      )}

      {cual === 'deben' && <QuienDebe deudas={deudas.datos} error={deudas.error} />}

      {cual === 'cobrado' && (
        <>
          {cobros.error && <Aviso>{cobros.error}</Aviso>}
          {!cobros.datos && !cobros.error && <Esqueleto />}
          {cobros.datos && <Cobrado cobros={cobros.datos} />}
        </>
      )}

      {medios.error && <Aviso>{medios.error}</Aviso>}
      {medios.datos && medios.datos.length > 0 && (
        <ComoMePagan espacio={espacio} medios={medios.datos} alCambiar={medios.recargar} />
      )}
    </Marco>
  );
}
