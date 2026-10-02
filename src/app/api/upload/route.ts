import { NextRequest, NextResponse } from 'next/server';
import { saveBlob } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Allow upload in admin (session logged or local administration)
    const userRole = (session?.user as any)?.role;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as any) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

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
