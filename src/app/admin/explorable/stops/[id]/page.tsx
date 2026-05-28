'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExplorableStop } from '@/lib/explorable/stop-types';
import { getStop } from '@/lib/explorable/stops-store';
import StopForm from '@/components/explorable/admin/StopForm';

export default function EditStopPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [stop, setStop] = useState<ExplorableStop | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      const s = await getStop(id);
      if (!alive) return;
      setStop(s);
    })();
    return () => { alive = false; };
  }, [id]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 border-b border-stone-300 pb-3">
          <h1 className="text-2xl font-bold">
            {stop ? `Edit: ${stop.title || '(untitled)'}` : 'Edit stop'}
          </h1>
          <nav className="mt-2 text-sm">
            <Link href="/admin/explorable/stops" className="text-blue-700 hover:underline">
              ← Back to stops
            </Link>
          </nav>
        </header>

        {stop === undefined && <p className="text-stone-600">Loading...</p>}
        {stop === null && (
          <div className="p-4 bg-red-50 border border-red-300 rounded text-red-900 text-sm">
            Stop not found. It may have been deleted.
          </div>
        )}
        {stop && <StopForm initial={stop} isNew={false} />}
      </div>
    </div>
  );
}
