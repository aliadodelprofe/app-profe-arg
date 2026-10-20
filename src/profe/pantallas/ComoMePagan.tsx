// ============================================================================
// Cómo te transfieren — los datos que el alumno necesita para pagarte.
//
// Esto no es una preferencia: sin esto, la app le pide al alumno que avise que
// transfirió sin decirle adónde, y el alias sigue viajando por WhatsApp. Por
// eso cuando no hay ninguno cargado la sección aparece arriba de todo y lo
// dice; una vez cargado se va abajo y se calla, porque es algo que se toca una
// vez por año.
//
// Archivar y no borrar: un medio viejo explica transferencias viejas.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { crearMedioDePago, editarMedioDePago, archivarMedioDePago } from '../datos';
import type { Espacio, MedioDePago } from '../datos';
import {
  Aviso, Seccion, Lista, Fila, Hoja, Boton, BotonSecundario, Campo, Texto, Area,
} from '../../comun/ui';

export default function ComoMePagan({
  espacio,
  medios,
  destacado = false,
  alCambiar,
}: {
  espacio: Espacio;
  medios: MedioDePago[];
  destacado?: boolean;
  alCambiar: () => void;
}) {
  const [hoja, setHoja] = useState<null | MedioDePago | 'nuevo'>(null);

  return (
    <>
      <Seccion>Cómo te transfieren</Seccion>

      {destacado ? (
        <div className="rounded-xl border border-acento/30 bg-acento/5 px-4 py-3">
          <p className="text-sm text-tinta">
            Tus alumnos no saben adónde transferirte.
          </p>
          <p className="mt-1 text-sm text-tenue">
            Cargá tu alias o CBU una vez y les va a aparecer en su app, justo arriba del
            botón con el que te avisan que pagaron.
          </p>
          <div className="mt-3">
            <Boton onClick={() => setHoja('nuevo')}>Cargar mis datos</Boton>
          </div>
        </div>
      ) : (
        <>
          <Lista>
            {medios.map((m) => (
              <Fila
                key={m.id}
                titulo={m.alias ?? m.cbu ?? 'Sin destino'}
                detalle={[m.holder, m.bank].filter(Boolean).join(' · ')}
                alTocar={() => setHoja(m)}
              />
            ))}
          </Lista>
          <div className="mt-3">
            <BotonSecundario type="button" onClick={() => setHoja('nuevo')}>
              Agregar otra cuenta
            </BotonSecundario>
          </div>
        </>
      )}

      {hoja && (
        <Hoja
          titulo={hoja === 'nuevo' ? 'Dónde te transfieren' : 'Corregir los datos'}
          alCerrar={() => setHoja(null)}
        >
          <Formulario
            espacio={espacio}
            medio={hoja === 'nuevo' ? null : hoja}
            alCerrar={() => setHoja(null)}
            alGuardar={() => { setHoja(null); alCambiar(); }}
          />
        </Hoja>
      )}
    </>
  );
}

function Formulario({
  espacio,
  medio,
  alCerrar,
  alGuardar,
}: {
  espacio: Espacio;
  medio: MedioDePago | null;
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const [holder, setHolder] = useState(medio?.holder ?? '');
  const [alias, setAlias] = useState(medio?.alias ?? '');
  const [cbu, setCbu] = useState(medio?.cbu ?? '');
  const [bank, setBank] = useState(medio?.bank ?? '');
  const [note, setNote] = useState(medio?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [archivando, setArchivando] = useState(false);

  const limpio = (v: string) => (v.trim() === '' ? null : v.trim());

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!alias.trim() && !cbu.trim()) {
      setError('Poné al menos el alias o el CBU: es lo que el alumno va a copiar.');
      return;
    }
    // La base también lo rechaza (migración 0025). Acá se avisa antes y se
    // dice cuántos dígitos tiene, que es lo que el profe necesita para darse
    // cuenta de que se le cortó al copiar.
    if (cbu && cbu.length !== 22) {
      setError(
        `Un CBU o CVU tiene 22 dígitos y ese tiene ${cbu.length}. ` +
        'Fijate si se te cortó al copiarlo.',
      );
      return;
    }
    setGuardando(true);
    setError(null);
    const datos = {
      holder: holder.trim(),
      alias: limpio(alias),
      cbu: limpio(cbu),
      bank: limpio(bank),
      note: limpio(note),
    };
    try {
      if (medio) await editarMedioDePago(medio.id, datos);
      else await crearMedioDePago(espacio.id, datos);
      alGuardar();
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  async function archivar() {
    if (!medio) return;
    setArchivando(true);
    setError(null);
    try {
      await archivarMedioDePago(medio.id);
      alGuardar();
    } catch (err) {
      setError((err as Error).message);
      setArchivando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <p className="text-sm text-tenue">
        Esto lo ven tus alumnos y nadie más. Un CBU no sirve para sacar plata de una
        cuenta, solo para ponerla.
      </p>

      <Campo
        etiqueta="A nombre de"
        ayuda="El titular de la cuenta. Si no coincide con el alias, el alumno frena y pregunta."
      >
        <Texto
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          placeholder="Tomás Elmore"
          required
        />
      </Campo>

      <Campo etiqueta="Alias">
        <Texto
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="mi.alias.mp"
        />
      </Campo>

      <Campo
        etiqueta="CBU o CVU"
        ayuda={
          cbu
            ? `${cbu.length} de 22 dígitos. El CVU es el de las billeteras, tipo Mercado Pago.`
            : 'Opcional: con el alias alcanza. El CVU es el de las billeteras, tipo Mercado Pago.'
        }
      >
        <Texto
          value={cbu}
          /* Se le sacan los espacios y guiones al vuelo: los bancos lo
             muestran separado para leerlo, y nadie debería tener que
             limpiarlo a mano después de copiarlo. */
          onChange={(e) => setCbu(e.target.value.replace(/[^0-9]/g, '').slice(0, 22))}
          inputMode="numeric"
          placeholder="0000003100000000000000"
        />
      </Campo>

      <Campo etiqueta="Banco o billetera" ayuda="Opcional.">
        <Texto
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          placeholder="Mercado Pago"
        />
      </Campo>

      <Campo
        etiqueta="Una aclaración para el alumno"
        ayuda='Opcional. Por ejemplo: "poné tu nombre en el concepto".'
      >
        <Area value={note} onChange={(e) => setNote(e.target.value)} />
      </Campo>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex flex-wrap gap-2">
        <Boton type="submit" disabled={guardando || archivando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>
          Cancelar
        </BotonSecundario>
        {medio && (
          <BotonSecundario type="button" onClick={archivar} disabled={guardando || archivando}>
            {archivando ? 'Archivando…' : 'Dejar de usar esta cuenta'}
          </BotonSecundario>
        )}
      </div>
    </form>
  );
}
