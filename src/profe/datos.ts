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

// Los espacios donde esta persona es parte del EQUIPO, no los que alcanza a ver.
//
// La diferencia importa y ya nos mordió una vez. Preguntarle a "tenants" qué
// espacios ve devuelve también la escuela donde alguien es ALUMNO: la 0005 le
// da ese permiso a propósito, porque el portal del alumno necesita saber de
// quién es su clase. Con esa pregunta, un alumno entraba a la app del profesor
// y veía su propia escuela puesta en un marco de profesor.
//
// Preguntándole a "tenant_members" la respuesta es la correcta: solo los
// espacios donde esta persona es dueña, profesora o asistente. Un alumno no
// es miembro de nada y recibe una lista vacía.
export async function traerEspacios(): Promise<Espacio[]> {
  const { data, error } = await supabase
    .from('tenant_members')
    .select('espacio:tenants(id, name, discipline, plan)');
  if (error) throw new Error(error.message);
  const filas = (data ?? []) as unknown as { espacio: Espacio | null }[];
  return filas
    .map((f) => f.espacio)
    .filter((e): e is Espacio => e !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
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

// ---------------------------------------------------------------------------
// ASISTENCIA
// ---------------------------------------------------------------------------
export type EstadoAsistencia = 'present' | 'absent' | 'excused';

export type Asistencia = {
  id: string;
  student_id: string;
  status: EstadoAsistencia;
};

export const nombreAsistencia: Record<EstadoAsistencia, string> = {
  present: 'Presente',
  absent: 'Ausente',
  excused: 'Justificado',
};

export async function traerAsistencias(claseId: string): Promise<Asistencia[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, student_id, status')
    .eq('session_id', claseId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Asistencia[];
}

// Marca (o corrige) la asistencia de un alumno en una clase.
//
// Es un "upsert": si ya existe la fila la pisa, si no la crea. Puede hacerlo
// porque la migración 0003 declara que no puede haber dos asistencias del
// mismo alumno en la misma clase — unique (session_id, student_id). Sin esa
// regla en la base, tocar dos veces dejaría dos filas contradictorias.
export async function marcarAsistencia(params: {
  espacioId: string;
  claseId: string;
  alumnoId: string;
  estado: EstadoAsistencia;
}): Promise<void> {
  const { error } = await supabase.from('attendance').upsert(
    {
      tenant_id: params.espacioId,
      session_id: params.claseId,
      student_id: params.alumnoId,
      status: params.estado,
    },
    { onConflict: 'session_id,student_id' },
  );
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// ESTADO DE CUENTA — quién debe y cuánto
//
// Sale de la vista student_account de la migración 0004: suma los cargos
// vigentes, suma lo que se imputó de los pagos, y resta.
//
// Dos cosas para tener presentes al leer un saldo:
//
//   1. Un pago DECLARADO y todavía no confirmado no baja el saldo. Está bien
//      que sea así: hasta que no lo confirmás, no entró. Por eso más abajo se
//      traen aparte, para poder avisar "debe, pero hay algo esperándote".
//
//   2. La vista solo conoce alumnos que tienen algún cargo. Un alumno sin
//      cargos no aparece, y hay que tratarlo como saldo cero.
// ---------------------------------------------------------------------------
export type Cuenta = {
  student_id: string;
  total_cargos: number;
  total_pagado: number;
  saldo: number;
};

export type Alumno = { id: string; full_name: string; status: string };

export type PagoPendiente = {
  id: string;
  student_id: string;
  amount: number;
  paid_on: string | null;
  declared_at: string;
  note: string | null;
  receipt_url: string | null;
};

// Postgres devuelve los "numeric" con toda su precisión y a veces como texto.
// Los pasamos a número una sola vez, acá, y no en cada pantalla.
const num = (v: unknown): number => Number(v ?? 0);

export async function traerAlumnos(espacioId: string): Promise<Alumno[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, status')
    .eq('tenant_id', espacioId)
    .order('full_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Alumno[];
}

export async function traerCuentas(espacioId: string): Promise<Cuenta[]> {
  const { data, error } = await supabase
    .from('student_account')
    .select('student_id, total_cargos, total_pagado, saldo')
    .eq('tenant_id', espacioId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    student_id: String((c as Record<string, unknown>).student_id),
    total_cargos: num((c as Record<string, unknown>).total_cargos),
    total_pagado: num((c as Record<string, unknown>).total_pagado),
    saldo: num((c as Record<string, unknown>).saldo),
  }));
}

export async function traerPagosPendientes(espacioId: string): Promise<PagoPendiente[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, student_id, amount, paid_on, declared_at, note, receipt_url')
    .eq('tenant_id', espacioId)
    .eq('status', 'declared')
    .order('declared_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => {
    const r = p as Record<string, unknown>;
    return {
      id: String(r.id),
      student_id: String(r.student_id),
      amount: num(r.amount),
      paid_on: (r.paid_on as string) ?? null,
      declared_at: String(r.declared_at),
      note: (r.note as string) ?? null,
      receipt_url: (r.receipt_url as string) ?? null,
    };
  });
}

// Junta las tres cosas en una sola lista lista para mostrar.
// El cruce se hace acá y no en la base porque la vista student_account no
// trae el nombre del alumno, y agregarlo pedía una migración nueva para algo
// que con esta cantidad de alumnos se resuelve en el navegador sin costo.
export type FilaDeuda = {
  alumno: Alumno;
  saldo: number;
  pendiente: number;
};

export async function traerDeudas(espacioId: string): Promise<FilaDeuda[]> {
  const [alumnos, cuentas, pagos] = await Promise.all([
    traerAlumnos(espacioId),
    traerCuentas(espacioId),
    traerPagosPendientes(espacioId),
  ]);

  const saldoPorAlumno = new Map(cuentas.map((c) => [c.student_id, c.saldo]));
  const pendientePorAlumno = new Map<string, number>();
  pagos.forEach((p) => {
    pendientePorAlumno.set(p.student_id, (pendientePorAlumno.get(p.student_id) ?? 0) + p.amount);
  });

  return alumnos.map((a) => ({
    alumno: a,
    saldo: saldoPorAlumno.get(a.id) ?? 0,
    pendiente: pendientePorAlumno.get(a.id) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// CONFIRMAR UN PAGO — el corazón de la conciliación
// ---------------------------------------------------------------------------
export type PagoPorConfirmar = PagoPendiente & { alumno: string };

export async function traerPagosPorConfirmar(espacioId: string): Promise<PagoPorConfirmar[]> {
  const [pagos, alumnos] = await Promise.all([
    traerPagosPendientes(espacioId),
    traerAlumnos(espacioId),
  ]);
  const nombre = new Map(alumnos.map((a) => [a.id, a.full_name]));
  return pagos.map((p) => ({ ...p, alumno: nombre.get(p.student_id) ?? 'Alumno' }));
}

export type ResultadoConfirmacion = { imputado: number; sinImputar: number };

// Llama a la función confirmar_pago de la migración 0006.
//
// Toda la lógica vive en la base a propósito: confirmar es cambiar el estado
// del pago Y repartirlo entre los cargos abiertos, y esos dos pasos tienen que
// pasar juntos o no pasar. Desde acá es un solo llamado que no se puede
// cortar por la mitad.
export async function confirmarPago(pagoId: string): Promise<ResultadoConfirmacion> {
  const { data, error } = await supabase.rpc('confirmar_pago', { p_pago_id: pagoId });
  if (error) throw new Error(error.message);
  const fila = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  return {
    imputado: num(fila?.imputado),
    sinImputar: num(fila?.sin_imputar),
  };
}

// Rechazar es un solo paso, así que va directo: no hace falta una función.
// El .eq('status','declared') es una red: si el pago ya se confirmó mientras
// mirabas la pantalla, esto no lo toca en vez de pisarlo.
export async function rechazarPago(pagoId: string): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({ status: 'rejected' })
    .eq('id', pagoId)
    .eq('status', 'declared');
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// ALTAS — crear grupo, anotar alumno, inscribirlo
//
// El tenant_id se manda explícito en cada alta. No es opcional: las tablas lo
// exigen, y la regla de RLS lo compara contra tus espacios. Si mandaras el de
// otro profesor, la base rechazaría la escritura.
// ---------------------------------------------------------------------------
export async function crearGrupo(
  espacioId: string,
  datos: {
    name: string;
    format: Formato;
    level: string | null;
    capacity: number | null;
    start_date: string | null;
    end_date: string | null;
  },
): Promise<Grupo> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ tenant_id: espacioId, ...datos })
    .select('id, name, format, level, capacity, start_date, end_date, status')
    .single();
  if (error) throw new Error(error.message);
  return data as Grupo;
}

export async function crearAlumno(
  espacioId: string,
  datos: { full_name: string; email: string | null; phone: string | null },
): Promise<Alumno> {
  const { data, error } = await supabase
    .from('students')
    .insert({ tenant_id: espacioId, ...datos })
    .select('id, full_name, status')
    .single();
  if (error) throw new Error(error.message);
  return data as Alumno;
}

// Inscribir es lo que decide CÓMO PAGA ese alumno en ese grupo. Por eso el
// modo de cobro y el precio viven acá y no en el grupo: dentro del mismo
// grupo puede haber uno pagando por clase y otro pagando el mes.
export async function inscribir(
  espacioId: string,
  datos: {
    group_id: string;
    student_id: string;
    billing_mode: ModoCobro;
    agreed_price: number | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('enrollments')
    .insert({ tenant_id: espacioId, ...datos });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// CLASES — cargar una, y escribir su recap
//
// El recap se guarda aparte de la creación porque se escribe en otro momento:
// la clase se carga antes (o al empezar), y lo que se vio se anota al final.
// ---------------------------------------------------------------------------
export async function crearClase(
  espacioId: string,
  datos: {
    group_id: string;
    date: string;
    start_time: string | null;
    duration_min: number | null;
    title: string | null;
  },
): Promise<Clase> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ tenant_id: espacioId, ...datos })
    .select('id, date, start_time, title, recap')
    .single();
  if (error) throw new Error(error.message);
  return data as Clase;
}

export async function guardarRecap(claseId: string, recap: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ recap: recap.trim() || null })
    .eq('id', claseId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// CREAR UN ESPACIO
//
// Va por la función create_tenant de la migración 0001 y no por un insert
// común, porque crear el espacio y dejarte como dueño tienen que pasar juntos.
// De hecho la tabla tenants no tiene regla de INSERT: esta función es la única
// puerta, justamente para que no pueda quedar un espacio sin dueño.
// ---------------------------------------------------------------------------
export async function crearEspacio(
  nombre: string,
  disciplina: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_tenant', {
    p_name: nombre,
    p_discipline: disciplina,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

// ¿Esta persona es alumno de alguien?
//
// Sirve para saber quién está parado del otro lado de la pantalla cuando no
// tiene ningún espacio. Sin espacios puede ser dos cosas muy distintas: un
// profesor nuevo que se está registrando, o un alumno que entró por la puerta
// equivocada. A uno hay que ofrecerle crear su espacio; al otro no.
//
// No son categorías excluyentes: un profesor puede ser alumno de otro. Por eso
// esto decide qué se OFRECE, no qué se permite.
export async function soyAlumnoDeAlguien(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}
