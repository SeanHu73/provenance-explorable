'use client';

/**
 * Edge vignette that signals how close the player is to a stop.
 *
 *   inside discovery radius → GREEN (a pin is on screen)
 *   inside warm radius only → BLUE  ("you're warm, getting closer")
 *   neither                 → no halo
 *
 * Closer = brighter + thicker, plus a subtle pulse so the cue catches
 * the eye without being annoying. Pure CSS — zero DOM when nothing is
 * in range.
 */

import { DISCOVERY_RADIUS_M, WARM_RADIUS_M } from '@/lib/explorable/discovery';

interface Props {
  closestDiscoveredM: number | null;
  closestWarmM: number | null;
}

export default function WarmHalo({
  closestDiscoveredM,
  closestWarmM,
}: Props) {
  // Discovery wins over warm — once a pin's on screen we celebrate.
  const inDiscovery = closestDiscoveredM !== null;
  const distance = inDiscovery ? closestDiscoveredM : closestWarmM;
  if (distance === null) return null;

  // t = 1 at the band's brightest edge, 0 at the faintest.
  const t = inDiscovery
    ? // 0 m → strongest, DISCOVERY_RADIUS_M → faintest
      Math.max(0, Math.min(1, (DISCOVERY_RADIUS_M - distance) / DISCOVERY_RADIUS_M))
    : // DISCOVERY edge → strongest, WARM edge → faintest
      Math.max(
        0,
        Math.min(
          1,
          (WARM_RADIUS_M - distance) / (WARM_RADIUS_M - DISCOVERY_RADIUS_M),
        ),
      );

  const peak = 0.55 + t * 0.4;        // 0.55 .. 0.95
  const vignetteWidth = 22 + t * 18;  // 22% .. 40% of viewport

  // Tailwind colours: green-500 / blue-500.
  const rgb = inDiscovery ? '34, 197, 94' : '59, 130, 246';

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        background: `radial-gradient(ellipse at center,
          rgba(${rgb}, 0) ${100 - vignetteWidth - 14}%,
          rgba(${rgb}, ${(peak * 0.5).toFixed(2)}) ${100 - vignetteWidth / 2}%,
          rgba(${rgb}, ${peak.toFixed(2)}) 100%)`,
        transition: 'background 200ms linear',
        animation: 'explorable-warm-halo 1.4s ease-in-out infinite',
      }}
      aria-hidden
    >
      <style>{`
        @keyframes explorable-warm-halo {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
