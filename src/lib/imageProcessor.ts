import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB before conversion (no strict limit, family-friendly)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
const WEBP_QUALITY = 80; // Optimal quality/size ratio

export interface ImageUploadResult {
  filename: string;
  relativePath: string;
  url: string;
}

/**
 * Validate image file before processing
 */
export function validateImageFile(buffer: Buffer, mimeType: string): void {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File type not allowed. Supported types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }
}

/**
 * Process image and convert to WebP
 * Optimized for quality/size ratio (quality: 80)
 */
export async function processImageToWebP(
  buffer: Buffer,
  mimeType: string,
  originalFilename?: string
): Promise<ImageUploadResult> {
  try {
    validateImageFile(buffer, mimeType);

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const webpFilename = `${timestamp}-${random}.webp`;
    const relativePath = `uploads/${webpFilename}`;
    const fullPath = path.join(UPLOAD_DIR, webpFilename);

    // Create uploads directory if it doesn't exist
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Convert to WebP with quality optimization
    const webpBuffer = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .resize(4000, 4000, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    // Save to filesystem
    await fs.writeFile(fullPath, webpBuffer);

    // Return with relative path for database storage
    return {
      filename: webpFilename,
      relativePath,
      url: `/${relativePath}`,
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete image file by relative path
 */
export async function deleteImageFile(relativePath: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), 'public', relativePath);
    await fs.unlink(fullPath);
  } catch (error) {
    // Silently fail if file doesn't exist
    console.error(`Failed to delete image: ${error}`);
  }
}
