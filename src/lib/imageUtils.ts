/**
 * Convierte URLs de Vercel Blob privados al proxy seguro autenticado
 * para evitar el error 403 Forbidden en el navegador.
 */
export function getSafeImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/api/blob-proxy') || url.startsWith('/api/uploads/')) {
    return url;
  }
  if (url.includes('.private.blob.vercel-storage.com') || (url.includes('blob.vercel-storage.com') && url.includes('private'))) {
    return `/api/blob-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}
