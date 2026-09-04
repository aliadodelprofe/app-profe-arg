import { traerGrupos, nombreFormato, fecha } from '../datos';
import type { Espacio, Grupo } from '../datos';
import { Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga } from '../ui';

export default function Grupos({
  espacio,
  alVolver,
  alElegir,
}: {
  espacio: Espacio;
  alVolver: () => void;
  alElegir: (grupo: Grupo) => void;
}) {
  const { datos, error } = useCarga(() => traerGrupos(espacio.id), [espacio.id]);

  return (
    <Marco>
      <Encabezado
        titulo="Mis grupos"
        bajada={espacio.name}
        volver={{ texto: 'Mis espacios', alTocar: alVolver }}
      />

      {error && <Aviso>{error}</Aviso>}
      {!datos && !error && <Vacio>Buscando…</Vacio>}
      {datos?.length === 0 && (
        <Vacio>Todavía no hay grupos en este espacio.</Vacio>
      )}

      <ul className="flex flex-col gap-2">
        {datos?.map((g) => (
          <li key={g.id}>
            <Tarjeta alTocar={() => alElegir(g)}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-brand-cream">{g.name}</p>
                <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-xs text-brand-taupe">
                  {nombreFormato[g.format]}
                </span>
              </div>
              <p className="text-sm text-brand-taupe">
                {[
                  g.level,
                  g.capacity ? `cupo ${g.capacity}` : null,
                  // Un grupo regular no tiene fin: mostrar "desde" y nada más
                  // es lo correcto, no un dato que falta.
                  g.start_date ? `desde ${fecha(g.start_date)}` : null,
                  g.end_date ? `hasta ${fecha(g.end_date)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'sin datos adicionales'}
              </p>
            </Tarjeta>
          </li>
        ))}
      </ul>
    </Marco>
  );
}
