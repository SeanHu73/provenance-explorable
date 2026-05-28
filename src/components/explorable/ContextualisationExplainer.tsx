'use client';

/**
 * Plays the Contextualisation lesson — either authored screens (from
 * config.explainerScreens) or, if none authored yet, a built-in
 * fallback (the cake whodunnit + puzzle animation).
 *
 * Always ends on a screen that restates the Essential Question.
 *
 * Visual treatment: fixed background photo + translucent backdrop-
 * blurred cards. Snap-scroll with snap-stop:always so a single fling
 * can't skip multiple screens.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { getConfig } from '@/lib/explorable/config-store';
import {
  Screen,
  TextScreen,
  QuestionScreen,
} from '@/lib/explorable/explainer-types';

interface Props {
  onClose: () => void;
}

export default function ContextualisationExplainer({ onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [eq, setEq] = useState<string>('');
  const [bgPhoto, setBgPhoto] = useState<string | null>(null);
  const [authored, setAuthored] = useState<Screen[] | null>(null);

  useEffect(() => {
    getConfig().then((c) => {
      setEq(c.essentialQuestion || 'What is this place for?');
      setBgPhoto(c.backgroundPhotoUrl);
      setAuthored(c.explainerScreens || []);
    });
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, []);

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        fontFamily: 'var(--font-newsreader), Georgia, serif',
        backgroundColor: '#e9e4e2',
      }}
    >
      {bgPhoto && (
        <div className="absolute inset-0 z-0">
          <img
            src={bgPhoto}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-stone-900 text-2xl leading-none flex items-center justify-center shadow-lg backdrop-blur-sm"
        aria-label="Close explainer"
      >
        ×
      </button>

      <div
        ref={containerRef}
        className="relative z-10 h-[100dvh] w-full overflow-y-auto snap-y snap-mandatory"
      >
        {authored === null ? (
          <SnapShell>
            <Body className="italic text-stone-500">Loading…</Body>
          </SnapShell>
        ) : authored.length > 0 ? (
          authored.map((s, i) => (
            <AuthoredScreenView
              key={s.id}
              screen={s}
              isLast={i === authored.length - 1}
              onCorrectAdvance={() => scrollToId('s-eq')}
            />
          ))
        ) : (
          <FallbackContent
            onAdvanceToPuzzle={() => scrollToId('s-puzzle-intro')}
          />
        )}

        {/* Final EQ screen — always appended */}
        <SnapShell id="s-eq">
          <div className="text-xs uppercase tracking-[0.3em] text-stone-500 mb-4">
            Our essential question
          </div>
          <Heading>{eq || 'What is this place for?'}</Heading>
        </SnapShell>
      </div>
    </div>
  );
}

// ───── Authored screen renderers ────────────────────────────

function AuthoredScreenView({
  screen,
  isLast,
  onCorrectAdvance,
}: {
  screen: Screen;
  isLast: boolean;
  onCorrectAdvance: () => void;
}) {
  if (screen.kind === 'text') return <TextScreenView screen={screen} />;
  return (
    <QuestionScreenView
      screen={screen}
      onCorrect={isLast ? onCorrectAdvance : () => {/* default snap */}}
    />
  );
}

function TextScreenView({ screen }: { screen: TextScreen }) {
  return (
    <SnapShell>
      {screen.tag && <Tag>{screen.tag}</Tag>}
      {screen.contentHtml && (
        <div
          className="rich text-xl sm:text-2xl leading-relaxed"
          style={{ color: 'var(--th-text, #3a3a32)' }}
          dangerouslySetInnerHTML={{ __html: screen.contentHtml }}
        />
      )}
      {screen.imageUrl && (
        <img
          src={screen.imageUrl}
          alt=""
          className="mt-2 w-full rounded-lg shadow"
        />
      )}
      <ScrollHint />
    </SnapShell>
  );
}

