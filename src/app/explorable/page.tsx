'use client';

/**
 * The explorable game route. Currently shows the bounded Stanford map +
 * the dev location override panel. No stops, no detection, no rooms yet
 * — those come in the next pass.
 */

import dynamic from 'next/dynamic';

// Google Maps depends on `window`; load on the client only.
const ExplorableMap = dynamic(
  () => import('@/components/explorable/ExplorableMap'),
  { ssr: false },
);

export default function ExplorablePage() {
  return (
    <main className="h-[100dvh] w-screen overflow-hidden bg-black">
      <ExplorableMap />
    </main>
  );
}
