'use client';

/**
 * Debounced auto-save hook.
 *
 * Watches `value` and calls `save(value)` after `delayMs` of stability.
 * Skips the very first render (so we don't write the initial state back
 * to Firestore as soon as the form mounts). After a successful save the
 * status briefly shows 'saved' then returns to 'idle' so the indicator
 * doesn't get noisy.
 *
 * `save` and `onSaved` are stored in refs so callers don't have to
 * memoise them — every render's latest version is used.
 */

import { useEffect, useRef, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface Options<T> {
  value: T;
  save: (value: T) => Promise<T | void>;
  /** ms of stability before save fires. Default 1000. */
  delayMs?: number;
  /** Called with the result of save() on success. Use this to e.g.
   *  redirect from /stops/new to /stops/[id] the first time a brand-new
   *  draft is persisted. */
  onSaved?: (saved: T) => void;
}

export function useAutoSave<T>({ value, save, delayMs = 1000, onSaved }: Options<T>) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  const initialRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  const onSavedRef = useRef(onSaved);

  useEffect(() => { saveRef.current = save; }, [save]);
  useEffect(() => { onSavedRef.current = onSaved; }, [onSaved]);

  useEffect(() => {
    // First render — value is still the initial, nothing to save.
    if (value === initialRef.current) return;

    setStatus('dirty');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        const result = await saveRef.current(value);
        setStatus('saved');
        setLastError(null);
        if (onSavedRef.current && result !== undefined && result !== null) {
          onSavedRef.current(result as T);
        }
      } catch (err) {
        setStatus('error');
        setLastError(err instanceof Error ? err.message : String(err));
        // eslint-disable-next-line no-console
        console.error('[useAutoSave] save failed', err);
      }
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delayMs]);

  // 'saved' is transient — fade back to 'idle' after a couple of seconds.
  useEffect(() => {
    if (status !== 'saved') return;
    const t = setTimeout(() => setStatus('idle'), 2000);
    return () => clearTimeout(t);
  }, [status]);

  return { status, lastError };
}

export function autoSaveLabel(status: AutoSaveStatus): string {
  switch (status) {
    case 'idle':   return '';
    case 'dirty':  return 'Unsaved changes';
    case 'saving': return 'Saving…';
    case 'saved':  return 'Saved';
    case 'error':  return 'Save failed';
  }
}

export function autoSaveColor(status: AutoSaveStatus): string {
  switch (status) {
    case 'idle':   return '';
    case 'dirty':  return 'text-amber-700';
    case 'saving': return 'text-stone-500';
    case 'saved':  return 'text-green-700';
    case 'error':  return 'text-red-700';
  }
}
