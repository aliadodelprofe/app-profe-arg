// ============================================================================
// Piezas visuales compartidas por las pantallas del profesor.
// ============================================================================
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type React from 'react';

export function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-dark px-5 py-8">
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </div>
  );
}

export function Encabezado({
  titulo,
  bajada,
  derecha,
  volver,
}: {
  titulo: string;
  bajada?: string;
  derecha?: ReactNode;
  volver?: { texto: string; alTocar: () => void };
}) {
  return (
    <div className="mb-6">
      {volver && (
        <button
          onClick={volver.alTocar}
          className="mb-3 text-sm text-brand-taupe hover:text-brand-sand"
        >
          ← {volver.texto}
        </button>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-cream">{titulo}</h1>
          {bajada && <p className="text-sm text-brand-taupe">{bajada}</p>}
        </div>
        {derecha}
      </div>
    </div>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {children}
    </p>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="text-brand-taupe">{children}</p>;
}

export function Tarjeta({
  children,
  alTocar,
}: {
  children: ReactNode;
  alTocar?: () => void;
}) {
  const clases =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left';
  if (!alTocar) return <div className={clases}>{children}</div>;
  return (
    <button onClick={alTocar} className={clases + ' hover:border-brand-sand/40'}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Carga de datos: pide, y devuelve una de tres cosas — todavía nada, un error,
// o los datos. Las pantallas se limitan a mostrar cuál de las tres es.
// ---------------------------------------------------------------------------
export function useCarga<T>(pedir: () => Promise<T>, claves: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Se incrementa para pedir los datos de nuevo, después de crear algo.
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    let vivo = true;
    setDatos(null);
    setError(null);
    pedir()
      .then((d) => { if (vivo) setDatos(d); })
      .catch((e: Error) => { if (vivo) setError(e.message); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...claves, vuelta]);

  return { datos, error, recargar: () => setVuelta((v) => v + 1) };
}

// ---------------------------------------------------------------------------
// Piezas de formulario
// ---------------------------------------------------------------------------
const claseInput =
  'w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-brand-cream outline-none focus:border-brand-sand';

export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-brand-taupe">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-xs text-brand-taupe/70">{ayuda}</span>}
    </label>
  );
}

export function Texto(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={claseInput} />;
}

export function Opciones<T extends string>({
  valor,
  opciones,
  alElegir,
}: {
  valor: T;
  opciones: { valor: T; texto: string }[];
  alElegir: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => alElegir(o.valor)}
          className={
            'rounded-lg border px-3 py-1.5 text-sm ' +
            (valor === o.valor
              ? 'border-brand-sand bg-brand-sand text-brand-dark'
              : 'border-white/15 text-brand-taupe hover:border-brand-sand/40')
          }
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function Boton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-lg bg-brand-sand px-3 py-2 font-medium text-brand-dark disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function BotonSecundario({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-lg border border-white/15 px-3 py-2 text-sm text-brand-taupe hover:border-brand-sand/40"
    >
      {children}
    </button>
  );
}
