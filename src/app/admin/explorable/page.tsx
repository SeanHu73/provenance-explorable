'use client';

/**
 * Explorable admin — entry point for the GPS-based place-based puzzle
 * game. Currently a stub that links to the live preview and reports
 * build status. Stop authoring UI lands later.
 */

import Link from 'next/link';
import { STANFORD_BOUNDS, STANFORD_CENTER } from '@/lib/explorable/geo';

export default function ExplorableAdminPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 border-b border-stone-300 pb-3">
          <h1 className="text-2xl font-bold">Explorable Admin</h1>
          <p className="text-sm text-stone-600 mt-1">
            Author the two-player evidence-puzzle game. See{' '}
            <code className="bg-stone-200 px-1 rounded">
              docs/Build_State_Explorable.md
            </code>{' '}
            for the full spec.
          </p>
          <nav className="mt-3 text-sm flex gap-4 flex-wrap">
            <Link
              href="/admin/explorable/stops"
              className="text-blue-700 hover:underline font-semibold"
            >
              Manage stops →
            </Link>
            <Link
              href="/explorable"
              className="text-blue-700 hover:underline font-semibold"
            >
              Open game (real GPS)
            </Link>
            <Link
              href="/explorable?devloc=1"
              className="text-amber-700 hover:underline font-semibold"
            >
              Open game (dev override)
            </Link>
            <Link href="/admin" className="text-blue-700 hover:underline">
              Legacy Provenance admin
            </Link>
            <Link href="/" className="text-blue-700 hover:underline">
              Main app
            </Link>
          </nav>
        </header>

        <section className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded">
          <h2 className="font-semibold text-amber-900 mb-2">
            Where we are in the build
          </h2>
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>Direction:</strong> the explorable now uses real Google
            Maps + live GPS, not pixel art. Players physically walk the
            Stanford campus; pins are hidden until they enter a stop's
            detection radius. The pixel-art experiment was removed.
          </p>
          <p className="text-sm text-amber-900 leading-relaxed mt-2">
            <strong>Currently working:</strong> bounded campus map
            (restricted pan, min zoom 16), live player marker, dev
            location override (tap map to fake your GPS — toggle in the
            panel at top right of the map).
          </p>
          <p className="text-sm text-amber-900 leading-relaxed mt-2">
            <strong>Not yet built:</strong> stop coordinates + detection
            radii, hidden-until-discovered pins, stop entry (notice /
            context / collected), puzzle / evidence sorting, reveal, room
            sync.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-lg mb-2">Map configuration</h2>
          <div className="text-sm text-stone-700 space-y-1">
            <p>
              <strong>Center:</strong>{' '}
              <code className="bg-stone-200 px-1 rounded">
                {STANFORD_CENTER.lat.toFixed(5)}, {STANFORD_CENTER.lng.toFixed(5)}
              </code>{' '}
              (Memorial Church)
            </p>
            <p>
              <strong>Bounds (strict):</strong>{' '}
              <code className="bg-stone-200 px-1 rounded text-xs">
                N {STANFORD_BOUNDS.north} · S {STANFORD_BOUNDS.south} · E{' '}
                {STANFORD_BOUNDS.east} · W {STANFORD_BOUNDS.west}
              </code>
            </p>
            <p>
              <strong>Zoom range:</strong> 16 (min) – 20 (max), default 18
            </p>
            <p>
              <strong>Map type:</strong> hybrid (satellite + labels)
            </p>
          </div>
        </section>

        <section className="p-4 bg-stone-100 border border-stone-300 rounded text-sm text-stone-700">
          <h2 className="font-semibold mb-2">How to test from your desk</h2>
          <ol className="list-decimal ml-5 space-y-1">
            <li>
              Open{' '}
              <Link href="/explorable?devloc=1" className="text-blue-700 underline">
                /explorable?devloc=1
              </Link>{' '}
              (the <code>?devloc=1</code> forces the dev panel to show even
              in production).
            </li>
            <li>
              Tick <em>Fake GPS</em> in the top-right panel.
            </li>
            <li>Tap anywhere on the campus map to set your "position".</li>
            <li>The player marker turns orange (vs blue for real GPS).</li>
            <li>
              In dev (<code>npm run dev</code>) the panel is always shown.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
