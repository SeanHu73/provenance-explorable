/**
 * Game-level config for the explorable — settings that apply to the
 * whole experience rather than any single stop. Stored as a Firestore
 * singleton at `explorable-config/main`.
 *
 * Currently just the essential question; the closing message, detection
 * radii, and indoor area definitions will move here too as those
 * features are wired up.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { LatLng, STANFORD_BOUNDS } from './geo';

const COLLECTION = 'explorable-config';
const DOC_ID = 'main';

/**
 * A hidden geofenced zone — usually drawn around a building entrance.
 * Crossing INTO any trigger's radius unlocks the "I'm inside <building>"
 * indoor toggle for the player. Triggers themselves are invisible.
 */
export interface BuildingTrigger {
  id: string;
  name: string;        // e.g. "Memorial Church entrance"
  location: LatLng;
  radiusM: number;     // default ~20 m
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ExplorableConfig {
  /** The essential question players see at start of game, midway sort, and final sort. */
  essentialQuestion: string;
  /** Photo shown behind every player-facing screen (translucent cards
   *  sit on top). Mirrors Provenance's Tour.backgroundPhotoUrl. */
  backgroundPhotoUrl: string | null;
  /** Hidden trigger zones that gate the "I'm inside" indoor toggle. */
  buildingTriggers: BuildingTrigger[];
  /** Hard pan boundary for the player map. Defaults to Stanford. */
  bounds: MapBounds;
  updatedAt: string;
}

export const DEFAULT_CONFIG: ExplorableConfig = {
  essentialQuestion: '',
  backgroundPhotoUrl: null,
  buildingTriggers: [],
  bounds: { ...STANFORD_BOUNDS },
  updatedAt: new Date(0).toISOString(),
};

export function newTriggerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `trig_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getConfig(): Promise<ExplorableConfig> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, DOC_ID));
    if (!snap.exists()) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...(snap.data() as Partial<ExplorableConfig>) };
  } catch (err) {
    console.error('[explorable/config-store] getConfig failed:', err);
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: ExplorableConfig): Promise<ExplorableConfig> {
  const next: ExplorableConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, COLLECTION, DOC_ID), next);
  return next;
}
