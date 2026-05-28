'use client';

/**
 * Rich text editor built on TipTap.
 *
 * Why TipTap: the contentEditable+execCommand version we shipped first
 * was buggy — selection got lost when opening dropdowns and the custom
 * font-size logic nested spans. TipTap manages selection cleanly.
 *
 * Editor typography is set to match the player (Newsreader serif at
 * ~20 px on a light surface) so the admin view is WYSIWYG.
 *
 * Marks supported:
 *   - bold / italic (starter kit)
 *   - color (via @tiptap/extension-text-style + extension-color)
 *   - font size (custom mark below — same textStyle node, adds a
 *     fontSize attribute and renders it as inline style)
 */

import { useEffect, useReducer } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { Mark } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const COLORS: Array<{ name: string; value: string | null }> = [
  { name: 'Default', value: null },
  { name: 'Black',   value: '#1c1917' },
  { name: 'Red',     value: '#b91c1c' },
  { name: 'Crimson', value: '#8b2538' },
  { name: 'Amber',   value: '#b8752b' },
  { name: 'Green',   value: '#15803d' },
  { name: 'Teal',    value: '#0f766e' },
  { name: 'Blue',    value: '#1d4ed8' },
  { name: 'Indigo',  value: '#4338ca' },
];

const SIZES: Array<{ label: string; value: string | null }> = [
  { label: 'Default', value: null },
  { label: 'S',  value: '14px' },
  { label: 'M',  value: '18px' },
  { label: 'L',  value: '24px' },
  { label: 'XL', value: '36px' },
];

// Standalone fontSize mark. Wraps the selection in
// <span style="font-size: Xpx">. Reapplying replaces — TipTap merges
// same-type marks. Independent of textStyle so it doesn't fight Color.
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Mark.create({
  name: 'fontSize',

  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attrs: { fontSize?: string | null }) =>
          attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        style: 'font-size',
        getAttrs: (value: string) => (value ? { fontSize: value } : false),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { fontSize: size }),
      unsetFontSize:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 140,
}: Props) {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color, FontSize],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none px-3 py-3 leading-relaxed',
        style: `min-height: ${minHeight}px; font-family: var(--font-newsreader), Georgia, serif; font-size: 20px; color: #3a3a32;`,
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  // External value changes (e.g. switching screens) reset the editor.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value || '');
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className="border border-stone-300 rounded bg-white"
        style={{ minHeight }}
      />
    );
  }

  return (
    <div className="border border-stone-300 rounded bg-white">
      <Toolbar editor={editor} />
      <div className="relative">
        {editor.isEmpty && placeholder && (
          <div
            className="absolute top-3 left-3 text-stone-400 pointer-events-none"
            style={{
              fontFamily: 'var(--font-newsreader), Georgia, serif',
              fontSize: '20px',
            }}
            aria-hidden
          >
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ───── Toolbar ────────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  // Force re-renders on selection/transaction so active styling tracks.
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const update = () => tick();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  const isBold = editor.isActive('bold');
  const isItalic = editor.isActive('italic');
  const currentColor = (editor.getAttributes('textStyle').color as string) || '';
  const currentSize =
    (editor.getAttributes('fontSize').fontSize as string) || '';

  return (
    <div className="flex items-center gap-1 px-1.5 py-1 border-b border-stone-200 bg-stone-50 rounded-t text-sm flex-wrap">
      <Btn
        active={isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="B"
        bold
      />
      <Btn
        active={isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="I"
        italic
      />

      <Divider />

      <select
        value={currentColor || ''}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) editor.chain().focus().unsetColor().run();
          else editor.chain().focus().setColor(v).run();
        }}
        className="text-xs px-1.5 py-1 border border-stone-300 rounded bg-white"
        title="Text color"
        style={{ color: currentColor || undefined, fontWeight: 600 }}
      >
        {COLORS.map((c) => (
          <option
            key={c.name}
            value={c.value ?? ''}
            style={{ color: c.value || 'inherit' }}
          >
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={currentSize || ''}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) editor.chain().focus().unsetFontSize().run();
          else editor.chain().focus().setFontSize(v).run();
        }}
        className="text-xs px-1.5 py-1 border border-stone-300 rounded bg-white"
        title="Font size"
      >
        {SIZES.map((s) => (
          <option key={s.label} value={s.value ?? ''}>
            {s.label}
          </option>
        ))}
      </select>

      <Divider />

      <Btn
        onClick={() => editor.chain().focus().undo().run()}
        label="↺"
        ariaLabel="Undo"
      />
      <Btn
        onClick={() => editor.chain().focus().redo().run()}
        label="↻"
        ariaLabel="Redo"
      />
      <Btn
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        label="Clear"
        ariaLabel="Clear formatting"
      />
    </div>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-stone-300 mx-1" />;
}

interface BtnProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  bold?: boolean;
  italic?: boolean;
  ariaLabel?: string;
}

function Btn({
  label,
  onClick,
  active = false,
  bold = false,
  italic = false,
  ariaLabel,
}: BtnProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-7 h-7 inline-flex items-center justify-center rounded text-stone-700 ${
        active ? 'bg-stone-300' : 'hover:bg-stone-200'
      }`}
      style={{
        fontWeight: bold ? 700 : undefined,
        fontStyle: italic ? 'italic' : undefined,
      }}
    >
      {label}
    </button>
  );
}
