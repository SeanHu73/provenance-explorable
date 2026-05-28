'use client';

/**
 * The visual representation of a collected stop as a puzzle piece —
 * used in the sort screen (draggable) and the reveal sequence
 * (flippable). Pure presentation; no interactivity built in.
 */

import { ExplorableStop, resolvePuzzlePiece } from '@/lib/explorable/stop-types';

interface Props {
  stop: ExplorableStop;
  size?: 'sm' | 'md' | 'lg';
  /** Visual halo. 'none' = no border-glow; otherwise applies the
   *  matching reveal-phase outline. */
  halo?: 'none' | 'red' | 'yellow' | 'green';
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_PRESETS = {
  sm: { width: 96,  imgH: 72,  fontSize: 12 },
  md: { width: 140, imgH: 110, fontSize: 13 },
  lg: { width: 200, imgH: 160, fontSize: 16 },
};

const HALO_STYLES: Record<NonNullable<Props['halo']>, React.CSSProperties> = {
  none:   {},
  red:    { boxShadow: '0 0 0 4px #dc2626, 0 8px 24px rgba(0,0,0,0.35)' },
  yellow: { boxShadow: '0 0 0 4px #facc15, 0 8px 24px rgba(0,0,0,0.35)' },
  green:  { boxShadow: '0 0 0 4px #16a34a, 0 8px 24px rgba(0,0,0,0.35)' },
};

export default function EvidenceCard({
  stop,
  size = 'md',
  halo = 'none',
  className = '',
  style,
}: Props) {
  const piece = resolvePuzzlePiece(stop);
  const dims = SIZE_PRESETS[size];

  return (
    <div
      className={`select-none rounded-xl bg-white overflow-hidden ${className}`}
      style={{
        width: dims.width,
        ...HALO_STYLES[halo],
        ...style,
      }}
    >
      {piece.photoUrl ? (
        <img
          src={piece.photoUrl}
          alt={piece.label}
          className="block w-full object-cover"
          style={{ height: dims.imgH }}
          draggable={false}
        />
      ) : (
        <div
          className="flex items-center justify-center bg-stone-200 text-stone-400 text-xs"
          style={{ height: dims.imgH }}
        >
          no photo
        </div>
      )}
      <div
        className="px-2 py-1.5 text-stone-800 leading-tight"
        style={{
          fontFamily: 'var(--font-newsreader), Georgia, serif',
          fontSize: dims.fontSize,
        }}
      >
        {piece.label || '(untitled)'}
      </div>
    </div>
  );
}
