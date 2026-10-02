import { NextRequest, NextResponse } from 'next/server';
import { orderBroadcaster, NewOrderEventPayload } from '@/lib/orderBroadcaster';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const internalSecret = process.env.INTERNAL_API_SECRET || 'darwin-internal-secret-2026';
    const providedSecret = req.headers.get('x-internal-secret');

    if (!providedSecret || providedSecret !== internalSecret) {
      return NextResponse.json(
        { error: 'Acceso no autorizado al canal de notificaciones internas' },
        { status: 401 }
      );
    }

    const body: NewOrderEventPayload = await req.json();

    if (!body || !body.orderNumber) {
      return NextResponse.json({ error: 'Payload de orden inválido' }, { status: 400 });
    }

    // Emitir al bus en memoria para que todos los navegadores SSE conectados reciban el evento
    orderBroadcaster.emit('new_order', body);

    return NextResponse.json({ success: true, emittedOrder: body.orderNumber });
  } catch (error: any) {
    console.error('Error broadcasting order event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
