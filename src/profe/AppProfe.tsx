// ============================================================================
// App del profesor — vive en /profe
//
// Arranca separada de la app vieja a propósito: entrando por /profe, el
// código de Firebase ni siquiera se descarga, así que no hay forma de tocar
// la base de producción de la comunidad desde acá.
//
// Por ahora hace lo mínimo que prueba que toda la cadena funciona:
// entrar con usuario y contraseña, y leer de la base respetando el candado.
// ============================================================================
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Espacio = {
  id: string;
  name: string;
  discipline: string | null;
  plan: string;
};

export default function AppProfe() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // ¿Hay alguien ya logueado? Supabase guarda la sesión en el navegador.
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });

    // Y avisá cada vez que alguien entra o sale.
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (cargando) return <Marco><p className="text-brand-sand">Cargando…</p></Marco>;
  if (!sesion)  return <Ingreso />;
  return <Escritorio sesion={sesion} />;
}

// ----------------------------------------------------------------------------
// Pantalla de ingreso
// ----------------------------------------------------------------------------
function Ingreso() {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: clave });
    if (error) setError(error.message);
    setEntrando(false);
  }

  return (
    <Marco>
      <h1 className="text-2xl font-semibold text-brand-cream mb-1">Entrar</h1>
      <p className="text-sm text-brand-taupe mb-6">App del profesor</p>

      <form onSubmit={entrar} className="flex flex-col gap-3">
        <input
          type="email" required value={email} placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-brand-cream outline-none focus:border-brand-sand"
        />
        <input
          type="password" required value={clave} placeholder="Contraseña"
          onChange={(e) => setClave(e.target.value)}
          className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-brand-cream outline-none focus:border-brand-sand"
        />
        <button
          type="submit" disabled={entrando}
          className="rounded-lg bg-brand-sand px-3 py-2 font-medium text-brand-dark disabled:opacity-50"
        >
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </Marco>
  );
}

// ----------------------------------------------------------------------------
// Escritorio — por ahora solo lista los espacios del profesor logueado
//
// Esta consulta no lleva ningún filtro por profesor. No hace falta: la regla
// de la migración 0001 hace que la base devuelva únicamente los espacios de
// quien pregunta. Si algún día devolviera de más, el problema está en la
// base, no acá.
// ----------------------------------------------------------------------------
function Escritorio({ sesion }: { sesion: Session }) {
  const [espacios, setEspacios] = useState<Espacio[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('tenants')
      .select('id, name, discipline, plan')
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setEspacios(data as Espacio[]);
      });
  }, []);

  return (
    <Marco>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-brand-cream">Mis espacios</h1>
          <p className="text-sm text-brand-taupe">{sesion.user.email}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-brand-sand"
        >
          Salir
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {!espacios && !error && <p className="text-brand-taupe">Buscando…</p>}

      {espacios?.length === 0 && (
        <p className="text-brand-taupe">
          Este usuario no es miembro de ningún espacio todavía.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {espacios?.map((e) => (
          <li key={e.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-brand-cream">{e.name}</p>
            <p className="text-sm text-brand-taupe">
              {e.discipline ?? 'sin disciplina'} · plan {e.plan}
            </p>
          </li>
        ))}
      </ul>
    </Marco>
  );
}

// ----------------------------------------------------------------------------
function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-dark px-5 py-10">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
