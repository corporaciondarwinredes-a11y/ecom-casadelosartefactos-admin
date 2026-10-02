import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canKardex = (session?.user as any)?.profile?.canKardex;

    if (!session || (userRole !== 'SUPERADMIN' && !canKardex)) {
      return NextResponse.json(
        { error: 'Acceso no autorizado: requiere permisos de auditoría de Kardex' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const where: any = {};
    if (productId) where.productId = productId;

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            brand: true,
            sku: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Error fetching stock audits:', error);
    return NextResponse.json({ error: 'Error al consultar Kardex' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canKardex = (session?.user as any)?.profile?.canKardex;

    if (!session || (userRole !== 'SUPERADMIN' && !canKardex)) {
      return NextResponse.json(
        { error: 'Acceso no autorizado: requiere permisos de gestión de Kardex' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { productId, type, quantity, direction, reference, note } = body;

    const qty = Number(quantity);
    if (!productId || isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { error: 'Debe especificar el artefacto y una cantidad válida mayor a 0' },
        { status: 400 }
      );
    }

    const isIngreso = direction === 'IN' || type === 'MANUAL_RESTOCK';
    const movementType = type || (isIngreso ? 'MANUAL_RESTOCK' : 'INVENTORY_ADJUSTMENT');
    const changeQty = isIngreso ? qty : -qty;
    const inQty = isIngreso ? qty : 0;
    const outQty = isIngreso ? 0 : qty;

    const operatorEmail = session.user?.email || 'admin@corporaciondarwin.com';

    // Ejecución atómica y cálculo matemático de saldos de Kardex
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error('El artefacto seleccionado no existe en el catálogo');
      }

      if (!isIngreso && product.stock < qty) {
        throw new Error(`Stock insuficiente en bodega central: disponible ${product.stock} unidades, intentó descontar ${qty}`);
      }

      const previousStock = product.stock;
      const newStock = Math.max(0, previousStock + changeQty);

      // 1. Actualizar stock del producto
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      // 2. Insertar asiento contable en Kardex físico
      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: movementType,
          inQuantity: inQty,
          outQuantity: outQty,
          changeQuantity: changeQty,
          previousStock,
          balance: newStock,
          newStock,
          reference: reference || (isIngreso ? 'REPOSICION-LOTE-ALMACEN' : 'AJUSTE-AUDITORIA-FISICA'),
          user: operatorEmail,
          note: note || `Movimiento manual registrado por ${operatorEmail}`,
        },
        include: {
          product: {
            select: { name: true, brand: true, sku: true },
          },
        },
      });

      return { updatedProduct, movement };
    });

    return NextResponse.json({
      success: true,
      product: result.updatedProduct,
      movement: result.movement,
      message: `Asiento de Kardex registrado exitosamente: Saldo anterior ${result.movement.previousStock} -> Nuevo Saldo ${result.movement.balance}`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording stock movement:', error);
    return NextResponse.json(
      { error: error.message || 'Error al registrar movimiento en Kardex' },
      { status: 500 }
    );
  }
}
