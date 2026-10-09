// ============================================================================
// Cobros — todo lo que es plata, en un solo lugar.
//
// Antes esto eran tres pantallas en tres lugares distintos: "quién me debe" y
// "pagos por confirmar" colgaban de la lista de grupos, y lo cobrado estaba
// adentro de pagos. Para entender cómo venía el mes había que recorrer la app.
//
// Son tres preguntas sobre el mismo tema y ahora se leen de corrido, en el
// orden en que importan:
//
//   1. PARA CONFIRMAR — lo único que pide una decisión tuya hoy. Mientras no
//      lo confirmes, el estado de cuenta de ese alumno está mal.
//   2. QUIÉN TE DEBE — hay que mirarlo, pero no es de hoy.
//   3. COBRADO — el registro. No pide nada, se consulta.
//
// Las acciones primero y el archivo después. Una pantalla que arranca con el
// resumen del mes te hace bajar para encontrar lo que tenés que hacer.
// ============================================================================
import { traerCobros } from '../datos';
import type { Espacio } from '../datos';
import { Marco, Aviso, Titulo, useCarga } from '../../comun/ui';
import ParaConfirmar from './Pagos';
import QuienDebe from './Deudas';
import Cobrado from './Cobrado';

export default function Cobros({ espacio }: { espacio: Espacio }) {
  const cobros = useCarga(() => traerCobros(espacio.id), [espacio.id]);

  return (
    <Marco conBarra>
      <Titulo>Cobros</Titulo>
      <p className="mb-2 text-sm text-tenue">{espacio.name}</p>

      <ParaConfirmar espacio={espacio} />
      <QuienDebe espacio={espacio} />

      <div>
        {cobros.error && <Aviso>{cobros.error}</Aviso>}
        {cobros.datos && <Cobrado cobros={cobros.datos} />}
      </div>
    </Marco>
  );
}
