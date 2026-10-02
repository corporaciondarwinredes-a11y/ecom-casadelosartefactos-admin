import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';

// Directorio base para blobs locales en disco C:
const DEFAULT_C_DRIVE_DIR = 'C:\\ecom-artefactos-uploads';
const FALLBACK_DIR = path.join(process.cwd(), 'uploads');

export function getUploadsBaseDir(): string {
  try {
    if (!fs.existsSync(DEFAULT_C_DRIVE_DIR)) {
      fs.mkdirSync(DEFAULT_C_DRIVE_DIR, { recursive: true });
    }
    return DEFAULT_C_DRIVE_DIR;
  } catch (err) {
    if (!fs.existsSync(FALLBACK_DIR)) {
      fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    }
    return FALLBACK_DIR;
  }
}

/**
 * Guarda un buffer o File en el storage de Vercel Blob (producción) o disco local (desarrollo)
 */
export async function saveBlob(
  fileBuffer: Buffer,
  originalFilename: string,
  subfolder: 'receipts' | 'products' | 'banners' | 'general' = 'general'
): Promise<{ url: string; filepath: string }> {
  const ext = path.extname(originalFilename) || '.jpg';
  const cleanName = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueName = `${Date.now()}-${cleanName}${ext}`;

  // 1. Si existe token de Vercel Blob (Producción en Vercel)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blobPath = `${subfolder}/${uniqueName}`;
    let blobResult;
    try {
      blobResult = await put(blobPath, fileBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('private store')) {
        blobResult = await put(blobPath, fileBuffer, {
          access: 'private',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } else {
        throw err;
      }
    }

    return {
      url: blobResult.url,
      filepath: blobPath,
    };
  }

  // 2. Almacenamiento local en disco (Desarrollo local / On-premise)
  const baseDir = getUploadsBaseDir();
  const targetFolder = path.join(baseDir, subfolder);

  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  const fullPath = path.join(targetFolder, uniqueName);
  await fs.promises.writeFile(fullPath, fileBuffer);

  const publicUrl = `/api/uploads/${subfolder}/${uniqueName}`;

  return {
    url: publicUrl,
    filepath: fullPath,
  };
}

/**
 * Obtiene la ruta física local de un archivo a partir de su subpath
 */
export function getBlobLocalPath(subpath: string): string | null {
  const baseDir = path.resolve(getUploadsBaseDir());
  const cleanSubpath = path.normalize(subpath).replace(/^(\.\.[\/\\])+/, '');
  const resolved = path.resolve(baseDir, cleanSubpath);

  if (resolved.startsWith(baseDir) && fs.existsSync(resolved)) {
    return resolved;
  }

  const fallbackDir = path.resolve(FALLBACK_DIR);
  const resolvedFallback = path.resolve(fallbackDir, cleanSubpath);
  if (resolvedFallback.startsWith(fallbackDir) && fs.existsSync(resolvedFallback)) {
    return resolvedFallback;
  }

  return null;
}
