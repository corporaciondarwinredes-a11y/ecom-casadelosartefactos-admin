import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');

    const where: any = { isAvailable: true };

    if (category) {
      where.category = category;
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { modelCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: { images: true },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Error al obtener catálogo de artefactos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canCatalog = (session?.user as any)?.profile?.canCatalog;

    if (!session || (userRole !== 'SUPERADMIN' && !canCatalog)) {
      return NextResponse.json(
        { error: 'Acceso no autorizado: requiere permisos de catálogo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      brand,
      modelCode,
      category,
      slug,
      description,
      specifications,
      warrantyMonths,
      energyRating,
      voltage,
      dimensions,
      weightKg,
      retailPrice,
      discountPrice,
      price,
      stock,
      sku,
      barcode,
      image,
      images,
      isFeatured,
    } = body;

    const allImages: string[] = Array.isArray(images) && images.length > 0
      ? images
      : (image ? [image] : []);
    const mainImage = image || (allImages.length > 0 ? allImages[0] : '');

    if (!name || !brand || !slug || !price || !sku || !mainImage) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios para el artefacto (Nombre, Marca, SKU, Precio e Imagen principal)' },
        { status: 400 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        brand,
        modelCode: modelCode || null,
        category: category || 'TELEVISORES',
        slug,
        description: description || '',
        specifications: specifications || null,
        warrantyMonths: Number(warrantyMonths) || 12,
        energyRating: energyRating || 'A+',
        voltage: voltage || '220V / 60Hz',
        dimensions: dimensions || null,
        weightKg: weightKg ? Number(weightKg) : null,
        retailPrice: Number(retailPrice) || Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        price: Number(price),
        stock: Number(stock) || 0,
        sku,
        barcode: barcode || null,
        image: mainImage,
        isFeatured: Boolean(isFeatured),
        images: allImages.length > 0 ? {
          create: allImages.map((imgUrl: string, idx: number) => ({
            url: imgUrl,
            isPrimary: idx === 0,
            order: idx,
          })),
        } : undefined,
      },
      include: {
        images: true,
      },
    });

    // Registrar asiento inicial en Kardex
    if (newProduct.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: newProduct.id,
          type: 'MANUAL_RESTOCK',
          inQuantity: newProduct.stock,
          outQuantity: 0,
          changeQuantity: newProduct.stock,
          previousStock: 0,
          balance: newProduct.stock,
          newStock: newProduct.stock,
          reference: 'ALTA-CATALOGO-ADMIN',
          user: session.user?.email || 'admin@corporaciondarwin.com',
          note: `Alta inicial en catálogo del artefacto ${newProduct.name}`,
        },
      });
    }

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error.message || 'Error al registrar artefacto' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canCatalog = (session?.user as any)?.profile?.canCatalog;

    if (!session || (userRole !== 'SUPERADMIN' && !canCatalog)) {
      return NextResponse.json(
        { error: 'Acceso no autorizado: requiere permisos de catálogo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, isAvailable, price, isFeatured } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }

    const updateData: any = {};
    if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);
    if (price !== undefined) updateData.price = Number(price);
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Auditoría
    try {
      await prisma.adminAuditLog.create({
        data: {
          userId: (session.user as any).id,
          action: 'UPDATE_PRODUCT_AVAILABILITY',
          resource: `Product:${id}`,
          details: `El usuario ${session.user?.email} cambió el estado de disponibilidad de '${updated.name}' a: ${updated.isAvailable ? 'ACTIVO / VISIBLE' : 'DESACTIVADO / OCULTO'}`,
        },
      });
    } catch (auditErr) {
      // no bloquea
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error('Error updating product availability:', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar producto' }, { status: 500 });
  }
}
