// ============================================================================
// Mis escuelas — para quien cursa con más de un profesor.
//
// Antes esto era un muro: una lista de nombres que te obligaba a elegir antes
// de poder ver nada. Si tenías clase hoy en una y le debías plata a la otra, la
// app no te lo decía hasta que entraras a cada una — o sea que te hacía elegir
// sin darte con qué elegir.
//
// Ahora cada renglón ya contesta las dos preguntas que traen a alguien acá:
// cuándo es mi próxima clase y cómo estoy de plata. Entrar pasa a ser para el
// detalle, no para enterarse.
//
// Y tiene la pestaña de perfil, igual que adentro de una escuela. Cambiarte la
// foto o el nombre cambia TODAS tus fichas a la vez (migración 0023), así que
// obligarte a entrar a una escuela para hacerlo sería pedirte que elijas un
// contexto que no importa.
// ============================================================================
import { useState } from 'react';
import { fecha, hoyISO, plata } from '../formato';
import type { MiFicha, ResumenEscuela } from '../datos';
import type { Pestana } from '../../comun/ui';
import {
  Marco, Aviso, Vacio, Titulo, Lista, Fila, Esqueleto, Avatar,
  Navegacion, IconoEscuela, Marca,
} from '../../comun/ui';
import Perfil from './Perfil';

export default function MisEscuelas({
  correo,
  fichas,
  resumenes,
  error,
  alElegir,
  alCambiarPerfil,
}: {
  correo: string;
  fichas: MiFicha[];
  resumenes: ResumenEscuela[] | null;
  error: string | null;
  alElegir: (fichaId: string) => void;
  alCambiarPerfil: () => void;
}) {
  type Tab = 'escuelas' | 'perfil';
  const [tab, setTab] = useState<Tab>('escuelas');

  // Cualquiera de las fichas sirve para el perfil: el nombre y la foto son los
  // mismos en todas. La primera es tan buena como cualquier otra.
  const yo = fichas[0];

  const pestanas: Pestana<Tab>[] = [
    { id: 'escuelas', texto: 'Escuelas', icono: IconoEscuela },
    {
      id: 'perfil',
      texto: 'Perfil',
      icono: <Avatar nombre={yo.full_name} foto={yo.avatar_url} tam="nav" />,
    },
  ];

  return (
    <>
      <Navegacion<Tab> activa={tab} alElegir={setTab} pestanas={pestanas} />

      <Marco conBarra>
        {/* Acá no hay ninguna escuela de por medio: esta pantalla es de Tadán,
            y es la única que el alumno ve por encima de sus profes. Ver la
            regla completa en `Marca`, en comun/ui.tsx. */}
        <Marca margen="ajustado" />
        <Titulo>{tab === 'escuelas' ? 'Mis escuelas' : 'Mi perfil'}</Titulo>
        <p className="mb-4 text-sm text-tenue">{correo}</p>

        {tab === 'perfil' && <Perfil ficha={yo} alGuardar={alCambiarPerfil} />}

        {tab === 'escuelas' && (
          <>
            {error && <Aviso>{error}</Aviso>}
            {!resumenes && !error && <Esqueleto />}
            {resumenes && resumenes.length === 0 && (
              <Vacio
                pasos={[
                  ['Pedile a tu profe que te anote', 'Con el correo con el que entraste.'],
                  ['Te va a llegar una invitación', 'La vas a ver acá mismo.'],
                  ['Aceptás y listo', 'Ahí aparecen tus clases y tu cuenta.'],
                ]}
              >
                Todavía no tenés ninguna escuela.
              </Vacio>
            )}

            {resumenes && resumenes.length > 0 && (
              <Lista>
                {resumenes.map((r) => {
                  // HOY NO ES UNA FECHA MÁS.
                  //
                  // Quien cursa en tres escuelas abre esta pantalla con una
                  // pregunta sola: ¿hoy tengo que ir a algún lado? Antes se
                  // contestaba leyendo tres fechas y comparándolas con la de
                  // hoy mentalmente. Ahora la escuela donde hay clase hoy
                  // viene con fondo propio y lo dice con todas las letras:
                  // "hoy a las 20:30" en vez de "próxima: 12/11/2026".
                  const esHoy = r.proxima?.date === hoyISO();
                  const hora = r.proxima?.start_time?.slice(0, 5);
                  const grupo = r.proxima?.grupo?.name;
                  return (
                  <Fila
                    key={r.ficha.id}
                    avatar={r.ficha.escuela?.name ?? 'Escuela'}
                    foto={r.ficha.escuela?.avatar_url}
                    titulo={r.ficha.escuela?.name ?? 'Escuela'}
                    destacada={esHoy}
                    detalle={
                      !r.proxima
                        ? 'sin clases cargadas'
                        : esHoy
                          ? (
                            <span className="font-medium text-acento">
                              hoy{hora ? ` a las ${hora}` : ''}{grupo ? ` · ${grupo}` : ''}
                            </span>
                          )
                          : `próxima: ${fecha(r.proxima.date)}`
                            + (hora ? ` · ${hora}` : '')
                            + (grupo ? ` · ${grupo}` : '')
                    }
                    valor={
                      r.debe > 0 ? (
                        <span className="text-alerta">{plata(r.debe)}</span>
                      ) : r.aFavor > 0 ? (
                        <span className="text-acento">{plata(r.aFavor)}</span>
                      ) : (
                        <span className="text-tenue">al día</span>
                      )
                    }
                    bajoValor={r.debe > 0 ? 'debés' : r.aFavor > 0 ? 'a favor' : undefined}
                    alTocar={() => alElegir(r.ficha.id)}
                  />
                  );
                })}
              </Lista>
            )}
          </>
        )}
      </Marco>
    </>
  );
}
