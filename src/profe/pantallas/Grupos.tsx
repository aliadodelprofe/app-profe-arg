import { useState } from 'react';
import { traerGrupos, nombreFormato, horarioDe, periodoDe, hoyISO } from '../datos';
import type { Espacio, Grupo } from '../datos';
import {
  Marco, Aviso, Vacio, Titulo, Etiqueta, useCarga, Boton,
  Lista, Fila, Hoja, Esqueleto,
} from '../../comun/ui';
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

      <div className="mb-4">
        <Boton onClick={() => setCreando(true)}>Nuevo grupo</Boton>
      </div>

      {error && <Aviso>{error}</Aviso>}
      {!datos && !error && <Esqueleto />}
      {datos?.length === 0 && <Vacio>Todavía no hay grupos en este espacio.</Vacio>}

      {datos && datos.length > 0 && (
        <Lista>
          {datos.map((g) => (
            <Fila
              key={g.id}
              // El avatar de un grupo no es una cara, pero cumple la misma
              // función: darle a cada fila una marca de color propia para
              // poder encontrarla sin leer.
              avatar={g.name}
              titulo={g.name}
              detalle={
                [horarioDe(g), g.level, g.venue, g.capacity ? `cupo ${g.capacity}` : null]
                  .filter(Boolean)
                  .join(' · ') || 'sin horario fijo'
              }
              valor={<Etiqueta>{nombreFormato[g.format]}</Etiqueta>}
              bajoValor={periodoDe(g, hoyISO()) ?? undefined}
              alTocar={() => alElegir(g)}
            />
          ))}
        </Lista>
      )}

      {creando && (
        <Hoja titulo="Nuevo grupo" alCerrar={() => setCreando(false)}>
          <FormularioGrupo
            espacio={espacio}
            alCerrar={() => setCreando(false)}
            alGuardar={() => { setCreando(false); recargar(); }}
          />
        </Hoja>
      )}
    </Marco>
  );
}
