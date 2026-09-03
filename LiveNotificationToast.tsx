import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LiveNotificationToast: React.FC = () => {
  const { liveToast, setLiveToast, setActiveTab, markNotificationAsRead } = useAuth();

  if (!liveToast) return null;

  const isString = typeof liveToast === 'string';
  const toastId = isString ? 'toast' : (liveToast.id || 'toast');
  const toastTitle = isString ? 'Notificación' : (liveToast.title || 'Notificación');
  const toastBody = isString ? liveToast : (liveToast.body || liveToast.message || '');
  const toastTimestamp = isString ? 'Ahora' : (liveToast.timestamp || 'Ahora');
  const toastLinkTab = isString ? undefined : liveToast.linkTab;

  const handleClick = () => {
    if (toastId) {
      markNotificationAsRead(toastId);
    }
    if (toastLinkTab) {
      setActiveTab(toastLinkTab as any);
    }
    setLiveToast(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-[#161513]/95 text-[#eeede9] p-4.5 rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] border border-[#e7d9cf]/40 backdrop-blur-xl cursor-pointer hover:border-[#e7d9cf]/70 transition-all group"
        onClick={handleClick}
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#22211e] border border-white/[0.08] flex items-center justify-center text-[#e7d9cf] shrink-0 mt-0.5 shadow-inner">
            <Bell className="w-5 h-5 text-[#e7d9cf] animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#e7d9cf] bg-[#56554e]/30 border border-white/[0.08] px-2 py-0.5 rounded-full">
                Notificación Push
              </span>
              <span className="text-[10px] text-[#eeede9]/50 font-medium">{toastTimestamp}</span>
            </div>
            <h4 className="font-black text-sm text-[#eeede9] truncate tracking-tight">{toastTitle}</h4>
            <p className="text-xs text-[#eeede9]/80 line-clamp-2 mt-0.5 leading-relaxed">{toastBody}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLiveToast(null);
            }}
            className="w-7 h-7 flex items-center justify-center text-[#eeede9]/50 hover:text-[#eeede9] rounded-lg hover:bg-white/[0.08] transition cursor-pointer"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-end text-xs font-bold text-[#e7d9cf] group-hover:text-[#eeede9] transition-colors">
          <span>Ver detalles</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

