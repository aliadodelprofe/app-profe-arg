import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Instagram, Sparkles, Award, HeartHandshake, Check, Globe, Camera } from 'lucide-react';
import { TALogo } from './TALogo';
import { useAuth } from '../context/AuthContext';
import { EditCoverModal } from './EditCoverModal';
import tomasAstridImg from '../assets/images/tomas_astrid_directors_1785352326713.jpg';

export const TomasyAstridInfo: React.FC = () => {
  const { currentUser, siteConfig, updateSiteConfig } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);

  const currentCover = siteConfig?.directorsCoverImage || tomasAstridImg;
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-8 text-[#eeede9]">
      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden bg-[#161615] border border-white/[0.08] p-6 sm:p-10 shadow-2xl shadow-black/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-[#56554e]/30 text-[#e7d9cf] tracking-wider">
              <Sparkles className="w-4 h-4 text-[#e7d9cf]" />
              <span>DIRECTORES & CREADORES</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#eeede9] tracking-tight leading-tight uppercase">
              Tomás & Astrid
            </h2>

            <p className="text-sm text-[#eeede9]/80 leading-relaxed">
              Instructores y bailarines internacionales de Bachata Influence. Nuestra visión es que Bachata Influence llegue a todos los rincones del mundo, para que se convierta en un estilo más popular en los festivales de bachata
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="https://www.tomasyastrid.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-5 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition-all duration-200 shadow-lg shadow-black/30 flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Globe className="w-4 h-4 text-[#111111]" />
                <span>Página Web</span>
              </a>

              <a
                href="https://www.instagram.com/tomas_astrid_bachata/"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-5 rounded-full bg-[#111111]/80 hover:bg-white/[0.05] text-[#eeede9] border border-white/[0.08] font-bold text-xs transition-all duration-200 flex items-center gap-2 cursor-pointer"
              >
                <Instagram className="w-4 h-4 text-[#e7d9cf]" />
                <span>Instagram</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.12] aspect-[16/9] w-full group">
              <img
                src={currentCover}
                alt="Tomás y Astrid Bachata Influence"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              
              {isAdmin && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-[#111111]/90 hover:bg-[#111111] text-[#e7d9cf] border border-white/[0.15] text-xs font-extrabold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all group-hover:scale-105 cursor-pointer"
                  title="Cambiar Foto de Portada Directores"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cambiar Portada</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditCoverModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Portada - Directores"
        currentImage={currentCover}
        defaultImage={tomasAstridImg}
        onSave={async (newImg) => {
          await updateSiteConfig({ directorsCoverImage: newImg });
        }}
      />


      {/* Pillars Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[#161615] rounded-3xl border border-white/[0.06] shadow-xl shadow-black/30 space-y-3">
          <div className="w-12 h-12 bg-[#56554e]/20 text-[#e7d9cf] rounded-2xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-[#e7d9cf]" />
          </div>
          <h3 className="font-bold text-base text-[#eeede9]">Influence Academy</h3>
          <p className="text-xs text-[#eeede9]/70 leading-relaxed">
            Somos la única páreja de instructores certificados por Melvin & Gatica en Argentina. Adaptamos lo aprendido y creamos la formación para transmitir las bases y fundamentos del estilo.
          </p>
        </div>

        <div className="p-6 bg-[#161615] rounded-3xl border border-white/[0.06] shadow-xl shadow-black/30 space-y-3">
          <div className="w-12 h-12 bg-[#56554e]/20 text-[#e7d9cf] rounded-2xl flex items-center justify-center">
            <Award className="w-6 h-6 text-[#e7d9cf]" />
          </div>
          <h3 className="font-bold text-base text-[#eeede9]">Unica formación de Bachata Influence</h3>
          <p className="text-xs text-[#eeede9]/70 leading-relaxed">
            Primera y única formación en Argentina dedicada a entrenar bailarines en el estilo Bachata Influence.
          </p>
        </div>

        <div className="p-6 bg-[#161615] rounded-3xl border border-white/[0.06] shadow-xl shadow-black/30 space-y-3">
          <div className="w-12 h-12 bg-[#56554e]/20 text-[#e7d9cf] rounded-2xl flex items-center justify-center">
            <HeartHandshake className="w-6 h-6 text-[#e7d9cf]" />
          </div>
          <h3 className="font-bold text-base text-[#eeede9]">Comunidad</h3>
          <p className="text-xs text-[#eeede9]/70 leading-relaxed">
            Nuestra idea es crear un espacio especial para los alumnos, más allá del baile.
          </p>
        </div>
      </div>
    </div>
  );
};
