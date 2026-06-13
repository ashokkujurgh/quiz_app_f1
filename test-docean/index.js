require('dotenv').config();
const express  = require('express');
const multer   = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const BUCKET   = process.env.DO_SPACES_BUCKET;
const ENDPOINT = `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`;

console.log('Endpoint :', ENDPOINT);
console.log('Bucket   :', BUCKET);
console.log('Key      :', process.env.DO_SPACES_KEY);

const s3 = new S3Client({
  endpoint      : ENDPOINT,
  region        : 'us-east-1',
  forcePathStyle: false,
  credentials   : {
    accessKeyId    : process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

(async () => {
  try {
    await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 1 }));
    console.log('✅ Connection OK');
  } catch (err) {
    console.error('❌ Connection FAILED:', err.message);
  }
})();

const app = express();

// Fix: set contentType manually instead of AUTO_CONTENT_TYPE (causes sig mismatch on DO)
const upload = multer({
  storage: multerS3({
    s3,
    bucket        : BUCKET,
    acl           : 'public-read',
    contentType   : (_req, file, cb) => cb(null, file.mimetype),
    key           : (_req, file, cb) => cb(null, `test-uploads/${Date.now()}-${file.originalname}`),
  }),
  limits    : { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/gif','image/webp'].includes(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only JPEG / PNG / GIF / WebP allowed'));
  },
});

app.post('/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) return res.status(400).json({ success: false, error: 'No file sent' });
    console.log('✅ Uploaded:', req.file.location);
    res.json({ success: true, url: req.file.location });
  });
});

app.listen(3333, () => console.log('Server → http://localhost:3333\nPOST /upload — form-data key: image'));
