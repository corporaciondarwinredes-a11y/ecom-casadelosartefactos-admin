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
    const canErpExport = (session.user as any).profile?.canErpExport;

    if (userRole !== 'SUPERADMIN' && !canErpExport) {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requiere permiso para exportar a ERP / Facturación' },
        { status: 403 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Calcular valores tributarios estándar peruanos (IGV 18%)
    const totalAmount = order.totalAmount;
    const netSubtotal = parseFloat((totalAmount / 1.18).toFixed(2));
    const igvAmount = parseFloat((totalAmount - netSubtotal).toFixed(2));

    const documentType = order.customerDocType === 'RUC' ? '01' : '03'; // 01 Factura, 03 Boleta

    const erpPayload = {
      invoicingStandard: '2.1-UBL-SUNAT',
      originSystem: 'LA_CASA_DE_LOS_ARTEFACTOS_NEXTJS',
      company: {
        legalName: 'CORPORACIÓN DARWIN S.A.C.',
        taxId: '20608943813',
        commercialBrand: 'LA CASA DE LOS ARTEFACTOS',
        fiscalAddress: 'Lima, Perú',
      },
      documentReference: {
        documentTypeCode: documentType,
        documentTypeName: documentType === '01' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA',
        systemOrderNumber: order.orderNumber,
        transactionTimestamp: order.createdAt.toISOString(),
      },
      customer: {
        documentType: order.customerDocType === 'RUC' ? '6' : '1', // 6=RUC, 1=DNI
        documentNumber: order.customerDocNumber,
        legalName: order.customerFiscalName || order.customerName,
        contactName: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        deliveryAddress: `${order.shippingAddress}${order.shippingDistrict ? `, ${order.shippingDistrict}` : ''}, ${order.shippingCity}`,
      },
      payment: {
        method: order.paymentMethod,
        currency: order.currency,
        status: order.paymentStatus,
        paymentReference: order.paymentReference || 'NO_REGISTRADO',
        validatedBy: order.paymentValidatedBy,
      },
      financialTotals: {
        currency: order.currency,
        netTaxableAmount: netSubtotal,
        igvTaxAmount: igvAmount,
        taxPercentage: 18.0,
        shippingFee: order.shippingCost,
        grandTotal: totalAmount,
      },
      lineItems: order.items.map((item, index) => {
        const itemNetPrice = parseFloat((item.unitPrice / 1.18).toFixed(2));
        const itemLineNet = parseFloat((item.subtotal / 1.18).toFixed(2));
        const itemIgv = parseFloat((item.subtotal - itemLineNet).toFixed(2));

        return {
          lineNumber: index + 1,
          sku: item.productSku,
          description: `${item.productBrand} ${item.productName}`,
          category: item.productCategory,
          warrantyMonths: item.warrantyMonths,
          quantity: item.quantity,
          unitCode: 'NIU',
          unitPriceWithTax: item.unitPrice,
          unitPriceNet: itemNetPrice,
          lineNetTotal: itemLineNet,
          lineIgvTotal: itemIgv,
          lineGrandTotal: item.subtotal,
        };
      }),
      inventoryHandling: {
        stockAlreadyDeductedByEcommerce: order.stockDeducted,
        note: 'El inventario ya fue descontado atómicamente en el Kardex local de Corporación Darwin tras validación de pago.',
      },
    };

    // Marcar orden como exportada a ERP
    await prisma.order.update({
      where: { id: order.id },
      data: { erpExported: true },
    });

    return NextResponse.json({
      success: true,
      filename: `ERP_FACTURACION_${order.orderNumber}.json`,
      payload: erpPayload,
    });
  } catch (error: any) {
    console.error('Error exporting order to ERP:', error);
    return NextResponse.json({ error: error.message || 'Error al exportar a ERP' }, { status: 500 });
  }
}
