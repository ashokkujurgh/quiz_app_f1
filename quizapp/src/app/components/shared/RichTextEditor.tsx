import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Box, Divider, IconButton, Tooltip, alpha } from '@mui/material';
import {
  FormatBold, FormatItalic, FormatStrikethrough, FormatListBulleted, FormatListNumbered,
  FormatQuote, Code, Title, Link as LinkIcon, LinkOff, Undo, Redo,
} from '@mui/icons-material';
import { richContentSx } from './RichContent';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

/** Rich text editor (TipTap) for posts. Emits HTML; the server sanitises it again on save. */
export function RichTextEditor({ value, onChange, placeholder = 'Write something…', minHeight = 160 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    // Empty editor = "" (not "<p></p>") so required-field checks keep working
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });

  // Keep the editor in sync when the parent resets or loads a value (e.g. opening an edit form)
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (value !== current) editor.commands.setContent(value || '', false);
  }, [value, editor]);

  return (
    <Box sx={(t) => ({
      border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden',
      '&:focus-within': { borderColor: 'primary.main', boxShadow: `0 0 0 1px ${t.palette.primary.main}` },
    })}>
      {editor && <Toolbar editor={editor} />}
      <Divider />
      <Box sx={(t) => ({
        ...richContentSx(t),
        px: 1.5, py: 1,
        '& .ProseMirror': { minHeight, outline: 'none' },
        '& .ProseMirror p.is-editor-empty:first-of-type::before': {
          content: 'attr(data-placeholder)', color: t.palette.text.disabled, float: 'left', height: 0, pointerEvents: 'none',
        },
      })}>
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL (https://…)', prev ?? 'https://');
    if (url === null) return;
    if (!url || url === 'https://') { editor.chain().focus().unsetLink().run(); return; }
    if (!/^(https?:|mailto:)/i.test(url)) return; // only safe link types
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const buttons: { title: string; icon: JSX.Element; active?: boolean; run: () => void; disabled?: boolean }[] = [
    { title: 'Heading', icon: <Title fontSize="small" />, active: editor.isActive('heading', { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { title: 'Bold', icon: <FormatBold fontSize="small" />, active: editor.isActive('bold'), run: () => editor.chain().focus().toggleBold().run() },
    { title: 'Italic', icon: <FormatItalic fontSize="small" />, active: editor.isActive('italic'), run: () => editor.chain().focus().toggleItalic().run() },
    { title: 'Strikethrough', icon: <FormatStrikethrough fontSize="small" />, active: editor.isActive('strike'), run: () => editor.chain().focus().toggleStrike().run() },
    { title: 'Bulleted list', icon: <FormatListBulleted fontSize="small" />, active: editor.isActive('bulletList'), run: () => editor.chain().focus().toggleBulletList().run() },
    { title: 'Numbered list', icon: <FormatListNumbered fontSize="small" />, active: editor.isActive('orderedList'), run: () => editor.chain().focus().toggleOrderedList().run() },
    { title: 'Quote', icon: <FormatQuote fontSize="small" />, active: editor.isActive('blockquote'), run: () => editor.chain().focus().toggleBlockquote().run() },
    { title: 'Code block', icon: <Code fontSize="small" />, active: editor.isActive('codeBlock'), run: () => editor.chain().focus().toggleCodeBlock().run() },
    { title: editor.isActive('link') ? 'Edit link' : 'Add link', icon: <LinkIcon fontSize="small" />, active: editor.isActive('link'), run: setLink },
    { title: 'Remove link', icon: <LinkOff fontSize="small" />, run: () => editor.chain().focus().unsetLink().run(), disabled: !editor.isActive('link') },
    { title: 'Undo', icon: <Undo fontSize="small" />, run: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo() },
    { title: 'Redo', icon: <Redo fontSize="small" />, run: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo() },
  ];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, px: 0.5, py: 0.5, bgcolor: 'action.hover' }}>
      {buttons.map((b) => (
        <Tooltip key={b.title} title={b.title}>
          <span>
            <IconButton
              size="small"
              onClick={b.run}
              disabled={b.disabled}
              aria-label={b.title}
              aria-pressed={b.active}
              sx={(t) => ({
                borderRadius: 1.5,
                color: b.active ? 'primary.main' : 'text.secondary',
                bgcolor: b.active ? alpha(t.palette.primary.main, 0.12) : 'transparent',
              })}
            >
              {b.icon}
            </IconButton>
          </span>
        </Tooltip>
      ))}
    </Box>
  );
}
