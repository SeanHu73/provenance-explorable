'use client';

/**
 * Click-to-place map for stop authoring. The admin sees a small bounded
 * Stanford map; clicking anywhere within bounds sets the lat/lng for the
 * stop being edited. The current location is shown as a draggable marker.
 *
 * Reuses the same map id as the live game map so styling stays consistent.
 */

import { useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { LatLng } from '@/lib/explorable/geo';
import { STANFORD_BOUNDS, STANFORD_CENTER } from '@/lib/explorable/geo';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MAP_ID = 'b8f339c02d8c7d5bd3f12d1b';

interface Props {
  value: LatLng;
  onChange: (value: LatLng) => void;
  /** Height of the map in CSS pixels. Default 360. */
  heightPx?: number;
}

export default function PinPlacementMap({ value, onChange, heightPx = 360 }: Props) {
  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      const ll = e.detail.latLng;
      if (!ll) return;
      onChange({ lat: ll.lat, lng: ll.lng });
    },
    [onChange],
  );

  if (!API_KEY) {
    return (
      <div
        className="flex items-center justify-center bg-stone-900 text-white text-xs p-4 text-center rounded"
        style={{ height: heightPx }}
      >
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.
      </div>
    );
  }

  return (
    <div className="rounded overflow-hidden border border-stone-300" style={{ height: heightPx }}>
      <APIProvider apiKey={API_KEY}>
        <GoogleMap
          mapId={MAP_ID}
          defaultCenter={value || STANFORD_CENTER}
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
          onClick={handleClick}
          style={{ width: '100%', height: '100%' }}
        >
          {value && (
            <AdvancedMarker position={value}>
              <PlacementPin />
            </AdvancedMarker>
          )}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}

function PlacementPin() {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#e53935',
        border: '3px solid #fff',
        boxShadow: '0 0 8px rgba(0,0,0,0.5)',
        transform: 'translate(-50%, -50%)',
      }}
      aria-label="Stop location"
    />
  );
}
