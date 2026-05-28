'use client';

/**
 * The single source of truth for the player's position.
 *
 * Defaults to real navigator.geolocation.watchPosition. When the dev
 * override is enabled, the hook returns the dev position instead and
 * stops watching real GPS (saves battery, also prevents flicker between
 * real and fake).
 *
 * Dev mode is intended for desk testing: tap the map to "be there"
 * without actually walking to Stanford. The override is persisted in
 * localStorage so it survives reloads.
 */

import { useEffect, useRef, useState } from 'react';
import { LatLng, PlayerPosition } from './geo';

const STORAGE_KEY = 'provenance-explorable-devloc';

interface DevLocState {
  enabled: boolean;
  position: LatLng | null;
}

function readDevLoc(): DevLocState {
  if (typeof window === 'undefined') return { enabled: false, position: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: false, position: null };
    const parsed = JSON.parse(raw);
    if (typeof parsed?.enabled !== 'boolean') return { enabled: false, position: null };
    return parsed;
  } catch {
    return { enabled: false, position: null };
  }
}

function writeDevLoc(state: DevLocState) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export interface LocationSource {
  position: PlayerPosition | null;
  error: string | null;
  devEnabled: boolean;
  devPosition: LatLng | null;
  setDevEnabled: (enabled: boolean) => void;
  setDevPosition: (p: LatLng | null) => void;
}

export function useLocationSource(): LocationSource {
  const [position, setPosition] = useState<PlayerPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devState, setDevState] = useState<DevLocState>(() => readDevLoc());
  const watchIdRef = useRef<number | null>(null);

  // Persist dev state.
  useEffect(() => { writeDevLoc(devState); }, [devState]);

  useEffect(() => {
    // Dev override active → ignore real GPS entirely.
    if (devState.enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (devState.position) {
        setPosition({
          lat: devState.position.lat,
          lng: devState.position.lng,
          accuracy: 5,
          source: 'dev',
          timestamp: Date.now(),
        });
      } else {
        setPosition(null);
      }
      setError(null);
      return;
    }

    // Real GPS path.
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation not available in this browser.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps',
          timestamp: pos.timestamp,
        });
        setError(null);
      },
      (err) => {
        setError(err.message || 'Unable to get GPS position.');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [devState.enabled, devState.position]);

  return {
    position,
    error,
    devEnabled: devState.enabled,
    devPosition: devState.position,
    setDevEnabled: (enabled) => setDevState((s) => ({ ...s, enabled })),
    setDevPosition: (p) => setDevState((s) => ({ ...s, position: p })),
  };
}
