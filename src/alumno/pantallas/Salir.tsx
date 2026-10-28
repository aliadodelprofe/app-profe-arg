import { supabase } from '../../lib/supabase';

export default function Salir() {
  return (
    <button
      onClick={() => supabase.auth.signOut()}
      className="inline-flex min-h-11 items-center rounded-xl bg-acento-suave px-4 py-2.5 text-sm font-medium text-acento transition hover:brightness-[0.97] active:scale-[0.97]"
    >
      Salir
    </button>
  );
}
