'use client';

/**
 * Loads the full set of authored stops from Firestore once on mount.
 *
 * Players don't need real-time updates — the stops change only when an
 * admin edits them, and we'd rather a session use a consistent snapshot.
 * Authors who want to see their edits live can refresh the page.
 */

import { useEffect, useState } from 'react';
import { ExplorableStop } from './stop-types';
import { getStops } from './stops-store';

export interface UseStopsResult {
  stops: ExplorableStop[];
  loading: boolean;
  error: string | null;
}

export function useStops(): UseStopsResult {
  const [stops, setStops] = useState<ExplorableStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const result = await getStops();
        if (!alive) return;
        setStops(result);
        setLoading(false);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { stops, loading, error };
}
