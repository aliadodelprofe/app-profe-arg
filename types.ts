export type UserRole = 'admin' | 'student' | 'director';
export type DanceRole = 'Leader' | 'Follower' | 'Ambos' | 'leader' | 'follower' | 'ambos';
export type EnrollmentType = 'individual' | 'pareja';

export interface ClassRecap {
  classNumber: number; // 1..8
  title: string;
  description: string;
  driveUrl: string;
}

export interface RecapVersion {
  id: string; // e.g. "v1", "v2", "v3"
  name: string; // e.g. "Versión 1 — Fundamentos & Figuras Clásicas"
  description?: string;
  recaps: ClassRecap[];
}

export interface FormationLevelConfig {
  id: 'nivel-1' | 'nivel-2';
  name: string; // e.g. "Bachata Influence - Nivel 1"
  subtitle: string;
  totalClasses: number; // 8
  minAttendancePercent: number; // 75
  minClassesForCert: number; // 6
  activeClassNumber: number; // e.g. 5 (classes 1..5 unlocked)
  activeRecapVersionId?: string; // e.g. "v1" or "v2"
  recapVersions?: RecapVersion[];
  recaps: ClassRecap[];
}

export type ConvocatoriaStatus = 'activa' | 'finalizada' | 'proxima';

export interface PaymentMethod {
  id: string;
  name: string;
  alias: string;
  cbu: string;
  holder: string;
  bank: string;
}

export interface StudentPaymentInfo {
  cuota1?: boolean;      // Mes 1 completo
  cuota2?: boolean;      // Mes 2
  sena?: boolean;        // Seña 50% para reserva de cupo (Mes 1)
  saldoCuota1?: boolean; // Saldo 50% restante Cuota 1 (Mes 1)
  isPaused?: boolean;    // Si el alumno está pausado por falta de pago
}

export interface Convocatoria {
  id: string;
  levelId: 'nivel-1' | 'nivel-2';
  title: string; // e.g. "Nivel 1 - Septiembre a Noviembre 2025"
  period: string; // e.g. "Septiembre — Noviembre 2025"
  startDate?: string;
  endDate?: string;
  status: ConvocatoriaStatus;
  studentIds: string[]; // enrolled student user IDs
  activeClassNumber: number; // 1..8 unlocked class for recaps
  classDates?: string[]; // array of 8 dates 'YYYY-MM-DD' for classes 1..8
  attendanceMap: Record<string, number[]>; // map of studentId -> attended class numbers [1..8]

  // Weekly Schedule & Location Details
  classDay?: string;            // e.g. "Viernes", "Martes", "Sábado", etc.
  classStartTime?: string;      // e.g. "20:00"
  classEndTime?: string;        // e.g. "21:30"
  locationName?: string;        // e.g. "Sede Palermo — Scalabrini Ortiz 1240, CABA"
  locationMapUrl?: string;      // e.g. "https://maps.google.com/?q=..."

  // Recap version link
  recapVersionId?: string;      // e.g. "v1" or "v2"

  // Pricing & Payment Method Link
  priceIndividual?: string; // e.g. "$45.000"
  priceCouple?: string;     // e.g. "$80.000 ($40.000 c/u)"
  paymentMethodId?: string; // reference to PaymentMethod.id
  
  // Legacy or inline fallbacks:
  paymentAlias?: string;    // e.g. "BACHATA.INFLUENCE"
  paymentCbu?: string;      // e.g. "0000003100012345678901"
  paymentHolder?: string;   // e.g. "Tomás e Astrid Bachata Influence"
  paymentBank?: string;     // e.g. "Mercado Pago"

  // Certificates & Demo Recordings
  certificateDate?: string;      // e.g. "Sábado 29 de Noviembre"
  certificateTime?: string;      // e.g. "18:00 hs"
  certificateLocation?: string;  // e.g. "Sede Central - Palermo"
  certificateLocationMapUrl?: string; // e.g. "https://maps.google.com/?q=..."
  demoRecordingInfo?: string;    // e.g. "Grabación de Demos: Domingo 30 de Noviembre, 15:00 hs"
  demoRecordingMapUrl?: string;  // e.g. "https://maps.google.com/?q=..."

  // Dance roles, enrollment modalities, partners and payments per student in convocatoria
  studentRoles?: Record<string, DanceRole>;
  studentEnrollmentTypes?: Record<string, EnrollmentType>;
  studentPartners?: Record<string, string>; // maps studentId -> partner studentId
  studentPayments?: Record<string, StudentPaymentInfo>;
}

