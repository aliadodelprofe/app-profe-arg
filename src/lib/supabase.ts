// ============================================================================
// Cliente de Supabase — la única puerta de entrada a la base desde el front.
//
// Las credenciales salen de .env.local, que NO se sube a GitHub.
// Acá va solamente la clave "anon". La "service_role" nunca entra en el
// front-end: cualquiera que abra la app puede leerla.
//
// La clave anon no es un secreto y no da acceso a nada por sí sola: quien
// decide qué puede ver cada uno es Row Level Security, del lado de Postgres.
// ============================================================================
import { createClient } from '@supabase/supabase-js';

const url     = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    'Faltan las variables de Supabase. Copiá .env.example como .env.local y ' +
    'completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(url, anonKey);
