import Post from '../models/Post';

// URL slugs for posts (a-z, 0-9 and dashes; max 80 chars), unique across all posts.
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 0;
  while (await Post.exists({ slug })) {
    n++;
    slug = `${base}-${n}`;
  }
  return slug;
}
