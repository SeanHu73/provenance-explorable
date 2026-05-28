'use client';

/**
 * One-shot indoor reveal prompt.
 *
 * Shown the first time the player walks into a building trigger zone
 * (and the game has at least one indoor stop). Dark backdrop dims the
 * map so the prompt is the obvious next action. Tapping the button
 * reveals indoor pins and dismisses the prompt — it can't return
 * during the same session.
 *
 * (We use animation only on enter/exit; the parent decides when to
 * mount us based on player position + the dismissed flag.)
 */

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  buildingName?: string;
  onConfirm: () => void;
}

export default function IndoorPromptOverlay({
  open,
  buildingName = 'Memorial Church',
  onConfirm,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="indoor-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-50 flex items-center justify-center px-5"
          style={{
            background: 'rgba(15, 12, 9, 0.72)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="w-full max-w-md rounded-3xl bg-white shadow-2xl px-7 py-10 sm:py-12 text-center"
            style={{ fontFamily: 'var(--font-newsreader), Georgia, serif' }}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-stone-500 mb-4">
              You've arrived
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold leading-tight mb-8"
              style={{
                fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
                color: 'var(--th-primary, #8b2538)',
              }}
            >
              Are you inside {buildingName}?
            </h2>
            <button
              type="button"
              onClick={onConfirm}
              className="w-full px-6 py-5 rounded-2xl text-white text-xl font-semibold shadow-lg active:translate-y-px transition-transform"
              style={{ background: 'var(--th-primary, #8b2538)' }}
            >
              Yes — I'm inside
            </button>
            <p className="text-xs text-stone-500 mt-5 leading-relaxed">
              Tap to reveal stops inside the building. GPS isn't reliable
              indoors, so we'll keep them visible until you finish your
              session.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
