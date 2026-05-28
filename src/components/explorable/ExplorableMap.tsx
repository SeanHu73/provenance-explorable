'use client';

/**
 * Bounded Stanford map for the explorable.
 *
 *  - Hybrid Google Maps tiles, locked to the campus bounding box.
 *  - Real GPS (or dev override) drives the player marker.
 *  - Stops loaded from Firestore; each one's discovery status is
 *    recomputed every render against the live player position:
 *      ≤ 5 m  → pin shown + tappable
 *      ≤ 10 m → screen-edge yellow halo (WarmHalo overlay)
 *  - Indoor-flagged stops bypass GPS; a manual "I'm inside" toggle
 *    reveals them all (and indoor revelation persists in localStorage).
 *  - Tapping a discovered pin opens StopCard (notice → context →
 *    collected). Completion marks the stop in localStorage.
 */

import { useCallback, useMemo, useState } from 'react';
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
import { useLocationSource } from '@/lib/explorable/location-source';
import { useStops } from '@/lib/explorable/use-stops';
import {
  computeDiscoveries,
  closestWarmDistance,
  isInAnyTrigger,
  useProgress,
  StopDiscovery,
} from '@/lib/explorable/discovery';
import {
  getConfig,
  BuildingTrigger,
  MapBounds,
} from '@/lib/explorable/config-store';
import { useEffect } from 'react';
import DevLocationOverlay from './DevLocationOverlay';
import WarmHalo from './WarmHalo';
import StopPinMarker, { PinVariant } from './StopPinMarker';
import StopCard from './StopCard';
import JournalSheet from './JournalSheet';
import IndoorPromptOverlay from './IndoorPromptOverlay';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MAP_ID = 'b8f339c02d8c7d5bd3f12d1b';

