// Post content is either rich HTML (rich text editor / AI posts) or legacy plain text.

const HTML_RE = /<\/?(p|h[1-6]|ul|ol|li|strong|em|b|i|u|s|br|blockquote|pre|code|a|hr|table)\b/i;

export const isHtml = (content: string | null | undefined): boolean => !!content && HTML_RE.test(content);

/** Plain text of a post (for previews, word counts and "is it empty?" checks). */
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
