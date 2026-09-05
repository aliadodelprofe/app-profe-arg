import { useState } from 'react';
import type { FormEvent } from 'react';
import { traerGrupos, crearGrupo, nombreFormato, fecha } from '../datos';
import type { Espacio, Grupo, Formato } from '../datos';
import {
  Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga,
  Campo, Texto, Opciones, Boton, BotonSecundario,
} from '../ui';

export default function Grupos({
  espacio,
  alVolver,
  alElegir,
  alVerDeudas,
  alVerPagos,
}: {
  espacio: Espacio;
  alVolver: () => void;
  alElegir: (grupo: Grupo) => void;
  alVerDeudas: () => void;
  alVerPagos: () => void;
}) {
  const { datos, error, recargar } = useCarga(() => traerGrupos(espacio.id), [espacio.id]);
  const [creando, setCreando] = useState(false);

  return (
    <Marco>
      <Encabezado
        titulo="Mis grupos"
        bajada={espacio.name}
        volver={{ texto: 'Mis espacios', alTocar: alVolver }}
      />

      <div className="mb-5 flex flex-col gap-2">
        <button
          onClick={alVerDeudas}
          className="w-full rounded-xl border border-brand-sand/30 bg-brand-sand/5 px-4 py-3 text-left hover:border-brand-sand/60"
        >
          <p className="text-brand-sand">Quién me debe →</p>
          <p className="text-sm text-brand-taupe">Estado de cuenta de todo el espacio</p>
        </button>
        <button
          onClick={alVerPagos}
          className="w-full rounded-xl border border-brand-sand/30 bg-brand-sand/5 px-4 py-3 text-left hover:border-brand-sand/60"
        >
          <p className="text-brand-sand">Pagos por confirmar →</p>
          <p className="text-sm text-brand-taupe">Transferencias que declararon tus alumnos</p>
        </button>
      </div>

      {creando ? (
        <FormularioGrupo
          espacioId={espacio.id}
          alCerrar={() => setCreando(false)}
          alCrear={() => { setCreando(false); recargar(); }}
        />
      ) : (
        <BotonSecundario onClick={() => setCreando(true)}>+ Nuevo grupo</BotonSecundario>
      )}

      <div className="mt-5">
        {error && <Aviso>{error}</Aviso>}
        {!datos && !error && <Vacio>Buscando…</Vacio>}
        {datos?.length === 0 && <Vacio>Todavía no hay grupos en este espacio.</Vacio>}

        <ul className="flex flex-col gap-2">
          {datos?.map((g) => (
            <li key={g.id}>
              <Tarjeta alTocar={() => alElegir(g)}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-brand-cream">{g.name}</p>
                  <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-xs text-brand-taupe">
                    {nombreFormato[g.format]}
                  </span>
                </div>
                <p className="text-sm text-brand-taupe">
                  {[
                    g.level,
                    g.capacity ? `cupo ${g.capacity}` : null,
                    g.start_date ? `desde ${fecha(g.start_date)}` : null,
                    g.end_date ? `hasta ${fecha(g.end_date)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'sin datos adicionales'}
                </p>
              </Tarjeta>
            </li>
          ))}
        </ul>
      </div>
    </Marco>
  );
}

// ----------------------------------------------------------------------------
// Alta de grupo
//
// El formato no es una etiqueta: cambia el formulario. Un grupo regular no
// tiene fecha de fin —es abierto, la gente entra y sale— así que el campo ni
// aparece. Pedirle una fecha de fin a algo que no termina es la clase de
// dato basura que después ensucia todo.
// ----------------------------------------------------------------------------
function FormularioGrupo({
  espacioId,
  alCerrar,
  alCrear,
}: {
  espacioId: string;
  alCerrar: () => void;
  alCrear: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [formato, setFormato] = useState<Formato>('regular');
  const [nivel, setNivel] = useState('');
  const [cupo, setCupo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await crearGrupo(espacioId, {
        name: nombre.trim(),
        format: formato,
        level: nivel.trim() || null,
        capacity: cupo ? Number(cupo) : null,
        start_date: desde || null,
        end_date: formato === 'cycle' && hasta ? hasta : null,
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
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <p className="text-brand-cream">Nuevo grupo</p>

      <Campo etiqueta="Nombre">
        <Texto
          required value={nombre} placeholder="Bachata principiantes, martes"
          onChange={(e) => setNombre(e.target.value)}
        />
      </Campo>

      <Campo
        etiqueta="Formato"
        ayuda={
          formato === 'regular'
            ? 'Recurrente y abierta: la gente entra y sale. No tiene fin.'
            : formato === 'cycle'
              ? 'Grupo cerrado con contenidos que progresan. Un workshop es un ciclo de una sola clase.'
              : 'Uno a uno, agendada.'
        }
      >
        <Opciones<Formato>
          valor={formato}
          alElegir={setFormato}
          opciones={[
            { valor: 'regular', texto: 'Regular' },
            { valor: 'cycle', texto: 'Formación' },
            { valor: 'private', texto: 'Particular' },
          ]}
        />
      </Campo>

      <Campo etiqueta="Nivel (opcional)">
        <Texto value={nivel} placeholder="Principiante" onChange={(e) => setNivel(e.target.value)} />
      </Campo>

      <Campo etiqueta="Cupo (opcional)">
        <Texto type="number" min="1" value={cupo} onChange={(e) => setCupo(e.target.value)} />
      </Campo>

      <Campo etiqueta="Empieza (opcional)">
        <Texto type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
      </Campo>

      {formato === 'cycle' && (
        <Campo etiqueta="Termina">
          <Texto type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </Campo>
      )}

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear grupo'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
