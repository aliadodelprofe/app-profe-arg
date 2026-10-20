// ============================================================================
// Escuela — la cuarta hermana del menú.
//
// Todo lo que se configura una vez y después se olvida, junto y en un lugar
// que se puede encontrar: cómo se llama tu escuela, adónde te transfieren tus
// alumnos, y las dos salidas (cambiar de espacio, cerrar sesión).
//
// Antes estaba repartido en tres lados y ninguno era obvio: el nombre se
// editaba con un lapicito debajo del título de "Hoy", los datos para
// transferir vivían al final de Cobros —mezclados con la plata que entra, que
// es otra cosa— y el botón de salir estaba arriba de la lista de grupos. Nada
// de esto es una tarea diaria; todo esto es la escuela.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { editarEspacio, traerMediosDePago } from '../datos';
import type { Espacio } from '../datos';
import {
  Marco, Aviso, Titulo, Seccion, Campo, Texto, Boton, BotonSecundario,
  Esqueleto, useCarga,
} from '../../comun/ui';
import ComoMePagan from './ComoMePagan';
import Salir from './Salir';

export default function Escuela({
  espacio,
  email,
  alRenombrar,
  alCambiarEspacio,
}: {
  espacio: Espacio;
  email: string;
  alRenombrar: (nuevo: Espacio) => void;
  // Solo viene cuando el profesor tiene más de un espacio.
  alCambiarEspacio?: () => void;
}) {
  const medios = useCarga(() => traerMediosDePago(espacio.id), [espacio.id]);

  return (
    <Marco conBarra>
      <Titulo>Mi escuela</Titulo>
      <p className="mb-4 text-sm text-tenue">{email}</p>

      <Datos espacio={espacio} alRenombrar={alRenombrar} />

      {medios.error && <Aviso>{medios.error}</Aviso>}
      {!medios.datos && !medios.error && <Esqueleto />}
      {medios.datos && (
        <ComoMePagan
          espacio={espacio}
          medios={medios.datos}
          destacado={medios.datos.length === 0}
          alCambiar={medios.recargar}
        />
      )}

      <Seccion>Tu cuenta</Seccion>
      <div className="flex flex-wrap items-center gap-2">
        {alCambiarEspacio && (
          <BotonSecundario type="button" onClick={alCambiarEspacio}>
            Cambiar de espacio
          </BotonSecundario>
        )}
        <Salir />
      </div>
    </Marco>
  );
}

// ----------------------------------------------------------------------------
// El nombre y la disciplina.
//
// El nombre no es decorativo: es lo que el alumno ve arriba de todo al abrir
// su app, y lo que le dice de quién son las clases que está mirando.
//
// Solo lo puede cambiar el DUEÑO del espacio: la política que lo permite
// (migración 0002) mira my_owned_tenant_ids() y no la membresía. Un profesor
// invitado al equipo puede dar clases, no renombrar la escuela de otro. Si
// alguien que no es dueño lo intenta, la base devuelve cero filas y el
// formulario lo dice con todas las letras en vez de fallar en silencio.
// ----------------------------------------------------------------------------
function Datos({
  espacio,
  alRenombrar,
}: {
  espacio: Espacio;
  alRenombrar: (nuevo: Espacio) => void;
}) {
  const [nombre, setNombre] = useState(espacio.name);
  const [disciplina, setDisciplina] = useState(espacio.discipline ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const cambio =
    nombre.trim() !== espacio.name || disciplina.trim() !== (espacio.discipline ?? '');

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('La escuela necesita un nombre: es lo que ven tus alumnos.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const nuevo = await editarEspacio(espacio.id, {
        name: nombre.trim(),
        discipline: disciplina.trim() || null,
      });
      alRenombrar(nuevo);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (err) {
      const msg = (err as Error).message;
      setError(
        /no rows|0 rows|multiple/i.test(msg)
          ? 'Solo el dueño del espacio puede cambiarle el nombre.'
          : msg,
      );
    }
    setGuardando(false);
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <Campo
        etiqueta="Nombre"
        ayuda="Es lo que ven tus alumnos arriba de todo cuando abren su app."
      >
        <Texto
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Bachata Influence"
          required
        />
      </Campo>

      <Campo etiqueta="Disciplina" ayuda="Opcional.">
        <Texto
          value={disciplina}
          onChange={(e) => setDisciplina(e.target.value)}
          placeholder="bachata"
        />
      </Campo>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex items-center gap-3">
        <Boton type="submit" disabled={guardando || !cambio}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Boton>
        {guardado && <span className="text-sm text-acento">Guardado.</span>}
      </div>
    </form>
  );
}
