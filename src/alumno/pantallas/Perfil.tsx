// ============================================================================
// PERFIL — vos, no tu escuela.
//
// Vive en dos lugares a propósito: como pestaña adentro de una escuela, y como
// pestaña del muro de escuelas. Para quien cursa en varias, obligarlo a entrar
// a una para cambiarse la foto sería pedirle que elija un contexto que no
// importa: la ficha es por escuela, pero el nombre y la foto son de la
// persona, y actualizar_mi_ficha (migración 0023) las cambia todas de una.
//
// Acá NO va el nombre de la escuela. Nombrar una sola hacía pensar que se
// estaba editando esa. Dónde estás parado lo dice el encabezado, que es donde
// además se cambia.
// ============================================================================
import { useEffect, useState } from 'react';
import { fotoDeGoogle, tambienDoyClases } from '../datos';
import type { MiFicha } from '../datos';
import { Seccion, BotonSecundario, useCarga } from '../../comun/ui';
import { supabase } from '../../lib/supabase';
import MiPerfil from './MiPerfil';
import MiAcceso from './MiAcceso';
import Salir from './Salir';

export default function Perfil({
  ficha,
  alGuardar,
}: {
  ficha: MiFicha;
  alGuardar: () => void;
}) {
  const [fotoGoogle, setFotoGoogle] = useState<string | null>(null);
  const [correo, setCorreo] = useState<string | null>(null);
  // Si además da clases, se le ofrece el otro lado de la app. Es la misma
  // cuenta: nadie debería necesitar dos correos para tomar y dar clases.
  const doyClases = useCarga(tambienDoyClases, []);

  // La foto que Google ya tiene, para poder ofrecerla con un toque.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setFotoGoogle(fotoDeGoogle(data.user));
      setCorreo(data.user.email ?? null);
    });
  }, []);

  return (
    <>
      <MiPerfil ficha={ficha} fotoSugerida={fotoGoogle} alGuardar={alGuardar} />

      {correo && <MiAcceso correo={correo} />}

      <Seccion>Mi cuenta</Seccion>
      {doyClases.datos === true ? (
        <>
          <p className="mb-3 text-sm text-tenue">
            También das clases. Es la misma cuenta de los dos lados.
          </p>
          <div className="mb-4">
            <BotonSecundario
              type="button"
              onClick={() => { window.location.href = '/profe'; }}
            >
              Ir a mi app de profesor
            </BotonSecundario>
          </div>
        </>
      ) : (
        <p className="mb-3 text-sm text-tenue">
          ¿Vos también das clases? Podés usar{' '}
          <a href="/profe" className="text-acento underline">esta misma cuenta</a> para
          llevar tus grupos y tus cobros. No hace falta otro correo.
        </p>
      )}

      <Salir />
    </>
  );
}
