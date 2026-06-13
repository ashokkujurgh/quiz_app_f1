import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

function buildEndpoint(): string {
  const raw    = process.env.DO_SPACES_ENDPOINT ?? '';
  const bucket = process.env.DO_SPACES_BUCKET ?? '';
  return raw.replace(`${bucket}.`, '');
}

export const s3Client = new S3Client({
  endpoint: buildEndpoint(),
  region:   'us-east-1', // required by AWS SDK; DO ignores the value but the SDK validates it
  credentials: {
    accessKeyId:     process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false,
});

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE      = 5 * 1024 * 1024; // 5 MB

export const quizImageUploader = multer({
  storage: multerS3({
    s3:          s3Client,
    bucket:      process.env.DO_SPACES_BUCKET!,
    acl:         'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req: Request, file: Express.Multer.File, cb: (err: Error | null, key: string) => void) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `quiz-images/${uuidv4()}${ext}`);
    },
  }),
  limits:     { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    ALLOWED_TYPES.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG, PNG, GIF and WebP are allowed.'));
  },
});

export const deleteImageByUrl = async (url: string): Promise<void> => {
  try {
    const cdnUrl   = process.env.DO_SPACES_CDN_URL ?? '';
    const endpoint = process.env.DO_SPACES_ENDPOINT ?? '';
    const bucket   = process.env.DO_SPACES_BUCKET ?? '';
    const key = url.replace(`${cdnUrl}/`, '').replace(`${endpoint}/${bucket}/`, '');
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.error('Spaces delete error:', (err as Error).message);
  }
};
