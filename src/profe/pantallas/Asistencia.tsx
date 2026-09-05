// ============================================================================
// Tomar asistencia — la primera pantalla que escribe en la base.
//
// Cada toque guarda al instante, sin botón de "guardar". Es a propósito: esto
// se usa parado en el medio de una sala, con el celular en una mano. Un
// formulario que hay que confirmar es un formulario que se pierde.
//
// Al lado de cada nombre va la deuda. Es lo que evita que alguien tome la
// clase y se vaya sin pagar: no porque la app lo impida —no puede, la persona
// está parada en la sala— sino porque en el momento exacto en que le tomás
// asistencia tenés el número adelante y preguntás.
// ============================================================================
import { useEffect, useState } from 'react';
import {
  traerInscripciones, traerAsistencias, marcarAsistencia, traerDeudas, guardarRecap,
  nombreAsistencia, fecha, plata,
} from '../datos';
import type {
  Espacio, Grupo, Clase, Inscripcion, FilaDeuda,
  Asistencia as TipoAsistencia, EstadoAsistencia,
} from '../datos';

type Cuenta = { saldo: number; pendiente: number };
import { Marco, Encabezado, Aviso, Vacio, Tarjeta, Campo, Area, Boton } from '../ui';

const ESTADOS: EstadoAsistencia[] = ['present', 'absent', 'excused'];

export default function Asistencia({
  espacio,
  grupo,
  clase,
  alVolver,
}: {
  espacio: Espacio;
  grupo: Grupo;
  clase: Clase;
  alVolver: () => void;
}) {
  const [inscriptos, setInscriptos] = useState<Inscripcion[] | null>(null);
  // Lo marcado hasta ahora, por alumno. Se actualiza apenas tocás, sin
  // esperar a la base: si la base rechaza, se vuelve atrás y se avisa.
  const [marcas, setMarcas] = useState<Record<string, EstadoAsistencia>>({});
  const [cuentas, setCuentas] = useState<Record<string, Cuenta>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setError(null);
    Promise.all([
      traerInscripciones(grupo.id),
      traerAsistencias(clase.id),
      traerDeudas(espacio.id),
    ])
      .then(([ins, asis, deudas]: [Inscripcion[], TipoAsistencia[], FilaDeuda[]]) => {
        if (!vivo) return;
        setInscriptos(ins.filter((i) => i.status === 'active'));
        const previas: Record<string, EstadoAsistencia> = {};
        asis.forEach((a) => { previas[a.student_id] = a.status; });
        setMarcas(previas);
        const cuenta: Record<string, Cuenta> = {};
        deudas.forEach((d) => {
          cuenta[d.alumno.id] = { saldo: d.saldo, pendiente: d.pendiente };
        });
        setCuentas(cuenta);
      })
      .catch((e: Error) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, [grupo.id, clase.id, espacio.id]);

  async function marcar(alumnoId: string, estado: EstadoAsistencia) {
    const anterior = marcas[alumnoId];
    setMarcas((m) => ({ ...m, [alumnoId]: estado }));
    setError(null);
    try {
      await marcarAsistencia({
        espacioId: espacio.id,
        claseId: clase.id,
        alumnoId,
        estado,
      });
    } catch (e) {
      // No entró: dejar la pantalla diciendo la verdad.
      setMarcas((m) => {
        const copia = { ...m };
        if (anterior) copia[alumnoId] = anterior;
        else delete copia[alumnoId];
        return copia;
      });
      setError((e as Error).message);
    }
  }

  const marcados = inscriptos?.filter((i) => i.alumno && marcas[i.alumno.id]).length ?? 0;

  return (
    <Marco>
      <Encabezado
        titulo="Asistencia"
        bajada={`${clase.title ?? 'Clase'} · ${fecha(clase.date)} · ${grupo.name}`}
        volver={{ texto: grupo.name, alTocar: alVolver }}
      />

      {error && <div className="mb-4"><Aviso>{error}</Aviso></div>}
      {!inscriptos && !error && <Vacio>Buscando…</Vacio>}
      {inscriptos?.length === 0 && (
        <Vacio>No hay nadie inscripto activo en este grupo.</Vacio>
      )}

      {inscriptos && inscriptos.length > 0 && (
        <p className="mb-3 text-sm text-brand-taupe">
          {marcados} de {inscriptos.length} marcados
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {inscriptos?.map((i) => {
          if (!i.alumno) return null;
          const alumno = i.alumno;
          const actual = marcas[alumno.id];
          const cuenta = cuentas[alumno.id];
          const debe = (cuenta?.saldo ?? 0) > 0;
          return (
            <li key={i.id}>
              <Tarjeta>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="text-brand-cream">{alumno.full_name}</p>
                  <div className="shrink-0 text-right">
                    {debe ? (
                      <p className="text-red-300">debe {plata(cuenta.saldo)}</p>
                    ) : (
                      <p className="text-sm text-brand-taupe">al día</p>
                    )}
                    {cuenta?.pendiente > 0 && (
                      <p className="text-xs text-brand-sand">
                        declaró {plata(cuenta.pendiente)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {ESTADOS.map((e) => {
                    const elegido = actual === e;
                    return (
                      <button
                        key={e}
                        onClick={() => marcar(alumno.id, e)}
                        className={
                          'rounded-lg border px-3 py-1.5 text-sm ' +
                          (elegido
                            ? 'border-brand-sand bg-brand-sand text-brand-dark'
                            : 'border-white/15 text-brand-taupe hover:border-brand-sand/40')
                        }
                      >
                        {nombreAsistencia[e]}
                      </button>
                    );
                  })}
                </div>
              </Tarjeta>
            </li>
          );
        })}
      </ul>

      <Recap clase={clase} />
    </Marco>
  );
}

// ----------------------------------------------------------------------------
// El recap va acá y no en un formulario aparte porque es el mismo momento
// real: terminó la clase, marcás quién vino y anotás lo que diste. Un profesor
// no va a entrar dos veces.
//
// Y no se guarda en cada tecla, como sí hace la asistencia: un texto a medio
// escribir no es un dato, es un borrador. Por eso acá sí hay botón.
// ----------------------------------------------------------------------------
function Recap({ clase }: { clase: Clase }) {
  const [texto, setTexto] = useState(clase.recap ?? '');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setGuardado(false);
    setError(null);
    try {
      await guardarRecap(clase.id, texto);
      setGuardado(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setGuardando(false);
  }

  return (
    <div className="mt-8">
      <Campo
        etiqueta="Qué se vio en esta clase"
        ayuda="Es lo que tus alumnos van a leer después. Para muchos es el motivo por el que abren la app."
      >
        <Area
          value={texto}
          placeholder="Figuras vistas: paseo, sombrero, doble giro"
          onChange={(e) => { setTexto(e.target.value); setGuardado(false); }}
        />
      </Campo>

      {error && <div className="mt-2"><Aviso>{error}</Aviso></div>}

      <div className="mt-2 flex items-center gap-3">
        <Boton type="button" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar recap'}
        </Boton>
        {guardado && <span className="text-sm text-brand-sand">Guardado</span>}
      </div>
    </div>
  );
}
