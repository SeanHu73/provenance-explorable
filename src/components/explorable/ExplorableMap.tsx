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

import { useCallback, useMemo, useRef, useState } from 'react';
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
  bearingDeg,
} from '@/lib/explorable/geo';
import { useLocationSource } from '@/lib/explorable/location-source';
import { useStops } from '@/lib/explorable/use-stops';
import {
  computeDiscoveries,
  closestWarmDistance,
  closestDiscoveredDistance,
  isInAnyTrigger,
  useProgress,
  StopDiscovery,
  CategorisedEvidence,
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
import { AnimatePresence, motion } from 'framer-motion';
import StopCard from './StopCard';
import JournalSheet from './JournalSheet';
import IndoorPromptOverlay from './IndoorPromptOverlay';
import ExplainerPromptOverlay from './ExplainerPromptOverlay';
import ClueArrows, { ClueArrowTarget } from './ClueArrows';
import StartFindingOverlay from './StartFindingOverlay';
import FinalReflection from './FinalReflection';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MAP_ID = 'b8f339c02d8c7d5bd3f12d1b';

export default function ExplorableMap() {
  const loc = useLocationSource();
  const { stops } = useStops();
  const progress = useProgress();
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [finalReflectionOpen, setFinalReflectionOpen] = useState(false);
  // Set true when the player has collected every authored stop; the
  // "Answer the essential question" interstitial then appears next time
  // the map is clean.
  const [finalPending, setFinalPending] = useState(false);
  const [finalAutoFired, setFinalAutoFired] = useState(false);
  const [eq, setEq] = useState<string>('');
  const [bgPhoto, setBgPhoto] = useState<string | null>(null);
  const [triggers, setTriggers] = useState<BuildingTrigger[]>([]);
  const [bounds, setBounds] = useState<MapBounds>(STANFORD_BOUNDS);
  // Sticky flag: once the player has crossed into any trigger, the
  // indoor prompt stays open until they tap the button — even if they
  // wander out of the trigger again.
  const [indoorPromptShown, setIndoorPromptShown] = useState(false);
  // Dev mode reveals an extra menu so authors can jump to the final
  // reflection without collecting every stop first.
  const [devMode, setDevMode] = useState(false);
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  // One-time "Tap to Start Finding" explainer shown when the player
  // first reaches the map.
  const [startHintDismissed, setStartHintDismissed] = useState(false);

  useEffect(() => {
    const envFlag = process.env.NEXT_PUBLIC_ENABLE_DEV_LOC === 'true';
    const isDev = process.env.NODE_ENV !== 'production';
    const urlFlag =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('devloc');
    setDevMode(envFlag || isDev || urlFlag);
  }, []);

  // In dev mode, turn fake GPS on automatically (and drop the player at
  // the campus centre if no dev position is set yet) so the experience
  // is testable from a desk without granting real geolocation. Runs once
  // per mount; the dev can still toggle it back off in the dev panel.
  const devAutoApplied = useRef(false);
  useEffect(() => {
    if (!devMode || devAutoApplied.current) return;
    devAutoApplied.current = true;
    if (!loc.devEnabled) loc.setDevEnabled(true);
    if (!loc.devPosition) loc.setDevPosition(STANFORD_CENTER);
  }, [devMode, loc]);

  useEffect(() => {
    getConfig().then((c) => {
      setBgPhoto(c.backgroundPhotoUrl);
      setTriggers(c.buildingTriggers || []);
      setEq(c.essentialQuestion || 'What is this place for?');
      if (c.bounds) setBounds(c.bounds);
    });
  }, []);

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

  // Queue the final reflection once every authored stop has been
  // collected. We don't open it directly — the StopCard is probably
  // still on screen. Instead we flip a pending flag; the prompt below
  // renders only once the map is clean.
  useEffect(() => {
    if (finalAutoFired) return;
    if (stops.length === 0) return;
    if (progress.collectedIds.size >= stops.length) {
      setFinalAutoFired(true);
      setFinalPending(true);
    }
  }, [progress.collectedIds.size, stops.length, finalAutoFired]);

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
  const discoveredM = useMemo(
    () => closestDiscoveredDistance(discoveries),
    [discoveries],
  );
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

  // Directional arrows: point toward the nearest clues the player hasn't
  // reached yet. Includes indoor stops that haven't been revealed yet
  // (`indoorHidden`) — they have a real map location, so the arrow guides
  // the player toward the building even before the "I'm inside" prompt
  // surfaces them. Outdoor stops within the discovery radius (already
  // showing a pin) and revealed/collected stops are excluded. Capped at
  // the closest few so the player marker stays readable.
  const clueArrows = useMemo<ClueArrowTarget[]>(() => {
    if (!loc.position) return [];
    const player = loc.position;
    return discoveries
      .filter(
        (d) =>
          d.status === 'warm' ||
          d.status === 'far' ||
          d.status === 'indoorHidden',
      )
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 3)
      .map((d) => ({
        id: d.stop.id,
        bearing: bearingDeg(player, d.stop.location),
        distanceM: d.distanceM,
      }));
  }, [discoveries, loc.position]);

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
              <ClueArrows targets={clueArrows} />
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

      {/* Proximity halo — green when a pin is in sight, blue when warm */}
      <WarmHalo closestDiscoveredM={discoveredM} closestWarmM={warmM} />

      {/* Indoor prompt — fires the first time the player crosses into
          any building trigger zone (and we have indoor stops authored).
          Sticky once shown: stays until they tap the button, even if
          they wander out of the trigger. Tapping flips indoorRevealed
          and the prompt is gone for the rest of the session. */}
      <IndoorPromptOverlay
        open={hasIndoorStops && indoorPromptShown && !progress.indoorRevealed}
        onConfirm={() => progress.setIndoorRevealed(true)}
      />

      {/* One-time "Tap to Start Finding" explainer. Only over a clean
          map — never lands on top of a StopCard, sort, or other modal. */}
      <StartFindingOverlay
        open={
          !startHintDismissed &&
          !activeStop &&
          !journalOpen &&
          !finalReflectionOpen
        }
        devMode={devMode}
        onDismiss={() => setStartHintDismissed(true)}
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

      {/* Dev-only shortcuts. Small toggle button bottom-right; tap to
          reveal the shortcuts stacked above it. */}
      {devMode && (
        <div className="absolute bottom-5 right-4 z-30 flex flex-col gap-1.5 items-end">
          <AnimatePresence>
            {devMenuOpen && (
              <motion.div
                key="dev-menu"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-1 items-end"
              >
                <DevShortcutBtn
                  onClick={() => {
                    setFinalPending(false);
                    setFinalReflectionOpen(true);
                    setDevMenuOpen(false);
                  }}
                >
                  Final reflection
                </DevShortcutBtn>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setDevMenuOpen((v) => !v)}
            className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-stone-900/80 hover:bg-stone-900 text-white text-[11px] font-semibold backdrop-blur-sm shadow"
            aria-label={devMenuOpen ? 'Close dev menu' : 'Open dev menu'}
            title="Dev menu"
          >
            {devMenuOpen ? '×' : 'Dev'}
          </button>
        </div>
      )}

      {/* "Answer the essential question" interstitial — fires once the
          player has collected every authored stop. Modal-guarded so it
          never lands over an active StopCard or the reflection itself. */}
      <ExplainerPromptOverlay
        open={
          finalPending &&
          !activeStop &&
          !journalOpen &&
          !finalReflectionOpen
        }
        eyebrow="You've collected everything"
        heading="Answer the essential question"
        buttonLabel="Begin"
        onBegin={() => {
          setFinalPending(false);
          setFinalReflectionOpen(true);
        }}
      />

      <JournalSheet
        open={journalOpen}
        stops={stops}
        collectedIds={progress.collectedIds}
        essentialQuestion={eq}
        onClose={() => setJournalOpen(false)}
        onOpenStop={(id) => setActiveStopId(id)}
        onFinishTour={() => {
          setJournalOpen(false);
          setFinalReflectionOpen(true);
        }}
      />

      {/* ── Final reflection — bucketed evidence + EQ free response.
          Fires when every stop is collected, from the journal's
          "Finish the tour", or the dev shortcut. */}
      {finalReflectionOpen && (
        <FinalReflection
          essentialQuestion={eq}
          categorisedEvidence={progress.categorisedEvidence}
          answer={progress.eqAnswer}
          onAnswerChange={progress.setEqAnswer}
          backgroundPhotoUrl={bgPhoto}
          onClose={() => setFinalReflectionOpen(false)}
        />
      )}

      {/* Active stop modal */}
      {activeStop && (
        <StopCard
          stop={activeStop}
          backgroundPhotoUrl={bgPhoto}
          essentialQuestion={eq}
          alreadyCollected={progress.collectedIds.has(activeStop.id)}
          onComplete={(items: CategorisedEvidence[]) => {
            progress.collect(activeStop.id);
            progress.recordStopEvidence(activeStop.id, items);
          }}
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
