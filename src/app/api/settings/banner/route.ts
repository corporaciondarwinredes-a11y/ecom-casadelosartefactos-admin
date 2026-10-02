import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Devuelve todos los banners configurados para el carrusel
export async function GET() {
  try {
    let banners = await prisma.siteBanner.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    // Si no hay ninguno, inicializamos 3 banners promocionales predeterminados
    if (banners.length === 0) {
      const defaultBanners = [
        {
          title: 'Línea Blanca & Refrigeración Inverter',
          subtitle: 'Refrigeradoras French Door y Centros de Lavado con entrega inmediata',
          badgeText: 'CAMPAÑA OFICIAL',
          imageUrl:
            'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1600&auto=format&fit=crop&q=80',
          ctaText: 'Ver Refrigeradoras',
          ctaLink: '/catalogo?category=REFRIGERADORAS',
          isActive: true,
        },
        {
          title: 'Smart TVs Neo QLED & OLED 4K',
          subtitle: 'Lleva el cine a tu sala con pantallas de alta definición y barras de sonido',
          badgeText: 'TECNOLOGÍA',
          imageUrl:
            'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1600&auto=format&fit=crop&q=80',
          ctaText: 'Explorar Televisores',
          ctaLink: '/catalogo?category=TELEVISORES',
          isActive: true,
        },
        {
          title: 'Cocinas Pro & Hornos Empotrables',
          subtitle: 'Equipa tu hogar con quemadores de alta potencia y hornos con grill eléctrico',
          badgeText: 'ALTA GAMA',
          imageUrl:
            'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1600&auto=format&fit=crop&q=80',
          ctaText: 'Ver Cocinas y Hornos',
          ctaLink: '/catalogo?category=COCINAS_HORNOS',
          isActive: true,
        },
      ];

      for (const b of defaultBanners) {
        await prisma.siteBanner.create({ data: b });
      }

      banners = await prisma.siteBanner.findMany({
        orderBy: { updatedAt: 'desc' },
      });
    }

    return NextResponse.json({ success: true, banners, banner: banners[0] });
  } catch (error: any) {
    console.error('Error fetching banners:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Crear un nuevo slide de banner para el carrusel
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await req.json();
    if (!data.imageUrl || !data.title) {
      return NextResponse.json(
        { error: 'El título y la URL de la imagen son obligatorios' },
        { status: 400 }
      );
    }

    const newBanner = await prisma.siteBanner.create({
      data: {
        title: data.title,
        subtitle: data.subtitle || '',
        badgeText: data.badgeText || 'OFERTA DESTACADA',
        imageUrl: data.imageUrl,
        ctaText: data.ctaText || 'Ver Promoción',
        ctaLink: data.ctaLink || '#catalogo',
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      },
    });

    return NextResponse.json({ success: true, banner: newBanner });
  } catch (error: any) {
    console.error('Error creating banner:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Actualizar un banner existente
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await req.json();
    const id = data.id;

    if (!id) {
      // Si no viene id, actualizamos el primer banner
      const first = await prisma.siteBanner.findFirst({ orderBy: { updatedAt: 'desc' } });
      if (!first) {
        return NextResponse.json({ error: 'Banner no encontrado' }, { status: 404 });
      }
      const updated = await prisma.siteBanner.update({
        where: { id: first.id },
        data: {
          title: data.title ?? first.title,
          subtitle: data.subtitle ?? first.subtitle,
          badgeText: data.badgeText ?? first.badgeText,
          imageUrl: data.imageUrl ?? first.imageUrl,
          ctaText: data.ctaText ?? first.ctaText,
          ctaLink: data.ctaLink ?? first.ctaLink,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : first.isActive,
        },
      });
      return NextResponse.json({ success: true, banner: updated });
    }

    const updated = await prisma.siteBanner.update({
      where: { id },
      data: {
        title: data.title,
        subtitle: data.subtitle,
        badgeText: data.badgeText,
        imageUrl: data.imageUrl,
        ctaText: data.ctaText,
        ctaLink: data.ctaLink,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
      },
    });

    return NextResponse.json({ success: true, banner: updated });
  } catch (error: any) {
    console.error('Error updating banner:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar un slide del carrusel
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de banner no proporcionado' }, { status: 400 });
    }

    await prisma.siteBanner.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Banner eliminado' });
  } catch (error: any) {
    console.error('Error deleting banner:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
