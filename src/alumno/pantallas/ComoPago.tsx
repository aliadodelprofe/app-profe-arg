// ============================================================================
// Cómo pago, y cuánto me saldría de la otra forma.
//
// Los dos precios se muestran siempre, no solo el que le toca. Es información
// que el alumno necesita para decidir y que hoy, sin la app, solo tiene el
// profesor. Mostrarla no es generosidad: un alumno que sabe que la cuota le
// conviene se compromete al mes, que es lo que el profesor quiere.
// ============================================================================
import { useState } from 'react';
import { cambiarFormaDePago } from '../datos';
import type { MiArreglo } from '../datos';
import { fecha, plata, hoyISO } from '../formato';
import { Aviso, Tarjeta, Boton, Confirmacion } from '../../comun/ui';
import { compararFormas } from '../../comun/precios';

export default function ComoPago({
  arreglos,
  alCambiar,
}: {
  arreglos: MiArreglo[];
  alCambiar: () => void;
}) {
  // Un bloque por grupo: el alumno piensa "en esta clase pago así".
  const porGrupo = new Map<string, MiArreglo[]>();
  arreglos.forEach((a) => {
    if (!a.grupo) return;
    porGrupo.set(a.grupo.id, [...(porGrupo.get(a.grupo.id) ?? []), a]);
  });

  if (porGrupo.size === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-brand-taupe">
        Cómo pago
      </h2>
      <ul className="flex flex-col gap-2">
        {[...porGrupo.values()].map((lista) => (
          <li key={lista[0].grupo!.id}>
            <Grupo arreglos={lista} alCambiar={alCambiar} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Grupo({
  arreglos,
  alCambiar,
}: {
  arreglos: MiArreglo[];
  alCambiar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [preguntando, setPreguntando] = useState(false);
  const grupo = arreglos[0].grupo!;
  const hoy = hoyISO();

  const vigente = arreglos.find(
    (a) => (!a.start_date || a.start_date <= hoy) && (!a.end_date || a.end_date >= hoy),
  );
  const futuro = arreglos.find((a) => a.start_date && a.start_date > hoy);

  // Lo que va a regir el mes que viene, que es lo único que todavía se puede
  // cambiar.
  const modoQueViene = futuro?.billing_mode ?? vigente?.billing_mode;
  if (!modoQueViene || modoQueViene === 'one_time') return null;

  const otro = modoQueViene === 'per_session' ? 'per_period' : 'per_session';
  const precioOtro = otro === 'per_period' ? grupo.price_per_period : grupo.price_per_session;
  const porClase = grupo.price_per_session;
  const porMes = grupo.price_per_period;

  const nombre = (m: string) => (m === 'per_session' ? 'por clase' : 'por mes');
  const precioDe = (m: string) => (m === 'per_session' ? porClase : porMes);

  // La cuenta que decide. Se mide por año y no por mes a propósito: un mes no
  // tiene cuatro clases, tiene 4,33, y comparar contra cuatro le miente al
  // alumno un descuento más chico del que realmente le están dando.
  const comparacion = compararFormas(porClase, porMes);

  // El día 1 del mes que viene, que es lo que el cartel le promete. La
  // función en la base calcula el suyo por las suyas; si algún día dejan de
  // coincidir, el que manda es el de la base.
  const desde = new Date(Date.UTC(
    Number(hoy.slice(0, 4)),
    Number(hoy.slice(5, 7)), // mes 0-based + 1 = el que viene
    1,
  )).toISOString().slice(0, 10);

  async function cambiar() {
    setTrabajando(true);
    setError(null);
    try {
      await cambiarFormaDePago(grupo.id, otro as 'per_session' | 'per_period');
      setPreguntando(false);
      alCambiar();
    } catch (e) {
      setError((e as Error).message);
      setTrabajando(false);
      setPreguntando(false);
    }
  }

  return (
    <Tarjeta>
      <p className="text-brand-cream">{grupo.name}</p>

      {vigente && (
        <p className="text-sm text-brand-taupe">
          {futuro ? 'Este mes: ' : 'Pagás '}
          <span className="text-brand-sand">
            {plata(precioDe(vigente.billing_mode))} {nombre(vigente.billing_mode)}
          </span>
          {vigente.end_date && futuro && ` hasta el ${fecha(vigente.end_date)}`}
        </p>
      )}

      {futuro && futuro.start_date && (
        <p className="text-sm text-brand-taupe">
          Desde el {fecha(futuro.start_date)}:{' '}
          <span className="text-brand-sand">
            {plata(precioDe(futuro.billing_mode))} {nombre(futuro.billing_mode)}
          </span>
        </p>
      )}

      {/* Los dos precios, siempre. Es la información que le permite elegir.
          Se muestra cuánto sale CADA CLASE con la cuota: es el único número que
          se puede comparar con el precio por clase sin tener que pensar. */}
      {comparacion?.conviene && modoQueViene === 'per_session' && (
        <p className="mt-2 text-sm text-brand-taupe">
          Con la cuota cada clase te sale{' '}
          <span className="text-brand-sand">{plata(comparacion.porClaseConCuota)}</span> en vez
          de {plata(porClase)}. En el año son {plata(comparacion.anualConCuota)} en vez de{' '}
          {plata(comparacion.anualSuelto)}:{' '}
          <span className="text-brand-sand">te ahorrás {plata(comparacion.ahorroAnual)}</span>.
        </p>
      )}
      {comparacion?.conviene && modoQueViene === 'per_period' && (
        <p className="mt-2 text-sm text-brand-taupe">
          Cada clase te sale {plata(comparacion.porClaseConCuota)}. Viniendo suelto serían{' '}
          {plata(porClase)}.
        </p>
      )}

      {error && <div className="mt-2"><Aviso>{error}</Aviso></div>}

      {precioOtro !== null && (
        <div className="mt-3">
          <Boton type="button" onClick={() => setPreguntando(true)} disabled={trabajando}>
            {trabajando ? 'Cambiando…' : `Pasarme a pagar ${nombre(otro)}`}
          </Boton>
          <p className="mt-1 text-xs text-brand-taupe">
            Empieza a regir el 1 del mes que viene. Lo de este mes no cambia.
          </p>
        </div>
      )}

      {preguntando && (
        <Confirmacion
          titulo={`Pasar a pagar ${nombre(otro)}`}
          confirmar={`Sí, pagar ${nombre(otro)}`}
          trabajando={trabajando}
          alConfirmar={cambiar}
          alCancelar={() => setPreguntando(false)}
        >
          <p>
            En <span className="text-brand-cream">{grupo.name}</span> vas a pasar a pagar{' '}
            <span className="text-brand-sand">
              {plata(precioOtro)} {nombre(otro)}
            </span>{' '}
            desde el {fecha(desde)}.
          </p>
          <p className="mt-2">
            Lo que queda de este mes no cambia: seguís pagando{' '}
            {plata(precioDe(modoQueViene))} {nombre(modoQueViene)}.
          </p>
        </Confirmacion>
      )}
    </Tarjeta>
  );
}
