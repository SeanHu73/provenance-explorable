'use client';

/**
 * Per-stop evidence sort. The player drags each piece of contextual
 * evidence into one of three buckets — Perspective, Time, or Place.
 *
 *  - Author-provided samples have a correct bucket. A wrong drop bounces
 *    back to the pool and shows a "try again" nudge.
 *  - The player can also add evidence they heard themselves; those go
 *    into whichever bucket they choose (no right answer).
 *
 * Drag-and-drop via @dnd-kit (touch + mouse). Completing the sort hands
 * the bucketed evidence back to the caller, which records it and marks
 * the stop collected.
 */

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  CollisionDetection,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExplorableStop,
  EVIDENCE_CATEGORIES,
  EvidenceCategory,
  newEvidenceId,
} from '@/lib/explorable/stop-types';
import { CategorisedEvidence } from '@/lib/explorable/discovery';

interface Props {
  stop: ExplorableStop;
  essentialQuestion: string;
  backgroundPhotoUrl: string | null;
  onDone: (items: CategorisedEvidence[]) => void;
  onCancel?: () => void;
}

type Zone = EvidenceCategory | 'pool';

// Drop where the finger/pointer is, not where the card's box overlaps.
// rectIntersection (the default) makes edge buckets hard to hit because
// the dragged card can't extend past the screen edge; pointerWithin
// registers wherever the pointer is over a bucket. Fall back to
// rectIntersection if the pointer isn't over any droppable.
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  return pointerHits.length > 0 ? pointerHits : rectIntersection(args);
};

interface Item {
  id: string;
  text: string;
  source: 'sample' | 'learner';
  /** Correct bucket — only set for author samples. */
  correct: EvidenceCategory | null;
  placement: Zone;
}

export default function StopEvidenceSorter({
  stop,
  essentialQuestion,
  backgroundPhotoUrl,
  onDone,
  onCancel,
}: Props) {
  const [items, setItems] = useState<Item[]>(() =>
    stop.contextualEvidence.map((e) => ({
      id: e.id,
      text: e.text,
      source: 'sample' as const,
      correct: e.category,
      placement: 'pool' as Zone,
    })),
  );
  const [draft, setDraft] = useState('');
  const [errorId, setErrorId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  );

  // Every author sample must be correctly bucketed before continuing.
  const samplesPlaced = items
    .filter((it) => it.source === 'sample')
    .every((it) => it.placement !== 'pool');

  function flashError(id: string) {
    setErrorId(id);
    window.setTimeout(
      () => setErrorId((cur) => (cur === id ? null : cur)),
      1100,
    );
  }

  function handleDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    const zone = String(overId) as Zone;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (zone === 'pool') return { ...it, placement: 'pool' };
        // Samples must match their correct bucket; wrong drop bounces back.
        if (it.source === 'sample' && it.correct !== zone) {
          flashError(it.id);
          return it;
        }
        return { ...it, placement: zone };
      }),
    );
  }

  function addOwn() {
    const text = draft.trim();
    if (!text) return;
    setItems((prev) => [
      ...prev,
      {
        id: newEvidenceId(),
        text,
        source: 'learner',
        correct: null,
        placement: 'pool',
      },
    ]);
    setDraft('');
  }

  function submit() {
    if (!samplesPlaced) return;
    const result: CategorisedEvidence[] = items
      .filter((it) => it.placement !== 'pool')
      .map((it) => ({
        id: it.id,
        stopId: stop.id,
        text: it.text,
        category: it.placement as EvidenceCategory,
        source: it.source,
      }));
    onDone(result);
  }

  const poolItems = items.filter((it) => it.placement === 'pool');

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
      <div className="absolute inset-0 z-0 bg-stone-900/35" />

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragEnd={handleDragEnd}
      >
        <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
          {/* ── Header ─────────────────────────────────────── */}
          <header
            className="px-4 py-3 sm:py-4 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-stone-500 mb-1">
              Sort the evidence — {stop.title || 'this stop'}
            </div>
            <h2
              className="text-base sm:text-lg font-semibold leading-tight"
              style={{
                fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
                color: 'var(--th-primary, #8b2538)',
              }}
            >
              {essentialQuestion || 'What is this place for?'}
            </h2>
            <p className="text-xs text-stone-600 mt-1.5 max-w-xl mx-auto">
              Drag each piece of evidence into <strong>Perspective</strong>,{' '}
              <strong>Time</strong>, or <strong>Place</strong>.
            </p>
          </header>

          {/* ── Buckets ────────────────────────────────────── */}
          <div className="px-3 pt-3 grid grid-cols-3 gap-2 sm:gap-3">
            {EVIDENCE_CATEGORIES.map((c) => (
              <Bucket
                key={c.key}
                id={c.key}
                label={c.label}
                accent={c.accent}
                items={items.filter((it) => it.placement === c.key)}
              />
            ))}
          </div>

          {/* ── Try-again nudge ────────────────────────────── */}
          <div className="h-6 flex items-center justify-center">
            <AnimatePresence>
              {errorId && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-semibold text-white px-3 py-1 rounded-full"
                  style={{ background: 'rgba(180, 35, 35, 0.92)' }}
                >
                  Not quite — try another bucket.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Pool of unplaced cards ─────────────────────── */}
          <div className="flex-1 overflow-y-auto px-3 pb-2">
            <PoolZone items={poolItems} errorId={errorId} />
          </div>

          {/* ── Add your own ───────────────────────────────── */}
          <div
            className="px-3 py-2.5 flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.85)' }}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOwn();
                }
              }}
              placeholder="Add evidence you heard…"
              className="flex-1 min-w-0 px-3 py-2 rounded-full border border-stone-300 text-sm bg-white"
            />
            <button
              type="button"
              onClick={addOwn}
              disabled={!draft.trim()}
              className="px-3 py-2 rounded-full bg-stone-800 text-white text-sm disabled:opacity-40 whitespace-nowrap"
            >
              Add
            </button>
          </div>

          {/* ── Footer ─────────────────────────────────────── */}
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
              {poolItems.filter((it) => it.source === 'sample').length} sample
              {poolItems.filter((it) => it.source === 'sample').length === 1
                ? ''
                : 's'}{' '}
              left
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!samplesPlaced}
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

