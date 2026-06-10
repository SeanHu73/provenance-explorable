import type { Metadata } from 'next';

/**
 * Hosts the self-contained interactive explorable as its own document
 * inside a full-bleed iframe. The HTML lives in /public (served as a
 * static file at the URL below) and is intentionally NOT imported into
 * the JS bundle — loading it via <iframe> lets its inline scripts run
 * and keeps its styles isolated from the app's Tailwind/global CSS.
 */

const EXPLORABLE_SRC = '/explorables/stanford-contextualization.html';

export const metadata: Metadata = {
  title: 'Stanford Contextualization — Explorable',
  description:
    'An interactive explorable on historical contextualisation at Stanford.',
};

export default function ContextualizationExplorablePage() {
  return (
    <main className="h-[100dvh] w-screen overflow-hidden">
      <iframe
        src={EXPLORABLE_SRC}
        title="Stanford Contextualization interactive explorable"
        className="block w-full h-[100dvh]"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
      />
    </main>
  );
}
