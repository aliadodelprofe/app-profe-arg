import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, CheckCircle2, Clock, Video, ExternalLink, Award, Lock, Unlock, 
  ArrowLeft, Calendar, Layers, ChevronRight, UserCheck, Sparkles, Edit2, Edit3,
  Save, Plus, Trash2, Users, User, Search, Filter, ShieldCheck, UserPlus, X, MapPin, MessageCircle,
  DollarSign, CreditCard, CircleDollarSign, Copy, Check, Landmark, Building2, AlertCircle, AlertTriangle, Pause, Play,
  RotateCcw
} from 'lucide-react';
import { Convocatoria, ConvocatoriaStatus, RegularClass, DanceRole, DEFAULT_AVATAR_URL } from '../types';
import { isRecapUnlocked, isConvocatoriaFinishedByDate, isStudentGraduated, formatClassDate, getComputedFormacionStatus, checkUserNivel2Completed, normalizeText, sortConvocatoriasNewestFirst } from '../utils/convocatoriaUtils';
import { VideoPlayerModal } from './VideoPlayerModal';

interface StudentFormationViewProps {
  hideHeader?: boolean;
  onDetailStateChange?: (isInDetail: boolean) => void;
}

export const StudentFormationView: React.FC<StudentFormationViewProps> = ({ 
  hideHeader = false,
  onDetailStateChange
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper to format currency values cleanly with thousand separators "." (e.g. "$ 50.000")
  const formatCurrency = (val?: string | number): string => {
    if (!val) return '$\u00A00';
    const str = String(val).trim();
    if (str.includes('(') || str.includes('c/u')) {
      return str
        .replace(/\b\d{4,}\b/g, (m) => Number(m).toLocaleString('es-AR'))
        .replace(/^\$?\s*/, '$\u00A0');
    }
    const digitsOnly = str.replace(/[^\d]/g, '');
    if (!digitsOnly) return str;
    const num = parseInt(digitsOnly, 10);
    return `$\u00A0${num.toLocaleString('es-AR')}`;
  };

  // Helper to extract numeric amount and calculate 50% for seña / saldo
  const getHalfPriceFormatted = (val?: string | number): string => {
    if (!val) return '$\u00A00';
    const str = String(val).trim();
    const cleanStr = str.replace(/\([^\)]*\)/g, '');
    const digitsOnly = cleanStr.replace(/[^\d]/g, '');
    if (!digitsOnly) return '$\u00A00';
    const totalNum = parseInt(digitsOnly, 10);
    const halfNum = Math.round(totalNum / 2);
    return `$\u00A0${halfNum.toLocaleString('es-AR')}`;
  };
  const { 
    currentUser, 
    usersList,
    formationConfigs, 
    convocatorias,
    paymentMethods,
    regularClasses,
    addRegularClass,
    updateRegularClass,
    deleteRegularClass,
    assignStudentToRegularClass,
    removeStudentFromRegularClass,
    updateStudentRegularClassRole,
    updateStudentConvocatoriaRole,
    toggleRegularClassStudentPayment,
    toggleStudentConvocatoriaAttendance,
    toggleStudentConvocatoriaPayment,
    toggleStudentConvocatoriaPause,
    toggleStudentRegularClassPause,
    toggleGlobalStudentPause,
    assignStudentToConvocatoria,
    updateConvocatoriaActiveClassNumber,
    updateConvocatoriaClassDates,
    updateConvocatoria,
    deleteConvocatoria,
    addRegularClassRecap,
    updateRegularClassRecap,
    deleteRegularClassRecap,
    createRecapVersion,
    updateVersionRecap,
    setActiveRecapVersionForLevel,
    setLiveToast
  } = useAuth();

  const isAdmin = currentUser?.role === 'admin';

  // Main Sub-Tab: 'convocatorias' | 'regulares'
  const [mainTab, setMainTab] = useState<'convocatorias' | 'regulares'>('convocatorias');
  const sectionContentRef = useRef<HTMLDivElement | null>(null);
  const regClassInfoSectionRef = useRef<HTMLDivElement | null>(null);
  const regClassRecapsSectionRef = useRef<HTMLDivElement | null>(null);

  // Navigation & View state
  const [selectedConvocatoriaId, setSelectedConvocatoriaId] = useState<string | null>(null);
  const [selectedRegularClassId, setSelectedRegularClassId] = useState<string | null>(null);
  const [regClassDetailTab, setRegClassDetailTab] = useState<'info' | 'recaps'>('info');

  // Section refs for Admin Formation Detail
  const adminAsistenciasSectionRef = useRef<HTMLDivElement | null>(null);
  const adminPagosSectionRef = useRef<HTMLDivElement | null>(null);
  const adminRecapsSectionRef = useRef<HTMLDivElement | null>(null);

  // Section refs for Student Formation Detail
  const studentAsistenciaSectionRef = useRef<HTMLDivElement | null>(null);
  const studentPagosSectionRef = useRef<HTMLDivElement | null>(null);
  const studentCierreSectionRef = useRef<HTMLDivElement | null>(null);
  const studentRecapsSectionRef = useRef<HTMLDivElement | null>(null);

  // Scroll to section in regular class detail
  const scrollToRegClassSection = (section: 'info' | 'recaps') => {
    setRegClassDetailTab(section);
    const target = section === 'info' ? regClassInfoSectionRef.current : regClassRecapsSectionRef.current;
    if (target) {
      const yOffset = -130;
      const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };

  // Scroll to section in admin formation detail
  const scrollToAdminFormationSection = (section: 'asistencias' | 'pagos' | 'recaps') => {
    setAdminDetailTab(section);
    let target: HTMLDivElement | null = null;
    if (section === 'asistencias') target = adminAsistenciasSectionRef.current;
    else if (section === 'pagos') target = adminPagosSectionRef.current;
    else if (section === 'recaps') target = adminRecapsSectionRef.current;
    if (target) {
      const yOffset = -130;
      const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };

  // Scroll to section in student formation detail
  const scrollToStudentFormationSection = (section: 'asistencia' | 'pagos' | 'cierre' | 'recaps') => {
    setStudentDetailTab(section);
    let target: HTMLDivElement | null = null;
    if (section === 'asistencia') target = studentAsistenciaSectionRef.current;
    else if (section === 'pagos') target = studentPagosSectionRef.current;
    else if (section === 'cierre') target = studentCierreSectionRef.current;
    else if (section === 'recaps') target = studentRecapsSectionRef.current;
    if (target) {
      const yOffset = -130;
      const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };

  // Synchronize sticky sub-tab active indicator with scroll position in regular class detail
  useEffect(() => {
    if (!selectedRegularClassId) return;

    const handleScroll = () => {
      if (!regClassRecapsSectionRef.current) return;
      const recapsRect = regClassRecapsSectionRef.current.getBoundingClientRect();
      if (recapsRect.top <= 200) {
        setRegClassDetailTab('recaps');
      } else {
        setRegClassDetailTab('info');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedRegularClassId]);

  // Synchronize sticky sub-tab active indicator with scroll position in admin formation detail
  useEffect(() => {
    if (!selectedConvocatoriaId || !isAdmin) return;

    const handleScroll = () => {
      if (!adminPagosSectionRef.current || !adminRecapsSectionRef.current) return;
      const recapsRect = adminRecapsSectionRef.current.getBoundingClientRect();
      const pagosRect = adminPagosSectionRef.current.getBoundingClientRect();

      if (recapsRect.top <= 200) {
        setAdminDetailTab('recaps');
      } else if (pagosRect.top <= 200) {
        setAdminDetailTab('pagos');
      } else {
        setAdminDetailTab('asistencias');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedConvocatoriaId, isAdmin]);

  // Synchronize sticky sub-tab active indicator with scroll position in student formation detail
  useEffect(() => {
    if (!selectedConvocatoriaId || isAdmin) return;

    const handleScroll = () => {
      if (!studentRecapsSectionRef.current || !studentCierreSectionRef.current || !studentPagosSectionRef.current) return;
      const recapsRect = studentRecapsSectionRef.current.getBoundingClientRect();
      const cierreRect = studentCierreSectionRef.current.getBoundingClientRect();
      const pagosRect = studentPagosSectionRef.current.getBoundingClientRect();

      if (recapsRect.top <= 200) {
        setStudentDetailTab('recaps');
      } else if (cierreRect.top <= 200) {
        setStudentDetailTab('cierre');
      } else if (pagosRect.top <= 200) {
        setStudentDetailTab('pagos');
      } else {
        setStudentDetailTab('asistencia');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedConvocatoriaId, isAdmin]);


  // Inline Regular Class Recap Modal states for StudentFormationView
  const [showRegRecapAddModal, setShowRegRecapAddModal] = useState(false);
  const [newRegRecapTitle, setNewRegRecapTitle] = useState('');
  const [newRegRecapDate, setNewRegRecapDate] = useState('');
  const [newRegRecapDesc, setNewRegRecapDesc] = useState('');
  const [newRegRecapUrl, setNewRegRecapUrl] = useState('');

  // Search & Filter state for Regular Class Recaps
  const [regRecapSearchQuery, setRegRecapSearchQuery] = useState('');
  const [regRecapMonthFilter, setRegRecapMonthFilter] = useState('todos');

  const [editingRegRecapId, setEditingRegRecapId] = useState<string | null>(null);
  const [editRegRecapTitle, setEditRegRecapTitle] = useState('');
  const [editRegRecapDate, setEditRegRecapDate] = useState('');
  const [editRegRecapDesc, setEditRegRecapDesc] = useState('');
  const [editRegRecapUrl, setEditRegRecapUrl] = useState('');

  const [deletingRegRecapId, setDeletingRegRecapId] = useState<string | null>(null);

  // In-app video playback state for recaps
  const [activeVideoPlayer, setActiveVideoPlayer] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    description?: string;
  } | null>(null);

  // Auto-scroll to top only when opening class detail view
  useEffect(() => {
    if (selectedRegularClassId || selectedConvocatoriaId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setStudentDetailTab('asistencia');
  }, [selectedRegularClassId, selectedConvocatoriaId]);

  // Smooth scroll to the start of the section when switching between Formaciones and Clases Regulares
  const handleTabSwitch = (newTab: 'convocatorias' | 'regulares') => {
    if (mainTab === newTab) return;
    setMainTab(newTab);
    
    // Defer slight tick so DOM renders new section and compute offset relative to sticky nav
    setTimeout(() => {
      if (sectionContentRef.current) {
        const yOffset = -140; // Accounts for top header + sticky academy sub-nav
        const y = sectionContentRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }, 50);
  };

  // Notify parent if a detail view (formation or regular class) is active
  useEffect(() => {
    onDetailStateChange?.(Boolean(selectedConvocatoriaId || selectedRegularClassId));
  }, [selectedConvocatoriaId, selectedRegularClassId, onDetailStateChange]);

  // Filters for Admin / Directors
  const [adminStatusFilter, setAdminStatusFilter] = useState<'todas' | 'activa' | 'proxima' | 'finalizada'>('todas');
  const [adminLevelFilter, setAdminLevelFilter] = useState<'todos' | 'nivel-1' | 'nivel-2'>('todos');
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>('');

  // Filters for Students
  const [studentFilterTab, setStudentFilterTab] = useState<'activas' | 'proximas' | 'finalizadas' | 'todas'>('todas');
  const [studentDetailTab, setStudentDetailTab] = useState<'asistencia' | 'pagos' | 'cierre' | 'recaps'>('asistencia');

  // Detail View Tabs for Admin
  const [adminDetailTab, setAdminDetailTab] = useState<'asistencias' | 'pagos' | 'recaps'>('asistencias');
  const [forceEnableAttendance, setForceEnableAttendance] = useState<boolean>(false);

  // Local state for class dates, schedule, location & recap version in Admin view
  const [classDatesInput, setClassDatesInput] = useState<string[]>(Array(8).fill(''));
  const [datesSuccessMsg, setDatesSuccessMsg] = useState<string | null>(null);
  const [classDayInput, setClassDayInput] = useState<string>('Viernes');
  const [classStartTimeInput, setClassStartTimeInput] = useState<string>('20:00');
  const [classEndTimeInput, setClassEndTimeInput] = useState<string>('21:30');
  const [locationNameInput, setLocationNameInput] = useState<string>('');
  const [locationMapUrlInput, setLocationMapUrlInput] = useState<string>('');
  const [recapVersionIdInput, setRecapVersionIdInput] = useState<string>('v1');

  // Student search & assign state in Admin detail view
  const [studentAssignId, setStudentAssignId] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'todos' | 'sena_pendiente' | 'saldo_pendiente' | 'c1_pendiente' | 'c2_pendiente' | 'al_dia' | 'pausados'>('todos');
  const [confirmPauseStudentId, setConfirmPauseStudentId] = useState<string | null>(null);

  // Student search & assign state in Regular Class detail view
  const [regStudentAssignId, setRegStudentAssignId] = useState<string>('');
  const [regStudentSearchTerm, setRegStudentSearchTerm] = useState<string>('');
  const [selectedRegMonth, setSelectedRegMonth] = useState<string>('Agosto 2026');
  const [confirmUnassignStudent, setConfirmUnassignStudent] = useState<{ id: string; name: string } | null>(null);

  // Payment Reconfirmation Modal State
  const [paymentConfirmModal, setPaymentConfirmModal] = useState<{
    isOpen: boolean;
    studentName: string;
    paymentConcept: string;
    isCurrentlyPaid: boolean;
    onConfirm: () => void;
  } | null>(null);

  const handleConfirmConvocatoriaPayment = (
    studentName: string,
    cuotaKey: 'cuota1' | 'cuota2' | 'sena' | 'saldoCuota1',
    isCurrentlyPaid: boolean,
    studentId: string
  ) => {
    if (!selectedConvocatoriaId) return;
    let conceptLabel = 'Mes 1';
    if (cuotaKey === 'sena') conceptLabel = 'Seña 50% (Nivel 1)';
    else if (cuotaKey === 'saldoCuota1') conceptLabel = 'Saldo Mes 1 (50%)';
    else if (cuotaKey === 'cuota1') conceptLabel = 'Cuota Mes 1';
    else if (cuotaKey === 'cuota2') conceptLabel = 'Cuota Mes 2';

    setPaymentConfirmModal({
      isOpen: true,
      studentName,
      paymentConcept: conceptLabel,
      isCurrentlyPaid,
      onConfirm: () => {
        toggleStudentConvocatoriaPayment(selectedConvocatoriaId, studentId, cuotaKey);
        setLiveToast(
          !isCurrentlyPaid
            ? `✓ Pago de ${conceptLabel} registrado para ${studentName}`
            : `⚠️ Pago de ${conceptLabel} desmarcado para ${studentName}`
        );
        setPaymentConfirmModal(null);
      }
    });
  };

  const handleConfirmRegularPayment = (
    studentName: string,
    monthName: string,
    isCurrentlyPaid: boolean,
    studentId: string
  ) => {
    if (!selectedRegularClassId) return;
    const conceptLabel = `Cuota Mes de ${monthName}`;

    setPaymentConfirmModal({
      isOpen: true,
      studentName,
      paymentConcept: conceptLabel,
      isCurrentlyPaid,
      onConfirm: () => {
        toggleRegularClassStudentPayment(selectedRegularClassId, studentId, !isCurrentlyPaid, monthName);
        setLiveToast(
          !isCurrentlyPaid
            ? `✓ Pago de ${conceptLabel} registrado para ${studentName}`
            : `⚠️ Pago de ${conceptLabel} desmarcado para ${studentName}`
        );
        setPaymentConfirmModal(null);
      }
    });
  };

  const renderSharedModals = () => (
    <>
      {/* Reconfirmation Modal for Payment Approvals / Toggles */}
      {paymentConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181816] border border-white/[0.1] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-center animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border shadow-md ${
              paymentConfirmModal.isCurrentlyPaid
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            }`}>
              {paymentConfirmModal.isCurrentlyPaid ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-[#eeede9] uppercase tracking-tight">
                {paymentConfirmModal.isCurrentlyPaid ? '¿Desmarcar Pago?' : '¿Confirmar Pago?'}
              </h3>
              <p className="text-xs text-[#e7d9cf]/90 font-medium leading-relaxed">
                {paymentConfirmModal.isCurrentlyPaid ? (
                  <>
                    ¿Estás seguro/a de desmarcar el pago de <strong className="text-white font-bold">{paymentConfirmModal.paymentConcept}</strong> para <strong className="text-white font-bold">{paymentConfirmModal.studentName}</strong>?
                  </>
                ) : (
                  <>
                    ¿Confirmás registrar el pago de <strong className="text-white font-bold">{paymentConfirmModal.paymentConcept}</strong> para <strong className="text-white font-bold">{paymentConfirmModal.studentName}</strong>?
                  </>
                )}
              </p>
              <p className="text-[11px] text-[#e7d9cf]/60">
                {paymentConfirmModal.isCurrentlyPaid
                  ? 'El estado de la cuota del alumno volverá a figurar como pendiente.'
                  : 'Esta acción acreditará el pago y actualizará el estado de la cuota del alumno.'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPaymentConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] text-xs font-bold transition border border-white/[0.08] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={paymentConfirmModal.onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition shadow-lg cursor-pointer ${
                  paymentConfirmModal.isCurrentlyPaid
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {paymentConfirmModal.isCurrentlyPaid ? 'Sí, Desmarcar' : 'Sí, Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reconfirmation Modal for Unassigning Student from Regular Class */}
      {confirmUnassignStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181816] border border-white/[0.1] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-md">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-[#eeede9] uppercase tracking-tight">
                ¿Confirmar Desasignación?
              </h3>
              <p className="text-xs text-[#e7d9cf]/90 font-medium leading-relaxed">
                ¿Estás seguro/a de desasignar a <strong className="text-white font-bold">{confirmUnassignStudent.name}</strong> de esta clase regular?
              </p>
              <p className="text-[11px] text-[#e7d9cf]/60">
                El alumno dejará de estar inscripto en esta clase. Podrás volver a asignarlo en cualquier momento.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUnassignStudent(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] text-xs font-bold transition border border-white/[0.08] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedRegularClassId && confirmUnassignStudent) {
                    removeStudentFromRegularClass(selectedRegularClassId, confirmUnassignStudent.id);
                    setLiveToast(`Alumno ${confirmUnassignStudent.name} desasignado.`);
                    setConfirmUnassignStudent(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition shadow-lg cursor-pointer"
              >
                Sí, Desasignar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* In-App Video Player Modal for Formation & Regular Class Recaps */}
      <VideoPlayerModal
        isOpen={!!activeVideoPlayer}
        onClose={() => setActiveVideoPlayer(null)}
        videoUrl={activeVideoPlayer?.url || ''}
        title={activeVideoPlayer?.title || ''}
        subtitle={activeVideoPlayer?.subtitle}
        description={activeVideoPlayer?.description}
      />
    </>
  );

  // Regular class modal state for Directors
  const [showRegModal, setShowRegModal] = useState(false);
  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const [regDay, setRegDay] = useState('');
  const [regTime, setRegTime] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regLevel, setRegLevel] = useState('');
  const [regInstructor, setRegInstructor] = useState('Tomás & Astrid');
  const [regLocationMapUrl, setRegLocationMapUrl] = useState('');
  const [regPriceMonthly, setRegPriceMonthly] = useState('');
  const [regPaymentMethodId, setRegPaymentMethodId] = useState('');

  const openNewRegModal = () => {
    setEditingRegId(null);
    setRegDay('Lunes y Miércoles');
    setRegTime('20:30 hs');
    setRegAddress('Scalabrini Ortiz 1240, Palermo, CABA — Estudio Palermo');
    setRegLevel('Clase Regular — Graduados Nivel 2');
    setRegInstructor('Tomás & Astrid');
    setRegLocationMapUrl('https://maps.google.com/?q=Scalabrini+Ortiz+1240+Palermo');
    setRegPriceMonthly('$35.000');
    setRegPaymentMethodId(paymentMethods[0]?.id || '');
    setShowRegModal(true);
  };

  const openEditRegModal = (cls: RegularClass) => {
    setEditingRegId(cls.id);
    setRegDay(cls.day);
    setRegTime(cls.time);
    setRegAddress(cls.address);
    setRegLevel(cls.level);
    setRegInstructor(cls.instructor);
    setRegLocationMapUrl(cls.locationMapUrl || '');
    setRegPriceMonthly(cls.priceMonthly || '');
    setRegPaymentMethodId(cls.paymentMethodId || '');
    setShowRegModal(true);
  };

  const handleSaveRegClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDay.trim() || !regTime.trim() || !regAddress.trim() || !regLevel.trim()) return;

    if (editingRegId) {
      updateRegularClass(editingRegId, {
        day: regDay.trim(),
        time: regTime.trim(),
        address: regAddress.trim(),
        level: regLevel.trim(),
        instructor: regInstructor.trim(),
        locationMapUrl: regLocationMapUrl.trim(),
        priceMonthly: regPriceMonthly.trim(),
        paymentMethodId: regPaymentMethodId
      });
    } else {
      addRegularClass({
        day: regDay.trim(),
        time: regTime.trim(),
        address: regAddress.trim(),
        level: regLevel.trim(),
        instructor: regInstructor.trim(),
        locationMapUrl: regLocationMapUrl.trim(),
        priceMonthly: regPriceMonthly.trim(),
        paymentMethodId: regPaymentMethodId
      });
    }
    setShowRegModal(false);
  };

  const selectedConvocatoria = convocatorias.find(c => c.id === selectedConvocatoriaId);

  const handleBackFromFormation = () => {
    setSelectedConvocatoriaId(null);
    setTimeout(() => {
      const el = document.getElementById('formaciones-main-heading') || sectionContentRef.current;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
  };

  const handleBackFromRegularClass = () => {
    setSelectedRegularClassId(null);
    setTimeout(() => {
      const el = document.getElementById('regulares-main-heading') || sectionContentRef.current;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
  };

  // Initialize class dates, schedule, location & recap version when selected convocatoria ID changes
  useEffect(() => {
    if (selectedConvocatoria) {
      const dates = selectedConvocatoria.classDates || [];
      const filled = Array.from({ length: 8 }).map((_, i) => dates[i] || '');
      setClassDatesInput(filled);
      setClassDayInput(selectedConvocatoria.classDay || 'Viernes');
      setClassStartTimeInput(selectedConvocatoria.classStartTime || '20:00');
      setClassEndTimeInput(selectedConvocatoria.classEndTime || '21:30');
      setLocationNameInput(selectedConvocatoria.locationName || 'Sede Central Scalabrini Ortiz 1240, Palermo — CABA');
      setLocationMapUrlInput(selectedConvocatoria.locationMapUrl || 'https://maps.google.com/?q=Scalabrini+Ortiz+1240+Palermo');
      setRecapVersionIdInput(selectedConvocatoria.recapVersionId || 'v1');
    }
  }, [selectedConvocatoriaId]);

  if (!currentUser) return null;

  // --- NON-ADMIN STUDENT EMPTY STATE ---
  if (!isAdmin) {
    const myConvocatorias = convocatorias.filter(c => c.studentIds.includes(currentUser.id));
    const myRegClasses = regularClasses.filter(c => c.studentIds?.includes(currentUser.id));

    if (myConvocatorias.length === 0 && myRegClasses.length === 0) {
      return (
        <div className="max-w-4xl mx-auto p-8 bg-[#56554e]/20 border border-[#56554e]/50 rounded-3xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#56554e]/40 border border-[#e7d9cf]/30 flex items-center justify-center mx-auto text-[#e7d9cf]">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#eeede9] uppercase tracking-tight">Formación & Clases Regulares</h2>
          <p className="text-sm text-[#eeede9]/80 max-w-md mx-auto leading-relaxed">
            Aún no estás asignado a una formación o clase regular. Los Directores te habilitarán el acceso cuando corresponda.
          </p>
        </div>
      );
    }
  }

  // =========================================================================
  // --- DETAIL VIEW: SELECTED CONVOCATORIA (ADMIN or STUDENT) ---
  // =========================================================================
  if (selectedConvocatoria) {
    const currentConfig = formationConfigs.find(fc => fc.id === selectedConvocatoria.levelId) || formationConfigs[0];
    
    // --- ADMIN / DIRECTOR DETAIL VIEW ---
    if (isAdmin) {
      const enrolledStudents = usersList.filter(u => selectedConvocatoria.studentIds.includes(u.id));
      const notEnrolledStudents = usersList.filter(u => u.role !== 'admin' && !selectedConvocatoria.studentIds.includes(u.id));

      const dirLeadersCount = enrolledStudents.filter(s => (selectedConvocatoria.studentRoles?.[s.id] || s.danceRole || 'Leader') === 'Leader').length;
      const dirFollowersCount = enrolledStudents.filter(s => (selectedConvocatoria.studentRoles?.[s.id] || s.danceRole) === 'Follower').length;

      const currentClassFocus = (() => {
        if (!selectedConvocatoria.classDates || selectedConvocatoria.classDates.length === 0) return null;

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const todayIdx = selectedConvocatoria.classDates.findIndex(d => d === todayStr);
        if (todayIdx !== -1) {
          return {
            classNumber: todayIdx + 1,
            dateStr: selectedConvocatoria.classDates[todayIdx],
            isToday: true,
            hasArrived: true,
            label: `📍 ¡HOY (${formatClassDate(selectedConvocatoria.classDates[todayIdx])}) ES LA CLASE ${todayIdx + 1}! Toca controlar asistencias.`
          };
        }

        // REQUIREMENT: When a class date has already passed, it should no longer hold focus.
        // Focus is only given on the exact day of the class.
        return null;
      })();

      const filteredEnrolledStudents = enrolledStudents.filter(s => 
        normalizeText(s.fullName).includes(normalizeText(studentSearchTerm)) ||
        normalizeText(s.email).includes(normalizeText(studentSearchTerm)) ||
        (s.dni && normalizeText(s.dni).includes(normalizeText(studentSearchTerm))) ||
        (s.memberCode && normalizeText(s.memberCode).includes(normalizeText(studentSearchTerm)))
      ).sort((a, b) => a.fullName.localeCompare(b.fullName));

      const activeRecapVersion = (currentConfig.recapVersions || []).find(v => v.id === selectedConvocatoria.recapVersionId) ||
        (currentConfig.recapVersions || []).find(v => v.id === (currentConfig.activeRecapVersionId || 'v1')) ||
        null;

      const displayRecaps = activeRecapVersion ? activeRecapVersion.recaps : currentConfig.recaps;

      const handleSaveDates = () => {
        updateConvocatoriaClassDates(selectedConvocatoria.id, classDatesInput);
        updateConvocatoria(selectedConvocatoria.id, {
          classDay: classDayInput,
          classStartTime: classStartTimeInput,
          classEndTime: classEndTimeInput,
          locationName: locationNameInput,
          locationMapUrl: locationMapUrlInput,
          recapVersionId: recapVersionIdInput
        });
        setDatesSuccessMsg('¡Fechas, horarios, lugar y versión de recaps actualizados correctamente!');
        setTimeout(() => setDatesSuccessMsg(null), 3500);
      };

      const handleAddStudent = (e: React.FormEvent) => {
        e.preventDefault();
        if (studentAssignId) {
          assignStudentToConvocatoria(selectedConvocatoria.id, studentAssignId);
          setStudentAssignId('');
        }
      };

      return (
        <div className="space-y-6 text-[#eeede9]">
          {/* Back Navigation Breadcrumb & Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleBackFromFormation}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#e7d9cf]/80 hover:text-[#eeede9] transition-colors py-1 cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-[#e7d9cf] group-hover:-translate-x-1 transition-transform" />
              <span>Volver a Formaciones</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Modo Director / Profesor</span>
              </span>
            </div>
          </div>

          {/* Top Convocatoria Header Info (Open, Full-Width Layout) */}
          <div className="space-y-4 pt-1">
            {/* Title & Metadata Stats */}
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-4xl font-black uppercase text-[#eeede9] tracking-tight">
                {selectedConvocatoria.title}
              </h1>

              {/* Mobile: Stacked in exact requested order (Nivel, Periodo, Estatus); Desktop: Clean inline text without boxes */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3.5 text-xs text-[#e7d9cf] font-medium">
                {/* 1. Nivel de Formación */}
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-[#e7d9cf]" />
                  <span>Nivel de Formación: <strong className="text-[#eeede9] font-extrabold">{selectedConvocatoria.levelId === 'nivel-1' ? 'Nivel 1' : 'Nivel 2'}</strong></span>
                </div>

                <div className="hidden sm:block text-white/20">•</div>

                {/* 2. Periodo */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#e7d9cf]" />
                  <span>Período: <strong className="text-[#eeede9] font-extrabold">{selectedConvocatoria.period}</strong></span>
                </div>

                <div className="hidden sm:block text-white/20">•</div>

                {/* 3. Estatus */}
                <div className="flex items-center gap-2">
                  <span className="text-[#e7d9cf]/80 font-bold">Estatus:</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${
                    getComputedFormacionStatus(selectedConvocatoria) === 'activa'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : getComputedFormacionStatus(selectedConvocatoria) === 'finalizada'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}>
                    {getComputedFormacionStatus(selectedConvocatoria) === 'activa' ? '● En Cursada' : getComputedFormacionStatus(selectedConvocatoria) === 'finalizada' ? '✓ Finalizada' : 'Próxima'}
                  </span>
                </div>

                {/* Additional Director Metadata Stats */}
                <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0 w-full sm:w-auto">
                  <span className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-xl border border-white/[0.06]">
                    <Users className="w-3.5 h-3.5 text-amber-300" />
                    <span>Inscriptos: <strong className="text-amber-300 font-extrabold">{enrolledStudents.length}</strong></span>
                  </span>
                  <span className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/25 text-[11px] font-extrabold">
                    🕺 {dirLeadersCount} Leaders
                  </span>
                  <span className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[11px] font-extrabold">
                    💃 {dirFollowersCount} Followers
                  </span>
                  {dirLeadersCount === dirFollowersCount ? (
                    <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[11px] font-extrabold">
                      ⚖️ Balance 1:1
                    </span>
                  ) : (
                    <span className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[11px] font-extrabold">
                      ⚠️ {Math.abs(dirLeadersCount - dirFollowersCount)} {dirLeadersCount > dirFollowersCount ? 'Leaders más' : 'Followers más'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cursada & Sede Information Banner (Clean, editorial, clearly non-interactive) */}
            <div className="rounded-2xl bg-gradient-to-r from-[#181816] via-[#141413] to-[#181816] border border-white/[0.08] p-4 sm:p-5 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* 1. Día de Cursada */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#e7d9cf]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] text-[#e7d9cf]/60 uppercase font-black tracking-wider block">
                      Día de Cursada
                    </span>
                    <p className="text-[#eeede9] font-bold text-sm sm:text-base">
                      {selectedConvocatoria.classDay || 'Viernes'}
                    </p>
                  </div>
                </div>

                {/* 2. Horario de Clase */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#e7d9cf]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] text-[#e7d9cf]/60 uppercase font-black tracking-wider block">
                      Horario de Clase
                    </span>
                    <p className="text-[#eeede9] font-bold text-sm sm:text-base">
                      {selectedConvocatoria.classStartTime && selectedConvocatoria.classEndTime
                        ? `${selectedConvocatoria.classStartTime} a ${selectedConvocatoria.classEndTime} hs`
                        : '20:00 a 21:30 hs'}
                    </p>
                  </div>
                </div>

                {/* 3. Lugar / Sede */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#e7d9cf]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[10px] text-[#e7d9cf]/60 uppercase font-black tracking-wider block">
                      Lugar / Sede
                    </span>
                    <p className="text-[#eeede9] font-bold text-xs sm:text-sm leading-snug">
                      {selectedConvocatoria.locationName || 'Sede Central Scalabrini Ortiz 1240, Palermo — CABA'}
                    </p>
                    {selectedConvocatoria.locationMapUrl && (
                      <a
                        href={selectedConvocatoria.locationMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#e7d9cf] hover:text-white underline decoration-[#e7d9cf]/40 hover:decoration-white transition-colors pt-0.5 cursor-pointer"
                        title="Abrir ubicación en Google Maps"
                      >
                        <span>Ver en Google Maps</span>
                        <ExternalLink className="w-3 h-3 text-[#e7d9cf]" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Formation Detail Sub-Navbar for Directors (Matches Regular Classes format) */}
          <div className="sticky top-20 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-[#111111]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-md shadow-black/40 transition-all">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              {/* Back button + Navigation Tabs */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleBackFromFormation}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eeede9]/80 hover:text-[#eeede9] border border-white/[0.1] text-xs font-bold transition shadow-sm cursor-pointer shrink-0 active:scale-95"
                  title="Volver a Formaciones"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#e7d9cf]" />
                  <span className="hidden xs:inline">Volver</span>
                </button>

                {/* Navigation Tabs Pill Segment - Removed from box on mobile to occupy page width, single horizontal line with smooth scroll */}
                <div className="flex items-center gap-1.5 sm:gap-2 p-0.5 sm:p-1 bg-transparent sm:bg-[#161615]/90 rounded-xl sm:rounded-2xl sm:border sm:border-white/[0.08] sm:shadow-inner overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap flex-1 sm:flex-initial">
                  <button
                    type="button"
                    onClick={() => scrollToAdminFormationSection('asistencias')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-fit shrink-0 ${
                      adminDetailTab === 'asistencias'
                        ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                        : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                    <span>Asistencias</span>
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                      adminDetailTab === 'asistencias' ? 'bg-[#111111] text-[#e7d9cf]' : 'bg-white/[0.08] text-[#eeede9]/80'
                    }`}>
                      {enrolledStudents.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToAdminFormationSection('pagos')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-fit shrink-0 ${
                      adminDetailTab === 'pagos'
                        ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                        : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                    }`}
                  >
                    <CircleDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                    <span>Pagos</span>
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                      adminDetailTab === 'pagos' ? 'bg-[#111111] text-[#e7d9cf]' : 'bg-white/[0.08] text-[#eeede9]/80'
                    }`}>
                      {enrolledStudents.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToAdminFormationSection('recaps')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-fit shrink-0 ${
                      adminDetailTab === 'recaps'
                        ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                        : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                    <span>Recaps</span>
                  </button>
                </div>
              </div>

              {/* Desktop Context Tag */}
              <div className="hidden md:flex items-center gap-2 text-xs text-[#eeede9]/60 font-semibold px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#e7d9cf] animate-pulse" />
                <span>Gestión de Formación</span>
              </div>
            </div>
          </div>

          {/* Always show all 3 sections in sequence for Directors: Section 1 (Asistencias), Section 2 (Pagos), Section 3 (Recaps) */}
          <div className="space-y-10">
            {/* SECTION 1: ATTENDANCE MANAGEMENT FOR DIRECTORS */}
            <div ref={adminAsistenciasSectionRef} id="formacion-admin-asistencias" className="scroll-mt-36 space-y-6">
              {/* Focus Class Banner according to current date */}
              {currentClassFocus && (
                <div className={`p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_8px_25px_rgba(0,0,0,0.4)] ${
                  currentClassFocus.isToday
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                    : 'bg-[#181816] border-white/[0.08] text-[#eeede9]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xl shadow-md ${
                      currentClassFocus.isToday ? 'bg-amber-400 text-[#111111] font-black' : 'bg-[#141413] text-[#e7d9cf] border border-white/[0.08]'
                    }`}>
                      {currentClassFocus.isToday ? '🔥' : '🎯'}
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#e7d9cf]/80 block">
                        {currentClassFocus.isToday ? '¡ATENCIÓN DIRECTOR — ASISTENCIA DE HOY!' : 'CLASE A CONTROLAR POR FECHA:'}
                      </span>
                      <span className="text-sm font-black text-[#eeede9]">
                        {currentClassFocus.label}
                      </span>
                    </div>
                  </div>

                  {currentClassFocus.isToday ? (
                    <span className="px-3 py-1 rounded-full bg-amber-400 text-[#111111] text-[11px] font-black uppercase tracking-wider self-start sm:self-auto shadow-md animate-pulse">
                      ● Clase de Hoy
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-[#141413] border border-amber-500/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider self-start sm:self-auto">
                      Clase {currentClassFocus.classNumber} en Foco
                    </span>
                  )}
                </div>
              )}

              {/* Student Search & List Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black uppercase text-[#eeede9]">
                    Listado de Asistencias ({enrolledStudents.length} alumnos)
                  </h3>
                  <p className="text-xs text-[#e7d9cf]">
                    Hacé clic en los números de clase (1 al 8) para registrar o quitar el presente de cada alumno en tiempo real
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForceEnableAttendance(prev => !prev)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 border shadow-sm cursor-pointer ${
                      forceEnableAttendance
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 hover:bg-amber-500/30 ring-1 ring-amber-400/50'
                        : 'bg-[#181816] border-white/[0.08] text-[#eeede9]/80 hover:bg-white/[0.05] hover:text-[#eeede9]'
                    }`}
                    title="Permite a los Directores marcar/modificar asistencias de cualquier clase en caso de eventualidades o formaciones finalizadas"
                  >
                    {forceEnableAttendance ? (
                      <>
                        <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Asistencias Habilitadas</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-[#e7d9cf] shrink-0" />
                        <span>Habilitar asistencias</span>
                      </>
                    )}
                  </button>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#eeede9]/50" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, email o DNI..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="w-full bg-[#181816] border border-white/[0.08] rounded-2xl pl-9 pr-4 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf] shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {forceEnableAttendance && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2.5 shadow-sm">
                  <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Modo eventualidad / formación finalizada activo:</strong> Podés marcar y corregir el presente de cualquier clase (1 a 8) sin restricciones.
                  </span>
                </div>
              )}

              {/* Enrolled Students Table / Cards */}
              {filteredEnrolledStudents.length === 0 ? (
                <div className="p-8 text-center bg-[#181816] border border-white/[0.08] rounded-3xl space-y-2 shadow-[0_8px_25px_rgba(0,0,0,0.45)]">
                  <Users className="w-8 h-8 text-[#eeede9]/40 mx-auto" />
                  <p className="text-xs text-[#eeede9]/60 font-bold">No hay alumnos inscriptos que coincidan con la búsqueda</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/[0.08] shadow-[0_8px_25px_rgba(0,0,0,0.45)] bg-[#141413]">
                  <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-[#1c1b1a] text-[#e7d9cf] uppercase text-[10px] font-black tracking-wider border-b border-white/[0.08]">
                        <th className="p-3.5 whitespace-nowrap min-w-[180px]">Alumno</th>
                        <th className="p-3.5 text-center whitespace-nowrap min-w-[110px]">Rol</th>
                        {Array.from({ length: 8 }).map((_, idx) => {
                          const classNum = idx + 1;
                          const dateStr = selectedConvocatoria.classDates?.[idx];
                          const activeClassNum = currentClassFocus ? currentClassFocus.classNumber : (selectedConvocatoria.activeClassNumber || 1);
                          const isFocusClass = currentClassFocus?.classNumber === classNum;
                          return (
                            <th
                              key={`th-conv-c-${classNum}`}
                              className={`p-2 text-center whitespace-nowrap border-l border-white/[0.06] ${
                                isFocusClass ? 'bg-amber-400 text-[#111111] font-black' : 'text-[#e7d9cf]'
                              }`}
                            >
                              <div className="font-extrabold text-[10px]">Clase {classNum}</div>
                              {dateStr && (
                                <div className={`text-[8px] font-normal ${isFocusClass ? 'text-[#111111]' : 'text-[#e7d9cf]/70'}`}>
                                  {formatClassDate(dateStr)}
                                </div>
                              )}
                            </th>
                          );
                        })}
                        <th className="p-3.5 text-center whitespace-nowrap min-w-[100px] border-l border-white/[0.06]">Asistencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredEnrolledStudents.map((student, sIdx) => {
                        const studentAttendance = selectedConvocatoria.attendanceMap[student.id] || [];
                        const attendedCount = studentAttendance.length;
                        const attendancePercent = Math.round((attendedCount / 8) * 100);
                        const isGraduated = isStudentGraduated(selectedConvocatoria, student.id);
                        const studentRole = selectedConvocatoria.studentRoles?.[student.id] || student.danceRole || 'Leader';

                        return (
                          <tr key={`att-st-row-${student.id}-${sIdx}`} className="hover:bg-white/[0.03] transition">
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={student.avatarUrl || DEFAULT_AVATAR_URL}
                                  alt={student.fullName}
                                  className="w-8 h-8 rounded-full object-cover border border-white/[0.1]"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-xs text-[#eeede9]">{student.fullName}</span>
                                    {isGraduated && (
                                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[8px] font-black border border-emerald-500/30">
                                        🎓 75%+
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-[#e7d9cf]/70 block">{student.email} {student.dni ? `• DNI: ${student.dni}` : ''}</span>
                                </div>
                              </div>
                            </td>

                            <td className="p-3 text-center whitespace-nowrap">
                              {isAdmin ? (
                                <select
                                  value={studentRole === 'Leader' ? 'Leader' : 'Follower'}
                                  onChange={(e) => {
                                    const newRole = e.target.value as DanceRole;
                                    updateStudentConvocatoriaRole(selectedConvocatoria.id, student.id, newRole);
                                    setLiveToast(`Rol actualizado a ${newRole} para ${student.fullName}`);
                                  }}
                                  className="bg-[#181816] border border-white/[0.1] rounded-lg px-2 py-1 text-[11px] font-bold text-[#eeede9] focus:outline-none cursor-pointer hover:border-[#e7d9cf]"
                                >
                                  <option value="Leader">🕺 Leader</option>
                                  <option value="Follower">💃 Follower</option>
                                </select>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-[#181816] border border-white/[0.1] text-[#e7d9cf] text-[10px] font-extrabold uppercase">
                                  {studentRole === 'Leader' ? '🕺 Leader' : '💃 Follower'}
                                </span>
                              )}
                            </td>

                            {Array.from({ length: 8 }).map((_, idx) => {
                              const classNum = idx + 1;
                              const isAttended = studentAttendance.includes(classNum);

                              const activeClassNum = currentClassFocus ? currentClassFocus.classNumber : (selectedConvocatoria.activeClassNumber || 1);
                              const isFutureClass = !forceEnableAttendance && (classNum > activeClassNum);
                              const isFocusClass = currentClassFocus?.classNumber === classNum && currentClassFocus?.hasArrived;
                              const showFocus = isFocusClass && !isAttended;

                              return (
                                <td key={`att-cell-${student.id}-c${classNum}`} className="p-1.5 text-center whitespace-nowrap border-l border-white/[0.04]">
                                  <button
                                    type="button"
                                    disabled={isFutureClass}
                                    onClick={() => !isFutureClass && toggleStudentConvocatoriaAttendance(selectedConvocatoria.id, student.id, classNum)}
                                    className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center font-black text-xs transition border ${
                                      isFutureClass
                                        ? 'opacity-30 cursor-not-allowed bg-[#111111]/40 border-white/[0.04] text-[#eeede9]/30'
                                        : isAttended
                                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30 shadow-sm cursor-pointer'
                                        : showFocus
                                        ? 'bg-amber-500/30 border-amber-500 text-amber-200 animate-pulse ring-2 ring-amber-400 cursor-pointer'
                                        : 'bg-[#181816] border-white/[0.08] text-[#eeede9]/40 hover:bg-white/[0.06] hover:text-[#eeede9] cursor-pointer'
                                    }`}
                                    title={isFutureClass ? `Clase ${classNum} aún no realizada` : `Marcar/desmarcar Clase ${classNum}`}
                                  >
                                    {isAttended ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : isFutureClass ? '🔒' : '—'}
                                  </button>
                                </td>
                              );
                            })}

                            <td className="p-3 text-center whitespace-nowrap border-l border-white/[0.06] font-extrabold text-[#e7d9cf]">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-black shadow-sm ${
                                attendancePercent >= 75
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-[#181816] text-[#e7d9cf] border border-white/[0.08]'
                              }`}>
                                {attendedCount}/8 ({attendancePercent}%)
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 2: PAYMENT CONTROL FOR DIRECTORS */}
            <div ref={adminPagosSectionRef} id="formacion-admin-pagos" className="scroll-mt-36 space-y-6">
              {/* Payment Summary Metrics Header */}
              {(() => {
                const totalStudents = enrolledStudents.length;
                const activeClass = selectedConvocatoria.activeClassNumber || 1;
                const activeMonth = activeClass <= 4 ? 1 : 2;
                const isNivel1 = selectedConvocatoria.levelId === 'nivel-1';

                const c1PaidCount = enrolledStudents.filter(s => {
                  const p = selectedConvocatoria.studentPayments?.[s.id];
                  return !!p?.cuota1 || (!!p?.sena && !!p?.saldoCuota1);
                }).length;

                const c2PaidCount = enrolledStudents.filter(s => selectedConvocatoria.studentPayments?.[s.id]?.cuota2).length;
                
                const senaPaidCount = enrolledStudents.filter(s => {
                  const p = selectedConvocatoria.studentPayments?.[s.id];
                  return !!p?.sena || !!p?.cuota1;
                }).length;

                const saldoPaidCount = enrolledStudents.filter(s => {
                  const p = selectedConvocatoria.studentPayments?.[s.id];
                  return !!p?.saldoCuota1 || !!p?.cuota1;
                }).length;

                // Count students "Al día" based on active month
                const upToDateCount = enrolledStudents.filter(s => {
                  const p = selectedConvocatoria.studentPayments?.[s.id];
                  const c1 = !!p?.cuota1 || (!!p?.sena && !!p?.saldoCuota1);
                  return activeMonth === 1 ? c1 : (c1 && !!p?.cuota2);
                }).length;

                const c1Percent = totalStudents > 0 ? Math.round((c1PaidCount / totalStudents) * 100) : 0;
                const c2Percent = totalStudents > 0 ? Math.round((c2PaidCount / totalStudents) * 100) : 0;
                const senaPercent = totalStudents > 0 ? Math.round((senaPaidCount / totalStudents) * 100) : 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Card 1: Total Enrolled */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#201f1c] to-[#141413] border border-white/[0.08] flex items-center justify-between shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#e7d9cf]/80 block">Alumnos Asignados</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-[#eeede9]">{totalStudents}</span>
                          <span className="text-xs font-bold text-[#e7d9cf]/70">alumnos</span>
                        </div>
                        <span className="text-[11px] font-bold text-[#e7d9cf] flex items-center gap-1 pt-0.5">
                          <Sparkles className="w-3.5 h-3.5" /> {upToDateCount} al día (Mes {activeMonth} vigente)
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-[#e7d9cf]/15 border border-[#e7d9cf]/30 flex items-center justify-center text-[#e7d9cf] shrink-0 shadow-md">
                        <Users className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Card 2: Cuota 1 Progress */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#201f1c] to-[#141413] border border-emerald-500/30 space-y-2.5 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#e7d9cf]/80 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          {isNivel1 ? 'Señas / Cuota 1 (50%+50%)' : 'Cuota 1 (Mes 1)'}
                        </span>
                        <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full shadow-sm">
                          {isNivel1 ? `${senaPercent}% Señas` : `${c1Percent}%`}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-emerald-300">
                          {isNivel1 ? senaPaidCount : c1PaidCount} <span className="text-xs text-[#e7d9cf]/70 font-bold">/ {totalStudents} {isNivel1 ? 'señas señadas' : 'abonados'}</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#111111] rounded-full overflow-hidden border border-white/[0.08]">
                        <div className="h-full bg-emerald-400 transition-all duration-500 rounded-full" style={{ width: `${isNivel1 ? senaPercent : c1Percent}%` }} />
                      </div>
                    </div>

                    {/* Card 3: Cuota 2 Progress */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#201f1c] to-[#141413] border border-emerald-500/30 space-y-2.5 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#e7d9cf]/80 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                          Cuota 2 (Mes 2)
                        </span>
                        <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full shadow-sm">
                          {c2Percent}%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-emerald-300">{c2PaidCount} <span className="text-xs text-[#e7d9cf]/70 font-bold">/ {totalStudents} abonados</span></span>
                      </div>
                      <div className="w-full h-2 bg-[#111111] rounded-full overflow-hidden border border-white/[0.08]">
                        <div className="h-full bg-emerald-400 transition-all duration-500 rounded-full" style={{ width: `${c2Percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Controls Bar: Filters & Search */}
              <div className="p-4 sm:p-5 rounded-3xl bg-[#181816] border border-white/[0.08] space-y-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                {(() => {
                  const activeClass = selectedConvocatoria.activeClassNumber || 1;
                  const activeMonth = activeClass <= 4 ? 1 : 2;
                  const isNivel1 = selectedConvocatoria.levelId === 'nivel-1';

                  return (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Status Filter Tabs */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => setPaymentFilter('todos')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            paymentFilter === 'todos'
                              ? 'bg-[#e7d9cf] text-[#111111] shadow-md'
                              : 'bg-white/[0.04] text-[#e7d9cf] hover:bg-white/[0.08] border border-white/[0.08]'
                          }`}
                        >
                          Todos ({enrolledStudents.length})
                        </button>

                        {isNivel1 && (
                          <>
                            <button
                              onClick={() => setPaymentFilter('sena_pendiente')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                paymentFilter === 'sena_pendiente'
                                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md'
                                  : 'bg-white/[0.04] text-[#e7d9cf] hover:bg-white/[0.08] border border-white/[0.08]'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Seña Pendiente (50%)
                            </button>

                            <button
                              onClick={() => setPaymentFilter('saldo_pendiente')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                paymentFilter === 'saldo_pendiente'
                                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md'
                                  : 'bg-white/[0.04] text-[#e7d9cf] hover:bg-white/[0.08] border border-white/[0.08]'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Saldo Mes 1 Pendiente
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setPaymentFilter('c1_pendiente')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            paymentFilter === 'c1_pendiente'
                              ? 'bg-[#e7d9cf] text-[#111111] shadow-md'
                              : 'bg-white/[0.04] text-[#e7d9cf] hover:bg-white/[0.08] border border-white/[0.08]'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Cuota 1 Incompleta
                        </button>

                        <button
                          onClick={() => setPaymentFilter('c2_pendiente')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            paymentFilter === 'c2_pendiente'
                              ? 'bg-[#e7d9cf] text-[#111111] shadow-md'
                              : 'bg-white/[0.04] text-[#e7d9cf] hover:bg-white/[0.08] border border-white/[0.08]'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Cuota 2 Pendiente
                        </button>

                        <button
                          onClick={() => setPaymentFilter('al_dia')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            paymentFilter === 'al_dia'
                              ? 'bg-emerald-500 text-[#111111] shadow-md'
                              : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Al Día (Mes {activeMonth})
                        </button>

                        <button
                          onClick={() => setPaymentFilter('pausados')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            paymentFilter === 'pausados'
                              ? 'bg-rose-500 text-[#111111] shadow-md'
                              : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30'
                          }`}
                        >
                          <Pause className="w-3.5 h-3.5" />
                          Pausados
                        </button>
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#eeede9]/50" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre, DNI..."
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                          className="w-full bg-[#141413] border border-white/[0.08] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf] shadow-sm"
                        />
                        {studentSearchTerm && (
                          <button
                            onClick={() => setStudentSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#eeede9]/50 hover:text-[#eeede9]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Enrolled Students Payment List */}
              {(() => {
                const activeClass = selectedConvocatoria.activeClassNumber || 1;
                const activeMonth = activeClass <= 4 ? 1 : 2;
                const isNivel1 = selectedConvocatoria.levelId === 'nivel-1';

                const listToRender = filteredEnrolledStudents.filter(student => {
                  const p = selectedConvocatoria.studentPayments?.[student.id] || {};
                  const isC1Paid = !!p.cuota1 || (!!p.sena && !!p.saldoCuota1);
                  const isSenaPaid = !!p.sena || isC1Paid;
                  const isSaldoPaid = !!p.saldoCuota1 || isC1Paid;

                  if (paymentFilter === 'sena_pendiente') return !isSenaPaid;
                  if (paymentFilter === 'saldo_pendiente') return !isSaldoPaid;
                  if (paymentFilter === 'c1_pendiente') return !isC1Paid;
                  if (paymentFilter === 'c2_pendiente') return !p.cuota2;
                  if (paymentFilter === 'al_dia') return activeMonth === 1 ? isC1Paid : (isC1Paid && !!p.cuota2);
                  if (paymentFilter === 'pausados') return !!p.isPaused;
                  return true;
                });

                if (listToRender.length === 0) {
                  return (
                    <div className="p-10 text-center bg-[#181816] border border-white/[0.08] rounded-3xl space-y-2 shadow-[0_8px_25px_rgba(0,0,0,0.45)]">
                      <Users className="w-8 h-8 text-[#eeede9]/40 mx-auto" />
                      <p className="text-xs text-[#eeede9]/70 font-bold">No hay alumnos que coincidan con los criterios seleccionados.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-2xl border border-white/[0.08] shadow-[0_8px_25px_rgba(0,0,0,0.45)] bg-[#141413]">
                    <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                      <thead>
                        <tr className="bg-[#1c1b1a] text-[#e7d9cf] uppercase text-[10px] font-black tracking-wider border-b border-white/[0.08]">
                          <th className="p-3.5 whitespace-nowrap min-w-[180px]">Alumno</th>
                          <th className="p-3.5 text-center whitespace-nowrap min-w-[120px]">Rol & Modo</th>
                          {isNivel1 ? (
                            <>
                              <th className="p-3.5 text-center whitespace-nowrap min-w-[130px]">Seña 50%</th>
                              <th className="p-3.5 text-center whitespace-nowrap min-w-[130px]">Saldo M1 (50%)</th>
                            </>
                          ) : (
                            <th className="p-3.5 text-center whitespace-nowrap min-w-[140px]">Cuota Mes 1</th>
                          )}
                          <th className="p-3.5 text-center whitespace-nowrap min-w-[140px]">Cuota Mes 2</th>
                          <th className="p-3.5 text-center whitespace-nowrap min-w-[120px]">Estatus</th>
                          <th className="p-3.5 text-center whitespace-nowrap min-w-[100px]">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {listToRender.map((student, sIdx) => {
                          const studentRole = selectedConvocatoria.studentRoles?.[student.id] || student.danceRole || 'Leader';
                          const enrollmentType = selectedConvocatoria.studentEnrollmentTypes?.[student.id] || 'individual';
                          const partnerId = selectedConvocatoria.studentPartners?.[student.id];
                          const partnerUser = partnerId ? usersList.find(u => u.id === partnerId) : null;
                          const paymentInfo = selectedConvocatoria.studentPayments?.[student.id] || {};

                          const isCuota1Paid = !!paymentInfo.cuota1 || (!!paymentInfo.sena && !!paymentInfo.saldoCuota1);
                          const isSenaPaid = !!paymentInfo.sena || isCuota1Paid;
                          const isSaldoPaid = !!paymentInfo.saldoCuota1 || isCuota1Paid;
                          const isCuota2Paid = !!paymentInfo.cuota2;
                          const isStudentPaused = !!paymentInfo.isPaused;
                          const isUpToDate = activeMonth === 1 ? isCuota1Paid : (isCuota1Paid && isCuota2Paid);

                          return (
                            <tr key={`pay-row-${student.id}-${sIdx}`} className={`hover:bg-white/[0.03] transition ${isStudentPaused ? 'bg-rose-950/20' : ''}`}>
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={student.avatarUrl || DEFAULT_AVATAR_URL}
                                    alt={student.fullName}
                                    className={`w-8 h-8 rounded-full object-cover border ${isStudentPaused ? 'border-rose-500' : 'border-white/[0.1]'}`}
                                  />
                                  <div>
                                    <strong className="text-[#eeede9] block font-bold text-xs">{student.fullName}</strong>
                                    <span className="text-[10px] text-[#e7d9cf]/70 block">{student.email} {student.dni ? `• DNI: ${student.dni}` : ''}</span>
                                    {enrollmentType === 'pareja' && partnerUser && (
                                      <span className="text-[9px] text-emerald-300 font-extrabold block">Pareja: {partnerUser.fullName}</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="p-3 text-center whitespace-nowrap space-y-1">
                                {isAdmin ? (
                                  <select
                                    value={studentRole === 'Leader' ? 'Leader' : 'Follower'}
                                    onChange={(e) => {
                                      const newRole = e.target.value as DanceRole;
                                      updateStudentConvocatoriaRole(selectedConvocatoria.id, student.id, newRole);
                                      setLiveToast(`Rol actualizado a ${newRole} para ${student.fullName}`);
                                    }}
                                    className="bg-[#181816] border border-white/[0.1] rounded-lg px-2 py-0.5 text-[11px] font-bold text-[#eeede9] focus:outline-none cursor-pointer hover:border-[#e7d9cf]"
                                  >
                                    <option value="Leader">🕺 Leader</option>
                                    <option value="Follower">💃 Follower</option>
                                  </select>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-[#181816] border border-white/[0.1] text-[#e7d9cf] text-[10px] font-extrabold uppercase">
                                    {studentRole === 'Leader' ? '🕺 Leader' : '💃 Follower'}
                                  </span>
                                )}
                                <div className="text-[10px] text-[#e7d9cf]/80 font-bold uppercase">
                                  {enrollmentType === 'pareja' ? '👥 En Pareja' : '👤 Individual'}
                                </div>
                              </td>

                              {isNivel1 ? (
                                <>
                                  <td className="p-3 text-center whitespace-nowrap border-l border-white/[0.04]">
                                    <button
                                      onClick={() => handleConfirmConvocatoriaPayment(student.fullName, 'sena', isSenaPaid, student.id)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition border cursor-pointer ${
                                        isSenaPaid
                                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30 shadow-sm'
                                          : 'bg-[#181816] border-white/[0.08] text-[#e7d9cf]/70 hover:bg-white/[0.06] hover:text-[#eeede9]'
                                      }`}
                                    >
                                      {isSenaPaid ? '✓ Seño 50%' : '— Pendiente'}
                                    </button>
                                  </td>

                                  <td className="p-3 text-center whitespace-nowrap border-l border-white/[0.04]">
                                    <button
                                      onClick={() => handleConfirmConvocatoriaPayment(student.fullName, 'saldoCuota1', isSaldoPaid, student.id)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition border cursor-pointer ${
                                        isSaldoPaid
                                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30 shadow-sm'
                                          : 'bg-[#181816] border-white/[0.08] text-[#e7d9cf]/70 hover:bg-white/[0.06] hover:text-[#eeede9]'
                                      }`}
                                    >
                                      {isSaldoPaid ? '✓ Saldo 50%' : '— Pendiente'}
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <td className="p-3 text-center whitespace-nowrap border-l border-white/[0.04]">
                                  <button
                                    onClick={() => handleConfirmConvocatoriaPayment(student.fullName, 'cuota1', isCuota1Paid, student.id)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition border cursor-pointer ${
                                      isCuota1Paid
                                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30 shadow-sm'
                                        : 'bg-[#181816] border-white/[0.08] text-[#e7d9cf]/70 hover:bg-white/[0.06] hover:text-[#eeede9]'
                                    }`}
                                  >
                                    {isCuota1Paid ? '✓ Abonada' : '— Pendiente'}
                                  </button>
                                </td>
                              )}

                              <td className="p-3 text-center whitespace-nowrap border-l border-white/[0.04]">
                                <button
                                  onClick={() => handleConfirmConvocatoriaPayment(student.fullName, 'cuota2', isCuota2Paid, student.id)}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition border cursor-pointer ${
                                    isCuota2Paid
                                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30 shadow-sm'
                                      : 'bg-[#181816] border-white/[0.08] text-[#e7d9cf]/70 hover:bg-white/[0.06] hover:text-[#eeede9]'
                                  }`}
                                >
                                  {isCuota2Paid ? '✓ Abonada' : '— Pendiente'}
                                </button>
                              </td>

                              <td className="p-3 text-center whitespace-nowrap border-l border-white/[0.04]">
                                {isStudentPaused ? (
                                  <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/50 text-[10px] font-black uppercase shadow-sm">
                                    ⏸️ Pausado
                                  </span>
                                ) : isUpToDate ? (
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase shadow-sm">
                                    ✨ Al Día
                                  </span>
                                ) : isSenaPaid ? (
                                  <span className="px-2.5 py-1 rounded-xl bg-[#e7d9cf]/20 text-[#e7d9cf] border border-[#e7d9cf]/40 text-[10px] font-black uppercase shadow-sm">
                                    Seña OK
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase shadow-sm">
                                    Pendiente
                                  </span>
                                )}
                              </td>

                              <td className="p-3 text-center whitespace-nowrap border-l border-white/[0.04]">
                                <button
                                  type="button"
                                  onClick={() => toggleStudentConvocatoriaPause(selectedConvocatoria.id, student.id)}
                                  className={`p-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase transition border shadow-sm cursor-pointer ${
                                    isStudentPaused
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                                  }`}
                                  title={isStudentPaused ? 'Reanudar acceso del alumno' : 'Pausar alumno por mora'}
                                >
                                  {isStudentPaused ? 'Reanudar' : 'Pausar'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* SECTION 3: RECAP UNLOCK & PREVIEW FOR DIRECTORS */}
            <div ref={adminRecapsSectionRef} id="formacion-admin-recaps" className="scroll-mt-36 space-y-4">
              {/* Section Header Outside Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div>
                  <h2 className="font-black text-base sm:text-lg md:text-xl uppercase text-[#eeede9] tracking-tight flex items-center gap-2">
                    <Video className="w-5 h-5 text-[#e7d9cf]" />
                    <span>Habilitación Manual de Recaps</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#e7d9cf]">
                    Además del desbloqueo automático por fecha a las 23:00 hs, podés forzar manualmente la clase activa hasta la cual los alumnos pueden ver recaps
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <span className="text-xs font-bold text-[#e7d9cf]">Habilitar hasta:</span>
                  <select
                    value={selectedConvocatoria.activeClassNumber || 1}
                    onChange={(e) => updateConvocatoriaActiveClassNumber(selectedConvocatoria.id, parseInt(e.target.value))}
                    className="bg-[#181816] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-[#e7d9cf] font-bold focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <option key={`recap-class-opt-${i + 1}`} value={i + 1}>
                        Clase {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 sm:p-8 bg-[#181816] border border-white/[0.08] rounded-3xl space-y-5 shadow-[0_8px_25px_rgba(0,0,0,0.45)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayRecaps.map((recap, rIdx) => {
                    const isUnlocked = isRecapUnlocked(selectedConvocatoria, recap.classNumber);
                    const dateStr = selectedConvocatoria.classDates?.[recap.classNumber - 1];

                    return (
                      <div
                        key={`recap-item-${recap.classNumber}-${rIdx}`}
                        className={`p-5 rounded-2xl border transition space-y-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)] ${
                          isUnlocked
                            ? 'bg-[#141413] border-emerald-500/40 text-[#eeede9]'
                            : 'bg-[#141413]/70 border-white/[0.06] text-[#eeede9]/60'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-white/[0.06]">
                          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#181816] text-[#e7d9cf] border border-white/[0.08] shrink-0">
                            Clase {recap.classNumber}
                          </span>

                          {isUnlocked ? (
                            <span className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Habilitado</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold uppercase text-[#e7d9cf] flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Bloqueado</span>
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-extrabold text-sm text-[#eeede9]">{recap.title}</h4>
                          <p className="text-xs text-[#eeede9]/80 mt-1">{recap.description}</p>
                        </div>

                        {dateStr && (
                          <p className="text-[10px] font-semibold text-[#e7d9cf]">
                            📅 Fecha asignada: {formatClassDate(dateStr)} (Auto-apertura @ 23:00 hs)
                          </p>
                        )}

                        {recap.driveUrl ? (
                          <button
                            type="button"
                            onClick={() => setActiveVideoPlayer({
                              url: recap.driveUrl,
                              title: `Clase ${recap.classNumber}: ${recap.title}`,
                              subtitle: dateStr ? `📅 ${formatClassDate(dateStr)}` : undefined,
                              description: recap.description,
                            })}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#e7d9cf] text-[#111111] font-black text-xs hover:bg-[#eeede9] transition shadow-md cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Ver Video en Reproductor</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#e7d9cf] font-bold block">Sin link de Google Drive cargado.</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          {renderSharedModals()}
        </div>
      );
    }

    // --- STUDENT DETAIL VIEW ---
    const studentAttendance = selectedConvocatoria.attendanceMap[currentUser.id] || [];
    const attendedCount = studentAttendance.length;
    const totalClasses = currentConfig.totalClasses || 8;
    const attendancePercent = Math.round((attendedCount / totalClasses) * 100);
    const minRequiredCount = currentConfig.minClassesForCert || 6;
    const hasMetAttendanceGoal = attendedCount >= minRequiredCount;

    const isFinishedByDate = isConvocatoriaFinishedByDate(selectedConvocatoria);
    const isCompleted = isFinishedByDate || selectedConvocatoria.status === 'finalizada' || attendedCount >= 8;
    const isAutoGraduated = isStudentGraduated(selectedConvocatoria, currentUser.id);

    const activeRecapVersion = (currentConfig.recapVersions || []).find(v => v.id === selectedConvocatoria.recapVersionId) ||
      (currentConfig.recapVersions || []).find(v => v.id === (currentConfig.activeRecapVersionId || 'v1')) ||
      null;

    const displayRecaps = activeRecapVersion ? activeRecapVersion.recaps : currentConfig.recaps;

    return (
      <div className="space-y-6 text-[#eeede9]">
        {/* Back Navigation Breadcrumb & Header */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleBackFromFormation}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#e7d9cf]/80 hover:text-[#eeede9] transition-colors py-1 cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-[#e7d9cf] group-hover:-translate-x-1 transition-transform" />
            <span>Volver a Formaciones</span>
          </button>
        </div>

        {/* Top Convocatoria Header Info for Students (Open, Full-Width Layout) */}
        <div className="space-y-4 pt-1">
          {/* Role and Modality Badges (Level badge removed to avoid duplication) */}
          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const assignedRole = selectedConvocatoria.studentRoles?.[currentUser.id] || currentUser.danceRole || 'Leader';
              const enrollmentType = selectedConvocatoria.studentEnrollmentTypes?.[currentUser.id] || 'individual';

              return (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#eeede9] text-[11px] font-black uppercase shadow-sm whitespace-nowrap shrink-0">
                    {assignedRole === 'Leader' ? '🕺 Leader' : assignedRole === 'Follower' ? '💃 Follower' : '🕺💃 Leader & Follower'}
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#eeede9] text-[11px] font-black uppercase shadow-sm whitespace-nowrap shrink-0">
                    {enrollmentType === 'pareja' ? '👥 En Pareja' : '👤 Individual'}
                  </div>
                </>
              );
            })()}
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl font-black uppercase text-[#eeede9] tracking-tight">
              {selectedConvocatoria.title}
            </h1>

            {/* Mobile: Stacked in exact requested order (Nivel, Periodo, Estatus); Desktop: Clean inline without boxes */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3.5 text-xs text-[#e7d9cf] font-medium">
              {/* 1. Nivel de Formación */}
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#e7d9cf]" />
                <span>Nivel de Formación: <strong className="text-[#eeede9] font-extrabold">{selectedConvocatoria.levelId === 'nivel-1' ? 'Nivel 1' : 'Nivel 2'}</strong></span>
              </div>

              <div className="hidden sm:block text-white/20">•</div>

              {/* 2. Periodo */}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#e7d9cf]" />
                <span>Período: <strong className="text-[#eeede9] font-extrabold">{selectedConvocatoria.period}</strong></span>
              </div>

              <div className="hidden sm:block text-white/20">•</div>

              {/* 3. Estatus */}
              <div className="flex items-center gap-2">
                <span className="text-[#e7d9cf]/80 font-bold">Estatus:</span>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${
                  getComputedFormacionStatus(selectedConvocatoria) === 'activa'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : getComputedFormacionStatus(selectedConvocatoria) === 'finalizada'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}>
                  {getComputedFormacionStatus(selectedConvocatoria) === 'activa' ? '● En Cursada' : getComputedFormacionStatus(selectedConvocatoria) === 'finalizada' ? '✓ Finalizada' : 'Próxima'}
                </span>
              </div>
            </div>
          </div>

          {/* Cursada & Sede Information Banner (Clean, editorial, clearly non-interactive) */}
          <div className="rounded-2xl bg-gradient-to-r from-[#181816] via-[#141413] to-[#181816] border border-white/[0.08] p-4 sm:p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* 1. Día de Cursada */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#e7d9cf]">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] text-[#e7d9cf]/60 uppercase font-black tracking-wider block">
                    Día de Cursada
                  </span>
                  <p className="text-[#eeede9] font-bold text-sm sm:text-base">
                    {selectedConvocatoria.classDay || 'Viernes'}
                  </p>
                </div>
              </div>

              {/* 2. Horario de Clase */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#e7d9cf]">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] text-[#e7d9cf]/60 uppercase font-black tracking-wider block">
                    Horario de Clase
                  </span>
                  <p className="text-[#eeede9] font-bold text-sm sm:text-base">
                    {selectedConvocatoria.classStartTime && selectedConvocatoria.classEndTime
                      ? `${selectedConvocatoria.classStartTime} a ${selectedConvocatoria.classEndTime} hs`
                      : '20:00 a 21:30 hs'}
                  </p>
                </div>
              </div>

              {/* 3. Lugar / Sede */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#e7d9cf]">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <span className="text-[10px] text-[#e7d9cf]/60 uppercase font-black tracking-wider block">
                    Lugar / Sede
                  </span>
                  <p className="text-[#eeede9] font-bold text-xs sm:text-sm leading-snug">
                    {selectedConvocatoria.locationName || 'Sede Central Scalabrini Ortiz 1240, Palermo — CABA'}
                  </p>
                  {selectedConvocatoria.locationMapUrl && (
                    <a
                      href={selectedConvocatoria.locationMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#e7d9cf] hover:text-white underline decoration-[#e7d9cf]/40 hover:decoration-white transition-colors pt-0.5 cursor-pointer"
                      title="Abrir ubicación en Google Maps"
                    >
                      <span>Ver en Google Maps</span>
                      <ExternalLink className="w-3 h-3 text-[#e7d9cf]" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Formation Detail Sub-Navbar for Students (Matches Regular Classes format) */}
        <div className="sticky top-20 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-[#111111]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-md shadow-black/40 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Back button + Navigation Tabs */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleBackFromFormation}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eeede9]/80 hover:text-[#eeede9] border border-white/[0.1] text-xs font-bold transition shadow-sm cursor-pointer shrink-0 active:scale-95"
                title="Volver a Formaciones"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#e7d9cf]" />
                <span className="hidden xs:inline">Volver</span>
              </button>

              {/* Navigation Tabs Pill Segment - Removed from box on mobile to occupy page width, single horizontal line with smooth scroll */}
              <div className="flex items-center gap-1.5 sm:gap-2 p-0.5 sm:p-1 bg-transparent sm:bg-[#161615]/90 rounded-xl sm:rounded-2xl sm:border sm:border-white/[0.08] sm:shadow-inner overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => scrollToStudentFormationSection('asistencia')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-fit shrink-0 ${
                  studentDetailTab === 'asistencia'
                    ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                    : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                <span>Asistencia</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                  studentDetailTab === 'asistencia' ? 'bg-[#111111] text-[#e7d9cf]' : 'bg-white/[0.08] text-[#eeede9]/80'
                }`}>
                  {attendedCount}/8
                </span>
              </button>

              <button
                type="button"
                onClick={() => scrollToStudentFormationSection('pagos')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-fit shrink-0 ${
                  studentDetailTab === 'pagos'
                    ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                    : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                }`}
              >
                <CircleDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                <span>Pagos</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToStudentFormationSection('cierre')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-fit shrink-0 ${
                  studentDetailTab === 'cierre'
                    ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                    : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                }`}
              >
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                <span>Certificados</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToStudentFormationSection('recaps')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-fit shrink-0 ${
                  studentDetailTab === 'recaps'
                    ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                    : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                }`}
              >
                <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                <span>Recaps</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                  studentDetailTab === 'recaps' ? 'bg-[#111111] text-[#e7d9cf]' : 'bg-white/[0.08] text-[#eeede9]/80'
                }`}>
                  {displayRecaps.length}
                </span>
              </button>
            </div>
          </div>

          {/* Desktop Context Tag */}
            <div className="hidden md:flex items-center gap-2 text-xs text-[#eeede9]/60 font-semibold px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#e7d9cf] animate-pulse" />
              <span>Contenido del Alumno</span>
            </div>
          </div>
        </div>

        {/* All Student Formation Sections Displayed Continuously with Sub-Nav Scroll Anchors */}
        <div className="space-y-10">
          {/* SECTION 1: ATTENDANCE METRICS & PROGRESS */}
          <div ref={studentAsistenciaSectionRef} id="formacion-student-asistencia" className="scroll-mt-36 space-y-4">
            {/* Section Header Outside Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#e7d9cf]/10 text-[#e7d9cf] border border-white/[0.08] shadow-sm shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-base sm:text-lg md:text-xl uppercase text-[#eeede9] tracking-tight">
                    Asistencia en esta Formación
                  </h2>
                  <p className="text-xs sm:text-sm text-[#e7d9cf]">
                    Requisito de asistencia del 75% mínimo (6 de 8 clases) para recibir el certificado
                  </p>
                </div>
              </div>
            </div>

            {/* Attendance Content Card */}
            <div className="bg-[#181816] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_8px_25px_rgba(0,0,0,0.45)]">
              {/* Centered Attendance Counter inside the card */}
              <div className="flex flex-col items-center justify-center text-center space-y-1">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black text-[#e7d9cf] tracking-tight">
                    {attendedCount} / {totalClasses}
                  </span>
                  <span className="text-base sm:text-lg font-black text-[#eeede9]/60">
                    ({attendancePercent}%)
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#eeede9]/70">
                  Clases Asistidas
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="relative w-full h-4 bg-[#111111] rounded-full overflow-hidden border border-white/[0.08]">
                  <div
                    className={`h-full transition-all duration-500 ${
                      hasMetAttendanceGoal ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-[#e7d9cf]'
                    }`}
                    style={{ width: `${Math.min(attendancePercent, 100)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#eeede9] z-10"
                    style={{ left: '75%' }}
                    title="Meta del 75% para certificado"
                  />
                </div>

                <div className="flex justify-between text-[11px] font-bold text-[#eeede9]/60">
                  <span>0%</span>
                  <span className="text-[#e7d9cf]">Meta 75% (6 Clases)</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Status Callout Box */}
              {hasMetAttendanceGoal ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 shadow-sm">
                  <Award className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-extrabold block text-sm">¡Cumplís con el requisito de asistencia! 🎉</span>
                    <span className="text-emerald-300/80">
                      Llevás {attendedCount} clases asistidas ({attendancePercent}%). Tenés asegurado tu certificado.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3 shadow-sm">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-extrabold block text-sm">Cursada en Desarrollo ({attendancePercent}%)</span>
                    <span className="text-amber-200/80">
                      Te faltan {minRequiredCount - attendedCount} clase(s) asistida(s) para alcanzar la meta del 75% necesaria para el certificado
                    </span>
                  </div>
                </div>
              )}

              {/* Visual Attendance Grid 1 to 8 with Dates */}
              <div className="pt-2">
                <span className="text-[11px] font-extrabold text-[#eeede9]/70 uppercase tracking-wider block mb-2">
                  Cronograma de Clases & Presentismo
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {Array.from({ length: totalClasses }).map((_, idx) => {
                    const classNum = idx + 1;
                    const isAttended = studentAttendance.includes(classNum);
                    const classDateStr = selectedConvocatoria.classDates?.[idx];

                    return (
                      <div
                        key={`my-att-grid-${classNum}`}
                        className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between gap-1 transition shadow-sm ${
                          isAttended
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : 'bg-[#141413] border-white/[0.08] text-[#eeede9]/60'
                        }`}
                      >
                        <span className="text-[10px] font-extrabold uppercase">Clase {classNum}</span>
                        <span className="text-[9px] font-semibold text-[#e7d9cf]">
                          {classDateStr ? formatClassDate(classDateStr) : 'Sin Fecha'}
                        </span>
                        {isAttended ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                        ) : (
                          <span className="text-[9px] font-semibold text-[#eeede9]/40 mt-0.5">Pendiente</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRICING & PAYMENT INFORMATION BOX */}
          <div ref={studentPagosSectionRef} id="formacion-student-pagos" className="scroll-mt-36 space-y-4">
            {/* Section Header Outside Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#e7d9cf] to-[#d8c3b5] text-[#111111] shadow-md shrink-0">
                  <CircleDollarSign className="w-5 h-5 text-[#111111]" />
                </div>
                <div>
                  <h2 className="font-black text-base sm:text-lg md:text-xl uppercase text-[#eeede9] tracking-tight">
                    Inversión & Datos Bancarios
                  </h2>
                  <p className="text-xs sm:text-sm text-[#e7d9cf]">
                    Acá encontrarás el valor de tu cuota, estatus de pago e información bancaria
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing & Banking Content Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#181816] border border-white/[0.08] shadow-[0_8px_25px_rgba(0,0,0,0.45)] space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Prices / Valor de la Inversión */}
            <div className="p-5 sm:p-6 bg-[#141413] rounded-2xl border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.25)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <span className="text-xs font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#e7d9cf]" />
                  <span>Valor de la Inversión</span>
                </span>
              </div>

              {/* Deadline Badge */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong className="text-amber-300 font-extrabold">Plazo máximo para pagos:</strong> Hasta el día 5 de cada mes</span>
              </div>

              {(() => {
                const userEnrollmentType = selectedConvocatoria.studentEnrollmentTypes?.[currentUser.id] || 'individual';
                const userPartnerId = selectedConvocatoria.studentPartners?.[currentUser.id];
                const userPartner = userPartnerId ? usersList.find(u => u.id === userPartnerId) : null;
                const isNivel1 = selectedConvocatoria.levelId === 'nivel-1';

                if (isAdmin) {
                  return (
                    <div className="space-y-2 pt-1 text-[#eeede9]">
                      <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[#e7d9cf] font-semibold text-xs">Individual:</span>
                        <span className="font-black text-[#eeede9] text-sm">{formatCurrency(selectedConvocatoria.priceIndividual || '$45.000')}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-[#e7d9cf] font-semibold text-xs">Pareja:</span>
                        <span className="font-black text-[#eeede9] text-sm">{formatCurrency(selectedConvocatoria.priceCouple || '$80.000 ($40.000 c/u)')}</span>
                      </div>
                    </div>
                  );
                }

                const rawPrice = userEnrollmentType === 'pareja' 
                  ? (selectedConvocatoria.priceCouple || '$80.000 ($40.000 c/u)')
                  : (selectedConvocatoria.priceIndividual || '$45.000');
                const formattedPrice = formatCurrency(rawPrice);

                return (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 py-2.5 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[#eeede9]/90 font-semibold text-xs flex items-center gap-1.5 shrink-0">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span>Monto Total Cuota / Mes:</span>
                      </span>
                      <span className="font-black text-white text-base tracking-wide shrink-0">
                        {formattedPrice}
                      </span>
                    </div>

                    {isNivel1 && (
                      <div className="py-3 px-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-[#eeede9] space-y-2">
                        <span className="font-bold text-[#e7d9cf] block text-[11px] uppercase tracking-wider">
                          💡 Plan de Pago Nivel 1 (Mes 1 en 2 partes):
                        </span>
                        <div className="space-y-1.5 pl-1">
                          <div className="flex justify-between items-center text-[11px] text-[#eeede9]/80">
                            <span>1. Seña Reserva de Cupo (50%):</span>
                            <span className="font-bold text-white whitespace-nowrap ml-2">{getHalfPriceFormatted(rawPrice)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-[#eeede9]/80">
                            <span>2. Saldo restante Mes 1 (50% al iniciar):</span>
                            <span className="font-bold text-white whitespace-nowrap ml-2">{getHalfPriceFormatted(rawPrice)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {userEnrollmentType === 'pareja' && (
                      <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        {userPartner ? (
                          <img
                            src={userPartner.avatarUrl || DEFAULT_AVATAR_URL}
                            alt={userPartner.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-white/[0.1] shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#e7d9cf] font-bold text-xs">
                            👥
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] uppercase font-bold text-[#e7d9cf] block tracking-wider">
                            Pareja Asignada
                          </span>
                          <span className="font-semibold text-xs text-white truncate block">
                            {userPartner ? userPartner.fullName : (userPartnerId || 'Inscripto en Pareja')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Student Cuotas Status */}
              {!isAdmin && (() => {
                const studentPayment = selectedConvocatoria.studentPayments?.[currentUser.id] || {};
                const isNivel1 = selectedConvocatoria.levelId === 'nivel-1';

                const isC1Paid = !!studentPayment.cuota1 || (!!studentPayment.sena && !!studentPayment.saldoCuota1);
                const isSenaPaid = !!studentPayment.sena || isC1Paid;
                const isSaldoPaid = !!studentPayment.saldoCuota1 || isC1Paid;
                const isC2Paid = !!studentPayment.cuota2;
                const isAllPaid = isC1Paid && isC2Paid;

                const userEnrollmentType = selectedConvocatoria.studentEnrollmentTypes?.[currentUser.id] || 'individual';
                const rawPrice = userEnrollmentType === 'pareja' 
                  ? (selectedConvocatoria.priceCouple || '$80.000 ($40.000 c/u)')
                  : (selectedConvocatoria.priceIndividual || '$45.000');

                // Determine active month based on activeClassNumber or class dates
                const activeClass = selectedConvocatoria.activeClassNumber || 1;
                const class5Date = selectedConvocatoria.classDates?.[4];
                let activeMonth = activeClass <= 4 ? 1 : 2;

                if (class5Date && class5Date.trim().length > 0) {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const day = String(today.getDate()).padStart(2, '0');
                  const todayStr = `${year}-${month}-${day}`;
                  if (todayStr >= class5Date) {
                    activeMonth = 2;
                  }
                }

                // Determine badge label and style based on active month and payment status
                let statusBadgeText = '';
                let statusBadgeStyle = '';

                if (isAllPaid) {
                  statusBadgeText = '✨ CURSO 100% PAGO';
                  statusBadgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                } else if (activeMonth === 2) {
                  statusBadgeText = '⏳ MES 2 PENDIENTE';
                  statusBadgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                } else {
                  if (isC1Paid) {
                    statusBadgeText = '✨ MES 1 PAGADO';
                    statusBadgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                  } else if (isSenaPaid) {
                    statusBadgeText = '🟡 Seña (50%) Abonada';
                    statusBadgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                  } else {
                    statusBadgeText = '⚠️ MES 1 PENDIENTE';
                    statusBadgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                  }
                }

                return (
                  <div className="pt-4 border-t border-white/[0.08] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs uppercase font-black text-[#e7d9cf] tracking-wider flex items-center gap-1.5 shrink-0">
                        <CreditCard className="w-3.5 h-3.5 text-[#e7d9cf]" />
                        <span>Estado de Mis Cuotas</span>
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border shrink-0 ${statusBadgeStyle}`}>
                        {statusBadgeText}
                      </span>
                    </div>

                    {isNivel1 ? (
                      /* 3 Cards breakdown for Nivel 1 */
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* 1. Seña 50% */}
                        <div className={`p-3 rounded-xl border transition-all space-y-1 ${
                          isSenaPaid 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] uppercase font-extrabold ${isSenaPaid ? 'text-emerald-200' : 'text-amber-200'}`}>1. Seña (50%)</span>
                            {isSenaPaid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          <span className={`text-xs font-black uppercase block tracking-wide ${isSenaPaid ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {isSenaPaid ? '🟢 ABONADA' : '🟡 PENDIENTE'}
                          </span>
                          <span className={`text-[10px] font-medium block ${isSenaPaid ? 'text-emerald-200/80' : 'text-amber-200/80'}`}>
                            Reserva: {getHalfPriceFormatted(rawPrice)}
                          </span>
                        </div>

                        {/* 2. Saldo Mes 1 50% */}
                        <div className={`p-3 rounded-xl border transition-all space-y-1 ${
                          isSaldoPaid 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] uppercase font-extrabold ${isSaldoPaid ? 'text-emerald-200' : 'text-amber-200'}`}>2. Saldo Mes 1 (50%)</span>
                            {isSaldoPaid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          <span className={`text-xs font-black uppercase block tracking-wide ${isSaldoPaid ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {isSaldoPaid ? '🟢 ABONADO' : '🟡 PENDIENTE'}
                          </span>
                          <span className={`text-[10px] font-medium block ${isSaldoPaid ? 'text-emerald-200/80' : 'text-amber-200/80'}`}>
                            Inicio: {getHalfPriceFormatted(rawPrice)}
                          </span>
                        </div>

                        {/* 3. Cuota 2 (Mes 2) */}
                        <div className={`p-3 rounded-xl border transition-all space-y-1 ${
                          isC2Paid 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] uppercase font-extrabold ${isC2Paid ? 'text-emerald-200' : 'text-amber-200'}`}>3. Cuota 2 (Mes 2)</span>
                            {isC2Paid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          <span className={`text-xs font-black uppercase block tracking-wide ${isC2Paid ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {isC2Paid ? '🟢 ABONADA' : '🟡 PENDIENTE'}
                          </span>
                          <span className={`text-[10px] font-medium block ${isC2Paid ? 'text-emerald-200/80' : 'text-amber-200/80'}`}>
                            Mes 2: {formatCurrency(rawPrice)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Standard 2 Cards for Nivel 2+ */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Cuota 1 (Mes 1) */}
                        <div className={`p-3 rounded-xl border transition-all space-y-1 ${
                          isC1Paid 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] uppercase font-extrabold ${isC1Paid ? 'text-emerald-200' : 'text-amber-200'}`}>Cuota 1 (Mes 1)</span>
                            {isC1Paid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                          <span className={`text-xs font-black uppercase block tracking-wide ${isC1Paid ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {isC1Paid ? '🟢 ABONADA' : '🟡 PENDIENTE'}
                          </span>
                          <span className={`text-[10px] font-medium block ${isC1Paid ? 'text-emerald-200/80' : 'text-amber-200/80'}`}>
                            Monto: {formatCurrency(rawPrice)}
                          </span>
                        </div>

                        {/* Cuota 2 (Mes 2) */}
                        <div className={`p-3 rounded-xl border transition-all space-y-1 ${
                          isC2Paid 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] uppercase font-extrabold ${isC2Paid ? 'text-emerald-200' : 'text-amber-200'}`}>Cuota 2 (Mes 2)</span>
                            {isC2Paid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                          <span className={`text-xs font-black uppercase block tracking-wide ${isC2Paid ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {isC2Paid ? '🟢 ABONADA' : '🟡 PENDIENTE'}
                          </span>
                          <span className={`text-[10px] font-medium block ${isC2Paid ? 'text-emerald-200/80' : 'text-amber-200/80'}`}>
                            Monto: {formatCurrency(rawPrice)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Payment Details / Datos Bancarios */}
            <div className="p-5 sm:p-6 bg-[#141413] rounded-2xl border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.25)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <span className="text-xs font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#e7d9cf]" />
                  <span>Datos Bancarios</span>
                </span>
              </div>

              {(() => {
                const studentPayment = selectedConvocatoria.studentPayments?.[currentUser.id] || {};
                const isC1Paid = !!studentPayment.cuota1 || (!!studentPayment.sena && !!studentPayment.saldoCuota1);
                const isC2Paid = !!studentPayment.cuota2;
                const isAllPaid = isC1Paid && isC2Paid;

                const convPm = selectedConvocatoria.paymentMethodId
                  ? paymentMethods.find(pm => pm.id === selectedConvocatoria.paymentMethodId)
                  : (paymentMethods.length > 0 ? paymentMethods[0] : null);

                const displayBank = convPm?.bank || selectedConvocatoria.paymentBank;
                const displayAlias = convPm?.alias || selectedConvocatoria.paymentAlias;
                const displayCbu = convPm?.cbu || selectedConvocatoria.paymentCbu;
                const displayHolder = convPm?.holder || selectedConvocatoria.paymentHolder;

                if (!displayBank && !displayAlias && !displayCbu && !displayHolder) {
                  return (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-1">
                      <p className="text-xs font-bold text-[#e7d9cf]">Medio de pago no configurado</p>
                      <p className="text-[11px] text-[#eeede9]/60">
                        La Dirección aún no ha registrado datos bancarios para esta formación.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 pt-1 text-[#eeede9] text-xs">
                    {/* Banco / Entidad */}
                    {displayBank && (
                      <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                        <span className="text-[11px] font-bold uppercase text-[#e7d9cf] tracking-wider">
                          Banco / Entidad
                        </span>
                        <span className="font-bold text-xs text-white">
                          {displayBank}
                        </span>
                      </div>
                    )}

                    {/* Titular */}
                    {displayHolder && (
                      <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                        <span className="text-[11px] font-bold uppercase text-[#e7d9cf] tracking-wider">
                          Titular
                        </span>
                        <span className="font-semibold text-xs text-[#eeede9]">
                          {displayHolder}
                        </span>
                      </div>
                    )}

                    {/* Alias */}
                    {displayAlias && (
                      <div className="py-2.5 border-b border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase text-[#e7d9cf] tracking-wider">
                            Alias
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(displayAlias, 'alias')}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-[#e7d9cf] transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                            title="Copiar Alias"
                          >
                            {copiedField === 'alias' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="text-[10px] font-bold">{copiedField === 'alias' ? 'Copiado' : 'Copiar Alias'}</span>
                          </button>
                        </div>
                        <div className="font-mono font-black text-sm text-[#e7d9cf] select-all break-all tracking-wide">
                          {displayAlias}
                        </div>
                      </div>
                    )}

                    {/* CBU/CVU */}
                    {displayCbu && (
                      <div className="py-2.5 border-b border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase text-[#e7d9cf] tracking-wider">
                            CBU / CVU
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(displayCbu, 'cbu')}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-[#e7d9cf] transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                            title="Copiar CBU"
                          >
                            {copiedField === 'cbu' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="text-[10px] font-bold">{copiedField === 'cbu' ? 'Copiado' : 'Copiar CBU'}</span>
                          </button>
                        </div>
                        <div className="font-mono font-medium text-xs text-[#eeede9]/90 select-all break-all tracking-wider">
                          {displayCbu}
                        </div>
                      </div>
                    )}

                    {/* Action: Whatsapp Comprobante Button */}
                    {!isAdmin && !isAllPaid && (
                      <div className="pt-2">
                        <a
                          href={`https://wa.me/5491170608171?text=${encodeURIComponent(`Hola Tomás y Astrid! Adjunto comprobante de pago de la formación ${selectedConvocatoria.title}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 font-bold text-xs transition flex items-center justify-center gap-2 border border-emerald-500/30 shadow-sm cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                          <span>Enviar comprobante</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
            </div>
          </div>

          {/* SECTION 3: CERTIFICATE DELIVERY & DEMO RECORDING DETAILS BOX */}
          <div ref={studentCierreSectionRef} id="formacion-student-cierre" className="scroll-mt-36 space-y-4">
            {/* Section Header Outside Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#e7d9cf] text-[#111111] shadow-md shrink-0">
                  <Award className="w-5 h-5 text-[#111111]" />
                </div>
                <div>
                  <h2 className="font-black text-base sm:text-lg md:text-xl uppercase text-[#eeede9] tracking-tight flex items-center gap-2">
                    <span>Entrega de Certificados & Grabación de Demos</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#e7d9cf]">
                    Jornada abierta de cierre de cursada, entrega de certificados y grabación de demos
                  </p>
                </div>
              </div>
            </div>

            {/* Event Details Content Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#181816] border border-white/[0.08] shadow-[0_8px_25px_rgba(0,0,0,0.45)] space-y-5">
              {/* Unified Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-[#141413] rounded-2xl border border-white/[0.08] space-y-1.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-extrabold uppercase text-[#e7d9cf] tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#e7d9cf]" />
                    <span>Fecha del Evento</span>
                  </span>
                  <p className="text-sm font-bold text-white">
                    {selectedConvocatoria.certificateDate || 'A confirmar por los Directores'}
                  </p>
                </div>

                <div className="p-4 bg-[#141413] rounded-2xl border border-white/[0.08] space-y-1.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-extrabold uppercase text-[#e7d9cf] tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#e7d9cf]" />
                    <span>Horario</span>
                  </span>
                  <p className="text-sm font-bold text-white">
                    {selectedConvocatoria.certificateTime || 'A confirmar'}
                  </p>
                </div>

                <div className="p-4 bg-[#141413] rounded-2xl border border-white/[0.08] space-y-1.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-extrabold uppercase text-[#e7d9cf] tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#e7d9cf]" />
                    <span>Lugar</span>
                  </span>
                  <p className="text-sm font-bold text-white">
                    {selectedConvocatoria.certificateLocation || 'Sede de la Cursada'}
                  </p>
                  {(selectedConvocatoria.certificateLocationMapUrl || selectedConvocatoria.demoRecordingMapUrl) && (
                    <div className="pt-1">
                      <a
                        href={selectedConvocatoria.certificateLocationMapUrl || selectedConvocatoria.demoRecordingMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-[10px] font-black transition shadow-sm"
                      >
                        <MapPin className="w-3 h-3 text-[#111111]" />
                        <span>Ver Ubicación en Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: RECAPS & VIDEOS */}
          <div ref={studentRecapsSectionRef} id="formacion-student-recaps" className="scroll-mt-36 space-y-4">
            {/* Section Header Outside Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/[0.06] text-[#e7d9cf] border border-white/[0.08] shadow-sm shrink-0">
                  <Video className="w-5 h-5 text-[#e7d9cf]" />
                </div>
                <div>
                  <h2 className="font-black text-base sm:text-lg md:text-xl uppercase text-[#eeede9] tracking-tight flex items-center gap-2">
                    <span>Recaps de Figuras</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#e7d9cf]">
                    Cada recap se habilita automáticamente el día de la clase a las 23:00 hs (o según habilitación de los directores)
                  </p>
                </div>
              </div>
            </div>

          {(() => {
            const isStudentPausedInCurrentConv = !isAdmin && !!selectedConvocatoria.studentPayments?.[currentUser?.id || '']?.isPaused;

            if (isStudentPausedInCurrentConv) {
              return (
                <div className="p-8 sm:p-12 rounded-3xl bg-rose-500/10 border border-rose-500/40 text-center space-y-4 shadow-2xl my-4">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center mx-auto border border-rose-500/40 shadow-lg">
                    <Lock className="w-8 h-8 text-rose-300" />
                  </div>
                  <h3 className="text-xl font-black text-rose-200 uppercase tracking-wide">
                    Acceso a Recaps Restringido
                  </h3>
                  <p className="text-base sm:text-lg font-extrabold text-rose-200 max-w-lg mx-auto bg-rose-950/80 py-3.5 px-6 rounded-2xl border border-rose-500/40 shadow-inner">
                    Hasta no regularizar tus pagos, no podrás acceder a los recaps
                  </p>
                  <p className="text-xs sm:text-sm text-[#e7d9cf]/80 max-w-md mx-auto font-medium">
                    Ponete en contacto con la administración para consultar tus cuotas y reactivar tu acceso inmediatamente
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayRecaps.map((recap, rIdx) => {
                  const isUnlocked = isRecapUnlocked(selectedConvocatoria, recap.classNumber);
                  const classDateStr = selectedConvocatoria.classDates?.[recap.classNumber - 1];

                  return (
                    <div
                      key={`recap-card-${recap.classNumber}-${rIdx}`}
                      className={`p-4 sm:p-5 rounded-3xl border transition space-y-3.5 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.45)] ${
                        isUnlocked
                          ? 'bg-[#181816] border-white/[0.08]'
                          : 'bg-[#141413]/70 border-white/[0.05] opacity-75'
                      }`}
                    >
                      <div className="space-y-2.5 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#141413] text-[#e7d9cf] border border-white/[0.08] shrink-0">
                              Clase {recap.classNumber}
                            </span>

                            {classDateStr && (
                              <span className="text-[10px] font-bold text-[#e7d9cf] flex items-center gap-1 shrink-0">
                                <Calendar className="w-3 h-3 text-[#e7d9cf]" />
                                <span>{formatClassDate(classDateStr)}</span>
                              </span>
                            )}
                          </div>

                          {isUnlocked ? (
                            <span className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center gap-1 shrink-0 self-start sm:self-auto">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Habilitado</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold uppercase text-amber-400 flex items-center gap-1 shrink-0 self-start sm:self-auto">
                              <Lock className="w-3.5 h-3.5" />
                              <span>23:00 hs el día de clase</span>
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <h3 className="font-extrabold text-sm sm:text-base text-[#eeede9] leading-snug break-words">
                            {recap.title}
                          </h3>

                          <p className="text-xs text-[#eeede9]/80 leading-relaxed break-words">
                            {recap.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-1">
                        {isUnlocked ? (
                          recap.driveUrl && recap.driveUrl.trim() !== '' ? (
                            <button
                              type="button"
                              onClick={() => setActiveVideoPlayer({
                                url: recap.driveUrl,
                                title: `Clase ${recap.classNumber}: ${recap.title}`,
                                subtitle: classDateStr ? `📅 ${formatClassDate(classDateStr)}` : undefined,
                                description: recap.description,
                              })}
                              className="w-full py-2.5 px-4 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition shadow-md flex items-center justify-center gap-2 group min-w-0 cursor-pointer"
                            >
                              <Play className="w-4 h-4 fill-current text-[#111111] shrink-0" />
                              <span className="truncate">Ver Video</span>
                            </button>
                          ) : null
                        ) : (
                          <div className="w-full py-2.5 px-3 rounded-xl bg-[#141413] border border-white/[0.08] text-[#eeede9]/60 text-xs font-bold text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate text-[11px]">Habilita {classDateStr ? `${formatClassDate(classDateStr)} a las 23:00 hs` : 'al dictar la clase'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
      {renderSharedModals()}
    </div>
  );
}

  // =========================================================================
  // --- MAIN LIST VIEW: DIRECTORS / ADMINS vs STUDENTS ---
  // =========================================================================

  const upcomingConvocatoriasList = convocatorias.filter(c => c.status === 'proxima');

  return (
    <div className="space-y-6 text-[#eeede9]">
      {/* Sticky Top Academy Sub-Navbar (Formaciones vs Clases Regulares) */}
      {!selectedRegularClassId && (
        <div className="sticky top-20 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-[#111111]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-md shadow-black/40 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Navigation Tabs Pill Segment - Perfectly balanced & centered on mobile */}
            <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:gap-1.5 p-0.5 sm:p-1 bg-transparent sm:bg-[#161615]/90 rounded-xl sm:rounded-2xl sm:border sm:border-white/[0.08] sm:shadow-inner w-full sm:w-auto max-w-md sm:max-w-none mx-auto sm:mx-0">
              <button
                type="button"
                onClick={() => handleTabSwitch('convocatorias')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-0 ${
                  mainTab === 'convocatorias'
                    ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                    : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                <span className="truncate">Formaciones</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                  mainTab === 'convocatorias'
                    ? 'bg-[#111111] text-[#e7d9cf]'
                    : 'bg-white/[0.08] text-[#eeede9]/80'
                }`}>
                  {isAdmin ? convocatorias.length : convocatorias.filter(c => c.studentIds.includes(currentUser.id)).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabSwitch('regulares')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-0 ${
                  mainTab === 'regulares'
                    ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                    : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                <span className="truncate">Regulares</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                  mainTab === 'regulares'
                    ? 'bg-[#111111] text-[#e7d9cf]'
                    : 'bg-white/[0.08] text-[#eeede9]/80'
                }`}>
                  {isAdmin ? regularClasses.length : regularClasses.filter(c => c.studentIds?.includes(currentUser.id)).length}
                </span>
              </button>
            </div>

            {/* Desktop Context Tag / Visual Info */}
            <div className="hidden md:flex items-center gap-2 text-xs text-[#eeede9]/60 font-semibold px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <span className="w-2 h-2 rounded-full bg-[#e7d9cf] animate-pulse" />
              <span>
                {mainTab === 'convocatorias'
                  ? 'Nivel 1 & 2 • Formaciones'
                  : 'Entrenamientos regulares'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Target anchor ref for smooth scrolling to section start */}
      <div ref={sectionContentRef} className="scroll-mt-36">
        {/* ===================================================================== */}
        {/* TAB 1: CLASES REGULARES FIJAS                                        */}
        {/* ===================================================================== */}
        {mainTab === 'regulares' ? (
        selectedRegularClassId ? (
          /* REGULAR CLASS DETAIL VIEW */
          (() => {
            const selectedRegCls = regularClasses.find(c => c.id === selectedRegularClassId);
            if (!selectedRegCls) {
              setSelectedRegularClassId(null);
              return null;
            }
            const enrolledStudentIds = selectedRegCls.studentIds || [];
            const enrolledStudents = usersList.filter(u => enrolledStudentIds.includes(u.id)).sort((a, b) => a.fullName.localeCompare(b.fullName));
            const availableStudentsToAssign = usersList.filter(u => 
              u.nivel2Completed === true &&
              !enrolledStudentIds.includes(u.id) &&
              (regStudentSearchTerm.trim() === '' || 
                normalizeText(u.fullName).includes(normalizeText(regStudentSearchTerm)) ||
                normalizeText(u.email).includes(normalizeText(regStudentSearchTerm)) ||
                (u.dni && normalizeText(u.dni).includes(normalizeText(regStudentSearchTerm))) ||
                (u.memberCode && normalizeText(u.memberCode).includes(normalizeText(regStudentSearchTerm))))
            ).sort((a, b) => a.fullName.localeCompare(b.fullName));
            const currentMonth = (() => {
              const monthsMap: Record<number, string> = {
                0: 'Enero 2026', 1: 'Febrero 2026', 2: 'Marzo 2026', 3: 'Abril 2026',
                4: 'Mayo 2026', 5: 'Junio 2026', 6: 'Julio 2026', 7: 'Agosto 2026',
                8: 'Septiembre 2026', 9: 'Octubre 2026', 10: 'Noviembre 2026', 11: 'Diciembre 2026'
              };
              return monthsMap[new Date().getMonth()] || 'Agosto 2026';
            })();

            const yearlyMonths = [
              'Marzo 2026', 'Abril 2026', 'Mayo 2026', 'Junio 2026',
              'Julio 2026', 'Agosto 2026', 'Septiembre 2026', 'Octubre 2026',
              'Noviembre 2026', 'Diciembre 2026'
            ];

            const isUserEnrolledInRegClass = enrolledStudentIds.includes(currentUser.id);
            const isUserPaid = selectedRegCls.monthlyPayments?.[currentMonth]?.[currentUser.id]?.paid === true;

            const allRecaps = selectedRegCls.recaps || [];

            // Extract all unique months mentioned in recap dates / titles
            const availableRecapMonths = (() => {
              const months = new Set<string>();
              const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
              ];
              allRecaps.forEach(r => {
                monthNames.forEach(m => {
                  if ((r.date || '').toLowerCase().includes(m.toLowerCase()) || (r.title || '').toLowerCase().includes(m.toLowerCase())) {
                    months.add(m);
                  }
                });
              });
              return Array.from(months);
            })();

            const filteredRecaps = allRecaps.filter(recap => {
              const matchesSearch = !regRecapSearchQuery.trim() ||
                (recap.title || '').toLowerCase().includes(regRecapSearchQuery.toLowerCase()) ||
                (recap.description || '').toLowerCase().includes(regRecapSearchQuery.toLowerCase()) ||
                (recap.date || '').toLowerCase().includes(regRecapSearchQuery.toLowerCase());

              const matchesMonth = regRecapMonthFilter === 'todos' ||
                (recap.date || '').toLowerCase().includes(regRecapMonthFilter.toLowerCase()) ||
                (recap.title || '').toLowerCase().includes(regRecapMonthFilter.toLowerCase());

              return matchesSearch && matchesMonth;
            });

            return (
              <div className="space-y-6">
                {/* Navigation Back Breadcrumb Header */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={handleBackFromRegularClass}
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#e7d9cf]/80 hover:text-[#eeede9] transition-colors py-1 cursor-pointer group"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#e7d9cf] group-hover:-translate-x-1 transition-transform" />
                    <span>Volver a Clases Regulares</span>
                  </button>
                </div>

                {/* Top Regular Class Header Info (Open, Full-Width Layout) */}
                <div className="space-y-4 pt-1">
                  {/* Title & Instructor metadata */}
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-4xl font-black uppercase text-[#eeede9] tracking-tight">
                      {selectedRegCls.level}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#e7d9cf] font-medium">
                      <span className="flex items-center gap-1.5 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/[0.06]">
                        <Users className="w-3.5 h-3.5 text-[#e7d9cf]" />
                        <span>Instructores: <strong className="text-[#eeede9] font-extrabold">{selectedRegCls.instructor}</strong></span>
                      </span>
                    </div>
                  </div>

                  {/* Info Information Banner: Formato, Day/Time & Address/Location */}
                  <div className="rounded-2xl bg-gradient-to-r from-[#181816] via-[#141413] to-[#181816] border border-white/[0.08] p-4 sm:p-5 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      {/* 1. Formato */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#e7d9cf]">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] text-[#e7d9cf]/60 uppercase font-black tracking-wider block">
                            Formato
                          </span>
                          <p className="text-[#eeede9] font-bold text-sm sm:text-base uppercase">
                            Clase Regular
                          </p>
                        </div>
                      </div>

                      {/* 2. Días & Horarios */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#e7d9cf]">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] text-[#e7d9cf]/60 uppercase font-black tracking-wider block">
                            Días & Horarios
                          </span>
                          <p className="text-[#eeede9] font-bold text-sm sm:text-base">
                            {selectedRegCls.day} — {selectedRegCls.time}
                          </p>
                        </div>
                      </div>

                      {/* 3. Dirección / Sede */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#e7d9cf]">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <span className="text-[10px] text-[#e7d9cf]/60 uppercase font-black tracking-wider block">
                            Dirección / Sede
                          </span>
                          <p className="text-[#eeede9] font-bold text-xs sm:text-sm leading-snug">
                            {selectedRegCls.address}
                          </p>
                          <a
                            href={selectedRegCls.locationMapUrl || `https://maps.google.com/?q=${encodeURIComponent(selectedRegCls.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#e7d9cf] hover:text-white underline decoration-[#e7d9cf]/40 hover:decoration-white transition-colors pt-0.5 cursor-pointer"
                            title="Abrir en Google Maps"
                          >
                            <span>Ver en Google Maps</span>
                            <ExternalLink className="w-3 h-3 text-[#e7d9cf]" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Regular Class Detail Sub-Navbar (Located right below the header banner, sticks on scroll) */}
                <div className="sticky top-20 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-[#111111]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-md shadow-black/40 transition-all">
                  <div className="max-w-7xl mx-auto flex items-center justify-start gap-3">
                    {/* Back button + Navigation Tabs */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleBackFromRegularClass}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eeede9]/80 hover:text-[#eeede9] border border-white/[0.1] text-xs font-bold transition shadow-sm cursor-pointer shrink-0 active:scale-95"
                        title="Volver a Clases Regulares"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-[#e7d9cf]" />
                        <span className="hidden xs:inline">Volver</span>
                      </button>

                      {/* Navigation Tabs Pill Segment */}
                      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:gap-1.5 p-0.5 sm:p-1 bg-transparent sm:bg-[#161615]/90 rounded-xl sm:rounded-2xl sm:border sm:border-white/[0.08] sm:shadow-inner flex-1 sm:flex-initial">
                      <button
                        type="button"
                        onClick={() => scrollToRegClassSection('info')}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-0 ${
                          regClassDetailTab === 'info'
                            ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                            : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                        <span className="truncate">Info & Pagos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => scrollToRegClassSection('recaps')}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-0 ${
                          regClassDetailTab === 'recaps'
                            ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                            : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                        <span className="truncate">Recaps</span>
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                          regClassDetailTab === 'recaps'
                            ? 'bg-[#111111] text-[#e7d9cf]'
                            : 'bg-white/[0.08] text-[#eeede9]/80'
                        }`}>
                          {allRecaps.length}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

                {/* Always show both sections: Section 1 (Info & Pagos) and Section 2 (Recaps) */}
                <div className="space-y-10">
                  {/* ========================================================= */}
                  {/* SECTION 1: INFO & PAGOS                                   */}
                  {/* ========================================================= */}
                  <div ref={regClassInfoSectionRef} id="section-reg-info" className="scroll-mt-36 space-y-4">
                    {/* STUDENT PERSPECTIVE */}
                    {!isAdmin && (
                      <div className="space-y-4">
                        {/* Section Header Outside Card */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#e7d9cf] to-[#d8c3b5] text-[#111111] shadow-md shrink-0">
                              <CircleDollarSign className="w-5 h-5 text-[#111111]" />
                            </div>
                            <div>
                              <h2 className="font-black text-base sm:text-lg md:text-xl uppercase text-[#eeede9] tracking-tight">
                                Estado de Cuota & Datos de Pago
                              </h2>
                              <p className="text-xs sm:text-sm text-[#e7d9cf]">
                                Tu estado de cobro del mes en curso e información bancaria para abonar la cuota
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Content Card */}
                        <div className="bg-[#181816] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_8px_25px_rgba(0,0,0,0.45)]">
                          {isUserEnrolledInRegClass ? (
                            <div className="space-y-6">
                              {/* Current Month Display for Student (No dropdown) */}
                              <div className="flex items-center justify-between flex-wrap gap-3 bg-[#141413] border border-white/[0.08] rounded-2xl p-4 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-[#e7d9cf]" />
                                  <span className="text-xs font-bold text-[#e7d9cf] uppercase">Mes en Curso:</span>
                                </div>
                                <span className="text-xs font-black text-[#eeede9] bg-white/[0.05] border border-white/[0.08] px-3.5 py-1 rounded-full uppercase">
                                  {currentMonth}
                                </span>
                              </div>

                              {/* Payment Fee Banner */}
                              <div className={`p-5 rounded-2xl border ${
                                isUserPaid
                                  ? 'bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-[#141413] border-emerald-500/40'
                                  : 'bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-[#141413] border-amber-500/40'
                              } space-y-3 shadow-md`}>
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="text-xs font-bold text-[#e7d9cf] uppercase tracking-wider flex items-center gap-1.5">
                                    {isUserPaid ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <AlertCircle className="w-4 h-4 text-amber-400" />
                                    )}
                                    <span>Estado de Cobro — {currentMonth}</span>
                                  </span>
                                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                                    isUserPaid
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  }`}>
                                    {isUserPaid ? `✓ Cuota Al Día (${currentMonth})` : `⚠️ Cuota Pendiente (${currentMonth})`}
                                  </span>
                                </div>

                                <p className="text-xs text-[#eeede9]/90 leading-relaxed font-medium">
                                  {isUserPaid
                                    ? `¡Excelente! Tu cuota correspondiente al mes de ${currentMonth} fue confirmada y acreditada por la dirección.`
                                    : `Tu cuota correspondiente al mes de ${currentMonth} figura PENDIENTE. Si ya realizaste la transferencia o pago, la dirección actualizará tu estado en cuanto verifique la acreditación.`}
                                </p>
                              </div>

                              {/* Pricing & Fee Info - Clean, No Nested Box */}
                              <div className="pt-2 pb-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <span className="text-[10px] text-[#e7d9cf] uppercase font-black tracking-wider flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                    Valor Mensual de la Cuota
                                  </span>
                                  <p className="text-[11px] text-[#eeede9]/70 font-medium">Pago mensual a principio de mes</p>
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-baseline gap-1.5">
                                  <span>{selectedRegCls.price || '$45.000 / mes'}</span>
                                </div>
                              </div>

                              {/* Bank Details Section - Clean, No Nested Box */}
                              <div className="pt-2 space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                                  <span className="text-xs font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-2">
                                    <Landmark className="w-4 h-4 text-[#e7d9cf]" />
                                    <span>Datos Bancarios para Cuota Mensual</span>
                                  </span>
                                  {(() => {
                                    const assignedPm = selectedRegCls.paymentMethodId
                                      ? paymentMethods.find(pm => pm.id === selectedRegCls.paymentMethodId)
                                      : (paymentMethods.length === 1 ? paymentMethods[0] : null);
                                    if (assignedPm?.bank) {
                                      return (
                                        <span className="text-[11px] text-amber-300 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                                          {assignedPm.bank}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>

                                {(() => {
                                  const assignedPm = selectedRegCls.paymentMethodId
                                    ? paymentMethods.find(pm => pm.id === selectedRegCls.paymentMethodId)
                                    : (paymentMethods.length === 1 ? paymentMethods[0] : null);

                                  if (!assignedPm) {
                                    return (
                                      <div className="py-4 text-center space-y-1">
                                        <p className="text-xs font-bold text-[#e7d9cf]">Medio de pago no asignado</p>
                                        <p className="text-[11px] text-[#eeede9]/60">
                                          La Dirección aún no ha asignado un medio de pago para esta clase regular. Por favor consultá con administración.
                                        </p>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="space-y-3.5">
                                      {assignedPm.holder && (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-white/[0.06] text-xs">
                                          <span className="text-[11px] font-bold uppercase text-[#e7d9cf] tracking-wider">Titular de la cuenta:</span>
                                          <span className="font-bold text-[#eeede9]">{assignedPm.holder}</span>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        {assignedPm.alias && (
                                          <div className="py-2.5 border-b border-white/[0.06] space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-[#e7d9cf]/80 text-[10px] font-bold uppercase tracking-wider">
                                                Alias:
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleCopy(assignedPm.alias, `alias-${assignedPm.id}`)}
                                                className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-[#e7d9cf] transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                                                title="Copiar Alias"
                                              >
                                                {copiedField === `alias-${assignedPm.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#e7d9cf]" />}
                                                <span className="text-[10px] font-bold">{copiedField === `alias-${assignedPm.id}` ? 'Copiado' : 'Copiar'}</span>
                                              </button>
                                            </div>
                                            <div className="font-black text-[#e7d9cf] text-sm select-all break-all tracking-wide">
                                              {assignedPm.alias}
                                            </div>
                                          </div>
                                        )}

                                        {assignedPm.cbu && (
                                          <div className="py-2.5 border-b border-white/[0.06] space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-[#e7d9cf]/80 text-[10px] font-bold uppercase tracking-wider">
                                                CBU / CVU:
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleCopy(assignedPm.cbu, `cbu-${assignedPm.id}`)}
                                                className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-[#e7d9cf] transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                                                title="Copiar CBU"
                                              >
                                                {copiedField === `cbu-${assignedPm.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#e7d9cf]" />}
                                                <span className="text-[10px] font-bold">{copiedField === `cbu-${assignedPm.id}` ? 'Copiado' : 'Copiar'}</span>
                                              </button>
                                            </div>
                                            <div className="font-mono font-bold text-[#eeede9] text-xs sm:text-sm select-all break-all tracking-wider">
                                              {assignedPm.cbu}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6 p-6 rounded-2xl bg-[#141413] border border-white/[0.08] space-y-2 shadow-sm">
                              <p className="text-xs text-[#eeede9]/80 font-medium leading-relaxed">
                                Las inscripciones y asignaciones a las Clases Regulares son administradas exclusivamente por la Dirección desde el panel de administración.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* DIRECTOR / ADMIN PERSPECTIVE */}
                    {isAdmin && (
                      <div className="space-y-4">
                        {(() => {
                          const dirLeadersCount = enrolledStudents.filter(s => (selectedRegCls.studentRoles?.[s.id] || s.danceRole || 'follower') === 'leader').length;
                          const dirFollowersCount = enrolledStudents.filter(s => (selectedRegCls.studentRoles?.[s.id] || s.danceRole || 'follower') === 'follower').length;

                          return (
                            <>
                              {/* Section Header Outside Card */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 rounded-2xl bg-white/[0.06] text-[#e7d9cf] border border-white/[0.08] shadow-sm shrink-0">
                                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                                  </div>
                                  <div>
                                    <h2 className="font-black text-base sm:text-lg md:text-xl uppercase text-[#eeede9] tracking-tight">
                                      Alumnos Inscriptos & Control de Cobro
                                    </h2>
                                    <p className="text-xs sm:text-sm text-[#e7d9cf]">
                                      Planilla anual de cobros y administración de roles para esta clase regular
                                    </p>
                                  </div>
                                </div>

                                {/* Leaders / Followers Counter */}
                                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#141413] text-white border border-white/[0.08] shadow-sm">
                                    🕺 Leaders: <strong className="text-[#e7d9cf]">{dirLeadersCount}</strong>
                                  </span>
                                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#141413] text-white border border-white/[0.08] shadow-sm">
                                    💃 Followers: <strong className="text-[#e7d9cf]">{dirFollowersCount}</strong>
                                  </span>
                                  <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#141413] text-white border border-white/[0.08] shadow-sm">
                                    Total: {enrolledStudents.length}
                                  </span>
                                </div>
                              </div>

                              <div className="bg-[#181816] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_8px_25px_rgba(0,0,0,0.45)]">
                                {/* Listado / Planilla Anual de Alumnos Inscriptos */}
                                <div className="space-y-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                                    <div>
                                      <h3 className="text-xs font-black uppercase text-[#e7d9cf] tracking-wider">
                                        Planilla Anual de Cobros ({enrolledStudents.length} Alumnos Cursando)
                                      </h3>
                                      <p className="text-[11px] text-[#e7d9cf]/70 font-medium">
                                        Haz clic en la casilla del mes en curso (<strong className="text-amber-300">{currentMonth}</strong>) para marcar o desmarcar la cuota. Los demás meses se encuentran bloqueados.
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold">
                                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-[#111111] font-black shadow-sm">
                                        ★ Mes Habilitado ({currentMonth.split(' ')[0]})
                                      </span>
                                      <span className="flex items-center gap-1 text-emerald-300">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> ✓ Al Día
                                      </span>
                                      <span className="flex items-center gap-1 text-amber-400/80">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/40"></span> — Pendiente
                                      </span>
                                      <span className="flex items-center gap-1 text-[#eeede9]/40">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#56554e]"></span> 🔒 Bloqueado
                                      </span>
                                    </div>
                                  </div>

                                  {enrolledStudents.length === 0 ? (
                                    <div className="p-8 text-center bg-[#141413] border border-white/[0.08] rounded-2xl shadow-sm">
                                      <p className="text-xs text-[#eeede9]/60 font-medium">No hay alumnos asignados a esta clase regular aún. Las asignaciones se realizan desde la sección Admin.</p>
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] shadow-[0_8px_25px_rgba(0,0,0,0.45)] bg-[#141413]">
                                      <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                                        <thead>
                                          <tr className="bg-[#1a1917] text-[#e7d9cf] uppercase text-[10px] font-black tracking-wider border-b border-white/[0.08]">
                                            <th className="p-3.5 whitespace-nowrap min-w-[170px]">Alumno</th>
                                            <th className="p-3.5 text-center whitespace-nowrap min-w-[90px]">Rol</th>
                                            {yearlyMonths.map(m => {
                                              const isCurrent = m === currentMonth;
                                              const mShort = m.split(' ')[0];
                                              return (
                                                <th
                                                  key={`th-reg-m-${m}`}
                                                  className={`p-2.5 text-center whitespace-nowrap transition-colors ${
                                                    isCurrent
                                                      ? 'bg-amber-400 text-[#111111] font-black border-x-2 border-amber-300 text-[11px] shadow-sm'
                                                      : 'text-[#e7d9cf]/80 font-bold border-r border-white/[0.06]'
                                                  }`}
                                                >
                                                  {mShort}
                                                </th>
                                              );
                                            })}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.05] bg-[#141413]/80">
                                          {enrolledStudents.map(student => {
                                            const studentRole = selectedRegCls.studentRoles?.[student.id] || student.danceRole || 'follower';
                                            const isStudentPaused = student.isPaused === true || selectedRegCls.studentPayments?.[student.id]?.isPaused === true;

                                            return (
                                              <tr key={`reg-std-row-${student.id}`} className="hover:bg-white/[0.03] transition">
                                                <td className="p-3 whitespace-nowrap">
                                                  <div className="flex items-center gap-2.5">
                                                    <img
                                                      src={student.avatarUrl || DEFAULT_AVATAR_URL}
                                                      alt={student.fullName}
                                                      className="w-8 h-8 rounded-full object-cover border border-white/[0.1]"
                                                    />
                                                    <div>
                                                      <div className="flex items-center gap-1.5">
                                                        <strong className="text-[#eeede9] font-bold text-xs leading-tight">{student.fullName}</strong>
                                                        {isStudentPaused && (
                                                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-black border border-rose-500/30">
                                                            Pausado
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-[#e7d9cf]/70 font-mono block leading-tight">{student.memberCode}</span>
                                                        {isAdmin && (
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              toggleStudentRegularClassPause(selectedRegCls.id, student.id);
                                                              setLiveToast(
                                                                isStudentPaused
                                                                  ? `Se despausó a ${student.fullName}`
                                                                  : `Se pausó a ${student.fullName}`
                                                              );
                                                            }}
                                                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition cursor-pointer ${
                                                              isStudentPaused
                                                                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                                                                : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                                                            }`}
                                                            title={isStudentPaused ? 'Despausar alumno en esta clase' : 'Pausar alumno en esta clase'}
                                                          >
                                                            {isStudentPaused ? 'Despausar' : 'Pausar'}
                                                          </button>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </td>

                                                <td className="p-3 text-center whitespace-nowrap">
                                                  {isAdmin ? (
                                                    <select
                                                      value={String(studentRole).toLowerCase() === 'leader' ? 'Leader' : 'Follower'}
                                                      onChange={e => {
                                                        const newRole = e.target.value as DanceRole;
                                                        updateStudentRegularClassRole(selectedRegCls.id, student.id, newRole);
                                                        setLiveToast(`Rol actualizado a ${newRole} para ${student.fullName}`);
                                                      }}
                                                      className="bg-[#181816] border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs font-bold text-[#eeede9] focus:outline-none cursor-pointer hover:border-[#e7d9cf] transition shadow-sm"
                                                    >
                                                      <option value="Follower">💃 Follower</option>
                                                      <option value="Leader">🕺 Leader</option>
                                                    </select>
                                                  ) : (
                                                    <span className="px-2.5 py-1 rounded-full font-bold text-[10px] text-white bg-[#181816] border border-white/[0.08] uppercase inline-block shadow-sm">
                                                      {String(studentRole).toLowerCase() === 'leader' ? '🕺 Leader' : '💃 Follower'}
                                                    </span>
                                                  )}
                                                </td>

                                                {yearlyMonths.map(m => {
                                                  const monthPaymentObj = selectedRegCls.monthlyPayments?.[m]?.[student.id];
                                                  const isPaid = monthPaymentObj ? monthPaymentObj.paid : false;
                                                  const isCurrent = m === currentMonth;

                                                  return (
                                                    <td
                                                      key={`td-m-${student.id}-${m}`}
                                                      className={`p-2 text-center whitespace-nowrap ${
                                                        isCurrent ? 'bg-amber-500/10 border-x-2 border-amber-400/50' : 'border-r border-white/[0.05]'
                                                      }`}
                                                    >
                                                      <button
                                                        type="button"
                                                        disabled={!isCurrent}
                                                        onClick={() => isCurrent && handleConfirmRegularPayment(student.fullName, m, isPaid, student.id)}
                                                        className={`w-full max-w-[50px] py-1 px-1.5 rounded-lg text-xs font-black transition border ${
                                                          isCurrent
                                                            ? isPaid
                                                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow cursor-pointer'
                                                              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400/80 border-amber-500/30 cursor-pointer'
                                                            : isPaid
                                                              ? 'bg-emerald-500/10 text-emerald-400/50 border-emerald-500/20 cursor-not-allowed opacity-50'
                                                              : 'bg-[#181816] text-gray-500 border-white/[0.05] cursor-not-allowed opacity-40'
                                                        }`}
                                                        title={
                                                          isCurrent
                                                            ? `${m} — ${student.fullName}: ${isPaid ? 'Cuota Abonada' : 'Pendiente'}. Haz clic para cambiar.`
                                                            : `${m} (Bloqueado) — Solo se puede modificar el mes en curso (${currentMonth}).`
                                                        }
                                                      >
                                                        {isPaid ? '✓' : '—'}
                                                      </button>
                                                    </td>
                                                  );
                                                })}
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* ========================================================= */}
                  {/* SECTION 2: RECAPS                                         */}
                  {/* ========================================================= */}
                  <div ref={regClassRecapsSectionRef} id="section-reg-recaps" className="scroll-mt-36 space-y-4">
                    {/* Section Header Outside Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-white/[0.06] text-[#e7d9cf] border border-white/[0.08] shadow-sm shrink-0">
                          <Video className="w-5 h-5 text-[#e7d9cf]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="font-black text-base sm:text-lg md:text-xl uppercase text-[#eeede9] tracking-tight">
                              Recaps de {selectedRegCls.level}
                            </h2>
                            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-[#e7d9cf]/15 text-[#e7d9cf] text-[10px] font-black uppercase border border-[#e7d9cf]/30">
                              {allRecaps.length} {allRecaps.length === 1 ? 'Recap' : 'Recaps'}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-[#e7d9cf] mt-0.5">
                            Los recaps de clases regulares se publican a medida que transcurre cada clase para repasar figuras y técnica
                          </p>
                          <div className="sm:hidden pt-2">
                            <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[#e7d9cf]/15 text-[#e7d9cf] text-[10px] font-black uppercase border border-[#e7d9cf]/30">
                              {allRecaps.length} {allRecaps.length === 1 ? 'Recap' : 'Recaps'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            const todayFormatted = new Intl.DateTimeFormat('es-AR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            }).format(new Date());
                            setNewRegRecapTitle(`Clase del ${new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date())}`);
                            setNewRegRecapDate(todayFormatted);
                            setNewRegRecapDesc('');
                            setNewRegRecapUrl('');
                            setShowRegRecapAddModal(true);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition flex items-center gap-2 shrink-0 shadow cursor-pointer border border-[#e7d9cf] self-start sm:self-auto"
                        >
                          <Plus className="w-4 h-4 text-[#111111]" />
                          <span>+ Subir Nuevo Recap</span>
                        </button>
                      )}
                    </div>

                    {/* Recaps Filter & Search Bar - Full Width, Clean Box */}
                    {allRecaps.length > 0 && (
                      <div className="bg-[#181816] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-[0_8px_25px_rgba(0,0,0,0.45)]">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
                          {/* Search Input */}
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-[#e7d9cf]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Buscar recaps por figura, tema o fecha..."
                              value={regRecapSearchQuery}
                              onChange={e => setRegRecapSearchQuery(e.target.value)}
                              className="w-full bg-[#141413] border border-white/[0.08] hover:border-white/[0.15] rounded-xl pl-10 pr-8 py-2.5 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf] transition shadow-sm"
                            />
                            {regRecapSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setRegRecapSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#eeede9]/50 hover:text-[#eeede9] p-1 cursor-pointer"
                                title="Borrar búsqueda"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Month Filter Dropdown */}
                          {availableRecapMonths.length > 0 && (
                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={regRecapMonthFilter}
                                onChange={e => setRegRecapMonthFilter(e.target.value)}
                                className="w-full sm:w-auto bg-[#141413] border border-white/[0.08] hover:border-white/[0.15] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#e7d9cf] focus:outline-none focus:border-[#e7d9cf] cursor-pointer shadow-sm"
                              >
                                <option value="todos">Todos los meses ({allRecaps.length})</option>
                                {availableRecapMonths.map(m => {
                                  const count = allRecaps.filter(r => (r.date || '').toLowerCase().includes(m.toLowerCase()) || (r.title || '').toLowerCase().includes(m.toLowerCase())).length;
                                  return (
                                    <option key={m} value={m}>
                                      {m} ({count})
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}

                          {/* Reset Filters */}
                          {(regRecapSearchQuery || regRecapMonthFilter !== 'todos') && (
                            <button
                              type="button"
                              onClick={() => {
                                setRegRecapSearchQuery('');
                                setRegRecapMonthFilter('todos');
                              }}
                              className="text-[11px] font-black text-[#e7d9cf] hover:text-[#eeede9] underline px-2 py-1 cursor-pointer shrink-0 self-center"
                            >
                              Limpiar filtros
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recaps Grid / List / Blocked State - OUTSIDE the header card to take full width */}
                    {(() => {
                      const isStudentPausedInRegular = !isAdmin && (
                        currentUser?.isPaused === true ||
                        selectedRegCls.studentPayments?.[currentUser?.id || '']?.isPaused === true ||
                        convocatorias.some(c => c.studentIds?.includes(currentUser?.id || '') && c.studentPayments?.[currentUser?.id || '']?.isPaused === true) ||
                        regularClasses.some(rc => rc.studentIds?.includes(currentUser?.id || '') && rc.studentPayments?.[currentUser?.id || '']?.isPaused === true)
                      );

                      if (isStudentPausedInRegular) {
                        return (
                          <div className="p-8 sm:p-12 rounded-3xl bg-rose-500/10 border border-rose-500/40 text-center space-y-4 shadow-2xl my-2">
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center mx-auto border border-rose-500/40 shadow-lg">
                              <Lock className="w-8 h-8 text-rose-300" />
                            </div>
                            <h3 className="text-xl font-black text-rose-200 uppercase tracking-wide">
                              Acceso a Recaps Restringido
                            </h3>
                            <p className="text-base sm:text-lg font-extrabold text-rose-200 max-w-lg mx-auto bg-rose-950/80 py-3.5 px-6 rounded-2xl border border-rose-500/40 shadow-inner">
                              Hasta no regularizar tus pagos, no podrás acceder a los recaps
                            </p>
                            <p className="text-xs sm:text-sm text-[#e7d9cf]/80 max-w-md mx-auto font-medium">
                              Ponete en contacto con la administración para consultar tus cuotas y reactivar tu acceso inmediatamente
                            </p>
                          </div>
                        );
                      }

                      if (allRecaps.length === 0) {
                        return (
                          <div className="p-10 text-center bg-[#181816] border border-white/[0.08] rounded-3xl space-y-3 shadow-[0_8px_25px_rgba(0,0,0,0.45)]">
                            <Video className="w-10 h-10 text-[#e7d9cf]/30 mx-auto" />
                            <h3 className="text-sm font-black uppercase text-[#eeede9]">
                              Aún no hay recaps cargados para esta clase
                            </h3>
                            <p className="text-xs text-[#eeede9]/60 max-w-md mx-auto leading-relaxed">
                              Los videos y figuras se irán cargando clase por clase a medida que el grupo avance en la cursada regular.
                            </p>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  const todayFormatted = new Intl.DateTimeFormat('es-AR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  }).format(new Date());
                                  setNewRegRecapTitle(`Clase del ${new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date())}`);
                                  setNewRegRecapDate(todayFormatted);
                                  setNewRegRecapDesc('');
                                  setNewRegRecapUrl('');
                                  setShowRegRecapAddModal(true);
                                }}
                                className="px-4 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition cursor-pointer"
                              >
                                + Cargar Primer Recap
                              </button>
                            )}
                          </div>
                        );
                      }

                      if (filteredRecaps.length === 0) {
                        return (
                          <div className="p-8 text-center bg-[#181816] border border-white/[0.08] rounded-3xl space-y-3 shadow-[0_8px_25px_rgba(0,0,0,0.45)]">
                            <Search className="w-8 h-8 text-[#e7d9cf]/40 mx-auto" />
                            <h3 className="text-sm font-black uppercase text-[#eeede9]">
                              No se encontraron recaps con ese criterio
                            </h3>
                            <p className="text-xs text-[#eeede9]/60 max-w-sm mx-auto">
                              Probá buscando con otro término o limpiando los filtros de búsqueda y mes.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setRegRecapSearchQuery('');
                                setRegRecapMonthFilter('todos');
                              }}
                              className="px-4 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition cursor-pointer"
                            >
                              Mostrar todos los recaps ({allRecaps.length})
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {(regRecapSearchQuery || regRecapMonthFilter !== 'todos') && (
                            <div className="flex items-center justify-between text-xs text-[#eeede9]/70 px-1">
                              <span>
                                Mostrando <strong>{filteredRecaps.length}</strong> de <strong>{allRecaps.length}</strong> recaps
                              </span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredRecaps.map((recap, rIdx) => (
                              <div
                                key={`recap-card-item-${recap.id}-${rIdx}`}
                                className="p-4 sm:p-5 rounded-3xl border transition space-y-3.5 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.45)] bg-[#181816] border-white/[0.08]"
                              >
                                <div className="space-y-2.5 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#141413] text-[#e7d9cf] border border-white/[0.08] shrink-0">
                                        Clase {rIdx + 1}
                                      </span>

                                      {recap.date && (
                                        <span className="text-[10px] font-bold text-[#e7d9cf] flex items-center gap-1 shrink-0">
                                          <Calendar className="w-3 h-3 text-[#e7d9cf]" />
                                          <span>{formatClassDate(recap.date)}</span>
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                                      {isAdmin ? (
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingRegRecapId(recap.id);
                                              setEditRegRecapTitle(recap.title || '');
                                              setEditRegRecapDate(recap.date || '');
                                              setEditRegRecapDesc(recap.description || '');
                                              setEditRegRecapUrl(recap.driveUrl || '');
                                            }}
                                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#e7d9cf] transition cursor-pointer"
                                            title="Editar recap"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeletingRegRecapId(recap.id)}
                                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition cursor-pointer"
                                            title="Eliminar recap"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Habilitado</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-1 min-w-0">
                                    <h3 className="font-extrabold text-sm sm:text-base text-[#eeede9] leading-snug break-words">
                                      {recap.title || `Clase Regular #${rIdx + 1}`}
                                    </h3>

                                    {recap.description?.trim() ? (
                                      <p className="text-xs text-[#eeede9]/80 leading-relaxed break-words whitespace-pre-line">
                                        {recap.description}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="pt-1">
                                  {recap.driveUrl && recap.driveUrl.trim() !== '' ? (
                                    <button
                                      type="button"
                                      onClick={() => setActiveVideoPlayer({
                                        url: recap.driveUrl,
                                        title: recap.title || `Clase Regular #${rIdx + 1}`,
                                        subtitle: recap.date ? `📅 ${formatClassDate(recap.date)}` : undefined,
                                        description: recap.description,
                                      })}
                                      className="w-full py-2.5 px-4 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition shadow-md flex items-center justify-center gap-2 group min-w-0 cursor-pointer"
                                    >
                                      <Play className="w-4 h-4 fill-current text-[#111111] shrink-0" />
                                      <span className="truncate">Ver Video</span>
                                    </button>
                                  ) : (
                                    <div className="w-full py-2.5 px-3 rounded-xl bg-[#141413] border border-white/[0.08] text-[#eeede9]/60 text-xs font-bold text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                                      <span className="truncate text-[11px] text-[#e7d9cf]/60">Video pendiente de carga</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* MODAL: ADD REGULAR CLASS RECAP (STUDENT VIEW) */}
                {showRegRecapAddModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#181816] border border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[#e7d9cf]/20 text-[#e7d9cf] flex items-center justify-center">
                            <Video className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black uppercase text-[#eeede9]">
                              Subir Recap de Clase Regular
                            </h3>
                            <p className="text-[10px] text-[#e7d9cf]/70">
                              {selectedRegCls.day} {selectedRegCls.time} — {selectedRegCls.level}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowRegRecapAddModal(false)}
                          className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                            Título de la Clase *
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Secuencias de disociación y contratiempos"
                            value={newRegRecapTitle}
                            onChange={e => setNewRegRecapTitle(e.target.value)}
                            className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                            Fecha de la Clase
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 28 de Agosto, 2026"
                            value={newRegRecapDate}
                            onChange={e => setNewRegRecapDate(e.target.value)}
                            className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                            Resumen de Figuras Vistas
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Describí las figuras, técnica o variaciones vistas..."
                            value={newRegRecapDesc}
                            onChange={e => setNewRegRecapDesc(e.target.value)}
                            className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                            Link de Google Drive *
                          </label>
                          <input
                            type="text"
                            placeholder="https://drive.google.com/file/d/..."
                            value={newRegRecapUrl}
                            onChange={e => setNewRegRecapUrl(e.target.value)}
                            className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-mono text-xs focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => setShowRegRecapAddModal(false)}
                          className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] text-xs font-bold transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newRegRecapTitle.trim()) {
                              setLiveToast('Por favor ingresá el título de la clase');
                              return;
                            }
                            addRegularClassRecap(selectedRegCls.id, {
                              title: newRegRecapTitle.trim(),
                              date: newRegRecapDate.trim() || new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
                              description: newRegRecapDesc.trim(),
                              driveUrl: newRegRecapUrl.trim()
                            });
                            setLiveToast('¡Recap agregado exitosamente!');
                            setShowRegRecapAddModal(false);
                          }}
                          className="px-5 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition cursor-pointer shadow-md"
                        >
                          Guardar Recap
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL: EDIT REGULAR CLASS RECAP (STUDENT VIEW) */}
                {editingRegRecapId && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#181816] border border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[#e7d9cf]/20 text-[#e7d9cf] flex items-center justify-center">
                            <Edit2 className="w-4 h-4" />
                          </div>
                          <h3 className="text-sm font-black uppercase text-[#eeede9]">
                            Editar Recap de Clase Regular
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingRegRecapId(null)}
                          className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                            Título de la Clase *
                          </label>
                          <input
                            type="text"
                            value={editRegRecapTitle}
                            onChange={e => setEditRegRecapTitle(e.target.value)}
                            className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                            Fecha de la Clase
                          </label>
                          <input
                            type="text"
                            value={editRegRecapDate}
                            onChange={e => setEditRegRecapDate(e.target.value)}
                            className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                            Resumen de Figuras Vistas
                          </label>
                          <textarea
                            rows={3}
                            value={editRegRecapDesc}
                            onChange={e => setEditRegRecapDesc(e.target.value)}
                            className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                            Link de Google Drive
                          </label>
                          <input
                            type="text"
                            value={editRegRecapUrl}
                            onChange={e => setEditRegRecapUrl(e.target.value)}
                            className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-mono text-xs focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => setEditingRegRecapId(null)}
                          className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] text-xs font-bold transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!editRegRecapTitle.trim()) {
                              setLiveToast('El título de la clase no puede estar vacío');
                              return;
                            }
                            updateRegularClassRecap(selectedRegCls.id, editingRegRecapId, {
                              title: editRegRecapTitle.trim(),
                              date: editRegRecapDate.trim(),
                              description: editRegRecapDesc.trim(),
                              driveUrl: editRegRecapUrl.trim()
                            });
                            setLiveToast('¡Recap actualizado exitosamente!');
                            setEditingRegRecapId(null);
                          }}
                          className="px-5 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition cursor-pointer shadow-md"
                        >
                          Actualizar Recap
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL: DELETE REGULAR CLASS RECAP (STUDENT VIEW) */}
                {deletingRegRecapId && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#181816] border border-red-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black uppercase text-[#eeede9]">
                            Eliminar Recap
                          </h3>
                          <p className="text-xs text-[#eeede9]/70">
                            ¿Estás seguro de que deseás eliminar este recap de la clase regular? Esta acción no se puede deshacer.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => setDeletingRegRecapId(null)}
                          className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] text-xs font-bold transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteRegularClassRecap(selectedRegCls.id, deletingRegRecapId);
                            setLiveToast('Recap eliminado correctamente.');
                            setDeletingRegRecapId(null);
                          }}
                          className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black transition cursor-pointer shadow-md"
                        >
                          Sí, Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          /* REGULAR CLASSES GRID */
          <div id="regulares-main-heading" className="space-y-6 scroll-mt-28">
            {/* Header Banner with Inicio Aesthetic */}
            {!hideHeader && (
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] p-6 sm:p-10 border border-white/[0.08] shadow-2xl shadow-black/50 space-y-3">
                {/* Subtle Ambient Radial Glows */}
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-4 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-[#56554e]/40 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-[#e7d9cf]" />
                    <span>CURSADA REGULAR • GRUPOS FIJOS</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#eeede9] tracking-tight leading-tight uppercase">
                    Clases <span className="text-[#e7d9cf]">Regulares</span>
                  </h1>

                  <p className="text-sm sm:text-base text-[#eeede9]/85 leading-relaxed max-w-2xl">
                    Grupos de entrenamiento continuo y perfeccionamiento técnico de Bachata Influence
                  </p>
                </div>
              </div>
            )}

            {/* Access Check for Students */}
            {!isAdmin && !checkUserNivel2Completed(currentUser, convocatorias) ? (
              <div className="w-full bg-gradient-to-b from-[#141413] to-[#101010] border border-white/[0.08] rounded-3xl p-8 sm:p-14 text-center space-y-7 shadow-2xl shadow-black/50 relative overflow-hidden">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#e7d9cf] shadow-xl">
                  <Lock className="w-8 h-8 text-[#e7d9cf]" />
                </div>

                <div className="space-y-3 max-w-2xl mx-auto">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Sección Reservada para Graduados Nivel 2</span>
                  </span>

                  <h2 className="text-xl sm:text-3xl font-black uppercase text-[#eeede9]">
                    Clases Regulares Exclusivas Nivel 2
                  </h2>

                  <p className="text-xs sm:text-sm text-[#eeede9]/80 leading-relaxed font-medium pt-1">
                    Las clases regulares se desbloquean para los alumnos que hayan finalizado el <strong className="text-[#e7d9cf]">Nivel 2</strong> de la Formación
                  </p>
                </div>

                <div className="max-w-xl mx-auto p-5 bg-[#181816] border border-white/[0.08] rounded-2xl text-left space-y-2.5 shadow-sm">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-[#e7d9cf] block">Tu Estado Actual:</span>
                    <div className="inline-flex items-center">
                      <span className="px-3 py-1 rounded-full bg-[#111111] border border-white/[0.08] text-amber-300 font-extrabold text-xs">
                        {currentUser.level || 'Alumno Registrado'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#eeede9]/70 leading-relaxed pt-0.5">
                    Al completar las formaciones de Nivel 1 y Nivel 2, se desbloquearán las clases de entrenamiento regular
                  </p>
                </div>
              </div>
            ) : (
              /* Regular classes grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regularClasses.length === 0 ? (
                  <div className="col-span-full p-8 text-center bg-[#161615] border border-white/[0.08] rounded-3xl space-y-2 shadow-xl shadow-black/40">
                    <p className="text-xs text-[#eeede9]/60 font-bold">No hay clases regulares registradas en este momento</p>
                  </div>
                ) : (
                  regularClasses.map((cls, clsIdx) => {
                    const isEnrolled = cls.studentIds?.includes(currentUser.id);
                    return (
                      <div
                        key={`reg-cls-${cls.id}-${clsIdx}`}
                        className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#201f1c] via-[#1a1916] to-[#141311] border border-white/[0.08] hover:border-[#e7d9cf]/40 shadow-[0_8px_25px_rgba(0,0,0,0.45)] hover:shadow-[0_16px_45px_rgba(0,0,0,0.7)] transition-all duration-300 space-y-5 flex flex-col justify-between group"
                      >
                        {/* Ambient subtle glow on hover */}
                        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#e7d9cf]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#e7d9cf]/10 transition-colors" />

                        <div className="relative z-10 space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-[#111111] bg-[#e7d9cf] px-3.5 py-1 rounded-full shadow-sm">
                              {cls.day}
                            </span>
                            <span className="text-xs text-[#e7d9cf] font-mono font-bold flex items-center gap-1.5 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08]">
                              <Clock className="w-3.5 h-3.5 text-[#e7d9cf]" />
                              <span>{cls.time}</span>
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="font-black text-lg sm:text-xl text-[#eeede9] group-hover:text-[#e7d9cf] transition-colors leading-tight">
                              {cls.level}
                            </h3>
                            <p className="text-xs text-[#e7d9cf] font-semibold flex items-center gap-1">
                              <span>Con</span>
                              <strong className="text-[#eeede9]">{cls.instructor}</strong>
                            </p>
                          </div>

                          {/* Monthly Price Badge */}
                          <div className="flex items-center justify-between text-xs bg-white/[0.03] px-4 py-3 rounded-2xl border border-white/[0.06]">
                            <span className="text-[#eeede9]/70 font-semibold">Valor mensual:</span>
                            <span className="text-[#e7d9cf] font-black text-xs sm:text-sm tracking-tight">{cls.price || '$45.000 / mes'}</span>
                          </div>

                          {/* Address & Google Maps link */}
                          <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
                            <div className="flex items-start gap-2 text-xs text-[#eeede9]/80">
                              <MapPin className="w-4 h-4 text-[#e7d9cf] shrink-0 mt-0.5" />
                              <strong className="text-[#eeede9] font-medium leading-relaxed">{cls.address}</strong>
                            </div>

                            <div>
                              <a
                                href={cls.locationMapUrl || `https://maps.google.com/?q=${encodeURIComponent(cls.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] text-[#eeede9] hover:text-[#e7d9cf] border border-white/[0.08] hover:border-[#e7d9cf]/40 text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                                title="Ver ubicación en Google Maps"
                              >
                                <MapPin className="w-3.5 h-3.5 text-[#e7d9cf]" />
                                <span>Ver ubicación en Google Maps</span>
                                <ExternalLink className="w-3 h-3 text-[#e7d9cf]/70" />
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="relative z-10 pt-4 border-t border-white/[0.06] flex items-center gap-2">
                          {isAdmin ? (
                            <button
                              onClick={() => setSelectedRegularClassId(cls.id)}
                              className="w-full py-2.5 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#e7d9cf] hover:text-[#eeede9] border border-white/[0.1] hover:border-[#e7d9cf]/40 text-xs font-black transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                            >
                              <Users className="w-4 h-4 text-[#e7d9cf]" />
                              <span>Ver Detalle / Control de Cobros</span>
                            </button>
                          ) : (
                            isEnrolled ? (
                              <button
                                onClick={() => setSelectedRegularClassId(cls.id)}
                                className="w-full py-2.5 px-4 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-black transition text-center flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Inscripto — Ver Detalle</span>
                              </button>
                            ) : (
                              <a
                                href={`https://wa.me/5491170608171?text=${encodeURIComponent(
                                   `Hola Tomas & Astrid, quisiera sumarme a las clases regulares. Mi nombre es ${currentUser?.fullName || ''}`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2.5 px-4 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition text-center flex items-center justify-center gap-2 shadow-md shadow-black/30 cursor-pointer"
                              >
                                <MessageCircle className="w-4 h-4 text-[#111111]" />
                                <span>Consultar por WhatsApp</span>
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )
      ) : (
        /* ===================================================================== */
        /* TAB 2: CONVOCATORIAS DE FORMACIÓN                                     */
        /* ===================================================================== */
        <>
          {/* 1. ADMIN / DIRECTOR CONVOCATORIAS LIST */}
          {isAdmin ? (
            <div id="formaciones-main-heading" className="space-y-6 scroll-mt-28">
              {/* Header Banner for Directors with Inicio Aesthetic */}
              {!hideHeader && (
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] p-6 sm:p-10 border border-white/[0.08] shadow-2xl shadow-black/50 space-y-4">
                  {/* Subtle Ambient Radial Glows */}
                  <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-4 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#56554e]/40 text-[#e7d9cf] text-[11px] font-black tracking-wider uppercase">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Panel de Directores — Tomás & Astrid</span>
                      </div>

                      <span className="text-xs font-black text-[#e7d9cf] bg-white/[0.04] px-3.5 py-1 rounded-full border border-white/[0.08]">
                        {convocatorias.length} Formaciones Registradas
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-[#eeede9] tracking-tight leading-tight">
                      Gestión de <span className="text-[#e7d9cf]">Formaciones</span>
                    </h1>

                    <p className="text-sm sm:text-base text-[#eeede9]/85 leading-relaxed max-w-2xl">
                      Administrá convocatorias, asistencias, alumnos asignados y contenidos de cada nivel
                    </p>
                  </div>
                </div>
              )}

              {/* Full-width Seamless Filter Bar for Directors (Rappi style: no container box) */}
              <div className="space-y-3 w-full">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  {/* Status Filter Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black tracking-wide text-[#e7d9cf] uppercase">
                      <Filter className="w-3.5 h-3.5 text-[#e7d9cf]" />
                      <span>Estado de formación</span>
                    </div>

                    {/* Status Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => setAdminStatusFilter(adminStatusFilter === 'activa' ? 'todas' : 'activa')}
                        className={`px-4 py-2 rounded-full text-xs shrink-0 flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                          adminStatusFilter === 'activa'
                            ? 'bg-[#e7d9cf] text-[#111111] font-black shadow-md shadow-black/30 ring-1 ring-[#e7d9cf]'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#eeede9]/75 hover:text-[#eeede9] border border-white/[0.07] font-bold'
                        }`}
                      >
                        <span className="whitespace-nowrap">En Cursada</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          adminStatusFilter === 'activa' ? 'bg-[#111111] text-[#e7d9cf]' : 'bg-white/[0.06] text-[#eeede9]/70'
                        }`}>
                          {convocatorias.filter(c => getComputedFormacionStatus(c) === 'activa').length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminStatusFilter(adminStatusFilter === 'proxima' ? 'todas' : 'proxima')}
                        className={`px-4 py-2 rounded-full text-xs shrink-0 flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                          adminStatusFilter === 'proxima'
                            ? 'bg-[#e7d9cf] text-[#111111] font-black shadow-md shadow-black/30 ring-1 ring-[#e7d9cf]'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#eeede9]/75 hover:text-[#eeede9] border border-white/[0.07] font-bold'
                        }`}
                      >
                        <span className="whitespace-nowrap">Próximas</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          adminStatusFilter === 'proxima' ? 'bg-[#111111] text-[#e7d9cf]' : 'bg-white/[0.06] text-[#eeede9]/70'
                        }`}>
                          {convocatorias.filter(c => getComputedFormacionStatus(c) === 'proxima').length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminStatusFilter(adminStatusFilter === 'finalizada' ? 'todas' : 'finalizada')}
                        className={`px-4 py-2 rounded-full text-xs shrink-0 flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                          adminStatusFilter === 'finalizada'
                            ? 'bg-[#e7d9cf] text-[#111111] font-black shadow-md shadow-black/30 ring-1 ring-[#e7d9cf]'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#eeede9]/75 hover:text-[#eeede9] border border-white/[0.07] font-bold'
                        }`}
                      >
                        <span className="whitespace-nowrap">Finalizadas</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          adminStatusFilter === 'finalizada' ? 'bg-[#111111] text-[#e7d9cf]' : 'bg-white/[0.06] text-[#eeede9]/70'
                        }`}>
                          {convocatorias.filter(c => getComputedFormacionStatus(c) === 'finalizada').length}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Level Selector & Search */}
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                    <select
                      value={adminLevelFilter}
                      onChange={(e) => setAdminLevelFilter(e.target.value as any)}
                      className="bg-[#161615] border border-white/[0.08] rounded-full px-3.5 py-2 text-xs text-[#e7d9cf] font-bold focus:outline-none focus:border-[#e7d9cf] shrink-0"
                    >
                      <option value="todos">Todos los Niveles</option>
                      <option value="nivel-1">Nivel 1</option>
                      <option value="nivel-2">Nivel 2</option>
                    </select>

                    <div className="relative flex-1 md:w-48">
                      <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#eeede9]/50" />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className="w-full bg-[#161615] border border-white/[0.08] rounded-full pl-8 pr-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>
                  </div>
                </div>

                {/* Limpiar Filtro Action */}
                <div className="flex items-center gap-2 pt-0.5 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminStatusFilter('todas');
                      setAdminLevelFilter('todos');
                      setAdminSearchQuery('');
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs transition cursor-pointer ${
                      adminStatusFilter !== 'todas' || adminLevelFilter !== 'todos' || adminSearchQuery.trim() !== ''
                        ? 'font-extrabold text-[#e7d9cf] hover:text-[#eeede9] bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08]'
                        : 'font-medium text-[#eeede9]/40 hover:text-[#e7d9cf]'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpiar filtro</span>
                  </button>
                </div>
              </div>

              {/* Convocatorias List (1 formation per row) for Directors */}
              <div className="flex flex-col space-y-4">
                {convocatorias
                  .filter(c => {
                    const status = getComputedFormacionStatus(c);
                    if (adminStatusFilter !== 'todas' && status !== adminStatusFilter) return false;
                    if (adminLevelFilter !== 'todos' && c.levelId !== adminLevelFilter) return false;
                    if (adminSearchQuery.trim()) {
                      const q = adminSearchQuery.toLowerCase();
                      if (!c.title.toLowerCase().includes(q) && !c.period.toLowerCase().includes(q)) return false;
                    }
                    return true;
                  })
                  .sort(sortConvocatoriasNewestFirst)
                  .map((conv, cIdx) => {
                    const studentCount = conv.studentIds.length;
                    const configuredDatesCount = (conv.classDates || []).filter(Boolean).length;
                    const convStudents = usersList.filter(u => conv.studentIds.includes(u.id));
                    const lCount = convStudents.filter(s => (conv.studentRoles?.[s.id] || s.danceRole || 'Leader') === 'Leader').length;
                    const fCount = convStudents.filter(s => (conv.studentRoles?.[s.id] || s.danceRole) === 'Follower').length;
                    const st = getComputedFormacionStatus(conv);

                    return (
                      <div
                        key={`dir-conv-${conv.id}-${cIdx}`}
                        onClick={() => setSelectedConvocatoriaId(conv.id)}
                        className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#201f1c] via-[#1a1916] to-[#141311] border border-white/[0.08] hover:border-[#e7d9cf]/40 shadow-[0_8px_25px_rgba(0,0,0,0.45)] hover:shadow-[0_16px_45px_rgba(0,0,0,0.7)] transition-all duration-300 space-y-4 cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-5"
                      >
                        {/* Ambient subtle glow on hover */}
                        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#e7d9cf]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#e7d9cf]/10 transition-colors" />

                        <div className="relative z-10 space-y-3 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3.5 py-1 rounded-full bg-white/[0.05] text-[#e7d9cf] text-[10px] font-black uppercase tracking-wider border border-white/[0.08] whitespace-nowrap shrink-0">
                              {conv.levelId === 'nivel-1' ? 'Nivel 1' : 'Nivel 2'}
                            </span>

                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 ${
                              st === 'activa'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : st === 'finalizada'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            }`}>
                              {st === 'activa' ? 'En Cursada' : st === 'finalizada' ? 'Finalizada' : 'Próxima'}
                            </span>

                            <span className="text-xs font-bold text-[#e7d9cf] flex items-center gap-1.5 ml-1 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.06]">
                              <Calendar className="w-3.5 h-3.5 text-[#e7d9cf]" />
                              <span>{conv.period}</span>
                            </span>
                          </div>

                          <h3 className="text-lg sm:text-xl font-black text-[#eeede9] group-hover:text-[#e7d9cf] transition-colors truncate">
                            {conv.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#e7d9cf]">
                            {conv.classDay && (
                              <span className="flex items-center gap-1 text-[#eeede9]/90 font-medium bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.05]">
                                <Clock className="w-3.5 h-3.5 text-amber-300" />
                                <span>{conv.classDay} {conv.classStartTime ? `${conv.classStartTime} a ${conv.classEndTime}` : ''}</span>
                              </span>
                            )}
                            {conv.locationName && (
                              <span className="flex items-center gap-1 text-[#eeede9]/80 truncate bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.05]">
                                <MapPin className="w-3.5 h-3.5 text-[#e7d9cf]" />
                                <span className="truncate">{conv.locationName}</span>
                              </span>
                            )}
                            <span className="text-[11px] text-[#e7d9cf]/80 font-bold bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                              {configuredDatesCount} de 8 fechas programadas
                            </span>
                          </div>
                        </div>

                        <div className="relative z-10 flex flex-wrap md:flex-col items-start md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/[0.06]">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-black">
                              🕺 {lCount} Leaders
                            </span>
                            <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-black">
                              💃 {fCount} Followers
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#eeede9] text-[11px] font-black">
                              Total: {studentCount}
                            </span>
                          </div>

                          <span className="px-4 py-2.5 rounded-full bg-[#e7d9cf] group-hover:bg-[#eeede9] text-[#111111] text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-black/30">
                            <span>Administrar Formación</span>
                            <ChevronRight className="w-4 h-4 text-[#111111] group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* 2. STUDENT CONVOCATORIAS VIEW */
            <div id="formaciones-main-heading" className="space-y-8 scroll-mt-28">
              {/* Top Banner Header with Inicio Aesthetic */}
              {!hideHeader && (
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] p-6 sm:p-10 border border-white/[0.08] shadow-2xl shadow-black/50 space-y-4">
                  {/* Subtle Ambient Radial Glows */}
                  <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-4 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#56554e]/40 text-[#e7d9cf] text-[11px] font-black tracking-wider uppercase">
                      <GraduationCap className="w-3.5 h-3.5 text-[#e7d9cf]" />
                      <span>Formación Bachata Influence</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-[#eeede9] tracking-tight leading-tight">
                      Mis <span className="text-[#e7d9cf]">Formaciones</span>
                    </h1>

                    <p className="text-sm sm:text-base text-[#eeede9]/85 leading-relaxed max-w-2xl">
                      Consultá tus convocatorias activas, asistencias de clases y material pedagógico
                    </p>
                  </div>
                </div>
              )}

              {/* Full-width Seamless Filter Bar for Students (Rappi style: no container box) */}
              <div className="space-y-3 w-full">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black tracking-wide text-[#e7d9cf] uppercase">
                    <Filter className="w-3.5 h-3.5 text-[#e7d9cf]" />
                    <span>Estado de formación</span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none w-full">
                    <button
                      type="button"
                      onClick={() => setStudentFilterTab(studentFilterTab === 'activas' ? 'todas' : 'activas')}
                      className={`px-4 py-2 rounded-full text-xs shrink-0 flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                        studentFilterTab === 'activas'
                          ? 'bg-[#e7d9cf] text-[#111111] font-black shadow-md shadow-black/30 ring-1 ring-[#e7d9cf]'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#eeede9]/75 hover:text-[#eeede9] border border-white/[0.07] font-bold'
                      }`}
                    >
                      <span className="whitespace-nowrap">En Cursada</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        studentFilterTab === 'activas' ? 'bg-[#111111] text-[#e7d9cf]' : 'bg-white/[0.06] text-[#eeede9]/70'
                      }`}>
                        {convocatorias.filter(c => c.studentIds.includes(currentUser.id) && (getComputedFormacionStatus(c) === 'activa' || getComputedFormacionStatus(c) === 'proxima')).length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentFilterTab(studentFilterTab === 'finalizadas' ? 'todas' : 'finalizadas')}
                      className={`px-4 py-2 rounded-full text-xs shrink-0 flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                        studentFilterTab === 'finalizadas'
                          ? 'bg-[#e7d9cf] text-[#111111] font-black shadow-md shadow-black/30 ring-1 ring-[#e7d9cf]'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#eeede9]/75 hover:text-[#eeede9] border border-white/[0.07] font-bold'
                      }`}
                    >
                      <span className="whitespace-nowrap">Finalizadas</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        studentFilterTab === 'finalizadas' ? 'bg-[#111111] text-[#e7d9cf]' : 'bg-white/[0.06] text-[#eeede9]/70'
                      }`}>
                        {convocatorias.filter(c => c.studentIds.includes(currentUser.id) && getComputedFormacionStatus(c) === 'finalizada').length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Limpiar Filtro Action */}
                <div className="flex items-center gap-2 pt-0.5 px-1">
                  <button
                    type="button"
                    onClick={() => setStudentFilterTab('todas')}
                    className={`inline-flex items-center gap-1.5 text-xs transition cursor-pointer ${
                      studentFilterTab !== 'todas'
                        ? 'font-extrabold text-[#e7d9cf] hover:text-[#eeede9] bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08]'
                        : 'font-medium text-[#eeede9]/40 hover:text-[#e7d9cf]'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpiar filtro</span>
                  </button>
                </div>
              </div>

              {/* Student Convocatorias Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#e7d9cf]" />
                  <span>Mis Cursadas Asignadas</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {convocatorias
                    .filter(c => c.studentIds.includes(currentUser.id))
                    .filter(c => {
                      const st = getComputedFormacionStatus(c);
                      if (studentFilterTab === 'activas') return st === 'activa' || st === 'proxima';
                      if (studentFilterTab === 'finalizadas') return st === 'finalizada';
                      return true;
                    }).length === 0 ? (
                    <div className="col-span-full p-8 text-center bg-[#161615] border border-white/[0.08] rounded-3xl space-y-3 shadow-xl shadow-black/40">
                      <p className="text-xs text-[#eeede9]/70 font-semibold">
                        Aún no tenés formaciones asignadas en esta sección.
                      </p>
                      <p className="text-[11px] text-[#e7d9cf]">
                        Los Directores te avisarán cuando seas asignado/a a una nueva formación
                      </p>
                    </div>
                  ) : (
                    convocatorias
                      .filter(c => c.studentIds.includes(currentUser.id))
                      .filter(c => {
                        const st = getComputedFormacionStatus(c);
                        if (studentFilterTab === 'activas') return st === 'activa' || st === 'proxima';
                        if (studentFilterTab === 'finalizadas') return st === 'finalizada';
                        return true;
                      })
                      .sort(sortConvocatoriasNewestFirst)
                      .map((conv, cIdx) => {
                        const compStatus = getComputedFormacionStatus(conv);
                        const myAttendance = conv.attendanceMap[currentUser.id] || [];
                        const attendedCount = myAttendance.length;
                        const meetsGoal = attendedCount >= 6;
                        const isGraduated = isStudentGraduated(conv, currentUser.id);

                        return (
                          <div
                            key={`student-assigned-${conv.id}-${cIdx}`}
                            onClick={() => setSelectedConvocatoriaId(conv.id)}
                            className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#201f1c] via-[#1a1916] to-[#141311] border border-white/[0.08] hover:border-[#e7d9cf]/40 shadow-[0_8px_25px_rgba(0,0,0,0.45)] hover:shadow-[0_16px_45px_rgba(0,0,0,0.7)] transition-all duration-300 space-y-5 cursor-pointer group flex flex-col justify-between"
                          >
                            {/* Ambient subtle glow on hover */}
                            <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#e7d9cf]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#e7d9cf]/10 transition-colors" />

                            <div className="relative z-10 space-y-3.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-3.5 py-1 rounded-full bg-white/[0.05] text-[#e7d9cf] text-[10px] font-black uppercase tracking-wider border border-white/[0.08] whitespace-nowrap shrink-0">
                                  {conv.levelId === 'nivel-1' ? 'Nivel 1' : 'Nivel 2'}
                                </span>

                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 ${
                                  compStatus === 'activa'
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : compStatus === 'finalizada'
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                }`}>
                                  {compStatus === 'activa' ? 'En Cursada' : compStatus === 'finalizada' ? 'Finalizada' : 'Próxima'}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                <h3 className="text-lg sm:text-xl font-black text-[#eeede9] group-hover:text-[#e7d9cf] transition-colors leading-snug">
                                  {conv.title}
                                </h3>

                                <p className="text-xs text-[#e7d9cf] flex items-center gap-1.5 font-bold">
                                  <Calendar className="w-3.5 h-3.5 text-[#e7d9cf]" />
                                  <span>{conv.period}</span>
                                </p>
                              </div>

                              {/* Attendance progress block */}
                              <div className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.06] space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-[#eeede9]/80 font-bold flex items-center gap-1.5">
                                    <UserCheck className="w-3.5 h-3.5 text-[#e7d9cf]" />
                                    <span>Asistencia a Clases</span>
                                  </span>
                                  <span className="text-[#eeede9] font-black text-xs">
                                    {attendedCount} <span className="text-[#eeede9]/50 font-medium">/ 8 Clases</span>
                                  </span>
                                </div>

                                <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden flex">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      meetsGoal ? 'bg-gradient-to-r from-amber-400 to-emerald-400' : 'bg-[#e7d9cf]'
                                    }`}
                                    style={{ width: `${Math.min(100, (attendedCount / 8) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="relative z-10 pt-3.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                              <div>
                                {isGraduated ? (
                                  <div className="flex items-center gap-2 text-emerald-400">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                                      <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-300">Graduado/a</span>
                                  </div>
                                ) : meetsGoal ? (
                                  <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-black border border-amber-500/30 shrink-0">
                                    ✓ 75% Cumplido
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#eeede9]/50 font-medium">
                                    Mínimo 6 clases para finalizar
                                  </span>
                                )}
                              </div>

                              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#e7d9cf] group-hover:bg-[#eeede9] text-[#111111] text-xs font-black transition-all shadow-md shadow-black/30 group-hover:translate-x-0.5 ml-auto">
                                <span>Ingresar</span>
                                <ChevronRight className="w-4 h-4 text-[#111111]" />
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL: CREAR / EDITAR CLASE REGULAR (DIRECTORES)                      */}
      {/* ===================================================================== */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111111] border border-[#e7d9cf]/40 rounded-3xl p-5 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-4">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-[#e7d9cf]" />
                <h3 className="font-extrabold text-base text-[#eeede9]">
                  {editingRegId ? 'Editar Clase Regular' : 'Crear Nueva Clase Regular'}
                </h3>
              </div>
              <button
                onClick={() => setShowRegModal(false)}
                className="p-1.5 rounded-full hover:bg-[#56554e]/40 text-[#eeede9]/60 hover:text-[#eeede9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRegClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#e7d9cf] mb-1">Días de Clase:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Lunes y Miércoles"
                  value={regDay}
                  onChange={e => setRegDay(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#e7d9cf] mb-1">Horario:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. 20:30 hs a 22:00 hs"
                  value={regTime}
                  onChange={e => setRegTime(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#e7d9cf] mb-1">Dirección / Sede:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Scalabrini Ortiz 1240, Palermo, CABA — Estudio Palermo"
                  value={regAddress}
                  onChange={e => setRegAddress(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#e7d9cf] mb-1">Link de Google Maps:</label>
                <input
                  type="url"
                  placeholder="ej. https://maps.google.com/?q=..."
                  value={regLocationMapUrl}
                  onChange={e => setRegLocationMapUrl(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#e7d9cf] mb-1">Valor Cuota Mensual (Opcional):</label>
                <input
                  type="text"
                  placeholder="ej. $35.000"
                  value={regPriceMonthly}
                  onChange={e => setRegPriceMonthly(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#e7d9cf] mb-1">Nivel / Título:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Clase Regular — Graduados Nivel 2"
                  value={regLevel}
                  onChange={e => setRegLevel(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#e7d9cf] mb-1">Instructores:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Tomás & Astrid"
                  value={regInstructor}
                  onChange={e => setRegInstructor(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#e7d9cf] mb-1">
                  Medio de Pago para Cuota Mensual:
                </label>
                {paymentMethods && paymentMethods.length > 0 ? (
                  <select
                    value={regPaymentMethodId}
                    onChange={e => setRegPaymentMethodId(e.target.value)}
                    className="w-full bg-[#201f1c] border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                  >
                    <option value="">-- Seleccionar medio de pago oficial --</option>
                    {paymentMethods.map(pm => (
                      <option key={`reg-modal-pm-${pm.id}`} value={pm.id}>
                        {pm.name} ({pm.bank} - {pm.alias || pm.cbu})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-[11px] text-amber-200">
                      No hay medios de pago creados en el panel de Medios de Pago. Creá uno desde la sección de Medios de Pago para asignarlo a esta clase regular.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#56554e]/40">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#eeede9]/70 hover:text-[#eeede9]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition shadow-lg"
                >
                  {editingRegId ? 'Guardar Cambios' : 'Crear Clase Regular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {renderSharedModals()}
    </div>
  );
};

