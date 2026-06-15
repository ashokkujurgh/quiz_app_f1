import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'https';
import multer from 'multer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multerS3 = require('multer-s3');
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

function buildEndpoint(): string {
  const raw    = process.env.DO_SPACES_ENDPOINT ?? '';
  const bucket = process.env.DO_SPACES_BUCKET   ?? '';
  return raw.replace(`${bucket}.`, '');
}

export const s3Client = new S3Client({
  endpoint: buildEndpoint(),
  region:   'us-east-1',
  credentials: {
    accessKeyId:     process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false,
  requestHandler: new NodeHttpHandler({
    httpsAgent: new Agent({ family: 4 }),
  }),
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export const messageImageUpload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.DO_SPACES_BUCKET!,
    acl: 'public-read',
    contentType: (_req, file, cb) => cb(null, file.mimetype),
    key: (_req: Request, file: { originalname: string }, cb: (error: Error | null, key: string) => void) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `message-images/${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});
