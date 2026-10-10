import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  traerInscripciones, traerClases, traerAlumnos, crearAlumno, inscribir, crearClase,
  editarClase, cambiarEstadoClase, lugarDe, linkMapa, crearClases,
  fechasSemanales, sumarDias, diaSemana, mesDe, asegurarClases, asegurarImputaciones,
  hoyISO, horarioDe,
  darDeBaja, volverAAnotar, quitarInscripcion, crearCargo, cobrarCuotaDelGrupo,
  traerFicha, editarFicha,
  mesEnPalabras, inicioDelMes, precioDe, precioDelGrupo, asegurarCargos,
  inscribirConArranqueDiferido, mesSiguiente,
  nombreFormato, nombreCobro, fecha, plata,
  periodoDe,
} from '../datos';
import FormularioGrupo from './FormularioGrupo';
import type {
  Espacio, Grupo, Clase, Alumno, ModoCobro, Inscripcion, ResultadoCobro, DatosFicha,
} from '../datos';
import {
  Marco, Aviso, Vacio, Tarjeta, useCarga, Campo, Texto, Area, Opciones,
  Boton, BotonSecundario,
  Titulo, Etiqueta, Segmentos, Lista, Fila, Hoja, Esqueleto, ChipFecha,
} from '../../comun/ui';

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

  // ------------------------------------------------------------------------
  // El horario fijo, en acción.
  //
  // Al abrir el grupo se completa lo que falte hasta fin del mes que viene.
  // Es lo que hace que un grupo regular no haya que cargarlo nunca más: se
  // mantiene solo. Lo que se crea se avisa, no se hace a escondidas.
  // ------------------------------------------------------------------------
  const [creadas, setCreadas] = useState<string[]>([]);
  const [cargosCreados, setCargosCreados] = useState(0);
  const [imputados, setImputados] = useState(0);
  const [revisado, setRevisado] = useState(false);
  const [errorGen, setErrorGen] = useState<string | null>(null);

  useEffect(() => {
    if (!clases.datos || revisado) return;
    setRevisado(true);
    // Primero las clases y después los cargos, en ese orden: el cargo del que
    // paga por clase apunta a la próxima clase, así que la clase tiene que
    // existir antes.
    asegurarClases(grupo.id)
      .then(async (nuevas) => {
        if (nuevas.length > 0) {
          setCreadas(nuevas);
          clases.recargar();
        }
        const cargos = await asegurarCargos(grupo.id);
        if (cargos > 0) setCargosCreados(cargos);
        // Y recién después, la plata que algún alumno tenga a favor se aplica a
        // esos cargos que acaban de nacer. La tarea nocturna hace lo mismo;
        // esto es para no tener que esperar hasta las 3 de la mañana.
        const aplicados = await asegurarImputaciones(espacio.id);
        if (aplicados > 0) setImputados(aplicados);
      })
      .catch((e: Error) => setErrorGen(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clases.datos, revisado]);

  // Cuántas clases tiene este mes. No cambia lo que se cobra —la cuota es fija
  // y el precio se piensa sobre 4,33 clases por mes, ver comun/precios.ts—
  // pero el profesor igual quiere saber al principio del mes si le tocan cinco.
  const mesActual = hoyISO().slice(0, 7);
  const cuantasEsteMes =
    clases.datos?.filter((c) => c.status === 'scheduled' && mesDe(c.date) === mesActual).length ?? 0;

  // Qué estoy mirando, y qué hoja está abierta. Antes todo esto eran cinco
  // banderas de "estoy editando X" que abrían formularios adentro de la
  // página y la empujaban para abajo.
  type Vista = 'alumnos' | 'clases';
  const [vista, setVista] = useState<Vista>('alumnos');
  const [hoja, setHoja] = useState<null | 'editar' | 'anotar' | 'clase' | 'serie'>(null);

  const activos = inscripciones.datos?.filter((i) => i.status === 'active') ?? [];

  // Las cuatro novedades son lo mismo: lo que la app hizo sola al abrir el
  // grupo. Antes eran cuatro cajas apiladas que empujaban el contenido real
  // abajo del pliegue. Van juntas, en una.
  const novedades = [
    creadas.length > 0 &&
      `Se agregaron ${creadas.length} ${creadas.length === 1 ? 'clase' : 'clases'} según el horario del grupo: ${creadas.map((f) => fecha(f)).join(', ')}.`,
    cargosCreados > 0 &&
      `Se generaron ${cargosCreados} ${cargosCreados === 1 ? 'cargo' : 'cargos'} por lo que viene.`,
    imputados > 0 &&
      `Se aplicaron ${imputados} ${imputados === 1 ? 'pago' : 'pagos'} que había a favor. A esos alumnos no les figura como deuda.`,
  ].filter(Boolean) as string[];

  return (
    <Marco>
      {/* ----------------------------------------------------- la cabecera */}
      <button
        onClick={alVolver}
        className="-ml-1 mb-3 flex items-center gap-1 rounded-lg px-1 py-1 text-sm text-tenue transition hover:text-acento"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Mis grupos
      </button>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Titulo>{grupo.name}</Titulo>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Etiqueta tono="acento">{nombreFormato[grupo.format]}</Etiqueta>
            {periodoDe(grupo, hoyISO()) && <Etiqueta>{periodoDe(grupo, hoyISO())}</Etiqueta>}
            {horarioDe(grupo) && <Etiqueta>{horarioDe(grupo)}</Etiqueta>}
            {grupo.level && <Etiqueta>{grupo.level}</Etiqueta>}
            {grupo.venue && <Etiqueta>{grupo.venue}</Etiqueta>}
          </div>
        </div>
        <BotonSecundario onClick={() => setHoja('editar')}>Editar</BotonSecundario>
      </div>

      {errorGen && <div className="mb-4"><Aviso>{errorGen}</Aviso></div>}

      {novedades.length > 0 && (
        <div className="anim-aparecer mb-4 rounded-xl border border-acento/30 bg-acento/5 px-4 py-3 text-sm text-acento">
          {novedades.map((n) => <p key={n}>{n}</p>)}
        </div>
      )}

      {cuantasEsteMes >= 5 && (
        <p className="mb-4 rounded-xl border border-linea px-4 py-3 text-sm text-tenue">
          Este mes tenés <span className="text-tinta">{cuantasEsteMes} clases</span>, no
          cuatro. A los que pagan por mes no les cobrás de más: la cuota es fija y ya está
          pensada sobre el promedio real del año, que es 4,33 clases por mes. A los que pagan
          por clase sí les va a aparecer un cargo más.
        </p>
      )}

      {/* ------------------------------------------------------- las solapas */}
      <Segmentos<Vista>
        valor={vista}
        alElegir={setVista}
        opciones={[
          { id: 'alumnos', texto: 'Alumnos', cuantos: activos.length },
          { id: 'clases', texto: 'Clases', cuantos: clases.datos?.length },
        ]}
      />

      {/* ------------------------------------------------------------ alumnos */}
      {vista === 'alumnos' && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Boton onClick={() => setHoja('anotar')}>Anotar alumno</Boton>
          </div>

          {inscripciones.error && <Aviso>{inscripciones.error}</Aviso>}
          {!inscripciones.datos && !inscripciones.error && <Esqueleto />}
          {inscripciones.datos?.length === 0 && (
            <Vacio>Todavía no hay nadie inscripto en este grupo.</Vacio>
          )}

          {inscripciones.datos && inscripciones.datos.length > 0 && (
            <Lista>
              {inscripciones.datos.map((i) => (
                <FilaAlumno
                  key={i.id}
                  espacio={espacio}
                  grupo={grupo}
                  inscripcion={i}
                  alCambiar={inscripciones.recargar}
                />
              ))}
            </Lista>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- clases */}
      {vista === 'clases' && (
        <>
          <div className="mb-2 flex flex-wrap gap-2">
            <Boton onClick={() => setHoja('clase')}>Cargar clase</Boton>
            <BotonSecundario onClick={() => setHoja('serie')}>Generar varias</BotonSecundario>
          </div>
          <p className="mb-4 text-sm text-tenue">
            {horarioDe(grupo)
              ? `Este grupo se mantiene solo: las clases de los ${horarioDe(grupo)} se van creando hasta fin del mes que viene. Estos botones son para agregar algo fuera de ese horario.`
              : 'Este grupo no tiene día fijo, así que las clases se cargan a mano. Podés ponerle uno en "Editar" y se crean solas.'}
          </p>

          {clases.error && <Aviso>{clases.error}</Aviso>}
          {!clases.datos && !clases.error && <Esqueleto />}
          {clases.datos?.length === 0 && <Vacio>Todavía no hay clases cargadas.</Vacio>}

          {clases.datos && clases.datos.length > 0 && (
            <ListaDeClases
              clases={clases.datos}
              grupo={grupo}
              alTomarAsistencia={alTomarAsistencia}
              alCambiar={clases.recargar}
            />
          )}
        </>
      )}

      {/* --------------------------------------------------------- las hojas */}
      {hoja === 'editar' && (
        <Hoja titulo="Editar grupo" alCerrar={() => setHoja(null)}>
          <FormularioGrupo
            espacio={espacio}
            grupo={grupo}
            alCerrar={() => setHoja(null)}
            alGuardar={(g) => {
              setHoja(null);
              setGrupo(g);
              // El horario pudo cambiar: hay que volver a revisar qué falta.
              setRevisado(false);
              clases.recargar();
            }}
          />
        </Hoja>
      )}

      {hoja === 'anotar' && (
        <Hoja titulo="Anotar alumno" alCerrar={() => setHoja(null)}>
          <FormularioAlumno
            espacio={espacio}
            grupo={grupo}
            clases={clases.datos ?? []}
            yaInscriptos={activos.map((i) => i.alumno?.id).filter(Boolean) as string[]}
            alCerrar={() => setHoja(null)}
            alAnotar={() => {
              setHoja(null);
              inscripciones.recargar();
              // Recién anotado ya tiene que deber lo que viene.
              setRevisado(false);
            }}
          />
        </Hoja>
      )}

      {hoja === 'clase' && (
        <Hoja titulo="Cargar una clase" alCerrar={() => setHoja(null)}>
          <FormularioClase
            espacio={espacio}
            grupo={grupo}
            alCerrar={() => setHoja(null)}
            alCrear={() => { setHoja(null); clases.recargar(); }}
          />
        </Hoja>
      )}

      {hoja === 'serie' && (
        <Hoja titulo="Generar varias clases" alCerrar={() => setHoja(null)}>
          <FormularioSerie
            espacio={espacio}
            grupo={grupo}
            yaCargadas={clases.datos?.map((c) => c.date) ?? []}
            alCerrar={() => setHoja(null)}
            alCrear={() => { setHoja(null); clases.recargar(); }}
          />
        </Hoja>
      )}
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
  clases,
  yaInscriptos,
  alCerrar,
  alAnotar,
}: {
  espacio: Espacio;
  grupo: Grupo;
  clases: Clase[];
  yaInscriptos: string[];
  alCerrar: () => void;
  alAnotar: () => void;
}) {
  const alumnos = useCarga(() => traerAlumnos(espacio.id), [espacio.id]);

  const [quien, setQuien] = useState<'nuevo' | 'existente'>('nuevo');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [elegido, setElegido] = useState('');
  const [cobro, setCobro] = useState<ModoCobro>('per_session');
  const [diferir, setDiferir] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const disponibles: Alumno[] =
    alumnos.datos?.filter((a) => !yaInscriptos.includes(a.id)) ?? [];

  // ¿Este mes ya arrancó? Arrancó si ya hubo al menos una clase.
  const mes = hoyISO().slice(0, 7);
  const mesEmpezado = clases.some(
    (c) => c.status === 'scheduled' && c.date.slice(0, 7) === mes && c.date < hoyISO(),
  );

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
        });
        alumnoId = creado.id;
      }

      if (!alumnoId) throw new Error('Elegí un alumno');

      if (cobro === 'per_period' && mesEmpezado && diferir) {
        await inscribirConArranqueDiferido(espacio.id, {
          group_id: grupo.id,
          student_id: alumnoId,
        });
      } else {
        await inscribir(espacio.id, {
          group_id: grupo.id,
          student_id: alumnoId,
          billing_mode: cobro,
        });
      }

      alAnotar();
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={guardar}
      className="flex flex-col gap-3"
    >
      <p className="text-tinta">Anotar alumno en {grupo.name}</p>

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
          <Campo etiqueta="Cómo lo anotás" ayuda="El nombre con el que va a aparecer en tu lista.">
            <Texto required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Campo
            etiqueta="Correo (opcional)"
            ayuda="Con esto entra al portal a ver sus clases y su cuenta. Sin correo no puede entrar."
          >
            <Texto type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
        </>
      ) : (
        <Campo etiqueta="Alumno">
          {disponibles.length === 0 ? (
            <p className="text-sm text-tenue">
              {alumnos.datos
                ? 'No queda nadie de tu escuela sin anotar en este grupo.'
                : 'Buscando…'}
            </p>
          ) : (
            <select
              required
              value={elegido}
              onChange={(e) => setElegido(e.target.value)}
              className="w-full rounded-lg border border-linea bg-campo px-3 py-2 text-tinta outline-none focus:border-acento"
            >
              <option value="">Elegir…</option>
              {disponibles.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          )}
        </Campo>
      )}

      {/* El precio no se pide acá: es del grupo. Lo que se elige es cuál de
          las formas de pago del grupo usa este alumno. */}
      <Campo
        etiqueta="Cómo paga"
        ayuda={(() => {
          const p = precioDelGrupo(grupo, cobro);
          if (p === null) {
            return 'El grupo todavía no tiene precio para esta forma de pago. Cargalo en "Editar grupo".';
          }
          if (cobro === 'per_session') return `Paga ${plata(p)} cada clase.`;
          if (cobro === 'per_period') return `Paga ${plata(p)} el mes, con el descuento ya aplicado.`;
          return `Paga ${plata(p)} una sola vez.`;
        })()}
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

      {/* Se suma con el mes ya empezado: cobrarle la cuota entera sería
          cobrarle clases que no va a recibir. */}
      {cobro === 'per_period' && mesEmpezado && (
        <div className="rounded-lg border border-acento/30 bg-acento/5 px-3 py-2">
          <p className="mb-2 text-sm text-acento">
            {mesEnPalabras(mes)} ya empezó: hubo al menos una clase.
          </p>
          <Opciones<'si' | 'no'>
            valor={diferir ? 'si' : 'no'}
            alElegir={(v) => setDiferir(v === 'si')}
            opciones={[
              { valor: 'si', texto: `Lo que queda por clase, cuota desde ${mesEnPalabras(mesSiguiente(mes))}` },
              { valor: 'no', texto: `Cuota de ${mesEnPalabras(mes)} completa` },
            ]}
          />
          <p className="mt-2 text-xs text-tenue">
            {diferir
              ? `Se anota dos veces: por clase hasta fin de ${mesEnPalabras(mes)}, y por mes desde el 1 de ${mesEnPalabras(mesSiguiente(mes))}. Es lo que evita cobrarle clases que ya pasaron.`
              : `Paga ${plata(precioDelGrupo(grupo, 'per_period'))} por ${mesEnPalabras(mes)} aunque ya hayan pasado clases.`}
          </p>
        </div>
      )}

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
      className="flex flex-col gap-3"
    >
      <p className="text-tinta">Nueva clase de {grupo.name}</p>

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
// ----------------------------------------------------------------------------
// EL LISTADO DE CLASES
//
// Antes era una sola lista con TODAS las clases del grupo, de la más nueva a
// la más vieja, sin cortes. Un grupo regular acumula cuatro por mes: a los
// seis meses son veinticuatro renglones iguales y no hay dónde poner el ojo.
//
// Y el orden estaba al revés de la pregunta. Lo que un profesor busca en esta
// pantalla es "cuándo es la próxima", no "cuándo fue la última". Con las
// pasadas arriba, lo que viene quedaba abajo del pliegue.
//
// Ahora son dos listas separadas:
//
//   PRÓXIMAS — de hoy en adelante, de la más cercana a la más lejana. Es la
//              vista por defecto y casi siempre son tres o cuatro renglones.
//   PASADAS  — para atrás, agrupadas por mes, de a diez. El historial se
//              consulta, no se recorre: nadie necesita ver los doce meses
//              juntos, y si los necesita, el botón está.
// ----------------------------------------------------------------------------
function ListaDeClases({
  clases,
  grupo,
  alTomarAsistencia,
  alCambiar,
}: {
  clases: Clase[];
  grupo: Grupo;
  alTomarAsistencia: (clase: Clase) => void;
  alCambiar: () => void;
}) {
  type Cual = 'proximas' | 'pasadas';
  const [cual, setCual] = useState<Cual>('proximas');
  const [cuantasPasadas, setCuantasPasadas] = useState(10);

  const hoy = hoyISO();
  // `clases` viene de la más nueva a la más vieja. Lo que viene se da vuelta:
  // la próxima tiene que ser la primera.
  const proximas = clases.filter((c) => c.date >= hoy).slice().reverse();
  const pasadas = clases.filter((c) => c.date < hoy);
  const visibles = cual === 'proximas' ? proximas : pasadas.slice(0, cuantasPasadas);

  // Agrupadas por mes. Doce renglones corridos son una pared; con el mes
  // arriba de cada tramo, la lista se recorre saltando.
  const porMes: { mes: string; clases: Clase[] }[] = [];
  visibles.forEach((c) => {
    const mes = mesDe(c.date);
    const ultimo = porMes[porMes.length - 1];
    if (ultimo && ultimo.mes === mes) ultimo.clases.push(c);
    else porMes.push({ mes, clases: [c] });
  });

  return (
    <>
      <Segmentos<Cual>
        valor={cual}
        alElegir={setCual}
        opciones={[
          { id: 'proximas', texto: 'Próximas', cuantos: proximas.length },
          { id: 'pasadas', texto: 'Ya dadas', cuantos: pasadas.length },
        ]}
      />

      {visibles.length === 0 && (
        <Vacio>
          {cual === 'proximas'
            ? 'No hay clases por venir. Cargá una, o generá varias de una.'
            : 'Todavía no se dio ninguna clase.'}
        </Vacio>
      )}

      {porMes.map((tramo) => (
        <div key={tramo.mes} className="mb-5">
          <p className="mb-2 text-sm font-medium text-tenue">{mesEnPalabras(tramo.mes)}</p>
          <Lista>
            {tramo.clases.map((c) => (
              <FilaClase
                key={c.id}
                clase={c}
                grupo={grupo}
                pasada={cual === 'pasadas'}
                alTomarAsistencia={() => alTomarAsistencia(c)}
                alCambiar={alCambiar}
              />
            ))}
          </Lista>
        </div>
      ))}

      {cual === 'pasadas' && pasadas.length > cuantasPasadas && (
        <BotonSecundario onClick={() => setCuantasPasadas((n) => n + 10)}>
          Ver {Math.min(10, pasadas.length - cuantasPasadas)} más
        </BotonSecundario>
      )}
    </>
  );
}

