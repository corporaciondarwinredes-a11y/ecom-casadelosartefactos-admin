import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    // Si es un archivo local relativo
    if (targetUrl.startsWith('/uploads/') || targetUrl.startsWith('/api/uploads/')) {
      const origin = req.nextUrl.origin;
      return NextResponse.redirect(new URL(targetUrl, origin));
    }

    // Si es una URL externa (por ejemplo, Vercel Blob público o privado)
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      const token =
        process.env.BLOB_READ_WRITE_TOKEN ||
        'vercel_blob_rw_weMd1E1HsUfQqNIK_XBfnaJreSrC0Mlv1I3BsZYgZ1kXYdh';

      // Intentar fetch autenticado con el token Bearer para Blob privado
      const headers: Record<string, string> = {};
      if (targetUrl.includes('blob.vercel-storage.com') && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const blobRes = await fetch(targetUrl, {
        headers,
        cache: 'no-store',
      });

      if (!blobRes.ok) {
        // Fallback: si falla con Bearer, intentar sin Bearer
        const fallbackRes = await fetch(targetUrl);
        if (!fallbackRes.ok) {
          return NextResponse.json(
            { error: `No se pudo acceder al archivo (${blobRes.status} / ${fallbackRes.status})` },
            { status: blobRes.status }
          );
        }
        const contentType = fallbackRes.headers.get('content-type') || 'application/octet-stream';
        const buffer = await fallbackRes.arrayBuffer();
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          },
        });
      }

      const contentType = blobRes.headers.get('content-type') || 'image/jpeg';
      const buffer = await blobRes.arrayBuffer();

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
    }

    return NextResponse.json({ error: 'Formato de URL no válido' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in blob proxy:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener archivo' }, { status: 500 });
  }
}
