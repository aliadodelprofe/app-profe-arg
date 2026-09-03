import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { LiveNotificationToast } from './components/LiveNotificationToast';
import { DigitalPassModal } from './components/DigitalPassModal';
import { ProfileModal } from './components/ProfileModal';
import { AnnouncementsFeed } from './components/AnnouncementsFeed';
import { BenefitsCatalog } from './components/BenefitsCatalog';
import { PushNotificationsCenter } from './components/PushNotificationsCenter';
import { TomasyAstridInfo } from './components/TomasyAstridInfo';
import { CreateItemModal } from './components/CreateItemModal';
import { CommunityPortalScreen } from './components/CommunityPortalScreen';
import { StudentFormationView } from './components/StudentFormationView';
import { MerchStore } from './components/MerchStore';
import { StudentPaymentsView } from './components/StudentPaymentsView';
import { AdminFormationModal } from './components/AdminFormationModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { EditCoverModal } from './components/EditCoverModal';
import { PublicMemberVerification } from './components/PublicMemberVerification';
import { FloatingBottomNav } from './components/FloatingBottomNav';
import { TALogo } from './components/TALogo';
import { HomeMuxVideoCard } from './components/HomeMuxVideoCard';

import { ShieldCheck, Flame, Bell, Tag, MessageSquare, ArrowRight, Sparkles, QrCode, Heart, Users, ChevronRight, CheckCircle2, Instagram, MessageCircle, Globe, GraduationCap, Video, UserCheck, Camera, Lock, Gift, Shirt, Plus, Clock, CreditCard, Store } from 'lucide-react';
import { checkUserNivel1Completed } from './utils/convocatoriaUtils';
import heroImg from './assets/images/regenerated_image_1785346633773.jpg';
import socialImg from './assets/images/bachata_social_party_1785268131868.jpg';

