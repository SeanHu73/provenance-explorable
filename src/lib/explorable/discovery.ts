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

import { useMemo, useState } from 'react';
import { LatLng, PlayerPosition, distanceM } from './geo';
import { ExplorableStop, EvidenceCategory } from './stop-types';
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
 * Closest distance to any currently-discovered (tappable) stop. Used
 * to drive the green "pin in sight" halo. Returns null if nothing is
 * within the discovery radius.
 */
export function closestDiscoveredDistance(discoveries: StopDiscovery[]): number | null {
  let best: number | null = null;
  for (const d of discoveries) {
    if (d.status !== 'discovered') continue;
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

// ───── In-memory progress (resets on refresh) ──────────────────
// Earlier this persisted to localStorage; switched to in-memory by
// request so every page load is a fresh session. Reintroduce
// persistence here if multi-session play comes back.

/**
 * A single piece of evidence the player has placed into a bucket at a
 * stop. `source` distinguishes author-provided samples (which had a
 * correct bucket) from things the player heard and added themselves.
 */
export interface CategorisedEvidence {
  id: string;
  stopId: string;
  text: string;
  category: EvidenceCategory;
  source: 'sample' | 'learner';
}

export interface ProgressState {
  collectedIds: Set<string>;
  indoorRevealed: boolean;
  /** Every piece of evidence the player has bucketed, across all stops.
   *  Drives the final reflection screen. */
  categorisedEvidence: CategorisedEvidence[];
  /** The player's free-response answer to the essential question. */
  eqAnswer: string;

  collect: (stopId: string) => void;
  uncollect: (stopId: string) => void;
  setIndoorRevealed: (v: boolean) => void;
  /** Replace all categorised evidence for a stop (idempotent on re-sort). */
  recordStopEvidence: (stopId: string, items: CategorisedEvidence[]) => void;
  setEqAnswer: (text: string) => void;
  resetAll: () => void;
}

export function useProgress(): ProgressState {
  const [collected, setCollected] = useState<string[]>([]);
  const [indoor, setIndoor] = useState<boolean>(false);
  const [categorised, setCategorised] = useState<CategorisedEvidence[]>([]);
  const [eqAnswer, setEqAnswerState] = useState<string>('');

  const collectedSet = useMemo(() => new Set(collected), [collected]);

  return {
    collectedIds: collectedSet,
    indoorRevealed: indoor,
    categorisedEvidence: categorised,
    eqAnswer,

    collect: (id) =>
      setCollected((arr) => (arr.includes(id) ? arr : [...arr, id])),
    uncollect: (id) => setCollected((arr) => arr.filter((x) => x !== id)),
    setIndoorRevealed: (v) => setIndoor(v),

    recordStopEvidence: (stopId, items) => {
      setCategorised((prev) => [
        ...prev.filter((e) => e.stopId !== stopId),
        ...items,
      ]);
    },

    setEqAnswer: (text) => setEqAnswerState(text),

    resetAll: () => {
      setCollected([]);
      setIndoor(false);
      setCategorised([]);
      setEqAnswerState('');
    },
  };
}
