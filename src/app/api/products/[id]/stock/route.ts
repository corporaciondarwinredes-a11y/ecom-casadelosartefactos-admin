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
    const body = await request.json();
    const { delta, note } = body;

    if (typeof delta !== 'number') {
      return NextResponse.json({ error: 'El valor delta debe ser un número' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || 'admin@corporaciondarwin.com';

    // Transacción atómica para calibración física de inventario
    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new Error('Producto no encontrado');

      const newStock = Math.max(0, product.stock + delta);
      const isIncrease = delta > 0;

      const pUpdated = await tx.product.update({
        where: { id },
        data: { stock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          productId: id,
          type: isIncrease ? 'MANUAL_RESTOCK' : 'INVENTORY_ADJUSTMENT',
          inQuantity: isIncrease ? delta : 0,
          outQuantity: isIncrease ? 0 : Math.abs(delta),
          changeQuantity: delta,
          previousStock: product.stock,
          balance: newStock,
          newStock,
          reference: 'CALIBRACION-RAPIDA-ADMIN',
          user: userEmail,
          note: note || `Ajuste manual de stock (${delta > 0 ? '+' : ''}${delta}) en bodega central`,
        },
      });

      return pUpdated;
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error('Error updating product stock:', error);
    return NextResponse.json({ error: error.message || 'Error al calibrar stock' }, { status: 500 });
  }
}
