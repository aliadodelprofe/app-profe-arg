// ============================================================================
// App del profesor — vive en /profe
//
// Arranca separada de la app vieja a propósito: entrando por /profe, el
// código de Firebase ni siquiera se descarga, así que no hay forma de tocar
// la base de producción de la comunidad desde acá.
//
// Sobre el "espacio": es la cuenta del profesor, no la sala donde da clase.
// Casi todos van a tener uno solo y para siempre, así que la app no los hace
// elegir de una lista de uno: si hay un solo espacio, se entra derecho a los
// grupos. La pantalla de espacios aparece únicamente cuando hay más de uno
// —una dupla con proyectos separados, o el plan Multi—. El concepto sigue
// existiendo en la base; deja de estorbar arriba.
// ============================================================================
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { traerEspacios } from './datos';
import type { Espacio, Grupo, Clase } from './datos';
import { Marco, Vacio, Aviso, useCarga } from './ui';
import Ingreso from './pantallas/Ingreso';
import Espacios from './pantallas/Espacios';
import Grupos from './pantallas/Grupos';
import DetalleGrupo from './pantallas/DetalleGrupo';
import Asistencia from './pantallas/Asistencia';
import Deudas from './pantallas/Deudas';
import Pagos from './pantallas/Pagos';

export default function AppProfe() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (cargando) return <Marco><Vacio>Cargando…</Vacio></Marco>;
  if (!sesion) return <Ingreso />;

  // La clave fuerza a rearmar todo cuando cambia el usuario: nunca hay que
  // quedar parado en la pantalla de un espacio que ya no es tuyo.
  return <Adentro key={sesion.user.id} sesion={sesion} />;
}

type Vista =
  | { pantalla: 'espacios' }
  | { pantalla: 'grupos'; espacio: Espacio }
  | { pantalla: 'grupo'; espacio: Espacio; grupo: Grupo }
  | { pantalla: 'asistencia'; espacio: Espacio; grupo: Grupo; clase: Clase }
  | { pantalla: 'deudas'; espacio: Espacio }
  | { pantalla: 'pagos'; espacio: Espacio };

function Adentro({ sesion }: { sesion: Session }) {
  const espacios = useCarga(traerEspacios, []);
  const [vista, setVista] = useState<Vista | null>(null);

  // Con los espacios en la mano, decidir por dónde se entra.
  useEffect(() => {
    if (!espacios.datos || vista) return;
    setVista(
      espacios.datos.length === 1
        ? { pantalla: 'grupos', espacio: espacios.datos[0] }
        : { pantalla: 'espacios' },
    );
  }, [espacios.datos, vista]);

  const email = sesion.user.email ?? '';
  const unico = espacios.datos?.length === 1;

  if (espacios.error) return <Marco><Aviso>{espacios.error}</Aviso></Marco>;
  if (!vista) return <Marco><Vacio>Cargando…</Vacio></Marco>;

  if (vista.pantalla === 'espacios') {
    return (
      <Espacios
        email={email}
        espacios={espacios.datos ?? []}
        alCrear={espacios.recargar}
        alElegir={(espacio) => setVista({ pantalla: 'grupos', espacio })}
      />
    );
  }

  // Si hay un solo espacio no hay adónde volver: esta es la pantalla de inicio.
  const volverAEspacios = unico
    ? undefined
    : () => setVista({ pantalla: 'espacios' });

  if (vista.pantalla === 'grupos') {
    return (
      <Grupos
        espacio={vista.espacio}
        email={email}
        alVolver={volverAEspacios}
        alElegir={(grupo) => setVista({ pantalla: 'grupo', espacio: vista.espacio, grupo })}
        alVerDeudas={() => setVista({ pantalla: 'deudas', espacio: vista.espacio })}
        alVerPagos={() => setVista({ pantalla: 'pagos', espacio: vista.espacio })}
      />
    );
  }

  if (vista.pantalla === 'pagos') {
    return (
      <Pagos
        espacio={vista.espacio}
        alVolver={() => setVista({ pantalla: 'grupos', espacio: vista.espacio })}
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
          setVista({ pantalla: 'asistencia', espacio: vista.espacio, grupo: vista.grupo, clase })
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
