import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const isSuperadmin = userRole === 'SUPERADMIN';
    const profile = (session?.user as any)?.profile;
    const canOrders = isSuperadmin || Boolean(profile?.canOrders);
    const canValidatePayments = isSuperadmin || Boolean(profile?.canValidatePayments);

    if (!session || !canOrders) {
      return NextResponse.json(
        { error: 'Acceso restringido: requiere permisos de gestión o consulta de pedidos' },
        { status: 403 }
      );
    }

    // Un asesor de ventas es todo usuario que consulta pedidos pero NO es superadmin ni valida pagos
    const isSeller = !isSuperadmin && !canValidatePayments && canOrders;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (paymentStatus && paymentStatus !== 'ALL') where.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Restricción: Los asesores de venta solo pueden ver sus pedidos asignados y los creados por sí mismos
    if (isSeller) {
      const currentUserId = (session?.user as any)?.id;
      const currentUserName = session?.user?.name || '';
      const currentUserPhone = (session?.user as any)?.phone || '';

      const orConditions: any[] = [
        { assignedAdvisorId: currentUserId },
        { userId: currentUserId }, // Pedidos creados por sí mismo en venta asistida / POS
      ];

      if (currentUserName) {
        orConditions.push({ assignedAdvisorName: currentUserName });
        orConditions.push({ customerNotes: { contains: currentUserName, mode: 'insensitive' } });
      }

      if (currentUserPhone) {
        orConditions.push({ assignedAdvisorPhone: currentUserPhone });
        orConditions.push({ customerNotes: { contains: currentUserPhone, mode: 'insensitive' } });
      }

      where.OR = orConditions;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
  }
}

// PATCH: Reasignar o asignar asesor a un pedido (Solo administradores / superadmins)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, assignedAdvisorId, assignedAdvisorName, assignedAdvisorPhone } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'ID de pedido requerido' }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        assignedAdvisorId: assignedAdvisorId || null,
        assignedAdvisorName: assignedAdvisorName || null,
        assignedAdvisorPhone: assignedAdvisorPhone || null,
      },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    console.error('Error updating order advisor:', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar asesor' }, { status: 500 });
  }
}
