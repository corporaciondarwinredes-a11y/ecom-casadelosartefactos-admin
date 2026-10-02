const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando carga de datos semilla para La Casa de los Artefactos (Corporación Darwin)...');

  // 1. Limpiar datos existentes de prueba para evitar duplicidades
  await prisma.adminAuditLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.profile.deleteMany();

  // 2. Crear Perfiles RBAC
  const profileSuperadmin = await prisma.profile.create({
    data: {
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

  const profileAlmacen = await prisma.profile.create({
    data: {
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

  const profileTesoreria = await prisma.profile.create({
    data: {
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

  const profileVentas = await prisma.profile.create({
    data: {
      name: 'Asesor de Ventas & Showroom',
      description: 'Atención comercial, emisión de ventas asistidas y consulta de pedidos. Sin permisos de validación de pagos ni ajuste de inventario',
      canCatalog: false,
      canOrders: true,
      canValidatePayments: false,
      canKardex: false,
      canUsers: false,
      canErpExport: false,
    },
  });

  // 3. Crear Usuarios Administrativos con bcrypt hash (10 salt rounds)
  const salt = await bcrypt.genSalt(10);
  const superadminHash = await bcrypt.hash('DarwinAdmin9438130!', salt);
  const almacenHash = await bcrypt.hash('Artefactos2026!', salt);
  const ventasHash = await bcrypt.hash('Ventas2026!', salt);
  const tesoreriaHash = await bcrypt.hash('Finanzas2026!', salt);

  const superadmin = await prisma.user.create({
    data: {
      name: 'Director General Darwin',
      email: 'superadmin@corporaciondarwin.com',
      password: superadminHash,
      role: 'SUPERADMIN',
      documentType: 'DNI',
      documentNumber: '10482914',
      profileId: profileSuperadmin.id,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Jefatura de Logística & Bodega',
      email: 'almacen@corporaciondarwin.com',
      password: almacenHash,
      role: 'ADMIN',
      documentType: 'DNI',
      documentNumber: '42918471',
      profileId: profileAlmacen.id,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Asesor Comercial de Mostrador',
      email: 'ventas@corporaciondarwin.com',
      password: ventasHash,
      role: 'ADMIN',
      documentType: 'DNI',
      documentNumber: '46829104',
      profileId: profileVentas.id,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Auditor Financiero & Tesorería',
      email: 'tesoreria@corporaciondarwin.com',
      password: tesoreriaHash,
      role: 'ADMIN',
      documentType: 'DNI',
      documentNumber: '38192049',
      profileId: profileTesoreria.id,
    },
  });

  // 4. Catálogo de Artefactos de Primer Nivel
  const productsData = [
    {
      name: 'Smart TV Samsung 65" Neo QLED 4K QN90C',
      brand: 'Samsung',
      modelCode: 'QN65QN90CAGXPE',
      category: 'TELEVISORES',
      slug: 'smart-tv-samsung-65-neo-qled-4k-qn90c',
      description: 'Televisor insignia con tecnología Quantum Matrix Mini LED, Procesador Neural Quantum 4K con Inteligencia Artificial, antirreflejo y tasa de refresco nativa de 144Hz para gaming y cine.',
      specifications: 'Pantalla: 65" Neo QLED 4K (3840x2160) | Mini LED | Audio Dolby Atmos 60W 4.2.2Ch | 4x HDMI 2.1 | Wi-Fi 5, Bluetooth 5.2 | Sistema Tizen OS',
      warrantyMonths: 24,
      energyRating: 'A+++',
      voltage: '220V / 60Hz',
      dimensions: 'Alto: 89.1cm x Ancho: 144.6cm x Prof: 2.7cm',
      weightKg: 27.5,
      retailPrice: 5299,
      discountPrice: 4299,
      price: 4299,
      stock: 14,
      sku: 'CD-TV-SAM-6501',
      barcode: '8806094821034',
      image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1000&q=80',
      isFeatured: true,
    },
    {
      name: 'Smart TV LG OLED evo C3 55" 4K Cinema Series',
      brand: 'LG',
      modelCode: 'OLED55C3PSA',
      category: 'TELEVISORES',
      slug: 'smart-tv-lg-oled-evo-c3-55-cinema',
      description: 'Negros perfectos y contraste infinito con píxeles autoiluminados OLED evo de LG. Equipado con el procesador α9 AI Gen6 4K, Dolby Vision IQ y Dolby Atmos inmersivo.',
      specifications: 'Pantalla: 55" OLED evo 4K | Procesador α9 AI Gen6 | 4x HDMI 2.1 VRR 120Hz | Sonido 40W 2.2ch | webOS 23 con Magic Remote incluido',
      warrantyMonths: 24,
      energyRating: 'A++',
      voltage: '220V / 60Hz',
      dimensions: 'Alto: 75.6cm x Ancho: 122.2cm x Prof: 4.5cm',
      weightKg: 16.0,
      retailPrice: 4799,
      discountPrice: 3899,
      price: 3899,
      stock: 9,
      sku: 'CD-TV-LG-5502',
      barcode: '8806091849102',
      image: 'https://images.unsplash.com/photo-1552975084-6e027cd345c2?auto=format&fit=crop&w=1000&q=80',
      isFeatured: true,
    },
    {
      name: 'Refrigeradora LG Side by Side InstaView Door-in-Door 617 Litros',
      brand: 'LG',
      modelCode: 'GC-X257CSES',
      category: 'REFRIGERADORAS',
      slug: 'refrigeradora-lg-side-by-side-instaview-617l',
      description: 'Refrigeradora de lujo con panel de cristal espejado que se ilumina con dos toques. Compresor Inverter Linear de bajo consumo y tecnología DoorCooling+ para frescura uniforme.',
      specifications: 'Capacidad neta: 617 Litros (Refrigerador 405L / Freezer 212L) | Acero Inox antihuellas | Dispensador de agua y hielo craft | Filtro Hygiene Fresh+ | Wi-Fi LG ThinQ',
      warrantyMonths: 36,
      energyRating: 'A+++',
      voltage: '220V / 60Hz',
      dimensions: 'Alto: 179.0cm x Ancho: 91.3cm x Prof: 73.5cm',
      weightKg: 118.0,
      retailPrice: 5999,
      discountPrice: 4899,
      price: 4899,
      stock: 6,
      sku: 'CD-REF-LG-6170',
      barcode: '7750192840192',
      image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=1000&q=80',
      isFeatured: true,
    },
    {
      name: 'Refrigeradora Samsung French Door Twin Cooling Plus 490L',
      brand: 'Samsung',
      modelCode: 'RF49A5202SL',
      category: 'REFRIGERADORAS',
      slug: 'refrigeradora-samsung-french-door-490l',
      description: 'Diseño French Door de puertas francesas con tecnología Twin Cooling Plus que mantiene la humedad óptima en cada compartimento sin mezclar olores. Acabado inox elegante.',
      specifications: 'Capacidad: 490 Litros | Motor Digital Inverter con 20 años de garantía en compresor | Fábrica de hielo automática | Alarma de puerta abierta',
      warrantyMonths: 24,
      energyRating: 'A++',
      voltage: '220V / 60Hz',
      dimensions: 'Alto: 177.6cm x Ancho: 81.7cm x Prof: 76.5cm',
      weightKg: 99.5,
      retailPrice: 4299,
      discountPrice: 3599,
      price: 3599,
      stock: 8,
      sku: 'CD-REF-SAM-4901',
      barcode: '8806092751849',
      image: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=1000&q=80',
      isFeatured: false,
    },
    {
      name: 'Cocina de Pie Bosch PRO 5 Hornillas Inox Gas & Grill Eléctrico',
      brand: 'Bosch',
      modelCode: 'PRO-545-IX',
      category: 'COCINAS_HORNOS',
      slug: 'cocina-bosch-pro-5-hornillas-inox',
      description: 'Cocina profesional de alta resistencia con parrillas de hierro fundido, quemador WOK de triple llama y horno espacioso con grill eléctrico y sistema de seguridad termocupla.',
      specifications: '5 quemadores a gas (1 Wok 3.3kW, 1 rápido, 2 semi-rápidos, 1 auxiliar) | Encendido eléctrico en una sola mano | Horno de 90L con luz interior y timer | Acero Inox cepillado',
      warrantyMonths: 24,
      energyRating: 'A+',
      voltage: '220V / 60Hz',
      dimensions: 'Alto: 94.0cm x Ancho: 76.0cm x Prof: 65.0cm',
      weightKg: 62.0,
      retailPrice: 2999,
      discountPrice: 2499,
      price: 2499,
      stock: 11,
      sku: 'CD-COC-BOS-5001',
      barcode: '4242005182941',
      image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=80',
      isFeatured: true,
    },
    {
      name: 'Lavaseca Samsung EcoBubble AI Control 12.5kg / 8kg',
      brand: 'Samsung',
      modelCode: 'WD12T4046BX',
      category: 'LAVADORAS',
      slug: 'lavaseca-samsung-ecobubble-12kg-8kg',
      description: 'Lava y seca en un solo ciclo inteligente. Tecnología EcoBubble que transforma el detergente en burbujas penetrantes para lavar en frío con la misma efectividad que agua caliente.',
      specifications: 'Capacidad de lavado: 12.5 kg / Secado: 8.0 kg | Motor Digital Inverter silencioso | Ciclo de vapor desinfectante Hygiene Steam | Panel con Inteligencia Artificial',
      warrantyMonths: 24,
      energyRating: 'A+++',
      voltage: '220V / 60Hz',
      dimensions: 'Alto: 85.0cm x Ancho: 60.0cm x Prof: 65.0cm',
      weightKg: 71.0,
      retailPrice: 3499,
      discountPrice: 2899,
      price: 2899,
      stock: 10,
      sku: 'CD-LAV-SAM-1250',
      barcode: '8806091948201',
      image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=1000&q=80',
      isFeatured: true,
    },
    {
      name: 'Aire Acondicionado Split Inverter Midea 18,000 BTU Frío/Calor',
      brand: 'Midea',
      modelCode: 'MSMBBU-18HRFN1',
      category: 'CLIMATIZACION',
      slug: 'aire-acondicionado-split-inverter-midea-18000-btu',
      description: 'Climatización de alto rendimiento con compresor Quattro Inverter que ahorra hasta un 70% de energía. Filtro de alta densidad que purifica el aire de polvo y alérgenos.',
      specifications: 'Capacidad: 18,000 BTU/h (Frío y Calefacción) | Cobertura hasta 35m² | Gas ecológico R410A | Control remoto inteligente con modo Eco y Turbo | Kit de tuberías de cobre incluido',
      warrantyMonths: 36,
      energyRating: 'A++',
      voltage: '220V / 60Hz',
      dimensions: 'Evaporador: 96.5cm x 31.9cm x 21.5cm | Condensador: 80.0cm x 55.4cm x 33.3cm',
      weightKg: 42.0,
      retailPrice: 2699,
      discountPrice: 2199,
      price: 2199,
      stock: 7,
      sku: 'CD-CLI-MID-1800',
      barcode: '6934520194821',
      image: 'https://images.unsplash.com/photo-1614633833026-0e205579b504?auto=format&fit=crop&w=1000&q=80',
      isFeatured: false,
    },
    {
      name: 'Freidora de Aire Digital Oster DiamondForce 5.5 Litros',
      brand: 'Oster',
      modelCode: 'CKSTAF55DF',
      category: 'COCINAS_HORNOS',
      slug: 'freidora-de-aire-digital-oster-diamondforce-55l',
      description: 'Freidora de aire con recubrimiento antiadherente DiamondForce reforzado con partículas de diamante para 12 veces más durabilidad. Cocina hasta con 99.5% menos aceite.',
      specifications: 'Capacidad: 5.5 Litros | 7 funciones preestablecidas en pantalla digital táctil | Temporizador hasta 60 minutos | Control de temperatura de 80°C a 200°C | Potencia 1700W',
      warrantyMonths: 12,
      energyRating: 'A+',
      voltage: '220V / 60Hz',
      dimensions: 'Alto: 34.0cm x Ancho: 30.0cm x Prof: 36.0cm',
      weightKg: 5.4,
      retailPrice: 499,
      discountPrice: 399,
      price: 399,
      stock: 25,
      sku: 'CD-PEQ-OST-5501',
      barcode: '053891142051',
      image: 'https://images.unsplash.com/photo-1585670210693-e7fdd16b142e?auto=format&fit=crop&w=1000&q=80',
      isFeatured: true,
    },
    {
      name: 'Cafetera Espresso y Cappuccino De\'Longhi Dedica Deluxe Inox',
      brand: 'De\'Longhi',
      modelCode: 'EC685M',
      category: 'COCINAS_HORNOS',
      slug: 'cafetera-espresso-delonghi-dedica-deluxe-inox',
      description: 'Máquina de espresso compacta de 15 bares de presión en acero inoxidable macizo. Calentamiento rápido ThermoBlock en 40 segundos y espumador manual para capuchinos de cafetería.',
      specifications: 'Presión: 15 bares | Portafiltro profesional para 1 o 2 tazas y pastillas E.S.E. | Depósito de agua desmontable 1.1L | Bandeja regulable para tazas altas de latte | Potencia 1300W',
      warrantyMonths: 12,
      energyRating: 'A+',
      voltage: '220V / 60Hz',
      dimensions: 'Alto: 30.3cm x Ancho: 14.9cm x Prof: 33.0cm',
      weightKg: 4.2,
      retailPrice: 1199,
      discountPrice: 949,
      price: 949,
      stock: 18,
      sku: 'CD-PEQ-DEL-6850',
      barcode: '8004399331181',
      image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1000&q=80',
      isFeatured: false,
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
      data: item,
    });

    // Registrar saldo inicial en Kardex
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: 'MANUAL_RESTOCK',
        inQuantity: product.stock,
        outQuantity: 0,
        changeQuantity: product.stock,
        previousStock: 0,
        balance: product.stock,
        newStock: product.stock,
        reference: 'INVENTARIO-INICIAL-CORPORACION-DARWIN-2026',
        user: 'superadmin@corporaciondarwin.com',
        note: `Carga inicial de inventario para ${product.name}`,
      },
    });

    // Guardar imagen secundaria
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: product.image,
        altText: `${product.name} - Vista Principal`,
        isPrimary: true,
        order: 1,
      },
    });
  }

  // 5. Sembrar Canales de Asesoría Oficiales (WhatsApp Concierge)
  await prisma.supportChannel.deleteMany();
  const supportChannelsData = [
    {
      name: 'Sandy (Atención 24 Horas)',
      phone: '977673722',
      formattedPhone: '+51 977 673 722',
      roleTitle: 'Asesora Principal - Turno Continuo 24/7',
      schedule: 'Atención 24 Horas (Lunes a Domingo)',
      startHour: 0,
      endHour: 24,
      autoSchedule: true,
      isActive: true,
      order: 1,
    },
    {
      name: 'Antonia',
      phone: '906361134',
      formattedPhone: '+51 906 361 134',
      roleTitle: 'Asesora Especialista en Artefactos y Despacho',
      schedule: 'Lunes a Sábado: 8:00 AM - 8:00 PM',
      startHour: 8,
      endHour: 20,
      autoSchedule: true,
      isActive: true,
      order: 2,
    },
    {
      name: 'Milagros',
      phone: '994098698',
      formattedPhone: '+51 994 098 698',
      roleTitle: 'Asesora Comercial y Cotizaciones',
      schedule: 'Lunes a Sábado: 8:00 AM - 8:00 PM',
      startHour: 8,
      endHour: 20,
      autoSchedule: true,
      isActive: true,
      order: 3,
    },
    {
      name: 'Fabricio',
      phone: '924773863',
      formattedPhone: '+51 924 773 863',
      roleTitle: 'Asesor Técnico y Envíos a Provincia',
      schedule: 'Lunes a Sábado: 8:00 AM - 8:00 PM',
      startHour: 8,
      endHour: 20,
      autoSchedule: true,
      isActive: true,
      order: 4,
    },
  ];

  for (const ch of supportChannelsData) {
    await prisma.supportChannel.create({ data: ch });
  }

  // 6. Sembrar Banners Oficiales de Categoría
  await prisma.categoryBanner.deleteMany();
  const categoryBannersData = [
    {
      category: 'TELEVISORES',
      name: 'Televisores',
      subtitle: 'QLED, OLED 4K y Mini LED de Última Generación',
      tag: 'Hasta 35% DCTO',
      imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80',
      isActive: true,
      order: 1,
    },
    {
      category: 'AUDIO',
      name: 'Audio',
      subtitle: 'Barras de Sonido Dolby Atmos y Equipos',
      tag: 'Sonido Pro',
      imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
      isActive: true,
      order: 2,
    },
    {
      category: 'LAVADORAS',
      name: 'Lavadoras / Secadoras',
      subtitle: 'Lavasecas Inteligentes y Carga Frontal',
      tag: 'Hasta 28% DCTO',
      imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80',
      isActive: true,
      order: 3,
    },
    {
      category: 'REFRIGERADORAS',
      name: 'Refrigeradoras',
      subtitle: 'Side by Side, No Frost y Multi-Door Inverter',
      tag: 'Hasta 25% DCTO',
      imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
      isActive: true,
      order: 4,
    },
    {
      category: 'CONGELADORAS',
      name: 'Congeladoras',
      subtitle: 'Horizontales y Verticales de Gran Capacidad',
      tag: 'Frío Extremo',
      imageUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80',
      isActive: true,
      order: 5,
    },
    {
      category: 'COCINAS_HORNOS',
      name: 'Cocinas / Hornos',
      subtitle: 'Empotrables y de Pie de Alta Eficiencia',
      tag: 'Inducción & Gas',
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
      isActive: true,
      order: 6,
    },
    {
      category: 'CLIMATIZACION',
      name: 'Climatización',
      subtitle: 'Aire Acondicionado Split y Portátil Frío/Calor',
      tag: 'Tecnología Inverter',
      imageUrl: 'https://images.unsplash.com/photo-1614633833026-0820552978b6?auto=format&fit=crop&w=800&q=80',
      isActive: true,
      order: 7,
    },
  ];

  for (const banner of categoryBannersData) {
    await prisma.categoryBanner.create({ data: banner });
  }

  // 7. Registrar Log de Auditoría Administrativa
  await prisma.adminAuditLog.create({
    data: {
      userId: superadmin.id,
      action: 'INITIAL_SEED',
      resource: 'SISTEMA_COMPLETO',
      details: 'Base de datos en Supabase inicializada con 9 artefactos, 4 asesoras oficiales y 7 categorías para Corporación Darwin',
    },
  });

  console.log('✅ Base de datos en Supabase inicializada con éxito.');
  console.log('Credenciales del Superadmin:');
  console.log('Usuario: superadmin@corporaciondarwin.com');
  console.log('Contraseña: DarwinAdmin9438130!');
}

main()
  .catch((e) => {
    console.error('Error al ejecutar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
