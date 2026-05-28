'use client';

/**
 * Reusable audio uploader. A stop has at most one audio clip per phase
 * (notice or context); upload swaps the file out. Title is editable
 * inline. Preview plays in-place via the standard HTML5 audio element.
 */

import { useState } from 'react';
import { ExplorableStopAudio } from '@/lib/explorable/stop-types';
import { uploadFile, ACCEPT_AUDIO } from '@/lib/explorable/uploads';

interface Props {
  audio: ExplorableStopAudio | null;
  onChange: (audio: ExplorableStopAudio | null) => void;
  label?: string;
}

export default function AudioUploader({ audio, onChange, label = 'Audio' }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadFile(file, 'audio');
      onChange({ url, title: audio?.title || '' });
    } catch (err) {
      console.error('[AudioUploader] upload failed', err);
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    if (!confirm('Remove this audio?')) return;
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wider text-stone-600">
        {label}
      </div>

      {audio ? (
        <div className="p-2 bg-white border border-stone-200 rounded space-y-2">
          <input
            type="text"
            value={audio.title || ''}
            onChange={(e) => onChange({ ...audio, title: e.target.value })}
            placeholder="Audio title (optional)"
            className="w-full text-sm px-2 py-1 border border-stone-300 rounded"
          />
          <audio src={audio.url} controls className="w-full h-8" />
          <div className="flex items-center justify-between gap-2">
            <div
              className="text-[10px] text-stone-400 truncate min-w-0 flex-1"
              title={audio.url}
            >
              {audio.url}
            </div>
            <button
              type="button"
              onClick={clear}
              className="text-xs px-2 py-0.5 rounded border border-red-300 bg-red-50 text-red-700 flex-shrink-0"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-stone-500 italic">No audio yet.</p>
      )}

      <label className="inline-block">
        <span
          className={`inline-block px-3 py-1.5 rounded text-white text-sm cursor-pointer ${
            uploading ? 'bg-stone-400' : 'bg-blue-700 hover:bg-blue-800'
          }`}
        >
          {uploading ? 'Uploading...' : audio ? 'Replace audio' : '+ Add audio'}
        </span>
        <input
          type="file"
          accept={ACCEPT_AUDIO}
          onChange={handleFile}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
