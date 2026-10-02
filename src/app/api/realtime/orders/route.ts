import { NextRequest } from 'next/server';
import { orderBroadcaster, NewOrderEventPayload } from '@/lib/orderBroadcaster';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Mensaje de bienvenida inicial para confirmar conexión SSE
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`)
      );

      // 2. Suscripción al bus de eventos de órdenes
      const onNewOrder = (orderData: NewOrderEventPayload) => {
        try {
          const payload = `event: new_order\ndata: ${JSON.stringify(orderData)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.error('Error transmitiendo evento SSE:', err);
        }
      };

      orderBroadcaster.on('new_order', onNewOrder);

      // 3. Heartbeat cada 20 segundos para mantener el canal abierto a través de proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 20000);

      // 4. Limpieza de memoria cuando el cliente cierra la pestaña o navega
      req.signal.addEventListener('abort', () => {
        orderBroadcaster.off('new_order', onNewOrder);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Evita buffering en proxies Nginx
    },
  });
}
