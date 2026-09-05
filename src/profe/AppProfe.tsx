// ============================================================================
// App del profesor — vive en /profe
//
// Arranca separada de la app vieja a propósito: entrando por /profe, el
// código de Firebase ni siquiera se descarga, así que no hay forma de tocar
// la base de producción de la comunidad desde acá.
//
// La navegación es a mano, sin librería de rutas: son pocas pantallas y una
// sola línea de profundidad. Si algún día son muchas, se cambia; hoy sería
// una dependencia de más.
// ============================================================================
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Espacio, Grupo, Clase } from './datos';
import { Marco, Vacio } from './ui';
import Ingreso from './pantallas/Ingreso';
import Espacios from './pantallas/Espacios';
import Grupos from './pantallas/Grupos';
import DetalleGrupo from './pantallas/DetalleGrupo';
import Asistencia from './pantallas/Asistencia';
import Deudas from './pantallas/Deudas';

type Vista =
  | { pantalla: 'espacios' }
  | { pantalla: 'grupos'; espacio: Espacio }
  | { pantalla: 'grupo'; espacio: Espacio; grupo: Grupo }
  | { pantalla: 'asistencia'; espacio: Espacio; grupo: Grupo; clase: Clase }
  | { pantalla: 'deudas'; espacio: Espacio };

export default function AppProfe() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<Vista>({ pantalla: 'espacios' });

  useEffect(() => {
    // ¿Hay alguien ya logueado? Supabase guarda la sesión en el navegador.
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });

    // Y avisá cada vez que alguien entra o sale.
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSesion(s);
      // Al cambiar de usuario se vuelve al principio: nunca hay que quedar
      // parado en la pantalla de un espacio que ya no es tuyo.
      setVista({ pantalla: 'espacios' });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (cargando) return <Marco><Vacio>Cargando…</Vacio></Marco>;
  if (!sesion) return <Ingreso />;

  if (vista.pantalla === 'espacios') {
    return (
      <Espacios
        email={sesion.user.email ?? ''}
        alElegir={(espacio) => setVista({ pantalla: 'grupos', espacio })}
      />
    );
  }

  if (vista.pantalla === 'grupos') {
    return (
      <Grupos
        espacio={vista.espacio}
        alVolver={() => setVista({ pantalla: 'espacios' })}
        alElegir={(grupo) =>
          setVista({ pantalla: 'grupo', espacio: vista.espacio, grupo })
        }
        alVerDeudas={() => setVista({ pantalla: 'deudas', espacio: vista.espacio })}
      />
    );
  }

  if (vista.pantalla === 'deudas') {
    return (
      <Deudas
        espacio={vista.espacio}
        alVolver={() => setVista({ pantalla: 'grupos', espacio: vista.espacio })}
      />
    );
  }

  if (vista.pantalla === 'grupo') {
    return (
      <DetalleGrupo
        espacio={vista.espacio}
        grupo={vista.grupo}
        alVolver={() => setVista({ pantalla: 'grupos', espacio: vista.espacio })}
        alTomarAsistencia={(clase) =>
          setVista({
            pantalla: 'asistencia',
            espacio: vista.espacio,
            grupo: vista.grupo,
            clase,
          })
        }
      />
    );
  }

  return (
    <Asistencia
      espacio={vista.espacio}
      grupo={vista.grupo}
      clase={vista.clase}
      alVolver={() =>
        setVista({ pantalla: 'grupo', espacio: vista.espacio, grupo: vista.grupo })
      }
    />
  );
}
