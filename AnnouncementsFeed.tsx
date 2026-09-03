import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Pin, Heart, MessageSquare, Calendar, MapPin, Plus, Share2, Send, Flame, Sparkles, Edit2, Trash2, AlertTriangle, X, Save, Globe, ExternalLink, Gift, Copy, Check, ShieldCheck, Tag, MoreHorizontal, Maximize2, ChevronLeft, ChevronDown, Link2, Instagram, Eye, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Announcement, CategoryAnnouncement, Benefit, DEFAULT_AVATAR_URL } from '../types';
import { checkUserNivel1Completed } from '../utils/convocatoriaUtils';
import { ImageUploader } from './ImageUploader';
import { parseFormattedText } from '../utils/formatText';
import { formatRelativeTime } from '../utils/dateUtils';

interface AnnouncementsFeedProps {
  onOpenCreateModal?: () => void;
  hideHeader?: boolean;
}

export const AnnouncementsFeed: React.FC<AnnouncementsFeedProps> = ({ onOpenCreateModal, hideHeader = false }) => {
  const {
    announcements,
    benefits,
    usersList,
    toggleLikeAnnouncement,
    addComment,
    updateAnnouncement,
    deleteAnnouncement,
    currentUser,
    convocatorias,
    setShowAuthModal,
    announcementCategories,
    addAnnouncementCategory,
    editAnnouncementCategory,
    deleteAnnouncementCategory
  } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>('');

  // Single Post Instagram Modal & Deep Link State
  const [selectedSinglePost, setSelectedSinglePost] = useState<Announcement | null>(null);
  const [copiedLinkPostId, setCopiedLinkPostId] = useState<string | null>(null);
  const [postOptionsMenuId, setPostOptionsMenuId] = useState<string | null>(null);

  // Benefit Detail modal state for announced benefits
  const [selectedBenefitDetail, setSelectedBenefitDetail] = useState<Benefit | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Category Manager modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [editCatInputVal, setEditCatInputVal] = useState('');
  const [deletingCatName, setDeletingCatName] = useState<string | null>(null);

  // Director role check
  const isDirector = currentUser?.role === 'admin' || currentUser?.role === 'director';

  // Deletion confirmation state
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null);

  // Copy code state for announcements
  const [copiedAnnCodeId, setCopiedAnnCodeId] = useState<string | null>(null);

  // Likes details modal state
  const [viewLikesPost, setViewLikesPost] = useState<Announcement | null>(null);

  // Edit modal state
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<string>(announcementCategories.filter(c => c && c.toLowerCase() !== 'general')[0] || '');
  const [editContent, setEditContent] = useState('');
  const [editIsPinned, setEditIsPinned] = useState(true);

  const applyEditFormatting = (type: 'bold' | 'italic') => {
    const textarea = editTextareaRef.current;
    const wrapper = type === 'bold' ? '**' : '*';
    const defaultText = type === 'bold' ? 'texto en negrita' : 'texto en itálica';

    if (!textarea) {
      setEditContent(prev => prev + ` ${wrapper}${defaultText}${wrapper} `);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editContent.substring(start, end);

    let newText = '';
    let newCursorStart = start;
    let newCursorEnd = end;

    if (selectedText.length > 0) {
      const wrapped = `${wrapper}${selectedText}${wrapper}`;
      newText = editContent.substring(0, start) + wrapped + editContent.substring(end);
      newCursorStart = start + wrapper.length;
      newCursorEnd = end + wrapper.length;
    } else {
      const inserted = `${wrapper}${defaultText}${wrapper}`;
      newText = editContent.substring(0, start) + inserted + editContent.substring(end);
      newCursorStart = start + wrapper.length;
      newCursorEnd = start + wrapper.length + defaultText.length;
    }

    setEditContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };
  const [editEventDate, setEditEventDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editLocationUrl, setEditLocationUrl] = useState('');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('');
  const [editPromoCode, setEditPromoCode] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  const openEditModal = (post: Announcement) => {
    setEditingAnnouncement(post);
    setEditTitle(post.title);
    setEditCategory(post.category);
    setEditContent(post.content);
    setEditIsPinned(post.isPinned || false);
    setEditEventDate(post.eventDate || '');
    setEditLocation(post.location || '');
    setEditLocationUrl(post.locationUrl || '');
    setEditWebsiteUrl(post.websiteUrl || '');
    setEditPromoCode(post.promoCode || '');
    setEditImageUrl(post.imageUrl || '');
  };

  const getAnnouncementShareUrl = (postId: string) => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?announcementId=${postId}`;
  };

  const handleCopyPostLink = (post: Announcement) => {
    const shareUrl = getAnnouncementShareUrl(post.id);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopiedLinkPostId(post.id);
    setTimeout(() => setCopiedLinkPostId(null), 2500);
  };

  const handleCloseSinglePost = () => {
    setSelectedSinglePost(null);
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.delete('announcementId');
      url.searchParams.delete('anuncio');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const annId = params.get('announcementId') || params.get('anuncio');
    if (annId && announcements.length > 0) {
      const found = announcements.find(a => a.id === annId);
      if (found) {
        setSelectedSinglePost(found);
      }
      setTimeout(() => {
        const el = document.getElementById(`announcement-${annId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-[#e7d9cf]');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-[#e7d9cf]');
          }, 3500);
        }
      }, 300);
    }
  }, [announcements]);

  React.useEffect(() => {
    if (selectedSinglePost || selectedBenefitDetail || viewLikesPost) {
      const scrollY = window.scrollY || window.pageYOffset;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalLeft = document.body.style.left;
      const originalRight = document.body.style.right;
      const originalWidth = document.body.style.width;
      const originalOverflow = document.body.style.overflow;

      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.left = originalLeft;
        document.body.style.right = originalRight;
        document.body.style.width = originalWidth;
        document.body.style.overflow = originalOverflow;
        window.scrollTo(0, scrollY);
      };
    }
  }, [selectedSinglePost, selectedBenefitDetail, viewLikesPost]);

  const handleShareAnnouncementWhatsApp = (post: Announcement) => {
    const titleText = `📢 *${post.title.trim()}*`;

    const rawContent = post.content ? post.content.replace(/\*\*/g, '').replace(/[*#_`]/g, '').trim() : '';
    let snippet = '';
    if (rawContent) {
      const lines = rawContent.split('\n').map(l => l.trim()).filter(Boolean);
      const firstTwo = lines.slice(0, 2);
      snippet = firstTwo.join('\n');
      const hasMore = lines.length > 2 || rawContent.length > snippet.length;
      if (hasMore) {
        if (snippet.length > 160) {
          snippet = snippet.slice(0, 157) + '...';
        } else {
          snippet += '...';
        }
        snippet += '\n📝 _(sigue leyendo en la app)_';
      }
    }

    const deepLink = getAnnouncementShareUrl(post.id);
    const appLink = `🔗 *Ver en la App:* ${deepLink}`;

    const messageParts = [titleText];
    if (snippet) {
      messageParts.push(snippet);
    }
    messageParts.push(appLink);

    const message = messageParts.join('\n\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message).catch(() => {});
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleShareBenefitWhatsApp = (ben: Benefit) => {
    const titleText = `🎁 *${ben.title.trim()}*`;
    const discountText = `🏷️ *Descuento:* ${ben.discount ? ben.discount.trim() : 'Descuento Exclusivo'}`;

    const messageParts: string[] = [titleText, discountText];
    if (ben.provider && ben.provider.trim()) {
      messageParts.push(`📍 *Proveedor:* ${ben.provider.trim()}`);
    }
    const deepLink = `https://tabachata-academy.com?benefitId=${ben.id}`;
    messageParts.push(`🔗 *Ver beneficio en la App:* ${deepLink}`);

    const message = messageParts.join('\n\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message).catch(() => {});
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement || !editTitle.trim() || !editContent.trim()) return;

    updateAnnouncement(editingAnnouncement.id, {
      title: editTitle.trim(),
      category: editCategory as CategoryAnnouncement,
      content: editContent.trim(),
      isPinned: editIsPinned,
      eventDate: editEventDate.trim() || undefined,
      location: editLocation.trim() || undefined,
      locationUrl: editLocationUrl.trim() || undefined,
      websiteUrl: editWebsiteUrl.trim() || undefined,
      promoCode: editPromoCode.trim() || undefined,
      imageUrl: editImageUrl.trim() || undefined
    });

    setEditingAnnouncement(null);
  };

  const hasNivel1Completed = checkUserNivel1Completed(currentUser, convocatorias);
  const canAccessBenefits = isDirector || hasNivel1Completed;

  const isBenefitCategory = (categoryName?: string) => {
    if (!categoryName) return false;
    const cat = categoryName.toLowerCase().trim();
    return cat === 'beneficios' || cat === 'beneficio' || cat.includes('benefic');
  };

  const isBenefitAnnouncement = (ann: Announcement): boolean => {
    if (!ann) return false;
    if (isBenefitCategory(ann.category)) return true;
    const titleLower = (ann.title || '').toLowerCase().trim();
    if (titleLower.startsWith('🎁 nuevo beneficio') || titleLower.includes('beneficio')) return true;
    if ((benefits || []).some(b => {
      if (!b?.title || b.title.trim().length < 3) return false;
      const bTitle = b.title.trim().toLowerCase();
      return titleLower.includes(bTitle) || bTitle.includes(titleLower);
    })) return true;
    return false;
  };

  const visibleAnnouncements = announcements.filter(ann => {
    if (!canAccessBenefits && isBenefitAnnouncement(ann)) {
      return false;
    }
    return true;
  });

  const categoriesFromAnnouncements = visibleAnnouncements
    .map(a => a.category)
    .filter(c => c && c.toLowerCase() !== 'general');

  const rawCategories = Array.from(new Set<string>([
    'Todas',
    ...announcementCategories.filter(c => c && c.toLowerCase() !== 'general'),
    ...categoriesFromAnnouncements
  ]));

  const categories = rawCategories.filter(cat => {
    if (canAccessBenefits) return true;
    return !isBenefitCategory(cat);
  });

  const filteredAnnouncements = visibleAnnouncements
    .filter(ann => {
      let matchesCategory = false;
      if (selectedCategory === 'Todas') {
        matchesCategory = true;
      } else if (isBenefitCategory(selectedCategory)) {
        matchesCategory = isBenefitAnnouncement(ann) || isBenefitCategory(ann.category) || (ann.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase());
      } else {
        matchesCategory = Boolean(ann.category && ann.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase());
      }
      const matchesSearch = (ann.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (ann.content || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const getTs = (ann: Announcement) => {
        if ((ann as any).createdAt) return Number((ann as any).createdAt);
        if (ann.id && ann.id.startsWith('ann-')) {
          const ts = parseInt(ann.id.replace('ann-', ''), 10);
          if (!isNaN(ts)) return ts;
        }
        return 0;
      };

      return getTs(b) - getTs(a);
    });

  const handleCommentSubmit = (postId: string) => {
    if (!commentText.trim()) return;
    addComment(postId, commentText);
    setCommentText('');
  };

  return (
    <div className="space-y-6">
      {/* Title & Banner Header with Inicio Aesthetic */}
      {!hideHeader && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] p-6 sm:p-10 border border-white/[0.08] shadow-2xl shadow-black/50">
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-4 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-[#56554e]/40 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-[#e7d9cf]" />
                <span>COMUNICACIONES OFICIALES</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#eeede9] tracking-tight leading-tight uppercase">
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
                  onClick={onOpenCreateModal}
                  className="flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition-all duration-300 shadow-xl shadow-black/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer tracking-wider uppercase"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Comunicación</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & Category Pills */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#eeede9]/40 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar anuncios, fechas, clases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161615] border border-white/[0.08] focus:border-[#e7d9cf]/40 rounded-full pl-11 pr-4 py-2.5 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none transition-colors shadow-inner"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat, idx) => (
            <button
              key={`ann-cat-btn-${cat}-${idx}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'bg-[#161615] border border-white/[0.07] text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.04]'
              }`}
            >
              {cat}
            </button>
          ))}

          {isDirector && (
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-[#56554e]/30 border border-white/[0.08] text-[#e7d9cf] hover:bg-[#e7d9cf] hover:text-[#111111] transition-all duration-200 flex items-center gap-1 shrink-0 cursor-pointer"
              title="Gestionar Categorías de Anuncios"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Categorías</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Manager Modal for Directors */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#161615] border border-white/[0.1] rounded-3xl p-6 max-w-md w-full text-[#eeede9] space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-base font-bold text-[#eeede9]">Gestionar Categorías de Anuncios</h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="p-1.5 text-[#eeede9]/60 hover:text-[#eeede9] rounded-xl hover:bg-white/[0.05] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add category form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newCatInput.trim()) {
                    addAnnouncementCategory(newCatInput.trim());
                    setNewCatInput('');
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Nueva categoría..."
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="flex-1 bg-[#1c1c1a] border border-white/[0.08] rounded-full px-4 py-2 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]/40"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#e7d9cf] text-[#111111] font-bold text-xs rounded-full hover:bg-[#eeede9] transition shrink-0 cursor-pointer"
                >
                  Agregar
                </button>
              </form>

              {/* Existing categories list */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {announcementCategories.map((cat) => (
                  <div
                    key={`ann-cat-manage-${cat}`}
                    className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded-2xl border border-white/[0.06] text-xs"
                  >
                    {editingCatName === cat ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editCatInputVal}
                          onChange={(e) => setEditCatInputVal(e.target.value)}
                          className="w-full bg-[#111111] border border-[#e7d9cf] rounded-full px-3 py-1 text-xs text-[#eeede9]"
                        />
                        <button
                          onClick={() => {
                            if (editCatInputVal.trim()) {
                              editAnnouncementCategory(cat, editCatInputVal.trim());
                              setEditingCatName(null);
                            }
                          }}
                          className="px-3 py-1 bg-[#e7d9cf] text-[#111111] font-bold text-[11px] rounded-full"
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold text-[#eeede9]">{cat}</span>
                    )}

                    {editingCatName !== cat && (
                      <div className="flex items-center gap-1.5">
                        {deletingCatName === cat ? (
                          <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-full">
                            <span className="text-[10px] text-rose-200 font-medium">¿Eliminar?</span>
                            <button
                              onClick={() => {
                                deleteAnnouncementCategory(cat);
                                setDeletingCatName(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-full transition"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setDeletingCatName(null)}
                              className="px-2 py-0.5 bg-white/[0.1] hover:bg-white/[0.2] text-white text-[10px] rounded-full transition"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingCatName(cat);
                                setEditCatInputVal(cat);
                                setDeletingCatName(null);
                              }}
                              className="p-1.5 text-[#e7d9cf] hover:text-[#eeede9] hover:bg-white/[0.06] rounded-lg transition"
                              title="Editar categoría"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {announcementCategories.length > 1 && (
                              <button
                                onClick={() => setDeletingCatName(cat)}
                                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
                                title="Eliminar categoría"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feed List */}
      <div className="space-y-6">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 bg-[#161615] rounded-3xl border border-white/[0.08] p-8 shadow-xl shadow-black/30">
            <MessageSquare className="w-12 h-12 text-[#56554e] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#eeede9]">No se encontraron anuncios</h3>
            <p className="text-xs text-[#eeede9]/60 mt-1">Prueba cambiando la búsqueda o el filtro de categoría.</p>
          </div>
        ) : (
          filteredAnnouncements.map((post, postIdx) => {
            const hasLiked = currentUser ? post.likedBy.includes(currentUser.id) : false;
            const isCommentsOpen = activeCommentPostId === post.id;

            const authorAvatarUrl = (() => {
              if (post.authorAvatar) return post.authorAvatar;
              if (post.authorId && usersList) {
                const u = usersList.find(usr => usr.id === post.authorId);
                if (u?.avatarUrl) return u.avatarUrl;
              }
              if (post.authorName && usersList) {
                const u = usersList.find(usr => usr.fullName?.toLowerCase() === post.authorName.toLowerCase());
                if (u?.avatarUrl) return u.avatarUrl;
              }
              if (currentUser?.avatarUrl && (
                currentUser.fullName?.toLowerCase() === post.authorName?.toLowerCase() ||
                post.authorRole?.toLowerCase().includes('director') ||
                post.authorRole?.toLowerCase().includes('admin')
              )) {
                return currentUser.avatarUrl;
              }
              if (usersList) {
                const dirUser = usersList.find(u => (u.role === 'director' || u.role === 'admin') && u.avatarUrl);
                if (dirUser?.avatarUrl) return dirUser.avatarUrl;
              }
              return null;
            })();

            return (
              <motion.article
                id={`announcement-${post.id}`}
                key={`ann-post-${post.id}-${postIdx}`}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
                className={`relative bg-[#161615] rounded-3xl border border-white/[0.08] ${
                  post.isPinned
                    ? 'shadow-[0_0_30px_rgba(231,217,207,0.14)] hover:shadow-[0_0_40px_rgba(231,217,207,0.22)]'
                    : 'shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-black/60'
                } text-[#eeede9] overflow-hidden transition-all duration-300`}
              >

                {/* Instagram Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06] bg-[#161615]">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Author Avatar */}
                    <div className="w-10 h-10 rounded-2xl bg-[#1f1f1d] border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
                      {authorAvatarUrl ? (
                        <img
                          src={authorAvatarUrl}
                          alt={post.authorName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-extrabold text-[#e7d9cf] text-xs">
                          {post.authorName.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-[#eeede9] tracking-tight leading-none truncate">
                          {post.authorName}
                        </span>
                        {post.authorRole && (
                          <span className="text-[10px] font-bold text-[#e7d9cf] bg-[#e7d9cf]/10 px-2.5 py-0.5 rounded-full border border-white/[0.08] whitespace-nowrap shrink-0">
                            {post.authorRole}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[11px] text-[#eeede9]/60 font-medium whitespace-nowrap">
                          {formatRelativeTime(post.createdAt || post.date, post.id)}
                        </span>
                        <span className="text-[10px] font-bold text-[#e7d9cf] bg-white/[0.05] border border-white/[0.06] px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          {post.category}
                        </span>
                        {post.isPinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#e7d9cf] bg-[#e7d9cf]/10 border border-[#e7d9cf]/25 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                            <Pin className="w-3 h-3 text-[#e7d9cf]" />
                            <span>Fijado</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Right Options Menu */}
                  <div className="relative flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPostOptionsMenuId(postOptionsMenuId === post.id ? null : post.id)}
                      className="p-2 text-[#eeede9]/60 hover:text-[#eeede9] hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                      title="Opciones de publicación"
                      aria-label="Opciones de publicación"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {/* Dropdown Options */}
                    {postOptionsMenuId === post.id && (
                      <div className="absolute right-0 top-11 z-30 w-60 bg-[#1c1c1a] border border-white/[0.1] rounded-2xl shadow-2xl p-2 text-xs text-[#eeede9] space-y-1 backdrop-blur-md">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSinglePost(post);
                            setPostOptionsMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] text-[#eeede9] transition font-medium text-left cursor-pointer"
                        >
                          <Maximize2 className="w-4 h-4 text-[#e7d9cf]" />
                          <span>Ver Post en Pantalla Completa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleCopyPostLink(post);
                            setPostOptionsMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] text-[#eeede9] transition font-medium text-left cursor-pointer"
                        >
                          <Link2 className="w-4 h-4 text-[#e7d9cf]" />
                          <span>Copiar Enlace Directo (URL)</span>
                        </button>

                        {isDirector && (
                          <>
                            <div className="my-1 border-t border-white/[0.06]" />
                            <button
                              type="button"
                              onClick={() => {
                                openEditModal(post);
                                setPostOptionsMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.06] text-[#e7d9cf] transition font-medium text-left cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span>Editar Comunicación</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingAnnouncement(post);
                                setPostOptionsMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-950/40 text-rose-400 transition font-medium text-left cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Eliminar Comunicación</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Media Image Area (if present) */}
                {post.imageUrl && (
                  <div 
                    onClick={() => setSelectedSinglePost(post)}
                    className="relative w-full max-h-[480px] bg-black flex items-center justify-center overflow-hidden border-b border-white/[0.06] cursor-pointer group"
                    title="Clic para abrir anuncio completo"
                  >
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  </div>
                )}

                {/* Instagram Post Content / Caption */}
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Benefit check or regular title */}
                  {(() => {
                    const matchedBenefit = (benefits || []).find(b => {
                      if (!b || !b.title) return false;
                      const bTitleClean = b.title.trim().toLowerCase();
                      const pTitleClean = post.title.trim().toLowerCase();
                      if (bTitleClean.length < 3) return false;
                      return pTitleClean.includes(bTitleClean) || bTitleClean.includes(pTitleClean);
                    }) || null;

                    const isBenefit = Boolean(matchedBenefit) && (
                      isBenefitCategory(post.category) ||
                      isBenefitAnnouncement(post)
                    );

                    return (
                      <>
                        <div 
                          onClick={() => setSelectedSinglePost(post)}
                          className="flex flex-wrap items-start justify-between gap-2 cursor-pointer group/title"
                        >
                          <h3 className="text-base sm:text-lg font-extrabold text-[#eeede9] group-hover/title:text-[#e7d9cf] transition-colors leading-snug">
                            {post.title}
                          </h3>
                          {isBenefit && matchedBenefit && (
                            <span className="px-3 py-1 rounded-full bg-amber-400 text-[#111111] font-black text-xs shadow-md border border-amber-300 whitespace-nowrap shrink-0">
                              {matchedBenefit.discount || 'Descuento Exclusivo'}
                            </span>
                          )}
                        </div>

                        {/* Event Details Box */}
                        {(post.eventDate || post.location || post.locationUrl) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.06] text-xs">
                            {post.eventDate && (
                              <div className="flex items-center gap-2 text-[#e7d9cf]">
                                <Calendar className="w-4 h-4 shrink-0 text-[#e7d9cf]" />
                                <span className="font-semibold">{post.eventDate}</span>
                              </div>
                            )}
                            {(post.location || post.locationUrl) && (
                              <div className="flex items-center justify-between gap-2 text-[#eeede9]/80 min-w-0">
                                <div className="flex items-center gap-2 truncate min-w-0">
                                  <MapPin className="w-4 h-4 shrink-0 text-[#e7d9cf]" />
                                  <span className="truncate">{post.location || 'Ver Ubicación'}</span>
                                </div>
                                {(post.locationUrl || (post.location && post.location.startsWith('http'))) && (
                                  <a
                                    href={post.locationUrl || post.location}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 rounded-full bg-[#e7d9cf]/15 hover:bg-[#e7d9cf] text-[#e7d9cf] hover:text-[#111111] font-bold text-[11px] transition shrink-0 flex items-center gap-1 border border-white/[0.08]"
                                  >
                                    <span>Ver en Maps</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Promo Code Box */}
                        {post.promoCode && (
                          <div className="flex items-center justify-between gap-3 p-3.5 bg-[#e7d9cf]/10 border border-white/[0.08] rounded-2xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 bg-[#e7d9cf]/20 text-[#e7d9cf] rounded-xl shrink-0">
                                <Tag className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-[#e7d9cf]/70 block tracking-wider">Código Promocional</span>
                                <span className="text-xs font-mono font-bold text-[#eeede9] tracking-wide truncate block">{post.promoCode}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(post.promoCode || '');
                                setCopiedAnnCodeId(post.id);
                                setTimeout(() => setCopiedAnnCodeId(null), 2000);
                              }}
                              className="px-4 py-2 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-bold text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                            >
                              {copiedAnnCodeId === post.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-800" />
                                  <span>¡Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Website URL */}
                        {post.websiteUrl && (
                          <div>
                            <a
                              href={post.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-[#e7d9cf] text-[#e7d9cf] hover:text-[#111111] font-semibold text-xs transition border border-white/[0.08] shadow-sm"
                            >
                              <Globe className="w-4 h-4" />
                              <span>Visitar Sitio Web</span>
                              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                            </a>
                          </div>
                        )}

                        {/* Refined Luxury Action Button: Abrir Anuncio Completo */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedSinglePost(post)}
                            className="w-full py-3 px-4 rounded-2xl bg-[#161614] hover:bg-[#201f1c] text-[#e7d9cf] hover:text-[#eeede9] font-bold text-xs sm:text-[13px] border border-white/[0.08] hover:border-[#e7d9cf]/50 shadow-md hover:shadow-lg flex items-center justify-between transition-all duration-300 cursor-pointer group active:scale-[0.99] select-none"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-[#e7d9cf]/10 flex items-center justify-center text-[#e7d9cf] group-hover:bg-[#e7d9cf] group-hover:text-[#111111] transition-colors duration-300">
                                <Sparkles className="w-3.5 h-3.5" />
                              </div>
                              <span className="tracking-wide">Abrir anuncio completo</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[#e7d9cf]/80 group-hover:text-[#e7d9cf]">
                              <span className="text-[11px] font-semibold hidden sm:inline">Ver contenido</span>
                              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                            </div>
                          </button>
                        </div>

                        {/* Linked Benefit Action Button */}
                        {isBenefit && matchedBenefit && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBenefitDetail(matchedBenefit);
                                setCopiedCode(false);
                              }}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition shadow-lg border border-[#e7d9cf] active:scale-95 cursor-pointer"
                            >
                              <Gift className="w-4 h-4 text-[#111111]" />
                              <span>Ver Detalle del Beneficio</span>
                              <ExternalLink className="w-3.5 h-3.5 text-[#111111]" />
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Likes Summary Bar */}
                  {(() => {
                    const likerIds = post.likedBy || [];
                    if (likerIds.length === 0) return null;

                    const likerUsers = likerIds.map(id => {
                      const u = usersList?.find(usr => usr.id === id);
                      if (u) return u;
                      if (currentUser && currentUser.id === id) return currentUser;
                      return { id, fullName: 'Usuario', avatarUrl: '', role: 'Alumno' };
                    });

                    const firstUser = likerUsers[0];
                    const secondUser = likerUsers[1];
                    const countMore = likerUsers.length - 1;

                    let textNode: React.ReactNode = null;
                    if (likerUsers.length === 1) {
                      textNode = (
                        <span>Les gusta a <strong className="font-bold text-[#eeede9]">{firstUser.fullName}</strong></span>
                      );
                    } else if (likerUsers.length === 2) {
                      textNode = (
                        <span>Les gusta a <strong className="font-bold text-[#eeede9]">{firstUser.fullName}</strong> y <strong className="font-bold text-[#eeede9]">{secondUser.fullName}</strong></span>
                      );
                    } else {
                      textNode = (
                        <span>Les gusta a <strong className="font-bold text-[#eeede9]">{firstUser.fullName}</strong> y <strong className="font-bold text-[#e7d9cf] underline cursor-pointer">{countMore} personas más</strong></span>
                      );
                    }

                    return (
                      <div
                        onClick={() => setViewLikesPost(post)}
                        className="flex items-center gap-2 pt-2 text-xs text-[#eeede9]/80 cursor-pointer group hover:opacity-90 transition"
                        title="Ver quiénes dieron me gusta"
                      >
                        <div className="flex -space-x-2 overflow-hidden shrink-0">
                          {likerUsers.slice(0, 3).map((u, i) => (
                            <div key={`like-av-${u.id}-${i}`} className="w-5 h-5 rounded-full ring-2 ring-[#161615] overflow-hidden bg-[#222222] flex items-center justify-center text-[9px] font-bold text-[#e7d9cf]">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt={u.fullName} className="w-full h-full object-cover" />
                              ) : (
                                u.fullName.charAt(0)
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-[#eeede9]/80 group-hover:text-[#e7d9cf] transition truncate">
                          {textNode}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Instagram Action Icons Bar */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-white/[0.06] bg-[#161615] text-xs">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Heart Button */}
                    <button
                      type="button"
                      onClick={() => toggleLikeAnnouncement(post.id)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full transition active:scale-95 cursor-pointer ${
                        hasLiked
                          ? 'bg-rose-500/15 text-rose-400 font-extrabold border border-rose-500/30'
                          : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.06]'
                      }`}
                      title={hasLiked ? 'Quitar me gusta' : 'Dar me gusta'}
                    >
                      <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{post.likes > 0 ? post.likes : ''}</span>
                    </button>

                    {/* Comments Button */}
                    <button
                      type="button"
                      onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.06] transition cursor-pointer"
                      title="Comentarios"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments.length}</span>
                    </button>
                  </div>

                  {/* Share & Copy Link Buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Copy Direct Link */}
                    <button
                      type="button"
                      onClick={() => handleCopyPostLink(post)}
                      className="flex items-center gap-1 py-1.5 px-3 rounded-full text-[#eeede9]/70 hover:text-[#e7d9cf] hover:bg-white/[0.06] transition cursor-pointer"
                      title="Copiar enlace directo al anuncio"
                    >
                      {copiedLinkPostId === post.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-[11px] font-bold text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4" />
                          <span className="hidden sm:inline text-[11px]">Enlace</span>
                        </>
                      )}
                    </button>

                    {/* Expand Single Post Modal */}
                    <button
                      type="button"
                      onClick={() => setSelectedSinglePost(post)}
                      className="p-1.5 text-[#eeede9]/60 hover:text-[#eeede9] rounded-full hover:bg-white/[0.06] transition cursor-pointer"
                      title="Ver en pantalla completa"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Comments Expandable Section */}
                <AnimatePresence>
                  {isCommentsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 sm:px-5 pb-4 sm:pb-5 pt-4 border-t border-white/[0.06] bg-black/20 space-y-3"
                    >
                      <h4 className="text-xs font-bold text-[#eeede9]">Comentarios de la comunidad</h4>

                      {/* Comments List */}
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {post.comments.length === 0 ? (
                          <p className="text-xs text-[#eeede9]/50 italic">Sé el primero en comentar esta publicación.</p>
                        ) : (
                          post.comments.map((c, cIdx) => (
                            <div key={`c-${c.id}-${cIdx}`} className="p-3 bg-white/[0.03] rounded-2xl border border-white/[0.06] flex items-start gap-2.5">
                              <img
                                src={c.userAvatar || DEFAULT_AVATAR_URL}
                                alt={c.userName}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-lg object-cover border border-white/[0.08]"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-xs text-[#e7d9cf]">{c.userName}</span>
                                  <span className="text-[10px] text-[#eeede9]/50">{formatRelativeTime(c.createdAt, c.id)}</span>
                                </div>
                                <p className="text-xs text-[#eeede9]/80 mt-0.5">{c.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment Input */}
                      {currentUser ? (
                        <div className="flex items-end gap-2 pt-2">
                          <textarea
                            rows={1}
                            placeholder="Escribí un comentario..."
                            value={commentText}
                            onFocus={(e) => {
                              e.currentTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            }}
                            onChange={(e) => {
                              setCommentText(e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = `${Math.min(e.target.scrollHeight, 82)}px`;
                            }}
                            className="flex-1 bg-[#111111] border border-white/[0.08] rounded-2xl px-3.5 py-2 text-[16px] sm:text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]/40 resize-none min-h-[38px] max-h-[82px] leading-relaxed custom-scrollbar"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              handleCommentSubmit(post.id);
                              // Reset textarea height in DOM
                              const parent = e.currentTarget.parentElement;
                              const txt = parent?.querySelector('textarea');
                              if (txt) txt.style.height = 'auto';
                            }}
                            className="py-2.5 px-3.5 bg-[#e7d9cf] text-[#111111] rounded-2xl font-bold text-xs hover:bg-[#eeede9] transition shadow cursor-pointer shrink-0"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 bg-white/[0.03] rounded-2xl text-center text-xs text-[#eeede9]/70 border border-white/[0.06]">
                          <button
                            onClick={() => setShowAuthModal(true)}
                            className="text-[#e7d9cf] font-bold hover:underline"
                          >
                            Iniciá sesión
                          </button>{' '}
                          para dejar un comentario.
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingAnnouncement && (
          <motion.div
            key={`delete-ann-backdrop-${deletingAnnouncement.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              key={`delete-ann-content-${deletingAnnouncement.id}`}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#161616] border border-rose-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl text-[#eeede9] space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-[#56554e]/40 pb-3.5">
                <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#eeede9]">¿Eliminar comunicación?</h3>
                  <p className="text-xs text-rose-300 font-medium">Acción requerida de Director</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#eeede9]/90 leading-relaxed">
                ¿Estás seguro de que querés borrar permanentemente el anuncio{' '}
                <strong className="text-[#e7d9cf] font-bold">"{deletingAnnouncement.title}"</strong>?
              </p>

              <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-xs text-rose-200/90 leading-normal">
                ⚠️ <strong>Atención:</strong> Esta publicación se borrará inmediatamente de la base de datos y no se podrá recuperar.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#56554e]/30">
                <button
                  type="button"
                  onClick={() => setDeletingAnnouncement(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-[#eeede9] font-bold text-xs transition active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteAnnouncement(deletingAnnouncement.id);
                    setDeletingAnnouncement(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition flex items-center gap-2 shadow-lg active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Sí, Eliminar Anuncio</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Announcement Modal */}
      <AnimatePresence>
        {editingAnnouncement && (
          <motion.div
            key={`edit-ann-backdrop-${editingAnnouncement.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              key={`edit-ann-content-${editingAnnouncement.id}`}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative max-w-lg w-full max-h-[90vh] flex flex-col bg-[#111111] border border-[#e7d9cf]/40 rounded-3xl text-[#eeede9] shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#56554e]/40 p-4 sm:p-5 shrink-0 bg-[#111111]">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-[#e7d9cf] text-[#111111] rounded-xl font-bold shadow">
                    <Edit2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#eeede9]">Editar Comunicación</h3>
                    <p className="text-xs text-[#e7d9cf] font-medium">Panel de Directores</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingAnnouncement(null)}
                  className="p-2 text-[#eeede9]/60 hover:text-[#eeede9] rounded-xl hover:bg-[#56554e]/30 transition shrink-0"
                  title="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs">
                <div>
                  <label className="text-[#eeede9] font-semibold block mb-1">Título del Anuncio *</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[#eeede9] font-semibold block mb-1">Categoría</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                    >
                      {Array.from(new Set<string>(announcementCategories.filter(Boolean))).map((cat, idx) => (
                        <option key={`edit-ann-cat-${cat}-${idx}`} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[#eeede9] font-semibold block mb-1">Fecha Evento (Opcional)</label>
                    <input
                      type="text"
                      value={editEventDate}
                      onChange={(e) => setEditEventDate(e.target.value)}
                      className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9]"
                      placeholder="Ej: Sábado 20 de Agosto, 18 hs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[#eeede9] font-semibold block mb-1">Lugar / Sede (Opcional)</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9]"
                      placeholder="Ej: Palermo, CABA"
                    />
                  </div>
                  <div>
                    <label className="text-[#eeede9] font-semibold block mb-1">Link de Google Maps (Opcional)</label>
                    <input
                      type="url"
                      value={editLocationUrl}
                      onChange={(e) => setEditLocationUrl(e.target.value)}
                      className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9]"
                      placeholder="https://maps.app.goo.gl/..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[#eeede9] font-semibold block mb-1">Link a Página Web (Opcional)</label>
                  <input
                    type="url"
                    value={editWebsiteUrl}
                    onChange={(e) => setEditWebsiteUrl(e.target.value)}
                    className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9]"
                    placeholder="https://ejemplo.com/evento-o-inscripcion"
                  />
                </div>

                <div>
                  <label className="text-[#eeede9] font-semibold block mb-1">Código Promocional (Opcional)</label>
                  <input
                    type="text"
                    value={editPromoCode}
                    onChange={(e) => setEditPromoCode(e.target.value)}
                    className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-[#eeede9]"
                    placeholder="Ej: BACHATA20"
                  />
                </div>

                <ImageUploader
                  value={editImageUrl}
                  onChange={(val) => setEditImageUrl(val || '')}
                  label="Foto del Anuncio"
                  cropTitle="Encuadrar Imagen del Anuncio"
                  cropSubtitle="Ajustá y arrastrá la foto para que se vea perfecta en la publicación"
                />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#eeede9] font-semibold block">Contenido del Comunicado *</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyEditFormatting('bold')}
                        className="px-2.5 py-0.5 rounded-lg bg-[#56554e]/40 hover:bg-[#e7d9cf] text-[#eeede9] hover:text-[#111111] text-xs font-bold transition border border-[#56554e]/60 cursor-pointer"
                        title="Aplicar o insertar negrita (**texto**)"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditFormatting('italic')}
                        className="px-2.5 py-0.5 rounded-lg bg-[#56554e]/40 hover:bg-[#e7d9cf] text-[#eeede9] hover:text-[#111111] text-xs italic transition border border-[#56554e]/60 cursor-pointer"
                        title="Aplicar o insertar itálica (*texto*)"
                      >
                        I
                      </button>
                    </div>
                  </div>
                  <textarea
                    ref={editTextareaRef}
                    rows={7}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl p-3.5 text-[#eeede9] focus:outline-none focus:border-[#e7d9cf] min-h-[160px]"
                    placeholder="Escribí los detalles del comunicado..."
                    required
                  />
                  <span className="text-[11px] text-[#eeede9]/50 block mt-1">Tip: Seleccioná un texto y hacé clic en B o I para darle formato.</span>
                </div>

                <div className="flex items-center gap-2 p-3 bg-[#56554e]/20 rounded-xl border border-[#56554e]/40">
                  <input
                    type="checkbox"
                    id="editPinned"
                    checked={editIsPinned}
                    onChange={(e) => setEditIsPinned(e.target.checked)}
                    className="w-4 h-4 accent-[#e7d9cf] rounded"
                  />
                  <label htmlFor="editPinned" className="text-xs font-semibold text-[#eeede9] cursor-pointer flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-[#e7d9cf]" />
                    Fijar este comunicado arriba de todo
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#56554e]/40">
                  <button
                    type="button"
                    onClick={() => setEditingAnnouncement(null)}
                    className="px-4 py-2.5 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-[#eeede9] font-bold text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#e7d9cf] text-[#111111] font-bold text-xs hover:bg-[#eeede9] transition flex items-center gap-1.5 shadow"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Benefit Detail Modal for Announced Benefits */}
        {selectedBenefitDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-none"
            onClick={() => setSelectedBenefitDetail(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111111] border-2 border-[#e7d9cf]/40 rounded-3xl max-w-lg w-full text-[#eeede9] overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[92dvh] sm:max-h-[88dvh] min-h-0"
            >
              {/* Top Cover Image / Banner */}
              <div className="relative h-48 sm:h-56 bg-gradient-to-br from-[#1d1c1a] to-[#111111] overflow-hidden shrink-0">
                <img
                  src={selectedBenefitDetail.imageUrl}
                  alt={selectedBenefitDetail.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/40 to-transparent" />

                <button
                  onClick={() => setSelectedBenefitDetail(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition border border-white/20"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#111111]/80 backdrop-blur-md border border-[#e7d9cf]/40 text-[#e7d9cf] font-extrabold text-[10px] uppercase tracking-wider">
                    {selectedBenefitDetail.category || 'Beneficio Especial'}
                  </span>

                  <span className="px-3.5 py-1.5 rounded-2xl bg-amber-400 text-[#111111] font-black text-sm shadow-xl border border-amber-300">
                    {selectedBenefitDetail.discount}
                  </span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 pb-12 sm:pb-16 space-y-5 overflow-y-auto custom-scrollbar touch-pan-y flex-1 min-h-0">
                <div>
                  <span className="text-xs font-bold text-[#e7d9cf] block uppercase tracking-wide">
                    {selectedBenefitDetail.provider}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#eeede9] tracking-tight mt-0.5">
                    {selectedBenefitDetail.title}
                  </h2>
                </div>

                <div className="p-4 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/50 space-y-2 text-xs">
                  <span className="font-extrabold text-[#e7d9cf] block uppercase text-[10px]">
                    Descripción & Beneficio
                  </span>
                  <p className="text-[#eeede9]/90 leading-relaxed whitespace-pre-line">
                    {selectedBenefitDetail.description}
                  </p>
                </div>

                {/* Promo Code Copy Box */}
                {selectedBenefitDetail.promoCode && (
                  <div className="p-4 rounded-2xl bg-[#1d1c1a] border-2 border-[#e7d9cf]/50 space-y-2">
                    <span className="text-[10px] font-black uppercase text-[#e7d9cf] tracking-wider block">
                      Código Promocional / Descuento
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-[#111111] border border-[#56554e] rounded-xl p-2.5">
                      <span className="font-mono font-black text-sm sm:text-base text-[#e7d9cf] tracking-widest pl-1">
                        {selectedBenefitDetail.promoCode}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedBenefitDetail.promoCode);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#e7d9cf] text-[#111111] font-bold text-xs hover:bg-[#eeede9] transition flex items-center gap-1.5 shrink-0"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Instructions & Terms */}
                <div className="p-3.5 rounded-2xl bg-[#56554e]/10 border border-[#56554e]/30 text-xs space-y-1.5 text-[#eeede9]/80">
                  <span className="font-bold text-[#e7d9cf] flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-[#e7d9cf]" />
                    ¿Cómo canjear este beneficio?
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    {selectedBenefitDetail.terms || 'Presentá tu credencial digital o QR de alumno activo en la app al momento de pagar.'}
                  </p>
                </div>

                {/* Location / Website Links */}
                {(selectedBenefitDetail.location || selectedBenefitDetail.websiteUrl) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#56554e]/40">
                    {selectedBenefitDetail.location && (
                      <a
                        href={selectedBenefitDetail.locationUrl || `https://maps.google.com/?q=${encodeURIComponent(selectedBenefitDetail.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/60 text-[#eeede9] text-xs font-bold transition flex items-center gap-1.5 border border-[#56554e]/50"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#e7d9cf]" />
                        <span>Ver Ubicación</span>
                      </a>
                    )}
                    {selectedBenefitDetail.websiteUrl && (
                      <a
                        href={selectedBenefitDetail.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/60 text-[#eeede9] text-xs font-bold transition flex items-center gap-1.5 border border-[#56554e]/50"
                      >
                        <Globe className="w-3.5 h-3.5 text-[#e7d9cf]" />
                        <span>Visitar Web</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-[#111111] border-t border-[#56554e]/40 flex items-center justify-between gap-3 shrink-0">
                {isDirector && (
                  <button
                    type="button"
                    onClick={() => handleShareBenefitWhatsApp(selectedBenefitDetail)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold text-xs transition border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    title="Compartir beneficio por WhatsApp"
                  >
                    <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.76.459 3.474 1.33 4.986l-1.415 5.166 5.285-1.385a9.946 9.946 0 004.784 1.226h.005c5.507 0 9.99-4.478 9.99-9.985 0-2.668-1.039-5.176-2.926-7.062A9.923 9.923 0 0012.012 2zm0 1.666c4.587 0 8.324 3.737 8.325 8.318 0 2.226-.867 4.318-2.443 5.892a8.272 8.272 0 01-5.88 2.435h-.004a8.28 8.28 0 01-3.99-1.025l-.286-.17-2.964.776.79-2.887-.186-.297a8.285 8.285 0 01-1.27-4.295c0-4.581 3.738-8.318 8.325-8.318z"/>
                    </svg>
                    <span>Compartir por WhatsApp</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedBenefitDetail(null)}
                  className="px-6 py-2.5 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-extrabold text-xs transition shadow ml-auto"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Personas que dieron Me Gusta */}
      <AnimatePresence>
        {viewLikesPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1e1d1b] border border-[#56554e]/60 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#eeede9]">Me gusta</h3>
                    <p className="text-[11px] text-[#eeede9]/60">
                      {(() => {
                        const activePost = announcements.find(a => a.id === viewLikesPost.id) || viewLikesPost;
                        const count = activePost.likes;
                        return `${count} ${count === 1 ? 'persona' : 'personas'}`;
                      })()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewLikesPost(null)}
                  className="p-1.5 text-[#eeede9]/60 hover:text-[#eeede9] hover:bg-[#56554e]/30 rounded-xl transition cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(() => {
                  const activePost = announcements.find(a => a.id === viewLikesPost.id) || viewLikesPost;
                  const likerIds = activePost.likedBy || [];
                  if (likerIds.length === 0) {
                    return (
                      <p className="text-xs text-[#eeede9]/50 italic text-center py-6">
                        Aún nadie ha dado me gusta a esta publicación.
                      </p>
                    );
                  }

                  return likerIds.map((userId, uIdx) => {
                    const u = usersList?.find(usr => usr.id === userId) || (currentUser && currentUser.id === userId ? currentUser : null);
                    const name = u?.fullName || 'Usuario de la comunidad';
                    const isDirectorRole = u?.role === 'admin' || u?.role === 'director';
                    const roleLabel = isDirectorRole ? 'Director' : 'Alumno';
                    const avatar = u?.avatarUrl;

                    return (
                      <div key={`liker-item-${userId}-${uIdx}`} className="flex items-center justify-between p-2.5 bg-[#111111]/70 rounded-2xl border border-[#56554e]/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#56554e] overflow-hidden border border-[#e7d9cf]/30 shrink-0 flex items-center justify-center font-bold text-xs text-[#e7d9cf]">
                            {avatar ? (
                              <img src={avatar} alt={name} className="w-full h-full object-cover" />
                            ) : (
                              name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-[#eeede9] flex items-center gap-1.5 truncate">
                              <span className="truncate">{name}</span>
                              {currentUser?.id === userId && (
                                <span className="text-[10px] text-[#e7d9cf] font-bold bg-[#56554e]/60 px-1.5 py-0.2 rounded shrink-0">(Tú)</span>
                              )}
                            </p>
                            <span className="text-[10px] text-[#e7d9cf]/70 font-semibold">{roleLabel}</span>
                          </div>
                        </div>
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0 ml-2" />
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instagram Single Post Modal (Deep Link View) */}
      <AnimatePresence>
        {selectedSinglePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[130] w-full h-full bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto overscroll-none"
            onClick={handleCloseSinglePost}
          >
            {!canAccessBenefits && isBenefitAnnouncement(selectedSinglePost) ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md bg-[#161616] border border-[#e7d9cf]/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 text-[#eeede9] shadow-2xl relative z-[131] my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={handleCloseSinglePost}
                  className="absolute top-4 right-4 p-2 text-[#eeede9]/60 hover:text-[#eeede9] rounded-xl bg-[#222222]"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-16 h-16 rounded-3xl bg-[#56554e]/30 border border-[#e7d9cf]/40 flex items-center justify-center mx-auto text-[#e7d9cf] shadow-xl">
                  <ShieldCheck className="w-8 h-8 text-[#e7d9cf]" />
                </div>
                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Beneficio Exclusivo — Nivel 1 Requerido
                  </span>
                  <h3 className="text-xl font-black text-[#eeede9]">Acceso Restringido</h3>
                  <p className="text-xs text-[#eeede9]/80 leading-relaxed">
                    Esta publicación pertenece a la categoría de Beneficios y está disponible únicamente para los alumnos que hayan finalizado exitosamente el <strong className="text-[#e7d9cf]">Nivel 1</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseSinglePost}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-bold text-xs transition uppercase tracking-wider"
                >
                  Entendido
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="relative max-w-2xl w-full max-h-[92dvh] sm:max-h-[88dvh] bg-[#161616] border border-[#e7d9cf]/40 sm:border-2 sm:border-[#e7d9cf]/50 rounded-2xl sm:rounded-3xl text-[#eeede9] overflow-hidden shadow-2xl flex flex-col min-h-0 z-[131] my-auto"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Header Bar */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 bg-[#111111] border-b border-[#262626] shrink-0">
                <button
                  type="button"
                  onClick={handleCloseSinglePost}
                  className="px-3 py-1.5 rounded-xl bg-[#262626] hover:bg-[#333333] text-[#eeede9] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-[#e7d9cf]" />
                  <span>Volver</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyPostLink(selectedSinglePost)}
                    className="px-3 py-1.5 rounded-xl bg-[#262626] hover:bg-[#333333] text-[#e7d9cf] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Copiar enlace directo"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseSinglePost}
                    className="p-1.5 text-[#eeede9]/60 hover:text-[#eeede9] hover:bg-[#262626] rounded-xl transition cursor-pointer"
                    title="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto p-4 sm:p-6 pb-14 sm:pb-16 space-y-4 flex-1 min-h-0 custom-scrollbar touch-pan-y">
                {/* Author Header */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#222222] border border-[#333333] overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedSinglePost.authorAvatar ? (
                      <img src={selectedSinglePost.authorAvatar} alt={selectedSinglePost.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-extrabold text-[#e7d9cf] text-sm">
                        {selectedSinglePost.authorName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-[#eeede9]">{selectedSinglePost.authorName}</h3>
                      {selectedSinglePost.authorRole && (
                        <span className="text-[10px] font-bold text-[#e7d9cf] bg-[#e7d9cf]/15 px-2 py-0.5 rounded-md border border-[#e7d9cf]/25">
                          {selectedSinglePost.authorRole}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#eeede9]/60 pt-0.5">
                      <span>{formatRelativeTime(selectedSinglePost.createdAt || selectedSinglePost.date, selectedSinglePost.id)}</span>
                      <span>•</span>
                      <span className="text-[#e7d9cf] font-semibold">{selectedSinglePost.category}</span>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-lg sm:text-xl font-black text-[#eeede9] pt-1">
                  {selectedSinglePost.title}
                </h2>

                {/* Image */}
                {selectedSinglePost.imageUrl && (
                  <div className="relative w-full rounded-2xl overflow-hidden border border-[#333333] max-h-[450px] bg-black">
                    <img
                      src={selectedSinglePost.imageUrl}
                      alt={selectedSinglePost.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content text */}
                <div className="text-xs sm:text-sm text-[#eeede9]/90 leading-relaxed bg-[#111111] p-4 rounded-2xl border border-[#262626]">
                  {parseFormattedText(selectedSinglePost.content)}
                </div>

                {/* Event, Location, Website and Promo details */}
                {(selectedSinglePost.eventDate || selectedSinglePost.location || selectedSinglePost.locationUrl || selectedSinglePost.websiteUrl || selectedSinglePost.promoCode) && (
                  <div className="space-y-2.5">
                    {/* Event Date & Location Card */}
                    {(selectedSinglePost.eventDate || selectedSinglePost.location || selectedSinglePost.locationUrl) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 bg-[#111111] rounded-2xl border border-[#262626] text-xs">
                        {selectedSinglePost.eventDate && (
                          <div className="flex items-center gap-2.5 text-[#e7d9cf] min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-[#e7d9cf]/10 border border-[#e7d9cf]/20 flex items-center justify-center text-[#e7d9cf] shrink-0">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase font-bold text-[#e7d9cf]/70 block tracking-wider">Fecha / Horario</span>
                              <span className="font-bold text-[#eeede9] truncate block">{selectedSinglePost.eventDate}</span>
                            </div>
                          </div>
                        )}

                        {(selectedSinglePost.location || selectedSinglePost.locationUrl) && (
                          <div className="flex items-center justify-between gap-2 text-[#eeede9]/80 min-w-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-[#e7d9cf]/10 border border-[#e7d9cf]/20 flex items-center justify-center text-[#e7d9cf] shrink-0">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-[#e7d9cf]/70 block tracking-wider">Lugar</span>
                                <span className="font-semibold text-[#eeede9] truncate block">{selectedSinglePost.location || 'Ver Ubicación'}</span>
                              </div>
                            </div>

                            {(selectedSinglePost.locationUrl || (selectedSinglePost.location && selectedSinglePost.location.startsWith('http'))) && (
                              <a
                                href={selectedSinglePost.locationUrl || selectedSinglePost.location}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-full bg-[#e7d9cf]/15 hover:bg-[#e7d9cf] text-[#e7d9cf] hover:text-[#111111] font-bold text-[11px] transition shrink-0 flex items-center gap-1 border border-[#e7d9cf]/30 cursor-pointer shadow-sm active:scale-95"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Maps</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Website URL Button */}
                    {selectedSinglePost.websiteUrl && (
                      <div>
                        <a
                          href={selectedSinglePost.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-4 rounded-2xl bg-[#1a1917] hover:bg-[#252320] text-[#e7d9cf] hover:text-white border border-[#e7d9cf]/30 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
                        >
                          <Globe className="w-4 h-4 text-[#e7d9cf]" />
                          <span>Visitar Sitio Web Oficial</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#e7d9cf]/80" />
                        </a>
                      </div>
                    )}

                    {/* Promo Code Box */}
                    {selectedSinglePost.promoCode && (
                      <div className="flex items-center justify-between gap-3 p-3.5 bg-[#e7d9cf]/10 border border-[#e7d9cf]/30 rounded-2xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-[#e7d9cf]/20 text-[#e7d9cf] rounded-xl shrink-0">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-[#e7d9cf]/70 block tracking-wider">Código Promocional</span>
                            <span className="text-xs font-mono font-bold text-[#eeede9] tracking-wide truncate block">{selectedSinglePost.promoCode}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedSinglePost.promoCode || '');
                            setCopiedAnnCodeId(selectedSinglePost.id);
                            setTimeout(() => setCopiedAnnCodeId(null), 2000);
                          }}
                          className="px-4 py-2 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-bold text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                        >
                          {copiedAnnCodeId === selectedSinglePost.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-800" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Comments inside Single Post View */}
                <div className="pt-4 border-t border-[#262626] space-y-3 pb-2">
                  <h4 className="text-xs font-bold text-[#eeede9]">Comentarios ({selectedSinglePost.comments.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedSinglePost.comments.length === 0 ? (
                      <p className="text-xs text-[#eeede9]/50 italic">Sé el primero en comentar este anuncio.</p>
                    ) : (
                      selectedSinglePost.comments.map((c, cIdx) => (
                        <div key={`sp-c-${c.id}-${cIdx}`} className="p-3 bg-[#111111] rounded-2xl border border-[#262626] flex items-start gap-2.5">
                          <img src={c.userAvatar || DEFAULT_AVATAR_URL} alt={c.userName} className="w-7 h-7 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#e7d9cf]">{c.userName}</span>
                              <span className="text-[10px] text-[#eeede9]/50">{formatRelativeTime(c.createdAt, c.id)}</span>
                            </div>
                            <p className="text-[#eeede9]/80 mt-0.5">{c.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                    {currentUser ? (
                      <div className="flex items-end gap-2 pt-2 pb-2 mb-1">
                        <textarea
                          rows={1}
                          placeholder="Escribí un comentario..."
                          value={commentText}
                          onFocus={(e) => {
                            e.currentTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                          }}
                          onChange={(e) => {
                            setCommentText(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 82)}px`;
                          }}
                          className="flex-1 bg-[#111111] border border-[#333333] rounded-xl px-3.5 py-2 text-[16px] sm:text-xs text-[#eeede9] placeholder-[#56554e] focus:outline-none focus:border-[#e7d9cf] resize-none min-h-[38px] max-h-[82px] leading-relaxed custom-scrollbar"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            handleCommentSubmit(selectedSinglePost.id);
                            const parent = e.currentTarget.parentElement;
                            const txt = parent?.querySelector('textarea');
                            if (txt) txt.style.height = 'auto';
                          }}
                          className="py-2.5 px-3 bg-[#e7d9cf] text-[#111111] rounded-xl font-bold text-xs hover:bg-[#eeede9] transition shadow cursor-pointer shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Link Copied Notification */}
      <AnimatePresence>
        {copiedLinkPostId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[160] flex items-center gap-3 px-4 py-3 bg-[#111111] border-2 border-emerald-500 rounded-2xl shadow-2xl text-xs text-white"
          >
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-[#eeede9]">¡Enlace copiado al portapapeles!</p>
              <p className="text-[10px] text-[#eeede9]/70">Ya podés pegarlo en WhatsApp o redes para compartirlo.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
