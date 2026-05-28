'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { blankStop, ExplorableStop } from '@/lib/explorable/stop-types';
import StopForm from '@/components/explorable/admin/StopForm';

export default function NewStopPage() {
  const [initial, setInitial] = useState<ExplorableStop | null>(null);

  useEffect(() => {
    setInitial(blankStop());
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
