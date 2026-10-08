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
    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { order: 'asc' } } },
    });

    if (!product) {
      return NextResponse.json({ error: 'Artefacto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Error al consultar producto' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canCatalog = (session?.user as any)?.profile?.canCatalog;

    if (!session || (userRole !== 'SUPERADMIN' && !canCatalog)) {
      return NextResponse.json(
        { error: 'Acceso no autorizado: requiere permisos de catálogo o superadmin' },
        { status: 403 }
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Artefacto no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      brand,
      category,
      modelCode,
      sku,
      barcode,
      retailPrice,
      discountPrice,
      price,
      stock,
      warrantyMonths,
      energyRating,
      voltage,
      dimensions,
      weightKg,
      description,
      specifications,
      image,
      images,
      isFeatured,
      isAvailable,
    } = body;

    const allImages: string[] = Array.isArray(images) && images.length > 0
      ? images
      : (image ? [image] : (existingProduct.image ? [existingProduct.image] : []));
    const mainImage = image || (allImages.length > 0 ? allImages[0] : existingProduct.image);

    const newStock = stock !== undefined ? Number(stock) : existingProduct.stock;
    const stockDiff = newStock - existingProduct.stock;

    // Actualizar producto en transacción
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // 1. Si enviaron array de imágenes, actualizar relación
      if (Array.isArray(images) && images.length > 0) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map((url: string, idx: number) => ({
            productId: id,
            url,
            isPrimary: idx === 0,
            order: idx,
          })),
        });
      }

      // 2. Actualizar datos base del producto
      const updated = await tx.product.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : existingProduct.name,
          brand: brand !== undefined ? brand.trim() : existingProduct.brand,
          category: category !== undefined ? category : existingProduct.category,
          modelCode: modelCode !== undefined ? (modelCode?.trim() || null) : existingProduct.modelCode,
          sku: sku !== undefined ? sku.trim() : existingProduct.sku,
          barcode: barcode !== undefined ? (barcode?.trim() || null) : existingProduct.barcode,
          retailPrice: retailPrice !== undefined ? Number(retailPrice) : existingProduct.retailPrice,
          discountPrice: discountPrice !== undefined ? (discountPrice ? Number(discountPrice) : null) : existingProduct.discountPrice,
          price: price !== undefined ? Number(price) : existingProduct.price,
          stock: newStock,
          warrantyMonths: warrantyMonths !== undefined ? Number(warrantyMonths) : existingProduct.warrantyMonths,
          energyRating: energyRating !== undefined ? (energyRating && energyRating.trim() !== '' ? energyRating.trim() : null) : existingProduct.energyRating,
          voltage: voltage !== undefined ? voltage : existingProduct.voltage,
          dimensions: dimensions !== undefined ? (dimensions?.trim() || null) : existingProduct.dimensions,
          weightKg: weightKg !== undefined ? (weightKg ? Number(weightKg) : null) : existingProduct.weightKg,
          description: description !== undefined ? description : existingProduct.description,
          specifications: specifications !== undefined ? (specifications || null) : existingProduct.specifications,
          image: mainImage,
          isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : existingProduct.isFeatured,
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : existingProduct.isAvailable,
        },
        include: { images: true },
      });

      // 3. Si hubo cambio en el stock, registrar Kardex automático
      if (stockDiff !== 0) {
        await tx.stockMovement.create({
          data: {
            productId: id,
            type: 'INVENTORY_ADJUSTMENT',
            inQuantity: stockDiff > 0 ? stockDiff : 0,
            outQuantity: stockDiff < 0 ? Math.abs(stockDiff) : 0,
            changeQuantity: stockDiff,
            previousStock: existingProduct.stock,
            balance: newStock,
            newStock: newStock,
            reference: 'AJUSTE-MANUAL-EDICION',
            user: session.user?.email || 'admin@corporaciondarwin.com',
            note: `Ajuste de inventario desde la edición del artefacto (${existingProduct.stock} -> ${newStock})`,
          },
        });
      }

      // 4. Auditoría
      try {
        await tx.adminAuditLog.create({
          data: {
            userId: (session.user as any).id,
            action: 'UPDATE_PRODUCT_CATALOG',
            resource: `Product:${id}`,
            details: `El usuario ${session.user?.email} actualizó la ficha técnica de '${updated.name}'.`,
          },
        });
      } catch (err) {
        // no bloqueante
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: 'Artefacto actualizado exitosamente',
      product: updatedProduct,
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar el artefacto' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canCatalog = (session?.user as any)?.profile?.canCatalog;

    if (!session || (userRole !== 'SUPERADMIN' && !canCatalog)) {
      return NextResponse.json(
        { error: 'Acceso no autorizado: requiere permisos de catálogo o superadmin' },
        { status: 403 }
      );
    }

    const orderItemsCount = await prisma.orderItem.count({
      where: { productId: id },
    });

    // Si tiene pedidos asociados, no eliminamos físicamente para preservar historial contable, sino que pausamos/desactivamos
    if (orderItemsCount > 0) {
      await prisma.product.update({
        where: { id },
        data: { isAvailable: false },
      });
      return NextResponse.json({
        success: true,
        message: 'El artefacto tiene pedidos registrados. Se ha marcado como Oculto / Desactivado para preservar el historial.',
        deactivated: true,
      });
    }

    // Si no tiene pedidos, se puede eliminar físicamente
    await prisma.stockMovement.deleteMany({ where: { productId: id } });
    await prisma.productImage.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Artefacto eliminado permanentemente del catálogo.',
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar artefacto' },
      { status: 500 }
    );
  }
}
