'use client';

/**
 * Stop list — overview of every authored stop. Sort by order, click to
 * edit, button to add a new one. Shows a compact summary so the author
 * can scan the whole set at a glance.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExplorableStop } from '@/lib/explorable/stop-types';
import { getStops } from '@/lib/explorable/stops-store';

export default function StopsListPage() {
  const [stops, setStops] = useState<ExplorableStop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await getStops();
      if (alive) {
        setStops(s);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 border-b border-stone-300 pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Stops</h1>
              <p className="text-sm text-stone-600 mt-1">
                Author the stops players visit during the explorable.
                Stored in Firestore <code className="bg-stone-200 px-1 rounded">explorable-stops</code>.
              </p>
            </div>
            <Link
              href="/admin/explorable/stops/new"
              className="px-3 py-1.5 rounded bg-blue-700 text-white text-sm hover:bg-blue-800 whitespace-nowrap"
            >
              + Add stop
            </Link>
          </div>
          <nav className="mt-3 text-sm flex gap-4 flex-wrap">
            <Link href="/admin/explorable" className="text-blue-700 hover:underline">
              ← Explorable admin
            </Link>
            <Link href="/explorable" className="text-blue-700 hover:underline">
              Open game (real GPS)
            </Link>
            <Link href="/explorable?devloc=1" className="text-amber-700 hover:underline">
              Open game (dev override)
            </Link>
          </nav>
        </header>

        {loading ? (
          <p className="text-stone-600">Loading stops...</p>
        ) : stops.length === 0 ? (
          <div className="p-6 bg-white border border-stone-300 rounded text-center text-stone-600 text-sm">
            No stops yet. Click <strong>+ Add stop</strong> to create the first one.
          </div>
        ) : (
          <ul className="space-y-2">
            {stops.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/explorable/stops/${s.id}`}
                  className="block p-3 bg-white border border-stone-300 rounded hover:bg-stone-50"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {s.title || <em className="text-stone-400">(untitled)</em>}
                        {s.isIndoor && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            indoor
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 font-mono mt-0.5">
                        {s.location.lat.toFixed(5)}, {s.location.lng.toFixed(5)}
                      </div>
                      <div className="text-xs text-stone-500 mt-1 flex flex-wrap gap-3">
                        <span>{s.notice.photos.length} notice photo{s.notice.photos.length === 1 ? '' : 's'}</span>
                        <span>{s.context.photos.length} context photo{s.context.photos.length === 1 ? '' : 's'}</span>
                        {s.notice.audio && <span>notice audio</span>}
                        {s.context.audio && <span>context audio</span>}
                        {s.contextualEvidence.length > 0 && (
                          <span>
                            {s.contextualEvidence.length} evidence
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
