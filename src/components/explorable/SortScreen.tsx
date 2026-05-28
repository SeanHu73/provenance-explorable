'use client';

/**
 * Sort the player's collected evidence into Context (keep) or Trash
 * (discard). Used at midway (after the contextualisation lesson) and
 * at the end of the tour (only un-sorted stops appear).
 *
 * Drag-and-drop powered by @dnd-kit. Touch and mouse both work; cards
 * have visible drop targets.
 *
 * Layout:
 *   [EQ — pinned at top]
 *   [Context drop zone]   [Trash drop zone]
 *   [Pool of unplaced cards below]
 *   [Continue button — enabled once every card is placed]
 */

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ExplorableStop } from '@/lib/explorable/stop-types';
import { Verdict } from '@/lib/explorable/discovery';
import EvidenceCard from './EvidenceCard';

interface Props {
  title: string;
  essentialQuestion: string;
  stops: ExplorableStop[];
  backgroundPhotoUrl: string | null;
  onComplete: (verdicts: Array<{ stopId: string; verdict: Verdict }>) => void;
  onCancel?: () => void;
}

type Zone = Verdict | 'pool';

export default function SortScreen({
  title,
  essentialQuestion,
  stops,
  backgroundPhotoUrl,
  onComplete,
  onCancel,
}: Props) {
  // Map of stopId → which zone it's currently in. Starts in pool.
  const [placement, setPlacement] = useState<Record<string, Zone>>(() => {
    const initial: Record<string, Zone> = {};
    for (const s of stops) initial[s.id] = 'pool';
    return initial;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  );

  const allPlaced = stops.every((s) => placement[s.id] !== 'pool');

  function handleDragEnd(e: DragEndEvent) {
    const stopId = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    const zone = String(overId) as Zone;
    if (zone === 'pool' || zone === 'context' || zone === 'trash') {
      setPlacement((p) => ({ ...p, [stopId]: zone }));
    }
  }

  function submit() {
    if (!allPlaced) return;
    onComplete(
      stops.map((s) => ({
        stopId: s.id,
        verdict: placement[s.id] as Verdict,
      })),
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        fontFamily: 'var(--font-newsreader), Georgia, serif',
        backgroundColor: '#e9e4e2',
      }}
    >
      {backgroundPhotoUrl && (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundPhotoUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Backdrop tint so cards read clearly */}
      <div className="absolute inset-0 z-0 bg-stone-900/30" />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
          {/* ── Sticky EQ + title ─────────────────────────── */}
          <header
            className="px-4 py-4 sm:py-6 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-stone-500 mb-1">
              {title}
            </div>
            <h2
              className="text-xl sm:text-2xl font-semibold leading-tight"
              style={{
                fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
                color: 'var(--th-primary, #8b2538)',
              }}
            >
              {essentialQuestion || 'What is this place for?'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-2 max-w-xl mx-auto">
              Drag each piece of evidence into either{' '}
              <strong>Context</strong> (keep — relevant to the question) or{' '}
              <strong>Trash</strong> (discard — not relevant).
            </p>
          </header>

          {/* ── Drop zones ────────────────────────────────── */}
          <div className="px-4 pt-3 grid grid-cols-2 gap-3 sm:gap-4">
            <Zone
              id="context"
              label="Context"
              accent="#15803d"
              stops={stops.filter((s) => placement[s.id] === 'context')}
            />
            <Zone
              id="trash"
              label="Trash"
              accent="#7f1d1d"
              stops={stops.filter((s) => placement[s.id] === 'trash')}
            />
          </div>

          {/* ── Pool (un-placed cards) ────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
            <div className="text-[10px] uppercase tracking-[0.25em] text-stone-200 mb-2 text-center">
              Drag to sort
            </div>
            <PoolZone
              stops={stops.filter((s) => placement[s.id] === 'pool')}
            />
          </div>

          {/* ── Footer actions ────────────────────────────── */}
          <footer
            className="px-4 py-3 flex items-center justify-between gap-3"
            style={{ background: 'rgba(255, 255, 255, 0.92)' }}
          >
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-2 rounded-full text-stone-600 text-sm hover:bg-stone-100"
              >
                Cancel
              </button>
            ) : (
              <div />
            )}

            <div className="text-xs text-stone-600">
              {stops.filter((s) => placement[s.id] !== 'pool').length} /{' '}
              {stops.length} sorted
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={!allPlaced}
              className="px-5 py-2.5 rounded-full text-white text-base font-semibold shadow disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--th-primary, #8b2538)' }}
            >
              Continue
            </button>
          </footer>
        </div>
      </DndContext>
    </div>
  );
}

// ───── Drop zones ──────────────────────────────────────────────

function Zone({
  id,
  label,
  accent,
  stops,
}: {
  id: 'context' | 'trash';
  label: string;
  accent: string;
  stops: ExplorableStop[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="rounded-xl p-2 sm:p-3 transition-colors"
      style={{
        background: isOver ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)',
        border: `2px dashed ${accent}`,
        minHeight: 110,
      }}
    >
      <div
        className="text-[11px] uppercase tracking-[0.25em] mb-1.5 font-semibold"
        style={{ color: accent }}
      >
        {label}{' '}
        <span className="text-stone-500 font-normal">({stops.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {stops.map((s) => (
          <DraggableCard key={s.id} stop={s} />
        ))}
      </div>
    </div>
  );
}

function PoolZone({ stops }: { stops: ExplorableStop[] }) {
  const { setNodeRef } = useDroppable({ id: 'pool' });
  return (
    <div
      ref={setNodeRef}
      className="flex flex-wrap gap-3 justify-center min-h-[100px]"
    >
      {stops.length === 0 ? (
        <div className="text-stone-200 italic text-sm py-4">
          Everything sorted.
        </div>
      ) : (
        stops.map((s) => <DraggableCard key={s.id} stop={s} />)
      )}
    </div>
  );
}

function DraggableCard({ stop }: { stop: ExplorableStop }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: stop.id });

  const style: React.CSSProperties = {
    cursor: 'grab',
    touchAction: 'none',
    opacity: isDragging ? 0.6 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 100 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <EvidenceCard stop={stop} size="sm" />
    </div>
  );
}
