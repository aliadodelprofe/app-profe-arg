import React, { useState, useEffect, useRef } from 'react';
import {
  Shirt,
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  Ruler,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Package,
  Layers,
  Settings,
  ShieldCheck,
  Eye,
  Info,
  HelpCircle,
  Palette,
  MessageCircle,
  Tag,
  Pencil,
  ClipboardList,
  Factory,
  Store,
  AlertTriangle,
  Scissors,
  Sparkles,
  Upload,
  Crop
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MerchProduct, MerchOrderItem, MerchOrder, PaymentOption, PaymentStatus, DeliveryStatus } from '../types';
import { ImageUploader } from './ImageUploader';
import { ImageCropperModal } from './ImageCropperModal';
import { compressAndReadFile, compressProductPayload } from '../utils/imageUtils';

// Default Size Chart Table Data
const DEFAULT_SIZE_CHART = [
  { size: 'XS', width: '46 cm', length: '66 cm' },
  { size: 'S', width: '49 cm', length: '69 cm' },
  { size: 'M', width: '52 cm', length: '72 cm' },
  { size: 'L', width: '55 cm', length: '78 cm' },
  { size: 'XL', width: '58 cm', length: '78 cm' },
  { size: 'XXL', width: '62 cm', length: '81 cm' },
];

function findColorImages(colorName: string, colorMap?: Record<string, string | string[]>): string[] {
  if (!colorMap || !colorName) return [];
  const target = colorName.trim().toLowerCase();
  for (const [key, val] of Object.entries(colorMap)) {
    if (key.trim().toLowerCase() === target) {
      const arr = Array.isArray(val) ? val : typeof val === 'string' && val ? [val] : [];
      return arr.filter(Boolean);
    }
  }
  return [];
}

const DELIVERY_STEPS = [
  { key: 'toma_de_pedidos', label: 'Toma de pedidos', icon: ClipboardList },
  { key: 'en_produccion', label: 'En producción', icon: Factory },
  { key: 'proceso_de_bordado', label: 'Proceso de bordado', icon: Sparkles },
  { key: 'listo_para_entregar', label: 'Listo para entregar', icon: Store },
  { key: 'entregado', label: 'Entregado', icon: CheckCircle2 }
];

const getDeliveryStepIndex = (status?: string) => {
  switch (status) {
    case 'entregado': return 4;
    case 'listo_para_entregar':
    case 'listo_para_retirar': return 3;
    case 'proceso_de_bordado': return 2;
    case 'en_produccion': return 1;
    case 'toma_de_pedidos':
    case 'pendiente':
    default: return 0;
  }
};

interface MerchStoreProps {
  embeddedAdminView?: boolean;
  hideHeader?: boolean;
}

