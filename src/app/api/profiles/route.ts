import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const profiles = await prisma.profile.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(profiles);
  } catch (error: any) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json({ error: 'Error al obtener perfiles RBAC' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Solo el SUPERADMIN puede configurar perfiles RBAC' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, canCatalog, canOrders, canValidatePayments, canKardex, canUsers, canErpExport } = body;

    if (!name) {
      return NextResponse.json({ error: 'El nombre del perfil es obligatorio' }, { status: 400 });
    }

    const profile = await prisma.profile.create({
      data: {
        name,
        description: description || null,
        canCatalog: Boolean(canCatalog),
        canOrders: Boolean(canOrders),
        canValidatePayments: Boolean(canValidatePayments),
        canKardex: Boolean(canKardex),
        canUsers: Boolean(canUsers),
        canErpExport: Boolean(canErpExport),
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error: any) {
    console.error('Error creating profile:', error);
    return NextResponse.json({ error: error.message || 'Error al crear perfil' }, { status: 500 });
  }
}