function QuestionScreenView({
  screen,
  onCorrect,
}: {
  screen: QuestionScreen;
  onCorrect: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const handledCorrectRef = useRef(false);

  const handleClick = (id: string) => {
    setSelected(id);
    const opt = screen.options.find((o) => o.id === id);
    if (opt?.correct && !handledCorrectRef.current) {
      handledCorrectRef.current = true;
      setTimeout(onCorrect, 1600);
    }
  };

  const selectedOpt = selected
    ? screen.options.find((o) => o.id === selected) || null
    : null;

  return (
    <>
      {/* 1. The initial question on its own screen (only if authored). */}
      {screen.questionHtml && (
        <SnapShell>
          <div
            className="rich text-left sm:text-center"
            style={{
              fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
              color: 'var(--th-primary, #8b2538)',
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              lineHeight: 1.15,
            }}
            dangerouslySetInnerHTML={{ __html: screen.questionHtml }}
          />
          <ScrollHint />
        </SnapShell>
      )}

      {/* 2. One presentation screen per option (skip empty ones). */}
      {screen.options.map((opt) =>
        opt.presentationHtml || opt.tag ? (
          <SnapShell key={`pres-${opt.id}`}>
            {opt.tag && <Tag>{opt.tag}</Tag>}
            {opt.presentationHtml && (
              <div
                className="rich text-xl sm:text-2xl leading-relaxed"
                style={{ color: 'var(--th-text, #3a3a32)' }}
                dangerouslySetInnerHTML={{ __html: opt.presentationHtml }}
              />
            )}
            <ScrollHint />
          </SnapShell>
        ) : null,
      )}

      {/* 3. Final choice screen — buttons + responses. */}
      <SnapShell wide>
        <div className="space-y-8">
          <Heading>Pick the right one</Heading>

          <div className="flex flex-col gap-3 max-w-md mx-auto">
            {screen.options.map((opt) => {
              const isSelected = selected === opt.id;
              const isCorrect = isSelected && opt.correct;
              const isWrong = isSelected && !opt.correct;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleClick(opt.id)}
                  className={`px-5 py-4 rounded-lg text-lg sm:text-xl text-left transition-colors border-2 font-medium ${
                    isCorrect
                      ? 'bg-green-600 border-green-700 text-white'
                      : isWrong
                      ? 'bg-red-600 border-red-700 text-white'
                      : 'bg-white/70 border-stone-300 text-stone-800 hover:bg-white hover:border-stone-500'
                  }`}
                  style={{
                    fontFamily: 'var(--font-newsreader), Georgia, serif',
                  }}
                >
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
                className={`rich text-base sm:text-lg leading-relaxed mt-4 ${
                  selectedOpt.correct ? 'text-green-800' : 'text-red-800'
                }`}
                dangerouslySetInnerHTML={{
                  __html:
                    selectedOpt.responseHtml ||
                    (selectedOpt.correct ? 'Correct!' : 'Not quite — try again.'),
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </SnapShell>
    </>
  );
}

// ───── Built-in fallback (when no screens authored) ─────────

function FallbackContent({
  onAdvanceToPuzzle,
}: {
  onAdvanceToPuzzle: () => void;
}) {
  return (
    <>
      <SnapShell id="s-eq-intro">
        <Heading>What is historical contextualisation?</Heading>
        <ScrollHint />
      </SnapShell>

      <SnapShell>
        <Body>
          Contextualisation is the process of understanding people, ideas,
          and events in the past within their specific time and place.
        </Body>
        <ScrollHint />
      </SnapShell>

      <SnapShell>
        <Body>
          We wouldn't look at the church and say that the Stanfords wanted
          to build this university because it was located in Silicon Valley.
        </Body>
        <ScrollHint />
      </SnapShell>

      <SnapShell>
        <Heading>Why not? Discuss.</Heading>
        <ScrollHint />
      </SnapShell>

      <SnapShell>
        <Body>
          Because the university was built long before Silicon Valley was
          a thing!
        </Body>
        <ScrollHint />
      </SnapShell>

      <SnapShell>
        <Body className="italic text-stone-700">
          Let's find an example you might relate to…
        </Body>
        <ScrollHint />
      </SnapShell>

      <SnapShell>
        <Body>
          You left a cake in the fridge at school on Friday. When you went
          back to the fridge on Monday, it was gone. Who took it?
        </Body>
        <ScrollHint />
      </SnapShell>

      <SnapShell>
        <Tag>Clue A</Tag>
        <Body>
          Your friend <strong>Jason</strong> was eating a cake last Thursday.
          It must have been him.
        </Body>
        <ScrollHint />
      </SnapShell>

      <SnapShell>
        <Tag>Clue B</Tag>
        <Body>
          Early in the morning, your roommate <strong>Margot</strong> was
          eating a cake. Got her!
        </Body>
        <ScrollHint />
      </SnapShell>

      <SnapShell>
        <Tag>Clue C</Tag>
        <Body>
          On your way out of school, you saw a <strong>cleaner</strong>{' '}
          walking into the fridge with a big bag full of trash. Maybe?
        </Body>
        <ScrollHint />
      </SnapShell>

      <SnapShell wide>
        <CakeQuestion onCorrect={onAdvanceToPuzzle} />
      </SnapShell>

      <SnapShell id="s-puzzle-intro">
        <Body>
          Historical contextualisation is a lot like putting together a
          puzzle. You can't use a piece from a different puzzle and expect
          it to fit. You also can't just use any random piece from the
          same puzzle unless it's the one right next to it.
        </Body>
        <ScrollHint />
      </SnapShell>

      <SnapShell wide>
        <PuzzleAnimation />
      </SnapShell>

      <SnapShell>
        <Body>
          In history, we are trying to find pieces of the puzzle across
          time and space. Let's go back to answering our question.
        </Body>
        <ScrollHint />
      </SnapShell>
    </>
  );
}

// ───── Layout primitives ────────────────────────────────────

function SnapShell({
  id,
  wide = false,
  children,
}: {
  id?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="snap-start snap-always min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-12"
    >
      <div
        className={`${
          wide ? 'max-w-2xl' : 'max-w-xl'
        } w-full mx-auto rounded-2xl shadow-2xl px-6 sm:px-10 py-10 sm:py-14 text-center space-y-5`}
        style={{
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          color: 'var(--th-text, #3a3a32)',
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-3xl sm:text-5xl font-semibold leading-tight"
      style={{
        fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
        color: 'var(--th-primary, #8b2538)',
      }}
    >
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
    <p
      className={`text-xl sm:text-2xl leading-relaxed ${className}`}
      style={{ color: 'var(--th-text, #3a3a32)' }}
    >
      {children}
    </p>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs uppercase tracking-[0.3em]"
      style={{ color: 'var(--th-secondary, #b8752b)' }}
    >
      {children}
    </div>
  );
}

function ScrollHint() {
  return (
    <motion.div
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      className="mt-12 text-sm"
      style={{ color: 'var(--th-text-muted, #6b6b61)' }}
      aria-hidden
    >
      ▼
    </motion.div>
  );
}

// ───── Built-in cake question (used in fallback) ────────────

const CAKE_OPTIONS = [
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
  const [selected, setSelected] = useState<string | null>(null);
  const handledCorrectRef = useRef(false);

  const handleClick = (id: string) => {
    setSelected(id);
    const opt = CAKE_OPTIONS.find((o) => o.id === id)!;
    if (opt.correct && !handledCorrectRef.current) {
      handledCorrectRef.current = true;
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
              className={`px-5 py-4 rounded-lg text-lg sm:text-xl text-left transition-colors border-2 font-medium ${
                isCorrect
                  ? 'bg-green-600 border-green-700 text-white'
                  : isWrong
                  ? 'bg-red-600 border-red-700 text-white'
                  : 'bg-white/70 border-stone-300 text-stone-800 hover:bg-white hover:border-stone-500'
              }`}
              style={{
                fontFamily: 'var(--font-newsreader), Georgia, serif',
              }}
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
              selectedOpt.correct ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {selectedOpt.explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───── Built-in puzzle animation (used in fallback) ─────────

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
      <div
        className="text-xs uppercase tracking-[0.3em]"
        style={{ color: 'var(--th-text-muted, #6b6b61)' }}
      >
        {phase === 'try1' && 'Different puzzles — try 1'}
        {phase === 'try2' && 'Different puzzles — try 2'}
        {phase === 'success' && 'Same puzzle — perfect fit'}
      </div>

      <div className="relative h-44 w-full max-w-md mx-auto">
        <svg viewBox="-10 -10 260 80" className="w-full h-full">
          <g transform="translate(20, 0)">
            <path d={PATH_TAB_RIGHT} fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1.5" />
            <text x="22" y="34" fontSize="10" fill="#fff" fontFamily="system-ui" fontWeight="600">1</text>
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
                <g transform="translate(0, 0)">
                  <path d={PATH_TAB_LEFT} fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
                  <text x="22" y="34" fontSize="10" fill="#fff" fontFamily="system-ui" fontWeight="600">2</text>
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
                <g transform="translate(0, 0)">
                  <path d={PATH_SOCKET_LEFT} fill="#60a5fa" stroke="#1e3a8a" strokeWidth="1.5" />
                  <text x="22" y="34" fontSize="10" fill="#fff" fontFamily="system-ui" fontWeight="600">1</text>
                </g>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>

        <AnimatePresence>
          {isFail && (
            <motion.div
              key={`x-${phase}`}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.4, 0.4, 1.2, 1, 0.8] }}
              transition={{ duration: 2.8, times: [0, 0.45, 0.55, 0.85, 1] }}
              className="absolute inset-0 flex items-center justify-center text-6xl text-red-600 font-bold pointer-events-none"
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
              className="absolute inset-0 flex items-center justify-center text-6xl text-green-700 font-bold pointer-events-none"
            >
              ✓
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
