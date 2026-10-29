// ============================================================================
// Mis espacios
//
// Solo se ve cuando el profesor tiene más de uno, o todavía ninguno. Con uno
// solo, la app entra derecho a los grupos.
//
// El caso "ninguno" no es uno solo, son dos: un profesor nuevo registrándose,
// o un alumno que entró por la puerta equivocada. La app se fija cuál es antes
// de ofrecerle nada.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { crearEspacio, soyAlumnoDeAlguien } from '../datos';
import type { Espacio } from '../datos';
import {
  Marco, Encabezado, Aviso, Vacio, useCarga,
  Campo, Texto, Boton, BotonSecundario, Lista, Fila,
} from '../../comun/ui';
import Salir from './Salir';

export default function Espacios({
  email,
  userId,
  espacios,
  alCrear,
  alElegir,
}: {
  email: string;
  userId: string;
  espacios: Espacio[];
  alCrear: () => void;
  alElegir: (espacio: Espacio) => void;
}) {
  const vacio = espacios.length === 0;
  // Solo hace falta preguntar cuando no hay espacios.
  const alumno = useCarga(
    () => (vacio ? soyAlumnoDeAlguien(userId) : Promise.resolve(false)),
    [userId, vacio],
  );
  const [creando, setCreando] = useState(false);

  if (vacio) {
    return (
      <Marco>
        <Encabezado titulo="App del profesor" bajada={email} derecha={<Salir />} />

        {alumno.error && <Aviso>{alumno.error}</Aviso>}
        {alumno.datos === null && !alumno.error && <Vacio>Cargando…</Vacio>}

        {alumno.datos === true && !creando && (
          <>
            <Vacio>
              Esta es la app del profesor y no tenés ningún espacio a tu nombre.
              Si venís a ver tus clases y tu estado de cuenta como alumno,{' '}
              <a href="/alumno" className="text-acento underline">entrá por acá</a> — es
              la misma cuenta.
            </Vacio>
            <button
              onClick={() => setCreando(true)}
              className="mt-4 text-sm text-tenue underline hover:text-acento"
            >
              Soy profesor y quiero crear mi espacio
            </button>
          </>
        )}

        {alumno.datos === false && !creando && (
          <>
            <Vacio>
              Todavía no tenés un espacio. Un espacio es tu proyecto: adentro van
              tus grupos, tus alumnos y tus cobros. No es la sala donde das clase.
            </Vacio>
            <div className="mt-4">
              <Boton onClick={() => setCreando(true)}>Crear mi espacio</Boton>
            </div>
          </>
        )}

        {creando && (
          <FormularioEspacio
            alCerrar={() => setCreando(false)}
            alCrear={() => { setCreando(false); alCrear(); }}
          />
        )}
      </Marco>
    );
  }

  return (
    <Marco>
      <Encabezado titulo="Mis espacios" bajada={email} derecha={<Salir />} />

      <Lista>
        {espacios.map((e) => (
          <Fila
            key={e.id}
            avatar={e.name}
            foto={e.avatar_url}
            titulo={e.name}
            detalle={`${e.disciplinas.length > 0 ? `${e.disciplinas.length} ${e.disciplinas.length === 1 ? 'actividad' : 'actividades'}` : 'sin actividades'} · plan ${e.plan}`}
            alTocar={() => alElegir(e)}
          />
        ))}
      </Lista>

      <div className="mt-4" />

      {creando ? (
        <FormularioEspacio
          alCerrar={() => setCreando(false)}
          alCrear={() => { setCreando(false); alCrear(); }}
        />
      ) : (
        <BotonSecundario onClick={() => setCreando(true)}>+ Nuevo espacio</BotonSecundario>
      )}
    </Marco>
  );
}

function FormularioEspacio({
  alCerrar,
  alCrear,
}: {
  alCerrar: () => void;
  alCrear: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await crearEspacio(nombre.trim());
      alCrear();
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={guardar}
      className="mt-4 flex flex-col gap-3 rounded-2xl bg-panel p-4"
    >
      <p className="text-tinta">Nuevo espacio</p>

      <Campo etiqueta="Nombre" ayuda="Como le decís a tu proyecto. No es la sala donde das clase.">
        <Texto required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>

      {/* Las actividades no se piden acá. Crear el espacio es un paso, y
          marcar seis botones antes de ver nada es un peaje: se eligen después,
          en "Mi escuela", que es donde se editan y donde se ven junto al logo
          y el nombre. */}

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear espacio'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
