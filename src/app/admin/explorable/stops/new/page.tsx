'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { blankStop, ExplorableStop } from '@/lib/explorable/stop-types';
import { getStops } from '@/lib/explorable/stops-store';
import StopForm from '@/components/explorable/admin/StopForm';

export default function NewStopPage() {
  const [initial, setInitial] = useState<ExplorableStop | null>(null);

  // Pick a sensible default order = max(existing orders) + 1.
  useEffect(() => {
    let alive = true;
    (async () => {
      const stops = await getStops();
      if (!alive) return;
      const nextOrder = stops.length > 0
        ? Math.max(...stops.map((s) => s.order)) + 1
        : 1;
      setInitial(blankStop(nextOrder));
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 border-b border-stone-300 pb-3">
          <h1 className="text-2xl font-bold">New stop</h1>
          <nav className="mt-2 text-sm">
            <Link href="/admin/explorable/stops" className="text-blue-700 hover:underline">
              ← Back to stops
            </Link>
          </nav>
        </header>

        {!initial ? (
          <p className="text-stone-600">Loading...</p>
        ) : (
          <StopForm initial={initial} isNew={true} />
        )}
      </div>
    </div>
  );
}
