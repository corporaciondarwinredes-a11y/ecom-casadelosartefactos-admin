import { EventEmitter } from 'events';

// Instancia singleton en memoria de Node.js para distribuir eventos SSE en tiempo real
class OrderBroadcaster extends EventEmitter {}

declare global {
  var __globalOrderBroadcaster: OrderBroadcaster | undefined;
}

export const orderBroadcaster =
  global.__globalOrderBroadcaster || new OrderBroadcaster();

if (process.env.NODE_ENV !== 'production') {
  global.__globalOrderBroadcaster = orderBroadcaster;
}

export interface NewOrderEventPayload {
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
