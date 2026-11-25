import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { del, put } from '@vercel/blob';

const MIME_TO_EXT = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/pjpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
  ['image/gif', '.gif'],
  ['image/svg+xml', '.svg'],
  ['image/bmp', '.bmp'],
  ['image/x-ms-bmp', '.bmp'],
  ['image/tiff', '.tiff'],
  ['image/heic', '.heic'],
  ['image/heif', '.heif'],
  ['image/x-icon', '.ico'],
  ['image/vnd.microsoft.icon', '.ico'],
]);

const EXT_TO_MIME = new Map<string, string>([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.jfif', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.bmp', 'image/bmp'],
  ['.ico', 'image/x-icon'],
  ['.tif', 'image/tiff'],
  ['.tiff', 'image/tiff'],
  ['.heic', 'image/heic'],
  ['.heif', 'image/heif'],
]);

export const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {
    // Read-only filesystem in serverless environments (Vercel uses DB / Vercel Blob)
  }
}

export function resolveImageMime(mimeType: string, originalName = ''): string | null {
  const cleanMime = String(mimeType || '').split(';')[0].trim().toLowerCase();
  if (cleanMime === 'image/jpg' || cleanMime === 'image/pjpeg') return 'image/jpeg';
  if (MIME_TO_EXT.has(cleanMime)) return cleanMime;
  if (cleanMime.startsWith('image/')) return cleanMime;

  const ext = path.extname(originalName || '').toLowerCase();
  if (EXT_TO_MIME.has(ext) && (!cleanMime || cleanMime === 'application/octet-stream' || cleanMime === 'binary/octet-stream')) {
    return EXT_TO_MIME.get(ext)!;
  }
  return null;
}

export function isValidImageUpload(
  mimeType: string,
  sizeBytes: number,
  originalName = ''
): { ok: boolean; resolvedMime?: string; error?: string } {
  const resolved = resolveImageMime(mimeType, originalName);
  if (!resolved) {
    return {
      ok: false,
      error: 'Please choose a valid image file (JPG, PNG, WebP, AVIF, GIF, SVG, BMP, HEIC, or ICO).',
    };
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_IMAGE_UPLOAD_BYTES) {
    return { ok: false, error: 'Image size must be between 1 byte and 15 MB.' };
  }
  return { ok: true, resolvedMime: resolved };
}

export async function storeMediaFile(params: {
  id: string;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  bucket: string;
}): Promise<{
  fileUrl: string;
  storedName: string;
  fileData: string;
  provider: 'vercel-blob' | 'database';
}> {
  const resolvedMime = resolveImageMime(params.mimeType, params.originalName) || 'image/jpeg';
  const ext = MIME_TO_EXT.get(resolvedMime) || path.extname(params.originalName) || '.jpg';
  const safeBase = path
    .basename(params.originalName, path.extname(params.originalName))
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  const storedName = `${safeBase || 'asset'}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
  const base64Data = params.buffer.toString('base64');

  // Use Vercel Blob when BLOB_READ_WRITE_TOKEN is available, falling back cleanly to DB storage
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const pathname = `${params.bucket.replace(/[^a-zA-Z0-9_-]/g, '')}/${storedName}`;
      const blob = await put(pathname, params.buffer, {
        access: 'public',
        contentType: resolvedMime,
      });
      return { fileUrl: blob.url, storedName, fileData: base64Data, provider: 'vercel-blob' };
    } catch (blobErr) {
      console.warn('[Storage] Vercel Blob upload failed, falling back to database storage:', blobErr);
    }
  }

  // Optional local disk mirror when writable (never throws on read-only serverless)
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const dest = path.resolve(UPLOADS_DIR, storedName);
    if (dest.startsWith(UPLOADS_DIR + path.sep)) {
      fs.writeFileSync(dest, params.buffer);
    }
  } catch {
    // Expected on read-only serverless environments; database storage handles persistence
  }

  return {
    fileUrl: `/api/media/${params.id}`,
    storedName,
    fileData: base64Data,
    provider: 'database',
  };
}

export async function removeMediaFile(fileUrl: string): Promise<void> {
  if (fileUrl.startsWith('https://') && fileUrl.includes('blob.vercel-storage.com') && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(fileUrl);
    } catch {
      // Ignore missing blob on cleanup
    }
    return;
  }
  if (fileUrl.startsWith('/uploads/')) {
    try {
      const filename = path.basename(fileUrl);
      const resolved = path.resolve(UPLOADS_DIR, filename);
      if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    } catch {
      // Ignore read-only FS errors
    }
  }
}
