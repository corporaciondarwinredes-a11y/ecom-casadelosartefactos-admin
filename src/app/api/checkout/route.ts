import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { orderBroadcaster } from '@/lib/orderBroadcaster';
import { generateUniqueOrderNumber } from '@/lib/orderUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerDocType = 'DNI',
      customerDocNumber,
      customerFiscalName,
      shippingAddress,
      shippingCity = 'Lima',
      shippingDistrict,
      shippingReference,
      paymentMethod = 'TRANSFERENCIA',
      customerNotes,
      paymentReceiptUrl,
      deliveryType = 'DELIVERY',
      items,
    } = body;

    const isPickup = deliveryType === 'STORE_PICKUP';
    const effectiveAddress = isPickup
      ? (shippingAddress || 'Recojo en Tienda / Bodega Central (Av. Los Faisanes 120, Lima)')
      : shippingAddress;

    // Validación básica de campos obligatorios
    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !customerDocNumber ||
      (!isPickup && !effectiveAddress) ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: 'Por favor complete todos los datos de contacto y entrega obligatorios.' },
        { status: 400 }
      );
    }

    // 1. Obtener productos de PostgreSQL y verificar precios y disponibilidad de stock real
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (dbProducts.length !== items.length) {
      return NextResponse.json(
        { error: 'Uno o más artefactos seleccionados ya no se encuentran en catálogo.' },
        { status: 400 }
      );
    }

    let calculatedTotal = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const dbProd = dbProducts.find((p) => p.id === item.productId);
      if (!dbProd) {
        return NextResponse.json(
          { error: `Producto con ID ${item.productId} no encontrado.` },
          { status: 400 }
        );
      }

      if (dbProd.stock < item.quantity) {
        return NextResponse.json(
          {
            error: `Stock insuficiente para ${dbProd.name}. Existencias disponibles en bodega: ${dbProd.stock}`,
          },
          { status: 400 }
        );
      }

      const itemSubtotal = dbProd.price * item.quantity;
      calculatedTotal += itemSubtotal;

      validatedItems.push({
        productId: dbProd.id,
        productName: dbProd.name,
        productBrand: dbProd.brand,
        productSku: dbProd.sku,
        productCategory: dbProd.category,
        warrantyMonths: dbProd.warrantyMonths,
        unitPrice: dbProd.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        productImage: dbProd.image,
      });
    }

    // 2. Generar correlativo de pedido de alta capacidad sin límite a 9999
    const orderNumber = await generateUniqueOrderNumber(prisma);

    const session = await getServerSession(authOptions);
    const creatorUserId = (session?.user as any)?.id || null;
    const creatorUserName = session?.user?.name || null;
    const creatorUserPhone = (session?.user as any)?.phone || null;

    // 3. Crear Orden en PostgreSQL
    // REGLA CRÍTICA DE NEGOCIO: stockDeducted: false (El stock solo se descuenta tras validar pago)
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        customerEmail: customerEmail.toLowerCase().trim(),
        customerPhone,
        customerDocType,
        customerDocNumber,
        customerFiscalName: customerFiscalName || null,
        shippingAddress: effectiveAddress,
        shippingCity,
        shippingDistrict: shippingDistrict || null,
        shippingReference: shippingReference || null,
        shippingCost: 0,
        totalAmount: calculatedTotal,
        currency: 'PEN',
        status: 'PENDING',
        paymentStatus: paymentReceiptUrl ? 'PENDING_VALIDATION' : 'UNPAID',
        paymentMethod,
        paymentReceiptUrl: paymentReceiptUrl || null,
        deliveryType: deliveryType || 'DELIVERY',
        customerNotes: customerNotes || null,
        assignedAdvisorId: creatorUserId || body.assignedAdvisorId || null,
        assignedAdvisorName: creatorUserName || body.assignedAdvisorName || null,
        assignedAdvisorPhone: creatorUserPhone || body.assignedAdvisorPhone || null,
        userId: creatorUserId,
        stockDeducted: false, // NO se descuenta stock prematuramente
        erpExported: false,
        items: {
          create: validatedItems,
        },
      },
      include: {
        items: true,
      },
    });

    // 3.1 Emitir evento en tiempo real para alertar a asesoras y administradores
    try {
      orderBroadcaster.emit('new_order', {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone,
        totalAmount: newOrder.totalAmount,
        assignedAdvisorId: newOrder.assignedAdvisorId,
        assignedAdvisorName: newOrder.assignedAdvisorName,
        assignedAdvisorPhone: newOrder.assignedAdvisorPhone,
        deliveryType: newOrder.deliveryType || 'DELIVERY',
        paymentStatus: newOrder.paymentStatus,
        paymentMethod: newOrder.paymentMethod,
        hasVoucher: Boolean(newOrder.paymentReceiptUrl),
        paymentReceiptUrl: newOrder.paymentReceiptUrl,
        shippingCity: newOrder.shippingCity,
        shippingDistrict: newOrder.shippingDistrict,
        createdAt: newOrder.createdAt.toISOString(),
      });
    } catch (broadcastErr) {
      console.error('Error emitiendo evento de nueva orden:', broadcastErr);
    }

    // 4. Formatear mensaje oficial para WhatsApp Concierge
    const itemsText = validatedItems
      .map((it) => `• ${it.quantity}x ${it.productBrand} ${it.productName} (S/ ${it.subtotal.toFixed(2)})`)
      .join('\n');

    const whatsappMessage = `*SOLICITUD DE PEDIDO - LA CASA DE LOS ARTEFACTOS* 🏠
*CORPORACIÓN DARWIN*

Hola, deseo coordinar la entrega y adjuntar el voucher de pago de mi pedido recién generado:

📋 *N° de Pedido:* ${newOrder.orderNumber}
👤 *Cliente:* ${newOrder.customerName}
📄 *Documento:* ${newOrder.customerDocType} ${newOrder.customerDocNumber}
📍 *Despacho:* ${newOrder.shippingAddress}${newOrder.shippingDistrict ? `, ${newOrder.shippingDistrict}` : ''} (${newOrder.shippingCity})
💳 *Método Elegido:* ${newOrder.paymentMethod}
💰 *Total a Pagar:* S/ ${newOrder.totalAmount.toFixed(2)}

📦 *Artefactos:*
${itemsText}

Quedo atento(a) a la confirmación de recepción para el despacho. ¡Muchas gracias!`;

    const whatsappUrl = `https://wa.me/51989438130?text=${encodeURIComponent(whatsappMessage)}`;

    return NextResponse.json({
      success: true,
      order: newOrder,
      whatsappUrl,
    });
  } catch (error: any) {
    console.error('Error in checkout:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la orden de compra' },
      { status: 500 }
    );
  }
}
