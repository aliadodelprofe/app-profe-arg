import { supabase } from '../../lib/supabase';

export default function Salir() {
  return (
    <button
      onClick={() => supabase.auth.signOut()}
      className="rounded-lg border border-linea px-3 py-1.5 text-sm text-acento"
    >
      Salir
    </button>
  );
}
