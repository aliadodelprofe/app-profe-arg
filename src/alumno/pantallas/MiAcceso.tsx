// ============================================================================
// Cómo entro — el correo y la contraseña.
//
// Esto es del alumno, no del profesor. El profesor escribió un correo cuando
// lo anotó, pero esa persona puede cursar con varios profesores y su cuenta es
// una sola: el día que cambia de correo, lo cambia acá y le llega a todos.
//
// El correo NO se cambia escribiéndolo en la ficha. Se cambia en la cuenta:
// Supabase manda un enlace a la dirección nueva y no la cambia hasta que la
// persona lo abre. Esa vuelta no es burocracia — es lo que impide que alguien
// se ponga el correo de otro y se quede con sus invitaciones. Cuando vuelve a
// entrar, la app copia el correo verificado a sus fichas (migración 0030).
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { cambiarMiCorreo, cambiarMiClave } from '../datos';
import { Aviso, Seccion, Campo, Texto, Boton, BotonSecundario } from '../../comun/ui';

export default function MiAcceso({ correo }: { correo: string }) {
  return (
    <>
      <Seccion>Cómo entro</Seccion>
      <Correo actual={correo} />
      <div className="mt-6" />
      <Clave />
    </>
  );
}

function Correo({ actual }: { actual: string }) {
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (nuevo.trim().toLowerCase() === actual.toLowerCase()) {
      setError('Ese ya es tu correo.');
      return;
    }
    setTrabajando(true);
    setError(null);
    setAviso(null);
    try {
      await cambiarMiCorreo(nuevo);
      setAviso(
        `Te mandamos un correo a ${nuevo.trim()}. Abrilo y confirmá desde ahí. ` +
        'Hasta que lo hagas seguís entrando con el de siempre, y tus profes siguen ' +
        'viendo el viejo.',
      );
      setAbierto(false);
      setNuevo('');
    } catch (err) {
      setError((err as Error).message);
    }
    setTrabajando(false);
  }

  return (
    <div>
      <p className="text-sm text-tenue">Tu correo</p>
      <p className="mb-2 text-tinta">{actual}</p>

      {!abierto && (
        <BotonSecundario type="button" onClick={() => { setAbierto(true); setAviso(null); }}>
          Cambiar mi correo
        </BotonSecundario>
      )}

      {aviso && (
        <p className="mt-2 rounded-lg border border-acento/25 bg-acento-suave px-3 py-2 text-sm text-acento">
          {aviso}
        </p>
      )}

      {abierto && (
        <form onSubmit={enviar} className="mt-2 flex flex-col gap-3">
          <Campo
            etiqueta="Correo nuevo"
            ayuda="Te vamos a mandar un enlace ahí para confirmar que es tuyo."
          >
            <Texto
              type="email" required value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
            />
          </Campo>

          {error && <Aviso>{error}</Aviso>}

          <div className="flex gap-2">
            <Boton type="submit" disabled={trabajando}>
              {trabajando ? 'Mandando…' : 'Mandarme el enlace'}
            </Boton>
            <BotonSecundario
              type="button"
              onClick={() => { setAbierto(false); setError(null); setNuevo(''); }}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </form>
      )}
    </div>
  );
}

function Clave() {
  const [abierto, setAbierto] = useState(false);
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTrabajando(true);
    setError(null);
    try {
      await cambiarMiClave(clave);
      setListo(true);
      setAbierto(false);
      setClave('');
      setTimeout(() => setListo(false), 4000);
    } catch (err) {
      setError((err as Error).message);
    }
    setTrabajando(false);
  }

  return (
    <div>
      <p className="text-sm text-tenue">Tu contraseña</p>

      {!abierto && (
        <div className="mt-1">
          <BotonSecundario type="button" onClick={() => setAbierto(true)}>
            Cambiar mi contraseña
          </BotonSecundario>
        </div>
      )}

      {listo && <p className="mt-2 text-sm text-acento">Listo, ya quedó cambiada.</p>}

      {abierto && (
        <form onSubmit={enviar} className="mt-2 flex flex-col gap-3">
          {/* Si entró con Google nunca tuvo una. Poner una no le saca Google:
              después puede entrar por cualquiera de los dos caminos. */}
          <Campo
            etiqueta="Contraseña nueva"
            ayuda="Mínimo 6 caracteres. Si entrás con Google, ponerte una no te saca Google."
          >
            <Texto
              type="password" required minLength={6} value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </Campo>

          {error && <Aviso>{error}</Aviso>}

          <div className="flex gap-2">
            <Boton type="submit" disabled={trabajando}>
              {trabajando ? 'Guardando…' : 'Guardar'}
            </Boton>
            <BotonSecundario
              type="button"
              onClick={() => { setAbierto(false); setError(null); setClave(''); }}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </form>
      )}
    </div>
  );
}
