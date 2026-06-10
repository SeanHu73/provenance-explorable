/**
 * Firestore CRUD over the explorable stops collection.
 *
 * Collection: `explorable-stops` (kept separate from the legacy
 * `memorial-church-tours` collection — the two data models diverge,
 * and we want to leave the legacy app untouched until the cleanup pass).
 *
 * Note: Firestore security rules must include a match block for
 * `explorable-stops` or reads/writes will fail silently.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ExplorableStop } from './stop-types';

const COLLECTION = 'explorable-stops';

/**
 * Backfill fields added after a stop was first saved, so older Firestore
 * docs hydrate into a complete ExplorableStop.
 */
function normalizeStop(raw: ExplorableStop): ExplorableStop {
  return {
    ...raw,
    contextualEvidence: raw.contextualEvidence ?? [],
  };
}

export async function getStops(): Promise<ExplorableStop[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    const stops: ExplorableStop[] = [];
    snap.forEach((d) =>
      stops.push(normalizeStop({ id: d.id, ...d.data() } as ExplorableStop)),
    );
    // Unstructured — show by creation order so the list is at least stable.
    return stops.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  } catch (err) {
    console.error('[explorable/stops-store] getStops failed:', err);
    return [];
  }
}

export async function getStop(id: string): Promise<ExplorableStop | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    return normalizeStop({ id: snap.id, ...snap.data() } as ExplorableStop);
  } catch (err) {
    console.error('[explorable/stops-store] getStop failed:', err);
    return null;
  }
}

export async function saveStop(stop: ExplorableStop): Promise<ExplorableStop> {
  const now = new Date().toISOString();
  const next: ExplorableStop = {
    ...stop,
    createdAt: stop.createdAt || now,
    updatedAt: now,
  };
  const { id, ...data } = next;
  await setDoc(doc(db, COLLECTION, id), data);
  return next;
}

export async function deleteStop(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
