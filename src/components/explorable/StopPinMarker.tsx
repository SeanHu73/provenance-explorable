'use client';

/**
 * Pin marker rendered on the map for a discovered or collected stop.
 * Three visual variants:
 *   discovered  — solid red pin with a soft pulse, tappable
 *   collected   — desaturated, smaller, no pulse
 *   indoor      — blue pin (different colour = different discovery mechanic)
 */

export type PinVariant = 'discovered' | 'collected' | 'indoor';

interface Props {
  variant: PinVariant;
}

export default function StopPinMarker({ variant }: Props) {
  const colour =
    variant === 'collected' ? '#9ca3af'
    : variant === 'indoor'  ? '#3b82f6'
    :                          '#e53935';

  const scale = variant === 'collected' ? 0.8 : 1;
  const pulse = variant === 'discovered';

  return (
    <div
      style={{
        position: 'relative',
        width: 28 * scale,
        height: 36 * scale,
      }}
      aria-label={`Stop pin — ${variant}`}
    >
      {pulse && (
        <div
          style={{
            position: 'absolute',
            inset: '50% 50% auto auto',
            transform: 'translate(50%, -50%)',
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: colour,
            opacity: 0.4,
            animation: 'explorable-pin-pulse 1.4s ease-out infinite',
          }}
        />
      )}
      <svg
        viewBox="0 0 24 32"
        width={28 * scale}
        height={36 * scale}
        style={{
          position: 'relative',
          display: 'block',
          filter:
            variant === 'collected'
              ? 'opacity(0.7)'
              : 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))',
          imageRendering: 'pixelated',
        }}
      >
        <rect x={8}  y={2}  width={8}  height={2} fill={colour} />
        <rect x={6}  y={4}  width={12} height={2} fill={colour} />
        <rect x={4}  y={6}  width={16} height={6} fill={colour} />
        <rect x={6}  y={12} width={12} height={2} fill={colour} />
        <rect x={8}  y={14} width={8}  height={2} fill={colour} />
        <rect x={10} y={16} width={4}  height={6} fill="#2c2418" />
        <rect x={11} y={22} width={2}  height={4} fill="#2c2418" />
        <rect x={10} y={6}  width={4}  height={4} fill="#fff" />
      </svg>
      <style>{`
        @keyframes explorable-pin-pulse {
          0%   { transform: translate(50%, -50%) scale(0.7); opacity: 0.45; }
          80%  { transform: translate(50%, -50%) scale(2.0); opacity: 0;    }
          100% { transform: translate(50%, -50%) scale(2.0); opacity: 0;    }
        }
      `}</style>
    </div>
  );
}
