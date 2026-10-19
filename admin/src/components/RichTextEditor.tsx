import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/** Rich text editor (TipTap) for posts. Emits HTML; the post-service sanitises it again on save. */
export default function RichTextEditor({ value, onChange, placeholder = 'Write your post…' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (value !== current) editor.commands.setContent(value || '', false);
  }, [value, editor]);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 bg-white dark:bg-gray-800">
      {editor && <Toolbar editor={editor} />}
      <div className="rich-content rich-editor px-3 py-2 text-sm">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL (https://…)', prev ?? 'https://');
    if (url === null) return;
    if (!url || url === 'https://') { editor.chain().focus().unsetLink().run(); return; }
    if (!/^(https?:|mailto:)/i.test(url)) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const btn = (label: string, title: string, active: boolean, run: () => void, disabled = false, extra = '') => (
    <button
      key={title}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={run}
      className={`min-w-8 h-8 px-2 rounded-lg text-sm transition-colors disabled:opacity-30 ${extra} ${
        active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-0.5 p-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
      {btn('H2', 'Heading', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), false, 'font-bold')}
      {btn('H3', 'Subheading', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), false, 'font-semibold')}
      {btn('B', 'Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), false, 'font-bold')}
      {btn('I', 'Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), false, 'italic')}
      {btn('S', 'Strikethrough', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), false, 'line-through')}
      {btn('• List', 'Bulleted list', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
      {btn('1. List', 'Numbered list', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
      {btn('❝', 'Quote', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run())}
      {btn('</>', 'Code block', editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), false, 'font-mono')}
      {btn('Link', editor.isActive('link') ? 'Edit link' : 'Add link', editor.isActive('link'), setLink)}
      {btn('Unlink', 'Remove link', false, () => editor.chain().focus().unsetLink().run(), !editor.isActive('link'))}
      {btn('↶', 'Undo', false, () => editor.chain().focus().undo().run(), !editor.can().undo())}
      {btn('↷', 'Redo', false, () => editor.chain().focus().redo().run(), !editor.can().redo())}
    </div>
  );
}
