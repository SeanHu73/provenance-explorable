'use client';

/**
 * Author the sample contextual evidence for a stop. Each row is a piece
 * of evidence plus the correct bucket (Perspective / Time / Place) the
 * player must drag it into. Add / edit / remove rows; changes bubble up
 * to the StopForm's auto-save.
 */

import {
  ContextualEvidence,
  EVIDENCE_CATEGORIES,
  EvidenceCategory,
  newEvidenceId,
} from '@/lib/explorable/stop-types';

interface Props {
  value: ContextualEvidence[];
  onChange: (next: ContextualEvidence[]) => void;
}

export default function ContextualEvidenceEditor({ value, onChange }: Props) {
  const items = value ?? [];

  function update(id: string, patch: Partial<ContextualEvidence>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  function add() {
    onChange([
      ...items,
      { id: newEvidenceId(), text: '', category: 'perspective' },
    ]);
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-xs text-stone-500 italic">
          No sample evidence yet. Players will only be able to add their own.
        </p>
      )}

      {items.map((it, i) => (
        <div
          key={it.id}
          className="p-3 bg-white border border-stone-300 rounded space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-stone-500">
              Evidence {i + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(it.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>

          <textarea
            value={it.text}
            onChange={(e) => update(it.id, { text: e.target.value })}
            rows={2}
            className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
            placeholder='e.g. "The 1903 dedication plaque names the railroad-baron donor."'
          />

          <div>
            <span className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">
              Correct bucket
            </span>
            <div className="flex flex-wrap gap-2">
              {EVIDENCE_CATEGORIES.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-1.5 px-2.5 py-1 border rounded text-sm cursor-pointer"
                  style={{
                    borderColor: it.category === c.key ? c.accent : '#d6d3d1',
                    background:
                      it.category === c.key ? `${c.accent}14` : 'transparent',
                    color: it.category === c.key ? c.accent : '#57534e',
                    fontWeight: it.category === c.key ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name={`cat-${it.id}`}
                    checked={it.category === c.key}
                    onChange={() =>
                      update(it.id, { category: c.key as EvidenceCategory })
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="px-3 py-1.5 rounded border border-stone-300 text-sm hover:bg-stone-100"
      >
        + Add evidence
      </button>
    </div>
  );
}
