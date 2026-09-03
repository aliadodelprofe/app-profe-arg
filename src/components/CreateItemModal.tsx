import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Tag, Send, Pin, Plus, Image, Sparkles, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CategoryAnnouncement, CategoryBenefit } from '../types';
import { ImageUploader } from './ImageUploader';

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'announcement' | 'push';
}

export const CreateItemModal: React.FC<CreateItemModalProps> = ({ isOpen, onClose, defaultTab = 'announcement' }) => {
  const { addAnnouncement, sendPushBroadcast, currentUser, announcementCategories } = useAuth();
  const [activeType, setActiveType] = useState<'announcement' | 'push'>(defaultTab === 'push' ? 'push' : 'announcement');

  const annTextareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormatting = (type: 'bold' | 'italic') => {
    const textarea = annTextareaRef.current;
    const wrapper = type === 'bold' ? '**' : '*';
    const defaultText = type === 'bold' ? 'texto en negrita' : 'texto en itálica';

    if (!textarea) {
      setAnnContent(prev => prev + ` ${wrapper}${defaultText}${wrapper} `);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = annContent.substring(start, end);

    let newText = '';
    let newCursorStart = start;
    let newCursorEnd = end;

    if (selectedText.length > 0) {
      const wrapped = `${wrapper}${selectedText}${wrapper}`;
      newText = annContent.substring(0, start) + wrapped + annContent.substring(end);
      newCursorStart = start + wrapper.length;
      newCursorEnd = end + wrapper.length;
    } else {
      const inserted = `${wrapper}${defaultText}${wrapper}`;
      newText = annContent.substring(0, start) + inserted + annContent.substring(end);
      newCursorStart = start + wrapper.length;
      newCursorEnd = start + wrapper.length + defaultText.length;
    }

    setAnnContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annCategory, setAnnCategory] = useState<CategoryAnnouncement>(announcementCategories.filter(c => c && c.toLowerCase() !== 'general')[0] as any || '' as any);
  const [annContent, setAnnContent] = useState('');
  const [annEventDate, setAnnEventDate] = useState('');
  const [annLocation, setAnnLocation] = useState('');
  const [annLocationUrl, setAnnLocationUrl] = useState('');
  const [annWebsiteUrl, setAnnWebsiteUrl] = useState('');
  const [annPromoCode, setAnnPromoCode] = useState('');
  const [annPinned, setAnnPinned] = useState(true);
  const [annImageUrl, setAnnImageUrl] = useState<string | undefined>();

  // Push notification state
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');

  if (!isOpen) return null;

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    addAnnouncement({
      title: annTitle.trim(),
      category: annCategory,
      content: annContent.trim(),
      isPinned: annPinned,
      authorName: currentUser?.fullName || 'Tomás & Astrid',
      authorRole: 'Directores',
      authorAvatar: currentUser?.avatarUrl,
      authorId: currentUser?.id,
      eventDate: annEventDate.trim() || undefined,
      location: annLocation.trim() || undefined,
      locationUrl: annLocationUrl.trim() || undefined,
      websiteUrl: annWebsiteUrl.trim() || undefined,
      promoCode: annPromoCode.trim() || undefined,
      imageUrl: annImageUrl
    });

    onClose();
  };

  const handleSendPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;

    sendPushBroadcast(pushTitle.trim(), pushBody.trim(), 'comunicaciones');
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="create-item-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#111111]/80 backdrop-blur-md"
      >
        <motion.div
          key="create-item-content"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative max-w-lg w-full max-h-[90vh] flex flex-col bg-[#111111] border border-[#e7d9cf]/30 rounded-3xl text-[#eeede9] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#56554e]/40 p-4 sm:p-5 shrink-0 bg-[#111111]">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#e7d9cf] text-[#111111] rounded-xl font-bold shadow">
                <Plus className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[#eeede9]">Publicar para la Comunidad</h3>
                <p className="text-xs text-[#e7d9cf] font-medium">Panel de Directores (Tomás & Astrid)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#eeede9]/60 hover:text-[#eeede9] rounded-xl hover:bg-[#56554e]/30 transition shrink-0"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto space-y-4">

          {/* Tab Switcher */}
          <div className="flex gap-2 p-1 bg-[#56554e]/20 rounded-2xl border border-[#56554e]/40 mb-5 text-xs font-bold">
            <button
              onClick={() => setActiveType('announcement')}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeType === 'announcement'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow'
                  : 'text-[#eeede9]/60 hover:text-[#eeede9]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Anuncio</span>
            </button>

            <button
              onClick={() => setActiveType('push')}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeType === 'push'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow'
                  : 'text-[#eeede9]/60 hover:text-[#eeede9]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Alerta Push</span>
            </button>
          </div>

          {/* ANNOUNCEMENT FORM */}
          {activeType === 'announcement' && (
            <form onSubmit={handleCreateAnnouncement} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#eeede9] font-semibold block mb-1">Título del Anuncio *</label>
                <input
                  type="text"
                  placeholder="Ej: 🔥 Taller Intensivo de Bachata Influence"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] placeholder-[#56554e] focus:outline-none focus:border-[#e7d9cf]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#eeede9] font-semibold block mb-1">Categoría</label>
                  <select
                    value={annCategory}
                    onChange={(e) => setAnnCategory(e.target.value as any)}
                    className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                  >
                    {Array.from(new Set<string>(announcementCategories.filter(c => c && c.toLowerCase() !== 'general'))).map((cat, idx) => (
                      <option key={`create-ann-cat-${cat}-${idx}`} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#eeede9] font-semibold block mb-1">Fecha del Evento (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Sábado 20 de Agosto, 18 hs"
                    value={annEventDate}
                    onChange={(e) => setAnnEventDate(e.target.value)}
                    className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] placeholder-[#56554e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[#eeede9] font-semibold block mb-1">Lugar / Sede (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Scalabrini Ortiz 1240, Palermo"
                    value={annLocation}
                    onChange={(e) => setAnnLocation(e.target.value)}
                    className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] placeholder-[#56554e]"
                  />
                </div>
                <div>
                  <label className="text-[#eeede9] font-semibold block mb-1">Link de Google Maps (Opcional)</label>
                  <input
                    type="url"
                    placeholder="https://maps.app.goo.gl/..."
                    value={annLocationUrl}
                    onChange={(e) => setAnnLocationUrl(e.target.value)}
                    className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] placeholder-[#56554e]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#eeede9] font-semibold block mb-1">Link a Página Web (Opcional)</label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/evento-o-inscripcion"
                  value={annWebsiteUrl}
                  onChange={(e) => setAnnWebsiteUrl(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] placeholder-[#56554e]"
                />
              </div>

              <div>
                <label className="text-[#eeede9] font-semibold block mb-1">Código Promocional (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: BACHATA20"
                  value={annPromoCode}
                  onChange={(e) => setAnnPromoCode(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] placeholder-[#56554e]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#eeede9] font-semibold block">Contenido / Mensaje *</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyFormatting('bold')}
                      className="px-2.5 py-0.5 rounded-lg bg-[#56554e]/40 hover:bg-[#e7d9cf] text-[#eeede9] hover:text-[#111111] text-xs font-bold transition border border-[#56554e]/60 cursor-pointer"
                      title="Aplicar o insertar negrita (**texto**)"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('italic')}
                      className="px-2.5 py-0.5 rounded-lg bg-[#56554e]/40 hover:bg-[#e7d9cf] text-[#eeede9] hover:text-[#111111] text-xs italic transition border border-[#56554e]/60 cursor-pointer"
                      title="Aplicar o insertar itálica (*texto*)"
                    >
                      I
                    </button>
                  </div>
                </div>
                <textarea
                  ref={annTextareaRef}
                  rows={7}
                  placeholder="Escribí los detalles de la noticia para la comunidad..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] placeholder-[#56554e] focus:outline-none focus:border-[#e7d9cf] min-h-[160px]"
                  required
                />
                <span className="text-[11px] text-[#eeede9]/50 block mt-1">Tip: Seleccioná un texto y hacé clic en B o I para darle formato.</span>
              </div>

              <ImageUploader
                value={annImageUrl}
                onChange={setAnnImageUrl}
                label="Foto del Anuncio"
                cropTitle="Encuadrar Imagen del Anuncio"
                cropSubtitle="Ajustá y arrastrá la foto para que se vea perfecta en la publicación"
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={annPinned}
                  onChange={(e) => setAnnPinned(e.target.checked)}
                  className="accent-[#e7d9cf] w-4 h-4 rounded"
                />
                <label htmlFor="pinCheck" className="text-[#eeede9] cursor-pointer">
                  Fijar en la parte superior de la comunidad
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-bold rounded-xl transition shadow mt-2"
              >
                Publicar Anuncio
              </button>
            </form>
          )}

          {/* PUSH FORM */}
          {activeType === 'push' && (
            <form onSubmit={handleSendPush} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#eeede9] font-semibold block mb-1">Título de la Notificación *</label>
                <input
                  type="text"
                  placeholder="Ej: 🚨 Cambió la ubicación de la clase de hoy"
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] placeholder-[#56554e]"
                  required
                />
              </div>

              <div>
                <label className="text-[#eeede9] font-semibold block mb-1">Mensaje para los usuarios *</label>
                <textarea
                  rows={3}
                  placeholder="Recordatorio o aviso urgente para enviar a los celulares de la comunidad..."
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] placeholder-[#56554e]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-bold rounded-xl transition shadow mt-2 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Notificación Push Instantánea</span>
              </button>
            </form>
          )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
