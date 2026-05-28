'use client';

/**
 * Dev-only "set my location" overlay. Visible whenever
 * NEXT_PUBLIC_ENABLE_DEV_LOC is truthy OR the page URL has ?devloc=1.
 *
 * The toggle stops the real GPS watch (see location-source.ts) and lets
 * the player tap anywhere on the map to position the player marker.
 * Position persists across reloads in localStorage.
 */

import { useEffect, useState } from 'react';
import { LatLng, PlayerPosition } from '@/lib/explorable/geo';

interface Props {
  devEnabled: boolean;
  devPosition: LatLng | null;
  position: PlayerPosition | null;
  error: string | null;
  onToggle: (enabled: boolean) => void;
  onClear: () => void;
}

export default function DevLocationOverlay(props: Props) {
  // Show panel only in dev mode OR when the URL opts in.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const envFlag = process.env.NEXT_PUBLIC_ENABLE_DEV_LOC === 'true';
    const isDev = process.env.NODE_ENV !== 'production';
    const urlFlag =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('devloc');
    setShow(envFlag || isDev || urlFlag);
  }, []);

  if (!show) return null;

  return (
    <div
      className="absolute top-3 right-3 bg-white/95 rounded-lg shadow-xl p-3 text-xs space-y-2 z-20"
      style={{ maxWidth: 260, fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-stone-900 uppercase tracking-wider text-[10px]">
          Dev · Location
        </span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={props.devEnabled}
            onChange={(e) => props.onToggle(e.target.checked)}
          />
          <span className="text-stone-700">Fake GPS</span>
        </label>
      </div>

      {props.devEnabled ? (
        <div className="text-stone-700 leading-tight">
          {props.devPosition ? (
            <>
              Tap the map to move.{' '}
              <button
                onClick={props.onClear}
                className="text-red-600 underline ml-1"
              >
                Clear
              </button>
            </>
          ) : (
            <span>Tap anywhere on the map to set your location.</span>
          )}
        </div>
      ) : (
        <div className="text-stone-700 leading-tight">
          Using real device GPS.
        </div>
      )}

      {props.error && (
        <div className="text-red-700 text-[11px]">
          {props.error}
        </div>
      )}

      {props.position && (
        <div className="text-stone-500 font-mono text-[10px] leading-tight pt-1 border-t border-stone-200">
          {props.position.lat.toFixed(5)}, {props.position.lng.toFixed(5)}
          <br />
          ±{Math.round(props.position.accuracy)}m · source:{' '}
          <span className={props.position.source === 'dev' ? 'text-amber-600' : 'text-blue-700'}>
            {props.position.source}
          </span>
        </div>
      )}
    </div>
  );
}
