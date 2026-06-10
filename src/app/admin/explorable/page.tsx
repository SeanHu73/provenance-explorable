'use client';

/**
 * Explorable admin home — game-level configuration (essential question)
 * + navigation to per-stop authoring.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { STANFORD_BOUNDS, STANFORD_CENTER } from '@/lib/explorable/geo';
import {
  ExplorableConfig,
  DEFAULT_CONFIG,
  getConfig,
  saveConfig,
} from '@/lib/explorable/config-store';
import {
  useAutoSave,
  autoSaveLabel,
  autoSaveColor,
} from '@/lib/explorable/use-auto-save';
import SinglePhotoField from '@/components/explorable/admin/SinglePhotoField';
import BuildingTriggersEditor from '@/components/explorable/admin/BuildingTriggersEditor';
import BoundsEditor from '@/components/explorable/admin/BoundsEditor';

export default function ExplorableAdminPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 border-b border-stone-300 pb-3">
          <h1 className="text-2xl font-bold">Explorable Admin</h1>
          <p className="text-sm text-stone-600 mt-1">
            Author the two-player evidence-puzzle game. See{' '}
            <code className="bg-stone-200 px-1 rounded">
              docs/Build_State_Explorable.md
            </code>{' '}
            for the full spec.
          </p>
          <nav className="mt-3 text-sm flex gap-4 flex-wrap">
            <Link
              href="/admin/explorable/stops"
              className="text-blue-700 hover:underline font-semibold"
            >
              Manage stops →
            </Link>
            <Link
              href="/admin/explorable/overview"
              className="text-blue-700 hover:underline font-semibold"
            >
              All-stops map →
            </Link>
            <Link
              href="/explorable"
              className="text-blue-700 hover:underline font-semibold"
            >
              Open game (real GPS)
            </Link>
            <Link
              href="/explorable?devloc=1"
              className="text-amber-700 hover:underline font-semibold"
            >
              Open game (dev override)
            </Link>
            <Link href="/admin" className="text-blue-700 hover:underline">
              Legacy Provenance admin
            </Link>
            <Link href="/" className="text-blue-700 hover:underline">
              Main app
            </Link>
          </nav>
        </header>

        <EssentialQuestionEditor />

        <section className="mb-6">
          <h2 className="font-semibold text-lg mb-2">Map configuration</h2>
          <div className="text-sm text-stone-700 space-y-1">
            <p>
              <strong>Center:</strong>{' '}
              <code className="bg-stone-200 px-1 rounded">
                {STANFORD_CENTER.lat.toFixed(5)}, {STANFORD_CENTER.lng.toFixed(5)}
              </code>{' '}
              (Memorial Church)
            </p>
            <p>
              <strong>Bounds (strict):</strong>{' '}
              <code className="bg-stone-200 px-1 rounded text-xs">
                N {STANFORD_BOUNDS.north} · S {STANFORD_BOUNDS.south} · E{' '}
                {STANFORD_BOUNDS.east} · W {STANFORD_BOUNDS.west}
              </code>
            </p>
            <p>
              <strong>Zoom range:</strong> 16 (min) – 20 (max), default 18
            </p>
            <p>
              <strong>Map type:</strong> hybrid (satellite + labels)
            </p>
          </div>
        </section>

        <section className="mb-6 p-4 bg-white border border-stone-300 rounded text-sm text-stone-700">
          <h2 className="font-semibold text-lg mb-2">Evidence sorting</h2>
          <p className="text-stone-600">
            Players sort evidence into <strong>Perspective</strong>,{' '}
            <strong>Time</strong>, and <strong>Place</strong> at each stop.
            Author the sample evidence (and its correct bucket) inside each
            stop, under{' '}
            <Link
              href="/admin/explorable/stops"
              className="text-blue-700 underline"
            >
              Manage stops → Contextual Evidence
            </Link>
            . At the end of the tour players see everything they bucketed and
            answer the essential question in their own words.
          </p>
        </section>

        <section className="p-4 bg-stone-100 border border-stone-300 rounded text-sm text-stone-700">
          <h2 className="font-semibold mb-2">How to test from your desk</h2>
          <ol className="list-decimal ml-5 space-y-1">
            <li>
              Open{' '}
              <Link href="/explorable?devloc=1" className="text-blue-700 underline">
                /explorable?devloc=1
              </Link>{' '}
              (the <code>?devloc=1</code> forces the dev panel to show even
              in production).
            </li>
            <li>
              Tick <em>Fake GPS</em> in the top-right panel.
            </li>
            <li>Tap anywhere on the campus map to set your "position".</li>
            <li>The player marker turns orange (vs blue for real GPS).</li>
            <li>
              In dev (<code>npm run dev</code>) the panel is always shown.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}

function EssentialQuestionEditor() {
  const [config, setConfig] = useState<ExplorableConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const c = await getConfig();
      if (!alive) return;
      setConfig(c);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const save = useCallback((c: ExplorableConfig) => saveConfig(c), []);

  // Don't auto-save until the initial load is done — otherwise we'd
  // overwrite the stored value with DEFAULT_CONFIG before it loads.
  const { status, lastError } = useAutoSave({
    value: loading ? DEFAULT_CONFIG : config,
    save,
    delayMs: 1000,
  });

  const saveIndicator = (
    <span className={`text-xs font-medium ${autoSaveColor(status)}`}>
      {autoSaveLabel(status) || (
        <span className="text-stone-400">All changes saved</span>
      )}
    </span>
  );

  return (
    <>
      <section className="mb-6 p-4 bg-white border border-stone-300 rounded">
        <div className="flex items-baseline justify-between mb-1 gap-3">
          <h2 className="font-semibold text-lg">Essential Question</h2>
          {saveIndicator}
        </div>
        <p className="text-xs text-stone-600 mb-3">
          Shown to players when they first enter the game. At the end of the
          tour they answer it in their own words, with all their bucketed
          evidence in front of them.
        </p>

        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : (
          <textarea
            value={config.essentialQuestion}
            onChange={(e) =>
              setConfig({ ...config, essentialQuestion: e.target.value })
            }
            rows={3}
            placeholder={'e.g. "What is this place for?"'}
            className="w-full px-3 py-2 border border-stone-300 rounded text-base"
          />
        )}

        {lastError && (
          <p className="mt-2 text-xs text-red-700">{lastError}</p>
        )}
      </section>

      <section className="mb-6 p-4 bg-white border border-stone-300 rounded">
        <div className="flex items-baseline justify-between mb-1 gap-3">
          <h2 className="font-semibold text-lg">Background Photo</h2>
          {saveIndicator}
        </div>
        <p className="text-xs text-stone-600 mb-3">
          Shown behind every player-facing screen (lesson + stop cards).
          A single image applies across the whole game.
        </p>

        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : (
          <SinglePhotoField
            label="Image"
            value={config.backgroundPhotoUrl}
            onChange={(url) =>
              setConfig({ ...config, backgroundPhotoUrl: url })
            }
            previewClassName="w-full max-w-md aspect-[4/3]"
          />
        )}
      </section>

      <section className="mb-6 p-4 bg-white border border-stone-300 rounded">
        <div className="flex items-baseline justify-between mb-1 gap-3">
          <h2 className="font-semibold text-lg">Map Bounds</h2>
          {saveIndicator}
        </div>
        <p className="text-xs text-stone-600 mb-3">
          The player can't pan outside this rectangle. Defaults to the
          Stanford campus core.
        </p>
        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : (
          <BoundsEditor
            value={config.bounds}
            onChange={(bounds) => setConfig({ ...config, bounds })}
          />
        )}
      </section>

      <TriggersCollapsible
        value={config.buildingTriggers}
        loading={loading}
        saveIndicator={saveIndicator}
        onChange={(buildingTriggers) =>
          setConfig({ ...config, buildingTriggers })
        }
      />
    </>
  );
}

function TriggersCollapsible({
  value,
  loading,
  saveIndicator,
  onChange,
}: {
  value: import('@/lib/explorable/config-store').BuildingTrigger[];
  loading: boolean;
  saveIndicator: React.ReactNode;
  onChange: (
    next: import('@/lib/explorable/config-store').BuildingTrigger[],
  ) => void;
}) {
  // Collapse by default if there are triggers (the editor is bulky);
  // expand when empty so first-time users see the affordance.
  const [open, setOpen] = useState(value.length === 0);

  return (
    <section className="mb-6 p-4 bg-white border border-stone-300 rounded">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-baseline justify-between gap-3 mb-1"
      >
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <span
            className="inline-block transition-transform text-stone-500"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
            aria-hidden
          >
            ▶
          </span>
          Indoor Triggers
          <span className="text-xs font-normal text-stone-500">
            ({value.length})
          </span>
        </h2>
        {saveIndicator}
      </button>
      <p className="text-xs text-stone-600 mb-3">
        Invisible zones used to gate the "I'm inside Memorial Church"
        prompt. The prompt only appears once the player enters one of
        these radii. Use one trigger per building entrance.
      </p>

      {open ? (
        loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : (
          <BuildingTriggersEditor value={value} onChange={onChange} />
        )
      ) : (
        <p className="text-xs text-stone-500 italic">
          Collapsed. Click the heading to edit.
        </p>
      )}
    </section>
  );
}
