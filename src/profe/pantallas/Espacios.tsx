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
  Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga,
  Campo, Texto, Boton, BotonSecundario,
} from '../ui';
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
              Si venís a ver tus clases y tu estado de cuenta como alumno, esa
              parte todavía está en construcción.
            </Vacio>
            <button
              onClick={() => setCreando(true)}
              className="mt-4 text-sm text-brand-taupe underline hover:text-brand-sand"
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

      <ul className="mb-4 flex flex-col gap-2">
        {espacios.map((e) => (
          <li key={e.id}>
            <Tarjeta alTocar={() => alElegir(e)}>
              <p className="text-brand-cream">{e.name}</p>
              <p className="text-sm text-brand-taupe">
                {e.discipline ?? 'sin disciplina'} · plan {e.plan}
              </p>
            </Tarjeta>
          </li>
        ))}
      </ul>

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
  const [disciplina, setDisciplina] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await crearEspacio(nombre.trim(), disciplina.trim() || null);
      alCrear();
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={guardar}
      className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <p className="text-brand-cream">Nuevo espacio</p>

      <Campo etiqueta="Nombre" ayuda="Como le decís a tu proyecto. No es la sala donde das clase.">
        <Texto required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>

      <Campo etiqueta="Disciplina (opcional)">
        <Texto value={disciplina} placeholder="bachata" onChange={(e) => setDisciplina(e.target.value)} />
      </Campo>

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
