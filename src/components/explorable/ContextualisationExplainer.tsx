'use client';

/**
 * The midway "What is contextualisation?" lesson, shown to players
 * between Exploration Phase 1 and the first evidence sort.
 *
 * Format: full-screen modal, snap-scroll, one idea per screen. Two
 * interactive beats:
 *   - the cake whodunnit (multiple choice A/B/C — wrong choices show
 *     a red explanation, correct choice turns green and auto-scrolls)
 *   - the puzzle animation (two pieces from different puzzles refuse
 *     to fit; then a matching piece slides in cleanly)
 *
 * The final section restates whatever EQ is currently saved in
 * explorable-config so the lesson lands inside the actual game.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { getConfig } from '@/lib/explorable/config-store';

interface Props {
  onClose: () => void;
}

export default function ContextualisationExplainer({ onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [eq, setEq] = useState<string>('');

  useEffect(() => {
    getConfig().then((c) => setEq(c.essentialQuestion || 'What is this place for?'));
    // Reset scroll on open
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950 text-stone-100"
      style={{ fontFamily: 'var(--font-newsreader), Georgia, serif' }}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-stone-800/80 hover:bg-stone-700 text-2xl leading-none flex items-center justify-center"
        aria-label="Close explainer"
      >
        ×
      </button>

      <div
        ref={containerRef}
        className="h-[100dvh] w-full overflow-y-auto snap-y snap-mandatory"
      >
        <Section id="s-eq">
          <Heading>What is historical contextualisation?</Heading>
          <ScrollHint />
        </Section>

        <Section id="s-def">
          <Body>
            Contextualisation is the process of understanding people, ideas,
            and events in the past within their specific time and place.
          </Body>
          <ScrollHint />
        </Section>

        <Section id="s-church">
          <Body>
            We wouldn't look at the church and say that the Stanfords wanted
            to build this university because it was located in Silicon Valley.
          </Body>
          <ScrollHint />
        </Section>

        <Section id="s-discuss">
          <Heading>Why not? Discuss.</Heading>
          <ScrollHint />
        </Section>

        <Section id="s-because">
          <Body>
            Because the university was built long before Silicon Valley was
            a thing!
          </Body>
          <ScrollHint />
        </Section>

        <Section id="s-transition">
          <Body className="italic text-stone-300">
            Let's find an example you might relate to…
          </Body>
          <ScrollHint />
        </Section>

        <Section id="s-cake-setup">
          <Body>
            You left a cake in the fridge at school on Friday. When you went
            back to the fridge on Monday, it was gone. Who took it?
          </Body>
          <ScrollHint />
        </Section>

        <Section id="s-clue-a">
          <Clue tag="Clue A">
            Your friend <strong>Jason</strong> was eating a cake last Thursday.
            It must have been him.
          </Clue>
          <ScrollHint />
        </Section>

        <Section id="s-clue-b">
          <Clue tag="Clue B">
            Early in the morning, your roommate <strong>Margot</strong> was
            eating a cake. Got her!
          </Clue>
          <ScrollHint />
        </Section>

        <Section id="s-clue-c">
          <Clue tag="Clue C">
            On your way out of school, you saw a <strong>cleaner</strong>{' '}
            walking into the fridge with a big bag full of trash. Maybe?
          </Clue>
          <ScrollHint />
        </Section>

        <Section id="s-question">
          <CakeQuestion onCorrect={() => scrollTo('s-puzzle-intro')} />
        </Section>

        <Section id="s-puzzle-intro">
          <Body>
            Historical contextualisation is a lot like putting together a
            puzzle. You can't use a piece from a different puzzle and expect
            it to fit. You also can't just use any random piece from the
            same puzzle unless it's the one right next to it.
          </Body>
          <ScrollHint />
        </Section>

        <Section id="s-puzzle-anim">
          <PuzzleAnimation />
        </Section>

        <Section id="s-history-puzzle">
          <Body>
            In history, we are trying to find pieces of the puzzle across
            time and space. Let's go back to answering our question.
          </Body>
          <ScrollHint />
        </Section>

        <Section id="s-eq-restated">
          <div className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-4">
            Our essential question
          </div>
          <Heading>{eq || 'What is this place for?'}</Heading>
        </Section>
      </div>
    </div>
  );
}

// ───── Layout helpers ─────────────────────────────────────────

function Section({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section
      id={id}
      className="snap-start min-h-[100dvh] w-full flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      <div className="max-w-2xl w-full mx-auto">{children}</div>
    </section>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl sm:text-5xl font-semibold leading-tight">
      {children}
    </h2>
  );
}

function Body({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-xl sm:text-3xl leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

function Clue({
  tag,
  children,
}: {
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-[0.3em] text-amber-400">
        {tag}
      </div>
      <p className="text-xl sm:text-3xl leading-relaxed">{children}</p>
    </div>
  );
}

function ScrollHint() {
  return (
    <motion.div
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      className="mt-12 text-stone-500 text-sm"
      aria-hidden
    >
      ▼
    </motion.div>
  );
}

// ───── Cake question ─────────────────────────────────────────

type CakeChoice = 'A' | 'B' | 'C';

interface CakeOption {
  id: CakeChoice;
  label: string;
  correct: boolean;
  explanation: string;
}

const CAKE_OPTIONS: CakeOption[] = [
  {
    id: 'A',
    label: 'Jason',
    correct: false,
    explanation:
      "It couldn't have been Jason — he ate his cake on Thursday, but yours was left on Friday. Timing is impossible.",
  },
  {
    id: 'B',
    label: 'Margot',
    correct: false,
    explanation:
      "It couldn't have been Margot — she's your roommate. She wasn't even at school to take your cake. Wrong place.",
  },
  {
    id: 'C',
    label: 'The cleaner',
    correct: true,
    explanation:
      'Correct! The timing and place line up — the cleaner had access to the fridge with a bag of trash.',
  },
];

function CakeQuestion({ onCorrect }: { onCorrect: () => void }) {
  const [selected, setSelected] = useState<CakeChoice | null>(null);
  const handledCorrectRef = useRef(false);

  const handleClick = (id: CakeChoice) => {
    setSelected(id);
    const opt = CAKE_OPTIONS.find((o) => o.id === id)!;
    if (opt.correct && !handledCorrectRef.current) {
      handledCorrectRef.current = true;
      // Brief pause so the green + "Correct!" lands before scrolling.
      setTimeout(onCorrect, 1600);
    }
  };

  const selectedOpt = selected
    ? CAKE_OPTIONS.find((o) => o.id === selected) || null
    : null;

  return (
    <div className="space-y-8">
      <Heading>Who took your cake?</Heading>
      <div className="flex flex-col gap-3 max-w-md mx-auto">
        {CAKE_OPTIONS.map((opt) => {
          const isSelected = selected === opt.id;
          const isCorrect = isSelected && opt.correct;
          const isWrong = isSelected && !opt.correct;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleClick(opt.id)}
              className={`px-5 py-4 rounded-lg text-lg sm:text-xl text-left transition-colors border-2 ${
                isCorrect
                  ? 'bg-green-700 border-green-300 text-white'
                  : isWrong
                  ? 'bg-red-700 border-red-300 text-white'
                  : 'bg-stone-800 border-stone-600 hover:border-stone-400'
              }`}
            >
              <span className="font-mono mr-3 opacity-70">({opt.id})</span>
              {opt.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {selectedOpt && (
          <motion.div
            key={selectedOpt.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className={`text-base sm:text-lg leading-relaxed mt-4 ${
              selectedOpt.correct ? 'text-green-300' : 'text-red-300'
            }`}
          >
            {selectedOpt.explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───── Puzzle animation ─────────────────────────────────────

/**
 * SVG paths (60x60 base square, all going clockwise from top-left):
 *
 *   TAB on right edge:    body extends to x=68 via a half-circle arc.
 *   SOCKET on left edge:  body has an inward arc at the left edge.
 *   TAB on left edge:     body extends to x=-8 (other puzzle).
 *
 * Piece A (tab right) + Piece B (socket left) = interlock perfectly.
 * Piece A (tab right) + Piece X (tab left)   = tabs collide.
 */

