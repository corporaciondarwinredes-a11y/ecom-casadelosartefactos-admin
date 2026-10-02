import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_BRANDS = [
  { name: 'Samsung', category: 'TELEVISORES', description: 'Smart TVs Neo QLED, Refrigeradoras Twin Cooling, Lavasecas EcoBubble, Split WindFree' },
  { name: 'LG', category: 'TELEVISORES', description: 'OLED evo 4K Cinema Series, Refrigeradoras InstaView Door-in-Door, Lavadoras AI DD' },
  { name: 'Sony', category: 'AUDIO', description: 'Barras de Sonido Dolby Atmos, Torres de Fiesta High Power, Audífonos Noise Cancelling' },
  { name: 'JBL', category: 'AUDIO', description: 'Parlantes Bluetooth Portátiles Resistentes al Agua IP67, Sistemas de Audio PartyBox' },
  { name: 'Bosch', category: 'COCINAS_HORNOS', description: 'Cocinas de Alta Gama Serie 6 y 8, Hornos Eléctricos Empotrables, Lavavajillas' },
  { name: 'Midea', category: 'CLIMATIZACION', description: 'Aires Acondicionados Split Inverter Quattro A+++, Refrigeradoras Combi, Congeladoras' },
  { name: 'Indurama', category: 'REFRIGERADORAS', description: 'Refrigeradoras No Frost Quad Door, Cocinas a Gas Spazio 4 y 5 Hornillas' },
  { name: 'Oster', category: 'COCINAS_HORNOS', description: 'Freidoras de Aire Digitales, Cafeteras Espresso Prima Latte, Licuadoras Reversibles' },
  { name: 'Sole', category: 'COCINAS_HORNOS', description: 'Campanas Extractoras Decorativas, Encimeras Vitrocerámica & Inducción, Termas' },
  { name: 'Mabe', category: 'LAVADORAS', description: 'Lavadoras Aqua Saver Green, Refrigeradoras con Despachador de Agua' },
  { name: 'Electrolux', category: 'REFRIGERADORAS', description: 'Línea Blanca Europea, Congeladores Dual Function, Secadoras de Ropa' },
  { name: 'York', category: 'CLIMATIZACION', description: 'Sistemas de Climatización Residencial y Comercial Alta Eficiencia Frío/Calor' },
  { name: 'Carrier', category: 'CLIMATIZACION', description: 'Tecnología de Aire Acondicionado Split Inverter para Ambientes de Gran Dimensión' },
  { name: 'Panasonic', category: 'AUDIO', description: 'Minicomponentes PowerLive, Hornos Microondas con Tecnología Inverter' },
];

async function main() {
  console.log('Seeding brands...');
  for (let i = 0; i < DEFAULT_BRANDS.length; i++) {
    const b = DEFAULT_BRANDS[i];
    const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await prisma.brand.upsert({
      where: { name: b.name },
      update: {
        description: b.description,
        category: b.category,
        order: i,
        isActive: true,
      },
      create: {
        name: b.name,
        slug,
        description: b.description,
        category: b.category,
        order: i,
        isActive: true,
      },
    });
    console.log(`✓ Brand: ${b.name}`);
  }
  const total = await prisma.brand.count();
  console.log(`Total brands in database: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
