import { prisma } from '../src/lib/prisma.ts';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('--- RECONFIGURANDO PERFILES Y USUARIOS RBAC ---');
  const salt = await bcrypt.genSalt(10);

  // 1. Perfiles RBAC
  const profileSuperadmin = await prisma.profile.upsert({
    where: { name: 'Superadmin' },
    update: {
      canCatalog: true,
      canOrders: true,
      canValidatePayments: true,
      canKardex: true,
      canUsers: true,
      canErpExport: true,
    },
    create: {
      name: 'Superadmin',
      description: 'Acceso total ejecutivo a todos los módulos de Corporación Darwin',
      canCatalog: true,
      canOrders: true,
      canValidatePayments: true,
      canKardex: true,
      canUsers: true,
      canErpExport: true,
    },
  });

  const profileAlmacen = await prisma.profile.upsert({
    where: { name: 'Jefe de Almacén' },
    update: {
      canCatalog: true,
      canOrders: false,
      canValidatePayments: false,
      canKardex: true,
      canUsers: false,
      canErpExport: false,
    },
    create: {
      name: 'Jefe de Almacén',
      description: 'Gestión física del catálogo de artefactos y calibración de Kardex',
      canCatalog: true,
      canOrders: false,
      canValidatePayments: false,
      canKardex: true,
      canUsers: false,
      canErpExport: false,
    },
  });

  const profileTesoreria = await prisma.profile.upsert({
    where: { name: 'Auditor de Pagos y Tesorería' },
    update: {
      canCatalog: false,
      canOrders: true,
      canValidatePayments: true,
      canKardex: true,
      canUsers: false,
      canErpExport: true,
    },
    create: {
      name: 'Auditor de Pagos y Tesorería',
      description: 'Validación de transferencias bancarias y autorización de despacho',
      canCatalog: false,
      canOrders: true,
      canValidatePayments: true,
      canKardex: true,
      canUsers: false,
      canErpExport: true,
    },
  });

  const profileVentas = await prisma.profile.upsert({
    where: { name: 'Asesor de Ventas & Showroom' },
    update: {
      canCatalog: false,
      canOrders: true,
      canValidatePayments: false,
      canKardex: false,
      canUsers: false,
      canErpExport: false,
    },
    create: {
      name: 'Asesor de Ventas & Showroom',
      description:
        'Atención comercial, emisión de ventas asistidas y consulta de pedidos asignados. Sin permisos de validación de pagos ni ajuste de inventario',
      canCatalog: false,
      canOrders: true,
      canValidatePayments: false,
      canKardex: false,
      canUsers: false,
      canErpExport: false,
    },
  });

  console.log('✅ Perfiles actualizados correctamente');

  // 2. Hashes de contraseñas
  const superadminHash = await bcrypt.hash('DarwinAdmin9438130!', salt);
  const almacenHash = await bcrypt.hash('Artefactos2026!', salt);
  const tesoreriaHash = await bcrypt.hash('Finanzas2026!', salt);
  const ventasHash = await bcrypt.hash('Ventas2026!', salt);
  const advisorHash = await bcrypt.hash('Darwin2026!', salt);

  // 3. Usuarios de Administración Central
  await prisma.user.upsert({
    where: { email: 'superadmin@corporaciondarwin.com' },
    update: {
      name: 'Director General Darwin',
      password: superadminHash,
      role: 'SUPERADMIN',
      profileId: profileSuperadmin.id,
      phone: '989438130',
    },
    create: {
      name: 'Director General Darwin',
      email: 'superadmin@corporaciondarwin.com',
      password: superadminHash,
      role: 'SUPERADMIN',
      phone: '989438130',
      profileId: profileSuperadmin.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'almacen@corporaciondarwin.com' },
    update: {
      name: 'Jefatura de Logística & Bodega',
      password: almacenHash,
      role: 'ADMIN',
      profileId: profileAlmacen.id,
    },
    create: {
      name: 'Jefatura de Logística & Bodega',
      email: 'almacen@corporaciondarwin.com',
      password: almacenHash,
      role: 'ADMIN',
      profileId: profileAlmacen.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'tesoreria@corporaciondarwin.com' },
    update: {
      name: 'Auditor Financiero & Tesorería',
      password: tesoreriaHash,
      role: 'ADMIN',
      profileId: profileTesoreria.id,
    },
    create: {
      name: 'Auditor Financiero & Tesorería',
      email: 'tesoreria@corporaciondarwin.com',
      password: tesoreriaHash,
      role: 'ADMIN',
      profileId: profileTesoreria.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'ventas@corporaciondarwin.com' },
    update: {
      name: 'Asesor Comercial de Mostrador',
      password: ventasHash,
      role: 'ADMIN',
      profileId: profileVentas.id,
    },
    create: {
      name: 'Asesor Comercial de Mostrador',
      email: 'ventas@corporaciondarwin.com',
      password: ventasHash,
      role: 'ADMIN',
      profileId: profileVentas.id,
    },
  });

  // 4. Asesoras Oficiales (Cuentas para cada canal de atención)
  const advisors = [
    {
      name: 'SANDY',
      email: 'sandy@lacasadelosartefactos.pe',
      phone: '977673722',
      documentNumber: '48201948',
    },
    {
      name: 'Antonia',
      email: 'antonia@lacasadelosartefactos.pe',
      phone: '906361134',
      documentNumber: '45910283',
    },
    {
      name: 'Milagros',
      email: 'milagros@lacasadelosartefactos.pe',
      phone: '994098698',
      documentNumber: '47192038',
    },
    {
      name: 'Fabricio',
      email: 'fabricio@lacasadelosartefactos.pe',
      phone: '924773863',
      documentNumber: '70291847',
    },
  ];

  for (const adv of advisors) {
    const user = await prisma.user.upsert({
      where: { email: adv.email },
      update: {
        name: adv.name,
        phone: adv.phone,
        documentType: 'DNI',
        documentNumber: adv.documentNumber,
        password: advisorHash,
        role: 'ADMIN',
        profileId: profileVentas.id,
      },
      create: {
        name: adv.name,
        email: adv.email,
        phone: adv.phone,
        documentType: 'DNI',
        documentNumber: adv.documentNumber,
        password: advisorHash,
        role: 'ADMIN',
        profileId: profileVentas.id,
      },
    });
    console.log(`✅ Asesor registrado: ${adv.name} (${adv.email}) - Celular: ${adv.phone}`);
  }

  console.log('--- RECONFIGURACIÓN COMPLETADA CON ÉXITO ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
