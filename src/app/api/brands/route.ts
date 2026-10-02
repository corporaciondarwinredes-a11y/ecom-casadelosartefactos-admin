import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const brands = await prisma.brand.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Error al consultar marcas registradas' },
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
        { error: 'Acceso no autorizado: requiere permisos de catálogo o superadmin' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, logo, description, category, order, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre de la marca es obligatorio' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const existing = await prisma.brand.findFirst({
      where: {
        OR: [{ name: { equals: trimmedName, mode: 'insensitive' } }, { slug }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe una marca registrada con el nombre "${trimmedName}"` },
        { status: 400 }
      );
    }

    const newBrand = await prisma.brand.create({
      data: {
        name: trimmedName,
        slug,
        logo: logo || null,
        description: description?.trim() || null,
        category: category || null,
        order: Number(order) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json(newBrand, { status: 201 });
  } catch (error: any) {
    console.error('Error creating brand:', error);
    return NextResponse.json(
      { error: error.message || 'Error al registrar la marca' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canCatalog = (session?.user as any)?.profile?.canCatalog;

    if (!session || (userRole !== 'SUPERADMIN' && !canCatalog)) {
      return NextResponse.json(
        { error: 'Acceso no autorizado: requiere permisos de catálogo o superadmin' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, logo, description, category, order, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la marca es requerido' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name && name.trim()) {
      updateData.name = name.trim();
      updateData.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    if (logo !== undefined) updateData.logo = logo || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category || null;
    if (order !== undefined) updateData.order = Number(order) || 0;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.brand.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating brand:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar la marca' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canCatalog = (session?.user as any)?.profile?.canCatalog;

    if (!session || (userRole !== 'SUPERADMIN' && !canCatalog)) {
      return NextResponse.json(
        { error: 'Acceso no autorizado: requiere permisos de catálogo o superadmin' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de marca requerido para eliminar' },
        { status: 400 }
      );
    }

    await prisma.brand.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Marca eliminada del registro oficial' });
  } catch (error: any) {
    console.error('Error deleting brand:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar marca' },
      { status: 500 }
    );
  }
}
