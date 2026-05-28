/**
 * Client-side upload helpers for the explorable.
 *
 * Uploads go to /api/explorable/upload, which forwards them to Firebase
 * Storage server-side. This sidesteps the CORS preflight that
 * direct-from-browser Firebase Storage uploads require — convenient
 * because we never had to run gsutil to configure the bucket.
 *
 * Same call signature as before so the form components don't change.
 */

export type UploadKind = 'photo' | 'audio';

export const ACCEPT_PHOTO = 'image/*';
export const ACCEPT_AUDIO = 'audio/*';

interface UploadResponse {
  url?: string;
  path?: string;
  error?: string;
  details?: string;
}

export async function uploadFile(file: File, kind: UploadKind): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
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
