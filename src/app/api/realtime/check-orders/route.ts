import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const profile = (session.user as any)?.profile;
    const isSuperadmin = userRole === 'SUPERADMIN';
    const canValidatePayments = isSuperadmin || Boolean(profile?.canValidatePayments);
    const canOrders = isSuperadmin || Boolean(profile?.canOrders);

    if (!canOrders) {
      return NextResponse.json({ error: 'Sin permisos de órdenes' }, { status: 403 });
    }

    const isSeller = !isSuperadmin && !canValidatePayments && canOrders;
    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get('since');

    const sinceDate = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 30000);

    const where: any = {
      createdAt: { gt: sinceDate },
    };

    // Si es asesor, solo buscar pedidos que le hayan sido asignados a él/ella
    if (isSeller) {
      const userId = (session.user as any)?.id;
      const userName = session.user.name || '';
      const userPhone = (session.user as any)?.phone || '';

      const orClauses: any[] = [];
      if (userId) {
        orClauses.push({ assignedAdvisorId: userId });
        orClauses.push({ userId: userId });
      }
      if (userName) {
        orClauses.push({ assignedAdvisorName: userName });
        orClauses.push({ customerNotes: { contains: userName, mode: 'insensitive' } });
      }
      if (userPhone) {
        orClauses.push({ assignedAdvisorPhone: userPhone });
        orClauses.push({ customerNotes: { contains: userPhone, mode: 'insensitive' } });
      }

      where.OR = orClauses.length > 0 ? orClauses : [{ id: 'none' }];
    }

    // Consultar pedidos recientes en PostgreSQL
    const newOrders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        totalAmount: true,
        assignedAdvisorId: true,
        assignedAdvisorName: true,
        assignedAdvisorPhone: true,
        deliveryType: true,
        paymentStatus: true,
        paymentMethod: true,
        paymentReceiptUrl: true,
        shippingCity: true,
        shippingDistrict: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: newOrders.length,
      orders: newOrders.map((o) => ({
        ...o,
        hasVoucher: Boolean(o.paymentReceiptUrl),
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Error verificando órdenes en tiempo real:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
