// ============================================================================
// Tomar asistencia — la primera pantalla que escribe en la base.
//
// Cada toque guarda al instante, sin botón de "guardar". Es a propósito: esto
// se usa parado en el medio de una sala, con el celular en una mano. Un
// formulario que hay que confirmar es un formulario que se pierde.
// ============================================================================
import { useEffect, useState } from 'react';
import {
  traerInscripciones, traerAsistencias, marcarAsistencia, nombreAsistencia, fecha,
} from '../datos';
import type { Espacio, Grupo, Clase, Inscripcion, Asistencia as TipoAsistencia, EstadoAsistencia } from '../datos';
import { Marco, Encabezado, Aviso, Vacio, Tarjeta } from '../ui';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setError(null);
    Promise.all([traerInscripciones(grupo.id), traerAsistencias(clase.id)])
      .then(([ins, asis]: [Inscripcion[], TipoAsistencia[]]) => {
        if (!vivo) return;
        setInscriptos(ins.filter((i) => i.status === 'active'));
        const previas: Record<string, EstadoAsistencia> = {};
        asis.forEach((a) => { previas[a.student_id] = a.status; });
        setMarcas(previas);
      })
      .catch((e: Error) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, [grupo.id, clase.id]);

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
          return (
            <li key={i.id}>
              <Tarjeta>
                <p className="mb-2 text-brand-cream">{alumno.full_name}</p>
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
    </Marco>
  );
}