export const MerchStore: React.FC<MerchStoreProps> = ({ embeddedAdminView = false, hideHeader = false }) => {
  const {
    currentUser,
    usersList,
    paymentMethods,
    merchConfig,
    updateMerchConfig,
    merchProducts,
    addMerchProduct,
    updateMerchProduct,
    deleteMerchProduct,
    merchOrders,
    createMerchOrder,
    updateMerchOrderStatus,
    deleteMerchOrder,
    merchCategories,
    addMerchCategory,
    editMerchCategory,
    deleteMerchCategory,
    setShowAuthModal
  } = useAuth();

  const isAdmin = currentUser?.role === 'admin';

  // Order deletion modal state
  const [orderToDeleteModal, setOrderToDeleteModal] = useState<MerchOrder | null>(null);

  // Student Order Detail Modal
  const [activeOrderDetailModal, setActiveOrderDetailModal] = useState<MerchOrder | null>(null);

  // Admin Order Bulk Management
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkDeliveryStatus, setBulkDeliveryStatus] = useState<DeliveryStatus>('en_produccion');

  // Admin Store Toggle Confirmation Modal
  const [showStoreToggleModal, setShowStoreToggleModal] = useState(false);

  // Product Mass & Crop Upload Refs/States
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const [cropperSrcForGeneralIdx, setCropperSrcForGeneralIdx] = useState<number | null>(null);

  // Dynamic admin WhatsApp phone (Official number: +5491170608171)
  const getAdminWhatsappNumber = () => {
    const adminWithPhone = usersList?.find(u => u.role === 'admin' && u.phone && u.phone.trim() !== '');
    const raw = adminWithPhone?.phone || '+5491170608171';
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('11') || digits.startsWith('15')) return '549' + digits;
    return digits || '5491170608171';
  };

  // Navigation sub-tabs inside Merch section
  const [activeSubTab, setActiveSubTab] = useState<'catalogo' | 'compras' | 'admin_products' | 'admin_orders' | 'admin_config'>(
    embeddedAdminView ? 'admin_orders' : 'catalogo'
  );
  const sectionContentRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll to the start of the section when switching tabs
  const handleTabSwitch = (newTab: 'catalogo' | 'compras' | 'admin_products' | 'admin_orders' | 'admin_config') => {
    if (activeSubTab === newTab) return;
    setActiveSubTab(newTab);

    // Defer slight tick so DOM renders new section and compute offset relative to sticky nav
    setTimeout(() => {
      if (sectionContentRef.current) {
        const yOffset = -140; // Accounts for top header + sticky sub-nav
        const y = sectionContentRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }, 50);
  };

  // Shopping Cart State
  const [cart, setCart] = useState<MerchOrderItem[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutPaymentOption, setCheckoutPaymentOption] = useState<PaymentOption>('sena_50');
  const [studentOrderNotes, setStudentOrderNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState<MerchOrder | null>(null);

  // Product Details Modal State
  const [activeDetailProduct, setActiveDetailProduct] = useState<MerchProduct | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [modalPaymentOption, setModalPaymentOption] = useState<PaymentOption>('sena_50');
  const [modalSelectedSize, setModalSelectedSize] = useState<string>('');
  const [modalSelectedColor, setModalSelectedColor] = useState<string>('');
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [showSizeGuideTab, setShowSizeGuideTab] = useState<boolean>(false);

  // Copy Bank details state
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  // Admin Forms State
  const [editingProduct, setEditingProduct] = useState<Partial<MerchProduct> | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProductColorsInput, setEditProductColorsInput] = useState('');
  const [productToDeleteModal, setProductToDeleteModal] = useState<MerchProduct | null>(null);
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState<boolean>(false);

  // Order Filters for Admin
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<string>('all');
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState<string>('all');

  // Category State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newCatInput, setNewCatInput] = useState<string>('');
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editedCategoryVal, setEditedCategoryVal] = useState<string>('');
  const [categoryToDeleteModal, setCategoryToDeleteModal] = useState<string | null>(null);

  // Active products list for students
  const publishedProducts = merchProducts.filter(p => p.isActive);

  // Student's personal orders
  const studentOrders = currentUser
    ? merchOrders.filter(o => o.userId === currentUser.id)
    : [];

  // Synchronize sub-tab when embeddedAdminView changes (e.g. director view)
  useEffect(() => {
    if (embeddedAdminView) {
      if (activeSubTab === 'catalogo' || activeSubTab === 'compras') {
        setActiveSubTab('admin_orders');
      }
    } else {
      if (activeSubTab === 'admin_orders' || activeSubTab === 'admin_products' || activeSubTab === 'admin_config') {
        setActiveSubTab('catalogo');
      }
    }
  }, [embeddedAdminView]);

  // Lock body scroll whenever a full-screen view or modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      activeDetailProduct ||
      activeOrderDetailModal ||
      showCartDrawer ||
      showCheckoutModal ||
      orderSuccessModal ||
      orderToDeleteModal ||
      productToDeleteModal ||
      showProductModal ||
      showStoreToggleModal ||
      categoryToDeleteModal
    );

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [
    activeDetailProduct,
    activeOrderDetailModal,
    showCartDrawer,
    showCheckoutModal,
    orderSuccessModal,
    orderToDeleteModal,
    productToDeleteModal,
    showProductModal,
    showStoreToggleModal,
    categoryToDeleteModal
  ]);

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankField(fieldName);
    setTimeout(() => setCopiedBankField(null), 2000);
  };

  // Helper to resolve product image for order items (fallback to live catalog if not saved in item)
  const getOrderItemImage = (item: MerchOrderItem) => {
    if (!item) return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
    
    if (typeof item.image === 'string' && item.image.trim().length > 0) {
      return item.image.trim();
    }
    if (Array.isArray(item.image) && item.image.length > 0 && typeof item.image[0] === 'string') {
      return item.image[0];
    }
    
    const itemTitle = (item.productTitle || '').toString().trim().toLowerCase();
    const matchedProduct = merchProducts.find(p => 
      (item.productId && p.id === item.productId) || 
      (itemTitle && p.title && p.title.trim().toLowerCase() === itemTitle)
    );

    if (matchedProduct) {
      if (item.color && matchedProduct.colorImages?.[item.color]) {
        const cImg = matchedProduct.colorImages[item.color];
        if (Array.isArray(cImg) && cImg[0] && typeof cImg[0] === 'string') return cImg[0];
        if (typeof cImg === 'string' && cImg.trim()) return cImg.trim();
      }
      if (matchedProduct.images && Array.isArray(matchedProduct.images) && matchedProduct.images.length > 0 && matchedProduct.images[0]) {
        return matchedProduct.images[0];
      }
    }
    return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
  };

  // Open Product Details Modal
  const openProductDetail = (product: MerchProduct) => {
    const cleanImages = Array.from(new Set((product.images || []).filter(Boolean)));
    const cleanColorImages: Record<string, string[]> = {};
    if (product.colorImages) {
      for (const [col, val] of Object.entries(product.colorImages)) {
        const arr = Array.isArray(val) ? val : typeof val === 'string' && val ? [val] : [];
        const dedupped = Array.from(new Set(arr.filter(u => u && (cleanImages.length === 0 || cleanImages.includes(u)))));
        if (dedupped.length > 0) {
          cleanColorImages[col] = dedupped;
        }
      }
    }

    const cleanProduct: MerchProduct = {
      ...product,
      images: cleanImages.length > 0 ? cleanImages : ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'],
      colorImages: cleanColorImages
    };

    setActiveDetailProduct(cleanProduct);
    setSelectedImageIdx(0);
    setModalSelectedSize(cleanProduct.sizes[0] || 'M');
    const defaultColor = cleanProduct.colors && cleanProduct.colors.length > 0 ? cleanProduct.colors[0] : 'Negro';
    setModalSelectedColor(defaultColor);
    setModalQuantity(1);
    setModalPaymentOption('sena_50');
    setShowSizeGuideTab(false);
  };

  // Add to cart from Product Detail Modal
  const handleAddToCartFromModal = () => {
    if (!activeDetailProduct) return;
    if (!modalSelectedSize) {
      alert('Por favor elegí un talle antes de agregar al carrito.');
      return;
    }

    const itemUnitPrice = activeDetailProduct.price;
    const itemDepositPrice = activeDetailProduct.depositPrice || Math.round(activeDetailProduct.price * 0.5);

    // Pick color image if available
    const itemImg = activeDetailProduct.colorImages?.[modalSelectedColor] || activeDetailProduct.images[0] || '';

    setCart(prev => {
      const existingIndex = prev.findIndex(
        i => i.productId === activeDetailProduct.id && i.size === modalSelectedSize && i.color === modalSelectedColor
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += modalQuantity;
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: activeDetailProduct.id,
            productTitle: activeDetailProduct.title,
            size: modalSelectedSize,
            color: modalSelectedColor || 'Único',
            quantity: modalQuantity,
            unitPrice: itemUnitPrice,
            depositPrice: itemDepositPrice,
            image: itemImg
          }
        ];
      }
    });

    setActiveDetailProduct(null);
    setShowCartDrawer(true);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  // Cart totals
  const totalCartAmount = cart.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  const totalDepositAmount = cart.reduce((acc, item) => acc + (item.depositPrice * item.quantity), 0);

  // Checkout submission
  const handleCheckout = async (paymentChoice: PaymentOption) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    if (cart.length === 0) {
      alert('Tu carrito está vacío.');
      return;
    }

    try {
      setIsSubmittingOrder(true);
      const orderPayload = {
        userId: currentUser.id,
        userName: currentUser.fullName,
        userEmail: currentUser.email,
        userDni: currentUser.dni || '',
        userPhone: currentUser.phone || '',
        items: cart,
        paymentOption: paymentChoice,
        totalAmount: totalCartAmount,
        depositAmount: totalDepositAmount,
        paidAmount: 0,
        paymentStatus: 'pendiente' as PaymentStatus,
        deliveryStatus: 'pendiente' as DeliveryStatus,
        notes: studentOrderNotes.trim(),
        batchName: merchConfig.batchName || 'Artículos oficiales de la Academy'
      };

      const res = await createMerchOrder(orderPayload);
      if (res.success) {
        setCart([]);
        setShowCartDrawer(false);
        setStudentOrderNotes('');
        const newOrder: MerchOrder = {
          ...orderPayload,
          id: res.orderId || `order-${Date.now()}`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        setOrderSuccessModal(newOrder);
      } else {
        alert(res.message || 'No se pudo procesar la orden.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Hubo un error al guardar tu pedido.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Factory totals per size metric for Admin
  const getSizeTotals = () => {
    const sizeMap: Record<string, number> = {};
    let totalItems = 0;

    merchOrders.forEach(order => {
      if (order.paymentStatus !== 'cancelado') {
        order.items.forEach(item => {
          const sz = item.size.toUpperCase();
          sizeMap[sz] = (sizeMap[sz] || 0) + item.quantity;
          totalItems += item.quantity;
        });
      }
    });

    return { sizeMap, totalItems };
  };

  const { sizeMap, totalItems } = getSizeTotals();

  // Save or edit product by Admin
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.title || !editingProduct?.price) {
      alert('Ingresá al menos el nombre y el precio del producto.');
      return;
    }

    try {
      setIsSavingProduct(true);
      const priceNum = Number(editingProduct.price) || 0;
      const depositNum = editingProduct.depositPrice !== undefined
        ? Number(editingProduct.depositPrice)
        : Math.round(priceNum * 0.5);

      const parsedColors = editProductColorsInput
        ? editProductColorsInput.split(',').map(c => c.trim()).filter(Boolean)
        : ['Negro', 'Blanco'];

      const finalSizes = editingProduct.sizes && editingProduct.sizes.length > 0
        ? editingProduct.sizes.filter(Boolean)
        : ['S', 'M', 'L', 'XL'];

      const cleanImages = Array.from(new Set((editingProduct.images || []).filter(Boolean)));
      const cleanColorImages: Record<string, string[]> = {};

      if (editingProduct.colorImages) {
        for (const [col, val] of Object.entries(editingProduct.colorImages)) {
          const arr = Array.isArray(val) ? val : typeof val === 'string' && val ? [val] : [];
          const filteredAndUnique = Array.from(new Set(arr.filter(u => u && (cleanImages.length === 0 || cleanImages.includes(u)))));
          if (filteredAndUnique.length > 0) {
            cleanColorImages[col] = filteredAndUnique;
          }
        }
      }

      const productPayload = {
        title: editingProduct.title,
        description: editingProduct.description || '',
        price: priceNum,
        depositPrice: depositNum,
        images: cleanImages.length > 0
          ? cleanImages
          : ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'],
        sizes: finalSizes,
        colors: parsedColors,
        colorImages: cleanColorImages,
        sizeGuideUrl: editingProduct.sizeGuideUrl || '',
        sizingInstructionUrl: editingProduct.sizingInstructionUrl || '',
        sizeMeasurements: editingProduct.sizeMeasurements || {},
        isActive: editingProduct.isActive ?? true,
        category: editingProduct.category || 'Remeras'
      };

      const targetId = editingProduct.id;

      // Close modal immediately and show success notification
      setShowProductModal(false);
      setEditingProduct(null);
      setIsSavingProduct(false);
      setSaveSuccessNotification('¡Producto guardado exitosamente!');
      setTimeout(() => {
        setSaveSuccessNotification(null);
      }, 4000);

      if (targetId) {
        updateMerchProduct(targetId, productPayload).catch(err => {
          console.error('Error al actualizar producto:', err);
        });
      } else {
        addMerchProduct(productPayload).catch(err => {
          console.error('Error al agregar producto:', err);
        });
      }
    } catch (err: any) {
      console.error('Error al guardar producto:', err);
      setIsSavingProduct(false);
      alert('Ocurrió un error al guardar el producto. Por favor reintentá.');
    }
  };

  return (
    <div className={`${hideHeader ? 'space-y-8 relative' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative'}`}>
      {/* Save Success Notification Toast */}
      {saveSuccessNotification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-[#1b1a18] text-[#e7d9cf] border border-[#e7d9cf]/50 shadow-2xl animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-black">{saveSuccessNotification}</span>
        </div>
      )}
      {/* Top Banner / Merch Header with Inicio Aesthetic */}
      {!embeddedAdminView && !hideHeader && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#24231f] via-[#1e1d1a] to-[#191815] p-6 sm:p-10 border border-white/[0.08] shadow-2xl shadow-black/50">
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#e7d9cf]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-4 left-10 w-72 h-72 bg-[#56554e]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-[#56554e]/40 text-[#e7d9cf] whitespace-nowrap shrink-0 tracking-wider">
                <Shirt className="w-3.5 h-3.5 text-[#e7d9cf]" />
                <span>MERCHANDISING OFICIAL</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#eeede9] tracking-tight leading-tight uppercase">
                {merchConfig.batchName || 'Artículos oficiales de la Academy'}
              </h1>

              <p className="text-sm sm:text-base text-[#eeede9]/85 leading-relaxed">
                {merchConfig.batchDescription || '¡Lanzamiento exclusivo de artículos oficiales de TA Bachata Academy! Reservá el tuyo abonando el 50% de seña o el total.'}
              </p>

              {merchConfig.batchDeadline && (
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-4 py-2 rounded-full w-fit">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>{merchConfig.batchDeadline}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Top Merch Sub-Navbar */}
      {!activeDetailProduct && (
        <div className="sticky top-20 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-[#111111]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-md shadow-black/40 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {!embeddedAdminView ? (
              /* ALUMNOS: 2 BOTONES (Catálogo y Mis Pedidos) */
              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:gap-1.5 p-0.5 sm:p-1 bg-transparent sm:bg-[#161615]/90 rounded-xl sm:rounded-2xl sm:border sm:border-white/[0.08] sm:shadow-inner w-full sm:w-auto max-w-md sm:max-w-none mx-auto sm:mx-0">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('catalogo')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-0 ${
                    activeSubTab === 'catalogo'
                      ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                      : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                  <span className="truncate">Catálogo</span>
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                      activeSubTab === 'catalogo'
                        ? 'bg-[#111111] text-[#e7d9cf]'
                        : 'bg-white/[0.08] text-[#eeede9]/80'
                    }`}
                  >
                    {publishedProducts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('compras')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer min-w-0 ${
                    activeSubTab === 'compras'
                      ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                      : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                  <span className="truncate">Mis Pedidos</span>
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                      activeSubTab === 'compras'
                        ? 'bg-[#111111] text-[#e7d9cf]'
                        : 'bg-white/[0.08] text-[#eeede9]/80'
                    }`}
                  >
                    {studentOrders.length}
                  </span>
                </button>
              </div>
            ) : (
              /* DIRECTOR: 3 BOTONES CON DESPLAZAMIENTO HORIZONTAL EN MÓVIL */
              <div className="flex items-center gap-1 sm:gap-1.5 p-0.5 sm:p-1 bg-transparent sm:bg-[#161615]/90 rounded-xl sm:rounded-2xl sm:border sm:border-white/[0.08] sm:shadow-inner w-full sm:w-auto overflow-x-auto no-scrollbar scroll-smooth">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('admin_orders')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                    activeSubTab === 'admin_orders'
                      ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                      : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                  <span className="whitespace-nowrap">Pedidos</span>
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                      activeSubTab === 'admin_orders'
                        ? 'bg-[#111111] text-[#e7d9cf]'
                        : 'bg-white/[0.08] text-[#eeede9]/80'
                    }`}
                  >
                    {merchOrders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('admin_products')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                    activeSubTab === 'admin_products'
                      ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                      : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                  }`}
                >
                  <Shirt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                  <span className="whitespace-nowrap">Productos</span>
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                      activeSubTab === 'admin_products'
                        ? 'bg-[#111111] text-[#e7d9cf]'
                        : 'bg-white/[0.08] text-[#eeede9]/80'
                    }`}
                  >
                    {merchProducts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('admin_config')}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                    activeSubTab === 'admin_config'
                      ? 'bg-[#e7d9cf] text-[#111111] shadow-md shadow-black/30'
                      : 'text-[#eeede9]/70 hover:text-[#eeede9] hover:bg-white/[0.05] bg-white/[0.03] sm:bg-transparent'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-inherit shrink-0" />
                  <span className="whitespace-nowrap">Configuración</span>
                </button>
              </div>
            )}

            {/* Desktop Context Tag / Visual Info */}
            <div className="hidden md:flex items-center gap-2 text-xs text-[#eeede9]/60 font-semibold px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#e7d9cf] animate-pulse" />
              <span>
                {!embeddedAdminView
                  ? (activeSubTab === 'catalogo'
                      ? 'Catálogo Oficial'
                      : 'Seguimiento de pedidos')
                  : (activeSubTab === 'admin_orders'
                      ? 'Gestión de pedidos'
                      : activeSubTab === 'admin_products'
                      ? 'Catálogo'
                      : 'Configuración de tienda')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Target anchor ref for smooth scrolling to section start */}
      <div ref={sectionContentRef} className="scroll-mt-36">

      {/* SUB-TAB 1: CATALOG / STORE VIEW */}
      {(activeSubTab === 'catalogo' && !embeddedAdminView) && (
        <div className="space-y-8">
          {/* Notice if store is disabled */}
          {!merchConfig.enabled && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-extrabold text-amber-300">Tienda pausada</p>
                <p className="text-amber-200/80">Podés explorar los artículos y consultar precios. La opción de compra estará habilitada nuevamente cuando lancemos una tanda.</p>
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap border cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf] shadow-md shadow-black/30'
                  : 'bg-[#161615] text-[#eeede9]/70 border-white/[0.08] hover:bg-white/[0.04] hover:text-[#eeede9]'
              }`}
            >
              Todos ({publishedProducts.length})
            </button>
            {merchCategories.map(cat => {
              const count = publishedProducts.filter(p => p.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap border cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf] shadow-md shadow-black/30'
                      : 'bg-[#161615] text-[#eeede9]/70 border-white/[0.08] hover:bg-white/[0.04] hover:text-[#eeede9]'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
          {(() => {
            const filteredProducts = selectedCategory === 'all'
              ? publishedProducts
              : publishedProducts.filter(p => p.category === selectedCategory);

            if (filteredProducts.length === 0) {
              return (
                <div className="text-center py-16 bg-[#161615] rounded-3xl border border-white/[0.08] shadow-xl shadow-black/40 space-y-4">
                  <Shirt className="w-12 h-12 text-[#e7d9cf]/40 mx-auto" />
                  <h3 className="text-lg font-bold text-[#eeede9]">
                    {selectedCategory === 'all'
                      ? 'No hay productos publicados por el momento'
                      : `No hay productos en la categoría "${selectedCategory}"`}
                  </h3>
                  <p className="text-xs text-[#eeede9]/60 max-w-md mx-auto">
                    Los Directores estarán publicando las nuevas prendas y artículos oficiales de la próxima tanda muy pronto.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => openProductDetail(product)}
                    className="group bg-[#161615] rounded-3xl border border-white/[0.08] overflow-hidden shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-black/50 hover:border-[#e7d9cf]/40 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      {/* Image Banner */}
                      <div className="relative aspect-square bg-[#111111] overflow-hidden flex items-center justify-center">
                        <img
                          src={product.images[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 left-3 bg-[#161615]/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/[0.08] text-[10px] font-black text-[#e7d9cf] uppercase shadow-lg">
                          {product.category || 'Oficial'}
                        </div>
                        <div className="absolute top-3 right-3 bg-[#161615]/95 backdrop-blur-md px-3 py-1 rounded-full border border-amber-400/40 text-[10px] font-black text-amber-300 uppercase shadow-lg">
                          Seña 50%: ${product.depositPrice?.toLocaleString('es-AR') || Math.round(product.price * 0.5).toLocaleString('es-AR')}
                        </div>
                      </div>

                      {/* Details preview */}
                      <div className="p-6 space-y-3">
                        <h3 className="text-lg font-extrabold text-[#eeede9] leading-snug group-hover:text-[#e7d9cf] transition-colors">
                          {product.title}
                        </h3>
                        <p className="text-xs text-[#eeede9]/70 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>

                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="text-2xl font-black text-[#eeede9]">
                            ${product.price.toLocaleString('es-AR')}
                          </span>
                          <span className="text-[11px] text-[#e7d9cf]/80 font-bold">
                            o Seña 50% de ${(product.depositPrice || Math.round(product.price * 0.5)).toLocaleString('es-AR')}
                          </span>
                        </div>

                        {/* Sizes preview */}
                        <div className="pt-2 space-y-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-bold text-[#e7d9cf]/70 mr-1">Talles:</span>
                            {product.sizes.map(sz => (
                              <span
                                key={sz}
                                className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#eeede9] text-[10px] font-extrabold"
                              >
                                {sz}
                              </span>
                            ))}
                          </div>

                          {/* Detail Button directly below sizes */}
                          <div className="w-full py-2.5 px-4 rounded-full bg-[#e7d9cf]/10 group-hover:bg-[#e7d9cf] text-[#e7d9cf] group-hover:text-[#111111] font-black text-xs transition-all flex items-center justify-center gap-1.5 border border-white/[0.08] group-hover:border-[#e7d9cf]">
                            <span>{merchConfig.enabled ? 'Ver detalle y pedir' : 'Ver detalle'}</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* SUB-TAB 2: STUDENT'S ORDERS ("MIS PEDIDOS") */}
      {activeSubTab === 'compras' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-[#eeede9] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#e7d9cf]" />
              <span>Mis Pedidos</span>
            </h2>
          </div>

          {!currentUser ? (
            <div className="p-8 bg-[#161615] rounded-3xl border border-white/[0.08] shadow-xl shadow-black/40 text-center space-y-4">
              <HelpCircle className="w-10 h-10 text-[#e7d9cf] mx-auto" />
              <p className="text-sm font-bold text-[#eeede9]">Iniciá sesión para ver tus compras realizadas</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2.5 rounded-full bg-[#e7d9cf] text-[#111111] font-black text-xs shadow-lg"
              >
                Ingresar a Mi Cuenta
              </button>
            </div>
          ) : studentOrders.length === 0 ? (
            <div className="p-12 bg-[#161615] rounded-3xl border border-white/[0.08] shadow-xl shadow-black/40 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 text-[#e7d9cf]/40 mx-auto" />
              <h3 className="text-base font-bold text-[#eeede9]">Aún no realizaste ningún pedido</h3>
              <p className="text-xs text-[#eeede9]/60 max-w-sm mx-auto">
                Al habilitarse la tienda, podrás realizar tus compras.
              </p>
              {merchConfig.enabled && (
                <button
                  onClick={() => handleTabSwitch('catalogo')}
                  className="mt-2 px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[#e7d9cf] border border-white/[0.08] text-xs font-bold transition"
                >
                  Ir al Catálogo de Artículos
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {studentOrders.map(order => {
                const isPaidFull = order.paymentStatus === 'total_abonado';
                const isDepositPaid = order.paymentStatus === 'sena_abonada';
                const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                const currentStepIdx = getDeliveryStepIndex(order.deliveryStatus);
                const currentStepObj = DELIVERY_STEPS[currentStepIdx] || DELIVERY_STEPS[0];

                return (
                  <div
                    key={order.id}
                    className="bg-[#111111] rounded-3xl border border-[#56554e]/40 p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-[#e7d9cf]/50 transition"
                  >
                    <div className="space-y-3">
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#56554e]/30 pb-3">
                        <div>
                          <span className="text-xs font-black text-[#e7d9cf] uppercase tracking-wider block">
                            PEDIDO NUMERO #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[11px] text-[#eeede9]/60 block mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                        </div>

                        {/* Delivery Status Badge in Warm Beige */}
                        <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase bg-[#181715] text-[#e7d9cf] border border-[#e7d9cf]/40 flex items-center gap-1.5 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-[#e7d9cf]" />
                          <span>{currentStepObj.label}</span>
                        </span>
                      </div>

                      {/* Items Summary & Price */}
                      <div className="space-y-2 bg-[#181715] p-3.5 rounded-2xl border border-[#56554e]/30 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#eeede9]/70">Artículos solicitados:</span>
                          <span className="font-extrabold text-[#eeede9]">{totalItemsCount} prenda(s)</span>
                        </div>

                        {/* Thumbnails preview */}
                        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                          {order.items.map((it, iIdx) => (
                            <div key={iIdx} className="flex items-center gap-2 bg-[#111111] p-1.5 rounded-xl border border-[#56554e]/30 shrink-0">
                              <div className="w-8 h-8 rounded-lg bg-[#1b1a18] border border-[#56554e]/40 overflow-hidden shrink-0">
                                <img
                                  src={getOrderItemImage(it)}
                                  alt={it.productTitle}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="text-[10px] leading-tight pr-1">
                                <p className="font-bold text-[#eeede9] max-w-[100px] truncate">{it.productTitle}</p>
                                <p className="text-[#e7d9cf]/70">Talle: {it.size} (x{it.quantity})</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-[#56554e]/20 pt-1.5">
                          <span className="text-[#eeede9]/70">Monto total:</span>
                          <span className="font-black text-[#e7d9cf] text-sm">${order.totalAmount.toLocaleString('es-AR')}</span>
                        </div>
                      </div>

                      {/* Payment Status Badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#eeede9]/60">Estatus del Pago:</span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${
                          isPaidFull
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isDepositPaid
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {isPaidFull
                            ? 'Pago Total'
                            : isDepositPaid
                            ? 'Seña Abonada'
                            : 'Pendiente'}
                        </span>
                      </div>
                    </div>

                    {/* Ver detalle button */}
                    <button
                      type="button"
                      onClick={() => setActiveOrderDetailModal(order)}
                      className="w-full sm:w-auto sm:px-6 py-2.5 px-4 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition flex items-center justify-center gap-2 shadow self-start"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver detalle del pedido</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: DIRECTOR ADMIN PRODUCTS CRUD */}
      {isAdmin && activeSubTab === 'admin_products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#eeede9] flex items-center gap-2">
                <Shirt className="w-5 h-5 text-[#e7d9cf]" />
                <span>Gestión de Productos Publicados</span>
              </h2>
              <p className="text-xs text-[#eeede9]/60">Alta, baja y modificación de prendas y artículos oficiales</p>
            </div>

            <button
              onClick={() => {
                setEditingProduct({
                  title: '',
                  description: '',
                  price: 18000,
                  depositPrice: 9000,
                  images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'],
                  sizes: ['S', 'M', 'L', 'XL'],
                  colors: ['Negro', 'Blanco'],
                  isActive: true,
                  category: 'Remeras'
                });
                setEditProductColorsInput('Negro, Blanco');
                setIsSavingProduct(false);
                setShowProductModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#e7d9cf] text-[#111111] font-black text-xs shadow-lg hover:bg-[#eeede9] transition"
            >
              <Plus className="w-4 h-4" />
              <span>Publicar Nuevo Producto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchProducts.map(product => (
              <div
                key={product.id}
                className="bg-[#111111] rounded-3xl border border-[#56554e]/40 overflow-hidden p-5 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-square bg-[#1b1a18] rounded-2xl overflow-hidden mb-3 flex items-center justify-center border border-[#56554e]/40">
                    <img
                      src={product.images[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      product.isActive ? 'bg-emerald-500/80 text-[#111111]' : 'bg-amber-500/80 text-[#111111]'
                    }`}>
                      {product.isActive ? 'Publicado' : 'Oculto'}
                    </div>
                  </div>

                  <h3 className="font-extrabold text-sm text-[#eeede9]">{product.title}</h3>
                  <p className="text-xs text-[#eeede9]/60 line-clamp-2 mt-1">{product.description}</p>

                  <div className="flex items-center justify-between pt-3">
                    <span className="text-base font-black text-[#eeede9]">
                      ${product.price.toLocaleString('es-AR')}
                    </span>
                    <span className="text-xs text-[#e7d9cf] font-bold">
                      Seña: ${(product.depositPrice || Math.round(product.price * 0.5)).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#56554e]/30">
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setEditProductColorsInput((product.colors || ['Negro', 'Blanco']).join(', '));
                      setIsSavingProduct(false);
                      setShowProductModal(true);
                    }}
                    className="flex-1 py-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-[#e7d9cf] font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => updateMerchProduct(product.id, { isActive: !product.isActive })}
                    className="p-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-[#eeede9] transition"
                    title={product.isActive ? 'Ocultar producto' : 'Mostrar producto'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setProductToDeleteModal(product)}
                    className="p-2 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 transition"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DIRECTOR ADMIN ORDERS MANAGEMENT */}
      {isAdmin && activeSubTab === 'admin_orders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#eeede9] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#e7d9cf]" />
                <span>Gestión de Pedidos de Alumnos</span>
              </h2>
              <p className="text-xs text-[#eeede9]/60">Monitoreo de pagos de señas, totales y consolidado para el taller de confección</p>
            </div>
          </div>

          {/* Metrics Summary Bar for Textile Factory / Taller */}
          <div className="bg-[#111111] p-6 rounded-3xl border border-[#56554e]/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#e7d9cf] uppercase tracking-wider flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#e7d9cf]" />
                <span>Resumen Total de Talles acumulados para el Taller</span>
              </h3>
              <span className="text-xs font-black px-3 py-1 bg-[#e7d9cf] text-[#111111] rounded-full">
                Total Prendas: {totalItems}
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(sz => (
                <div
                  key={sz}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1b1a18] border border-[#56554e]/50"
                >
                  <span className="text-xs font-black text-[#e7d9cf]">{sz}:</span>
                  <span className="text-sm font-extrabold text-[#eeede9]">{sizeMap[sz] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Orders Table & Filters */}
          <div className="bg-[#111111] rounded-3xl border border-[#56554e]/40 p-6 space-y-4">
            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#56554e]/30">
              <input
                type="text"
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                placeholder="Buscar por alumno, email o DNI..."
                className="px-4 py-2 rounded-xl bg-[#1b1a18] border border-[#56554e]/50 text-xs text-[#eeede9] placeholder-[#eeede9]/40 min-w-[240px]"
              />

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={orderPaymentFilter}
                  onChange={e => setOrderPaymentFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#1b1a18] border border-[#56554e]/50 text-xs text-[#eeede9]"
                >
                  <option value="all">Todos los Pagos</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="sena_abonada">Seña abonada</option>
                  <option value="total_abonado">Pago total</option>
                </select>

                <select
                  value={orderDeliveryFilter}
                  onChange={e => setOrderDeliveryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#1b1a18] border border-[#56554e]/50 text-xs text-[#eeede9]"
                >
                  <option value="all">Todas las Entregas</option>
                  <option value="toma_de_pedidos">1. Toma de pedidos</option>
                  <option value="en_produccion">2. En producción</option>
                  <option value="proceso_de_bordado">3. Proceso de bordado</option>
                  <option value="listo_para_entregar">4. Listo para entregar</option>
                  <option value="entregado">5. Entregado</option>
                </select>

                {(() => {
                  const filteredList = merchOrders.filter(o => {
                    const matchSearch = !orderSearch || o.userName.toLowerCase().includes(orderSearch.toLowerCase()) || o.userEmail.toLowerCase().includes(orderSearch.toLowerCase());
                    const matchPayment = orderPaymentFilter === 'all' || o.paymentStatus === orderPaymentFilter;
                    const matchDelivery = orderDeliveryFilter === 'all' || o.deliveryStatus === orderDeliveryFilter || (orderDeliveryFilter === 'toma_de_pedidos' && o.deliveryStatus === 'pendiente');
                    return matchSearch && matchPayment && matchDelivery;
                  });
                  const isAllSelected = filteredList.length > 0 && selectedOrderIds.length === filteredList.length;

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (isAllSelected) {
                          setSelectedOrderIds([]);
                        } else {
                          setSelectedOrderIds(filteredList.map(o => o.id));
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-xs font-bold text-[#e7d9cf] border border-[#56554e]/50 transition flex items-center gap-1.5"
                    >
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        readOnly
                        className="w-3.5 h-3.5 rounded border-[#56554e] bg-[#111111] text-[#e7d9cf]"
                      />
                      <span>{isAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}</span>
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Bulk Action Panel when Orders are Selected */}
            {selectedOrderIds.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#e7d9cf]/10 border border-[#e7d9cf]/40 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#e7d9cf] uppercase">
                    ⚡ {selectedOrderIds.length} pedido(s) seleccionado(s) para cambio simultáneo
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#eeede9]/80 font-bold">Cambiar estado de entrega a:</span>
                  <select
                    value={bulkDeliveryStatus}
                    onChange={e => setBulkDeliveryStatus(e.target.value as DeliveryStatus)}
                    className="px-3 py-1.5 rounded-xl bg-[#111111] border border-[#56554e]/60 text-xs text-[#eeede9] font-bold"
                  >
                    <option value="toma_de_pedidos">1. Toma de pedidos</option>
                    <option value="en_produccion">2. En producción</option>
                    <option value="proceso_de_bordado">3. Proceso de bordado</option>
                    <option value="listo_para_entregar">4. Listo para entregar</option>
                    <option value="entregado">5. Entregado ✓</option>
                  </select>

                  <button
                    type="button"
                    onClick={async () => {
                      for (const id of selectedOrderIds) {
                        await updateMerchOrderStatus(id, undefined, bulkDeliveryStatus);
                      }
                      setSelectedOrderIds([]);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition shadow"
                  >
                    Aplicar Cambio Simultáneo
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOrderIds([])}
                    className="px-3 py-1.5 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-[#eeede9] font-bold text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Orders List */}
            <div className="space-y-4">
              {merchOrders
                .filter(o => {
                  const matchSearch = !orderSearch || o.userName.toLowerCase().includes(orderSearch.toLowerCase()) || o.userEmail.toLowerCase().includes(orderSearch.toLowerCase());
                  const matchPayment = orderPaymentFilter === 'all' || o.paymentStatus === orderPaymentFilter;
                  const matchDelivery = orderDeliveryFilter === 'all' || o.deliveryStatus === orderDeliveryFilter || (orderDeliveryFilter === 'toma_de_pedidos' && o.deliveryStatus === 'pendiente');
                  return matchSearch && matchPayment && matchDelivery;
                })
                .map(order => (
                  <div
                    key={order.id}
                    className={`p-5 rounded-2xl bg-[#181715] border transition space-y-4 ${
                      selectedOrderIds.includes(order.id)
                        ? 'border-[#e7d9cf] ring-1 ring-[#e7d9cf]/30'
                        : 'border-[#56554e]/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#56554e]/20 pb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedOrderIds(prev => [...prev, order.id]);
                            } else {
                              setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-[#56554e] bg-[#111111] text-[#e7d9cf] focus:ring-[#e7d9cf] cursor-pointer"
                        />
                        <div>
                          <h4 className="text-sm font-extrabold text-[#eeede9] flex items-center gap-2">
                            <span>{order.userName}</span>
                            <span className="text-xs font-normal text-[#e7d9cf]">({order.userEmail})</span>
                          </h4>
                          <p className="text-[11px] text-[#eeede9]/60">
                            {order.userPhone && `Tel: ${order.userPhone} • `} DNI: {order.userDni || 'No registrado'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Payment Status Select */}
                        <select
                          value={order.paymentStatus}
                          onChange={e => updateMerchOrderStatus(order.id, e.target.value as PaymentStatus)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                            order.paymentStatus === 'total_abonado'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : order.paymentStatus === 'sena_abonada'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          <option value="pendiente">Pago: Pendiente</option>
                          <option value="sena_abonada">Pago: Seña abonada</option>
                          <option value="total_abonado">Pago: Pago total</option>
                        </select>

                        {/* Delivery Status Select */}
                        <select
                          value={order.deliveryStatus || 'toma_de_pedidos'}
                          onChange={e => updateMerchOrderStatus(order.id, undefined, e.target.value as DeliveryStatus)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                            order.deliveryStatus === 'entregado'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : order.deliveryStatus === 'listo_para_entregar' || order.deliveryStatus === 'listo_para_retirar'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : order.deliveryStatus === 'proceso_de_bordado'
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                              : order.deliveryStatus === 'en_produccion'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-[#56554e]/30 text-[#eeede9]/70 border-[#56554e]/50'
                          }`}
                        >
                          <option value="toma_de_pedidos">1. Toma de pedidos</option>
                          <option value="en_produccion">2. En producción</option>
                          <option value="proceso_de_bordado">3. Proceso de bordado</option>
                          <option value="listo_para_entregar">4. Listo para entregar</option>
                          <option value="entregado">5. Entregado ✓</option>
                        </select>

                        <button
                          onClick={() => setOrderToDeleteModal(order)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                          title="Eliminar pedido con reconfirmación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Items breakdown */}
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="px-3 py-1.5 bg-[#111111] rounded-xl border border-[#56554e]/30 text-xs">
                          <strong className="text-[#e7d9cf]">{it.productTitle}</strong> — Talle: <span className="font-bold text-[#eeede9]">{it.size}</span> {it.color && `(${it.color})`} (Cant: {it.quantity})
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: DIRECTOR ADMIN STORE CONFIGURATION */}
      {isAdmin && activeSubTab === 'admin_config' && (
        <div className="bg-[#111111] p-6 sm:p-8 rounded-3xl border border-[#56554e]/40 space-y-6">
          <div className="border-b border-[#56554e]/30 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#eeede9] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#e7d9cf]" />
                <span>Configuración de tienda</span>
              </h2>
              <p className="text-xs text-[#eeede9]/60">Modificá el estado de habilitación, título, la descripción, fecha límite y los medios de pago.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowStoreToggleModal(true)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition border shadow-md flex items-center gap-2 ${
                merchConfig.enabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {merchConfig.enabled ? 'Deshabilitar tienda' : 'Habilitar tienda'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Tanda Details */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#e7d9cf] uppercase block mb-1">
                  Título de la tienda
                </label>
                <input
                  type="text"
                  value={merchConfig.batchName || ''}
                  onChange={e => updateMerchConfig({ batchName: e.target.value })}
                  placeholder="Ej: Artículos oficiales de la Academy"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181715] border border-[#56554e]/50 text-xs text-[#eeede9]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#e7d9cf] uppercase block mb-1">
                  Descripción de la tienda
                </label>
                <textarea
                  rows={3}
                  value={merchConfig.batchDescription || ''}
                  onChange={e => updateMerchConfig({ batchDescription: e.target.value })}
                  placeholder="Ej: ¡Lanzamiento exclusivo de artículos oficiales de TA Bachata Academy!..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181715] border border-[#56554e]/50 text-xs text-[#eeede9]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#e7d9cf] uppercase block mb-1">
                  Fecha Límite de Pedidos (Aviso)
                </label>
                <input
                  type="text"
                  value={merchConfig.batchDeadline || ''}
                  onChange={e => updateMerchConfig({ batchDeadline: e.target.value })}
                  placeholder="Ej: Pedidos abiertos hasta el 31 de Agosto"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181715] border border-[#56554e]/50 text-xs text-[#eeede9]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#e7d9cf] uppercase block mb-1">
                  Medio de Pago Seleccionado para Merchandising
                </label>
                <p className="text-[11px] text-[#eeede9]/60 mb-2">
                  Seleccioná cuál de los medios de pago registrados en el sistema se les mostrará a los alumnos en la pantalla de Checkout al realizar la compra.
                </p>
                <select
                  value={merchConfig.selectedPaymentMethodId || ''}
                  onChange={e => updateMerchConfig({ selectedPaymentMethodId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181715] border border-[#56554e]/50 text-xs text-[#eeede9]"
                >
                  <option value="">-- Seleccionar Medio de Pago Registrado --</option>
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name} ({pm.bank} - Alias: {pm.alias})
                    </option>
                  ))}
                </select>

                {merchConfig.selectedPaymentMethodId && (() => {
                  const selectedPM = paymentMethods.find(pm => pm.id === merchConfig.selectedPaymentMethodId);
                  if (!selectedPM) return null;
                  return (
                    <div className="mt-2 p-3.5 rounded-2xl bg-[#181715] border border-emerald-500/40 text-xs space-y-1">
                      <div className="flex justify-between font-extrabold text-[#e7d9cf]">
                        <span>{selectedPM.name}</span>
                        <span className="text-emerald-400">{selectedPM.bank}</span>
                      </div>
                      <p className="text-[11px] text-[#eeede9]/80">Alias: <strong className="text-[#eeede9]">{selectedPM.alias}</strong></p>
                      <p className="text-[11px] text-[#eeede9]/80">CBU/CVU: <strong className="text-[#eeede9]">{selectedPM.cbu}</strong></p>
                      <p className="text-[11px] text-[#eeede9]/80">Titular: <strong className="text-[#eeede9]">{selectedPM.holder}</strong></p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right Column: Category Management Block */}
            <div className="space-y-4 pt-6 md:pt-0 md:border-l border-[#56554e]/30 md:pl-6">
              <div>
                <h3 className="text-xs font-bold text-[#e7d9cf] uppercase tracking-wider flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-[#e7d9cf]" />
                  <span>Gestión de Categorías de Merchandising</span>
                </h3>
                <p className="text-[11px] text-[#eeede9]/60 mb-3">
                  Creá, editá y eliminá las categorías disponibles (ej: Remeras, Crop Top, Pantalones) para que los alumnos puedan filtrar los productos en la tienda.
                </p>
              </div>

              {/* Add New Category Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCatInput}
                  onChange={e => setNewCatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newCatInput.trim()) {
                        addMerchCategory(newCatInput.trim());
                        setNewCatInput('');
                      }
                    }
                  }}
                  placeholder="Nueva categoría (ej: Crop Top)..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#181715] border border-[#56554e]/50 text-xs text-[#eeede9]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCatInput.trim()) {
                      addMerchCategory(newCatInput.trim());
                      setNewCatInput('');
                    }
                  }}
                  className="px-4 py-2 bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs rounded-xl flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </div>

              {/* Category List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {merchCategories.map(cat => (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#181715] border border-[#56554e]/40 text-xs"
                  >
                    {editingCategoryName === cat ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editedCategoryVal}
                          onChange={e => setEditedCategoryVal(e.target.value)}
                          className="px-2.5 py-1 rounded bg-[#111111] border border-[#56554e]/60 text-xs text-[#eeede9] w-full"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (editedCategoryVal.trim() && editedCategoryVal.trim() !== cat) {
                              await editMerchCategory(cat, editedCategoryVal.trim());
                            }
                            setEditingCategoryName(null);
                          }}
                          className="px-2.5 py-1 bg-emerald-500 text-[#111111] font-bold text-[11px] rounded"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategoryName(null)}
                          className="px-2.5 py-1 bg-[#56554e]/40 text-[#eeede9] text-[11px] rounded"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-extrabold text-[#eeede9]">{cat}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryName(cat);
                              setEditedCategoryVal(cat);
                            }}
                            className="p-1.5 rounded-lg bg-[#56554e]/30 hover:bg-[#56554e]/50 text-[#e7d9cf] transition"
                            title="Editar categoría"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryToDeleteModal(cat)}
                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition"
                            title="Eliminar categoría"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* PRODUCT DETAILS FULL SCREEN VIEW */}
      {activeDetailProduct && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-50 bg-[#111111] text-[#eeede9] overflow-y-auto">
          {/* Top Sticky Bar */}
          <div className="sticky top-0 z-20 bg-[#111111]/95 backdrop-blur-md border-b border-[#56554e]/40 px-4 sm:px-8 py-3.5">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setActiveDetailProduct(null)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181715] hover:bg-[#56554e]/40 text-[#e7d9cf] text-xs font-black transition border border-[#56554e]/40"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailProduct(null)}
                className="p-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/60 text-[#eeede9] transition shrink-0"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Photo Carousel */}
              {(() => {
                let carouselImgs: string[] = [];
                if (modalSelectedColor && activeDetailProduct.colorImages) {
                  const rawVal = findColorImages(modalSelectedColor, activeDetailProduct.colorImages);
                  carouselImgs = Array.from(new Set(rawVal.filter(Boolean)));
                }

                // If no color-specific images assigned to this color, show general images
                if (carouselImgs.length === 0) {
                  carouselImgs = Array.from(new Set((activeDetailProduct.images || []).filter(Boolean)));
                }

                if (carouselImgs.length === 0) {
                  carouselImgs = ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'];
                }

                return (
                  <div className="space-y-3">
                    <div className="relative aspect-square bg-[#1b1a18] rounded-2xl overflow-hidden border border-[#56554e]/40 flex items-center justify-center">
                      <img
                        src={carouselImgs[selectedImageIdx] || carouselImgs[0]}
                        alt={activeDetailProduct.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />

                      {carouselImgs.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedImageIdx(prev => (prev === 0 ? carouselImgs.length - 1 : prev - 1))}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#111111]/80 hover:bg-[#111111] text-[#eeede9] transition"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedImageIdx(prev => (prev === carouselImgs.length - 1 ? 0 : prev + 1))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#111111]/80 hover:bg-[#111111] text-[#eeede9] transition"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Thumbnails */}
                    {carouselImgs.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {carouselImgs.map((img, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedImageIdx(i)}
                            className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition shrink-0 bg-[#1b1a18] flex items-center justify-center ${
                              selectedImageIdx === i ? 'border-[#e7d9cf] scale-105 ring-2 ring-[#e7d9cf]/40' : 'border-[#56554e]/40 opacity-70'
                            }`}
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Right Column: Title, Prices, Colors, Sizes & Quantity */}
              <div className="space-y-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#56554e]/40 text-[#e7d9cf] text-[10px] font-black uppercase tracking-wider mb-2 border border-[#56554e]/50">
                    {activeDetailProduct.category || 'Artículo Oficial'}
                  </span>
                  <h2 className="text-xl font-extrabold text-[#eeede9] leading-snug">
                    {activeDetailProduct.title}
                  </h2>
                  <p className="text-xs text-[#eeede9]/70 mt-2 leading-relaxed">
                    {activeDetailProduct.description}
                  </p>
                </div>

                {/* Pricing & Deposit Display */}
                <div className="p-4 rounded-2xl bg-[#1b1a18] border border-[#56554e]/40 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[#eeede9]/70">Precio Total:</span>
                    <span className="text-xl font-black text-[#eeede9]">
                      ${activeDetailProduct.price.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1 border-t border-[#56554e]/30">
                    <span className="text-xs text-[#e7d9cf] font-bold">Seña para reservar (50%):</span>
                    <span className="text-base font-extrabold text-[#e7d9cf]">
                      ${(activeDetailProduct.depositPrice || Math.round(activeDetailProduct.price * 0.5)).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                {/* Color Selection (Switches product photo if color image exists) */}
                {activeDetailProduct.colors && activeDetailProduct.colors.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#e7d9cf] uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" />
                      <span>Elegir Color:</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {activeDetailProduct.colors.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            setModalSelectedColor(col);
                            setSelectedImageIdx(0);
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition border ${
                            modalSelectedColor === col
                              ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf]'
                              : 'bg-[#181715] text-[#eeede9]/80 border-[#56554e]/50 hover:bg-[#56554e]/30'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#e7d9cf] uppercase tracking-wider block">
                    Elegir Talle:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeDetailProduct.sizes.map(sz => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setModalSelectedSize(sz)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition border ${
                          modalSelectedSize === sz
                            ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf] scale-105'
                            : 'bg-[#181715] text-[#eeede9]/80 border-[#56554e]/50 hover:bg-[#56554e]/30'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity counter */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-[#e7d9cf] uppercase tracking-wider block">
                    Cantidad:
                  </label>
                  <div className="flex items-center gap-3 bg-[#181715] w-fit p-1.5 rounded-xl border border-[#56554e]/50">
                    <button
                      type="button"
                      onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-[#56554e]/40 hover:bg-[#56554e]/70 text-[#eeede9] font-black flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-sm font-extrabold px-3 text-[#eeede9]">{modalQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setModalQuantity(prev => prev + 1)}
                      className="w-8 h-8 rounded-lg bg-[#56554e]/40 hover:bg-[#56554e]/70 text-[#eeede9] font-black flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Add to Cart CTA */}
                {!merchConfig.enabled && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs text-center font-bold">
                    Tienda pausada: no es posible realizar compras ahora
                  </div>
                )}
                <button
                  type="button"
                  disabled={!merchConfig.enabled}
                  onClick={handleAddToCartFromModal}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs transition shadow-xl flex items-center justify-center gap-2 mt-2 ${
                    merchConfig.enabled
                      ? 'bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111]'
                      : 'bg-[#56554e]/30 text-[#eeede9]/40 cursor-not-allowed border border-[#56554e]/40'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>
                    {merchConfig.enabled
                      ? 'Agregar al Carrito'
                      : 'Tienda Pausada'}
                  </span>
                </button>
              </div>
            </div>

            {/* Embedded Size Chart & "Cómo Medir" Section directly below CTA */}
            <div className="mt-6 pt-6 border-t border-[#56554e]/40 space-y-6 bg-[#181715] p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#e7d9cf] uppercase tracking-wider">
                <Ruler className="w-4 h-4 text-[#e7d9cf]" />
                <span>Guía de talles & Instrucciones de Medición</span>
              </div>

              {/* Product Size Guide Measurements Table & How to Measure Photo */}
              {(() => {
                const measurements = activeDetailProduct.sizeMeasurements;
                const hasCustomMeasurements = measurements && Object.keys(measurements).length > 0;

                return (
                  <div className="space-y-4">
                    {hasCustomMeasurements ? (
                      <div className="overflow-x-auto rounded-xl border border-[#56554e]/30 bg-[#111111]/60">
                        <table className="w-full text-center text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#56554e]/50 text-[#e7d9cf] uppercase text-[10px]">
                              <th className="py-2.5 px-3 font-extrabold w-1/3 text-center">Talle</th>
                              <th className="py-2.5 px-3 font-extrabold w-1/3 text-center">Ancho (Sisa a Sisa)</th>
                              <th className="py-2.5 px-3 font-extrabold w-1/3 text-center">Largo Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#56554e]/30 text-[#eeede9]">
                            {(activeDetailProduct.sizes || Object.keys(measurements!)).map(sz => {
                              const m = measurements![sz] || { width: '-', length: '-' };
                              return (
                                <tr key={sz} className="hover:bg-[#56554e]/20 transition">
                                  <td className="py-2.5 px-3 font-black text-[#e7d9cf] w-1/3 text-center">{sz}</td>
                                  <td className="py-2.5 px-3 font-medium w-1/3 text-center">{m.width || '-'}</td>
                                  <td className="py-2.5 px-3 font-medium w-1/3 text-center">{m.length || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-[#56554e]/30 bg-[#111111]/60">
                        <table className="w-full text-center text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#56554e]/50 text-[#e7d9cf] uppercase text-[10px]">
                              <th className="py-2.5 px-3 font-extrabold w-1/3 text-center">Talle</th>
                              <th className="py-2.5 px-3 font-extrabold w-1/3 text-center">Ancho (Sisa a Sisa)</th>
                              <th className="py-2.5 px-3 font-extrabold w-1/3 text-center">Largo Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#56554e]/30 text-[#eeede9]">
                            {DEFAULT_SIZE_CHART.map(row => (
                              <tr key={row.size} className="hover:bg-[#56554e]/20 transition">
                                <td className="py-2.5 px-3 font-black text-[#e7d9cf] w-1/3 text-center">{row.size}</td>
                                <td className="py-2.5 px-3 font-medium w-1/3 text-center">{row.width}</td>
                                <td className="py-2.5 px-3 font-medium w-1/3 text-center">{row.length}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* "Cómo Medir" Section with Product Specific or General Example Photo */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold text-[#eeede9] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#e7d9cf]" />
                  <span>¿Cómo medir tu prenda favorita para no equivocarte?</span>
                </h4>
                <p className="text-xs text-[#eeede9]/70 leading-relaxed">
                  Tomá una remera que te quede como a vos te gusta, extendela sobre una mesa plana sin estirar y medí de costura a costura con un centímetro.
                </p>

                {(activeDetailProduct.sizingInstructionUrl || merchConfig.sizingInstructionUrl) ? (
                  <div className="rounded-2xl overflow-hidden border border-[#56554e]/40 bg-[#1b1a18] p-3 aspect-square max-w-xs mx-auto flex items-center justify-center">
                    <img
                      src={activeDetailProduct.sizingInstructionUrl || merchConfig.sizingInstructionUrl}
                      alt="Ejemplo de cómo medir"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#111111] border border-[#56554e]/30 text-[11px] text-[#eeede9]/70 space-y-1">
                    <p>• <strong>Ancho (A):</strong> Medí en línea recta de sisa a sisa por debajo de las axilas.</p>
                    <p>• <strong>Largo (B):</strong> Medí desde el punto más alto del hombro junto al cuello hasta el borde inferior.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHOPPING CART FULL SCREEN VIEW */}
      {showCartDrawer && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-50 bg-[#111111] text-[#eeede9] overflow-y-auto">
          {/* Top Sticky Bar */}
          <div className="sticky top-0 z-20 bg-[#111111]/95 backdrop-blur-md border-b border-[#56554e]/40 px-4 sm:px-8 py-3.5">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowCartDrawer(false)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181715] hover:bg-[#56554e]/40 text-[#e7d9cf] text-xs font-black transition border border-[#56554e]/40"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCartDrawer(false)}
                className="p-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/60 text-[#eeede9] transition shrink-0"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 pb-16">
            {cart.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#181715] flex items-center justify-center mx-auto border border-[#56554e]/40">
                  <ShoppingBag className="w-8 h-8 text-[#e7d9cf]/50" />
                </div>
                <h3 className="text-lg font-black text-[#eeede9]">Tu carrito está vacío</h3>
                <p className="text-xs text-[#eeede9]/60 max-w-sm mx-auto leading-relaxed">
                  Aún no agregaste prendas al carrito. Explorá nuestro catálogo oficial y elegí tus favoritas.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCartDrawer(false)}
                  className="px-6 py-3 rounded-2xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition shadow-lg"
                >
                  Explorar Productos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Cart Items List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="space-y-1 border-b border-[#56554e]/30 pb-3">
                    <h2 className="text-lg font-extrabold text-[#eeede9] flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-[#e7d9cf]" />
                      <span>Carrito de Compras</span>
                    </h2>
                  </div>

                  <h3 className="text-xs font-bold text-[#e7d9cf] uppercase tracking-wider">
                    Prendas Seleccionadas ({cart.reduce((a, b) => a + b.quantity, 0)})
                  </h3>

                  <div className="space-y-3">
                    {cart.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#181715] border border-[#56554e]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-14 h-14 rounded-xl bg-[#1b1a18] border border-[#56554e]/40 shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={getOrderItemImage(item)}
                              alt={item.productTitle}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="text-sm font-extrabold text-[#eeede9] truncate">
                              {item.productTitle}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded bg-[#56554e]/40 text-[#e7d9cf] text-[11px] font-black uppercase">
                                Talle: {item.size}
                              </span>
                              {item.color && (
                                <span className="px-2.5 py-0.5 rounded bg-[#56554e]/40 text-[#eeede9] text-[11px]">
                                  Color: {item.color}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#eeede9]/70 pt-1">
                              Precio unitario: <strong className="text-[#eeede9]">${item.unitPrice.toLocaleString('es-AR')}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-[#56554e]/30 pt-3 sm:pt-0">
                          <div className="flex items-center gap-2 bg-[#111111] p-1.5 rounded-xl border border-[#56554e]/40">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(idx, -1)}
                              className="w-7 h-7 rounded-lg bg-[#56554e]/40 hover:bg-[#56554e]/70 text-xs font-black flex items-center justify-center text-[#eeede9]"
                            >
                              -
                            </button>
                            <span className="text-xs font-black px-2">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(idx, 1)}
                              className="w-7 h-7 rounded-lg bg-[#56554e]/40 hover:bg-[#56554e]/70 text-xs font-black flex items-center justify-center text-[#eeede9]"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right min-w-[90px]">
                            <div className="text-sm font-black text-emerald-400">
                              ${(item.unitPrice * item.quantity).toLocaleString('es-AR')}
                            </div>
                            <div className="text-[10px] text-[#e7d9cf]/70">
                              Seña 50%: ${(item.depositPrice * item.quantity).toLocaleString('es-AR')}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(idx)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                            title="Quitar del carrito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Order Summary & Checkout Card */}
                <div className="space-y-4">
                  <div className="p-6 rounded-3xl bg-[#181715] border border-[#e7d9cf]/30 space-y-6 sticky top-20 shadow-xl">
                    <h3 className="text-xs font-bold text-[#e7d9cf] uppercase tracking-wider border-b border-[#56554e]/30 pb-3">
                      Resumen del Carrito
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between text-[#eeede9]/80">
                        <span>Prendas Totales:</span>
                        <strong className="font-black text-[#eeede9]">{cart.reduce((a, b) => a + b.quantity, 0)} u.</strong>
                      </div>
                      <div className="flex justify-between text-[#eeede9]">
                        <span>Valor Total del Pedido:</span>
                        <strong className="font-black text-sm">${totalCartAmount.toLocaleString('es-AR')}</strong>
                      </div>
                      <div className="flex justify-between text-[#eeede9] font-extrabold pt-2 border-t border-[#56554e]/30">
                        <span>Seña (50%):</span>
                        <strong className="text-base font-black text-[#eeede9]">${totalDepositAmount.toLocaleString('es-AR')}</strong>
                      </div>
                      <p className="text-[11px] text-[#eeede9]/60 leading-relaxed pt-1">
                        Podés abonar la seña del 50% hoy para reservar y saldar el resto al retirar, o abonar el total
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCartDrawer(false);
                        setShowCheckoutModal(true);
                      }}
                      className="w-full py-4 rounded-2xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition shadow-xl flex items-center justify-center gap-2 uppercase tracking-wider"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>CHECKOUT</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEDICATED CHECKOUT FULL SCREEN VIEW */}
      {showCheckoutModal && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-50 bg-[#111111] text-[#eeede9] overflow-y-auto">
          {/* Top Sticky Bar */}
          <div className="sticky top-0 z-20 bg-[#111111]/95 backdrop-blur-md border-b border-[#56554e]/40 px-4 sm:px-8 py-3.5">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowCheckoutModal(false);
                  setShowCartDrawer(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181715] hover:bg-[#56554e]/40 text-[#e7d9cf] text-xs font-black transition border border-[#56554e]/40"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="p-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/60 text-[#eeede9] transition shrink-0"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6 pb-16">
            <div className="border-b border-[#56554e]/30 pb-4 space-y-1">
              <h2 className="text-xl font-extrabold text-[#eeede9]">
                Finalizar pedido
              </h2>
              <p className="text-xs text-[#eeede9]/70">
                Revisá el detalle de tus prendas y transferí a la cuenta seleccionada por la academia para confirmar tu pedido.
              </p>
            </div>

            {/* Cart Items Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#e7d9cf] uppercase tracking-wider">
                Resumen de prendas ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#181715] rounded-2xl border border-[#56554e]/40 flex items-center justify-between text-xs gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1b1a18] border border-[#56554e]/40 shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src={getOrderItemImage(item)}
                        alt={item.productTitle}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                      <p className="font-extrabold text-[#eeede9] truncate">{item.productTitle}</p>
                      <p className="text-[11px] text-[#e7d9cf]/80">
                        Talle: <span className="font-bold text-[#eeede9]">{item.size}</span>
                        {item.color && ` • Color: ${item.color}`}
                        {` • Cantidad: ${item.quantity}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-emerald-400 text-xs">
                        ${(item.unitPrice * item.quantity).toLocaleString('es-AR')}
                      </p>
                      <p className="text-[10px] text-[#eeede9]/60">
                        Seña 50%: ${(item.depositPrice * item.quantity).toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Option Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#e7d9cf] uppercase tracking-wider block">
                Elegí la Modalidad de Pago:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCheckoutPaymentOption('sena_50')}
                  className={`p-4 rounded-2xl border text-left transition space-y-1 ${
                    checkoutPaymentOption === 'sena_50'
                      ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf] shadow-lg'
                      : 'bg-[#181715] text-[#eeede9]/80 border-[#56554e]/40 hover:bg-[#56554e]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs uppercase">1. SEÑA DEL 50%</span>
                    {checkoutPaymentOption === 'sena_50' && <CheckCircle2 className="w-4 h-4 text-[#111111]" />}
                  </div>
                  <p className="text-lg font-black">${totalDepositAmount.toLocaleString('es-AR')}</p>
                  <p className="text-[11px] opacity-80">El saldo restante (${(totalCartAmount - totalDepositAmount).toLocaleString('es-AR')}) se abona al retirar la prenda.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckoutPaymentOption('total_100')}
                  className={`p-4 rounded-2xl border text-left transition space-y-1 ${
                    checkoutPaymentOption === 'total_100'
                      ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf] shadow-lg'
                      : 'bg-[#181715] text-[#eeede9]/80 border-[#56554e]/40 hover:bg-[#56554e]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs uppercase">2. PAGO TOTAL</span>
                    {checkoutPaymentOption === 'total_100' && <CheckCircle2 className="w-4 h-4 text-[#111111]" />}
                  </div>
                  <p className="text-lg font-black">${totalCartAmount.toLocaleString('es-AR')}</p>
                  <p className="text-[11px] opacity-80">Abonás la totalidad de la prenda por adelantado.</p>
                </button>
              </div>
            </div>

            {/* Selected System Payment Method Display */}
            {(() => {
              const activePM = paymentMethods.find(pm => pm.id === merchConfig.selectedPaymentMethodId) || paymentMethods[0] || {
                id: 'pm-default',
                name: 'Cuenta Principal TA Bachata Academy',
                bank: merchConfig.bankName || 'Mercado Pago / Banco',
                alias: merchConfig.bankAlias || 'TA.BACHATA.ACADEMY',
                cbu: merchConfig.bankCbu || '0000003100019827364512',
                holder: merchConfig.bankHolder || 'Tomás y Astrid Bachata Academy'
              };

              const amountToPayNow = checkoutPaymentOption === 'sena_50' ? totalDepositAmount : totalCartAmount;

              return (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#181715] border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#56554e]/30 pb-2">
                    <span className="text-xs font-black text-[#e7d9cf] uppercase flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span>DATOS BANCARIOS</span>
                    </span>
                    <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      Transferencia
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-[#e7d9cf]/80 block font-bold">Banco / Entidad:</span>
                      <span className="font-extrabold text-[#eeede9]">{activePM.bank}</span>
                    </div>

                    <div>
                      <span className="text-[11px] text-[#e7d9cf]/80 block font-bold">Titular de la cuenta:</span>
                      <span className="font-extrabold text-[#eeede9]">{activePM.holder}</span>
                    </div>

                    <div className="flex items-center justify-between bg-[#111111] p-2.5 rounded-xl border border-[#56554e]/40">
                      <div>
                        <span className="text-[10px] text-[#e7d9cf] font-bold block uppercase">Alias:</span>
                        <span className="font-black text-[#eeede9]">{activePM.alias}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(activePM.alias, 'chk-alias')}
                        className="px-2 py-1 rounded bg-[#56554e]/40 hover:bg-[#56554e]/70 text-[#e7d9cf] text-[10px] font-bold flex items-center gap-1"
                      >
                        {copiedBankField === 'chk-alias' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedBankField === 'chk-alias' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-[#111111] p-2.5 rounded-xl border border-[#56554e]/40">
                      <div>
                        <span className="text-[10px] text-[#e7d9cf] font-bold block uppercase">CBU / CVU:</span>
                        <span className="font-black text-[#eeede9] text-[11px] truncate max-w-[120px]">{activePM.cbu}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(activePM.cbu, 'chk-cbu')}
                        className="px-2 py-1 rounded bg-[#56554e]/40 hover:bg-[#56554e]/70 text-[#e7d9cf] text-[10px] font-bold flex items-center gap-1"
                      >
                        {copiedBankField === 'chk-cbu' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedBankField === 'chk-cbu' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#56554e]/30 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#eeede9]">Monto a transferir:</span>
                    <span className="text-xl font-black text-emerald-400">
                      ${amountToPayNow.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-[#56554e]/30 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCheckoutModal(false);
                  setShowCartDrawer(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#56554e]/30 text-xs font-bold text-[#eeede9] hover:bg-[#56554e]/50"
              >
                Volver
              </button>

              <button
                type="button"
                disabled={isSubmittingOrder}
                onClick={async () => {
                  setShowCheckoutModal(false);
                  await handleCheckout(checkoutPaymentOption);
                }}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-[#111111] text-xs font-black shadow-xl flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Registrar pedido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER SUCCESS MODAL */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-[#111111] border border-emerald-500/50 rounded-3xl p-5 sm:p-7 text-center space-y-4 shadow-2xl text-[#eeede9] max-h-[90vh] overflow-y-auto my-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#eeede9]">¡Pedido Registrado con Éxito!</h3>
              <p className="text-xs text-[#eeede9]/80">
                Tu pedido quedó guardado en el sistema con el código <strong className="text-[#e7d9cf]">#{orderSuccessModal.id.slice(-6)}</strong>.
              </p>
            </div>

            {/* MANDATORY WHATSAPP NOTICE BOX */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-left space-y-3">
              <div className="flex items-start gap-2 text-emerald-300 font-extrabold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>⚠️ ENVÍO DE COMPROBANTE OBLIGATORIO</span>
              </div>
              <p className="text-xs text-[#eeede9]/90 leading-relaxed">
                Para que los Directores confirmen y procesen tu pedido, por favor <strong>enviá la captura o comprobante de transferencia a nuestro WhatsApp oficial</strong>.
              </p>

              {(() => {
                const amount = orderSuccessModal.paymentOption === 'sena_50' ? orderSuccessModal.depositAmount : orderSuccessModal.totalAmount;
                const itemsSummary = orderSuccessModal.items.map(i => `${i.productTitle} (${i.size})`).join(', ');
                const msgText = `Hola! Acabo de hacer el PEDIDO NUMERO #${orderSuccessModal.id.slice(-6).toUpperCase()} de Merchandising (${itemsSummary}) en TA Bachata Academy. Adjunto el comprobante por $${amount.toLocaleString('es-AR')}.`;
                const whatsappUrl = `https://wa.me/${getAdminWhatsappNumber()}?text=${encodeURIComponent(msgText)}`;

                return (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar comprobante</span>
                  </a>
                );
              })()}
            </div>

            {(() => {
              const activePM = paymentMethods.find(pm => pm.id === merchConfig.selectedPaymentMethodId) || paymentMethods[0] || {
                id: 'pm-default',
                name: 'Cuenta Principal TA Bachata Academy',
                bank: merchConfig.bankName || 'Mercado Pago / Banco',
                alias: merchConfig.bankAlias || 'TA.BACHATA.ACADEMY',
                cbu: merchConfig.bankCbu || '0000003100019827364512',
                holder: merchConfig.bankHolder || 'Tomás y Astrid Bachata Academy'
              };

              return (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#181715] border border-emerald-500/40 text-left space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-[#56554e]/30 pb-2">
                    <span className="text-[11px] font-extrabold text-[#e7d9cf] uppercase flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>DATOS BANCARIOS</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Transferencia
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[#e7d9cf] font-bold">Banco / Entidad:</span>
                      <span className="font-extrabold text-[#eeede9]">{activePM.bank}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#e7d9cf] font-bold">Titular:</span>
                      <span className="font-extrabold text-[#eeede9]">{activePM.holder}</span>
                    </div>

                    <div className="flex items-center justify-between bg-[#111111] p-2 rounded-xl border border-[#56554e]/40">
                      <div>
                        <span className="text-[10px] text-[#e7d9cf] font-bold block uppercase">Alias:</span>
                        <span className="font-black text-[#eeede9]">{activePM.alias}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(activePM.alias, 'modal-alias')}
                        className="px-2 py-1 rounded bg-[#56554e]/40 hover:bg-[#56554e]/70 text-[#e7d9cf] text-[10px] font-bold flex items-center gap-1"
                      >
                        {copiedBankField === 'modal-alias' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedBankField === 'modal-alias' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    {activePM.cbu && (
                      <div className="flex items-center justify-between bg-[#111111] p-2 rounded-xl border border-[#56554e]/40">
                        <div>
                          <span className="text-[10px] text-[#e7d9cf] font-bold block uppercase">CBU / CVU:</span>
                          <span className="font-black text-[#eeede9] text-[11px] truncate max-w-[130px]">{activePM.cbu}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(activePM.cbu, 'modal-cbu')}
                          className="px-2 py-1 rounded bg-[#56554e]/40 hover:bg-[#56554e]/70 text-[#e7d9cf] text-[10px] font-bold flex items-center gap-1"
                        >
                          {copiedBankField === 'modal-cbu' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedBankField === 'modal-cbu' ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#56554e]/30 font-extrabold text-emerald-400 text-sm">
                    <span>Monto a transferir:</span>
                    <span>
                      ${(orderSuccessModal.paymentOption === 'sena_50' ? orderSuccessModal.depositAmount : orderSuccessModal.totalAmount).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => {
                setOrderSuccessModal(null);
                setActiveSubTab('compras');
              }}
              className="w-full py-3.5 rounded-2xl bg-[#e7d9cf] text-[#111111] font-black text-xs shadow-lg hover:bg-[#eeede9] transition"
            >
              Ver el Estado de Mi Compra
            </button>
          </div>
        </div>
      )}

      {/* DELETE ORDER RECONFIRMATION MODAL */}
      {orderToDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#111111] border border-red-500/50 rounded-3xl p-6 space-y-5 shadow-2xl text-[#eeede9]">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/40">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-[#eeede9]">¿Eliminar pedido de la base de datos?</h3>
              <p className="text-xs text-[#eeede9]/80 leading-relaxed">
                Estás a punto de borrar permanentemente el pedido <strong className="text-[#e7d9cf]">#{orderToDeleteModal.id.slice(-6).toUpperCase()}</strong> del alumno <strong className="text-white">{orderToDeleteModal.userName}</strong>.
              </p>
              <p className="text-[11px] text-red-400/90 font-medium bg-red-500/10 p-2.5 rounded-xl border border-red-500/30">
                ⚠️ Esta acción eliminará los registros de compras asociadas de forma irreversible.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDeleteModal(null)}
                className="flex-1 py-3 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-xs font-bold text-[#eeede9] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const idToDelete = orderToDeleteModal.id;
                  setOrderToDeleteModal(null);
                  await deleteMerchOrder(idToDelete);
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar Pedido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PRODUCT RECONFIRMATION MODAL */}
      {productToDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#111111] border border-red-500/50 rounded-3xl p-6 space-y-5 shadow-2xl text-[#eeede9]">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/40">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-[#eeede9]">¿Eliminar producto de la tienda?</h3>
              <p className="text-xs text-[#eeede9]/80 leading-relaxed">
                Estás a punto de eliminar permanentemente el producto <strong className="text-[#e7d9cf]">{productToDeleteModal.title}</strong> de la tienda oficial.
              </p>
              <p className="text-[11px] text-red-400/90 font-medium bg-red-500/10 p-2.5 rounded-xl border border-red-500/30">
                ⚠️ Esta acción es irreversible y removerá el producto del catálogo de alumnos.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDeleteModal(null)}
                className="flex-1 py-3 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-xs font-bold text-[#eeede9] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const idToDelete = productToDeleteModal.id;
                  setProductToDeleteModal(null);
                  await deleteMerchProduct(idToDelete);
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar Producto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT ORDER DETAIL FULL SCREEN VIEW */}
      {activeOrderDetailModal && (
        <div className="fixed inset-0 w-full h-full min-h-screen z-50 bg-[#111111] text-[#eeede9] overflow-y-auto">
          {/* Top Sticky Bar */}
          <div className="sticky top-0 z-20 bg-[#111111]/95 backdrop-blur-md border-b border-[#56554e]/40 px-4 sm:px-8 py-3.5">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setActiveOrderDetailModal(null)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181715] hover:bg-[#56554e]/40 text-[#e7d9cf] text-xs font-black transition border border-[#56554e]/40"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveOrderDetailModal(null)}
                className="p-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/60 text-[#eeede9] transition shrink-0"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6 pb-16">
            <div className="space-y-1 border-b border-[#56554e]/30 pb-4">
              <span className="text-xs font-black text-[#e7d9cf] uppercase tracking-wider block">
                Detalle del Pedido
              </span>
              <h3 className="text-xl font-black text-[#eeede9]">
                PEDIDO NUMERO #{activeOrderDetailModal.id.slice(-6).toUpperCase()}
              </h3>
              <p className="text-xs text-[#eeede9]/60">
                Realizado el {new Date(activeOrderDetailModal.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Delivery Progress Stepper */}
            {(() => {
              const currentStepIdx = getDeliveryStepIndex(activeOrderDetailModal.deliveryStatus);

              return (
                <div className="bg-[#181715] p-4 sm:p-5 rounded-2xl border border-[#56554e]/30 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-[#e7d9cf] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#e7d9cf]" />
                      <span>Proceso de Entrega</span>
                    </span>
                  </div>

                  {/* Mobile Vertical Timeline Layout (sm:hidden) */}
                  <div className="sm:hidden relative space-y-4 pt-2 pl-1">
                    {/* Continuous vertical line behind circles */}
                    <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-[#56554e]/30 z-0" />
                    <div
                      className="absolute left-[17px] top-4 w-0.5 bg-[#e7d9cf] transition-all duration-500 z-0"
                      style={{
                        height: `${Math.min(100, (currentStepIdx / (DELIVERY_STEPS.length - 1)) * 100)}%`
                      }}
                    />

                    {DELIVERY_STEPS.map((step, sIdx) => {
                      const StepIcon = step.icon;
                      const isCompleted = sIdx < currentStepIdx;
                      const isCurrent = sIdx === currentStepIdx;

                      return (
                        <div key={step.key} className="flex items-start gap-3.5 relative z-10">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition ${
                              isCurrent
                                ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf] shadow-md ring-2 ring-[#e7d9cf]/30'
                                : isCompleted
                                ? 'bg-[#181715] text-[#e7d9cf] border-[#e7d9cf]'
                                : 'bg-[#181715] text-[#eeede9]/30 border-[#56554e]/40'
                            }`}
                          >
                            <StepIcon className="w-4 h-4" />
                          </div>

                          <div className="pt-1.5 pb-1">
                            <p
                              className={`text-xs font-extrabold leading-tight ${
                                isCurrent
                                  ? 'text-[#e7d9cf]'
                                  : isCompleted
                                  ? 'text-[#e7d9cf]/90'
                                  : 'text-[#eeede9]/40'
                              }`}
                            >
                              {step.label}
                            </p>
                            {isCurrent && step.key !== 'entregado' && (
                              <span className="inline-block mt-1 text-[10px] font-black text-[#111111] bg-[#e7d9cf] px-2 py-0.5 rounded-md">
                                Etapa Actual
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Horizontal Stepper (hidden sm:block) */}
                  <div className="hidden sm:block relative pt-3 pb-2 px-2">
                    <div className="flex items-center justify-between relative z-10">
                      {DELIVERY_STEPS.map((step, sIdx) => {
                        const StepIcon = step.icon;
                        const isCompleted = sIdx < currentStepIdx;
                        const isCurrent = sIdx === currentStepIdx;

                        return (
                          <div key={step.key} className="flex flex-col items-center flex-1 text-center">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border ${
                                isCurrent
                                  ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf] shadow-lg ring-4 ring-[#e7d9cf]/20 scale-110'
                                  : isCompleted
                                  ? 'bg-[#181715] text-[#e7d9cf] border-[#e7d9cf]'
                                  : 'bg-[#181715] text-[#eeede9]/30 border-[#56554e]/40'
                              }`}
                            >
                              <StepIcon className="w-4 h-4" />
                            </div>

                            <span
                              className={`text-[11px] mt-2 font-extrabold leading-tight ${
                                isCurrent
                                  ? 'text-[#e7d9cf]'
                                  : isCompleted
                                  ? 'text-[#e7d9cf]/80'
                                  : 'text-[#eeede9]/40'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="absolute top-7 left-[8%] right-[8%] h-0.5 bg-[#56554e]/30 z-0" />
                    <div
                      className="absolute top-7 left-[8%] h-0.5 bg-[#e7d9cf] transition-all duration-500 z-0"
                      style={{ width: `${(currentStepIdx / 4) * 84}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Artículos solicitados */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-[#e7d9cf] uppercase tracking-wider block">
                Artículos Solicitados:
              </span>
              <div className="space-y-2.5">
                {activeOrderDetailModal.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#181715] p-3.5 rounded-2xl border border-[#56554e]/30 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[#1b1a18] border border-[#56554e]/40 shrink-0 flex items-center justify-center overflow-hidden">
                        <img
                          src={getOrderItemImage(item)}
                          alt={item.productTitle}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-[#eeede9] truncate">
                          {item.productTitle}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded bg-[#56554e]/40 text-[#e7d9cf] text-[10px] font-black uppercase">
                            Talle: {item.size}
                          </span>
                          {item.color && (
                            <span className="px-2 py-0.5 rounded bg-[#56554e]/40 text-[#eeede9] text-[10px] font-semibold">
                              Color: {item.color}
                            </span>
                          )}
                          <span className="text-[11px] text-[#eeede9]/70 font-semibold">
                            Cantidad: {item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-[#eeede9]">
                        ${(item.unitPrice * item.quantity).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & WhatsApp Section */}
            <div className="bg-[#181715] p-5 rounded-2xl border border-[#56554e]/40 space-y-4">
              <div className="flex items-center justify-between text-xs border-b border-[#56554e]/30 pb-3">
                <span className="text-[#eeede9]/70">Modalidad de pago:</span>
                <span className="font-black text-[#e7d9cf] uppercase">
                  {activeOrderDetailModal.paymentOption === 'sena_50' ? '1. Seña del 50%' : '2. Pago Total 100%'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-[#56554e]/30 pb-3">
                <span className="text-[#eeede9]/70">Estatus del pago:</span>
                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border ${
                  activeOrderDetailModal.paymentStatus === 'total_abonado'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : activeOrderDetailModal.paymentStatus === 'sena_abonada'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {activeOrderDetailModal.paymentStatus === 'total_abonado'
                    ? 'Pago Total'
                    : activeOrderDetailModal.paymentStatus === 'sena_abonada'
                    ? 'Seña Abonada'
                    : 'Pendiente'}
                </span>
              </div>

              {/* Detailed Financial Breakdown */}
              {(() => {
                const totalAmt = activeOrderDetailModal.totalAmount;
                const depositAmt = activeOrderDetailModal.depositAmount || Math.round(totalAmt / 2);
                const remainingAmt = Math.max(0, totalAmt - depositAmt);
                const isDepositPaid = activeOrderDetailModal.paymentStatus === 'sena_abonada';

                return (
                  <div className="bg-[#111111]/80 p-4 rounded-xl border border-[#56554e]/30 space-y-3 text-xs">
                    <span className="text-[11px] font-extrabold text-[#e7d9cf] uppercase tracking-wider block border-b border-[#56554e]/20 pb-2">
                      Detalle Financiero del Pedido:
                    </span>

                    {/* 1. Valor Total del Producto */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#eeede9]/80 font-medium">Valor total del producto:</span>
                      <span className="font-extrabold text-[#eeede9] text-sm">${totalAmt.toLocaleString('es-AR')}</span>
                    </div>

                    {/* 2. Seña / Pago abonado o requerido y Restante */}
                    {activeOrderDetailModal.paymentStatus === 'total_abonado' ? (
                      <>
                        <div className="flex items-center justify-between text-emerald-400">
                          <span className="font-semibold">Monto abonado (Pago Total):</span>
                          <span className="font-black text-sm">${totalAmt.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-[#56554e]/20">
                          <span className="text-[#eeede9]/70 font-bold">Resta abonar al retirar:</span>
                          <span className="font-black text-[#eeede9]">$0</span>
                        </div>
                      </>
                    ) : activeOrderDetailModal.paymentOption === 'sena_50' ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[#eeede9]/80 font-medium">
                            {isDepositPaid ? 'Seña abonada (50%):' : 'Seña a abonar para reservar (50%):'}
                          </span>
                          <span className={`font-black text-sm ${isDepositPaid ? 'text-blue-400' : 'text-amber-400'}`}>
                            ${depositAmt.toLocaleString('es-AR')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-[#56554e]/20">
                          <span className="text-[#e7d9cf] font-bold">Resta abonar al retirar:</span>
                          <span className="font-black text-[#e7d9cf] text-sm">${remainingAmt.toLocaleString('es-AR')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-amber-400">
                          <span className="font-medium">Monto total a abonar:</span>
                          <span className="font-black text-sm">${totalAmt.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-[#56554e]/20">
                          <span className="text-[#eeede9]/70 font-bold">Resta abonar:</span>
                          <span className="font-black text-amber-400 text-sm">${totalAmt.toLocaleString('es-AR')}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {!(activeOrderDetailModal.deliveryStatus === 'entregado' && (activeOrderDetailModal.paymentStatus === 'total_abonado' || (activeOrderDetailModal.paidAmount || 0) >= activeOrderDetailModal.totalAmount)) && activeOrderDetailModal.paymentStatus !== 'total_abonado' && (
                <div className="pt-2 border-t border-[#56554e]/30">
                  <a
                    href={`https://wa.me/${getAdminWhatsappNumber()}?text=${encodeURIComponent(`Hola! Envío comprobante del PEDIDO NUMERO #${activeOrderDetailModal.id.slice(-6).toUpperCase()} de Merchandising en TA Bachata Academy.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar comprobante</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STORE TOGGLE RECONFIRMATION MODAL */}
      {showStoreToggleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#111111] border border-[#e7d9cf]/40 rounded-3xl p-6 space-y-5 shadow-2xl text-[#eeede9]">
            <div className="w-12 h-12 rounded-full bg-[#e7d9cf]/20 text-[#e7d9cf] flex items-center justify-center mx-auto border border-[#e7d9cf]/40">
              <Settings className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-[#eeede9]">
                {merchConfig.enabled ? '¿Deshabilitar la tienda?' : '¿Habilitar la tienda?'}
              </h3>
              <p className="text-xs text-[#eeede9]/80 leading-relaxed">
                {merchConfig.enabled
                  ? 'Al deshabilitar la tienda, los alumnos no podrán realizar nuevos pedidos hasta que vuelva a ser habilitada.'
                  : 'Al habilitar la tienda, los alumnos podrán ver el catálogo y realizar reservas de productos.'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowStoreToggleModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-xs font-bold text-[#eeede9] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowStoreToggleModal(false);
                  await updateMerchConfig({ enabled: !merchConfig.enabled });
                }}
                className="flex-1 py-3 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] text-xs font-black shadow-lg transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY DELETION CONFIRMATION MODAL */}
      {categoryToDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#111111] border border-red-500/40 rounded-3xl p-6 space-y-5 shadow-2xl text-[#eeede9]">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/40">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-[#eeede9]">
                ¿Eliminar categoría?
              </h3>
              <p className="text-xs text-[#eeede9]/80 leading-relaxed">
                ¿Estás seguro de que querés eliminar la categoría <strong className="text-[#e7d9cf]">"{categoryToDeleteModal}"</strong>?
              </p>

              {(() => {
                const associatedProducts = merchProducts.filter(p => p.category === categoryToDeleteModal);
                if (associatedProducts.length > 0) {
                  return (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-left text-[11px] text-amber-200/90 mt-3 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-amber-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Atención: {associatedProducts.length} producto(s) en esta categoría</span>
                      </p>
                      <p>
                        Si la eliminás, la categoría ya no figurará en los filtros. Podés reasignarles otra categoría desde "Gestión de Productos".
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDeleteModal(null)}
                className="flex-1 py-3 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-xs font-bold text-[#eeede9] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const cat = categoryToDeleteModal;
                  setCategoryToDeleteModal(null);
                  if (cat) {
                    if (selectedCategory === cat) {
                      setSelectedCategory('all');
                    }
                    await deleteMerchCategory(cat);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black shadow-lg transition"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL (FOR ADMIN) */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/85 backdrop-blur-md">
          <form
            onSubmit={handleSaveProduct}
            className="w-full max-w-xl bg-[#111111] border border-[#e7d9cf]/40 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl text-[#eeede9] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#56554e]/30 pb-3">
              <h3 className="text-lg font-black text-[#eeede9]">
                {editingProduct.id ? 'Editar Producto' : 'Publicar Nuevo Producto'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-xl bg-[#56554e]/30 text-[#eeede9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#e7d9cf] block mb-1">
                  Categoría del Producto
                </label>
                <select
                  value={editingProduct.category || merchCategories[0] || 'Remeras'}
                  onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181715] border border-[#56554e]/50 text-xs text-[#eeede9]"
                >
                  {merchCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#e7d9cf] block mb-1">
                  Título del Producto
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.title || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  placeholder="Ej: Remera Oficial TA Bachata Academy - Oversize Black"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181715] border border-[#56554e]/50 text-xs text-[#eeede9]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#e7d9cf] block mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Detalles del corte, tipo de tela, estampa..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181715] border border-[#56554e]/50 text-xs text-[#eeede9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#e7d9cf] block mb-1">
                    Precio Total ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setEditingProduct({
                        ...editingProduct,
                        price: val,
                        depositPrice: Math.round(val * 0.5)
                      });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#181715] border border-[#56554e]/50 text-xs text-[#eeede9]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#e7d9cf] block mb-1">
                    Monto Seña 50% ($)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.depositPrice || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, depositPrice: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#181715] border border-[#56554e]/50 text-xs text-[#eeede9]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#e7d9cf] block mb-1">
                  Colores disponibles (separados por coma)
                </label>
                <input
                  type="text"
                  value={editProductColorsInput}
                  onChange={e => setEditProductColorsInput(e.target.value)}
                  placeholder="Ej: Negro, Blanco, Gris Melange"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181715] border border-[#56554e]/50 text-xs text-[#eeede9]"
                />
              </div>

              {/* Unified Product Photos & Color Assignment */}
              <div className="space-y-3 pt-2 border-t border-[#56554e]/30">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[#e7d9cf] uppercase tracking-wider block">
                      Fotos del Producto ({editingProduct.images?.length || 0})
                    </label>
                    <span className="text-[11px] text-[#eeede9]/60">
                      Subí todas las fotos necesarias y asignales su variante de color correspondiente.
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={bulkFileInputRef}
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      if (!e.target.files || e.target.files.length === 0) return;
                      const files = Array.from(e.target.files);
                      const newUrls: string[] = [];
                      for (const f of files) {
                        try {
                          const dataUrl = await compressAndReadFile(f as File);
                          newUrls.push(dataUrl);
                        } catch (err) {
                          console.error('Error reading file', err);
                        }
                      }
                      if (newUrls.length > 0) {
                        const currentImgs = editingProduct.images || [];
                        setEditingProduct({
                          ...editingProduct,
                          images: [...currentImgs, ...newUrls]
                        });
                      }
                      e.target.value = '';
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => bulkFileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] font-black text-xs transition flex items-center gap-1.5 shadow"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>[+] Cargar fotos</span>
                  </button>
                </div>

                {/* Individual Uploader for quick single image upload */}
                <div>
                  <ImageUploader
                    value=""
                    onChange={(url) => {
                      if (url) {
                        const imgs = [...(editingProduct.images || []), url];
                        setEditingProduct({ ...editingProduct, images: imgs });
                      }
                    }}
                    placeholderText="Subir 1 foto rápida..."
                  />
                </div>

                {/* Uploaded Gallery Grid with Color Tag Dropdowns */}
                {editingProduct.images && editingProduct.images.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] text-[#e7d9cf] font-bold block">
                      Asignar color a cada foto subida:
                    </span>
                    <div className="space-y-2">
                      {editingProduct.images.map((imgUrl, imgIdx) => {
                        const colorsList = editProductColorsInput.split(',').map(c => c.trim()).filter(Boolean);
                        
                        // Find current assigned color for this image URL
                        let currentAssignedColor = '';
                        if (editingProduct.colorImages) {
                          for (const [colName, val] of Object.entries(editingProduct.colorImages)) {
                            const arr = Array.isArray(val) ? val : typeof val === 'string' && val ? [val] : [];
                            if (arr.includes(imgUrl)) {
                              currentAssignedColor = colName;
                              break;
                            }
                          }
                        }

                        return (
                          <div
                            key={imgIdx}
                            className="flex items-center gap-3 bg-[#181715] p-2.5 rounded-2xl border border-[#56554e]/40"
                          >
                            <div className="w-14 h-14 rounded-xl bg-[#1b1a18] border border-[#56554e]/50 shrink-0 flex items-center justify-center overflow-hidden">
                              <img
                                src={imgUrl}
                                alt={`Foto ${imgIdx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <span className="text-[11px] font-bold text-[#eeede9] block">
                                Foto #{imgIdx + 1} {imgIdx === 0 && <span className="text-[#e7d9cf] text-[10px] ml-1">(Principal)</span>}
                              </span>

                              <select
                                value={currentAssignedColor}
                                onChange={(e) => {
                                  const newColor = e.target.value;
                                  const currentColorImages = { ...(editingProduct.colorImages || {}) };

                                  // Remove imgUrl from all color keys
                                  for (const col of Object.keys(currentColorImages)) {
                                    const raw = currentColorImages[col];
                                    const arr = Array.isArray(raw) ? raw : typeof raw === 'string' && raw ? [raw] : [];
                                    const filtered = arr.filter(u => u !== imgUrl);
                                    if (filtered.length > 0) {
                                      currentColorImages[col] = filtered;
                                    } else {
                                      delete currentColorImages[col];
                                    }
                                  }

                                  // Add imgUrl to newColor if selected
                                  if (newColor) {
                                    const existing = currentColorImages[newColor];
                                    const arr = Array.isArray(existing) ? existing : typeof existing === 'string' && existing ? [existing] : [];
                                    if (!arr.includes(imgUrl)) {
                                      currentColorImages[newColor] = [...arr, imgUrl];
                                    }
                                  }

                                  setEditingProduct({
                                    ...editingProduct,
                                    colorImages: currentColorImages
                                  });
                                }}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-[#111111] border border-[#56554e]/60 text-xs text-[#eeede9]"
                              >
                                <option value="">Todas / General (Sin color específico)</option>
                                {colorsList.map(c => (
                                  <option key={c} value={c}>
                                    🎨 Variante: {c}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const newImages = (editingProduct.images || []).filter((_, i) => i !== imgIdx);
                                const currentColorImages = { ...(editingProduct.colorImages || {}) };
                                for (const col of Object.keys(currentColorImages)) {
                                  const raw = currentColorImages[col];
                                  const arr = Array.isArray(raw) ? raw : typeof raw === 'string' && raw ? [raw] : [];
                                  const filtered = arr.filter(u => u !== imgUrl);
                                  if (filtered.length > 0) {
                                    currentColorImages[col] = filtered;
                                  } else {
                                    delete currentColorImages[col];
                                  }
                                }
                                setEditingProduct({
                                  ...editingProduct,
                                  images: newImages,
                                  colorImages: currentColorImages
                                });
                              }}
                              className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 transition shrink-0"
                              title="Eliminar foto"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#eeede9]/40 italic text-center py-2">
                    Aún no agregaste fotos para este producto.
                  </p>
                )}
              </div>

              {/* Per-product Size Guide Table Editor & How to Measure Upload */}
              <div className="space-y-3 pt-2 border-t border-[#56554e]/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-[#e7d9cf] uppercase tracking-wider block">
                      Talles Disponibles y Tabla de Medidas
                    </label>
                    <span className="text-[11px] text-[#eeede9]/60">
                      Elegí qué talles vender para esta prenda y sus medidas en cm (sólo Ancho sisa a sisa y Largo total).
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const currentSizes = [...(editingProduct.sizes || ['S', 'M', 'L', 'XL'])];
                      const newSizeName = `Talle ${currentSizes.length + 1}`;
                      currentSizes.push(newSizeName);
                      const updatedMeas = { ...(editingProduct.sizeMeasurements || {}) };
                      setEditingProduct({
                        ...editingProduct,
                        sizes: currentSizes,
                        sizeMeasurements: updatedMeas
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#e7d9cf]/15 hover:bg-[#e7d9cf]/25 text-[#e7d9cf] border border-[#e7d9cf]/30 font-bold text-xs transition flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Talle</span>
                  </button>
                </div>

                {/* Quick Talles Selector */}
                <div className="flex flex-wrap items-center gap-1.5 bg-[#181715] p-2.5 rounded-2xl border border-[#56554e]/40">
                  <span className="text-[10px] font-bold text-[#e7d9cf] mr-1 uppercase">Agregar rápido:</span>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map(quickSz => {
                    const isAdded = (editingProduct.sizes || []).includes(quickSz);
                    return (
                      <button
                        key={quickSz}
                        type="button"
                        onClick={() => {
                          const currentSizes = [...(editingProduct.sizes || [])];
                          if (isAdded) {
                            const newSizes = currentSizes.filter(s => s !== quickSz);
                            const newMeas = { ...(editingProduct.sizeMeasurements || {}) };
                            delete newMeas[quickSz];
                            setEditingProduct({ ...editingProduct, sizes: newSizes, sizeMeasurements: newMeas });
                          } else {
                            currentSizes.push(quickSz);
                            setEditingProduct({ ...editingProduct, sizes: currentSizes });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          isAdded
                            ? 'bg-[#e7d9cf] text-[#111111] border-[#e7d9cf]'
                            : 'bg-[#111111] text-[#eeede9]/70 border-[#56554e]/50 hover:bg-[#56554e]/30'
                        }`}
                      >
                        {isAdded ? `✓ ${quickSz}` : `+ ${quickSz}`}
                      </button>
                    );
                  })}
                </div>

                {/* Table of sizes and measurements */}
                <div className="space-y-2 bg-[#181715] p-3 rounded-2xl border border-[#56554e]/40">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-[#e7d9cf] uppercase px-1 pb-1 border-b border-[#56554e]/40">
                    <div className="col-span-3">Talle</div>
                    <div className="col-span-4">Ancho (sisa a sisa)</div>
                    <div className="col-span-4">Largo Total</div>
                    <div className="col-span-1 text-center">Quitar</div>
                  </div>

                  {(editingProduct.sizes || ['S', 'M', 'L', 'XL']).map((sz, sIdx) => {
                    const currentMeas = editingProduct.sizeMeasurements?.[sz] || { width: '', length: '' };
                    return (
                      <div key={sIdx} className="grid grid-cols-12 gap-2 items-center text-xs">
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={sz}
                            onChange={(e) => {
                              const newName = e.target.value;
                              const newSizes = [...(editingProduct.sizes || ['S', 'M', 'L', 'XL'])];
                              const oldName = newSizes[sIdx];
                              newSizes[sIdx] = newName;

                              const newMeas = { ...(editingProduct.sizeMeasurements || {}) };
                              if (oldName && oldName !== newName) {
                                newMeas[newName] = newMeas[oldName] || { width: '', length: '' };
                                delete newMeas[oldName];
                              }
                              setEditingProduct({
                                ...editingProduct,
                                sizes: newSizes,
                                sizeMeasurements: newMeas
                              });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#111111] border border-[#56554e]/50 text-xs text-[#eeede9] font-black uppercase"
                            placeholder="Ej: S"
                          />
                        </div>

                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="Ej: 52 cm"
                            value={currentMeas.width}
                            onChange={e => {
                              const updated = {
                                ...(editingProduct.sizeMeasurements || {}),
                                [sz]: { ...currentMeas, width: e.target.value }
                              };
                              setEditingProduct({ ...editingProduct, sizeMeasurements: updated });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#111111] border border-[#56554e]/50 text-xs text-[#eeede9]"
                          />
                        </div>

                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="Ej: 72 cm"
                            value={currentMeas.length}
                            onChange={e => {
                              const updated = {
                                ...(editingProduct.sizeMeasurements || {}),
                                [sz]: { ...currentMeas, length: e.target.value }
                              };
                              setEditingProduct({ ...editingProduct, sizeMeasurements: updated });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#111111] border border-[#56554e]/50 text-xs text-[#eeede9]"
                          />
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            title="Eliminar este talle"
                            onClick={() => {
                              const newSizes = (editingProduct.sizes || []).filter((_, i) => i !== sIdx);
                              const newMeas = { ...(editingProduct.sizeMeasurements || {}) };
                              delete newMeas[sz];
                              setEditingProduct({
                                ...editingProduct,
                                sizes: newSizes,
                                sizeMeasurements: newMeas
                              });
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <span className="text-[11px] text-[#e7d9cf]/80 block font-bold mb-1">
                    Foto de Ejemplo "Cómo Medir" Específica para este Producto:
                  </span>
                  <ImageUploader
                    value={editingProduct.sizingInstructionUrl || ''}
                    onChange={(url) => setEditingProduct({ ...editingProduct, sizingInstructionUrl: url })}
                    aspectRatio="square"
                    cropTitle="Foto 'Cómo Medir' (1024x1024)"
                    cropSubtitle="Arrastrá y ajustá el zoom para que la imagen explicativa quede en 1024x1024"
                    placeholderText="Subir foto de ejemplo de cómo medir esta prenda..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#56554e]/30 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                disabled={isSavingProduct}
                className="px-4 py-2 rounded-xl bg-[#56554e]/30 hover:bg-[#56554e]/50 text-xs font-bold text-[#eeede9] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingProduct}
                className="px-5 py-2 rounded-xl bg-[#e7d9cf] hover:bg-[#eeede9] disabled:opacity-50 text-[#111111] text-xs font-black transition flex items-center gap-2"
              >
                {isSavingProduct ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Producto</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Floating Cart Button - Only on Store Catalog page and when Store is Enabled */}
      {!embeddedAdminView && activeSubTab === 'catalogo' && merchConfig.enabled && (
        <button
          type="button"
          onClick={() => setShowCartDrawer(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#e7d9cf] hover:bg-[#eeede9] text-[#111111] flex items-center justify-center transition-all shadow-2xl hover:scale-105 active:scale-95 border-2 border-[#111111]/20 ring-4 ring-[#e7d9cf]/20"
          title="Ver Carrito"
          aria-label="Ver Carrito"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-[#111111]" />
            {cart.length > 0 && (
              <span className="absolute -top-3 -right-3 min-w-5 h-5 px-1 rounded-full bg-[#111111] text-[#e7d9cf] text-[10px] font-black flex items-center justify-center border border-[#e7d9cf]">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
          </div>
        </button>
      )}
    </div>
  );
};
