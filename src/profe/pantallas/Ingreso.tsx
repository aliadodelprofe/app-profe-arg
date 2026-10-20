// ============================================================================
// Entrar o crear cuenta — lado del profesor.
//
// Hasta ahora esta pantalla solo sabía entrar: para tener una cuenta de
// profesor había que crearla a mano en Supabase. Eso alcanzaba mientras el
// único profesor era el que escribía la app, y dejó de alcanzar en el momento
// en que hubo que mostrársela a otro.
//
// Crear la cuenta no crea la escuela. Son dos cosas distintas y conviene que
// se sientan distintas: la cuenta sos vos, el espacio es tu proyecto. Después
// de confirmar el correo, la app pide el nombre del espacio y recién ahí
// empieza a existir una escuela.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Marco, Aviso, Campo, Texto, Boton, Marca } from '../../comun/ui';

export default function Ingreso() {
  const [creando, setCreando] = useState(false);
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  // Supabase devuelve a esta misma dirección. `redirectTo` tiene que estar
  // habilitada en Authentication → URL Configuration; si no, Supabase lo
  // devuelve al Site URL y puede caer en la app vieja de la comunidad, que
  // vive en la raíz.
  async function conGoogle() {
    setTrabajando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/profe` },
    });
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
          'a entrar acá. Cuando entres, lo primero que vas a hacer es crear tu espacio.',
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
        <p className="mb-6 text-sm text-tenue">App del profesor</p>

        {/* Sin el logo de Google a propósito: es una marca ajena y no la vamos
            a dibujar nosotros. */}
        <button
          type="button"
          onClick={conGoogle}
          disabled={trabajando}
          className="w-full rounded-lg border border-acento/40 px-3 py-2.5 font-medium text-tinta hover:border-acento disabled:opacity-50"
        >
          {trabajando ? 'Un segundo…' : 'Entrar con Google'}
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-panel" />
          <span className="text-xs uppercase tracking-wide text-tenue">o con tu correo</span>
          <div className="h-px flex-1 bg-panel" />
        </div>

        <form onSubmit={enviar} className="flex flex-col gap-3">
          <Campo etiqueta="Correo">
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

        {/* La misma cuenta sirve para los dos lados. Decirlo acá evita que
            alguien que ya es alumno se cree un segundo usuario con otro
            correo para poder dar clases. */}
        <p className="mt-6 border-t border-linea pt-4 text-xs text-tenue">
          ¿Venís a ver tus clases como alumno?{' '}
          <a href="/alumno" className="text-acento underline">Entrá por acá</a>. Es la
          misma cuenta: si das clases y además tomás, no necesitás dos correos.
        </p>
      </div>
    </Marco>
  );
}
