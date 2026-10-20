// ============================================================================
// Mis escuelas — para quien cursa con más de un profesor.
//
// Antes esto era un muro: una lista de nombres que te obligaba a elegir antes
// de poder ver nada. Si tenías clase hoy en una y le debías plata a la otra, la
// app no te lo decía hasta que entraras a cada una — o sea que te hacía elegir
// sin darte con qué elegir.
//
// Ahora cada renglón ya contesta las dos preguntas que traen a alguien acá:
// cuándo es mi próxima clase y cómo estoy de plata. Entrar pasa a ser para el
// detalle, no para enterarse.
// ============================================================================
import { fecha, plata } from '../formato';
import type { ResumenEscuela } from '../datos';
import { Marco, Encabezado, Aviso, Vacio, Lista, Fila, Esqueleto } from '../../comun/ui';
import Salir from './Salir';

export default function MisEscuelas({
  correo,
  resumenes,
  error,
  alElegir,
}: {
  correo: string;
  resumenes: ResumenEscuela[] | null;
  error: string | null;
  alElegir: (fichaId: string) => void;
}) {
  return (
    <Marco>
      <Encabezado titulo="Mis escuelas" bajada={correo} derecha={<Salir />} />

      {error && <Aviso>{error}</Aviso>}
      {!resumenes && !error && <Esqueleto />}
      {resumenes && resumenes.length === 0 && (
        <Vacio>Todavía no tenés ninguna escuela.</Vacio>
      )}

      {resumenes && resumenes.length > 0 && (
        <Lista>
          {resumenes.map((r) => (
            <Fila
              key={r.ficha.id}
              avatar={r.ficha.escuela?.name ?? 'Escuela'}
              titulo={r.ficha.escuela?.name ?? 'Escuela'}
              detalle={
                r.proxima
                  ? `próxima: ${fecha(r.proxima.date)}` +
                    (r.proxima.start_time ? ` · ${r.proxima.start_time.slice(0, 5)}` : '') +
                    (r.proxima.grupo?.name ? ` · ${r.proxima.grupo.name}` : '')
                  : 'sin clases cargadas'
              }
              valor={
                r.debe > 0 ? (
                  <span className="text-alerta">{plata(r.debe)}</span>
                ) : r.aFavor > 0 ? (
                  <span className="text-acento">{plata(r.aFavor)}</span>
                ) : (
                  <span className="text-tenue">al día</span>
                )
              }
              bajoValor={r.debe > 0 ? 'debés' : r.aFavor > 0 ? 'a favor' : undefined}
              alTocar={() => alElegir(r.ficha.id)}
            />
          ))}
        </Lista>
      )}
    </Marco>
  );
}
