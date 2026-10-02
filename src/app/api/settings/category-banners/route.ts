import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const banners = await prisma.categoryBanner.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(banners);
  } catch (error: any) {
    console.error('Error fetching category banners:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canCatalog = (session?.user as any)?.profile?.canCatalog;

    if (!session || (userRole !== 'SUPERADMIN' && !canCatalog)) {
      return NextResponse.json(
        { error: 'Acceso denegado: requiere privilegios de administración o catálogo' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, category, name, subtitle, tag, imageUrl, isActive } = body;

    if (!id && !category) {
      return NextResponse.json(
        { error: 'Se requiere ID o categoría del banner' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (subtitle !== undefined) updateData.subtitle = subtitle.trim();
    if (tag !== undefined) updateData.tag = tag.trim();
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.categoryBanner.upsert({
      where: id ? { id } : { category },
      update: updateData,
      create: {
        category: category || 'TELEVISORES',
        name: name || 'Categoría',
        subtitle: subtitle || null,
        tag: tag || 'Precios Exclusivos',
        imageUrl: imageUrl || '',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, banner: updated });
  } catch (error: any) {
    console.error('Error updating category banner:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
