import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Marco, Aviso } from '../ui';

export default function Ingreso() {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: clave,
    });
    if (error) setError(error.message);
    setEntrando(false);
  }

  const input =
    'rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-brand-cream outline-none focus:border-brand-sand';

  return (
    <Marco>
      <div className="mx-auto max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold text-brand-cream">Entrar</h1>
        <p className="mb-6 text-sm text-brand-taupe">App del profesor</p>

        <form onSubmit={entrar} className="flex flex-col gap-3">
          <input
            type="email" required value={email} placeholder="Email"
            onChange={(e) => setEmail(e.target.value)} className={input}
          />
          <input
            type="password" required value={clave} placeholder="Contraseña"
            onChange={(e) => setClave(e.target.value)} className={input}
          />
          <button
            type="submit" disabled={entrando}
            className="rounded-lg bg-brand-sand px-3 py-2 font-medium text-brand-dark disabled:opacity-50"
          >
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        {error && <div className="mt-4"><Aviso>{error}</Aviso></div>}
      </div>
    </Marco>
  );
}
