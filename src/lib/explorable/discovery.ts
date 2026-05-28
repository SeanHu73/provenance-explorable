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

export type Verdict = 'context' | 'trash';

export interface RevealResponse {
  agreed: boolean;
  reason?: string;
}

export interface ProgressState {
  collectedIds: Set<string>;
  indoorRevealed: boolean;
  /** Per-stop sort verdict — does the player count it as evidence? */
  verdicts: Map<string, Verdict>;
  /** Stops that have been through ANY sort screen — used to decide
   *  which ones show up in the final sort. */
  sortedStopIds: Set<string>;
  /** Player's agree/disagree response (and optional reason) to the
   *  author's assessment, captured during the reveal sequence. */
  revealResponses: Map<string, RevealResponse>;

  collect: (stopId: string) => void;
  uncollect: (stopId: string) => void;
  setIndoorRevealed: (v: boolean) => void;
  /** Record a batch of verdicts (from a sort screen) and mark those
   *  stop ids as sorted. */
  recordSort: (entries: Array<{ stopId: string; verdict: Verdict }>) => void;
  /** Record a reveal-phase response for a specific stop. */
  recordRevealResponse: (stopId: string, response: RevealResponse) => void;
  resetAll: () => void;
}

export function useProgress(): ProgressState {
  const [collected, setCollected] = useState<string[]>([]);
  const [indoor, setIndoor] = useState<boolean>(false);
  const [verdictPairs, setVerdictPairs] = useState<Array<[string, Verdict]>>([]);
  const [sorted, setSorted] = useState<string[]>([]);
  const [responsePairs, setResponsePairs] = useState<Array<[string, RevealResponse]>>([]);

  const collectedSet = useMemo(() => new Set(collected), [collected]);
  const verdictsMap = useMemo(() => new Map(verdictPairs), [verdictPairs]);
  const sortedSet = useMemo(() => new Set(sorted), [sorted]);
  const responsesMap = useMemo(() => new Map(responsePairs), [responsePairs]);

  return {
    collectedIds: collectedSet,
    indoorRevealed: indoor,
    verdicts: verdictsMap,
    sortedStopIds: sortedSet,
    revealResponses: responsesMap,

    collect: (id) =>
      setCollected((arr) => (arr.includes(id) ? arr : [...arr, id])),
    uncollect: (id) => setCollected((arr) => arr.filter((x) => x !== id)),
    setIndoorRevealed: (v) => setIndoor(v),

    recordSort: (entries) => {
      setVerdictPairs((prev) => {
        const next = new Map(prev);
        for (const { stopId, verdict } of entries) next.set(stopId, verdict);
        return Array.from(next.entries());
      });
      setSorted((arr) => {
        const set = new Set(arr);
        for (const { stopId } of entries) set.add(stopId);
        return Array.from(set);
      });
    },

    recordRevealResponse: (stopId, response) => {
      setResponsePairs((prev) => {
        const next = new Map(prev);
        next.set(stopId, response);
        return Array.from(next.entries());
      });
    },

    resetAll: () => {
      setCollected([]);
      setIndoor(false);
      setVerdictPairs([]);
      setSorted([]);
      setResponsePairs([]);
    },
  };
}
