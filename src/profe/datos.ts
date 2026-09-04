// ============================================================================
// Todo lo que la app del profesor le pide a la base, en un solo lugar.
//
// Tenerlo junto y separado de las pantallas sirve para poder contestar de un
// vistazo la pregunta que importa: "¿qué datos toca esta app?".
//
// SOBRE LA SEGURIDAD: ninguna de estas consultas filtra por profesor. El
// .eq('tenant_id', ...) que sí aparece está para saber QUÉ espacio estás
// mirando, no para protegerlo. De proteger se ocupa Row Level Security, del
// lado de Postgres. Si alguna vez una de estas consultas devuelve datos
// ajenos, el problema está en una migración, no acá.
// ============================================================================
import { supabase } from '../lib/supabase';

export type Espacio = {
  id: string;
  name: string;
  discipline: string | null;
  plan: string;
};

export type Formato = 'cycle' | 'regular' | 'private';

export type Grupo = {
  id: string;
  name: string;
  format: Formato;
  level: string | null;
  capacity: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

export type ModoCobro = 'per_session' | 'per_period' | 'one_time';

export type Inscripcion = {
  id: string;
  billing_mode: ModoCobro;
  agreed_price: number | null;
  status: string;
  alumno: { id: string; full_name: string } | null;
};

export type Clase = {
  id: string;
  date: string;
  start_time: string | null;
  title: string | null;
  recap: string | null;
};

export async function traerEspacios(): Promise<Espacio[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, discipline, plan')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Espacio[];
}

export async function traerGrupos(espacioId: string): Promise<Grupo[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, format, level, capacity, start_date, end_date, status')
    .eq('tenant_id', espacioId)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Grupo[];
}

// Trae las inscripciones del grupo y, de cada una, el nombre del alumno.
// El "alumno:students(...)" le pide a Supabase que traiga de una la ficha
// enlazada, en vez de hacer una consulta por alumno.
export async function traerInscripciones(grupoId: string): Promise<Inscripcion[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, billing_mode, agreed_price, status, alumno:students(id, full_name)')
    .eq('group_id', grupoId);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Inscripcion[];
}

export async function traerClases(grupoId: string): Promise<Clase[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, date, start_time, title, recap')
    .eq('group_id', grupoId)
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Clase[];
}

// ---------------------------------------------------------------------------
// Etiquetas: la base habla en inglés, la pantalla en castellano.
// ---------------------------------------------------------------------------
export const nombreFormato: Record<Formato, string> = {
  cycle: 'Formación',
  regular: 'Regular',
  private: 'Particular',
};

export const nombreCobro: Record<ModoCobro, string> = {
  per_session: 'por clase',
  per_period: 'por mes',
  one_time: 'pago único',
};

export function fecha(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function plata(n: number | null): string {
  if (n === null) return '—';
  return '$' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}
