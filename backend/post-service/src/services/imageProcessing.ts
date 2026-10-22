import sharp from 'sharp';
import { AppError } from '../utils/errors';

// Rules for premium post images. The file's real bytes are decoded (the name and the
// browser-sent MIME type are ignored), then re-encoded, which also strips EXIF/GPS metadata.
export const IMAGE_RULES = {
  maxBytes:      5 * 1024 * 1024,
  formats:       ['jpeg', 'png', 'webp'] as const,
  minWidth:      600,
  minHeight:     315,
  maxInputSide:  8000,
  maxOutputWidth: 1600,
};

export interface ProcessedImage { buffer: Buffer; width: number; height: number; mime: 'image/webp' }

export async function validateAndNormalize(input: Buffer): Promise<ProcessedImage> {
  if (!input?.length) throw new AppError(400, 'No image received.');
  if (input.length > IMAGE_RULES.maxBytes) throw new AppError(413, 'Image is too large. The limit is 5 MB.', 'IMAGE_TOO_LARGE');

  let meta: sharp.Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: IMAGE_RULES.maxInputSide * IMAGE_RULES.maxInputSide }).metadata();
  } catch {
    throw new AppError(415, 'This file is not a valid image.', 'IMAGE_INVALID');
  }
  if (!meta.format || !(IMAGE_RULES.formats as readonly string[]).includes(meta.format)) {
    throw new AppError(415, 'Only JPEG, PNG and WebP images are allowed.', 'IMAGE_FORMAT');
  }
  if ((meta.pages ?? 1) > 1) throw new AppError(415, 'Animated images are not allowed.', 'IMAGE_ANIMATED');

  // Account for EXIF rotation when checking size
  const rotated = (meta.orientation ?? 1) >= 5;
  const width  = (rotated ? meta.height : meta.width) ?? 0;
  const height = (rotated ? meta.width : meta.height) ?? 0;
  if (width < IMAGE_RULES.minWidth || height < IMAGE_RULES.minHeight) {
    throw new AppError(422, `Image is too small. It must be at least ${IMAGE_RULES.minWidth}×${IMAGE_RULES.minHeight} pixels.`, 'IMAGE_TOO_SMALL');
  }
  if (width > IMAGE_RULES.maxInputSide || height > IMAGE_RULES.maxInputSide) {
    throw new AppError(422, `Image is too big. Each side must be at most ${IMAGE_RULES.maxInputSide} pixels.`, 'IMAGE_DIMENSIONS');
  }
  const ratio = width / height;
  if (ratio > 4 || ratio < 0.25) throw new AppError(422, 'Image is too narrow or too tall.', 'IMAGE_RATIO');

  try {
    const { data, info } = await sharp(input, { limitInputPixels: IMAGE_RULES.maxInputSide * IMAGE_RULES.maxInputSide })
      .rotate()
      .resize({ width: IMAGE_RULES.maxOutputWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height, mime: 'image/webp' };
  } catch {
    throw new AppError(415, 'This image could not be processed.', 'IMAGE_INVALID');
  }
}
