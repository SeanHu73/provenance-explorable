/**
 * Lean stop data model for the explorable.
 *
 * Deliberately narrower than the legacy Provenance `Stop` type — only
 * the four phases the build doc actually calls for:
 *   1. notice  — observation prompt (no question)
 *   2. context — historical context (no question)
 *   3. puzzle piece — what gets collected
 *   4. author assessment — how the author thinks this stop fits the EQ
 *
 * Everything else (seed / wonder / reveal / reflect / detours) is
 * intentionally omitted. Game-level settings (essential question,
 * detection radii, closing message) live on a separate Game/Config
 * doc, not on each stop.
 */

import { LatLng } from './geo';

/**
 * The three buckets every piece of contextual evidence is sorted into.
 * A historian contextualises a source along these axes: whose
 * perspective it carries, when it comes from, and where it belongs.
 */
export type EvidenceCategory = 'perspective' | 'time' | 'place';

export const EVIDENCE_CATEGORIES: {
  key: EvidenceCategory;
  label: string;
  accent: string;
}[] = [
  { key: 'perspective', label: 'Perspective', accent: '#6d28d9' },
  { key: 'time', label: 'Time', accent: '#b45309' },
  { key: 'place', label: 'Place', accent: '#0f766e' },
];

export function evidenceCategoryLabel(key: EvidenceCategory): string {
  return EVIDENCE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/**
 * An author-provided sample piece of evidence for a stop. The player
 * drags it into a bucket; `category` is the correct answer, so a wrong
 * drop bounces back and they try again.
 */
export interface ContextualEvidence {
  id: string;
  text: string;
  category: EvidenceCategory;
}

export interface ExplorableStopPhoto {
  url: string;
  caption?: string;
}

export interface ExplorableStopAudio {
  url: string;
  title?: string;
}

/**
 * Indoor location aid — a custom image (floor plan, room photo, etc.)
 * with a pin showing where to find this stop. Used in place of GPS for
 * indoor stops since GPS is too unreliable inside buildings.
 *
 * pinX / pinY are PERCENTAGES (0-100) of the image's width / height, so
 * the pin scales correctly at any rendered size.
 */
export interface IndoorMap {
  photoUrl: string;
  pinX: number;
  pinY: number;
}

export interface ExplorableStop {
  id: string;
  title: string;

  /** Real-world location of this stop. Set via click-to-place in the admin. */
  location: LatLng;

  /**
   * True for stops physically inside a building (e.g. Memorial Church
   * interior). Indoor stops are NOT discovered via the 5 m GPS radius —
   * GPS is too unreliable indoors. Instead, when the player approaches
   * the building, they're prompted "Are you inside the church?" and on
   * Yes, all indoor stops for that building are revealed at once.
   */
  isIndoor: boolean;

  /**
   * Optional indoor "where to look" map shown to players when they
   * enter the stop. Authored by tapping a point on an uploaded image.
   * Ignored when isIndoor is false.
   */
  indoorMap: IndoorMap | null;

  // Phase 1: Notice card — observation prompt + photos + optional audio.
  notice: {
    prompt: string;
    timerSeconds: number | null;
    photos: ExplorableStopPhoto[];
    audio: ExplorableStopAudio | null;
  };

  // Phase 2: Context card — historical context + photos + optional audio.
  context: {
    text: string;
    photos: ExplorableStopPhoto[];
    audio: ExplorableStopAudio | null;
  };

  // Phase 3: Puzzle piece — what gets added to the player's inventory.
  // Defaults are applied at render time, not at save time, so they
  // track changes to title / first notice photo.
  puzzlePiece: {
    photoUrl: string | null;   // null = use first notice photo
    label: string | null;      // null = use stop title
  };

  // Phase 4: Contextual evidence the player sorts into Perspective /
  // Time / Place at this stop. Author-provided samples carry the correct
  // bucket; the player can also add evidence they heard themselves.
  contextualEvidence: ContextualEvidence[];

  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
}

export function newStopId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `stop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newEvidenceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Defaults for a brand-new stop. Stops are unstructured — no explicit order. */
export function blankStop(): ExplorableStop {
  const now = new Date().toISOString();
  return {
    id: newStopId(),
    title: '',
    // Default location: Memorial Church (matches the explorable's center).
    location: { lat: 37.4275, lng: -122.1697 },
    isIndoor: false,
    indoorMap: null,
    notice: {
      prompt: '',
      timerSeconds: null,
      photos: [],
      audio: null,
    },
    context: {
      text: '',
      photos: [],
      audio: null,
    },
    puzzlePiece: {
      photoUrl: null,
      label: null,
    },
    contextualEvidence: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Resolve the puzzle piece photo/label, falling back to defaults. */
export function resolvePuzzlePiece(stop: ExplorableStop): { photoUrl: string | null; label: string } {
  const photoUrl = stop.puzzlePiece.photoUrl || stop.notice.photos[0]?.url || null;
  const label = stop.puzzlePiece.label || stop.title;
  return { photoUrl, label };
}
