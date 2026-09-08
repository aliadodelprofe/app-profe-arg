// ============================================================================
// Alta y edición de un grupo — el mismo formulario para las dos cosas.
//
// Son el mismo formulario a propósito: si crear y editar fueran dos pantallas
// distintas, cualquier campo nuevo habría que acordarse de agregarlo dos veces,
// y tarde o temprano uno de los dos se queda atrás.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { crearGrupo, editarGrupo, NOMBRE_DIA } from '../datos';
import type { Espacio, Grupo, Formato, DatosGrupo } from '../datos';
import { Aviso, Campo, Texto, Opciones, Boton, BotonSecundario } from '../ui';

export default function FormularioGrupo({
  espacio,
  grupo,
  alCerrar,
  alGuardar,
}: {
  espacio: Espacio;
  // Sin grupo, es un alta.
  grupo?: Grupo;
  alCerrar: () => void;
  alGuardar: (g: Grupo) => void;
}) {
  const [nombre, setNombre] = useState(grupo?.name ?? '');
  const [formato, setFormato] = useState<Formato>(grupo?.format ?? 'regular');
  const [nivel, setNivel] = useState(grupo?.level ?? '');
  const [estudio, setEstudio] = useState(grupo?.venue ?? '');
  const [direccion, setDireccion] = useState(grupo?.address ?? '');
  const [cupo, setCupo] = useState(grupo?.capacity?.toString() ?? '');
  const [desde, setDesde] = useState(grupo?.start_date ?? '');
  const [hasta, setHasta] = useState(grupo?.end_date ?? '');
  const [dia, setDia] = useState<string>(grupo?.weekday?.toString() ?? '');
  const [hora, setHora] = useState(grupo?.default_start_time?.slice(0, 5) ?? '');
  const [duracion, setDuracion] = useState(grupo?.default_duration_min?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    const datos: DatosGrupo = {
      name: nombre.trim(),
      format: formato,
      level: nivel.trim() || null,
      capacity: cupo ? Number(cupo) : null,
      start_date: desde || null,
      end_date: formato === 'cycle' && hasta ? hasta : null,
      venue: estudio.trim() || null,
      address: direccion.trim() || null,
      weekday: dia === '' ? null : Number(dia),
      default_start_time: dia === '' ? null : hora || null,
      default_duration_min: dia === '' ? null : (duracion ? Number(duracion) : null),
    };

    try {
      const g = grupo
        ? await editarGrupo(grupo.id, datos)
        : await crearGrupo(espacio.id, datos);
      alGuardar(g);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={guardar}
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <p className="text-brand-cream">{grupo ? 'Editar grupo' : 'Nuevo grupo'}</p>

      <Campo etiqueta="Nombre">
        <Texto
          required value={nombre} placeholder="Bachata principiantes, martes"
          onChange={(e) => setNombre(e.target.value)}
        />
      </Campo>

      <Campo
        etiqueta="Formato"
        ayuda={
          formato === 'regular'
            ? 'Recurrente y abierta: la gente entra y sale. No tiene fin.'
            : formato === 'cycle'
              ? 'Grupo cerrado con contenidos que progresan. Un workshop es un ciclo de una sola clase.'
              : 'Uno a uno, agendada.'
        }
      >
        <Opciones<Formato>
          valor={formato}
          alElegir={setFormato}
          opciones={[
            { valor: 'regular', texto: 'Regular' },
            { valor: 'cycle', texto: 'Formación' },
            { valor: 'private', texto: 'Particular' },
          ]}
        />
      </Campo>

      {/* ------------------------------------------------------------------
          El horario fijo. Con un día elegido, las clases se crean solas y no
          hay que cargarlas nunca más; el feriado se resuelve cancelando esa
          clase puntual, no dejando el grupo sin horario.
         ------------------------------------------------------------------ */}
      <Campo
        etiqueta="Día fijo"
        ayuda={
          dia === ''
            ? 'Sin día fijo hay que cargar cada clase a mano. Elegí uno y se crean solas.'
            : 'Las clases de los próximos dos meses se crean solas. Si un día no se da, se cancela esa clase.'
        }
      >
        <select
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-brand-cream outline-none focus:border-brand-sand"
        >
          <option value="">Sin día fijo</option>
          {NOMBRE_DIA.map((n, i) => (
            <option key={i} value={i}>{n}</option>
          ))}
        </select>
      </Campo>

      {dia !== '' && (
        <>
          <Campo etiqueta="Hora">
            <Texto type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </Campo>
          <Campo etiqueta="Duración en minutos">
            <Texto
              type="number" min="15" step="15" value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
            />
          </Campo>
        </>
      )}

      <Campo etiqueta="Nivel (opcional)">
        <Texto value={nivel} placeholder="Principiante" onChange={(e) => setNivel(e.target.value)} />
      </Campo>

      <Campo etiqueta="Estudio (opcional)" ayuda="Como le dicen al lugar: Vibras, Bunker.">
        <Texto value={estudio} placeholder="Vibras" onChange={(e) => setEstudio(e.target.value)} />
      </Campo>

      <Campo etiqueta="Dirección (opcional)" ayuda="Con esto tus alumnos abren el mapa y llegan.">
        <Texto
          value={direccion} placeholder="Av. Corrientes 1234, CABA"
          onChange={(e) => setDireccion(e.target.value)}
        />
      </Campo>

      <Campo etiqueta="Cupo (opcional)">
        <Texto type="number" min="1" value={cupo} onChange={(e) => setCupo(e.target.value)} />
      </Campo>

      <Campo etiqueta="Empieza (opcional)">
        <Texto type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
      </Campo>

      {formato === 'cycle' && (
        <Campo etiqueta="Termina">
          <Texto type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </Campo>
      )}

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : grupo ? 'Guardar cambios' : 'Crear grupo'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
