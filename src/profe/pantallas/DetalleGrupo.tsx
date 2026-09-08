import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  traerInscripciones, traerClases, traerAlumnos, crearAlumno, inscribir, crearClase,
  editarClase, cambiarEstadoClase, lugarDe, linkMapa, crearClases,
  fechasSemanales, sumarDias, diaSemana, mesDe, asegurarClases, hoyISO, horarioDe,
  nombreFormato, nombreCobro, fecha, plata,
} from '../datos';
import FormularioGrupo from './FormularioGrupo';
import type { Espacio, Grupo, Clase, Alumno, ModoCobro } from '../datos';
import {
  Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga,
  Campo, Texto, Opciones, Boton, BotonSecundario,
} from '../ui';

export default function DetalleGrupo({
  espacio,
  grupo: grupoInicial,
  alVolver,
  alTomarAsistencia,
}: {
  espacio: Espacio;
  grupo: Grupo;
  alVolver: () => void;
  alTomarAsistencia: (clase: Clase) => void;
}) {
  // Copia local: si se edita el grupo acá adentro, la pantalla tiene que
  // reflejarlo sin volver a la lista.
  const [grupo, setGrupo] = useState(grupoInicial);
  const inscripciones = useCarga(() => traerInscripciones(grupo.id), [grupo.id]);
  const clases = useCarga(() => traerClases(grupo.id), [grupo.id]);
  const [anotando, setAnotando] = useState(false);
  const [cargandoClase, setCargandoClase] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [editandoGrupo, setEditandoGrupo] = useState(false);

  // ------------------------------------------------------------------------
  // El horario fijo, en acción.
  //
  // Al abrir el grupo se completa lo que falte hasta fin del mes que viene.
  // Es lo que hace que un grupo regular no haya que cargarlo nunca más: se
  // mantiene solo. Lo que se crea se avisa, no se hace a escondidas.
  // ------------------------------------------------------------------------
  const [creadas, setCreadas] = useState<string[]>([]);
  const [revisado, setRevisado] = useState(false);
  const [errorGen, setErrorGen] = useState<string | null>(null);

  useEffect(() => {
    if (!clases.datos || revisado) return;
    setRevisado(true);
    asegurarClases(espacio.id, grupo, clases.datos.map((c) => c.date), hoyISO())
      .then((nuevas) => {
        if (nuevas.length > 0) {
          setCreadas(nuevas);
          clases.recargar();
        }
      })
      .catch((e: Error) => setErrorGen(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clases.datos, revisado]);

  // Cuántas clases tiene este mes. Con cobro mensual, cinco no es lo mismo
  // que cuatro, y conviene saberlo al principio del mes.
  const mesActual = hoyISO().slice(0, 7);
  const cuantasEsteMes =
    clases.datos?.filter((c) => c.status === 'scheduled' && mesDe(c.date) === mesActual).length ?? 0;

  return (
    <Marco>
      <Encabezado
        titulo={grupo.name}
        bajada={[nombreFormato[grupo.format], horarioDe(grupo), grupo.level, grupo.venue]
          .filter(Boolean)
          .join(' · ')}
        volver={{ texto: 'Mis grupos', alTocar: alVolver }}
        derecha={
          !editandoGrupo && (
            <BotonSecundario onClick={() => setEditandoGrupo(true)}>Editar grupo</BotonSecundario>
          )
        }
      />

      {editandoGrupo && (
        <div className="mb-6">
          <FormularioGrupo
            espacio={espacio}
            grupo={grupo}
            alCerrar={() => setEditandoGrupo(false)}
            alGuardar={(g) => {
              setEditandoGrupo(false);
              setGrupo(g);
              // El horario pudo cambiar: hay que volver a revisar qué falta.
              setRevisado(false);
              clases.recargar();
            }}
          />
        </div>
      )}

      {errorGen && <div className="mb-4"><Aviso>{errorGen}</Aviso></div>}

      {creadas.length > 0 && (
        <p className="mb-4 rounded-lg border border-brand-sand/30 bg-brand-sand/5 px-3 py-2 text-sm text-brand-sand">
          Se agregaron {creadas.length} {creadas.length === 1 ? 'clase' : 'clases'} según el
          horario del grupo{horarioDe(grupo) ? ` (${horarioDe(grupo)})` : ''}: {creadas.map((f) => fecha(f)).join(', ')}.
        </p>
      )}

      {cuantasEsteMes >= 5 && (
        <p className="mb-4 rounded-lg border border-white/15 px-3 py-2 text-sm text-brand-taupe">
          Este mes tenés <span className="text-brand-cream">{cuantasEsteMes} clases</span>, no
          cuatro. Si cobrás por mes, decidí si las cobrás todas o cancelás una — el cobro no se
          ajusta solo.
        </p>
      )}

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
        {cargandoClase && (
          <FormularioClase
            espacio={espacio}
            grupo={grupo}
            alCerrar={() => setCargandoClase(false)}
            alCrear={() => { setCargandoClase(false); clases.recargar(); }}
          />
        )}

        {generando && (
          <FormularioSerie
            espacio={espacio}
            grupo={grupo}
            yaCargadas={clases.datos?.map((c) => c.date) ?? []}
            alCerrar={() => setGenerando(false)}
            alCrear={() => { setGenerando(false); clases.recargar(); }}
          />
        )}

        {!cargandoClase && !generando && (
          <>
            <div className="flex flex-wrap gap-2">
              <BotonSecundario onClick={() => setCargandoClase(true)}>+ Cargar clase</BotonSecundario>
              <BotonSecundario onClick={() => setGenerando(true)}>+ Generar varias</BotonSecundario>
            </div>
            <p className="mt-2 text-sm text-brand-taupe">
              {horarioDe(grupo)
                ? `Este grupo se mantiene solo: las clases de los ${horarioDe(grupo)} se van creando hasta fin del mes que viene. Estos botones son para agregar algo fuera de ese horario.`
                : 'Este grupo no tiene día fijo, así que las clases se cargan a mano. Podés ponerle uno en "Editar grupo" y se crean solas.'}
            </p>
          </>
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

// ----------------------------------------------------------------------------
// Generar varias clases de una
//
// Un grupo regular pasa siempre el mismo día a la misma hora. Cargarlas de a
// una es trabajo repetido cuatro veces por mes.
//
// Dos cuidados que hacen la diferencia entre útil y peligroso:
//
//   - Se muestran las fechas ANTES de crear nada. Una función que escribe
//     cuatro filas sin que veas cuáles es una función en la que no se confía.
//   - Si en alguna de esas fechas ya hay una clase cargada, se marca y se
//     saltea. Generar dos veces el mismo mes es el error más fácil de cometer,
//     y duplicar clases arrastra asistencias y cargos duplicados.
// ----------------------------------------------------------------------------
function FormularioSerie({
  espacio,
  grupo,
  yaCargadas,
  alCerrar,
  alCrear,
}: {
  espacio: Espacio;
  grupo: Grupo;
  yaCargadas: string[];
  alCerrar: () => void;
  alCrear: () => void;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [desde, setDesde] = useState(hoy);
  const [hora, setHora] = useState('');
  const [duracion, setDuracion] = useState('');
  const [cuantas, setCuantas] = useState(4);
  const [prefijo, setPrefijo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const fechas = fechasSemanales(desde, cuantas);
  const nuevas = fechas.filter((f) => !yaCargadas.includes(f));

  // ¿Ese día cae una vez más en el mismo mes, después de las cuatro?
  // Si la quinta fecha sigue cayendo en el mes de la primera, sobra un día
  // que quedaría sin clase. Se avisa y se ofrece; no se agrega solo.
  const quinta = sumarDias(desde, 4 * 7);
  const hayQuinta = cuantas === 4 && mesDe(quinta) === mesDe(desde);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await crearClases(
        espacio.id,
        nuevas.map((f, i) => ({
          group_id: grupo.id,
          date: f,
          start_time: hora || null,
          duration_min: duracion ? Number(duracion) : null,
          title: prefijo.trim() ? `${prefijo.trim()} ${i + 1}` : null,
        })),
      );
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
      <p className="text-brand-cream">Generar varias clases de {grupo.name}</p>

      <Campo etiqueta="Primera clase" ayuda={`Cae ${diaSemana(desde)}. Las demás van una por semana, el mismo día.`}>
        <Texto type="date" required value={desde} onChange={(e) => setDesde(e.target.value)} />
      </Campo>

      <Campo etiqueta="Hora (opcional)">
        <Texto type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
      </Campo>

      <Campo etiqueta="Duración en minutos (opcional)">
        <Texto type="number" min="15" step="15" value={duracion} onChange={(e) => setDuracion(e.target.value)} />
      </Campo>

      <Campo etiqueta="Cuántas clases">
        <Texto
          type="number" min="1" max="20" required value={cuantas}
          onChange={(e) => setCuantas(Math.max(1, Number(e.target.value) || 1))}
        />
      </Campo>

      <Campo etiqueta="Numerarlas (opcional)" ayuda='Con "Clase" quedan Clase 1, Clase 2, y así.'>
        <Texto value={prefijo} placeholder="Clase" onChange={(e) => setPrefijo(e.target.value)} />
      </Campo>

      {hayQuinta && (
        <div className="rounded-lg border border-brand-sand/30 bg-brand-sand/5 px-3 py-2 text-sm">
          <p className="text-brand-sand">
            Este mes el {diaSemana(desde)} cae una vez más, el {fecha(quinta)}.
            Con cuatro clases ese día queda sin cargar.
          </p>
          <button
            type="button"
            onClick={() => setCuantas(5)}
            className="mt-1 text-brand-cream underline"
          >
            Agregar esa clase también
          </button>
        </div>
      )}

      {/* Las fechas a la vista antes de crear nada */}
      <div className="rounded-lg border border-white/10 px-3 py-2">
        <p className="mb-1 text-sm text-brand-taupe">
          Se van a crear {nuevas.length} {nuevas.length === 1 ? 'clase' : 'clases'}
          {hora && ` a las ${hora}`}:
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {fechas.map((f) => {
            const repetida = yaCargadas.includes(f);
            return (
              <li key={f} className={repetida ? 'text-brand-taupe line-through' : 'text-brand-cream'}>
                {fecha(f)}
                {repetida && ' (ya está)'}
              </li>
            );
          })}
        </ul>
      </div>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando || nuevas.length === 0}>
          {guardando
            ? 'Creando…'
            : nuevas.length === 0
              ? 'Ya están todas cargadas'
              : `Crear ${nuevas.length} ${nuevas.length === 1 ? 'clase' : 'clases'}`}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
