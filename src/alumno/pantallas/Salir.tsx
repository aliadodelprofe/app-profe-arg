import { supabase } from '../../lib/supabase';

export default function Salir() {
  return (
    <button
      onClick={() => supabase.auth.signOut()}
      className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-brand-sand"
    >
      Salir
    </button>
  );
}
