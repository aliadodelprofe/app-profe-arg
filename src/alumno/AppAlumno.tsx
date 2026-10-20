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
import { invitacionesPendientes, misFichas, resumenDeMisEscuelas } from './datos';
import type { MiFicha, Invitacion, ResumenEscuela } from './datos';
import { Marco, Encabezado, Vacio, Aviso } from '../comun/ui';
import Entrar from './pantallas/Entrar';
import MiEscuela from './pantallas/MiEscuela';
import MisEscuelas from './pantallas/MisEscuelas';
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
  // El resumen de cada escuela: solo hace falta cuando hay más de una, así
  // que no se pide antes de saber cuántas hay.
  const [resumenes, setResumenes] = useState<ResumenEscuela[] | null>(null);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);

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

  useEffect(() => {
    if (!fichas || fichas.length < 2) return;
    let vivo = true;
    setResumenes(null);
    resumenDeMisEscuelas(fichas)
      .then((r) => { if (vivo) setResumenes(r); })
      .catch((e: Error) => { if (vivo) setErrorResumen(e.message); });
    return () => { vivo = false; };
  }, [fichas]);

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
          usando <span className="text-tinta">{correo}</span> — si te anotó con
          otro, con ese otro vas a tener que entrar.
        </Vacio>
      </Marco>
    );
  }

  if (fichas.length === 1) {
    return <MiEscuela ficha={fichas[0]} alCambiarPerfil={alResponder} />;
  }

  // Cursa con más de un profesor. El cambio de escuela vive en el menú del
  // perfil y no en un botón del encabezado: ahí le peleaba el lugar al de
  // salir, y con dos escuelas no había forma de cerrar sesión sin volver
  // atrás primero.
  const actual = fichas.find((f) => f.id === elegida);
  if (actual) {
    return (
      <MiEscuela
        ficha={actual}
        alCambiarPerfil={alResponder}
        alCambiarEscuela={() => setElegida(null)}
      />
    );
  }

  return (
    <MisEscuelas
      correo={correo}
      fichas={fichas}
      resumenes={resumenes}
      error={errorResumen}
      alElegir={setElegida}
      alCambiarPerfil={alResponder}
    />
  );
}
