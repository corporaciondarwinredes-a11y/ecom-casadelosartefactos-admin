'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  Package,
  ShoppingCart,
  FileSpreadsheet,
  PlusCircle,
  CheckCircle,
  AlertTriangle,
  Download,
  MessageCircle,
  Zap,
  TrendingUp,
  Clock,
  Boxes,
  ShieldAlert,
  Search,
  RefreshCw,
  Plus,
  Minus,
  UserCheck,
  Users,
  ShieldCheck,
  Lock,
  LogOut,
  X,
  Layers,
  Sparkles,
  Barcode,
  Truck,
  FileText,
  Filter,
  Calendar,
  Trash2,
  Receipt,
  Building2,
  Send,
  Eye,
  EyeOff,
  Check,
  Info,
  UploadCloud,
  Image as ImageIcon,
  Key,
  Pencil,
  Printer,
  Volume2,
  VolumeX,
  BellRing,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Tag,
} from 'lucide-react';

import MarketingSettingsTab from '@/components/MarketingSettingsTab';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { getSafeImageUrl } from '@/lib/imageUtils';

interface Props {
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    profile?: {
      name?: string;
      canCatalog?: boolean;
      canOrders?: boolean;
      canValidatePayments?: boolean;
      canKardex?: boolean;
      canUsers?: boolean;
      canErpExport?: boolean;
    };
  };
  initialProducts: any[];
  initialBrands?: any[];
  initialOrders: any[];
  initialMovements: any[];
  initialUsers?: any[];
  initialProfiles?: any[];
  initialBanner?: any;
  initialBanners?: any[];
  initialAnnouncement?: any;
  initialSupportChannels?: any[];
  initialCategoryBanners?: any[];
  kpis: {
    totalSales: number;
    pendingValidationCount: number;
    totalStockUnits: number;
    lowStockAlerts: number;
    totalOrdersCount: number;
  };
}

interface AssistedCartItem {
  product: any;
  quantity: number;
}

