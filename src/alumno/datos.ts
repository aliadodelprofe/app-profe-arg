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
  // Cuánto de este cargo ya está cubierto por pagos confirmados. Sale de las
  // imputaciones, que es lo mismo que mira el saldo: sin esto un cargo pagado
  // y uno que vence mañana se ven idénticos.
  pagado: number;
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

// ---------------------------------------------------------------------------
// INVITACIONES
//
// Quedar anotado en el curso de alguien no es un trámite: es aceptar que esa
// persona te cobre. Por eso no pasa solo. La app muestra quién te anotó, con
// qué nombre y a qué grupo, y espera una respuesta.
// ---------------------------------------------------------------------------
// Cómo le van a cobrar. Pueden ser varias: quien se suma a mitad de mes tiene
// el resto del mes por clase y la cuota desde el 1 del siguiente.
export type FormaDePago = {
  grupo: string | null;
  modo: 'per_session' | 'per_period' | 'one_time';
  precio: number | null;
  desde: string | null;
  hasta: string | null;
};

export type Invitacion = {
  student_id: string;
  escuela: string;
  disciplina: string | null;
  anotado_como: string;
  grupos: string;
  formas_de_pago: FormaDePago[];
};

export async function invitacionesPendientes(): Promise<Invitacion[]> {
  const { data, error } = await supabase.rpc('invitaciones_pendientes');
  if (error) throw new Error(error.message);
  return (data ?? []) as Invitacion[];
}

export async function aceptarInvitacion(studentId: string): Promise<void> {
  const { error } = await supabase.rpc('aceptar_invitacion', { p_student_id: studentId });
  if (error) throw new Error(error.message);
}

export async function rechazarInvitacion(studentId: string): Promise<void> {
  const { error } = await supabase.rpc('rechazar_invitacion', { p_student_id: studentId });
  if (error) throw new Error(error.message);
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
    .select('id, concept, amount, due_date, period, imputaciones:payment_allocations(amount)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('due_date', { nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => {
    const r = c as Record<string, unknown>;
    const imputaciones = (r.imputaciones ?? []) as { amount: unknown }[];
    return {
      id: String(r.id),
      concept: String(r.concept),
      amount: num(r.amount),
      due_date: (r.due_date as string) ?? null,
      period: (r.period as string) ?? null,
      pagado: imputaciones.reduce((s, i) => s + num(i.amount), 0),
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
  receipt_url: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .insert({ ...datos, status: 'declared', method: 'transfer' });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// COMPROBANTES
//
// El archivo va a un depósito privado, ordenado como
// comprobantes/<tenant_id>/<student_id>/<archivo>. Esa forma es la que hacen
// cumplir las reglas de la 0014: la primera carpeta habilita al profesor, la
// segunda al alumno.
//
// En payments.receipt_url se guarda la RUTA, no una dirección web. Una
// dirección de un depósito privado no sirve pegada en ningún lado: para abrir
// el archivo hay que pedir un enlace temporal, y para eso hay que tener
// permiso. La ruta es lo único que tiene sentido guardar.
// ---------------------------------------------------------------------------
export const COMPROBANTE_MAX_MB = 10;

export async function subirComprobante(
  archivo: File,
  tenantId: string,
  studentId: string,
): Promise<string> {
  const extension = (archivo.name.split('.').pop() ?? 'jpg').toLowerCase().slice(0, 5);
  const ruta = `${tenantId}/${studentId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('comprobantes')
    .upload(ruta, archivo, { contentType: archivo.type || undefined });
  if (error) throw new Error(error.message);
  return ruta;
}
