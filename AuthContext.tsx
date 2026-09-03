import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, Announcement, Benefit, PushNotification, Comment, FormationLevelConfig, Convocatoria, ConvocatoriaStatus, RegularClass, RegularClassRecap, PaymentMethod, ClassRecap, RecapVersion, DanceRole, EnrollmentType, StudentPaymentInfo, SiteConfig, CategoryAnnouncement, DEFAULT_AVATAR_URL, MerchConfig, MerchProduct, MerchOrder, PaymentStatus, DeliveryStatus } from '../types';
import { INITIAL_USERS, INITIAL_ANNOUNCEMENTS, INITIAL_BENEFITS, INITIAL_NOTIFICATIONS, INITIAL_FORMATION_CONFIGS, INITIAL_CONVOCATORIAS, INITIAL_REGULAR_CLASSES, INITIAL_PAYMENT_METHODS, INITIAL_SITE_CONFIG, INITIAL_MERCH_CONFIG, INITIAL_MERCH_PRODUCTS } from '../data/initialData';
import { db, auth, googleProvider, signInWithPopup, signOut as firebaseSignOut, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { checkUserNivel1Completed, checkUserNivel2Completed, isConvocatoriaFinishedByDate } from '../utils/convocatoriaUtils';
import { compressProductPayload } from '../utils/imageUtils';
import { formatMemberSinceDate } from '../utils/dateUtils';
import { deleteVideoFromStorage } from '../utils/storageCleanup';
import { safeLocalStorageSet, safeLocalStorageGet, safeLocalStorageRemove } from '../utils/safeStorage';

// Helper to recursively strip undefined values for Firestore setDoc operations while preserving all required fields
const cleanForFirestore = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        cleaned[key] = cleanForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

interface AuthContextType {
  currentUser: User | null;
  usersList: User[];
  siteConfig: SiteConfig;
  updateSiteConfig: (newConfig: Partial<SiteConfig>) => Promise<void>;
  announcements: Announcement[];
  benefits: Benefit[];
  notifications: PushNotification[];
  formationConfigs: FormationLevelConfig[];
  convocatorias: Convocatoria[];
  paymentMethods: PaymentMethod[];
  addPaymentMethod: (data: Omit<PaymentMethod, 'id'>) => void;
  updatePaymentMethod: (id: string, updatedData: Partial<PaymentMethod>) => void;
  deletePaymentMethod: (id: string) => void;
  regularClasses: RegularClass[];
  addRegularClass: (data: Omit<RegularClass, 'id'>) => void;
  updateRegularClass: (id: string, updatedData: Partial<RegularClass>) => void;
  deleteRegularClass: (id: string) => void;
  assignStudentToRegularClass: (classId: string, userId: string, role?: DanceRole) => void;
  updateStudentRegularClassRole: (classId: string, userId: string, role: DanceRole) => void;
  removeStudentFromRegularClass: (classId: string, userId: string) => void;
  toggleRegularClassStudentPayment: (classId: string, userId: string, paid?: boolean, monthKey?: string) => void;
  addRegularClassRecap: (classId: string, recapData: Omit<RegularClassRecap, 'id' | 'createdAt'>) => void;
  updateRegularClassRecap: (classId: string, recapId: string, updatedData: Partial<RegularClassRecap>) => void;
  deleteRegularClassRecap: (classId: string, recapId: string) => void;
  updateRegularClassRecaps: (classId: string, recaps: RegularClassRecap[]) => void;
  
  // Merchandising Operations & State
  merchConfig: MerchConfig;
  updateMerchConfig: (newConfig: Partial<MerchConfig>) => Promise<void>;
  merchProducts: MerchProduct[];
  addMerchProduct: (productData: Omit<MerchProduct, 'id' | 'createdAt'>) => Promise<void>;
  updateMerchProduct: (id: string, updatedData: Partial<MerchProduct>) => Promise<void>;
  deleteMerchProduct: (id: string) => Promise<void>;
  merchOrders: MerchOrder[];
  createMerchOrder: (orderData: Omit<MerchOrder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; orderId?: string; message?: string }>;
  updateMerchOrderStatus: (
    orderId: string,
    paymentStatus?: PaymentStatus,
    deliveryStatus?: DeliveryStatus,
    adminNotes?: string,
    paidAmount?: number
  ) => Promise<void>;
  deleteMerchOrder: (orderId: string) => Promise<void>;
  merchCategories: string[];
  addMerchCategory: (categoryName: string) => Promise<void>;
  editMerchCategory: (oldCategoryName: string, newCategoryName: string) => Promise<void>;
  deleteMerchCategory: (categoryName: string) => Promise<void>;

  activeTab: 'inicio' | 'comunicaciones' | 'beneficios' | 'formacion' | 'pagos' | 'tomasyastrid' | 'notificaciones' | 'merchandising';
  setActiveTab: (tab: 'inicio' | 'comunicaciones' | 'beneficios' | 'formacion' | 'pagos' | 'tomasyastrid' | 'notificaciones' | 'merchandising' | string) => void;

  login: (email: string, password?: string) => { success: boolean; error?: string };
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => { success: boolean; message: string };
  createStudentByAdmin: (studentData: {
    fullName: string;
    email: string;
    dni?: string;
    phone?: string;
    level?: string;
    tempPassword?: string;
    role?: 'admin' | 'student';
    nivel1Completed?: boolean;
    nivel2Completed?: boolean;
    activeFormationId?: 'nivel-1' | 'nivel-2' | null;
  }) => { success: boolean; message: string; student?: User };
  updateStudentGraduation: (userId: string, nivel1Completed: boolean, nivel2Completed: boolean) => void;
  updateStudentByAdmin: (userId: string, updatedData: Partial<User>) => void;
  deleteStudentByAdmin: (userId: string) => void;
  switchUser: (userId: string) => void;
  updateProfile: (updatedData: Partial<User>) => void;
  claimBenefit: (benefitId: string) => void;
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'likes' | 'likedBy' | 'comments' | 'date'>) => void;
  updateAnnouncement: (id: string, updatedData: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  toggleLikeAnnouncement: (id: string) => void;
  addComment: (announcementId: string, commentText: string) => void;
  addBenefit: (benefit: Omit<Benefit, 'id' | 'claimedCount'>) => void;
  updateBenefit: (id: string, updatedData: Partial<Benefit>) => void;
  deleteBenefit: (id: string) => void;
  benefitCategories: string[];
  addBenefitCategory: (categoryName: string) => void;
  editBenefitCategory: (oldCategoryName: string, newCategoryName: string) => void;
  deleteBenefitCategory: (categoryName: string) => void;
  announcementCategories: string[];
  addAnnouncementCategory: (categoryName: string) => void;
  editAnnouncementCategory: (oldCategoryName: string, newCategoryName: string) => void;
  deleteAnnouncementCategory: (categoryName: string) => void;
  togglePushNotifications: () => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  sendPushBroadcast: (title: string, body: string, linkTab?: string) => void;
  updateFormationRecap: (
    levelId: 'nivel-1' | 'nivel-2',
    classNumber: number,
    title: string,
    description: string,
    driveUrl: string
  ) => void;
  createRecapVersion: (levelId: 'nivel-1' | 'nivel-2', name: string, description?: string) => void;
  duplicateRecapVersion: (levelId: 'nivel-1' | 'nivel-2', sourceVersionId: string, newName?: string) => void;
  updateRecapVersionDetails: (levelId: 'nivel-1' | 'nivel-2', versionId: string, name: string, description?: string) => void;
  deleteRecapVersion: (levelId: 'nivel-1' | 'nivel-2', versionId: string) => void;
  updateVersionRecap: (
    levelId: 'nivel-1' | 'nivel-2',
    versionId: string,
    classNumber: number,
    title: string,
    description: string,
    driveUrl: string
  ) => void;
  setActiveRecapVersionForLevel: (levelId: 'nivel-1' | 'nivel-2', versionId: string) => void;
  updateActiveClassNumber: (levelId: 'nivel-1' | 'nivel-2', activeClassNumber: number) => void;
  toggleStudentClassAttendance: (userId: string, levelId: 'nivel-1' | 'nivel-2', classNumber: number) => void;
  assignStudentFormation: (userId: string, activeFormationId: 'nivel-1' | 'nivel-2' | null) => void;
  
  // Convocatoria operations
  addConvocatoria: (data: {
    levelId: 'nivel-1' | 'nivel-2';
    title: string;
    period: string;
    startDate?: string;
    endDate?: string;
    status: ConvocatoriaStatus;
    classDay?: string;
    classStartTime?: string;
    classEndTime?: string;
    locationName?: string;
    locationMapUrl?: string;
    recapVersionId?: string;
    priceIndividual?: string;
    priceCouple?: string;
    paymentMethodId?: string;
    paymentAlias?: string;
    paymentCbu?: string;
    paymentHolder?: string;
    paymentBank?: string;
    certificateDate?: string;
    certificateTime?: string;
    certificateLocation?: string;
    certificateLocationMapUrl?: string;
    demoRecordingInfo?: string;
    demoRecordingMapUrl?: string;
  }) => void;
  updateConvocatoria: (id: string, updatedData: Partial<Convocatoria>) => void;
  deleteConvocatoria: (id: string) => void;
  toggleStudentConvocatoriaAttendance: (convocatoriaId: string, userId: string, classNumber: number) => void;
  toggleStudentConvocatoriaPayment: (convocatoriaId: string, userId: string, cuotaKey: 'cuota1' | 'cuota2' | 'sena' | 'saldoCuota1') => void;
  toggleStudentConvocatoriaPause: (convocatoriaId: string, userId: string) => void;
  toggleStudentRegularClassPause: (classId: string, userId: string) => void;
  toggleGlobalStudentPause: (userId: string) => void;
  assignStudentToConvocatoria: (convocatoriaId: string, userId: string, role?: DanceRole, enrollmentType?: EnrollmentType, partnerId?: string) => void;
  updateStudentConvocatoriaRole: (convocatoriaId: string, userId: string, role: DanceRole) => void;
  updateStudentConvocatoriaEnrollmentType: (convocatoriaId: string, userId: string, type: EnrollmentType, partnerId?: string) => void;
  updateStudentConvocatoriaPartner: (convocatoriaId: string, userId: string, partnerId: string) => void;
  removeStudentFromConvocatoria: (convocatoriaId: string, userId: string) => void;
  updateConvocatoriaActiveClassNumber: (convocatoriaId: string, activeClassNumber: number) => void;
  updateConvocatoriaClassDates: (convocatoriaId: string, classDates: string[]) => void;

  showPassModal: boolean;
  setShowPassModal: (show: boolean) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  showLogoutConfirmModal: boolean;
  setShowLogoutConfirmModal: (show: boolean) => void;
  confirmLogout: () => void;
  showAdminFormationModal: boolean;
  setShowAdminFormationModal: (show: boolean) => void;
  liveToast: any;
  setLiveToast: (toast: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'bachata_influence_current_user_v5';
const LOCAL_STORAGE_USERS_LIST = 'bachata_influence_users_list_v5';
const LOCAL_STORAGE_ANNOUNCEMENTS = 'bachata_influence_announcements_v2';
const LOCAL_STORAGE_BENEFITS = 'bachata_influence_benefits_v2';
const LOCAL_STORAGE_BENEFIT_CATEGORIES = 'bachata_benefit_categories_v2';
const LOCAL_STORAGE_ANNOUNCEMENT_CATEGORIES = 'bachata_announcement_categories_v2';
const LOCAL_STORAGE_NOTIFS = 'bachata_influence_notifs_v2';
const LOCAL_STORAGE_FORMATIONS = 'bachata_influence_formation_configs_v2';
const LOCAL_STORAGE_CONVOCATORIAS = 'bachata_influence_convocatorias_v5';
const LOCAL_STORAGE_REGULAR_CLASSES = 'bachata_regular_classes_v1';
const LOCAL_STORAGE_PAYMENT_METHODS = 'bachata_payment_methods_v1';

const DEMO_ANN_IDS = ['ann-1', 'ann-2', 'ann-3'];
const DEMO_BEN_IDS = ['ben-1', 'ben-2', 'ben-3', 'ben-4', 'ben-5'];

export const isBenefitExpired = (benefit: Benefit): boolean => {
  if (benefit.expirationDate) {
    const expDate = new Date(benefit.expirationDate + 'T23:59:59');
    if (!isNaN(expDate.getTime()) && expDate.getTime() < Date.now()) {
      return true;
    }
  }
  if (benefit.validUntil && /^\d{4}-\d{2}-\d{2}$/.test(benefit.validUntil.trim())) {
    const expDate = new Date(benefit.validUntil.trim() + 'T23:59:59');
    if (!isNaN(expDate.getTime()) && expDate.getTime() < Date.now()) {
      return true;
    }
  }
  return false;
};

type AppTab = 'inicio' | 'comunicaciones' | 'beneficios' | 'formacion' | 'pagos' | 'tomasyastrid' | 'notificaciones' | 'merchandising';

const normalizeTab = (tab: string): AppTab => {
  const t = tab.toLowerCase().trim().replace(/^#\/?/, '');
  if (t === 'anuncios' || t === 'comunicaciones') return 'comunicaciones';
  if (t === 'beneficios' || t === 'beneficio') return 'beneficios';
  if (t === 'formacion' || t === 'formaciones' || t === 'cursos') return 'formacion';
  if (t === 'pagos' || t === 'cuotas' || t === 'deudas' || t === 'banco') return 'pagos';
  if (t === 'directores' || t === 'tomasyastrid' || t === 'tomas-y-astrid') return 'pagos';
  if (t === 'notificaciones' || t === 'notifs') return 'notificaciones';
  if (t === 'merchandising' || t === 'merch' || t === 'remeras' || t === 'tienda') return 'merchandising';
  return 'inicio';
};

const getHashFromTab = (tab: AppTab): string => {
  switch (tab) {
    case 'comunicaciones': return 'anuncios';
    case 'beneficios': return 'beneficios';
    case 'formacion': return 'formacion';
    case 'pagos': return 'pagos';
    case 'tomasyastrid': return 'pagos';
    case 'notificaciones': return 'notificaciones';
    case 'merchandising': return 'remeras';
    case 'inicio': default: return 'inicio';
  }
};

const getTabFromHash = (): AppTab => {
  if (typeof window === 'undefined') return 'inicio';
  const hash = window.location.hash;
  if (!hash || hash === '#') return 'inicio';
  return normalizeTab(hash);
};

export const DEFAULT_ANNOUNCEMENT_CATEGORIES: string[] = [];
export const DEFAULT_BENEFIT_CATEGORIES: string[] = [];
export const DEFAULT_MERCH_CATEGORIES: string[] = ['Remeras', 'Crop Top', 'Pantalones', 'Buzos', 'Accesorios'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const OBSOLETE_EMAILS = ['tomas@bachatainfluence.ar', 'astrid@bachatainfluence.ar'];

  const [usersList, setUsersList] = useState<User[]>(() => {
    const saved = safeLocalStorageGet(LOCAL_STORAGE_USERS_LIST);
    if (saved) {
      try {
        return JSON.parse(saved).filter((u: User) => !OBSOLETE_EMAILS.includes(u.email.toLowerCase()));
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [formationConfigs, setFormationConfigs] = useState<FormationLevelConfig[]>(() => {
    const saved = safeLocalStorageGet(LOCAL_STORAGE_FORMATIONS);
    return saved ? JSON.parse(saved) : INITIAL_FORMATION_CONFIGS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = safeLocalStorageGet(LOCAL_STORAGE_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (!currentUser) return;
    if (auth.currentUser) return;
    signInAnonymously(auth).catch((err) => {
      console.warn('No se pudo crear la sesión de Firebase Auth para el usuario actual:', err);
    });
  }, [currentUser]);

  const announcementsRef = useRef<Announcement[]>([]);
  const benefitsRef = useRef<Benefit[]>([]);

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = safeLocalStorageGet(LOCAL_STORAGE_ANNOUNCEMENTS);
    if (saved) {
      try {
        const parsed: Announcement[] = JSON.parse(saved);
        return parsed.filter(a => !DEMO_ANN_IDS.includes(a.id));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [benefits, setBenefits] = useState<Benefit[]>(() => {
    const saved = safeLocalStorageGet(LOCAL_STORAGE_BENEFITS);
    if (saved) {
      try {
        const parsed: Benefit[] = JSON.parse(saved);
        return parsed.filter(b => !DEMO_BEN_IDS.includes(b.id) && !isBenefitExpired(b));
      } catch {
        return [];
      }
    }
    return [];
  });

  const announcementCategoriesRef = useRef<string[]>([]);
  const benefitCategoriesRef = useRef<string[]>([]);

  const [benefitCategories, setBenefitCategories] = useState<string[]>(() => {
    const saved = safeLocalStorageGet(LOCAL_STORAGE_BENEFIT_CATEGORIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.map((s: any) => String(s).trim()).filter(c => c && c.toLowerCase() !== 'general');
          if (clean.length > 0) return Array.from(new Set(clean));
        }
      } catch {}
    }
    return [];
  });

  const [announcementCategories, setAnnouncementCategories] = useState<string[]>(() => {
    const saved = safeLocalStorageGet(LOCAL_STORAGE_ANNOUNCEMENT_CATEGORIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.map((s: any) => String(s).trim()).filter(c => c && c.toLowerCase() !== 'general');
          if (clean.length > 0) return Array.from(new Set(clean));
        }
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    announcementsRef.current = announcements;
  }, [announcements]);

  useEffect(() => {
    benefitsRef.current = benefits;
  }, [benefits]);

  useEffect(() => {
    announcementCategoriesRef.current = announcementCategories;
  }, [announcementCategories]);

  useEffect(() => {
    benefitCategoriesRef.current = benefitCategories;
  }, [benefitCategories]);

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  const [rawNotifications, setRawNotifications] = useState<PushNotification[]>([]);
  const [localClearedNotifIds, setLocalClearedNotifIds] = useState<string[]>(() => {
    try {
      const saved = safeLocalStorageGet('bachata_cleared_notifs_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [localReadNotifIds, setLocalReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = safeLocalStorageGet('bachata_read_notifs_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>(() => {
    const saved = safeLocalStorageGet(LOCAL_STORAGE_CONVOCATORIAS);
    return saved ? JSON.parse(saved) : INITIAL_CONVOCATORIAS;
  });

  const [regularClasses, setRegularClasses] = useState<RegularClass[]>(() => {
    const saved = safeLocalStorageGet(LOCAL_STORAGE_REGULAR_CLASSES);
    return saved ? JSON.parse(saved) : INITIAL_REGULAR_CLASSES;
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => {
    try {
      const saved = safeLocalStorageGet(LOCAL_STORAGE_PAYMENT_METHODS);
      return saved ? JSON.parse(saved) : INITIAL_PAYMENT_METHODS;
    } catch {
      return INITIAL_PAYMENT_METHODS;
    }
  });

  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => {
    try {
      const saved = safeLocalStorageGet('bachata_site_config_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.muxPlaybackId) {
          parsed.muxPlaybackId = INITIAL_SITE_CONFIG.muxPlaybackId;
        }
        return { ...INITIAL_SITE_CONFIG, ...parsed };
      }
      return INITIAL_SITE_CONFIG;
    } catch {
      return INITIAL_SITE_CONFIG;
    }
  });

  useEffect(() => {
    safeLocalStorageSet('bachata_site_config_v1', JSON.stringify(siteConfig));
  }, [siteConfig]);

  const updateSiteConfig = async (newConfig: Partial<SiteConfig>) => {
    const updated = { ...siteConfig, ...newConfig };
    setSiteConfig(updated);
    try {
      await setDoc(doc(db, 'settings', 'siteConfig'), cleanForFirestore(updated), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/siteConfig');
    }
  };

  // Merchandising States & Handlers
  const [merchConfig, setMerchConfig] = useState<MerchConfig>(() => {
    try {
      const saved = safeLocalStorageGet('bachata_merch_config_v1');
      return saved ? JSON.parse(saved) : INITIAL_MERCH_CONFIG;
    } catch {
      return INITIAL_MERCH_CONFIG;
    }
  });

  const [merchProducts, setMerchProducts] = useState<MerchProduct[]>(() => {
    try {
      const saved = safeLocalStorageGet('bachata_merch_products_v1');
      return saved ? JSON.parse(saved) : INITIAL_MERCH_PRODUCTS;
    } catch {
      return INITIAL_MERCH_PRODUCTS;
    }
  });

  const [merchOrders, setMerchOrders] = useState<MerchOrder[]>(() => {
    try {
      const saved = safeLocalStorageGet('bachata_merch_orders_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [merchCategories, setMerchCategories] = useState<string[]>(() => {
    try {
      const saved = safeLocalStorageGet('bachata_merch_categories_v1');
      return saved ? JSON.parse(saved) : DEFAULT_MERCH_CATEGORIES;
    } catch {
      return DEFAULT_MERCH_CATEGORIES;
    }
  });

  useEffect(() => {
    safeLocalStorageSet('bachata_merch_categories_v1', JSON.stringify(merchCategories));
  }, [merchCategories]);

  useEffect(() => {
    safeLocalStorageSet('bachata_merch_config_v1', JSON.stringify(merchConfig));
  }, [merchConfig]);

  useEffect(() => {
    safeLocalStorageSet('bachata_merch_products_v1', JSON.stringify(merchProducts));
  }, [merchProducts]);

  useEffect(() => {
    safeLocalStorageSet('bachata_merch_orders_v1', JSON.stringify(merchOrders));
  }, [merchOrders]);

  const updateMerchConfig = async (newConfig: Partial<MerchConfig>) => {
    const updated = { ...merchConfig, ...newConfig };
    setMerchConfig(updated);
    try {
      await setDoc(doc(db, 'settings', 'merchConfig'), cleanForFirestore(updated), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/merchConfig');
    }
  };

  const addMerchProduct = async (productData: Omit<MerchProduct, 'id' | 'createdAt'>) => {
    const newId = `prod-${Date.now()}`;
    const newProduct: MerchProduct = {
      ...productData,
      id: newId,
      createdAt: Date.now()
    };
    setMerchProducts(prev => [newProduct, ...prev]);
    try {
      const compressed = await compressProductPayload(newProduct);
      await setDoc(doc(db, 'merch_products', newId), cleanForFirestore(compressed));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'merch_products/' + newId);
    }
  };

  const updateMerchProduct = async (id: string, updatedData: Partial<MerchProduct>) => {
    setMerchProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatedData, updatedAt: Date.now() } : p));
    try {
      const payload = { ...updatedData, updatedAt: Date.now() };
      const compressed = await compressProductPayload(payload);
      await updateDoc(doc(db, 'merch_products', id), cleanForFirestore(compressed));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'merch_products/' + id);
    }
  };

  const deleteMerchProduct = async (id: string) => {
    setMerchProducts(prev => prev.filter(p => p.id !== id));
    try {
      await deleteDoc(doc(db, 'merch_products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'merch_products/' + id);
    }
  };

  const createMerchOrder = async (orderData: Omit<MerchOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; orderId?: string; message?: string }> => {
    const newId = `order-${Date.now()}`;
    const newOrder: MerchOrder = {
      ...orderData,
      id: newId,
      batchName: merchConfig.batchName,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setMerchOrders(prev => [newOrder, ...prev]);
    try {
      await setDoc(doc(db, 'merch_orders', newId), cleanForFirestore(newOrder));
      return { success: true, orderId: newId };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'merch_orders/' + newId);
      return { success: false, message: 'Error al registrar la compra en la base de datos.' };
    }
  };

  const updateMerchOrderStatus = async (
    orderId: string,
    paymentStatus?: PaymentStatus,
    deliveryStatus?: DeliveryStatus,
    adminNotes?: string,
    paidAmount?: number
  ) => {
    const updatePayload: Partial<MerchOrder> = { updatedAt: Date.now() };
    if (paymentStatus) updatePayload.paymentStatus = paymentStatus;
    if (deliveryStatus) updatePayload.deliveryStatus = deliveryStatus;
    if (adminNotes !== undefined) updatePayload.adminNotes = adminNotes;
    if (paidAmount !== undefined) updatePayload.paidAmount = paidAmount;

    setMerchOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatePayload } : o));
    try {
      await updateDoc(doc(db, 'merch_orders', orderId), cleanForFirestore(updatePayload));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'merch_orders/' + orderId);
    }
  };

  const deleteMerchOrder = async (orderId: string) => {
    setMerchOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      await deleteDoc(doc(db, 'merch_orders', orderId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'merch_orders/' + orderId);
    }
  };

  const addMerchCategory = async (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    if (merchCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) return;

    const updated = [...merchCategories, trimmed];
    setMerchCategories(updated);
    try {
      await setDoc(doc(db, 'settings', 'categories'), { merchCategories: updated }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/categories');
    }
  };

  const editMerchCategory = async (oldCategoryName: string, newCategoryName: string) => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    const updated = merchCategories.map(c => c === oldCategoryName ? trimmed : c);
    setMerchCategories(updated);

    setMerchProducts(prev => prev.map(p => p.category === oldCategoryName ? { ...p, category: trimmed } : p));

    try {
      await setDoc(doc(db, 'settings', 'categories'), { merchCategories: updated }, { merge: true });
      const affected = merchProducts.filter(p => p.category === oldCategoryName);
      for (const p of affected) {
        updateDoc(doc(db, 'merch_products', p.id), { category: trimmed }).catch(() => {});
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/categories');
    }
  };

  const deleteMerchCategory = async (categoryName: string) => {
    const updated = merchCategories.filter(c => c !== categoryName);
    setMerchCategories(updated);
    try {
      await setDoc(doc(db, 'settings', 'categories'), { merchCategories: updated }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'settings/categories');
    }
  };

  const [activeTab, setActiveTabState] = useState<AppTab>(() => getTabFromHash());

  const setActiveTab = useCallback((tab: AppTab | string) => {
    const normalized = normalizeTab(tab);
    setActiveTabState(normalized);
    if (typeof window !== 'undefined') {
      const targetHash = `#/${getHashFromTab(normalized)}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, '', targetHash);
      }
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const tabFromHash = getTabFromHash();
      setActiveTabState(tabFromHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const targetHash = `#/${getHashFromTab(activeTab)}`;
      if (!window.location.hash || window.location.hash === '#') {
        window.history.replaceState(null, '', targetHash);
      }
    }
  }, []);
  const [showPassModal, setShowPassModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState<boolean>(false);
  const [showAdminFormationModal, setShowAdminFormationModal] = useState<boolean>(false);
  const [liveToast, setLiveToast] = useState<PushNotification | null>(null);

  const usersListRef = useRef<User[]>(usersList);
  useEffect(() => {
    usersListRef.current = usersList;
    safeLocalStorageSet(LOCAL_STORAGE_USERS_LIST, JSON.stringify(usersList));
  }, [usersList]);

  const formationConfigsRef = useRef<FormationLevelConfig[]>(formationConfigs);
  useEffect(() => {
    formationConfigsRef.current = formationConfigs;
    safeLocalStorageSet(LOCAL_STORAGE_FORMATIONS, JSON.stringify(formationConfigs));
  }, [formationConfigs]);

  const convocatoriasRef = useRef<Convocatoria[]>(convocatorias);
  useEffect(() => {
    convocatoriasRef.current = convocatorias;
    safeLocalStorageSet(LOCAL_STORAGE_CONVOCATORIAS, JSON.stringify(convocatorias));
  }, [convocatorias]);

  const regularClassesRef = useRef<RegularClass[]>(regularClasses);
  useEffect(() => {
    regularClassesRef.current = regularClasses;
    safeLocalStorageSet(LOCAL_STORAGE_REGULAR_CLASSES, JSON.stringify(regularClasses));
  }, [regularClasses]);

  const paymentMethodsRef = useRef<PaymentMethod[]>(paymentMethods);
  useEffect(() => {
    paymentMethodsRef.current = paymentMethods;
    safeLocalStorageSet(LOCAL_STORAGE_PAYMENT_METHODS, JSON.stringify(paymentMethods));
  }, [paymentMethods]);

  const currentUserRef = useRef<User | null>(currentUser);

  useEffect(() => {
    currentUserRef.current = currentUser;
    if (currentUser) {
      safeLocalStorageSet(LOCAL_STORAGE_USER_KEY, JSON.stringify(currentUser));
    } else {
      safeLocalStorageRemove(LOCAL_STORAGE_USER_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_ANNOUNCEMENTS, JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_BENEFITS, JSON.stringify(benefits));
  }, [benefits]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_BENEFIT_CATEGORIES, JSON.stringify(benefitCategories));
  }, [benefitCategories]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_ANNOUNCEMENT_CATEGORIES, JSON.stringify(announcementCategories));
  }, [announcementCategories]);

  // Derived visible & read-filtered notifications for current user/device
  const currentClearedNotifs = Array.from(new Set([
    ...(localClearedNotifIds || []),
    ...(currentUser?.clearedNotificationIds || [])
  ]));

  const currentReadNotifs = Array.from(new Set([
    ...(localReadNotifIds || []),
    ...(currentUser?.readNotificationIds || [])
  ]));

  const notifications = rawNotifications
    .filter(n => !currentClearedNotifs.includes(n.id))
    .filter(n => !n.title?.toLowerCase().includes('push activadas') && !n.body?.toLowerCase().includes('vas a recibir avisos al instante'))
    .map(n => ({
      ...n,
      isRead: n.isRead || currentReadNotifs.includes(n.id)
    }));

  // Seeding and Auto-sync Guards
  const usersSeededRef = useRef(false);
  const convocatoriasSeededRef = useRef(false);
  const regularClassesSeededRef = useRef(false);
  const paymentMethodsSeededRef = useRef(false);
  const formationsSeededRef = useRef(false);
  const siteConfigSeededRef = useRef(false);
  const merchConfigSeededRef = useRef(false);
  const merchProductsSeededRef = useRef(false);
  const categoriesSeededRef = useRef(false);
  const autoSyncedUsersRef = useRef<Set<string>>(new Set());

  // Auto-sync level completion
  useEffect(() => {
    if (!usersList.length || !convocatorias.length) return;

    usersList.forEach(u => {
      if (u.role === 'admin') return;

      const n1Done = checkUserNivel1Completed(u, convocatorias);
      const n2Done = checkUserNivel2Completed(u, convocatorias);

      const isFinished = u.nivel2Completed || n2Done;
      const needsLevelTextUpdate = isFinished && u.level !== 'Formación finalizada';
      const needsUpdateN1 = n1Done && !u.nivel1Completed;
      const needsUpdateN2 = n2Done && !u.nivel2Completed;

      if (needsUpdateN1 || needsUpdateN2 || needsLevelTextUpdate) {
        const syncKey = `${u.id}_${n1Done}_${n2Done}_${isFinished}_${u.level}`;
        if (autoSyncedUsersRef.current.has(syncKey)) {
          return;
        }
        autoSyncedUsersRef.current.add(syncKey);

        const updatedUser: User = {
          ...u,
          nivel1Completed: u.nivel1Completed || n1Done,
          nivel2Completed: u.nivel2Completed || n2Done,
          nivel1Date: (u.nivel1Completed || n1Done) ? (u.nivel1Date || 'Completado') : u.nivel1Date,
          nivel2Date: (u.nivel2Completed || n2Done) ? (u.nivel2Date || 'Completado') : u.nivel2Date,
          level: isFinished ? 'Formación finalizada' : u.level
        };

        setUsersList(prev => prev.map(p => p.id === u.id ? updatedUser : p));
        if (currentUserRef.current?.id === u.id) {
          setCurrentUser(updatedUser);
        }
        setDoc(doc(db, 'users', u.id), cleanForFirestore(updatedUser)).catch(() => {});
      }
    });
  }, [convocatorias, usersList]);

  // Firestore Real-time Sync
  useEffect(() => {
    const seedRef = doc(db, 'settings', 'initial_seed');
    getDoc(seedRef).then((snap) => {
      if (!snap.exists()) {
        setDoc(seedRef, { seeded: true, seededAt: new Date().toISOString() }).catch(() => {});
      }
    }).catch((err) => {
      console.warn('Seed status check skipped:', err);
    });

    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Announcement))
        .filter(ann => {
          if (DEMO_ANN_IDS.includes(ann.id)) {
            deleteDoc(doc(db, 'announcements', ann.id)).catch(() => {});
            return false;
          }
          return true;
        });

      const getTs = (ann: Announcement) => {
        if ((ann as any).createdAt) return Number((ann as any).createdAt);
        if (ann.id.startsWith('ann-')) {
          const ts = parseInt(ann.id.replace('ann-', ''), 10);
          if (!isNaN(ts)) return ts;
        }
        return 0;
      };

      data.sort((a, b) => getTs(b) - getTs(a));
      setAnnouncements(data);
    }, (error) => {
      console.warn('Sync announcements skipped/error:', error.message);
    });

    const unsubBenefits = onSnapshot(collection(db, 'benefits'), (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Benefit))
        .filter(ben => {
          if (DEMO_BEN_IDS.includes(ben.id)) {
            deleteDoc(doc(db, 'benefits', ben.id)).catch(() => {});
            return false;
          }
          return true;
        });
      setBenefits(data.filter(b => !isBenefitExpired(b)));
    }, (error) => {
      console.warn('Sync benefits skipped/error:', error.message);
    });

    const unsubCategories = onSnapshot(doc(db, 'settings', 'categories'), (snapshot) => {
      const hasPendingWrites = snapshot.metadata.hasPendingWrites;

      if (snapshot.exists()) {
        const data = snapshot.data();
        let annCats: string[] = [];
        let benCats: string[] = [];

        if (data.announcementCategories && Array.isArray(data.announcementCategories)) {
          annCats = data.announcementCategories.map((s: any) => String(s).trim()).filter(c => c && c.toLowerCase() !== 'general');
        }
        if (data.benefitCategories && Array.isArray(data.benefitCategories)) {
          benCats = data.benefitCategories.map((s: any) => String(s).trim()).filter(c => c && c.toLowerCase() !== 'general');
        }
        if (data.merchCategories && Array.isArray(data.merchCategories)) {
          const mCats = data.merchCategories.map((s: any) => String(s).trim()).filter(Boolean);
          setMerchCategories(mCats);
        } else {
          setMerchCategories(DEFAULT_MERCH_CATEGORIES);
        }

        const activeAnnCats = (announcementsRef.current || []).map(a => a.category).filter(c => c && c.toLowerCase() !== 'general');
        const activeBenCats = (benefitsRef.current || []).flatMap(b => b.categories && b.categories.length > 0 ? b.categories : [b.category]).filter(c => c && c.toLowerCase() !== 'general');

        const cleanAnnCats = Array.from(new Set([...annCats, ...activeAnnCats]));
        const cleanBenCats = Array.from(new Set([...benCats, ...activeBenCats]));

        setAnnouncementCategories(cleanAnnCats);
        setBenefitCategories(cleanBenCats);

        if (!hasPendingWrites && !categoriesSeededRef.current) {
          const firestoreAnn = data.announcementCategories || [];
          const firestoreBen = data.benefitCategories || [];
          const needsUpdate =
            firestoreAnn.some((c: string) => String(c).toLowerCase() === 'general') ||
            firestoreBen.some((c: string) => String(c).toLowerCase() === 'general') ||
            cleanAnnCats.some(c => !firestoreAnn.includes(c)) ||
            cleanBenCats.some(c => !firestoreBen.includes(c));

          if (needsUpdate) {
            categoriesSeededRef.current = true;
            setDoc(doc(db, 'settings', 'categories'), {
              announcementCategories: cleanAnnCats,
              benefitCategories: cleanBenCats
            }, { merge: true }).catch(() => {});
          }
        }
      } else {
        const activeAnnCats = (announcementsRef.current || []).map(a => a.category).filter(c => c && c.toLowerCase() !== 'general');
        const activeBenCats = (benefitsRef.current || []).flatMap(b => b.categories && b.categories.length > 0 ? b.categories : [b.category]).filter(c => c && c.toLowerCase() !== 'general');

        const cleanAnnCats = Array.from(new Set(activeAnnCats));
        const cleanBenCats = Array.from(new Set(activeBenCats));

        if (!hasPendingWrites && !categoriesSeededRef.current) {
          categoriesSeededRef.current = true;
          setDoc(doc(db, 'settings', 'categories'), {
            announcementCategories: cleanAnnCats,
            benefitCategories: cleanBenCats
          }, { merge: true }).catch(() => {});
        }

        setAnnouncementCategories(cleanAnnCats);
        setBenefitCategories(cleanBenCats);
      }
    }, (error) => {
      console.warn('Sync categories skipped/error:', error.message);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const rawData = snapshot.docs.map(doc => {
        const docData = doc.data() as User;
        return {
          id: doc.id,
          ...docData,
          memberSince: formatMemberSinceDate({
            createdAt: docData.createdAt,
            memberSince: docData.memberSince,
            id: doc.id
          })
        } as User;
      });
      const data = rawData.filter(u => !OBSOLETE_EMAILS.includes(u.email.toLowerCase()));
      if (data.length > 0) {
        setUsersList(data);
      } else if (!usersSeededRef.current && !snapshot.metadata.hasPendingWrites) {
        usersSeededRef.current = true;
        const toSeed = usersListRef.current.length > 0 ? usersListRef.current : INITIAL_USERS;
        toSeed.forEach(u => {
          setDoc(doc(db, 'users', u.id), cleanForFirestore(u), { merge: true }).catch(() => {});
        });
      }

      if (currentUserRef.current) {
        const targetId = currentUserRef.current.id;
        const targetEmail = currentUserRef.current.email.toLowerCase();
        const updatedSelf = (data.length > 0 ? data : usersListRef.current).find(u => u.id === targetId || u.email.toLowerCase() === targetEmail);
        if (updatedSelf) {
          setCurrentUser(prev => {
            if (prev && (prev.id === updatedSelf.id || prev.email.toLowerCase() === updatedSelf.email.toLowerCase())) {
              return { ...prev, ...updatedSelf };
            }
            return prev;
          });
        }
      }
    }, (error) => {
      console.warn('Sync users skipped/error:', error.message);
    });

    const unsubConvocatorias = onSnapshot(collection(db, 'convocatorias'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Convocatoria));
      if (data.length > 0) {
        setConvocatorias(data);
      } else if (!convocatoriasSeededRef.current && !snapshot.metadata.hasPendingWrites) {
        convocatoriasSeededRef.current = true;
        const toSeed = convocatoriasRef.current.length > 0 ? convocatoriasRef.current : INITIAL_CONVOCATORIAS;
        toSeed.forEach(c => {
          setDoc(doc(db, 'convocatorias', c.id), cleanForFirestore(c), { merge: true }).catch(() => {});
        });
      }
    }, (error) => {
      console.warn('Sync convocatorias skipped/error:', error.message);
    });

    const unsubRegularClasses = onSnapshot(collection(db, 'regularClasses'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegularClass));
      if (data.length > 0) {
        setRegularClasses(data);
      } else if (!regularClassesSeededRef.current && !snapshot.metadata.hasPendingWrites) {
        regularClassesSeededRef.current = true;
        const toSeed = regularClassesRef.current.length > 0 ? regularClassesRef.current : INITIAL_REGULAR_CLASSES;
        toSeed.forEach(r => {
          setDoc(doc(db, 'regularClasses', r.id), cleanForFirestore(r), { merge: true }).catch(() => {});
        });
      }
    }, (error) => {
      console.warn('Sync regularClasses skipped/error:', error.message);
    });

    const unsubFormations = onSnapshot(collection(db, 'formations'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormationLevelConfig));
      if (data.length > 0) {
        setFormationConfigs(data);
      } else if (!formationsSeededRef.current && !snapshot.metadata.hasPendingWrites) {
        formationsSeededRef.current = true;
        INITIAL_FORMATION_CONFIGS.forEach(f => {
          setDoc(doc(db, 'formations', f.id), cleanForFirestore(f), { merge: true }).catch(() => {});
        });
      }
    }, (error) => {
      console.warn('Sync formations skipped/error:', error.message);
    });

    const unsubPaymentMethods = onSnapshot(collection(db, 'paymentMethods'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod));
      if (data.length > 0) {
        setPaymentMethods(data);
      } else if (!paymentMethodsSeededRef.current && !snapshot.metadata.hasPendingWrites) {
        paymentMethodsSeededRef.current = true;
        const toSeed = paymentMethodsRef.current.length > 0 ? paymentMethodsRef.current : INITIAL_PAYMENT_METHODS;
        toSeed.forEach(pm => {
          setDoc(doc(db, 'paymentMethods', pm.id), cleanForFirestore(pm), { merge: true }).catch(() => {});
        });
      }
    }, (error) => {
      console.warn('Sync paymentMethods skipped/error:', error.message);
    });

    const unsubSiteConfig = onSnapshot(doc(db, 'settings', 'siteConfig'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SiteConfig;
        const videoIsOldOrBroken =
          !data.homeVideoUrl ||
          data.homeVideoUrl === '/api/video/recap' ||
          (typeof data.homeVideoUrl === 'string' && data.homeVideoUrl.includes('ik.imagekit.io'));

        setSiteConfig({
          homeCoverImage: data.homeCoverImage || INITIAL_SITE_CONFIG.homeCoverImage,
          directorsCoverImage: data.directorsCoverImage || INITIAL_SITE_CONFIG.directorsCoverImage,
          faviconUrl: data.faviconUrl || INITIAL_SITE_CONFIG.faviconUrl,
          siteLogoUrl: data.siteLogoUrl || INITIAL_SITE_CONFIG.siteLogoUrl,
          homeVideoUrl: !videoIsOldOrBroken ? data.homeVideoUrl : undefined,
          homeVideoPosterUrl: (data.homeVideoPosterUrl && !data.homeVideoPosterUrl.includes('ik.imagekit.io')) ? data.homeVideoPosterUrl : undefined,
          muxPlaybackId: data.muxPlaybackId || INITIAL_SITE_CONFIG.muxPlaybackId || 'JV8ISH6c93R69p7E00Tztv1YBzyOeYEl9Y9PoDz7n02KU',
        });
      } else {
        setSiteConfig(INITIAL_SITE_CONFIG);
        if (!siteConfigSeededRef.current && !(snapshot as any)?.metadata?.hasPendingWrites) {
          siteConfigSeededRef.current = true;
          setDoc(doc(db, 'settings', 'siteConfig'), INITIAL_SITE_CONFIG).catch(() => {});
        }
      }
    }, (error) => {
      console.warn('Sync siteConfig skipped/error:', error.message);
    });

    const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const now = Date.now();
      const validNotifs: PushNotification[] = [];

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as PushNotification;
        const notifId = docSnap.id;
        let createdAt = data.createdAt;

        if (!createdAt && notifId.startsWith('notif-')) {
          const parsedNum = Number(notifId.replace('notif-', ''));
          if (!isNaN(parsedNum) && parsedNum > 1600000000000) {
            createdAt = parsedNum;
          }
        }

        if (
          data.title?.toLowerCase().includes('push activadas') ||
          data.body?.toLowerCase().includes('vas a recibir avisos al instante')
        ) {
          if (!snapshot.metadata.hasPendingWrites) {
            deleteDoc(doc(db, 'notifications', notifId)).catch(err => {
              console.warn('Auto delete activation notification error:', err);
            });
          }
          return;
        }

        if (createdAt && (now - createdAt > THREE_DAYS_MS)) {
          if (!snapshot.metadata.hasPendingWrites) {
            deleteDoc(doc(db, 'notifications', notifId)).catch(err => {
              console.warn('Auto cleanup expired notification error:', err);
            });
          }
        } else {
          validNotifs.push({
            id: notifId,
            title: data.title,
            body: data.body,
            timestamp: data.timestamp || 'Ahora',
            createdAt: createdAt || now,
            isRead: Boolean(data.isRead),
            type: data.type || 'announcement',
            linkTab: data.linkTab
          });
        }
      });

      validNotifs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRawNotifications(validNotifs);
    }, (error) => {
      console.warn('Sync notifications skipped/error:', error.message);
    });

    const unsubMerchConfig = onSnapshot(doc(db, 'settings', 'merchConfig'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as MerchConfig;
        setMerchConfig({
          ...INITIAL_MERCH_CONFIG,
          ...data
        });
      } else {
        setMerchConfig(INITIAL_MERCH_CONFIG);
        if (!merchConfigSeededRef.current && !(snapshot as any)?.metadata?.hasPendingWrites) {
          merchConfigSeededRef.current = true;
          setDoc(doc(db, 'settings', 'merchConfig'), cleanForFirestore(INITIAL_MERCH_CONFIG)).catch(() => {});
        }
      }
    }, (error) => {
      console.warn('Sync merchConfig skipped/error:', error.message);
    });

    const unsubMerchProducts = onSnapshot(collection(db, 'merch_products'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MerchProduct));
      if (data.length > 0) {
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMerchProducts(data);
      } else {
        setMerchProducts(INITIAL_MERCH_PRODUCTS);
        if (!merchProductsSeededRef.current && !snapshot.metadata.hasPendingWrites) {
          merchProductsSeededRef.current = true;
          INITIAL_MERCH_PRODUCTS.forEach(p => {
            setDoc(doc(db, 'merch_products', p.id), cleanForFirestore(p)).catch(() => {});
          });
        }
      }
    }, (error) => {
      console.warn('Sync merchProducts skipped/error:', error.message);
    });

    const unsubMerchOrders = onSnapshot(collection(db, 'merch_orders'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MerchOrder));
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setMerchOrders(data);
    }, (error) => {
      console.warn('Sync merchOrders skipped/error:', error.message);
    });

    return () => {
      unsubAnnouncements();
      unsubBenefits();
      unsubCategories();
      unsubUsers();
      unsubConvocatorias();
      unsubRegularClasses();
      unsubFormations();
      unsubPaymentMethods();
      unsubSiteConfig();
      unsubNotifications();
      unsubMerchConfig();
      unsubMerchProducts();
      unsubMerchOrders();
    };

  }, []);

  const login = (email: string, password?: string): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    let found = usersList.find(u => u.email.toLowerCase() === cleanEmail);

    if (!found) {
      const initialMatch = INITIAL_USERS.find(u => u.email.toLowerCase() === cleanEmail);
      if (initialMatch) {
        found = initialMatch;
        setUsersList(prev => [...prev.filter(u => u.email.toLowerCase() !== cleanEmail), initialMatch]);
        setDoc(doc(db, 'users', initialMatch.id), cleanForFirestore(initialMatch)).catch(err => console.warn('Firestore set admin user error:', err));
      }
    }

    if (!found) {
      return {
        success: false,
        error: 'No encontramos un alumno registrado con ese correo electrónico. Consultá con Tomás & Astrid para que gestionen tu usuario.'
      };
    }

    if (password !== undefined && found.password) {
      if (found.password !== password) {
        return {
          success: false,
          error: 'Contraseña incorrecta. Verificá tu clave o solicitá un blanqueo a Tomás & Astrid.'
        };
      }
    }

    setCurrentUser(found);
    setActiveTab('inicio');
    setShowAuthModal(false);
    return { success: true };
  };

  const logout = () => {
    setShowLogoutConfirmModal(true);
  };

  const confirmLogout = () => {
    setCurrentUser(null);
    setActiveTab('inicio');
    try {
      firebaseSignOut(auth);
    } catch (e) {
      // ignore
    }
    setShowLogoutConfirmModal(false);
    setShowAuthModal(false);
  };

  const changePassword = (oldPassword: string, newPassword: string): { success: boolean; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'No hay un usuario activo.' };
    }

    if (currentUser.password && oldPassword !== currentUser.password) {
      return { success: false, message: 'La contraseña actual ingresada no es correcta.' };
    }

    if (!newPassword || newPassword.length < 3) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 3 caracteres.' };
    }

    const updated: User = {
      ...currentUser,
      password: newPassword,
      isTemporaryPassword: false
    };

    setCurrentUser(updated);
    setUsersList(prev => prev.map(u => u.id === updated.id ? updated : u));
    setDoc(doc(db, 'users', updated.id), cleanForFirestore(updated)).catch(err => console.warn('Firestore changePassword error:', err));

    return { success: true, message: '¡Contraseña actualizada exitosamente!' };
  };

  const createStudentByAdmin = (data: {
    fullName: string;
    email: string;
    dni?: string;
    phone?: string;
    level?: string;
    tempPassword?: string;
    role?: 'admin' | 'student';
    nivel1Completed?: boolean;
    nivel2Completed?: boolean;
    activeFormationId?: 'nivel-1' | 'nivel-2' | null;
  }): { success: boolean; message: string; student?: User } => {
    const cleanEmail = data.email.trim().toLowerCase();
    const exists = usersList.some(u => u.email.toLowerCase() === cleanEmail);

    if (exists) {
      return {
        success: false,
        message: 'Ya existe un usuario registrado con este correo electrónico.'
      };
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const tempPass = data.tempPassword || `TA-${Math.floor(100 + Math.random() * 900)}`;
    const userRole = data.role || 'student';
    const isDir = userRole === 'admin';
    const memberCodePrefix = isDir ? 'TA-DIR-2026-' : 'TA-ALU-2026-';

    const isN1Done = !!data.nivel1Completed || !!data.nivel2Completed;
    const isN2Done = !!data.nivel2Completed;

    let userLevelStr = data.level;
    if (!data.level || data.level === 'Bachata Influence - Nivel 1' || data.level === 'Alumno - Bachata Influence') {
      if (isN2Done) userLevelStr = 'Alumno - Graduado/a Nivel 1 y 2';
      else if (isN1Done) userLevelStr = 'Alumno - Graduado/a Nivel 1';
      else userLevelStr = isDir ? 'Director & Instructor - Bachata Influence' : 'Alumno - Bachata Influence';
    }

    let initialActiveFormation: 'nivel-1' | 'nivel-2' | null = data.activeFormationId ?? null;
    if (data.activeFormationId === undefined && !isDir) {
      if (!isN1Done && !isN2Done) {
        initialActiveFormation = 'nivel-1';
      } else {
        initialActiveFormation = null;
      }
    }

    const now = Date.now();
    const newUser: User = {
      id: `user-${now}`,
      email: data.email.trim(),
      password: tempPass,
      isTemporaryPassword: true,
      fullName: data.fullName.trim(),
      dni: data.dni?.trim() || 'Sin registrar',
      avatarUrl: DEFAULT_AVATAR_URL,
      role: userRole,
      memberCode: `${memberCodePrefix}${randomNum}`,
      level: userLevelStr,
      nivel1Completed: isN1Done,
      nivel2Completed: isN2Done,
      nivel1Date: isN1Done ? 'Reciente' : null,
      nivel2Date: isN2Done ? 'Reciente' : null,
      activeFormationId: initialActiveFormation,
      attendanceNivel1: isN1Done ? [1, 2, 3, 4, 5, 6, 7, 8] : [],
      attendanceNivel2: isN2Done ? [1, 2, 3, 4, 5, 6, 7, 8] : [],
      createdAt: now,
      memberSince: formatMemberSinceDate({ createdAt: now }),
      status: 'active',
      claimedBenefits: [],
      pushEnabled: true,
      phone: data.phone?.trim() || ''
    };

    setUsersList(prev => [newUser, ...prev]);
    setDoc(doc(db, 'users', newUser.id), cleanForFirestore(newUser)).catch(err => console.warn('Firestore set user error:', err));

    return {
      success: true,
      message: `¡Usuario para ${data.fullName} creado exitosamente con la clave temporal: ${tempPass}!`,
      student: newUser
    };
  };

  const updateStudentGraduation = (userId: string, nivel1Completed: boolean, nivel2Completed: boolean) => {
    const n1Done = nivel1Completed || nivel2Completed;
    const n2Done = nivel2Completed;

    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        const att1 = n1Done ? (u.attendanceNivel1 && u.attendanceNivel1.length >= 8 ? u.attendanceNivel1 : [1, 2, 3, 4, 5, 6, 7, 8]) : [];
        const att2 = n2Done ? (u.attendanceNivel2 && u.attendanceNivel2.length >= 8 ? u.attendanceNivel2 : [1, 2, 3, 4, 5, 6, 7, 8]) : [];

        let updatedLevel = u.level;
        if (n2Done) {
          updatedLevel = 'Formación finalizada';
        } else if (n1Done) {
          updatedLevel = 'Alumno - Graduado/a Nivel 1';
        } else if (u.role !== 'admin') {
          updatedLevel = 'Alumno Registrado (Sin Nivel Asignado)';
        }

        let newActiveFormation = u.activeFormationId;
        if (n1Done && !n2Done && u.activeFormationId === 'nivel-1') {
          newActiveFormation = null;
        } else if (!n1Done && !n2Done && (u.activeFormationId === 'nivel-1' || u.activeFormationId === 'nivel-2')) {
          newActiveFormation = null;
        }

        const updatedUser = {
          ...u,
          nivel1Completed: n1Done,
          nivel2Completed: n2Done,
          attendanceNivel1: att1,
          attendanceNivel2: att2,
          nivel1Date: n1Done ? (u.nivel1Date || 'Completado') : null,
          nivel2Date: n2Done ? (u.nivel2Date || 'Completado') : null,
          level: updatedLevel,
          activeFormationId: newActiveFormation
        };
        setDoc(doc(db, 'users', userId), cleanForFirestore(updatedUser)).catch(err => console.warn('Firestore update graduation error:', err));
        return updatedUser;
      }
      return u;
    }));

    if (currentUser?.id === userId) {
      setCurrentUser(prev => {
        if (!prev) return null;
        const att1 = n1Done ? (prev.attendanceNivel1 && prev.attendanceNivel1.length >= 8 ? prev.attendanceNivel1 : [1, 2, 3, 4, 5, 6, 7, 8]) : [];
        const att2 = n2Done ? (prev.attendanceNivel2 && prev.attendanceNivel2.length >= 8 ? prev.attendanceNivel2 : [1, 2, 3, 4, 5, 6, 7, 8]) : [];

        let updatedLevel = prev.level;
        if (n2Done) {
          updatedLevel = 'Alumno - Graduado/a Nivel 1 y 2';
        } else if (n1Done) {
          updatedLevel = 'Alumno - Graduado/a Nivel 1';
        } else if (prev.role !== 'admin') {
          updatedLevel = 'Alumno Registrado (Sin Nivel Asignado)';
        }

        let newActiveFormation = prev.activeFormationId;
        if (n1Done && !n2Done && prev.activeFormationId === 'nivel-1') {
          newActiveFormation = null;
        } else if (!n1Done && !n2Done && (prev.activeFormationId === 'nivel-1' || prev.activeFormationId === 'nivel-2')) {
          newActiveFormation = null;
        }

        return {
          ...prev,
          nivel1Completed: n1Done,
          nivel2Completed: n2Done,
          attendanceNivel1: att1,
          attendanceNivel2: att2,
          nivel1Date: n1Done ? (prev.nivel1Date || 'Completado') : null,
          nivel2Date: n2Done ? (prev.nivel2Date || 'Completado') : null,
          level: updatedLevel,
          activeFormationId: newActiveFormation
        };
      });
    }
  };

  const updateStudentByAdmin = (userId: string, updatedData: Partial<User>) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = { ...u, ...updatedData };
        setDoc(doc(db, 'users', userId), cleanForFirestore(updated)).catch(err => console.warn('Firestore update user error:', err));
        return updated;
      }
      return u;
    }));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, ...updatedData } : null);
    }
  };

  const deleteStudentByAdmin = (userId: string) => {
    setUsersList(prev => prev.filter(u => u.id !== userId));
    if (currentUser?.id === userId) {
      setCurrentUser(null);
    }
    deleteDoc(doc(db, 'users', userId)).catch(err => console.warn('Firestore delete user error:', err));
  };

  const switchUser = (userId: string) => {
    const target = usersList.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
    }
  };

  const updateProfile = (updatedData: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updatedData };
    setCurrentUser(updated);
    setUsersList(prev => prev.map(u => u.id === updated.id ? updated : u));
    setDoc(doc(db, 'users', updated.id), cleanForFirestore(updated)).catch(err => console.warn('Firestore update profile error:', err));
  };

  const claimBenefit = (benefitId: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (currentUser.claimedBenefits.includes(benefitId)) return;

    const updatedClaimed = [...currentUser.claimedBenefits, benefitId];
    updateProfile({ claimedBenefits: updatedClaimed });

    setBenefits(prev => prev.map(b => {
      if (b.id === benefitId) {
        const updatedB = { ...b, claimedCount: b.claimedCount + 1 };
        setDoc(doc(db, 'benefits', benefitId), updatedB).catch(() => {});
        return updatedB;
      }
      return b;
    }));

    const ben = benefits.find(b => b.id === benefitId);
    if (ben) {
      sendPushBroadcast(
        `🎁 Beneficio Reclamado`,
        `Obtuviste el código ${ben.promoCode} para ${ben.title}. Mostrá tu Credencial Digital al canjear.`,
        'beneficios'
      );
    }
  };

  const addAnnouncement = (data: Omit<Announcement, 'id' | 'likes' | 'likedBy' | 'comments' | 'date'>) => {
    const now = Date.now();
    const isoDate = new Date(now).toISOString();
    const newAnn: Announcement = {
      ...data,
      authorAvatar: data.authorAvatar || currentUser?.avatarUrl,
      authorId: data.authorId || currentUser?.id,
      id: `ann-${now}`,
      createdAt: now,
      likes: 0,
      likedBy: [],
      comments: [],
      date: isoDate
    };

    setAnnouncements(prev => [newAnn, ...prev]);
    setDoc(doc(db, 'announcements', newAnn.id), cleanForFirestore(newAnn)).catch(err => console.warn('Firestore add announcement error:', err));

    sendPushBroadcast(
      `📢 ${newAnn.title}`,
      newAnn.content.substring(0, 90) + '...',
      'comunicaciones'
    );
  };

  const updateAnnouncement = (id: string, updatedData: Partial<Announcement>) => {
    setAnnouncements(prev => prev.map(a => {
      if (a.id === id) {
        const merged: any = { ...a, ...updatedData };
        for (const key of ['imageUrl', 'eventDate', 'location', 'locationUrl', 'websiteUrl', 'promoCode']) {
          if (key in updatedData && !updatedData[key as keyof Partial<Announcement>]) {
            delete merged[key];
          }
        }
        const updated = merged as Announcement;
        setDoc(doc(db, 'announcements', id), cleanForFirestore(updated)).catch(err => console.warn('Firestore update announcement error:', err));
        return updated;
      }
      return a;
    }));
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    deleteDoc(doc(db, 'announcements', id)).catch(err => console.warn('Firestore delete announcement error:', err));
  };

  const toggleLikeAnnouncement = (id: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    setAnnouncements(prev => prev.map(ann => {
      if (ann.id === id) {
        const hasLiked = ann.likedBy.includes(currentUser.id);
        const newLikedBy = hasLiked
          ? ann.likedBy.filter(uid => uid !== currentUser.id)
          : [...ann.likedBy, currentUser.id];
        const updated = {
          ...ann,
          likedBy: newLikedBy,
          likes: newLikedBy.length
        };
        setDoc(doc(db, 'announcements', id), cleanForFirestore(updated)).catch(() => {});
        return updated;
      }
      return ann;
    }));
  };

  const addComment = (announcementId: string, commentText: string) => {
    if (!currentUser || !commentText.trim()) return;

    const now = Date.now();
    const newComment: Comment = {
      id: `c-${now}`,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      content: commentText.trim(),
      createdAt: new Date(now).toISOString()
    };

    setAnnouncements(prev => prev.map(ann => {
      if (ann.id === announcementId) {
        const updated = {
          ...ann,
          comments: [...ann.comments, newComment]
        };
        setDoc(doc(db, 'announcements', announcementId), cleanForFirestore(updated)).catch(() => {});
        return updated;
      }
      return ann;
    }));
  };

  const addBenefit = (data: Omit<Benefit, 'id' | 'claimedCount'>) => {
    const newBenefit: Benefit = {
      ...data,
      id: `ben-${Date.now()}`,
      claimedCount: 0
    };
    setBenefits(prev => [newBenefit, ...prev]);
    setDoc(doc(db, 'benefits', newBenefit.id), cleanForFirestore(newBenefit)).catch(err => console.warn('Firestore add benefit error:', err));

    sendPushBroadcast(
      `🎉 Nuevo Beneficio: ${newBenefit.discount}`,
      `${newBenefit.title} por ${newBenefit.provider}. ¡Ya podés utilizarlo en la app!`,
      'beneficios'
    );
  };

  const updateBenefit = (id: string, updatedData: Partial<Benefit>) => {
    setBenefits(prev => prev.map(b => {
      if (b.id === id) {
        const merged: any = { ...b, ...updatedData };
        for (const key of ['imageUrl', 'location', 'locationUrl', 'websiteUrl', 'expirationDate', 'promoCode', 'description', 'terms']) {
          if (key in updatedData && !updatedData[key as keyof Partial<Benefit>]) {
            delete merged[key];
          }
        }
        const updated = merged as Benefit;
        setDoc(doc(db, 'benefits', id), cleanForFirestore(updated)).catch(err => console.warn('Firestore update benefit error:', err));
        return updated;
      }
      return b;
    }));
  };

  const deleteBenefit = (id: string) => {
    setBenefits(prev => prev.filter(b => b.id !== id));
    deleteDoc(doc(db, 'benefits', id)).catch(err => console.warn('Firestore delete benefit error:', err));
  };

  const addBenefitCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    setBenefitCategories(prev => {
      if (prev.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      const updated = Array.from(new Set([...prev, trimmed]));
      setDoc(doc(db, 'settings', 'categories'), { benefitCategories: updated }, { merge: true }).catch(() => {});
      return updated;
    });
  };

  const editBenefitCategory = (oldCategoryName: string, newCategoryName: string) => {
    const trimmedNew = newCategoryName.trim();
    if (!trimmedNew || oldCategoryName === trimmedNew) return;
    setBenefitCategories(prev => {
      const updated = Array.from(new Set(prev.map(c => c === oldCategoryName ? trimmedNew : c)));
      setDoc(doc(db, 'settings', 'categories'), { benefitCategories: updated }, { merge: true }).catch(() => {});
      return updated;
    });
    setBenefits(prev => prev.map(b => {
      if (b.category === oldCategoryName) {
        const updatedB = { ...b, category: trimmedNew };
        updateDoc(doc(db, 'benefits', b.id), { category: trimmedNew }).catch(() => {});
        return updatedB;
      }
      return b;
    }));
  };

  const deleteBenefitCategory = (categoryName: string) => {
    setBenefitCategories(prev => {
      const updated = prev.filter(c => c !== categoryName);
      const fallbackCategory = updated[0] || '';
      setDoc(doc(db, 'settings', 'categories'), { benefitCategories: updated }, { merge: true }).catch(() => {});
      setBenefits(prevBenefits => prevBenefits.map(b => {
        if (b.category === categoryName) {
          const updatedB = { ...b, category: fallbackCategory };
          updateDoc(doc(db, 'benefits', b.id), { category: fallbackCategory }).catch(() => {});
          return updatedB;
        }
        return b;
      }));
      return updated;
    });
  };

  const addAnnouncementCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    setAnnouncementCategories(prev => {
      if (prev.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      const updated = Array.from(new Set([...prev, trimmed]));
      setDoc(doc(db, 'settings', 'categories'), { announcementCategories: updated }, { merge: true }).catch(() => {});
      return updated;
    });
  };

  const editAnnouncementCategory = (oldCategoryName: string, newCategoryName: string) => {
    const trimmedNew = newCategoryName.trim();
    if (!trimmedNew || oldCategoryName === trimmedNew) return;
    setAnnouncementCategories(prev => {
      const updated = Array.from(new Set(prev.map(c => c === oldCategoryName ? trimmedNew : c)));
      setDoc(doc(db, 'settings', 'categories'), { announcementCategories: updated }, { merge: true }).catch(() => {});
      return updated;
    });
    setAnnouncements(prev => prev.map(a => {
      if (a.category === oldCategoryName) {
        const updatedA = { ...a, category: trimmedNew as CategoryAnnouncement };
        updateDoc(doc(db, 'announcements', a.id), { category: trimmedNew }).catch(() => {});
        return updatedA;
      }
      return a;
    }));
  };

  const deleteAnnouncementCategory = (categoryName: string) => {
    setAnnouncementCategories(prev => {
      const updated = prev.filter(c => c !== categoryName);
      const fallbackCategory = updated[0] || '';
      const finalUpdated = updated;
      setDoc(doc(db, 'settings', 'categories'), { announcementCategories: finalUpdated }, { merge: true }).catch(() => {});
      setAnnouncements(prevAnnouncements => prevAnnouncements.map(a => {
        if (a.category === categoryName) {
          const updatedA = { ...a, category: fallbackCategory as CategoryAnnouncement };
          updateDoc(doc(db, 'announcements', a.id), { category: fallbackCategory }).catch(() => {});
          return updatedA;
        }
        return a;
      }));
      return finalUpdated;
    });
  };

  const togglePushNotifications = () => {
    if (!currentUser) return;
    const newState = !currentUser.pushEnabled;
    updateProfile({ pushEnabled: newState });
  };

  const markNotificationAsRead = (id: string) => {
    setLocalReadNotifIds(prev => {
      const next = Array.from(new Set([...prev, id]));
      safeLocalStorageSet('bachata_read_notifs_v1', JSON.stringify(next));
      return next;
    });

    if (currentUser) {
      const updatedRead = Array.from(new Set([...(currentUser.readNotificationIds || []), id]));
      setCurrentUser(prev => prev ? { ...prev, readNotificationIds: updatedRead } : null);
      updateDoc(doc(db, 'users', currentUser.id), { readNotificationIds: updatedRead }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.id}`);
      });
    }
  };

  const clearAllNotifications = () => {
    const idsToClear = notifications.map(n => n.id);
    if (idsToClear.length === 0) return;

    setLocalClearedNotifIds(prev => {
      const next = Array.from(new Set([...prev, ...idsToClear]));
      safeLocalStorageSet('bachata_cleared_notifs_v1', JSON.stringify(next));
      return next;
    });

    if (currentUser) {
      const updatedCleared = Array.from(new Set([...(currentUser.clearedNotificationIds || []), ...idsToClear]));
      setCurrentUser(prev => prev ? { ...prev, clearedNotificationIds: updatedCleared } : null);
      updateDoc(doc(db, 'users', currentUser.id), { clearedNotificationIds: updatedCleared }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.id}`);
      });
    }
  };

  const sendPushBroadcast = (title: string, body: string, linkTab?: string) => {
    const now = Date.now();
    const formattedTimestamp = new Date(now).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newNotif: PushNotification = {
      id: `notif-${now}`,
      title: title.trim(),
      body: body.trim(),
      timestamp: formattedTimestamp,
      createdAt: now,
      isRead: false,
      type: 'announcement',
      linkTab
    };

    setRawNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);

    setDoc(doc(db, 'notifications', newNotif.id), cleanForFirestore(newNotif)).catch(err => {
      console.warn('Error saving push notification to Firestore:', err);
    });

    if (!currentUser || currentUser.pushEnabled) {
      setLiveToast(newNotif);
      setTimeout(() => {
        setLiveToast(null);
      }, 6000);
    }
  };

  const updateFormationRecap = (
    levelId: 'nivel-1' | 'nivel-2',
    classNumber: number,
    title: string,
    description: string,
    driveUrl: string
  ) => {
    setFormationConfigs(prev => prev.map(config => {
      if (config.id === levelId) {
        const prevRecap = config.recaps.find(r => r.classNumber === classNumber);
        if (prevRecap && prevRecap.driveUrl && prevRecap.driveUrl !== driveUrl) {
          deleteVideoFromStorage(prevRecap.driveUrl).catch(() => {});
        }

        const updatedRecaps = config.recaps.map(r => {
          if (r.classNumber === classNumber) {
            return { ...r, title, description, driveUrl };
          }
          return r;
        });

        const activeVerId = config.activeRecapVersionId || 'v1';
        const updatedVersions = (config.recapVersions || []).map(ver => {
          if (ver.id === activeVerId) {
            return {
              ...ver,
              recaps: ver.recaps.map(r => r.classNumber === classNumber ? { ...r, title, description, driveUrl } : r)
            };
          }
          return ver;
        });

        const updatedConfig = { ...config, recaps: updatedRecaps, recapVersions: updatedVersions };
        setDoc(doc(db, 'formations', levelId), updatedConfig).catch(err => console.warn('Firestore update formation error:', err));
        return updatedConfig;
      }
      return config;
    }));
  };

  const createRecapVersion = (levelId: 'nivel-1' | 'nivel-2', name: string, description?: string) => {
    setFormationConfigs(prev => prev.map(config => {
      if (config.id === levelId) {
        const existingVersions = config.recapVersions || [];
        const newVerNum = existingVersions.length + 1;
        const newVersionId = `v${newVerNum}`;

        const baseRecaps: ClassRecap[] = Array.from({ length: 8 }, (_, i) => ({
          classNumber: i + 1,
          title: `Clase ${i + 1}: Módulo de Figuras (${name.trim() || `Versión ${newVerNum}`})`,
          description: `Contenido y rutina técnica para la Clase ${i + 1} de la ${name.trim() || `Versión ${newVerNum}`}.`,
          driveUrl: `https://drive.google.com/drive/folders/bachata-influence-${levelId}-${newVersionId}-clase${i + 1}`
        }));

        const newVersion: RecapVersion = {
          id: newVersionId,
          name: name.trim() || `Versión ${newVerNum}`,
          description: description?.trim() || 'Conjunto de recaps para esta cohorte',
          recaps: baseRecaps
        };

        const updatedConfig = {
          ...config,
          recapVersions: [...existingVersions, newVersion],
          activeRecapVersionId: newVersionId,
          recaps: baseRecaps
        };
        setDoc(doc(db, 'formations', levelId), updatedConfig).catch(err => console.warn('Firestore create recap version error:', err));
        return updatedConfig;
      }
      return config;
    }));
  };

  const duplicateRecapVersion = (levelId: 'nivel-1' | 'nivel-2', sourceVersionId: string, newName?: string) => {
    setFormationConfigs(prev => prev.map(config => {
      if (config.id === levelId) {
        const existingVersions = config.recapVersions || [];
        const sourceVer = existingVersions.find(v => v.id === sourceVersionId);
        if (!sourceVer) return config;

        const newVerNum = existingVersions.length + 1;
        const newVersionId = `v${newVerNum}`;
        const name = newName?.trim() || `${sourceVer.name} (Copia)`;

        const duplicatedRecaps: ClassRecap[] = sourceVer.recaps.map(r => ({ ...r }));

        const newVersion: RecapVersion = {
          id: newVersionId,
          name,
          description: sourceVer.description ? `Copia de ${sourceVer.name}` : undefined,
          recaps: duplicatedRecaps
        };

        const updatedConfig = {
          ...config,
          recapVersions: [...existingVersions, newVersion],
          activeRecapVersionId: newVersionId,
          recaps: duplicatedRecaps
        };
        setDoc(doc(db, 'formations', levelId), updatedConfig).catch(err => console.warn('Firestore duplicate recap version error:', err));
        return updatedConfig;
      }
      return config;
    }));
  };

  const updateRecapVersionDetails = (levelId: 'nivel-1' | 'nivel-2', versionId: string, name: string, description?: string) => {
    setFormationConfigs(prev => prev.map(config => {
      if (config.id === levelId) {
        const updatedVersions = (config.recapVersions || []).map(ver => {
          if (ver.id === versionId) {
            return {
              ...ver,
              name: name.trim() || ver.name,
              description: description !== undefined ? description.trim() : ver.description
            };
          }
          return ver;
        });

        const updatedConfig = {
          ...config,
          recapVersions: updatedVersions
        };
        setDoc(doc(db, 'formations', levelId), updatedConfig).catch(err => console.warn('Firestore update recap version error:', err));
        return updatedConfig;
      }
      return config;
    }));
  };

  const deleteRecapVersion = (levelId: 'nivel-1' | 'nivel-2', versionId: string) => {
    setFormationConfigs(prev => prev.map(config => {
      if (config.id === levelId) {
        const remainingVersions = (config.recapVersions || []).filter(ver => ver.id !== versionId);
        if (remainingVersions.length === 0) return config;

        const deletedVer = (config.recapVersions || []).find(v => v.id === versionId);
        if (deletedVer) {
          deletedVer.recaps.forEach(r => {
            if (r.driveUrl) deleteVideoFromStorage(r.driveUrl).catch(() => {});
          });
        }

        const newActiveVerId = config.activeRecapVersionId === versionId
          ? remainingVersions[0].id
          : config.activeRecapVersionId;
        const targetVer = remainingVersions.find(v => v.id === newActiveVerId) || remainingVersions[0];

        setConvocatorias(convs => convs.map(c => {
          if (c.levelId === levelId && c.recapVersionId === versionId) {
            const updatedConv = { ...c, recapVersionId: targetVer.id };
            setDoc(doc(db, 'convocatorias', c.id), updatedConv).catch(() => {});
            return updatedConv;
          }
          return c;
        }));

        const updatedConfig = {
          ...config,
          recapVersions: remainingVersions,
          activeRecapVersionId: targetVer.id,
          recaps: targetVer.recaps
        };
        setDoc(doc(db, 'formations', levelId), updatedConfig).catch(err => console.warn('Firestore delete recap version error:', err));
        return updatedConfig;
      }
      return config;
    }));
  };

  const updateVersionRecap = (
    levelId: 'nivel-1' | 'nivel-2',
    versionId: string,
    classNumber: number,
    title: string,
    description: string,
    driveUrl: string
  ) => {
    setFormationConfigs(prev => prev.map(config => {
      if (config.id === levelId) {
        const targetVer = (config.recapVersions || []).find(v => v.id === versionId);
        const prevRecap = targetVer?.recaps.find(r => r.classNumber === classNumber);
        if (prevRecap && prevRecap.driveUrl && prevRecap.driveUrl !== driveUrl) {
          deleteVideoFromStorage(prevRecap.driveUrl).catch(() => {});
        }

        const updatedVersions = (config.recapVersions || []).map(ver => {
          if (ver.id === versionId) {
            return {
              ...ver,
              recaps: ver.recaps.map(r => r.classNumber === classNumber ? { ...r, title, description, driveUrl } : r)
            };
          }
          return ver;
        });

        const isActiveVer = (config.activeRecapVersionId || 'v1') === versionId;
        const activeRecaps = isActiveVer
          ? config.recaps.map(r => r.classNumber === classNumber ? { ...r, title, description, driveUrl } : r)
          : config.recaps;

        const updatedConfig = {
          ...config,
          recaps: activeRecaps,
          recapVersions: updatedVersions
        };
        setDoc(doc(db, 'formations', levelId), updatedConfig).catch(err => console.warn('Firestore update version recap error:', err));
        return updatedConfig;
      }
      return config;
    }));
  };

  const setActiveRecapVersionForLevel = (levelId: 'nivel-1' | 'nivel-2', versionId: string) => {
    setFormationConfigs(prev => prev.map(config => {
      if (config.id === levelId) {
        const targetVer = (config.recapVersions || []).find(v => v.id === versionId);
        const updatedConfig = {
          ...config,
          activeRecapVersionId: versionId,
          recaps: targetVer ? targetVer.recaps : config.recaps
        };
        setDoc(doc(db, 'formations', levelId), updatedConfig).catch(err => console.warn('Firestore set active recap version error:', err));
        return updatedConfig;
      }
      return config;
    }));
  };

  const updateActiveClassNumber = (levelId: 'nivel-1' | 'nivel-2', activeClassNumber: number) => {
    setFormationConfigs(prev => prev.map(config => {
      if (config.id === levelId) {
        const updatedConfig = { ...config, activeClassNumber };
        setDoc(doc(db, 'formations', levelId), updatedConfig).catch(err => console.warn('Firestore update active class error:', err));
        return updatedConfig;
      }
      return config;
    }));
  };

  const toggleStudentClassAttendance = (userId: string, levelId: 'nivel-1' | 'nivel-2', classNumber: number) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        const field = levelId === 'nivel-1' ? 'attendanceNivel1' : 'attendanceNivel2';
        const currentList: number[] = u[field] || [];
        const isAttended = currentList.includes(classNumber);
        const newList = isAttended
          ? currentList.filter(c => c !== classNumber)
          : [...currentList, classNumber].sort((a, b) => a - b);
        
        const isCompleted = newList.length >= 8;
        const completedField = levelId === 'nivel-1' ? 'nivel1Completed' : 'nivel2Completed';
        const dateField = levelId === 'nivel-1' ? 'nivel1Date' : 'nivel2Date';

        const updatedUser = {
          ...u,
          [field]: newList,
          [completedField]: isCompleted,
          [dateField]: isCompleted ? (u[dateField] || 'Reciente') : undefined
        };

        if (currentUser?.id === userId) {
          setCurrentUser(updatedUser);
        }
        setDoc(doc(db, 'users', userId), cleanForFirestore(updatedUser)).catch(err => console.warn('Firestore update attendance error:', err));
        return updatedUser;
      }
      return u;
    }));
  };

  const assignStudentFormation = (userId: string, activeFormationId: 'nivel-1' | 'nivel-2' | null) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        let levelText = u.level;
        if (u.nivel2Completed) levelText = 'Formación finalizada';
        else if (activeFormationId === 'nivel-1') levelText = 'Alumno - Nivel 1 en Cursada';
        else if (activeFormationId === 'nivel-2') levelText = 'Alumno - Nivel 2 en Cursada';
        else if (u.role === 'admin') levelText = 'Director & Instructor - Bachata Influence';
        else levelText = 'Alumno - Bachata Influence';

        const updatedUser = { ...u, activeFormationId, level: levelText };
        if (currentUser?.id === userId) {
          setCurrentUser(updatedUser);
        }
        setDoc(doc(db, 'users', userId), cleanForFirestore(updatedUser)).catch(err => console.warn('Firestore assign user formation error:', err));
        return updatedUser;
      }
      return u;
    }));
  };

  const addConvocatoria = (data: {
    levelId: 'nivel-1' | 'nivel-2';
    title: string;
    period: string;
    startDate?: string;
    endDate?: string;
    status: ConvocatoriaStatus;
    classDay?: string;
    classStartTime?: string;
    classEndTime?: string;
    locationName?: string;
    locationMapUrl?: string;
    recapVersionId?: string;
    priceIndividual?: string;
    priceCouple?: string;
    paymentMethodId?: string;
    paymentAlias?: string;
    paymentCbu?: string;
    paymentHolder?: string;
    paymentBank?: string;
    certificateDate?: string;
    certificateTime?: string;
    certificateLocation?: string;
    certificateLocationMapUrl?: string;
    demoRecordingInfo?: string;
    demoRecordingMapUrl?: string;
  }) => {
    const newConv: Convocatoria = {
      id: `conv-${Date.now()}`,
      levelId: data.levelId,
      title: data.title,
      period: data.period,
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      status: data.status,
      studentIds: [],
      activeClassNumber: 1,
      attendanceMap: {},
      studentRoles: {},
      classDay: data.classDay || 'Viernes',
      classStartTime: data.classStartTime || '20:00',
      classEndTime: data.classEndTime || '21:30',
      locationName: data.locationName || 'Sede Central Scalabrini Ortiz 1240, Palermo — CABA',
      locationMapUrl: data.locationMapUrl || 'https://maps.google.com/?q=Scalabrini+Ortiz+1240+Palermo',
      recapVersionId: data.recapVersionId || 'v1',
      priceIndividual: data.priceIndividual || '$45.000',
      priceCouple: data.priceCouple || '$80.000 ($40.000 c/u)',
      paymentMethodId: data.paymentMethodId || '',
      paymentAlias: data.paymentAlias || '',
      paymentCbu: data.paymentCbu || '',
      paymentHolder: data.paymentHolder || '',
      paymentBank: data.paymentBank || '',
      certificateDate: data.certificateDate || '',
      certificateTime: data.certificateTime || '',
      certificateLocation: data.certificateLocation || '',
      certificateLocationMapUrl: data.certificateLocationMapUrl || '',
      demoRecordingInfo: data.demoRecordingInfo || '',
      demoRecordingMapUrl: data.demoRecordingMapUrl || ''
    };
    setConvocatorias(prev => [newConv, ...prev]);
    setDoc(doc(db, 'convocatorias', newConv.id), cleanForFirestore(newConv), { merge: true }).catch(err => console.warn('Firestore add convocatoria error:', err));
  };

  const updateConvocatoria = (id: string, updatedData: Partial<Convocatoria>) => {
    setConvocatorias(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updatedData };
        setDoc(doc(db, 'convocatorias', id), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore update convocatoria error:', err));
        return updated;
      }
      return c;
    }));
  };

  const deleteConvocatoria = (id: string) => {
    setConvocatorias(prev => prev.filter(c => c.id !== id));
    deleteDoc(doc(db, 'convocatorias', id)).catch(err => console.warn('Firestore delete convocatoria error:', err));
  };

  const toggleStudentConvocatoriaAttendance = (convocatoriaId: string, userId: string, classNumber: number) => {
    setConvocatorias(prev => prev.map(conv => {
      if (conv.id === convocatoriaId) {
        const currentList = conv.attendanceMap[userId] || [];
        const isAttended = currentList.includes(classNumber);
        const newList = isAttended
          ? currentList.filter(c => c !== classNumber)
          : [...currentList, classNumber].sort((a, b) => a - b);

        const newAttendanceMap = {
          ...conv.attendanceMap,
          [userId]: newList
        };

        const levelId = conv.levelId;
        const isCompleted = newList.length >= 8;

        setUsersList(users => users.map(u => {
          if (u.id === userId) {
            const field = levelId === 'nivel-1' ? 'attendanceNivel1' : 'attendanceNivel2';
            const completedField = levelId === 'nivel-1' ? 'nivel1Completed' : 'nivel2Completed';
            const dateField = levelId === 'nivel-1' ? 'nivel1Date' : 'nivel2Date';

            const updatedUser = {
              ...u,
              [field]: newList,
              [completedField]: isCompleted || u[completedField],
              [dateField]: isCompleted ? (u[dateField] || 'Reciente') : u[dateField]
            };

            if (currentUser?.id === userId) {
              setCurrentUser(updatedUser);
            }
            setDoc(doc(db, 'users', userId), cleanForFirestore(updatedUser), { merge: true }).catch(() => {});
            return updatedUser;
          }
          return u;
        }));

        const updated = {
          ...conv,
          attendanceMap: newAttendanceMap
        };
        setDoc(doc(db, 'convocatorias', convocatoriaId), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore update conv attendance error:', err));
        return updated;
      }
      return conv;
    }));
  };

  const assignStudentToConvocatoria = (
    convocatoriaId: string, 
    userId: string, 
    role?: DanceRole,
    enrollmentType?: EnrollmentType,
    partnerId?: string
  ) => {
    const user = usersList.find(u => u.id === userId);
    const assignedRole = role || user?.danceRole || 'Leader';
    const assignedType = enrollmentType || 'individual';

    setConvocatorias(prev => prev.map(conv => {
      if (conv.id === convocatoriaId) {
        const isEnrolled = conv.studentIds.includes(userId);
        const newStudentIds = isEnrolled ? conv.studentIds : [...conv.studentIds, userId];
        const newRoles = { ...(conv.studentRoles || {}), [userId]: assignedRole };
        const newTypes = { ...(conv.studentEnrollmentTypes || {}), [userId]: assignedType };
        const newPartners = { ...(conv.studentPartners || {}) };

        if (assignedType === 'pareja' && partnerId) {
          newPartners[userId] = partnerId;
          newTypes[partnerId] = 'pareja';
          newPartners[partnerId] = userId;
        }

        const updated = {
          ...conv,
          studentIds: newStudentIds,
          studentRoles: newRoles,
          studentEnrollmentTypes: newTypes,
          studentPartners: newPartners
        };
        setDoc(doc(db, 'convocatorias', convocatoriaId), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore assign student conv error:', err));
        return updated;
      }
      return conv;
    }));

    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = { ...u, danceRole: u.danceRole || assignedRole };
        if (currentUser?.id === userId) setCurrentUser(updated);
        setDoc(doc(db, 'users', userId), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return u;
    }));

    const targetConv = convocatorias.find(c => c.id === convocatoriaId);
    if (targetConv) {
      assignStudentFormation(userId, targetConv.levelId);
    }
  };

  const updateStudentConvocatoriaRole = (convocatoriaId: string, userId: string, role: DanceRole) => {
    setConvocatorias(prev => prev.map(conv => {
      if (conv.id === convocatoriaId) {
        const updated = {
          ...conv,
          studentRoles: {
            ...(conv.studentRoles || {}),
            [userId]: role
          }
        };
        setDoc(doc(db, 'convocatorias', convocatoriaId), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return conv;
    }));

    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = { ...u, danceRole: role };
        if (currentUser?.id === userId) setCurrentUser(updated);
        setDoc(doc(db, 'users', userId), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return u;
    }));
  };

  const updateStudentConvocatoriaEnrollmentType = (
    convocatoriaId: string,
    userId: string,
    type: EnrollmentType,
    partnerId?: string
  ) => {
    setConvocatorias(prev => prev.map(conv => {
      if (conv.id === convocatoriaId) {
        const newTypes = { ...(conv.studentEnrollmentTypes || {}), [userId]: type };
        const newPartners = { ...(conv.studentPartners || {}) };

        if (type === 'individual') {
          const oldPartnerId = newPartners[userId];
          delete newPartners[userId];
          if (oldPartnerId && newPartners[oldPartnerId] === userId) {
            delete newPartners[oldPartnerId];
          }
        } else if (type === 'pareja' && partnerId) {
          newPartners[userId] = partnerId;
          newTypes[partnerId] = 'pareja';
          newPartners[partnerId] = userId;
        }

        const updated = {
          ...conv,
          studentEnrollmentTypes: newTypes,
          studentPartners: newPartners
        };
        setDoc(doc(db, 'convocatorias', convocatoriaId), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return conv;
    }));
  };

  const updateStudentConvocatoriaPartner = (
    convocatoriaId: string,
    userId: string,
    partnerId: string
  ) => {
    setConvocatorias(prev => prev.map(conv => {
      if (conv.id === convocatoriaId) {
        const newTypes = { ...(conv.studentEnrollmentTypes || {}), [userId]: 'pareja' as EnrollmentType };
        const newPartners = { ...(conv.studentPartners || {}) };
        const oldPartnerId = newPartners[userId];

        if (oldPartnerId && oldPartnerId !== partnerId && newPartners[oldPartnerId] === userId) {
          delete newPartners[oldPartnerId];
        }

        if (partnerId) {
          newPartners[userId] = partnerId;
          newTypes[partnerId] = 'pareja';
          newPartners[partnerId] = userId;
        } else {
          delete newPartners[userId];
        }

        const updated = {
          ...conv,
          studentEnrollmentTypes: newTypes,
          studentPartners: newPartners
        };
        setDoc(doc(db, 'convocatorias', convocatoriaId), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return conv;
    }));
  };

  const toggleStudentConvocatoriaPayment = (convocatoriaId: string, userId: string, cuotaKey: 'cuota1' | 'cuota2' | 'sena' | 'saldoCuota1') => {
    setConvocatorias(prev => prev.map(conv => {
      if (conv.id === convocatoriaId) {
        const currentPayments = conv.studentPayments || {};
        const currentStudentPayment = currentPayments[userId] || {};
        const isPaid = !!currentStudentPayment[cuotaKey];

        const updatedStudentPayment: StudentPaymentInfo = {
          ...currentStudentPayment,
          [cuotaKey]: !isPaid
        };

        if (cuotaKey === 'sena' || cuotaKey === 'saldoCuota1') {
          const prevSena = !!currentStudentPayment.sena || !!currentStudentPayment.cuota1;
          const prevSaldo = !!currentStudentPayment.saldoCuota1 || !!currentStudentPayment.cuota1;
          const newSena = cuotaKey === 'sena' ? !isPaid : prevSena;
          const newSaldo = cuotaKey === 'saldoCuota1' ? !isPaid : prevSaldo;
          updatedStudentPayment.sena = newSena;
          updatedStudentPayment.saldoCuota1 = newSaldo;
          updatedStudentPayment.cuota1 = newSena && newSaldo;
        } else if (cuotaKey === 'cuota1') {
          const newCuota1 = !isPaid;
          updatedStudentPayment.cuota1 = newCuota1;
          updatedStudentPayment.sena = newCuota1;
          updatedStudentPayment.saldoCuota1 = newCuota1;
        }

        const updated = {
          ...conv,
          studentPayments: {
            ...currentPayments,
            [userId]: updatedStudentPayment
          }
        };
        setDoc(doc(db, 'convocatorias', convocatoriaId), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return conv;
    }));
  };

  const toggleStudentConvocatoriaPause = (convocatoriaId: string, userId: string) => {
    setConvocatorias(prev => prev.map(conv => {
      if (conv.id === convocatoriaId) {
        const currentPayments = conv.studentPayments || {};
        const currentStudentPayment = currentPayments[userId] || {};
        const isCurrentlyPaused = !!currentStudentPayment.isPaused;

        const updatedStudentPayment: StudentPaymentInfo = {
          ...currentStudentPayment,
          isPaused: !isCurrentlyPaused
        };

        const updated = {
          ...conv,
          studentPayments: {
            ...currentPayments,
            [userId]: updatedStudentPayment
          }
        };
        setDoc(doc(db, 'convocatorias', convocatoriaId), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return conv;
    }));
  };

  const toggleStudentRegularClassPause = (classId: string, userId: string) => {
    setRegularClasses(prev => prev.map(c => {
      if (c.id === classId) {
        const currentPayments = c.studentPayments || {};
        const currentStudentPayment = currentPayments[userId] || { paid: false };
        const isCurrentlyPaused = !!currentStudentPayment.isPaused;

        const updated = {
          ...c,
          studentPayments: {
            ...currentPayments,
            [userId]: {
              ...currentStudentPayment,
              isPaused: !isCurrentlyPaused
            }
          }
        };
        setDoc(doc(db, 'regularClasses', classId), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return c;
    }));
  };

  const toggleGlobalStudentPause = (userId: string) => {
    let nextIsPaused = true;
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        nextIsPaused = !u.isPaused;
        const updatedUser = {
          ...u,
          isPaused: nextIsPaused
        };
        setDoc(doc(db, 'users', userId), cleanForFirestore(updatedUser), { merge: true }).catch(err => console.warn('Firestore pause user error:', err));
        return updatedUser;
      }
      return u;
    }));

    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, isPaused: !prev.isPaused } : null);
    }

    setConvocatorias(prev => prev.map(conv => {
      if (conv.studentIds?.includes(userId)) {
        const currentPayments = conv.studentPayments || {};
        const currentStudentPayment = currentPayments[userId] || {};

        const updated = {
          ...conv,
          studentPayments: {
            ...currentPayments,
            [userId]: {
              ...currentStudentPayment,
              isPaused: nextIsPaused
            }
          }
        };
        setDoc(doc(db, 'convocatorias', conv.id), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return conv;
    }));

    setRegularClasses(prev => prev.map(c => {
      if (c.studentIds?.includes(userId)) {
        const currentPayments = c.studentPayments || {};
        const currentStudentPayment = currentPayments[userId] || { paid: false };

        const updated = {
          ...c,
          studentPayments: {
            ...currentPayments,
            [userId]: {
              ...currentStudentPayment,
              isPaused: nextIsPaused
            }
          }
        };
        setDoc(doc(db, 'regularClasses', c.id), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return c;
    }));
  };

  const removeStudentFromConvocatoria = (convocatoriaId: string, userId: string) => {
    setConvocatorias(prev => prev.map(conv => {
      if (conv.id === convocatoriaId) {
        const newRoles = { ...(conv.studentRoles || {}) };
        delete newRoles[userId];
        const newTypes = { ...(conv.studentEnrollmentTypes || {}) };
        delete newTypes[userId];
        const newPartners = { ...(conv.studentPartners || {}) };
        const oldPartnerId = newPartners[userId];
        delete newPartners[userId];
        if (oldPartnerId && newPartners[oldPartnerId] === userId) {
          delete newPartners[oldPartnerId];
        }

        const updated = {
          ...conv,
          studentIds: conv.studentIds.filter(id => id !== userId),
          studentRoles: newRoles,
          studentEnrollmentTypes: newTypes,
          studentPartners: newPartners
        };
        setDoc(doc(db, 'convocatorias', convocatoriaId), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return conv;
    }));
  };

  const updateConvocatoriaActiveClassNumber = (convocatoriaId: string, activeClassNumber: number) => {
    setConvocatorias(prev => prev.map(conv => {
      if (conv.id === convocatoriaId) {
        const updated = { ...conv, activeClassNumber };
        setDoc(doc(db, 'convocatorias', convocatoriaId), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return conv;
    }));
  };

  const updateConvocatoriaClassDates = (convocatoriaId: string, classDates: string[]) => {
    setConvocatorias(prev => prev.map(conv => {
      if (conv.id === convocatoriaId) {
        const updated = { ...conv, classDates };
        setDoc(doc(db, 'convocatorias', convocatoriaId), cleanForFirestore(updated), { merge: true }).catch(() => {});
        return updated;
      }
      return conv;
    }));
  };

  const addRegularClass = (data: Omit<RegularClass, 'id'>) => {
    const newClass: RegularClass = {
      ...data,
      id: `reg-${Date.now()}`,
      day: data.day || '',
      time: data.time || '',
      level: data.level || '',
      instructor: data.instructor || '',
      address: data.address || '',
      locationMapUrl: data.locationMapUrl || data.mapUrl || '',
      priceMonthly: data.priceMonthly || data.price || '',
      paymentMethodId: data.paymentMethodId || '',
      studentIds: data.studentIds || [],
      studentPayments: data.studentPayments || {},
      studentRoles: data.studentRoles || {}
    };
    setRegularClasses(prev => [newClass, ...prev]);
    setDoc(doc(db, 'regularClasses', newClass.id), cleanForFirestore(newClass), { merge: true }).catch(err => console.warn('Firestore add reg class error:', err));
  };

  const updateRegularClass = (id: string, updatedData: Partial<RegularClass>) => {
    setRegularClasses(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updatedData };
        setDoc(doc(db, 'regularClasses', id), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore update reg class error:', err));
        return updated;
      }
      return c;
    }));
  };

  const deleteRegularClass = (id: string) => {
    setRegularClasses(prev => prev.filter(c => c.id !== id));
    deleteDoc(doc(db, 'regularClasses', id)).catch(err => console.warn('Firestore delete reg class error:', err));
  };

  const assignStudentToRegularClass = (classId: string, userId: string, role?: DanceRole) => {
    setRegularClasses(prev => prev.map(c => {
      if (c.id === classId) {
        const currentIds = c.studentIds || [];
        const currentRoles = c.studentRoles || {};
        const chosenRole = role || 'follower';
        const newRoles = { ...currentRoles, [userId]: chosenRole };
        if (!currentIds.includes(userId)) {
          const newIds = [...currentIds, userId];
          const updated = { ...c, studentIds: newIds, studentRoles: newRoles };
          setDoc(doc(db, 'regularClasses', classId), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore update reg class error:', err));
          return updated;
        } else {
          const updated = { ...c, studentRoles: newRoles };
          setDoc(doc(db, 'regularClasses', classId), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore update reg class error:', err));
          return updated;
        }
      }
      return c;
    }));
  };

  const updateStudentRegularClassRole = (classId: string, userId: string, role: DanceRole) => {
    setRegularClasses(prev => prev.map(c => {
      if (c.id === classId) {
        const currentRoles = c.studentRoles || {};
        const newRoles = { ...currentRoles, [userId]: role };
        const updated = { ...c, studentRoles: newRoles };
        setDoc(doc(db, 'regularClasses', classId), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore update reg class error:', err));
        return updated;
      }
      return c;
    }));
  };

  const removeStudentFromRegularClass = (classId: string, userId: string) => {
    setRegularClasses(prev => prev.map(c => {
      if (c.id === classId) {
        const currentIds = c.studentIds || [];
        const newIds = currentIds.filter(id => id !== userId);
        const updated = { ...c, studentIds: newIds };
        setDoc(doc(db, 'regularClasses', classId), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore update reg class error:', err));
        return updated;
      }
      return c;
    }));
  };

  const toggleRegularClassStudentPayment = (classId: string, userId: string, paid?: boolean, monthKey?: string) => {
    setRegularClasses(prev => prev.map(c => {
      if (c.id === classId) {
        const currentMonthlyPayments = c.monthlyPayments || {};
        const monthsMap: Record<number, string> = {
          0: 'Enero 2026', 1: 'Febrero 2026', 2: 'Marzo 2026', 3: 'Abril 2026',
          4: 'Mayo 2026', 5: 'Junio 2026', 6: 'Julio 2026', 7: 'Agosto 2026',
          8: 'Septiembre 2026', 9: 'Octubre 2026', 10: 'Noviembre 2026', 11: 'Diciembre 2026'
        };
        const currentMonthDefault = monthsMap[new Date().getMonth()] || 'Agosto 2026';
        const targetMonth = monthKey || currentMonthDefault;
        const monthMap = currentMonthlyPayments[targetMonth] || {};
        const currentStatus = monthMap[userId]?.paid || false;
        const newStatus = paid !== undefined ? paid : !currentStatus;

        const paymentObj = {
          paid: newStatus,
          ...(newStatus ? { paymentDate: new Date().toISOString().split('T')[0] } : {})
        };

        const updatedMonthMap = {
          ...monthMap,
          [userId]: paymentObj
        };

        const updatedMonthlyPayments = {
          ...currentMonthlyPayments,
          [targetMonth]: updatedMonthMap
        };

        const updatedStudentPayments = {
          ...(c.studentPayments || {}),
          [userId]: paymentObj
        };

        const updated = {
          ...c,
          monthlyPayments: updatedMonthlyPayments,
          studentPayments: updatedStudentPayments
        };
        setDoc(doc(db, 'regularClasses', classId), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore update reg class error:', err));
        return updated;
      }
      return c;
    }));
  };

  const addRegularClassRecap = (classId: string, recapData: Omit<RegularClassRecap, 'id' | 'createdAt'>) => {
    const newRecap: RegularClassRecap = {
      ...recapData,
      id: `recap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now()
    };
    setRegularClasses(prev => prev.map(c => {
      if (c.id === classId) {
        const existingRecaps = c.recaps || [];
        const updated = {
          ...c,
          recaps: [newRecap, ...existingRecaps]
        };
        setDoc(doc(db, 'regularClasses', classId), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore add regular class recap error:', err));
        return updated;
      }
      return c;
    }));
  };

  const updateRegularClassRecap = (classId: string, recapId: string, updatedData: Partial<RegularClassRecap>) => {
    setRegularClasses(prev => prev.map(c => {
      if (c.id === classId) {
        const existingRecaps = c.recaps || [];
        const prevRecap = existingRecaps.find(r => r.id === recapId);
        if (prevRecap && prevRecap.driveUrl && updatedData.driveUrl && prevRecap.driveUrl !== updatedData.driveUrl) {
          deleteVideoFromStorage(prevRecap.driveUrl).catch(() => {});
        }

        const updatedRecaps = existingRecaps.map(r => r.id === recapId ? { ...r, ...updatedData } : r);
        const updated = {
          ...c,
          recaps: updatedRecaps
        };
        setDoc(doc(db, 'regularClasses', classId), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore update regular class recap error:', err));
        return updated;
      }
      return c;
    }));
  };

  const deleteRegularClassRecap = (classId: string, recapId: string) => {
    setRegularClasses(prev => prev.map(c => {
      if (c.id === classId) {
        const existingRecaps = c.recaps || [];
        const prevRecap = existingRecaps.find(r => r.id === recapId);
        if (prevRecap && prevRecap.driveUrl) {
          deleteVideoFromStorage(prevRecap.driveUrl).catch(() => {});
        }

        const updatedRecaps = existingRecaps.filter(r => r.id !== recapId);
        const updated = {
          ...c,
          recaps: updatedRecaps
        };
        setDoc(doc(db, 'regularClasses', classId), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore delete regular class recap error:', err));
        return updated;
      }
      return c;
    }));
  };

  const updateRegularClassRecaps = (classId: string, recaps: RegularClassRecap[]) => {
    setRegularClasses(prev => prev.map(c => {
      if (c.id === classId) {
        const updated = {
          ...c,
          recaps
        };
        setDoc(doc(db, 'regularClasses', classId), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore set regular class recaps error:', err));
        return updated;
      }
      return c;
    }));
  };

  const addPaymentMethod = (data: Omit<PaymentMethod, 'id'>) => {
    const newPm: PaymentMethod = {
      ...data,
      id: `pm-${Date.now()}`
    };
    setPaymentMethods(prev => [newPm, ...prev]);
    setDoc(doc(db, 'paymentMethods', newPm.id), cleanForFirestore(newPm), { merge: true }).catch(err => console.warn('Firestore add paymentMethod error:', err));
  };

  const updatePaymentMethod = (id: string, updatedData: Partial<PaymentMethod>) => {
    setPaymentMethods(prev => prev.map(pm => {
      if (pm.id === id) {
        const updated = { ...pm, ...updatedData };
        setDoc(doc(db, 'paymentMethods', id), cleanForFirestore(updated), { merge: true }).catch(err => console.warn('Firestore update paymentMethod error:', err));
        return updated;
      }
      return pm;
    }));
  };

  const deletePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
    deleteDoc(doc(db, 'paymentMethods', id)).catch(err => console.warn('Firestore delete paymentMethod error:', err));
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      usersList,
      siteConfig,
      updateSiteConfig,
      announcements,

      benefits,
      notifications,
      formationConfigs,
      convocatorias,
      paymentMethods,
      addPaymentMethod,
      updatePaymentMethod,
      deletePaymentMethod,
      regularClasses,
      addRegularClass,
      updateRegularClass,
      deleteRegularClass,
      assignStudentToRegularClass,
      updateStudentRegularClassRole,
      removeStudentFromRegularClass,
      toggleRegularClassStudentPayment,
      addRegularClassRecap,
      updateRegularClassRecap,
      deleteRegularClassRecap,
      updateRegularClassRecaps,
      
      // Merchandising
      merchConfig,
      updateMerchConfig,
      merchProducts,
      addMerchProduct,
      updateMerchProduct,
      deleteMerchProduct,
      merchOrders,
      createMerchOrder,
      updateMerchOrderStatus,
      deleteMerchOrder,
      merchCategories,
      addMerchCategory,
      editMerchCategory,
      deleteMerchCategory,

      activeTab,
      setActiveTab,
      login,
      logout,
      changePassword,
      createStudentByAdmin,
      updateStudentGraduation,
      updateStudentByAdmin,
      deleteStudentByAdmin,
      switchUser,
      updateProfile,
      claimBenefit,
      addAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      toggleLikeAnnouncement,
      addComment,
      addBenefit,
      updateBenefit,
      deleteBenefit,
      benefitCategories,
      addBenefitCategory,
      editBenefitCategory,
      deleteBenefitCategory,
      announcementCategories,
      addAnnouncementCategory,
      editAnnouncementCategory,
      deleteAnnouncementCategory,
      togglePushNotifications,
      markNotificationAsRead,
      clearAllNotifications,
      sendPushBroadcast,
      updateFormationRecap,
      createRecapVersion,
      duplicateRecapVersion,
      updateRecapVersionDetails,
      deleteRecapVersion,
      updateVersionRecap,
      setActiveRecapVersionForLevel,
      updateActiveClassNumber,
      toggleStudentClassAttendance,
      assignStudentFormation,
      addConvocatoria,
      updateConvocatoria,
      deleteConvocatoria,
      toggleStudentConvocatoriaAttendance,
      toggleStudentConvocatoriaPayment,
      toggleStudentConvocatoriaPause,
      toggleStudentRegularClassPause,
      toggleGlobalStudentPause,
      assignStudentToConvocatoria,
      updateStudentConvocatoriaRole,
      updateStudentConvocatoriaEnrollmentType,
      updateStudentConvocatoriaPartner,
      removeStudentFromConvocatoria,
      updateConvocatoriaActiveClassNumber,
      updateConvocatoriaClassDates,
      showPassModal,
      setShowPassModal,
      showAuthModal,
      setShowAuthModal,
      showLogoutConfirmModal,
      setShowLogoutConfirmModal,
      confirmLogout,
      showAdminFormationModal,
      setShowAdminFormationModal,
      liveToast,
      setLiveToast
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
