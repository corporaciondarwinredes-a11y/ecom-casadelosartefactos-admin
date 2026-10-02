import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    let announcement = await prisma.announcementBar.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!announcement) {
      announcement = await prisma.announcementBar.create({
        data: {
          message: '¡Día del Shopping! Descuentos de hasta 40% en Línea Blanca, Smart TVs y Despacho Especializado',
          highlightText: 'CAMPAÑA DEL MES',
          linkText: 'Ver Ofertas →',
          linkUrl: '/?category=REFRIGERACION#catalogo',
          badgeText: 'GARANTÍA OFICIAL DARWIN',
          isActive: true,
        },
      });
    }

    return NextResponse.json({ success: true, announcement });
  } catch (error: any) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await req.json();
    const existing = await prisma.announcementBar.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    let announcement;
    if (existing) {
      announcement = await prisma.announcementBar.update({
        where: { id: existing.id },
        data: {
          message: data.message ?? existing.message,
          highlightText: data.highlightText ?? existing.highlightText,
          linkText: data.linkText ?? existing.linkText,
          linkUrl: data.linkUrl ?? existing.linkUrl,
          badgeText: data.badgeText ?? existing.badgeText,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
        },
      });
    } else {
      announcement = await prisma.announcementBar.create({
        data: {
          message: data.message || 'Campaña especial de artefactos',
          highlightText: data.highlightText || 'DESCUENTO',
          linkText: data.linkText || 'Ver más',
          linkUrl: data.linkUrl || '/',
          badgeText: data.badgeText || 'GARANTÍA OFICIAL',
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        },
      });
    }

    return NextResponse.json({ success: true, announcement });
  } catch (error: any) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