// ───── Buckets + cards ──────────────────────────────────────────

function Bucket({
  id,
  label,
  accent,
  items,
}: {
  id: EvidenceCategory;
  label: string;
  accent: string;
  items: Item[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="rounded-xl p-2 transition-all duration-150"
      style={{
        background: isOver ? `${accent}26` : 'rgba(255,255,255,0.82)',
        border: isOver ? `3px solid ${accent}` : `2px dashed ${accent}`,
        boxShadow: isOver
          ? `0 0 0 4px ${accent}55, 0 10px 24px rgba(0,0,0,0.28)`
          : 'none',
        transform: isOver ? 'scale(1.04)' : 'scale(1)',
        minHeight: 120,
      }}
    >
      <div
        className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] mb-1.5 font-semibold leading-tight flex items-center gap-1"
        style={{ color: accent }}
      >
        {label}{' '}
        <span className="text-stone-500 font-normal">({items.length})</span>
        {isOver && <span aria-hidden>← drop here</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <DraggableCard key={it.id} item={it} accent={accent} condensed />
        ))}
      </div>
    </div>
  );
}

function PoolZone({ items, errorId }: { items: Item[]; errorId: string | null }) {
  const { setNodeRef } = useDroppable({ id: 'pool' });
  return (
    <div ref={setNodeRef} className="pt-3">
      <div className="text-[10px] uppercase tracking-[0.25em] text-stone-200 mb-2 text-center">
        Drag up into a bucket
      </div>
      <div className="flex flex-col gap-2 max-w-md mx-auto">
        {items.length === 0 ? (
          <div className="text-stone-200 italic text-sm py-3 text-center">
            Everything sorted.
          </div>
        ) : (
          items.map((it) => (
            <DraggableCard key={it.id} item={it} shake={errorId === it.id} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  item,
  accent,
  shake = false,
  condensed = false,
}: {
  item: Item;
  accent?: string;
  shake?: boolean;
  /** Collapse the text once the card is sitting in a bucket so it fits. */
  condensed?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id });

  const style: React.CSSProperties = {
    cursor: 'grab',
    touchAction: 'none',
    opacity: isDragging ? 0.6 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 100 : undefined,
    borderLeft: accent ? `3px solid ${accent}` : '3px solid #a8a29e',
    animation: shake ? 'evidence-shake 0.4s ease-in-out' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`select-none rounded-lg bg-white shadow text-stone-800 leading-snug ${
        condensed ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
      }`}
    >
      {item.source === 'learner' && (
        <span className="text-[9px] uppercase tracking-wider text-stone-400 block mb-0.5">
          You added
        </span>
      )}
      <span className={condensed ? 'line-clamp-2 break-words' : ''}>
        {item.text}
      </span>
      <style>{`
        @keyframes evidence-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
