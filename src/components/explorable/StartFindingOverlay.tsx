'use client';

/**
 * One-time "Tap to Start Finding" explainer that greets the player when
 * they first reach the map. It teaches the core loop in a sentence —
 * follow the arrows toward clues, tap a glowing pin to collect — and
 * dismisses on the first tap so it never gets in the way.
 *
 * In dev mode it adds a line noting fake GPS is on and that tapping the
 * map moves the player.
 */

import { motion } from 'framer-motion';

interface Props {
  open: boolean;
  devMode: boolean;
  onDismiss: () => void;
}

export default function StartFindingOverlay({ open, devMode, onDismiss }: Props) {
  if (!open) return null;

  return (
    <motion.button
      type="button"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center px-8 text-center cursor-pointer"
      style={{ background: 'rgba(15, 20, 30, 0.55)', backdropFilter: 'blur(2px)' }}
      aria-label="Tap to start finding clues"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-sm"
      >
        {/* Pulsing arrow ring — a hint of the on-map cue to come */}
        <div className="relative mx-auto mb-6 w-16 h-16">
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: 'rgba(245, 166, 35, 0.25)',
              animation: 'start-find-pulse 1.8s ease-out infinite',
            }}
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute inset-0 m-auto w-9 h-9"
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
          >
            <path
              d="M12 2 L20 20 L12 15 L4 20 Z"
              fill="#f5a623"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2
          className="text-white text-2xl mb-3"
          style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
        >
          Tap to Start Finding
        </h2>
        <p
          className="text-white/85 text-[15px] leading-relaxed"
          style={{ fontFamily: 'var(--font-newsreader), Georgia, serif' }}
        >
          Walk the campus and follow the glowing arrows toward nearby
          clues. When a clue is close, its pin lights up — tap the pin to
          collect it.
        </p>

        {devMode && (
          <p className="text-amber-300/90 text-xs mt-4 leading-relaxed">
            Dev mode: fake GPS is on. Tap anywhere on the map to move your
            position.
          </p>
        )}

        <span className="inline-block mt-6 text-white/70 text-xs uppercase tracking-[0.28em]">
          Tap anywhere to begin
        </span>
      </motion.div>

      <style>{`
        @keyframes start-find-pulse {
          0%   { transform: scale(0.7); opacity: 0.6; }
          70%  { transform: scale(1.8); opacity: 0;   }
          100% { transform: scale(1.8); opacity: 0;   }
        }
      `}</style>
    </motion.button>
  );
}
