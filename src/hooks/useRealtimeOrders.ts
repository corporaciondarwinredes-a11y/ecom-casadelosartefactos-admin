'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { playChimeSound } from '@/lib/audioAlert';

export interface RealtimeOrderAlert {
  orderId: string;
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
  userRole?: string;
  onNewOrder?: (order: RealtimeOrderAlert) => void;
}

export function useRealtimeOrders({
  currentUserId,
  currentUserName,
  userRole,
  onNewOrder,
}: UseRealtimeOrdersProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [latestOrderAlert, setLatestOrderAlert] = useState<RealtimeOrderAlert | null>(null);
  const [connected, setConnected] = useState(false);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar preferencia de sonido desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ecom_advisor_sound_enabled');
      if (saved !== null) {
        setSoundEnabled(saved === 'true');
      }
    } catch (e) {
      // Ignorar en SSR
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ecom_advisor_sound_enabled', String(next));
      } catch (e) {}

      if (next) {
        playChimeSound('test'); // Tono de confirmación al activar
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
            const orderData: RealtimeOrderAlert = JSON.parse(e.data);

            // Filtrar relevancia:
            // Superadmin / Admin reciben todo.
            // Asesor recibe si: está asignado a él/ella O si está libre (sin asesor).
            const isSuperOrAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN';
            const isAssignedToMe =
              Boolean(
                (currentUserId && orderData.assignedAdvisorId === currentUserId) ||
                (currentUserName && orderData.assignedAdvisorName === currentUserName)
              );

            // Requisito estricto: El asesor solo puede ver y ser alertado de sus pedidos asignados
            const isRelevant = isSuperOrAdmin || isAssignedToMe;

            if (isRelevant) {
              setLatestOrderAlert(orderData);

              // Reproducir sonido si está habilitado
              if (soundEnabled) {
                playChimeSound(orderData.hasVoucher ? 'voucher' : 'order');
              }

              // Auto-dismiss en 12 segundos
              if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
              dismissTimerRef.current = setTimeout(() => {
                setLatestOrderAlert(null);
              }, 12000);

              // Notificar al componente principal para refrescar tablas
              if (onNewOrder) {
                onNewOrder(orderData);
              }
            }
          } catch (err) {
            console.error('Error procesando evento new_order SSE:', err);
          }
        });

        eventSource.onerror = () => {
          if (!isCancelled) {
            setConnected(false);
            // El navegador reconecta automáticamente tras error
          }
        };
      } catch (err) {
        console.error('Error iniciando EventSource:', err);
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
  }, [currentUserId, currentUserName, userRole, soundEnabled, onNewOrder]);

  return {
    soundEnabled,
    toggleSound,
    connected,
    latestOrderAlert,
    dismissAlert,
  };
}
