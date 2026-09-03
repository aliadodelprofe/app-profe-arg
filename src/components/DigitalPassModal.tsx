import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, QrCode, ShieldCheck, Sparkles, Copy, Download, Check, RefreshCw, UserCheck, Calendar, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_AVATAR_URL } from '../types';
import { formatMemberSinceDate } from '../utils/dateUtils';
import { TALogo } from './TALogo';
import { QRCodeRenderer } from './QRCodeRenderer';

export const DigitalPassModal: React.FC = () => {
  const { currentUser, showPassModal, setShowPassModal, setShowAuthModal } = useAuth();
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!showPassModal) return null;

  const getPublicVerificationUrl = (userId: string) => {
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    return `${origin}${window.location.pathname}?verifyMember=${encodeURIComponent(userId)}`;
  };

  const publicVerificationUrl = currentUser ? getPublicVerificationUrl(currentUser.id) : '';

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-[#111111] border border-[#56554e]/60 text-[#eeede9] rounded-3xl p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#56554e]/30 text-[#e7d9cf] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#e7d9cf]/30">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">Iniciá Sesión para ver tu Credencial</h3>
          <p className="text-sm text-[#eeede9]/70 mb-6">
            Para acceder a tu credencial digital de la comunidad de Tomás & Astrid y aprovechar los descuentos, iniciá sesión o registrate.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPassModal(false)}
              className="flex-1 py-2.5 px-4 rounded-xl border border-[#56554e]/60 text-[#eeede9] font-medium hover:bg-[#56554e]/30 transition"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                setShowPassModal(false);
                setShowAuthModal(true);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#e7d9cf] text-[#111111] font-semibold hover:bg-[#eeede9] transition shadow-lg"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentUser.memberCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="digital-pass-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-none"
        onClick={() => setShowPassModal(false)}
      >
        <motion.div
          key="digital-pass-content"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-lg w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col bg-[#161615] rounded-3xl border border-white/[0.08] p-4 sm:p-6 md:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-[#eeede9] overflow-y-auto custom-scrollbar my-auto"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-4 left-6 w-56 h-56 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Controls */}
          <div className="relative z-10 flex items-center justify-between mb-5 sm:mb-6 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-[#56554e]/30 text-[#e7d9cf] rounded-2xl border border-white/[0.08] shadow-sm">
                <ShieldCheck className="w-5 h-5 text-[#e7d9cf]" />
              </span>
              <div>
                <h3 className="font-black text-base sm:text-lg text-[#eeede9] tracking-tight leading-tight">Credencial Digital</h3>
                <p className="text-[10px] sm:text-xs text-[#e7d9cf] font-bold uppercase tracking-wider">Tomás & Astrid Bachata</p>
              </div>
            </div>
            <button
              onClick={() => setShowPassModal(false)}
              className="p-2 text-[#eeede9]/60 hover:text-[#eeede9] rounded-xl hover:bg-white/[0.06] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Flip Card Container */}
          <div className="relative z-10 perspective-1000 mb-5 sm:mb-6">
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative w-full h-[290px] sm:h-[310px] cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* FRONT SIDE */}
              <div
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  opacity: isFlipped ? 0 : 1,
                  visibility: isFlipped ? 'hidden' : 'visible',
                  pointerEvents: isFlipped ? 'none' : 'auto',
                  zIndex: isFlipped ? 0 : 10,
                  transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out'
                }}
                className="absolute inset-0 rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#272622] via-[#1e1d1a] to-[#141311] border border-[#e7d9cf]/35 shadow-2xl flex flex-col justify-between overflow-hidden group"
              >
                {/* Holographic Watermark Pattern */}
                <div className="absolute -right-16 -top-16 w-56 h-56 bg-[#e7d9cf]/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#eeede9]/5 text-6xl sm:text-7xl font-black select-none pointer-events-none tracking-tighter uppercase">
                  T&A BACHATA
                </div>

                {/* Top Badge Info */}
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="px-2.5 py-1 rounded-xl bg-[#111111]/90 border border-[#e7d9cf]/40 shadow-md shrink-0 flex items-center justify-center">
                      <TALogo className="h-6 sm:h-7 w-auto" glow />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black tracking-wider text-xs sm:text-sm text-[#eeede9] uppercase truncate">TOMÁS & ASTRID</h4>
                      <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#e7d9cf] font-bold truncate">Credencial • Comunidad</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-[#56554e]/60 text-[#e7d9cf] border border-[#e7d9cf]/35 shrink-0 shadow-sm">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#e7d9cf] animate-ping" />
                    <span>{currentUser.role === 'admin' ? 'DIRECTOR ACTIVO' : 'ALUMNO ACTIVO'}</span>
                  </span>
                </div>

                {/* Middle Member Info */}
                <div className="relative z-10 flex items-center gap-3.5 sm:gap-4 my-auto">
                  <div className="relative shrink-0">
                    <img
                      src={currentUser.avatarUrl || DEFAULT_AVATAR_URL}
                      alt={currentUser.fullName}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#e7d9cf]/60 shadow-xl"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-[#e7d9cf] text-[#111111] p-1 rounded-lg shadow-md">
                      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-2xl font-black text-[#eeede9] truncate tracking-tight">{currentUser.fullName}</h2>
                    <p className="text-[11px] sm:text-xs text-[#e7d9cf] font-bold mt-0.5 truncate">{currentUser.level}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[#eeede9]/85 text-[11px] sm:text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] sm:text-[10px] uppercase text-[#e7d9cf]/80 font-bold">DNI:</span>
                        <span className="font-mono font-bold text-white">{currentUser.dni}</span>
                      </div>
                      <div className="hidden xs:block h-3 w-px bg-white/20" />
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] sm:text-[10px] uppercase text-[#e7d9cf]/80 font-bold">
                          {currentUser.role === 'admin' ? 'Director:' : 'Desde:'}
                        </span>
                        <span className="font-semibold text-white">{formatMemberSinceDate(currentUser)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className="relative z-10 flex items-center justify-between pt-2.5 sm:pt-3 border-t border-white/[0.1] text-xs">
                  <div>
                    <span className="text-[9px] sm:text-[10px] uppercase text-[#eeede9]/60 font-semibold block">
                      {currentUser.role === 'admin' ? 'Código Director' : 'Código Alumno'}
                    </span>
                    <span className="font-mono font-black text-[#e7d9cf] tracking-wider text-xs sm:text-sm">{currentUser.memberCode}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-[#eeede9] bg-[#111111]/85 px-3 py-1.5 rounded-xl border border-white/[0.08] shadow-sm">
                    <RefreshCw className="w-3 h-3 text-[#e7d9cf]" />
                    <span>Tocar para ver QR</span>
                  </div>
                </div>
              </div>

              {/* BACK SIDE (QR Code & Barcode) */}
              <div
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  opacity: isFlipped ? 1 : 0,
                  visibility: isFlipped ? 'visible' : 'hidden',
                  pointerEvents: isFlipped ? 'auto' : 'none',
                  zIndex: isFlipped ? 10 : 0,
                  transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out'
                }}
                className="absolute inset-0 rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#24231f] via-[#1c1b18] to-[#121110] border border-[#e7d9cf]/35 shadow-2xl flex flex-col justify-between items-center text-center overflow-hidden"
              >
                <div className="flex items-center justify-between w-full border-b border-white/[0.08] pb-2.5 text-[10px] sm:text-xs text-[#eeede9]/75">
                  <span className="font-black tracking-wider uppercase">CREDENCIAL QR</span>
                  <span className="text-[#e7d9cf] font-mono font-bold">{currentUser.memberCode}</span>
                </div>

                <div className="my-auto flex flex-col items-center">
                  <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-[#e7d9cf]/40 flex items-center justify-center">
                    <QRCodeRenderer
                      value={publicVerificationUrl}
                      size={128}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg"
                    />
                  </div>
                  <a
                    href={publicVerificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 text-[10px] sm:text-xs text-[#e7d9cf] hover:text-[#eeede9] font-bold flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] transition cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Ver credencial pública</span>
                  </a>
                </div>

                <div className="w-full pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] sm:text-xs">
                  <span className="text-[#eeede9]/60 font-medium">Válido para 2026</span>
                  <span className="text-[#e7d9cf] font-bold">Tomás & Astrid Bachata</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Action Buttons */}
          <div className="relative z-10 grid grid-cols-2 gap-3">
            <button
              onClick={handleCopyCode}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1e1d1b] hover:bg-[#282724] border border-white/[0.08] text-[#eeede9] font-bold text-xs sm:text-sm transition cursor-pointer shadow-sm"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#e7d9cf]" />}
              <span>{copiedCode ? '¡Código Copiado!' : 'Copiar N° Credencial'}</span>
            </button>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs sm:text-sm transition shadow-lg shadow-black/30 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>{isFlipped ? 'Ver Frente' : 'Girar Credencial'}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
