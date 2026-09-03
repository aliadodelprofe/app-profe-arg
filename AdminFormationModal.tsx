import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, GraduationCap, CheckCircle2, UserCheck, Video, ExternalLink, Save, Plus, PlusCircle, Edit2, Edit3, Search, Award, Calendar, Trash2, Layers, Clock, Sparkles, DollarSign, CreditCard, Gift, Tag, AlertCircle, Image, MapPin, Megaphone, MessageSquare, ShieldCheck, Crown, UserPlus, UserMinus, ShieldAlert, UserX, Users, Pause, Play, ChevronDown, Copy, ArrowLeft, Eye, EyeOff, Shirt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConvocatoriaStatus, Convocatoria, PaymentMethod, Benefit, DanceRole, EnrollmentType, DEFAULT_AVATAR_URL } from '../types';
import { formatClassDate, getComputedFormacionStatus, normalizeText, sortConvocatoriasNewestFirst } from '../utils/convocatoriaUtils';
import { AdminStudentsSection } from './AdminStudentsModal';
import { ImageUploader } from './ImageUploader';
import { VideoUploader } from './VideoUploader';
import { VideoPlayerModal } from './VideoPlayerModal';

interface AdminFormationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminFormationModal: React.FC<AdminFormationModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    usersList,
    formationConfigs,
    convocatorias,
    paymentMethods,
    benefits,
    addBenefit,
    updateBenefit,
    deleteBenefit,
    benefitCategories,
    addBenefitCategory,
    editBenefitCategory,
    deleteBenefitCategory,
    announcements,
    addAnnouncement,
    announcementCategories,
    addAnnouncementCategory,
    editAnnouncementCategory,
    deleteAnnouncementCategory,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    addConvocatoria,
    updateConvocatoria,
    deleteConvocatoria,
    toggleStudentConvocatoriaAttendance,
    toggleStudentConvocatoriaPause,
    assignStudentToConvocatoria,
    updateStudentConvocatoriaRole,
    updateStudentConvocatoriaEnrollmentType,
    updateStudentConvocatoriaPartner,
    removeStudentFromConvocatoria,
    updateConvocatoriaActiveClassNumber,
    updateConvocatoriaClassDates,
    updateFormationRecap,
    createRecapVersion,
    duplicateRecapVersion,
    updateRecapVersionDetails,
    deleteRecapVersion,
    updateVersionRecap,
    setActiveRecapVersionForLevel,
    updateStudentGraduation,
    updateStudentByAdmin,
    createStudentByAdmin,
    regularClasses,
    addRegularClass,
    updateRegularClass,
    deleteRegularClass,
    assignStudentToRegularClass,
    updateStudentRegularClassRole,
    removeStudentFromRegularClass,
    addRegularClassRecap,
    updateRegularClassRecap,
    deleteRegularClassRecap,
    updateRegularClassRecaps,
    setLiveToast
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'convocatorias' | 'regulares' | 'paymentMethods' | 'alumnos' | 'recaps' | 'benefits' | 'announcements' | 'directores'>('convocatorias');
  const [convSubTab, setConvSubTab] = useState<'lista' | 'asignacion'>('lista');
  const [regSubTab, setRegSubTab] = useState<'lista' | 'asignacion'>('lista');
  const [recapCategory, setRecapCategory] = useState<'formaciones' | 'regulares'>('formaciones');
  const [selectedRegClassForRecapId, setSelectedRegClassForRecapId] = useState<string>('');

  // Regular Class Recap Modal / Form states
  const [showAddRegRecapModal, setShowAddRegRecapModal] = useState(false);
  const [newRegRecapTitle, setNewRegRecapTitle] = useState('');
  const [newRegRecapDate, setNewRegRecapDate] = useState('');
  const [newRegRecapDesc, setNewRegRecapDesc] = useState('');
  const [newRegRecapUrl, setNewRegRecapUrl] = useState('');

  // Editing existing regular class recap
  const [editingRegRecapId, setEditingRegRecapId] = useState<string | null>(null);
  const [editRegRecapTitle, setEditRegRecapTitle] = useState('');
  const [editRegRecapDate, setEditRegRecapDate] = useState('');
  const [editRegRecapDesc, setEditRegRecapDesc] = useState('');
  const [editRegRecapUrl, setEditRegRecapUrl] = useState('');

  // Deleting regular class recap confirmation
  const [deletingRegRecapId, setDeletingRegRecapId] = useState<string | null>(null);

  // In-App Video Player State for Admin Modal
  const [activeVideoPlayer, setActiveVideoPlayer] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    description?: string;
  } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedConvocatoriaId, setSelectedConvocatoriaId] = useState<string>(convocatorias[0]?.id || '');
  const [selectedLevelId, setSelectedLevelId] = useState<'nivel-1' | 'nivel-2'>('nivel-1');
  const [searchQuery, setSearchQuery] = useState('');

  // Announcement Categories Local State
  const [annCatNewName, setAnnCatNewName] = useState('');
  const [annCatEditOldName, setAnnCatEditOldName] = useState<string | null>(null);
  const [annCatEditNewName, setAnnCatEditNewName] = useState('');

  // Directors Management Local State
  const [dirSearchQuery, setDirSearchQuery] = useState('');
  const [selectedStudentToPromote, setSelectedStudentToPromote] = useState('');
  const [promotionTitle, setPromotionTitle] = useState('Director & Instructor - Bachata Influence');
  const [showPromotePanel, setShowPromotePanel] = useState(false);
  const [showCreateDirPanel, setShowCreateDirPanel] = useState(false);
  const [newDirFullName, setNewDirFullName] = useState('');
  const [newDirEmail, setNewDirEmail] = useState('');
  const [newDirTitle, setNewDirTitle] = useState('Director & Instructor - Bachata Influence');
  const [newDirDni, setNewDirDni] = useState('');
  const [newDirPhone, setNewDirPhone] = useState('');
  
  // Inline edit director state
  const [editingDirectorId, setEditingDirectorId] = useState<string | null>(null);
  const [editDirFullName, setEditDirFullName] = useState('');
  const [editDirEmail, setEditDirEmail] = useState('');
  const [editDirTitle, setEditDirTitle] = useState('');

  // Regular Classes Admin State
  const [editingRegClassId, setEditingRegClassId] = useState<string | null>(null);
  const [showRegClassForm, setShowRegClassForm] = useState(false);
  const [regDay, setRegDay] = useState('Lunes');
  const [regTime, setRegTime] = useState('20:00 a 21:30 hs');
  const [regLevel, setRegLevel] = useState('Entrenamiento Regular Nivel 3');
  const [regInstructor, setRegInstructor] = useState('Tomás & Astrid');
  const [regAddress, setRegAddress] = useState('Av. Corrientes 1234, CABA');
  const [regMapUrl, setRegMapUrl] = useState('https://maps.google.com/?q=Bachata+Influence');
  const [regPrice, setRegPrice] = useState('$45.000 / mes');
  const [regPaymentMethodId, setRegPaymentMethodId] = useState<string>('');

  // Assignment in Admin State
  const [adminSelectedRegClassId, setAdminSelectedRegClassId] = useState<string>('');
  const [adminStudentAssignId, setAdminStudentAssignId] = useState<string>('');
  const [adminAssignRole, setAdminAssignRole] = useState<'leader' | 'follower'>('follower');
  const [adminRegStudentSearch, setAdminRegStudentSearch] = useState<string>('');

  // Unassignment & Deletion Confirmation Modal States for Regular Classes
  const [unassigningRegStudent, setUnassigningRegStudent] = useState<{ classId: string; studentId: string; studentName: string; className: string } | null>(null);
  const [deletingRegClass, setDeletingRegClass] = useState<{ id: string; level: string; day: string; time: string } | null>(null);
  const [adminEnrolledSearch, setAdminEnrolledSearch] = useState<string>('');
  const [assignLevelFilter, setAssignLevelFilter] = useState<'all' | 'nivel-1' | 'nivel-2'>('all');

  // Create Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLevelId, setNewLevelId] = useState<'nivel-1' | 'nivel-2'>('nivel-1');
  const [newTitle, setNewTitle] = useState('');
  const [newPeriod, setNewPeriod] = useState('');
  const [newStatus, setNewStatus] = useState<ConvocatoriaStatus>('proxima');
  const [newPriceInd, setNewPriceInd] = useState('$45.000');
  const [newPriceCpl, setNewPriceCpl] = useState('$80.000 ($40.000 c/u)');
  const [newPaymentMethodId, setNewPaymentMethodId] = useState<string>('pm-main');
  const [newAlias, setNewAlias] = useState('');
  const [newCbu, setNewCbu] = useState('');
  const [newHolder, setNewHolder] = useState('');
  const [newBank, setNewBank] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (paymentMethods.length > 0 && (!newAlias || !newCbu)) {
      const pm = paymentMethods.find(p => p.id === newPaymentMethodId) || paymentMethods[0];
      if (pm) {
        setNewPaymentMethodId(pm.id);
        setNewAlias(pm.alias || '');
        setNewCbu(pm.cbu || '');
        setNewHolder(pm.holder || '');
        setNewBank(pm.bank || '');
      }
    }
  }, [paymentMethods, newAlias, newCbu]);
  const [newCertDate, setNewCertDate] = useState('');
  const [newCertTime, setNewCertTime] = useState('');
  const [newCertLocation, setNewCertLocation] = useState('');
  const [newCertLocationMapUrl, setNewCertLocationMapUrl] = useState('');
  const [newDemoRecordingInfo, setNewDemoRecordingInfo] = useState('');
  const [newDemoRecordingMapUrl, setNewDemoRecordingMapUrl] = useState('');
  const [newClassDay, setNewClassDay] = useState('Viernes');
  const [newClassStartTime, setNewClassStartTime] = useState('20:00');
  const [newClassEndTime, setNewClassEndTime] = useState('21:30');
  const [newLocationName, setNewLocationName] = useState('Sede Central Scalabrini Ortiz 1240, Palermo — CABA');
  const [newLocationMapUrl, setNewLocationMapUrl] = useState('https://maps.google.com/?q=Scalabrini+Ortiz+1240+Palermo');
  const [newRecapVersionId, setNewRecapVersionId] = useState('v1');

  // Edit Form State
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPeriod, setEditPeriod] = useState('');
  const [editStatus, setEditStatus] = useState<ConvocatoriaStatus>('proxima');
  const [editPriceInd, setEditPriceInd] = useState('');
  const [editPriceCpl, setEditPriceCpl] = useState('');
  const [editPaymentMethodId, setEditPaymentMethodId] = useState<string>('pm-main');
  const [editAlias, setEditAlias] = useState('');
  const [editCbu, setEditCbu] = useState('');
  const [editHolder, setEditHolder] = useState('');
  const [editBank, setEditBank] = useState('');
  const [editCertDate, setEditCertDate] = useState('');
  const [editCertTime, setEditCertTime] = useState('');
  const [editCertLocation, setEditCertLocation] = useState('');
  const [editCertLocationMapUrl, setEditCertLocationMapUrl] = useState('');
  const [editDemoRecordingInfo, setEditDemoRecordingInfo] = useState('');
  const [editDemoRecordingMapUrl, setEditDemoRecordingMapUrl] = useState('');
  const [editClassDay, setEditClassDay] = useState('Viernes');
  const [editClassStartTime, setEditClassStartTime] = useState('20:00');
  const [editClassEndTime, setEditClassEndTime] = useState('21:30');
  const [editLocationName, setEditLocationName] = useState('');
  const [editLocationMapUrl, setEditLocationMapUrl] = useState('');
  const [editRecapVersionId, setEditRecapVersionId] = useState('v1');

  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [assignRolesMap, setAssignRolesMap] = useState<Record<string, DanceRole>>({});
  const [confirmRemoveStudentId, setConfirmRemoveStudentId] = useState<string | null>(null);
  const [confirmPauseStudentId, setConfirmPauseStudentId] = useState<string | null>(null);

  // Payment Method Management State
  const [showCreatePm, setShowCreatePm] = useState(false);
  const [newPmName, setNewPmName] = useState('');
  const [newPmAlias, setNewPmAlias] = useState('');
  const [newPmCbu, setNewPmCbu] = useState('');
  const [newPmHolder, setNewPmHolder] = useState('');
  const [newPmBank, setNewPmBank] = useState('');

  const [editingPmId, setEditingPmId] = useState<string | null>(null);
  const [editPmName, setEditPmName] = useState('');
  const [editPmAlias, setEditPmAlias] = useState('');
  const [editPmCbu, setEditPmCbu] = useState('');
  const [editPmHolder, setEditPmHolder] = useState('');
  const [editPmBank, setEditPmBank] = useState('');

  // Recap Editing local state
  const [editingClassNum, setEditingClassNum] = useState<number | null>(null);
  const [recapTitleInput, setRecapTitleInput] = useState('');
  const [recapDescInput, setRecapDescInput] = useState('');
  const [recapUrlInput, setRecapUrlInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Recap Versions Management local state
  const [showCreateVersionModal, setShowCreateVersionModal] = useState(false);
  const [newVersionNameInput, setNewVersionNameInput] = useState('');
  const [newVersionDescInput, setNewVersionDescInput] = useState('');
  const [copyFromVersionId, setCopyFromVersionId] = useState<string>('');

  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editVersionNameInput, setEditVersionNameInput] = useState('');
  const [editVersionDescInput, setEditVersionDescInput] = useState('');

  const [selectedVersionForRecaps, setSelectedVersionForRecaps] = useState<string>('v1');
  const [confirmDeleteVersionId, setConfirmDeleteVersionId] = useState<string | null>(null);

  // Class Dates editing state
  const [editingDatesConvId, setEditingDatesConvId] = useState<string | null>(null);
  const [tempClassDates, setTempClassDates] = useState<string[]>(Array(8).fill(''));

  // Delete confirmation state
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<string | null>(null);
  const [confirmDeletePmId, setConfirmDeletePmId] = useState<string | null>(null);

  // Search & Filter state for Convocatorias/Formaciones tab
  const [convSearchQuery, setConvSearchQuery] = useState('');
  const [convLevelFilter, setConvLevelFilter] = useState<'todos' | 'nivel-1' | 'nivel-2'>('todos');
  const [convStatusFilter, setConvStatusFilter] = useState<'todos' | 'activa' | 'proxima' | 'finalizada'>('todos');

  // Benefits tab local state
  const [showBenefitForm, setShowBenefitForm] = useState(false);
  const [editingBenefitId, setEditingBenefitId] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [benefitSearchQuery, setBenefitSearchQuery] = useState('');
  const [benefitCategoryFilter, setBenefitCategoryFilter] = useState('Todos');

  // Benefit Form State
  const [bTitle, setBTitle] = useState('');
  const [bProvider, setBProvider] = useState('');
  const [bDiscount, setBDiscount] = useState('20% OFF');
  const [bCategories, setBCategories] = useState<string[]>([]);
  const [bDesc, setBDesc] = useState('');
  const [bCode, setBCode] = useState('');
  const [bLocation, setBLocation] = useState('');
  const [bLocationUrl, setBLocationUrl] = useState('');
  const [bWebsiteUrl, setBWebsiteUrl] = useState('');
  const [bTerms, setBTerms] = useState('');
  const [bExpDate, setBExpDate] = useState('');
  const [bExpType, setBExpType] = useState<'indefinite' | 'date'>('indefinite');
  const [bPublishAsAnnouncement, setBPublishAsAnnouncement] = useState(false);
  const [bIsHidden, setBIsHidden] = useState(false);
  const [bImageUrl, setBImageUrl] = useState('https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80');

  // Benefit Category Management State
  const [catNewName, setCatNewName] = useState('');
  const [catEditOldName, setCatEditOldName] = useState<string | null>(null);
  const [catEditNewName, setCatEditNewName] = useState('');

  // Delete Confirmation States (replacing window.confirm which is suppressed in sandboxed iframes)
  const [confirmingDeleteBenefitId, setConfirmingDeleteBenefitId] = useState<string | null>(null);
  const [confirmingDeleteCategory, setConfirmingDeleteCategory] = useState<string | null>(null);

  const toggleBCategory = (cat: string) => {
    if (bCategories.includes(cat)) {
      if (bCategories.length === 1) return; // Keep at least 1 selected
      setBCategories(prev => prev.filter(c => c !== cat));
    } else {
      if (bCategories.length >= 3) {
        setFeedbackMsg('Podés seleccionar como máximo 3 categorías por beneficio.');
        return;
      }
      setBCategories(prev => [...prev, cat]);
    }
  };

  const handleOpenCreateBenefit = () => {
    setEditingBenefitId(null);
    setBTitle('');
    setBProvider('');
    setBDiscount('20% OFF');
    const initialCleanBen = benefitCategories.filter(c => c && c.toLowerCase() !== 'general');
    setBCategories(initialCleanBen.length > 0 ? [initialCleanBen[0]] : []);
    setBDesc('');
    setBCode('');
    setBLocation('');
    setBLocationUrl('');
    setBWebsiteUrl('');
    setBTerms('Válido presentando la credencial digital en el local o ingresando el código promocional online.');
    setBExpDate('');
    setBExpType('indefinite');
    setBPublishAsAnnouncement(false);
    setBIsHidden(false);
    setBImageUrl('https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80');
    setShowBenefitForm(true);
    setTimeout(() => {
      document.getElementById('benefit-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleOpenEditBenefit = (ben: Benefit) => {
    setEditingBenefitId(ben.id);
    setBTitle(ben.title || '');
    setBProvider(ben.provider || '');
    setBDiscount(ben.discount || '');
    setBCategories(ben.categories && ben.categories.length > 0 ? ben.categories : (ben.category ? [ben.category] : []));
    setBDesc(ben.description || '');
    setBCode(ben.promoCode || '');
    setBLocation(ben.location || '');
    setBLocationUrl(ben.locationUrl || '');
    setBWebsiteUrl(ben.websiteUrl || '');
    setBTerms(ben.terms || '');
    setBExpDate(ben.expirationDate || '');
    setBExpType(ben.expirationDate ? 'date' : 'indefinite');
    setBPublishAsAnnouncement(false);
    setBIsHidden(!!ben.isHidden);
    setBImageUrl(ben.imageUrl || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80');
    setShowBenefitForm(true);
    setTimeout(() => {
      document.getElementById('benefit-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSaveBenefitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = (bTitle || '').trim();
    const provider = (bProvider || '').trim();

    if (!title || !provider) {
      setFeedbackMsg('Por favor completa al menos el Título y la Marca / Proveedor.');
      return;
    }

    const formatUrl = (urlStr: string) => {
      const trimmed = (urlStr || '').trim();
      if (!trimmed) return undefined;
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return `https://${trimmed}`;
    };

    const finalDiscount = (bDiscount || '').trim() || 'Promoción Especial';
    const cleanBenCats = benefitCategories.filter(c => c && c.toLowerCase() !== 'general');
    const cleanAnnCats = announcementCategories.filter(c => c && c.toLowerCase() !== 'general');
    const finalCategories = bCategories.length > 0 ? bCategories : (cleanBenCats.length > 0 ? [cleanBenCats[0]] : []);
    const isIndefinite = bExpType === 'indefinite';
    const finalExpDate = isIndefinite ? undefined : (bExpDate || undefined);
    const finalValidUntil = isIndefinite ? 'Indefinido' : (bExpDate ? `Hasta el ${bExpDate}` : 'Indefinido');
    const formattedLocUrl = formatUrl(bLocationUrl || '');
    const formattedWebUrl = formatUrl(bWebsiteUrl || '');

    if (editingBenefitId) {
      updateBenefit(editingBenefitId, {
        title,
        provider,
        discount: finalDiscount,
        category: finalCategories[0],
        categories: finalCategories,
        description: (bDesc || '').trim(),
        promoCode: (bCode || '').trim(),
        location: (bLocation || '').trim() || undefined,
        locationUrl: formattedLocUrl,
        websiteUrl: formattedWebUrl,
        terms: (bTerms || '').trim(),
        expirationDate: finalExpDate,
        validUntil: finalValidUntil,
        isHidden: bIsHidden,
        imageUrl: bImageUrl
      });
      setFeedbackMsg('✓ Beneficio actualizado correctamente.');
    } else {
      addBenefit({
        title,
        provider,
        discount: finalDiscount,
        category: finalCategories[0],
        categories: finalCategories,
        description: (bDesc || '').trim(),
        promoCode: (bCode || '').trim(),
        location: (bLocation || '').trim() || undefined,
        locationUrl: formattedLocUrl,
        websiteUrl: formattedWebUrl,
        terms: (bTerms || '').trim(),
        expirationDate: finalExpDate,
        validUntil: finalValidUntil,
        isHidden: bIsHidden,
        imageUrl: bImageUrl
      });

      if (bPublishAsAnnouncement) {
        const promoSuffix = (bCode || '').trim() ? `\n\n📌 Código Promo: ${(bCode || '').trim()}` : '';
        const benefitAnnCat = cleanAnnCats.find(c => c && (c.toLowerCase() === 'beneficios' || c.toLowerCase().includes('benefic'))) || 'Beneficios';
        addAnnouncement({
          title: `🎁 Nuevo Beneficio: ${title} (${finalDiscount})`,
          category: benefitAnnCat as any,
          content: `${(bDesc || '').trim() || '¡Aprovechá este nuevo beneficio exclusivo para la comunidad Bachata Influence!'}${promoSuffix}\n\n✨ Podés encontrar todos los detalles y condiciones en la sección de Beneficios.`,
          imageUrl: bImageUrl,
          websiteUrl: formattedWebUrl,
          authorName: currentUser?.fullName || 'Tomás & Astrid',
          authorRole: 'Director',
          authorAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          authorId: currentUser?.id,
          isPinned: false,
        });
      }

      setFeedbackMsg('✓ Nuevo beneficio creado exitosamente.');
    }

    // Always fold/hide the form on submit and reset editing state
    setShowBenefitForm(false);
    setEditingBenefitId(null);
    setBTitle('');
    setBProvider('');
    setBDiscount('20% OFF');
    setBCategories([]);
    setBDesc('');
    setBCode('');
    setBLocation('');
    setBLocationUrl('');
    setBWebsiteUrl('');
    setBTerms('');
    setBExpDate('');
    setBExpType('indefinite');
    setBPublishAsAnnouncement(false);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNewName.trim()) return;
    addBenefitCategory(catNewName.trim());
    setFeedbackMsg(`Categoría "${catNewName.trim()}" agregada.`);
    setCatNewName('');
  };

  const handleSaveEditCategory = (oldCat: string) => {
    if (!catEditNewName.trim() || catEditNewName.trim() === oldCat) {
      setCatEditOldName(null);
      return;
    }
    editBenefitCategory(oldCat, catEditNewName.trim());
    setFeedbackMsg(`Categoría editada a "${catEditNewName.trim()}".`);
    setCatEditOldName(null);
    setCatEditNewName('');
  };

  // Announcement Category Handlers
  const handleAddAnnCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annCatNewName.trim()) return;
    addAnnouncementCategory(annCatNewName.trim());
    setFeedbackMsg(`Categoría de anuncio "${annCatNewName.trim()}" agregada.`);
    setAnnCatNewName('');
  };

  const handleSaveEditAnnCategory = (oldCat: string) => {
    if (!annCatEditNewName.trim() || annCatEditNewName.trim() === oldCat) {
      setAnnCatEditOldName(null);
      return;
    }
    editAnnouncementCategory(oldCat, annCatEditNewName.trim());
    setFeedbackMsg(`Categoría de anuncio editada a "${annCatEditNewName.trim()}".`);
    setAnnCatEditOldName(null);
    setAnnCatEditNewName('');
  };

  const handleDeleteAnnCategoryConfirm = (catName: string) => {
    deleteAnnouncementCategory(catName);
    setFeedbackMsg(`Categoría de anuncio "${catName}" eliminada.`);
  };

  // Directors Handlers
  const handlePromoteStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentToPromote) return;
    const student = usersList.find(u => u.id === selectedStudentToPromote);
    if (!student) return;

    updateStudentByAdmin(student.id, {
      role: 'admin',
      level: promotionTitle.trim() || 'Director & Instructor - Bachata Influence',
      memberCode: student.memberCode.startsWith('TA-DIR') ? student.memberCode : `TA-DIR-2026-${Math.floor(1000 + Math.random() * 9000)}`
    });

    setFeedbackMsg(`¡${student.fullName} ha sido promovido/a a Director de la plataforma!`);
    setSelectedStudentToPromote('');
    setShowPromotePanel(false);
  };

  const handleCreateDirector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirFullName.trim() || !newDirEmail.trim()) return;

    const res = createStudentByAdmin({
      fullName: newDirFullName.trim(),
      email: newDirEmail.trim(),
      dni: newDirDni.trim(),
      phone: newDirPhone.trim(),
      level: newDirTitle.trim() || 'Director & Instructor - Bachata Influence',
      role: 'admin'
    });

    if (res.success) {
      setFeedbackMsg(res.message);
      setNewDirFullName('');
      setNewDirEmail('');
      setNewDirDni('');
      setNewDirPhone('');
      setShowCreateDirPanel(false);
    } else {
      setFeedbackMsg(`Error: ${res.message}`);
    }
  };

  const handleSaveEditDirector = (directorId: string) => {
    if (!editDirFullName.trim()) return;
    updateStudentByAdmin(directorId, {
      fullName: editDirFullName.trim(),
      email: editDirEmail.trim(),
      level: editDirTitle.trim() || 'Director & Instructor - Bachata Influence'
    });
    setEditingDirectorId(null);
    setFeedbackMsg('Datos de director actualizados correctamente.');
  };

  const handleRevokeDirector = (directorId: string, fullName: string) => {
    const activeDirectorsCount = usersList.filter(u => u.role === 'admin').length;
    if (activeDirectorsCount <= 1) {
      setFeedbackMsg('No es posible revocar al único Director activo de la plataforma.');
      return;
    }

    if (window.confirm(`¿Confirmás quitar el rol de Director a ${fullName}? Volverá a tener rol de Alumno.`)) {
      updateStudentByAdmin(directorId, {
        role: 'student',
        level: 'Alumno - Bachata Influence'
      });
      setFeedbackMsg(`Se quitó el rol de Director a ${fullName}.`);
    }
  };

  const handleSelectPaymentMethodForNew = (pmId: string) => {
    setNewPaymentMethodId(pmId);
    const pm = paymentMethods.find(p => p.id === pmId);
    if (pm) {
      setNewAlias(pm.alias);
      setNewCbu(pm.cbu);
      setNewHolder(pm.holder);
      setNewBank(pm.bank);
    }
  };

  const handleSelectPaymentMethodForEdit = (pmId: string) => {
    setEditPaymentMethodId(pmId);
    const pm = paymentMethods.find(p => p.id === pmId);
    if (pm) {
      setEditAlias(pm.alias);
      setEditCbu(pm.cbu);
      setEditHolder(pm.holder);
      setEditBank(pm.bank);
    }
  };

  const handleCreatePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPmName.trim() || !newPmAlias.trim()) {
      setFeedbackMsg('Por favor ingresá el nombre de referencia y el alias.');
      return;
    }
    addPaymentMethod({
      name: newPmName.trim(),
      alias: newPmAlias.trim(),
      cbu: newPmCbu.trim(),
      holder: newPmHolder.trim(),
      bank: newPmBank.trim()
    });
    setNewPmName('');
    setNewPmAlias('');
    setNewPmCbu('');
    setNewPmHolder('');
    setNewPmBank('');
    setShowCreatePm(false);
    setFeedbackMsg('¡Medio de pago registrado correctamente!');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const startEditPm = (pm: PaymentMethod) => {
    setEditingPmId(pm.id);
    setEditPmName(pm.name);
    setEditPmAlias(pm.alias);
    setEditPmCbu(pm.cbu);
    setEditPmHolder(pm.holder);
    setEditPmBank(pm.bank);
  };

  const saveEditPm = (id: string) => {
    updatePaymentMethod(id, {
      name: editPmName,
      alias: editPmAlias,
      cbu: editPmCbu,
      holder: editPmHolder,
      bank: editPmBank
    });
    setEditingPmId(null);
    setFeedbackMsg('¡Medio de pago actualizado con éxito! Se aplicó a todas las formaciones vinculadas.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const startEditClassDates = (conv: Convocatoria) => {
    setEditingDatesConvId(conv.id);
    const existing = conv.classDates || [];
    const filled = Array.from({ length: 8 }).map((_, i) => existing[i] || '');
    setTempClassDates(filled);
  };

  const saveClassDates = (convId: string) => {
    updateConvocatoriaClassDates(convId, tempClassDates);
    setEditingDatesConvId(null);
    setFeedbackMsg('¡Fechas de las 8 clases guardadas! Los recaps se habilitarán automáticamente a las 23:00 hs en la fecha de cada clase.');
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  if (!isOpen || currentUser?.role !== 'admin') return null;

  const currentConv = convocatorias.find(c => c.id === selectedConvocatoriaId) || convocatorias[0];
  const currentConfig = formationConfigs.find(c => c.id === selectedLevelId) || formationConfigs[0];

  // All non-admin students
  const allStudents = usersList.filter(u => u.role !== 'admin').filter(u =>
    normalizeText(u.fullName).includes(normalizeText(searchQuery)) ||
    normalizeText(u.email).includes(normalizeText(searchQuery)) ||
    (u.dni && normalizeText(u.dni).includes(normalizeText(searchQuery))) ||
    (u.memberCode && normalizeText(u.memberCode).includes(normalizeText(searchQuery)))
  ).sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Enrolled students in selected convocatoria (in exact order of assignment)
  const enrolledStudents = currentConv
    ? (currentConv.studentIds || [])
        .map(id => usersList.find(u => u.id === id))
        .filter((u): u is typeof usersList[0] => u !== undefined)
        .filter(u =>
          normalizeText(u.fullName).includes(normalizeText(searchQuery)) ||
          normalizeText(u.email).includes(normalizeText(searchQuery)) ||
          (u.dni && normalizeText(u.dni).includes(normalizeText(searchQuery))) ||
          (u.memberCode && normalizeText(u.memberCode).includes(normalizeText(searchQuery)))
        )
    : [];

  const handleCreateConvocatoria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPeriod.trim()) {
      setFeedbackMsg('Por favor completa el título y el período de la formación.');
      return;
    }
    addConvocatoria({
      levelId: newLevelId,
      title: newTitle.trim(),
      period: newPeriod.trim(),
      status: newStatus,
      priceIndividual: newPriceInd,
      priceCouple: newPriceCpl,
      paymentMethodId: newPaymentMethodId,
      paymentAlias: newAlias,
      paymentCbu: newCbu,
      paymentHolder: newHolder,
      paymentBank: newBank,
      certificateDate: newCertDate,
      certificateTime: newCertTime,
      certificateLocation: newCertLocation,
      certificateLocationMapUrl: newCertLocationMapUrl,
      demoRecordingInfo: newDemoRecordingInfo,
      demoRecordingMapUrl: newDemoRecordingMapUrl,
      classDay: newClassDay,
      classStartTime: newClassStartTime,
      classEndTime: newClassEndTime,
      locationName: newLocationName,
      locationMapUrl: newLocationMapUrl,
      recapVersionId: newRecapVersionId
    });

    const createdTitle = newTitle.trim();

    setNewLevelId('nivel-1');
    setNewTitle('');
    setNewPeriod('');
    setNewStatus('proxima');
    setNewPriceInd('$45.000');
    setNewPriceCpl('$80.000 ($40.000 c/u)');
    setNewCertDate('');
    setNewCertTime('');
    setNewCertLocation('');
    setNewCertLocationMapUrl('');
    setNewDemoRecordingInfo('');
    setNewDemoRecordingMapUrl('');
    setNewClassDay('Viernes');
    setNewClassStartTime('20:00');
    setNewClassEndTime('21:30');
    setNewLocationName('Sede Central Scalabrini Ortiz 1240, Palermo — CABA');
    setNewLocationMapUrl('https://maps.google.com/?q=Scalabrini+Ortiz+1240+Palermo');
    setNewRecapVersionId('v1');
    setNewAlias('');
    setNewCbu('');
    setNewHolder('');
    setNewBank('');
    setShowCreateForm(false);
    setLiveToast({
      title: 'Formación Creada',
      message: `La formación "${createdTitle}" se ha guardado correctamente.`
    });
    setFeedbackMsg('¡Nueva formación creada con éxito!');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const startEditConv = (conv: Convocatoria) => {
    setEditingConvId(conv.id);
    setEditTitle(conv.title);
    setEditPeriod(conv.period);
    setEditStatus(conv.status);
    setEditPriceInd(conv.priceIndividual || '$45.000');
    setEditPriceCpl(conv.priceCouple || '$80.000 ($40.000 c/u)');
    setEditPaymentMethodId(conv.paymentMethodId || paymentMethods[0]?.id || '');
    const matchedPm = paymentMethods.find(p => p.id === conv.paymentMethodId) || paymentMethods[0];
    setEditAlias(matchedPm?.alias || conv.paymentAlias || '');
    setEditCbu(matchedPm?.cbu || conv.paymentCbu || '');
    setEditHolder(matchedPm?.holder || conv.paymentHolder || '');
    setEditBank(matchedPm?.bank || conv.paymentBank || '');
    setEditCertDate(conv.certificateDate || '');
    setEditCertTime(conv.certificateTime || '');
    setEditCertLocation(conv.certificateLocation || '');
    setEditCertLocationMapUrl(conv.certificateLocationMapUrl || '');
    setEditDemoRecordingInfo(conv.demoRecordingInfo || '');
    setEditDemoRecordingMapUrl(conv.demoRecordingMapUrl || '');
    setEditClassDay(conv.classDay || 'Viernes');
    setEditClassStartTime(conv.classStartTime || '20:00');
    setEditClassEndTime(conv.classEndTime || '21:30');
    setEditLocationName(conv.locationName || 'Sede Central Scalabrini Ortiz 1240, Palermo — CABA');
    setEditLocationMapUrl(conv.locationMapUrl || 'https://maps.google.com/?q=Scalabrini+Ortiz+1240+Palermo');
    setEditRecapVersionId(conv.recapVersionId || 'v1');
    const existingDates = conv.classDates || [];
    const filledDates = Array.from({ length: 8 }).map((_, i) => existingDates[i] || '');
    setTempClassDates(filledDates);
  };

  const saveEditConv = (convId: string) => {
    updateConvocatoria(convId, {
      title: editTitle,
      period: editPeriod,
      status: editStatus,
      priceIndividual: editPriceInd,
      priceCouple: editPriceCpl,
      paymentMethodId: editPaymentMethodId,
      paymentAlias: editAlias,
      paymentCbu: editCbu,
      paymentHolder: editHolder,
      paymentBank: editBank,
      certificateDate: editCertDate,
      certificateTime: editCertTime,
      certificateLocation: editCertLocation,
      certificateLocationMapUrl: editCertLocationMapUrl,
      demoRecordingInfo: editDemoRecordingInfo,
      demoRecordingMapUrl: editDemoRecordingMapUrl,
      classDay: editClassDay,
      classStartTime: editClassStartTime,
      classEndTime: editClassEndTime,
      locationName: editLocationName,
      locationMapUrl: editLocationMapUrl,
      recapVersionId: editRecapVersionId,
      classDates: tempClassDates
    });
    setEditingConvId(null);
    setFeedbackMsg('Formación actualizada con éxito.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const startEditRecap = (classNum: number, title: string, desc: string, url: string) => {
    setEditingClassNum(classNum);
    setRecapTitleInput(title);
    setRecapDescInput(desc);
    setRecapUrlInput(url);
  };

  const saveRecapEdit = (classNum: number) => {
    const verToEdit = selectedVersionForRecaps || currentConfig.activeRecapVersionId || 'v1';
    updateVersionRecap(selectedLevelId, verToEdit, classNum, recapTitleInput, recapDescInput, recapUrlInput);
    if (verToEdit === (currentConfig.activeRecapVersionId || 'v1')) {
      updateFormationRecap(selectedLevelId, classNum, recapTitleInput, recapDescInput, recapUrlInput);
    }
    setEditingClassNum(null);
    setFeedbackMsg(`¡Recap de la Clase ${classNum} guardado exitosamente!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleCreateRecapVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionNameInput.trim()) {
      setFeedbackMsg('Por favor ingresá un nombre para la versión de recaps.');
      return;
    }
    if (copyFromVersionId) {
      duplicateRecapVersion(selectedLevelId, copyFromVersionId, newVersionNameInput.trim());
      setFeedbackMsg(`¡Versión duplicada con éxito como "${newVersionNameInput.trim()}"!`);
    } else {
      createRecapVersion(selectedLevelId, newVersionNameInput.trim(), newVersionDescInput.trim());
      setFeedbackMsg(`¡Nueva versión "${newVersionNameInput.trim()}" creada con éxito!`);
    }
    setNewVersionNameInput('');
    setNewVersionDescInput('');
    setCopyFromVersionId('');
    setShowCreateVersionModal(false);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSaveEditVersionDetails = (versionId: string) => {
    if (!editVersionNameInput.trim()) return;
    updateRecapVersionDetails(selectedLevelId, versionId, editVersionNameInput.trim(), editVersionDescInput.trim());
    setEditingVersionId(null);
    setFeedbackMsg('Datos de la versión actualizados correctamente.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDeleteVersion = (versionId: string) => {
    deleteRecapVersion(selectedLevelId, versionId);
    setConfirmDeleteVersionId(null);
    setFeedbackMsg('Versión de recaps eliminada.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="admin-formation-backdrop"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed inset-0 w-full h-full min-h-screen z-50 bg-[#111111] text-[#eeede9] overflow-y-auto"
      >
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-30 bg-[#111111]/95 backdrop-blur-md border-b border-[#56554e]/40 px-4 sm:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181715] hover:bg-[#56554e]/40 text-[#e7d9cf] text-xs font-black transition border border-[#56554e]/40 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-[#e7d9cf] text-[#111111] shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <h2 className="text-sm sm:text-base font-black uppercase text-[#eeede9] tracking-tight truncate">
                  Gestión de Plataforma
                </h2>
                <p className="text-[11px] text-[#e7d9cf] hidden sm:block truncate">
                  Panel exclusivo de Directores
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/60 text-[#eeede9] transition shrink-0"
              title="Cerrar Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 pb-24">

          {/* Mobile Collapsible Navigation Menu */}
          <div className="sm:hidden mb-4 relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#56554e]/30 border border-[#e7d9cf]/40 text-[#eeede9] font-extrabold text-xs transition shadow-md cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {(activeTab === 'convocatorias' || activeTab === 'regulares' || activeTab === 'recaps') && <GraduationCap className="w-4 h-4 text-[#e7d9cf] shrink-0" />}
                {activeTab === 'alumnos' && <Users className="w-4 h-4 text-[#e7d9cf] shrink-0" />}
                {activeTab === 'paymentMethods' && <CreditCard className="w-4 h-4 text-[#e7d9cf] shrink-0" />}
                {activeTab === 'benefits' && <Gift className="w-4 h-4 text-[#e7d9cf] shrink-0" />}
                {activeTab === 'announcements' && <Megaphone className="w-4 h-4 text-[#e7d9cf] shrink-0" />}
                {activeTab === 'directores' && <ShieldCheck className="w-4 h-4 text-[#e7d9cf] shrink-0" />}
                <span className="truncate">
                  Sección: <strong className="text-[#e7d9cf]">
                    {activeTab === 'convocatorias' && `Academy • Formaciones (${convocatorias.length})`}
                    {activeTab === 'regulares' && `Academy • Clases Regulares (${regularClasses.length})`}
                    {activeTab === 'recaps' && 'Academy • Recaps'}
                    {activeTab === 'alumnos' && 'Alumnos'}
                    {activeTab === 'paymentMethods' && `Medios de Pago (${paymentMethods.length})`}
                    {activeTab === 'benefits' && `Beneficios (${benefits.length})`}
                    {activeTab === 'announcements' && `Anuncios (${announcements.length})`}
                    {activeTab === 'directores' && `Directores (${usersList.filter(u => u.role === 'admin').length})`}
                  </strong>
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#e7d9cf] shrink-0 transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`} />
            </button>

            {mobileNavOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#1c1b1a] border border-[#e7d9cf]/40 rounded-2xl p-2 shadow-2xl space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                {/* Academy Group Header */}
                <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-1.5 border-b border-white/[0.06] mb-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Academy</span>
                </div>

                {[
                  { id: 'convocatorias', label: `Formaciones (${convocatorias.length})`, icon: Layers, isAcademy: true },
                  { id: 'regulares', label: `Clases Regulares (${regularClasses.length})`, icon: Calendar, isAcademy: true },
                  { id: 'recaps', label: 'Recaps', icon: Video, isAcademy: true },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={`mob-nav-${tab.id}`}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setMobileNavOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 pl-5 rounded-xl text-xs font-extrabold transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#e7d9cf] text-[#111111]'
                          : 'text-[#eeede9]/80 hover:bg-[#56554e]/30 hover:text-[#eeede9]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#111111]' : 'text-[#e7d9cf]'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}

                {/* Other Navigation Items */}
                <div className="pt-1.5 mt-1.5 border-t border-white/[0.06] space-y-1">
                  {[
                    { id: 'alumnos', label: 'Alumnos', icon: Users },
                    { id: 'paymentMethods', label: `Medios de Pago (${paymentMethods.length})`, icon: CreditCard },
                    { id: 'benefits', label: `Beneficios (${benefits.length})`, icon: Gift },
                    { id: 'announcements', label: `Anuncios (${announcements.length})`, icon: Megaphone },
                    { id: 'directores', label: `Directores (${usersList.filter(u => u.role === 'admin').length})`, icon: ShieldCheck },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={`mob-nav-${tab.id}`}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setMobileNavOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-extrabold transition text-left cursor-pointer ${
                          isActive
                            ? 'bg-[#e7d9cf] text-[#111111]'
                            : 'text-[#eeede9]/80 hover:bg-[#56554e]/30 hover:text-[#eeede9]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#111111]' : 'text-[#e7d9cf]'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Mode Tabs - Single Line Horizontal Bar */}
          <div className="hidden sm:flex items-center gap-2 bg-[#181816] p-2 rounded-2xl border border-white/[0.12] mb-3 shadow-lg shadow-black/40 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap flex-nowrap shrink-0">
            {/* 1. Academy (Groups Formaciones, Clases Regulares & Recaps) */}
            <button
              type="button"
              onClick={() => {
                if (activeTab !== 'convocatorias' && activeTab !== 'regulares' && activeTab !== 'recaps') {
                  setActiveTab('convocatorias');
                }
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'convocatorias' || activeTab === 'regulares' || activeTab === 'recaps'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'text-[#eeede9]/80 hover:text-[#eeede9] hover:bg-white/[0.06]'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Academy</span>
            </button>

            {/* 2. Alumnos */}
            <button
              type="button"
              onClick={() => setActiveTab('alumnos')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'alumnos'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'text-[#eeede9]/80 hover:text-[#eeede9] hover:bg-white/[0.06]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Alumnos</span>
            </button>

            {/* 3. Medios de Pago */}
            <button
              type="button"
              onClick={() => setActiveTab('paymentMethods')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'paymentMethods'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'text-[#eeede9]/80 hover:text-[#eeede9] hover:bg-white/[0.06]'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Medios de Pago ({paymentMethods.length})</span>
            </button>

            {/* 4. Beneficios */}
            <button
              type="button"
              onClick={() => setActiveTab('benefits')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'benefits'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'text-[#eeede9]/80 hover:text-[#eeede9] hover:bg-white/[0.06]'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>Beneficios ({benefits.length})</span>
            </button>

            {/* 5. Anuncios */}
            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'text-[#eeede9]/80 hover:text-[#eeede9] hover:bg-white/[0.06]'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Anuncios ({announcements.length})</span>
            </button>

            {/* 6. Gestión de Directores */}
            <button
              type="button"
              onClick={() => setActiveTab('directores')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'directores'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'text-[#eeede9]/80 hover:text-[#eeede9] hover:bg-white/[0.06]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Directores ({usersList.filter(u => u.role === 'admin').length})</span>
            </button>
          </div>

          {/* Academy Sub-tabs Pill Segment (when Academy is active - Formaciones, Clases Regulares, Recaps) */}
          {(activeTab === 'convocatorias' || activeTab === 'regulares' || activeTab === 'recaps') && (
            <div className="flex items-center gap-1.5 p-1.5 bg-[#141413]/90 border border-white/[0.08] rounded-xl mb-5 overflow-x-auto no-scrollbar whitespace-nowrap">
              <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase text-[#e7d9cf]/70 tracking-widest shrink-0 border-r border-white/[0.08] mr-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#e7d9cf]" />
                <span>Subsección:</span>
              </div>

              {/* 1. Formaciones */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('convocatorias');
                  setConvSubTab('lista');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  activeTab === 'convocatorias'
                    ? 'bg-[#56554e]/60 text-[#eeede9] border border-[#e7d9cf]/40 shadow-sm'
                    : 'text-[#eeede9]/60 hover:text-[#eeede9] hover:bg-white/[0.04]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#e7d9cf]" />
                <span>Formaciones</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  activeTab === 'convocatorias' ? 'bg-[#e7d9cf] text-[#111111]' : 'bg-white/[0.08] text-[#eeede9]/70'
                }`}>
                  {convocatorias.length}
                </span>
              </button>

              {/* 2. Clases Regulares */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('regulares');
                  setRegSubTab('lista');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  activeTab === 'regulares'
                    ? 'bg-[#56554e]/60 text-[#eeede9] border border-[#e7d9cf]/40 shadow-sm'
                    : 'text-[#eeede9]/60 hover:text-[#eeede9] hover:bg-white/[0.04]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#e7d9cf]" />
                <span>Clases Regulares</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  activeTab === 'regulares' ? 'bg-[#e7d9cf] text-[#111111]' : 'bg-white/[0.08] text-[#eeede9]/70'
                }`}>
                  {regularClasses.length}
                </span>
              </button>

              {/* 3. Recaps */}
              <button
                type="button"
                onClick={() => setActiveTab('recaps')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  activeTab === 'recaps'
                    ? 'bg-[#56554e]/60 text-[#eeede9] border border-[#e7d9cf]/40 shadow-sm'
                    : 'text-[#eeede9]/60 hover:text-[#eeede9] hover:bg-white/[0.04]'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-[#e7d9cf]" />
                <span>Recaps</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  activeTab === 'recaps' ? 'bg-[#e7d9cf] text-[#111111]' : 'bg-white/[0.08] text-[#eeede9]/70'
                }`}>
                  8 Clases
                </span>
              </button>
            </div>
          )}

          {/* Main Page Body */}
          <div className="space-y-6">
            {/* Feedback Toast */}
            {feedbackMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-2xl text-center">
                {feedbackMsg}
              </div>
            )}

          {/* TAB 1.5: CLASES REGULARES MANAGEMENT */}
          {activeTab === 'regulares' && (
            <div className="space-y-6">
              {regSubTab === 'lista' && (
                <div className="space-y-6">
                  {/* Header & Nueva Clase Regular Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#56554e]/40">
                    <div>
                      <h3 className="text-sm font-extrabold uppercase text-[#eeede9] flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#e7d9cf]" />
                        <span>Clases Regulares de la Compañía ({regularClasses.length})</span>
                      </h3>
                      <p className="text-xs text-[#e7d9cf]">
                        Creá y administrá los entrenamientos regulares, sedes, valores y asignación de alumnos Nivel 2.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingRegClassId(null);
                        setRegDay('Lunes');
                        setRegTime('20:00 a 21:30 hs');
                        setRegLevel('Entrenamiento Regular Nivel 3');
                        setRegInstructor('Tomás & Astrid');
                        setRegAddress('Av. Corrientes 1234, CABA');
                        setRegMapUrl('https://maps.google.com/?q=Bachata+Influence');
                        setRegPrice('$45.000 / mes');
                        setRegPaymentMethodId(paymentMethods[0]?.id || '');
                        setShowRegClassForm(!showRegClassForm);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-extrabold text-xs transition flex items-center gap-1.5 shadow self-start sm:self-auto shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{showRegClassForm ? 'Cancelar' : 'Nueva Clase Regular'}</span>
                    </button>
                  </div>

                  {/* Form Modal / Collapsible for Regular Class Creation / Edition */}
                  {showRegClassForm && (
                    <div className="p-5 sm:p-6 bg-[#111111] border border-[#e7d9cf]/40 rounded-3xl space-y-4 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-3">
                        <h4 className="text-xs font-black uppercase text-[#e7d9cf] tracking-wider">
                          {editingRegClassId ? 'Editar Clase Regular' : 'Nueva Clase Regular'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowRegClassForm(false)}
                          className="p-1 text-[#e7d9cf]/60 hover:text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[#e7d9cf] uppercase mb-1">Día de Cursada</label>
                          <input
                            type="text"
                            value={regDay}
                            onChange={e => setRegDay(e.target.value)}
                            placeholder="Ej: Lunes y Miércoles"
                            className="w-full bg-[#1c1b1a] border border-[#56554e] rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#e7d9cf] uppercase mb-1">Horario</label>
                          <input
                            type="text"
                            value={regTime}
                            onChange={e => setRegTime(e.target.value)}
                            placeholder="Ej: 20:00 a 21:30 hs"
                            className="w-full bg-[#1c1b1a] border border-[#56554e] rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#e7d9cf] uppercase mb-1">Nivel / Título</label>
                          <input
                            type="text"
                            value={regLevel}
                            onChange={e => setRegLevel(e.target.value)}
                            placeholder="Ej: Entrenamiento Regular Nivel 3"
                            className="w-full bg-[#1c1b1a] border border-[#56554e] rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#e7d9cf] uppercase mb-1">Instructores</label>
                          <input
                            type="text"
                            value={regInstructor}
                            onChange={e => setRegInstructor(e.target.value)}
                            placeholder="Ej: Tomás & Astrid"
                            className="w-full bg-[#1c1b1a] border border-[#56554e] rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#e7d9cf] uppercase mb-1">Dirección / Sede</label>
                          <input
                            type="text"
                            value={regAddress}
                            onChange={e => setRegAddress(e.target.value)}
                            placeholder="Ej: Av. Corrientes 1234, CABA"
                            className="w-full bg-[#1c1b1a] border border-[#56554e] rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#e7d9cf] uppercase mb-1">Link Google Maps</label>
                          <input
                            type="text"
                            value={regMapUrl}
                            onChange={e => setRegMapUrl(e.target.value)}
                            placeholder="https://maps.google.com/..."
                            className="w-full bg-[#1c1b1a] border border-[#56554e] rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#e7d9cf] uppercase mb-1">Valor Cuota Mensual</label>
                          <input
                            type="text"
                            value={regPrice}
                            onChange={e => setRegPrice(e.target.value)}
                            placeholder="Ej: $45.000 / mes"
                            className="w-full bg-[#1c1b1a] border border-[#56554e] rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                          />
                        </div>

                        {/* Selector Exclusivo de Medios de Pago desde la Base de Datos */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-[#e7d9cf] uppercase mb-1 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                            <span>Medio de Pago para Alumnos (Debe existir en la base de datos)</span>
                          </label>
                          {paymentMethods.length === 0 ? (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                              ⚠️ No tenés medios de pago creados en la base de datos. Creá uno en la pestaña <strong>"Medios de Pago"</strong> para vincularlo a esta clase.
                            </div>
                          ) : (
                            <select
                              value={regPaymentMethodId}
                              onChange={e => setRegPaymentMethodId(e.target.value)}
                              className="w-full bg-[#1c1b1a] border border-[#56554e] rounded-xl px-3 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf] cursor-pointer"
                            >
                              <option value="">-- Sin medio de pago asignado --</option>
                              {paymentMethods.map(pm => (
                                <option key={`reg-pm-select-${pm.id}`} value={pm.id}>
                                  {pm.name} ({pm.bank} — Alias: {pm.alias} — Titular: {pm.holder})
                                </option>
                              ))}
                            </select>
                          )}
                          <p className="text-[10px] text-[#eeede9]/60 mt-1">
                            Este será el único medio de pago que verán los alumnos asignados a esta clase regular.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-[#56554e]/40">
                        <button
                          type="button"
                          onClick={() => setShowRegClassForm(false)}
                          className="px-4 py-2 rounded-xl bg-[#56554e]/40 hover:bg-[#56554e]/60 text-[#eeede9] text-xs font-bold transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!regLevel.trim() || !regDay.trim() || !regTime.trim()) {
                              setFeedbackMsg('Por favor completá los campos obligatorios.');
                              return;
                            }
                            if (editingRegClassId) {
                              updateRegularClass(editingRegClassId, {
                                day: regDay,
                                time: regTime,
                                level: regLevel,
                                instructor: regInstructor,
                                address: regAddress,
                                mapUrl: regMapUrl,
                                price: regPrice,
                                paymentMethodId: regPaymentMethodId
                              });
                              setLiveToast({
                                title: 'Clase Regular Actualizada',
                                message: `Se ha guardado "${regLevel}" correctamente.`
                              });
                            } else {
                              addRegularClass({
                                day: regDay,
                                time: regTime,
                                level: regLevel,
                                instructor: regInstructor,
                                address: regAddress,
                                mapUrl: regMapUrl,
                                price: regPrice,
                                paymentMethodId: regPaymentMethodId,
                                studentIds: []
                              });
                              setLiveToast({
                                title: 'Clase Regular Creada',
                                message: `Se ha creado "${regLevel}" correctamente.`
                              });
                            }
                            setShowRegClassForm(false);
                          }}
                          className="px-5 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition shadow cursor-pointer"
                        >
                          {editingRegClassId ? 'Guardar Cambios' : 'Crear Clase Regular'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Regular Classes (Matching Formaciones Layout) */}
                  <div className="space-y-4">
                    {regularClasses.length === 0 ? (
                      <div className="p-8 text-center bg-[#111111] border border-[#56554e]/30 rounded-3xl">
                        <p className="text-xs text-[#eeede9]/60 font-medium">No hay clases regulares registradas.</p>
                      </div>
                    ) : (
                      regularClasses.map((cls, cIdx) => {
                        const clsStudents = (cls.studentIds || [])
                          .map(id => usersList.find(u => u.id === id))
                          .filter((u): u is typeof usersList[0] => u !== undefined);
                        const clsLeadersCount = clsStudents.filter(s => (cls.studentRoles?.[s.id] || s.danceRole || 'follower') === 'leader').length;
                        const clsFollowersCount = clsStudents.filter(s => (cls.studentRoles?.[s.id] || s.danceRole || 'follower') === 'follower').length;
                        const assignedPm = paymentMethods.find(pm => pm.id === cls.paymentMethodId);

                        return (
                          <div
                            key={`admin-reg-list-${cls.id}-${cIdx}`}
                            className="p-5 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/50 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-[#56554e]/30">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-[#111111] text-[#e7d9cf] text-[10px] font-extrabold uppercase border border-[#e7d9cf]/30 whitespace-nowrap shrink-0">
                                  {cls.day} — {cls.time}
                                </span>

                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase border border-amber-500/30 whitespace-nowrap shrink-0">
                                  {cls.price || '$45.000 / mes'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('recaps');
                                    setRecapCategory('regulares');
                                    setSelectedRegClassForRecapId(cls.id);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                  title="Ver y Gestionar Recaps de esta Clase"
                                >
                                  <Video className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Recaps ({cls.recaps?.length || 0})</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdminSelectedRegClassId(cls.id);
                                    setRegSubTab('asignacion');
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition flex items-center gap-1.5 shadow cursor-pointer"
                                  title="Asignar Alumnos a esta Clase Regular"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Asignación</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRegClassId(cls.id);
                                    setRegDay(cls.day);
                                    setRegTime(cls.time);
                                    setRegLevel(cls.level);
                                    setRegInstructor(cls.instructor);
                                    setRegAddress(cls.address);
                                    setRegMapUrl(cls.mapUrl || '');
                                    setRegPrice(cls.price || '');
                                    setRegPaymentMethodId(cls.paymentMethodId || '');
                                    setShowRegClassForm(true);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-[#56554e]/40 hover:bg-[#56554e]/80 text-[#eeede9] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                  title="Editar Datos de la Clase Regular"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Editar</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingRegClass({ id: cls.id, level: cls.level, day: cls.day, time: cls.time });
                                  }}
                                  className="p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-300 transition cursor-pointer"
                                  title="Eliminar Clase Regular"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-extrabold text-sm text-[#eeede9]">{cls.level}</h4>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-[#e7d9cf] font-medium">
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-[#e7d9cf]" />
                                  <span>{cls.address}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-[#e7d9cf]" />
                                  <span>Instructores: <strong className="text-[#eeede9]">{cls.instructor}</strong></span>
                                </span>
                                <span className="flex items-center gap-1 text-amber-300">
                                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Medio de pago: {assignedPm ? `${assignedPm.name} (${assignedPm.bank})` : 'Sin asignar'}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <span className="px-2.5 py-1 rounded-xl bg-[#111111]/80 border border-blue-500/30 text-blue-300 text-[11px] font-extrabold flex items-center gap-1">
                                  🕺 {clsLeadersCount} Leaders
                                </span>
                                <span className="px-2.5 py-1 rounded-xl bg-[#111111]/80 border border-purple-500/30 text-purple-300 text-[11px] font-extrabold flex items-center gap-1">
                                  💃 {clsFollowersCount} Followers
                                </span>
                                <span className="text-[11px] font-bold text-[#e7d9cf] ml-1">
                                  ({clsStudents.length} Alumnos en total)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Assignment Sub-View for Regular Classes */}
              {regSubTab === 'asignacion' && (() => {
                const selectedCls = regularClasses.find(c => c.id === (adminSelectedRegClassId || regularClasses[0]?.id));
                if (!selectedCls) {
                  return (
                    <div className="p-8 text-center bg-[#111111] border border-[#56554e]/30 rounded-3xl space-y-3">
                      <p className="text-xs text-[#eeede9]/60 font-medium">No se encontró la clase regular seleccionada.</p>
                      <button
                        type="button"
                        onClick={() => setRegSubTab('lista')}
                        className="px-4 py-2 rounded-xl bg-[#e7d9cf] text-[#111111] text-xs font-black"
                      >
                        Volver al listado
                      </button>
                    </div>
                  );
                }

                // Candidates filter: ONLY students with nivel2Completed === true AND NOT role === 'admin' AND NOT already assigned
                const candidateStudents = usersList.filter(u =>
                  u.nivel2Completed === true &&
                  u.role !== 'admin' &&
                  !(selectedCls.studentIds || []).includes(u.id) &&
                  (adminRegStudentSearch.trim() === '' ||
                   normalizeText(u.fullName).includes(normalizeText(adminRegStudentSearch)) ||
                   normalizeText(u.email).includes(normalizeText(adminRegStudentSearch)) ||
                   (u.memberCode && normalizeText(u.memberCode).includes(normalizeText(adminRegStudentSearch))))
                );

                const enrolledList = (selectedCls.studentIds || [])
                  .map(id => usersList.find(u => u.id === id))
                  .filter((u): u is typeof usersList[0] => u !== undefined);
                const filteredEnrolledList = enrolledList.filter(s =>
                  adminEnrolledSearch.trim() === '' ||
                  normalizeText(s.fullName).includes(normalizeText(adminEnrolledSearch)) ||
                  normalizeText(s.email).includes(normalizeText(adminEnrolledSearch)) ||
                  (s.memberCode && normalizeText(s.memberCode).includes(normalizeText(adminEnrolledSearch))) ||
                  (s.dni && normalizeText(s.dni).includes(normalizeText(adminEnrolledSearch)))
                );

                const leadersCount = enrolledList.filter(s => (selectedCls.studentRoles?.[s.id] || s.danceRole || 'follower') === 'leader').length;
                const followersCount = enrolledList.filter(s => (selectedCls.studentRoles?.[s.id] || s.danceRole || 'follower') === 'follower').length;

                return (
                  <div className="space-y-6">
                    {/* Regular Class Assignment Header Banner */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#56554e]/20 border border-[#e7d9cf]/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setRegSubTab('lista')}
                            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition flex items-center gap-2 shadow shrink-0 cursor-pointer"
                            title="Volver al Listado de Clases Regulares"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden xs:inline">Volver a Clases Regulares</span>
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#111111] text-[#e7d9cf] text-[10px] font-extrabold uppercase border border-[#e7d9cf]/30">
                                {selectedCls.day} • {selectedCls.time}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase border border-amber-500/30">
                                {selectedCls.price || '$45.000 / mes'}
                              </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-[#eeede9] uppercase tracking-tight truncate mt-1">
                              Asignación: {selectedCls.level}
                            </h3>
                            <p className="text-xs text-[#e7d9cf] font-medium">
                              {selectedCls.address} • Instructores: {selectedCls.instructor}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                          <span className="px-3 py-1.5 rounded-xl bg-[#111111] text-[#eeede9] border border-[#56554e]/60 text-xs font-bold">
                            🕺 Leaders: <strong className="text-[#e7d9cf]">{leadersCount}</strong>
                          </span>
                          <span className="px-3 py-1.5 rounded-xl bg-[#111111] text-[#eeede9] border border-[#56554e]/60 text-xs font-bold">
                            💃 Followers: <strong className="text-[#e7d9cf]">{followersCount}</strong>
                          </span>
                          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                            Total: {enrolledList.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Assignment & Management Panel */}
                    <div className="bg-[#111111] border border-[#e7d9cf]/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                      {/* Candidate Student Selection */}
                      <div className="p-5 rounded-2xl bg-[#1c1b1a] border border-[#56554e]/50 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-emerald-400" />
                            <span>Asignar Alumno (Requisito: Nivel 2 Completado)</span>
                          </h4>
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            Directores Excluidos
                          </span>
                        </div>

                        {/* Search Bar for Candidate Students */}
                        <div className="relative">
                          <Search className="w-4 h-4 text-[#e7d9cf]/50 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Buscar alumno Nivel 2 por nombre, email o DNI..."
                            value={adminRegStudentSearch}
                            onChange={e => setAdminRegStudentSearch(e.target.value)}
                            className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl pl-9 pr-8 py-2.5 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf] transition placeholder:text-[#eeede9]/40"
                          />
                          {adminRegStudentSearch && (
                            <button
                              onClick={() => setAdminRegStudentSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#eeede9]/50 hover:text-[#eeede9] transition cursor-pointer"
                              title="Limpiar búsqueda"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Scrollable List of Candidate Students */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5 px-1">
                            <span className="text-[10px] font-bold text-[#e7d9cf] uppercase tracking-wider">
                              Alumnos Elegibles ({candidateStudents.length})
                            </span>
                            {adminStudentAssignId && (
                              <span className="text-[10px] text-emerald-400 font-bold">
                                ✓ 1 alumno seleccionado
                              </span>
                            )}
                          </div>

                          <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 bg-[#111111] rounded-2xl border border-[#56554e]/60">
                            {candidateStudents.length === 0 ? (
                              <div className="py-6 text-center space-y-1">
                                <p className="text-xs text-[#eeede9]/60 font-medium">
                                  {adminRegStudentSearch.trim()
                                    ? `No se encontraron alumnos Nivel 2 que coincidan con "${adminRegStudentSearch}"`
                                    : 'No hay alumnos disponibles con Nivel 2 Completado para asignar.'}
                                </p>
                                <p className="text-[10px] text-[#e7d9cf]/40">
                                  (Solo pueden sumarse quienes hayan aprobado el Nivel 2 y no estén ya asignados)
                                </p>
                              </div>
                            ) : (
                              candidateStudents.map(s => {
                                const isSelected = s.id === adminStudentAssignId;
                                return (
                                  <div
                                    key={`candidate-item-${s.id}`}
                                    onClick={() => {
                                      setAdminStudentAssignId(isSelected ? '' : s.id);
                                      if (!isSelected && s.danceRole) {
                                        const normRole = String(s.danceRole).toLowerCase();
                                        if (normRole === 'leader' || normRole === 'follower') {
                                          setAdminAssignRole(normRole as 'leader' | 'follower');
                                        }
                                      }
                                    }}
                                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                                      isSelected
                                        ? 'bg-[#e7d9cf]/15 border-[#e7d9cf] shadow-md'
                                        : 'bg-[#1c1b1a]/80 border-[#56554e]/40 hover:border-[#e7d9cf]/50 hover:bg-[#1c1b1a]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[#56554e]/30 flex-shrink-0 border border-[#56554e]/60 flex items-center justify-center text-xs font-black text-[#e7d9cf]">
                                        {s.photoUrl ? (
                                          <img src={s.photoUrl} alt={s.fullName} className="w-full h-full object-cover" />
                                        ) : (
                                          s.fullName.substring(0, 2).toUpperCase()
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <h5 className="text-xs font-bold text-[#eeede9] truncate">{s.fullName}</h5>
                                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 font-extrabold rounded border border-emerald-500/30 flex-shrink-0">
                                            ✓ Nivel 2
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-[#eeede9]/60 truncate">
                                          {s.memberCode ? `DNI/Código: ${s.memberCode} • ` : ''}{s.email}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button
                                        type="button"
                                        className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                          isSelected
                                            ? 'bg-[#e7d9cf] text-[#111111]'
                                            : 'bg-[#56554e]/40 text-[#eeede9]/80 hover:bg-[#56554e]/70'
                                        }`}
                                      >
                                        {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Selected Student Confirmation & Assign Action Bar */}
                        {adminStudentAssignId && (
                          <div className="p-3.5 bg-[#111111] border border-[#e7d9cf]/50 rounded-2xl space-y-3 animate-fadeIn">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#56554e]/40 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#e7d9cf]">Alumno Seleccionado:</span>
                                <strong className="text-xs font-black text-[#eeede9]">
                                  {usersList.find(u => u.id === adminStudentAssignId)?.fullName}
                                </strong>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAdminStudentAssignId('')}
                                className="text-[10px] text-[#eeede9]/60 hover:text-rose-400 font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>Cancelar Selección</span>
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#e7d9cf]">Rol para esta clase:</span>
                                <div className="flex items-center gap-1.5 bg-[#1c1b1a] p-1 border border-[#56554e]/60 rounded-xl">
                                  <button
                                    type="button"
                                    onClick={() => setAdminAssignRole('follower')}
                                    className={`py-1 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                                      adminAssignRole === 'follower'
                                        ? 'bg-[#e7d9cf] text-[#111111] font-black shadow'
                                        : 'text-[#e7d9cf]/60 hover:text-[#e7d9cf]'
                                    }`}
                                  >
                                    💃 Follower
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAdminAssignRole('leader')}
                                    className={`py-1 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                                      adminAssignRole === 'leader'
                                        ? 'bg-[#e7d9cf] text-[#111111] font-black shadow'
                                        : 'text-[#e7d9cf]/60 hover:text-[#e7d9cf]'
                                    }`}
                                  >
                                    🕺 Leader
                                  </button>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  assignStudentToRegularClass(selectedCls.id, adminStudentAssignId, adminAssignRole);
                                  setAdminStudentAssignId('');
                                  setLiveToast({
                                    title: 'Alumno Asignado',
                                    message: 'El alumno ha sido asignado a la clase regular con éxito.'
                                  });
                                }}
                                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition flex items-center gap-2 shadow-lg cursor-pointer"
                              >
                                <UserPlus className="w-4 h-4" />
                                <span>Confirmar y Asignar Alumno</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Table of Enrolled Students */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <h4 className="text-xs font-black uppercase text-[#e7d9cf] tracking-wider">
                            Alumnos Actualmente Asignados ({filteredEnrolledList.length} / {enrolledList.length})
                          </h4>
                          <div className="w-full sm:w-64">
                            <input
                              type="text"
                              placeholder="Buscar en alumnos asignados..."
                              value={adminEnrolledSearch}
                              onChange={e => setAdminEnrolledSearch(e.target.value)}
                              className="w-full bg-[#1c1b1a] border border-[#56554e]/60 rounded-xl px-3 py-1.5 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                            />
                          </div>
                        </div>

                        {filteredEnrolledList.length === 0 ? (
                          <div className="p-8 text-center bg-[#1c1b1a] border border-[#56554e]/30 rounded-2xl">
                            <p className="text-xs text-[#eeede9]/60 font-medium">
                              {enrolledList.length === 0
                                ? 'No hay alumnos asignados a esta clase regular.'
                                : 'No se encontraron alumnos con el filtro especificado.'}
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-[#56554e]/40">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-[#1c1b1a] text-[#e7d9cf] uppercase text-[10px] font-black tracking-wider border-b border-[#56554e]/40">
                                  <th className="p-3.5">Alumno</th>
                                  <th className="p-3.5">DNI / Código</th>
                                  <th className="p-3.5">Rol Asignado</th>
                                  <th className="p-3.5 text-right">Acción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#56554e]/30 bg-[#111111]/40">
                                {filteredEnrolledList.map(st => {
                                  const currentRole = selectedCls.studentRoles?.[st.id] || st.danceRole || 'follower';
                                  return (
                                    <tr key={`reg-std-assigned-${st.id}`} className="hover:bg-[#56554e]/20 transition">
                                      <td className="p-3.5">
                                        <div className="flex items-center gap-3">
                                          <img
                                            src={st.avatarUrl || DEFAULT_AVATAR_URL}
                                            alt={st.fullName}
                                            className="w-8 h-8 rounded-full object-cover border border-[#56554e]"
                                          />
                                          <div>
                                            <strong className="text-[#eeede9] block font-bold text-xs">{st.fullName}</strong>
                                            <span className="text-[10px] text-[#e7d9cf]/70 font-mono block">{st.email}</span>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="p-3.5 text-[#eeede9]/80 font-mono text-[11px]">
                                        {st.memberCode || st.dni || 'Sin DNI'}
                                      </td>

                                      <td className="p-3.5">
                                        <select
                                          value={currentRole}
                                          onChange={e => {
                                            const newRole = e.target.value as DanceRole;
                                            updateStudentRegularClassRole(selectedCls.id, st.id, newRole);
                                            setLiveToast({
                                              title: 'Rol Actualizado',
                                              message: `Se cambió el rol de ${st.fullName} a ${newRole}.`
                                            });
                                          }}
                                          className="bg-[#1c1b1a] border border-[#56554e] rounded-lg px-2.5 py-1 text-xs font-bold text-[#eeede9] focus:outline-none cursor-pointer"
                                        >
                                          <option value="follower">Follower</option>
                                          <option value="leader">Leader</option>
                                        </select>
                                      </td>

                                      <td className="p-3.5 text-right">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setUnassigningRegStudent({
                                              classId: selectedCls.id,
                                              studentId: st.id,
                                              studentName: st.fullName,
                                              className: selectedCls.level
                                            });
                                          }}
                                          className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                                        >
                                          <UserMinus className="w-3.5 h-3.5" />
                                          <span>Desasignar</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 1: FORMACIONES MANAGEMENT */}
          {activeTab === 'convocatorias' && (
            <div className="space-y-6">
              {convSubTab === 'lista' && (
                <div className="space-y-6">
                  {/* Header & Nueva Formación Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#56554e]/40">
                    <div>
                      <h3 className="text-sm font-extrabold uppercase text-[#eeede9] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#e7d9cf]" />
                        <span>Formaciones ({convocatorias.length})</span>
                      </h3>
                      <p className="text-xs text-[#e7d9cf]">
                        Creá y administrá las formaciones periódicas, sus precios, medios de cobro y asignación de alumnos.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (!showCreateForm && paymentMethods.length > 0) {
                          const pm = paymentMethods.find(p => p.id === newPaymentMethodId) || paymentMethods[0];
                          if (pm) {
                            setNewPaymentMethodId(pm.id);
                            setNewAlias(pm.alias || '');
                            setNewCbu(pm.cbu || '');
                            setNewHolder(pm.holder || '');
                            setNewBank(pm.bank || '');
                          }
                        }
                        setShowCreateForm(!showCreateForm);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-extrabold text-xs transition flex items-center gap-1.5 shadow self-start sm:self-auto shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{showCreateForm ? 'Cancelar' : 'Nueva Formación'}</span>
                    </button>
                  </div>

              {/* Create Formación Form */}
              {showCreateForm && (
                <form onSubmit={handleCreateConvocatoria} className="p-5 rounded-2xl bg-[#56554e]/30 border border-[#e7d9cf]/40 space-y-4">
                  <h4 className="font-extrabold text-xs uppercase text-[#e7d9cf]">Crear Nueva Formación</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Nivel</label>
                      <select
                        value={newLevelId}
                        onChange={(e) => setNewLevelId(e.target.value as 'nivel-1' | 'nivel-2')}
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9] font-bold"
                      >
                        <option value="nivel-1">Nivel 1</option>
                        <option value="nivel-2">Nivel 2</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Título de la Formación</label>
                      <input
                        type="text"
                        placeholder="Ej: Nivel 1 — Noviembre 2025 a Enero 2026"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Período de Cursada</label>
                      <input
                        type="text"
                        placeholder="Ej: Noviembre 2025 — Enero 2026"
                        value={newPeriod}
                        onChange={(e) => setNewPeriod(e.target.value)}
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Precio Individual</label>
                      <input
                        type="text"
                        placeholder="Ej: $45.000"
                        value={newPriceInd}
                        onChange={(e) => setNewPriceInd(e.target.value)}
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Precio Pareja</label>
                      <input
                        type="text"
                        placeholder="Ej: $80.000 ($40.000 c/u)"
                        value={newPriceCpl}
                        onChange={(e) => setNewPriceCpl(e.target.value)}
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                      />
                    </div>
                  </div>

                  {/* Programación, Horario, Ubicación y Versión de Recaps Subform */}
                  <div className="pt-3 border-t border-[#56554e]/40 space-y-3">
                    <h5 className="text-[11px] font-extrabold uppercase text-[#e7d9cf] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-300" />
                      <span>Programación de Cursada, Ubicación y Versión de Recaps</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Día Semanal</label>
                        <select
                          value={newClassDay}
                          onChange={(e) => setNewClassDay(e.target.value)}
                          className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                        >
                          <option value="Lunes">Lunes</option>
                          <option value="Martes">Martes</option>
                          <option value="Miércoles">Miércoles</option>
                          <option value="Jueves">Jueves</option>
                          <option value="Viernes">Viernes</option>
                          <option value="Sábado">Sábado</option>
                          <option value="Domingo">Domingo</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Horario Inicio</label>
                        <input
                          type="text"
                          placeholder="Ej: 20:00"
                          value={newClassStartTime}
                          onChange={(e) => setNewClassStartTime(e.target.value)}
                          className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Horario Fin</label>
                        <input
                          type="text"
                          placeholder="Ej: 21:30"
                          value={newClassEndTime}
                          onChange={(e) => setNewClassEndTime(e.target.value)}
                          className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Lugar / Sede de Cursada</label>
                        <input
                          type="text"
                          placeholder="Ej: Sede Central Scalabrini Ortiz 1240, Palermo — CABA"
                          value={newLocationName}
                          onChange={(e) => setNewLocationName(e.target.value)}
                          className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Link Google Maps</label>
                        <input
                          type="url"
                          placeholder="https://maps.google.com/..."
                          value={newLocationMapUrl}
                          onChange={(e) => setNewLocationMapUrl(e.target.value)}
                          className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-[#111111]/80 rounded-xl border border-amber-500/40">
                      <label className="block text-[10px] font-extrabold uppercase text-amber-300 mb-1">
                        Versión de Recaps Asignada a esta Cursada
                      </label>
                      <select
                        value={newRecapVersionId}
                        onChange={(e) => setNewRecapVersionId(e.target.value)}
                        className="w-full bg-[#111111] border border-amber-500/50 text-[#eeede9] font-bold rounded-xl px-3 py-2 text-xs focus:outline-none"
                      >
                        {((formationConfigs.find(c => c.id === newLevelId)?.recapVersions) || []).map((ver, vIdx) => (
                          <option key={`new-ver-opt-${ver.id}-${vIdx}`} value={ver.id}>
                            {ver.name} ({ver.recaps.length} recaps de clases)
                          </option>
                        ))}
                      </select>
                      <span className="block text-[10px] text-[#eeede9]/60 mt-1">
                        Esta versión de recaps se mostrará a los alumnos de esta formación sin exponer nomenclaturas de versiones.
                      </span>
                    </div>
                  </div>

                  {/* Payment Details Subform */}
                  <div className="pt-2 border-t border-[#56554e]/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h5 className="text-[11px] font-extrabold uppercase text-[#e7d9cf] flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-[#e7d9cf]" />
                        <span>Medio de Cobro & Transferencia para Alumnos</span>
                      </h5>

                      {paymentMethods.length > 0 && (
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-amber-300 uppercase">Seleccionar Medio Registrado:</label>
                          <select
                            value={newPaymentMethodId}
                            onChange={(e) => handleSelectPaymentMethodForNew(e.target.value)}
                            className="bg-[#111111] border border-amber-500/50 text-amber-300 font-bold rounded-lg px-2 py-1 text-[11px] focus:outline-none"
                          >
                            {paymentMethods.map((pm, pmIdx) => (
                              <option key={`pm-opt-new-${pm.id}-${pmIdx}`} value={pm.id}>
                                {pm.name} ({pm.alias})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Alias MP / Banco</label>
                        <input
                          type="text"
                          placeholder="Ej: BACHATA.INFLUENCE"
                          value={newAlias}
                          onChange={(e) => setNewAlias(e.target.value)}
                          className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">CBU / CVU</label>
                        <input
                          type="text"
                          placeholder="Ej: 0000003100012345678901"
                          value={newCbu}
                          onChange={(e) => setNewCbu(e.target.value)}
                          className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Titular de la Cuenta</label>
                        <input
                          type="text"
                          placeholder="Ej: Tomás e Astrid Bachata Influence"
                          value={newHolder}
                          onChange={(e) => setNewHolder(e.target.value)}
                          className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Banco / Entidad</label>
                        <input
                          type="text"
                          placeholder="Ej: Mercado Pago / Banco Galicia"
                          value={newBank}
                          onChange={(e) => setNewBank(e.target.value)}
                          className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                        />
                      </div>
                    </div>

                    {/* Certificate Delivery & Demo Recording Subform */}
                    <div className="pt-3 border-t border-[#56554e]/40 space-y-3">
                      <h5 className="text-[11px] font-extrabold uppercase text-[#e7d9cf] flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-300" />
                        <span>Entrega de Certificados & Grabación de Demos (Evento Único)</span>
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Fecha del Evento</label>
                          <input
                            type="text"
                            placeholder="Ej: Sábado 29 de Noviembre"
                            value={newCertDate}
                            onChange={(e) => setNewCertDate(e.target.value)}
                            className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Horario del Evento</label>
                          <input
                            type="text"
                            placeholder="Ej: 18:00 hs"
                            value={newCertTime}
                            onChange={(e) => setNewCertTime(e.target.value)}
                            className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Lugar / Sede</label>
                          <input
                            type="text"
                            placeholder="Ej: Sede Palermo - Av. Córdoba 1234"
                            value={newCertLocation}
                            onChange={(e) => setNewCertLocation(e.target.value)}
                            className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                          />
                        </div>
                      </div>

                      <div className="text-xs pt-1">
                        <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Link Google Maps (Ubicación Evento / Grabación Demos)</label>
                        <input
                          type="url"
                          placeholder="https://maps.google.com/..."
                          value={newCertLocationMapUrl}
                          onChange={(e) => {
                            setNewCertLocationMapUrl(e.target.value);
                            setNewDemoRecordingMapUrl(e.target.value);
                          }}
                          className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#111111] font-black text-xs transition shadow-lg"
                    >
                      Guardar Formación
                    </button>
                  </div>
                </form>
              )}

              {/* Search & Filters Bar for Formaciones */}
              {(() => {
                const filteredConvocatorias = convocatorias.filter((conv) => {
                  if (convLevelFilter !== 'todos' && conv.levelId !== convLevelFilter) return false;

                  const computedStatus = getComputedFormacionStatus(conv);
                  if (convStatusFilter !== 'todos' && computedStatus !== convStatusFilter) return false;

                  if (convSearchQuery.trim()) {
                    const q = convSearchQuery.toLowerCase();
                    const matchTitle = conv.title.toLowerCase().includes(q);
                    const matchPeriod = conv.period.toLowerCase().includes(q);
                    const matchLocation = conv.locationName ? conv.locationName.toLowerCase().includes(q) : false;
                    if (!matchTitle && !matchPeriod && !matchLocation) return false;
                  }

                  return true;
                }).sort(sortConvocatoriasNewestFirst);

                return (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/40 space-y-3">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#eeede9]/50" />
                          <input
                            type="text"
                            placeholder="Buscar por título, período, sede..."
                            value={convSearchQuery}
                            onChange={(e) => setConvSearchQuery(e.target.value)}
                            className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl pl-9 pr-8 py-2 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                          />
                          {convSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setConvSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#eeede9]/50 hover:text-[#eeede9] text-xs"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Level & Status Filters */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <select
                            value={convLevelFilter}
                            onChange={(e) => setConvLevelFilter(e.target.value as any)}
                            className="bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-xs text-[#e7d9cf] font-bold focus:outline-none focus:border-[#e7d9cf]"
                          >
                            <option value="todos">Todos los Niveles</option>
                            <option value="nivel-1">Nivel 1</option>
                            <option value="nivel-2">Nivel 2</option>
                          </select>

                          <select
                            value={convStatusFilter}
                            onChange={(e) => setConvStatusFilter(e.target.value as any)}
                            className="bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-xs text-[#e7d9cf] font-bold focus:outline-none focus:border-[#e7d9cf]"
                          >
                            <option value="todos">Todos los Estados</option>
                            <option value="activa">En Cursada (Activas)</option>
                            <option value="proxima">Próximas</option>
                            <option value="finalizada">Finalizadas</option>
                          </select>
                        </div>
                      </div>

                      {/* Counter & Clear Filters Button */}
                      <div className="flex items-center justify-between text-[11px] text-[#e7d9cf]/80 pt-1 border-t border-[#56554e]/30">
                        <span>
                          Mostrando <strong>{filteredConvocatorias.length}</strong> de <strong>{convocatorias.length}</strong> formaciones
                        </span>
                        {(convSearchQuery || convLevelFilter !== 'todos' || convStatusFilter !== 'todos') && (
                          <button
                            type="button"
                            onClick={() => {
                              setConvSearchQuery('');
                              setConvLevelFilter('todos');
                              setConvStatusFilter('todos');
                            }}
                            className="text-amber-300 hover:underline font-bold flex items-center gap-1"
                          >
                            <span>Limpiar Filtros</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* List of Formaciones */}
                    <div className="space-y-3">
                      {filteredConvocatorias.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl bg-[#56554e]/10 border border-[#56554e]/30 space-y-3">
                          <Search className="w-8 h-8 text-[#e7d9cf]/40 mx-auto" />
                          <p className="text-xs text-[#e7d9cf] font-bold">No se encontraron formaciones con los filtros aplicados.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setConvSearchQuery('');
                              setConvLevelFilter('todos');
                              setConvStatusFilter('todos');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#e7d9cf] text-[#111111] font-bold text-xs hover:bg-[#eeede9] transition"
                          >
                            Restablecer Filtros
                          </button>
                        </div>
                      ) : (
                        filteredConvocatorias.map((conv, cIdx) => {
                          const isEditing = editingConvId === conv.id;
                          const computedStatus = getComputedFormacionStatus(conv);
                          const convStudents = usersList.filter(u => conv.studentIds.includes(u.id));
                          const lCount = convStudents.filter(s => (conv.studentRoles?.[s.id] || s.danceRole || 'Leader') === 'Leader').length;
                          const fCount = convStudents.filter(s => (conv.studentRoles?.[s.id] || s.danceRole) === 'Follower').length;

                          return (
                            <div
                              key={`admin-conv-list-${conv.id}-${cIdx}`}
                              className="p-5 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/50 space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-[#56554e]/30">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full bg-[#111111] text-[#e7d9cf] text-[10px] font-extrabold uppercase border border-[#e7d9cf]/30 whitespace-nowrap shrink-0">
                                    {conv.levelId === 'nivel-1' ? 'Nivel 1' : 'Nivel 2'}
                                  </span>

                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase whitespace-nowrap shrink-0 ${
                                    computedStatus === 'activa'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : computedStatus === 'finalizada'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  }`}>
                                    {computedStatus === 'activa' ? 'En Cursada' : computedStatus === 'finalizada' ? 'Finalizada' : 'Próxima'}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {!isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedConvocatoriaId(conv.id);
                                          setConvSubTab('asignacion');
                                        }}
                                        className="px-3.5 py-1.5 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition flex items-center gap-1.5 shadow cursor-pointer"
                                        title="Asignar Alumnos y Asistencias a esta Formación"
                                      >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>Asignación</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => startEditConv(conv)}
                                        className="px-3 py-1.5 rounded-xl bg-[#56554e]/40 hover:bg-[#56554e]/80 text-[#eeede9] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                        title="Editar Datos de la Formación"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        <span>Editar</span>
                                      </button>

                                      {confirmDeleteConvId === conv.id ? (
                                        <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/60 p-1 rounded-xl">
                                          <span className="text-[11px] font-bold text-red-200 px-1">¿Eliminar?</span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteConvocatoria(conv.id);
                                              setConfirmDeleteConvId(null);
                                              if (selectedConvocatoriaId === conv.id) {
                                                const remaining = convocatorias.filter(c => c.id !== conv.id);
                                                setSelectedConvocatoriaId(remaining[0]?.id || '');
                                              }
                                              setLiveToast({
                                                title: 'Formación Eliminada',
                                                message: `Se ha eliminado "${conv.title}" correctamente.`
                                              });
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition shadow"
                                          >
                                            Sí
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setConfirmDeleteConvId(null);
                                            }}
                                            className="px-2 py-1 rounded-lg bg-[#56554e]/60 hover:bg-[#56554e] text-[#eeede9] text-xs transition"
                                          >
                                            No
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDeleteConvId(conv.id);
                                          }}
                                          className="p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-300 transition"
                                          title="Eliminar Formación"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => saveEditConv(conv.id)}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#111111] font-black text-xs transition flex items-center gap-1 shadow"
                                      >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Guardar</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingConvId(null)}
                                        className="px-3 py-1.5 rounded-xl bg-[#56554e]/40 hover:bg-[#56554e]/70 text-[#eeede9] font-bold text-xs transition"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {!isEditing ? (
                                <div className="space-y-2">
                                  <h4 className="font-extrabold text-sm text-[#eeede9]">{conv.title}</h4>
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#e7d9cf] font-medium">
                                    <span className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>{conv.period}</span>
                                    </span>
                                    <span className="flex items-center gap-1 text-emerald-300">
                                      <DollarSign className="w-3.5 h-3.5" />
                                      <span>Ind: {conv.priceIndividual || '$45.000'} | Pareja: {conv.priceCouple || '$80.000'}</span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 pt-1">
                                    <span className="px-2.5 py-1 rounded-xl bg-[#111111]/80 border border-blue-500/30 text-blue-300 text-[11px] font-extrabold flex items-center gap-1">
                                      🕺 {lCount} Leaders
                                    </span>
                                    <span className="px-2.5 py-1 rounded-xl bg-[#111111]/80 border border-purple-500/30 text-purple-300 text-[11px] font-extrabold flex items-center gap-1">
                                      💃 {fCount} Followers
                                    </span>
                                    <span className="text-[11px] font-bold text-[#e7d9cf] ml-1">
                                      ({conv.studentIds.length} Alumnos en total)
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3 pt-2 text-xs">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">Título</label>
                                      <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                                      />
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">Período</label>
                              <input
                                type="text"
                                value={editPeriod}
                                onChange={(e) => setEditPeriod(e.target.value)}
                                className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">Precio Individual</label>
                              <input
                                type="text"
                                value={editPriceInd}
                                onChange={(e) => setEditPriceInd(e.target.value)}
                                className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">Precio Pareja</label>
                              <input
                                type="text"
                                value={editPriceCpl}
                                onChange={(e) => setEditPriceCpl(e.target.value)}
                                className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                              />
                            </div>
                          </div>

                          {/* Scheduling & Location & Recap Version Edit Section */}
                          <div className="p-3 bg-[#111111]/60 rounded-xl border border-[#56554e]/40 space-y-2">
                            <span className="text-[10px] font-extrabold uppercase text-[#e7d9cf] block flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-300" />
                              <span>Programación, Sede y Versión de Recaps</span>
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">Día Semanal</label>
                                <select
                                  value={editClassDay}
                                  onChange={(e) => setEditClassDay(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                >
                                  <option value="Lunes">Lunes</option>
                                  <option value="Martes">Martes</option>
                                  <option value="Miércoles">Miércoles</option>
                                  <option value="Jueves">Jueves</option>
                                  <option value="Viernes">Viernes</option>
                                  <option value="Sábado">Sábado</option>
                                  <option value="Domingo">Domingo</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">Horario Inicio</label>
                                <input
                                  type="text"
                                  value={editClassStartTime}
                                  onChange={(e) => setEditClassStartTime(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">Horario Fin</label>
                                <input
                                  type="text"
                                  value={editClassEndTime}
                                  onChange={(e) => setEditClassEndTime(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">Sede / Lugar</label>
                                <input
                                  type="text"
                                  value={editLocationName}
                                  onChange={(e) => setEditLocationName(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">Link Google Maps</label>
                                <input
                                  type="url"
                                  value={editLocationMapUrl}
                                  onChange={(e) => setEditLocationMapUrl(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                />
                              </div>
                            </div>

                            <div className="pt-2 border-t border-[#56554e]/30">
                              <label className="block text-[9px] uppercase font-bold text-amber-300 mb-1">
                                Versión de Recaps Asignada
                              </label>
                              <select
                                value={editRecapVersionId}
                                onChange={(e) => setEditRecapVersionId(e.target.value)}
                                className="w-full bg-[#111111] border border-amber-500/50 text-amber-300 font-bold rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                              >
                                {((formationConfigs.find(c => c.id === conv.levelId)?.recapVersions) || []).map((ver, vIdx) => (
                                  <option key={`edit-ver-opt-${ver.id}-${vIdx}`} value={ver.id}>
                                    {ver.name} ({ver.recaps.length} recaps)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="p-3 bg-[#111111]/60 rounded-xl border border-[#56554e]/40 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-[#56554e]/40">
                              <span className="text-[10px] font-extrabold uppercase text-[#e7d9cf]">Medio de Cobro Vinculado</span>
                              {paymentMethods.length > 0 && (
                                <select
                                  value={editPaymentMethodId}
                                  onChange={(e) => handleSelectPaymentMethodForEdit(e.target.value)}
                                  className="bg-[#111111] border border-amber-500/50 text-amber-300 font-bold rounded-lg px-2 py-1 text-[10px] focus:outline-none"
                                >
                                  {paymentMethods.map((pm, pmIdx) => (
                                    <option key={`pm-opt-edit-${pm.id}-${pmIdx}`} value={pm.id}>
                                      {pm.name} ({pm.alias})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">Alias</label>
                                <input
                                  type="text"
                                  value={editAlias}
                                  onChange={(e) => setEditAlias(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">CBU/CVU</label>
                                <input
                                  type="text"
                                  value={editCbu}
                                  onChange={(e) => setEditCbu(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">Titular</label>
                                <input
                                  type="text"
                                  value={editHolder}
                                  onChange={(e) => setEditHolder(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">Banco</label>
                                <input
                                  type="text"
                                  value={editBank}
                                  onChange={(e) => setEditBank(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Certificate & Demo Recording Edit Section */}
                          <div className="p-3 bg-[#111111]/60 rounded-xl border border-[#56554e]/40 space-y-2">
                            <span className="text-[10px] font-extrabold uppercase text-[#e7d9cf] block flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-amber-300" />
                              <span>Entrega de Certificados & Grabación de Demos (Evento Único)</span>
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">Fecha del Evento</label>
                                <input
                                  type="text"
                                  placeholder="Ej: Sábado 29 de Noviembre"
                                  value={editCertDate}
                                  onChange={(e) => setEditCertDate(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">Horario</label>
                                <input
                                  type="text"
                                  placeholder="Ej: 18:00 hs"
                                  value={editCertTime}
                                  onChange={(e) => setEditCertTime(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] uppercase text-[#eeede9]/60">Lugar / Sede</label>
                                <input
                                  type="text"
                                  placeholder="Ej: Sede Palermo - Av. Córdoba 1234"
                                  value={editCertLocation}
                                  onChange={(e) => setEditCertLocation(e.target.value)}
                                  className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                                />
                              </div>
                            </div>

                            <div className="pt-1">
                              <label className="block text-[9px] uppercase text-[#eeede9]/60">Link Google Maps (Ubicación Evento / Grabación Demos)</label>
                              <input
                                type="url"
                                placeholder="https://maps.google.com/..."
                                value={editCertLocationMapUrl}
                                onChange={(e) => {
                                  setEditCertLocationMapUrl(e.target.value);
                                  setEditDemoRecordingMapUrl(e.target.value);
                                }}
                                className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                              />
                            </div>
                          </div>

                          {/* Fechas de Clases (Recaps & Graduación) Edit Section */}
                          <div className="p-3 bg-[#111111]/80 rounded-xl border border-[#56554e]/40 space-y-2.5">
                            <div className="flex items-center justify-between pb-1 border-b border-[#56554e]/30">
                              <span className="text-[10px] font-extrabold uppercase text-[#e7d9cf] flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                                <span>Fechas de las 8 Clases (Recaps & Graduación)</span>
                              </span>
                            </div>
                            <p className="text-[11px] text-[#e7d9cf]/80 leading-tight">
                              💡 Al ingresar la fecha de cada clase, el recap se habilitará automáticamente a las 23:00 hs. El día posterior a la Clase 8, los alumnos con 75%+ de asistencia se marcarán como graduados.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              {Array.from({ length: 8 }).map((_, i) => (
                                <div key={`conv-date-edit-${conv.id}-${i}`}>
                                  <label className="block text-[9px] font-extrabold uppercase text-[#eeede9]/70 mb-0.5">
                                    Clase {i + 1}
                                  </label>
                                  <input
                                    type="date"
                                    value={tempClassDates[i] || ''}
                                    onChange={(e) => {
                                      const next = [...tempClassDates];
                                      next[i] = e.target.value;
                                      setTempClassDates(next);
                                    }}
                                    className="w-full bg-[#111111] border border-[#56554e]/80 rounded-xl px-2.5 py-1.5 text-[11px] text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}
    </div>
  )}

  {convSubTab === 'asignacion' && (
    <div className="space-y-6">
      {/* Formación Assignment Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#56554e]/20 border border-[#e7d9cf]/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConvSubTab('lista')}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition flex items-center gap-2 shadow shrink-0 cursor-pointer"
              title="Volver al Listado de Formaciones"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Volver a Formaciones</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#111111] text-[#e7d9cf] text-[10px] font-extrabold uppercase border border-[#e7d9cf]/30">
                  {currentConv?.levelId === 'nivel-1' ? 'Nivel 1' : 'Nivel 2'}
                </span>
                {currentConv && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    getComputedFormacionStatus(currentConv) === 'activa'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : getComputedFormacionStatus(currentConv) === 'finalizada'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}>
                    {getComputedFormacionStatus(currentConv) === 'activa' ? 'En Cursada' : getComputedFormacionStatus(currentConv) === 'finalizada' ? 'Finalizada' : 'Próxima'}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#eeede9] uppercase tracking-tight truncate mt-1">
                Asignación: {currentConv?.title || 'Formación'}
              </h3>
              <p className="text-xs text-[#e7d9cf] font-medium">
                {currentConv?.period} • {currentConv?.studentIds?.length || 0} alumno(s) asignados
              </p>
            </div>
          </div>
        </div>
      </div>

      {!currentConv && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-bold flex items-center gap-2">
          <span>⚠️ Por favor, seleccioná una formación desde el listado para gestionar alumnos y asistencias.</span>
        </div>
      )}

      {/* Leaders vs Followers Balance Banner */}
      {currentConv && (
        <div className="p-4 rounded-2xl bg-[#111111] border border-[#e7d9cf]/30 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 font-black text-sm flex items-center justify-center border border-blue-500/30">
              🕺
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#e7d9cf] block">Leaders (Líderes)</span>
              <span className="text-sm font-black text-[#eeede9]">
                {enrolledStudents.filter(s => (currentConv.studentRoles?.[s.id] || s.danceRole || 'Leader') === 'Leader').length} alumno(s)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 font-black text-sm flex items-center justify-center border border-purple-500/30">
              💃
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#e7d9cf] block">Followers (Seguidores)</span>
              <span className="text-sm font-black text-[#eeede9]">
                {enrolledStudents.filter(s => (currentConv.studentRoles?.[s.id] || s.danceRole) === 'Follower').length} alumna(s)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            {(() => {
              const leaders = enrolledStudents.filter(s => (currentConv.studentRoles?.[s.id] || s.danceRole || 'Leader') === 'Leader').length;
              const followers = enrolledStudents.filter(s => (currentConv.studentRoles?.[s.id] || s.danceRole) === 'Follower').length;
              if (leaders === followers) {
                return (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black flex items-center gap-1">
                    <span>⚖️ Balance Parejo (1:1)</span>
                  </span>
                );
              }
              return (
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black flex items-center gap-1">
                  <span>⚠️ {Math.abs(leaders - followers)} {leaders > followers ? 'Leaders más' : 'Followers más'}</span>
                </span>
              );
            })()}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#56554e] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar alumno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl pl-9 pr-3 py-2 text-xs text-[#eeede9] placeholder-[#56554e] focus:outline-none focus:border-[#e7d9cf]"
          />
        </div>

        <span className="text-xs text-[#e7d9cf] font-extrabold uppercase">
          {enrolledStudents.length} Alumno(s) en esta Formación
        </span>
      </div>

      {/* Enrolled Students Attendance Cards */}
      <div className="space-y-3">
        {enrolledStudents.length === 0 ? (
          <div className="p-8 text-center bg-[#56554e]/10 border border-[#56554e]/30 rounded-2xl space-y-2">
            <p className="text-xs text-[#eeede9]/60 font-bold">No hay alumnos asignados a esta formación.</p>
            <p className="text-[11px] text-[#e7d9cf]">Agregá alumnos desde la lista inferior.</p>
          </div>
        ) : (
          enrolledStudents.map((student, sIdx) => {
            const currentRole = (currentConv.studentRoles?.[student.id] || student.danceRole || 'Leader') === 'Follower' ? 'Follower' : 'Leader';
            const currentEnrollmentType = currentConv.studentEnrollmentTypes?.[student.id] || 'individual';
            const currentPartnerId = currentConv.studentPartners?.[student.id] || '';
            const assignedPartner = currentPartnerId ? enrolledStudents.find(p => p.id === currentPartnerId) : null;

            return (
              <div
                key={`enrolled-${student.id}-${sIdx}`}
                className="p-3.5 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/50 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={student.avatarUrl || DEFAULT_AVATAR_URL}
                    alt={student.fullName}
                    className="w-10 h-10 rounded-xl object-cover border border-[#e7d9cf]/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-[#eeede9] truncate">{student.fullName}</h4>
                    <p className="text-[11px] text-[#e7d9cf] truncate">
                      {student.email} {student.dni ? `• DNI: ${student.dni}` : ''}
                    </p>
                    {currentEnrollmentType === 'pareja' && (
                      <p className="text-[10px] text-emerald-300 font-extrabold truncate flex items-center gap-1 mt-0.5">
                        {assignedPartner ? (
                          <span>👥 Pareja: <strong className="text-[#eeede9]">{assignedPartner.fullName}</strong></span>
                        ) : (
                          <span className="text-amber-300 font-medium">⚠️ Sin pareja asignada</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Student Role Selector */}
                  <div className="flex items-center gap-1.5 bg-[#111111]/80 px-2.5 py-1.5 rounded-xl border border-amber-500/40">
                    <span className="text-[10px] uppercase font-bold text-[#e7d9cf]">Rol:</span>
                    <select
                      value={currentRole}
                      onChange={(e) => updateStudentConvocatoriaRole(currentConv.id, student.id, e.target.value as DanceRole)}
                      className="bg-transparent text-amber-300 font-extrabold text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="Leader" className="bg-[#111111] text-white">🕺 Leader</option>
                      <option value="Follower" className="bg-[#111111] text-white">💃 Follower</option>
                    </select>
                  </div>

                  {/* Enrollment Type Selector */}
                  <div className="flex items-center gap-1.5 bg-[#111111]/80 px-2.5 py-1.5 rounded-xl border border-emerald-500/40">
                    <span className="text-[10px] uppercase font-bold text-[#e7d9cf]">Modo:</span>
                    <select
                      value={currentEnrollmentType}
                      onChange={(e) => updateStudentConvocatoriaEnrollmentType(currentConv.id, student.id, e.target.value as EnrollmentType)}
                      className="bg-transparent text-emerald-300 font-extrabold text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="individual" className="bg-[#111111] text-white">👤 Individual</option>
                      <option value="pareja" className="bg-[#111111] text-white">👥 En Pareja</option>
                    </select>
                  </div>

                  {/* Partner Selector (if En Pareja) */}
                  {currentEnrollmentType === 'pareja' && (
                    <div className="flex items-center gap-1.5 bg-[#111111]/80 px-2.5 py-1.5 rounded-xl border border-sky-500/40">
                      <span className="text-[10px] uppercase font-bold text-[#e7d9cf]">Pareja:</span>
                      <select
                        value={currentPartnerId}
                        onChange={(e) => updateStudentConvocatoriaPartner(currentConv.id, student.id, e.target.value)}
                        className="bg-transparent text-sky-300 font-extrabold text-[11px] focus:outline-none cursor-pointer max-w-[140px] truncate"
                      >
                        <option value="" className="bg-[#111111] text-white">-- Seleccionar --</option>
                        {enrolledStudents
                          .filter(p => p.id !== student.id)
                          .map(p => (
                            <option key={`partner-opt-${student.id}-${p.id}`} value={p.id} className="bg-[#111111] text-white">
                              {p.fullName}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {confirmRemoveStudentId === student.id ? (
                    <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/60 p-1.5 rounded-xl">
                      <span className="text-[11px] font-bold text-red-200 px-1">¿Quitar de la formación?</span>
                      <button
                        onClick={() => {
                          removeStudentFromConvocatoria(currentConv.id, student.id);
                          setConfirmRemoveStudentId(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition shadow"
                      >
                        Sí, quitar
                      </button>
                      <button
                        onClick={() => setConfirmRemoveStudentId(null)}
                        className="px-2 py-1 rounded-lg bg-[#56554e]/50 hover:bg-[#56554e] text-white text-xs font-bold transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmRemoveStudentId(student.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-extrabold transition border border-red-500/20"
                        title="Quitar de esta formación"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Assign Students to this Formación */}
      <div className="pt-4 border-t border-[#56554e]/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-extrabold text-xs text-[#eeede9] uppercase tracking-wider">
              Agregar Alumnos a esta Formación
            </h4>
            {currentConv?.levelId === 'nivel-2' && (
              <p className="text-[11px] font-bold text-amber-300 mt-0.5">
                🎓 Requisito Nivel 2: Sólo se muestran alumnos que hayan finalizado exitosamente el Nivel 1.
              </p>
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#eeede9]/50" />
            <input
              type="text"
              placeholder="Buscar alumno por nombre, mail o DNI..."
              value={assignSearchQuery}
              onChange={(e) => setAssignSearchQuery(e.target.value)}
              className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-2 bg-[#111111] rounded-2xl border border-[#56554e]/40">
          {allStudents
            .filter(st => {
              // Restriction: Assigning to Level 2 requires completed Level 1
              if (currentConv?.levelId === 'nivel-2') {
                const isN1Done = st.nivel1Completed || st.nivel2Completed;
                if (!isN1Done) return false;
              }

              if (!assignSearchQuery.trim()) return true;
              const q = normalizeText(assignSearchQuery);
              return (
                normalizeText(st.fullName).includes(q) ||
                normalizeText(st.email).includes(q) ||
                (st.dni && normalizeText(st.dni).includes(q)) ||
                (st.memberCode && normalizeText(st.memberCode).includes(q))
              );
            })
            .map((st, stIdx) => {
              const isEnrolledInThisConv = currentConv?.studentIds.includes(st.id);

              return (
                <div
                  key={`all-st-${st.id}-${stIdx}`}
                  className="p-3 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/40 flex items-center justify-between text-xs gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={st.avatarUrl || DEFAULT_AVATAR_URL}
                      alt={st.fullName}
                      className="w-8 h-8 rounded-xl object-cover border border-[#e7d9cf]/30 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-[#eeede9] truncate block text-xs">{st.fullName}</span>
                      <span className="text-[10px] text-[#e7d9cf] block truncate">
                        {st.email} {st.dni ? `• DNI: ${st.dni}` : ''}
                      </span>
                    </div>
                  </div>

                  {isEnrolledInThisConv ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold shrink-0">
                      ✓ Asignado
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        if (!selectedConvocatoriaId || !currentConv) {
                          alert('⚠️ Debes seleccionar una formación en el menú desplegable superior antes de asignar a un alumno.');
                          return;
                        }
                        assignStudentToConvocatoria(
                          currentConv.id, 
                          st.id, 
                          st.danceRole === 'Follower' ? 'Follower' : 'Leader'
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-[10px] transition shrink-0 shadow-sm cursor-pointer"
                    >
                      + Agregar
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  )}
</div>
)}

          {/* TAB 2: MEDIOS DE PAGO CENTRALIZADOS */}
          {activeTab === 'paymentMethods' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-[#eeede9]">
                    Medios de Pago & Cuentas Bancarias Centralizadas
                  </h3>
                  <p className="text-xs text-[#e7d9cf]">
                    Gestioná tus cuentas de transferencia. Al modificar una cuenta aquí, se actualizará automáticamente en todas las formaciones asignadas.
                  </p>
                </div>

                <button
                  onClick={() => setShowCreatePm(!showCreatePm)}
                  className="px-4 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-extrabold text-xs transition flex items-center gap-1.5 shadow self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showCreatePm ? 'Cancelar' : 'Nuevo Medio de Pago'}</span>
                </button>
              </div>

              {/* Form to create a new Payment Method */}
              {showCreatePm && (
                <form onSubmit={handleCreatePaymentMethod} className="p-5 rounded-2xl bg-[#56554e]/30 border border-amber-500/40 space-y-4">
                  <h4 className="font-extrabold text-xs uppercase text-amber-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>Registrar Nuevo Medio de Pago</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Nombre de Referencia (Interno)</label>
                      <input
                        type="text"
                        placeholder="Ej: Cuenta Principal Mercado Pago, Banco Galicia, etc."
                        value={newPmName}
                        onChange={(e) => setNewPmName(e.target.value)}
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Alias MP / Banco</label>
                      <input
                        type="text"
                        placeholder="Ej: cuenta.alias.mp"
                        value={newPmAlias}
                        onChange={(e) => setNewPmAlias(e.target.value)}
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">CBU / CVU</label>
                      <input
                        type="text"
                        placeholder="Ej: 0000003100012345678901"
                        value={newPmCbu}
                        onChange={(e) => setNewPmCbu(e.target.value)}
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Titular de la Cuenta</label>
                      <input
                        type="text"
                        placeholder="Ej: Nombre y Apellido Titular"
                        value={newPmHolder}
                        onChange={(e) => setNewPmHolder(e.target.value)}
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">Banco / Entidad</label>
                      <input
                        type="text"
                        placeholder="Ej: Mercado Pago / Banco Galicia"
                        value={newPmBank}
                        onChange={(e) => setNewPmBank(e.target.value)}
                        className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#111111] font-black text-xs transition shadow-lg"
                    >
                      Guardar Medio de Pago
                    </button>
                  </div>
                </form>
              )}

              {/* List of Payment Methods */}
              <div className="space-y-4">
                {paymentMethods.length === 0 ? (
                  <div className="p-8 text-center bg-[#56554e]/10 border border-[#56554e]/30 rounded-2xl">
                    <p className="text-xs text-[#eeede9]/60 font-bold">No tenés medios de pago registrados.</p>
                  </div>
                ) : (
                  paymentMethods.map((pm, pmIdx) => {
                    const isEditing = editingPmId === pm.id;
                    const linkedFormations = convocatorias.filter(c => c.paymentMethodId === pm.id);
                    const linkedRegClasses = regularClasses.filter(rc => rc.paymentMethodId === pm.id);

                    return (
                      <div key={`pm-card-${pm.id}-${pmIdx}`} className="p-5 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/50 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-[#56554e]/30">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase border border-amber-500/30 flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              <span>{pm.name}</span>
                            </span>
                            <span className="text-[10px] text-[#e7d9cf] font-bold">
                              ({linkedFormations.length} Formaciones, {linkedRegClasses.length} Clases Regulares)
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {!isEditing ? (
                              <>
                                <button
                                  onClick={() => startEditPm(pm)}
                                  className="p-1.5 rounded-xl bg-[#56554e]/40 hover:bg-[#56554e]/80 text-[#eeede9] transition"
                                  title="Editar Medio de Pago"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              {confirmDeletePmId === pm.id ? (
                                <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/60 p-1 rounded-xl">
                                  <span className="text-[11px] font-bold text-red-200 px-1">¿Eliminar?</span>
                                  <button
                                    onClick={() => {
                                      deletePaymentMethod(pm.id);
                                      setConfirmDeletePmId(null);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition shadow"
                                  >
                                    Sí
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeletePmId(null)}
                                    className="px-2 py-1 rounded-lg bg-[#56554e]/60 hover:bg-[#56554e] text-[#eeede9] text-xs transition"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeletePmId(pm.id)}
                                  className="p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-300 transition"
                                  title="Eliminar Medio de Pago"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              </>
                            ) : (
                              <button
                                onClick={() => saveEditPm(pm.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 text-[#111111] font-black text-xs transition flex items-center gap-1 shadow"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Guardar Cambios</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {!isEditing ? (
                          <div className="p-3 bg-[#111111]/80 rounded-xl border border-[#56554e]/40 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[9px] uppercase text-[#e7d9cf] font-extrabold block">Alias:</span>
                              <span className="font-black text-amber-300">{pm.alias}</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase text-[#e7d9cf] font-extrabold block">CBU / CVU:</span>
                              <span className="font-mono text-[#eeede9] font-bold">{pm.cbu}</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase text-[#e7d9cf] font-extrabold block">Titular:</span>
                              <span className="text-[#eeede9] font-semibold">{pm.holder}</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase text-[#e7d9cf] font-extrabold block">Banco / Entidad:</span>
                              <span className="text-[#eeede9] font-semibold">{pm.bank}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                            <div className="sm:col-span-2">
                              <label className="block text-[9px] uppercase text-[#eeede9]/60 font-bold mb-1">Nombre Referencia</label>
                              <input
                                type="text"
                                value={editPmName}
                                onChange={(e) => setEditPmName(e.target.value)}
                                className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-[#eeede9]/60 font-bold mb-1">Alias</label>
                              <input
                                type="text"
                                value={editPmAlias}
                                onChange={(e) => setEditPmAlias(e.target.value)}
                                className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-[#eeede9]/60 font-bold mb-1">CBU/CVU</label>
                              <input
                                type="text"
                                value={editPmCbu}
                                onChange={(e) => setEditPmCbu(e.target.value)}
                                className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-[#eeede9]/60 font-bold mb-1">Titular</label>
                              <input
                                type="text"
                                value={editPmHolder}
                                onChange={(e) => setEditPmHolder(e.target.value)}
                                className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase text-[#eeede9]/60 font-bold mb-1">Banco/Entidad</label>
                              <input
                                type="text"
                                value={editPmBank}
                                onChange={(e) => setEditPmBank(e.target.value)}
                                className="w-full bg-[#111111] border border-[#56554e]/60 rounded-lg px-2.5 py-1.5 text-[#eeede9]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}



          {/* TAB: ALUMNOS MANAGEMENT */}
          {activeTab === 'alumnos' && (
            <div className="p-1">
              <AdminStudentsSection />
            </div>
          )}

          {/* TAB 3: CENTRALIZED RECAPS & VERSIONS */}
          {activeTab === 'recaps' && (
            <div className="space-y-6">
              {/* Category Switcher: Formaciones vs Clases Regulares */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#56554e]/40">
                <div className="flex bg-[#111111] p-1.5 rounded-2xl border border-[#56554e]/60 w-fit">
                  <button
                    type="button"
                    onClick={() => setRecapCategory('formaciones')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                      recapCategory === 'formaciones'
                        ? 'bg-[#e7d9cf] text-[#111111] shadow'
                        : 'text-[#eeede9]/60 hover:text-[#eeede9]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Formaciones (Nivel 1 & 2)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecapCategory('regulares');
                      if (!selectedRegClassForRecapId && regularClasses.length > 0) {
                        setSelectedRegClassForRecapId(regularClasses[0].id);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                      recapCategory === 'regulares'
                        ? 'bg-[#e7d9cf] text-[#111111] shadow'
                        : 'text-[#eeede9]/60 hover:text-[#eeede9]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Clases Regulares ({regularClasses.reduce((acc, c) => acc + (c.recaps?.length || 0), 0)})</span>
                  </button>
                </div>

                <div className="text-xs text-[#e7d9cf] font-semibold">
                  {recapCategory === 'formaciones'
                    ? 'Versiones y figuras para formaciones intensivas'
                    : 'Recaps creados clase a clase para grupos regulares'}
                </div>
              </div>

              {recapCategory === 'formaciones' ? (
                <div className="space-y-6">
                  {/* Level Switcher */}
                  <div className="flex bg-[#111111] p-1.5 rounded-2xl border border-[#56554e]/60 self-start w-fit">
                    <button
                      onClick={() => {
                        setSelectedLevelId('nivel-1');
                        const n1DefaultVer = formationConfigs.find(c => c.id === 'nivel-1')?.activeRecapVersionId || 'v1';
                        setSelectedVersionForRecaps(n1DefaultVer);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                        selectedLevelId === 'nivel-1'
                          ? 'bg-[#e7d9cf] text-[#111111] shadow'
                          : 'text-[#eeede9]/60 hover:text-[#eeede9]'
                      }`}
                    >
                      Nivel 1
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLevelId('nivel-2');
                        const n2DefaultVer = formationConfigs.find(c => c.id === 'nivel-2')?.activeRecapVersionId || 'v1';
                        setSelectedVersionForRecaps(n2DefaultVer);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                        selectedLevelId === 'nivel-2'
                          ? 'bg-[#e7d9cf] text-[#111111] shadow'
                          : 'text-[#eeede9]/60 hover:text-[#eeede9]'
                      }`}
                    >
                      Nivel 2
                    </button>
                  </div>

              {/* Version Management Section */}
              <div className="p-5 rounded-2xl bg-[#56554e]/20 border border-[#e7d9cf]/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#56554e]/40">
                  <div>
                    <span className="text-xs font-black uppercase text-[#e7d9cf] block">
                      Gestión de Versiones de Recaps — {currentConfig.name}
                    </span>
                    <p className="text-xs text-[#eeede9]/80">
                      Creá distintas versiones de las 8 figuras para asignar dinámicamente a cada formación.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setNewVersionNameInput(`Versión ${(currentConfig.recapVersions?.length || 0) + 1}`);
                      setNewVersionDescInput('');
                      setShowCreateVersionModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-extrabold text-xs transition flex items-center gap-1.5 shrink-0 shadow"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Versión de Recaps</span>
                  </button>
                </div>

                {/* List of Version Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(currentConfig.recapVersions || []).map((ver, vIdx) => {
                    const isSelectedForEdit = (selectedVersionForRecaps || currentConfig.activeRecapVersionId || 'v1') === ver.id;
                    const isDefaultLevelVer = (currentConfig.activeRecapVersionId || 'v1') === ver.id;

                    return (
                      <div
                        key={`ver-card-${ver.id}-${vIdx}`}
                        className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                          isSelectedForEdit
                            ? 'bg-[#111111] border-amber-500/80 shadow-lg'
                            : 'bg-[#111111]/60 border-[#56554e]/50 hover:border-[#e7d9cf]/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-extrabold text-sm text-[#eeede9] flex items-center gap-2">
                              <span>{ver.name}</span>
                              {isDefaultLevelVer && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase border border-amber-500/30">
                                  Default Nivel
                                </span>
                              )}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#56554e]/40 text-[#e7d9cf] font-extrabold shrink-0">
                              {ver.recaps.length} Recaps
                            </span>
                          </div>
                          {ver.description && (
                            <p className="text-xs text-[#eeede9]/70 line-clamp-2">{ver.description}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#56554e]/30 text-xs">
                          <button
                            onClick={() => setSelectedVersionForRecaps(ver.id)}
                            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition flex items-center gap-1 ${
                              isSelectedForEdit
                                ? 'bg-amber-500 text-[#111111]'
                                : 'bg-[#56554e]/40 text-[#eeede9] hover:bg-[#56554e]/70'
                            }`}
                          >
                            <span>{isSelectedForEdit ? '✓ Editando Recaps' : 'Editar 8 Recaps'}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                duplicateRecapVersion(selectedLevelId, ver.id);
                                const newIndex = (currentConfig.recapVersions?.length || 0) + 1;
                                setSelectedVersionForRecaps(`v${newIndex}`);
                                setFeedbackMsg(`Se duplicó la versión "${ver.name}" correctamente.`);
                                setTimeout(() => setFeedbackMsg(null), 3000);
                              }}
                              className="p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition flex items-center gap-1 text-[11px] font-bold"
                              title="Duplicar esta versión de Recaps"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Duplicar</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditingVersionId(ver.id);
                                setEditVersionNameInput(ver.name);
                                setEditVersionDescInput(ver.description || '');
                              }}
                              className="p-1.5 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/60 text-[#eeede9] transition"
                              title="Editar Nombre y Descripción"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {(currentConfig.recapVersions?.length || 0) > 1 && (
                              <button
                                onClick={() => setConfirmDeleteVersionId(ver.id)}
                                className="p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition"
                                title="Eliminar Versión"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Confirm Delete Version Subdialog */}
                        {confirmDeleteVersionId === ver.id && (
                          <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-xl space-y-2 mt-1">
                            <span className="text-[11px] font-bold text-red-300 block">
                              ¿Eliminar la versión "{ver.name}"?
                            </span>
                            <div className="flex justify-end gap-2 text-[10px]">
                              <button
                                onClick={() => setConfirmDeleteVersionId(null)}
                                className="px-2.5 py-1 rounded-lg bg-[#56554e]/50 text-[#eeede9] font-bold"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleDeleteVersion(ver.id)}
                                className="px-2.5 py-1 rounded-lg bg-red-500 text-white font-bold"
                              >
                                Confirmar Eliminar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 8 Classes Recap Configurator for Selected Version */}
              {(() => {
                const activeVerObj = (currentConfig.recapVersions || []).find(v => v.id === (selectedVersionForRecaps || currentConfig.activeRecapVersionId || 'v1')) || (currentConfig.recapVersions || [])[0];
                const activeVerRecaps = activeVerObj?.recaps || currentConfig.recaps;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-2">
                        <span>Editando Recaps de:</span>
                        <span className="underline decoration-amber-400">{activeVerObj?.name || 'Versión 1'}</span>
                      </span>
                      <span className="text-[10px] text-amber-200 font-bold">
                        (Cambios aplicables a esta versión específica)
                      </span>
                    </div>

                    <div className="space-y-3">
                      {activeVerRecaps.map((recap, rIdx) => {
                        const isEditing = editingClassNum === recap.classNumber;

                        return (
                          <div
                            key={`recap-admin-${recap.classNumber}-${rIdx}`}
                            className="p-4 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/50 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#111111] text-[#e7d9cf]">
                                Clase {recap.classNumber}
                              </span>

                              {!isEditing ? (
                                <button
                                  onClick={() => startEditRecap(recap.classNumber, recap.title, recap.description, recap.driveUrl)}
                                  className="px-3 py-1 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-bold text-xs transition flex items-center gap-1"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Editar Recap & Drive</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => saveRecapEdit(recap.classNumber)}
                                  className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#111111] font-extrabold text-xs transition flex items-center gap-1 shadow"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Guardar Cambios</span>
                                </button>
                              )}
                            </div>

                            {!isEditing ? (
                              <div className="space-y-1 text-xs">
                                <h4 className="font-bold text-[#eeede9] text-sm">{recap.title}</h4>
                                <p className="text-[#eeede9]/80 leading-relaxed">{recap.description}</p>
                                {recap.driveUrl ? (
                                  <div className="pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setActiveVideoPlayer({
                                        url: recap.driveUrl,
                                        title: `Clase ${recap.classNumber}: ${recap.title}`,
                                        subtitle: undefined,
                                        description: recap.description,
                                      })}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition shadow cursor-pointer"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                      <span>Ver Video</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-[#e7d9cf]/50 italic">Sin enlace cargado</span>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3 pt-2 text-xs">
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                                    Título de la Clase
                                  </label>
                                  <input
                                    type="text"
                                    value={recapTitleInput}
                                    onChange={(e) => setRecapTitleInput(e.target.value)}
                                    className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                                    Resumen de Figuras Vistas
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={recapDescInput}
                                    onChange={(e) => setRecapDescInput(e.target.value)}
                                    className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                                  />
                                </div>

                                <div>
                                  <VideoUploader
                                    label="Video Recap de la Clase"
                                    placeholder="Pegá URL o subí el archivo .mp4..."
                                    folderPath="formation_recaps"
                                    value={recapUrlInput}
                                    onChange={(newUrl) => setRecapUrlInput(newUrl)}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* CLASES REGULARES RECAPS MANAGEMENT */
            <div className="space-y-6">
              {regularClasses.length === 0 ? (
                <div className="p-8 text-center bg-[#111111] border border-[#56554e]/30 rounded-3xl space-y-3">
                  <Calendar className="w-8 h-8 text-[#e7d9cf]/40 mx-auto" />
                  <p className="text-xs text-[#eeede9]/80 font-semibold">
                    No hay clases regulares registradas todavía.
                  </p>
                  <p className="text-[11px] text-[#eeede9]/50 max-w-md mx-auto">
                    Creá una clase regular desde la pestaña <strong>"Clases Regulares"</strong> para poder subir y administrar sus recaps clase a clase.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('regulares')}
                    className="px-4 py-2 rounded-xl bg-[#e7d9cf] text-[#111111] text-xs font-black transition hover:bg-[#eeede9] cursor-pointer"
                  >
                    Ir a Clases Regulares
                  </button>
                </div>
              ) : (
                (() => {
                  const effectiveSelectedClassId = selectedRegClassForRecapId || regularClasses[0]?.id || '';
                  const selectedRegCls = regularClasses.find(c => c.id === effectiveSelectedClassId) || regularClasses[0];
                  const classRecaps = selectedRegCls?.recaps || [];

                  return (
                    <div className="space-y-6">
                      {/* Class Selector Pills */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-[#e7d9cf] tracking-wider block">
                          Seleccioná la Clase Regular:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {regularClasses.map((cls) => {
                            const isSelected = cls.id === selectedRegCls.id;
                            const recapCount = cls.recaps?.length || 0;

                            return (
                              <button
                                key={`reg-recap-picker-${cls.id}`}
                                type="button"
                                onClick={() => setSelectedRegClassForRecapId(cls.id)}
                                className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#e7d9cf] text-[#111111] shadow-md'
                                    : 'bg-[#111111] text-[#eeede9]/70 border border-[#56554e]/50 hover:text-[#eeede9] hover:border-[#e7d9cf]/40'
                                }`}
                              >
                                <span className="font-extrabold">{cls.day} {cls.time}</span>
                                <span className="opacity-70">— {cls.level}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  isSelected
                                    ? 'bg-[#111111] text-[#e7d9cf]'
                                    : 'bg-white/[0.08] text-[#e7d9cf]'
                                }`}>
                                  {recapCount} {recapCount === 1 ? 'recap' : 'recaps'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected Class Header & Actions */}
                      <div className="p-5 rounded-2xl bg-[#56554e]/20 border border-[#e7d9cf]/30 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#56554e]/40">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#111111] text-[#e7d9cf] text-[10px] font-extrabold uppercase border border-[#e7d9cf]/30">
                                {selectedRegCls.day} — {selectedRegCls.time}
                              </span>
                              <span className="text-xs font-black uppercase text-[#eeede9]">
                                {selectedRegCls.level}
                              </span>
                            </div>
                            <p className="text-xs text-[#eeede9]/80">
                              Instructores: <strong className="text-[#e7d9cf]">{selectedRegCls.instructor}</strong> • Sede: {selectedRegCls.address}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const todayFormatted = new Intl.DateTimeFormat('es-AR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              }).format(new Date());
                              setNewRegRecapTitle(`Clase del ${new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date())}`);
                              setNewRegRecapDate(todayFormatted);
                              setNewRegRecapDesc('');
                              setNewRegRecapUrl('');
                              setShowAddRegRecapModal(true);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition flex items-center gap-2 shrink-0 shadow cursor-pointer border border-[#e7d9cf]"
                          >
                            <Plus className="w-4 h-4 text-[#111111]" />
                            <span>+ Subir Nuevo Recap a esta Clase</span>
                          </button>
                        </div>

                        {/* Recaps List */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-xs uppercase text-[#e7d9cf] tracking-wider flex items-center gap-2">
                              <Video className="w-4 h-4 text-[#e7d9cf]" />
                              <span>Historial de Recaps ({classRecaps.length})</span>
                            </h3>
                            <span className="text-[11px] text-[#eeede9]/60 font-medium">
                              Los recaps se crean uno a uno a medida que transcurren las clases.
                            </span>
                          </div>

                          {classRecaps.length === 0 ? (
                            <div className="p-8 text-center bg-[#111111]/70 border border-[#56554e]/40 rounded-2xl space-y-3">
                              <p className="text-xs text-[#eeede9]/80 font-medium">
                                Esta clase regular todavía no tiene ningún recap cargado.
                              </p>
                              <p className="text-[11px] text-[#eeede9]/50 max-w-sm mx-auto">
                                Subí el link de Google Drive y el detalle de figuras vistas para que los alumnos puedan repasarlas.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const todayFormatted = new Intl.DateTimeFormat('es-AR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  }).format(new Date());
                                  setNewRegRecapTitle(`Clase del ${new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date())}`);
                                  setNewRegRecapDate(todayFormatted);
                                  setNewRegRecapDesc('');
                                  setNewRegRecapUrl('');
                                  setShowAddRegRecapModal(true);
                                }}
                                className="px-4 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition cursor-pointer"
                              >
                                + Subir Primer Recap
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {classRecaps.map((recap, rIdx) => {
                                return (
                                  <div
                                    key={`reg-recap-card-${recap.id}-${rIdx}`}
                                    className="p-4 sm:p-5 rounded-3xl border transition space-y-3.5 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.45)] bg-[#181816] border-white/[0.08]"
                                  >
                                    <div className="space-y-2.5 min-w-0">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                                          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#141413] text-[#e7d9cf] border border-white/[0.08] shrink-0">
                                            Clase {rIdx + 1}
                                          </span>

                                          {recap.date && (
                                            <span className="text-[10px] font-bold text-[#e7d9cf] flex items-center gap-1 shrink-0">
                                              <Calendar className="w-3 h-3 text-[#e7d9cf]" />
                                              <span>{formatClassDate(recap.date)}</span>
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0 self-start sm:self-auto">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingRegRecapId(recap.id);
                                              setEditRegRecapTitle(recap.title || '');
                                              setEditRegRecapDate(recap.date || '');
                                              setEditRegRecapDesc(recap.description || '');
                                              setEditRegRecapUrl(recap.driveUrl || '');
                                            }}
                                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#e7d9cf] transition cursor-pointer"
                                            title="Editar Recap"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeletingRegRecapId(recap.id)}
                                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 transition cursor-pointer"
                                            title="Eliminar Recap"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="space-y-1 min-w-0">
                                        <h4 className="font-extrabold text-sm sm:text-base text-[#eeede9] leading-snug break-words">
                                          {recap.title || `Clase Regular #${rIdx + 1}`}
                                        </h4>

                                        {recap.description ? (
                                          <p className="text-xs text-[#eeede9]/80 leading-relaxed break-words whitespace-pre-line">
                                            {recap.description}
                                          </p>
                                        ) : (
                                          <p className="text-xs text-[#eeede9]/40 italic">
                                            Sin descripción de figuras.
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="pt-1">
                                      {recap.driveUrl && recap.driveUrl.trim() !== '' ? (
                                        <button
                                          type="button"
                                          onClick={() => setActiveVideoPlayer({
                                            url: recap.driveUrl,
                                            title: recap.title || `Clase Regular #${rIdx + 1}`,
                                            subtitle: recap.date ? `📅 ${formatClassDate(recap.date)}` : undefined,
                                            description: recap.description,
                                          })}
                                          className="w-full py-2.5 px-4 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition shadow-md flex items-center justify-center gap-2 group min-w-0 cursor-pointer"
                                        >
                                          <Play className="w-4 h-4 fill-current text-[#111111] shrink-0" />
                                          <span className="truncate">Ver Video</span>
                                        </button>
                                      ) : (
                                        <div className="w-full py-2.5 px-3 rounded-xl bg-[#141413] border border-white/[0.08] text-[#eeede9]/60 text-xs font-bold text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                                          <span className="truncate text-[11px] text-[#e7d9cf]/60">Sin link de video asignado</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* MODAL: ADD REGULAR CLASS RECAP */}
                      {showAddRegRecapModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                          <div className="bg-[#181816] border border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-[#e7d9cf]/20 text-[#e7d9cf] flex items-center justify-center">
                                  <Video className="w-4 h-4" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-black uppercase text-[#eeede9]">
                                    Subir Recap de Clase Regular
                                  </h3>
                                  <p className="text-[10px] text-[#e7d9cf]/70">
                                    {selectedRegCls.day} {selectedRegCls.time} — {selectedRegCls.level}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowAddRegRecapModal(false)}
                                className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] transition cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="space-y-3 text-xs">
                              <div>
                                <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                                  Título de la Clase *
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ej: Combinaciones en Cerrado & Disociación"
                                  value={newRegRecapTitle}
                                  onChange={e => setNewRegRecapTitle(e.target.value)}
                                  className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                                  Fecha de la Clase
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ej: 28 de Agosto, 2026"
                                  value={newRegRecapDate}
                                  onChange={e => setNewRegRecapDate(e.target.value)}
                                  className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                                  Resumen de Figuras Vistas
                                </label>
                                <textarea
                                  rows={3}
                                  placeholder="Describí las figuras, técnica, disociación o variaciones vistas en esta clase..."
                                  value={newRegRecapDesc}
                                  onChange={e => setNewRegRecapDesc(e.target.value)}
                                  className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                                  Link de Google Drive *
                                </label>
                                <input
                                  type="text"
                                  placeholder="https://drive.google.com/file/d/..."
                                  value={newRegRecapUrl}
                                  onChange={e => setNewRegRecapUrl(e.target.value)}
                                  className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-mono text-xs focus:outline-none focus:border-[#e7d9cf]"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                              <button
                                type="button"
                                onClick={() => setShowAddRegRecapModal(false)}
                                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] text-xs font-bold transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!newRegRecapTitle.trim()) {
                                    setLiveToast('Por favor ingresá el título de la clase');
                                    return;
                                  }
                                  addRegularClassRecap(selectedRegCls.id, {
                                    title: newRegRecapTitle.trim(),
                                    date: newRegRecapDate.trim() || new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
                                    description: newRegRecapDesc.trim(),
                                    driveUrl: newRegRecapUrl.trim()
                                  });
                                  setLiveToast('¡Recap agregado exitosamente!');
                                  setShowAddRegRecapModal(false);
                                }}
                                className="px-5 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition cursor-pointer shadow-md"
                              >
                                Guardar Recap
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MODAL: EDIT REGULAR CLASS RECAP */}
                      {editingRegRecapId && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                          <div className="bg-[#181816] border border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-[#e7d9cf]/20 text-[#e7d9cf] flex items-center justify-center">
                                  <Edit2 className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black uppercase text-[#eeede9]">
                                  Editar Recap de Clase
                                </h3>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingRegRecapId(null)}
                                className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] transition cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="space-y-3 text-xs">
                              <div>
                                <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                                  Título de la Clase *
                                </label>
                                <input
                                  type="text"
                                  value={editRegRecapTitle}
                                  onChange={e => setEditRegRecapTitle(e.target.value)}
                                  className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                                  Fecha de la Clase
                                </label>
                                <input
                                  type="text"
                                  value={editRegRecapDate}
                                  onChange={e => setEditRegRecapDate(e.target.value)}
                                  className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-black text-[#e7d9cf] mb-1">
                                  Resumen de Figuras Vistas
                                </label>
                                <textarea
                                  rows={3}
                                  value={editRegRecapDesc}
                                  onChange={e => setEditRegRecapDesc(e.target.value)}
                                  className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-3 py-2 text-[#eeede9] font-medium focus:outline-none focus:border-[#e7d9cf]"
                                />
                              </div>

                              <div>
                                <VideoUploader
                                  label="Video Recap de la Clase"
                                  placeholder="Pegá URL o subí el archivo .mp4..."
                                  folderPath="regular_classes_recaps"
                                  value={editRegRecapUrl}
                                  onChange={(newUrl) => setEditRegRecapUrl(newUrl)}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                              <button
                                type="button"
                                onClick={() => setEditingRegRecapId(null)}
                                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] text-xs font-bold transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editRegRecapTitle.trim()) {
                                    setLiveToast('El título de la clase no puede estar vacío');
                                    return;
                                  }
                                  updateRegularClassRecap(selectedRegCls.id, editingRegRecapId, {
                                    title: editRegRecapTitle.trim(),
                                    date: editRegRecapDate.trim(),
                                    description: editRegRecapDesc.trim(),
                                    driveUrl: editRegRecapUrl.trim()
                                  });
                                  setLiveToast('¡Recap actualizado exitosamente!');
                                  setEditingRegRecapId(null);
                                }}
                                className="px-5 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition cursor-pointer shadow-md"
                              >
                                Actualizar Recap
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MODAL: DELETE REGULAR CLASS RECAP CONFIRMATION */}
                      {deletingRegRecapId && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                          <div className="bg-[#181816] border border-red-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-sm font-black uppercase text-[#eeede9]">
                                  Eliminar Recap
                                </h3>
                                <p className="text-xs text-[#eeede9]/70">
                                  ¿Estás seguro de que deseás eliminar este recap de la clase regular? Esta acción no se puede deshacer.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                              <button
                                type="button"
                                onClick={() => setDeletingRegRecapId(null)}
                                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#eeede9] text-xs font-bold transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteRegularClassRecap(selectedRegCls.id, deletingRegRecapId);
                                  setLiveToast('Recap eliminado correctamente.');
                                  setDeletingRegRecapId(null);
                                }}
                                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black transition cursor-pointer shadow-md"
                              >
                                Sí, Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      )}

          {/* TAB 5: BENEFICIOS MANAGEMENT */}
          {activeTab === 'benefits' && (
            <div className="space-y-6">
              {feedbackMsg && (
                <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-emerald-200 text-xs font-bold shadow-lg animate-fadeIn">
                  <span>{feedbackMsg}</span>
                  <button
                    onClick={() => setFeedbackMsg(null)}
                    className="p-1 hover:bg-emerald-500/30 rounded-lg text-emerald-300 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Header & Quick Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#56554e]/20 p-4 rounded-2xl border border-[#56554e]/40">
                <div>
                  <h3 className="font-bold text-base text-[#eeede9] flex items-center gap-2">
                    <Gift className="w-5 h-5 text-[#e7d9cf]" />
                    <span>Gestión de Beneficios ({benefits.length})</span>
                  </h3>
                  <p className="text-xs text-[#eeede9]/70">
                    Administrá los descuentos y las categorías exclusivas del Club de Beneficios.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowCategoryManager(!showCategoryManager)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                      showCategoryManager
                        ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf]'
                        : 'bg-[#56554e]/40 text-[#e7d9cf] border-[#56554e]/60 hover:bg-[#56554e]/60'
                    }`}
                  >
                    <Tag className="w-4 h-4" />
                    <span>{showCategoryManager ? 'Ocultar Categorías' : 'Administrar Categorías'}</span>
                  </button>

                  <button
                    onClick={handleOpenCreateBenefit}
                    className="px-4 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-extrabold text-xs transition shadow-md flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Beneficio</span>
                  </button>
                </div>
              </div>

              {/* CATEGORY MANAGER SECTION (if toggled) */}
              {showCategoryManager && (
                <div className="p-5 rounded-3xl bg-[#111111] border border-[#e7d9cf]/30 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-3">
                    <h4 className="font-extrabold text-sm text-[#eeede9] flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#e7d9cf]" />
                      <span>Categorías de Beneficios</span>
                    </h4>
                    <span className="text-xs text-[#eeede9]/60 font-mono">
                      {benefitCategories.filter(c => c && c.toLowerCase() !== 'general').length} categorías registradas
                    </span>
                  </div>

                  {/* Add new category form */}
                  <form onSubmit={handleAddCategorySubmit} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nueva categoría (ej: Zapaterías, Fiestas, Indumentaria)..."
                      value={catNewName}
                      onChange={(e) => setCatNewName(e.target.value)}
                      className="flex-1 bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#e7d9cf] text-[#111111] font-bold text-xs hover:bg-[#eeede9] transition flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </button>
                  </form>

                  {/* Category list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {Array.from(new Set<string>(benefitCategories.filter(c => c && c.toLowerCase() !== 'general'))).map((cat, catIdx) => {
                      const count = benefits.filter(b => b.category === cat).length;
                      const isEditingThis = catEditOldName === cat;

                      return (
                        <div
                          key={`cat-admin-${cat}-${catIdx}`}
                          className="p-3 bg-[#56554e]/20 border border-[#56554e]/40 rounded-2xl flex items-center justify-between gap-2"
                        >
                          {isEditingThis ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={catEditNewName}
                                onChange={(e) => setCatEditNewName(e.target.value)}
                                className="flex-1 bg-[#111111] border border-[#e7d9cf] rounded-lg px-2 py-1 text-xs text-[#eeede9]"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEditCategory(cat)}
                                className="p-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 rounded-lg transition"
                                title="Guardar"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setCatEditOldName(null)}
                                className="p-1.5 bg-[#56554e]/40 text-[#eeede9] hover:bg-[#56554e]/60 rounded-lg transition"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-xs text-[#eeede9] truncate">{cat}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#56554e]/50 text-[#e7d9cf] shrink-0">
                                  {count}
                                </span>
                              </div>
                              {confirmingDeleteCategory === cat ? (
                                <div className="flex items-center gap-1.5 p-1 bg-rose-950/90 border border-rose-500/50 rounded-xl text-xs">
                                  <span className="font-bold text-rose-200 text-[11px] px-1">¿Borrar?</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteBenefitCategory(cat);
                                      setConfirmingDeleteCategory(null);
                                      setFeedbackMsg(`Categoría "${cat}" eliminada.`);
                                    }}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[11px] transition shadow"
                                  >
                                    Sí, eliminar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingDeleteCategory(null)}
                                    className="px-2 py-1 bg-[#56554e]/60 text-[#eeede9] font-medium rounded-lg text-[11px] hover:bg-[#56554e]"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCatEditOldName(cat);
                                      setCatEditNewName(cat);
                                      setConfirmingDeleteCategory(null);
                                    }}
                                    className="p-1.5 text-[#eeede9]/60 hover:text-[#e7d9cf] hover:bg-[#56554e]/40 rounded-lg transition"
                                    title="Editar nombre"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingDeleteCategory(cat)}
                                    className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition"
                                    title="Eliminar categoría"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CREATE / EDIT BENEFIT FORM */}
              {showBenefitForm && (
                <form id="benefit-form-container" onSubmit={handleSaveBenefitSubmit} className="p-5 rounded-3xl bg-[#111111] border border-[#e7d9cf]/40 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-3">
                    <h4 className="font-black text-sm text-[#e7d9cf] flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      <span>{editingBenefitId ? 'Editar Beneficio' : 'Crear Nuevo Beneficio'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowBenefitForm(false)}
                      className="p-1.5 text-[#eeede9]/60 hover:text-[#eeede9] rounded-lg transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                        Título del Beneficio *
                      </label>
                      <input
                        type="text"
                        placeholder="ej: 20% OFF en Zapatos de Gala"
                        value={bTitle}
                        onChange={(e) => setBTitle(e.target.value)}
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                        Marca / Proveedor *
                      </label>
                      <input
                        type="text"
                        placeholder="ej: Manuel Calzados, BailaConmigo"
                        value={bProvider}
                        onChange={(e) => setBProvider(e.target.value)}
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                        Etiqueta Descuento / Promo *
                      </label>
                      <input
                        type="text"
                        placeholder="ej: 15% OFF, 2x1 en Entradas, 20% DTO"
                        value={bDiscount}
                        onChange={(e) => setBDiscount(e.target.value)}
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                        Categorías <span className="text-normal text-[#e7d9cf] normal-case">(Elegí hasta 3) *</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 p-2 bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl">
                        {Array.from(new Set<string>(benefitCategories.filter(c => c && c.toLowerCase() !== 'general'))).map((cat, catIdx) => {
                          const isSelected = bCategories.includes(cat);
                          return (
                            <button
                              key={`opt-cat-${cat}-${catIdx}`}
                              type="button"
                              onClick={() => toggleBCategory(cat)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                                isSelected
                                  ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf] shadow-sm'
                                  : 'bg-[#111111]/60 text-[#eeede9]/70 border-[#56554e]/60 hover:text-[#eeede9]'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}{cat}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[10px] text-[#eeede9]/60 block mt-1">
                        Seleccionadas ({bCategories.length}/3): <strong className="text-[#e7d9cf]">{bCategories.join(' • ')}</strong>
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                        Código Promocional
                      </label>
                      <input
                        type="text"
                        placeholder="ej: TOMASYASTRID20"
                        value={bCode}
                        onChange={(e) => setBCode(e.target.value)}
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs font-mono text-[#e7d9cf] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                        Ubicación / Formato
                      </label>
                      <input
                        type="text"
                        placeholder="ej: Palermo, CABA / Compra Online"
                        value={bLocation}
                        onChange={(e) => setBLocation(e.target.value)}
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                        Link de Google Maps (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="https://maps.app.goo.gl/..."
                        value={bLocationUrl}
                        onChange={(e) => setBLocationUrl(e.target.value)}
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                        Link a Página Web / Tienda Online (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="https://tienda-ejemplo.com"
                        value={bWebsiteUrl}
                        onChange={(e) => setBWebsiteUrl(e.target.value)}
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                        Vigencia del Beneficio
                      </label>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setBExpType('indefinite');
                            setBExpDate('');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                            bExpType === 'indefinite'
                              ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf]'
                              : 'bg-[#111111]/60 text-[#eeede9]/70 border-[#56554e]/60'
                          }`}
                        >
                          ♾️ Indefinido
                        </button>
                        <button
                          type="button"
                          onClick={() => setBExpType('date')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                            bExpType === 'date'
                              ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf]'
                              : 'bg-[#111111]/60 text-[#eeede9]/70 border-[#56554e]/60'
                          }`}
                        >
                          📅 Con fecha
                        </button>
                      </div>
                      {bExpType === 'date' && (
                        <input
                          type="date"
                          value={bExpDate}
                          onChange={(e) => setBExpDate(e.target.value)}
                          className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                        />
                      )}
                    </div>

                    <div className="col-span-1 sm:col-span-2 p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="bIsHiddenCheck"
                        checked={bIsHidden}
                        onChange={(e) => setBIsHidden(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer shrink-0"
                      />
                      <label htmlFor="bIsHiddenCheck" className="text-xs text-[#eeede9] cursor-pointer font-medium">
                        <strong className="text-amber-300 block font-bold">👁️ Ocultar este beneficio a los alumnos</strong>
                        Si está activado, sólo los Directores podrán ver este beneficio en el catálogo.
                      </label>
                    </div>

                    {!editingBenefitId && (
                      <div className="col-span-1 sm:col-span-2 p-3 bg-[#e7d9cf]/10 border border-[#e7d9cf]/30 rounded-xl flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="bPublishAsAnnouncementCheck"
                          checked={bPublishAsAnnouncement}
                          onChange={(e) => setBPublishAsAnnouncement(e.target.checked)}
                          className="w-4 h-4 accent-[#e7d9cf] rounded cursor-pointer shrink-0"
                        />
                        <label htmlFor="bPublishAsAnnouncementCheck" className="text-xs text-[#eeede9] cursor-pointer font-medium">
                          <strong className="text-[#e7d9cf] block font-bold">📢 Publicar también en Anuncios</strong>
                          Crear automáticamente un aviso en el Tablón de Anuncios notificando sobre este nuevo beneficio.
                        </label>
                      </div>
                    )}

                    <div className="col-span-1 sm:col-span-2">
                      <ImageUploader
                        value={bImageUrl}
                        onChange={(val) => setBImageUrl(val || '')}
                        label="Foto del beneficio"
                        cropTitle="Encuadrar Imagen del Beneficio"
                        cropSubtitle="Ajustá y arrastrá la foto para la tarjeta del catálogo de beneficios"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                      Descripción Breve
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Describí los beneficios del convenio..."
                      value={bDesc}
                      onChange={(e) => setBDesc(e.target.value)}
                      className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#eeede9]/70 mb-1">
                      Términos y Condiciones
                    </label>
                    <input
                      type="text"
                      placeholder="ej: Presentar QR de la app en la caja..."
                      value={bTerms}
                      onChange={(e) => setBTerms(e.target.value)}
                      className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBenefitForm(false)}
                      className="px-4 py-2 rounded-xl bg-[#56554e]/40 hover:bg-[#56554e]/60 text-[#eeede9] text-xs font-bold transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black transition flex items-center gap-1.5 shadow"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingBenefitId ? 'Guardar Cambios' : 'Crear Beneficio'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* SEARCH & CATEGORY FILTER BAR */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#56554e] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por título, marca o descripción..."
                    value={benefitSearchQuery}
                    onChange={(e) => setBenefitSearchQuery(e.target.value)}
                    className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl pl-10 pr-4 py-2 text-xs text-[#eeede9] placeholder-[#56554e] focus:outline-none focus:border-[#e7d9cf]"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar shrink-0">
                  <button
                    onClick={() => setBenefitCategoryFilter('Todos')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap ${
                      benefitCategoryFilter === 'Todos'
                        ? 'bg-[#e7d9cf] text-[#111111]'
                        : 'bg-[#56554e]/30 text-[#eeede9]/70 hover:text-[#eeede9]'
                    }`}
                  >
                    Todos
                  </button>
                  {Array.from(new Set<string>(benefitCategories.filter(c => c && c.toLowerCase() !== 'general'))).map((cat, catIdx) => (
                    <button
                      key={`flt-admin-${cat}-${catIdx}`}
                      onClick={() => setBenefitCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap ${
                        benefitCategoryFilter === cat
                          ? 'bg-[#e7d9cf] text-[#111111]'
                          : 'bg-[#56554e]/30 text-[#eeede9]/70 hover:text-[#eeede9]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* BENEFITS LIST */}
              <div className="space-y-3">
                {benefits
                  .filter((ben) => {
                    const matchesCat = benefitCategoryFilter === 'Todos' || ben.category === benefitCategoryFilter;
                    const matchesSearch =
                      ben.title.toLowerCase().includes(benefitSearchQuery.toLowerCase()) ||
                      ben.provider.toLowerCase().includes(benefitSearchQuery.toLowerCase()) ||
                      ben.description.toLowerCase().includes(benefitSearchQuery.toLowerCase());
                    return matchesCat && matchesSearch;
                  })
                  .map((ben, bIdx) => (
                    <div
                      key={`ben-manage-${ben.id}-${bIdx}`}
                      className="p-4 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#e7d9cf]/40 transition"
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <img
                          src={ben.imageUrl}
                          alt={ben.title}
                          className="w-14 h-14 rounded-xl object-cover border border-[#e7d9cf]/30 shrink-0"
                        />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-[#e7d9cf] text-[#111111]">
                              {ben.discount}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#56554e]/60 text-[#e7d9cf]">
                              {ben.category}
                            </span>
                            {ben.promoCode && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                CÓD: {ben.promoCode}
                              </span>
                            )}
                            {ben.isHidden && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/50 flex items-center gap-1">
                                <EyeOff className="w-3 h-3 text-amber-300" />
                                <span>Oculto a Alumnos</span>
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-[#eeede9] truncate">{ben.title}</h4>
                          <p className="text-xs text-[#e7d9cf] font-medium">{ben.provider}</p>
                          <p className="text-[11px] text-[#eeede9]/60 line-clamp-1">{ben.description}</p>
                        </div>
                      </div>

                      {confirmingDeleteBenefitId === ben.id ? (
                        <div className="flex items-center gap-2 p-2 bg-rose-950/90 border border-rose-500/50 rounded-xl text-xs shrink-0 animate-fadeIn">
                          <span className="font-bold text-rose-200">¿Borrar?</span>
                          <button
                            type="button"
                            onClick={() => {
                              deleteBenefit(ben.id);
                              setConfirmingDeleteBenefitId(null);
                              setFeedbackMsg(`Beneficio "${ben.title}" eliminado.`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow"
                          >
                            Sí, eliminar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteBenefitId(null)}
                            className="px-3 py-1.5 rounded-lg bg-[#56554e]/60 hover:bg-[#56554e] text-[#eeede9] font-semibold transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              const newHidden = !ben.isHidden;
                              updateBenefit(ben.id, { isHidden: newHidden });
                              setFeedbackMsg(`Beneficio "${ben.title}" ${newHidden ? 'ocultado' : 'visible para alumnos'}.`);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                              ben.isHidden
                                ? 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border-amber-500/50'
                                : 'bg-[#56554e]/40 hover:bg-[#56554e]/70 text-[#e7d9cf] border-[#56554e]/60'
                            }`}
                            title={ben.isHidden ? 'Hacer visible a los alumnos' : 'Ocultar a los alumnos'}
                          >
                            {ben.isHidden ? <Eye className="w-3.5 h-3.5 text-amber-300" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{ben.isHidden ? 'Mostrar' : 'Ocultar'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingDeleteBenefitId(null);
                              handleOpenEditBenefit(ben);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#56554e]/40 hover:bg-[#56554e]/70 text-[#e7d9cf] text-xs font-bold transition flex items-center gap-1.5 border border-[#56554e]/60"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteBenefitId(ben.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 6: ANNOUNCEMENTS & CATEGORIES MANAGEMENT */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#56554e]/20 p-4 rounded-2xl border border-[#56554e]/40">
                <div>
                  <h3 className="font-bold text-base text-[#eeede9] flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-[#e7d9cf]" />
                    <span>Categorías de Anuncios y Novedades</span>
                  </h3>
                  <p className="text-xs text-[#eeede9]/70">
                    Creá, editá y organizá las categorías oficiales para clasificar los comunicados en la comunidad.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-[#111111] border border-[#e7d9cf]/30 text-xs font-bold text-[#e7d9cf] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#e7d9cf]" />
                    <span>{announcements.length} Comunicados</span>
                  </span>
                </div>
              </div>

              {/* Add New Announcement Category Card */}
              <div className="p-5 rounded-3xl bg-[#111111] border border-[#e7d9cf]/30 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-3">
                  <h4 className="font-extrabold text-sm text-[#eeede9] flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#e7d9cf]" />
                    <span>Gestión de Categorías ({announcementCategories.filter(c => c && c.toLowerCase() !== 'general').length})</span>
                  </h4>
                  <span className="text-xs text-[#eeede9]/60 font-mono">
                    Persistencia activa
                  </span>
                </div>

                {/* Form to create new announcement category */}
                <form onSubmit={handleAddAnnCategorySubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nueva categoría de anuncio (ej: Ensayos, Concursos, Fiestas)..."
                    value={annCatNewName}
                    onChange={(e) => setAnnCatNewName(e.target.value)}
                    className="flex-1 bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#e7d9cf] text-[#111111] font-bold text-xs hover:bg-[#eeede9] transition flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </button>
                </form>

                {/* List of Announcement Categories */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {Array.from(new Set<string>(announcementCategories.filter(c => c && c.toLowerCase() !== 'general'))).map((cat, cIdx) => {
                    const count = announcements.filter(a => a.category === cat).length;
                    const isEditingThis = annCatEditOldName === cat;

                    return (
                      <div
                        key={`ann-cat-admin-${cat}-${cIdx}`}
                        className="p-3.5 bg-[#56554e]/20 border border-[#56554e]/40 rounded-2xl flex items-center justify-between gap-2"
                      >
                        {isEditingThis ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={annCatEditNewName}
                              onChange={(e) => setAnnCatEditNewName(e.target.value)}
                              className="flex-1 bg-[#111111] border border-[#e7d9cf] rounded-lg px-2.5 py-1 text-xs text-[#eeede9]"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEditAnnCategory(cat)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 text-[#111111] font-bold text-xs hover:bg-emerald-400 transition"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setAnnCatEditOldName(null)}
                              className="px-2.5 py-1 rounded-lg bg-[#56554e] text-[#eeede9] text-xs hover:bg-[#56554e]/80 transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="p-1.5 rounded-lg bg-[#e7d9cf]/20 text-[#e7d9cf]">
                                <Tag className="w-3.5 h-3.5" />
                              </span>
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-[#eeede9] block truncate">{cat}</span>
                                <span className="text-[10px] text-[#eeede9]/60 block">{count} comunicado(s)</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setAnnCatEditOldName(cat);
                                  setAnnCatEditNewName(cat);
                                }}
                                className="p-1.5 rounded-lg text-[#eeede9]/70 hover:text-[#e7d9cf] hover:bg-[#56554e]/40 transition"
                                title="Editar nombre de categoría"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAnnCategoryConfirm(cat)}
                                className="p-1.5 rounded-lg text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition"
                                title="Eliminar categoría"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Announcement summary feed in Admin */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#eeede9]/60">
                  Resumen de Anuncios Publicados ({announcements.length})
                </h4>
                <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                  {announcements.map((ann, aIdx) => (
                    <div
                      key={`ann-summary-${ann.id}-${aIdx}`}
                      className="p-3.5 rounded-2xl bg-[#56554e]/20 border border-[#56554e]/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#e7d9cf]/20 text-[#e7d9cf] border border-[#e7d9cf]/30">
                            {ann.category}
                          </span>
                          <span className="text-[10px] text-[#eeede9]/50">{ann.date}</span>
                        </div>
                        <h5 className="font-bold text-[#eeede9] truncate">{ann.title}</h5>
                        <p className="text-[11px] text-[#eeede9]/70 line-clamp-1">{ann.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: GESTIÓN Y ASIGNACIÓN DE DIRECTORES */}
          {activeTab === 'directores' && (
            <div className="space-y-6">
              {/* Top Banner / Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#56554e]/20 p-4 rounded-2xl border border-[#56554e]/40">
                <div>
                  <h3 className="font-bold text-base text-[#eeede9] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#e7d9cf]" />
                    <span>Gestión y Asignación de Usuarios Directores</span>
                  </h3>
                  <p className="text-xs text-[#eeede9]/70">
                    Administrá quiénes tienen permisos de Director, promové alumnos existentes o registrá nuevos miembros del equipo directivo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-[#111111] border border-[#e7d9cf]/30 text-xs font-bold text-[#e7d9cf] flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                    <span>{usersList.filter(u => u.role === 'admin').length} Directores</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-[#56554e]/30 border border-[#56554e]/50 text-xs font-medium text-[#eeede9]/70">
                    {usersList.filter(u => u.role !== 'admin').length} Alumnos
                  </span>
                </div>
              </div>

              {/* Action Buttons: Promover vs Crear Nuevo Director */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowPromotePanel(!showPromotePanel);
                    setShowCreateDirPanel(false);
                  }}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 text-left ${
                    showPromotePanel
                      ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf]'
                      : 'bg-[#111111] border-[#e7d9cf]/30 hover:border-[#e7d9cf] text-[#eeede9]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${showPromotePanel ? 'bg-[#111111] text-[#e7d9cf]' : 'bg-[#e7d9cf]/20 text-[#e7d9cf]'}`}>
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wider">Promover Alumno Existente</h4>
                      <p className={`text-[11px] ${showPromotePanel ? 'text-[#111111]/80' : 'text-[#eeede9]/60'}`}>Asignar rol de Director a un estudiante registrado</p>
                    </div>
                  </div>
                  <Plus className={`w-4 h-4 transition-transform ${showPromotePanel ? 'rotate-45' : ''}`} />
                </button>

                <button
                  onClick={() => {
                    setShowCreateDirPanel(!showCreateDirPanel);
                    setShowPromotePanel(false);
                  }}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 text-left ${
                    showCreateDirPanel
                      ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf]'
                      : 'bg-[#111111] border-[#e7d9cf]/30 hover:border-[#e7d9cf] text-[#eeede9]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${showCreateDirPanel ? 'bg-[#111111] text-[#e7d9cf]' : 'bg-[#e7d9cf]/20 text-[#e7d9cf]'}`}>
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wider">Crear Nuevo Director</h4>
                      <p className={`text-[11px] ${showCreateDirPanel ? 'text-[#111111]/80' : 'text-[#eeede9]/60'}`}>Registrar nuevo director desde cero con clave temporal</p>
                    </div>
                  </div>
                  <Plus className={`w-4 h-4 transition-transform ${showCreateDirPanel ? 'rotate-45' : ''}`} />
                </button>
              </div>

              {/* Panel 1: Promover Alumno */}
              {showPromotePanel && (
                <motion.form
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handlePromoteStudent}
                  className="p-5 rounded-3xl bg-[#111111] border border-[#e7d9cf] space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-3">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#e7d9cf] flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      <span>Promover Alumno a Director</span>
                    </h4>
                    <span className="text-[10px] text-[#eeede9]/60">Seleccioná un usuario y asignale su título</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-[#eeede9]/70 uppercase block mb-1">
                        Seleccionar Alumno
                      </label>
                      <select
                        value={selectedStudentToPromote}
                        onChange={(e) => setSelectedStudentToPromote(e.target.value)}
                        required
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] focus:outline-none focus:border-[#e7d9cf]"
                      >
                        <option value="" className="bg-[#111111] text-[#eeede9]">-- Seleccionar Alumno --</option>
                        {usersList.filter(u => u.role !== 'admin').map((st, sIdx) => (
                          <option key={`promote-opt-${st.id}-${sIdx}`} value={st.id} className="bg-[#111111] text-[#eeede9]">
                            {st.fullName} ({st.email}) - Code: {st.memberCode}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#eeede9]/70 uppercase block mb-1">
                        Cargo / Título de Director
                      </label>
                      <input
                        type="text"
                        value={promotionTitle}
                        onChange={(e) => setPromotionTitle(e.target.value)}
                        placeholder="Ej: Director & Instructor, Directora de Sede, Director Adjunto..."
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#56554e]/30">
                    <button
                      type="button"
                      onClick={() => setShowPromotePanel(false)}
                      className="px-4 py-2 rounded-xl bg-[#56554e]/30 text-[#eeede9] font-bold text-xs hover:bg-[#56554e]/50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedStudentToPromote}
                      className="px-5 py-2 rounded-xl bg-[#e7d9cf] text-[#111111] font-bold text-xs hover:bg-[#eeede9] disabled:opacity-50 transition flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Asignar Rol Director</span>
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Panel 2: Crear Nuevo Director desde Cero */}
              {showCreateDirPanel && (
                <motion.form
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleCreateDirector}
                  className="p-5 rounded-3xl bg-[#111111] border border-[#e7d9cf] space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-3">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#e7d9cf] flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      <span>Registrar Nuevo Director</span>
                    </h4>
                    <span className="text-[10px] text-[#eeede9]/60">Se le asignará rol Director con clave temporal</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-[#eeede9]/70 uppercase block mb-1">
                        Nombre y Apellido *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Laura Martínez"
                        value={newDirFullName}
                        onChange={(e) => setNewDirFullName(e.target.value)}
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#eeede9]/70 uppercase block mb-1">
                        Correo Electrónico *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="ejemplo@tomasyastrid.com"
                        value={newDirEmail}
                        onChange={(e) => setNewDirEmail(e.target.value)}
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#eeede9]/70 uppercase block mb-1">
                        Cargo / Título de Director
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Director & Instructor - Bachata Influence"
                        value={newDirTitle}
                        onChange={(e) => setNewDirTitle(e.target.value)}
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#eeede9]/70 uppercase block mb-1">
                        DNI / Teléfono (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="DNI o Teléfono de contacto"
                        value={newDirDni}
                        onChange={(e) => setNewDirDni(e.target.value)}
                        className="w-full bg-[#56554e]/20 border border-[#56554e]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#56554e]/30">
                    <button
                      type="button"
                      onClick={() => setShowCreateDirPanel(false)}
                      className="px-4 py-2 rounded-xl bg-[#56554e]/30 text-[#eeede9] font-bold text-xs hover:bg-[#56554e]/50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#e7d9cf] text-[#111111] font-bold text-xs hover:bg-[#eeede9] transition flex items-center gap-1.5"
                    >
                      <Crown className="w-4 h-4" />
                      <span>Crear Director</span>
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Directors List Header & Search */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#eeede9] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#e7d9cf]" />
                    <span>Equipo de Directores Activos ({usersList.filter(u => u.role === 'admin').length})</span>
                  </h4>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#eeede9]/50" />
                    <input
                      type="text"
                      placeholder="Buscar director..."
                      value={dirSearchQuery}
                      onChange={(e) => setDirSearchQuery(e.target.value)}
                      className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#eeede9] placeholder-[#eeede9]/40 focus:outline-none focus:border-[#e7d9cf]"
                    />
                  </div>
                </div>

                {/* Directors Cards */}
                <div className="space-y-3">
                  {usersList
                    .filter(u => u.role === 'admin')
                    .filter(u =>
                      u.fullName.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
                      u.email.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
                      u.level.toLowerCase().includes(dirSearchQuery.toLowerCase())
                    )
                    .map((dir, dIdx) => {
                      const isEditing = editingDirectorId === dir.id;

                      return (
                        <div
                          key={`dir-card-${dir.id}-${dIdx}`}
                          className="p-5 rounded-3xl bg-[#56554e]/20 border border-[#e7d9cf]/30 space-y-3 hover:border-[#e7d9cf]/60 transition"
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold text-[#eeede9]/60 uppercase block mb-1">
                                    Nombre Completo
                                  </label>
                                  <input
                                    type="text"
                                    value={editDirFullName}
                                    onChange={(e) => setEditDirFullName(e.target.value)}
                                    className="w-full bg-[#111111] border border-[#e7d9cf] rounded-xl px-3 py-2 text-xs text-[#eeede9]"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-[#eeede9]/60 uppercase block mb-1">
                                    Email
                                  </label>
                                  <input
                                    type="email"
                                    value={editDirEmail}
                                    onChange={(e) => setEditDirEmail(e.target.value)}
                                    className="w-full bg-[#111111] border border-[#e7d9cf] rounded-xl px-3 py-2 text-xs text-[#eeede9]"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-[#eeede9]/60 uppercase block mb-1">
                                    Cargo / Título
                                  </label>
                                  <input
                                    type="text"
                                    value={editDirTitle}
                                    onChange={(e) => setEditDirTitle(e.target.value)}
                                    className="w-full bg-[#111111] border border-[#e7d9cf] rounded-xl px-3 py-2 text-xs text-[#eeede9]"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingDirectorId(null)}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#56554e] text-[#eeede9] font-bold text-xs hover:bg-[#56554e]/80 transition"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditDirector(dir.id)}
                                  className="px-4 py-1.5 rounded-xl bg-emerald-500 text-[#111111] font-bold text-xs hover:bg-emerald-400 transition"
                                >
                                  Guardar Cambios
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start gap-3.5 min-w-0">
                                <div className="relative shrink-0">
                                  <img
                                    src={dir.avatarUrl || DEFAULT_AVATAR_URL}
                                    alt={dir.fullName}
                                    className="w-12 h-12 rounded-2xl border-2 border-[#e7d9cf] object-cover bg-[#111111]"
                                  />
                                  <span className="absolute -bottom-1 -right-1 bg-amber-400 text-[#111111] p-1 rounded-full shadow" title="Director Activo">
                                    <Crown className="w-3 h-3" />
                                  </span>
                                </div>

                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5 className="font-extrabold text-sm text-[#eeede9]">{dir.fullName}</h5>
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold uppercase flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>Director Activo</span>
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#eeede9]/70">
                                    <span>{dir.email}</span>
                                    <span>•</span>
                                    <span className="font-mono text-[#e7d9cf] font-bold">{dir.memberCode}</span>
                                    {dir.dni && dir.dni !== 'Sin registrar' && (
                                      <>
                                        <span>•</span>
                                        <span>DNI: {dir.dni}</span>
                                      </>
                                    )}
                                  </div>

                                  <div className="pt-1">
                                    <span className="inline-block text-xs font-bold text-[#e7d9cf] bg-[#111111]/80 px-3 py-1 rounded-xl border border-[#e7d9cf]/20">
                                      {dir.level}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-2 sm:pt-0">
                                <button
                                  onClick={() => {
                                    setEditingDirectorId(dir.id);
                                    setEditDirFullName(dir.fullName);
                                    setEditDirEmail(dir.email);
                                    setEditDirTitle(dir.level);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/60 border border-[#56554e]/50 text-xs font-bold text-[#eeede9] transition flex items-center gap-1.5"
                                  title="Editar nombre o cargo"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-[#e7d9cf]" />
                                  <span>Editar Cargo</span>
                                </button>

                                <button
                                  onClick={() => handleRevokeDirector(dir.id, dir.fullName)}
                                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 transition flex items-center gap-1.5"
                                  title="Quitar permisos de Director"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Quitar Rol</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
          </div>

          {/* CREATE RECAP VERSION MODAL */}
          {showCreateVersionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/80 backdrop-blur-sm">
              <div className="w-full max-w-md bg-[#111111] border border-[#e7d9cf]/40 rounded-3xl p-6 shadow-2xl space-y-4 text-[#eeede9]">
                <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-3">
                  <h3 className="font-black text-sm uppercase text-[#e7d9cf]">Crear Nueva Versión de Recaps</h3>
                  <button
                    onClick={() => setShowCreateVersionModal(false)}
                    className="text-[#eeede9]/60 hover:text-[#eeede9]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateRecapVersion} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">
                      Basarse en una versión existente (Opcional)
                    </label>
                    <select
                      value={copyFromVersionId}
                      onChange={(e) => setCopyFromVersionId(e.target.value)}
                      className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                    >
                      <option value="">Crear desde cero (plantilla nueva)</option>
                      {((formationConfigs.find(c => c.id === selectedLevelId)?.recapVersions) || []).map((v) => (
                        <option key={`copy-opt-${v.id}`} value={v.id}>
                          Duplicar contenido de: {v.name} ({v.recaps.length} recaps)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">
                      Nombre de la Versión
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Versión 2 - Figuras 2026"
                      value={newVersionNameInput}
                      onChange={(e) => setNewVersionNameInput(e.target.value)}
                      className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">
                      Descripción (Opcional)
                    </label>
                    <textarea
                      placeholder="Ej: Set de recaps adaptados para la cohorte de Verano"
                      value={newVersionDescInput}
                      onChange={(e) => setNewVersionDescInput(e.target.value)}
                      rows={2}
                      className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateVersionModal(false)}
                      className="px-4 py-2 rounded-xl bg-[#56554e]/40 text-[#eeede9] font-bold hover:bg-[#56554e]/70"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#111111] font-black"
                    >
                      Crear Versión
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* EDIT RECAP VERSION DETAILS MODAL */}
          {editingVersionId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/80 backdrop-blur-sm">
              <div className="w-full max-w-md bg-[#111111] border border-[#e7d9cf]/40 rounded-3xl p-6 shadow-2xl space-y-4 text-[#eeede9]">
                <div className="flex items-center justify-between border-b border-[#56554e]/40 pb-3">
                  <h3 className="font-black text-sm uppercase text-[#e7d9cf]">Editar Versión de Recaps</h3>
                  <button
                    onClick={() => setEditingVersionId(null)}
                    className="text-[#eeede9]/60 hover:text-[#eeede9]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">
                      Nombre de la Versión
                    </label>
                    <input
                      type="text"
                      value={editVersionNameInput}
                      onChange={(e) => setEditVersionNameInput(e.target.value)}
                      className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#eeede9]/70 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={editVersionDescInput}
                      onChange={(e) => setEditVersionDescInput(e.target.value)}
                      rows={2}
                      className="w-full bg-[#111111] border border-[#56554e]/60 rounded-xl px-3 py-2 text-[#eeede9]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingVersionId(null)}
                      className="px-4 py-2 rounded-xl bg-[#56554e]/40 text-[#eeede9] font-bold hover:bg-[#56554e]/70"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEditVersionDetails(editingVersionId)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#111111] font-black"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* RECONFIRMATION MODAL FOR REGULAR CLASS UNASSIGNMENT */}
          {unassigningRegStudent && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#1c1b1a] border border-[#e7d9cf]/40 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl animate-fade-in">
                <div className="flex items-center gap-3 text-amber-400 border-b border-[#56554e]/40 pb-3">
                  <ShieldCheck className="w-6 h-6" />
                  <h3 className="text-base font-black text-[#eeede9] uppercase">¿Confirmar Desasignación?</h3>
                </div>

                <p className="text-xs text-[#e7d9cf] leading-relaxed">
                  ¿Estás seguro/a de que querés desasignar a <strong className="text-white">{unassigningRegStudent.studentName}</strong> de la clase regular <strong className="text-white">{unassigningRegStudent.className}</strong>?
                </p>
                <p className="text-[11px] text-[#e7d9cf]/70">
                  Esta reconfirmación evita desasignar por error. Podrás volver a asignarlo en cualquier momento.
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#56554e]/40">
                  <button
                    type="button"
                    onClick={() => setUnassigningRegStudent(null)}
                    className="px-4 py-2 rounded-xl bg-[#56554e]/40 hover:bg-[#56554e]/60 text-[#eeede9] text-xs font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeStudentFromRegularClass(unassigningRegStudent.classId, unassigningRegStudent.studentId);
                      setLiveToast(`Alumno ${unassigningRegStudent.studentName} desasignado correctamente`);
                      setUnassigningRegStudent(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition shadow"
                  >
                    Sí, Desasignar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RECONFIRMATION MODAL FOR REGULAR CLASS DELETION */}
          {deletingRegClass && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#1c1b1a] border border-[#e7d9cf]/40 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl animate-fade-in">
                <div className="flex items-center gap-3 text-red-400 border-b border-[#56554e]/40 pb-3">
                  <Trash2 className="w-6 h-6" />
                  <h3 className="text-base font-black text-[#eeede9] uppercase">¿Eliminar Clase Regular?</h3>
                </div>

                <p className="text-xs text-[#e7d9cf] leading-relaxed">
                  ¿Estás seguro/a de que querés eliminar la clase regular <strong className="text-white">{deletingRegClass.level} ({deletingRegClass.day} {deletingRegClass.time})</strong>? Esta acción no se puede deshacer.
                </p>
                <p className="text-[11px] text-[#e7d9cf]/70">
                  Se desasignarán automáticamente los alumnos inscriptos en esta clase.
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#56554e]/40">
                  <button
                    type="button"
                    onClick={() => setDeletingRegClass(null)}
                    className="px-4 py-2 rounded-xl bg-[#56554e]/40 hover:bg-[#56554e]/60 text-[#eeede9] text-xs font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteRegularClass(deletingRegClass.id);
                      if (adminSelectedRegClassId === deletingRegClass.id) {
                        setAdminSelectedRegClassId('');
                      }
                      setLiveToast('Clase regular eliminada con éxito');
                      setDeletingRegClass(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition shadow"
                  >
                    Sí, Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* In-App Video Player Modal */}
          <VideoPlayerModal
            isOpen={!!activeVideoPlayer}
            onClose={() => setActiveVideoPlayer(null)}
            videoUrl={activeVideoPlayer?.url || ''}
            title={activeVideoPlayer?.title || ''}
            subtitle={activeVideoPlayer?.subtitle}
            description={activeVideoPlayer?.description}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
