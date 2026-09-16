// ============================================================================
// Las invitaciones que esperan una respuesta.
//
// Van arriba de todo y antes que cualquier otra cosa, porque hasta que no se
// contesten el alumno no tiene nada más que hacer en la app — y porque aceptar
// es aceptar que le cobren.
//
// Se muestra con qué nombre lo anotaron, no solo de qué escuela: "te anotaron
// como Ana Pérez" es lo que le permite darse cuenta de que la invitación es
// para otra Ana.
// ============================================================================
import { useState } from 'react';
import { aceptarInvitacion, rechazarInvitacion } from '../datos';
import type { Invitacion, FormaDePago } from '../datos';
import { fecha, plata } from '../formato';
import { Aviso, Tarjeta, Boton, BotonSecundario } from '../../comun/ui';

// Una forma de pago, dicha en castellano.
//
// La frase se arma acá y no en la base a propósito: componer castellano en SQL
// termina siendo imposible de corregir sin una migración.
function comoTeCobran(f: FormaDePago): string {
  const precio = f.precio === null ? 'a precio sin definir' : plata(f.precio);

  if (f.modo === 'one_time') return `Un pago único de ${precio}`;

  if (f.modo === 'per_session') {
    const base = `${precio} por clase`;
    return f.hasta ? `${base}, hasta el ${fecha(f.hasta)}` : base;
  }

  const base = `Cuota mensual de ${precio}`;
  return f.desde ? `${base}, desde el ${fecha(f.desde)}` : base;
}

export default function Invitaciones({
  invitaciones,
  alResponder,
}: {
  invitaciones: Invitacion[];
  alResponder: () => void;
}) {
  return (
    <div className="mb-8">
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-taupe">
        {invitaciones.length === 1 ? 'Te anotaron en un curso' : 'Te anotaron en unos cursos'}
      </h2>
      <ul className="flex flex-col gap-2">
        {invitaciones.map((i) => (
          <li key={i.student_id}>
            <Fila invitacion={i} alResponder={alResponder} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fila({
  invitacion,
  alResponder,
}: {
  invitacion: Invitacion;
  alResponder: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function responder(accion: () => Promise<void>) {
    setTrabajando(true);
    setError(null);
    try {
      await accion();
      alResponder();
    } catch (e) {
      setError((e as Error).message);
      setTrabajando(false);
    }
  }

  return (
    <Tarjeta>
      <p className="text-brand-cream">{invitacion.escuela}</p>
      <p className="text-sm text-brand-taupe">
        Te anotaron como <span className="text-brand-cream">{invitacion.anotado_como}</span> en{' '}
        {invitacion.grupos}.
      </p>

      {/* Cómo le van a cobrar, antes de aceptar. Aceptar es aceptar que te
          cobren: que no diga cuánto ni cómo es pedirle a alguien que firme
          sin leer. */}
      {invitacion.formas_de_pago.length > 0 && (
        <ul className="mt-2 flex flex-col gap-0.5">
          {invitacion.formas_de_pago.map((f, i) => (
            <li key={i} className="text-sm text-brand-sand">
              {comoTeCobran(f)}
              {f.grupo && invitacion.formas_de_pago.length > 1 && (
                <span className="text-brand-taupe"> · {f.grupo}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-brand-taupe">
        Si aceptás vas a ver tus clases y tu estado de cuenta, y esta escuela va a poder
        cobrarte por las clases que tomes. Después podés pedirle a tu profe que te cambie
        la forma de pago.
      </p>

      {error && <div className="mt-2"><Aviso>{error}</Aviso></div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Boton
          type="button" disabled={trabajando}
          onClick={() => responder(() => aceptarInvitacion(invitacion.student_id))}
        >
          Sí, soy yo
        </Boton>
        <BotonSecundario
          type="button" disabled={trabajando}
          onClick={() => responder(() => rechazarInvitacion(invitacion.student_id))}
        >
          No soy yo
        </BotonSecundario>
      </div>
    </Tarjeta>
  );
}
