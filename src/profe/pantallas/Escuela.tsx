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
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import {
  editarEspacio, traerMediosDePago, soyAlumnoDeAlguien, subirLogo, LOGO_MAX_MB,
  traerDisciplinas, guardarDisciplinas,
} from '../datos';
import type { Espacio, ActividadDelEspacio, Catalogo, Disciplina } from '../datos';
import {
  Marco, Aviso, Titulo, Seccion, Campo, Texto, Boton, BotonSecundario,
  Esqueleto, useCarga, Avatar, Hoja, SelectorDeTema, claseOpcion, claseAccionTenue,
} from '../../comun/ui';
import ComoMePagan from './ComoMePagan';
import Recorte from '../../comun/Recorte';
import Salir from './Salir';

export default function Escuela({
  espacio,
  email,
  userId,
  alRenombrar,
  alCambiarEspacio,
}: {
  espacio: Espacio;
  email: string;
  userId: string;
  alRenombrar: (nuevo: Espacio) => void;
  // Solo viene cuando el profesor tiene más de un espacio.
  alCambiarEspacio?: () => void;
}) {
  const medios = useCarga(() => traerMediosDePago(espacio.id), [espacio.id]);
  // Casi todos los profesores siguen tomando clases con otros. Si esta persona
  // además tiene ficha de alumna en algún lado, acá está la puerta — con la
  // misma cuenta, sin un segundo correo.
  const alumno = useCarga(() => soyAlumnoDeAlguien(userId), [userId]);

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

      <Seccion>Preferencias</Seccion>
      <SelectorDeTema />

      <Seccion>Tu cuenta</Seccion>

      {alumno.datos === true ? (
        <p className="mb-3 text-sm text-tenue">
          También tomás clases en otro lado. Es la misma cuenta de los dos lados.
        </p>
      ) : alumno.datos === false ? (
        <p className="mb-3 text-sm text-tenue">
          ¿Vos también tomás clases con otro profe? Pedile que te anote con{' '}
          <span className="text-tinta">{email}</span> y vas a ver tus clases desde esta
          misma cuenta, sin otro correo.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {alumno.datos === true && (
          <BotonSecundario
            type="button"
            onClick={() => { window.location.href = '/alumno'; }}
          >
            Ir a mi app de alumno
          </BotonSecundario>
        )}
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
  // El catálogo, para armar el menú. Y lo elegido, como un conjunto: el orden
  // en el que las tocaste no es información.
  const catalogo = useCarga(() => traerDisciplinas(), []);
  const [elegidas, setElegidas] = useState<ActividadDelEspacio[]>(espacio.disciplinas);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const mismas =
    elegidas.length === espacio.disciplinas.length
    && elegidas.every((a) => espacio.disciplinas.some(
      (b) => b.slug === a.slug && (b.nota ?? '') === (a.nota ?? ''),
    ));
  const cambio = nombre.trim() !== espacio.name || !mismas;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('La escuela necesita un nombre: es lo que ven tus alumnos.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      // Las actividades primero: así lo que vuelve de editarEspacio ya las
      // trae puestas y la pantalla no muestra un estado viejo por un segundo.
      if (!mismas) await guardarDisciplinas(espacio.id, elegidas);
      const nuevo = await editarEspacio(espacio.id, { name: nombre.trim() });
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
      <Logo espacio={espacio} alCambiar={alRenombrar} />

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

      {/* ------------------------------------------------------------------
          QUÉ ENSEÑÁS

          Era un campo de texto libre donde cada uno escribía lo que quería, y
          una sola cosa. Ahora son botones y podés marcar las que des: el que
          da bachata también da salsa, y elegir una lo obligaba a mentir.

          Botones y no un desplegable con selección múltiple: en el celular esa
          cosa es una lista gris donde no se ve qué quedó marcado, y acá lo que
          importa es ver de un vistazo lo que ya elegiste.

          Después fueron todos sueltos y todos a la vez. Con treinta entraba;
          con las más de cien que trae la 0043, no. Ahora el menú viene
          agrupado y plegado, en `Actividades`, acá abajo.
         ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-tinta">Qué enseñás</p>
        {catalogo.error && <Aviso>{catalogo.error}</Aviso>}
        {!catalogo.datos && !catalogo.error && (
          <p className="text-sm text-tenue">Buscando…</p>
        )}
        {catalogo.datos && (
          <Actividades
            catalogo={catalogo.datos}
            elegidas={elegidas}
            alCambiar={setElegidas}
          />
        )}
        <p className="text-xs leading-relaxed text-tenue">
          Marcá todas las que des. Es lo que ven tus alumnos debajo del nombre, y
          lo que algún día va a servirle a alguien para encontrarte.
        </p>

        {/* ----------------------------------------------------------------
            LA ACLARACIÓN

            "Bachata Influence" no es una actividad distinta de "Bachata": es
            bachata con un estilo. Si cada estilo fuera su propia categoría, el
            día del buscador el alumno que escribe "bachata" no encontraría a
            ninguno de los que la dan.

            Así que la categoría es del catálogo —la misma para todos, la que
            se busca— y el estilo es tuyo, en tus palabras, al lado.
           ---------------------------------------------------------------- */}
        {catalogo.datos && elegidas.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {elegidas.map((a) => {
              const nombre = catalogo.datos?.disciplinas.find((d) => d.slug === a.slug)?.name ?? a.slug;
              return (
                <div key={a.slug} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-tenue">{nombre}</span>
                  <Texto
                    value={a.nota ?? ''}
                    maxLength={40}
                    placeholder="estilo (opcional)"
                    onChange={(e) =>
                      setElegidas((xs) => xs.map((x) =>
                        x.slug === a.slug ? { ...x, nota: e.target.value } : x,
                      ))
                    }
                  />
                </div>
              );
            })}
            <p className="text-xs leading-relaxed text-tenue">
              Para el estilo, en tus palabras: "Influence", "On2", "Hatha". Se
              muestra al lado y no es una categoría aparte, así que el que busque
              "bachata" te va a encontrar igual.
            </p>
          </div>
        )}
      </div>

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


// ----------------------------------------------------------------------------
// EL MENÚ DE ACTIVIDADES
//
// Con treinta alcanzaba con mostrarlas todas. Con más de cien no: la pantalla
// se vuelve una pared de botones donde "Pilates" está en algún lado. El
// catálogo viene agrupado de la base (migración 0043) y acá se muestra de dos
// maneras, según lo que la persona esté haciendo.
//
// ESCRIBIENDO: el que ya sabe qué da no quiere navegar nada. Escribe "tae" y
// aparece Taekwondo, venga del grupo que venga.
//
// MIRANDO: el que no sabe qué hay abre el grupo que le suena. Los grupos
// arrancan plegados —si no, volvemos a la pared— menos aquellos donde ya hay
// algo marcado, que arrancan abiertos para que el profe vea en qué quedó.
//
// Y lo elegido va arriba de todo, siempre visible. Es lo único que necesita
// confirmar de un vistazo, y es lo primero que se perdía cuando la lista se
// hizo larga: si una actividad marcada queda dentro de un grupo plegado, sin
// esa fila no hay forma de sacarla.
// ----------------------------------------------------------------------------

// Para buscar. Nadie escribe "música" con tilde en el buscador de una app, y
// hacerle escribir "Taekwondo" tal cual para encontrarlo es perder al que lo
// escribió sin la k.
function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function Actividades({
  catalogo,
  elegidas,
  alCambiar,
}: {
  catalogo: Catalogo;
  elegidas: ActividadDelEspacio[];
  alCambiar: Dispatch<SetStateAction<ActividadDelEspacio[]>>;
}) {
  const [busqueda, setBusqueda] = useState('');
  // Los grupos abiertos. Arrancan los que ya tienen algo elegido.
  const [abiertos, setAbiertos] = useState<string[]>(() => {
    const puestas = new Set(elegidas.map((x) => x.slug));
    const con = catalogo.disciplinas.filter((d) => puestas.has(d.slug)).map((d) => d.grupo);
    return Array.from(new Set(con));
  });

  const alterna = (slug: string) =>
    alCambiar((xs) =>
      xs.some((x) => x.slug === slug)
        ? xs.filter((x) => x.slug !== slug)
        : [...xs, { slug, nota: null }],
    );

  const Boton_ = (d: Disciplina) => {
    const puesta = elegidas.some((x) => x.slug === d.slug);
    return (
      <button
        key={d.slug}
        type="button"
        aria-pressed={puesta}
        onClick={() => alterna(d.slug)}
        className={claseOpcion(puesta)}
      >
        {d.name}
      </button>
    );
  };

  const q = sinTildes(busqueda.trim());
  const encontradas = q
    ? catalogo.disciplinas.filter((d) => sinTildes(d.name).includes(q))
    : [];

  return (
    <div className="flex flex-col gap-3">
      {elegidas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {elegidas.map((a) => {
            const nombre = catalogo.disciplinas.find((d) => d.slug === a.slug)?.name ?? a.slug;
            return (
              <button
                key={a.slug}
                type="button"
                onClick={() => alterna(a.slug)}
                className={claseOpcion(true)}
                aria-label={`Sacar ${nombre}`}
              >
                {nombre}
                <span aria-hidden className="ml-1.5 opacity-70">×</span>
              </button>
            );
          })}
        </div>
      )}

      <Texto
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar una actividad…"
      />

      {q ? (
        encontradas.length > 0 ? (
          <div className="flex flex-wrap gap-2">{encontradas.map(Boton_)}</div>
        ) : (
          <p className="text-sm text-tenue">
            No encontramos nada con «{busqueda.trim()}». Si lo que das no está en
            la lista, marcá «Otra» y escribilo al lado.
          </p>
        )
      ) : (
        <div className="divide-y divide-linea overflow-hidden rounded-xl border border-linea">
          {catalogo.grupos.map((g) => {
            const suyas = catalogo.disciplinas.filter((d) => d.grupo === g.slug);
            if (suyas.length === 0) return null;
            const abierto = abiertos.includes(g.slug);
            const cuantas = suyas.filter(
              (d) => elegidas.some((x) => x.slug === d.slug),
            ).length;
            return (
              <div key={g.slug}>
                <button
                  type="button"
                  aria-expanded={abierto}
                  onClick={() =>
                    setAbiertos((xs) =>
                      abierto ? xs.filter((x) => x !== g.slug) : [...xs, g.slug],
                    )
                  }
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-3.5 text-left text-sm font-medium text-tinta transition hover:bg-acento-suave/40"
                >
                  <span className="flex items-center gap-2">
                    {g.name}
                    {cuantas > 0 && (
                      <span className="rounded-full bg-acento-suave px-2 py-0.5 text-xs font-semibold text-acento">
                        {cuantas}
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="text-lg leading-none text-tenue">
                    {abierto ? '−' : '+'}
                  </span>
                </button>
                {abierto && (
                  <div className="flex flex-wrap gap-2 px-3.5 pb-3.5">{suyas.map(Boton_)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ----------------------------------------------------------------------------
// El logo.
//
// Sin imagen, la app dibuja las iniciales sobre un color sacado del nombre —el
// mismo mecanismo que usa para las personas— así que una escuela sin logo ya
// se distingue de otra. El logo es para que además se reconozca sin leer.
//
// Se guarda en el acto, sin botón de guardar: subir una imagen ya es la
// confirmación. Pedir un segundo paso después de elegir un archivo es pedir
// dos veces lo mismo.
// ----------------------------------------------------------------------------
function Logo({
  espacio,
  alCambiar,
}: {
  espacio: Espacio;
  alCambiar: (nuevo: Espacio) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  // El archivo que se está por recortar. El logo se ve en un círculo en todas
  // las pantallas, así que el recorte lo elige quien lo sube y no el navegador
  // por el centro.
  const [aRecortar, setARecortar] = useState<File | null>(null);

  async function subir(recortada: Blob) {
    setARecortar(null);
    setSubiendo(true);
    setError(null);
    try {
      const url = await subirLogo(espacio.id, recortada);
      alCambiar(await editarEspacio(espacio.id, { avatar_url: url }));
    } catch (err) {
      setError((err as Error).message);
    }
    setSubiendo(false);
  }

  async function quitar() {
    setSubiendo(true);
    setError(null);
    try {
      alCambiar(await editarEspacio(espacio.id, { avatar_url: null }));
    } catch (err) {
      setError((err as Error).message);
    }
    setSubiendo(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* La misma forma que la foto del alumno en su perfil, y a propósito:
          son la misma operación con otro archivo. Antes acá había dos botones
          del mismo peso apilados al lado de un avatar con scale-150, y allá
          otros dos iguales — dos lugares, un solo problema. */}
      <div className="flex items-center gap-5">
        <Avatar nombre={espacio.name} foto={espacio.avatar_url} tam="grande" />

        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
            {/* El input de archivo no va adentro de <Campo>: Campo envuelve a
                sus hijos en un <label>, y un input de archivo adentro de su
                propio label recibe dos clics y se cierra solo. */}
            <label className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-full bg-acento-suave px-3.5 py-1.5 text-sm font-semibold text-acento transition hover:brightness-[0.97] active:scale-[0.97]">
              {subiendo ? 'Subiendo…' : espacio.avatar_url ? 'Cambiar' : 'Subir un logo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={subiendo}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  if (f.size > LOGO_MAX_MB * 1024 * 1024) {
                    setError(`La imagen pesa más de ${LOGO_MAX_MB} MB. Probá con otra.`);
                    return;
                  }
                  setError(null);
                  setARecortar(f);
                }}
              />
            </label>
            {espacio.avatar_url && (
              <button
                type="button"
                onClick={quitar}
                disabled={subiendo}
                className={claseAccionTenue}
              >
                Quitar
              </button>
            )}
          </div>

          <p className="text-sm leading-snug text-tenue">
            Lo ven tus alumnos arriba de todo. Sin logo se usan las iniciales.
            Hasta {LOGO_MAX_MB} MB.
          </p>
        </div>
      </div>

      {error && <Aviso>{error}</Aviso>}

      {aRecortar && (
        <Hoja titulo="Acomodá el logo" alCerrar={() => setARecortar(null)}>
          <Recorte
            archivo={aRecortar}
            alCancelar={() => setARecortar(null)}
            alRecortar={(b) => void subir(b)}
          />
        </Hoja>
      )}
    </div>
  );
}
