import { Router } from 'express';
import { renderPostPage, sitemap, indexNowKeyFile } from '../controllers/seoController';

// Public SEO endpoints, reached through the frontend nginx
// (/posts/:slug, /sitemap.xml, /<key>.txt). Mounted before helmet() in server.ts,
// because these return the SPA's own HTML, which needs its normal browser policies.
const router = Router();

router.get('/posts/:slug',       renderPostPage);
router.get('/sitemap.xml',       sitemap);
router.get('/indexnow/:key.txt', indexNowKeyFile);

export default router;
