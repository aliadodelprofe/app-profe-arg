import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  ShieldCheck,
  LogOut,
  KeyRound,
  Edit3,
  Save,
  GraduationCap,
  Award,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Users,
  Check,
  Camera,
  Upload,
  Image,
  Sparkles,
  Crop,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkUserNivel1Completed, checkUserNivel2Completed } from '../utils/convocatoriaUtils';
import { formatMemberSinceDate } from '../utils/dateUtils';
import { AdminStudentsModal } from './AdminStudentsModal';
import { AdminFormationModal } from './AdminFormationModal';
import { ImageCropperModal } from './ImageCropperModal';

import { DEFAULT_AVATAR_URL } from '../types';

export const ProfileModal: React.FC = () => {
  const {
    currentUser,
    usersList,
    convocatorias,
    showAuthModal,
    setShowAuthModal,
    login,
    logout,
    changePassword,
    switchUser,
    updateProfile,
    setShowPassModal
  } = useAuth();

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [showPersonalData, setShowPersonalData] = useState(false);
  const [showFormationStatus, setShowFormationStatus] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [editName, setEditName] = useState(currentUser?.fullName || '');
  const [editDni, setEditDni] = useState(currentUser?.dni || '');
  const [editLevel, setEditLevel] = useState(currentUser?.level || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formationSectionRef = useRef<HTMLDivElement>(null);
  const personalDataSectionRef = useRef<HTMLDivElement>(null);
  const securitySectionRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  // Image cropper state
  const [showCropperModal, setShowCropperModal] = useState(false);
  const [cropperSrc, setCropperSrc] = useState('');

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.fullName || '');
      setEditDni(currentUser.dni || '');
      setEditLevel(currentUser.level || '');
      setEditPhone(currentUser.phone || '');
      setEditAvatarUrl(currentUser.avatarUrl || '');
    }
  }, [currentUser]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('La imagen seleccionada supera el límite de 8MB. Por favor seleccioná una foto más liviana.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        const dataUrl = reader.result as string;
        setCropperSrc(dataUrl);
        setShowCropperModal(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOpenCropperForUrl = (url: string) => {
    if (!url) return;
    setCropperSrc(url);
    setShowCropperModal(true);
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setEditAvatarUrl(croppedDataUrl);
    updateProfile({ avatarUrl: croppedDataUrl });
  };

  // Password change form
  const [showPassChange, setShowPassChange] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passFeedback, setPassFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Admin Modals triggers
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showFormationModal, setShowFormationModal] = useState(false);

  // Level completion logic
  const n1Conv = (convocatorias || []).find(c => c.levelId === 'nivel-1' && c.studentIds?.includes(currentUser?.id || ''));
  const nivel1Attended = n1Conv ? (n1Conv.attendanceMap?.[currentUser?.id || ''] || []).length : (currentUser?.attendanceNivel1 || []).length;

  const n2Conv = (convocatorias || []).find(c => c.levelId === 'nivel-2' && c.studentIds?.includes(currentUser?.id || ''));
  const nivel2Attended = n2Conv ? (n2Conv.attendanceMap?.[currentUser?.id || ''] || []).length : (currentUser?.attendanceNivel2 || []).length;

  const isNivel1Completed = checkUserNivel1Completed(currentUser, convocatorias || []);
  const isNivel2Completed = checkUserNivel2Completed(currentUser, convocatorias || []);

  // Check enrollment in active convocatorias
  const isEnrolledInNivel1 = convocatorias?.some(c => c.levelId === 'nivel-1' && c.studentIds?.includes(currentUser?.id || '')) || false;
  const isEnrolledInNivel2 = convocatorias?.some(c => c.levelId === 'nivel-2' && c.studentIds?.includes(currentUser?.id || '')) || false;

  // Level visibility flags for student profile:
  const showNivel1 = currentUser
    ? (isNivel1Completed || currentUser.activeFormationId === 'nivel-1' || isEnrolledInNivel1 || nivel1Attended > 0)
    : false;

  const showNivel2 = currentUser
    ? (isNivel2Completed || currentUser.activeFormationId === 'nivel-2' || isEnrolledInNivel2)
    : false;

  if (!showAuthModal) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const res = login(emailInput, passwordInput);
    if (!res.success) {
      setAuthError(res.error || 'No fue posible iniciar sesión.');
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    try {
      await updateProfile({
        fullName: editName,
        dni: editDni,
        level: editLevel,
        phone: editPhone,
        avatarUrl: editAvatarUrl || currentUser?.avatarUrl
      });
      setProfileFeedback({ type: 'success', msg: '¡Datos personales guardados con éxito!' });
      setTimeout(() => {
        setShowPersonalData(false);
        setProfileFeedback(null);
      }, 1500);
    } catch {
      setProfileFeedback({ type: 'error', msg: 'No se pudieron guardar los datos.' });
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassFeedback(null);

    if (newPassword !== confirmPassword) {
      setPassFeedback({ type: 'error', msg: 'Las nuevas contraseñas no coinciden.' });
      return;
    }

    const res = changePassword(oldPassword, newPassword);
    if (res.success) {
      setPassFeedback({ type: 'success', msg: res.message });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPassChange(false);
        setPassFeedback(null);
      }, 2000);
    } else {
      setPassFeedback({ type: 'error', msg: res.message });
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="profile-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:items-center bg-[#0c0c0b]/85 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            key="profile-modal-content"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-[#161513] border border-white/[0.09] rounded-[32px] sm:rounded-[38px] text-[#eeede9] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.06)] my-auto overflow-hidden"
          >
            {/* Header - Fixed at Top with refined luxury warm palette */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 sm:px-6 py-4.5 sm:py-5 shrink-0 bg-[#161513] z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#22211e] border border-white/[0.08] flex items-center justify-center text-[#e7d9cf] shadow-inner">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#eeede9] tracking-tight leading-tight">
                    {currentUser ? 'Perfil de Socio' : 'Acceso a la Comunidad'}
                  </h3>
                  <p className="text-[11px] text-[#e7d9cf]/90 font-bold uppercase tracking-widest">TA Bachata Academy</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-9 h-9 flex items-center justify-center text-[#eeede9]/60 hover:text-[#eeede9] rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] transition cursor-pointer"
                title="Cerrar perfil"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 sm:space-y-5">
              {/* LOGGED IN VIEW */}
              {currentUser && (
                <div className="space-y-4 sm:space-y-5">
                  {/* Profile Section Header - Full width, seamless integration without card background */}
                  <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 px-1 py-2 sm:py-3 text-center sm:text-left">
                    <div className="relative group shrink-0">
                      <img
                        src={currentUser.avatarUrl || DEFAULT_AVATAR_URL}
                        alt={currentUser.fullName}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 sm:w-22 sm:h-22 rounded-[24px] object-cover border-2 border-[#e7d9cf]/60 shadow-xl ring-4 ring-black/40"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/70 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[#e7d9cf] text-[9px] font-black gap-1 cursor-pointer backdrop-blur-[2px]"
                        title="Cambiar foto de perfil"
                      >
                        <Camera className="w-5 h-5 text-[#e7d9cf]" />
                        <span>Cambiar</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                      {/* Tipo de Usuario: Abajo de la foto y Arriba del nombre */}
                      <div className="flex justify-center sm:justify-start">
                        <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-[#56554e]/30 text-[#e7d9cf] border border-white/[0.08] inline-block tracking-wider">
                          {currentUser.role === 'admin' ? 'Director / a' : 'Alumno / Socio'}
                        </span>
                      </div>

                      <h3 className="font-black text-lg sm:text-xl text-[#eeede9] break-words tracking-tight leading-snug">
                        {currentUser.fullName}
                      </h3>

                      <p className="text-xs text-[#e7d9cf] font-bold tracking-wide">
                        {(currentUser.role !== 'admin' && (currentUser.nivel2Completed || isNivel2Completed))
                          ? 'Formación finalizada'
                          : currentUser.level}
                      </p>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenCropperForUrl(currentUser.avatarUrl)}
                          className="px-3 py-1.5 rounded-xl bg-[#1c1b18] hover:bg-black/50 border border-white/[0.08] text-[#e7d9cf] text-[11px] font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                          title="Ajustar y reencuadrar la foto actual"
                        >
                          <Crop className="w-3.5 h-3.5 text-[#e7d9cf]" />
                          <span>Recortar Foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-[11px] font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Subir Nueva</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* DIRECTORS PANEL (ADMIN) OR STUDENT FORMATION LEVELS */}
                  {currentUser.role === 'admin' ? (
                    /* DIRECTOR ROLE - ADMIN PANEL ACCESS */
                    <div className="p-4.5 sm:p-5 rounded-[22px] bg-[#1c1b18] border border-white/[0.08] space-y-3 shadow-[0_10px_25px_-6px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)]">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#e7d9cf]" />
                          <span className="font-black text-xs text-[#eeede9] uppercase tracking-wider">
                            Panel de Dirección
                          </span>
                        </div>

                        <div className="pt-1">
                          <button
                            onClick={() => setShowFormationModal(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                          >
                            <GraduationCap className="w-4 h-4" />
                            <span>Admin</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#eeede9]/70 leading-relaxed font-medium">
                        Como Director/a podés administrar alumnos, formaciones, asistencias, recaps de Google Drive y más.
                      </p>
                    </div>
                  ) : (
                    /* STUDENT ROLE - COLLAPSIBLE FORMATION STATUS */
                    <div ref={formationSectionRef} className="rounded-[22px] bg-[#1a1917] border border-white/[0.08] overflow-hidden shadow-[0_10px_25px_-6px_rgba(0,0,0,0.6)] scroll-mt-4">
                      {/* Header Item / Trigger */}
                      <div 
                        onClick={() => {
                          const nextState = !showFormationStatus;
                          setShowFormationStatus(nextState);
                          if (nextState) {
                            scrollToSection(formationSectionRef);
                          }
                        }}
                        className="p-4 sm:p-4.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors select-none group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#e7d9cf]/10 border border-[#e7d9cf]/20 flex items-center justify-center text-[#e7d9cf] shrink-0 group-hover:bg-[#e7d9cf] group-hover:text-[#111111] transition-colors duration-200 shadow-sm">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-[#eeede9]">
                                Estado de Formación
                              </span>
                            </div>
                            <p className="text-[11px] text-[#eeede9]/50 truncate mt-0.5">
                              {showFormationStatus
                                ? 'Cerrar detalle de cursada'
                                : (isNivel2Completed
                                    ? 'Formación finalizada y aprobada'
                                    : isNivel1Completed
                                      ? (showNivel2 ? 'Nivel 1 certificado • Nivel 2 en cursada' : 'Nivel 1 completado')
                                      : showNivel1
                                        ? `En cursada (${nivel1Attended}/8 clases)`
                                        : 'Consultá tus niveles, asistencias y certificaciones')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[11px] font-bold text-[#e7d9cf] hidden sm:inline group-hover:underline">
                            {showFormationStatus ? 'Ocultar' : 'Ver Detalle'}
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-[#eeede9]/70 group-hover:text-[#eeede9] group-hover:bg-white/[0.08] transition">
                            {showFormationStatus ? (
                              <ChevronUp className="w-4 h-4 text-[#e7d9cf]" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Collapsible Content */}
                      <AnimatePresence>
                        {showFormationStatus && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-white/[0.06] bg-black/25 px-4 sm:px-5 py-4 space-y-3.5"
                          >
                            {!showNivel1 && !showNivel2 ? (
                              <div className="p-3.5 rounded-xl bg-[#111111]/40 border border-white/[0.06] text-center text-xs text-[#eeede9]/70">
                                Sin nivel de formación en cursada asignado actualmente.
                              </div>
                            ) : (
                              <div className={`grid gap-2.5 text-xs ${
                                showNivel1 && showNivel2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                              }`}>
                                {/* Nivel 1 */}
                                {showNivel1 && (
                                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                                    isNivel1Completed
                                      ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300'
                                      : 'bg-[#131210] border-white/[0.08] text-[#eeede9]/90'
                                  }`}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="font-black text-xs tracking-wide">Nivel 1</span>
                                      {isNivel1Completed ? (
                                        <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center" title="Nivel Completado & Certificado">
                                          <Award className="w-4 h-4 text-emerald-400" />
                                        </div>
                                      ) : (
                                        <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-black border border-amber-500/30">
                                          En Cursada
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-[#eeede9]/70 font-medium leading-tight">
                                      {isNivel1Completed
                                        ? `Nivel Completado ${currentUser.nivel1Date ? `(${currentUser.nivel1Date})` : ''}`
                                        : `Formación en desarrollo (${nivel1Attended}/8 clases)`}
                                    </span>
                                  </div>
                                )}

                                {/* Nivel 2 */}
                                {showNivel2 && (
                                  <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                                    isNivel2Completed
                                      ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300'
                                      : 'bg-[#131210] border-white/[0.08] text-[#eeede9]/90'
                                  }`}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="font-black text-xs tracking-wide">Nivel 2</span>
                                      {isNivel2Completed ? (
                                        <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center" title="Nivel Completado & Certificado">
                                          <Award className="w-4 h-4 text-emerald-400" />
                                        </div>
                                      ) : (
                                        <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-black border border-amber-500/30">
                                          En Cursada
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-[#eeede9]/70 font-medium leading-tight">
                                      {isNivel2Completed
                                        ? `Nivel Completado ${currentUser.nivel2Date ? `(${currentUser.nivel2Date})` : ''}`
                                        : `Formación en desarrollo (${nivel2Attended}/8 clases)`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* PERSONAL DATA COLLAPSIBLE SECTION */}
                  <div ref={personalDataSectionRef} className="rounded-[22px] bg-[#1a1917] border border-white/[0.08] overflow-hidden shadow-[0_10px_25px_-6px_rgba(0,0,0,0.6)] scroll-mt-4">
                    {/* Header Item / Trigger */}
                    <div 
                      onClick={() => {
                        const nextState = !showPersonalData;
                        setShowPersonalData(nextState);
                        setProfileFeedback(null);
                        if (nextState) {
                          setEditName(currentUser.fullName || '');
                          setEditDni(currentUser.dni || '');
                          setEditPhone(currentUser.phone || '');
                          scrollToSection(personalDataSectionRef);
                        }
                      }}
                      className="p-4 sm:p-4.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors select-none group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#e7d9cf]/10 border border-[#e7d9cf]/20 flex items-center justify-center text-[#e7d9cf] shrink-0 group-hover:bg-[#e7d9cf] group-hover:text-[#111111] transition-colors duration-200 shadow-sm">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-[#eeede9]">
                              Datos Personales
                            </span>
                          </div>
                          <p className="text-[11px] text-[#eeede9]/50 truncate mt-0.5">
                            {showPersonalData ? 'Cerrar formulario de datos' : `${currentUser.fullName} • ${currentUser.email}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[11px] font-bold text-[#e7d9cf] hidden sm:inline group-hover:underline">
                          {showPersonalData ? 'Ocultar' : 'Modificar'}
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-[#eeede9]/70 group-hover:text-[#eeede9] group-hover:bg-white/[0.08] transition">
                          {showPersonalData ? (
                            <ChevronUp className="w-4 h-4 text-[#e7d9cf]" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Smooth Collapsible Form */}
                    <AnimatePresence>
                      {showPersonalData && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-white/[0.06] bg-black/25 px-4 sm:px-5 py-4 space-y-3.5 text-xs"
                        >
                          {profileFeedback && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                                profileFeedback.type === 'success'
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                              }`}
                            >
                              {profileFeedback.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              )}
                              <span>{profileFeedback.msg}</span>
                            </motion.div>
                          )}

                          {/* Readonly info pills */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-1">
                            <div className="p-3 bg-[#131210]/60 rounded-xl border border-white/[0.04] min-w-0">
                              <span className="text-[10px] uppercase text-[#eeede9]/50 block font-bold mb-0.5 tracking-wider">Email (No editable)</span>
                              <span className="font-semibold text-[#eeede9] text-xs break-all block">{currentUser.email}</span>
                            </div>
                            <div className="p-3 bg-[#131210]/60 rounded-xl border border-white/[0.04] min-w-0">
                              <span className="text-[10px] uppercase text-[#eeede9]/50 block font-bold mb-0.5 tracking-wider">Socio Desde</span>
                              <span className="font-semibold text-[#eeede9] text-xs break-words block">{formatMemberSinceDate(currentUser)}</span>
                            </div>
                          </div>

                          {/* Editable Form Inputs */}
                          <form onSubmit={handleSaveProfile} className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[11px] text-[#eeede9]/80 uppercase font-bold block mb-1">
                                Nombre Completo
                              </label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-[#111111] border border-white/[0.12] focus:border-[#e7d9cf] rounded-xl px-3.5 py-2.5 text-[#eeede9] font-medium outline-none transition focus:ring-1 focus:ring-[#e7d9cf]/30"
                                placeholder="Tu nombre completo"
                                required
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[11px] text-[#eeede9]/80 uppercase font-bold block mb-1">
                                  DNI
                                </label>
                                <input
                                  type="text"
                                  value={editDni}
                                  onChange={(e) => setEditDni(e.target.value)}
                                  className="w-full bg-[#111111] border border-white/[0.12] focus:border-[#e7d9cf] rounded-xl px-3.5 py-2.5 text-[#eeede9] font-medium outline-none transition focus:ring-1 focus:ring-[#e7d9cf]/30"
                                  placeholder="Sin puntos"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] text-[#eeede9]/80 uppercase font-bold block mb-1">
                                  Teléfono / WhatsApp
                                </label>
                                <input
                                  type="text"
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  className="w-full bg-[#111111] border border-white/[0.12] focus:border-[#e7d9cf] rounded-xl px-3.5 py-2.5 text-[#eeede9] font-medium outline-none transition focus:ring-1 focus:ring-[#e7d9cf]/30"
                                  placeholder="+54 9 ..."
                                />
                              </div>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.06]">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPersonalData(false);
                                  setProfileFeedback(null);
                                  setEditName(currentUser.fullName || '');
                                  setEditDni(currentUser.dni || '');
                                  setEditPhone(currentUser.phone || '');
                                }}
                                className="px-3.5 py-2 rounded-xl text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] font-semibold text-xs transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-2.5 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Guardar Datos</span>
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* SECURITY & PASSWORD CHANGE SECTION */}
                  <div ref={securitySectionRef} className="rounded-[22px] bg-[#1a1917] border border-white/[0.08] overflow-hidden shadow-[0_10px_25px_-6px_rgba(0,0,0,0.6)] scroll-mt-4">
                    {/* Header Item / Trigger */}
                    <div 
                      onClick={() => {
                        const nextState = !showPassChange;
                        setShowPassChange(nextState);
                        setPassFeedback(null);
                        if (nextState) {
                          scrollToSection(securitySectionRef);
                        }
                      }}
                      className="p-4 sm:p-4.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors select-none group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#e7d9cf]/10 border border-[#e7d9cf]/20 flex items-center justify-center text-[#e7d9cf] shrink-0 group-hover:bg-[#e7d9cf] group-hover:text-[#111111] transition-colors duration-200 shadow-sm">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-[#eeede9]">
                              Seguridad y Contraseña
                            </span>
                            {currentUser.isTemporaryPassword && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                                Temporal
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#eeede9]/50 truncate mt-0.5">
                            {showPassChange ? 'Cerrar formulario de cambio' : 'Actualizá tu clave de acceso personal'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[11px] font-bold text-[#e7d9cf] hidden sm:inline group-hover:underline">
                          {showPassChange ? 'Ocultar' : 'Modificar'}
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-[#eeede9]/70 group-hover:text-[#eeede9] group-hover:bg-white/[0.08] transition">
                          {showPassChange ? (
                            <ChevronUp className="w-4 h-4 text-[#e7d9cf]" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Temporary Password Alert Banner */}
                    {currentUser.isTemporaryPassword && !showPassChange && (
                      <div className="mx-4 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span className="leading-snug">Tenés una clave temporal. Te sugerimos cambiarla por una segura.</span>
                      </div>
                    )}

                    {/* Smooth Collapsible Form */}
                    <AnimatePresence>
                      {showPassChange && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-white/[0.06] bg-black/25 px-4 sm:px-5 py-4 space-y-3.5"
                        >
                          {passFeedback && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                                passFeedback.type === 'success'
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                              }`}
                            >
                              {passFeedback.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              )}
                              <span>{passFeedback.msg}</span>
                            </motion.div>
                          )}

                          <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
                            <div>
                              <label className="block text-[11px] font-bold text-[#eeede9]/80 mb-1.5">
                                Contraseña Actual
                              </label>
                              <div className="relative">
                                <input
                                  type="password"
                                  value={oldPassword}
                                  onChange={(e) => setOldPassword(e.target.value)}
                                  placeholder="••••••••"
                                  required
                                  className="w-full bg-[#111111] border border-white/[0.12] focus:border-[#e7d9cf] rounded-xl px-3.5 py-2.5 text-[#eeede9] outline-none transition focus:ring-1 focus:ring-[#e7d9cf]/30 placeholder-[#56554e]"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-[#eeede9]/80 mb-1.5">
                                  Nueva Contraseña
                                </label>
                                <input
                                  type="password"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  placeholder="Mínimo 3 caracteres"
                                  required
                                  className="w-full bg-[#111111] border border-white/[0.12] focus:border-[#e7d9cf] rounded-xl px-3.5 py-2.5 text-[#eeede9] outline-none transition focus:ring-1 focus:ring-[#e7d9cf]/30 placeholder-[#56554e]"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-[#eeede9]/80 mb-1.5">
                                  Confirmar Nueva
                                </label>
                                <input
                                  type="password"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="Repetir nueva clave"
                                  required
                                  className="w-full bg-[#111111] border border-white/[0.12] focus:border-[#e7d9cf] rounded-xl px-3.5 py-2.5 text-[#eeede9] outline-none transition focus:ring-1 focus:ring-[#e7d9cf]/30 placeholder-[#56554e]"
                                />
                              </div>
                            </div>

                            <div className="pt-1.5 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPassChange(false);
                                  setPassFeedback(null);
                                }}
                                className="px-3.5 py-2 rounded-xl text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] font-semibold text-xs transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-2.5 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Guardar Nueva Contraseña</span>
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-2 border-t border-white/[0.08] flex justify-end">
                    <button
                      onClick={logout}
                      className="py-2 px-4 rounded-xl bg-[#1c1b18] text-[#eeede9] border border-white/[0.08] hover:bg-white/[0.06] font-bold text-xs transition flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}

              {/* LOGIN FORM IF NOT LOGGED IN */}
              {!currentUser && (
                <div className="space-y-4 text-xs">
                  <div className="text-center space-y-1 mb-2">
                    <h4 className="font-black text-base text-[#eeede9] uppercase tracking-tight">
                      Acceso a la Comunidad Cerrada
                    </h4>
                    <p className="text-[#e7d9cf] text-xs font-medium">
                      Ingresá con tu email y la clave provista por Tomás & Astrid.
                    </p>
                  </div>

                  {authError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-center font-semibold">
                      {authError}
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                    <div>
                      <label className="text-[#eeede9]/80 block mb-1 font-bold">Correo Electrónico</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#eeede9]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          placeholder="ejemplo@email.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full bg-[#111111] border border-white/[0.1] focus:border-[#e7d9cf] rounded-xl pl-10 pr-3 py-2.5 text-sm text-[#eeede9] placeholder-[#eeede9]/30 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[#eeede9]/80 block mb-1 font-bold">Contraseña</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#eeede9]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="w-full bg-[#111111] border border-white/[0.1] focus:border-[#e7d9cf] rounded-xl pl-10 pr-3 py-2.5 text-sm text-[#eeede9] placeholder-[#eeede9]/30 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black rounded-2xl transition shadow-lg shadow-black/40 mt-2 cursor-pointer"
                    >
                      Ingresar a Mi Perfil
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Admin Students & Graduation Modal */}
      <AdminStudentsModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />

      {/* Admin Formation, Attendance & Recaps Modal */}
      <AdminFormationModal
        isOpen={showFormationModal}
        onClose={() => setShowFormationModal(false)}
      />

      {/* Interactive Image Cropper Modal */}
      <ImageCropperModal
        isOpen={showCropperModal}
        imageSrc={cropperSrc}
        onClose={() => setShowCropperModal(false)}
        onCropComplete={handleCropComplete}
      />
    </>
  );
};
