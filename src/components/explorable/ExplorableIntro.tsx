'use client';

/**
 * Cloudy opening screen for /explorable. Sits above the map in the
 * page's scroll container — learners see the essential question first,
 * then scroll (or tap the down arrow) to reach the map.
 *
 * Loads the EQ from config-store independently of ExplorableMap so the
 * intro renders even before the map is mounted further down the page.
 */

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getConfig } from '@/lib/explorable/config-store';

interface Props {
  /** Called when the learner taps the scroll cue. */
  onScrollToMap: () => void;
}

export default function ExplorableIntro({ onScrollToMap }: Props) {
  const [eq, setEq] = useState<string>('');

  useEffect(() => {
    getConfig().then((c) => {
      setEq(c.essentialQuestion || 'What is this place for?');
    });
  }, []);

  const handleScroll = useCallback(() => {
    onScrollToMap();
  }, [onScrollToMap]);

  return (
    <section
      className="relative w-full h-[100dvh] overflow-hidden flex flex-col items-center justify-center px-6"
      style={{
        background:
          'linear-gradient(to bottom, #cfe8f5 0%, #e7f2f9 45%, #f6f4ee 100%)',
      }}
      aria-label="Essential question"
    >
      <CloudLayer />

      {/* Eyebrow + EQ — fades up and unblurs after the clouds settle */}
      <motion.div
        initial={{ opacity: 0, y: 14, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-xl text-center"
      >
        <p
          className="uppercase tracking-[0.32em] text-[11px] mb-4"
          style={{ color: 'rgba(60, 70, 90, 0.7)' }}
        >
          Your essential question
        </p>
        <h1
          className="text-[clamp(1.6rem,5.2vw,2.6rem)] leading-[1.18]"
          style={{
            fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
            color: '#1f2a3a',
            textShadow: '0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          {eq || ' '}
        </h1>
      </motion.div>

      {/* Scroll cue — anchored to the bottom of the intro, gently fading */}
      <motion.button
        type="button"
        onClick={handleScroll}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 2.0 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-stone-700 hover:text-stone-900 transition-colors animate-gentle-fade"
        aria-label="Scroll down to the map"
      >
        <span
          className="text-xs uppercase tracking-[0.28em]"
          style={{ color: 'rgba(60, 70, 90, 0.75)' }}
        >
          Scroll down to your map
        </span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </motion.button>
    </section>
  );
}

/**
 * Soft, slowly drifting cloud shapes. Pure CSS — no images. Each cloud
 * is a stack of white ellipses with low opacity and a small blur, then
 * floated horizontally over a long duration so the motion is barely
 * perceptible.
 */
function CloudLayer() {
  return (
    <>
      <Cloud top="12%" left="-8%" scale={1.1} duration={28} delay={0} />
      <Cloud top="22%" left="60%" scale={0.85} duration={36} delay={4} />
      <Cloud top="40%" left="20%" scale={0.6} duration={32} delay={2} dim />
      <Cloud top="58%" left="-12%" scale={0.95} duration={40} delay={6} />
      <Cloud top="68%" left="55%" scale={0.75} duration={34} delay={1} dim />
      <Cloud top="80%" left="10%" scale={1.05} duration={42} delay={3} />
      <style>{`
        @keyframes cloud-drift {
          0%   { transform: translateX(0) translateY(0); }
          50%  { transform: translateX(40px) translateY(-4px); }
          100% { transform: translateX(0) translateY(0); }
        }
      `}</style>
    </>
  );
}

function Cloud({
  top,
  left,
  scale,
  duration,
  delay,
  dim = false,
}: {
  top: string;
  left: string;
  scale: number;
  duration: number;
  delay: number;
  dim?: boolean;
}) {
  return (
    <div
      aria-hidden
      className="absolute pointer-events-none"
      style={{
        top,
        left,
        width: 220 * scale,
        height: 110 * scale,
        opacity: dim ? 0.55 : 0.85,
        filter: 'blur(2px)',
        animation: `cloud-drift ${duration}s ease-in-out ${delay}s infinite`,
      }}
    >
      <svg viewBox="0 0 220 110" width="100%" height="100%" fill="white">
        <ellipse cx="110" cy="70" rx="100" ry="32" />
        <ellipse cx="62"  cy="62" rx="44" ry="30" />
        <ellipse cx="150" cy="48" rx="52" ry="34" />
        <ellipse cx="118" cy="40" rx="36" ry="26" />
        <ellipse cx="180" cy="64" rx="34" ry="22" />
      </svg>
    </div>
  );
}
