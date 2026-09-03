import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LogoutConfirmModal: React.FC = () => {
  const { showLogoutConfirmModal, setShowLogoutConfirmModal, confirmLogout } = useAuth();

  if (!showLogoutConfirmModal) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={() => setShowLogoutConfirmModal(false)}
    >
      <div 
        className="bg-[#111111] border border-[#e7d9cf]/40 rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-5 shadow-2xl relative text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon Header */}
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg">
          <LogOut className="w-7 h-7 text-rose-400" />
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h3 className="text-xl font-black text-[#eeede9] uppercase tracking-tight">
            ¿Cerrar Sesión?
          </h3>
          <p className="text-xs text-[#e7d9cf]/80 leading-relaxed">
            Vas a salir de tu cuenta en <strong className="text-[#e7d9cf]">TA Bachata Academy</strong>. Vas a necesitar volver a ingresar tus credenciales para acceder.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#56554e]/40">
          <button
            type="button"
            onClick={() => setShowLogoutConfirmModal(false)}
            className="py-2.5 px-3 rounded-2xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-[#eeede9] font-bold text-xs border border-[#56554e]/60 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmLogout}
            className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sí, Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