export default function AdminDashboard({
  currentUser,
  initialProducts,
  initialBrands = [],
  initialOrders,
  initialMovements,
  initialUsers = [],
  initialProfiles = [],
  initialBanner,
  initialBanners = [],
  initialAnnouncement,
  initialSupportChannels = [],
  initialCategoryBanners = [],
  kpis,
}: Props) {
  // Roles y Privilegios RBAC
  const userRole = currentUser?.role || 'ADMIN';
  const profile = currentUser?.profile;
  const isSuperadmin = userRole === 'SUPERADMIN' || Boolean(profile?.canUsers);
  const canCatalog = userRole === 'SUPERADMIN' || userRole === 'ADMIN' || Boolean(profile?.canCatalog);
  const canOrders = userRole === 'SUPERADMIN' || userRole === 'ADMIN' || Boolean(profile?.canOrders);
  const canValidatePayments = userRole === 'SUPERADMIN' || userRole === 'ADMIN' || Boolean(profile?.canValidatePayments);
  const canKardex = userRole === 'SUPERADMIN' || userRole === 'ADMIN' || Boolean(profile?.canKardex);
  const canUsers = userRole === 'SUPERADMIN' || Boolean(profile?.canUsers);
  const canErpExport = userRole === 'SUPERADMIN' || Boolean(profile?.canErpExport);
  const isSellerRole =
    userRole === 'SELLER' ||
    Boolean(profile?.name?.includes('Asesor')) ||
    Boolean(profile?.name?.includes('Venta')) ||
    (!isSuperadmin && !canValidatePayments && canOrders);

  // Tab inicial según perfil
  const defaultTab = !canCatalog && canOrders ? 'manualOrder' : 'orders';
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'brands' | 'kardex' | 'manualOrder' | 'users' | 'marketing'>(defaultTab);

  const [products, setProducts] = useState(initialProducts);
  const [brands, setBrands] = useState(initialBrands);
  const [orders, setOrders] = useState(initialOrders);
  const [movements, setMovements] = useState(initialMovements);
  const [adminUsers, setAdminUsers] = useState(initialUsers);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [uploadingVoucherId, setUploadingVoucherId] = useState<string | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<any | null>(null);
  const [viewingVoucherOrder, setViewingVoucherOrder] = useState<any | null>(null);
  const [voucherZoom, setVoucherZoom] = useState<number>(1);
  const [voucherRotation, setVoucherRotation] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filtros de Órdenes
  const [orderFilter, setOrderFilter] = useState<string>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [orderSearchTerm, setOrderSearchTerm] = useState<string>('');

  // Filtros de Catálogo, Marcas y Kardex
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [brandSearch, setBrandSearch] = useState<string>('');
  const [kardexProductFilter, setKardexProductFilter] = useState<string>('ALL');

  // Modales
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [brandForm, setBrandForm] = useState({
    name: '',
    description: '',
    category: 'TELEVISORES',
    order: 0,
    isActive: true,
    logo: '',
  });

  // Modal para Cambiar Estado de Pedido y Revertir Validación
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [changingStatusOrder, setChangingStatusOrder] = useState<any | null>(null);
  const [newOrderStatus, setNewOrderStatus] = useState<string>('PENDING');
  const [newPaymentStatus, setNewPaymentStatus] = useState<string>('PENDING_VALIDATION');
  const [statusChangeReason, setStatusChangeReason] = useState<string>('');

  const [showKardexModal, setShowKardexModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [successOrderModal, setSuccessOrderModal] = useState<any | null>(null);

  // ==========================================
  // ESTADO: CARRITO VISUAL DE VENTA ASISTIDA (POS)
  // ==========================================
  const [assistedCart, setAssistedCart] = useState<AssistedCartItem[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('ALL');

  // Datos del Cliente en Venta Asistida
  const [docType, setDocType] = useState<'DNI' | 'RUC'>('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientDistrict, setClientDistrict] = useState('Central');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFERENCIA');
  const [assistedNotes, setAssistedNotes] = useState('Venta asistida por asesor comercial');

  // Modalidad de Entrega y Destino POS
  const [assistedDeliveryType, setAssistedDeliveryType] = useState<'DELIVERY' | 'STORE_PICKUP'>('DELIVERY');
  const [assistedLocation, setAssistedLocation] = useState<'LIMA' | 'PROVINCIA'>('LIMA');
  const [assistedDepartment, setAssistedDepartment] = useState('Arequipa');
  const [assistedProvinceCity, setAssistedProvinceCity] = useState('');
  const [assistedAgencyOrAddress, setAssistedAgencyOrAddress] = useState('');

  // Comprobante de Pago en Venta Asistida
  const [assistedVoucherFile, setAssistedVoucherFile] = useState<File | null>(null);
  const [assistedVoucherPreview, setAssistedVoucherPreview] = useState<string | null>(null);
  const [assistedVoucherUrl, setAssistedVoucherUrl] = useState<string | null>(null);
  const [uploadingAssistedVoucher, setUploadingAssistedVoucher] = useState(false);

  const handleUploadAssistedVoucher = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAssistedVoucherFile(file);
    setAssistedVoucherPreview(URL.createObjectURL(file));
    setUploadingAssistedVoucher(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'receipts');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setAssistedVoucherUrl(data.url);
      } else {
        alert(`Error al guardar imagen de comprobante: ${data.error || 'Error'}`);
      }
    } catch (err: any) {
      console.error('Error uploading assisted voucher:', err);
      alert('Error de conexión al subir imagen de comprobante.');
    } finally {
      setUploadingAssistedVoucher(false);
    }
  };

  // ==========================================
  // FORMULARIOS DE NUEVO PRODUCTO Y KARDEX
  // ==========================================
  const [newProduct, setNewProduct] = useState({
    name: '',
    brand: 'Samsung',
    category: 'TELEVISORES',
    modelCode: '',
    sku: '',
    barcode: '',
    retailPrice: 0,
    price: 0,
    stock: 5,
    energyRating: 'A+',
    voltage: '220V / 60Hz',
    dimensions: '',
    weightKg: 0,
    warrantyMonths: 12,
    image: '',
    images: [] as string[],
    description: '',
    specifications: '',
    isFeatured: false,
  });

  const [uploadingProductImages, setUploadingProductImages] = useState(false);
  const [productUploadList, setProductUploadList] = useState<
    Array<{ id: string; previewUrl: string; uploadedUrl?: string; isUploading: boolean; name: string }>
  >([]);

  // Subir fotos del producto directamente a disco local C:\ecom-artefactos-uploads\products con previsualización instantánea
  const handleUploadProductImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    // Previsualización dinámica inmediata
    const newItems = fileArray.map((f) => ({
      id: Math.random().toString(36).substring(2, 9),
      previewUrl: URL.createObjectURL(f),
      isUploading: true,
      name: f.name,
    }));

    setProductUploadList((prev) => [...prev, ...newItems]);
    setUploadingProductImages(true);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const item = newItems[i];
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'products');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.url) {
          setProductUploadList((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, uploadedUrl: data.url, isUploading: false } : it))
          );
          setNewProduct((prev) => {
            const nextImages = [...prev.images, data.url];
            return {
              ...prev,
              images: nextImages,
              image: prev.image || nextImages[0],
            };
          });
        } else {
          setProductUploadList((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, isUploading: false } : it))
          );
          alert(`Error al guardar foto "${file.name}": ${data.error || 'No se pudo guardar en disco C'}`);
        }
      } catch (err: any) {
        console.error('Error uploading product image:', err);
        setProductUploadList((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, isUploading: false } : it))
        );
      }
    }

    setUploadingProductImages(false);
  };

  const handleSetPrimaryProductImage = (url: string) => {
    setNewProduct((prev) => {
      const reordered = [url, ...prev.images.filter((u) => u !== url)];
      return {
        ...prev,
        images: reordered,
        image: url,
      };
    });
  };

  const handleRemoveProductImage = (url: string) => {
    setNewProduct((prev) => {
      const filtered = prev.images.filter((u) => u !== url);
      return {
        ...prev,
        images: filtered,
        image: filtered[0] || '',
      };
    });
    setProductUploadList((prev) => prev.filter((it) => it.uploadedUrl !== url && it.previewUrl !== url));
  };

  const [kardexEntry, setKardexEntry] = useState({
    productId: products[0]?.id || '',
    type: 'MANUAL_RESTOCK',
    direction: 'IN',
    quantity: 5,
    reference: '',
    note: '',
  });

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    documentNumber: '',
    role: 'ADMIN',
    profileId: initialProfiles[0]?.id || '',
  });

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [changePasswordUser, setChangePasswordUser] = useState<any | null>(null);
  const [changePasswordInput, setChangePasswordInput] = useState('');

  // Refrescar todos los datos
  const refreshAllData = async () => {
    try {
      const [resProd, resOrd, resMov, resBrands] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders'),
        fetch('/api/stock-audits'),
        fetch('/api/brands'),
      ]);

      if (resProd.ok) setProducts(await resProd.json());
      if (resOrd.ok) setOrders(await resOrd.json());
      if (resMov.ok) setMovements(await resMov.json());
      if (resBrands.ok) setBrands(await resBrands.json());

      if (isSuperadmin) {
        const resUsers = await fetch('/api/users');
        if (resUsers.ok) setAdminUsers(await resUsers.json());
      }
    } catch (e) {
      console.error('Error refreshing data:', e);
    }
  };

  // Notificaciones en tiempo real por SSE con alertas sonoras y actualización automática
  const {
    soundEnabled,
    toggleSound,
    connected: isRealtimeConnected,
    latestOrderAlert,
    dismissAlert,
  } = useRealtimeOrders({
    currentUserId: currentUser?.id,
    currentUserName: currentUser?.name || undefined,
    userRole,
    onNewOrder: (order) => {
      // Refrescar automáticamente la tabla de órdenes sin necesidad de F5
      refreshAllData();
      setFeedbackMessage(`¡Nuevo Pedido en Vivo: ${order.orderNumber} por S/ ${Number(order.totalAmount).toFixed(2)}!`);
      setTimeout(() => setFeedbackMessage(null), 5000);
    },
  });

  // ==========================================
  // FILTRADO DINÁMICO DE ÓRDENES POR FECHA Y ASESOR
  // ==========================================
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return orders.filter((order) => {
      // 0. Si el usuario es Asesor comercial, solo puede ver sus pedidos asignados o generados por él
      if (isSellerRole) {
        const myId = currentUser?.id;
        const myName = currentUser?.name?.toLowerCase().trim();
        const assignedId = order.assignedAdvisorId;
        const assignedName = order.assignedAdvisorName?.toLowerCase().trim();
        const createdById = order.userId;
        const notes = (order.customerNotes || '').toLowerCase();

        const isMine =
          Boolean(myId && (assignedId === myId || createdById === myId)) ||
          Boolean(myName && (assignedName === myName || notes.includes(myName)));

        if (!isMine) return false;
      }

      // 1. Filtro de estado
      if (orderFilter === 'PENDING' && order.paymentStatus !== 'PENDING_VALIDATION') return false;
      if (orderFilter === 'VALIDATED' && order.paymentStatus !== 'VALIDATED') return false;

      // 2. Filtro de texto
      if (orderSearchTerm) {
        const term = orderSearchTerm.toLowerCase();
        const matchesOrder = order.orderNumber?.toLowerCase().includes(term);
        const matchesClient = order.customerName?.toLowerCase().includes(term);
        const matchesDoc = order.customerDocNumber?.toLowerCase().includes(term);
        if (!matchesOrder && !matchesClient && !matchesDoc) return false;
      }

      // 3. Filtro de Intervalo de Fechas
      const orderDate = new Date(order.createdAt);

      if (dateRangePreset === 'TODAY') {
        return orderDate >= startOfToday && orderDate <= endOfToday;
      }

      if (dateRangePreset === 'YESTERDAY') {
        const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
        const endOfYesterday = new Date(startOfToday.getTime() - 1);
        return orderDate >= startOfYesterday && orderDate <= endOfYesterday;
      }

      if (dateRangePreset === 'LAST_7_DAYS') {
        const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= sevenDaysAgo;
      }

      if (dateRangePreset === 'THIS_MONTH') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }

      if (dateRangePreset === 'CUSTOM') {
        if (customStartDate && orderDate < new Date(customStartDate)) return false;
        if (customEndDate && orderDate > new Date(customEndDate + 'T23:59:59')) return false;
        return true;
      }

      return true; // 'ALL'
    });
  }, [orders, orderFilter, dateRangePreset, customStartDate, customEndDate, orderSearchTerm, isSellerRole, currentUser]);

  // Contadores rápidos para la barra de fechas
  const countTodayOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return orders.filter((o) => {
      if (isSellerRole) {
        const myId = currentUser?.id;
        const myName = currentUser?.name?.toLowerCase().trim();
        const assignedId = o.assignedAdvisorId;
        const assignedName = o.assignedAdvisorName?.toLowerCase().trim();
        const createdById = o.userId;
        const notes = (o.customerNotes || '').toLowerCase();

        const isMine =
          Boolean(myId && (assignedId === myId || createdById === myId)) ||
          Boolean(myName && (assignedName === myName || notes.includes(myName)));

        if (!isMine) return false;
      }
      const d = new Date(o.createdAt);
      return d >= startOfToday && d <= endOfToday;
    }).length;
  }, [orders, isSellerRole, currentUser]);

  // ==========================================
  // OPERACIONES DE VENTA ASISTIDA (POS)
  // ==========================================
  const addToAssistedCart = (product: any) => {
    if (product.stock <= 0) {
      alert(`El artefacto ${product.name} no cuenta con existencias físicas en bodega.`);
      return;
    }

    setAssistedCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Existencias máximas alcanzadas (${product.stock} unidades disponibles en almacén).`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateAssistedQty = (productId: string, delta: number) => {
    setAssistedCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock) {
              alert(`Solo hay ${item.product.stock} unidades en almacén.`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as AssistedCartItem[]
    );
  };

  const removeFromAssistedCart = (productId: string) => {
    setAssistedCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Cálculos contables del Carrito Asistido
  const cartSubtotal = assistedCart.reduce(
    (acc, it) => acc + it.product.price * it.quantity,
    0
  );
  const cartTotalUnits = assistedCart.reduce((acc, it) => acc + it.quantity, 0);
  const igvAmount = (cartSubtotal * 18) / 118; // 18% incluido
  const baseImponible = cartSubtotal - igvAmount;

  // Emitir Orden Asistida
  const handleCreateAssistedOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assistedCart.length === 0) {
      alert('Agregue al menos un artefacto al carrito de venta asistida.');
      return;
    }
    if (!docNumber || !clientName || !clientPhone) {
      alert('Por favor complete los datos obligatorios del cliente (Documento, Nombre, Teléfono).');
      return;
    }

    if (assistedDeliveryType === 'DELIVERY') {
      if (assistedLocation === 'LIMA' && !clientAddress) {
        alert('Por favor ingrese la dirección de entrega en Lima.');
        return;
      }
      if (assistedLocation === 'PROVINCIA' && (!assistedDepartment || !assistedAgencyOrAddress)) {
        alert('Por favor indique el departamento y la dirección o agencia de envío en provincia.');
        return;
      }
    }

    setLoadingAction('create-assisted-order');
    try {
      const itemsPayload = assistedCart.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
      }));

      const effectiveShippingAddress = assistedDeliveryType === 'STORE_PICKUP'
        ? 'Recojo en Almacén Central — Av. Los Faisanes 120, Chorrillos, Lima'
        : assistedLocation === 'LIMA'
        ? clientAddress.trim()
        : assistedAgencyOrAddress.trim();

      const effectiveShippingCity = assistedDeliveryType === 'STORE_PICKUP'
        ? 'Lima'
        : assistedLocation === 'LIMA'
        ? 'Lima'
        : assistedDepartment.trim();

      const effectiveShippingDistrict = assistedDeliveryType === 'STORE_PICKUP'
        ? 'Almacén Central'
        : assistedLocation === 'LIMA'
        ? clientDistrict
        : (assistedProvinceCity.trim() || assistedDepartment.trim());

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: clientName.trim(),
          customerEmail: clientEmail.trim() || `cliente.${docNumber}@casadelosartefactos.pe`,
          customerPhone: clientPhone.trim(),
          customerDocType: docType,
          customerDocNumber: docNumber.trim(),
          customerFiscalName: docType === 'RUC' ? clientName.trim() : null,
          shippingAddress: effectiveShippingAddress,
          shippingCity: effectiveShippingCity,
          shippingDistrict: effectiveShippingDistrict,
          deliveryType: assistedDeliveryType,
          paymentMethod,
          paymentReceiptUrl: assistedVoucherUrl || null,
          customerNotes: `[ASESOR: ${currentUser?.name || currentUser?.email}] - ${assistedNotes}`,
          items: itemsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Error al generar orden asistida: ${data.error}`);
        return;
      }

      const orderObj = data.order || data;
      setSuccessOrderModal({
        ...orderObj,
        whatsappUrl: data.whatsappUrl,
      });
      setAssistedCart([]);
      setDocNumber('');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setClientAddress('');
      setAssistedAgencyOrAddress('');
      setAssistedProvinceCity('');
      setAssistedVoucherFile(null);
      setAssistedVoucherPreview(null);
      setAssistedVoucherUrl(null);

      setFeedbackMessage(`¡Orden de Venta Asistida ${orderObj.orderNumber} emitida exitosamente!`);
      setTimeout(() => setFeedbackMessage(null), 3500);

      refreshAllData();
    } catch (err: any) {
      alert('Error de conexión al emitir la orden.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Validar Pago (Solo usuarios autorizados: Tesorería / Superadmin)
  const handleValidatePayment = async (orderId: string) => {
    if (!canValidatePayments) {
      alert('Acceso Denegado: Su perfil no tiene autorización para validar pagos ni descargar inventario.');
      return;
    }

    setLoadingAction(`validate-${orderId}`);
    try {
      const res = await fetch(`/api/orders/${orderId}/validate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error}`);
        return;
      }

      setFeedbackMessage('¡Pago validado exitosamente! El stock ha sido descargado de almacén.');
      setTimeout(() => setFeedbackMessage(null), 3000);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'PAID', paymentStatus: 'VALIDATED', stockDeducted: true }
            : o
        )
      );

      refreshAllData();
    } catch (e: any) {
      alert('Error al validar el pago');
    } finally {
      setLoadingAction(null);
    }
  };

  // Modificar Estado Operacional / Financiero del Pedido y Reversión de Validación
  const handleUpdateOrderStatus = async (
    orderId: string,
    targetStatus: string,
    targetPaymentStatus: string,
    reason?: string
  ) => {
    if (!canValidatePayments) {
      alert('Acceso Denegado: Su perfil no tiene autorización para modificar estados de pedidos ni inventario.');
      return;
    }

    setLoadingAction(`status-${orderId}`);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          paymentStatus: targetPaymentStatus,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Error al actualizar estado: ${data.error}`);
        return;
      }

      setFeedbackMessage(
        data.stockReverted
          ? '✓ Validación corregida: el stock ha sido devuelto a bodega e ingresado en Kardex.'
          : data.stockDeducted
          ? '✓ Pago validado y stock descargado de bodega exitosamente.'
          : '✓ Estado del pedido actualizado exitosamente.'
      );
      setTimeout(() => setFeedbackMessage(null), 3500);

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...data.order } : o))
      );

      setShowStatusModal(false);
      setChangingStatusOrder(null);
      refreshAllData();
    } catch (e: any) {
      alert('Error de conexión al actualizar el pedido');
    } finally {
      setLoadingAction(null);
    }
  };

  // Desactivar / Activar Producto (Visibilidad en la Tienda)
  const handleToggleAvailability = async (productId: string, currentAvailable: boolean) => {
    if (!canCatalog) {
      alert('Acceso Denegado: Su perfil no tiene permisos para modificar la disponibilidad de artefactos.');
      return;
    }

    const newStatus = !currentAvailable;
    setLoadingAction(`availability-${productId}`);
    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, isAvailable: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar visibilidad');

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isAvailable: newStatus } : p))
      );
      setFeedbackMessage(
        newStatus
          ? '✓ Artefacto reactivado: visible para clientes en la tienda online.'
          : '✓ Artefacto desactivado: oculto del catálogo, no se mostrará a los clientes.'
      );
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Error al cambiar la disponibilidad del producto');
    } finally {
      setLoadingAction(null);
    }
  };

  // Subir voucher de pago directamente desde la lista de pedidos
  const handleUploadOrderVoucher = async (orderId: string, file: File) => {
    setUploadingVoucherId(orderId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'vouchers');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'Error al subir la imagen del comprobante');
      }

      const receiptUrl = uploadData.url;

      // Actualizar pedido en base de datos
      const patchRes = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentReceiptUrl: receiptUrl }),
      });

      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(patchData.error || 'Error al vincular el comprobante al pedido');
      }

      // Actualizar estado local reactivo
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                paymentReceiptUrl: receiptUrl,
                paymentStatus: o.paymentStatus === 'PENDING_PAYMENT' ? 'PENDING_VALIDATION' : o.paymentStatus,
              }
            : o
        )
      );

      setFeedbackMessage('¡Comprobante de pago cargado exitosamente y enviado a validación de Tesorería!');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      console.error('Error uploading order voucher:', err);
      alert(err.message || 'Error al subir comprobante');
    } finally {
      setUploadingVoucherId(null);
    }
  };

  // Calibración Rápida de Stock (+1, -1, +5)
  const handleQuickStock = async (productId: string, delta: number) => {
    if (!canCatalog) {
      alert('Su perfil no tiene permisos para calibrar stock.');
      return;
    }

    setLoadingAction(`stock-${productId}`);
    try {
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delta,
          note: `Calibración rápida desde Suite Administrativa (${delta > 0 ? '+' : ''}${delta})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: data.product.stock } : p))
      );

      refreshAllData();
    } catch (e: any) {
      alert('Error al actualizar stock');
    } finally {
      setLoadingAction(null);
    }
  };

  // Iniciar Edición de Producto
  const handleEditProduct = (prod: any) => {
    setEditingProduct(prod);
    const prodImages = Array.isArray(prod.images) && prod.images.length > 0
      ? prod.images.map((i: any) => (typeof i === 'string' ? i : i.url))
      : (prod.image ? [prod.image] : []);

    setNewProduct({
      name: prod.name || '',
      brand: prod.brand || 'Samsung',
      category: prod.category || 'TELEVISORES',
      modelCode: prod.modelCode || '',
      sku: prod.sku || '',
      barcode: prod.barcode || '',
      retailPrice: prod.retailPrice || prod.price || 0,
      price: prod.price || 0,
      stock: prod.stock || 0,
      energyRating: prod.energyRating || 'A+',
      voltage: prod.voltage || '220V / 60Hz',
      dimensions: prod.dimensions || '',
      weightKg: prod.weightKg || 0,
      warrantyMonths: prod.warrantyMonths || 12,
      image: prod.image || (prodImages[0] || ''),
      images: prodImages,
      description: prod.description || '',
      specifications: prod.specifications || '',
      isFeatured: Boolean(prod.isFeatured),
    });
    setProductUploadList([]);
    setShowProductModal(true);
  };

  // Iniciar Creación de Producto Nuevo
  const handleOpenNewProductModal = () => {
    setEditingProduct(null);
    setNewProduct({
      name: '',
      brand: brands[0]?.name || 'Samsung',
      category: 'TELEVISORES',
      modelCode: '',
      sku: '',
      barcode: '',
      retailPrice: 0,
      price: 0,
      stock: 5,
      energyRating: 'A+',
      voltage: '220V / 60Hz',
      dimensions: '',
      weightKg: 0,
      warrantyMonths: 12,
      image: '',
      images: [],
      description: '',
      specifications: '',
      isFeatured: false,
    });
    setProductUploadList([]);
    setShowProductModal(true);
  };

  // Guardar (Crear o Actualizar) Producto en Catálogo
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction('save-product');

    try {
      const mainImage = newProduct.image || (newProduct.images.length > 0 ? newProduct.images[0] : '');
      if (!mainImage && newProduct.images.length === 0) {
        alert('Por favor sube al menos una foto del producto desde tu PC.');
        setLoadingAction(null);
        return;
      }

      if (editingProduct) {
        // ACTUALIZAR PRODUCTO EXISTENTE (PUT /api/products/[id])
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newProduct,
            image: mainImage,
            images: newProduct.images.length > 0 ? newProduct.images : [mainImage],
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          alert(`Error al actualizar artefacto: ${data.error}`);
          return;
        }

        setFeedbackMessage(`¡Artefacto "${data.product.name}" actualizado correctamente en el catálogo!`);
        setTimeout(() => setFeedbackMessage(null), 3500);

        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? data.product : p))
        );
      } else {
        // CREAR NUEVO PRODUCTO (POST /api/products)
        const generatedSlug = (newProduct.brand + '-' + newProduct.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4);

        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newProduct,
            image: mainImage,
            images: newProduct.images.length > 0 ? newProduct.images : [mainImage],
            slug: generatedSlug,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          alert(`Error al registrar artefacto: ${data.error}`);
          return;
        }

        setFeedbackMessage(`¡Artefacto "${data.name}" registrado en catálogo con ${newProduct.images.length || 1} fotos e inicializado en Kardex!`);
        setTimeout(() => setFeedbackMessage(null), 3500);

        setProducts((prev) => [data, ...prev]);
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setProductUploadList([]);
      refreshAllData();
    } catch (err: any) {
      alert('Error al guardar el artefacto.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Eliminar Producto
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!canCatalog) return;
    if (!confirm(`¿Estás seguro de eliminar el artefacto "${productName}" del catálogo?`)) return;

    setLoadingAction(`delete-prod-${productId}`);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al eliminar producto');
        return;
      }
      setFeedbackMessage(data.message || 'Artefacto procesado exitosamente.');
      setTimeout(() => setFeedbackMessage(null), 3500);
      refreshAllData();
    } catch (e) {
      alert('Error de conexión al eliminar producto');
    } finally {
      setLoadingAction(null);
    }
  };

  // OPERACIONES DE MARCAS
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) return;

    setLoadingAction('save-brand');
    try {
      if (editingBrand) {
        const res = await fetch('/api/brands', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingBrand.id, ...brandForm }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Error al actualizar marca');
          return;
        }
        setFeedbackMessage(`✓ Marca "${data.name}" actualizada exitosamente.`);
        setBrands((prev) => prev.map((b) => (b.id === editingBrand.id ? data : b)));
      } else {
        const res = await fetch('/api/brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(brandForm),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Error al registrar marca');
          return;
        }
        setFeedbackMessage(`✓ Marca "${data.name}" registrada en el sistema oficial.`);
        setBrands((prev) => [...prev, data]);
      }
      setTimeout(() => setFeedbackMessage(null), 3500);
      setShowBrandModal(false);
      setEditingBrand(null);
      setBrandForm({ name: '', description: '', category: 'TELEVISORES', order: 0, isActive: true, logo: '' });
    } catch (err) {
      alert('Error al guardar marca');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteBrand = async (brandId: string, brandName: string) => {
    if (!confirm(`¿Eliminar la marca "${brandName}" del registro oficial?`)) return;
    setLoadingAction(`delete-brand-${brandId}`);
    try {
      const res = await fetch(`/api/brands?id=${brandId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al eliminar marca');
        return;
      }
      setFeedbackMessage(`✓ Marca "${brandName}" eliminada del registro.`);
      setTimeout(() => setFeedbackMessage(null), 3500);
      setBrands((prev) => prev.filter((b) => b.id !== brandId));
    } catch (err) {
      alert('Error al eliminar marca');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleBrandActive = async (brandId: string, currentActive: boolean) => {
    setLoadingAction(`toggle-brand-${brandId}`);
    try {
      const res = await fetch('/api/brands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: brandId, isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al modificar estado de la marca');
        return;
      }
      setBrands((prev) => prev.map((b) => (b.id === brandId ? { ...b, isActive: !currentActive } : b)));
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setLoadingAction(null);
    }
  };

  // Crear Asiento en Kardex
  const handleCreateKardexEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction('create-kardex');

    try {
      const res = await fetch('/api/stock-audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kardexEntry),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Error en Kardex: ${data.error}`);
        return;
      }

      setFeedbackMessage(data.message || 'Asiento de Kardex registrado exitosamente');
      setTimeout(() => setFeedbackMessage(null), 3500);

      setShowKardexModal(false);
      refreshAllData();
    } catch (err: any) {
      alert('Error al registrar asiento de Kardex.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Abrir Modal Crear Operador
  const openCreateUserModal = () => {
    setEditingUser(null);
    setNewUser({
      name: '',
      email: '',
      password: '',
      phone: '',
      documentNumber: '',
      role: 'ADMIN',
      profileId: initialProfiles[0]?.id || '',
    });
    setShowUserModal(true);
  };

  // Abrir Modal Editar Operador
  const openEditUserModal = (u: any) => {
    setEditingUser(u);
    setNewUser({
      name: u.name || '',
      email: u.email || '',
      password: '', // En blanco para mantener contraseña existente
      phone: u.phone || '',
      documentNumber: u.documentNumber || '',
      role: u.role || 'ADMIN',
      profileId: u.profile?.id || initialProfiles[0]?.id || '',
    });
    setShowUserModal(true);
  };

  // Guardar (Crear o Actualizar) Usuario Operador
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction('save-user');

    try {
      const isEditing = Boolean(editingUser);
      const url = '/api/users';
      const method = isEditing ? 'PATCH' : 'POST';
      const payload = isEditing ? { id: editingUser.id, ...newUser } : newUser;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Error al guardar operador: ${data.error}`);
        return;
      }

      setFeedbackMessage(
        isEditing
          ? `Operador "${data.user?.name || newUser.name}" actualizado correctamente.`
          : `Operador "${data.name}" registrado con credenciales encriptadas.`
      );
      setTimeout(() => setFeedbackMessage(null), 3500);

      setShowUserModal(false);
      setEditingUser(null);
      setNewUser({
        name: '',
        email: '',
        password: '',
        phone: '',
        documentNumber: '',
        role: 'ADMIN',
        profileId: initialProfiles[0]?.id || '',
      });

      refreshAllData();
    } catch (err: any) {
      alert('Error al guardar el operador.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Eliminar Operador
  const handleDeleteUser = async (userToDelete: any) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar al operador "${userToDelete.name}" (${userToDelete.email})? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      setLoadingAction(`delete-user-${userToDelete.id}`);
      const res = await fetch(`/api/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error al eliminar operador: ${data.error}`);
        return;
      }

      setFeedbackMessage(`Operador "${userToDelete.name}" eliminado correctamente.`);
      setTimeout(() => setFeedbackMessage(null), 3500);
      refreshAllData();
    } catch (err) {
      alert('Error al eliminar el operador.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Cambiar Contraseña Directamente
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePasswordUser || !changePasswordInput.trim()) return;

    try {
      setLoadingAction('change-password');
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: changePasswordUser.id,
          password: changePasswordInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Error al cambiar contraseña: ${data.error}`);
        return;
      }

      setFeedbackMessage(`Contraseña actualizada con éxito para "${changePasswordUser.name}".`);
      setTimeout(() => setFeedbackMessage(null), 3500);
      setChangePasswordUser(null);
      setChangePasswordInput('');
      refreshAllData();
    } catch (err) {
      alert('Error al actualizar contraseña.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Filtros del Catálogo POS de Venta Asistida
  const posFilteredProducts = products.filter((p) => {
    const matchesCategory = posCategory === 'ALL' || p.category === posCategory;
    const matchesSearch =
      !posSearch ||
      p.name?.toLowerCase().includes(posSearch.toLowerCase()) ||
      p.brand?.toLowerCase().includes(posSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(posSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filtro de Kardex
  const filteredMovements = movements.filter((m) => {
    if (kardexProductFilter === 'ALL') return true;
    return m.productId === kardexProductFilter;
  });

  const kardexTotalIn = filteredMovements.reduce((acc, m) => acc + (m.inQuantity || (m.changeQuantity > 0 ? m.changeQuantity : 0)), 0);
  const kardexTotalOut = filteredMovements.reduce((acc, m) => acc + (m.outQuantity || (m.changeQuantity < 0 ? Math.abs(m.changeQuantity) : 0)), 0);
  const selectedKardexProduct = products.find((p) => p.id === kardexProductFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* MENSAJE DE FEEDBACK OPERATIVO */}
      {feedbackMessage && (
        <div className="p-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg flex items-center justify-between text-xs animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-white" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-white hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER: OPERADOR & PERFIL RBAC ACTIVO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <img
            src="/logo-darwin.png"
            alt="Corporación Darwin"
            className="h-14 w-auto object-contain flex-shrink-0 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-2xs"
          />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Entorno Seguro • Control por Privilegios RBAC
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Panel de Control Administrativo & Kardex
            </h1>
            <p className="text-xs text-slate-500">
              Corporación Darwin S.A.C. — Gestión comercial, inventario físico y tesorería.
            </p>
          </div>
        </div>

        {/* PERFIL OPERADOR Y LOGOUT */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow">
            {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'OP'}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-black text-slate-900 leading-tight">
              {currentUser?.name || currentUser?.email}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider ${
                  userRole === 'SUPERADMIN'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : profile?.name?.includes('Venta')
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : profile?.name?.includes('Tesor')
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {profile?.name || userRole}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentUser?.email}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="ml-2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            title="Cerrar Sesión Segura"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* CONTROL DE ALERTAS SONORAS & ESTADO EN VIVO (SSE) */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Badge de conexión en vivo */}
          <div
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all ${
              isRealtimeConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
            title={isRealtimeConnected ? 'Conectado a alertas de pedidos en vivo por SSE' : 'Reconectando canal de eventos...'}
          >
            <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
            <span>{isRealtimeConnected ? 'Alertas en Vivo' : 'Reconectando...'}</span>
          </div>

          {/* Botón de Sonido ON/OFF */}
          <button
            type="button"
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border shadow-2xs ${
              soundEnabled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
            }`}
            title={soundEnabled ? 'Alertas sonoras activadas (Clic para silenciar)' : 'Alertas silenciadas (Clic para activar sonido)'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-100 animate-pulse" />
                <span>Sonido (ON)</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span>Sonido (OFF)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPIS EJECUTIVOS COMPACTOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Ventas Validadas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-slate-900 mt-1">
            S/ {kpis.totalSales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Por Validar Pago</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-amber-700 mt-1">
            {kpis.pendingValidationCount} pedidos
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Stock Central</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-slate-900 mt-1">
            {kpis.totalStockUnits} unidades ({products.length} artefactos)
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Stock Crítico (≤ 5)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-lg font-black text-rose-700 mt-1">
            {kpis.lowStockAlerts} modelos
          </p>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN (CONTROLADAS POR RBAC) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. ÓRDENES (Visible si canOrders) */}
          {canOrders && (
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'orders'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Órdenes & Validación</span>
              {kpis.pendingValidationCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                  {kpis.pendingValidationCount}
                </span>
              )}
            </button>
          )}

          {/* 2. VENTA ASISTIDA VISUAL (Visible para Vendedores, Superadmin o canOrders) */}
          {canOrders && (
            <button
              onClick={() => setActiveTab('manualOrder')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'manualOrder'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-blue-300" />
              <span>Venta Asistida POS ({assistedCart.length} en carrito)</span>
            </button>
          )}

          {/* 3. CATÁLOGO (Visible si canCatalog) */}
          {canCatalog && (
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'catalog'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Catálogo ({products.length})</span>
            </button>
          )}

          {/* 4. REGISTRO DE MARCAS OFICIALES (Visible si canCatalog) */}
          {canCatalog && (
            <button
              onClick={() => setActiveTab('brands')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'brands'
                  ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Tag className="w-4 h-4 text-amber-500" />
              <span>Registro de Marcas ({brands.length})</span>
            </button>
          )}

          {/* 4. KARDEX (Visible si canKardex) */}
          {canKardex && (
            <button
              onClick={() => setActiveTab('kardex')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'kardex'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Kardex Calculado</span>
            </button>
          )}

          {/* 5. USUARIOS RBAC (Solo Superadmin) */}
          {isSuperadmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'users'
                  ? 'bg-purple-900 text-white shadow-md shadow-purple-900/20'
                  : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
              }`}
            >
              <Users className="w-4 h-4 text-purple-600" />
              <span>Usuarios & RBAC ({adminUsers.length})</span>
            </button>
          )}

          {/* 6. CAMPAÑAS, BANNERS & ATENCIÓN (Solo Superadmin o usuarios con permiso de Catálogo) */}
          {(isSuperadmin || canCatalog) && (
            <button
              onClick={() => setActiveTab('marketing')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'marketing'
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md shadow-blue-600/25'
                  : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Campañas, Banners & Atención</span>
            </button>
          )}
        </div>

        <button
          onClick={refreshAllData}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold bg-white border border-slate-200 px-3 py-2 rounded-xl transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* PESTAÑA 1: ÓRDENES CON FILTRO PREDETERMINADO DEL DÍA */}
      {/* ======================================================== */}
      {activeTab === 'orders' && canOrders && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Gestión & Validación de Órdenes</span>
                {dateRangePreset === 'TODAY' && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full">
                    Mostrando Pedidos de Hoy
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {canValidatePayments
                  ? 'Tienes permisos para validar pagos y autorizar la descarga física de almacén.'
                  : 'Perfil de Asesor Comercial: puedes consultar órdenes y dar soporte, pero la validación de pago la ejecuta Tesorería.'}
              </p>
              {isSellerRole && (
                <div className="mt-2.5 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-xl text-xs font-semibold">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                  <span>
                    Vista de Asesor Comercial: Mostrando únicamente tus pedidos asignados ({currentUser?.name || currentUser?.email || 'Asesor'}).
                  </span>
                </div>
              )}
            </div>

            {/* Búsqueda rápida de orden */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                placeholder="Buscar por N° pedido, cliente o DNI..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* BARRA DE INTERVALO DE FECHAS (PREDETERMINADO HOY) */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mr-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Intervalo:
              </span>

              <button
                onClick={() => setDateRangePreset('TODAY')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateRangePreset === 'TODAY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                ☀️ Hoy ({countTodayOrders})
              </button>

              <button
                onClick={() => setDateRangePreset('YESTERDAY')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateRangePreset === 'YESTERDAY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Ayer
              </button>

              <button
                onClick={() => setDateRangePreset('LAST_7_DAYS')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateRangePreset === 'LAST_7_DAYS'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Últimos 7 días
              </button>

              <button
                onClick={() => setDateRangePreset('THIS_MONTH')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateRangePreset === 'THIS_MONTH'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Este Mes
              </button>

              <button
                onClick={() => setDateRangePreset('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateRangePreset === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Histórico Completo ({orders.length})
              </button>

              <button
                onClick={() => setDateRangePreset('CUSTOM')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateRangePreset === 'CUSTOM'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                📅 Rango...
              </button>
            </div>

            {/* Selector de Rango Personalizado */}
            {dateRangePreset === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-[11px] text-slate-700 focus:outline-none"
                />
                <span className="text-slate-400">hasta</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-[11px] text-slate-700 focus:outline-none"
                />
              </div>
            )}

            {/* Filtro por estado de pago */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setOrderFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  orderFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setOrderFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  orderFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700'
                }`}
              >
                Por Validar
              </button>
              <button
                onClick={() => setOrderFilter('VALIDATED')}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  orderFilter === 'VALIDATED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                Validados
              </button>
            </div>
          </div>

          {/* TABLA DE ÓRDENES */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">
                No hay pedidos registrados para este intervalo de fecha ({dateRangePreset}).
              </p>
              {dateRangePreset === 'TODAY' && (
                <button
                  onClick={() => setDateRangePreset('ALL')}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Ver todos los pedidos históricos ({orders.length} pedidos)
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                    <th className="py-3 px-4 font-bold">N° Pedido</th>
                    <th className="py-3 px-4 font-bold">Cliente & Documento</th>
                    <th className="py-3 px-4 font-bold">Artefactos</th>
                    <th className="py-3 px-4 font-bold">Total</th>
                    <th className="py-3 px-4 font-bold">Estado de Pago</th>
                    <th className="py-3 px-4 font-bold">Stock Físico</th>
                    <th className="py-3 px-4 font-bold text-right">Acciones Operativas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const isValidated = order.paymentStatus === 'VALIDATED';
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                          {order.orderNumber}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {new Date(order.createdAt).toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{order.customerName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {order.customerDocType}: {order.customerDocNumber} • {order.customerPhone}
                          </span>
                          {order.customerNotes && (
                            <span className="block text-[10px] text-blue-600 italic mt-0.5 truncate max-w-xs">
                              {order.customerNotes}
                            </span>
                          )}
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {order.assignedAdvisorName ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                👤 Asesora: {order.assignedAdvisorName}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                Sin asignar
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <ul className="space-y-1">
                            {order.items?.map((it: any) => (
                              <li key={it.id} className="text-[11px] text-slate-700">
                                <strong>{it.quantity}x</strong> {it.productBrand} {it.productName}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          S/ {order.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          {isValidated ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Validado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Por Validar
                            </span>
                          )}
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {order.paymentMethod}
                          </span>
                          {!order.paymentReceiptUrl ? (
                            <label
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border mt-1.5 cursor-pointer transition-all shadow-sm ${
                                uploadingVoucherId === order.id
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 opacity-70 pointer-events-none'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 active:scale-95'
                              }`}
                              title="Subir foto del comprobante de pago para este pedido"
                            >
                              <UploadCloud className="w-3 h-3 text-amber-600 flex-shrink-0" />
                              <span>{uploadingVoucherId === order.id ? 'Subiendo...' : '📎 Subir Voucher'}</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                disabled={uploadingVoucherId === order.id}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleUploadOrderVoucher(order.id, f);
                                }}
                              />
                            </label>
                          ) : (
                            <div className="flex items-center gap-1 mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setVoucherZoom(1);
                                  setVoucherRotation(0);
                                  setViewingVoucherOrder(order);
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 px-2 py-0.5 rounded transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Visualizar comprobante en modal con zoom y validación"
                              >
                                📎 Ver Voucher
                              </button>
                              <label
                                className={`inline-flex items-center p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer transition-colors ${
                                  uploadingVoucherId === order.id ? 'opacity-50 pointer-events-none' : ''
                                }`}
                                title="Actualizar o cambiar comprobante"
                              >
                                <Pencil className="w-3 h-3" />
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  disabled={uploadingVoucherId === order.id}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleUploadOrderVoucher(order.id, f);
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {order.stockDeducted ? (
                            <span className="text-[11px] text-emerald-700 font-bold block">
                              ✓ Descargado de Almacén
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium block">
                              Retenido (espera validación)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* BOTÓN RÁPIDO VALIDAR PAGO: Si no está validado aún */}
                          {!isValidated && canValidatePayments && (
                            <button
                              onClick={() => handleValidatePayment(order.id)}
                              disabled={loadingAction === `validate-${order.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                              title="Aprobar pago bancario y descargar existencias físicas de almacén"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>{loadingAction === `validate-${order.id}` ? 'Validando...' : 'Validar Pago'}</span>
                            </button>
                          )}

                          {/* BOTÓN CAMBIAR ESTADO / CORREGIR VALIDACIÓN (Siempre disponible si tiene permisos) */}
                          {canValidatePayments && (
                            <button
                              onClick={() => {
                                setChangingStatusOrder(order);
                                setNewOrderStatus(order.status);
                                setNewPaymentStatus(order.paymentStatus);
                                setStatusChangeReason('');
                                setShowStatusModal(true);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                              title="Cambiar estado del pedido o revertir validación errónea"
                            >
                              <Pencil className="w-3 h-3 text-slate-500" />
                              <span>Estado</span>
                            </button>
                          )}

                          <button
                            onClick={() => setOrderToPrint(order)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
                            title="Imprimir Hoja de Despacho & Comprobante de Pedido"
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-600" />
                            <span>Imprimir</span>
                          </button>

                          <a
                            href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Hola ${order.customerName}, le saludamos de Corporación Darwin respecto a su pedido ${order.orderNumber}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Contactar al cliente por WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 2: VENTA ASISTIDA VISUAL TIPO CARRITO POS */}
      {/* ======================================================== */}
      {activeTab === 'manualOrder' && canOrders && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMNA IZQUIERDA (7 cols): CATÁLOGO VISUAL DE ARTEFACTOS */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded uppercase">
                  Mostrador Comercial POS
                </span>
                <span className="text-[11px] text-slate-400">Atención WhatsApp / Showroom</span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-1">
                Selección Visual de Artefactos
              </h2>
              <p className="text-xs text-slate-500">
                Haz clic en <strong>[+ Agregar al Carrito]</strong> para armar la cotización u orden en vivo.
              </p>
            </div>

            {/* Buscador & Categorías */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  placeholder="Buscar artefacto por marca, nombre o SKU..."
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Categorías Pills */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  onClick={() => setPosCategory('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    posCategory === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({products.length})
                </button>
                <button
                  onClick={() => setPosCategory('TELEVISORES')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    posCategory === 'TELEVISORES' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  📺 Televisores
                </button>
                <button
                  onClick={() => setPosCategory('AUDIO')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    posCategory === 'AUDIO' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🔊 Audio
                </button>
                <button
                  onClick={() => setPosCategory('LAVADORAS')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    posCategory === 'LAVADORAS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🧺 Lavadoras / Secadoras
                </button>
                <button
                  onClick={() => setPosCategory('REFRIGERADORAS')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    posCategory === 'REFRIGERADORAS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ❄️ Refrigeradoras
                </button>
                <button
                  onClick={() => setPosCategory('CONGELADORAS')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    posCategory === 'CONGELADORAS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🧊 Congeladoras
                </button>
                <button
                  onClick={() => setPosCategory('COCINAS_HORNOS')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    posCategory === 'COCINAS_HORNOS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🍳 Cocinas / Hornos
                </button>
                <button
                  onClick={() => setPosCategory('CLIMATIZACION')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    posCategory === 'CLIMATIZACION' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  💨 Climatización
                </button>
              </div>
            </div>

            {/* Grid de Artefactos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[600px] overflow-y-auto pr-1">
              {posFilteredProducts.map((p) => {
                const inCart = assistedCart.find((it) => it.product.id === p.id);
                return (
                  <div
                    key={p.id}
                    className="border border-slate-200 hover:border-blue-400 rounded-2xl p-3.5 bg-white transition-all flex flex-col justify-between space-y-2 group shadow-sm hover:shadow"
                  >
                    <div className="flex gap-3 items-start">
                      <img
                        src={getSafeImageUrl(p.image)}
                        alt={p.name}
                        className="w-16 h-16 object-contain bg-slate-50 rounded-xl p-1 border border-slate-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                          {p.brand}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                            {p.energyRating || 'A+'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 truncate">
                            {p.sku}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-slate-900 block">
                          S/ {p.price.toFixed(2)}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            p.stock <= 5 ? 'text-rose-600 font-bold' : 'text-slate-400'
                          }`}
                        >
                          Stock: {p.stock} unid.
                        </span>
                      </div>

                      <button
                        onClick={() => addToAssistedCart(p)}
                        disabled={p.stock <= 0}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95 ${
                          inCart
                            ? 'bg-blue-50 text-blue-700 border border-blue-300'
                            : 'bg-slate-900 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {inCart ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-blue-600" />
                            <span>({inCart.quantity}) en Carrito</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMNA DERECHA (5 cols): CARRITO VISUAL EN VIVO & DATOS DE CLIENTE */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 sticky top-20">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  <span>Carrito de Venta Asistida</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  {cartTotalUnits} artefactos en cotización
                </span>
              </div>

              {assistedCart.length > 0 && (
                <button
                  onClick={() => setAssistedCart([])}
                  className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Vaciar</span>
                </button>
              )}
            </div>

            {/* LISTA VISUAL DEL CARRITO */}
            {assistedCart.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">El carrito de cotización está vacío</p>
                <p className="text-[11px] text-slate-400">
                  Haz clic en "Agregar" en los productos del catálogo de la izquierda para armar la orden.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {assistedCart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs"
                  >
                    <img
                      src={getSafeImageUrl(item.product.image)}
                      alt={item.product.name}
                      className="w-10 h-10 object-contain bg-white rounded-lg p-0.5 border border-slate-200 flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-900 block truncate">
                        {item.product.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        S/ {item.product.price.toFixed(2)} c/u
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => updateAssistedQty(item.product.id, -1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-slate-800 text-[11px]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateAssistedQty(item.product.id, 1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-900 block">
                        S/ {(item.product.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeFromAssistedCart(item.product.id)}
                        className="text-[10px] text-rose-500 hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DESGLOSE CONTABLE & TOTAL */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Base Imponible:</span>
                <span>S/ {baseImponible.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>I.G.V. (18% incluido):</span>
                <span>S/ {igvAmount.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="font-bold text-slate-200">TOTAL A COBRAR:</span>
                <strong className="text-lg font-black text-emerald-400 font-mono">
                  S/ {cartSubtotal.toFixed(2)}
                </strong>
              </div>
            </div>

            {/* FORMULARIO DE CLIENTE Y EMISIÓN */}
            <form onSubmit={handleCreateAssistedOrder} className="space-y-3 text-xs">
              {/* Selector Boleta / Factura */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDocType('DNI')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                    docType === 'DNI'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Boleta (DNI)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('RUC')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                    docType === 'RUC'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Factura (RUC)</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    {docType === 'DNI' ? 'N° de DNI *' : 'N° de RUC *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder={docType === 'DNI' ? '8 dígitos' : '11 dígitos'}
                    className="w-full p-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    WhatsApp Móvil *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+51 987 654 321"
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  {docType === 'DNI' ? 'Nombre Completo del Cliente *' : 'Razón Social de la Empresa *'}
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={docType === 'DNI' ? 'Ej. Juan Pérez Ramos' : 'Ej. Inversiones Comerciales S.A.C.'}
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* SELECTOR DE MODALIDAD: ENVÍO VS RECOJO EN TIENDA */}
              <div className="space-y-1 pt-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Modalidad de Despacho *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssistedDeliveryType('DELIVERY')}
                    className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-[11px] ${
                      assistedDeliveryType === 'DELIVERY'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Envío a Domicilio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssistedDeliveryType('STORE_PICKUP')}
                    className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-[11px] ${
                      assistedDeliveryType === 'STORE_PICKUP'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Recojo en Tienda (Gratis)</span>
                  </button>
                </div>
              </div>

              {/* DETALLES DE DESPACHO */}
              {assistedDeliveryType === 'DELIVERY' ? (
                <div className="space-y-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Destino Geográfico:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAssistedLocation('LIMA')}
                        className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all ${
                          assistedLocation === 'LIMA'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        📍 Lima Metropolitana
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistedLocation('PROVINCIA')}
                        className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all ${
                          assistedLocation === 'PROVINCIA'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        🚛 Provincia / Departamentos
                      </button>
                    </div>
                  </div>

                  {assistedLocation === 'LIMA' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Dirección de Entrega *
                        </label>
                        <input
                          type="text"
                          required={assistedDeliveryType === 'DELIVERY' && assistedLocation === 'LIMA'}
                          value={clientAddress}
                          onChange={(e) => setClientAddress(e.target.value)}
                          placeholder="Av. Javier Prado 1420"
                          className="w-full p-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Distrito (Lima)
                        </label>
                        <select
                          value={clientDistrict}
                          onChange={(e) => setClientDistrict(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Miraflores">Miraflores</option>
                          <option value="San Isidro">San Isidro</option>
                          <option value="Surco">Santiago de Surco</option>
                          <option value="San Borja">San Borja</option>
                          <option value="La Molina">La Molina</option>
                          <option value="Central">Lima Centro</option>
                          <option value="Los Olivos">Los Olivos</option>
                          <option value="San Miguel">San Miguel</option>
                          <option value="Chorrillos">Chorrillos</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Departamento / Región *
                          </label>
                          <select
                            value={assistedDepartment}
                            onChange={(e) => setAssistedDepartment(e.target.value)}
                            className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                          >
                            {[
                              'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
                              'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín',
                              'La Libertad', 'Lambayeque', 'Lima Provincias', 'Loreto', 'Madre de Dios',
                              'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
                            ].map((dep) => (
                              <option key={dep} value={dep}>{dep}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Ciudad / Provincia
                          </label>
                          <input
                            type="text"
                            value={assistedProvinceCity}
                            onChange={(e) => setAssistedProvinceCity(e.target.value)}
                            placeholder="Ej. Trujillo / Chiclayo"
                            className="w-full p-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Agencia de Carga o Domicilio Provincial *
                        </label>
                        <input
                          type="text"
                          required={assistedDeliveryType === 'DELIVERY' && assistedLocation === 'PROVINCIA'}
                          value={assistedAgencyOrAddress}
                          onChange={(e) => setAssistedAgencyOrAddress(e.target.value)}
                          placeholder="Ej. Shalom Agencia Central / Marvisur / Domicilio exacto"
                          className="w-full p-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Recojo en Sede Central (La Casa de los Artefactos)</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    <strong>Dirección:</strong> Av. Los Faisanes 120, Chorrillos, Lima (Horario: Lun-Sáb 9am - 6pm)
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    ✓ Sin costo de transporte (Flete: S/ 0.00). El cliente retira con DNI y número de orden.
                  </p>
                </div>
              )}

              {/* SUBIDA DE COMPROBANTE / VOUCHER DE PAGO */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-blue-950 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Foto / Voucher de Pago (Asesora)</span>
                  </label>
                  {assistedVoucherUrl ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Comprobante Cargado</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">
                      Opcional si es pago previo
                    </span>
                  )}
                </div>

                {assistedVoucherPreview ? (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-blue-200">
                    <img
                      src={assistedVoucherPreview}
                      alt="Voucher de pago"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-[11px]">
                      <span className="font-bold text-slate-800 block truncate">
                        {assistedVoucherFile?.name || 'Comprobante de pago'}
                      </span>
                      {uploadingAssistedVoucher ? (
                        <span className="text-blue-600 flex items-center gap-1 mt-0.5">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Guardando en C:\ecom-artefactos-uploads...
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold block mt-0.5">
                          ✓ Listo para emitir orden
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAssistedVoucherFile(null);
                        setAssistedVoucherPreview(null);
                        setAssistedVoucherUrl(null);
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar voucher"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="flex items-center justify-center gap-2 p-2.5 bg-white border border-dashed border-blue-300 hover:border-blue-500 rounded-xl cursor-pointer text-xs font-semibold text-blue-700 hover:bg-blue-50/50 transition-colors">
                      <UploadCloud className="w-4 h-4 text-blue-600" />
                      <span>Subir Captura de Yape / Transferencia</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadAssistedVoucher}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Método de Pago Pactado
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TRANSFERENCIA">Transferencia Bancaria BCP/BBVA</option>
                    <option value="YAPE_PLIN">Yape / Plin Inmediato</option>
                    <option value="CONTRA_ENTREGA">Pago Contra Entrega</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Asesor Responsable
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.name || currentUser?.email || 'Asesor'}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={assistedCart.length === 0 || loadingAction === 'create-assisted-order'}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {loadingAction === 'create-assisted-order'
                    ? 'Emitiendo Orden en PostgreSQL...'
                    : `Emitir Orden Asistida (S/ ${cartSubtotal.toFixed(2)})`}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 3: CATÁLOGO DE ARTEFACTOS */}
      {/* ======================================================== */}
      {activeTab === 'catalog' && canCatalog && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Catálogo de Artefactos del Hogar</h2>
              <p className="text-xs text-slate-500">
                Registra nuevos electrodomésticos, gestiona marcas oficiales o usa los botones rápidos para calibrar stock.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Buscar por marca o SKU..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('brands')}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                title="Ver y registrar marcas oficiales autorizadas"
              >
                <Tag className="w-4 h-4" />
                <span>🏷️ Gestionar Marcas ({brands.length})</span>
              </button>

              <button
                onClick={handleOpenNewProductModal}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nuevo Artefacto</span>
              </button>
            </div>
          </div>

          {/* BARRA DE FILTRADO RÁPIDO POR MARCA */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 overflow-x-auto">
            <div className="flex items-center gap-1.5 flex-nowrap">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex-shrink-0 mr-1">
                Marcas Oficiales:
              </span>
              <button
                type="button"
                onClick={() => setCatalogSearch('')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 cursor-pointer ${
                  !catalogSearch
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Todas ({products.length})
              </button>
              {brands.map((b) => {
                const count = products.filter((p) => p.brand?.toLowerCase() === b.name?.toLowerCase()).length;
                const isSelected = catalogSearch.toLowerCase() === b.name.toLowerCase();
                return (
                  <button
                    key={b.id || b.name}
                    type="button"
                    onClick={() => setCatalogSearch(isSelected ? '' : b.name)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="ml-1 opacity-70 font-mono text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingBrand(null);
                setBrandForm({
                  name: '',
                  description: '',
                  category: 'TELEVISORES',
                  order: brands.length,
                  isActive: true,
                  logo: '',
                });
                setShowBrandModal(true);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 transition-all flex-shrink-0 whitespace-nowrap cursor-pointer ml-auto"
            >
              + Registrar Marca
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-4 font-bold">Artefacto</th>
                  <th className="py-3 px-4 font-bold">Marca & SKU</th>
                  <th className="py-3 px-4 font-bold">Eficiencia & Voltaje</th>
                  <th className="py-3 px-4 font-bold">Precio Regular / Oferta</th>
                  <th className="py-3 px-4 font-bold text-center">Stock Físico</th>
                  <th className="py-3 px-4 font-bold text-center">Calibrador Rápido</th>
                  <th className="py-3 px-4 font-bold text-center">Visibilidad Tienda</th>
                  <th className="py-3 px-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products
                  .filter(
                    (p) =>
                      !catalogSearch ||
                      p.name?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                      p.brand?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                      p.sku?.toLowerCase().includes(catalogSearch.toLowerCase())
                  )
                  .map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getSafeImageUrl(p.image)}
                            alt={p.name}
                            className="w-12 h-12 object-contain bg-white rounded-lg p-1 border border-slate-200 flex-shrink-0"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block line-clamp-1">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.category} {p.modelCode ? `• Mod: ${p.modelCode}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-blue-600 block">{p.brand}</span>
                        <span className="font-mono text-[10px] text-slate-500">{p.sku}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] mr-2">
                          {p.energyRating || 'A+'}
                        </span>
                        <span className="text-[10px] text-slate-500">{p.voltage || '220V'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">S/ {p.price.toFixed(2)}</span>
                        {p.retailPrice > p.price && (
                          <span className="text-[10px] text-slate-400 line-through">
                            S/ {p.retailPrice.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                            p.stock <= 5
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleQuickStock(p.id, -1)}
                            disabled={p.stock <= 0 || loadingAction === `stock-${p.id}`}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 disabled:opacity-30 transition-colors"
                            title="Restar 1 unidad"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickStock(p.id, 1)}
                            disabled={loadingAction === `stock-${p.id}`}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 transition-colors"
                            title="Sumar 1 unidad"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickStock(p.id, 5)}
                            disabled={loadingAction === `stock-${p.id}`}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            title="Ingresar lote (+5)"
                          >
                            +5
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          {p.isAvailable !== false ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Eye className="w-3 h-3 text-emerald-600" />
                              Visible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                              <EyeOff className="w-3 h-3 text-slate-500" />
                              Oculto / Pausado
                            </span>
                          )}

                          <button
                            onClick={() => handleToggleAvailability(p.id, p.isAvailable !== false)}
                            disabled={loadingAction === `availability-${p.id}`}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all active:scale-95 ${
                              p.isAvailable !== false
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={
                              p.isAvailable !== false
                                ? 'Desactivar para no mostrarlo en la tienda a los clientes'
                                : 'Activar para que vuelva a mostrarse en la tienda online'
                            }
                          >
                            {p.isAvailable !== false ? (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>{loadingAction === `availability-${p.id}` ? 'Pausando...' : 'Desactivar'}</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>{loadingAction === `availability-${p.id}` ? 'Activando...' : 'Activar'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditProduct(p)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all active:scale-95 shadow-2xs cursor-pointer"
                            title="Editar ficha técnica, precios, stock y fotos"
                          >
                            <Pencil className="w-3 h-3 text-blue-600" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            disabled={loadingAction === `delete-prod-${p.id}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar del catálogo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA: REGISTRO OFICIAL DE MARCAS */}
      {/* ======================================================== */}
      {activeTab === 'brands' && canCatalog && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded uppercase">
                  Gestión Corporativa
                </span>
                <span className="text-[11px] text-slate-400">Catálogo & Sidebar</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                Registro Oficial de Marcas de Artefactos
              </h2>
              <p className="text-xs text-slate-500">
                Administra las marcas autorizadas que se desplegarán en el buscador de la tienda y en los filtros de productos.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="Buscar marca registrada..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingBrand(null);
                  setBrandForm({
                    name: '',
                    description: '',
                    category: 'TELEVISORES',
                    order: brands.length,
                    isActive: true,
                    logo: '',
                  });
                  setShowBrandModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Registrar Nueva Marca</span>
              </button>
            </div>
          </div>

          {/* TABLA DE MARCAS */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-4 font-bold text-center w-16"># Orden</th>
                  <th className="py-3 px-4 font-bold">Marca</th>
                  <th className="py-3 px-4 font-bold">Departamento Principal</th>
                  <th className="py-3 px-4 font-bold">Descripción Técnica & Líneas</th>
                  <th className="py-3 px-4 font-bold text-center">Estado</th>
                  <th className="py-3 px-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands
                  .filter(
                    (b) =>
                      !brandSearch ||
                      b.name?.toLowerCase().includes(brandSearch.toLowerCase()) ||
                      b.description?.toLowerCase().includes(brandSearch.toLowerCase())
                  )
                  .map((b) => (
                    <tr key={b.id || b.name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                        {b.order ?? 0}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-black text-xs">
                            {b.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">{b.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">/{b.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          {b.category || 'MULTICATEGORÍA'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {b.description || 'Sin notas descriptivas'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleBrandActive(b.id, b.isActive !== false)}
                          disabled={loadingAction === `toggle-brand-${b.id}`}
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                            b.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {b.isActive !== false ? '✓ Activa' : 'Pausada'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBrand(b);
                              setBrandForm({
                                name: b.name,
                                description: b.description || '',
                                category: b.category || 'TELEVISORES',
                                order: b.order || 0,
                                isActive: b.isActive !== false,
                                logo: b.logo || '',
                              });
                              setShowBrandModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer"
                            title="Editar detalles de la marca"
                          >
                            <Pencil className="w-3 h-3 text-blue-600" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBrand(b.id, b.name)}
                            disabled={loadingAction === `delete-brand-${b.id}`}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar marca"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 4: KARDEX CALCULADO EN VIVO */}
      {/* ======================================================== */}
      {activeTab === 'kardex' && canKardex && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase">
                  Libro Contable Auditado
                </span>
                <span className="text-[11px] text-slate-400">Norma Internacional / SUNAT</span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-1">
                Kardex Físico Calculado de Movimientos & Inventario
              </h2>
              <p className="text-xs text-slate-500">
                Historial matemático secuencial: <strong>Saldo(n) = Saldo(n-1) + Entradas - Salidas</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={kardexProductFilter}
                  onChange={(e) => setKardexProductFilter(e.target.value)}
                  className="text-xs bg-transparent font-medium text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Todos los Artefactos ({movements.length} movimientos)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} - {p.name} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowKardexModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Registrar Entrada / Ajuste</span>
              </button>
            </div>
          </div>

          {/* Tarjetas de verificación matemática del Kardex */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Movimientos Registrados:</span>
              <strong className="text-sm font-bold text-slate-800">{filteredMovements.length} asientos</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Total Entradas (+):</span>
              <strong className="text-sm font-bold text-emerald-600 font-mono">+{kardexTotalIn} unidades</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Total Salidas (-):</span>
              <strong className="text-sm font-bold text-rose-600 font-mono">-{kardexTotalOut} unidades</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Balance Resultante:</span>
              <strong className="text-sm font-bold text-blue-700 font-mono">
                {selectedKardexProduct ? `${selectedKardexProduct.stock} unidades en bodega` : `${kardexTotalIn - kardexTotalOut} balance neto`}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-4 font-bold">Fecha / Hora</th>
                  <th className="py-3 px-4 font-bold">Artefacto & SKU</th>
                  <th className="py-3 px-4 font-bold">Tipo Operación</th>
                  <th className="py-3 px-4 font-bold">Documento / Ref.</th>
                  <th className="py-3 px-4 font-bold text-center">Saldo Anterior</th>
                  <th className="py-3 px-4 font-bold text-center">Entrada (+)</th>
                  <th className="py-3 px-4 font-bold text-center">Salida (-)</th>
                  <th className="py-3 px-4 font-bold text-center">Saldo Calculado</th>
                  <th className="py-3 px-4 font-bold">Responsable & Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No hay asientos contables en Kardex para este criterio.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => {
                    const inQ = m.inQuantity || (m.changeQuantity > 0 ? m.changeQuantity : 0);
                    const outQ = m.outQuantity || (m.changeQuantity < 0 ? Math.abs(m.changeQuantity) : 0);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {new Date(m.createdAt).toLocaleString('es-PE')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block line-clamp-1">{m.product?.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{m.product?.sku}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              m.type === 'SALE_DEDUCTION'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : m.type === 'MANUAL_RESTOCK'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-blue-700">
                          {m.reference || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {m.previousStock}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600">
                          {inQ > 0 ? `+${inQ}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                          {outQ > 0 ? `-${outQ}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-slate-900 bg-slate-50/80">
                          {m.balance ?? m.newStock}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">
                          <span className="font-medium text-slate-700 block">{m.user || 'Sistema'}</span>
                          <span className="text-[10px] text-slate-400">{m.note || 'Sin observaciones'}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 5: USUARIOS & PERFILES (RBAC) */}
      {/* ======================================================== */}
      {activeTab === 'users' && isSuperadmin && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded uppercase">
                  Control RBAC Superadmin
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-1">
                Gestión de Operadores Administrativos & Privilegios
              </h2>
              <p className="text-xs text-slate-500">
                Configura roles y privilegios para Vendedores, Almacén, Tesorería y Superadmin.
              </p>
            </div>

            <button
              onClick={openCreateUserModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>+ Registrar Nuevo Operador</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-4 font-bold">Operador</th>
                  <th className="py-3 px-4 font-bold">Correo Institucional</th>
                  <th className="py-3 px-4 font-bold">Rol</th>
                  <th className="py-3 px-4 font-bold">Perfil RBAC</th>
                  <th className="py-3 px-4 font-bold">Alcance de Privilegios</th>
                  <th className="py-3 px-4 font-bold">Fecha Alta</th>
                  <th className="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {u.name || 'Sin nombre'}
                      {u.phone && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-0.5 font-mono">
                          <MessageCircle className="w-3 h-3 text-emerald-500" />
                          <span>{u.phone}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-blue-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          u.role === 'SUPERADMIN'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {u.profile?.name || (u.role === 'SUPERADMIN' ? 'Control Total' : 'Estándar')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.role === 'SUPERADMIN' ? (
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            Acceso Total Ilimitado
                          </span>
                        ) : (
                          <>
                            {u.profile?.canOrders && (
                              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                                Órdenes / Ventas
                              </span>
                            )}
                            {u.profile?.canValidatePayments ? (
                              <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                Validar Pagos
                              </span>
                            ) : (
                              <span className="bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">
                                Sin Pagos
                              </span>
                            )}
                            {u.profile?.canCatalog && (
                              <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">
                                Catálogo
                              </span>
                            )}
                            {u.profile?.canKardex && (
                              <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px]">
                                Kardex
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString('es-PE')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditUserModal(u)}
                          title="Editar Operador / Asignar Teléfono"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setChangePasswordUser(u);
                            setChangePasswordInput('');
                          }}
                          title="Cambiar Contraseña"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        {u.email !== 'superadmin@corporaciondarwin.com' && u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Eliminar Operador"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 6: GESTIÓN DE BANNERS, CAMPAÑAS Y CANALES DE SOPORTE */}
      {/* ======================================================== */}
      {activeTab === 'marketing' && (isSuperadmin || canCatalog) && (
        <MarketingSettingsTab
          initialBanners={initialBanners && initialBanners.length > 0 ? initialBanners : (initialBanner ? [initialBanner] : [])}
          initialCategoryBanners={initialCategoryBanners}
          initialAnnouncement={initialAnnouncement}
          initialSupportChannels={initialSupportChannels}
          onFeedback={(msg) => {
            setFeedbackMessage(msg);
            setTimeout(() => setFeedbackMessage(null), 3500);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: RESUMEN DE ÉXITO DE ORDEN ASISTIDA */}
      {/* ======================================================== */}
      {successOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                ¡Orden Asistida Generada!
              </h3>
              <p className="text-xs text-slate-500">
                El pedido oficial ha sido registrado en PostgreSQL. El stock queda retenido en espera de validación bancaria.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">N° de Pedido:</span>
                <strong className="font-mono text-blue-600">{successOrderModal.orderNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total a Pagar:</span>
                <strong className="font-mono text-slate-900">S/ {successOrderModal.totalAmount?.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estado de Inventario:</span>
                <span className="text-amber-700 font-semibold">Stock retenido en espera</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {successOrderModal.whatsappUrl && (
                <a
                  href={successOrderModal.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Detalles por WhatsApp al Cliente</span>
                </a>
              )}

              <button
                onClick={() => setSuccessOrderModal(null)}
                className="w-full py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-all"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PRODUCTO */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingProduct ? 'Editar Ficha Técnica del Artefacto' : 'Registrar Nuevo Artefacto en Catálogo'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingProduct
                    ? `Modificando especificaciones de "${editingProduct.name}" (SKU: ${editingProduct.sku})`
                    : 'Se inicializará automáticamente el primer asiento de Kardex.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nombre Completo del Artefacto *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Ej. Refrigeradora No Frost 400L Inverter con Dispensador"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Marca Oficial *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBrand(null);
                        setBrandForm({
                          name: '',
                          description: '',
                          category: newProduct.category || 'TELEVISORES',
                          order: brands.length,
                          isActive: true,
                          logo: '',
                        });
                        setShowBrandModal(true);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      + Registrar nueva marca
                    </button>
                  </div>
                  <select
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  >
                    {brands.map((b) => (
                      <option key={b.id || b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                    {!brands.some((b) => b.name === newProduct.brand) && newProduct.brand && (
                      <option value={newProduct.brand}>{newProduct.brand}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoría *</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="TELEVISORES">📺 Televisores</option>
                    <option value="AUDIO">🔊 Audio</option>
                    <option value="LAVADORAS">🧺 Lavadoras / Secadoras</option>
                    <option value="REFRIGERADORAS">❄️ Refrigeradoras</option>
                    <option value="CONGELADORAS">🧊 Congeladoras</option>
                    <option value="COCINAS_HORNOS">🍳 Cocinas / Hornos</option>
                    <option value="CLIMATIZACION">💨 Climatización</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código SKU *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })}
                    placeholder="Ej. REF-SAM-400L-01"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código de Modelo</label>
                  <input
                    type="text"
                    value={newProduct.modelCode}
                    onChange={(e) => setNewProduct({ ...newProduct, modelCode: e.target.value })}
                    placeholder="Ej. RT38K5930SL"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* PRECIOS Y DESCUENTO CALCULADO */}
                <div className="sm:col-span-2 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Precio Retail / Regular (S/ Tachado) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newProduct.retailPrice || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, retailPrice: Number(e.target.value) })}
                        placeholder="Ej. 3499.00"
                        className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Precio original de lista antes de la oferta.</p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Precio con Descuento / Oferta (S/ Venta) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newProduct.price || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                        placeholder="Ej. 2899.00"
                        className="w-full p-2.5 rounded-xl border border-blue-300 font-mono font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Precio final que pagará el cliente.</p>
                    </div>
                  </div>

                  {/* Cálculo en Vivo del Porcentaje de Descuento */}
                  {newProduct.retailPrice > 0 && newProduct.price > 0 && (
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                      {newProduct.retailPrice > newProduct.price ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-xs">
                              -{Math.round(((newProduct.retailPrice - newProduct.price) / newProduct.retailPrice) * 100)}% DCTO
                            </span>
                            <span className="font-bold text-slate-700">
                              Ahorro calculado para el cliente:
                            </span>
                          </div>
                          <span className="font-bold text-emerald-600 font-mono">
                            S/ {(newProduct.retailPrice - newProduct.price).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          El precio de oferta es igual o mayor al precio regular (sin descuento visual).
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Inicial *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Garantía (Meses Oficiales)</label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.warrantyMonths}
                    onChange={(e) => setNewProduct({ ...newProduct, warrantyMonths: Number(e.target.value) })}
                    placeholder="12"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dimensiones (Al x An x Prof cm)</label>
                  <input
                    type="text"
                    value={newProduct.dimensions}
                    onChange={(e) => setNewProduct({ ...newProduct, dimensions: e.target.value })}
                    placeholder="Ej. 178.5cm x 70.0cm x 68.0cm"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Eficiencia Energética</label>
                  <select
                    value={newProduct.energyRating}
                    onChange={(e) => setNewProduct({ ...newProduct, energyRating: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="A+++">A+++ (Máximo Ahorro)</option>
                    <option value="A++">A++ (Ultra Eficiente)</option>
                    <option value="A+">A+ (Muy Eficiente)</option>
                    <option value="A">A (Estándar Eficiente)</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>

                {/* ESPECIFICACIONES TÉCNICAS */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Especificaciones Técnicas del Artefacto
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    Ingresa las especificaciones, funciones y tecnología (puedes usar viñetas o saltos de línea).
                  </p>
                  <textarea
                    rows={4}
                    value={newProduct.specifications}
                    onChange={(e) => setNewProduct({ ...newProduct, specifications: e.target.value })}
                    placeholder={`• Capacidad total: 400 Litros\n• Motor Digital Inverter con 10 años de garantía\n• Sistema No Frost con enfriamiento envolvente\n• Dispensador de agua exterior sin conexión a red\n• Gas refrigerante ecológico R600a`}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* DESCRIPCIÓN COMERCIAL */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Descripción Comercial (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Breve reseña comercial del artefacto para el cliente..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* SECCIÓN MULTI-IMAGEN DEL ARTEFACTO */}
                <div className="sm:col-span-2 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block font-bold text-slate-800 text-xs">
                        Fotografías del Artefacto (Galería de Imágenes) *
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Puedes subir múltiples imágenes (foto frontal, lateral, interior, medidas). Se guardan como blobs en disco local C:.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {newProduct.images.length} {newProduct.images.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>

                  {/* Zona de Subida Múltiple desde PC */}
                  <label className="cursor-pointer flex flex-col items-center justify-center p-6 bg-blue-50/40 hover:bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl transition-all group text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-xs group-hover:scale-105 flex items-center justify-center text-blue-600 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {uploadingProductImages
                          ? 'Guardando fotos en disco local C:...'
                          : 'Haz clic aquí para seleccionar fotos desde tu PC (Múltiples permitidas)'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Puedes subir fotos frontal, lateral, medidas, etiqueta técnica e interior
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={uploadingProductImages}
                      onChange={handleUploadProductImages}
                      className="hidden"
                    />
                  </label>

                  {/* Previsualización Dinámica Instantánea de Fotos */}
                  {(newProduct.images.length > 0 || productUploadList.length > 0) && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-bold">
                          Fotos Cargadas ({newProduct.images.length}):
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Haz clic en una foto para convertirla en Portada
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Renderizar fotos confirmadas */}
                        {newProduct.images.map((imgUrl, idx) => {
                          const isPrimary = idx === 0;
                          return (
                            <div
                              key={imgUrl + idx}
                              className={`relative group rounded-xl border-2 p-1 overflow-hidden transition-all bg-white shadow-xs ${
                                isPrimary
                                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                  : 'border-slate-200 hover:border-blue-400'
                              }`}
                            >
                              <img
                                src={getSafeImageUrl(imgUrl)}
                                alt={`Foto ${idx + 1}`}
                                className="w-full h-24 object-contain rounded-lg bg-slate-50"
                              />

                              <div className="absolute top-2 left-2">
                                {isPrimary ? (
                                  <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                                    ★ Portada
                                  </span>
                                ) : (
                                  <span className="bg-slate-900/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                                    Foto {idx + 1}
                                  </span>
                                )}
                              </div>

                              <div className="absolute bottom-2 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                {!isPrimary && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryProductImage(imgUrl)}
                                    className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold rounded shadow-xs"
                                    title="Poner como imagen principal"
                                  >
                                    Hacer Portada
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProductImage(imgUrl)}
                                  className="ml-auto p-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] shadow-xs"
                                  title="Eliminar foto"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Indicadores de carga si hay subidas en progreso */}
                        {productUploadList
                          .filter((it) => it.isUploading)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="relative rounded-xl border-2 border-blue-400 border-dashed bg-blue-50/50 p-1 h-26 flex flex-col items-center justify-center text-center overflow-hidden"
                            >
                              <img
                                src={item.previewUrl}
                                alt="Subiendo"
                                className="w-full h-16 object-contain opacity-40 rounded"
                              />
                              <span className="text-[10px] font-bold text-blue-700 mt-1 animate-pulse">
                                Guardando en C:...
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === 'save-product'}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === 'save-product'
                    ? 'Guardando...'
                    : editingProduct
                    ? 'Guardar Cambios del Artefacto'
                    : 'Crear & Registrar en Kardex'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR MARCA OFICIAL */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingBrand ? 'Editar Marca Oficial' : 'Registrar Nueva Marca Oficial'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configuración para catálogo, filtros y menú lateral
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBrandModal(false);
                  setEditingBrand(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de la Marca *</label>
                <input
                  type="text"
                  required
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  placeholder="Ej. JBL, Samsung, Indurama..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Departamento / Categoría Principal</label>
                <select
                  value={brandForm.category}
                  onChange={(e) => setBrandForm({ ...brandForm, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="TELEVISORES">📺 Televisores</option>
                  <option value="AUDIO">🔊 Audio</option>
                  <option value="LAVADORAS">🧺 Lavadoras / Secadoras</option>
                  <option value="REFRIGERADORAS">❄️ Refrigeradoras</option>
                  <option value="CONGELADORAS">🧊 Congeladoras</option>
                  <option value="COCINAS_HORNOS">🍳 Cocinas / Hornos</option>
                  <option value="CLIMATIZACION">💨 Climatización</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Líneas de Productos & Reseña Técnica</label>
                <textarea
                  rows={3}
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                  placeholder="Ej. Parlantes Bluetooth Portátiles Resistentes al Agua IP67, Sistemas PartyBox..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Orden en Menú</label>
                  <input
                    type="number"
                    min="0"
                    value={brandForm.order}
                    onChange={(e) => setBrandForm({ ...brandForm, order: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={brandForm.isActive}
                      onChange={(e) => setBrandForm({ ...brandForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="font-bold text-slate-700 text-xs">Marca Activa</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBrandModal(false);
                    setEditingBrand(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === 'save-brand'}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === 'save-brand' ? 'Guardando...' : editingBrand ? 'Actualizar Marca' : 'Registrar Marca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR ESTADO DE PEDIDO / CORREGIR VALIDACIÓN */}
      {showStatusModal && changingStatusOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Modificar Estado del Pedido #{changingStatusOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Cliente: {changingStatusOrder.customerName} • Total: S/ {changingStatusOrder.totalAmount?.toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStatusModal(false);
                  setChangingStatusOrder(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateOrderStatus(
                  changingStatusOrder.id,
                  newOrderStatus,
                  newPaymentStatus,
                  statusChangeReason
                );
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Estado Financiero del Pago *
                </label>
                <select
                  value={newPaymentStatus}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewPaymentStatus(val);
                    if (val === 'VALIDATED') setNewOrderStatus('PAID');
                    else if (val === 'PENDING_VALIDATION') setNewOrderStatus('PENDING');
                    else if (val === 'REJECTED') setNewOrderStatus('CANCELLED');
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-xs"
                >
                  <option value="VALIDATED">✓ PAGO VALIDADO / APROBADO (Descarga stock si no estaba)</option>
                  <option value="PENDING_VALIDATION">⏳ POR VALIDAR / PENDIENTE (Deshacer validación y devolver stock a bodega)</option>
                  <option value="REJECTED">❌ RECHAZADO / COMPROBANTE NO VÁLIDO (Devolver stock si estaba retenido)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Estado Operacional / Logístico *
                </label>
                <select
                  value={newOrderStatus}
                  onChange={(e) => setNewOrderStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-xs"
                >
                  <option value="PENDING">PENDING - Pendiente de Aprobación</option>
                  <option value="PAID">PAID - Pagado Conforme</option>
                  <option value="PROCESSING">PROCESSING - En Preparación en Almacén</option>
                  <option value="SHIPPED">SHIPPED - En Tránsito / Despachado</option>
                  <option value="DELIVERED">DELIVERED - Entregado al Cliente Conforme</option>
                  <option value="CANCELLED">CANCELLED - Anulado / Cancelado</option>
                </select>
              </div>

              {/* Aviso dinámico sobre impacto en Almacén y Kardex */}
              {changingStatusOrder.stockDeducted && newPaymentStatus === 'PENDING_VALIDATION' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 space-y-1">
                  <p className="font-black text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Reversión de Inventario en Bodega</span>
                  </p>
                  <p className="text-[11px]">
                    El stock que fue descargado previamente será devuelto automáticamente a las existencias físicas de cada producto y se registrará un movimiento de retorno en el Kardex.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motivo o Justificación del Cambio (Opcional)
                </label>
                <input
                  type="text"
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                  placeholder="Ej. Se validó por error, el cliente envió otro voucher, etc."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setChangingStatusOrder(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === `status-${changingStatusOrder.id}`}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  {loadingAction === `status-${changingStatusOrder.id}`
                    ? 'Actualizando...'
                    : 'Confirmar Cambio de Estado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENTRADA / CALIBRACIÓN DE KARDEX */}
      {showKardexModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Registrar Asiento de Kardex Físico</h3>
                <p className="text-xs text-slate-500">Cálculo matemático automático de saldo de inventario.</p>
              </div>
              <button onClick={() => setShowKardexModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateKardexEntry} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Artefacto a Calibrar *</label>
                <select
                  value={kardexEntry.productId}
                  onChange={(e) => setKardexEntry({ ...kardexEntry, productId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} - {p.name} (Stock Actual: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Movimiento</label>
                  <select
                    value={kardexEntry.type}
                    onChange={(e) => {
                      const t = e.target.value;
                      setKardexEntry({
                        ...kardexEntry,
                        type: t,
                        direction: t === 'MANUAL_RESTOCK' || t === 'RETURN_RESTOCK' ? 'IN' : 'OUT',
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="MANUAL_RESTOCK">📦 Entrada por Compra / Lote</option>
                    <option value="INVENTORY_ADJUSTMENT">⚖️ Ajuste por Conteo Físico</option>
                    <option value="RETURN_RESTOCK">↩️ Devolución / Reingreso</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dirección de Variación</label>
                  <select
                    value={kardexEntry.direction}
                    onChange={(e) => setKardexEntry({ ...kardexEntry, direction: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold"
                  >
                    <option value="IN">➕ INGRESO (+) al Stock</option>
                    <option value="OUT">➖ SALIDA (-) Descuento Físico</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cantidad de Unidades *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={kardexEntry.quantity}
                    onChange={(e) => setKardexEntry({ ...kardexEntry, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Doc. Referencia / Factura</label>
                  <input
                    type="text"
                    required
                    value={kardexEntry.reference}
                    onChange={(e) => setKardexEntry({ ...kardexEntry, reference: e.target.value.toUpperCase() })}
                    placeholder="FAC-PROV-9921 / GUIA-T001"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowKardexModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === 'create-kardex'}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  {loadingAction === 'create-kardex' ? 'Registrando...' : 'Asentar en Kardex'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR OPERADOR (SUPERADMIN) */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingUser ? 'Editar Operador & Asignación de Asesor' : 'Registrar Operador Administrativo'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingUser
                    ? 'Actualiza datos de perfil, asigna su número de WhatsApp o cambia su contraseña.'
                    : 'Credenciales con hash bcrypt y control de accesos RBAC.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Ej. Camila Rojas"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo Institucional *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="camila.ventas@lacasadelosartefactos.com"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder={editingUser ? 'Dejar en blanco para mantener la contraseña actual' : '••••••••••••'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Teléfono / WhatsApp Asesor
                  </label>
                  <div className="space-y-1.5">
                    {initialSupportChannels && initialSupportChannels.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setNewUser({ ...newUser, phone: e.target.value });
                          }
                        }}
                        className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-700"
                      >
                        <option value="">-- Vincular con Canal WhatsApp --</option>
                        {initialSupportChannels.map((ch: any) => (
                          <option key={ch.id} value={ch.phone}>
                            {ch.name} ({ch.phone})
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="Ej. 981112233"
                      maxLength={9}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Vincula pedidos de clientes a esta vendedora
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">DNI del Asesor</label>
                  <input
                    type="text"
                    value={newUser.documentNumber}
                    onChange={(e) => setNewUser({ ...newUser, documentNumber: e.target.value })}
                    placeholder="8 dígitos"
                    maxLength={8}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rol en Sistema</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="ADMIN">ADMIN (Operador / Asesor)</option>
                    <option value="SUPERADMIN">SUPERADMIN (Total)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perfil RBAC</label>
                  <select
                    value={newUser.profileId}
                    onChange={(e) => setNewUser({ ...newUser, profileId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    {initialProfiles.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Regla de Seguridad para Asesores de Ventas:
                </span>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Al asignar el perfil <strong>"Asesor de Ventas & Showroom"</strong>, este usuario solo podrá visualizar los pedidos que le sean asignados directamente o aquellos que él mismo emita a través del módulo de Venta Asistida (POS). No tiene acceso a Campañas ni Validación Bancaria.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === 'save-user'}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow"
                >
                  {loadingAction === 'save-user'
                    ? 'Guardando...'
                    : editingUser
                    ? 'Guardar Cambios'
                    : 'Crear Operador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR CONTRASEÑA RÁPIDO */}
      {changePasswordUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Cambiar Contraseña</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {changePasswordUser.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChangePasswordUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nueva Contraseña *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={changePasswordInput}
                  onChange={(e) => setChangePasswordInput(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangePasswordUser(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === 'change-password'}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow"
                >
                  {loadingAction === 'change-password' ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOAST FLOTANTE: ALERTA DE NUEVO PEDIDO EN TIEMPO REAL */}
      {/* ======================================================== */}
      {latestOrderAlert && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-950 text-white p-4 rounded-3xl shadow-2xl border-2 border-emerald-500 animate-in slide-in-from-bottom-5 duration-300 ring-4 ring-emerald-500/20">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  ¡NUEVO PEDIDO RECIBIDO!
                </span>
                <span className="text-[10px] font-mono bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                  {latestOrderAlert.orderNumber}
                </span>
              </div>

              <h4 className="text-xs font-black text-white truncate mt-1">
                {latestOrderAlert.customerName}
              </h4>

              <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-slate-800">
                <strong className="text-emerald-400 font-mono text-sm">
                  S/ {Number(latestOrderAlert.totalAmount).toFixed(2)}
                </strong>
                <span className="text-[10px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                  {latestOrderAlert.deliveryType === 'STORE_PICKUP' ? '🏬 Recojo Tienda' : '🚚 A Domicilio'}
                </span>
              </div>

              {latestOrderAlert.hasVoucher && (
                <div className="mt-1.5 p-1 px-2 bg-emerald-950/80 border border-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Comprobante de pago adjuntado</span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('orders');
                    setOrderSearchTerm(latestOrderAlert.orderNumber);
                    dismissAlert();
                  }}
                  className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs text-center"
                >
                  Ver Pedido Ahora
                </button>
                <button
                  type="button"
                  onClick={dismissAlert}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  title="Cerrar alerta"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL / VISTA DE IMPRESIÓN DE DETALLE DE PEDIDO          */}
      {/* ======================================================== */}
      {orderToPrint && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Botones de acción flotantes en pantalla (ocultos al imprimir) */}
          <div className="fixed top-4 right-4 z-[110] flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              onClick={() => setOrderToPrint(null)}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 shadow-xl transition-all cursor-pointer"
              title="Cerrar vista"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* DOCUMENTO IMPRIMIBLE A4 / TICKET DE DESPACHO */}
          <div
            id="printable-order-ticket"
            className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-6 sm:p-10 my-auto text-slate-800 text-xs border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none"
          >
            {/* ENCABEZADO FISCAL */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b-2 border-slate-900 gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-darwin.png"
                  alt="La Casa De Los Artefactos"
                  className="h-14 w-auto object-contain"
                />
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    La Casa De Los Artefactos
                  </h2>
                  <p className="text-[11px] font-bold text-slate-600">
                    CORPORACION DARWIN COMPANY S.A.C.
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Venta especializada de electrodomésticos y tecnología
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Lima, Perú • Web: lacasadelosartefactos.pe
                  </p>
                </div>
              </div>

              {/* RECUADRO TIPO DE COMPROBANTE SUNAT */}
              <div className="border-2 border-slate-900 rounded-xl p-3 text-center min-w-[220px] bg-slate-50/50">
                <span className="text-[11px] font-mono font-bold block text-slate-700">
                  R.U.C. 20608943813
                </span>
                <span className="text-xs font-black uppercase text-blue-900 block my-0.5 tracking-wide">
                  {orderToPrint.customerDocType === 'RUC' || orderToPrint.customerFiscalName
                    ? 'FACTURA ELECTRÓNICA'
                    : 'BOLETA DE VENTA ELECTRÓNICA'}
                </span>
                <span className="text-sm font-mono font-black text-slate-900 block">
                  N° {orderToPrint.orderNumber}
                </span>
              </div>
            </div>

            {/* METADATOS: CLIENTE, COMPROBANTE Y DESPACHO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-slate-200">
              {/* Columna Izquierda: Datos del Cliente */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                  Datos del Cliente & Facturación
                </span>
                <div>
                  <span className="text-slate-500 font-medium">Cliente / Razón Social: </span>
                  <strong className="text-slate-900">
                    {orderToPrint.customerFiscalName || orderToPrint.customerName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Documento ({orderToPrint.customerDocType}): </span>
                  <span className="font-mono font-bold text-slate-900">{orderToPrint.customerDocNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Teléfono: </span>
                  <span className="text-slate-800">{orderToPrint.customerPhone}</span>
                  {orderToPrint.customerEmail && (
                    <span className="text-slate-500 text-[10px]"> • {orderToPrint.customerEmail}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Tipo Comprobante: </span>
                  <strong className="px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] uppercase">
                    {orderToPrint.customerDocType === 'RUC' || orderToPrint.customerFiscalName ? 'FACTURA' : 'BOLETA'}
                  </strong>
                </div>
              </div>

              {/* Columna Derecha: Entrega y Asesor */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                  Datos de Envío & Despacho
                </span>
                <div>
                  <span className="text-slate-500 font-medium">Modalidad: </span>
                  <strong className="text-slate-900">
                    {orderToPrint.deliveryType === 'STORE_PICKUP' ? 'Retiro en Tienda / Almacén' : 'Despacho a Domicilio'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Dirección: </span>
                  <span className="text-slate-900 font-semibold">{orderToPrint.shippingAddress}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Ciudad / Distrito: </span>
                  <span className="text-slate-800">
                    {orderToPrint.shippingCity || 'Lima'} {orderToPrint.shippingDistrict ? `• ${orderToPrint.shippingDistrict}` : ''}
                  </span>
                </div>
                {orderToPrint.shippingReference && (
                  <div>
                    <span className="text-slate-500 font-medium">Referencia: </span>
                    <span className="text-slate-700 italic">{orderToPrint.shippingReference}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 font-medium">Asesor Comercial: </span>
                  <strong className="text-indigo-800">
                    {orderToPrint.assignedAdvisorName || 'Venta Online Directa'}
                  </strong>
                </div>
              </div>
            </div>

            {/* TABLA DE PRODUCTOS */}
            <div className="py-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                Detalle de Artefactos del Hogar
              </span>
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 font-bold text-center w-10">#</th>
                    <th className="py-2 px-3 font-bold text-center w-12">Cant.</th>
                    <th className="py-2 px-3 font-bold">Artefacto / Marca</th>
                    <th className="py-2 px-3 font-bold font-mono">SKU</th>
                    <th className="py-2 px-3 font-bold text-right">P. Unitario</th>
                    <th className="py-2 px-3 font-bold text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orderToPrint.items?.map((it: any, idx: number) => {
                    const price = Number(it.price || it.unitPrice || 0);
                    const qty = Number(it.quantity || 1);
                    const sub = Number(it.subtotal || price * qty);
                    return (
                      <tr key={it.id || idx}>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900 bg-slate-50/50">
                          {qty}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 block">{it.productBrand} {it.productName}</span>
                          <span className="text-[10px] text-slate-500">
                            {it.productCategory} • Garantía oficial: {it.warrantyMonths || 12} meses
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                          {it.productSku || it.sku || '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          S/ {price.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          S/ {sub.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* RESUMEN ECONÓMICO Y ESTADO DE PAGO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 pb-5 border-t border-slate-200">
              <div className="space-y-1.5 text-[11px]">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Condición Financiera
                </span>
                <div>
                  <span className="text-slate-500">Forma de Pago: </span>
                  <strong className="text-slate-900 uppercase">{orderToPrint.paymentMethod}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Estado de Pago: </span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      orderToPrint.paymentStatus === 'VALIDATED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {orderToPrint.paymentStatus === 'VALIDATED' ? '✓ PAGO CONFORME / VALIDADO' : 'POR VALIDAR'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Estado en Almacén: </span>
                  <span className="font-semibold text-slate-800">
                    {orderToPrint.stockDeducted ? 'Descargado de Bodega' : 'Retenido en Bodega'}
                  </span>
                </div>
                {orderToPrint.customerNotes && (
                  <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block text-[10px]">Observaciones del Cliente:</span>
                    <span className="italic text-slate-600">{orderToPrint.customerNotes}</span>
                  </div>
                )}
              </div>

              {/* Cuadro de Totales */}
              <div className="space-y-1 text-right text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Op. Gravada (Subtotal):</span>
                  <span className="font-mono text-slate-700">
                    S/ {(orderToPrint.totalAmount / 1.18).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">I.G.V. (18%):</span>
                  <span className="font-mono text-slate-700">
                    S/ {(orderToPrint.totalAmount - orderToPrint.totalAmount / 1.18).toFixed(2)}
                  </span>
                </div>
                {orderToPrint.shippingCost > 0 && (
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Costo de Envío:</span>
                    <span className="font-mono text-slate-700">
                      S/ {Number(orderToPrint.shippingCost).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black">
                  <span className="text-slate-900 uppercase">Total a Pagar:</span>
                  <span className="font-mono text-blue-700 text-base">
                    S/ {Number(orderToPrint.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN DE FIRMAS PARA ALMACÉN Y TRANSPORTE */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-600">
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-800">Despachado por (Almacén)</p>
                <p className="text-slate-400">Corporación Darwin S.A.C.</p>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-800">Recibido Conforme (Cliente)</p>
                <p className="text-slate-400">Firma, Nombre y DNI</p>
              </div>
            </div>

            {/* PIE DE PÁGINA */}
            <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[9px] text-slate-400">
              <p>Este documento acredita el pedido emitido por la plataforma oficial de La Casa De Los Artefactos.</p>
              <p>Fecha de emisión: {new Date().toLocaleString('es-PE')} • Corporación Darwin Company S.A.C.</p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL VISUALIZADOR DE VOUCHER / COMPROBANTE DE PAGO */}
      {/* ======================================================== */}
      {viewingVoucherOrder && viewingVoucherOrder.paymentReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  📎
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      Comprobante de Pago (Voucher)
                    </h3>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      {viewingVoucherOrder.orderNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        viewingVoucherOrder.paymentStatus === 'VALIDATED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {viewingVoucherOrder.paymentStatus === 'VALIDATED' ? '✓ Validado' : 'Pendiente Validación'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cliente: <strong className="text-slate-700">{viewingVoucherOrder.customerName}</strong> •{' '}
                    Monto total: <strong className="text-slate-900">S/ {Number(viewingVoucherOrder.totalAmount).toFixed(2)}</strong> •{' '}
                    Método: <span className="font-medium text-slate-600">{viewingVoucherOrder.paymentMethod}</span>
                  </p>
                </div>
              </div>

              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={() => setViewingVoucherOrder(null)}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors flex items-center justify-center cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Herramientas de Visualización */}
            <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Zoom: {Math.round(voucherZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setVoucherZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  className="p-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 shadow-2xs cursor-pointer"
                  title="Alejar (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVoucherZoom(1);
                    setVoucherRotation(0);
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-slate-700 shadow-2xs text-[11px] cursor-pointer"
                  title="Restablecer tamaño original"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                  className="p-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 shadow-2xs cursor-pointer"
                  title="Acercar (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherRotation((r) => (r + 90) % 360)}
                  className="p-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 shadow-2xs ml-1 cursor-pointer"
                  title="Girar 90 grados"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/blob-proxy?url=${encodeURIComponent(viewingVoucherOrder.paymentReceiptUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Abrir en pestaña</span>
                </a>
                <a
                  href={`/api/blob-proxy?url=${encodeURIComponent(viewingVoucherOrder.paymentReceiptUrl)}`}
                  download={`voucher-${viewingVoucherOrder.orderNumber}.jpg`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </a>
              </div>
            </div>

            {/* Contenedor del Comprobante (Imagen o PDF) */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-900/90 flex items-center justify-center min-h-[420px]">
              {viewingVoucherOrder.paymentReceiptUrl.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={`/api/blob-proxy?url=${encodeURIComponent(viewingVoucherOrder.paymentReceiptUrl)}`}
                  className="w-full h-[550px] rounded-xl bg-white border-0 shadow-lg"
                  title="Comprobante en formato PDF"
                />
              ) : (
                <div className="overflow-auto max-w-full max-h-full flex items-center justify-center p-2">
                  <img
                    src={`/api/blob-proxy?url=${encodeURIComponent(viewingVoucherOrder.paymentReceiptUrl)}`}
                    alt={`Voucher del pedido ${viewingVoucherOrder.orderNumber}`}
                    style={{
                      transform: `scale(${voucherZoom}) rotate(${voucherRotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                    className="max-h-[520px] max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-150 select-none bg-white"
                  />
                </div>
              )}
            </div>

            {/* Pie del Modal con Acciones Rápidas */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                <span>Ruta segura Vercel Blob descifrada por servidor administrativo oficial.</span>
              </div>

              <div className="flex items-center gap-2">
                {viewingVoucherOrder.paymentStatus !== 'VALIDATED' && canValidatePayments && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleValidatePayment(viewingVoucherOrder.id);
                      setViewingVoucherOrder(null);
                    }}
                    disabled={loadingAction === `validate-${viewingVoucherOrder.id}`}
                    className="inline-flex items-center gap-1.5 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {loadingAction === `validate-${viewingVoucherOrder.id}`
                        ? 'Validando...'
                        : 'Aprobar y Validar Pago'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewingVoucherOrder(null)}
                  className="py-2.5 px-5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
