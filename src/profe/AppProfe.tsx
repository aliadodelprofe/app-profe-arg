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
import {
  Marco, Vacio, Aviso, useCarga,
  Navegacion, IconoHoy, IconoGrupos, IconoCobros,
} from '../comun/ui';
import Ingreso from './pantallas/Ingreso';
import Espacios from './pantallas/Espacios';
import Grupos from './pantallas/Grupos';
import DetalleGrupo from './pantallas/DetalleGrupo';
import Asistencia from './pantallas/Asistencia';
import Hoy from './pantallas/Hoy';
import Cobros from './pantallas/Cobros';

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

// ============================================================================
// LA ESTRUCTURA
//
// Tres secciones hermanas, siempre visibles: HOY, GRUPOS y COBROS. Antes
// "quién me debe" y "pagos" colgaban de la lista de grupos, así que para ir de
// una a la otra había que volver atrás. Eran hijas de algo con lo que no
// tienen relación.
//
// Adentro de GRUPOS sí hay profundidad, y ahí está bien: grupo → clase →
// asistencia es un camino, no un menú. Esas pantallas conservan su "volver" y
// se quedan sin barra, porque mientras tomás asistencia no querés irte a otro
// lado de un toque sin querer.
// ============================================================================
type Tab = 'hoy' | 'grupos' | 'cobros';

type Vista =
  | { pantalla: 'espacios' }
  | { pantalla: 'tab'; espacio: Espacio; tab: Tab }
  | { pantalla: 'grupo'; espacio: Espacio; grupo: Grupo }
  | { pantalla: 'asistencia'; espacio: Espacio; grupo: Grupo; clase: Clase }

function Adentro({ sesion }: { sesion: Session }) {
  const espacios = useCarga(traerEspacios, []);
  const [vista, setVista] = useState<Vista | null>(null);

  // Con los espacios en la mano, decidir por dónde se entra.
  useEffect(() => {
    if (!espacios.datos || vista) return;
    setVista(
      espacios.datos.length === 1
        ? { pantalla: 'tab', espacio: espacios.datos[0], tab: 'hoy' }
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
        userId={sesion.user.id}
        espacios={espacios.datos ?? []}
        alCrear={espacios.recargar}
        alElegir={(espacio) => setVista({ pantalla: 'tab', espacio, tab: 'hoy' })}
      />
    );
  }

  const volverAEspacios = unico
    ? undefined
    : () => setVista({ pantalla: 'espacios' });

  // ------------------------------------------------- las tres hermanas
  if (vista.pantalla === 'tab') {
    const { espacio, tab } = vista;
    const irA = (t: Tab) => setVista({ pantalla: 'tab', espacio, tab: t });

    return (
      <>
        <Navegacion
          activa={tab}
          alElegir={irA}
          pestanas={[
            { id: 'hoy', texto: 'Hoy', icono: IconoHoy },
            { id: 'grupos', texto: 'Grupos', icono: IconoGrupos },
            { id: 'cobros', texto: 'Cobros', icono: IconoCobros },
          ]}
        />
        {tab === 'hoy' && (
          <Hoy
            espacio={espacio}
            alVerCobros={() => irA('cobros')}
            alTomarAsistencia={(clase) => {
              // La clase de inicio trae su grupo adentro; la pantalla de
              // asistencia necesita el grupo entero, así que se busca.
              if (!clase.grupo) return;
              setVista({
                pantalla: 'asistencia',
                espacio,
                grupo: { id: clase.grupo.id, name: clase.grupo.name } as Grupo,
                clase,
              });
            }}
          />
        )}
        {tab === 'grupos' && (
          <Grupos
            espacio={espacio}
            email={email}
            alVolver={volverAEspacios}
            alElegir={(grupo) => setVista({ pantalla: 'grupo', espacio, grupo })}
          />
        )}
        {tab === 'cobros' && <Cobros espacio={espacio} />}

      </>
    );
  }

  // ------------------------------------- adentro de un grupo: un camino
  if (vista.pantalla === 'grupo') {
    return (
      <DetalleGrupo
        espacio={vista.espacio}
        grupo={vista.grupo}
        alVolver={() => setVista({ pantalla: 'tab', espacio: vista.espacio, tab: 'grupos' })}
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
