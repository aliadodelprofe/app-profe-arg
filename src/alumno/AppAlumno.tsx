// ============================================================================
// App del alumno — vive en /alumno
//
// Igual que la del profesor, arranca separada de la app vieja: entrando por
// /alumno el código de Firebase ni se descarga.
//
// Lo primero que hace después de entrar es mirar si alguien la anotó en un
// curso. No la engancha sola: le pregunta. Quedar anotada es aceptar que esa
// escuela le cobre, y eso no puede pasar en silencio porque coincidió un
// correo.
// ============================================================================
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { invitacionesPendientes, misFichas } from './datos';
import type { MiFicha, Invitacion } from './datos';
import { Marco, Encabezado, Vacio, Aviso, Tarjeta } from '../comun/ui';
import Entrar from './pantallas/Entrar';
import MiEscuela from './pantallas/MiEscuela';
import Invitaciones from './pantallas/Invitaciones';
import Salir from './pantallas/Salir';

export default function AppAlumno() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (cargando) return <Marco><Vacio>Cargando…</Vacio></Marco>;
  if (!sesion) return <Entrar />;
  return <Adentro key={sesion.user.id} sesion={sesion} />;
}

function Adentro({ sesion }: { sesion: Session }) {
  const [fichas, setFichas] = useState<MiFicha[] | null>(null);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    let vivo = true;
    Promise.all([invitacionesPendientes(), misFichas()])
      .then(([inv, f]) => {
        if (!vivo) return;
        setInvitaciones(inv);
        setFichas(f);
      })
      .catch((e: Error) => { if (vivo) setError(e.message); });
    return () => { vivo = false; };
  }, [vuelta]);

  const alResponder = () => setVuelta((v) => v + 1);

  const correo = sesion.user.email ?? '';

  if (error) {
    return (
      <Marco>
        <Encabezado titulo="Mis clases" bajada={correo} derecha={<Salir />} />
        <Aviso>{error}</Aviso>
      </Marco>
    );
  }

  if (!fichas) return <Marco><Vacio>Cargando…</Vacio></Marco>;

  // Las invitaciones van primero: hasta contestarlas no hay mucho más que
  // hacer, y son una decisión, no un aviso.
  if (invitaciones.length > 0) {
    return (
      <Marco>
        <Encabezado titulo="Mis clases" bajada={correo} derecha={<Salir />} />
        <Invitaciones invitaciones={invitaciones} alResponder={alResponder} />
        {fichas.length === 0 && (
          <Vacio>Cuando aceptes, acá abajo vas a ver tus clases y tu cuenta.</Vacio>
        )}
      </Marco>
    );
  }

  // Nadie lo anotó todavía, o lo anotaron con otro correo. La diferencia entre
  // esas dos cosas es invisible desde acá, así que la pantalla dice las dos.
  if (fichas.length === 0) {
    return (
      <Marco>
        <Encabezado titulo="Todavía no tenés clases" bajada={correo} derecha={<Salir />} />
        <Vacio>
          Ningún profesor te anotó todavía con este correo. Pedile que te anote
          usando <span className="text-brand-cream">{correo}</span> — si te anotó con
          otro, con ese otro vas a tener que entrar.
        </Vacio>
      </Marco>
    );
  }

  if (fichas.length === 1) {
    return <MiEscuela ficha={fichas[0]} />;
  }

  // Cursa con más de un profesor: elige de cuál quiere ver.
  const actual = fichas.find((f) => f.id === elegida);
  if (actual) {
    return (
      <MiEscuela
        ficha={actual}
        derecha={
          <button
            onClick={() => setElegida(null)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-brand-sand"
          >
            Cambiar
          </button>
        }
      />
    );
  }

  return (
    <Marco>
      <Encabezado titulo="Mis escuelas" bajada={correo} derecha={<Salir />} />
      <ul className="flex flex-col gap-2">
        {fichas.map((f) => (
          <li key={f.id}>
            <Tarjeta alTocar={() => setElegida(f.id)}>
              <p className="text-brand-cream">{f.escuela?.name ?? 'Escuela'}</p>
              <p className="text-sm text-brand-taupe">
                {f.escuela?.discipline ?? 'sin disciplina'}
              </p>
            </Tarjeta>
          </li>
        ))}
      </ul>
    </Marco>
  );
}
