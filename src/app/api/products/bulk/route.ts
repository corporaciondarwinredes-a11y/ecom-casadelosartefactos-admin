import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApplianceCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

const VALID_CATEGORIES: Set<string> = new Set([
  'TELEVISORES',
  'AUDIO',
  'LAVADORAS',
  'REFRIGERADORAS',
  'CONGELADORAS',
  'COCINAS_HORNOS',
  'CLIMATIZACION',
]);

function normalizeCategory(rawCat: string | undefined): ApplianceCategory {
  if (!rawCat) return 'TELEVISORES';
  const clean = rawCat.toString().toUpperCase().trim().replace(/[\s-]+/g, '_');
  if (clean.includes('TELEVISOR') || clean.includes('TV')) return 'TELEVISORES';
  if (clean.includes('AUDIO') || clean.includes('PARLANTE') || clean.includes('SOUNDBAR')) return 'AUDIO';
  if (clean.includes('LAVADORA') || clean.includes('SECADORA')) return 'LAVADORAS';
  if (clean.includes('REFRIGERADOR') || clean.includes('REFRI')) return 'REFRIGERADORAS';
  if (clean.includes('CONGELADOR') || clean.includes('FREEZER')) return 'CONGELADORAS';
  if (clean.includes('COCINA') || clean.includes('HORNO') || clean.includes('MICROONDA')) return 'COCINAS_HORNOS';
  if (clean.includes('CLIMA') || clean.includes('AIRE') || clean.includes('VENTILADOR')) return 'CLIMATIZACION';

  if (VALID_CATEGORIES.has(clean)) {
    return clean as ApplianceCategory;
  }
  return 'TELEVISORES';
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canCatalog = (session?.user as any)?.profile?.canCatalog;

    if (!session || (userRole !== 'SUPERADMIN' && !canCatalog)) {
      return NextResponse.json(
        { error: 'Acceso no autorizado: requiere permisos de catálogo para importación masiva' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { products } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'No se enviaron productos para importar en el lote' },
        { status: 400 }
      );
    }

    if (products.length > 500) {
      return NextResponse.json(
        { error: 'El límite máximo por lote de importación es de 500 artefactos a la vez' },
        { status: 400 }
      );
    }

    const results = await prisma.$transaction(
      async (tx) => {
        let createdCount = 0;
        let updatedCount = 0;
        const processedItems: any[] = [];

        for (let i = 0; i < products.length; i++) {
          const item = products[i];
          const name = (item.name || item.nombre || '').toString().trim();
          const brand = (item.brand || item.marca || '').toString().trim().toUpperCase();
          const sku = (item.sku || item.codigo_sku || item.codigo || '').toString().trim().toUpperCase();
          const rawPrice = item.price ?? item.precio_oferta ?? item.precio ?? 0;
          const price = Number(rawPrice);

          if (!name || !brand || !sku || isNaN(price) || price <= 0) {
            continue; // Saltar filas incompletas
          }

          const modelCode = (item.modelCode || item.codigo_modelo || item.modelo || '').toString().trim() || null;
          const category = normalizeCategory(item.category || item.categoria);

          const rawRetail = item.retailPrice ?? item.precio_regular ?? item.precio_tachado ?? price;
          const retailPrice = Number(rawRetail) || price;

          const rawDiscount = item.discountPrice ?? item.descuento;
          const discountPrice = rawDiscount ? Number(rawDiscount) : null;

          const rawStock = item.stock ?? item.stock_inicial ?? item.cantidad ?? 0;
          const stock = Math.max(0, parseInt(String(rawStock), 10) || 0);

          const warrantyMonths = parseInt(String(item.warrantyMonths || item.garantia_meses || 12), 10) || 12;
          const voltage = (item.voltage || item.voltaje || '220V / 60Hz').toString().trim();
          const dimensions = (item.dimensions || item.dimensiones || '').toString().trim() || null;

          // REGLA CRÍTICA DE EFICIENCIA ENERGÉTICA:
          // Si tiene_eficiencia / hasEnergyRating es 1 o true -> toma la clasificación (ej. A+++, A++, A+, A, B, C, D)
          // Si es 0 o false -> se guarda como NULL (desactivado)
          const rawHasEfficiency = item.hasEnergyRating ?? item.tiene_eficiencia ?? item.activa_eficiencia;
          const isEfficiencyActive =
            rawHasEfficiency === 1 ||
            rawHasEfficiency === '1' ||
            rawHasEfficiency === true ||
            String(rawHasEfficiency).toLowerCase() === 'si' ||
            String(rawHasEfficiency).toLowerCase() === 'true';

          let energyRating: string | null = null;
          if (isEfficiencyActive) {
            const rawRating = (item.energyRating || item.eficiencia_energetica || item.clasificacion_energetica || 'A+').toString().trim().toUpperCase();
            energyRating = rawRating || 'A+';
          }

          const specifications = (item.specifications || item.especificaciones || item.ficha_tecnica || '').toString().trim() || null;
          const description = (item.description || item.descripcion || `${name} marca ${brand}.`).toString().trim();

          // Imagen: si no viene o viene vacía, usa el placeholder oficial
          const rawImg = (item.image || item.imagen_url || item.foto || '').toString().trim();
          const finalImage = rawImg && rawImg.startsWith('http')
            ? rawImg
            : '/placeholder-artefacto.svg';

          const barcode = (item.barcode || item.codigo_barras || '').toString().trim() || null;

          // Verificar si ya existe por SKU
          const existing = await tx.product.findUnique({
            where: { sku },
          });

          if (existing) {
            // Actualizar producto existente
            const updated = await tx.product.update({
              where: { id: existing.id },
              data: {
                name,
                brand,
                modelCode,
                category,
                retailPrice,
                price,
                discountPrice,
                warrantyMonths,
                voltage,
                dimensions,
                energyRating,
                specifications,
                description,
                barcode,
                // Solo actualiza la imagen si el nuevo trae una foto real distinta a placeholder
                ...(rawImg && rawImg.startsWith('http') ? { image: finalImage } : {}),
              },
            });

            // Si se envió nuevo stock y difiere, registrar ajuste en Kardex
            if (stock !== existing.stock) {
              const diff = stock - existing.stock;
              await tx.stockMovement.create({
                data: {
                  productId: existing.id,
                  type: 'INVENTORY_ADJUSTMENT',
                  inQuantity: diff > 0 ? diff : 0,
                  outQuantity: diff < 0 ? Math.abs(diff) : 0,
                  changeQuantity: diff,
                  previousStock: existing.stock,
                  balance: stock,
                  newStock: stock,
                  reference: 'AJUSTE-EXCEL-MASIVO',
                  user: session.user?.email || 'admin@corporaciondarwin.com',
                  note: `Ajuste masivo vía Excel de ${existing.stock} a ${stock} unidades`,
                },
              });

              await tx.product.update({
                where: { id: existing.id },
                data: { stock },
              });
            }

            updatedCount++;
            processedItems.push(updated);
          } else {
            // Crear nuevo producto con slug único
            let baseSlug = slugify(`${brand}-${name}-${sku}`);
            if (!baseSlug) baseSlug = `prod-${Date.now()}-${i}`;
            let uniqueSlug = baseSlug;
            let counter = 1;
            while (await tx.product.findUnique({ where: { slug: uniqueSlug } })) {
              uniqueSlug = `${baseSlug}-${counter}`;
              counter++;
            }

            const created = await tx.product.create({
              data: {
                name,
                brand,
                modelCode,
                category,
                slug: uniqueSlug,
                description,
                specifications,
                warrantyMonths,
                energyRating,
                voltage,
                dimensions,
                retailPrice,
                discountPrice,
                price,
                stock,
                sku,
                barcode,
                image: finalImage,
                isAvailable: true,
                isFeatured: false,
              },
            });

            // Asiento inicial de Kardex si tiene stock
            if (stock > 0) {
              await tx.stockMovement.create({
                data: {
                  productId: created.id,
                  type: 'MANUAL_RESTOCK',
                  inQuantity: stock,
                  outQuantity: 0,
                  changeQuantity: stock,
                  previousStock: 0,
                  balance: stock,
                  newStock: stock,
                  reference: 'IMPORTACION-EXCEL-MASIVA',
                  user: session.user?.email || 'admin@corporaciondarwin.com',
                  note: `Carga inicial masiva en catálogo mediante Excel de ${created.name}`,
                },
              });
            }

            createdCount++;
            processedItems.push(created);
          }
        }

        return { createdCount, updatedCount, totalProcessed: processedItems.length };
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Se procesaron exitosamente ${results.totalProcessed} artefactos (${results.createdCount} creados, ${results.updatedCount} actualizados).`,
      ...results,
    });
  } catch (error: any) {
    console.error('Error in bulk product import:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la importación masiva de artefactos' },
      { status: 500 }
    );
  }
}
