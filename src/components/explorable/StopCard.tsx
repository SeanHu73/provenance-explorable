'use client';

/**
 * The player-facing stop sequence: Notice → Context → Collected.
 *
 * Visual treatment mirrors ContextualisationExplainer: fixed background
 * photo, translucent backdrop-blurred cards. The player snap-scrolls
 * through the three sections; on reaching "Collected" the stop is
 * marked complete in localStorage.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ExplorableStop, resolvePuzzlePiece } from '@/lib/explorable/stop-types';

interface Props {
  stop: ExplorableStop;
  /** Game-level background photo URL (null = neutral fallback). */
  backgroundPhotoUrl: string | null;
  onComplete: () => void;
  onClose: () => void;
}

export default function StopCard({ stop, backgroundPhotoUrl, onComplete, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const collectedSectionRef = useRef<HTMLDivElement>(null);
  const [reachedCollected, setReachedCollected] = useState(false);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, []);

  // Mark the stop collected the moment the "Collected!" section
  // becomes mostly visible — runs once.
  useEffect(() => {
    const el = collectedSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !completedRef.current) {
            completedRef.current = true;
            setReachedCollected(true);
            onComplete();
          }
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onComplete]);

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

          {stop.notice.prompt && <Body>{stop.notice.prompt}</Body>}

          {stop.notice.photos.length > 0 && (
            <PhotoStrip
              photos={stop.notice.photos.map((p) => ({ url: p.url, caption: p.caption }))}
            />
          )}

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

          {stop.context.text ? (
            <Body className="text-lg sm:text-xl text-left whitespace-pre-line">
              {stop.context.text}
            </Body>
          ) : (
            <Body className="italic text-stone-500">
              (No context text authored yet.)
            </Body>
          )}

          {stop.context.photos.length > 0 && (
            <PhotoStrip
              photos={stop.context.photos.map((p) => ({ url: p.url, caption: p.caption }))}
            />
          )}

          <ScrollHint label="One more ↓" />
        </Section>

        {/* ─── Collected ──────────────────────────────────────── */}
        <Section innerRef={collectedSectionRef}>
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={reachedCollected ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0 }}
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
        </Section>
      </div>
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
