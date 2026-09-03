import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TALogo } from './TALogo';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ShieldCheck, Flame, ArrowRight, Instagram, Globe, Sparkles, UserCheck, Lock, Mail, Phone, User, CheckCircle2, QrCode, Tag, ArrowLeft, KeyRound, CheckCircle, MessageCircle } from 'lucide-react';

export const CommunityPortalScreen: React.FC = () => {
  const { login } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Password Reset flow state
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatusMsg, setResetStatusMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email) {
      setErrorMsg('Por favor ingresá tu correo electrónico.');
      return;
    }
    // Blur inputs on submit so mobile keyboard closes and viewport zoom restores
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const res = login(email, password);
    if (!res.success) {
      setErrorMsg(res.error || 'No fue posible iniciar sesión.');
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatusMsg('');
    setResetErrorMsg('');
    if (!resetEmail.trim()) {
      setResetErrorMsg('Por favor ingresá tu correo electrónico.');
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetStatusMsg(`¡Listo! Te enviamos un correo a ${resetEmail.trim()} con el enlace para restablecer tu contraseña. Revisa tu casilla de entrada o carpeta de spam.`);
    } catch (err: any) {
      console.warn('Reset password error:', err);
      if (err.code === 'auth/user-not-found') {
        setResetErrorMsg('No se encontró ningún alumno registrado con este correo electrónico.');
      } else if (err.code === 'auth/invalid-email') {
        setResetErrorMsg('El correo electrónico no es válido.');
      } else {
        setResetStatusMsg(`¡Listo! Si el correo ${resetEmail.trim()} está registrado, recibirás un mensaje para restablecer tu contraseña. Revisa tu casilla o carpeta de spam.`);
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#eeede9] flex flex-col justify-between font-sans relative overflow-hidden selection:bg-[#e7d9cf] selection:text-[#111111]">
      {/* Background Ambient Glow (Only at Top) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-[#e7d9cf]/10 via-[#56554e]/15 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full border-b border-white/[0.06] bg-[#111111]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <a
            href="https://www.tomasyastrid.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 group"
          >
            <div className="px-2.5 py-1.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] shadow-md group-hover:border-[#e7d9cf]/40 transition flex items-center justify-center">
              <TALogo className="h-8 w-auto" glow />
            </div>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="https://www.instagram.com/tomas_astrid_bachata/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#eeede9] hover:text-[#e7d9cf] text-xs font-semibold transition flex items-center gap-2"
            >
              <Instagram className="w-4 h-4 text-[#e7d9cf]" />
              <span className="hidden sm:inline">@tomas_astrid_bachata</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full">
          
          {/* Left Hero Pitch Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black bg-white/[0.05] text-[#e7d9cf] border border-white/[0.1] backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-[#e7d9cf] animate-pulse" />
              <span>COMUNIDAD EXCLUSIVA DE BACHATA INFLUENCE</span>
            </div>

            <div className="space-y-1.5">
              <h1 className="leading-none uppercase">
                <span className="block text-sm sm:text-base md:text-xl lg:text-lg xl:text-2xl font-black tracking-wider text-[#eeede9] mb-1.5">
                  Bienvenido a la Comunidad de
                </span>
                <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-3xl xl:text-5xl font-black text-[#e7d9cf] tracking-tight">
                  TA Bachata Academy
                </span>
              </h1>
              <p className="text-sm sm:text-base text-[#eeede9]/80 max-w-xl mx-auto lg:mx-0 leading-relaxed pt-2">
                Tu portal de acceso para ingresar a nuestras formaciones, consultar tu <strong className="text-[#e7d9cf] font-semibold">Credencial Digital QR</strong>, obtener descuentos, beneficios y recibir anuncios importantes.
              </p>
            </div>

            {/* Feature Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 text-left">
              <div className="p-4 rounded-2xl bg-[#181816] border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.25)] space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[#e7d9cf] flex items-center justify-center mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-xs text-[#eeede9]">Credencial Digital QR</h4>
                <p className="text-[11px] text-[#eeede9]/70 leading-tight">Carnet digital para identificarte dentro de la comunidad y disfrutar los beneficios</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#181816] border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.25)] space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[#e7d9cf] flex items-center justify-center mb-2">
                  <Tag className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-xs text-[#eeede9]">Beneficios & Descuentos</h4>
                <p className="text-[11px] text-[#eeede9]/70 leading-tight">Descuentos en calzado, indumentaria, servicios y más</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#181816] border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.25)] space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[#e7d9cf] flex items-center justify-center mb-2">
                  <Flame className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-xs text-[#eeede9]">Anuncios Oficiales</h4>
                <p className="text-[11px] text-[#eeede9]/70 leading-tight">Información directa de Tomás & Astrid sobre talleres, workshops y más</p>
              </div>
            </div>
          </div>

          {/* Right Login / Register Card Column */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-[#181816] rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md relative space-y-5">
              
              {/* Brand Monogram Badge Header */}
              <div className="flex items-center justify-center">
                <div className="px-3.5 py-2 rounded-2xl bg-white/[0.05] border border-white/[0.08] shadow-md flex items-center justify-center">
                  <TALogo className="h-9 w-auto" glow />
                </div>
              </div>

              {!isResetMode ? (
                <>
                  {/* Title & Closed Community Notice */}
                  <div className="text-center space-y-1">
                    <h3 className="font-extrabold text-lg text-[#eeede9] tracking-tight uppercase">
                      Acceso a la Comunidad
                    </h3>
                    <p className="text-xs text-[#e7d9cf] font-medium leading-relaxed">
                      Ingreso exclusivo para alumnos de TA Bachata Academy
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 text-center font-medium">
                      {errorMsg}
                    </div>
                  )}

                  {/* LOGIN FORM */}
                  <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-[#eeede9] mb-1.5">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#e7d9cf]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ejemplo@email.com"
                          required
                          className="w-full bg-[#111111] border border-white/[0.1] focus:border-[#e7d9cf] focus:ring-1 focus:ring-[#e7d9cf]/40 rounded-xl pl-10 pr-4 py-3 text-base text-[#eeede9] placeholder-[#eeede9]/30 transition outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-[#eeede9]">
                          Contraseña
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsResetMode(true);
                            setResetEmail(email);
                            setResetStatusMsg('');
                            setResetErrorMsg('');
                          }}
                          className="text-[11px] font-semibold text-[#e7d9cf] hover:text-[#eeede9] underline transition"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#e7d9cf]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full bg-[#111111] border border-white/[0.1] focus:border-[#e7d9cf] focus:ring-1 focus:ring-[#e7d9cf]/40 rounded-xl pl-10 pr-4 py-3 text-base text-[#eeede9] placeholder-[#eeede9]/30 transition outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-[#eeede9]/50 block mt-1.5">
                        Ingresá con tu contraseña o clave temporal provista por los profesores
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e7d9cf] to-[#d8c3b5] hover:brightness-105 text-[#111111] font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Iniciar Sesión</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* FORGOT PASSWORD FORM */}
                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-[#e7d9cf] mb-1">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold text-lg text-[#eeede9] tracking-tight uppercase">
                      Recuperar Contraseña
                    </h3>
                    <p className="text-xs text-[#e7d9cf]/90 font-medium leading-relaxed max-w-xs mx-auto">
                      Ingresá tu correo electrónico y te enviaremos un enlace oficial para restablecer tu contraseña.
                    </p>
                  </div>

                  {resetStatusMsg && (
                    <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 text-center font-medium leading-relaxed flex flex-col items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{resetStatusMsg}</span>
                    </div>
                  )}

                  {resetErrorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 text-center font-medium">
                      {resetErrorMsg}
                    </div>
                  )}

                  {!resetStatusMsg && (
                    <form onSubmit={handleSendResetEmail} className="space-y-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-[#eeede9] mb-1.5">
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-[#e7d9cf]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="ejemplo@email.com"
                            required
                            className="w-full bg-[#111111] border border-white/[0.1] focus:border-[#e7d9cf] focus:ring-1 focus:ring-[#e7d9cf]/40 rounded-xl pl-10 pr-4 py-3 text-base text-[#eeede9] placeholder-[#eeede9]/30 transition outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingReset}
                        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e7d9cf] to-[#d8c3b5] hover:brightness-105 text-[#111111] font-black text-sm transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSendingReset ? (
                          <span>Enviando correo...</span>
                        ) : (
                          <>
                            <span>Enviar enlace de recuperación</span>
                            <Mail className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setResetStatusMsg('');
                        setResetErrorMsg('');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#eeede9]/80 hover:text-[#e7d9cf] transition cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Volver al inicio de sesión</span>
                    </button>
                  </div>
                </>
              )}

              {/* CLOSED COMMUNITY INFO BOX */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-left space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#e7d9cf]">
                  <ShieldCheck className="w-4 h-4 text-[#e7d9cf]" />
                  <span>Comunidad Cerrada</span>
                </div>
                <p className="text-[11px] text-[#eeede9]/70 leading-normal">
                  Al iniciar la formación de Tomás & Astrid, se te creará un usuario para poder ingresar a la comunidad, hacer tu formación y seguir creciendo en la comunidad
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer with Organic Top Wave & Warm Tone (matching Main App Footer) */}
      <footer className="w-full relative bg-gradient-to-b from-[#191815] via-[#1e1d1a] to-[#24231f] text-[#eeede9]/70 text-xs overflow-hidden mt-auto">
        {/* Organic Wave / Curved Divider connecting smoothly from #111111 into Footer */}
        <div className="w-full overflow-hidden leading-none -mt-1 pointer-events-none select-none">
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 sm:pb-10 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1.5 rounded-2xl bg-[#56554e]/30 flex items-center justify-center">
              <TALogo className="h-6 w-auto" glow variant="footer" />
            </div>
            <div>
              <span className="font-black text-[#eeede9] block text-sm tracking-wider uppercase">TA Bachata Academy</span>
              <span className="text-[11px] text-[#eeede9]/60">Comunidad Oficial • Argentina</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-x-3 sm:gap-y-2 text-[#eeede9]/80 font-medium text-xs sm:text-sm">
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
              href="https://wa.me/5491170608171"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#e7d9cf] flex items-center gap-1.5 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </a>
          </div>

          <p className="text-[#eeede9]/50 text-[11px] text-center md:text-right">
            © {new Date().getFullYear()} TA Bachata Academy. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};
