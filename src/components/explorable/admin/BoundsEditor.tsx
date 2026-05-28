'use client';

/**
 * Edit the four lat/lng values that bound the player's map. Comes with
 * a "Reset to Stanford default" button so an accidental smash isn't
 * permanent.
 *
 * Validates only loosely — north > south, east > west are sanity-
 * checked at submit time and reverted with a warning if violated.
 */

import { MapBounds } from '@/lib/explorable/config-store';
import { STANFORD_BOUNDS } from '@/lib/explorable/geo';

interface Props {
  value: MapBounds;
  onChange: (bounds: MapBounds) => void;
}

export default function BoundsEditor({ value, onChange }: Props) {
  function patch(k: keyof MapBounds, raw: string) {
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return;
    onChange({ ...value, [k]: n });
  }

  function reset() {
    if (!confirm('Reset to Stanford defaults?')) return;
    onChange({ ...STANFORD_BOUNDS });
  }

  const invalid =
    value.north <= value.south || value.east <= value.west;

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-600 leading-relaxed">
        The player can't pan beyond these lat/lng values. North &gt; south,
        east &gt; west — west is more negative on the Stanford side of the
        meridian.
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Field
          label="North (top)"
          value={value.north}
          onChange={(v) => patch('north', v)}
        />
        <Field
          label="South (bottom)"
          value={value.south}
          onChange={(v) => patch('south', v)}
        />
        <Field
          label="East (right)"
          value={value.east}
          onChange={(v) => patch('east', v)}
        />
        <Field
          label="West (left)"
          value={value.west}
          onChange={(v) => patch('west', v)}
        />
      </div>

      {invalid && (
        <p className="text-xs text-red-700">
          North must be greater than south, and east must be greater than
          west. Your map will refuse to render with these values.
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={reset}
          className="px-3 py-1.5 rounded border border-stone-300 bg-white text-sm hover:bg-stone-100"
        >
          Reset to Stanford default
        </button>
        <span className="text-[10px] text-stone-500 font-mono">
          {value.north.toFixed(5)} N · {value.south.toFixed(5)} S · {value.east.toFixed(5)} E · {value.west.toFixed(5)} W
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (raw: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">
        {label}
      </span>
      <input
        type="number"
        step="0.00001"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm font-mono"
      />
    </label>
  );
}
