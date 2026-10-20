// ============================================================================
// El nombre de la escuela.
//
// No es decorativo: es lo que el alumno ve arriba de todo al abrir su app, y
// lo que le dice de quién son las clases que está mirando. Hasta ahora se
// escribía una vez al crear la cuenta y no había forma de corregir ni un error
// de tipeo.
//
// Solo lo puede cambiar el dueño del espacio: la política de RLS que lo
// permite (migración 0002) mira my_owned_tenant_ids(), no la membresía. Un
// profesor invitado al equipo puede dar clases, no renombrar la escuela de
// otro. Si alguien que no es dueño lo intenta, la base devuelve cero filas y
// el formulario lo dice.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { editarEspacio } from '../datos';
import type { Espacio } from '../datos';
import { Aviso, Campo, Texto, Boton, BotonSecundario } from '../../comun/ui';

export default function MiEscuelaProfe({
  espacio,
  alCerrar,
  alGuardar,
}: {
  espacio: Espacio;
  alCerrar: () => void;
  alGuardar: (nuevo: Espacio) => void;
}) {
  const [nombre, setNombre] = useState(espacio.name);
  const [disciplina, setDisciplina] = useState(espacio.discipline ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

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
      alGuardar(nuevo);
    } catch (err) {
      const msg = (err as Error).message;
      // "single()" sin filas: la política lo dejó afuera.
      setError(
        /no rows|0 rows|multiple/i.test(msg)
          ? 'Solo el dueño del espacio puede cambiarle el nombre.'
          : msg,
      );
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <p className="text-sm text-tenue">
        Este nombre es el que ven tus alumnos arriba de todo cuando abren su app.
      </p>

      <Campo etiqueta="Nombre">
        <Texto
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Bachata Influence"
          required
          autoFocus
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

      <div className="flex flex-wrap gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>
          Cancelar
        </BotonSecundario>
      </div>
    </form>
  );
}
