'use client';

/**
 * Lightweight rich text editor — contentEditable + a small toolbar.
 * Per-selection formatting (bold, italic, color, size) — exactly what
 * the author asked for. Output is HTML, stored as a string.
 *
 * Uses document.execCommand under the hood. It's "deprecated" but
 * universally supported and good enough for an admin tool. If we ever
 * outgrow it (mobile editing, structured paste, undo polish), swap in
 * TipTap and keep the same prop signature.
 */

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const COLORS = [
  { name: 'Default', value: 'inherit' },
  { name: 'Black',   value: '#1c1917' },
  { name: 'Red',     value: '#b91c1c' },
  { name: 'Crimson', value: '#8b2538' },
  { name: 'Amber',   value: '#b8752b' },
  { name: 'Green',   value: '#15803d' },
  { name: 'Teal',    value: '#0f766e' },
  { name: 'Blue',    value: '#1d4ed8' },
  { name: 'Indigo',  value: '#4338ca' },
];

const SIZES: Array<{ label: string; px: number }> = [
  { label: 'S',  px: 14 },
  { label: 'M',  px: 18 },
  { label: 'L',  px: 24 },
  { label: 'XL', px: 36 },
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 120,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>(value);
  const [colorOpen, setColorOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);

  // Mount the initial value once. After that, the contentEditable owns
  // the DOM and we don't push prop changes back in (would lose caret).
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      lastEmitted.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command: string, arg?: string) {
    // Make sure the selection is in our editor before applying.
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emit();
    setColorOpen(false);
    setSizeOpen(false);
  }

  function applyFontSize(px: number) {
    // execCommand fontSize only takes 1-7; do it ourselves with a span.
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      // Nothing selected — change subsequent typing by leaving a
      // styled span at the caret.
      const span = document.createElement('span');
      span.style.fontSize = `${px}px`;
      span.appendChild(document.createTextNode('​'));
      sel?.getRangeAt(0).insertNode(span);
      const range = document.createRange();
      range.setStart(span.firstChild!, 1);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    } else {
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = `${px}px`;
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    emit();
    setSizeOpen(false);
    setColorOpen(false);
  }

  function emit() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    if (html === lastEmitted.current) return;
    lastEmitted.current = html;
    onChange(html);
  }

  return (
    <div className="border border-stone-300 rounded bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-1.5 py-1 border-b border-stone-200 bg-stone-50 rounded-t text-sm">
        <ToolBtn label="B" onClick={() => exec('bold')} bold />
        <ToolBtn label="I" onClick={() => exec('italic')} italic />

        <div className="w-px h-5 bg-stone-300 mx-1" />

        {/* Color */}
        <div className="relative">
          <ToolBtn
            label="A"
            onClick={() => { setColorOpen((v) => !v); setSizeOpen(false); }}
            style={{ textDecoration: 'underline' }}
            aria-label="Text color"
          />
          {colorOpen && (
            <div className="absolute z-10 mt-1 p-2 bg-white border border-stone-300 rounded shadow-lg grid grid-cols-3 gap-1.5 w-44">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() =>
                    c.value === 'inherit'
                      ? exec('removeFormat')
                      : exec('foreColor', c.value)
                  }
                  className="flex items-center gap-1 text-[11px] px-1.5 py-1 border border-stone-200 rounded hover:bg-stone-50"
                  title={c.name}
                >
                  <span
                    className="w-3 h-3 rounded-sm border border-stone-300"
                    style={{
                      background: c.value === 'inherit' ? 'white' : c.value,
                    }}
                  />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Size */}
        <div className="relative">
          <ToolBtn
            label="Aa"
            onClick={() => { setSizeOpen((v) => !v); setColorOpen(false); }}
            aria-label="Font size"
          />
          {sizeOpen && (
            <div className="absolute z-10 mt-1 p-1 bg-white border border-stone-300 rounded shadow-lg grid grid-cols-1 gap-0.5 w-24">
              {SIZES.map((s) => (
                <button
                  key={s.px}
                  type="button"
                  onClick={() => applyFontSize(s.px)}
                  className="text-left px-2 py-1 rounded hover:bg-stone-100 text-stone-800"
                  style={{ fontSize: `${Math.min(s.px, 22)}px`, lineHeight: 1.2 }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-stone-300 mx-1" />

        <ToolBtn label="↺" onClick={() => exec('undo')} aria-label="Undo" />
        <ToolBtn label="↻" onClick={() => exec('redo')} aria-label="Redo" />
        <ToolBtn
          label="Clear"
          onClick={() => exec('removeFormat')}
          aria-label="Clear formatting"
        />
      </div>

      {/* Editor */}
      <div className="relative">
        {value === '' && placeholder && (
          <div
            className="absolute top-3 left-3 text-stone-400 pointer-events-none text-sm"
            aria-hidden
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          className="px-3 py-2.5 text-base focus:outline-none"
          style={{
            minHeight,
            // Reset Prose colors so applied colors stick.
            color: 'inherit',
          }}
        />
      </div>
    </div>
  );
}

interface ToolBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  bold?: boolean;
  italic?: boolean;
}

function ToolBtn({
  label,
  bold,
  italic,
  onClick,
  style,
  ...rest
}: ToolBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()} // don't lose selection
      className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-stone-200 text-stone-700"
      style={{
        fontWeight: bold ? 700 : undefined,
        fontStyle: italic ? 'italic' : undefined,
        ...style,
      }}
      {...rest}
    >
      {label}
    </button>
  );
}
