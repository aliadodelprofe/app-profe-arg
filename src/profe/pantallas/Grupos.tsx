import { traerGrupos, nombreFormato, fecha } from '../datos';
import type { Espacio, Grupo } from '../datos';
import { Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga } from '../ui';

export default function Grupos({
  espacio,
  alVolver,
  alElegir,
  alVerDeudas,
  alVerPagos,
}: {
  espacio: Espacio;
  alVolver: () => void;
  alElegir: (grupo: Grupo) => void;
  alVerDeudas: () => void;
  alVerPagos: () => void;
}) {
  const { datos, error } = useCarga(() => traerGrupos(espacio.id), [espacio.id]);

  return (
    <Marco>
      <Encabezado
        titulo="Mis grupos"
        bajada={espacio.name}
        volver={{ texto: 'Mis espacios', alTocar: alVolver }}
      />

      <div className="mb-5 flex flex-col gap-2">
        <button
          onClick={alVerDeudas}
          className="w-full rounded-xl border border-brand-sand/30 bg-brand-sand/5 px-4 py-3 text-left hover:border-brand-sand/60"
        >
          <p className="text-brand-sand">Quién me debe →</p>
          <p className="text-sm text-brand-taupe">Estado de cuenta de todo el espacio</p>
        </button>
        <button
          onClick={alVerPagos}
          className="w-full rounded-xl border border-brand-sand/30 bg-brand-sand/5 px-4 py-3 text-left hover:border-brand-sand/60"
        >
          <p className="text-brand-sand">Pagos por confirmar →</p>
          <p className="text-sm text-brand-taupe">Transferencias que declararon tus alumnos</p>
        </button>
      </div>

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
