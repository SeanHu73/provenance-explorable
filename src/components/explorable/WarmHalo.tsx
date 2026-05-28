'use client';

/**
 * Blue screen-edge vignette that fades in when the player is within
 * the "warm" radius (between the discovery radius and the warm
 * radius). Closer = brighter + thicker, plus a subtle pulse so the
 * player notices it without it being annoying. Pure CSS — no extra
 * DOM cost when no warm stop is near.
 */

import { DISCOVERY_RADIUS_M, WARM_RADIUS_M } from '@/lib/explorable/discovery';

interface Props {
  closestWarmM: number | null;
}

export default function WarmHalo({ closestWarmM }: Props) {
  if (closestWarmM === null) return null;

  // t = 1 right at the discovery edge, t = 0 at the far warm edge.
  const range = WARM_RADIUS_M - DISCOVERY_RADIUS_M;
  const t = Math.max(0, Math.min(1, (WARM_RADIUS_M - closestWarmM) / range));

  const peak = 0.55 + t * 0.4;         // 0.55 .. 0.95
  const vignetteWidth = 22 + t * 18;   // 22% .. 40% of viewport

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        background: `radial-gradient(ellipse at center,
          rgba(59, 130, 246, 0) ${100 - vignetteWidth - 14}%,
          rgba(59, 130, 246, ${(peak * 0.5).toFixed(2)}) ${100 - vignetteWidth / 2}%,
          rgba(59, 130, 246, ${peak.toFixed(2)}) 100%)`,
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
