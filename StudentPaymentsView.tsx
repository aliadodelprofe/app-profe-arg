import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  CircleDollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Building2,
  Calendar,
  DollarSign,
  Shirt,
  GraduationCap,
  Sparkles,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PaymentMethod, Convocatoria, RegularClass, MerchOrder } from '../types';
import { getCurrentFormationMonth } from '../utils/convocatoriaUtils';

interface StudentPaymentsViewProps {
  hideHeader?: boolean;
}

export const StudentPaymentsView: React.FC<StudentPaymentsViewProps> = ({ hideHeader = false }) => {
  const {
    currentUser,
    usersList,
    convocatorias,
    regularClasses,
    merchOrders,
    paymentMethods,
    merchConfig,
    setActiveTab
  } = useAuth();

  const [filterType, setFilterType] = useState<'formaciones' | 'regulares' | 'merch'>('formaciones');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 2500);
  };

  // WhatsApp admin contact generator
  const getAdminWhatsappNumber = () => {
    const adminWithPhone = usersList?.find(u => u.role === 'admin' && u.phone && u.phone.trim() !== '');
    const raw = adminWithPhone?.phone || '+5491170608171';
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('11') || digits.startsWith('15')) return '549' + digits;
    return digits || '5491170608171';
  };

  // Helper to resolve payment method for any item
  const getAssignedPaymentMethod = (pmId?: string, customFallback?: Partial<PaymentMethod>): PaymentMethod | null => {
    if (pmId) {
      const found = paymentMethods.find(p => p.id === pmId);
      if (found) return found;
    }
    if (customFallback?.alias || customFallback?.cbu) {
      return {
        id: 'custom-pm',
        name: customFallback.name || customFallback.bank || 'Transferencia Bancaria',
        bank: customFallback.bank || 'Transferencia Bancaria',
        alias: customFallback.alias || '',
        cbu: customFallback.cbu || '',
        holder: customFallback.holder || ''
      };
    }
    if (paymentMethods.length > 0) {
      return paymentMethods[0];
    }
    return null;
  };

  // Merch payment method resolver
  const merchPaymentMethod = useMemo<PaymentMethod | null>(() => {
    if (merchConfig?.selectedPaymentMethodId) {
      const found = paymentMethods.find(p => p.id === merchConfig.selectedPaymentMethodId);
      if (found) return found;
    }
    if (merchConfig?.bankAlias || merchConfig?.bankCbu) {
      return {
        id: 'merch-custom',
        name: merchConfig.bankName || 'Transferencia Bancaria',
        bank: merchConfig.bankName || 'Transferencia Bancaria',
        alias: merchConfig.bankAlias || '',
        cbu: merchConfig.bankCbu || '',
        holder: merchConfig.bankHolder || ''
      };
    }
    if (paymentMethods.length > 0) {
      return paymentMethods[0];
    }
    return null;
  }, [merchConfig, paymentMethods]);

  // Format currency
  const formatCurrency = (val: number | string | undefined) => {
    if (val === undefined || val === null || val === '') return '$0';
    if (typeof val === 'string') {
      const clean = val.replace(/[^\d]/g, '');
      const num = parseInt(clean, 10);
      return isNaN(num) ? val : `$${num.toLocaleString('es-AR')}`;
    }
    return `$${val.toLocaleString('es-AR')}`;
  };

  const parseNumber = (val: string | number | undefined): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const clean = val.replace(/[^\d]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  };

  // 1. Enrolled Convocatorias (Formaciones)
  const studentConvocatorias = useMemo(() => {
    if (!currentUser) return [];
    return convocatorias.filter(c => c.studentIds?.includes(currentUser.id));
  }, [convocatorias, currentUser]);

  // 2. Enrolled Regular Classes
  const studentRegularClasses = useMemo(() => {
    if (!currentUser) return [];
    return regularClasses.filter(rc => rc.studentIds?.includes(currentUser.id));
  }, [regularClasses, currentUser]);

  // 3. Student Merch Orders
  const studentMerchOrders = useMemo(() => {
    if (!currentUser) return [];
    return merchOrders.filter(o => o.userId === currentUser.id);
  }, [merchOrders, currentUser]);

  // Current active month in Spanish (e.g. "Agosto 2026")
  const currentMonthLabel = useMemo(() => {
    const monthsMap: Record<number, string> = {
      0: 'Enero 2026', 1: 'Febrero 2026', 2: 'Marzo 2026', 3: 'Abril 2026',
      4: 'Mayo 2026', 5: 'Junio 2026', 6: 'Julio 2026', 7: 'Agosto 2026',
      8: 'Septiembre 2026', 9: 'Octubre 2026', 10: 'Noviembre 2026', 11: 'Diciembre 2026'
    };
    return monthsMap[new Date().getMonth()] || 'Agosto 2026';
  }, []);

  // Helper to extract regular class payment info
  const getRegularClassPaymentInfo = (rc: RegularClass, userId?: string) => {
    if (!userId) return { paid: false, paymentDate: undefined };

    // 1. Check exact key in monthlyPayments
    if (rc.monthlyPayments?.[currentMonthLabel]?.[userId]) {
      return rc.monthlyPayments[currentMonthLabel][userId];
    }

    // 2. Check case-insensitive / partial month in monthlyPayments
    if (rc.monthlyPayments) {
      const monthPrefix = currentMonthLabel.split(' ')[0].toLowerCase();
      for (const [mKey, userMap] of Object.entries(rc.monthlyPayments)) {
        if (mKey.toLowerCase().includes(monthPrefix) && userMap[userId]) {
          return userMap[userId];
        }
      }
    }

    // 3. Fallback to studentPayments
    if (rc.studentPayments?.[userId]) {
      return rc.studentPayments[userId];
    }

    return { paid: false, paymentDate: undefined };
  };

  // Calculate totals and financial status
  const financialSummary = useMemo(() => {
    let totalPending = 0;
    let totalUpcoming = 0;
    let totalPaid = 0;
    let pendingItemsCount = 0;
    let upcomingItemsCount = 0;
    let paidItemsCount = 0;

    // Convocatorias calculation
    studentConvocatorias.forEach(c => {
      const userEnrollmentType = c.studentEnrollmentTypes?.[currentUser?.id || ''] || 'individual';
      const rawPrice = userEnrollmentType === 'pareja'
        ? parseNumber(c.priceCouple || 80000)
        : parseNumber(c.priceIndividual || 45000);
      
      const isNivel1 = c.levelId === 'nivel-1';
      const pInfo = c.studentPayments?.[currentUser?.id || ''] || {};
      const currentMonth = getCurrentFormationMonth(c);

      if (isNivel1) {
        const halfPrice = Math.round(rawPrice * 0.5);
        // Cuota 1 - Seña (50%) (Mes 1)
        const senaPaid = !!pInfo.sena || !!pInfo.cuota1;
        if (senaPaid) {
          totalPaid += halfPrice;
          paidItemsCount++;
        } else {
          totalPending += halfPrice;
          pendingItemsCount++;
        }

        // Cuota 1 - Saldo (50%) (Mes 1)
        const saldoPaid = !!pInfo.saldoCuota1 || !!pInfo.cuota1;
        if (saldoPaid) {
          totalPaid += halfPrice;
          paidItemsCount++;
        } else {
          totalPending += halfPrice;
          pendingItemsCount++;
        }

        // Cuota 2 (Mes 2)
        const c2Paid = !!pInfo.cuota2;
        if (c2Paid) {
          totalPaid += rawPrice;
          paidItemsCount++;
        } else {
          if (currentMonth === 1) {
            // Aún estamos cursando Mes 1: Cuota 2 NO es exigible ahora, va a Próximos Vencimientos
            totalUpcoming += rawPrice;
            upcomingItemsCount++;
          } else {
            // Ya estamos en Mes 2: Cuota 2 es exigible en el total pendiente
            totalPending += rawPrice;
            pendingItemsCount++;
          }
        }
      } else {
        // Nivel 2+ (Cuota 1 & Cuota 2)
        const c1Paid = !!pInfo.cuota1;
        if (c1Paid) {
          totalPaid += rawPrice;
          paidItemsCount++;
        } else {
          totalPending += rawPrice;
          pendingItemsCount++;
        }

        const c2Paid = !!pInfo.cuota2;
        if (c2Paid) {
          totalPaid += rawPrice;
          paidItemsCount++;
        } else {
          if (currentMonth === 1) {
            // Aún estamos cursando Mes 1: Cuota 2 NO es exigible ahora, va a Próximos Vencimientos
            totalUpcoming += rawPrice;
            upcomingItemsCount++;
          } else {
            // Ya estamos en Mes 2: Cuota 2 es exigible en el total pendiente
            totalPending += rawPrice;
            pendingItemsCount++;
          }
        }
      }
    });

    // Regular classes calculation
    studentRegularClasses.forEach(rc => {
      const priceNum = parseNumber(rc.priceMonthly || rc.price || 35000);
      const regPaymentInfo = getRegularClassPaymentInfo(rc, currentUser?.id);
      const isPaid = !!regPaymentInfo.paid;
      if (isPaid) {
        totalPaid += priceNum;
        paidItemsCount++;
      } else {
        totalPending += priceNum;
        pendingItemsCount++;
      }
    });

    // Merch calculation
    studentMerchOrders.forEach(order => {
      const orderTotal = order.totalAmount || 0;
      const orderPaid = order.paidAmount || (order.paymentStatus === 'total_abonado' ? orderTotal : (order.paymentStatus === 'sena_abonada' ? order.depositAmount : 0));
      const orderPending = Math.max(0, orderTotal - orderPaid);

      totalPaid += orderPaid;
      totalPending += orderPending;

      if (orderPending > 0) {
        pendingItemsCount++;
      } else if (orderTotal > 0) {
        paidItemsCount++;
      }
    });

    return {
      totalPending,
      totalUpcoming,
      totalPaid,
      pendingItemsCount,
      upcomingItemsCount,
      paidItemsCount,
      isFullyUpToDate: totalPending === 0 && (paidItemsCount > 0 || (studentConvocatorias.length === 0 && studentRegularClasses.length === 0 && studentMerchOrders.length === 0))
    };
  }, [studentConvocatorias, studentRegularClasses, studentMerchOrders, currentUser, currentMonthLabel]);

  // WhatsApp pre-filled receipt link
  const buildReceiptWhatsappUrl = (customConcept?: string) => {
    const studentName = currentUser?.fullName || 'Alumno';
    const dniText = currentUser?.dni ? ` (DNI: ${currentUser.dni})` : '';
    const concept = customConcept || 'pago de cuota / seña en TA Bachata Academy';
    const text = `Hola Tomás y Astrid! Les adjunto el comprobante de pago de ${studentName}${dniText} correspondiente a: ${concept}. ¡Muchas gracias!`;
    return `https://wa.me/${getAdminWhatsappNumber()}?text=${encodeURIComponent(text)}`;
  };

  // Helper to format class day without duplicating 's' (e.g. Jueves -> Jueves, Sábado -> Sábados)
  const formatDayName = (day?: string) => {
    if (!day) return '';
    const trimmed = day.trim();
    if (trimmed.toLowerCase().endsWith('s')) {
      return trimmed;
    }
    return `${trimmed}s`;
  };

  const toggleExpand = (id: string) => {
    setExpandedDetailsId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 text-[#eeede9] pb-12">
      {/* Header & Financial Metrics Strip */}
      {!hideHeader ? (
        <div className="rounded-3xl bg-[#161615] border border-white/[0.08] p-5 sm:p-6 shadow-2xl shadow-black/40 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-[#56554e]/30 text-[#e7d9cf] tracking-wider uppercase">
                <CircleDollarSign className="w-3.5 h-3.5 text-[#e7d9cf]" />
                <span>Portal de Pagos</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#eeede9] tracking-tight">
                Mis Pagos
              </h1>
              <p className="text-xs text-[#eeede9]/70">
                Consultá tus cuotas vigentes y los medios de pago asociados a cada actividad.
              </p>
            </div>
          </div>

          {/* Financial Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-white/[0.06]">
            {/* Status Badge */}
            <div className={`p-3 rounded-2xl border flex flex-col justify-between min-h-[76px] ${
              financialSummary.isFullyUpToDate
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center gap-1.5 opacity-80">
                {financialSummary.isFullyUpToDate ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Estado
                </span>
              </div>
              <div className="text-sm sm:text-base font-black uppercase tracking-tight mt-1">
                {financialSummary.isFullyUpToDate ? 'Al Día ✨' : 'Pendiente'}
              </div>
            </div>

            {/* Saldo Pendiente (Mes Vigente) */}
            <div className="p-3 rounded-2xl bg-[#111111]/80 border border-white/[0.06] flex flex-col justify-between min-h-[76px]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#eeede9]/60 tracking-wider block leading-tight">
                  Total Pendiente
                </span>
                <span className="text-[9px] font-bold text-amber-400 block mt-0.5">
                  Mes Vigente
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-amber-300 mt-1">
                ${financialSummary.totalPending.toLocaleString('es-AR')}
              </div>
            </div>

            {/* Próximos Vencimientos */}
            <div className="p-3 rounded-2xl bg-[#111111]/80 border border-white/[0.06] flex flex-col justify-between min-h-[76px]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#eeede9]/60 tracking-wider block leading-tight">
                  Próx. Vencimiento
                </span>
                <span className="text-[9px] font-bold text-sky-400 block mt-0.5">
                  Mes 2
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-sky-300 mt-1">
                ${financialSummary.totalUpcoming.toLocaleString('es-AR')}
              </div>
            </div>

            {/* Total Abonado */}
            <div className="p-3 rounded-2xl bg-[#111111]/80 border border-white/[0.06] flex flex-col justify-between min-h-[76px]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#eeede9]/60 tracking-wider block leading-tight">
                  Total Abonado
                </span>
                <span className="text-[9px] font-bold text-emerald-400/90 block mt-0.5">
                  Confirmado
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-400 mt-1">
                ${financialSummary.totalPaid.toLocaleString('es-AR')}
              </div>
            </div>
          </div>

          {/* Due Date & Explanation Note */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#111111]/80 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-[#eeede9]/75">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span><strong className="text-[#e7d9cf]">Vencimiento cuota vigente:</strong> Hasta el día 5 de cada mes.</span>
            </div>
            {financialSummary.totalUpcoming > 0 && (
              <span className="text-sky-300/90 text-[10px] font-medium">
                * Las cuotas del Mes 2 se abonan al comenzar el 2° mes.
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Financial Summary Box when Header is rendered at page top */
        <div className="rounded-3xl bg-[#161615] border border-white/[0.08] p-5 sm:p-6 shadow-2xl shadow-black/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#e7d9cf]" />
              <span>Resumen de Estado de Cuenta</span>
            </h2>
          </div>

          {/* Financial Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Status Badge */}
            <div className={`p-3 rounded-2xl border flex flex-col justify-between min-h-[76px] ${
              financialSummary.isFullyUpToDate
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center gap-1.5 opacity-80">
                {financialSummary.isFullyUpToDate ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Estado
                </span>
              </div>
              <div className="text-sm sm:text-base font-black uppercase tracking-tight mt-1">
                {financialSummary.isFullyUpToDate ? 'Al Día ✨' : 'Pendiente'}
              </div>
            </div>

            {/* Saldo Pendiente (Mes Vigente) */}
            <div className="p-3 rounded-2xl bg-[#111111]/80 border border-white/[0.06] flex flex-col justify-between min-h-[76px]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#eeede9]/60 tracking-wider block leading-tight">
                  Total Pendiente
                </span>
                <span className="text-[9px] font-bold text-amber-400 block mt-0.5">
                  Mes Vigente
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-amber-300 mt-1">
                ${financialSummary.totalPending.toLocaleString('es-AR')}
              </div>
            </div>

            {/* Próximos Vencimientos */}
            <div className="p-3 rounded-2xl bg-[#111111]/80 border border-white/[0.06] flex flex-col justify-between min-h-[76px]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#eeede9]/60 tracking-wider block leading-tight">
                  Próx. Vencimiento
                </span>
                <span className="text-[9px] font-bold text-sky-400 block mt-0.5">
                  Mes 2
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-sky-300 mt-1">
                ${financialSummary.totalUpcoming.toLocaleString('es-AR')}
              </div>
            </div>

            {/* Total Abonado */}
            <div className="p-3 rounded-2xl bg-[#111111]/80 border border-white/[0.06] flex flex-col justify-between min-h-[76px]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#eeede9]/60 tracking-wider block leading-tight">
                  Total Abonado
                </span>
                <span className="text-[9px] font-bold text-emerald-400/90 block mt-0.5">
                  Confirmado
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-400 mt-1">
                ${financialSummary.totalPaid.toLocaleString('es-AR')}
              </div>
            </div>
          </div>

          {/* Due Date & Explanation Note */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#111111]/80 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-[#eeede9]/75">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span><strong className="text-[#e7d9cf]">Vencimiento cuota vigente:</strong> Hasta el día 5 de cada mes.</span>
            </div>
            {financialSummary.totalUpcoming > 0 && (
              <span className="text-sky-300/90 text-[10px] font-medium">
                * Las cuotas del Mes 2 se abonan al comenzar el 2° mes.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter Navigation Tabs with Mobile Scroll Affordance */}
      <div className="space-y-1.5">
        <div className="relative group">
          {/* Scrollable Container */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 px-0.5 scrollbar-none scroll-smooth">
            <button
              type="button"
              onClick={() => setFilterType('formaciones')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                filterType === 'formaciones'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'bg-[#161615] text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.04] border border-white/[0.07]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Formaciones ({studentConvocatorias.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('regulares')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                filterType === 'regulares'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'bg-[#161615] text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.04] border border-white/[0.07]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Clases Regulares ({studentRegularClasses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('merch')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                filterType === 'merch'
                  ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                  : 'bg-[#161615] text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.04] border border-white/[0.07]'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Merchandising ({studentMerchOrders.length})</span>
            </button>
          </div>

          {/* Right Gradient Fade to visually cut off edge on mobile */}
          <div className="absolute right-0 top-0 bottom-1.5 w-8 bg-gradient-to-l from-[#111111] to-transparent pointer-events-none sm:hidden" />
        </div>

        {/* Mobile Swipe Hint */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#eeede9]/50 px-1 sm:hidden">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#e7d9cf]/60 animate-pulse" />
          <span>Deslizá para ver más opciones</span>
        </div>
      </div>

      {/* 1. FORMACIONES SECTION */}
      {filterType === 'formaciones' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#e7d9cf]" />
              <span>Formaciones</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('formacion')}
              className="text-[11px] font-bold text-[#e7d9cf]/80 hover:text-[#eeede9] flex items-center gap-1 transition"
            >
              <span>Ir a mi formación</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {studentConvocatorias.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[#111111] border border-[#56554e]/30 text-center text-xs text-[#eeede9]/50">
              No estás inscripto en formaciones activas.
            </div>
          ) : (
            <div className="space-y-3">
              {studentConvocatorias.map(conv => {
                const userEnrollmentType = conv.studentEnrollmentTypes?.[currentUser?.id || ''] || 'individual';
                const userPartnerId = conv.studentPartners?.[currentUser?.id || ''];
                const userPartner = userPartnerId ? usersList.find(u => u.id === userPartnerId) : null;
                const isNivel1 = conv.levelId === 'nivel-1';

                const rawPrice = userEnrollmentType === 'pareja'
                  ? (conv.priceCouple || '$80.000')
                  : (conv.priceIndividual || '$45.000');
                const priceNum = parseNumber(rawPrice);
                const halfPriceNum = Math.round(priceNum * 0.5);

                const pInfo = conv.studentPayments?.[currentUser?.id || ''] || {};
                const isC1Paid = !!pInfo.cuota1 || (!!pInfo.sena && !!pInfo.saldoCuota1);
                const isSenaPaid = !!pInfo.sena || isC1Paid;
                const isSaldoPaid = !!pInfo.saldoCuota1 || isC1Paid;
                const isC2Paid = !!pInfo.cuota2;
                const isAllPaid = isC1Paid && isC2Paid;

                const currentMonth = getCurrentFormationMonth(conv);
                const isCurrentMonthSettled = isNivel1 ? (isSenaPaid && isSaldoPaid) : isC1Paid;

                // Resolved payment method for this convocatoria
                const pm = getAssignedPaymentMethod(conv.paymentMethodId, {
                  alias: conv.paymentAlias,
                  cbu: conv.paymentCbu,
                  holder: conv.paymentHolder,
                  bank: conv.paymentBank
                });

                const isExpanded = expandedDetailsId === `conv-${conv.id}`;

                return (
                  <div
                    key={conv.id}
                    className="rounded-3xl bg-[#161615] border border-white/[0.08] p-5 sm:p-6 shadow-xl shadow-black/40 space-y-4 transition-all duration-300 hover:border-white/[0.16]"
                  >
                    {/* Top Row: Title, Modality & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#56554e]/30 text-[#e7d9cf] whitespace-nowrap shrink-0">
                            {conv.levelId === 'nivel-1' ? 'Nivel 1' : 'Nivel 2'}
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-[#eeede9]">
                            {conv.title}
                          </h3>
                        </div>
                        <p className="text-xs text-[#eeede9]/60">
                          {conv.period} • {conv.classDay && `${formatDayName(conv.classDay)}`} {conv.classStartTime && `${conv.classStartTime} hs`} • {conv.locationName || 'Sede Palermo'}
                          {userEnrollmentType === 'pareja' && userPartner && (
                            <span className="text-[#e7d9cf] font-bold ml-1.5">
                              (Pareja: {userPartner.fullName})
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border flex items-center gap-1.5 shrink-0 ${
                          isAllPaid
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : currentMonth === 1 && isCurrentMonthSettled
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}>
                          {isAllPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>100% Abonado</span>
                            </>
                          ) : currentMonth === 1 && isCurrentMonthSettled ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mes 1 al día ✨</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              <span>Cuota Pendiente</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Streamlined Cuotas Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {isNivel1 ? (
                        <>
                          {/* Seña 50% */}
                          <div className={`px-3.5 py-2.5 rounded-2xl border flex items-center justify-between text-xs ${
                            isSenaPaid ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                          }`}>
                            <div>
                              <span className="text-[9px] font-extrabold uppercase block opacity-75">1. Seña (50%)</span>
                              <span className="font-black text-sm">${halfPriceNum.toLocaleString('es-AR')}</span>
                            </div>
                            <span className="text-[10px] font-black">{isSenaPaid ? '✓ PAGADA' : '⏳ PENDIENTE'}</span>
                          </div>

                          {/* Saldo Mes 1 (50%) */}
                          <div className={`px-3.5 py-2.5 rounded-2xl border flex items-center justify-between text-xs ${
                            isSaldoPaid ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                          }`}>
                            <div>
                              <span className="text-[9px] font-extrabold uppercase block opacity-75">2. Saldo Mes 1</span>
                              <span className="font-black text-sm">${halfPriceNum.toLocaleString('es-AR')}</span>
                            </div>
                            <span className="text-[10px] font-black">{isSaldoPaid ? '✓ PAGADO' : '⏳ PENDIENTE'}</span>
                          </div>

                          {/* Cuota 2 (Mes 2) */}
                          <div className={`px-3.5 py-2.5 rounded-2xl border flex items-center justify-between text-xs ${
                            isC2Paid
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                              : currentMonth === 1
                              ? 'bg-sky-950/20 border-sky-500/30 text-sky-300'
                              : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                          }`}>
                            <div>
                              <span className="text-[9px] font-extrabold uppercase block opacity-75">3. Cuota Mes 2</span>
                              <span className="font-black text-sm">${priceNum.toLocaleString('es-AR')}</span>
                            </div>
                            <span className="text-[10px] font-black">
                              {isC2Paid
                                ? '✓ PAGADA'
                                : currentMonth === 1
                                ? 'PRÓX. VENCIMIENTO'
                                : '⏳ PENDIENTE'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Cuota 1 */}
                          <div className={`px-3.5 py-2.5 rounded-2xl border flex items-center justify-between text-xs ${
                            isC1Paid ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                          }`}>
                            <div>
                              <span className="text-[9px] font-extrabold uppercase block opacity-75">Cuota Mes 1</span>
                              <span className="font-black text-sm">${priceNum.toLocaleString('es-AR')}</span>
                            </div>
                            <span className="text-[10px] font-black">{isC1Paid ? '✓ PAGADA' : '⏳ PENDIENTE'}</span>
                          </div>

                          {/* Cuota 2 */}
                          <div className={`px-3.5 py-2.5 rounded-2xl border flex items-center justify-between text-xs ${
                            isC2Paid
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                              : currentMonth === 1
                              ? 'bg-sky-950/20 border-sky-500/30 text-sky-300'
                              : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                          }`}>
                            <div>
                              <span className="text-[9px] font-extrabold uppercase block opacity-75">Cuota Mes 2</span>
                              <span className="font-black text-sm">${priceNum.toLocaleString('es-AR')}</span>
                            </div>
                            <span className="text-[10px] font-black">
                              {isC2Paid
                                ? '✓ PAGADA'
                                : currentMonth === 1
                                ? 'PRÓX. VENCIMIENTO'
                                : '⏳ PENDIENTE'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Contextual Payment Method Bar */}
                    {pm ? (
                      <div className="pt-2.5 border-t border-white/[0.06] bg-[#111111]/80 p-3.5 rounded-2xl space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#eeede9]/80 min-w-0">
                            <span className="text-[10px] font-extrabold uppercase text-[#e7d9cf] flex items-center gap-1 shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>{pm.bank || 'Medio Asignado'}:</span>
                            </span>
                            {pm.alias && (
                              <span className="font-mono font-bold text-xs text-[#eeede9] select-all truncate">
                                Alias: <strong className="text-[#e7d9cf]">{pm.alias}</strong>
                              </span>
                            )}
                            {pm.holder && (
                              <span className="text-[11px] text-[#eeede9]/60 hidden md:inline">
                                Titular: {pm.holder}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {pm.alias && (
                              <button
                                type="button"
                                onClick={() => handleCopy(pm.alias, `alias-conv-${conv.id}`)}
                                className="px-3 py-1.5 rounded-full bg-[#161615] hover:bg-white/[0.06] text-[#e7d9cf] font-bold text-[11px] transition-all flex items-center gap-1 border border-white/[0.08] cursor-pointer"
                              >
                                {copiedKey === `alias-conv-${conv.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copiar Alias</span>
                                  </>
                                )}
                              </button>
                            )}

                            {pm.cbu && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(`conv-${conv.id}`)}
                                className="px-3 py-1.5 rounded-full text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.06] bg-[#161615] border border-white/[0.08] text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Ver CBU completo"
                              >
                                <span>{isExpanded ? 'Ocultar CBU' : 'Ver CBU'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Prominent, separated receipt button */}
                        {!isAllPaid && (
                          <div className="pt-2 border-t border-white/[0.06] flex justify-end">
                            <a
                              href={buildReceiptWhatsappUrl(
                                currentMonth === 1 && isCurrentMonthSettled && !isC2Paid
                                  ? `adelanto cuota mes 2 de ${conv.title}`
                                  : `cuota de ${conv.title}`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto px-4 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 border border-emerald-500/30 shadow-sm"
                            >
                              <MessageCircle className="w-4 h-4 shrink-0" />
                              <span>Enviar Comprobante</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2.5 border-t border-white/[0.06] bg-[#111111]/80 p-3.5 rounded-2xl text-center">
                        <p className="text-xs font-bold text-[#e7d9cf]">Medio de pago no configurado</p>
                        <p className="text-[11px] text-[#eeede9]/60">La Dirección aún no ha registrado datos bancarios para esta formación.</p>
                      </div>
                    )}

                    {/* Expandable Drawer with full CBU */}
                    <AnimatePresence>
                      {isExpanded && pm?.cbu && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2 border-t border-white/[0.06] text-[11px] text-[#eeede9]/70 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#111111] border border-white/[0.06]">
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-[#eeede9]/50">CBU / CVU</span>
                              <span className="font-mono font-bold text-xs text-[#eeede9] select-all">{pm.cbu}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(pm.cbu, `cbu-conv-${conv.id}`)}
                              className="px-3 py-1 rounded-full bg-[#161615] hover:bg-white/[0.06] text-[#e7d9cf] font-bold text-[10px] flex items-center gap-1 border border-white/[0.08] cursor-pointer"
                            >
                              {copiedKey === `cbu-conv-${conv.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>Copiar CBU</span>
                            </button>
                          </div>
                          {pm.holder && (
                            <p className="text-[10px] text-[#eeede9]/50">
                              Titular: <strong className="text-[#eeede9]">{pm.holder}</strong> • Banco: <strong className="text-[#eeede9]">{pm.bank}</strong>
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. CLASES REGULARES SECTION */}
      {filterType === 'regulares' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#e7d9cf]" />
              <span>Clases regulares</span>
            </h2>
          </div>

          {studentRegularClasses.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[#111111] border border-[#56554e]/30 text-center text-xs text-[#eeede9]/50">
              No estás inscripto en clases regulares continuas.
            </div>
          ) : (
            <div className="space-y-3">
              {studentRegularClasses.map(rc => {
                const priceNum = parseNumber(rc.priceMonthly || rc.price || 35000);
                const regPaymentInfo = getRegularClassPaymentInfo(rc, currentUser?.id);
                const isPaid = !!regPaymentInfo.paid;
                const paymentDate = regPaymentInfo.paymentDate;

                // Payment method for regular classes
                const pm = getAssignedPaymentMethod(rc.paymentMethodId);
                const isExpanded = expandedDetailsId === `rc-${rc.id}`;

                // Format time cleanly without duplicate 'hs'
                const cleanTime = rc.time
                  ? (rc.time.toLowerCase().includes('hs') ? rc.time : `${rc.time} hs`)
                  : '';

                return (
                  <div
                    key={rc.id}
                    className="rounded-3xl bg-[#161615] border border-white/[0.08] p-5 sm:p-6 shadow-xl shadow-black/40 space-y-4 transition-all duration-300 hover:border-white/[0.16]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-col items-start">
                          <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#56554e]/30 text-[#e7d9cf] inline-block">
                            {rc.level || 'Clases Regulares'}
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-[#eeede9] mt-1.5">
                            {rc.day}{cleanTime ? ` • ${cleanTime}` : ''}
                          </h3>
                        </div>
                        <p className="text-xs text-[#eeede9]/60 mt-0.5">
                          {rc.address || 'Sede Palermo'}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#e7d9cf]">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>Cuota vigente: <strong>Mes de {currentMonthLabel}</strong></span>
                        </div>
                      </div>

                      {/* Status and Amount in two clean stacked rows */}
                      <div className="flex flex-col items-start sm:items-end gap-1.5 self-start sm:self-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border flex items-center gap-1.5 shrink-0 ${
                          isPaid
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}>
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>100% Abonado</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pendiente</span>
                            </>
                          )}
                        </span>

                        <div className="px-3 py-1 rounded-full bg-[#111111] border border-white/[0.08] text-xs">
                          <span className="text-[10px] text-[#eeede9]/50 mr-1.5 font-bold">Cuota:</span>
                          <strong className="text-sm font-black text-[#eeede9]">${priceNum.toLocaleString('es-AR')}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Contextual Payment Method Bar */}
                    {pm ? (
                      <div className="pt-2.5 border-t border-white/[0.06] bg-[#111111]/80 p-3.5 rounded-2xl space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#eeede9]/80 min-w-0">
                            <span className="text-[10px] font-extrabold uppercase text-[#e7d9cf] flex items-center gap-1 shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>{pm.bank || 'Medio de Pago'}:</span>
                            </span>
                            {pm.alias && (
                              <span className="font-mono font-bold text-xs text-[#eeede9] select-all truncate">
                                Alias: <strong className="text-[#e7d9cf]">{pm.alias}</strong>
                              </span>
                            )}
                            {paymentDate && (
                              <span className="text-[10px] text-emerald-400 font-bold">
                                (Último pago: {paymentDate})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {pm.alias && (
                              <button
                                type="button"
                                onClick={() => handleCopy(pm.alias, `alias-rc-${rc.id}`)}
                                className="px-3 py-1.5 rounded-full bg-[#161615] hover:bg-white/[0.06] text-[#e7d9cf] font-bold text-[11px] transition-all flex items-center gap-1 border border-white/[0.08] cursor-pointer"
                              >
                                {copiedKey === `alias-rc-${rc.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copiar Alias</span>
                                  </>
                                )}
                              </button>
                            )}

                            {pm.cbu && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(`rc-${rc.id}`)}
                                className="px-3 py-1.5 rounded-full text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.06] bg-[#161615] border border-white/[0.08] text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Ver CBU completo"
                              >
                                <span>{isExpanded ? 'Ocultar CBU' : 'Ver CBU'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Prominent, separated receipt button */}
                        {!isPaid && (
                          <div className="pt-2 border-t border-white/[0.06] flex justify-end">
                            <a
                              href={buildReceiptWhatsappUrl(`cuota de ${currentMonthLabel} - clase regular (${rc.day} ${cleanTime})`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto px-4 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 border border-emerald-500/30 shadow-sm"
                            >
                              <MessageCircle className="w-4 h-4 shrink-0" />
                              <span>Enviar Comprobante</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2.5 border-t border-white/[0.06] bg-[#111111]/80 p-3.5 rounded-2xl text-center">
                        <p className="text-xs font-bold text-[#e7d9cf]">Medio de pago no configurado</p>
                        <p className="text-[11px] text-[#eeede9]/60">La Dirección aún no ha asignado un medio de pago para esta clase regular.</p>
                      </div>
                    )}

                    {/* Expandable Drawer with full CBU */}
                    <AnimatePresence>
                      {isExpanded && pm?.cbu && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2 border-t border-white/[0.06] text-[11px] text-[#eeede9]/70 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#111111] border border-white/[0.06]">
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-[#eeede9]/50">CBU / CVU</span>
                              <span className="font-mono font-bold text-xs text-[#eeede9] select-all">{pm.cbu}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(pm.cbu, `cbu-rc-${rc.id}`)}
                              className="px-3 py-1 rounded-full bg-[#161615] hover:bg-white/[0.06] text-[#e7d9cf] font-bold text-[10px] flex items-center gap-1 border border-white/[0.08] cursor-pointer"
                            >
                              {copiedKey === `cbu-rc-${rc.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>Copiar CBU</span>
                            </button>
                          </div>
                          {pm.holder && (
                            <p className="text-[10px] text-[#eeede9]/50">
                              Titular: <strong className="text-[#eeede9]">{pm.holder}</strong> • Banco: <strong className="text-[#eeede9]">{pm.bank}</strong>
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. MERCHANDISING SECTION */}
      {filterType === 'merch' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase text-[#e7d9cf] tracking-wider flex items-center gap-1.5">
              <Shirt className="w-4 h-4 text-[#e7d9cf]" />
              <span>Pedidos de Merchandising</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('merchandising')}
              className="text-xs font-bold text-[#e7d9cf] hover:text-[#eeede9] flex items-center gap-1 transition"
            >
              <span>Ir a la Tienda</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {studentMerchOrders.length === 0 ? (
            <div className="p-5 rounded-3xl bg-[#161615] border border-white/[0.08] text-center text-xs text-[#eeede9]/50">
              No registrás pedidos en la tienda de Merchandising.
            </div>
          ) : (
            <div className="space-y-3">
              {studentMerchOrders.map(order => {
                const total = order.totalAmount || 0;
                const paid = order.paidAmount || (order.paymentStatus === 'total_abonado' ? total : (order.paymentStatus === 'sena_abonada' ? order.depositAmount : 0));
                const balance = Math.max(0, total - paid);

                const isTotalPaid = order.paymentStatus === 'total_abonado' || balance === 0;
                const isDepositPaid = order.paymentStatus === 'sena_abonada' || paid >= order.depositAmount;

                const pm = merchPaymentMethod;
                const isExpanded = expandedDetailsId === `merch-${order.id}`;

                return (
                  <div
                    key={order.id}
                    className="rounded-3xl bg-[#161615] border border-white/[0.08] p-5 sm:p-6 shadow-xl shadow-black/40 space-y-4 transition-all duration-300 hover:border-white/[0.16]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-[#e7d9cf]">
                            Pedido #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-xs text-[#eeede9]/50">
                            • {new Date(order.createdAt).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                        <p className="text-xs text-[#eeede9]/70 mt-0.5">
                          Tanda: <strong className="text-[#eeede9]">{order.batchName || 'Lanzamiento Oficial'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border flex items-center gap-1.5 shrink-0 ${
                          isTotalPaid
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : isDepositPaid
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-red-500/15 text-red-300 border-red-500/30'
                        }`}>
                          {isTotalPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>100% Abonado</span>
                            </>
                          ) : isDepositPaid ? (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              <span>Seña (50%) Abonada</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Pago Pendiente</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Compact Items Pill Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={`order-item-${order.id}-${idx}`}
                          className="px-3 py-1 rounded-full bg-[#111111] border border-white/[0.08] flex items-center gap-2 text-xs"
                        >
                          <span className="font-bold text-[#eeede9]">{item.quantity}x {item.productTitle}</span>
                          <span className="text-[10px] text-[#e7d9cf]/80">({item.size})</span>
                        </div>
                      ))}
                    </div>

                    {/* Amounts Strip */}
                    <div className="grid grid-cols-3 gap-2.5 text-xs">
                      <div className="p-3 rounded-2xl bg-[#111111]/80 border border-white/[0.06]">
                        <span className="text-[9px] uppercase font-bold text-[#eeede9]/50 block">Total</span>
                        <span className="font-black text-sm text-[#eeede9]">${total.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#111111]/80 border border-white/[0.06]">
                        <span className="text-[9px] uppercase font-bold text-[#eeede9]/50 block">Seña 50%</span>
                        <span className="font-black text-sm text-amber-300">${(order.depositAmount || Math.round(total * 0.5)).toLocaleString('es-AR')}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#111111]/80 border border-white/[0.06]">
                        <span className="text-[9px] uppercase font-bold text-[#eeede9]/50 block">Saldo al Retirar</span>
                        <span className="font-black text-sm text-[#e7d9cf]">${balance.toLocaleString('es-AR')}</span>
                      </div>
                    </div>

                    {/* Contextual Payment Method Bar */}
                    {pm ? (
                      <div className="pt-2.5 border-t border-white/[0.06] bg-[#111111]/80 p-3.5 rounded-2xl space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#eeede9]/80 min-w-0">
                            <span className="text-[10px] font-extrabold uppercase text-[#e7d9cf] flex items-center gap-1 shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>{pm.bank || 'Cuenta Oficial'}:</span>
                            </span>
                            {pm.alias && (
                              <span className="font-mono font-bold text-xs text-[#eeede9] select-all truncate">
                                Alias: <strong className="text-[#e7d9cf]">{pm.alias}</strong>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {pm.alias && (
                              <button
                                type="button"
                                onClick={() => handleCopy(pm.alias, `alias-merch-${order.id}`)}
                                className="px-3 py-1.5 rounded-full bg-[#161615] hover:bg-white/[0.06] text-[#e7d9cf] font-bold text-[11px] transition-all flex items-center gap-1 border border-white/[0.08] cursor-pointer"
                              >
                                {copiedKey === `alias-merch-${order.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copiar Alias</span>
                                  </>
                                )}
                              </button>
                            )}

                            {pm.cbu && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(`merch-${order.id}`)}
                                className="px-3 py-1.5 rounded-full text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.06] bg-[#161615] border border-white/[0.08] text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Ver CBU completo"
                              >
                                <span>{isExpanded ? 'Ocultar CBU' : 'Ver CBU'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Prominent, separated receipt button */}
                        {!isTotalPaid && (
                          <div className="pt-2 border-t border-white/[0.06] flex justify-end">
                            <a
                              href={buildReceiptWhatsappUrl(`pedido #${order.id.slice(-6).toUpperCase()} de merchandising`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto px-4 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 border border-emerald-500/30 shadow-sm"
                            >
                              <MessageCircle className="w-4 h-4 shrink-0" />
                              <span>Enviar Comprobante</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2.5 border-t border-white/[0.06] bg-[#111111]/80 p-3.5 rounded-2xl text-center">
                        <p className="text-xs font-bold text-[#e7d9cf]">Medio de pago no configurado</p>
                        <p className="text-[11px] text-[#eeede9]/60">La Dirección aún no ha registrado datos bancarios para Merchandising.</p>
                      </div>
                    )}

                    {/* Expandable Drawer with full CBU */}
                    <AnimatePresence>
                      {isExpanded && pm?.cbu && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2 border-t border-white/[0.06] text-[11px] text-[#eeede9]/70 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#111111] border border-white/[0.06]">
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-[#eeede9]/50">CBU / CVU</span>
                              <span className="font-mono font-bold text-xs text-[#eeede9] select-all">{pm.cbu}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(pm.cbu, `cbu-merch-${order.id}`)}
                              className="px-3 py-1 rounded-full bg-[#161615] hover:bg-white/[0.06] text-[#e7d9cf] font-bold text-[10px] flex items-center gap-1 border border-white/[0.08] cursor-pointer"
                            >
                              {copiedKey === `cbu-merch-${order.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>Copiar CBU</span>
                            </button>
                          </div>
                          {pm.holder && (
                            <p className="text-[10px] text-[#eeede9]/50">
                              Titular: <strong className="text-[#eeede9]">{pm.holder}</strong> • Banco: <strong className="text-[#eeede9]">{pm.bank}</strong>
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
