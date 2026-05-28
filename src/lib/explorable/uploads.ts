/**
 * Client-side upload helpers.
 *
 * Uploads go to /api/explorable/upload, which forwards them to Firebase
 * Storage server-side. The browser never hits firebasestorage.googleapis.com
 * directly so CORS is a non-issue.
 *
 * Photos over ~2 MB are downsampled on the client to fit under Vercel's
 * 4.5 MB request-body cap. The naïve case (12 MP phone photo at 4-8 MB)
 * comes out around 1-2 MB after this, and the resulting JPEG is more
 * than crisp enough at game-display sizes.
 */

export type UploadKind = 'photo' | 'audio';

export const ACCEPT_PHOTO = 'image/*';
export const ACCEPT_AUDIO = 'audio/*';

const RESIZE_THRESHOLD_BYTES = 2 * 1024 * 1024;
const RESIZE_MAX_DIM = 2000;
const RESIZE_JPEG_QUALITY = 0.85;

interface UploadResponse {
  url?: string;
  path?: string;
  error?: string;
  details?: string;
}

export async function uploadFile(file: File, kind: UploadKind): Promise<string> {
  const processed =
    kind === 'photo' && file.size > RESIZE_THRESHOLD_BYTES
      ? await resizeImageFile(file)
      : file;

  const formData = new FormData();
  formData.append('file', processed);
  formData.append('kind', kind);

  let res: Response;
  try {
    res = await fetch('/api/explorable/upload', {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    throw new Error(
      `Network error reaching /api/explorable/upload: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const data: UploadResponse = await res.json().catch(() => ({}));

  if (!res.ok || !data.url) {
    const detail = data.details ? ` — ${data.details}` : '';
    throw new Error(
      `Upload failed (${res.status}): ${data.error || 'unknown error'}${detail}`,
    );
  }

  return data.url;
}

/**
 * Decode an image, scale its longer edge to <= RESIZE_MAX_DIM, and
 * re-encode as JPEG. If anything goes wrong (HEIC the browser can't
 * decode, OOM, blocked context, etc.) we fall back to the original
 * file and let the server tell us off if it's still too big.
 */
async function resizeImageFile(file: File): Promise<File> {
  try {
    const dataUrl = await readDataUrl(file);
    const img = await loadImage(dataUrl);

    const ratio = Math.min(
      RESIZE_MAX_DIM / img.width,
      RESIZE_MAX_DIM / img.height,
      1,
    );
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', RESIZE_JPEG_QUALITY),
    );
    if (!blob) throw new Error('canvas.toBlob returned null');

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[uploads] resize failed; sending original', err);
    return file;
  }
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = src;
  });
}
