'use client';

/**
 * End-of-tour reflection. The player sees everything they bucketed,
 * grouped into Perspective / Time / Place (each section collapsible),
 * and answers the essential question in their own words.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EVIDENCE_CATEGORIES,
  EvidenceCategory,
} from '@/lib/explorable/stop-types';
import { CategorisedEvidence } from '@/lib/explorable/discovery';

interface Props {
  essentialQuestion: string;
  categorisedEvidence: CategorisedEvidence[];
  answer: string;
  onAnswerChange: (text: string) => void;
  backgroundPhotoUrl: string | null;
  onClose: () => void;
}

export default function FinalReflection({
  essentialQuestion,
  categorisedEvidence,
  answer,
  onAnswerChange,
  backgroundPhotoUrl,
  onClose,
}: Props) {
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

      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto space-y-5">
          {/* ── Essential question ───────────────────────── */}
          <div
            className="rounded-2xl px-5 py-5 text-white shadow-xl"
            style={{ background: 'var(--th-question-bg-solid, #6E1F2E)' }}
          >
            <div className="text-[10px] uppercase tracking-[0.28em] opacity-75">
              The essential question
            </div>
            <h2
              className="mt-1.5 text-xl sm:text-2xl leading-snug"
              style={{
                fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
              }}
            >
              {essentialQuestion || 'What is this place for?'}
            </h2>
          </div>

          {/* ── Bucketed evidence (collapsible per category) ─ */}
          <div className="space-y-3">
            <p className="text-sm text-white/90 text-center">
              Everything you sorted along the way:
            </p>
            {EVIDENCE_CATEGORIES.map((c) => (
              <EvidenceBucket
                key={c.key}
                category={c.key}
                label={c.label}
                accent={c.accent}
                items={categorisedEvidence.filter(
                  (e) => e.category === c.key,
                )}
              />
            ))}
          </div>

          {/* ── Free-response answer ─────────────────────── */}
          <div
            className="rounded-2xl px-5 py-5 shadow-xl"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: 'var(--th-primary, #8b2538)' }}
            >
              Your answer
            </label>
            <p className="text-xs text-stone-600 mb-2">
              Use your bucketed evidence above to answer the essential
              question in your own words.
            </p>
            <textarea
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              rows={6}
              placeholder="Write your response…"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-base bg-white"
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full px-6 py-3 rounded-full text-white text-base font-semibold shadow"
            style={{ background: 'var(--th-primary, #8b2538)' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function EvidenceBucket({
  category,
  label,
  accent,
  items,
}: {
  category: EvidenceCategory;
  label: string;
  accent: string;
  items: CategorisedEvidence[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className="rounded-xl overflow-hidden shadow"
      style={{ background: 'rgba(255,255,255,0.92)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ borderLeft: `5px solid ${accent}` }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-semibold" style={{ color: accent }}>
          <span
            className="inline-block transition-transform text-stone-400"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
            aria-hidden
          >
            ▶
          </span>
          {label}
          <span className="text-stone-500 font-normal text-sm">
            ({items.length})
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={`${category}-body`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-0 space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-stone-400 italic">
                  Nothing sorted here.
                </p>
              ) : (
                items.map((it) => (
                  <div
                    key={it.id}
                    className="text-sm text-stone-800 leading-snug rounded-lg bg-stone-50 px-3 py-2"
                    style={{ borderLeft: `3px solid ${accent}` }}
                  >
                    {it.source === 'learner' && (
                      <span className="text-[9px] uppercase tracking-wider text-stone-400 block mb-0.5">
                        You added
                      </span>
                    )}
                    {it.text}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