const PATH_TAB_RIGHT  = 'M 0 0 H 60 V 22 a 8 8 0 0 1 0 16 V 60 H 0 Z';
const PATH_SOCKET_LEFT = 'M 0 0 H 60 V 60 H 0 V 38 a 8 8 0 0 1 0 -16 V 0 Z';
const PATH_TAB_LEFT   = 'M 0 0 H 60 V 60 H 0 V 38 a 8 8 0 0 0 0 -16 V 0 Z';

type PuzzlePhase = 'try1' | 'try2' | 'success';

function PuzzleAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [phase, setPhase] = useState<PuzzlePhase>('try1');

  useEffect(() => {
    if (!inView) {
      setPhase('try1');
      return;
    }
    // try1 already, advance through try2 and success.
    const t1 = setTimeout(() => setPhase('try2'), 3000);
    const t2 = setTimeout(() => setPhase('success'), 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [inView]);

  const isFail = phase === 'try1' || phase === 'try2';

  return (
    <div ref={ref} className="space-y-6">
      <div className="text-xs uppercase tracking-[0.3em] text-stone-400">
        {phase === 'try1' && 'Different puzzles — try 1'}
        {phase === 'try2' && 'Different puzzles — try 2'}
        {phase === 'success' && 'Same puzzle — perfect fit'}
      </div>

      <div className="relative h-44 w-full max-w-md mx-auto">
        <svg
          viewBox="-10 -10 260 80"
          className="w-full h-full"
          aria-label="Puzzle pieces"
        >
          {/* Piece A — Puzzle 1, tab right, blue (stationary) */}
          <g transform="translate(20, 0)">
            <path d={PATH_TAB_RIGHT} fill="#3b82f6" stroke="#1e40af" strokeWidth="1.5" />
            <text x="22" y="34" fontSize="10" fill="#fff" fontFamily="system-ui" fontWeight="600">
              1
            </text>
          </g>

          <AnimatePresence mode="wait">
            {isFail && (
              <motion.g
                key={phase}
                initial={{ x: 240 }}
                animate={{ x: [240, 96, 124, 96, 124, 240] }}
                exit={{ x: 260, opacity: 0 }}
                transition={{
                  duration: 2.8,
                  times: [0, 0.32, 0.45, 0.58, 0.7, 1],
                  ease: 'easeInOut',
                }}
              >
                {/* Piece X — Puzzle 2, tab left, red */}
                <g transform="translate(0, 0)">
                  <path d={PATH_TAB_LEFT} fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
                  <text x="22" y="34" fontSize="10" fill="#fff" fontFamily="system-ui" fontWeight="600">
                    2
                  </text>
                </g>
              </motion.g>
            )}

            {phase === 'success' && (
              <motion.g
                key="success"
                initial={{ x: 240 }}
                animate={{ x: 80 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              >
                {/* Piece B — Puzzle 1, socket left, blue (matches A) */}
                <g transform="translate(0, 0)">
                  <path d={PATH_SOCKET_LEFT} fill="#60a5fa" stroke="#1e40af" strokeWidth="1.5" />
                  <text x="22" y="34" fontSize="10" fill="#fff" fontFamily="system-ui" fontWeight="600">
                    1
                  </text>
                </g>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>

        {/* Verdict mark — bounces in over the pieces */}
        <AnimatePresence>
          {isFail && (
            <motion.div
              key={`x-${phase}`}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.4, 0.4, 1.2, 1, 0.8] }}
              transition={{ duration: 2.8, times: [0, 0.45, 0.55, 0.85, 1] }}
              className="absolute inset-0 flex items-center justify-center text-6xl text-red-400 font-bold pointer-events-none"
            >
              ✕
            </motion.div>
          )}
          {phase === 'success' && (
            <motion.div
              key="check"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center text-6xl text-green-400 font-bold pointer-events-none"
            >
              ✓
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-sm text-stone-400">
        {isFail
          ? 'Two pieces from two different puzzles. They look like they should fit — they don\'t.'
          : 'Both pieces from the same puzzle. They interlock.'}
      </p>
    </div>
  );
}
