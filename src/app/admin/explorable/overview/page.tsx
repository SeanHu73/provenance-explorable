'use client';

/**
 * All-stops overview map — full-screen, every authored stop pinned
 * and numbered. Built for screenshotting. Minimal chrome on purpose.
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const StopsOverviewMap = dynamic(
  () => import('@/components/explorable/admin/StopsOverviewMap'),
  { ssr: false },
);

export default function StopsOverviewPage() {
  // Hide chrome via query param for the cleanest screenshot.
  const [bare, setBare] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setBare(new URLSearchParams(window.location.search).has('bare'));
  }, []);

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-black">
      <StopsOverviewMap />

      {!bare && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
          <Link
            href="/admin/explorable"
            className="px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-stone-900 text-xs font-medium shadow"
          >
            ← Admin
          </Link>
          <Link
            href="/admin/explorable/overview?bare=1"
            className="px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-stone-900 text-xs font-medium shadow"
          >
            Hide chrome
          </Link>
        </div>
      )}

      {bare && (
        <div className="absolute top-3 right-3 z-30">
          <Link
            href="/admin/explorable/overview"
            className="px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-stone-900 text-xs font-medium shadow"
          >
            Show chrome
          </Link>
        </div>
      )}
    </main>
  );
}
