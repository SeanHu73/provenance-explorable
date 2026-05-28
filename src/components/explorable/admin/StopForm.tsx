'use client';

/**
 * The full stop editor — title, location, isIndoor, notice (prompt /
 * timer / photos / audio), context (text / photos / audio), puzzle piece
 * (photo / label), author assessment (included / explanation).
 *
 * The form keeps a local copy of the stop and only writes to Firestore
 * when the user clicks Save. Photo + audio uploads land immediately
 * (they need to be persisted to Storage to get a URL) but are only
 * referenced from the in-memory stop until Save.
 */

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExplorableStop, resolvePuzzlePiece } from '@/lib/explorable/stop-types';
import { saveStop, deleteStop } from '@/lib/explorable/stops-store';
import PhotoUploader from './PhotoUploader';
import AudioUploader from './AudioUploader';

const PinPlacementMap = dynamic(() => import('./PinPlacementMap'), { ssr: false });

interface Props {
  initial: ExplorableStop;
  isNew: boolean;
}

export default function StopForm({ initial, isNew }: Props) {
  const router = useRouter();
  const [stop, setStop] = useState<ExplorableStop>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convenience setters so the JSX stays readable.
  const patch = (p: Partial<ExplorableStop>) => setStop((s) => ({ ...s, ...p }));
  const patchNotice = (p: Partial<ExplorableStop['notice']>) =>
    setStop((s) => ({ ...s, notice: { ...s.notice, ...p } }));
  const patchContext = (p: Partial<ExplorableStop['context']>) =>
    setStop((s) => ({ ...s, context: { ...s.context, ...p } }));
  const patchPuzzle = (p: Partial<ExplorableStop['puzzlePiece']>) =>
    setStop((s) => ({ ...s, puzzlePiece: { ...s.puzzlePiece, ...p } }));
  const patchAssessment = (p: Partial<ExplorableStop['authorAssessment']>) =>
    setStop((s) => ({ ...s, authorAssessment: { ...s.authorAssessment, ...p } }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!stop.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    try {
      await saveStop(stop);
      router.push('/admin/explorable/stops');
    } catch (err) {
      console.error('[StopForm] save failed', err);
      setError('Save failed. Check Firestore rules and the console.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this stop? This cannot be undone.')) return;
    setSaving(true);
    try {
      await deleteStop(stop.id);
      router.push('/admin/explorable/stops');
    } catch (err) {
      console.error('[StopForm] delete failed', err);
      setError('Delete failed.');
      setSaving(false);
    }
  }

  const resolvedPiece = resolvePuzzlePiece(stop);

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      {error && (
        <div className="p-3 rounded border border-red-300 bg-red-50 text-red-900 text-sm">
          {error}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────── */}
      <Section title="Header">
        <Field label="Title">
          <input
            type="text"
            value={stop.title}
            onChange={(e) => patch({ title: e.target.value })}
            required
            className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
            placeholder="e.g. The Facade Mosaic"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Order">
            <input
              type="number"
              value={stop.order}
              onChange={(e) => patch({ order: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
            />
          </Field>
          <Field label="Indoor?">
            <label className="flex items-center gap-2 px-2 py-1.5 border border-stone-300 rounded text-sm">
              <input
                type="checkbox"
                checked={stop.isIndoor}
                onChange={(e) => patch({ isIndoor: e.target.checked })}
              />
              <span className="text-stone-700">
                Inside a building (revealed via "Are you inside?" prompt, not GPS)
              </span>
            </label>
          </Field>
        </div>
      </Section>

      {/* ── Location ─────────────────────────────────────────────── */}
      <Section title="Location">
        <p className="text-xs text-stone-600">
          Click anywhere on the map to set this stop's position. Pan
          restricted to the Stanford campus core.
        </p>
        <PinPlacementMap
          value={stop.location}
          onChange={(location) => patch({ location })}
        />
        <div className="text-xs font-mono text-stone-600">
          {stop.location.lat.toFixed(6)}, {stop.location.lng.toFixed(6)}
        </div>
      </Section>

      {/* ── Notice ───────────────────────────────────────────────── */}
      <Section title="Notice (what to look at)">
        <Field label="Prompt">
          <textarea
            value={stop.notice.prompt}
            onChange={(e) => patchNotice({ prompt: e.target.value })}
            rows={3}
            className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
            placeholder='e.g. "Look at the mosaic above the church doors. Notice the figures, the colors, the cracks."'
          />
        </Field>
        <Field label="Look timer (seconds, optional)">
          <input
            type="number"
            value={stop.notice.timerSeconds ?? ''}
            onChange={(e) =>
              patchNotice({
                timerSeconds: e.target.value === '' ? null : parseInt(e.target.value, 10),
              })
            }
            className="w-32 px-2 py-1.5 border border-stone-300 rounded text-sm"
            placeholder="(no timer)"
          />
        </Field>
        <PhotoUploader
          photos={stop.notice.photos}
          onChange={(photos) => patchNotice({ photos })}
          label="Notice photos"
        />
        <AudioUploader
          audio={stop.notice.audio}
          onChange={(audio) => patchNotice({ audio })}
          label="Notice audio"
        />
      </Section>

      {/* ── Context ──────────────────────────────────────────────── */}
      <Section title="Context (historical background)">
        <Field label="Context text">
          <textarea
            value={stop.context.text}
            onChange={(e) => patchContext({ text: e.target.value })}
            rows={6}
            className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
            placeholder="The historical context the player reads after observing."
          />
        </Field>
        <PhotoUploader
          photos={stop.context.photos}
          onChange={(photos) => patchContext({ photos })}
          label="Context photos"
        />
        <AudioUploader
          audio={stop.context.audio}
          onChange={(audio) => patchContext({ audio })}
          label="Context audio"
        />
      </Section>

      {/* ── Puzzle piece ─────────────────────────────────────────── */}
      <Section title="Puzzle piece (what gets collected)">
        <p className="text-xs text-stone-600">
          The piece added to the player's inventory. By default it uses
          the first notice photo and the stop title. Override below if
          needed.
        </p>
        <Field label="Photo URL override (optional)">
          <input
            type="text"
            value={stop.puzzlePiece.photoUrl || ''}
            onChange={(e) => patchPuzzle({ photoUrl: e.target.value || null })}
            placeholder="Leave blank to use the first notice photo"
            className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm font-mono"
          />
        </Field>
        <Field label="Label override (optional)">
          <input
            type="text"
            value={stop.puzzlePiece.label || ''}
            onChange={(e) => patchPuzzle({ label: e.target.value || null })}
            placeholder="Leave blank to use the stop title"
            className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
          />
        </Field>
        <div className="p-3 bg-stone-100 border border-stone-200 rounded">
          <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">
            Preview
          </div>
          <div className="flex items-center gap-3">
            {resolvedPiece.photoUrl ? (
              <img
                src={resolvedPiece.photoUrl}
                alt={resolvedPiece.label}
                className="w-16 h-16 object-cover rounded border border-stone-300"
              />
            ) : (
              <div className="w-16 h-16 rounded border border-stone-300 bg-white text-[10px] text-stone-400 flex items-center justify-center text-center">
                no photo
              </div>
            )}
            <div className="text-sm text-stone-700">
              {resolvedPiece.label || (
                <span className="text-stone-400 italic">(no label)</span>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Author assessment ────────────────────────────────────── */}
      <Section title="Author's evidence assessment">
        <p className="text-xs text-stone-600">
          Revealed only after the player has submitted their own sort.
        </p>
        <Field label="Is this relevant evidence for the essential question?">
          <div className="flex gap-3">
            <label className="flex items-center gap-2 px-3 py-1.5 border border-stone-300 rounded text-sm">
              <input
                type="radio"
                checked={stop.authorAssessment.included === true}
                onChange={() => patchAssessment({ included: true })}
              />
              Yes — include
            </label>
            <label className="flex items-center gap-2 px-3 py-1.5 border border-stone-300 rounded text-sm">
              <input
                type="radio"
                checked={stop.authorAssessment.included === false}
                onChange={() => patchAssessment({ included: false })}
              />
              No — exclude
            </label>
          </div>
        </Field>
        <Field label="Why? (shown on the back of the piece at reveal time)">
          <textarea
            value={stop.authorAssessment.explanation}
            onChange={(e) => patchAssessment({ explanation: e.target.value })}
            rows={4}
            className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
            placeholder="Your reasoning for including or excluding this stop as evidence."
          />
        </Field>
      </Section>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="flex justify-between pt-4 border-t border-stone-300">
        <div>
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-3 py-1.5 rounded bg-red-700 text-white text-sm hover:bg-red-800 disabled:opacity-50"
            >
              Delete stop
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/admin/explorable/stops')}
            className="px-3 py-1.5 rounded border border-stone-300 text-sm hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 rounded bg-blue-700 text-white text-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isNew ? 'Create stop' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Layout helpers ─────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-4 bg-stone-50 border border-stone-300 rounded space-y-3">
      <h2 className="font-semibold text-sm uppercase tracking-wider text-stone-700">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}
