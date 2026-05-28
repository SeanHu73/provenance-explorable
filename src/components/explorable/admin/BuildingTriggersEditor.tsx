'use client';

/**
 * Author hidden trigger zones that gate the player's "I'm inside
 * <building>" toggle.
 *
 * UX:
 *  - Bounded Stanford map identical to the per-stop placement map.
 *  - Click anywhere → adds a new trigger at that point with a default
 *    name and 20 m radius.
 *  - Each trigger is rendered as a small yellow dot on the map.
 *    Clicking a dot doesn't do anything special — editing happens in
 *    the list below.
 *  - List below the map: name (text), radius in m (number), Remove.
 *
 * Default radius (20 m) is wide enough to capture players approaching
 * an entrance without false positives.
 */

import { useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import {
  STANFORD_BOUNDS,
  STANFORD_CENTER,
} from '@/lib/explorable/geo';
import { BuildingTrigger, newTriggerId } from '@/lib/explorable/config-store';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MAP_ID = 'b8f339c02d8c7d5bd3f12d1b';
const DEFAULT_RADIUS_M = 20;

interface Props {
  value: BuildingTrigger[];
  onChange: (value: BuildingTrigger[]) => void;
}

export default function BuildingTriggersEditor({ value, onChange }: Props) {
  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      const ll = e.detail.latLng;
      if (!ll) return;
      onChange([
        ...value,
        {
          id: newTriggerId(),
          name: `Trigger ${value.length + 1}`,
          location: { lat: ll.lat, lng: ll.lng },
          radiusM: DEFAULT_RADIUS_M,
        },
      ]);
    },
    [value, onChange],
  );

  function patchTrigger(id: string, patch: Partial<BuildingTrigger>) {
    onChange(value.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function removeTrigger(id: string) {
    if (!confirm('Remove this trigger?')) return;
    onChange(value.filter((t) => t.id !== id));
  }

  if (!API_KEY) {
    return (
      <div className="p-3 bg-stone-900 text-white text-xs rounded">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-600 leading-relaxed">
        Click anywhere on the map to drop a trigger. Triggers are hidden
        from players — but when a player enters one of their radii, the
        "I'm inside &lt;building&gt;" button appears. Use one trigger per
        likely entry point (e.g. each church door).
      </p>

      <div
        className="rounded overflow-hidden border border-stone-300"
        style={{ height: 320 }}
      >
        <APIProvider apiKey={API_KEY}>
          <GoogleMap
            mapId={MAP_ID}
            defaultCenter={STANFORD_CENTER}
            defaultZoom={18}
            minZoom={16}
            maxZoom={20}
            mapTypeId="hybrid"
            gestureHandling="greedy"
            disableDefaultUI={true}
            clickableIcons={false}
            restriction={{
              latLngBounds: STANFORD_BOUNDS,
              strictBounds: true,
            }}
            onClick={handleMapClick}
            style={{ width: '100%', height: '100%' }}
          >
            {value.map((t) => (
              <AdvancedMarker
                key={t.id}
                position={t.location}
                anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
              >
                <TriggerDot label={t.name} />
              </AdvancedMarker>
            ))}
          </GoogleMap>
        </APIProvider>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-stone-500 italic">
          No triggers yet. Click on the map to add one.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((t) => (
            <li
              key={t.id}
              className="p-3 bg-white border border-stone-200 rounded grid grid-cols-[1fr_auto_auto] gap-3 items-end"
            >
              <label className="block">
                <span className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">
                  Name
                </span>
                <input
                  type="text"
                  value={t.name}
                  onChange={(e) => patchTrigger(t.id, { name: e.target.value })}
                  className="w-full px-2 py-1 border border-stone-300 rounded text-sm"
                  placeholder="e.g. Memorial Church entrance"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">
                  Radius (m)
                </span>
                <input
                  type="number"
                  min={1}
                  value={t.radiusM}
                  onChange={(e) =>
                    patchTrigger(t.id, {
                      radiusM: Math.max(1, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-20 px-2 py-1 border border-stone-300 rounded text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => removeTrigger(t.id)}
                className="px-3 py-1.5 rounded border border-red-300 bg-red-50 text-red-700 text-sm hover:bg-red-100"
              >
                Remove
              </button>
              <div className="col-span-3 text-[10px] text-stone-400 font-mono">
                {t.location.lat.toFixed(6)}, {t.location.lng.toFixed(6)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TriggerDot({ label }: { label: string }) {
  return (
    <div
      title={label}
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#facc15',
        border: '3px solid #1c1917',
        boxShadow: '0 0 8px rgba(0,0,0,0.45)',
      }}
    />
  );
}
