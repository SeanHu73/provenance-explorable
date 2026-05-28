'use client';

/**
 * Reusable photo uploader. Reads from / writes to a parent-owned photos
 * array. Each photo has a download URL (post-upload) and an optional
 * caption. Upload progress is shown inline; failures surface a red
 * error line beneath the button.
 */

import { useState } from 'react';
import { ExplorableStopPhoto } from '@/lib/explorable/stop-types';
import { uploadFile, ACCEPT_PHOTO } from '@/lib/explorable/uploads';

interface Props {
  photos: ExplorableStopPhoto[];
  onChange: (photos: ExplorableStopPhoto[]) => void;
  label?: string;
}

export default function PhotoUploader({ photos, onChange, label = 'Photos' }: Props) {
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
      onChange([...photos, { url, caption: '' }]);
    } catch (err) {
      console.error('[PhotoUploader] upload failed', err);
      setError('Upload failed. Check Firebase Storage rules and try again.');
    } finally {
      setUploading(false);
    }
  }

  function updateCaption(idx: number, caption: string) {
    const next = photos.slice();
    next[idx] = { ...next[idx], caption };
    onChange(next);
  }

  function remove(idx: number) {
    if (!confirm('Remove this photo?')) return;
    const next = photos.slice();
    next.splice(idx, 1);
    onChange(next);
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= photos.length) return;
    const next = photos.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wider text-stone-600">
        {label}
      </div>

      {photos.length === 0 && (
        <p className="text-xs text-stone-500 italic">No photos yet.</p>
      )}

      <ul className="space-y-2">
        {photos.map((p, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 p-2 bg-white border border-stone-200 rounded"
          >
            <img
              src={p.url}
              alt={p.caption || ''}
              className="w-20 h-20 object-cover rounded border border-stone-200 flex-shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-1">
              <input
                type="text"
                value={p.caption || ''}
                onChange={(e) => updateCaption(idx, e.target.value)}
                placeholder="Caption (optional)"
                className="w-full text-sm px-2 py-1 border border-stone-300 rounded"
              />
              <div className="text-[10px] text-stone-400 truncate" title={p.url}>
                {p.url}
              </div>
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="text-xs px-1.5 py-0.5 rounded border border-stone-300 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === photos.length - 1}
                className="text-xs px-1.5 py-0.5 rounded border border-stone-300 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-xs px-1.5 py-0.5 rounded border border-red-300 bg-red-50 text-red-700"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <label className="inline-block">
        <span
          className={`inline-block px-3 py-1.5 rounded text-white text-sm cursor-pointer ${
            uploading ? 'bg-stone-400' : 'bg-blue-700 hover:bg-blue-800'
          }`}
        >
          {uploading ? 'Uploading...' : '+ Add photo'}
        </span>
        <input
          type="file"
          accept={ACCEPT_PHOTO}
          onChange={handleFile}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
