'use client';

/**
 * Read-only map showing every authored stop as a numbered pin. Used
 * on /admin/explorable/overview so the author can screenshot the
 * full set of locations at once.
 */

import { useEffect, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
} from '@vis.gl/react-google-maps';
import {
  STANFORD_BOUNDS,
  STANFORD_CENTER,
} from '@/lib/explorable/geo';
import { getStops } from '@/lib/explorable/stops-store';
import { ExplorableStop } from '@/lib/explorable/stop-types';
import { getConfig, MapBounds } from '@/lib/explorable/config-store';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MAP_ID = 'b8f339c02d8c7d5bd3f12d1b';

export default function StopsOverviewMap() {
  const [stops, setStops] = useState<ExplorableStop[]>([]);
  const [bounds, setBounds] = useState<MapBounds>(STANFORD_BOUNDS);

  useEffect(() => {
    Promise.all([getStops(), getConfig()]).then(([s, c]) => {
      setStops(s);
      if (c.bounds) setBounds(c.bounds);
    });
  }, []);

  if (!API_KEY) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-stone-900 text-white text-sm p-6 text-center">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <APIProvider apiKey={API_KEY}>
        <GoogleMap
          mapId={MAP_ID}
          defaultCenter={STANFORD_CENTER}
          defaultZoom={18}
          minZoom={15}
          maxZoom={20}
          mapTypeId="hybrid"
          gestureHandling="greedy"
          disableDefaultUI={true}
          clickableIcons={false}
          restriction={{
            latLngBounds: bounds,
            strictBounds: true,
          }}
          style={{ width: '100%', height: '100%' }}
        >
          {stops.map((s, i) => (
            <AdvancedMarker
              key={s.id}
              position={s.location}
              anchorPoint={AdvancedMarkerAnchorPoint.BOTTOM}
            >
              <NumberedPin
                index={i + 1}
                title={s.title || '(untitled)'}
                indoor={s.isIndoor}
              />
            </AdvancedMarker>
          ))}
        </GoogleMap>
      </APIProvider>

      <div
        className="absolute bottom-3 left-3 z-20 px-3 py-2 rounded bg-white/95 shadow text-xs text-stone-700 max-w-xs"
        style={{ fontFamily: 'var(--font-newsreader), Georgia, serif' }}
      >
        <div className="font-semibold mb-1">
          {stops.length} stop{stops.length === 1 ? '' : 's'}
        </div>
        <ul className="space-y-0.5">
          {stops.map((s, i) => (
            <li key={s.id} className="truncate">
              <span className="font-mono mr-1.5 text-stone-500">
                {String(i + 1).padStart(2, '0')}
              </span>
              {s.title || <em className="text-stone-400">(untitled)</em>}
              {s.isIndoor && (
                <span className="ml-1.5 text-[10px] uppercase tracking-wider text-blue-700">
                  indoor
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function NumberedPin({
  index,
  title,
  indoor,
}: {
  index: number;
  title: string;
  indoor: boolean;
}) {
  const colour = indoor ? '#3b82f6' : '#e53935';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        pointerEvents: 'none',
      }}
      title={title}
    >
      <span
        style={{
          background: 'rgba(20,16,12,0.85)',
          color: 'white',
          fontSize: 11,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 6,
          whiteSpace: 'nowrap',
          maxWidth: 180,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {index}. {title}
      </span>
      <svg width={32} height={42} viewBox="0 0 24 32">
        <rect x={8}  y={2}  width={8}  height={2} fill={colour} />
        <rect x={6}  y={4}  width={12} height={2} fill={colour} />
        <rect x={4}  y={6}  width={16} height={6} fill={colour} />
        <rect x={6}  y={12} width={12} height={2} fill={colour} />
        <rect x={8}  y={14} width={8}  height={2} fill={colour} />
        <rect x={10} y={16} width={4}  height={6} fill="#2c2418" />
        <rect x={11} y={22} width={2}  height={4} fill="#2c2418" />
        <text
          x={12}
          y={11}
          textAnchor="middle"
          fontSize={8}
          fontFamily="system-ui"
          fontWeight={700}
          fill="#fff"
        >
          {index}
        </text>
      </svg>
    </div>
  );
}
