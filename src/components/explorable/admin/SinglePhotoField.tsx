'use client';

/**
 * One-photo uploader for game-level / per-stop fields that hold a
 * single optional URL (vs PhotoUploader which manages a list).
 *
 * Shows a preview when set, with Replace + Remove buttons. Upload uses
 * the server-side API route, same as PhotoUploader.
 */

import { useState } from 'react';
import { uploadFile, ACCEPT_PHOTO } from '@/lib/explorable/uploads';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  description?: string;
  /** Tailwind classes for the preview image height/aspect. */
  previewClassName?: string;
}

export default function SinglePhotoField({
  value,
  onChange,
  label = 'Photo',
  description,
  previewClassName = 'w-full max-w-sm h-48',
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadFile(file, 'photo');
      onChange(url);
    } catch (err) {
      console.error('[SinglePhotoField] upload failed', err);
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    if (!confirm('Remove this photo?')) return;
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wider text-stone-600">
        {label}
      </div>
      {description && (
        <p className="text-xs text-stone-500 leading-relaxed">{description}</p>
      )}

      {value ? (
        <div className="space-y-2">
          <img
            src={value}
            alt=""
            className={`${previewClassName} object-cover rounded border border-stone-300`}
          />
          <div className="flex gap-2 items-center">
            <label className="inline-block">
              <span
                className={`inline-block px-3 py-1.5 rounded text-white text-sm cursor-pointer ${
                  uploading ? 'bg-stone-400' : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {uploading ? 'Uploading…' : 'Replace'}
              </span>
              <input
                type="file"
                accept={ACCEPT_PHOTO}
                onChange={handleFile}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={clear}
              className="px-3 py-1.5 rounded border border-red-300 bg-red-50 text-red-700 text-sm hover:bg-red-100"
            >
              Remove
            </button>
            <span
              className="text-[10px] text-stone-400 truncate flex-1 min-w-0"
              title={value}
            >
              {value}
            </span>
          </div>
        </div>
      ) : (
        <label className="inline-block">
          <span
            className={`inline-block px-3 py-1.5 rounded text-white text-sm cursor-pointer ${
              uploading ? 'bg-stone-400' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {uploading ? 'Uploading…' : '+ Add photo'}
          </span>
          <input
            type="file"
            accept={ACCEPT_PHOTO}
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
