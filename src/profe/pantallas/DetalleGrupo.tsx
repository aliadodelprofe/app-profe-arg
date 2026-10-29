import { Fragment, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  traerInscripciones, traerClases, traerAlumnos, crearAlumno, inscribir, crearClase,
  editarClase, cambiarEstadoClase, lugarDe, linkMapa, crearClases,
  sumarDias, diaSemana, mesDe, asegurarClases, asegurarImputaciones, primerHorario,
  hoyISO, horarioDe,
  darDeBaja, volverAAnotar, quitarInscripcion, crearCargo, cobrarCuotaDelGrupo,
  traerFicha, editarFicha,
  mesEnPalabras, inicioDelMes, precioDe, precioDelGrupo, asegurarCargos,
  inscribirConArranqueDiferido, mesSiguiente,
  nombreFormato, nombreCobro, fecha, plata,
  periodoDe, porAlumno, porMes, mesDeCorte,
} from '../datos';
import FormularioGrupo from './FormularioGrupo';
import { duracionEnPalabras } from '../../comun/fechas';
import type {
  Espacio, Grupo, Clase, Alumno, ModoCobro, Inscripcion, ResultadoCobro, DatosFicha,
  AlumnoDelGrupo,
} from '../datos';
import {
  Marco, Aviso, Vacio, useCarga, Campo, Texto, Area, Opciones,
  Boton, BotonSecundario, BarraAccion,
  Titulo, Etiqueta, Segmentos, Lista, Fila, Hoja, Esqueleto, ChipFecha, CorteDeMes,
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
  const [hoja, setHoja] = useState<null | 'editar' | 'anotar' | 'clase' | 'fechas'>(null);

  // Una fila por persona, no por inscripción: ver porAlumno() en datos.ts.
  const gente = porAlumno(inscripciones.datos ?? [], hoyISO());
  const activos = gente.filter((g) => g.activo);

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
    <Marco conAccion>
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
            {/* De qué es, primero: un profe que da bachata y salsa quiere
                saber en qué grupo está parado antes que nada. */}
            {grupo.disciplina && (
              <Etiqueta tono="acento">{grupo.disciplina.name}</Etiqueta>
            )}
            <Etiqueta>{nombreFormato[grupo.format]}</Etiqueta>
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
        <div className="anim-aparecer mb-4 rounded-xl border border-acento/25 bg-acento-suave px-4 py-3 text-sm text-acento">
          {novedades.map((n) => <p key={n}>{n}</p>)}
        </div>
      )}

      {cuantasEsteMes >= 5 && (
        <p className="mb-4 border-l-2 border-linea pl-3.5 text-sm leading-relaxed text-tenue">
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
          {inscripciones.error && <Aviso>{inscripciones.error}</Aviso>}
          {!inscripciones.datos && !inscripciones.error && <Esqueleto />}
          {inscripciones.datos && gente.length === 0 && (
            <Vacio>Todavía no hay nadie inscripto en este grupo.</Vacio>
          )}

          {gente.length > 0 && (
            <Lista>
              {gente.map((g) => (
                <FilaAlumno
                  key={g.alumno.id}
                  espacio={espacio}
                  grupo={grupo}
                  persona={g}
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
          {/* Un solo botón, y para una sola cosa: agregar una clase que NO
              corresponde al horario. Un recupero, una extra.

              "Generar varias" se fue. Tenía sentido cuando las clases se
              cargaban a mano; desde la 0018 el horario fijo las crea solo
              hasta fin del mes que viene, así que ese botón ofrecía hacer a
              mano lo que la app ya hizo — y lo único que podía producir era
              un duplicado o una confusión sobre quién manda. */}
          {/* "Agregar varias" vuelve, pero SOLO cuando el grupo no tiene día
              fijo. En un regular era un botón para hacer a mano lo que la app
              ya hizo; en una formación de fechas sueltas o en una particular
              que se agenda a dedo es lo único que evita cargar ocho clases de
              a una. El mismo botón puede ser redundante o imprescindible
              según de qué grupo cuelgue. */}
          <p className="mb-4 text-sm text-tenue">
            {horarioDe(grupo)
              ? `Este grupo se mantiene solo: las clases de los ${horarioDe(grupo)} se van creando hasta fin del mes que viene. Este botón es para agregar algo fuera de ese horario, como un recupero.`
              : 'Este grupo no tiene día fijo: las clases las vas cargando vos a medida que las acordás.'}
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

      {hoja === 'fechas' && (
        <Hoja titulo="Agregar varias fechas" alCerrar={() => setHoja(null)}>
          <FormularioFechas
            espacio={espacio}
            grupo={grupo}
            yaCargadas={clases.datos?.map((c) => c.date) ?? []}
            alCerrar={() => setHoja(null)}
            alCrear={() => { setHoja(null); clases.recargar(); }}
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

      {/* LA ACCIÓN, PEGADA ABAJO.
          
          Estos botones vivían arriba de la lista y desaparecían al tercer
          scroll: la acción principal de la pantalla dejaba de existir justo
          cuando terminabas de leer lo que te hacía falta para decidirla. Y
          cambian según la solapa, porque no es la misma pantalla: en Alumnos
          lo que hacés es anotar a alguien, en Clases es agregar una fecha. */}
      {vista === 'alumnos' ? (
        <BarraAccion
          dato={activos.length === 0
            ? 'Nadie anotado'
            : `${activos.length} ${activos.length === 1 ? 'alumno' : 'alumnos'}`}
          bajoDato={grupo.capacity ? `de ${grupo.capacity} de cupo` : null}
        >
          <Boton onClick={() => setHoja('anotar')}>Anotar alumno</Boton>
        </BarraAccion>
      ) : (
        <BarraAccion
          dato={horarioDe(grupo) ?? 'Sin día fijo'}
          bajoDato={horarioDe(grupo) ? 'se crean solas' : 'las cargás vos'}
        >
          {!horarioDe(grupo) && (
            <BotonSecundario onClick={() => setHoja('fechas')}>Varias fechas</BotonSecundario>
          )}
          <Boton onClick={() => setHoja('clase')}>Agregar clase</Boton>
        </BarraAccion>
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
  // Las formas que este grupo puede cobrar de verdad, que son las que tienen
  // precio cargado. Si no hay ninguna, el formulario lo dice en vez de dejar
  // anotar a alguien que nunca va a recibir un cargo.
  const formasConPrecio = ([
    { valor: 'per_session' as ModoCobro, texto: 'Por clase' },
    { valor: 'per_period' as ModoCobro, texto: 'Por mes' },
    { valor: 'one_time' as ModoCobro, texto: 'El taller entero' },
  ]).filter((o) => precioDelGrupo(grupo, o.valor) !== null);

  const [cobro, setCobro] = useState<ModoCobro>(
    formasConPrecio[0]?.valor ?? 'per_session',
  );
  const [diferir, setDiferir] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const disponibles: Alumno[] =
    alumnos.datos?.filter((a) => !yaInscriptos.includes(a.id)) ?? [];

  // EL CUPO, QUE AHORA SE MIRA
  //
  // Hasta hoy el número se guardaba al crear el grupo, se mostraba en el
  // listado y nadie lo leía nunca: podías anotar doce en un grupo de seis y
  // la app no decía nada. Avisa, no bloquea —vos sabrás si entra uno más, y
  // una sala no es una regla de negocio— pero te lo dice ANTES, que es
  // cuando sirve.
  const lleno = grupo.capacity !== null && yaInscriptos.length >= grupo.capacity;
  const [igual, setIgual] = useState(false);

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
            etiqueta="Correo"
            ayuda="Es con lo que entra a su app a ver sus clases y lo que debe. Sin correo, la ficha existe pero la persona no puede entrar nunca."
          >
            <Texto
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
              className="w-full rounded-xl border border-linea bg-campo px-3.5 py-2.5 text-tinta placeholder:text-tenue/50 outline-none transition focus:border-acento focus:ring-4 focus:ring-acento/15"
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
          return `Paga ${plata(p)} una sola vez, y le vence hoy.`;
        })()}
      >
        {/* Solo las formas que ESTE grupo tiene con precio. Ofrecer "por mes"
            en un taller que no tiene precio mensual era ofrecer una forma que
            no genera ningún cargo: el alumno quedaba anotado, al día, y
            debiendo todo. La app decía que sí y no cobraba nada. */}
        {formasConPrecio.length > 0 ? (
          <Opciones<ModoCobro>
            valor={cobro}
            alElegir={setCobro}
            opciones={formasConPrecio}
          />
        ) : (
          <Aviso>
            Este grupo no tiene ningún precio cargado, así que a quien anotes no se le va
            a generar nada. Ponele un precio primero, en "Editar".
          </Aviso>
        )}
      </Campo>

      {/* Se suma con el mes ya empezado: cobrarle la cuota entera sería
          cobrarle clases que no va a recibir. */}
      {cobro === 'per_period' && mesEmpezado && (
        <div className="rounded-lg border border-acento/25 bg-acento-suave px-3 py-2">
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

      {lleno && (
        <div className="rounded-lg border border-alerta/25 bg-alerta-suave px-3 py-2">
          <p className="mb-2 text-sm text-alerta">
            El cupo de este grupo es {grupo.capacity} y ya hay{' '}
            {yaInscriptos.length === 1 ? '1 anotado' : `${yaInscriptos.length} anotados`}.
          </p>
          <Opciones<'no' | 'si'>
            valor={igual ? 'si' : 'no'}
            alElegir={(v) => setIgual(v === 'si')}
            opciones={[
              { valor: 'no', texto: 'Mejor no' },
              { valor: 'si', texto: 'Anotalo igual' },
            ]}
          />
          <p className="mt-2 text-xs text-tenue">
            El cupo es tuyo, no una regla: si en la sala entra uno más, anotalo.
            Esto es para que te enteres ahora y no cuando llegan todos.
          </p>
        </div>
      )}

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando || (lleno && !igual)}>
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
  // arriba de cada tramo, la lista se recorre saltando. Van todas en UNA sola
  // lista y no una por mes: así el corte se pega arriba mientras scrolleás y
  // la pantalla siempre dice en qué mes estás parado.
  const tramos = porMes(visibles, (c) => c.date);

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

      {tramos.length > 0 && (
        <Lista>
          {tramos.map((tramo) => (
            <Fragment key={tramo.mes}>
              {/* Solo si hay más de un mes a la vista: un encabezado "octubre"
                  arriba de una lista que es toda de octubre no separa nada. */}
              {tramos.length > 1 && (
                <CorteDeMes cuantas={tramo.items.length}>
                  {mesDeCorte(tramo.mes, hoy)}
                </CorteDeMes>
              )}
              {tramo.items.map((c) => (
                <FilaClase
                  key={c.id}
                  clase={c}
                  grupo={grupo}
                  pasada={cual === 'pasadas'}
                  alTomarAsistencia={() => alTomarAsistencia(c)}
                  alCambiar={alCambiar}
                />
              ))}
            </Fragment>
          ))}
        </Lista>
      )}

      {cual === 'pasadas' && pasadas.length > cuantasPasadas && (
        <div className="mt-3 flex justify-center">
          <BotonSecundario onClick={() => setCuantasPasadas((n) => n + 10)}>
            Ver {Math.min(10, pasadas.length - cuantasPasadas)} más
          </BotonSecundario>
        </div>
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

  const hoy = hoyISO();
  const esHoy = clase.date === hoy;
  // La ventana para completar una asistencia atrasada: una semana.
  const puedeAsistencia = clase.date <= hoy && clase.date >= sumarDias(hoy, -7);

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

      {/* --------------------------------------------------------- los botones

          Cada clase ofrece SOLO lo que tiene sentido en su momento. Antes las
          tres opciones aparecían siempre, incluso para una clase de hace tres
          meses, y eso no era generosidad: era pedirle al profesor que
          descarte dos de cada tres botones cada vez que mira la lista.

            Clase que viene  → editar y cancelar. Todavía se puede cambiar.
            Clase de hoy     → además, tomar asistencia.
            Clase pasada     → asistencia mientras sea reciente, y nada más.

          Lo que NO se puede hacer con una clase pasada es editarla o
          cancelarla. Cancelar una clase que ya se dio no es un cambio de
          planes: es reescribir lo que pasó, con cargos y asistencias
          colgando de eso. Lo que sí se puede corregir siempre es el recap,
          que se escribe después por definición y vive en la pantalla de
          asistencia.

          La asistencia de una clase pasada se permite por una ventana de una
          semana. El profesor la toma parado en la sala, pero si ese día se le
          pasó, bloquearlo al día siguiente pierde el registro para siempre.
          Pasada la semana se cierra: a esa altura ya nadie se acuerda quién
          vino, y una asistencia inventada es peor que una vacía. */}
      <div className="flex flex-wrap gap-2">
        {!cancelada && puedeAsistencia && (
          <Boton type="button" onClick={alTomarAsistencia}>
            {esHoy ? 'Tomar asistencia' : 'Completar asistencia'}
          </Boton>
        )}
        {!pasada && (
          <>
            <BotonSecundario type="button" onClick={() => setEditando(true)}>
              Editar
            </BotonSecundario>
            <BotonSecundario type="button" onClick={cambiarEstado} disabled={trabajando}>
              {cancelada ? 'Reactivar' : 'Cancelar clase'}
            </BotonSecundario>
          </>
        )}
        {pasada && !puedeAsistencia && !cancelada && (
          <p className="text-sm text-tenue">
            Ya pasó. Lo único que se puede corregir es el resumen, desde la asistencia.
          </p>
        )}
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
      <Campo
        etiqueta="Duración"
        ayuda={(() => {
          const p = duracionEnPalabras(Number(duracion));
          return p ? `Son ${p}.` : 'En minutos.';
        })()}
      >
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
// AGREGAR VARIAS FECHAS DE UNA
//
// Para los grupos que NO tienen día fijo: una formación de fechas sueltas, una
// particular que se acuerda clase a clase. Ahí cargar ocho clases de a una es
// el trabajo que esta app vino a sacar.
//
// Se arma una lista a dedo en vez de generar N semanas seguidas. Es la
// diferencia entre esto y lo que había antes: "dos miércoles al mes" o "un
// jueves y un viernes" no son una serie, son fechas elegidas. Una serie
// semanal ya la hace sola el día fijo.
// ----------------------------------------------------------------------------
function FormularioFechas({
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
  const [fechas, setFechas] = useState<string[]>([]);
  const [dia, setDia] = useState('');
  // Precargado con el primer encuentro del horario, si tiene. Con dos días
  // distintos hay que elegir uno, y el profesor lo corrige acá mismo.
  const primero = primerHorario(grupo);
  const [hora, setHora] = useState(primero?.start_time?.slice(0, 5) ?? '');
  const [duracion, setDuracion] = useState(primero?.duration_min?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function agregar() {
    if (!dia) return;
    if (yaCargadas.includes(dia)) {
      setError('Ese día ya tiene una clase cargada en este grupo.');
      return;
    }
    if (fechas.includes(dia)) return;
    setError(null);
    setFechas((f) => [...f, dia].sort());
    setDia('');
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (fechas.length === 0) {
      setError('Agregá al menos una fecha a la lista.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await crearClases(
        espacio.id,
        fechas.map((f) => ({
          group_id: grupo.id,
          date: f,
          start_time: hora || null,
          duration_min: duracion ? Number(duracion) : null,
          title: null,
        })),
      );
      alCrear();
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <p className="text-sm text-tenue">
        Todas con el mismo horario. Si alguna va a otra hora, cargala aparte o corregila
        después.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Hora">
          <Texto type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </Campo>
        <Campo
          etiqueta="Duración"
          ayuda={(() => {
            const p = duracionEnPalabras(Number(duracion));
            return p ? `Son ${p}.` : 'En minutos.';
          })()}
        >
          <Texto
            type="number" min="15" step="15" value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
          />
        </Campo>
      </div>

      {/* El input de fecha y el botón, juntos: agregar una fecha a la lista no
          es guardar nada todavía. */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Campo etiqueta="Fecha">
            <Texto
              type="date" value={dia}
              onChange={(e) => setDia(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
            />
          </Campo>
        </div>
        <BotonSecundario type="button" onClick={agregar} disabled={!dia}>
          Agregar
        </BotonSecundario>
      </div>

      {fechas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fechas.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFechas((xs) => xs.filter((x) => x !== f))}
              className="inline-flex items-center gap-1.5 rounded-full bg-acento-suave px-3 py-1.5 text-sm font-medium text-acento transition hover:brightness-[0.97]"
            >
              {fecha(f)}
              <span aria-hidden="true" className="text-base leading-none">×</span>
            </button>
          ))}
        </div>
      )}

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando || fechas.length === 0}>
          {guardando
            ? 'Creando…'
            : `Crear ${fechas.length} ${fechas.length === 1 ? 'clase' : 'clases'}`}
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
  persona,
  alCambiar,
}: {
  espacio: Espacio;
  grupo: Grupo;
  persona: AlumnoDelGrupo;
  alCambiar: () => void;
}) {
  // Una persona puede tener varios arreglos encadenados. "inscripcion" es el
  // que manda hoy: es el que fija el precio que se muestra y al que se le
  // cuelga un cargo manual. Los otros entran en juego al dar de baja o quitar,
  // que tienen que llevarse todos.
  const inscripcion = persona.vigente;
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [cobrado, setCobrado] = useState<string | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [editandoFicha, setEditandoFicha] = useState(false);
  // La hoja del alumno. Las acciones viven adentro: en la fila eran cuatro
  // botones por persona, y seis personas hacían veinticuatro botones iguales.
  const [abierto, setAbierto] = useState(false);

  const activa = persona.activo;

  async function hacer(accion: () => Promise<void>) {
    setTrabajando(true);
    setError(null);
    try {
      await accion();
      setAbierto(false);
      setConfirmando(false);
      setTrabajando(false);
      alCambiar();
    } catch (e) {
      setError((e as Error).message);
      setTrabajando(false);
      setConfirmando(false);
    }
  }

  const nombre = persona.alumno.full_name;

  // La línea de abajo del nombre. Dice, en este orden de urgencia: si ya no
  // cursa, si no va a poder entrar a la app, y si su forma de pago cambia el
  // mes que viene. Ya NO repite la forma de pago actual: esa está dos
  // centímetros a la derecha, debajo del precio.
  const detalles = [
    !activa && (inscripcion.end_date ? `ya no cursa · hasta el ${fecha(inscripcion.end_date)}` : 'ya no cursa'),
    activa && !persona.alumno.email && 'sin correo: no va a poder entrar a la app',
    activa && persona.alumno.email && !persona.alumno.user_id && !persona.alumno.invite_rejected_at &&
      `invitado a ${persona.alumno.email} · todavía no aceptó`,
    // El segundo arreglo, dicho como lo que es: un cambio anunciado, no otro
    // alumno. Es lo que antes aparecía como una fila duplicada.
    activa && persona.futuro && persona.futuro.start_date &&
      `pasa a ${nombreCobro[persona.futuro.billing_mode]} desde ${mesEnPalabras(mesDe(persona.futuro.start_date))}`,
  ].filter(Boolean) as string[];

  return (
    <>
      {/* LA FILA NO TRAE BOTONES.

          Antes cada alumno arrastraba cuatro: corregir la ficha, cobrar algo
          aparte, dar de baja y quitar. Con seis alumnos eso son veinticuatro
          botones en la pantalla, todos del mismo color y del mismo tamaño, y
          ninguno es lo que vas a hacer. La lista dejaba de ser una lista de
          personas para ser una grilla de acciones.

          Ahora la fila dice lo que tiene que decir —quién, cuánto, cómo paga,
          y si hay algo raro— y las acciones viven adentro, a un toque. Es lo
          que hace cualquier lista de contactos: ves la lista, tocás a uno,
          hacés lo que ibas a hacer. */}
      <Fila
        avatar={nombre}
        foto={persona.alumno.avatar_url}
        titulo={nombre}
        detalle={detalles.length > 0 ? detalles.join(' · ') : null}
        valor={plata(precioDe(grupo, inscripcion))}
        bajoValor={nombreCobro[inscripcion.billing_mode]}
        alTocar={() => { setAbierto(true); setConfirmando(false); }}
      />

      {abierto && (
        <Hoja titulo={nombre} alCerrar={() => setAbierto(false)}>
          <div className="flex flex-col gap-4">
            {/* Lo que la fila no entra a decir, acá entra entero. */}
            <div>
              <p className="plata text-2xl font-bold text-tinta">
                {plata(precioDe(grupo, inscripcion))}
              </p>
              <p className="text-sm text-tenue">
                {nombreCobro[inscripcion.billing_mode]}
                {!activa && ' · ya no cursa'}
              </p>
            </div>

            {activa && persona.alumno.invite_rejected_at && !persona.alumno.user_id && (
              <Aviso>
                Alguien entró con {persona.alumno.email} y dijo que no es esta
                persona. Revisá el correo en "Corregir la ficha".
              </Aviso>
            )}

            {error && <Aviso>{error}</Aviso>}

            {cobrado && (
              <p className="rounded-lg border border-acento/25 bg-acento-suave px-3 py-2 text-sm text-acento">
                {cobrado}
              </p>
            )}

            {confirmando ? (
              <div>
                <p className="mb-3 text-sm text-tenue">
                  Quitar borra la inscripción como si nunca hubiera existido. Si el
                  alumno cursó, lo que corresponde es darlo de baja.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Boton
                    type="button" disabled={trabajando}
                    onClick={() => hacer(() => quitarInscripcion(persona.tramos))}
                  >
                    Sí, quitar
                  </Boton>
                  <BotonSecundario type="button" onClick={() => setConfirmando(false)}>
                    No
                  </BotonSecundario>
                </div>
              </div>
            ) : (
              /* Una debajo de la otra y a lo ancho: son cuatro cosas distintas
                 y en fila se leen como una botonera donde ninguna se distingue.
                 Acá cada una es un renglón que se lee. */
              <div className="flex flex-col gap-2">
                {/* Solo mientras nadie la reclamó. Una vez que el alumno entró,
                    el nombre y la foto son suyos (migración 0023) y la base
                    rechaza el cambio igual: esconder el botón es para no
                    ofrecer algo que no se puede hacer. El período sirve para
                    corregir un correo mal tipeado, que es lo único que impide
                    que el alumno entre. */}
                {!persona.alumno.user_id && (
                  <BotonSecundario
                    type="button" className="w-full"
                    onClick={() => setEditandoFicha(true)}
                  >
                    Corregir la ficha
                  </BotonSecundario>
                )}
                {/* "Cobrar algo aparte" y no "Agregar un cargo". El nombre
                    viejo competía con lo que la app ya hace sola —la cuota del
                    mes y la próxima clase las genera asegurar_cargos() todas
                    las noches— y leído rápido parecía la forma de cobrar eso,
                    que es cobrarlo dos veces. Esto es para lo único que el
                    automatismo no puede saber: una clase particular, un pack,
                    materiales, un recupero. */}
                {activa && (
                  <BotonSecundario
                    type="button" className="w-full"
                    onClick={() => setCobrando(true)}
                  >
                    Cobrar algo aparte
                  </BotonSecundario>
                )}
                {activa ? (
                  <BotonSecundario
                    type="button" disabled={trabajando} className="w-full"
                    onClick={() => hacer(() => darDeBaja(persona.tramos, hoyISO()))}
                  >
                    Dar de baja
                  </BotonSecundario>
                ) : (
                  <BotonSecundario
                    type="button" disabled={trabajando} className="w-full"
                    onClick={() => hacer(() => volverAAnotar(persona.tramos))}
                  >
                    Volver a anotar
                  </BotonSecundario>
                )}
                <BotonSecundario
                  type="button" className="w-full"
                  onClick={() => setConfirmando(true)}
                >
                  Quitar del grupo
                </BotonSecundario>
              </div>
            )}
          </div>
        </Hoja>
      )}

      {/* Las dos hojas que abre el menú de arriba. Van afuera de la hoja del
          alumno y no adentro: una hoja dentro de otra deja dos capas oscuras
          encima de la pantalla y un "cerrar" que no se sabe qué cierra. */}
      {editandoFicha && (
        <Hoja titulo="Corregir la ficha" alCerrar={() => setEditandoFicha(false)}>
          <FormularioFicha
            alumnoId={persona.alumno.id}
            alCerrar={() => setEditandoFicha(false)}
            alGuardar={() => { setEditandoFicha(false); setAbierto(false); alCambiar(); }}
          />
        </Hoja>
      )}

      {cobrando && (
        <Hoja titulo="Cobrar algo aparte" alCerrar={() => setCobrando(false)}>
          <FormularioCargo
            espacio={espacio}
            grupo={grupo}
            inscripcion={inscripcion}
            alCerrar={() => setCobrando(false)}
            alCobrar={(texto) => { setCobrando(false); setCobrado(texto); }}
          />
        </Hoja>
      )}
    </>
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
    <form onSubmit={guardar} className="flex flex-col gap-3 rounded-2xl bg-fondo p-4">
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
    <form onSubmit={guardar} className="flex flex-col gap-3 rounded-2xl bg-fondo p-4">
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
        <Texto
          type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
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
