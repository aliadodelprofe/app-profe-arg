import { useState } from 'react';
import { traerGrupos, nombreFormato, fecha, linkMapa, horarioDe } from '../datos';
import type { Espacio, Grupo } from '../datos';
import { Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga, BotonSecundario } from '../ui';
import FormularioGrupo from './FormularioGrupo';
import Salir from './Salir';

export default function Grupos({
  espacio,
  email,
  alVolver,
  alElegir,
  alVerDeudas,
  alVerPagos,
}: {
  espacio: Espacio;
  email: string;
  // Sin alVolver, esta es la pantalla de inicio: el profesor tiene un solo
  // espacio y no hay lista adonde volver.
  alVolver?: () => void;
  alElegir: (grupo: Grupo) => void;
  alVerDeudas: () => void;
  alVerPagos: () => void;
}) {
  const { datos, error, recargar } = useCarga(() => traerGrupos(espacio.id), [espacio.id]);
  const [creando, setCreando] = useState(false);

  return (
    <Marco>
      <Encabezado
        titulo="Mis grupos"
        bajada={alVolver ? espacio.name : `${espacio.name} · ${email}`}
        volver={alVolver ? { texto: 'Mis espacios', alTocar: alVolver } : undefined}
        derecha={alVolver ? undefined : <Salir />}
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

      {creando ? (
        <FormularioGrupo
          espacio={espacio}
          alCerrar={() => setCreando(false)}
          alGuardar={() => { setCreando(false); recargar(); }}
        />
      ) : (
        <BotonSecundario onClick={() => setCreando(true)}>+ Nuevo grupo</BotonSecundario>
      )}

      <div className="mt-5">
        {error && <Aviso>{error}</Aviso>}
        {!datos && !error && <Vacio>Buscando…</Vacio>}
        {datos?.length === 0 && <Vacio>Todavía no hay grupos en este espacio.</Vacio>}

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
                    horarioDe(g),
                    g.level,
                    g.venue,
                    g.capacity ? `cupo ${g.capacity}` : null,
                    g.end_date ? `hasta ${fecha(g.end_date)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'sin horario fijo'}
                </p>
                {g.address && (
                  <a
                    href={linkMapa(g.address)} target="_blank" rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-brand-sand underline"
                  >
                    {g.address} · ver en el mapa
                  </a>
                )}
              </Tarjeta>
            </li>
          ))}
        </ul>
      </div>
    </Marco>
  );
}
