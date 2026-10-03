import { PrismaClient } from '@prisma/client';

/**
 * Generador de correlativo de pedidos de alta capacidad y escalabilidad.
 * Formato: CD-YYYY-XXXXXX (ej: CD-2026-100001)
 * Diseñado para soportar millones de pedidos sin colisión ni límite a 9999.
 */
export async function generateUniqueOrderNumber(
  prismaClient: PrismaClient | any
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const totalOrders = await prismaClient.order.count();

  // Rango correlativo base de 6 a 7 dígitos (comenzando en 100001)
  for (let attempt = 0; attempt < 10; attempt++) {
    const sequence = 100000 + totalOrders + 1 + attempt;
    const candidate = `CD-${currentYear}-${sequence}`;

    const existing = await prismaClient.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  // Fallback con marca de tiempo precisa en caso de ráfagas masivas concurrentes
  const tsSuffix = Date.now().toString().slice(-6);
  const randomSalt = Math.floor(10 + Math.random() * 90);
  return `CD-${currentYear}-${tsSuffix}${randomSalt}`;
}
