// ============================================================================
// RECORTAR LA FOTO
//
// Una foto de perfil se muestra en un círculo, y una foto rectangular metida
// en un círculo se recorta sola por el centro. A veces sale bien; muchas veces
// corta media cara, o deja a la persona en una esquina.
//
// Esto no arregla el recorte: se lo da a quien subió la foto. Arrastrás para
// mover, deslizás para acercar, y lo que ves adentro del círculo es
// exactamente lo que se guarda — porque lo que se guarda se dibuja con la
// misma cuenta que lo que se muestra.
//
// Sin librerías. Un recortador es un canvas, dos escuchadores de puntero y una
// multiplicación; traer una dependencia para esto costaría más que escribirlo.
//
// La imagen sale SIEMPRE cuadrada y de 512 píxeles, en JPEG. Da igual qué haya
// entrado: una foto de 12 megapíxeles sacada con el celular termina pesando
// unos 60 kB, y esa imagen se baja en cada pantalla de la app.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { Boton, BotonSecundario, Aviso } from './ui';

const LADO = 512;      // lo que se guarda
const VISTA = 260;     // lo que se ve mientras recortás

export default function Recorte({
  archivo,
  alCancelar,
  alRecortar,
}: {
  archivo: File;
  alCancelar: () => void;
  alRecortar: (recortada: Blob) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  // zoom 1 = la imagen entra justo en el círculo por su lado más corto.
  const [zoom, setZoom] = useState(1);
  const [centro, setCentro] = useState({ x: 0.5, y: 0.5 });  // 0..1 sobre la imagen
  const arrastre = useRef<{ x: number; y: number } | null>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);

  // Cargar el archivo. La URL temporal se revoca al salir: si no, el navegador
  // se queda con la imagen entera en memoria hasta que recargues la página.
  //
  // La bandera `vivo` no es precaución teórica: en desarrollo React monta cada
  // componente DOS veces a propósito, para encontrar efectos mal limpiados. En
  // la primera vuelta esto creaba la URL, empezaba a cargar, y la limpieza la
  // revocaba de inmediato — con lo cual esa imagen fallaba y escribía el error.
  // La segunda vuelta cargaba bien, pero el error ya estaba puesto y la
  // pantalla mostraba "no se pudo abrir esa imagen" sobre una imagen que sí se
  // había abierto. El efecto cancelado ahora no escribe nada.
  useEffect(() => {
    let vivo = true;
    const url = URL.createObjectURL(archivo);
    const i = new Image();
    i.onload = () => { if (vivo) { setError(null); setImg(i); } };
    i.onerror = () => {
      if (vivo) {
        setError(
          'No se pudo abrir esa imagen. Si la sacaste con un iPhone puede estar en ' +
          'formato HEIC; probá con una captura de pantalla o guardala como JPG.',
        );
      }
    };
    i.src = url;
    return () => { vivo = false; URL.revokeObjectURL(url); };
  }, [archivo]);

  // Dibujar. Es la misma cuenta que usa recortar(), con otro tamaño: por eso
  // lo que ves es lo que se guarda.
  useEffect(() => {
    const c = lienzo.current;
    if (!c || !img) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    pintar(ctx, img, VISTA, zoom, centro);
  }, [img, zoom, centro]);

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!arrastre.current || !img) return;
    const corto = Math.min(img.width, img.height);
    // Cuánto de la imagen entra en la vista, en unidades 0..1. Mover un píxel
    // de pantalla tiene que mover la misma porción de imagen, haya el zoom que
    // haya: si no, con la foto acercada el arrastre se siente pegajoso.
    const porPixel = corto / zoom / VISTA;
    const dx = (e.clientX - arrastre.current.x) * porPixel;
    const dy = (e.clientY - arrastre.current.y) * porPixel;
    arrastre.current = { x: e.clientX, y: e.clientY };
    setCentro((c) => ({
      x: acotar(c.x - dx / img.width, img.width, corto, zoom),
      y: acotar(c.y - dy / img.height, img.height, corto, zoom),
    }));
  }

  function recortar() {
    if (!img) return;
    const c = document.createElement('canvas');
    c.width = LADO;
    c.height = LADO;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    // Fondo blanco: un PNG con transparencia pasado a JPEG deja las zonas
    // transparentes en negro, que sobre un avatar claro se ve como una mancha.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, LADO, LADO);
    pintar(ctx, img, LADO, zoom, centro);
    c.toBlob(
      (b) => { if (b) alRecortar(b); },
      'image/jpeg',
      0.9,
    );
  }

  // El error tapa todo solo si además NO hay imagen. Con una imagen cargada,
  // un error de subida se muestra abajo sin sacarte del recorte que ya hiciste.
  if (error && !img) {
    return (
      <div className="flex flex-col gap-3">
        <Aviso>{error}</Aviso>
        <BotonSecundario type="button" onClick={alCancelar}>Cerrar</BotonSecundario>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-tenue">
        Arrastrá para mover y deslizá para acercar. Lo que ves adentro del círculo es
        lo que se va a ver en la app.
      </p>

      <div
        className="relative overflow-hidden rounded-full border border-linea bg-campo"
        style={{ width: VISTA, height: VISTA }}
      >
        <canvas
          ref={lienzo}
          width={VISTA}
          height={VISTA}
          className="cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={(e) => {
            arrastre.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={mover}
          onPointerUp={() => { arrastre.current = null; }}
          onPointerCancel={() => { arrastre.current = null; }}
        />
        {!img && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-tenue">
            Abriendo…
          </div>
        )}
      </div>

      <input
        type="range"
        min={1}
        max={4}
        step={0.01}
        value={zoom}
        aria-label="Acercar"
        onChange={(e) => {
          const z = Number(e.target.value);
          setZoom(z);
          // Al acercar, el centro puede quedar fuera de lo permitido: se
          // reacomoda en vez de dejar un borde vacío adentro del círculo.
          if (img) {
            const corto = Math.min(img.width, img.height);
            setCentro((c) => ({
              x: acotar(c.x, img.width, corto, z),
              y: acotar(c.y, img.height, corto, z),
            }));
          }
        }}
        className="w-full max-w-xs accent-[var(--color-acento)]"
      />

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="button" onClick={recortar} disabled={!img}>
          Usar esta foto
        </Boton>
        <BotonSecundario type="button" onClick={alCancelar}>Cancelar</BotonSecundario>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// La cuenta, una sola vez.
//
// `lado` es el tamaño del destino. Se toma un cuadrado de la imagen de
// (lado más corto / zoom) píxeles, centrado donde diga `centro`, y se estira
// al destino. Con zoom 1 el cuadrado es el lado más corto entero: la imagen
// entra justo y no se puede dejar un borde vacío.
// ----------------------------------------------------------------------------
function pintar(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  lado: number,
  zoom: number,
  centro: { x: number; y: number },
) {
  const corto = Math.min(img.width, img.height);
  const ventana = corto / zoom;
  const sx = centro.x * img.width - ventana / 2;
  const sy = centro.y * img.height - ventana / 2;
  ctx.clearRect(0, 0, lado, lado);
  ctx.drawImage(img, sx, sy, ventana, ventana, 0, 0, lado, lado);
}

// El centro no puede alejarse tanto como para que la ventana se salga de la
// imagen: eso dejaría un borde vacío adentro del círculo.
function acotar(valor: number, largo: number, corto: number, zoom: number): number {
  const mitad = corto / zoom / 2 / largo;
  return Math.min(Math.max(valor, mitad), 1 - mitad);
}
