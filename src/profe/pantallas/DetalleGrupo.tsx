import {
  traerInscripciones, traerClases,
  nombreFormato, nombreCobro, fecha, plata,
} from '../datos';
import type { Espacio, Grupo } from '../datos';
import { Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga } from '../ui';

export default function DetalleGrupo({
  espacio,
  grupo,
  alVolver,
}: {
  espacio: Espacio;
  grupo: Grupo;
  alVolver: () => void;
}) {
  const inscripciones = useCarga(() => traerInscripciones(grupo.id), [grupo.id]);
  const clases = useCarga(() => traerClases(grupo.id), [grupo.id]);

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

      <ul className="mb-8 flex flex-col gap-2">
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

      {/* ---------------------------------------------------------------
          Clases. El recap es el motivo principal por el que un alumno
          abre la app, así que se muestra acá y no escondido.
         --------------------------------------------------------------- */}
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-taupe">
        Clases
      </h2>

      {clases.error && <Aviso>{clases.error}</Aviso>}
      {!clases.datos && !clases.error && <Vacio>Buscando…</Vacio>}
      {clases.datos?.length === 0 && (
        <Vacio>Todavía no hay clases cargadas.</Vacio>
      )}

      <ul className="flex flex-col gap-2">
        {clases.datos?.map((c) => (
          <li key={c.id}>
            <Tarjeta>
              <div className="flex items-center justify-between gap-3">
                <p className="text-brand-cream">{c.title ?? 'Clase'}</p>
                <p className="shrink-0 text-sm text-brand-taupe">
                  {fecha(c.date)}
                  {c.start_time ? ` · ${c.start_time.slice(0, 5)}` : ''}
                </p>
              </div>
              {c.recap && (
                <p className="mt-1 text-sm text-brand-taupe">{c.recap}</p>
              )}
            </Tarjeta>
          </li>
        ))}
      </ul>
    </Marco>
  );
}
