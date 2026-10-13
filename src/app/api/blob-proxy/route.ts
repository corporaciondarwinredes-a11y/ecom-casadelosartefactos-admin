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
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return NextResponse.json({ error: 'URL malformada' }, { status: 400 });
      }

      // Mitigación SSRF: Solo permitir protocolo HTTPS y dominios oficiales de Vercel Blob
      const isAllowedHost =
        parsedUrl.protocol === 'https:' &&
        (parsedUrl.hostname === 'blob.vercel-storage.com' ||
          parsedUrl.hostname.endsWith('.blob.vercel-storage.com'));

      if (!isAllowedHost) {
        return NextResponse.json(
          { error: 'Dominio no permitido por política de seguridad (SSRF protection)' },
          { status: 403 }
        );
      }

      const token = process.env.BLOB_READ_WRITE_TOKEN;

      // Intentar fetch autenticado con el token Bearer para Blob privado
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const blobRes = await fetch(parsedUrl.toString(), {
        headers,
        cache: 'no-store',
      });

      if (!blobRes.ok) {
        // Fallback: si falla con Bearer, intentar sin Bearer
        const fallbackRes = await fetch(parsedUrl.toString());
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
