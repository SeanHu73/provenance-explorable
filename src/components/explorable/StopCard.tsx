'use client';

/**
 * The player-facing stop sequence: Notice → Context → Sort the evidence
 * → Collected.
 *
 * Fixed background photo, translucent backdrop-blurred cards. The player
 * snap-scrolls through Notice and Context, then sorts this stop's
 * contextual evidence into Perspective / Time / Place. Finishing the
 * sort marks the stop collected and records the bucketed evidence.
 *
 * Re-opening an already-collected stop skips straight to the collected
 * celebration (no re-sorting).
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ExplorableStop, resolvePuzzlePiece } from '@/lib/explorable/stop-types';
import { CategorisedEvidence } from '@/lib/explorable/discovery';
import StopEvidenceSorter from './StopEvidenceSorter';

interface Props {
  stop: ExplorableStop;
  /** Game-level background photo URL (null = neutral fallback). */
  backgroundPhotoUrl: string | null;
  essentialQuestion: string;
  /** True when re-opening a stop the player already finished. */
  alreadyCollected: boolean;
  onComplete: (items: CategorisedEvidence[]) => void;
  onClose: () => void;
}

export default function StopCard({
  stop,
  backgroundPhotoUrl,
  essentialQuestion,
  alreadyCollected,
  onComplete,
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Whether to show the collected celebration. Skipped to true when
  // re-opening a stop that's already been finished.
  const [done, setDone] = useState(alreadyCollected);
  const [sorterOpen, setSorterOpen] = useState(false);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, []);

  const piece = resolvePuzzlePiece(stop);
  const hasNoticeTimer = !!stop.notice.timerSeconds && stop.notice.timerSeconds > 0;

  return (
    <div
      className="fixed inset-0 z-40"
      style={{
        fontFamily: 'var(--font-newsreader), Georgia, serif',
        backgroundColor: '#e9e4e2',
      }}
    >
      {backgroundPhotoUrl && (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundPhotoUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-stone-900 text-2xl leading-none flex items-center justify-center shadow-lg backdrop-blur-sm"
        aria-label="Close stop"
      >
        ×
      </button>

      <div
        ref={containerRef}
        className="relative z-10 h-[100dvh] w-full overflow-y-auto snap-y snap-mandatory"
      >
        {/* ─── Notice ─────────────────────────────────────────── */}
        <Section>
          <Tag>Notice</Tag>
          <Heading>{stop.title || 'Look around…'}</Heading>

          {stop.notice.audio && (
            <audio
              src={stop.notice.audio.url}
              controls
              className="w-full"
            />
          )}

          <BodyWithInlinePhotos
            text={stop.notice.prompt}
            photos={stop.notice.photos}
          />

          {hasNoticeTimer && (
            <div className="text-xs uppercase tracking-[0.25em] text-stone-500 mt-4">
              Take {stop.notice.timerSeconds}s to look
            </div>
          )}

          <ScrollHint label="Then continue ↓" />
        </Section>

        {/* ─── Context ────────────────────────────────────────── */}
        <Section>
          <Tag>Context</Tag>

          {stop.context.audio && (
            <audio
              src={stop.context.audio.url}
              controls
              className="w-full"
            />
          )}

          {stop.context.text || stop.context.photos.length > 0 ? (
            <BodyWithInlinePhotos
              text={stop.context.text}
              photos={stop.context.photos}
              bodyClassName="text-lg sm:text-xl text-left whitespace-pre-line"
            />
          ) : (
            <Body className="italic text-stone-500">
              (No context text authored yet.)
            </Body>
          )}

          <ScrollHint label="One more ↓" />
        </Section>

        {/* ─── Sort the evidence / Collected ──────────────────── */}
        <Section>
          {done ? (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="text-xs uppercase tracking-[0.3em] text-stone-500">
                Collected
              </div>
              {piece.photoUrl ? (
                <img
                  src={piece.photoUrl}
                  alt={piece.label}
                  className="w-40 h-40 object-cover rounded-xl shadow-xl"
                />
              ) : (
                <div className="w-40 h-40 rounded-xl shadow-xl bg-stone-200 flex items-center justify-center text-stone-400">
                  no photo
                </div>
              )}
              <Heading>{piece.label || 'New piece'}</Heading>
              <Body className="text-base text-stone-700">
                Added to your evidence inventory.
              </Body>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-3 rounded-full bg-stone-900 text-white text-base hover:bg-stone-700"
              >
                Back to the map
              </button>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Tag>Sort the evidence</Tag>
              <Heading>Where does each clue belong?</Heading>
              <Body className="text-base text-stone-700">
                Sort what you found here into <strong>Perspective</strong>,{' '}
                <strong>Time</strong>, or <strong>Place</strong> — and add
                anything else you heard.
              </Body>
              <button
                type="button"
                onClick={() => setSorterOpen(true)}
                className="mt-2 px-6 py-3 rounded-full text-white text-base font-semibold shadow"
                style={{ background: 'var(--th-primary, #8b2538)' }}
              >
                Sort the evidence
              </button>
            </div>
          )}
        </Section>
      </div>

      {sorterOpen && (
        <StopEvidenceSorter
          stop={stop}
          essentialQuestion={essentialQuestion}
          backgroundPhotoUrl={backgroundPhotoUrl}
          onCancel={() => setSorterOpen(false)}
          onDone={(items) => {
            onComplete(items);
            setSorterOpen(false);
            setDone(true);
          }}
        />
      )}
    </div>
  );
}

// ───── Layout helpers (shared style with the explainer) ─────────

function Section({
  children,
  innerRef,
}: {
  children: React.ReactNode;
  innerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section
      ref={innerRef}
      className="snap-start min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-12"
    >
      <div
        className="max-w-xl w-full mx-auto rounded-2xl shadow-2xl px-6 sm:px-10 py-10 sm:py-12 text-center space-y-5"
        style={{
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          color: 'var(--th-text, #3a3a32)',
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-2xl sm:text-4xl font-semibold leading-tight"
      style={{
        fontFamily: 'var(--font-dm-serif-display), Georgia, serif',
        color: 'var(--th-primary, #8b2538)',
      }}
    >
      {children}
    </h2>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs uppercase tracking-[0.3em]"
      style={{ color: 'var(--th-secondary, #b8752b)' }}
    >
      {children}
    </div>
  );
}

function Body({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-xl leading-relaxed ${className}`}
      style={{ color: 'var(--th-text, #3a3a32)' }}
    >
      {children}
    </p>
  );
}

/**
 * Renders body text with photos placed inline wherever the author wrote
 * a `[photo:N]` token (N is 1-based, matching the photo's position in
 * the editor). Any photos the author didn't reference inline fall to a
 * strip at the end, so the old "text then all photos" behaviour is the
 * default when no tokens are used.
 */
function BodyWithInlinePhotos({
  text,
  photos,
  bodyClassName = '',
}: {
  text: string;
  photos: { url: string; caption?: string }[];
  bodyClassName?: string;
}) {
  const tokenRe = /\[photo:(\d+)\]/g;
  const used = new Set<number>();
  const blocks: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(text)) !== null) {
    const before = text.slice(lastIndex, m.index);
    if (before.trim()) {
      blocks.push(
        <Body key={key++} className={bodyClassName}>
          {before}
        </Body>,
      );
    }
    const photoIdx = parseInt(m[1], 10) - 1;
    const photo = photos[photoIdx];
    if (photo && !used.has(photoIdx)) {
      used.add(photoIdx);
      blocks.push(<InlinePhoto key={key++} photo={photo} />);
    }
    lastIndex = tokenRe.lastIndex;
  }

  const after = text.slice(lastIndex);
  if (after.trim()) {
    blocks.push(
      <Body key={key++} className={bodyClassName}>
        {after}
      </Body>,
    );
  }

  const leftover = photos.filter((_, i) => !used.has(i));

  return (
    <>
      {blocks}
      {leftover.length > 0 && (
        <PhotoStrip
          photos={leftover.map((p) => ({ url: p.url, caption: p.caption }))}
        />
      )}
    </>
  );
}

function InlinePhoto({ photo }: { photo: { url: string; caption?: string } }) {
  return (
    <figure className="space-y-1 mt-2">
      <img src={photo.url} alt={photo.caption || ''} className="w-full rounded-lg shadow" />
      {photo.caption && (
        <figcaption className="text-xs italic text-stone-600">
          {photo.caption}
        </figcaption>
      )}
    </figure>
  );
}

function PhotoStrip({
  photos,
}: {
  photos: { url: string; caption?: string }[];
}) {
  return (
    <div className="grid gap-3 mt-2">
      {photos.map((p, i) => (
        <figure key={i} className="space-y-1">
          <img
            src={p.url}
            alt={p.caption || ''}
            className="w-full rounded-lg shadow"
          />
          {p.caption && (
            <figcaption className="text-xs italic text-stone-600">
              {p.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

function ScrollHint({ label = 'Scroll' }: { label?: string }) {
  return (
    <motion.div
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      className="mt-8 text-xs uppercase tracking-[0.25em]"
      style={{ color: 'var(--th-text-muted, #6b6b61)' }}
      aria-hidden
    >
      {label}
    </motion.div>
  );
}
