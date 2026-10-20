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
  avatar_url: string | null;
  tenant_id: string;
  escuela: { name: string; discipline: string | null; avatar_url: string | null } | null;
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
  confirmed_at: string | null;
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
    .select('id, full_name, avatar_url, tenant_id, escuela:tenants(name, discipline, avatar_url)');
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

// Dos números, no uno: lo que debe y lo que tiene a favor. Nunca los dos a la
// vez —la imputación automática de la 0021 aplica el crédito a lo que se deba—
// pero decirle "al día" a alguien que pagó dos meses por adelantado es perder
// la mitad de la información que le importa.
export type MiSaldo = { debe: number; aFavor: number };

export async function miSaldo(tenantId: string): Promise<MiSaldo> {
  const { data, error } = await supabase
    .from('student_account')
    .select('saldo, a_favor')
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce(
    (acc, f) => {
      const r = f as Record<string, unknown>;
      return { debe: acc.debe + num(r.saldo), aFavor: acc.aFavor + num(r.a_favor) };
    },
    { debe: 0, aFavor: 0 },
  );
}

export async function misPagos(tenantId: string): Promise<MiPago[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, declared_at, paid_on, confirmed_at, note')
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
      confirmed_at: (r.confirmed_at as string) ?? null,
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

// ---------------------------------------------------------------------------
// CÓMO PAGO
//
// El alumno elige entre las dos formas que el profesor puso precio: por clase
// o por mes. La elección es suya y no necesita aprobación — el profesor ya
// jugó su carta al fijar el descuento de la cuota.
//
// El cambio vale desde el 1 del mes siguiente. El mes en curso ya se cobró o
// ya se cursó.
// ---------------------------------------------------------------------------
export type MiArreglo = {
  id: string;
  billing_mode: 'per_session' | 'per_period' | 'one_time';
  start_date: string | null;
  end_date: string | null;
  grupo: {
    id: string;
    name: string;
    price_per_session: number | null;
    price_per_period: number | null;
  } | null;
};

export async function misArreglos(tenantId: string): Promise<MiArreglo[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select(
      'id, billing_mode, start_date, end_date, ' +
      'grupo:groups(id, name, price_per_session, price_per_period)',
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('start_date');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MiArreglo[];
}

// Devuelve desde cuándo vale el cambio.
export async function cambiarFormaDePago(
  grupoId: string,
  modo: 'per_session' | 'per_period',
): Promise<string> {
  const { data, error } = await supabase.rpc('cambiar_forma_de_pago', {
    p_grupo_id: grupoId,
    p_modo: modo,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

// ---------------------------------------------------------------------------
// MI PERFIL
//
// El nombre y la foto son de la persona, no del profesor que la anotó. Hasta
// la 0023 la ficha era del profesor: él la creaba y la editaba para siempre, y
// el alumno veía el nombre que a él se le hubiera ocurrido escribir.
//
// Va por función y no por un update directo porque RLS protege filas y no
// columnas: dejar al alumno escribir su fila entera le permitiría cambiarse de
// escuela o pisarse el correo. La función toca exactamente dos columnas.
// ---------------------------------------------------------------------------
export async function guardarMiPerfil(
  nombre: string,
  avatarUrl?: string | null,
): Promise<number> {
  const { data, error } = await supabase.rpc('actualizar_mi_ficha', {
    p_nombre: nombre,
    p_avatar_url: avatarUrl ?? null,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

// La foto que Google ya tiene de la persona. Si entró con Google, no hay
// ninguna razón para pedirle que suba una.
export function fotoDeGoogle(usuario: { user_metadata?: Record<string, unknown> }): string | null {
  const m = usuario.user_metadata ?? {};
  const url = (m.avatar_url ?? m.picture) as string | undefined;
  return url && url.startsWith('https://') ? url : null;
}


// ---------------------------------------------------------------------------
// DÓNDE LE TRANSFIERO A MI PROFE  (migración 0024)
//
// Solo lectura, y la política de RLS solo deja ver los medios activos de las
// escuelas donde esta persona tiene ficha. Si algún día esta consulta se
// escribiera mal, lo peor que puede devolver es nada: no hay forma de que
// traiga el CBU de otro profesor.
// ---------------------------------------------------------------------------
export type DondeTransferir = {
  id: string;
  holder: string;
  alias: string | null;
  cbu: string | null;
  bank: string | null;
  note: string | null;
};

export async function misMediosDePago(tenantId: string): Promise<DondeTransferir[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, holder, alias, cbu, bank, note')
    .eq('tenant_id', tenantId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as DondeTransferir[];
}


// ---------------------------------------------------------------------------
// EL RESUMEN DE CADA ESCUELA
//
// Para la pantalla de quien cursa con más de un profesor. Antes esa pantalla
// era una lista de nombres: había que entrar a cada escuela para enterarse de
// si tenías clase hoy o de si debías plata, y la app te hacía elegir sin
// decirte nada con qué elegir.
//
// Son dos consultas chicas por escuela, en paralelo. Alguien con cinco
// profesores es un caso raro; alguien con dos es lo normal.
// ---------------------------------------------------------------------------
export type ResumenEscuela = {
  ficha: MiFicha;
  proxima: MiClase | null;
  debe: number;
  aFavor: number;
};

async function miProximaClase(tenantId: string): Promise<MiClase | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, date, start_time, title, recap, status, venue, address, grupo:groups(name, venue, address)')
    .eq('tenant_id', tenantId)
    .eq('status', 'scheduled')
    .gte('date', new Date().toISOString().slice(0, 10))
    .order('date')
    .order('start_time', { nullsFirst: true })
    .limit(1);
  if (error) throw new Error(error.message);
  const filas = (data ?? []) as unknown as MiClase[];
  return filas[0] ?? null;
}

export async function resumenDeMisEscuelas(fichas: MiFicha[]): Promise<ResumenEscuela[]> {
  return Promise.all(
    fichas.map(async (ficha) => {
      const [proxima, saldo] = await Promise.all([
        miProximaClase(ficha.tenant_id),
        miSaldo(ficha.tenant_id),
      ]);
      return { ficha, proxima, debe: saldo.debe, aFavor: saldo.aFavor };
    }),
  );
}


// ---------------------------------------------------------------------------
// ¿ESTA PERSONA TAMBIÉN DA CLASES?
//
// Es más común de lo que parece: casi todos los profesores siguen tomando
// clases con otros. Sin esto, esa persona termina creándose un segundo usuario
// con otro correo, y a partir de ahí tiene dos vidas que no se hablan.
//
// La pregunta se contesta sola con RLS: la política de tenant_members solo
// deja ver las membresías de los espacios propios, así que si devuelve algo,
// esta persona es profesora en alguno.
//
// No tira error a propósito: esto decide si se muestra un botón, no si la app
// funciona. Si falla, no se muestra y listo.
// ---------------------------------------------------------------------------
export async function tambienDoyClases(): Promise<boolean> {
  const { count, error } = await supabase
    .from('tenant_members')
    .select('tenant_id', { count: 'exact', head: true });
  if (error) return false;
  return (count ?? 0) > 0;
}


// ---------------------------------------------------------------------------
// MI FOTO  (migración 0027)
//
// La carpeta es el usuario y no la ficha: una ficha es por escuela, pero la
// cara es de la persona. Quien cursa con dos profesores sube la foto una vez.
//
// El depósito es público, así que la dirección se arma sin firmar nada. Cada
// archivo lleva un nombre nuevo en vez de pisar al anterior: reemplazar una
// imagen por otra con el mismo nombre deja a los navegadores mostrando la
// vieja durante horas.
// ---------------------------------------------------------------------------
export const FOTO_MAX_MB = 8;

export async function subirMiFoto(archivo: Blob): Promise<string> {
  const { data: usuario } = await supabase.auth.getUser();
  const id = usuario.user?.id;
  if (!id) throw new Error('Tu sesión venció. Entrá de nuevo.');
  const ruta = `${id}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from('avatares')
    .upload(ruta, archivo, { contentType: 'image/jpeg' });
  if (error) throw new Error(error.message);
  return supabase.storage.from('avatares').getPublicUrl(ruta).data.publicUrl;
}
