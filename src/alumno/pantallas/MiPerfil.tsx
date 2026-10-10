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
import { guardarMiPerfil } from '../datos';
import type { MiFicha } from '../datos';
import { Aviso, Campo, Texto, Boton, BotonSecundario, Avatar } from '../../comun/ui';

export default function MiPerfil({
  ficha,
  fotoSugerida,
  alCerrar,
  alGuardar,
}: {
  ficha: MiFicha;
  fotoSugerida: string | null;
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const [nombre, setNombre] = useState(ficha.full_name);
  const [foto, setFoto] = useState<string | null>(ficha.avatar_url);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

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
        <div className="flex flex-col gap-2 pl-3">
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
          {!foto && !fotoSugerida && (
            <p className="text-sm text-tenue">
              Sin foto se usan tus iniciales.
            </p>
          )}
        </div>
      </div>

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
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
