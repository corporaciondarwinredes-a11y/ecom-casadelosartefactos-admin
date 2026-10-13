import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { saveBlob } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB máximo
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Acceso no autorizado: requiere sesión administrativa activa' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const requestedFolder = formData.get('folder');

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    // Validación estricta de tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 10 MB' },
        { status: 400 }
      );
    }

    // Validación de tipo MIME
    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Formato no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP) o documentos PDF' },
        { status: 400 }
      );
    }

    // Validación de extensión de archivo
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Extensión de archivo no permitida' },
        { status: 400 }
      );
    }

    // Sanitización y validación estricta de carpeta destino
    const ALLOWED_FOLDERS = new Set(['general', 'receipts', 'products', 'banners']);
    const folder: 'general' | 'receipts' | 'products' | 'banners' =
      typeof requestedFolder === 'string' && ALLOWED_FOLDERS.has(requestedFolder)
        ? (requestedFolder as 'general' | 'receipts' | 'products' | 'banners')
        : 'general';

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const saved = await saveBlob(buffer, file.name, folder);

    return NextResponse.json({
      success: true,
      url: saved.url,
      filename: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Error uploading file in admin:', error);
    return NextResponse.json({ error: error.message || 'Error al subir archivo' }, { status: 500 });
  }
}
