import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'https';

// DigitalOcean Spaces — same bucket and settings as auth/quiz/message services.

export function isStorageConfigured(): boolean {
  return !!(process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET && process.env.DO_SPACES_ENDPOINT && process.env.DO_SPACES_BUCKET && process.env.DO_SPACES_CDN_URL);
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (client) return client;
  const bucket = process.env.DO_SPACES_BUCKET ?? '';
  client = new S3Client({
    // The endpoint must be region-only (strip a bucket subdomain if present)
    endpoint: (process.env.DO_SPACES_ENDPOINT ?? '').replace(`${bucket}.`, ''),
    region: 'us-east-1',
    credentials: { accessKeyId: process.env.DO_SPACES_KEY!, secretAccessKey: process.env.DO_SPACES_SECRET! },
    forcePathStyle: false,
    requestHandler: new NodeHttpHandler({ httpsAgent: new Agent({ family: 4 }) }), // Docker: IPv4 only
  });
  return client;
}

export async function putPublicObject(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3().send(new PutObjectCommand({
    Bucket: process.env.DO_SPACES_BUCKET!, Key: key, Body: body, ContentType: contentType,
    ACL: 'public-read', CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${process.env.DO_SPACES_CDN_URL}/${key}`;
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET!, Key: key }));
  } catch (err) {
    console.error('Spaces delete error:', (err as Error).message);
  }
}