function MainContent() {
  const {
    currentUser,
    usersList,
    activeTab,
    setActiveTab,
    announcements,
    benefits,
    convocatorias,
    notifications,
    siteConfig,
    updateSiteConfig,
    setShowPassModal,
    setShowAuthModal,
    showAdminFormationModal,
    setShowAdminFormationModal,
    merchConfig
  } = useAuth();

  const isDirector = currentUser?.role === 'admin' || currentUser?.role === 'director';
  const hasNivel1Completed = checkUserNivel1Completed(currentUser, convocatorias);
  const canAccessBenefits = isDirector || hasNivel1Completed;

  const isBenefitCategory = (categoryName?: string) => {
    if (!categoryName) return false;
    const cat = categoryName.toLowerCase().trim();
    return cat === 'beneficios' || cat === 'beneficio' || cat.includes('benefic');
  };

  const isBenefitAnnouncement = (ann: any) => {
    if (!ann) return false;
    if (isBenefitCategory(ann.category)) return true;
    const titleLower = String(ann.title || '').toLowerCase().trim();
    if (titleLower.startsWith('🎁 nuevo beneficio') || titleLower.includes('beneficio')) return true;
    return false;
  };

  const visibleAnnouncementsOnHome = announcements.filter(a => canAccessBenefits || !isBenefitAnnouncement(a));

  const [verifyMemberId, setVerifyMemberId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('verifyMember') || params.get('socio') || null;
  });

  const [showEditHomeCoverModal, setShowEditHomeCoverModal] = useState(false);
  const [isAcademyDetailOpen, setIsAcademyDetailOpen] = useState(false);
  const currentHomeCover = siteConfig?.homeCoverImage || heroImg;
  const isAdmin = currentUser?.role === 'admin';

  const prevUserIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (currentUser?.id) {
      const params = new URLSearchParams(window.location.search);
      const annId = params.get('announcementId') || params.get('anuncio');
      const benId = params.get('benefitId') || params.get('beneficio');

      if (annId) {
        setActiveTab('anuncios');
      } else if (benId) {
        setActiveTab('beneficios');
      } else if (prevUserIdRef.current !== currentUser.id && (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/inicio')) {
        setActiveTab('inicio');
      }
    }
    prevUserIdRef.current = currentUser ? currentUser.id : null;
  }, [currentUser?.id, setActiveTab]);

  useEffect(() => {
    if (!siteConfig?.faviconUrl || siteConfig.faviconUrl === '/favicon.png') return;
    const linkPng = document.querySelector<HTMLLinkElement>("link[sizes='32x32']");
    if (linkPng) {
      linkPng.href = siteConfig.faviconUrl;
    }
  }, [siteConfig?.faviconUrl]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (activeTab !== 'formacion') {
      setIsAcademyDetailOpen(false);
    }
  }, [activeTab, currentUser?.id]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDefaultTab, setCreateModalDefaultTab] = useState<'announcement' | 'push'>('announcement');

  const openCreateModal = (type: 'announcement' | 'push' = 'announcement') => {
    setCreateModalDefaultTab(type);
    setIsCreateModalOpen(true);
  };

  const whatsappUrl = `https://wa.me/5491170608171?text=${encodeURIComponent('Hola Tomás y Astrid! Consulto desde la app de la Comunidad.')}`;

  // If user is not logged in, present the landing / login portal screen
  // (if verifyMemberId is present, show public member verification overlay without requiring login)
  if (!currentUser) {
    return (
      <>
        {verifyMemberId && (
          <PublicMemberVerification
            memberIdOrCode={verifyMemberId}
            usersList={usersList}
            onClose={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setVerifyMemberId(null);
            }}
          />
        )}
        <CommunityPortalScreen />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-[#eeede9] flex flex-col font-sans selection:bg-[#e7d9cf] selection:text-[#111111]">
      {/* Live Floating Push Toast Notification */}
      <LiveNotificationToast />

      {/* Main Header & Navigation */}
      <Header />

      {/* Edge-to-Edge Hero Banner on Inicio with Curved/Wave Transition */}
      {activeTab === 'inicio' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="relative w-full bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] overflow-hidden"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-8 sm:pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-[#56554e]/40 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wider">
                  <Users className="w-3.5 h-3.5 text-[#e7d9cf]" />
                  <span>COMUNIDAD OFICIAL • ARGENTINA</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#eeede9] tracking-tight leading-none uppercase">
                  TA Bachata <span className="text-[#e7d9cf]">Academy</span>
                </h1>

                <p className="text-sm sm:text-base text-[#eeede9]/85 leading-relaxed max-w-xl">
                  ¡Bienvenidos a la Comunidad!. Acá centralizamos todas las formaciones, novedades, beneficios exclusivos, talleres especiales y tu credencial digital en un sólo lugar
                </p>
              </div>

              {/* Hero Image Showcase */}
              <div className="lg:col-span-5 relative">
                <div className="relative rounded-2xl overflow-hidden aspect-[16/9] w-full group border border-white/[0.08]">
                  <img
                    src={currentHomeCover}
                    alt="Tomás y Astrid Bachata Influence"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />

                  {isAdmin && (
                    <button
                      onClick={() => setShowEditHomeCoverModal(true)}
                      className="absolute top-3 right-3 px-3.5 py-1.5 rounded-full bg-[#111111]/90 hover:bg-[#111111] text-[#e7d9cf] text-xs font-extrabold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all duration-300 group-hover:scale-105 cursor-pointer border border-white/[0.1]"
                      title="Cambiar Foto de Portada Inicio"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Cambiar Portada</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Organic Wave / Curved Divider connecting smoothly into #111111 */}
          <div className="w-full overflow-hidden leading-none -mb-0.5">
            <svg
              className="relative block w-full h-10 sm:h-16 lg:h-20 text-[#111111]"
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
            >
              <path
                d="M0,35 C320,105 680,-15 1040,55 C1220,90 1360,60 1440,40 L1440,120 L0,120 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </motion.section>
      )}

      {/* Edge-to-Edge Header on Comunicaciones / Anuncios */}
      {activeTab === 'comunicaciones' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="relative w-full bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] overflow-hidden"
        >
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-8 sm:pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-[#56554e]/40 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5 text-[#e7d9cf]" />
                  <span>COMUNICACIONES OFICIALES</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#eeede9] tracking-tight leading-none uppercase">
                  Comunicaciones <span className="text-[#e7d9cf]">Importantes</span>
                </h1>

                <p className="text-sm sm:text-base text-[#eeede9]/85 leading-relaxed">
                  Novedades oficiales, sociales, talleres y más
                </p>
              </div>

              {/* Action button if Admin */}
              {currentUser?.role === 'admin' && (
                <div className="shrink-0">
                  <button
                    onClick={() => openCreateModal('announcement')}
                    className="flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition-all duration-300 shadow-xl shadow-black/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer tracking-wider uppercase"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Comunicación</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Organic Wave / Curved Divider connecting smoothly into #111111 */}
          <div className="w-full overflow-hidden leading-none -mb-0.5">
            <svg
              className="relative block w-full h-10 sm:h-16 lg:h-20 text-[#111111]"
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
            >
              <path
                d="M0,35 C320,105 680,-15 1040,55 C1220,90 1360,60 1440,40 L1440,120 L0,120 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </motion.section>
      )}

      {/* Edge-to-Edge Header on Beneficios */}
      {activeTab === 'beneficios' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="relative w-full bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] overflow-hidden"
        >
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-8 sm:pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-[#56554e]/40 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wider">
                  <Gift className="w-3.5 h-3.5 text-[#e7d9cf]" />
                  <span>CLUB DE BENEFICIOS</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#eeede9] tracking-tight leading-none uppercase">
                  BENEFICIOS <span className="text-[#e7d9cf]">EXCLUSIVOS</span>
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

          {/* Organic Wave / Curved Divider connecting smoothly into #111111 */}
          <div className="w-full overflow-hidden leading-none -mb-0.5">
            <svg
              className="relative block w-full h-10 sm:h-16 lg:h-20 text-[#111111]"
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
            >
              <path
                d="M0,35 C320,105 680,-15 1040,55 C1220,90 1360,60 1440,40 L1440,120 L0,120 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </motion.section>
      )}

      {/* Edge-to-Edge Header on Academy / Formación */}
      {activeTab === 'formacion' && !isAcademyDetailOpen && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="relative w-full bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] overflow-hidden"
        >
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-8 sm:pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-[#56554e]/40 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wider">
                  <GraduationCap className="w-3.5 h-3.5 text-[#e7d9cf]" />
                  <span>FORMACIÓN BACHATA INFLUENCE</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#eeede9] tracking-tight leading-none uppercase">
                  {currentUser?.role === 'admin' || currentUser?.role === 'director' ? (
                    <>TA Bachata <span className="text-[#e7d9cf]">Academy</span></>
                  ) : (
                    <>MI <span className="text-[#e7d9cf]">APRENDIZAJE</span></>
                  )}
                </h1>

                <p className="text-sm sm:text-base text-[#eeede9]/85 leading-relaxed">
                  {currentUser?.role === 'admin' || currentUser?.role === 'director'
                    ? 'Cursadas regulares, programas de formación continua, asistencias y material pedagógico'
                    : 'Aca encontrarás toda la información sobre tus formaciones y clases regulares'}
                </p>
              </div>
            </div>
          </div>

          {/* Organic Wave / Curved Divider connecting smoothly into #111111 */}
          <div className="w-full overflow-hidden leading-none -mb-0.5">
            <svg
              className="relative block w-full h-10 sm:h-16 lg:h-20 text-[#111111]"
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
            >
              <path
                d="M0,35 C320,105 680,-15 1040,55 C1220,90 1360,60 1440,40 L1440,120 L0,120 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </motion.section>
      )}

      {/* Edge-to-Edge Header on Merchandising / Tienda */}
      {activeTab === 'merchandising' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="relative w-full bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] overflow-hidden"
        >
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-8 sm:pb-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {currentUser?.role === 'admin' ? (
                <div className="space-y-3 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-[#56554e]/40 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wider">
                    <Store className="w-3.5 h-3.5 text-[#e7d9cf]" />
                    <span>GESTIÓN DE TIENDA OFICIAL</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#eeede9] tracking-tight leading-none uppercase">
                    Tienda Oficial & Pedidos
                  </h1>

                  <p className="text-sm sm:text-base text-[#eeede9]/85 leading-relaxed">
                    Panel de administración de artículos oficiales, control de ventas, inventario por talle y configuración de tandas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-[#56554e]/40 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wider">
                    <Shirt className="w-3.5 h-3.5 text-[#e7d9cf]" />
                    <span>MERCHANDISING OFICIAL</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#eeede9] tracking-tight leading-none uppercase">
                    {merchConfig.batchName || 'Artículos oficiales de la Academy'}
                  </h1>

                  <p className="text-sm sm:text-base text-[#eeede9]/85 leading-relaxed">
                    {merchConfig.batchDescription || '¡Lanzamiento exclusivo de artículos oficiales de TA Bachata Academy! Reservá el tuyo abonando el 50% de seña o el total.'}
                  </p>

                  {merchConfig.batchDeadline && (
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-4 py-2 rounded-full w-fit">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>{merchConfig.batchDeadline}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Organic Wave / Curved Divider connecting smoothly into #111111 */}
          <div className="w-full overflow-hidden leading-none -mb-0.5">
            <svg
              className="relative block w-full h-10 sm:h-16 lg:h-20 text-[#111111]"
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
            >
              <path
                d="M0,35 C320,105 680,-15 1040,55 C1220,90 1360,60 1440,40 L1440,120 L0,120 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </motion.section>
      )}

      {/* Edge-to-Edge Header on Pagos / Estado de Cuenta */}
      {(activeTab === 'pagos' || activeTab === 'tomasyastrid') && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="relative w-full bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] overflow-hidden"
        >
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-8 sm:pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-[#56554e]/40 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wider">
                  <CreditCard className="w-3.5 h-3.5 text-[#e7d9cf]" />
                  <span>PORTAL DE PAGOS</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#eeede9] tracking-tight leading-none uppercase">
                  MIS <span className="text-[#e7d9cf]">PAGOS</span>
                </h1>

                <p className="text-sm sm:text-base text-[#eeede9]/85 leading-relaxed">
                  Consultá tus cuotas vigentes, estados de cuenta y los medios de pago asociados a cada actividad
                </p>
              </div>
            </div>
          </div>

          {/* Organic Wave / Curved Divider connecting smoothly into #111111 */}
          <div className="w-full overflow-hidden leading-none -mb-0.5">
            <svg
              className="relative block w-full h-10 sm:h-16 lg:h-20 text-[#111111]"
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
            >
              <path
                d="M0,35 C320,105 680,-15 1040,55 C1220,90 1360,60 1440,40 L1440,120 L0,120 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </motion.section>
      )}

      {/* Dynamic Main Body Content */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 ${['inicio', 'comunicaciones', 'beneficios', 'formacion', 'merchandising', 'pagos', 'tomasyastrid'].includes(activeTab) ? 'pt-2 sm:pt-4' : 'pt-6 md:pt-8'} pb-28 lg:pb-12 space-y-8`}>
        
        {/* INICIO TAB */}
        {activeTab === 'inicio' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.08, delayChildren: 0.04 }}
            className="space-y-8"
          >
            <EditCoverModal
              isOpen={showEditHomeCoverModal}
              onClose={() => setShowEditHomeCoverModal(false)}
              title="Editar Portada - Inicio"
              currentImage={currentHomeCover}
              defaultImage={heroImg}
              onSave={async (newImg) => {
                await updateSiteConfig({ homeCoverImage: newImg });
              }}
            />

            {/* Vertical Video Experience */}
            <HomeMuxVideoCard
              playbackId={siteConfig?.muxPlaybackId || 'JV8ISH6c93R69p7E00Tztv1YBzyOeYEl9Y9PoDz7n02KU'}
              videoUrl={siteConfig?.homeVideoUrl}
              posterUrl={siteConfig?.homeVideoPosterUrl}
            />

            {/* Quick Access Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Digital Pass Preview Card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3, transition: { duration: 0.2, ease: 'easeOut' } }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setShowPassModal(true)}
                className="bg-[#161615] rounded-3xl p-6 sm:p-7 transition-colors duration-300 cursor-pointer shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-black/60 relative overflow-hidden group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="p-2.5 bg-[#56554e]/20 text-[#e7d9cf] rounded-2xl">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#56554e]/30 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wide">
                      {currentUser?.role === 'admin' || currentUser?.role === 'director' ? 'DIRECTOR ACTIVO' : 'ALUMNO ACTIVO'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-[#eeede9] mb-1 group-hover:text-[#e7d9cf] transition-colors">
                    Credencial Digital
                  </h3>
                  <p className="text-xs text-[#eeede9]/70 leading-relaxed mb-5">
                    Tu carnet digital con código QR para identificarte en la comunidad y acceder a beneficios
                  </p>

                  {currentUser ? (
                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-[#eeede9]/50 block font-semibold">{currentUser.role === 'admin' || currentUser?.role === 'director' ? 'Director' : 'Alumno'}</span>
                        <span className="font-bold text-[#eeede9]">{currentUser.fullName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-[#eeede9]/50 block font-semibold">Código</span>
                        <span className="font-mono font-black text-sm text-[#e7d9cf] tracking-wide">{currentUser.memberCode}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-white/[0.06] text-xs text-[#e7d9cf] font-semibold">
                      Toca para iniciar sesión y ver tu credencial
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-bold text-[#e7d9cf]">
                  <span>Ver Credencial QR</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300 ease-out" />
                </div>
              </motion.div>

              {/* Benefits Highlights Widget */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3, transition: { duration: 0.2, ease: 'easeOut' } }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setActiveTab('beneficios')}
                className="bg-[#161615] rounded-3xl p-6 sm:p-7 transition-colors duration-300 cursor-pointer shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-black/60 relative overflow-hidden group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="p-2.5 bg-[#56554e]/20 text-[#e7d9cf] rounded-2xl">
                      <Tag className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#56554e]/30 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wide">
                      {canAccessBenefits ? `${benefits.length} BENEFICIOS` : 'EXCLUSIVO NIVEL 1'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-[#eeede9] mb-1 group-hover:text-[#e7d9cf] transition-colors">
                    Beneficios & Descuentos
                  </h3>
                  <p className="text-xs text-[#eeede9]/70 leading-relaxed mb-5">
                    Aprovechá hasta 10% OFF en Pana Mio (dance sneakers), descuentos en kinesiología, salas de ensayo y más
                  </p>

                  {canAccessBenefits ? (
                    benefits.length > 0 ? (
                      <div className="pt-3 border-t border-white/[0.06] space-y-2">
                        {benefits.slice(0, 3).map((b) => (
                          <div key={b.id} className="flex items-center gap-2 text-xs py-0.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#e7d9cf] shrink-0" />
                            <span className="font-semibold text-[#eeede9] truncate">{b.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-white/[0.06] text-xs text-[#eeede9]/60 italic">
                        Explorá todos los beneficios vigentes
                      </div>
                    )
                  ) : (
                    <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2 text-xs text-amber-300/90 font-medium">
                      <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>Acceso al completar Nivel 1 de Formación</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-bold text-[#e7d9cf]">
                  <span>Ver Todos los Beneficios</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300 ease-out" />
                </div>
              </motion.div>

              {/* Announcements / Push Widget */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3, transition: { duration: 0.2, ease: 'easeOut' } }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setActiveTab('comunicaciones')}
                className="bg-[#161615] rounded-3xl p-6 sm:p-7 transition-colors duration-300 cursor-pointer shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-black/60 relative overflow-hidden group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="p-2.5 bg-[#56554e]/20 text-[#e7d9cf] rounded-2xl">
                      <MessageSquare className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#56554e]/30 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wide">
                      ÚLTIMAS NOVEDADES
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-[#eeede9] mb-1 group-hover:text-[#e7d9cf] transition-colors">
                    Comunicaciones Oficiales
                  </h3>
                  <p className="text-xs text-[#eeede9]/70 leading-relaxed mb-5">
                    Mantente al día con anuncios importantes, novedades de la formación, sociales, talleres y workshops especiales
                  </p>

                  {visibleAnnouncementsOnHome.length > 0 && (() => {
                    const getTs = (ann: any) => {
                      if (ann.createdAt) return Number(ann.createdAt);
                      if (ann.id && String(ann.id).startsWith('ann-')) {
                        const ts = parseInt(String(ann.id).replace('ann-', ''), 10);
                        if (!isNaN(ts)) return ts;
                      }
                      return 0;
                    };
                    const latestAnn = [...visibleAnnouncementsOnHome].sort((a, b) => getTs(b) - getTs(a))[0];
                    if (!latestAnn) return null;
                    return (
                      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <span className="text-[10px] text-[#e7d9cf] font-bold uppercase block mb-0.5">Novedad Reciente</span>
                          <p className="text-xs text-[#eeede9] font-medium truncate">
                            {latestAnn.title}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-[#e7d9cf] bg-white/[0.05] px-2 py-0.5 rounded-full shrink-0 border border-white/[0.06]">
                          {latestAnn.category}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-bold text-[#e7d9cf]">
                  <span>Ver Tablón de Anuncios</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300 ease-out" />
                </div>
              </motion.div>
            </div>

            {/* Recent Announcements Preview Feed */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="pt-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#eeede9]">Últimos Anuncios Importantes</h3>
                  <p className="text-xs text-[#eeede9]/60">Publicaciones recientes de Tomás & Astrid</p>
                </div>
                <button
                  onClick={() => setActiveTab('comunicaciones')}
                  className="text-xs font-bold text-[#e7d9cf] hover:text-[#eeede9] flex items-center gap-1.5 group px-3.5 py-1.5 rounded-full hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  <span>Ver todos ({visibleAnnouncementsOnHome.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-200" />
                </button>
              </div>

              <AnnouncementsFeed onOpenCreateModal={() => openCreateModal('announcement')} hideHeader={true} />
            </motion.div>
          </motion.div>
        )}

        {/* COMUNICACIONES TAB */}
        {activeTab === 'comunicaciones' && (
          <AnnouncementsFeed onOpenCreateModal={() => openCreateModal('announcement')} hideHeader={true} />
        )}

        {/* BENEFICIOS TAB */}
        {activeTab === 'beneficios' && (
          <BenefitsCatalog hideHeader={true} />
        )}

        {/* FORMACIÓN TAB */}
        {activeTab === 'formacion' && (
          <StudentFormationView 
            hideHeader={true} 
            onDetailStateChange={setIsAcademyDetailOpen} 
          />
        )}

        {/* MERCHANDISING / TIENDA TAB */}
        {activeTab === 'merchandising' && (
          <MerchStore embeddedAdminView={currentUser?.role === 'admin'} hideHeader={true} />
        )}

        {/* PAGOS / ESTADO DE CUENTA TAB */}
        {(activeTab === 'pagos' || activeTab === 'tomasyastrid') && (
          <StudentPaymentsView hideHeader={true} />
        )}

        {/* NOTIFICACIONES TAB */}
        {activeTab === 'notificaciones' && (
          <PushNotificationsCenter />
        )}
      </main>

      {/* Footer with Organic Top Wave & Warm Tone */}
      <footer className="mt-16 w-full relative bg-gradient-to-b from-[#191815] via-[#1e1d1a] to-[#24231f] text-[#eeede9]/70 text-xs overflow-hidden">
        {/* Organic Wave / Curved Divider connecting smoothly from #111111 into Footer */}
        <div className="w-full overflow-hidden leading-none -mt-0.5 pointer-events-none">
          <svg
            className="relative block w-full h-10 sm:h-16 lg:h-20 text-[#111111]"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 L1440,0 L1440,75 C1240,15 960,110 600,45 C360,-15 160,85 0,65 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 lg:pb-10 flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1.5 rounded-2xl bg-[#56554e]/30 flex items-center justify-center">
              <TALogo className="h-6 w-auto" glow variant="footer" />
            </div>
            <div>
              <span className="font-black text-[#eeede9] block text-sm tracking-wider uppercase">TA BACHATA ACADEMY</span>
              <span className="text-[11px] text-[#eeede9]/60">Comunidad Oficial • Argentina</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 lg:gap-6 text-[#eeede9]/80 font-medium text-xs sm:text-sm">
            <a
              href="https://www.instagram.com/tomas_astrid_bachata/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#e7d9cf] flex items-center gap-1.5 transition"
            >
              <Instagram className="w-4 h-4 text-[#e7d9cf]" />
              <span>@tomas_astrid_bachata</span>
            </a>
            <span className="text-[#56554e] hidden sm:inline">•</span>
            <a
              href="https://www.tomasyastrid.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#e7d9cf] flex items-center gap-1.5 transition"
            >
              <Globe className="w-4 h-4 text-[#e7d9cf]" />
              <span>tomasyastrid.com</span>
            </a>
            <span className="text-[#56554e] hidden sm:inline">•</span>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#e7d9cf] flex items-center gap-1.5 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </a>
          </div>

          <p className="text-[#eeede9]/50 text-[11px] text-center lg:text-right">
            © {new Date().getFullYear()} TA Bachata Academy. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Mobile Floating Bottom Navigation */}
      <FloatingBottomNav />

      {/* Global Modals */}
      {verifyMemberId && (
        <PublicMemberVerification
          memberIdOrCode={verifyMemberId}
          usersList={usersList}
          onClose={() => {
            window.history.replaceState({}, '', window.location.pathname);
            setVerifyMemberId(null);
          }}
        />
      )}
      <DigitalPassModal />
      <ProfileModal />
      <LogoutConfirmModal />
      <AdminFormationModal
        isOpen={showAdminFormationModal}
        onClose={() => setShowAdminFormationModal(false)}
      />
      <CreateItemModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultTab={createModalDefaultTab}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
