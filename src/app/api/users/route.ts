import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canUsers = (session?.user as any)?.profile?.canUsers;

    if (!session || (userRole !== 'SUPERADMIN' && !canUsers)) {
      return NextResponse.json(
        { error: 'Acceso no autorizado: requiere permisos de gestión de usuarios' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        documentType: true,
        documentNumber: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            name: true,
            description: true,
            canCatalog: true,
            canOrders: true,
            canValidatePayments: true,
            canKardex: true,
            canUsers: true,
            canErpExport: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Error al consultar operadores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canUsers = (session?.user as any)?.profile?.canUsers;

    if (!session || (userRole !== 'SUPERADMIN' && !canUsers)) {
      return NextResponse.json(
        { error: 'Acceso denegado: solo el SUPERADMIN puede registrar nuevos operadores' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, role, profileId, phone, documentNumber } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nombre, correo y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validar si ya existe el usuario
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este correo electrónico' },
        { status: 409 }
      );
    }

    // Encriptar contraseña con bcryptjs (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone || null,
        documentType: 'DNI',
        documentNumber: documentNumber || null,
        role: role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN',
        profileId: profileId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        profile: true,
      },
    });

    // Sincronizar automáticamente canal de atención / WhatsApp de asesor si tiene teléfono
    if (phone && (role === 'SELLER' || newUser.profile?.name?.includes('Asesor') || newUser.profile?.name?.includes('Venta') || body.syncSupportChannel)) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const existingChannel = await prisma.supportChannel.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { name: { equals: name.trim(), mode: 'insensitive' } },
          ],
        },
      });

      if (!existingChannel) {
        await prisma.supportChannel.create({
          data: {
            name: name.trim(),
            phone: cleanPhone,
            formattedPhone: `+51 ${cleanPhone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`,
            roleTitle: newUser.profile?.name || 'Asesor Comercial Oficial',
            schedule: 'Lunes a Sábado: 8:00 AM - 8:00 PM',
            startHour: 8,
            endHour: 20,
            autoSchedule: true,
            isActive: true,
          },
        });
      } else {
        await prisma.supportChannel.update({
          where: { id: existingChannel.id },
          data: {
            name: name.trim(),
            phone: cleanPhone,
            isActive: true,
          },
        });
      }
    }

    // Registrar en auditoría
    await prisma.adminAuditLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'CREATE_ADMIN_USER',
        resource: `User:${newUser.id}`,
        details: `Superadmin ${session.user?.email} registró al operador ${newUser.email} (${newUser.name}) con teléfono ${phone || 'N/A'}`,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { error: error.message || 'Error al registrar nuevo operador' },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar operador, asignar número de asesor o cambiar contraseña
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canUsers = (session?.user as any)?.profile?.canUsers;

    if (!session || (userRole !== 'SUPERADMIN' && !canUsers)) {
      return NextResponse.json(
        { error: 'Acceso denegado: solo el SUPERADMIN puede modificar operadores' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, email, password, role, profileId, phone, documentNumber, syncSupportChannel } = body;

    if (!id) {
      return NextResponse.json({ error: 'El ID del usuario es obligatorio' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (role) updateData.role = role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN';
    if (profileId !== undefined) updateData.profileId = profileId || null;
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (documentNumber !== undefined) updateData.documentNumber = documentNumber ? documentNumber.trim() : null;

    // Si se envía contraseña, hashearla con bcryptjs
    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profileId: true,
        profile: true,
        updatedAt: true,
      },
    });

    // Sincronizar o actualizar canal de WhatsApp del asesor
    const activePhone = updatedUser.phone;
    if (activePhone && (syncSupportChannel || updatedUser.profile?.name?.includes('Asesor') || updatedUser.profile?.name?.includes('Venta'))) {
      const cleanPhone = activePhone.replace(/[^0-9]/g, '');
      const existingChannel = await prisma.supportChannel.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { name: { contains: updatedUser.name || '', mode: 'insensitive' } },
          ],
        },
      });

      if (existingChannel) {
        await prisma.supportChannel.update({
          where: { id: existingChannel.id },
          data: {
            name: `${updatedUser.name} - Asesoría Oficial`,
            phone: cleanPhone,
            formattedPhone: `+51 ${cleanPhone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`,
            roleTitle: updatedUser.profile?.name || 'Asesor Especialista en Artefactos',
            isActive: true,
          },
        });
      } else {
        await prisma.supportChannel.create({
          data: {
            name: `${updatedUser.name} - Asesoría Oficial`,
            phone: cleanPhone,
            formattedPhone: `+51 ${cleanPhone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`,
            roleTitle: updatedUser.profile?.name || 'Asesor Comercial Oficial',
            schedule: 'Lunes a Sábado: 8:00 AM - 8:00 PM',
            startHour: 8,
            endHour: 20,
            autoSchedule: true,
            isActive: true,
          },
        });
      }
    }

    // Auditoría
    await prisma.adminAuditLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'UPDATE_ADMIN_USER',
        resource: `User:${updatedUser.id}`,
        details: `Superadmin ${session.user?.email} actualizó al operador ${updatedUser.email} (${password ? 'Contraseña cambiada' : 'Sin cambio de clave'}) Teléfono: ${updatedUser.phone || 'N/A'}`,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar usuario' }, { status: 500 });
  }
}

// DELETE: Eliminar operador administrativo
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const canUsers = (session?.user as any)?.profile?.canUsers;

    if (!session || (userRole !== 'SUPERADMIN' && !canUsers)) {
      return NextResponse.json(
        { error: 'Acceso denegado: solo el SUPERADMIN puede eliminar operadores' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'El ID del usuario es obligatorio' }, { status: 400 });
    }

    if (id === (session.user as any).id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta en sesión' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (targetUser.email === 'superadmin@corporaciondarwin.com') {
      return NextResponse.json({ error: 'No se puede eliminar la cuenta principal del sistema' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.adminAuditLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'DELETE_ADMIN_USER',
        resource: `User:${id}`,
        details: `Superadmin ${session.user?.email} eliminó al operador ${targetUser.email} (${targetUser.name})`,
      },
    });

    return NextResponse.json({ success: true, message: 'Operador eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting admin user:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar usuario' }, { status: 500 });
  }
}
