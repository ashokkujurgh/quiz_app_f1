import { useMemo } from 'react';
import { isHtml, sanitizeHtml } from '../lib/html';

/** Post content as it will appear: sanitised rich HTML, or legacy plain text. */
export default function RichHtml({ content, className = '' }: { content: string; className?: string }) {
  const html = useMemo(() => (isHtml(content) ? sanitizeHtml(content) : null), [content]);
  if (html === null) {
    return <p className={`text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap ${className}`}>{content}</p>;
  }
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
