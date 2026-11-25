import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { del, put } from '@vercel/blob';

const ALLOWED_MIME = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
  ['image/x-icon', '.ico'],
  ['image/vnd.microsoft.icon', '.ico'],
]);

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {
    // Read-only filesystem in serverless environments (Vercel uses Vercel Blob)
  }
}

export function isValidImageUpload(mimeType: string, sizeBytes: number): { ok: boolean; error?: string } {
  if (!ALLOWED_MIME.has(mimeType)) {
    return { ok: false, error: 'Only JPG, PNG, WebP, AVIF, and ICO image files are allowed.' };
  }
  if (sizeBytes <= 0 || sizeBytes > 5 * 1024 * 1024) {
    return { ok: false, error: 'Image size must be between 1 byte and 5 MB.' };
  }
  return { ok: true };
}

export async function storeMediaFile(params: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  bucket: string;
}): Promise<{ fileUrl: string; storedName: string; provider: 'vercel-blob' | 'local' }> {
  const ext = ALLOWED_MIME.get(params.mimeType) || '.jpg';
  const safeBase = path
    .basename(params.originalName, path.extname(params.originalName))
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  const storedName = `${safeBase || 'asset'}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;

  // Use Vercel Blob when BLOB_READ_WRITE_TOKEN is available
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const pathname = `${params.bucket.replace(/[^a-zA-Z0-9_-]/g, '')}/${storedName}`;
    const blob = await put(pathname, params.buffer, {
      access: 'public',
      contentType: params.mimeType,
    });
    return { fileUrl: blob.url, storedName, provider: 'vercel-blob' };
  }

  // Local fallback in preview / development when BLOB_READ_WRITE_TOKEN is unset
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const dest = path.resolve(UPLOADS_DIR, storedName);
  if (!dest.startsWith(UPLOADS_DIR + path.sep)) {
    throw new Error('Invalid destination path.');
  }
  fs.writeFileSync(dest, params.buffer);
  return { fileUrl: `/uploads/${storedName}`, storedName, provider: 'local' };
}

export async function removeMediaFile(fileUrl: string): Promise<void> {
  if (fileUrl.startsWith('https://') && fileUrl.includes('blob.vercel-storage.com') && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(fileUrl);
    return;
  }
  if (fileUrl.startsWith('/uploads/')) {
    const filename = path.basename(fileUrl);
    const resolved = path.resolve(UPLOADS_DIR, filename);
    if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
  }
}
