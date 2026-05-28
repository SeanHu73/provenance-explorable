'use client';

/**
 * Upload an indoor map image and place a pin on it.
 *
 * The pin is positioned exactly where the user clicks. We use the
 * image's *rendered* bounding rect (not the natural size) so the
 * computed percentages stay accurate at any responsive width. On
 * render the pin is absolutely positioned with translate(-50%, -50%),
 * so its CENTER sits on the recorded (x, y) — no skew.
 */

import { useRef, useState } from 'react';
import { IndoorMap } from '@/lib/explorable/stop-types';
import { uploadFile, ACCEPT_PHOTO } from '@/lib/explorable/uploads';

interface Props {
  value: IndoorMap | null;
  onChange: (value: IndoorMap | null) => void;
}

export default function IndoorMapEditor({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadFile(file, 'photo');
      onChange({
        photoUrl: url,
        // Default pin to the centre — author can drag/tap to adjust.
        pinX: 50,
        pinY: 50,
      });
    } catch (err) {
      console.error('[IndoorMapEditor] upload failed', err);
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!value || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange({
      ...value,
      pinX: Math.max(0, Math.min(100, x)),
      pinY: Math.max(0, Math.min(100, y)),
    });
  }

  function remove() {
    if (!confirm('Remove the indoor map?')) return;
    onChange(null);
  }

  if (!value) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-stone-600 leading-relaxed">
          Upload a floor plan, room photo, or any image that helps players
          locate this indoor stop. After upload, click anywhere on the
          image to drop a pin.
        </p>
        <label className="inline-block">
          <span
            className={`inline-block px-3 py-1.5 rounded text-white text-sm cursor-pointer ${
              uploading ? 'bg-stone-400' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {uploading ? 'Uploading…' : '+ Upload indoor map'}
          </span>
          <input
            type="file"
            accept={ACCEPT_PHOTO}
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-600 leading-relaxed">
        Click anywhere on the image to move the pin.
      </p>

      <div
        className="relative inline-block w-full max-w-2xl rounded-lg overflow-hidden border border-stone-300 bg-stone-100"
        style={{ lineHeight: 0 }}
      >
        <img
          ref={imgRef}
          src={value.photoUrl}
          alt="Indoor map"
          onClick={handleImageClick}
          className="block w-full h-auto cursor-crosshair select-none"
          draggable={false}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${value.pinX}%`,
            top: `${value.pinY}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <PinDot />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-stone-500 font-mono pt-1">
        <span>
          pin at {value.pinX.toFixed(1)}%, {value.pinY.toFixed(1)}%
        </span>
        <span className="flex-1" />
        <label className="inline-block">
          <span
            className={`inline-block px-3 py-1.5 rounded text-white text-sm cursor-pointer ${
              uploading ? 'bg-stone-400' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {uploading ? 'Uploading…' : 'Replace image'}
          </span>
          <input
            type="file"
            accept={ACCEPT_PHOTO}
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <button
          type="button"
          onClick={remove}
          className="px-3 py-1.5 rounded border border-red-300 bg-red-50 text-red-700 text-sm hover:bg-red-100"
        >
          Remove
        </button>
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

function PinDot() {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: '#e53935',
        border: '3px solid #fff',
        boxShadow: '0 0 0 1px #2c2418, 0 2px 6px rgba(0,0,0,0.5)',
      }}
    />
  );
}
