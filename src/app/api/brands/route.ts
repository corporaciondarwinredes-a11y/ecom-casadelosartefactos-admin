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
      // Si ya existía, actualizarla para evitar bloqueos y devolver 200
      const updated = await prisma.brand.update({
        where: { id: existing.id },
        data: {
          name: trimmedName,
          slug,
          logo: logo !== undefined ? (logo || null) : existing.logo,
          description: description !== undefined ? (description?.trim() || null) : existing.description,
          category: category !== undefined ? (category || null) : existing.category,
          order: order !== undefined ? (Number(order) || 0) : existing.order,
          isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        },
      });
      return NextResponse.json(updated, { status: 200 });
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

    if (!id && !name) {
      return NextResponse.json(
        { error: 'ID o Nombre de la marca es requerido' },
        { status: 400 }
      );
    }

    const trimmedName = name ? name.trim() : '';
    const slug = trimmedName
      ? trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : '';

    // 1. Buscar la marca existente por ID, slug o nombre
    let targetBrand: any = null;

    if (id) {
      targetBrand = await prisma.brand.findUnique({
        where: { id },
      });

      if (!targetBrand) {
        // Intentar buscar si id fue enviado como slug
        targetBrand = await prisma.brand.findUnique({
          where: { slug: String(id).toLowerCase() },
        });
      }
    }

    if (!targetBrand && trimmedName) {
      targetBrand = await prisma.brand.findFirst({
        where: {
          OR: [
            { name: { equals: trimmedName, mode: 'insensitive' } },
            { slug },
          ],
        },
      });
    }

    // 2. Si no existe ningún registro previo:
    // Si tenemos nombre, hacer UPSERT (crear en BD) para que nunca falle la interfaz
    if (!targetBrand) {
      if (trimmedName) {
        const created = await prisma.brand.create({
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
        return NextResponse.json(created);
      }

      return NextResponse.json(
        { error: 'La marca que intentas actualizar no existe en el sistema oficial.' },
        { status: 404 }
      );
    }

    // 3. Preparar los datos a actualizar
    const updateData: any = {};
    if (trimmedName) {
      updateData.name = trimmedName;
      updateData.slug = slug;
    }
    if (logo !== undefined) updateData.logo = logo || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category || null;
    if (order !== undefined) updateData.order = Number(order) || 0;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.brand.update({
      where: { id: targetBrand.id },
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

    const existing = await prisma.brand.findFirst({
      where: {
        OR: [
          { id },
          { slug: id.toLowerCase() },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ success: true, message: 'La marca ya no existía en el registro oficial' });
    }

    await prisma.brand.delete({
      where: { id: existing.id },
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
