import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  traerInscripciones, traerClases, traerAlumnos, crearAlumno, inscribir,
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

      {clases.error && <Aviso>{clases.error}</Aviso>}
      {!clases.datos && !clases.error && <Vacio>Buscando…</Vacio>}
      {clases.datos?.length === 0 && <Vacio>Todavía no hay clases cargadas.</Vacio>}

      <ul className="flex flex-col gap-2">
        {clases.datos?.map((c) => (
          <li key={c.id}>
            <Tarjeta alTocar={() => alTomarAsistencia(c)}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-brand-cream">{c.title ?? 'Clase'}</p>
                <p className="shrink-0 text-sm text-brand-taupe">
                  {fecha(c.date)}
                  {c.start_time ? ` · ${c.start_time.slice(0, 5)}` : ''}
                </p>
              </div>
              {c.recap && <p className="mt-1 text-sm text-brand-taupe">{c.recap}</p>}
            </Tarjeta>
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
