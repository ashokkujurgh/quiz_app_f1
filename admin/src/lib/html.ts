import DOMPurify from 'dompurify';

// Post content is either rich HTML (rich text editor / AI posts) or legacy plain text.
// Kept in step with quizapp/src/app/utils/html.ts and post-service/src/utils/html.ts.

const HTML_RE = /<\/?(p|h[1-6]|ul|ol|li|strong|em|b|i|u|s|br|blockquote|pre|code|a|hr|table)\b/i;

export const isHtml = (content: string | null | undefined): boolean => !!content && HTML_RE.test(content);

export function htmlToText(content: string | null | undefined): string {
  if (!content) return '';
  if (!isHtml(content)) return content.trim();
  const withBreaks = content
    .replace(/<\/(p|h[1-6]|li|blockquote|pre|tr)>/gi, '$&\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const doc = new DOMParser().parseFromString(withBreaks, 'text/html');
  return (doc.body.textContent ?? '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Legacy plain text → HTML paragraphs, so the rich editor keeps its line breaks. */
export function plainToHtml(text: string): string {
  if (!text || isHtml(text)) return text ?? '';
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`).join('');
}

export const sanitizeHtml = (html: string) => DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'ul', 'ol', 'li',
                 'code', 'pre', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
});
