import React from 'react';
import { motion } from 'motion/react';
import { Home, MessageSquare, Tag, GraduationCap, Shirt, CircleDollarSign, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const FloatingBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, merchConfig, currentUser } = useAuth();
  const isDirector = currentUser?.role === 'admin';

  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'comunicaciones', label: 'Anuncios', icon: MessageSquare },
    { id: 'beneficios', label: 'Beneficios', icon: Tag },
    { id: 'formacion', label: 'Academy', icon: GraduationCap },
    { 
      id: 'merchandising', 
      label: isDirector ? 'Tienda' : 'Merch', 
      icon: isDirector ? Store : Shirt, 
      hasBadge: !isDirector && merchConfig?.enabled 
    },
    ...(!isDirector
      ? [{ id: 'pagos', label: 'Pagos', icon: CircleDollarSign }]
      : [])
  ];

  const activeIndex = navItems.findIndex(item => item.id === activeTab);
  const totalItems = navItems.length;

  return (
    <div className="fixed bottom-3 left-2 right-2 lg:hidden z-40 pointer-events-auto flex justify-center">
      <div className="relative w-full max-w-lg backdrop-blur-2xl bg-[#161615]/95 border border-white/[0.1] shadow-[0_12px_40px_rgba(0,0,0,0.85)] rounded-full p-1.5 flex items-center justify-between">
        {/* Animated Sliding Pill Indicator (Horizontal-only transform, immune to window scroll shifts) */}
        {activeIndex >= 0 && (
          <motion.div
            initial={false}
            animate={{
              x: `${activeIndex * 100}%`,
            }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 34,
              mass: 0.8,
            }}
            style={{
              width: `calc((100% - 12px) / ${totalItems})`,
            }}
            className="absolute top-1.5 bottom-1.5 left-1.5 bg-[#e7d9cf] rounded-full shadow-md shadow-black/30 pointer-events-none"
          />
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as any)}
              aria-label={item.label}
              title={item.label}
              className={`relative flex items-center justify-center flex-1 h-11 rounded-full transition-colors duration-200 cursor-pointer min-w-0 z-10 ${
                isActive
                  ? 'text-[#111111]'
                  : 'text-[#eeede9]/70 hover:text-[#eeede9]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className="w-5 h-5 shrink-0 transition-transform duration-150 active:scale-90" strokeWidth={isActive ? 2.5 : 2} />
                {item.hasBadge && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse absolute -top-1 -right-1 ring-2 ring-[#161615]" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
