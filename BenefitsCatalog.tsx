import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Tag, CheckCircle2, QrCode, Copy, MapPin, Calendar, ExternalLink, Check, Gift, X, Lock, Plus, Edit2, Trash2, Globe, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Benefit, CategoryBenefit } from '../types';
import { checkUserNivel1Completed } from '../utils/convocatoriaUtils';

interface BenefitsCatalogProps {
  onOpenCreateModal?: () => void;
  hideHeader?: boolean;
}

export const BenefitsCatalog: React.FC<BenefitsCatalogProps> = ({ onOpenCreateModal, hideHeader = false }) => {
  const {
    benefits,
    claimBenefit,
    updateBenefit,
    addBenefit,
    deleteBenefit,
    currentUser,
    convocatorias,
    regularClasses,
    setShowAuthModal,
    setShowPassModal,
    benefitCategories,
    addBenefitCategory,
    editBenefitCategory,
    deleteBenefitCategory
  } = useAuth();

  const isDirector = currentUser?.role === 'admin' || currentUser?.role === 'director';
  const hasNivel1Completed = checkUserNivel1Completed(currentUser, convocatorias);
  const canAccessBenefits = isDirector || hasNivel1Completed;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const benId = params.get('benefitId') || params.get('beneficio');
    if (benId && benefits.length > 0) {
      const foundBen = benefits.find(b => b.id === benId);
      if (foundBen) {
        setSelectedBenefit(foundBen);
      } else {
        setTimeout(() => {
          const el = document.getElementById(`benefit-${benId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    }
  }, [benefits]);

  const handleShareBenefitWhatsApp = (ben: Benefit) => {
    const titleText = `🎁 *${ben.title.trim()}*`;
    const discountText = `🏷️ *Descuento:* ${ben.discount ? ben.discount.trim() : 'Descuento Exclusivo'}`;

    const messageParts: string[] = [titleText, discountText];
    if (ben.provider && ben.provider.trim()) {
      messageParts.push(`📍 *Proveedor:* ${ben.provider.trim()}`);
    }
    const deepLink = `https://tabachata-academy.com?benefitId=${ben.id}`;
    messageParts.push(`🔗 *Ver beneficio en la App:* ${deepLink}`);

    const message = messageParts.join('\n\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message).catch(() => {});
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const isStudentPaused = !isDirector && (
    currentUser?.isPaused === true ||
    (convocatorias || []).some(c => 
      c.studentIds?.includes(currentUser?.id || '') && 
      c.studentPayments?.[currentUser?.id || '']?.isPaused === true
    ) ||
    (regularClasses || []).some(rc =>
      rc.studentIds?.includes(currentUser?.id || '') &&
      rc.studentPayments?.[currentUser?.id || '']?.isPaused === true
    )
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Category Manager modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [editCatInputVal, setEditCatInputVal] = useState('');
  const [deletingCatName, setDeletingCatName] = useState<string | null>(null);

  if (isStudentPaused) {
    return (
      <div className="w-full text-[#eeede9] py-6 sm:py-10">
        <div className="w-full max-w-5xl mx-auto bg-gradient-to-b from-[#181414] to-[#120f0f] border border-rose-500/30 rounded-3xl p-8 sm:p-14 text-center space-y-7 shadow-2xl shadow-black/50 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-56 h-56 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-300 shadow-xl">
            <Lock className="w-8 h-8 text-rose-300" />
          </div>

          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Acceso Restringido</span>
            </span>

            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
              <span className="block text-[#e7d9cf]">Club de Beneficios</span>
              <span className="block text-[#eeede9]">TA Bachata Academy</span>
            </h2>

            <p className="text-base sm:text-lg font-extrabold text-rose-200 max-w-lg mx-auto bg-rose-950/60 py-3.5 px-6 rounded-2xl border border-rose-500/30 shadow-inner">
              Hasta no regularizar tus pagos, no podrás acceder a los beneficios
            </p>

            <p className="text-xs sm:text-sm text-[#eeede9]/80 leading-relaxed font-medium pt-1 max-w-xl mx-auto">
              Si ya realizaste tu pago o abonaste el saldo pendiente, por favor contactate con la administración para reactivar tus beneficios inmediatamente
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccessBenefits) {
    return (
      <div className="w-full text-[#eeede9] py-6 sm:py-10">
        <div className="w-full max-w-5xl mx-auto bg-gradient-to-b from-[#141413] to-[#101010] border border-white/[0.08] rounded-3xl p-8 sm:p-14 text-center space-y-8 shadow-2xl shadow-black/50 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-20 -left-20 w-56 h-56 bg-[#e7d9cf]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#e7d9cf] shadow-xl">
            <Lock className="w-8 h-8 text-[#e7d9cf]" />
          </div>

          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Beneficios Exclusivos — Requiere Nivel 1 finalizado</span>
            </span>

            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
              <span className="block text-[#e7d9cf]">Club de Beneficios</span>
              <span className="block text-[#eeede9]">TA Bachata Academy</span>
            </h2>

            <p className="text-xs sm:text-sm text-[#eeede9]/80 leading-relaxed font-medium pt-1">
              La sección de descuentos y beneficios está disponible sólo para los alumnos que hayan finalizado exitosamente el <strong className="text-[#e7d9cf]">Nivel 1</strong> de la Formación en adelante
            </p>
          </div>

          {/* Current student status card */}
          {currentUser ? (
            <div className="max-w-xl mx-auto p-5 bg-[#181816] border border-white/[0.08] rounded-2xl text-left space-y-2.5 shadow-sm">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-[#e7d9cf] block">Tu Estado Actual:</span>
                <div className="inline-flex items-center">
                  <span className="px-3 py-1 rounded-full bg-[#111111] text-amber-300 font-extrabold text-xs border border-white/[0.08]">
                    {currentUser.level || 'Alumno Registrado'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#eeede9]/70 leading-relaxed pt-0.5">
                Si estás cursando o por cursar el Nivel 1, al completar las 8 clases y finalizar exitosamente el nivel con los requisitos mínimos, se desbloquearán automáticamente todos los beneficios de la comunidad
              </p>
            </div>
          ) : (
            <div className="pt-2">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition-all duration-200 shadow-xl uppercase tracking-wider cursor-pointer"
              >
                Iniciar Sesión
              </button>
            </div>
          )}

          {/* What benefits await you */}
          <div className="pt-6 border-t border-white/[0.06] max-w-2xl mx-auto space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#e7d9cf]">
              ¿Qué beneficios se desbloquean al finalizar de Nivel 1?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs text-[#eeede9]/80 font-medium">
              <div className="p-3.5 bg-[#181816] rounded-2xl border border-white/[0.06] flex items-center gap-2.5">
                <Gift className="w-4 h-4 text-[#e7d9cf] shrink-0" />
                <span>Descuentos en calzado e indumentaria</span>
              </div>
              <div className="p-3.5 bg-[#181816] rounded-2xl border border-white/[0.06] flex items-center gap-2.5">
                <Gift className="w-4 h-4 text-[#e7d9cf] shrink-0" />
                <span>Descuentos en sociales</span>
              </div>
              <div className="p-3.5 bg-[#181816] rounded-2xl border border-white/[0.06] flex items-center gap-2.5">
                <Gift className="w-4 h-4 text-[#e7d9cf] shrink-0" />
                <span>Acceso a merchandising oficial de TA Bachata Academy</span>
              </div>
              <div className="p-3.5 bg-[#181816] rounded-2xl border border-white/[0.06] flex items-center gap-2.5">
                <Gift className="w-4 h-4 text-[#e7d9cf] shrink-0" />
                <span>Descuentos en servicios como kinesiología o similar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  const categoriesFromBenefits = benefits.flatMap(b => b.categories && b.categories.length > 0 ? b.categories : [b.category]).filter(c => c && c.toLowerCase() !== 'general');
  const categories = Array.from(new Set<string>([
    'Todos',
    ...benefitCategories.filter(c => c && c.toLowerCase() !== 'general'),
    ...categoriesFromBenefits
  ]));

  const filteredBenefits = benefits.filter(ben => {
    if (!isDirector && ben.isHidden) return false;
    const benCats = ben.categories && ben.categories.length > 0 ? ben.categories : [ben.category];
    const matchesCat = selectedCategory === 'Todos' || benCats.includes(selectedCategory);
    const matchesSearch = ben.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ben.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ben.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Title & Banner Header with Inicio Aesthetic */}
      {!hideHeader && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] p-6 sm:p-10 border border-white/[0.08] shadow-2xl shadow-black/50">
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-4 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-[#56554e]/40 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wider">
                <Gift className="w-3.5 h-3.5 text-[#e7d9cf]" />
                <span>CLUB DE BENEFICIOS</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#eeede9] tracking-tight leading-tight uppercase">
                Beneficios exclusivos en <span className="text-[#e7d9cf]">zapatillas de baile</span>, sociales, talleres y más
              </h1>

              <p className="text-sm sm:text-base text-[#eeede9]/85 leading-relaxed">
                Presentando tu Credencial Digital o ingresando tus códigos promocionales, accedés a beneficios únicos!
              </p>
            </div>

            <div className="shrink-0 flex flex-wrap gap-3">
              <button
                onClick={() => setShowPassModal(true)}
                className="py-3 px-6 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition-all duration-300 shadow-xl shadow-black/40 flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] tracking-wider uppercase"
              >
                <QrCode className="w-4 h-4 text-[#111111]" />
                <span>Ver mi QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#eeede9]/50 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por marca, actividad, social..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161615] border border-white/[0.08] rounded-full pl-11 pr-4 py-2.5 text-xs text-[#eeede9] placeholder-[#56554e] focus:outline-none focus:border-[#e7d9cf]/50 shadow-md shadow-black/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat, idx) => (
            <button
              key={`cat-btn-${cat}-${idx}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'bg-[#161615] border border-white/[0.07] text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.04]'
              }`}
            >
              {cat}
            </button>
          ))}

          {isDirector && (
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-4 py-2 rounded-full text-xs font-black whitespace-nowrap bg-[#56554e]/30 border border-white/[0.1] text-[#e7d9cf] hover:bg-[#e7d9cf] hover:text-[#111111] transition-all duration-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Gestionar Categorías de Beneficios"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Categorías</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Manager Modal for Directors */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#161615] border border-white/[0.08] rounded-3xl p-6 max-w-md w-full text-[#eeede9] space-y-4 shadow-2xl shadow-black/60 relative"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-bold text-[#eeede9]">Gestionar Categorías de Beneficios</h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="p-1.5 text-[#eeede9]/60 hover:text-[#eeede9] rounded-full hover:bg-white/[0.05] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add category form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newCatInput.trim()) {
                    addBenefitCategory(newCatInput.trim());
                    setNewCatInput('');
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Nueva categoría de beneficios..."
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="flex-1 bg-[#111111]/80 border border-white/[0.08] rounded-full px-4 py-2 text-xs text-[#eeede9] placeholder-[#56554e] focus:outline-none focus:border-[#e7d9cf]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#e7d9cf] text-[#111111] font-black text-xs rounded-full hover:bg-[#eeede9] transition-all shrink-0 cursor-pointer"
                >
                  Agregar
                </button>
              </form>

              {/* Existing categories list */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {benefitCategories.map((cat) => (
                  <div
                    key={`ben-cat-manage-${cat}`}
                    className="flex items-center justify-between p-2.5 bg-[#111111]/80 rounded-2xl border border-white/[0.06] text-xs"
                  >
                    {editingCatName === cat ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editCatInputVal}
                          onChange={(e) => setEditCatInputVal(e.target.value)}
                          className="w-full bg-[#161615] border border-[#e7d9cf] rounded-full px-3 py-1 text-xs text-[#eeede9]"
                        />
                        <button
                          onClick={() => {
                            if (editCatInputVal.trim()) {
                              editBenefitCategory(cat, editCatInputVal.trim());
                              setEditingCatName(null);
                            }
                          }}
                          className="px-3 py-1 bg-[#e7d9cf] text-[#111111] font-bold text-[11px] rounded-full"
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold text-[#eeede9]">{cat}</span>
                    )}

                    {editingCatName !== cat && (
                      <div className="flex items-center gap-1.5">
                        {deletingCatName === cat ? (
                          <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-500/40 px-2.5 py-1 rounded-full">
                            <span className="text-[10px] text-rose-200 font-medium">¿Eliminar?</span>
                            <button
                              onClick={() => {
                                deleteBenefitCategory(cat);
                                setDeletingCatName(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-full transition"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setDeletingCatName(null)}
                              className="px-2 py-0.5 bg-[#56554e]/50 hover:bg-[#56554e] text-white text-[10px] rounded-full transition"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingCatName(cat);
                                setEditCatInputVal(cat);
                                setDeletingCatName(null);
                              }}
                              className="p-1.5 text-[#e7d9cf] hover:text-[#eeede9] hover:bg-white/[0.05] rounded-full transition"
                              title="Editar categoría"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {benefitCategories.length > 1 && (
                              <button
                                onClick={() => setDeletingCatName(cat)}
                                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-full transition"
                                title="Eliminar categoría"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBenefits.map((ben, bIdx) => {
          const isClaimed = currentUser ? currentUser.claimedBenefits.includes(ben.id) : false;

          return (
            <motion.div
              id={`benefit-${ben.id}`}
              key={`ben-card-${ben.id}-${bIdx}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-3xl border p-5 shadow-xl shadow-black/40 flex flex-col justify-between group transition-all duration-300 hover:shadow-2xl hover:shadow-black/60 ${
                ben.isHidden
                  ? 'bg-[#181611] border-amber-500/40'
                  : 'bg-[#161615] border-white/[0.08] hover:border-white/[0.16]'
              }`}
            >
              <div>
                {/* Image Banner */}
                <div className="relative h-40 rounded-2xl overflow-hidden mb-4 border border-white/[0.08]">
                  <img
                    src={ben.imageUrl}
                    alt={ben.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-[#e7d9cf] text-[#111111] font-black text-xs px-3 py-1 rounded-full shadow-lg shadow-black/40">
                    {ben.discount}
                  </div>
                  {ben.isHidden ? (
                    <div className="absolute top-3 right-3 bg-amber-950/90 text-amber-300 border border-amber-500/60 font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                      <EyeOff className="w-3 h-3 text-amber-300" />
                      <span>Oculto</span>
                    </div>
                  ) : isClaimed ? (
                    <div className="absolute top-3 right-3 bg-[#111111]/90 text-[#e7d9cf] border border-white/[0.1] font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-3 h-3 text-[#e7d9cf]" />
                      <span>Obtenido</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {(ben.categories && ben.categories.length > 0 ? ben.categories : [ben.category]).map((c, i) => (
                      <span key={`ben-card-cat-${ben.id}-${i}`} className="text-[10px] uppercase tracking-wider font-extrabold text-[#e7d9cf] bg-[#56554e]/30 px-2.5 py-0.5 rounded-full">
                        {c}
                      </span>
                    ))}
                  </div>
                  {currentUser?.role === 'admin' && (
                    <span className="text-[10px] text-[#e7d9cf] font-black bg-[#111111] px-2.5 py-0.5 rounded-full border border-white/[0.06] shrink-0">
                      Director
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-[#eeede9] mt-2 group-hover:text-[#e7d9cf] transition-colors">
                  {ben.title}
                </h3>
                <p className="text-xs text-[#e7d9cf] font-semibold mb-2">{ben.provider}</p>
                <p className="text-xs text-[#eeede9]/70 line-clamp-2 leading-relaxed mb-4">
                  {ben.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs gap-2">
                {isDirector ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareBenefitWhatsApp(ben);
                    }}
                    className="py-1.5 px-3 rounded-full bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold text-xs transition-all duration-200 flex items-center gap-1.5 border border-emerald-500/30 cursor-pointer shadow-sm active:scale-95"
                    title="Compartir beneficio por WhatsApp"
                  >
                    <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.76.459 3.474 1.33 4.986l-1.415 5.166 5.285-1.385a9.946 9.946 0 004.784 1.226h.005c5.507 0 9.99-4.478 9.99-9.985 0-2.668-1.039-5.176-2.926-7.062A9.923 9.923 0 0012.012 2zm0 1.666c4.587 0 8.324 3.737 8.325 8.318 0 2.226-.867 4.318-2.443 5.892a8.272 8.272 0 01-5.88 2.435h-.004a8.28 8.28 0 01-3.99-1.025l-.286-.17-2.964.776.79-2.887-.186-.297a8.285 8.285 0 01-1.27-4.295c0-4.581 3.738-8.318 8.325-8.318z"/>
                    </svg>
                    <span>WhatsApp</span>
                  </button>
                ) : <div />}

                <button
                  onClick={() => {
                    setSelectedBenefit(ben);
                  }}
                  className="py-1.5 px-4 rounded-full bg-[#111111]/80 hover:bg-white/[0.05] text-[#eeede9] font-bold transition-all duration-200 text-xs flex items-center gap-1.5 border border-white/[0.08] shrink-0 cursor-pointer"
                >
                  <span>Detalle</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#e7d9cf]" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Benefit Detail Modal */}
      <AnimatePresence>
        {selectedBenefit && (
          <motion.div
            key={`benefit-detail-backdrop-${selectedBenefit.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-none"
            onClick={() => setSelectedBenefit(null)}
          >
            <motion.div
              key={`benefit-detail-content-${selectedBenefit.id}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col min-h-0 bg-[#161615] border border-white/[0.08] rounded-3xl text-[#eeede9] shadow-2xl shadow-black/70 overflow-hidden my-auto"
            >
              {/* Sticky Top Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] p-4 sm:p-5 shrink-0 bg-[#161615]">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="p-2.5 bg-[#e7d9cf] text-[#111111] rounded-2xl font-bold shadow-md shadow-black/30 shrink-0">
                    <Gift className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-[#e7d9cf] tracking-wider block truncate">
                      {(selectedBenefit.categories && selectedBenefit.categories.length > 0 ? selectedBenefit.categories : [selectedBenefit.category]).join(' • ')}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-[#eeede9] truncate">{selectedBenefit.title}</h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBenefit(null)}
                  className="p-2 text-[#eeede9]/60 hover:text-[#eeede9] rounded-full hover:bg-white/[0.05] transition shrink-0 ml-2 cursor-pointer"
                  title="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-6 pb-12 sm:pb-16 overflow-y-auto flex-1 min-h-0 space-y-4 custom-scrollbar touch-pan-y">
                <div className="relative h-48 rounded-2xl overflow-hidden border border-white/[0.08]">
                  <img
                    src={selectedBenefit.imageUrl}
                    alt={selectedBenefit.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-[#e7d9cf] text-[#111111] font-black text-sm px-4 py-1.5 rounded-full shadow-xl shadow-black/40">
                    {selectedBenefit.discount}
                  </div>
                </div>

                    <div className="space-y-3 text-xs">
                      {Boolean(selectedBenefit.description && selectedBenefit.description.trim()) && (
                        <div className="p-4 bg-[#111111]/80 rounded-2xl border border-white/[0.05] text-[#eeede9]/90 space-y-1">
                          <strong className="text-[#e7d9cf] text-[11px] uppercase tracking-wider block font-bold">Descripción:</strong>
                          <p className="text-sm leading-relaxed whitespace-pre-line text-[#eeede9]/90">{selectedBenefit.description}</p>
                        </div>
                      )}

                      {(selectedBenefit.location || selectedBenefit.locationUrl) && (
                        <div className="flex items-center justify-between gap-2 text-[#eeede9]/80 p-3 bg-[#111111]/80 rounded-2xl border border-white/[0.05]">
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="w-4 h-4 text-[#e7d9cf] shrink-0" />
                            <span className="truncate"><strong>Ubicación:</strong> {selectedBenefit.location || 'Ver Ubicación'}</span>
                          </div>
                          {(selectedBenefit.locationUrl || (selectedBenefit.location && selectedBenefit.location.startsWith('http'))) && (
                            <a
                              href={selectedBenefit.locationUrl || selectedBenefit.location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-full bg-[#e7d9cf]/15 hover:bg-[#e7d9cf] text-[#e7d9cf] hover:text-[#111111] font-bold text-[11px] transition-all shrink-0 flex items-center gap-1 border border-white/[0.08]"
                            >
                              <span>Ver en Maps</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {selectedBenefit.websiteUrl && (
                        <div className="flex items-center justify-between gap-2 text-[#eeede9]/80 p-3 bg-[#111111]/80 rounded-2xl border border-white/[0.05]">
                          <div className="flex items-center gap-2 min-w-0">
                            <Globe className="w-4 h-4 text-[#e7d9cf] shrink-0" />
                            <span className="truncate"><strong>Página Web:</strong> {selectedBenefit.websiteUrl}</span>
                          </div>
                          <a
                            href={selectedBenefit.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-full bg-[#e7d9cf]/15 hover:bg-[#e7d9cf] text-[#e7d9cf] hover:text-[#111111] font-bold text-[11px] transition-all shrink-0 flex items-center gap-1 border border-white/[0.08]"
                          >
                            <span>Visitar Web</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      <div className="flex items-start gap-2 text-[#eeede9]/80 p-3 bg-[#111111]/80 rounded-2xl border border-white/[0.05]">
                        <Calendar className="w-4 h-4 text-[#e7d9cf] shrink-0 mt-0.5" />
                        <span><strong>Vigencia:</strong> {selectedBenefit.validUntil}</span>
                      </div>

                      {Boolean(selectedBenefit.terms && selectedBenefit.terms.trim()) && (
                        <div className="p-3.5 bg-[#111111]/80 rounded-2xl border border-white/[0.05] text-[#eeede9]/70">
                          <strong className="text-[#eeede9] block mb-1">Términos y Condiciones:</strong>
                          {selectedBenefit.terms}
                        </div>
                      )}

                      {/* Promo Code Box */}
                      {Boolean(selectedBenefit.promoCode && selectedBenefit.promoCode.trim()) && (
                        <div className="p-4 bg-[#111111] rounded-2xl border border-white/[0.08] flex items-center justify-between shadow-inner">
                          <div>
                            <span className="text-[10px] uppercase text-[#e7d9cf] font-bold block">Código Promocional</span>
                            <span className="font-mono font-black text-lg text-[#eeede9] tracking-widest">{selectedBenefit.promoCode}</span>
                          </div>
                          <button
                            onClick={() => handleCopyCode(selectedBenefit.promoCode)}
                            className="py-2 px-4 rounded-full bg-[#e7d9cf] text-[#111111] font-black hover:bg-[#eeede9] transition-all duration-200 text-xs flex items-center gap-1.5 shadow-md shadow-black/30 cursor-pointer"
                          >
                            {copiedCode ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedCode ? '¡Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                      )}

                      {/* Director Actions: WhatsApp Share */}
                      {isDirector && (
                        <div className="pt-2 space-y-2">
                          {selectedBenefit.isHidden && (
                            <div className="p-3 bg-amber-950/70 border border-amber-500/40 rounded-2xl text-amber-200 text-xs flex items-center gap-2 font-medium">
                              <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Este beneficio está <strong>oculto</strong> para los alumnos. Sólo los Directores pueden verlo.</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleShareBenefitWhatsApp(selectedBenefit)}
                            className="w-full py-3 px-4 rounded-full bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 border border-emerald-500/30 cursor-pointer shadow-md active:scale-95"
                          >
                            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.76.459 3.474 1.33 4.986l-1.415 5.166 5.285-1.385a9.946 9.946 0 004.784 1.226h.005c5.507 0 9.99-4.478 9.99-9.985 0-2.668-1.039-5.176-2.926-7.062A9.923 9.923 0 0012.012 2zm0 1.666c4.587 0 8.324 3.737 8.325 8.318 0 2.226-.867 4.318-2.443 5.892a8.272 8.272 0 01-5.88 2.435h-.004a8.28 8.28 0 01-3.99-1.025l-.286-.17-2.964.776.79-2.887-.186-.297a8.285 8.285 0 01-1.27-4.295c0-4.581 3.738-8.318 8.325-8.318z"/>
                            </svg>
                            <span>Compartir Beneficio por WhatsApp</span>
                          </button>
                        </div>
                      )}
                    </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