export const DEFAULT_AVATAR_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="%232b2927"/><path d="M64 36a22 22 0 1 0 0 44 22 22 0 0 0 0-44zM32 108c0-17.6 14.3-32 32-32s32 14.4 32 32" fill="%23e7d9cf" fill-opacity="0.8"/></svg>`;

export interface User {
  id: string;
  email: string;
  password?: string;
  isTemporaryPassword?: boolean;
  fullName: string;
  dni: string;
  avatarUrl: string;
  photoUrl?: string;
  role: UserRole;
  danceRole?: DanceRole; // 'Leader' | 'Follower' | 'Ambos'
  memberCode: string; // e.g. "TA-2026-8894"
  level: string; // e.g. "Intermedio II - Bachata Influence"
  nivel1Completed?: boolean;
  nivel2Completed?: boolean;
  nivel1Date?: string;
  nivel2Date?: string;
  
  // Formation enrollment & attendance tracking:
  activeFormationId?: 'nivel-1' | 'nivel-2' | null;
  attendanceNivel1?: number[]; // array of attended class numbers, e.g. [1, 2, 3, 4, 5, 6]
  attendanceNivel2?: number[]; // array of attended class numbers, e.g. [1, 2, 3]

  memberSince: string; // e.g. "ABRIL 2026"
  createdAt?: number | string | any;
  status: 'active' | 'pending' | 'expired';
  isPaused?: boolean; // Indicates if the student account is globally paused due to unpaid dues
  claimedBenefits: string[]; // array of benefit IDs
  clearedNotificationIds?: string[];
  readNotificationIds?: string[];
  pushEnabled: boolean;
  phone?: string;
}

export type CategoryAnnouncement = string;

export interface Comment {
  id: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  category: CategoryAnnouncement;
  content: string;
  imageUrl?: string;
  isPinned: boolean;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  authorId?: string;
  date: string;
  createdAt?: number;
  likes: number;
  likedBy: string[]; // user IDs
  comments: Comment[];
  eventDate?: string;
  location?: string;
  locationUrl?: string;
  websiteUrl?: string;
  promoCode?: string;
}

export type CategoryBenefit = string;

export interface Benefit {
  id: string;
  title: string;
  provider: string;
  discount: string; // e.g. "20% OFF"
  category: CategoryBenefit; // Primary category (for backward compatibility)
  categories?: CategoryBenefit[]; // Max 3 categories
  description: string;
  promoCode: string;
  imageUrl: string;
  validUntil: string;
  expirationDate?: string; // Optional ISO string e.g. "2026-10-31" for auto-deletion upon expiration
  location?: string;
  locationUrl?: string;
  websiteUrl?: string;
  terms: string;
  claimedCount: number;
  isHidden?: boolean;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  message?: string;
  timestamp: string;
  createdAt?: number; // millisecond timestamp
  isRead: boolean;
  type?: 'announcement' | 'benefit' | 'event' | 'reminder' | string;
  linkTab?: string;
}

export interface ScheduleClass {
  id: string;
  day: string;
  time: string;
  level: string;
  location: string;
  address: string;
  instructor: string;
}

export interface RegularClassRecap {
  id: string;
  title: string;
  description?: string;
  date?: string; // e.g. "2026-08-28" or "Viernes 28 de Agosto"
  driveUrl: string;
  createdAt?: number | string;
}

export interface RegularClass {
  id: string;
  day: string;
  time: string;
  address: string;
  level: string;
  instructor: string;
  locationMapUrl?: string;
  mapUrl?: string;
  priceMonthly?: string;
  price?: string;
  paymentMethodId?: string; // Reference to PaymentMethod.id in database
  studentIds?: string[];
  studentPayments?: Record<string, { paid: boolean; paymentDate?: string; isPaused?: boolean }>;
  monthlyPayments?: Record<string, Record<string, { paid: boolean; paymentDate?: string; isPaused?: boolean }>>;
  studentRoles?: Record<string, DanceRole>;
  recaps?: RegularClassRecap[];
}

export interface SiteConfig {
  homeCoverImage?: string;
  directorsCoverImage?: string;
  faviconUrl?: string;
  siteLogoUrl?: string;
  homeVideoUrl?: string;
  homeVideoPosterUrl?: string;
  muxPlaybackId?: string;
}

// Merchandising Types
export interface MerchConfig {
  enabled: boolean;
  batchName: string;
  batchDescription?: string;
  batchDeadline?: string;
  sizeGuideUrl?: string;
  sizingInstructionUrl?: string;
  selectedPaymentMethodId?: string;
  bankAlias?: string;
  bankCbu?: string;
  bankHolder?: string;
  bankName?: string;
}

export interface MerchProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  depositPrice?: number;
  images: string[];
  sizes: string[];
  colors?: string[];
  colorImages?: Record<string, string | string[]>;
  sizeGuideUrl?: string;
  sizeMeasurements?: Record<string, { width: string; length: string }>;
  sizingInstructionUrl?: string;
  isActive: boolean;
  category?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface MerchOrderItem {
  productId: string;
  productTitle: string;
  size: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  depositPrice: number;
  image?: string | string[];
}

export type PaymentOption = 'sena_50' | 'total_100';
export type PaymentStatus = 'pendiente' | 'sena_abonada' | 'total_abonado' | 'cancelado';
export type DeliveryStatus = 'toma_de_pedidos' | 'en_produccion' | 'proceso_de_bordado' | 'listo_para_entregar' | 'listo_para_retirar' | 'entregado' | 'pendiente';

export interface MerchOrder {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userDni?: string;
  userPhone?: string;
  items: MerchOrderItem[];
  paymentOption: PaymentOption;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  studentProofUrl?: string;
  notes?: string;
  adminNotes?: string;
  batchName?: string;
  createdAt: number;
  updatedAt: number;
}

