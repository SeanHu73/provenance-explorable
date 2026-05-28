'use client';

/**
 * Player's inventory of collected pieces — a bottom sheet that slides
 * up over the map. Tap a piece to reopen its StopCard for re-viewing.
 *
 * Empty state nudges the player toward exploration so a brand-new
 * session doesn't feel broken.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ExplorableStop, resolvePuzzlePiece } from '@/lib/explorable/stop-types';

interface Props {
  open: boolean;
  stops: ExplorableStop[];
  collectedIds: Set<string>;
  onClose: () => void;
  onOpenStop: (stopId: string) => void;
  /** Shows a "Finish tour" button when there's anything to finalise. */
  onFinishTour?: () => void;
  /** Pinned at the top of the sheet so learners can re-anchor on it. */
  essentialQuestion?: string;
}

export default function JournalSheet({
  open,
  stops,
  collectedIds,
  onClose,
  onOpenStop,
  onFinishTour,
  essentialQuestion,
}: Props) {
  const collected = stops.filter((s) => collectedIds.has(s.id));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            className="fixed left-0 right-0 bottom-0 z-50 max-h-[85vh] rounded-t-3xl bg-white shadow-2xl flex flex-col overflow-hidden"
            style={{ fontFamily: 'var(--font-newsreader), Georgia, serif' }}
          >
            {essentialQuestion && (
              <div
                className="px-5 pt-5 pb-4 text-white"
                style={{ background: 'var(--th-question-bg-solid, #6E1F2E)' }}
              >
                <div className="text-[10px] uppercase tracking-[0.28em] opacity-75">
                  Essential question
                </div>
                <p
                  className="mt-1.5 text-[15px] leading-snug"
                  style={{
                    fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
                  }}
                >
                  {essentialQuestion}
                </p>
              </div>
            )}

            <header className="px-5 pt-4 pb-3 border-b border-stone-200 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Your journal
                </div>
                <h2
                  className="text-2xl font-semibold mt-0.5"
                  style={{
                    fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
                    color: 'var(--th-primary, #8b2538)',
                  }}
                >
                  {collected.length} {collected.length === 1 ? 'piece' : 'pieces'} collected
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xl leading-none flex items-center justify-center"
                aria-label="Close journal"
              >
                ×
              </button>
            </header>

            {onFinishTour && collected.length > 0 && (
              <div className="px-5 pt-3">
                <button
                  type="button"
                  onClick={onFinishTour}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm font-semibold shadow"
                  style={{ background: 'var(--th-primary, #8b2538)' }}
                >
                  Finish the tour
                </button>
                <p className="text-[11px] text-stone-500 text-center mt-1.5">
                  Reviews your evidence and shows where you and the author
                  disagree.
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {collected.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="text-5xl mb-3 opacity-50">○</div>
                  <p className="text-stone-700">
                    Nothing collected yet.
                  </p>
                  <p className="text-stone-500 text-sm mt-2">
                    Walk to a stop on the map — when you're close enough,
                    a pin appears. Tap it to collect the evidence.
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {collected.map((stop) => {
                    const piece = resolvePuzzlePiece(stop);
                    return (
                      <li key={stop.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenStop(stop.id);
                          }}
                          className="w-full text-left bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl p-2 transition-colors"
                        >
                          {piece.photoUrl ? (
                            <img
                              src={piece.photoUrl}
                              alt={piece.label}
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full aspect-square rounded-lg bg-stone-200 text-stone-400 text-xs flex items-center justify-center">
                              no photo
                            </div>
                          )}
                          <div
                            className="mt-2 text-sm font-medium leading-tight"
                            style={{ color: 'var(--th-text, #3a3a32)' }}
                          >
                            {piece.label || '(untitled)'}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
