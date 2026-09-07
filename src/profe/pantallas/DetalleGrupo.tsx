import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  traerInscripciones, traerClases, traerAlumnos, crearAlumno, inscribir, crearClase,
  editarClase, cambiarEstadoClase, lugarDe, linkMapa,
  nombreFormato, nombreCobro, fecha, plata,
} from '../datos';
import type { Espacio, Grupo, Clase, Alumno, ModoCobro } from '../datos';
import {
  Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga,
  Campo, Texto, Opciones, Boton, BotonSecundario,
} from '../ui';

export default function DetalleGrupo({
  espacio,
  grupo,
  alVolver,
  alTomarAsistencia,
}: {
  espacio: Espacio;
  grupo: Grupo;
  alVolver: () => void;
  alTomarAsistencia: (clase: Clase) => void;
}) {
  const inscripciones = useCarga(() => traerInscripciones(grupo.id), [grupo.id]);
  const clases = useCarga(() => traerClases(grupo.id), [grupo.id]);
  const [anotando, setAnotando] = useState(false);
  const [cargandoClase, setCargandoClase] = useState(false);

  return (
    <Marco>
      <Encabezado
        titulo={grupo.name}
        bajada={`${nombreFormato[grupo.format]}${grupo.level ? ' · ' + grupo.level : ''} · ${espacio.name}`}
        volver={{ texto: 'Mis grupos', alTocar: alVolver }}
      />

      {/* ---------------------------------------------------------------
          Alumnos. Cómo paga cada uno sale de la inscripción, no del grupo:
          por eso dentro del mismo grupo puede haber uno por clase y otro
          por mes.
         --------------------------------------------------------------- */}
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-taupe">
        Alumnos
      </h2>

      {inscripciones.error && <Aviso>{inscripciones.error}</Aviso>}
      {!inscripciones.datos && !inscripciones.error && <Vacio>Buscando…</Vacio>}
      {inscripciones.datos?.length === 0 && (
        <Vacio>Todavía no hay nadie inscripto en este grupo.</Vacio>
      )}

      <ul className="mb-3 flex flex-col gap-2">
        {inscripciones.datos?.map((i) => (
          <li key={i.id}>
            <Tarjeta>
              <div className="flex items-center justify-between gap-3">
                <p className="text-brand-cream">
                  {i.alumno?.full_name ?? 'Alumno sin ficha'}
                </p>
                <p className="shrink-0 text-sm text-brand-sand">
                  {plata(i.agreed_price)}{' '}
                  <span className="text-brand-taupe">{nombreCobro[i.billing_mode]}</span>
                </p>
              </div>
              {i.status !== 'active' && (
                <p className="text-sm text-brand-taupe">inscripción {i.status}</p>
              )}
            </Tarjeta>
          </li>
        ))}
      </ul>

      <div className="mb-8">
        {anotando ? (
          <FormularioAlumno
            espacio={espacio}
            grupo={grupo}
            yaInscriptos={
              inscripciones.datos?.map((i) => i.alumno?.id).filter(Boolean) as string[] ?? []
            }
            alCerrar={() => setAnotando(false)}
            alAnotar={() => { setAnotando(false); inscripciones.recargar(); }}
          />
        ) : (
          <BotonSecundario onClick={() => setAnotando(true)}>+ Anotar alumno</BotonSecundario>
        )}
      </div>

      {/* ---------------------------------------------------------------
          Clases. El recap es el motivo principal por el que un alumno
          abre la app, así que se muestra acá y no escondido.
          Tocar una clase abre la asistencia de esa clase.
         --------------------------------------------------------------- */}
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-taupe">
        Clases
      </h2>

      <div className="mb-3">
        {cargandoClase ? (
          <FormularioClase
            espacio={espacio}
            grupo={grupo}
            alCerrar={() => setCargandoClase(false)}
            alCrear={() => { setCargandoClase(false); clases.recargar(); }}
          />
        ) : (
          <BotonSecundario onClick={() => setCargandoClase(true)}>+ Cargar clase</BotonSecundario>
        )}
      </div>

      {clases.error && <Aviso>{clases.error}</Aviso>}
      {!clases.datos && !clases.error && <Vacio>Buscando…</Vacio>}
      {clases.datos?.length === 0 && <Vacio>Todavía no hay clases cargadas.</Vacio>}

      <ul className="flex flex-col gap-2">
        {clases.datos?.map((c) => (
          <li key={c.id}>
            <FilaClase
              clase={c}
              grupo={grupo}
              alTomarAsistencia={() => alTomarAsistencia(c)}
              alCambiar={clases.recargar}
            />
          </li>
        ))}
      </ul>
    </Marco>
  );
}

