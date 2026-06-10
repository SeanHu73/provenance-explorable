'use client';

/**
 * The full stop editor — title, location, isIndoor, notice (prompt /
 * timer / photos / audio), context (text / photos / audio), puzzle piece
 * (photo / label), author assessment (included / explanation).
 *
 * Changes auto-save to Firestore after 1s of stability. The first save
 * of a brand-new stop also redirects the URL from /stops/new to
 * /stops/[id] so a refresh restores the in-progress draft.
 */

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExplorableStop, resolvePuzzlePiece } from '@/lib/explorable/stop-types';
import { saveStop, deleteStop } from '@/lib/explorable/stops-store';
import { useAutoSave, autoSaveLabel, autoSaveColor } from '@/lib/explorable/use-auto-save';
import PhotoUploader from './PhotoUploader';
import AudioUploader from './AudioUploader';
import IndoorMapEditor from './IndoorMapEditor';
import ContextualEvidenceEditor from './ContextualEvidenceEditor';

const PinPlacementMap = dynamic(() => import('./PinPlacementMap'), { ssr: false });

interface Props {
  initial: ExplorableStop;
  isNew: boolean;
}

export default function StopForm({ initial, isNew }: Props) {
  const router = useRouter();
  const [stop, setStop] = useState<ExplorableStop>(initial);
  const [deleting, setDeleting] = useState(false);
  const [hasFirstSaved, setHasFirstSaved] = useState(!isNew);

  // Convenience setters so the JSX stays readable.
  const patch = (p: Partial<ExplorableStop>) => setStop((s) => ({ ...s, ...p }));
  const patchNotice = (p: Partial<ExplorableStop['notice']>) =>
    setStop((s) => ({ ...s, notice: { ...s.notice, ...p } }));
  const patchContext = (p: Partial<ExplorableStop['context']>) =>
    setStop((s) => ({ ...s, context: { ...s.context, ...p } }));
  const patchPuzzle = (p: Partial<ExplorableStop['puzzlePiece']>) =>
    setStop((s) => ({ ...s, puzzlePiece: { ...s.puzzlePiece, ...p } }));

  const save = useCallback((s: ExplorableStop) => saveStop(s), []);

  const onSaved = useCallback(
    (saved: ExplorableStop) => {
      // First successful save of a brand-new stop: switch URL from
      // /stops/new to /stops/[id] so a refresh restores the draft.
      if (isNew && !hasFirstSaved) {
        setHasFirstSaved(true);
        router.replace(`/admin/explorable/stops/${saved.id}`);
      }
    },
    [isNew, hasFirstSaved, router],
  );

  const { status, lastError } = useAutoSave({
    value: stop,
    save,
    onSaved,
    delayMs: 1000,
  });

  async function handleDelete() {
    if (!confirm('Delete this stop? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteStop(stop.id);
      router.push('/admin/explorable/stops');
    } catch (err) {
      console.error('[StopForm] delete failed', err);
      alert('Delete failed. Check Firestore rules.');
      setDeleting(false);
    }
  }

  const resolvedPiece = resolvePuzzlePiece(stop);

  return (
    <form className="space-y-6 max-w-3xl" onSubmit={(e) => e.preventDefault()}>
      {/* ── Auto-save status banner ──────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-stone-50/95 backdrop-blur border-b border-stone-200 flex items-center justify-between">
        <span className={`text-xs font-medium ${autoSaveColor(status)}`}>
          {autoSaveLabel(status) || (
            <span className="text-stone-400">All changes saved</span>
          )}
        </span>
        {lastError && (
          <span className="text-xs text-red-700" title={lastError}>
            ⚠ {lastError.slice(0, 60)}
          </span>
        )}
      </div>

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
      </Section>

      {/* ── Indoor map (only when isIndoor) ──────────────────────── */}
      {stop.isIndoor && (
        <Section title="Indoor map">
          <IndoorMapEditor
            value={stop.indoorMap}
            onChange={(indoorMap) => patch({ indoorMap })}
          />
        </Section>
      )}

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

      {/* ── Contextual evidence ──────────────────────────────────── */}
      <Section title="Contextual Evidence (players sort these)">
        <p className="text-xs text-stone-600">
          Sample evidence the player drags into <strong>Perspective</strong>,{' '}
          <strong>Time</strong>, or <strong>Place</strong> at this stop. Pick
          the correct bucket for each — a wrong drop bounces back so they try
          again. Players can also add evidence they heard themselves.
        </p>
        <ContextualEvidenceEditor
          value={stop.contextualEvidence}
          onChange={(contextualEvidence) => patch({ contextualEvidence })}
        />
      </Section>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="flex justify-between pt-4 border-t border-stone-300">
        <div>
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded bg-red-700 text-white text-sm hover:bg-red-800 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete stop'}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/explorable/stops')}
          className="px-3 py-1.5 rounded border border-stone-300 text-sm hover:bg-stone-100"
        >
          Back to stops
        </button>
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
