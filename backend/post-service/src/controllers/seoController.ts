import { Request, Response, RequestHandler } from 'express';
import mongoose from 'mongoose';
import Post, { IPost } from '../models/Post';

// ── SEO for public post pages ────────────────────────────────────────────────
// Follows Google Search guidelines:
// • Only approved, active posts are listed in the sitemap or marked indexable.
// • Post pages get their real title/description/canonical/OG tags and Article
//   structured data in the initial HTML. The same HTML is served to every
//   visitor (no user-agent sniffing → no cloaking), and the structured data
//   only describes content that is visible on the page.

const SITE_URL     = (process.env.SITE_URL ?? 'https://meenzo.com').replace(/\/$/, '');
const FRONTEND_URL = (process.env.FRONTEND_INTERNAL_URL ?? 'http://frontend').replace(/\/$/, '');
const INDEXNOW_KEY = process.env.INDEXNOW_KEY ?? '';

const postUrl = (slug: string) => `${SITE_URL}/posts/${encodeURIComponent(slug)}`;

const escAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escXml = escAttr;

const isPublic = (post: Pick<IPost, 'approvalStatus' | 'isActive' | 'slug'>) =>
  post.approvalStatus === 'approved' && post.isActive !== false && !!post.slug;

// ── SPA shell (index.html), cached briefly ───────────────────────────────────

let shellCache: { html: string; at: number } | null = null;

async function getShell(): Promise<string> {
  if (shellCache && Date.now() - shellCache.at < 60_000) return shellCache.html;
  const res = await fetch(`${FRONTEND_URL}/index.html`, { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw new Error(`index.html fetch failed: ${res.status}`);
  const html = await res.text();
  shellCache = { html, at: Date.now() };
  return html;
}

function plainText(content: string, max: number): string {
  const text = content.replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : text;
}

function buildHead(post: IPost): string {
  const url     = postUrl(post.slug!);
  const seo     = post.seo;
  const title   = seo?.metaTitle || post.title || `${post.topic} — Meenzo`;
  const desc    = seo?.metaDescription || plainText(post.content, 155);
  const ogTitle = seo?.ogTitle || post.title || title;
  const ogDesc  = seo?.ogDescription || desc;
  const images  = [post.image, ...(post.images ?? [])].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
  const image   = seo?.ogImage || images[0] || null;
  const published = post.createdAt.toISOString();
  const modified  = post.updatedAt.toISOString();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: (post.title || title).slice(0, 110),
    description: desc,
    ...(images.length ? { image: images } : {}),
    datePublished: published,
    dateModified: modified,
    author: { '@type': 'Person', name: post.author?.name || 'Meenzo' },
    publisher: { '@type': 'Organization', name: 'Meenzo', url: SITE_URL },
    mainEntityOfPage: url,
    ...(post.topic ? { articleSection: post.topic } : {}),
    ...(seo?.keywords?.length ? { keywords: seo.keywords.join(', ') } : {}),
  };

  const tags = [
    `<title>${escAttr(title)}</title>`,
    `<meta name="description" content="${escAttr(desc)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<link rel="canonical" href="${escAttr(url)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="Meenzo" />`,
    `<meta property="og:url" content="${escAttr(url)}" />`,
    `<meta property="og:title" content="${escAttr(ogTitle)}" />`,
    `<meta property="og:description" content="${escAttr(ogDesc)}" />`,
    image ? `<meta property="og:image" content="${escAttr(image)}" />` : '',
    `<meta property="article:published_time" content="${published}" />`,
    `<meta property="article:modified_time" content="${modified}" />`,
    post.topic ? `<meta property="article:section" content="${escAttr(post.topic)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escAttr(ogTitle)}" />`,
    `<meta name="twitter:description" content="${escAttr(ogDesc)}" />`,
    image ? `<meta name="twitter:image" content="${escAttr(image)}" />` : '',
    // "<" escaped so post text can never close the script tag
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ];
  return tags.filter(Boolean).join('\n    ');
}

/** Replace the shell's generic title/description/robots with the post's own tags. */
function injectHead(shell: string, head: string): string {
  return shell
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace(/<meta\s+name="robots"[^>]*>\s*/i, '')
    .replace(/<\/head>/i, `    ${head}\n  </head>`);
}

// GET /seo/posts/:slug — HTML for a public post page
export const renderPostPage: RequestHandler = async (req: Request, res: Response) => {
  let shell: string;
  try {
    shell = await getShell();
  } catch (err) {
    console.error('[seo] could not load index.html:', err);
    res.status(502).send('Bad gateway');
    return;
  }

  try {
    const key = req.params.slug;
    const post = await Post.findOne(
      mongoose.Types.ObjectId.isValid(key) ? { $or: [{ slug: key }, { _id: key }] } : { slug: key }
    ).lean<IPost>();

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache');

    if (!post) {
      // Real 404 status (not a soft 404); the app still renders its own not-found view
      res.status(404).send(shell);
      return;
    }
    // Pending / rejected / inactive posts keep the shell's noindex
    if (!isPublic(post)) {
      res.send(shell);
      return;
    }
    // An ObjectId URL for a post that has a slug → send crawlers to the canonical slug URL
    if (key !== post.slug) {
      res.redirect(301, `/posts/${encodeURIComponent(post.slug!)}`);
      return;
    }
    res.send(injectHead(shell, buildHead(post)));
  } catch (err) {
    console.error('[seo] renderPostPage error:', err);
    res.set('Content-Type', 'text/html; charset=utf-8').send(shell);
  }
};

// GET /seo/sitemap.xml — every approved, active post
export const sitemap: RequestHandler = async (_req: Request, res: Response) => {
  try {
    const posts = await Post.find(
      { approvalStatus: 'approved', isActive: { $ne: false }, slug: { $ne: null } },
      { slug: 1, updatedAt: 1 }
    )
      .sort({ updatedAt: -1 })
      .limit(50_000) // sitemap protocol limit per file
      .lean();

    const urls = posts
      .map((p) => `  <url>\n    <loc>${escXml(postUrl(p.slug!))}</loc>\n    <lastmod>${p.updatedAt.toISOString()}</lastmod>\n  </url>`)
      .join('\n');

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  } catch (err) {
    console.error('[seo] sitemap error:', err);
    res.status(500).send('Sitemap unavailable');
  }
};

// GET /seo/indexnow/:key.txt — IndexNow key verification file
export const indexNowKeyFile: RequestHandler = (req: Request, res: Response) => {
  if (!INDEXNOW_KEY || req.params.key !== INDEXNOW_KEY) {
    res.status(404).send('Not found');
    return;
  }
  res.type('text/plain').send(INDEXNOW_KEY);
};

/**
 * Tell IndexNow search engines (Bing, Yandex, …) that a post URL is new or changed.
 * Google does not use IndexNow; it discovers posts through the sitemap.
 * Fire-and-forget: never throws.
 */
export async function notifyIndexNow(slug: string | null | undefined): Promise<void> {
  if (!INDEXNOW_KEY || !slug) return;
  const host = new URL(SITE_URL).host;
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: [postUrl(slug)],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    console.log(`[seo] IndexNow ${res.status} for ${postUrl(slug)}`);
  } catch (err) {
    console.error('[seo] IndexNow ping failed:', err);
  }
}
