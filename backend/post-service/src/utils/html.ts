import sanitizeHtml from 'sanitize-html';

// Post content can be rich HTML (rich text editor / AI posts) or legacy plain text.
// HTML is always sanitised on the server against a strict allow-list before it is stored.

const looksLikeHtml = (s: string) => /<\/?(p|h[1-6]|ul|ol|li|strong|em|b|i|u|s|br|blockquote|pre|code|a|hr|table)\b/i.test(s);

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's',
    'blockquote', 'ul', 'ol', 'li', 'code', 'pre', 'a', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  // h1 is reserved for the page title — demote to h2
  transformTags: {
    h1: 'h2',
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }),
  },
  disallowedTagsMode: 'discard',
};

/** Sanitise rich HTML; plain text is returned unchanged. */
export function sanitizePostContent(content: string): string {
  const trimmed = content.trim();
  return looksLikeHtml(trimmed) ? sanitizeHtml(trimmed, OPTIONS).trim() : trimmed;
}

/** Plain text for moderation, slugs, notifications, search snippets and SEO. */
export function toPlainText(content: string): string {
  if (!looksLikeHtml(content)) return content.trim();
  const withBreaks = content
    .replace(/<\/(p|h[2-4]|li|blockquote|pre|tr)>/gi, '$&\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const text = sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} });
  return text
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
