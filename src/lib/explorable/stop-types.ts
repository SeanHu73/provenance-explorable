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

export interface ExplorableStopPhoto {
  url: string;
  caption?: string;
}

export interface ExplorableStopAudio {
  url: string;
  title?: string;
}

export interface ExplorableStop {
  id: string;
  order: number;
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

  // Phase 4: Author's evidence assessment, revealed only after the
  // player has submitted their own sort.
  authorAssessment: {
    included: boolean;         // does the author think this is relevant evidence?
    explanation: string;       // why / why not
  };

  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
}

export function newStopId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `stop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Defaults for a brand-new stop. Caller fills in order. */
export function blankStop(order: number): ExplorableStop {
  const now = new Date().toISOString();
  return {
    id: newStopId(),
    order,
    title: '',
    // Default location: Memorial Church (matches the explorable's center).
    location: { lat: 37.4275, lng: -122.1697 },
    isIndoor: false,
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
    authorAssessment: {
      included: true,
      explanation: '',
    },
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
