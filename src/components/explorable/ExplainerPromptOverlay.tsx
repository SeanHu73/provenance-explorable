'use client';

/**
 * Interstitial that sits between collecting a stop and the
 * Contextualisation Explainer auto-opening.
 *
 * Without it, the explainer pops up while the player is still on the
 * StopCard's Collected screen — disorienting. With it, we wait until
 * they return to the map, then surface a centred prompt giving them
 * agency to begin the lesson.
 *
 * Single primary action (no close button — the lesson is required at
 * this point in the flow).
 */

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onBegin: () => void;
}

export default function ExplainerPromptOverlay({ open, onBegin }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="explainer-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-40 flex items-center justify-center px-5"
          style={{
            background: 'rgba(15, 12, 9, 0.62)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full max-w-sm rounded-3xl bg-white shadow-2xl px-7 py-9 text-center"
            style={{ fontFamily: 'var(--font-newsreader), Georgia, serif' }}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-stone-500 mb-3">
              You've collected 4 pieces
            </div>
            <h2
              className="text-2xl sm:text-3xl font-semibold leading-tight mb-7"
              style={{
                fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
                color: 'var(--th-primary, #8b2538)',
              }}
            >
              Learn about contextualising
            </h2>
            <button
              type="button"
              onClick={onBegin}
              className="w-full px-6 py-4 rounded-2xl text-white text-lg font-semibold shadow-lg active:translate-y-px transition-transform"
              style={{ background: 'var(--th-primary, #8b2538)' }}
            >
              Begin lesson
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
