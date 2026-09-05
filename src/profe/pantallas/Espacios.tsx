// ============================================================================
// Mis espacios
//
// Solo se ve cuando el profesor tiene más de uno, o todavía ninguno. Con uno
// solo, la app entra derecho a los grupos: no tiene sentido hacer elegir de
// una lista de uno.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { crearEspacio } from '../datos';
import type { Espacio } from '../datos';
import {
  Marco, Encabezado, Aviso, Vacio, Tarjeta,
  Campo, Texto, Boton, BotonSecundario,
} from '../ui';
import Salir from './Salir';

export default function Espacios({
  email,
  espacios,
  alCrear,
  alElegir,
}: {
  email: string;
  espacios: Espacio[];
  alCrear: () => void;
  alElegir: (espacio: Espacio) => void;
}) {
  const vacio = espacios.length === 0;
  const [creando, setCreando] = useState(vacio);

  return (
    <Marco>
      <Encabezado
        titulo={vacio ? 'Bienvenido' : 'Mis espacios'}
        bajada={email}
        derecha={<Salir />}
      />

      {vacio && (
        <div className="mb-4">
          <Vacio>
            Todavía no tenés un espacio. Un espacio es tu proyecto: adentro van
            tus grupos, tus alumnos y tus cobros.
          </Vacio>
        </div>
      )}

      <ul className="mb-4 flex flex-col gap-2">
        {espacios.map((e) => (
          <li key={e.id}>
            <Tarjeta alTocar={() => alElegir(e)}>
              <p className="text-brand-cream">{e.name}</p>
              <p className="text-sm text-brand-taupe">
                {e.discipline ?? 'sin disciplina'} · plan {e.plan}
              </p>
            </Tarjeta>
          </li>
        ))}
      </ul>

      {creando ? (
        <FormularioEspacio
          alCerrar={() => setCreando(false)}
          alCrear={() => { setCreando(false); alCrear(); }}
        />
      ) : (
        <BotonSecundario onClick={() => setCreando(true)}>+ Nuevo espacio</BotonSecundario>
      )}
    </Marco>
  );
}

function FormularioEspacio({
  alCerrar,
  alCrear,
}: {
  alCerrar: () => void;
  alCrear: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await crearEspacio(nombre.trim(), disciplina.trim() || null);
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
      <p className="text-brand-cream">Nuevo espacio</p>

      <Campo etiqueta="Nombre" ayuda="Como le decís a tu proyecto. No es la sala donde das clase.">
        <Texto required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>

      <Campo etiqueta="Disciplina (opcional)">
        <Texto value={disciplina} placeholder="bachata" onChange={(e) => setDisciplina(e.target.value)} />
      </Campo>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear espacio'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
