// ============================================================================
// Entrar o crear cuenta — lado del alumno.
//
// El correo importa más que en cualquier otra pantalla: es lo que enlaza al
// alumno con la ficha que su profe ya cargó. Si se registra con otro correo
// va a entrar a una app vacía, así que la pantalla se lo dice antes y no
// después.
//
// GOOGLE VA PRIMERO, y no por moda. Con correo y contraseña el alumno tiene que
// inventar una contraseña, salir de la app, abrir el mail, confirmar y volver.
// Cada uno de esos pasos pierde gente, y el que se cae ahí nunca llega a ver
// las clases que su profe ya le cargó. Con Google son dos toques y el correo
// viene verificado de fábrica.
//
// La advertencia del correo va en los dos caminos. Con Google es incluso más
// fácil equivocarse: el alumno aprieta sin mirar con qué cuenta está entrando,
// y si su Google es otro correo que el que le dio al profe, entra a una app
// vacía sin entender por qué.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Marco, Aviso, Campo, Texto, Boton, Marca } from '../../comun/ui';

export default function Entrar() {
  const [creando, setCreando] = useState(false);
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  // Supabase se lleva al alumno a Google y lo devuelve a esta misma dirección.
  // `redirectTo` tiene que estar habilitada en Authentication → URL
  // Configuration, si no Supabase lo devuelve al Site URL y puede caer en la
  // app vieja de la comunidad, que vive en la raíz.
  async function conGoogle() {
    setTrabajando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/alumno` },
    });
    // Si salió bien, el navegador ya se fue a Google y esto no se ejecuta.
    if (error) {
      setError(error.message);
      setTrabajando(false);
    }
  }

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
        <Marca />
        <h1 className="mb-1 text-2xl font-semibold text-tinta">
          {creando ? 'Crear mi cuenta' : 'Entrar'}
        </h1>
        <p className="mb-6 text-sm text-tenue">Mis clases y mi cuenta</p>

        {/* El camino corto, arriba. Sin el logo de Google a propósito: es una
            marca ajena y no la vamos a dibujar nosotros. */}
        <button
          type="button"
          onClick={conGoogle}
          disabled={trabajando}
          className="w-full rounded-lg border border-acento/40 px-3 py-2.5 font-medium text-tinta hover:border-acento disabled:opacity-50"
        >
          {trabajando ? 'Un segundo…' : 'Entrar con Google'}
        </button>
        <p className="mt-2 text-xs text-tenue">
          Entrá con la cuenta de Google que tenga el mismo correo que le diste a tu profe.
        </p>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-panel" />
          <span className="text-xs uppercase tracking-wide text-tenue">o con tu correo</span>
          <div className="h-px flex-1 bg-panel" />
        </div>

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
          <p className="mt-4 rounded-lg border border-acento/30 bg-acento/5 px-3 py-2 text-sm text-acento">
            {aviso}
          </p>
        )}

        <button
          onClick={() => { setCreando(!creando); setError(null); setAviso(null); }}
          className="mt-6 text-sm text-tenue underline hover:text-acento"
        >
          {creando ? 'Ya tengo cuenta, quiero entrar' : 'Es mi primera vez, quiero crear mi cuenta'}
        </button>
      </div>
    </Marco>
  );
}