function FilaClase({
  clase,
  grupo,
  pasada = false,
  alTomarAsistencia,
  alCambiar,
}: {
  clase: Clase;
  grupo: Grupo;
  pasada?: boolean;
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

  const detalle = [
    lugar.venue,
    clase.recap ? clase.recap.slice(0, 60) + (clase.recap.length > 60 ? '…' : '') : null,
  ].filter(Boolean).join(' · ') || null;

  return (
    <Fila
      principal={<ChipFecha iso={clase.date} apagado={cancelada || pasada} />}
      titulo={
        <span className={cancelada ? 'line-through opacity-60' : undefined}>
          {clase.title ?? 'Clase'}
        </span>
      }
      detalle={detalle}
      valor={clase.start_time ? clase.start_time.slice(0, 5) : undefined}
      bajoValor={cancelada ? 'cancelada' : clase.recap ? 'con recap' : undefined}
    >
      {lugar.address && (
        <a
          href={linkMapa(lugar.address)} target="_blank" rel="noreferrer"
          className="mb-2 block text-sm text-acento underline"
        >
          {lugar.address} · ver en el mapa
        </a>
      )}

      {error && <div className="mb-2"><Aviso>{error}</Aviso></div>}

      {editando && (
        <Hoja titulo="Editar la clase" alCerrar={() => setEditando(false)}>
          <FormularioEditarClase
            clase={clase}
            alCerrar={() => setEditando(false)}
            alGuardar={() => { setEditando(false); alCambiar(); }}
          />
        </Hoja>
      )}

      <div className="flex flex-wrap gap-2">
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
    </Fila>
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
      className="flex flex-col gap-3"
    >
      <p className="text-tinta">Editar clase</p>

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
      className="flex flex-col gap-3"
    >
      <p className="text-tinta">Generar varias clases de {grupo.name}</p>

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
        <div className="rounded-lg border border-acento/30 bg-acento/5 px-3 py-2 text-sm">
          <p className="text-acento">
            Este mes el {diaSemana(desde)} cae una vez más, el {fecha(quinta)}.
            Con cuatro clases ese día queda sin cargar.
          </p>
          <button
            type="button"
            onClick={() => setCuantas(5)}
            className="mt-1 text-tinta underline"
          >
            Agregar esa clase también
          </button>
        </div>
      )}

      {/* Las fechas a la vista antes de crear nada */}
      <div className="rounded-lg border border-linea px-3 py-2">
        <p className="mb-1 text-sm text-tenue">
          Se van a crear {nuevas.length} {nuevas.length === 1 ? 'clase' : 'clases'}
          {hora && ` a las ${hora}`}:
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {fechas.map((f) => {
            const repetida = yaCargadas.includes(f);
            return (
              <li key={f} className={repetida ? 'text-tenue line-through' : 'text-tinta'}>
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

// ----------------------------------------------------------------------------
// Un alumno inscripto en el grupo
//
// Dos maneras de sacarlo, y no son intercambiables:
//
//   Dar de baja  — cursó y se fue. Deja de aparecer para tomar asistencia,
//                  pero su historia y lo que deba quedan enteros.
//   Quitar       — fue un error de carga. Solo si no tiene ningún cargo
//                  colgando; de eso se encarga la propia función.
// ----------------------------------------------------------------------------
function FilaAlumno({
  espacio,
  grupo,
  inscripcion,
  alCambiar,
}: {
  espacio: Espacio;
  grupo: Grupo;
  inscripcion: Inscripcion;
  alCambiar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [cobrado, setCobrado] = useState<string | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [editandoFicha, setEditandoFicha] = useState(false);

  const activa = inscripcion.status === 'active';

  async function hacer(accion: () => Promise<void>) {
    setTrabajando(true);
    setError(null);
    try {
      await accion();
      alCambiar();
    } catch (e) {
      setError((e as Error).message);
      setTrabajando(false);
      setConfirmando(false);
    }
  }

  const nombre = inscripcion.alumno?.full_name ?? 'Alumno sin ficha';

  // El estado del enganche al portal, en una línea. La consecuencia de no
  // cargarle el correo se ve acá, en el momento, y no tres semanas después
  // cuando el alumno pregunta por qué no puede entrar.
  const estadoPortal = !activa
    ? (inscripcion.end_date ? `ya no cursa · hasta el ${fecha(inscripcion.end_date)}` : 'ya no cursa')
    : !inscripcion.alumno?.email
      ? 'sin correo: no va a poder entrar a la app'
      : inscripcion.alumno.invite_rejected_at && !inscripcion.alumno.user_id
        ? null
        : !inscripcion.alumno.user_id
          ? `invitado a ${inscripcion.alumno.email} · todavía no aceptó`
          : nombreCobro[inscripcion.billing_mode];

  return (
    <Fila
      avatar={nombre}
      foto={inscripcion.alumno?.avatar_url}
      titulo={nombre}
      detalle={estadoPortal}
      valor={plata(precioDe(grupo, inscripcion))}
      bajoValor={nombreCobro[inscripcion.billing_mode]}
    >
      <div className={activa ? undefined : 'opacity-60'}>
        {activa && inscripcion.alumno?.invite_rejected_at && !inscripcion.alumno.user_id && (
          <p className="mb-2 text-sm text-alerta">
            Alguien entró con {inscripcion.alumno.email} y dijo que no es esta persona.
            Revisá el correo en "Editar ficha".
          </p>
        )}
      </div>

      {error && <div className="mt-2"><Aviso>{error}</Aviso></div>}

      {cobrado && (
        <p className="mt-2 rounded-lg border border-acento/30 bg-acento/5 px-3 py-2 text-sm text-acento">
          {cobrado}
        </p>
      )}

      {editandoFicha && inscripcion.alumno && (
        <Hoja titulo="Corregir la ficha" alCerrar={() => setEditandoFicha(false)}>
          <FormularioFicha
            alumnoId={inscripcion.alumno.id}
            alCerrar={() => setEditandoFicha(false)}
            alGuardar={() => { setEditandoFicha(false); alCambiar(); }}
          />
        </Hoja>
      )}

      {cobrando && (
        <Hoja titulo="Agregar un cargo" alCerrar={() => setCobrando(false)}>
          <FormularioCargo
            espacio={espacio}
            grupo={grupo}
            inscripcion={inscripcion}
            alCerrar={() => setCobrando(false)}
            alCobrar={(texto) => { setCobrando(false); setCobrado(texto); }}
          />
        </Hoja>
      )}

      {confirmando ? (
        <div className="mt-3">
          <p className="mb-2 text-sm text-tenue">
            Quitar borra la inscripción como si nunca hubiera existido. Si el alumno
            cursó, lo que corresponde es darlo de baja.
          </p>
          <div className="flex flex-wrap gap-2">
            <BotonSecundario
              type="button" disabled={trabajando}
              onClick={() => hacer(() => quitarInscripcion(inscripcion.id))}
            >
              Sí, quitar
            </BotonSecundario>
            <BotonSecundario type="button" onClick={() => setConfirmando(false)}>
              No
            </BotonSecundario>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Solo mientras nadie la reclamó. Una vez que el alumno entró, el
              nombre y la foto son suyos (migración 0023) y la base rechaza el
              cambio igual: esconder el botón es para no ofrecer algo que no se
              puede hacer. El período sirve para corregir un correo mal
              tipeado, que es lo único que impide que el alumno entre. */}
          {!editandoFicha && !inscripcion.alumno?.user_id && (
            <BotonSecundario type="button" onClick={() => setEditandoFicha(true)}>
              Corregir la ficha
            </BotonSecundario>
          )}
          {activa && !cobrando && (
            <BotonSecundario type="button" onClick={() => setCobrando(true)}>
              Agregar un cargo
            </BotonSecundario>
          )}
          {activa ? (
            <BotonSecundario
              type="button" disabled={trabajando}
              onClick={() => hacer(() => darDeBaja(inscripcion.id, hoyISO()))}
            >
              Dar de baja
            </BotonSecundario>
          ) : (
            <BotonSecundario
              type="button" disabled={trabajando}
              onClick={() => hacer(() => volverAAnotar(inscripcion.id))}
            >
              Volver a anotar
            </BotonSecundario>
          )}
          <BotonSecundario type="button" onClick={() => setConfirmando(true)}>
            Quitar
          </BotonSecundario>
        </div>
      )}
    </Fila>
  );
}

// ----------------------------------------------------------------------------
// Agregarle un cargo a un alumno
//
// OJO CON PARA QUÉ ES ESTO. La cuota del mes y la próxima clase las genera
// asegurar_cargos() sola, todas las noches. Este formulario NO es para eso:
// es para lo único que el automatismo no puede saber —una clase particular,
// un pack, materiales, un recupero.
//
// Antes venía precargado con "Cuota septiembre" y el precio del grupo, o sea
// proponiendo exactamente lo que ya existía. Ese valor por defecto era una
// invitación a cobrar dos veces lo mismo, así que el concepto arranca vacío.
//
// El concepto viene escrito según cómo paga: no es lo mismo "Cuota septiembre
// 2026" que "Clase 08/09". El monto viene con el precio que se le acordó a esa
// inscripción, que puede no ser el de su compañero.
// ----------------------------------------------------------------------------
function FormularioCargo({
  espacio,
  grupo,
  inscripcion,
  alCerrar,
  alCobrar,
}: {
  espacio: Espacio;
  grupo: Grupo;
  inscripcion: Inscripcion;
  alCerrar: () => void;
  alCobrar: (texto: string) => void;
}) {
  const mesActual = hoyISO().slice(0, 7);
  const esMensual = inscripcion.billing_mode === 'per_period';

  const [periodo, setPeriodo] = useState(mesActual);
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState(precioDe(grupo, inscripcion)?.toString() ?? '');
  // La cuota vence al EMPEZAR el mes, no al terminarlo: si venciera al final,
  // el alumno cursa las cuatro clases y recién ahí se ve que no pagó.
  const [vence, setVence] = useState(esMensual ? inicioDelMes(mesActual) : hoyISO());
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await crearCargo(espacio.id, {
        enrollment_id: inscripcion.id,
        student_id: inscripcion.alumno!.id,
        concept: concepto.trim(),
        amount: Number(monto),
        period: esMensual ? periodo : null,
        due_date: vence || null,
      });
      alCobrar(`Cargo de ${plata(Number(monto))} creado: ${concepto.trim()}.`);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-3 rounded-lg border border-linea p-3">
      {esMensual && (
        <Campo etiqueta="Mes">
          <Texto
            type="month" required value={periodo}
            onChange={(e) => {
              setPeriodo(e.target.value);
              setConcepto(`Cuota ${mesEnPalabras(e.target.value)}`);
              setVence(inicioDelMes(e.target.value));
            }}
          />
        </Campo>
      )}

      <Campo etiqueta="Concepto">
        <Texto required value={concepto} onChange={(e) => setConcepto(e.target.value)} />
      </Campo>

      <Campo etiqueta="Monto">
        <Texto
          type="number" min="0" step="any" required value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
      </Campo>

      <Campo etiqueta="Vence (opcional)">
        <Texto type="date" value={vence} onChange={(e) => setVence(e.target.value)} />
      </Campo>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear cargo'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------------------
// Cobrar la cuota del mes a todo el grupo
//
// Es la tarea que hoy se hace con una planilla y cuatro mensajes de WhatsApp.
//
// Igual que con las clases, se muestra a quién se le va a cobrar y cuánto
// ANTES de crear nada, y no se cobra dos veces el mismo mes.
// ----------------------------------------------------------------------------
// Acá vivía "Cobrar la cuota del mes a todo el grupo".
//
// Se eliminó el 10/10/2026. Era anterior a asegurar_cargos(): cuando se
// escribió, los cargos los creaba el profesor a mano. Desde la 0011 la cuota
// del mes en curso la genera la base sola, y desde la 0019 lo hace todas las
// noches sin que nadie abra nada.
//
// O sea que el botón no agregaba nada y sí podía restar: generar la cuota a
// mano sobre la que ya existe es la forma más fácil de cobrarle dos veces a
// alguien. Una función que duplica lo que el sistema ya hace no es una
// comodidad, es una trampa.
// ----------------------------------------------------------------------------

function FormularioFicha({
  alumnoId,
  alCerrar,
  alGuardar,
}: {
  alumnoId: string;
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const ficha = useCarga(() => traerFicha(alumnoId), [alumnoId]);

  const [nombre, setNombre] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Los campos se llenan cuando llega la ficha. nombre en null significa
  // "todavía no llegó": así no se pisa lo que el profe ya empezó a escribir.
  useEffect(() => {
    if (!ficha.datos || nombre !== null) return;
    setNombre(ficha.datos.full_name);
    setEmail(ficha.datos.email ?? '');
  }, [ficha.datos, nombre]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const correoNuevo = email.trim() || null;
    const cambioElCorreo = correoNuevo !== (ficha.datos?.email ?? null);

    const datos: DatosFicha = {
      full_name: (nombre ?? '').trim(),
      email: correoNuevo,
      // Corregir el correo reabre la invitación. Cambiar solo el nombre, no.
      ...(cambioElCorreo ? { invite_rejected_at: null } : {}),
    };
    try {
      await editarFicha(alumnoId, datos);
      alGuardar();
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  if (ficha.error) return <Aviso>{ficha.error}</Aviso>;
  if (nombre === null) return <Vacio>Buscando…</Vacio>;

  const yaEntro = ficha.datos?.user_id != null;

  return (
    <form onSubmit={guardar} className="flex flex-col gap-3 rounded-lg border border-linea p-3">
      <p className="text-tinta">Ficha de {ficha.datos?.full_name}</p>

      <Campo etiqueta="Cómo lo anotás" ayuda="El nombre con el que aparece en tu lista.">
        <Texto required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>

      <Campo
        etiqueta="Correo"
        ayuda={
          yaEntro
            ? 'Ya entró a la app. Cambiar el correo acá no le saca el acceso: su cuenta quedó enlazada a esta ficha.'
            : 'Con esto entra al portal a ver sus clases y su cuenta. Sin correo no puede entrar.'
        }
      >
        <Texto type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
