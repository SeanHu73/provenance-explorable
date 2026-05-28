/**
 * Firebase Storage upload helpers for the explorable.
 *
 * Photos go to /explorable/photo/<ts>_<name>; audio to /explorable/audio/<ts>_<name>.
 * Returns the download URL the app can use directly (signed permanently
 * by Firebase's media token).
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export type UploadKind = 'photo' | 'audio';

const ACCEPT: Record<UploadKind, string> = {
  photo: 'image/*',
  audio: 'audio/*',
};

export const ACCEPT_PHOTO = ACCEPT.photo;
export const ACCEPT_AUDIO = ACCEPT.audio;

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * The path includes a timestamp + safe-name so collisions are vanishingly
 * unlikely without needing to round-trip the storage layer.
 */
export async function uploadFile(file: File, kind: UploadKind): Promise<string> {
  const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
  const path = `explorable/${kind}/${Date.now()}_${safeName}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}
