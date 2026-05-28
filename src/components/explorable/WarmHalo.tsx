'use client';

/**
 * Yellow screen-edge vignette that fades in when the player is within
 * the "warm" radius (between 5 m and 10 m of a stop). Closer = more
 * intense. Pure CSS — no extra DOM cost when no warm stop is near.
 */

import { DISCOVERY_RADIUS_M, WARM_RADIUS_M } from '@/lib/explorable/discovery';

interface Props {
  closestWarmM: number | null;
}

export default function WarmHalo({ closestWarmM }: Props) {
  if (closestWarmM === null) return null;

  // Normalise 5 m → strongest (1.0), 10 m → weakest (0.0).
  const range = WARM_RADIUS_M - DISCOVERY_RADIUS_M; // 5
  const t = Math.max(
    0,
    Math.min(1, (WARM_RADIUS_M - closestWarmM) / range),
  );

  const innerOpacity = 0.0;
  const outerOpacity = 0.45 + t * 0.4; // 0.45..0.85
  const vignetteWidth = 18 + t * 14;   // 18%..32% of viewport

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        background: `radial-gradient(ellipse at center,
          rgba(252, 211, 77, ${innerOpacity}) ${100 - vignetteWidth - 8}%,
          rgba(252, 211, 77, ${outerOpacity}) 100%)`,
        transition: 'background 200ms linear',
        mixBlendMode: 'multiply',
      }}
      aria-hidden
    />
  );
}
