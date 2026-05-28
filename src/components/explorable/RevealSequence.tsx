'use client';

/**
 * After all sorting is done, walk through the disagreements between
 * the player and the author's assessment.
 *
 *  Red halo  — author would EXCLUDE this stop, player put it in Context.
 *  Yellow    — author would INCLUDE, player put it in Trash (or skipped).
 *
 * One card at a time. Tap the card → 3D flip → author's explanation
 * on the back. Agree/Disagree buttons appear once flipped; tapping a
 * choice hides them. Disagree opens a textarea for the player to
 * record their reasoning. Then Next advances.
 *
 * Skipped: stops the player agreed with the author on (boring). They
 * still get included silently in the final "you saw X stops" counter
 * if we ever add one.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExplorableStop } from '@/lib/explorable/stop-types';
import { Verdict, RevealResponse } from '@/lib/explorable/discovery';
import EvidenceCard from './EvidenceCard';

type HaloKind = 'red' | 'yellow';

interface RevealItem {
  stop: ExplorableStop;
  halo: HaloKind;
  /** True if the author would include this stop as evidence. */
  authorIncluded: boolean;
  authorExplanation: string;
}

interface Props {
  stops: ExplorableStop[];
  /** All accumulated verdicts so far (midway + final). */
  verdicts: Map<string, Verdict>;
  backgroundPhotoUrl: string | null;
  onRecordResponse: (stopId: string, response: RevealResponse) => void;
  onComplete: () => void;
}

export default function RevealSequence({
  stops,
  verdicts,
  backgroundPhotoUrl,
  onRecordResponse,
  onComplete,
}: Props) {
  // Only show disagreement-flavoured cards.
  const items = useMemo<RevealItem[]>(() => {
    const out: RevealItem[] = [];
    for (const stop of stops) {
      const playerVerdict = verdicts.get(stop.id); // undefined if never sorted
      const authorIncluded = stop.authorAssessment.included;
      const playerIncluded = playerVerdict === 'context';

      // Red: author wouldn't include, player did.
      if (!authorIncluded && playerIncluded) {
        out.push({
          stop,
          halo: 'red',
          authorIncluded,
          authorExplanation: stop.authorAssessment.explanation,
        });
        continue;
      }
      // Yellow: author would include, player didn't (trash or skipped).
      if (authorIncluded && playerVerdict !== 'context') {
        out.push({
          stop,
          halo: 'yellow',
          authorIncluded,
          authorExplanation: stop.authorAssessment.explanation,
        });
      }
    }
    return out;
  }, [stops, verdicts]);

  const [index, setIndex] = useState(0);
  const current = items[index];

  if (items.length === 0) {
    return (
      <ClosingShell
        backgroundPhotoUrl={backgroundPhotoUrl}
        onClose={onComplete}
      >
        <Heading>You and the author agreed on every piece.</Heading>
        <p
          className="text-base sm:text-lg leading-relaxed mt-4"
          style={{ color: 'var(--th-text, #3a3a32)' }}
        >
          That's rare. Worth comparing notes about <em>why</em> you both
          ended up there.
        </p>
        <CloseButton onClick={onComplete}>Done</CloseButton>
      </ClosingShell>
    );
  }

  function advance() {
    if (index + 1 >= items.length) {
      onComplete();
    } else {
      setIndex(index + 1);
    }
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
      <div className="absolute inset-0 z-0 bg-stone-900/40" />

      <div className="relative z-10 flex-1 flex flex-col px-4 py-6 overflow-y-auto">
        <div className="text-center text-xs uppercase tracking-[0.3em] text-white mb-2">
          {index + 1} / {items.length}
        </div>

        <RevealCard
          key={current.stop.id}
          item={current}
          onResponse={(response) => {
            onRecordResponse(current.stop.id, response);
            advance();
          }}
        />
      </div>
    </div>
  );
}

// ───── Per-card flow ────────────────────────────────────────

