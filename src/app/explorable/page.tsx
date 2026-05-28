'use client';

/**
 * The explorable game route. Currently shows the bounded Stanford map +
 * the dev location override panel. No stops, no detection, no rooms yet
 * — those come in the next pass.
 *
 * The "Contextualisation lesson" button at the bottom is temporary
 * placement so authors can preview the explainer alongside the map.
 * In the real game flow it'll fire automatically at the midway point.
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';

const ExplorableMap = dynamic(
  () => import('@/components/explorable/ExplorableMap'),
  { ssr: false },
);
const ContextualisationExplainer = dynamic(
  () => import('@/components/explorable/ContextualisationExplainer'),
  { ssr: false },
);

export default function ExplorablePage() {
  const [showExplainer, setShowExplainer] = useState(false);

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-black">
      <ExplorableMap />

      <button
        type="button"
        onClick={() => setShowExplainer(true)}
        className="absolute bottom-5 right-4 z-30 px-6 py-3.5 rounded-full bg-indigo-700 text-white shadow-lg hover:bg-indigo-800 font-semibold text-base whitespace-nowrap"
      >
        Contextualisation lesson
      </button>

      {showExplainer && (
        <ContextualisationExplainer onClose={() => setShowExplainer(false)} />
      )}
    </main>
  );
}
