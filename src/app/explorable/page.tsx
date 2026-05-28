'use client';

/**
 * The explorable game route. Two snap-aligned screens stacked vertically:
 *   1. ExplorableIntro — cloudy opening with the essential question.
 *   2. ExplorableMap   — bounded Stanford map, pins, journal, etc.
 *
 * Learners read the EQ, then scroll (or tap the down arrow) to reveal
 * the map. The body has `overflow: hidden` globally, so the <main>
 * element acts as the scroll container.
 */

import { useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import ExplorableIntro from '@/components/explorable/ExplorableIntro';

const ExplorableMap = dynamic(
  () => import('@/components/explorable/ExplorableMap'),
  { ssr: false },
);

export default function ExplorablePage() {
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const scrollToMap = useCallback(() => {
    mapSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  return (
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
  );
}
