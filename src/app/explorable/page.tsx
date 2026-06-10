'use client';

/**
 * The explorable game route.
 *
 *   0. Intro explorable — the self-contained contextualization HTML,
 *      shown full-screen as the very first thing. Tapping its
 *      "Begin Your Walk" button fades it out into the EQ screen.
 *   1. ExplorableIntro — cloudy opening with the essential question.
 *   2. ExplorableMap   — bounded Stanford map, pins, journal, etc.
 *
 * The intro HTML is served from /public (same origin), so we can listen
 * for its "Begin Your Walk" button from here WITHOUT modifying the file:
 * we attach a capture-phase click listener to the iframe's document and
 * match the button by its text. Shown once per tab session.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import ExplorableIntro from '@/components/explorable/ExplorableIntro';

const ExplorableMap = dynamic(
  () => import('@/components/explorable/ExplorableMap'),
  { ssr: false },
);

const INTRO_SRC = '/explorables/stanford-contextualization.html';
const INTRO_SEEN_KEY = 'explorable_intro_seen';

export default function ExplorablePage() {
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const introFrameRef = useRef<HTMLIFrameElement>(null);
  // Start with the intro showing; a returning visitor in the same tab
  // session is flipped past it in the effect below.
  const [showIntro, setShowIntro] = useState(true);

  const scrollToMap = useCallback(() => {
    mapSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(INTRO_SEEN_KEY)) setShowIntro(false);
    } catch {
      /* sessionStorage unavailable — just show the intro */
    }
  }, []);

  const beginWalk = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setShowIntro(false);
  }, []);

  // Wire up "Begin your walk" once the same-origin intro frame loads.
  // Delegated, capture-phase listener so it fires even if the explorable
  // stops propagation on its own handlers. Matches the dedicated
  // `#beginWalk` button (the explorable's documented handoff point), or
  // any nearby small element whose text reads "begin your walk".
  const handleIntroLoad = useCallback(() => {
    const doc = introFrameRef.current?.contentDocument;
    if (!doc) return;
    const onClick = (e: Event) => {
      let node = e.target as HTMLElement | null;
      for (let depth = 0; node && depth < 8; depth++) {
        const text = (node.textContent || '').trim().toLowerCase();
        if (node.id === 'beginWalk' || (text.length <= 40 && text.includes('begin your walk'))) {
          beginWalk();
          return;
        }
        node = node.parentElement;
      }
    };
    doc.addEventListener('click', onClick, true);
  }, [beginWalk]);

  return (
    <>
      <main
        className="relative h-[100dvh] w-screen overflow-y-auto overflow-x-hidden bg-black snap-y snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="snap-start">
          <ExplorableIntro onScrollToMap={scrollToMap} />
        </div>
        <div
          ref={mapSectionRef}
          className="snap-start relative w-full h-[100dvh]"
        >
          <ExplorableMap />
        </div>
      </main>

      {/* Intro explorable — overlays everything until "Begin Your Walk",
          then fades out to reveal the essential-question screen. */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="intro-explorable"
            className="fixed inset-0 z-[200] bg-black"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          >
            <iframe
              ref={introFrameRef}
              src={INTRO_SRC}
              title="Stanford Contextualization interactive explorable"
              onLoad={handleIntroLoad}
              className="block w-full h-[100dvh]"
              style={{ border: 0 }}
              allowFullScreen
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
