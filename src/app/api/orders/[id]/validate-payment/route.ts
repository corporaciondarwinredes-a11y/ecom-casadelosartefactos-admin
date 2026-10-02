import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const canValidatePayments = (session.user as any).profile?.canValidatePayments;

    if (userRole !== 'SUPERADMIN' && !canValidatePayments) {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requiere permiso para validar pagos y autorizar despacho' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { paymentReference } = body;
    const adminEmail = session.user.email || 'admin@corporaciondarwin.com';

    // Ejecutar Transacción Atómica con Prisma
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener orden con sus items
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) {
        throw new Error('Pedido no encontrado');
      }

      if (order.stockDeducted) {
        throw new Error('El stock de este pedido ya fue descargado previamente');
      }

      // 2. Verificar y descargar stock de cada producto
      for (const item of order.items) {
        if (!item.productId) continue;

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Producto ${item.productName} no encontrado en almacén`);
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente en almacén para ${product.name}. Existencias: ${product.stock}, requeridas: ${item.quantity}`
          );
        }

        // Descontar existencias físicas
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });

        // Registrar Asiento Oficial en Kardex
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: 'SALE_DEDUCTION',
            inQuantity: 0,
            outQuantity: item.quantity,
            changeQuantity: -item.quantity,
            previousStock: product.stock,
            balance: updatedProduct.stock,
            newStock: updatedProduct.stock,
            orderId: order.id,
            reference: `Pedido #${order.orderNumber}`,
            user: adminEmail,
            note: `Salida de almacén autorizada tras comprobación de pago bancario por ${adminEmail}`,
          },
        });
      }

      // 3. Actualizar estado de la orden
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: 'PAID',
          paymentStatus: 'VALIDATED',
          paymentValidatedBy: adminEmail,
          paymentValidatedAt: new Date(),
          paymentReference: paymentReference || order.paymentReference || null,
          stockDeducted: true,
        },
        include: { items: true },
      });

      // 4. Registrar log de auditoría
      const adminUser = await tx.user.findUnique({
        where: { email: adminEmail },
      });

      if (adminUser) {
        await tx.adminAuditLog.create({
          data: {
            userId: adminUser.id,
            action: 'VALIDATE_PAYMENT',
            resource: `Order #${order.orderNumber}`,
            details: `Validación de pago de S/ ${order.totalAmount.toFixed(2)} y deducción atómica de ${order.items.length} ítems en Kardex`,
          },
        });
      }

      return updatedOrder;
    });

    return NextResponse.json({
      success: true,
      message: 'Pago validado exitosamente y stock descargado de almacén',
      order: result,
    });
  } catch (error: any) {
    console.error('Error validating payment:', error);
    return NextResponse.json(
      { error: error.message || 'Error al validar pago y descargar stock' },
      { status: 400 }
    );
  }
}
