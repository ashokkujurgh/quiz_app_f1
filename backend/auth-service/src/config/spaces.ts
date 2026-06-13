import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'https';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

// DO Spaces endpoint must be https://{region}.digitaloceanspaces.com (no bucket prefix).
// If the env var contains the bucket subdomain (e.g. bucket.region.digitaloceanspaces.com),
// strip it down to the region-only endpoint.
function buildEndpoint(): string {
  const raw = process.env.DO_SPACES_ENDPOINT ?? '';
  const bucket = process.env.DO_SPACES_BUCKET ?? '';
  // Remove bucket subdomain if present: "https://bucket.region.do..." → "https://region.do..."
  return raw.replace(`${bucket}.`, '');
}

export const s3Client = new S3Client({
  endpoint: buildEndpoint(),
  region: 'us-east-1',
  credentials: {
    accessKeyId:     process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false,
  // Force IPv4 — Docker containers can't route IPv6 to external hosts
  requestHandler: new NodeHttpHandler({
    httpsAgent: new Agent({ family: 4 }),
  }),
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

/**
 * Create a multer uploader that stores files in DigitalOcean Spaces
 */
export const createUploader = (folder = 'uploads'): multer.Multer => {
  return multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.DO_SPACES_BUCKET!,
      acl: 'public-read',
      contentType: (_req, file, cb) => cb(null, file.mimetype),
      key: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, key: string) => void) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${folder}/${uuidv4()}${ext}`);
      },
    }),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter,
  });
};

/**
 * Delete a file from Spaces by its public URL
 */
export const deleteFileByUrl = async (fileUrl: string): Promise<boolean> => {
  try {
    const cdnUrl = process.env.DO_SPACES_CDN_URL ?? '';
    const endpoint = process.env.DO_SPACES_ENDPOINT ?? '';
    const bucket = process.env.DO_SPACES_BUCKET ?? '';

    const key = fileUrl
      .replace(`${cdnUrl}/`, '')
      .replace(`${endpoint}/${bucket}/`, '');

    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    console.error('Spaces delete error:', (err as Error).message);
    return false;
  }
};

export const getPublicUrl = (key: string): string =>
  `${process.env.DO_SPACES_CDN_URL}/${key}`;
