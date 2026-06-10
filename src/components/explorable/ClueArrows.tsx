'use client';

/**
 * Directional arrows that radiate from the player marker toward nearby
 * clues the player hasn't reached yet, so they know which way to walk.
 *
 * Rendered as the content of the player's AdvancedMarker, so the ring
 * stays a fixed pixel size on screen (it doesn't scale with the map)
 * and always tracks the player. The map is north-up with no heading
 * rotation, so each stop's geographic bearing maps straight to a screen
 * direction: 0° points up, 90° points right.
 *
 * Once a clue is within the discovery radius it gets a real pin + the
 * green halo, so those are dropped here — arrows are only for clues
 * that are still out of sight.
 */

export interface ClueArrowTarget {
  id: string;
  /** Bearing from the player to the clue, degrees clockwise from north. */
  bearing: number;
  /** Distance from the player in metres. */
  distanceM: number;
}

interface Props {
  targets: ClueArrowTarget[];
}

/** How far the arrow ring sits from the player dot's centre, in px. */
const RING_RADIUS = 34;

export default function ClueArrows({ targets }: Props) {
  if (targets.length === 0) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 0,
        height: 0,
        pointerEvents: 'none',
      }}
    >
      {targets.map((t, i) => {
        const rad = (t.bearing * Math.PI) / 180;
        // North is up → x uses sin, y uses -cos (screen y grows downward).
        const x = Math.sin(rad) * RING_RADIUS;
        const y = -Math.cos(rad) * RING_RADIUS;
        return (
          <div
            key={t.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {/* Arrow head — rotated to point along the bearing, away from
                the player. The triangle's default tip points up (north). */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              style={{
                transform: `rotate(${t.bearing}deg)`,
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                animation: `clue-arrow-bob 1.3s ease-in-out ${i * 0.18}s infinite`,
              }}
            >
              <path
                d="M12 2 L20 20 L12 15 L4 20 Z"
                fill="#f5a623"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1,
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                fontFamily: 'system-ui, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              {formatDistance(t.distanceM)}
            </span>
          </div>
        );
      })}
      <style>{`
        @keyframes clue-arrow-bob {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  return `${Math.round(m)}m`;
}
