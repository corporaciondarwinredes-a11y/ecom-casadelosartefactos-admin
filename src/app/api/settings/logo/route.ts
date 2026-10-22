import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const announcement = await prisma.announcementBar.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { logoUrl: true },
    });

    return NextResponse.json({
      success: true,
      logoUrl: announcement?.logoUrl || null,
    });
  } catch (error: any) {
    console.error('Error fetching site logo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { logoUrl } = await req.json();

    const existing = await prisma.announcementBar.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    let announcement;
    if (existing) {
      announcement = await prisma.announcementBar.update({
        where: { id: existing.id },
        data: {
          logoUrl: logoUrl !== undefined ? logoUrl : null,
        },
      });
    } else {
      announcement = await prisma.announcementBar.create({
        data: {
          message: '¡Día del Shopping! Descuentos de hasta 40% en Línea Blanca y Smart TVs',
          highlightText: 'CAMPAÑA DEL MES',
          linkText: 'Ver Ofertas →',
          linkUrl: '/?category=REFRIGERACION#catalogo',
          badgeText: 'GARANTÍA OFICIAL DARWIN',
          isActive: true,
          logoUrl: logoUrl !== undefined ? logoUrl : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      logoUrl: announcement.logoUrl,
    });
  } catch (error: any) {
    console.error('Error updating site logo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
