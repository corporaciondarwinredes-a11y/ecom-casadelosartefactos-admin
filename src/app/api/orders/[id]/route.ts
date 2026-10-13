import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Acceso no autorizado: requiere sesión administrativa' }, { status: 401 });
    }

    const userRole = (session?.user as any)?.role;
    const isSuperadmin = userRole === 'SUPERADMIN';
    const profile = (session?.user as any)?.profile;
    const canOrders = isSuperadmin || Boolean(profile?.canOrders);
    const canValidatePayments = isSuperadmin || Boolean(profile?.canValidatePayments);

    if (!canOrders) {
      return NextResponse.json({ error: 'Acceso denegado: no cuenta con permisos de pedidos' }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Mitigación IDOR: Asesores solo pueden ver sus pedidos asignados
    const isSeller = !isSuperadmin && !canValidatePayments && canOrders;
    if (isSeller) {
      const sellerId = (session.user as any)?.id;
      const belongsToSeller =
        order.assignedAdvisorId === sellerId ||
        (session.user.email && order.customerEmail === session.user.email);

      if (!belongsToSeller) {
        return NextResponse.json(
          { error: 'Acceso denegado: no cuenta con autorización para visualizar este pedido' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order detail:', error);
    return NextResponse.json({ error: 'Error al consultar el pedido' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Acceso no autorizado: requiere sesión activa' }, { status: 401 });
    }

    const userRole = (session?.user as any)?.role;
    const isSuperadmin = userRole === 'SUPERADMIN';
    const profile = (session?.user as any)?.profile;
    const canOrders = isSuperadmin || Boolean(profile?.canOrders);
    const canValidatePayments = isSuperadmin || Boolean(profile?.canValidatePayments);

    if (!canOrders) {
      return NextResponse.json({ error: 'Acceso denegado: no cuenta con permisos de pedidos' }, { status: 403 });
    }

    const body = await request.json();
    const { paymentReceiptUrl } = body;

    if (!paymentReceiptUrl) {
      return NextResponse.json({ error: 'Se requiere la URL del voucher o comprobante' }, { status: 400 });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Mitigación IDOR: Asesores solo pueden actualizar comprobantes de sus pedidos asignados
    const isSeller = !isSuperadmin && !canValidatePayments && canOrders;
    if (isSeller) {
      const sellerId = (session.user as any)?.id;
      const belongsToSeller =
        existingOrder.assignedAdvisorId === sellerId ||
        (session.user.email && existingOrder.customerEmail === session.user.email);

      if (!belongsToSeller) {
        return NextResponse.json(
          { error: 'Acceso denegado: no cuenta con autorización para modificar este pedido' },
          { status: 403 }
        );
      }
    }

    // Si el pedido estaba PENDING_PAYMENT, al subir el voucher se promueve a PENDING_VALIDATION
    const newPaymentStatus =
      existingOrder.paymentStatus === 'PENDING_PAYMENT'
        ? 'PENDING_VALIDATION'
        : existingOrder.paymentStatus;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        paymentReceiptUrl,
        paymentStatus: newPaymentStatus,
      },
      include: {
        items: true,
      },
    });

    // Auditoría
    try {
      await prisma.adminAuditLog.create({
        data: {
          userId: (session.user as any).id,
          action: 'UPLOAD_PAYMENT_RECEIPT',
          resource: `Order:${id}`,
          details: `El usuario ${session.user.name || session.user.email} subió el comprobante de pago para el pedido ${existingOrder.orderNumber}. Estado actualizado a: ${newPaymentStatus}`,
        },
      });
    } catch (auditErr) {
      // no bloqueante
    }

    return NextResponse.json({
      success: true,
      message: 'Comprobante de pago registrado correctamente',
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Error updating order payment receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar el comprobante del pedido' },
      { status: 500 }
    );
  }
}
