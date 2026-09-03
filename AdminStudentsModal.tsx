import React, { useState } from 'react';
import { normalizeText } from '../utils/convocatoriaUtils';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  GraduationCap,
  Award,
  CheckCircle2,
  Plus,
  Search,
  Copy,
  Trash2,
  KeyRound,
  UserPlus,
  Users,
  Edit3,
  ShieldCheck,
  Check,
  Sparkles,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  MessageCircle,
  AlertCircle,
  Pause,
  Play,
  Save
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User, DEFAULT_AVATAR_URL } from '../types';

export const AdminStudentsSection: React.FC = () => {
  const {
    usersList,
    createStudentByAdmin,
    updateStudentGraduation,
    updateStudentByAdmin,
    deleteStudentByAdmin,
    toggleGlobalStudentPause
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [confirmPauseStudent, setConfirmPauseStudent] = useState<User | null>(null);

  // Editing state for an existing student
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDni, setEditDni] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const handleStartEditStudent = (user: User) => {
    setEditingStudentId(user.id);
    setEditFullName(user.fullName || '');
    setEditEmail(user.email || '');
    setEditDni(user.dni || '');
    setEditPhone(user.phone || '');
  };

  const handleSaveStudentEdit = (userId: string) => {
    if (!editFullName.trim() || !editEmail.trim()) {
      setFeedbackMsg({ type: 'error', text: 'El nombre y el email no pueden estar vacíos.' });
      return;
    }

    updateStudentByAdmin(userId, {
      fullName: editFullName.trim(),
      email: editEmail.trim(),
      dni: editDni.trim(),
      phone: editPhone.trim()
    });

    setFeedbackMsg({
      type: 'success',
      text: `¡Datos de ${editFullName.trim()} actualizados correctamente!`
    });

    setEditingStudentId(null);
  };

  // Form state for creating a new student
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDni, setNewDni] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLevel, setNewLevel] = useState('Bachata Influence - Nivel 1');
  const [newTempPassword, setNewTempPassword] = useState(`TA-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newNivel1, setNewNivel1] = useState(true);
  const [newNivel2, setNewNivel2] = useState(false);

  // Success / Feedback state
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createdStudentWelcome, setCreatedStudentWelcome] = useState<{ student: User; tempPass: string } | null>(null);
  const [copiedWelcomeText, setCopiedWelcomeText] = useState(false);

  const handleCreateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    setCreatedStudentWelcome(null);

    if (!newFullName.trim() || !newEmail.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Por favor ingresá Nombre y Email obligatorios.' });
      return;
    }

    const res = createStudentByAdmin({
      fullName: newFullName,
      email: newEmail,
      dni: newDni,
      phone: newPhone,
      level: newLevel,
      tempPassword: newTempPassword,
      nivel1Completed: newNivel1,
      nivel2Completed: newNivel2
    });

    if (res.success && res.student) {
      setFeedbackMsg({ type: 'success', text: res.message });
      setCreatedStudentWelcome({
        student: res.student,
        tempPass: newTempPassword
      });

      // Reset form
      setNewFullName('');
      setNewEmail('');
      setNewDni('');
      setNewPhone('');
      setNewTempPassword(`TA-${Math.floor(1000 + Math.random() * 9000)}`);
      setNewNivel1(true);
      setNewNivel2(false);
    } else {
      setFeedbackMsg({ type: 'error', text: res.message || 'Error al crear el usuario.' });
    }
  };

  const generateWhatsAppMessage = (studentName: string, studentEmail: string, pass: string) => {
    return `¡Hola ${studentName}! 🎉 Te damos la bienvenida oficial a la app de TA Bachata Academy.\n\n` +
      `Ingresá desde nuestra web:\n` +
      `📲 https://tabachata-academy.com\n\n` +
      `Tus datos de acceso son:\n` +
      `📧 Email: ${studentEmail}\n` +
      `🔑 Clave Temporal: ${pass}\n\n` +
      `📌 Recordá ingresar a tu perfil para completar tu DNI (sin puntos), cargar tu foto de perfil y personalizar tu contraseña.\n\n` +
      `¡Nos vemos ahí! 💃🕺`;
  };

  const handleCopyWelcomeText = (studentName: string, studentEmail: string, pass: string) => {
    const msg = generateWhatsAppMessage(studentName, studentEmail, pass);
    navigator.clipboard.writeText(msg);
    setCopiedWelcomeText(true);
    setTimeout(() => setCopiedWelcomeText(false), 3000);
  };

  const handleResetPassword = (user: User) => {
    const newPass = `TA-${Math.floor(1000 + Math.random() * 9000)}`;
    updateStudentByAdmin(user.id, {
      password: newPass,
      isTemporaryPassword: true
    });
    setFeedbackMsg({
      type: 'success',
      text: `Se blanqueó la contraseña de ${user.fullName} a la clave temporal: ${newPass}`
    });
  };

  const studentsOnly = usersList.filter(u => u.role !== 'admin');
  const filteredUsers = studentsOnly.filter(u =>
    normalizeText(u.fullName).includes(normalizeText(searchQuery)) ||
    normalizeText(u.email).includes(normalizeText(searchQuery)) ||
    (u.memberCode && normalizeText(u.memberCode).includes(normalizeText(searchQuery))) ||
    (u.dni && normalizeText(u.dni).includes(normalizeText(searchQuery)))
  ).sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div className="space-y-4 text-[#eeede9]">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#56554e]/30 text-[#e7d9cf] rounded-2xl border border-[#e7d9cf]/30 shadow-md">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-[#eeede9] tracking-tight">
              Gestión de Alumnos
            </h3>
            <p className="text-[11px] text-[#e7d9cf] font-medium uppercase tracking-wider">
              Altas, bajas, contraseñas y permisos de alumnos
            </p>
          </div>
        </div>
      </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#141413]/90 border border-white/[0.08] rounded-xl mb-5 overflow-x-auto no-scrollbar whitespace-nowrap">
            <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase text-[#e7d9cf]/70 tracking-widest shrink-0 border-r border-white/[0.08] mr-1">
              <Users className="w-3.5 h-3.5 text-[#e7d9cf]" />
              <span>Subsección:</span>
            </div>

            {/* 1. Lista de Alumnos */}
            <button
              type="button"
              onClick={() => { setActiveTab('list'); setFeedbackMsg(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-[#56554e]/60 text-[#eeede9] border border-[#e7d9cf]/40 shadow-sm'
                  : 'text-[#eeede9]/60 hover:text-[#eeede9] hover:bg-white/[0.04]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#e7d9cf]" />
              <span>Lista de Alumnos</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                activeTab === 'list' ? 'bg-[#e7d9cf] text-[#111111]' : 'bg-white/[0.08] text-[#eeede9]/70'
              }`}>
                {studentsOnly.length}
              </span>
            </button>

            {/* 2. Crear Alumno */}
            <button
              type="button"
              onClick={() => { setActiveTab('create'); setFeedbackMsg(null); setCreatedStudentWelcome(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-[#56554e]/60 text-[#eeede9] border border-[#e7d9cf]/40 shadow-sm'
                  : 'text-[#eeede9]/60 hover:text-[#eeede9] hover:bg-white/[0.04]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-[#e7d9cf]" />
              <span>Crear Alumno</span>
            </button>
          </div>

          {/* Scrollable Modal Body */}
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-4">
            {feedbackMsg && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/30 text-red-300'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            {/* LIST TAB */}
            {activeTab === 'list' && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#56554e] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email, DNI o código de socio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#eeede9] placeholder-[#56554e] focus:outline-none focus:border-[#e7d9cf]"
                  />
                </div>

                {/* Students Cards List */}
                <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#eeede9]/60">
                    No se encontraron alumnos que coincidan con la búsqueda.
                  </div>
                ) : (
                  filteredUsers.map((u, uIdx) => (
                    <div
                      key={`student-row-${u.id}-${uIdx}`}
                      className="p-4 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/50 hover:border-[#e7d9cf]/40 transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Student User Details */}
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || DEFAULT_AVATAR_URL}
                            alt={u.fullName}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover border-2 border-[#e7d9cf]/40"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-[#eeede9]">{u.fullName}</h4>
                              {u.role === 'admin' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#e7d9cf] text-[#111111]">
                                  Director
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#56554e]/40 text-[#e7d9cf] border border-[#56554e]/60">
                                {u.memberCode || 'S/C'}
                              </span>
                            </div>
                            <p className="text-xs text-[#e7d9cf]">{u.email}</p>
                            <p className="text-[11px] text-[#eeede9]/70">
                              Código Socio: <strong className="text-[#e7d9cf] font-mono font-bold">{u.memberCode || 'S/C'}</strong> • DNI: {u.dni || 'S/D'} • Tel: {u.phone || 'S/T'}
                            </p>
                          </div>
                        </div>

                        {/* Graduation Level Checkboxes */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#56554e]/30">
                          <button
                            onClick={() => updateStudentGraduation(u.id, !u.nivel1Completed, !!u.nivel2Completed)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                              u.nivel1Completed
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-[#111111] text-[#eeede9]/60 border-[#56554e]/60 hover:text-[#eeede9]'
                            }`}
                            title="Marcar o desmarcar Nivel 1"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Nivel 1 {u.nivel1Completed ? '✔' : 'Pendiente'}</span>
                          </button>

                          <button
                            onClick={() => updateStudentGraduation(u.id, !!u.nivel1Completed, !u.nivel2Completed)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                              u.nivel2Completed
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-[#111111] text-[#eeede9]/60 border-[#56554e]/60 hover:text-[#eeede9]'
                            }`}
                            title="Marcar o desmarcar Nivel 2"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Nivel 2 {u.nivel2Completed ? '✔' : 'Pendiente'}</span>
                          </button>

                          {/* Pause / Unpause Student Button */}
                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => setConfirmPauseStudent(u)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 border ${
                                u.isPaused
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 hover:bg-rose-500/30 shadow'
                                  : 'bg-[#111111] text-[#eeede9]/70 border-[#56554e]/60 hover:text-rose-300 hover:border-rose-500/40'
                              }`}
                              title={u.isPaused ? "Alumno Pausado - Clic para Despausar" : "Pausar Alumno"}
                            >
                              {u.isPaused ? (
                                <>
                                  <Play className="w-3.5 h-3.5 text-rose-300 fill-current" />
                                  <span>Pausado</span>
                                </>
                              ) : (
                                <>
                                  <Pause className="w-3.5 h-3.5 text-rose-300" />
                                  <span>Pausar</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Action Options */}
                          <button
                            onClick={() => handleStartEditStudent(u)}
                            className={`p-2 rounded-xl border transition ${
                              editingStudentId === u.id
                                ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf]'
                                : 'bg-[#111111] hover:bg-[#56554e]/40 border-[#56554e]/60 text-[#e7d9cf]'
                            }`}
                            title="Editar Nombre, DNI, Teléfono y Email"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleResetPassword(u)}
                            className="p-2 rounded-xl bg-[#111111] hover:bg-[#56554e]/40 border border-[#56554e]/60 text-[#e7d9cf] transition"
                            title="Blanquear Contraseña Rápida"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {u.role !== 'admin' && (
                            deletingStudentId === u.id ? (
                              <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/60 p-1 rounded-xl">
                                <span className="text-[10px] font-bold text-red-200 px-1">¿Eliminar?</span>
                                <button
                                  onClick={() => {
                                    deleteStudentByAdmin(u.id);
                                    setDeletingStudentId(null);
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-extrabold text-[10px] transition"
                                >
                                  Sí
                                </button>
                                <button
                                  onClick={() => setDeletingStudentId(null)}
                                  className="px-1.5 py-0.5 rounded-lg bg-[#56554e]/60 hover:bg-[#56554e] text-[#eeede9] text-[10px] transition"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingStudentId(u.id)}
                                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Inline Edit Form for Director */}
                      {editingStudentId === u.id && (
                        <div className="p-3.5 bg-[#111111] rounded-2xl border border-[#e7d9cf]/40 space-y-3 my-2 shadow-lg">
                          <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-2">
                            <span className="text-xs font-bold text-[#e7d9cf] flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5 text-[#e7d9cf]" />
                              Editar Datos del Alumno
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingStudentId(null)}
                              className="p-1 text-[#eeede9]/60 hover:text-[#eeede9] transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#eeede9]/80 mb-1">
                                Nombre y Apellido *
                              </label>
                              <input
                                type="text"
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#eeede9]/80 mb-1">
                                Correo Electrónico *
                              </label>
                              <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#eeede9]/80 mb-1">
                                DNI / Documento
                              </label>
                              <input
                                type="text"
                                value={editDni}
                                onChange={(e) => setEditDni(e.target.value)}
                                className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#eeede9]/80 mb-1">
                                Teléfono / WhatsApp
                              </label>
                              <input
                                type="text"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#56554e]/30">
                            <button
                              type="button"
                              onClick={() => setEditingStudentId(null)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#56554e]/40 hover:bg-[#56554e]/60 text-[#eeede9] font-bold text-xs transition"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveStudentEdit(u.id)}
                              className="px-4 py-1.5 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-extrabold text-xs transition flex items-center gap-1.5 shadow"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Guardar Cambios</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Share WhatsApp Message Generator for Existing Student */}
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#56554e]/30 text-[#eeede9]/60">
                        <span>
                          Clave: <code className="text-[#e7d9cf] font-mono">{u.password || '••••••'}</code>
                          {u.isTemporaryPassword && <span className="ml-2 text-amber-300 font-medium">(Temporal)</span>}
                        </span>

                        <button
                          onClick={() => {
                            const pass = u.password || '123456';
                            handleCopyWelcomeText(u.fullName, u.email, pass);
                          }}
                          className="text-[#e7d9cf] hover:underline font-semibold flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{copiedWelcomeText ? '¡Copiado para WhatsApp!' : 'Copiar Mensaje de Acceso'}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* CREATE TAB */}
          {activeTab === 'create' && (
            <div className="space-y-5">
              {createdStudentWelcome ? (
                <div className="p-5 rounded-2xl bg-[#56554e]/30 border-2 border-[#e7d9cf]/40 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>¡Usuario Creado Exitosamente!</span>
                  </div>

                  <div className="p-4 bg-[#111111] rounded-xl border border-[#56554e]/60 font-mono text-xs leading-relaxed text-[#eeede9]/90 space-y-2 whitespace-pre-wrap">
                    {generateWhatsAppMessage(
                      createdStudentWelcome.student.fullName,
                      createdStudentWelcome.student.email,
                      createdStudentWelcome.tempPass
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCopyWelcomeText(
                        createdStudentWelcome.student.fullName,
                        createdStudentWelcome.student.email,
                        createdStudentWelcome.tempPass
                      )}
                      className="flex-1 py-3 px-4 rounded-xl bg-[#e7d9cf] text-[#111111] font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{copiedWelcomeText ? '¡Copiado para enviar!' : 'Copiar para WhatsApp'}</span>
                    </button>

                    <button
                      onClick={() => setCreatedStudentWelcome(null)}
                      className="py-3 px-4 rounded-xl bg-[#56554e]/30 text-[#eeede9] border border-[#56554e]/60 font-bold text-xs transition"
                    >
                      Crear Otro
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateStudentSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#eeede9] mb-1">
                        Nombre y Apellido *
                      </label>
                      <input
                        type="text"
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="Ej: Sofía Martínez"
                        required
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#eeede9] mb-1">
                        Correo Electrónico *
                      </label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="sofia@ejemplo.com"
                        required
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#eeede9] mb-1">
                        DNI / Pasaporte
                      </label>
                      <input
                        type="text"
                        value={newDni}
                        onChange={(e) => setNewDni(e.target.value)}
                        placeholder="Documento"
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#eeede9] mb-1">
                        Teléfono / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+54 9 11..."
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#eeede9] mb-1">
                        Clave Temporal
                      </label>
                      <input
                        type="text"
                        value={newTempPassword}
                        onChange={(e) => setNewTempPassword(e.target.value)}
                        placeholder="Ej: TA-2026"
                        required
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#e7d9cf] font-mono font-bold focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#eeede9] mb-1">
                      Nivel / Formación Actual
                    </label>
                    <select
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value)}
                      className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                    >
                      <option value="Bachata Influence - Nivel 1">Bachata Influence - Nivel 1</option>
                      <option value="Bachata Influence - Nivel 2">Bachata Influence - Nivel 2</option>
                    </select>
                  </div>

                  {/* Level Graduation Checkboxes */}
                  <div className="p-4 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/50 space-y-2">
                    <span className="block text-xs font-extrabold text-[#e7d9cf] uppercase tracking-wider">
                      Estado de Niveles Finalizados
                    </span>
                    <div className="flex flex-col sm:flex-row gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#eeede9]">
                        <input
                          type="checkbox"
                          checked={newNivel1}
                          onChange={(e) => setNewNivel1(e.target.checked)}
                          className="w-4 h-4 rounded border-[#56554e] text-[#e7d9cf] focus:ring-0 accent-[#e7d9cf]"
                        />
                        <span>🎓 Nivel 1 Finalizado</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#eeede9]">
                        <input
                          type="checkbox"
                          checked={newNivel2}
                          onChange={(e) => setNewNivel2(e.target.checked)}
                          className="w-4 h-4 rounded border-[#56554e] text-[#e7d9cf] focus:ring-0 accent-[#e7d9cf]"
                        />
                        <span>🎓 Nivel 2 Finalizado</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-extrabold text-sm transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Crear Alumno</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Confirmation Modal for Pausing / Unpausing Student */}
        <AnimatePresence>
          {confirmPauseStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[#111111] border-2 border-rose-500/60 rounded-3xl p-6 max-w-md w-full text-[#eeede9] space-y-5 shadow-2xl relative"
              >
                <div className="flex items-center gap-3 border-b border-[#56554e]/40 pb-3">
                  <div className="p-2.5 bg-rose-500/20 text-rose-300 rounded-2xl border border-rose-500/40 shrink-0">
                    <AlertCircle className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#eeede9]">
                      {confirmPauseStudent.isPaused ? '¿Despausar Alumno?' : '¿Pausar Alumno?'}
                    </h3>
                    <p className="text-xs text-[#e7d9cf] font-bold">
                      {confirmPauseStudent.fullName} ({confirmPauseStudent.email})
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 leading-relaxed">
                  {confirmPauseStudent.isPaused
                    ? `Al despausar a ${confirmPauseStudent.fullName}, se le restablecerá el acceso a los beneficios de la comunidad, a los recaps de sus formaciones y a los recaps de sus clases regulares.`
                    : `⚠️ Atención: Al pausar a ${confirmPauseStudent.fullName}, se bloquearán automáticamente sus beneficios de la comunidad y el acceso a todos los recaps (tanto de formaciones como de clases regulares en las que esté asignado).`}
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmPauseStudent(null)}
                    className="px-4 py-2.5 rounded-xl bg-[#56554e]/40 hover:bg-[#56554e]/70 text-[#eeede9] font-bold text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleGlobalStudentPause(confirmPauseStudent.id);
                      setConfirmPauseStudent(null);
                    }}
                    className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs transition shadow-lg ${
                      confirmPauseStudent.isPaused
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    {confirmPauseStudent.isPaused ? 'Sí, Despausar' : 'Sí, Pausar Alumno'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
  );
};

interface AdminStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminStudentsModal: React.FC<AdminStudentsModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="admin-students-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#111111]/85 backdrop-blur-md"
        >
          <motion.div
            key="admin-students-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative max-w-3xl w-full max-h-[90vh] flex flex-col bg-[#111111] border border-[#e7d9cf]/30 rounded-3xl p-5 sm:p-6 text-[#eeede9] shadow-2xl overflow-y-auto custom-scrollbar my-auto"
          >
            <div className="flex justify-end mb-2">
              <button
                onClick={onClose}
                className="p-2 text-[#eeede9]/60 hover:text-[#eeede9] rounded-xl hover:bg-[#56554e]/30 transition"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <AdminStudentsSection />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
