// ============================================================================
// Lo que la app del alumno le pide a la base.
//
// SOBRE LA SEGURIDAD: igual que del lado del profesor, ninguna consulta filtra
// por alumno. No hace falta y no serviría: quien decide qué ve cada uno son
// las políticas de la migración 0005, del lado de Postgres. Los .eq() que
// aparecen son para elegir DE QUÉ ESCUELA está mirando, cuando cursa con más
// de un profesor.
// ============================================================================
import { supabase } from '../lib/supabase';

export type MiFicha = {
  id: string;
  full_name: string;
  tenant_id: string;
  escuela: { name: string; discipline: string | null } | null;
};

export type MiClase = {
  id: string;
  date: string;
  start_time: string | null;
  title: string | null;
  recap: string | null;
  status: 'scheduled' | 'cancelled';
  venue: string | null;
  address: string | null;
  grupo: { name: string; venue: string | null; address: string | null } | null;
};

export type MiCargo = {
  id: string;
  concept: string;
  amount: number;
  due_date: string | null;
  period: string | null;
};

export type MiPago = {
  id: string;
  amount: number;
  status: 'declared' | 'confirmed' | 'rejected';
  declared_at: string;
  paid_on: string | null;
  note: string | null;
};

const num = (v: unknown): number => Number(v ?? 0);

// Enlaza al usuario recién registrado con las fichas que tengan su correo.
// Es la función de la migración 0013. Devuelve cuántas enlazó.
export async function reclamarFicha(): Promise<number> {
  const { data, error } = await supabase.rpc('reclamar_ficha');
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function misFichas(): Promise<MiFicha[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, tenant_id, escuela:tenants(name, discipline)');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MiFicha[];
}

export async function misClases(tenantId: string): Promise<MiClase[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, date, start_time, title, recap, status, venue, address, grupo:groups(name, venue, address)')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MiClase[];
}

export async function misCargos(tenantId: string): Promise<MiCargo[]> {
  const { data, error } = await supabase
    .from('charges')
    .select('id, concept, amount, due_date, period')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('due_date', { nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => {
    const r = c as Record<string, unknown>;
    return {
      id: String(r.id),
      concept: String(r.concept),
      amount: num(r.amount),
      due_date: (r.due_date as string) ?? null,
      period: (r.period as string) ?? null,
    };
  });
}

export async function miSaldo(tenantId: string): Promise<number> {
  const { data, error } = await supabase
    .from('student_account')
    .select('saldo')
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((s, f) => s + num((f as Record<string, unknown>).saldo), 0);
}

export async function misPagos(tenantId: string): Promise<MiPago[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, declared_at, paid_on, note')
    .eq('tenant_id', tenantId)
    .order('declared_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => {
    const r = p as Record<string, unknown>;
    return {
      id: String(r.id),
      amount: num(r.amount),
      status: r.status as MiPago['status'],
      declared_at: String(r.declared_at),
      paid_on: (r.paid_on as string) ?? null,
      note: (r.note as string) ?? null,
    };
  });
}

// Avisar que se transfirió.
//
// El alumno solo puede crear el pago como "declarado": la política de la 0005
// le impide marcarlo confirmado, y eso está probado. Confirmar es del profe,
// y es lo único de todo el circuito que no se automatiza — porque es la
// decisión de dar por buena la plata.
export async function declararPago(datos: {
  tenant_id: string;
  student_id: string;
  amount: number;
  paid_on: string | null;
  note: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .insert({ ...datos, status: 'declared', method: 'transfer' });
  if (error) throw new Error(error.message);
}
