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
import { editarEspacio, traerMediosDePago, soyAlumnoDeAlguien, subirLogo, LOGO_MAX_MB } from '../datos';
import type { Espacio } from '../datos';
import {
  Marco, Aviso, Titulo, Seccion, Campo, Texto, Boton, BotonSecundario,
  Esqueleto, useCarga, Avatar, Hoja, SelectorDeTema,
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
      <div className="flex items-center gap-4">
        <div className="scale-150 pl-3">
          <Avatar nombre={espacio.name} foto={espacio.avatar_url} />
        </div>
        <div className="flex flex-col gap-2 pl-3">
          {/* El input de archivo no va adentro de <Campo>: Campo envuelve a
              sus hijos en un <label>, y un input de archivo adentro de su
              propio label recibe dos clics y se cierra solo. */}
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-acento-suave px-4 py-2.5 text-sm font-medium text-acento transition hover:brightness-[0.97] active:scale-[0.97]">
            {subiendo ? 'Subiendo…' : espacio.avatar_url ? 'Cambiar el logo' : 'Subir un logo'}
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
            <BotonSecundario type="button" onClick={quitar} disabled={subiendo}>
              Quitar
            </BotonSecundario>
          )}
        </div>
      </div>

      <p className="text-xs text-tenue">
        Lo ven tus alumnos arriba de todo. Sin logo se usan las iniciales. Hasta{' '}
        {LOGO_MAX_MB} MB.
      </p>

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
