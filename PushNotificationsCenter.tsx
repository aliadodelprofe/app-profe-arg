import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, BellOff, Send, Trash2, Smartphone, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PushNotificationsCenter: React.FC = () => {
  const {
    notifications,
    currentUser,
    togglePushNotifications,
    markNotificationAsRead,
    clearAllNotifications,
    sendPushBroadcast,
    setActiveTab,
    setShowAuthModal
  } = useAuth();

  const [testTitle, setTestTitle] = useState('🔥 ¡Hoy ensayamos Bachata Influence!');
  const [testBody, setTestBody] = useState('Recordatorio para la comunidad: Traer ropa cómoda e hidratación al estudio.');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleTriggerTest = () => {
    if (!testTitle.trim() || !testBody.trim()) return;
    sendPushBroadcast(testTitle, testBody, 'comunicaciones');
  };

  return (
    <div className="space-y-5 w-full">
      {/* Title & Push Toggle Card */}
      <div className="bg-gradient-to-b from-[#211f1b] to-[#161512] rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-[#e7d9cf]/25 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.85)] text-[#eeede9] relative overflow-hidden">
        {/* Ambient subtle light */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#56554e]/40 text-[#e7d9cf] border border-[#e7d9cf]/20">
                <Bell className="w-3 h-3 text-[#e7d9cf]" />
                <span>Alertas</span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#eeede9] tracking-tight">Centro de Notificaciones Push</h2>
            <p className="text-xs text-[#eeede9]/70 mt-0.5 max-w-lg leading-relaxed">
              Recibí alertas instantáneas de novedades, cambios de horario y promociones
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="shrink-0 pt-1 sm:pt-0">
            {currentUser ? (
              <button
                onClick={togglePushNotifications}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl font-black text-xs transition cursor-pointer shadow-md ${
                  currentUser.pushEnabled
                    ? 'bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] shadow-[0_4px_16px_rgba(231,217,207,0.3)]'
                    : 'bg-[#1c1b18] hover:bg-[#252420] text-[#eeede9]/75 shadow-sm'
                }`}
              >
                {currentUser.pushEnabled ? (
                  <>
                    <Smartphone className="w-4 h-4 text-[#111111] animate-pulse" />
                    <span>Notificaciones Activadas</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4 text-[#eeede9]/60" />
                    <span>Notificaciones Pausadas</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full sm:w-auto py-2.5 px-4 bg-[#e7d9cf] text-[#111111] rounded-xl text-xs font-black hover:bg-[#eeede9] transition shadow-md cursor-pointer"
              >
                Iniciar Sesión para Activar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin Test Push Notification Simulator */}
      {currentUser?.role === 'admin' && (
        <div className="bg-[#1c1b18] p-5 sm:p-6 rounded-[24px] sm:rounded-[26px] text-[#eeede9] space-y-4 shadow-[0_12px_30px_-6px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-2">
              <Send className="w-3.5 h-3.5" />
              <span>Simulador de Envío Push (Modo Director)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Título del anuncio push"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="bg-[#111111] rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] placeholder-[#eeede9]/40 outline-none transition shadow-inner focus:ring-1 focus:ring-[#e7d9cf]/40"
            />
            <input
              type="text"
              placeholder="Mensaje de la notificación"
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              className="bg-[#111111] rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] placeholder-[#eeede9]/40 outline-none transition shadow-inner focus:ring-1 focus:ring-[#e7d9cf]/40"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleTriggerTest}
              className="w-full sm:w-auto py-2.5 px-4 bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar Alerta Push a la Comunidad</span>
            </button>
          </div>
        </div>
      )}

      {/* Notifications List Controls */}
      <div className="flex items-center justify-between px-1 pt-2">
        <div className="flex flex-col gap-1">
          <h3 className="font-black text-sm sm:text-base text-[#eeede9] uppercase tracking-wide">
            Historial de Alertas
          </h3>
          {unreadCount > 0 && (
            <div>
              <span className="bg-[#e7d9cf] text-[#111111] text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm inline-flex items-center gap-1">
                <span>{unreadCount} sin leer</span>
              </span>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <button
            onClick={clearAllNotifications}
            className="text-xs text-[#eeede9]/60 hover:text-[#e7d9cf] flex items-center gap-1.5 transition cursor-pointer font-bold px-2.5 py-1 rounded-lg hover:bg-white/[0.04] self-center shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#eeede9]/60 hover:text-[#e7d9cf]" />
            <span>Limpiar Historial</span>
          </button>
        )}
      </div>

      {/* Notifications Feed - Full Width, Borderless Shadow Cards */}
      {notifications.length === 0 ? (
        <div className="text-center py-14 bg-[#141311] rounded-[26px] p-6 text-[#eeede9]/60 shadow-[0_12px_30px_-6px_rgba(0,0,0,0.7)] space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#1c1b18] shadow-inner flex items-center justify-center text-[#e7d9cf]/60">
            <Bell className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-[#eeede9]/70 pt-1">No tenés notificaciones pendientes.</p>
        </div>
      ) : (
        <div className="space-y-3.5 w-full">
          {notifications.map((notif, nIdx) => (
            <motion.div
              key={`notif-${notif.id}-${nIdx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: nIdx * 0.025 }}
              onClick={() => {
                markNotificationAsRead(notif.id);
                if (notif.linkTab) setActiveTab(notif.linkTab as any);
              }}
              className={`w-full p-4.5 sm:p-5 rounded-[22px] transition-all duration-200 cursor-pointer flex items-start gap-3.5 sm:gap-4 relative group ${
                notif.isRead
                  ? 'bg-[#151412] hover:bg-[#1a1916] text-[#eeede9]/65 shadow-[0_8px_22px_-6px_rgba(0,0,0,0.55)]'
                  : 'bg-[#1e1d19] hover:bg-[#24221d] text-[#eeede9] shadow-[0_14px_32px_-6px_rgba(0,0,0,0.75)]'
              }`}
            >
              {/* Content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-black text-xs sm:text-sm tracking-tight transition-colors ${
                      notif.isRead ? 'text-[#eeede9]/80 group-hover:text-[#eeede9]' : 'text-[#eeede9]'
                    }`}>
                      {notif.title}
                    </h4>
                    {!notif.isRead && (
                      <span className="inline-block w-2 h-2 rounded-full bg-[#e7d9cf] shadow-[0_0_8px_rgba(231,217,207,0.8)] shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-[#eeede9]/45 font-medium shrink-0">
                    {notif.timestamp}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${
                  notif.isRead ? 'text-[#eeede9]/65' : 'text-[#eeede9]/85 font-normal'
                }`}>
                  {notif.body}
                </p>
              </div>

              {/* Action arrow indicator */}
              <div className="shrink-0 self-center opacity-35 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#e7d9cf]">
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

