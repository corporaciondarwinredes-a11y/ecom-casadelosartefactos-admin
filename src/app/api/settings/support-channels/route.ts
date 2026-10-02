import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const channels = await prisma.supportChannel.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json({ success: true, channels });
  } catch (error: any) {
    console.error('Error fetching support channels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await req.json();

    if (!data.name || !data.phone) {
      return NextResponse.json(
        { error: 'El nombre y número de teléfono son obligatorios' },
        { status: 400 }
      );
    }

    const channel = await prisma.supportChannel.create({
      data: {
        name: data.name,
        phone: data.phone.replace(/\D/g, ''),
        formattedPhone: data.formattedPhone || data.phone,
        roleTitle: data.roleTitle || 'Atención al Cliente',
        schedule: data.schedule || 'Lunes a Sábado: 8:00 AM - 8:00 PM',
        startHour: data.startHour !== undefined ? parseInt(data.startHour) : 8,
        endHour: data.endHour !== undefined ? parseInt(data.endHour) : 20,
        autoSchedule: data.autoSchedule !== undefined ? Boolean(data.autoSchedule) : true,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        order: data.order !== undefined ? parseInt(data.order) : 0,
      },
    });

    return NextResponse.json({ success: true, channel });
  } catch (error: any) {
    console.error('Error creating support channel:', error);
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
    if (!data.id) {
      return NextResponse.json({ error: 'ID de canal requerido' }, { status: 400 });
    }

    const channel = await prisma.supportChannel.update({
      where: { id: data.id },
      data: {
        name: data.name,
        phone: data.phone ? data.phone.replace(/\D/g, '') : undefined,
        formattedPhone: data.formattedPhone,
        roleTitle: data.roleTitle,
        schedule: data.schedule,
        startHour: data.startHour !== undefined ? parseInt(data.startHour) : undefined,
        endHour: data.endHour !== undefined ? parseInt(data.endHour) : undefined,
        autoSchedule: data.autoSchedule !== undefined ? Boolean(data.autoSchedule) : undefined,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
      },
    });

    return NextResponse.json({ success: true, channel });
  } catch (error: any) {
    console.error('Error updating support channel:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de canal requerido' }, { status: 400 });
    }

    await prisma.supportChannel.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting support channel:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
