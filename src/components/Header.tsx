import React from 'react';
import { ShieldCheck, Bell, Home, MessageSquare, Tag, LogIn, GraduationCap, Shirt, CircleDollarSign, QrCode, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_AVATAR_URL } from '../types';
import { TALogo } from './TALogo';

export const Header: React.FC = () => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    setShowPassModal,
    setShowAuthModal,
    setShowAdminFormationModal,
    notifications,
    merchConfig
  } = useAuth();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-40 bg-[#161615]/95 backdrop-blur-md border-b border-white/[0.06] shadow-xl shadow-black/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3 md:gap-6 lg:gap-8">
          
          {/* Logo & Brand */}
          <div
            onClick={() => setActiveTab('inicio')}
            className="flex items-center cursor-pointer group py-1 shrink-0"
            title="Ir a Inicio"
          >
            <TALogo className="h-11 sm:h-13 w-auto text-[#e7d9cf] hover:text-[#eeede9] transition-colors" glow />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#111111]/80 p-1.5 rounded-full border border-white/[0.06] shadow-inner mx-auto">
            <button
              type="button"
              onClick={() => setActiveTab('inicio')}
              className={`flex items-center gap-1.5 lg:gap-2 px-3.5 lg:px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'inicio'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05]'
              }`}
            >
              <Home className="w-4 h-4 text-inherit" />
              <span>Inicio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comunicaciones')}
              className={`flex items-center gap-1.5 lg:gap-2 px-3.5 lg:px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'comunicaciones'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05]'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-inherit" />
              <span>Anuncios</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('beneficios')}
              className={`flex items-center gap-1.5 lg:gap-2 px-3.5 lg:px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'beneficios'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05]'
              }`}
            >
              <Tag className="w-4 h-4 text-inherit" />
              <span>Beneficios</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('formacion')}
              className={`flex items-center gap-1.5 lg:gap-2 px-3.5 lg:px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'formacion'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05]'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-inherit" />
              <span>Academy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('merchandising')}
              className={`flex items-center gap-1.5 lg:gap-2 px-3.5 lg:px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 relative cursor-pointer ${
                activeTab === 'merchandising'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05]'
              }`}
            >
              {currentUser?.role === 'admin' ? (
                <>
                  <Store className="w-4 h-4 text-inherit" />
                  <span>Tienda</span>
                </>
              ) : (
                <>
                  <Shirt className="w-4 h-4 text-inherit" />
                  <span>Merch</span>
                  {merchConfig?.enabled && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse absolute top-1 right-1" title="Tanda Abierta" />
                  )}
                </>
              )}
            </button>

            {currentUser?.role !== 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('pagos')}
                className={`flex items-center gap-1.5 lg:gap-2 px-3.5 lg:px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'pagos'
                    ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                    : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05]'
                }`}
              >
                <CircleDollarSign className="w-4 h-4 text-inherit" />
                <span>Pagos</span>
              </button>
            )}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Admin Panel Trigger (for directors) */}
            {currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={() => setShowAdminFormationModal(true)}
                className="p-2.5 sm:py-2.5 sm:px-4 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs shadow-md shadow-black/30 transition-all duration-200 flex items-center gap-1.5 group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title="Panel de Administración"
                aria-label="Panel de Administración"
              >
                <ShieldCheck className="w-4 h-4 text-[#111111] group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Digital Credential Trigger */}
            <button
              type="button"
              onClick={() => setShowPassModal(true)}
              className="p-2.5 sm:py-2.5 sm:px-4 rounded-full bg-[#56554e]/30 hover:bg-[#56554e]/50 text-[#e7d9cf] border border-white/[0.08] font-bold text-xs shadow-md transition-all duration-200 flex items-center gap-1.5 sm:gap-2 group cursor-pointer"
              title="Credencial Digital (QR)"
              aria-label="Credencial Digital"
            >
              <QrCode className="w-4 h-4 text-[#e7d9cf] group-hover:scale-110 transition-transform shrink-0" />
              <span className="hidden sm:inline">Credencial Digital</span>
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setActiveTab('notificaciones')}
              className="relative p-2.5 rounded-full bg-[#111111]/80 border border-white/[0.08] text-[#eeede9] hover:text-[#e7d9cf] hover:bg-white/[0.05] transition-all duration-200 cursor-pointer"
              title="Notificaciones Push"
            >
              <Bell className="w-4.5 h-4.5 text-[#e7d9cf]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#e7d9cf] text-[#111111] text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#111111] shadow-md animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Profile Avatar or Login button */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2.5 p-1 sm:pr-3 rounded-full bg-[#111111]/80 border border-white/[0.08] hover:border-[#e7d9cf]/40 transition-all duration-200 group cursor-pointer"
                title="Mi Perfil"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[#e7d9cf]/40 shadow-sm bg-[#56554e]/20">
                  <img
                    src={currentUser.avatarUrl || DEFAULT_AVATAR_URL}
                    alt={currentUser.fullName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="hidden lg:block text-left">
                  <span className="block text-xs font-bold text-[#eeede9] leading-tight group-hover:text-[#e7d9cf] transition-colors">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                  <span className="block text-[10px] text-[#e7d9cf] uppercase font-bold tracking-wider">
                    {currentUser.role === 'admin' ? 'Director' : 'Alumno'}
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 py-2.5 px-4 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition-all duration-200 shadow-lg shadow-black/30 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Ingresar / Portal</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
