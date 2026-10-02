# ecom-casadelosartefactos-admin

Suite Administrativa, Punto de Venta (POS) y Kardex de Inventario — **Corporación Darwin S.A.C.**

## 🚀 Tecnologías
- **Framework:** Next.js 15 (App Router, React 19)
- **Base de Datos:** PostgreSQL con Prisma ORM (Compatible con Supabase Connection Pooling)
- **Autenticación y Permisos:** NextAuth.js con perfiles granulares (Superadmin, Asesora, Tesorería)
- **Tiempo Real:** Server-Sent Events (SSE) con sintetizador de audio para nuevos pedidos y comprobantes
- **Kardex:** Deducción atómica de stock y auditoría de almacén
- **Almacenamiento:** Vercel Blob Storage & Local Disk Fallback

## ⚙️ Configuración Rápida
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/corporaciondarwinredes-a11y/ecom-casadelosartefactos-admin.git
   cd ecom-casadelosartefactos-admin
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```
4. Generar cliente Prisma:
   ```bash
   npx prisma generate
   ```
5. Iniciar servidor:
   ```bash
   npm run dev
   ```

## 🔒 Variables de Entorno Requeridas (Vercel & Supabase)
Ver archivo `.env.example` para la lista completa de credenciales.
