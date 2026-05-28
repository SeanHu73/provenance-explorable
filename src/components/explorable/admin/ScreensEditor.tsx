'use client';

/**
 * Authoring UI for the Contextualisation Explainer screens.
 *
 * Compact list of screens with reorder + expand-to-edit. Two screen
 * kinds you can add: plain text (with optional image/GIF), and
 * multiple-choice question (with per-option response text and a
 * "correct" toggle).
 *
 * The EQ screen is appended automatically by the player and isn't
 * authored here.
 */

import { useState } from 'react';
import {
  Screen,
  TextScreen,
  QuestionScreen,
  QuestionOption,
  blankTextScreen,
  blankQuestionScreen,
  blankQuestionOption,
} from '@/lib/explorable/explainer-types';
import RichTextEditor from './RichTextEditor';
import SinglePhotoField from './SinglePhotoField';

interface Props {
  value: Screen[];
  onChange: (next: Screen[]) => void;
}

export default function ScreensEditor({ value, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function addText() {
    const s = blankTextScreen();
    onChange([...value, s]);
    setExpandedId(s.id);
  }

  function addQuestion() {
    const s = blankQuestionScreen();
    onChange([...value, s]);
    setExpandedId(s.id);
  }

  function patch(id: string, updates: Partial<Screen>) {
    onChange(
      value.map((s) =>
        s.id === id ? ({ ...s, ...updates } as Screen) : s,
      ),
    );
  }

  function remove(id: string) {
    if (!confirm('Delete this screen?')) return;
    onChange(value.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function move(id: string, dir: -1 | 1) {
    const idx = value.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <p className="text-xs text-stone-500 italic">
          No screens yet. Add text screens for narration and question
          screens for interactive multiple-choice moments. The Essential
          Question is shown automatically as the final screen.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((s, i) => (
            <li key={s.id} className="bg-white border border-stone-300 rounded">
              <ScreenRow
                screen={s}
                index={i}
                total={value.length}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                onMove={(dir) => move(s.id, dir)}
                onRemove={() => remove(s.id)}
                onPatch={(u) => patch(s.id, u)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={addText}
          className="px-3 py-1.5 rounded bg-blue-700 text-white text-sm hover:bg-blue-800"
        >
          + Text screen
        </button>
        <button
          type="button"
          onClick={addQuestion}
          className="px-3 py-1.5 rounded bg-indigo-700 text-white text-sm hover:bg-indigo-800"
        >
          + Question screen
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

interface RowProps {
  screen: Screen;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onPatch: (u: Partial<Screen>) => void;
}

function ScreenRow({
  screen,
  index,
  total,
  expanded,
  onToggle,
  onMove,
  onRemove,
  onPatch,
}: RowProps) {
  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="text-xs text-stone-400 font-mono w-6 text-right">
          {String(index + 1).padStart(2, '0')}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 text-left text-sm flex items-center gap-2 min-w-0"
        >
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
              screen.kind === 'text'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-indigo-100 text-indigo-800'
            }`}
          >
            {screen.kind}
          </span>
          <span className="truncate text-stone-700">
            {summarise(screen)}
          </span>
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-xs px-2 py-1 rounded border border-stone-300 disabled:opacity-30"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="text-xs px-2 py-1 rounded border border-stone-300 disabled:opacity-30"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs px-2 py-1 rounded border border-red-300 bg-red-50 text-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-200 p-3 space-y-3">
          {screen.kind === 'text' ? (
            <TextScreenEditor
              screen={screen}
              onPatch={(u) => onPatch(u as Partial<TextScreen>)}
            />
          ) : (
            <QuestionScreenEditor
              screen={screen}
              onPatch={(u) => onPatch(u as Partial<QuestionScreen>)}
            />
          )}
        </div>
      )}
    </>
  );
}

function summarise(screen: Screen): string {
  if (screen.kind === 'text') {
    const text = stripHtml(screen.contentHtml).slice(0, 60);
    return text || '(empty text screen)';
  }
  const q = stripHtml(screen.questionHtml).slice(0, 50);
  const opts = screen.options.length;
  return q
    ? `${q} — ${opts} option${opts === 1 ? '' : 's'}`
    : `(empty question, ${opts} option${opts === 1 ? '' : 's'})`;
}

function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

// ─────────────────────────────────────────────────────────────

function TextScreenEditor({
  screen,
  onPatch,
}: {
  screen: TextScreen;
  onPatch: (u: Partial<TextScreen>) => void;
}) {
  return (
    <>
      <Field label="Tag (optional)">
        <input
          type="text"
          value={screen.tag || ''}
          onChange={(e) => onPatch({ tag: e.target.value || null })}
          placeholder='e.g. "Clue A" — shown small + uppercase above the content'
          className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
        />
      </Field>
      <Field label="Content">
        <RichTextEditor
          value={screen.contentHtml}
          onChange={(contentHtml) => onPatch({ contentHtml })}
          placeholder="Write the screen's text. Select to bold / italic / colour / resize."
          minHeight={120}
        />
      </Field>
      <Field label="Image or GIF (optional)">
        <SinglePhotoField
          label=""
          value={screen.imageUrl}
          onChange={(imageUrl) => onPatch({ imageUrl })}
          previewClassName="w-full max-w-md aspect-video"
        />
      </Field>
    </>
  );
}

// ─────────────────────────────────────────────────────────────

function QuestionScreenEditor({
  screen,
  onPatch,
}: {
  screen: QuestionScreen;
  onPatch: (u: Partial<QuestionScreen>) => void;
}) {
  function patchOption(idx: number, updates: Partial<QuestionOption>) {
    onPatch({
      options: screen.options.map((o, i) =>
        i === idx ? { ...o, ...updates } : o,
      ),
    });
  }

  function setCorrect(idx: number) {
    // Exactly one correct option at a time.
    onPatch({
      options: screen.options.map((o, i) => ({ ...o, correct: i === idx })),
    });
  }

  function addOption() {
    onPatch({ options: [...screen.options, blankQuestionOption()] });
  }

  function removeOption(idx: number) {
    if (screen.options.length <= 2) {
      alert('Need at least two options.');
      return;
    }
    onPatch({ options: screen.options.filter((_, i) => i !== idx) });
  }

  return (
    <>
      <Field label="Question (initial screen text)">
        <RichTextEditor
          value={screen.questionHtml}
          onChange={(questionHtml) => onPatch({ questionHtml })}
          placeholder="e.g. Who took your cake?"
          minHeight={80}
        />
      </Field>

      <div className="space-y-3">
        <div className="text-xs font-medium text-stone-700">
          Options ({screen.options.length})
          <span className="block text-[11px] font-normal text-stone-500 mt-0.5">
            Each option gets its own presentation screen first, then they all
            appear together on the multiple-choice screen as buttons.
          </span>
        </div>

        {screen.options.map((opt, i) => (
          <div
            key={opt.id}
            className={`p-3 rounded border space-y-3 ${
              opt.correct
                ? 'border-green-300 bg-green-50'
                : 'border-stone-200 bg-stone-50'
            }`}
          >
            {/* Per-option presentation screen */}
            <div className="space-y-2 pb-3 border-b border-stone-200">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                Presentation screen — shown on its own before the choice
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-2">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">
                    Tag (optional)
                  </span>
                  <input
                    type="text"
                    value={opt.tag}
                    onChange={(e) => patchOption(i, { tag: e.target.value })}
                    placeholder={`Clue ${String.fromCharCode(65 + i)}`}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
                  />
                </label>
                <div />
              </div>
              <RichTextEditor
                value={opt.presentationHtml}
                onChange={(presentationHtml) =>
                  patchOption(i, { presentationHtml })
                }
                placeholder="e.g. Your friend Jason was eating a cake last Thursday. It must have been him."
                minHeight={80}
              />
            </div>

            {/* Choice-screen button + correctness */}
            <div className="space-y-2 pb-3 border-b border-stone-200">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                On the choice screen
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-stone-700 whitespace-nowrap">
                  <input
                    type="radio"
                    name={`correct-${screen.id}`}
                    checked={opt.correct}
                    onChange={() => setCorrect(i)}
                  />
                  Correct
                </label>
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => patchOption(i, { label: e.target.value })}
                  placeholder={`Button label (e.g. "Jason")`}
                  className="flex-1 px-2 py-1.5 border border-stone-300 rounded text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-xs px-2 py-1 rounded border border-red-300 bg-red-50 text-red-700"
                  aria-label="Remove option"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Response shown after tapping */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                Response when this button is tapped
              </div>
              <RichTextEditor
                value={opt.responseHtml}
                onChange={(responseHtml) => patchOption(i, { responseHtml })}
                placeholder="e.g. It couldn't have been Jason — wrong timing."
                minHeight={70}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addOption}
          className="px-3 py-1.5 rounded border border-stone-300 bg-white text-sm hover:bg-stone-100"
        >
          + Add option
        </button>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}
