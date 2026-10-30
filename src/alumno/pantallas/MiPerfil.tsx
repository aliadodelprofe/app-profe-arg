// ============================================================================
// Mi perfil — lo único de la app que es del alumno y no del profesor.
//
// El nombre con el que querés que te llamen y tu foto. Nada más: el correo no
// se edita acá porque es la llave con la que tu profesor te enganchó, y la
// escuela tampoco, porque no es tuya.
//
// Si entraste con Google, la foto ya la tiene Google y se ofrece con un toque.
// Pedirle a alguien que suba una foto cuando ya hay una disponible es trabajo
// que no hacía falta.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { guardarMiPerfil, subirMiFoto, FOTO_MAX_MB } from '../datos';
import type { MiFicha } from '../datos';
import {
  Aviso, Campo, Texto, Boton, BotonSecundario, Avatar, Hoja, claseAccionTenue,
} from '../../comun/ui';
import Recorte from '../../comun/Recorte';

export default function MiPerfil({
  ficha,
  fotoSugerida,
  alCerrar,
  alGuardar,
}: {
  ficha: MiFicha;
  fotoSugerida: string | null;
  // Solo cuando el formulario vive en una hoja. Como pestaña no hay nada que
  // cancelar: te vas tocando otra pestaña.
  alCerrar?: () => void;
  alGuardar: () => void;
}) {
  const [nombre, setNombre] = useState(ficha.full_name);
  const [foto, setFoto] = useState<string | null>(ficha.avatar_url);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  // El archivo que se está por recortar. Mientras hay uno, se abre la hoja
  // del recortador; lo que vuelve de ahí ya es un cuadrado de 512.
  const [aRecortar, setARecortar] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  // El error de la foto va aparte del error de guardar, y se muestra al lado
  // del botón que lo provocó. Un cartel a doscientos píxeles de distancia de
  // lo que acabás de tocar se lee como si fuera de otra cosa, o no se lee.
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  // La foto se guarda SOLA, sin pasar por el botón de guardar. Elegir una
  // imagen ya es la confirmación: después de recortarla y verla en el círculo,
  // pedir un segundo paso es pedir dos veces lo mismo — y si te vas sin darlo,
  // la foto que ya viste puesta no estaba puesta.
  //
  // Se guarda con el nombre que YA ESTÁ en la ficha y no con el del campo: si
  // estabas a mitad de tipear un nombre nuevo, cambiar la foto no tiene por
  // qué comprometer eso. El nombre sigue siendo del botón.
  async function aplicarFoto(url: string | null) {
    setSubiendo(true);
    setErrorFoto(null);
    try {
      await guardarMiPerfil(ficha.full_name, url);
      setFoto(url);
      alGuardar();
    } catch (err) {
      setErrorFoto((err as Error).message);
    }
    setSubiendo(false);
  }

  async function subir(recortada: Blob) {
    setARecortar(null);
    setSubiendo(true);
    setErrorFoto(null);
    try {
      const url = await subirMiFoto(recortada);
      if (!url) throw new Error('La foto se subió pero el servidor no devolvió su dirección.');
      await aplicarFoto(url);
    } catch (err) {
      setErrorFoto((err as Error).message);
      setSubiendo(false);
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await guardarMiPerfil(nombre, foto);
      alGuardar();
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (err) {
      setError((err as Error).message);
    }
    // Siempre, pase lo que pase. Antes esto solo se apagaba en el camino del
    // error: el del éxito contaba con que el formulario se desmontara al
    // cerrarse la hoja que lo contenía. Cuando pasó a ser una pestaña, dejó de
    // desmontarse y el botón se quedaba diciendo "Guardando…" para siempre.
    setGuardando(false);
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      {/* LA FOTO Y LO QUE SE PUEDE HACER CON ELLA.

          Antes eran dos bloques rosas apilados del mismo tamaño y del mismo
          peso —"Cambiar la foto" y "Sacar la foto"— al lado de un avatar
          agrandado con scale-150. Tres problemas en una esquina:

          · Las dos acciones pesaban igual, y no lo son: cambiarla es lo que
            hace todo el mundo, sacarla es lo que hace uno de cada veinte.
          · Apiladas ocupaban más alto que la foto, así que lo primero que se
            leía del perfil eran dos botones y no la cara.
          · El scale-150 agrandaba también el aro de 1px del avatar, que
            quedaba el doble de grueso que en el resto de la app.

          Ahora la foto es grande de verdad (tam="grande"), la acción común es
          una pastilla, y las otras dos son texto al lado: se encuentran si se
          las busca y no compiten con nada. */}
      <div className="flex items-center gap-5">
        <Avatar nombre={nombre || ficha.full_name} foto={foto} tam="grande" />

        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
            {/* El input de archivo no va adentro de <Campo>: Campo envuelve a
                sus hijos en un <label>, y un input de archivo adentro de su
                propio label recibe dos clics y se cierra solo. Acá el label ES
                el botón, que es distinto: hay un solo label. */}
            <label className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-full bg-acento-suave px-3.5 py-1.5 text-sm font-semibold text-acento transition hover:brightness-[0.97] active:scale-[0.97]">
              {subiendo ? 'Subiendo…' : foto ? 'Cambiar' : 'Subir una foto'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={subiendo}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  if (f.size > FOTO_MAX_MB * 1024 * 1024) {
                    setError(`La imagen pesa más de ${FOTO_MAX_MB} MB. Probá con otra.`);
                    return;
                  }
                  setError(null);
                  setARecortar(f);
                }}
              />
            </label>

            {fotoSugerida && foto !== fotoSugerida && (
              <button
                type="button"
                disabled={subiendo}
                onClick={() => void aplicarFoto(fotoSugerida)}
                className={claseAccionTenue}
              >
                Usar la de Google
              </button>
            )}
            {foto && (
              <button
                type="button"
                disabled={subiendo}
                onClick={() => void aplicarFoto(null)}
                className={claseAccionTenue}
              >
                Sacar
              </button>
            )}
          </div>

          <p className="text-sm leading-snug text-tenue">
            {foto
              ? 'Es lo que ve tu profesor al lado de tu nombre.'
              : 'Sin foto se usan tus iniciales.'}
          </p>
        </div>
      </div>

      {/* El error va a lo ancho del formulario y no apretado en la columna de
          los botones, donde un mensaje de dos renglones empujaba la foto. */}
      {errorFoto && <Aviso>{errorFoto}</Aviso>}

      {aRecortar && (
        <Hoja titulo="Acomodá tu foto" alCerrar={() => setARecortar(null)}>
          <Recorte
            archivo={aRecortar}
            alCancelar={() => setARecortar(null)}
            alRecortar={(b) => void subir(b)}
          />
        </Hoja>
      )}

      <Campo
        etiqueta="Cómo querés que te llamen"
        ayuda="Es lo que ve tu profesor en sus listas. Se guarda con el botón de abajo; la foto se guarda sola."
      >
        <Texto required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex items-center gap-3">
        <Boton type="submit" disabled={guardando || nombre.trim() === ficha.full_name}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Boton>
        {guardado && <span className="text-sm text-acento">Guardado.</span>}
        {alCerrar && (
          <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
        )}
      </div>
    </form>
  );
}