export default function ExplorableMap() {
  const loc = useLocationSource();
  const { stops } = useStops();
  const progress = useProgress();
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [bgPhoto, setBgPhoto] = useState<string | null>(null);
  const [triggers, setTriggers] = useState<BuildingTrigger[]>([]);
  const [bounds, setBounds] = useState<MapBounds>(STANFORD_BOUNDS);

  useEffect(() => {
    getConfig().then((c) => {
      setBgPhoto(c.backgroundPhotoUrl);
      setTriggers(c.buildingTriggers || []);
      if (c.bounds) setBounds(c.bounds);
    });
  }, []);

  const playerInTrigger = useMemo(
    () => isInAnyTrigger(loc.position, triggers),
    [loc.position, triggers],
  );

  const discoveries = useMemo(
    () =>
      computeDiscoveries({
        stops,
        player: loc.position,
        collectedIds: progress.collectedIds,
        indoorRevealed: progress.indoorRevealed,
      }),
    [stops, loc.position, progress.collectedIds, progress.indoorRevealed],
  );

  const warmM = useMemo(() => closestWarmDistance(discoveries), [discoveries]);
  const visible = useMemo(
    () =>
      discoveries.filter(
        (d) =>
          d.status === 'discovered' ||
          d.status === 'collected' ||
          d.status === 'indoorReady',
      ),
    [discoveries],
  );

  const hasIndoorStops = useMemo(
    () => stops.some((s) => s.isIndoor),
    [stops],
  );

  const activeStop = useMemo(
    () => stops.find((s) => s.id === activeStopId) || null,
    [stops, activeStopId],
  );

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!loc.devEnabled) return;
      const ll = e.detail.latLng;
      if (!ll) return;
      loc.setDevPosition({ lat: ll.lat, lng: ll.lng });
    },
    [loc],
  );

  if (!API_KEY) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-stone-900 text-white text-sm p-6 text-center">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set in .env.local.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <APIProvider apiKey={API_KEY}>
        <GoogleMap
          mapId={MAP_ID}
          defaultCenter={STANFORD_CENTER}
          defaultZoom={19}
          minZoom={16}
          maxZoom={20}
          mapTypeId="hybrid"
          gestureHandling="greedy"
          disableDefaultUI={true}
          clickableIcons={false}
          restriction={{
            latLngBounds: {
              north: bounds.north,
              south: bounds.south,
              east:  bounds.east,
              west:  bounds.west,
            },
            strictBounds: true,
          }}
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%' }}
        >
          {loc.position && (
            <AdvancedMarker
              position={{ lat: loc.position.lat, lng: loc.position.lng }}
              anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
            >
              <PlayerDot source={loc.position.source} />
            </AdvancedMarker>
          )}

          {visible.map((d) => (
            <AdvancedMarker
              key={d.stop.id}
              position={d.stop.location}
              anchorPoint={AdvancedMarkerAnchorPoint.BOTTOM}
              clickable
              onClick={() => setActiveStopId(d.stop.id)}
            >
              <StopPinMarker variant={pinVariantFor(d)} />
            </AdvancedMarker>
          ))}
        </GoogleMap>
      </APIProvider>

      {/* Warm proximity halo */}
      <WarmHalo closestWarmM={warmM} />

      {/* One-shot indoor prompt — fires the first time the player
          crosses into any building trigger zone (and we have indoor
          stops authored). Once confirmed, indoorRevealed flips true
          and the prompt is gone for the rest of the session. */}
      <IndoorPromptOverlay
        open={hasIndoorStops && playerInTrigger && !progress.indoorRevealed}
        onConfirm={() => progress.setIndoorRevealed(true)}
      />

      {/* Dev panel */}
      <DevLocationOverlay
        devEnabled={loc.devEnabled}
        devPosition={loc.devPosition}
        position={loc.position}
        error={loc.error}
        onToggle={loc.setDevEnabled}
        onClear={() => loc.setDevPosition(null)}
      />

      {/* Journal button — bottom-left, sized for thumbs */}
      <button
        type="button"
        onClick={() => setJournalOpen(true)}
        className="absolute bottom-5 left-4 z-30 px-6 py-3.5 rounded-full bg-white/95 hover:bg-white text-stone-900 text-base font-semibold shadow-lg backdrop-blur-sm flex items-center gap-2"
        style={{ fontFamily: 'var(--font-newsreader), Georgia, serif' }}
      >
        Journal
        {progress.collectedIds.size > 0 && (
          <span
            className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-2 rounded-full text-white text-xs font-bold"
            style={{ background: 'var(--th-primary, #8b2538)' }}
          >
            {progress.collectedIds.size}
          </span>
        )}
      </button>

      <JournalSheet
        open={journalOpen}
        stops={stops}
        collectedIds={progress.collectedIds}
        onClose={() => setJournalOpen(false)}
        onOpenStop={(id) => setActiveStopId(id)}
      />

      {/* Active stop modal */}
      {activeStop && (
        <StopCard
          stop={activeStop}
          backgroundPhotoUrl={bgPhoto}
          onComplete={() => progress.collect(activeStop.id)}
          onClose={() => setActiveStopId(null)}
        />
      )}
    </div>
  );
}

function pinVariantFor(d: StopDiscovery): PinVariant {
  if (d.status === 'collected') return 'collected';
  if (d.status === 'indoorReady') return 'indoor';
  return 'discovered';
}

function PlayerDot({ source }: { source: 'gps' | 'dev' }) {
  const color = source === 'dev' ? '#f59e0b' : '#3b82f6';
  return (
    <div
      style={{
        position: 'relative',
        width: 28,
        height: 28,
      }}
      aria-label={source === 'dev' ? 'Fake player position' : 'Your position'}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: color,
          opacity: 0.25,
          animation: 'explorable-pulse 1.8s ease-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 4, left: 4, right: 4, bottom: 4,
          borderRadius: '50%',
          background: color,
          border: '3px solid #fff',
          boxShadow: '0 0 8px rgba(0,0,0,0.45)',
        }}
      />
      <style>{`
        @keyframes explorable-pulse {
          0%   { transform: scale(0.8); opacity: 0.45; }
          70%  { transform: scale(2.0); opacity: 0;    }
          100% { transform: scale(2.0); opacity: 0;    }
        }
      `}</style>
    </div>
  );
}
