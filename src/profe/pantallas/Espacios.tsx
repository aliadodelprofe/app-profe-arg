import { supabase } from '../../lib/supabase';
import { traerEspacios } from '../datos';
import type { Espacio } from '../datos';
import { Marco, Encabezado, Aviso, Vacio, Tarjeta, useCarga } from '../ui';

export default function Espacios({
  email,
  alElegir,
}: {
  email: string;
  alElegir: (espacio: Espacio) => void;
}) {
  const { datos, error } = useCarga(traerEspacios, []);

  return (
    <Marco>
      <Encabezado
        titulo="Mis espacios"
        bajada={email}
        derecha={
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-brand-sand"
          >
            Salir
          </button>
        }
      />

      {error && <Aviso>{error}</Aviso>}
      {!datos && !error && <Vacio>Buscando…</Vacio>}
      {datos?.length === 0 && (
        <Vacio>Este usuario todavía no es miembro de ningún espacio.</Vacio>
      )}

      <ul className="flex flex-col gap-2">
        {datos?.map((e) => (
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
    </Marco>
  );
}
