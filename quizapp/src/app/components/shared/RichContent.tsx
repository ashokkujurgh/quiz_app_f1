import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Box, Typography, alpha, type Theme } from '@mui/material';
import { isHtml } from '../../utils/html';

// Same allow-list as the server (post-service/src/utils/html.ts) — defence in depth.
const PURIFY = {
  ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'ul', 'ol', 'li',
                 'code', 'pre', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

/** Article typography for rich post content (also used inside the editor). */
export const richContentSx = (t: Theme) => ({
  color: 'text.primary',
  fontSize: { xs: '1rem', sm: '1.0625rem' },
  lineHeight: 1.8,
  wordBreak: 'break-word' as const,
  '& > *:first-of-type': { mt: 0 },
  '& p': { my: 1.25 },
  '& h2': { fontSize: { xs: '1.25rem', sm: '1.4rem' }, fontWeight: 800, lineHeight: 1.3, mt: 3.5, mb: 1.25, letterSpacing: '-0.01em' },
  '& h3': { fontSize: { xs: '1.1rem', sm: '1.2rem' }, fontWeight: 700, lineHeight: 1.35, mt: 2.75, mb: 1 },
  '& h4': { fontSize: '1.05rem', fontWeight: 700, mt: 2.25, mb: 0.75 },
  // Tailwind's preflight removes list markers — restore them inside post content
  '& ul, & ol': { pl: 3, my: 1.25 },
  '& ul': { listStyleType: 'disc' },
  '& ol': { listStyleType: 'decimal' },
  '& ul ul': { listStyleType: 'circle' },
  '& li': { my: 0.5, pl: 0.5 },
  '& li::marker': { color: t.palette.secondary.main, fontWeight: 700 },
  '& strong, & b': { fontWeight: 700 },
  '& a': { color: t.palette.mode === 'dark' ? t.palette.primary.main : t.palette.secondary.dark, fontWeight: 600, textUnderlineOffset: 3 },
  '& blockquote': {
    m: 0, my: 2, py: 1, px: 2,
    borderLeft: `4px solid ${t.palette.secondary.main}`,
    bgcolor: alpha(t.palette.secondary.main, 0.08),
    borderRadius: '0 8px 8px 0',
    color: 'text.secondary',
  },
  '& code': {
    fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, Menlo, Consolas, monospace',
    fontSize: '0.875em',
    px: 0.75, py: 0.25, borderRadius: 1,
    bgcolor: alpha(t.palette.text.primary, 0.07),
  },
  '& pre': {
    my: 2, p: 2, borderRadius: 2, overflowX: 'auto',
    bgcolor: '#0F1B45', color: '#E8ECF8',
    fontSize: '0.875rem', lineHeight: 1.65,
  },
  '& pre code': { p: 0, bgcolor: 'transparent', color: 'inherit', fontSize: 'inherit' },
  '& hr': { border: 0, borderTop: `1px solid ${t.palette.divider}`, my: 3 },
  '& table': { width: '100%', borderCollapse: 'collapse', my: 2, fontSize: '0.95em', display: 'block', overflowX: 'auto' },
  '& th, & td': { border: `1px solid ${t.palette.divider}`, px: 1.5, py: 1, textAlign: 'left' },
  '& th': { bgcolor: alpha(t.palette.text.primary, 0.05), fontWeight: 700 },
});

/** Renders post content: sanitised rich HTML, or legacy plain text as before. */
export function RichContent({ content }: { content: string }) {
  const html = useMemo(() => (isHtml(content) ? DOMPurify.sanitize(content, PURIFY) : null), [content]);

  if (html === null) {
    return (
      <Typography variant="body1" sx={{ lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
        {content}
      </Typography>
    );
  }
  return <Box className="rich-content" sx={richContentSx} dangerouslySetInnerHTML={{ __html: html }} />;
}