function RevealCard({
  item,
  onResponse,
}: {
  item: RevealItem;
  onResponse: (response: RevealResponse) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [stage, setStage] = useState<'awaiting' | 'disagreeing'>('awaiting');
  const [reason, setReason] = useState('');

  const haloHint =
    item.halo === 'red'
      ? "The author wouldn't have included this. You did."
      : "The author would have included this. You didn't.";

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-md mx-auto w-full">
      <div className="text-center text-white text-sm sm:text-base max-w-xs">
        {haloHint}
      </div>

      {/* Flip-card — tap to reveal the author's reasoning */}
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        className="relative outline-none"
        style={{
          perspective: 1000,
          width: 240,
          height: 320,
          background: 'transparent',
        }}
        aria-label={flipped ? 'Show photo' : 'Show author\'s explanation'}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front — the photo + label */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <EvidenceCard
              stop={item.stop}
              size="lg"
              halo={item.halo}
              style={{ width: '100%', height: '100%' }}
            />
            {!flipped && (
              <div className="absolute bottom-2 left-0 right-0 text-center text-[11px] uppercase tracking-[0.2em] text-stone-500">
                tap to flip
              </div>
            )}
          </div>

          {/* Back — author's explanation */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
            className="rounded-xl bg-white p-4 flex flex-col text-left overflow-auto"
          >
            <div
              className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-2"
              style={{
                color: item.halo === 'red' ? '#dc2626' : '#a16207',
              }}
            >
              The author{' '}
              {item.authorIncluded ? 'would include' : 'would exclude'}
            </div>
            <div
              className="text-sm leading-relaxed flex-1"
              style={{ color: 'var(--th-text, #3a3a32)' }}
            >
              {item.authorExplanation ? (
                item.authorExplanation
              ) : (
                <em className="text-stone-400">
                  (Author hasn't written a reason for this stop yet.)
                </em>
              )}
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mt-3 text-center">
              tap to flip back
            </div>
          </div>
        </motion.div>
      </button>

      {/* Buttons appear AFTER the player has flipped */}
      <AnimatePresence mode="wait">
        {flipped && stage === 'awaiting' && (
          <motion.div
            key="choice"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex gap-3"
          >
            <button
              type="button"
              onClick={() => onResponse({ agreed: true })}
              className="px-6 py-3 rounded-full bg-green-600 text-white font-semibold shadow-lg hover:bg-green-700"
            >
              I agree
            </button>
            <button
              type="button"
              onClick={() => setStage('disagreeing')}
              className="px-6 py-3 rounded-full bg-red-600 text-white font-semibold shadow-lg hover:bg-red-700"
            >
              I disagree
            </button>
          </motion.div>
        )}

        {flipped && stage === 'disagreeing' && (
          <motion.div
            key="disagree-input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md flex flex-col gap-3"
          >
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Why do you disagree? (Use your phone keyboard's microphone to dictate.)"
              className="w-full px-3 py-3 rounded-lg border border-stone-300 text-base bg-white/95"
              autoFocus
            />
            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setStage('awaiting')}
                className="px-4 py-2 rounded-full text-stone-200 text-sm hover:bg-stone-800/40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  onResponse({ agreed: false, reason: reason.trim() })
                }
                className="px-6 py-2.5 rounded-full bg-white text-stone-900 font-semibold shadow-lg"
              >
                Save & next
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───── Helpers ──────────────────────────────────────────────

function ClosingShell({
  children,
  backgroundPhotoUrl,
}: {
  children: React.ReactNode;
  backgroundPhotoUrl: string | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
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
      <div className="absolute inset-0 z-0 bg-stone-900/40" />
      <div
        className="relative z-10 max-w-md w-full mx-auto rounded-3xl bg-white shadow-2xl px-7 py-10 text-center"
      >
        {children}
      </div>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-2xl sm:text-3xl font-semibold leading-tight"
      style={{
        fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
        color: 'var(--th-primary, #8b2538)',
      }}
    >
      {children}
    </h2>
  );
}

function CloseButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 px-6 py-3 rounded-full text-white text-base font-semibold shadow-lg"
      style={{ background: 'var(--th-primary, #8b2538)' }}
    >
      {children}
    </button>
  );
}
