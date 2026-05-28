'use client';

/**
 * Discovery logic — given the player's position and each stop, decide
 * what state that stop is in.
 *
 *   far          — outside both radii; nothing rendered
 *   warm         — within 10 m but not 5 m; triggers screen-edge halo
 *   discovered   — within 5 m; pin visible + tappable
 *   collected    — the player has already completed this stop (localStorage)
 *   indoorHidden — isIndoor stop, indoor mode is OFF (never visible until toggled)
 *   indoorReady  — isIndoor stop, indoor mode is ON (visible regardless of GPS)
 *
 * Default radii are the ones Sean specified earlier: 5 m to discover,
 * 10 m for the "warm" halo cue. Constants live here so a future
 * config-store entry can override them.
 */

import { useEffect, useMemo, useState } from 'react';
import { LatLng, PlayerPosition, distanceM } from './geo';
import { ExplorableStop } from './stop-types';
import { BuildingTrigger } from './config-store';

export const DISCOVERY_RADIUS_M = 15;
export const WARM_RADIUS_M = 30;

export type StopStatus =
  | 'far'
  | 'warm'
  | 'discovered'
  | 'collected'
  | 'indoorHidden'
  | 'indoorReady';

export interface StopDiscovery {
  stop: ExplorableStop;
  /** Distance from the player in metres. Infinity if no player position. */
  distanceM: number;
  status: StopStatus;
}

interface ComputeOptions {
  stops: ExplorableStop[];
  player: PlayerPosition | null;
  collectedIds: Set<string>;
  indoorRevealed: boolean;
}

export function computeDiscoveries({
  stops,
  player,
  collectedIds,
  indoorRevealed,
}: ComputeOptions): StopDiscovery[] {
  return stops.map((stop) => {
    const dist = player ? distanceM(player as LatLng, stop.location) : Infinity;

    if (collectedIds.has(stop.id)) {
      return { stop, distanceM: dist, status: 'collected' };
    }

    if (stop.isIndoor) {
      return {
        stop,
        distanceM: dist,
        status: indoorRevealed ? 'indoorReady' : 'indoorHidden',
      };
    }

    if (dist <= DISCOVERY_RADIUS_M) {
      return { stop, distanceM: dist, status: 'discovered' };
    }
    if (dist <= WARM_RADIUS_M) {
      return { stop, distanceM: dist, status: 'warm' };
    }
    return { stop, distanceM: dist, status: 'far' };
  });
}

/**
 * Closest-warm distance, used to set the halo intensity. Returns null
 * if no outdoor stop is in the warm band right now.
 */
export function closestWarmDistance(discoveries: StopDiscovery[]): number | null {
  let best: number | null = null;
  for (const d of discoveries) {
    if (d.status !== 'warm') continue;
    if (best === null || d.distanceM < best) best = d.distanceM;
  }
  return best;
}

/**
 * True if the player is currently within the radius of any building
 * trigger. Used to gate the "I'm inside <building>" indoor toggle —
 * we don't show it until the player has crossed into a trigger zone.
 */
export function isInAnyTrigger(
  player: PlayerPosition | null,
  triggers: BuildingTrigger[],
): boolean {
  if (!player || triggers.length === 0) return false;
  for (const t of triggers) {
    if (distanceM(player as LatLng, t.location) <= t.radiusM) return true;
  }
  return false;
}

// ───── localStorage for collected / indoor state ─────────────────

const COLLECTED_KEY = 'provenance-explorable-collected';
const INDOOR_KEY = 'provenance-explorable-indoor';

function readCollected(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(COLLECTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeCollected(ids: string[]) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(COLLECTED_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

function readIndoor(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(INDOOR_KEY) === 'true'; } catch { return false; }
}

function writeIndoor(value: boolean) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(INDOOR_KEY, String(value)); } catch { /* ignore */ }
}

export interface ProgressState {
  collectedIds: Set<string>;
  indoorRevealed: boolean;
  collect: (stopId: string) => void;
  uncollect: (stopId: string) => void;
  setIndoorRevealed: (v: boolean) => void;
  resetAll: () => void;
}

export function useProgress(): ProgressState {
  const [collected, setCollected] = useState<string[]>(() => readCollected());
  const [indoor, setIndoor] = useState<boolean>(() => readIndoor());

  useEffect(() => { writeCollected(collected); }, [collected]);
  useEffect(() => { writeIndoor(indoor); }, [indoor]);

  const collectedSet = useMemo(() => new Set(collected), [collected]);

  return {
    collectedIds: collectedSet,
    indoorRevealed: indoor,
    collect: (id) => setCollected((arr) => (arr.includes(id) ? arr : [...arr, id])),
    uncollect: (id) => setCollected((arr) => arr.filter((x) => x !== id)),
    setIndoorRevealed: (v) => setIndoor(v),
    resetAll: () => {
      setCollected([]);
      setIndoor(false);
    },
  };
}
