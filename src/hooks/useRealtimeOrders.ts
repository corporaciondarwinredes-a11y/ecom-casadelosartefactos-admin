'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { playChimeSound } from '@/lib/audioAlert';

export interface RealtimeOrderAlert {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  totalAmount: number;
  assignedAdvisorId?: string | null;
  assignedAdvisorName?: string | null;
  assignedAdvisorPhone?: string | null;
  deliveryType: string;
  paymentStatus: string;
  paymentMethod: string;
  hasVoucher: boolean;
  paymentReceiptUrl?: string | null;
  shippingCity?: string | null;
  shippingDistrict?: string | null;
  createdAt: string;
}

interface UseRealtimeOrdersProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserPhone?: string;
  userRole?: string;
  isSellerRole?: boolean;
  onNewOrder?: (order: RealtimeOrderAlert) => void;
}

export function useRealtimeOrders({
  currentUserId,
  currentUserName,
  currentUserPhone,
  userRole,
  isSellerRole = false,
  onNewOrder,
}: UseRealtimeOrdersProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [latestOrderAlert, setLatestOrderAlert] = useState<RealtimeOrderAlert | null>(null);
  const [connected, setConnected] = useState(true);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Registro de IDs ya alertados para prevenir alertas duplicadas
  const alertedOrderIdsRef = useRef<Set<string>>(new Set());
  const lastCheckedTimestampRef = useRef<string>(new Date(Date.now() - 30000).toISOString());

  // Cargar preferencia de sonido desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ecom_advisor_sound_enabled');
      if (saved !== null) {
        setSoundEnabled(saved === 'true');
      }
    } catch (e) {}
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ecom_advisor_sound_enabled', String(next));
      } catch (e) {}

      if (next) {
        playChimeSound('test');
      }
      return next;
    });
  }, []);

  const dismissAlert = useCallback(() => {
    setLatestOrderAlert(null);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
  }, []);

  // Función unificada para procesar y disparar alerta de pedido
  const handleIncomingOrder = useCallback(
    (orderData: any) => {
      const orderId = orderData.id || orderData.orderId;
      if (!orderId) return;

      // Si ya fue alertado en esta sesión, ignorar
      if (alertedOrderIdsRef.current.has(orderId)) return;
      alertedOrderIdsRef.current.add(orderId);

      // Evaluación estricta de pertenencia:
      // Superadmin / Auditor reciben todas las alertas
      // Asesor de ventas SOLO recibe si el pedido le corresponde
      const isSuperadmin = userRole === 'SUPERADMIN' || !isSellerRole;

      let isAssignedToMe = false;
      if (isSellerRole) {
        const myId = currentUserId;
        const myName = currentUserName?.toLowerCase().trim();
        const myPhone = currentUserPhone?.trim();

        const orderAdvId = orderData.assignedAdvisorId;
        const orderAdvName = (orderData.assignedAdvisorName || '').toLowerCase().trim();
        const orderAdvPhone = (orderData.assignedAdvisorPhone || '').trim();

        isAssignedToMe = Boolean(
          (myId && orderAdvId === myId) ||
          (myName && orderAdvName === myName) ||
          (myPhone && orderAdvPhone === myPhone)
        );
      }

      const shouldAlert = isSuperadmin || isAssignedToMe;

      if (shouldAlert) {
        const normalizedOrder: RealtimeOrderAlert = {
          id: orderId,
          orderNumber: orderData.orderNumber,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          totalAmount: Number(orderData.totalAmount) || 0,
          assignedAdvisorId: orderData.assignedAdvisorId,
          assignedAdvisorName: orderData.assignedAdvisorName,
          assignedAdvisorPhone: orderData.assignedAdvisorPhone,
          deliveryType: orderData.deliveryType || 'DELIVERY',
          paymentStatus: orderData.paymentStatus || 'PENDING_VALIDATION',
          paymentMethod: orderData.paymentMethod || 'TRANSFERENCIA',
          hasVoucher: Boolean(orderData.paymentReceiptUrl || orderData.hasVoucher),
          paymentReceiptUrl: orderData.paymentReceiptUrl,
          shippingCity: orderData.shippingCity,
          shippingDistrict: orderData.shippingDistrict,
          createdAt: orderData.createdAt || new Date().toISOString(),
        };

        setLatestOrderAlert(normalizedOrder);

        // Sonido en tiempo real
        if (soundEnabled) {
          playChimeSound(normalizedOrder.hasVoucher ? 'voucher' : 'order');
        }

        // Auto-dismiss a los 12 segundos
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => {
          setLatestOrderAlert(null);
        }, 12000);

        // Notificar al componente para agregar la orden a la tabla sin F5
        if (onNewOrder) {
          onNewOrder(normalizedOrder);
        }
      }
    },
    [currentUserId, currentUserName, currentUserPhone, userRole, isSellerRole, soundEnabled, onNewOrder]
  );

  // 1. Canal Primario: Server-Sent Events (SSE)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isCancelled = false;

    function connectSSE() {
      try {
        eventSource = new EventSource('/api/realtime/orders');

        eventSource.addEventListener('connected', () => {
          if (!isCancelled) setConnected(true);
        });

        eventSource.addEventListener('new_order', (e: MessageEvent) => {
          if (isCancelled) return;
          try {
            const data = JSON.parse(e.data);
            handleIncomingOrder(data);
          } catch (err) {
            console.error('Error procesando evento new_order SSE:', err);
          }
        });

        eventSource.onerror = () => {
          if (!isCancelled) {
            // El navegador reconecta automáticamente
          }
        };
      } catch (err) {
        console.warn('EventSource no disponible o bloqueado:', err);
      }
    }

    connectSSE();

    return () => {
      isCancelled = true;
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [handleIncomingOrder]);

  // 2. Canal de Respaldo Inmune a Servidores Serverless / Vercel (Polling Inteligente a PostgreSQL cada 4 segundos)
  useEffect(() => {
    let isCancelled = false;

    const checkDatabaseOrders = async () => {
      try {
        const since = lastCheckedTimestampRef.current;
        const res = await fetch(`/api/realtime/check-orders?since=${encodeURIComponent(since)}`);
        if (!res.ok) return;

        const data = await res.json();
        if (isCancelled) return;

        setConnected(true);

        if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
          // Procesar las órdenes más recientes primero
          for (const order of data.orders) {
            handleIncomingOrder(order);
          }
          // Avanzar la marca de tiempo a la más reciente recibida
          lastCheckedTimestampRef.current = data.orders[0].createdAt;
        }
      } catch (e) {
        // En caso de fallo transitorio de red no congelar
      }
    };

    // Polling regular cada 4 segundos
    const interval = setInterval(checkDatabaseOrders, 4000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [handleIncomingOrder]);

  return {
    soundEnabled,
    toggleSound,
    connected,
    latestOrderAlert,
    dismissAlert,
  };
}
