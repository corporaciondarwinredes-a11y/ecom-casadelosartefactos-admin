import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    const userRole = (session.user as any).role;
    const canValidatePayments = (session.user as any).profile?.canValidatePayments;

    // Se requiere permiso de validación de pagos o superadmin para cambiar estados financieros y operacionales
    if (userRole !== 'SUPERADMIN' && !canValidatePayments) {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requiere permiso para modificar el estado de pedidos y stock' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, paymentStatus, reason } = body;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const adminEmail = session.user.email || 'admin@corporaciondarwin.com';
    const targetStatus = status || existingOrder.status;
    const targetPaymentStatus = paymentStatus !== undefined ? paymentStatus : existingOrder.paymentStatus;

    // Determinar si debemos revertir stock o descargar stock
    const isRevertingStock =
      existingOrder.stockDeducted &&
      (targetPaymentStatus === 'PENDING_VALIDATION' ||
        targetPaymentStatus === 'PENDING_PAYMENT' ||
        targetPaymentStatus === 'REJECTED' ||
        targetStatus === 'CANCELLED');

    const isDeductingStock =
      !existingOrder.stockDeducted &&
      (targetPaymentStatus === 'VALIDATED' || targetStatus === 'PAID');

    // Ejecutar transacción atómica
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. REVERSIÓN DE STOCK (Si se equivocó validando o se anula el pedido)
      if (isRevertingStock) {
        for (const item of existingOrder.items) {
          if (!item.productId) continue;

          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (!prod) continue;

          const newStock = prod.stock + item.quantity;
          await tx.product.update({
            where: { id: prod.id },
            data: { stock: { increment: item.quantity } },
          });

          // Asiento Kardex de Retorno / Ajuste
          await tx.stockMovement.create({
            data: {
              productId: prod.id,
              type: 'RETURN_RESTOCK',
              inQuantity: item.quantity,
              outQuantity: 0,
              changeQuantity: item.quantity,
              previousStock: prod.stock,
              balance: newStock,
              newStock: newStock,
              orderId: existingOrder.id,
              reference: `Corrección Pedido #${existingOrder.orderNumber}`,
              user: adminEmail,
              note: `Reversión de existencias por cambio de estado / desvalidación manual por ${adminEmail}${reason ? ` (${reason})` : ''}`,
            },
          });
        }
      }

      // 2. DESCARGA DE STOCK (Si se pasa a Validado / Pagado)
      if (isDeductingStock) {
        for (const item of existingOrder.items) {
          if (!item.productId) continue;

          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (!prod) {
            throw new Error(`Producto ${item.productName} no encontrado`);
          }

          if (prod.stock < item.quantity) {
            throw new Error(`Stock insuficiente para ${prod.name}. Stock actual: ${prod.stock}, requerido: ${item.quantity}`);
          }

          const newStock = prod.stock - item.quantity;
          await tx.product.update({
            where: { id: prod.id },
            data: { stock: { decrement: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: prod.id,
              type: 'SALE_DEDUCTION',
              inQuantity: 0,
              outQuantity: item.quantity,
              changeQuantity: -item.quantity,
              previousStock: prod.stock,
              balance: newStock,
              newStock: newStock,
              orderId: existingOrder.id,
              reference: `Pedido #${existingOrder.orderNumber}`,
              user: adminEmail,
              note: `Salida de almacén autorizada por validación de pago por ${adminEmail}`,
            },
          });
        }
      }

      // 3. Actualizar la orden
      const updateData: any = {
        status: targetStatus,
        paymentStatus: targetPaymentStatus,
      };

      if (isRevertingStock) {
        updateData.stockDeducted = false;
        updateData.paymentValidatedBy = null;
        updateData.paymentValidatedAt = null;
      } else if (isDeductingStock) {
        updateData.stockDeducted = true;
        updateData.paymentValidatedBy = adminEmail;
        updateData.paymentValidatedAt = new Date();
      }

      const orderUpdated = await tx.order.update({
        where: { id },
        data: updateData,
        include: { items: true },
      });

      // 4. Auditoría
      try {
        await tx.adminAuditLog.create({
          data: {
            userId: (session.user as any).id,
            action: 'UPDATE_ORDER_STATUS',
            resource: `Order:${id}`,
            details: `Cambio de estado para pedido #${existingOrder.orderNumber} por ${adminEmail}: Estado (${existingOrder.status} -> ${targetStatus}), Pago (${existingOrder.paymentStatus} -> ${targetPaymentStatus}). Stock ${isRevertingStock ? 'Revertido a bodega (+)' : isDeductingStock ? 'Descargado (-)' : 'Sin cambios'}.`,
          },
        });
      } catch (e) {
        // no bloquea
      }

      return orderUpdated;
    });

    return NextResponse.json({
      success: true,
      message: 'Estado del pedido actualizado correctamente',
      order: updatedOrder,
      stockReverted: isRevertingStock,
      stockDeducted: isDeductingStock,
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar estado del pedido' },
      { status: 500 }
    );
  }
}
