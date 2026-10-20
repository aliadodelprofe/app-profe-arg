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
import { Aviso, Campo, Texto, Boton, BotonSecundario, Avatar, Hoja } from '../../comun/ui';
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
  // El archivo que se está por recortar. Mientras hay uno, se abre la hoja
  // del recortador; lo que vuelve de ahí ya es un cuadrado de 512.
  const [aRecortar, setARecortar] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function subir(recortada: Blob) {
    setARecortar(null);
    setSubiendo(true);
    setError(null);
    try {
      setFoto(await subirMiFoto(recortada));
    } catch (err) {
      setError((err as Error).message);
    }
    setSubiendo(false);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await guardarMiPerfil(nombre, foto);
      alGuardar();
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="scale-150 pl-3">
          <Avatar nombre={nombre || ficha.full_name} foto={foto} />
        </div>
        <div className="flex flex-col items-start gap-2 pl-3">
          {/* El input de archivo no va adentro de <Campo>: Campo envuelve a
              sus hijos en un <label>, y un input de archivo adentro de su
              propio label recibe dos clics y se cierra solo. Acá el label ES
              el botón, que es distinto: hay un solo label. */}
          <label className="cursor-pointer rounded-xl border border-linea px-4 py-2.5 text-sm text-tenue transition hover:border-acento/40">
            {subiendo ? 'Subiendo…' : foto ? 'Cambiar la foto' : 'Subir una foto'}
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
            <BotonSecundario type="button" onClick={() => setFoto(fotoSugerida)}>
              Usar mi foto de Google
            </BotonSecundario>
          )}
          {foto && (
            <BotonSecundario type="button" onClick={() => setFoto(null)}>
              Sacar la foto
            </BotonSecundario>
          )}
          {!foto && (
            <p className="text-sm text-tenue">Sin foto se usan tus iniciales.</p>
          )}
        </div>
      </div>

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
        ayuda="Es lo que ve tu profesor en sus listas."
      >
        <Texto required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Campo>

      {error && <Aviso>{error}</Aviso>}

      <p className="text-xs text-tenue">
        Tu correo no se edita acá: es con el que tu profesor te anotó. Si está mal,
        pedile que lo corrija.
      </p>

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Boton>
        {alCerrar && (
          <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
        )}
      </div>
    </form>
  );
}
