'use client';

/**
 * The explorable game route. ExplorableMap owns everything below
 * (map, pins, journal, indoor prompt, the contextualisation explainer
 * including the auto-open-at-4-stops trigger and dev-only preview menu).
 */

import dynamic from 'next/dynamic';

const ExplorableMap = dynamic(
  () => import('@/components/explorable/ExplorableMap'),
  { ssr: false },
);

export default function ExplorablePage() {
  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-black">
      <ExplorableMap />
    </main>
  );
}
