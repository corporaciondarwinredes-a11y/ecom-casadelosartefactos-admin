import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminDashboard from './AdminDashboard';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any)?.role;
  const isSuperOrAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN';
  const canUsers = Boolean((session.user as any)?.profile?.canUsers);
  const profileName = (session.user as any)?.profile?.name || '';
  const isSeller =
    userRole === 'SELLER' ||
    profileName.includes('Asesor') ||
    profileName.includes('Venta') ||
    (!isSuperOrAdmin && Boolean((session.user as any)?.profile?.canOrders));

  const orderWhere: any = {};
  if (isSeller) {
    const userPhone = (session.user as any)?.phone || '';
    orderWhere.OR = [
      { assignedAdvisorId: (session.user as any).id },
      { userId: (session.user as any).id },
      { assignedAdvisorName: session.user.name },
      { customerNotes: { contains: session.user.name || '', mode: 'insensitive' } },
    ];
    if (userPhone) {
      orderWhere.OR.push({ assignedAdvisorPhone: userPhone });
      orderWhere.OR.push({ customerNotes: { contains: userPhone, mode: 'insensitive' } });
    }
  }

  // Obtener data directamente de PostgreSQL con límites de seguridad y agregaciones
  const [
    products,
    orders,
    stockMovements,
    users,
    profiles,
    banners,
    announcement,
    supportChannels,
    categoryBanners,
    salesAgg,
    pendingValidationCount,
    stockAgg,
    lowStockAlerts,
    totalOrdersCount,
  ] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Carga inicial rápida de los 100 productos más recientes
    }),
    prisma.order.findMany({
      where: orderWhere,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100, // Carga inicial rápida de los 100 pedidos más recientes
    }),
    prisma.stockMovement.findMany({
      include: {
        product: {
          select: { name: true, brand: true, sku: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    userRole === 'SUPERADMIN' || canUsers
      ? prisma.user.findMany({
          include: { profile: true },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    userRole === 'SUPERADMIN' || canUsers
      ? prisma.profile.findMany({
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    prisma.siteBanner.findMany({
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.announcementBar.findFirst({
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.supportChannel.findMany({
      orderBy: { order: 'asc' },
    }),
    prisma.categoryBanner.findMany({
      orderBy: { order: 'asc' },
    }),
    // Agregaciones SQL directas en PostgreSQL (Precisión 100% sobre toda la BD sin sobrecargar memoria)
    prisma.order.aggregate({
      where: { ...orderWhere, status: 'PAID' },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({
      where: { ...orderWhere, paymentStatus: 'PENDING_VALIDATION' },
    }),
    prisma.product.aggregate({
      where: { isAvailable: true },
      _sum: { stock: true },
    }),
    prisma.product.count({
      where: { isAvailable: true, stock: { lte: 5 } },
    }),
    prisma.order.count({
      where: orderWhere,
    }),
  ]);

  // KPIs agregados desde PostgreSQL
  const totalSales = salesAgg._sum.totalAmount || 0;
  const totalStockUnits = stockAgg._sum.stock || 0;

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminDashboard
        currentUser={session.user as any}
        initialProducts={products as any}
        initialOrders={orders as any}
        initialMovements={stockMovements as any}
        initialUsers={users as any}
        initialProfiles={profiles as any}
        initialBanners={banners as any}
        initialAnnouncement={announcement as any}
        initialSupportChannels={supportChannels as any}
        initialCategoryBanners={categoryBanners as any}
        kpis={{
          totalSales,
          pendingValidationCount,
          totalStockUnits,
          lowStockAlerts,
          totalOrdersCount: orders.length,
        }}
      />
    </div>
  );
}
