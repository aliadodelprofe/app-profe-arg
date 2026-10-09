import { useState } from 'react';
import { traerGrupos, nombreFormato, fecha, linkMapa, horarioDe } from '../datos';
import type { Espacio, Grupo } from '../datos';
import { Marco, Aviso, Vacio, Tarjeta, Titulo, Etiqueta, useCarga, BotonSecundario } from '../../comun/ui';
import FormularioGrupo from './FormularioGrupo';
import Salir from './Salir';

export default function Grupos({
  espacio,
  email,
  alVolver,
  alElegir,
}: {
  espacio: Espacio;
  email: string;
  // Sin alVolver, el profesor tiene un solo espacio y no hay lista adonde
  // volver. La barra de abajo es la navegación; este "volver" es la excepción.
  alVolver?: () => void;
  alElegir: (grupo: Grupo) => void;
}) {
  const { datos, error, recargar } = useCarga(() => traerGrupos(espacio.id), [espacio.id]);
  const [creando, setCreando] = useState(false);

  return (
    <Marco conBarra>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          {alVolver && (
            <button
              onClick={alVolver}
              className="mb-2 block text-sm text-tenue hover:text-acento"
            >
              ← Mis espacios
            </button>
          )}
          <Titulo>Grupos</Titulo>
          <p className="text-sm text-tenue">
            {alVolver ? espacio.name : `${espacio.name} · ${email}`}
          </p>
        </div>
        <Salir />
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
                  <p className="font-medium text-tinta">{g.name}</p>
                  <Etiqueta>{nombreFormato[g.format]}</Etiqueta>
                </div>
                <p className="text-sm text-tenue">
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
                    className="text-sm text-acento underline"
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
