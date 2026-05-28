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
import ExplainerPromptOverlay from './ExplainerPromptOverlay';
import SortScreen from './SortScreen';
import RevealSequence from './RevealSequence';
import dynamic from 'next/dynamic';

const ContextualisationExplainer = dynamic(
  () => import('./ContextualisationExplainer'),
  { ssr: false },
);

const AUTO_EXPLAINER_THRESHOLD = 4;

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MAP_ID = 'b8f339c02d8c7d5bd3f12d1b';

export default function ExplorableMap() {
  const loc = useLocationSource();
  const { stops } = useStops();
  const progress = useProgress();
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [autoExplainerFired, setAutoExplainerFired] = useState(false);
  // Set true when the player crosses the 4-stop threshold. The actual
  // prompt only renders once StopCard / other modals are closed, so
  // the lesson never interrupts the Collected screen.
  const [explainerPending, setExplainerPending] = useState(false);
  const [midwaySortOpen, setMidwaySortOpen] = useState(false);
  const [finalSortOpen, setFinalSortOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [eq, setEq] = useState<string>('');
  const [bgPhoto, setBgPhoto] = useState<string | null>(null);
  const [triggers, setTriggers] = useState<BuildingTrigger[]>([]);
  const [bounds, setBounds] = useState<MapBounds>(STANFORD_BOUNDS);
  // Sticky flag: once the player has crossed into any trigger, the
  // indoor prompt stays open until they tap the button — even if they
  // wander out of the trigger again.
  const [indoorPromptShown, setIndoorPromptShown] = useState(false);
  // Dev mode reveals an extra "Lesson preview" menu so authors can
  // open the explainer without collecting 4 stops first.
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    const envFlag = process.env.NEXT_PUBLIC_ENABLE_DEV_LOC === 'true';
    const isDev = process.env.NODE_ENV !== 'production';
    const urlFlag =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('devloc');
    setDevMode(envFlag || isDev || urlFlag);
  }, []);

  useEffect(() => {
    getConfig().then((c) => {
      setBgPhoto(c.backgroundPhotoUrl);
      setTriggers(c.buildingTriggers || []);
      setEq(c.essentialQuestion || 'What is this place for?');
      if (c.bounds) setBounds(c.bounds);
    });
  }, []);

  // After the auto-fired explainer closes, open the midway sort with
  // everything collected so far. Manual (dev) opens of the explainer
  // don't trigger this.
  const handleExplainerClose = useCallback(() => {
    setExplainerOpen(false);
    if (autoExplainerFired && progress.sortedStopIds.size === 0) {
      setMidwaySortOpen(true);
    }
  }, [autoExplainerFired, progress.sortedStopIds.size]);

  // Stops we'll show in each sort screen — collected ∩ (sorted or not).
  const midwayStops = useMemo(
    () => stops.filter((s) => progress.collectedIds.has(s.id)),
    [stops, progress.collectedIds],
  );
  const finalSortStops = useMemo(
    () =>
      stops.filter(
        (s) =>
          progress.collectedIds.has(s.id) &&
          !progress.sortedStopIds.has(s.id),
      ),
    [stops, progress.collectedIds, progress.sortedStopIds],
  );
  const allSortedStops = useMemo(
    () => stops.filter((s) => progress.sortedStopIds.has(s.id)),
    [stops, progress.sortedStopIds],
  );

  const playerInTrigger = useMemo(
    () => isInAnyTrigger(loc.position, triggers),
    [loc.position, triggers],
  );

  // Latch the prompt on the first crossing — never auto-close.
  useEffect(() => {
    if (
      hasIndoorStops &&
      playerInTrigger &&
      !progress.indoorRevealed &&
      !indoorPromptShown
    ) {
      setIndoorPromptShown(true);
    }
    // hasIndoorStops not in deps — it changes with stops above and
    // the latch only flips one direction, so missing it is harmless.
  }, [playerInTrigger, progress.indoorRevealed, indoorPromptShown]);

  // Queue the contextualisation explainer once the player has collected
  // enough stops. We don't open it directly here — the StopCard is
  // probably still on screen showing the Collected celebration. Instead
  // we flip a pending flag; the ExplainerPromptOverlay below renders
  // only once activeStopId clears.
  useEffect(() => {
    if (autoExplainerFired) return;
    if (progress.collectedIds.size >= AUTO_EXPLAINER_THRESHOLD) {
      setAutoExplainerFired(true);
      setExplainerPending(true);
    }
  }, [progress.collectedIds.size, autoExplainerFired]);

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

      {/* Indoor prompt — fires the first time the player crosses into
          any building trigger zone (and we have indoor stops authored).
          Sticky once shown: stays until they tap the button, even if
          they wander out of the trigger. Tapping flips indoorRevealed
          and the prompt is gone for the rest of the session. */}
      <IndoorPromptOverlay
        open={hasIndoorStops && indoorPromptShown && !progress.indoorRevealed}
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

      {/* Journal button — bottom-center, sized for thumbs */}
      <button
        type="button"
        onClick={() => setJournalOpen(true)}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 px-6 py-3.5 rounded-full bg-white/95 hover:bg-white text-stone-900 text-base font-semibold shadow-lg backdrop-blur-sm flex items-center gap-2 whitespace-nowrap"
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

      {/* Dev-only shortcuts — stacked bottom-right so authors can
          test each modal without going through the full game flow. */}
      {devMode && (
        <div className="absolute bottom-5 right-4 z-30 flex flex-col gap-1 items-end">
          <DevShortcutBtn
            onClick={() => {
              setExplainerPending(false);
              setExplainerOpen(true);
            }}
          >
            Dev · Lesson preview
          </DevShortcutBtn>
          <DevShortcutBtn onClick={() => setMidwaySortOpen(true)}>
            Dev · Midway sort
          </DevShortcutBtn>
          <DevShortcutBtn onClick={() => setFinalSortOpen(true)}>
            Dev · Final sort
          </DevShortcutBtn>
          <DevShortcutBtn onClick={() => setRevealOpen(true)}>
            Dev · Reveal
          </DevShortcutBtn>
        </div>
      )}

      {/* "Learn about contextualising" interstitial — appears only
          when the lesson is queued AND no other modal is on screen. */}
      <ExplainerPromptOverlay
        open={
          explainerPending &&
          !activeStop &&
          !journalOpen &&
          !explainerOpen &&
          !midwaySortOpen &&
          !finalSortOpen &&
          !revealOpen
        }
        onBegin={() => {
          setExplainerPending(false);
          setExplainerOpen(true);
        }}
      />

      {/* Contextualisation explainer modal — auto-fires at
          AUTO_EXPLAINER_THRESHOLD collected stops (one-shot), or
          opened manually by the dev menu above. */}
      {explainerOpen && (
        <ContextualisationExplainer
          onClose={handleExplainerClose}
        />
      )}

      <JournalSheet
        open={journalOpen}
        stops={stops}
        collectedIds={progress.collectedIds}
        onClose={() => setJournalOpen(false)}
        onOpenStop={(id) => setActiveStopId(id)}
        onFinishTour={() => {
          setJournalOpen(false);
          setFinalSortOpen(true);
        }}
      />

      {/* ── Midway sort — opens after the auto-fired explainer closes.
          Falls back to ALL stops in dev so it's testable without
          collecting four first. */}
      {midwaySortOpen && (
        <SortScreen
          title="Midway — sort your evidence"
          essentialQuestion={eq}
          stops={midwayStops.length > 0 ? midwayStops : stops}
          backgroundPhotoUrl={bgPhoto}
          onComplete={(entries) => {
            progress.recordSort(entries);
            setMidwaySortOpen(false);
          }}
          onCancel={devMode ? () => setMidwaySortOpen(false) : undefined}
        />
      )}

      {/* ── Final sort — opens when the player taps "Finish tour" */}
      {finalSortOpen && (
        <SortScreen
          title={
            finalSortStops.length > 0
              ? 'Final — sort the rest'
              : 'Final review'
          }
          essentialQuestion={eq}
          stops={
            finalSortStops.length > 0
              ? finalSortStops
              : stops.filter(
                  (s) => !progress.sortedStopIds.has(s.id),
                ).length > 0
                ? stops.filter((s) => !progress.sortedStopIds.has(s.id))
                : stops
          }
          backgroundPhotoUrl={bgPhoto}
          onComplete={(entries) => {
            progress.recordSort(entries);
            setFinalSortOpen(false);
            setRevealOpen(true);
          }}
          onCancel={() => setFinalSortOpen(false)}
        />
      )}

      {/* ── Reveal sequence — runs after the final sort. Dev shortcut
          uses all stops so authors can see the disagreement UI even
          without sorting anything. */}
      {revealOpen && (
        <RevealSequence
          stops={allSortedStops.length > 0 ? allSortedStops : stops}
          verdicts={progress.verdicts}
          backgroundPhotoUrl={bgPhoto}
          onRecordResponse={(stopId, response) =>
            progress.recordRevealResponse(stopId, response)
          }
          onComplete={() => setRevealOpen(false)}
        />
      )}

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

function DevShortcutBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-2 rounded-lg bg-stone-900/75 hover:bg-stone-900/90 text-white text-xs font-medium backdrop-blur-sm shadow whitespace-nowrap"
    >
      {children}
    </button>
  );
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
