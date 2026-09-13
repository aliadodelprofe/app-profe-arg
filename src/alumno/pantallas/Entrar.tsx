// ============================================================================
// Entrar o crear cuenta — lado del alumno.
//
// El correo importa más que en cualquier otra pantalla: es lo que enlaza al
// alumno con la ficha que su profe ya cargó. Si se registra con otro correo
// va a entrar a una app vacía, así que la pantalla se lo dice antes y no
// después.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Marco, Aviso, Campo, Texto, Boton } from '../../comun/ui';

export default function Entrar() {
  const [creando, setCreando] = useState(false);
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTrabajando(true);
    setError(null);
    setAviso(null);

    if (creando) {
      const { error } = await supabase.auth.signUp({ email, password: clave });
      if (error) setError(error.message);
      else {
        setAviso(
          'Te mandamos un correo para confirmar tu cuenta. Abrilo, confirmá, y volvé ' +
          'a entrar acá. Sin ese paso no podemos saber que ese correo es tuyo.',
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: clave });
      if (error) setError(error.message);
    }
    setTrabajando(false);
  }

  return (
    <Marco>
      <div className="mx-auto max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold text-brand-cream">
          {creando ? 'Crear mi cuenta' : 'Entrar'}
        </h1>
        <p className="mb-6 text-sm text-brand-taupe">Mis clases y mi cuenta</p>

        <form onSubmit={enviar} className="flex flex-col gap-3">
          <Campo
            etiqueta="Correo"
            ayuda={creando ? 'Usá el mismo correo que le diste a tu profe.' : undefined}
          >
            <Texto
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Campo>

          <Campo etiqueta="Contraseña" ayuda={creando ? 'Mínimo 6 caracteres.' : undefined}>
            <Texto
              type="password" required minLength={6} value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </Campo>

          <Boton type="submit" disabled={trabajando}>
            {trabajando ? 'Un segundo…' : creando ? 'Crear cuenta' : 'Entrar'}
          </Boton>
        </form>

        {error && <div className="mt-4"><Aviso>{error}</Aviso></div>}

        {aviso && (
          <p className="mt-4 rounded-lg border border-brand-sand/30 bg-brand-sand/5 px-3 py-2 text-sm text-brand-sand">
            {aviso}
          </p>
        )}

        <button
          onClick={() => { setCreando(!creando); setError(null); setAviso(null); }}
          className="mt-6 text-sm text-brand-taupe underline hover:text-brand-sand"
        >
          {creando ? 'Ya tengo cuenta, quiero entrar' : 'Es mi primera vez, quiero crear mi cuenta'}
        </button>
      </div>
    </Marco>
  );
}