// ----------------------------------------------------------------------------
// Anotar un alumno en el grupo
//
// Son dos cosas distintas y conviene no confundirlas: la FICHA del alumno
// (existe una vez en tu escuela) y la INSCRIPCIÓN (lo mete en este grupo, con
// su precio y su forma de pago). Alguien que ya cursa otro grupo tuyo no
// necesita ficha nueva; necesita otra inscripción.
// ----------------------------------------------------------------------------
function FormularioAlumno({
  espacio,
  grupo,
  yaInscriptos,
  alCerrar,
  alAnotar,
}: {
  espacio: Espacio;
  grupo: Grupo;
  yaInscriptos: string[];
  alCerrar: () => void;
  alAnotar: () => void;
}) {
  const alumnos = useCarga(() => traerAlumnos(espacio.id), [espacio.id]);

  const [quien, setQuien] = useState<'nuevo' | 'existente'>('nuevo');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [elegido, setElegido] = useState('');
  const [cobro, setCobro] = useState<ModoCobro>('per_session');
  const [precio, setPrecio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const disponibles: Alumno[] =
    alumnos.datos?.filter((a) => !yaInscriptos.includes(a.id)) ?? [];

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      let alumnoId = elegido;

      if (quien === 'nuevo') {
        const creado = await crearAlumno(espacio.id, {
          full_name: nombre.trim(),
          email: email.trim() || null,
          phone: telefono.trim() || null,
        });
        alumnoId = creado.id;
      }

      if (!alumnoId) throw new Error('Elegí un alumno');

      await inscribir(espacio.id, {
        group_id: grupo.id,
        student_id: alumnoId,
        billing_mode: cobro,
        agreed_price: precio ? Number(precio) : null,
      });

      alAnotar();
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
      <p className="text-brand-cream">Anotar alumno en {grupo.name}</p>

      <Opciones<'nuevo' | 'existente'>
        valor={quien}
        alElegir={setQuien}
        opciones={[
          { valor: 'nuevo', texto: 'Alumno nuevo' },
          { valor: 'existente', texto: 'Ya está en mi escuela' },
        ]}
      />

      {quien === 'nuevo' ? (
        <>
          <Campo etiqueta="Nombre y apellido">
            <Texto required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Campo etiqueta="Email (opcional)" ayuda="Va a servir para que después entre a ver sus clases.">
            <Texto type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          <Campo etiqueta="Teléfono (opcional)">
            <Texto value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </Campo>
        </>
      ) : (
        <Campo etiqueta="Alumno">
          {disponibles.length === 0 ? (
            <p className="text-sm text-brand-taupe">
              {alumnos.datos
                ? 'No queda nadie de tu escuela sin anotar en este grupo.'
                : 'Buscando…'}
            </p>
          ) : (
            <select
              required
              value={elegido}
              onChange={(e) => setElegido(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-brand-cream outline-none focus:border-brand-sand"
            >
              <option value="">Elegir…</option>
              {disponibles.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          )}
        </Campo>
      )}

      <Campo
        etiqueta="Cómo paga"
        ayuda="Es de esta inscripción, no del grupo: otro alumno del mismo grupo puede pagar distinto."
      >
        <Opciones<ModoCobro>
          valor={cobro}
          alElegir={setCobro}
          opciones={[
            { valor: 'per_session', texto: 'Por clase' },
            { valor: 'per_period', texto: 'Por mes' },
            { valor: 'one_time', texto: 'Pago único' },
          ]}
        />
      </Campo>

      <Campo etiqueta="Precio acordado">
        <Texto
          type="number" min="0" step="100" value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />
      </Campo>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Anotando…' : 'Anotar'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------------------
// Cargar una clase
//
// El recap no se pide acá: se escribe cuando la clase terminó, y para eso
// está la pantalla de asistencia. Pedirlo antes sería pedirle al profe que
// adivine lo que va a dar.
// ----------------------------------------------------------------------------
function FormularioClase({
  espacio,
  grupo,
  alCerrar,
  alCrear,
}: {
  espacio: Espacio;
  grupo: Grupo;
  alCerrar: () => void;
  alCrear: () => void;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [dia, setDia] = useState(hoy);
  const [hora, setHora] = useState('');
  const [duracion, setDuracion] = useState('');
  const [titulo, setTitulo] = useState('');
  const [estudio, setEstudio] = useState('');
  const [direccion, setDireccion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await crearClase(espacio.id, {
        group_id: grupo.id,
        date: dia,
        start_time: hora || null,
        duration_min: duracion ? Number(duracion) : null,
        title: titulo.trim() || null,
        venue: estudio.trim() || null,
        address: direccion.trim() || null,
      });
      alCrear();
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
      <p className="text-brand-cream">Nueva clase de {grupo.name}</p>

      <Campo etiqueta="Día">
        <Texto type="date" required value={dia} onChange={(e) => setDia(e.target.value)} />
      </Campo>

      <Campo etiqueta="Hora (opcional)">
        <Texto type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
      </Campo>

      <Campo etiqueta="Duración en minutos (opcional)">
        <Texto type="number" min="15" step="15" value={duracion} onChange={(e) => setDuracion(e.target.value)} />
      </Campo>

      <Campo etiqueta="Título (opcional)" ayuda="Lo que se vio se anota después, al tomar asistencia.">
        <Texto value={titulo} placeholder="Clase 3" onChange={(e) => setTitulo(e.target.value)} />
      </Campo>

      <Campo
        etiqueta="Otro lugar (opcional)"
        ayuda={
          grupo.venue || grupo.address
            ? `Dejalo vacío si es donde siempre: ${grupo.venue ?? grupo.address}.`
            : 'Solo si esta clase se da en otro lado que el resto.'
        }
      >
        <Texto value={estudio} placeholder="Estudio" onChange={(e) => setEstudio(e.target.value)} />
      </Campo>

      {estudio.trim() !== '' && (
        <Campo etiqueta="Dirección de ese lugar">
          <Texto value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </Campo>
      )}

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Cargando…' : 'Cargar clase'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------------------
// Una clase en la lista
//
// Muestra dónde es de verdad: lo propio si lo tiene, y si no lo del grupo.
// Se puede corregir —cambió la hora, se mudó la sala— y se puede cancelar.
//
// Cancelar no borra. La clase estaba anunciada, de ella cuelgan asistencias y
// cargos, y hacerla desaparecer del calendario de un alumno que la vio
// anunciada es peor que mostrarla tachada.
// ----------------------------------------------------------------------------
function FilaClase({
  clase,
  grupo,
  alTomarAsistencia,
  alCambiar,
}: {
  clase: Clase;
  grupo: Grupo;
  alTomarAsistencia: () => void;
  alCambiar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const cancelada = clase.status === 'cancelled';
  const lugar = lugarDe(clase, grupo);

  async function cambiarEstado() {
    setTrabajando(true);
    setError(null);
    try {
      await cambiarEstadoClase(clase.id, cancelada ? 'scheduled' : 'cancelled');
      alCambiar();
    } catch (e) {
      setError((e as Error).message);
      setTrabajando(false);
    }
  }

  if (editando) {
    return (
      <FormularioEditarClase
        clase={clase}
        alCerrar={() => setEditando(false)}
        alGuardar={() => { setEditando(false); alCambiar(); }}
      />
    );
  }

  return (
    <Tarjeta>
      <div className={cancelada ? 'opacity-50' : undefined}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-brand-cream">
            {clase.title ?? 'Clase'}
            {cancelada && (
              <span className="ml-2 rounded-full border border-white/20 px-2 py-0.5 text-xs text-brand-taupe">
                cancelada
              </span>
            )}
          </p>
          <p className="shrink-0 text-sm text-brand-taupe">
            {fecha(clase.date)}
            {clase.start_time ? ` · ${clase.start_time.slice(0, 5)}` : ''}
          </p>
        </div>

        {(lugar.venue || lugar.address) && (
          <p className="text-sm text-brand-taupe">
            {lugar.venue}
            {lugar.venue && lugar.address && ' · '}
            {lugar.address && (
              <a
                href={linkMapa(lugar.address)} target="_blank" rel="noreferrer"
                className="text-brand-sand underline"
              >
                ver en el mapa
              </a>
            )}
          </p>
        )}

        {clase.recap && <p className="mt-1 text-sm text-brand-taupe">{clase.recap}</p>}
      </div>

      {error && <div className="mt-2"><Aviso>{error}</Aviso></div>}

      <div className="mt-3 flex flex-wrap gap-2">
        {!cancelada && (
          <BotonSecundario type="button" onClick={alTomarAsistencia}>
            Tomar asistencia
          </BotonSecundario>
        )}
        <BotonSecundario type="button" onClick={() => setEditando(true)}>
          Editar
        </BotonSecundario>
        <BotonSecundario type="button" onClick={cambiarEstado} disabled={trabajando}>
          {cancelada ? 'Reactivar' : 'Cancelar clase'}
        </BotonSecundario>
      </div>
    </Tarjeta>
  );
}

function FormularioEditarClase({
  clase,
  alCerrar,
  alGuardar,
}: {
  clase: Clase;
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const [dia, setDia] = useState(clase.date);
  const [hora, setHora] = useState(clase.start_time?.slice(0, 5) ?? '');
  const [duracion, setDuracion] = useState(clase.duration_min?.toString() ?? '');
  const [titulo, setTitulo] = useState(clase.title ?? '');
  const [estudio, setEstudio] = useState(clase.venue ?? '');
  const [direccion, setDireccion] = useState(clase.address ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await editarClase(clase.id, {
        date: dia,
        start_time: hora || null,
        duration_min: duracion ? Number(duracion) : null,
        title: titulo.trim() || null,
        venue: estudio.trim() || null,
        address: direccion.trim() || null,
      });
      alGuardar();
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
      <p className="text-brand-cream">Editar clase</p>

      <Campo etiqueta="Día">
        <Texto type="date" required value={dia} onChange={(e) => setDia(e.target.value)} />
      </Campo>
      <Campo etiqueta="Hora">
        <Texto type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
      </Campo>
      <Campo etiqueta="Duración en minutos">
        <Texto type="number" min="15" step="15" value={duracion} onChange={(e) => setDuracion(e.target.value)} />
      </Campo>
      <Campo etiqueta="Título">
        <Texto value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </Campo>
      <Campo etiqueta="Otro lugar" ayuda="Vacío = donde siempre, el lugar del grupo.">
        <Texto value={estudio} onChange={(e) => setEstudio(e.target.value)} />
      </Campo>
      <Campo etiqueta="Dirección de ese lugar">
        <Texto value={direccion} onChange={(e) => setDireccion(e.target.value)} />
      </Campo>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
