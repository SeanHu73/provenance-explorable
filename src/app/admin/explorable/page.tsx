'use client';

/**
 * Explorable admin home — game-level configuration (essential question)
 * + navigation to per-stop authoring.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STANFORD_BOUNDS, STANFORD_CENTER } from '@/lib/explorable/geo';
import {
  ExplorableConfig,
  DEFAULT_CONFIG,
  getConfig,
  saveConfig,
} from '@/lib/explorable/config-store';

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
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

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

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      const next = await saveConfig(config);
      setConfig(next);
      setDirty(false);
      setStatus('Saved.');
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error('[EQ editor] save failed', err);
      setStatus('Save failed. Check Firestore rules.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 p-4 bg-white border border-stone-300 rounded">
      <h2 className="font-semibold text-lg mb-1">Essential Question</h2>
      <p className="text-xs text-stone-600 mb-3">
        Shown to players when they first enter the game and restated at the
        midway and final sorts. Players don't answer it directly — their
        evidence selections constitute their implicit answer.
      </p>

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : (
        <>
          <textarea
            value={config.essentialQuestion}
            onChange={(e) => {
              setConfig({ ...config, essentialQuestion: e.target.value });
              setDirty(true);
            }}
            rows={3}
            placeholder={'e.g. "What is this place for?"'}
            className="w-full px-3 py-2 border border-stone-300 rounded text-base"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="px-3 py-1.5 rounded bg-blue-700 text-white text-sm hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save question'}
            </button>
            {status && (
              <span className="text-xs text-stone-600">{status}</span>
            )}
            {dirty && !status && (
              <span className="text-xs text-amber-700">Unsaved changes</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
