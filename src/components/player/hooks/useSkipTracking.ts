import { useCallback, useEffect, useRef, useState } from "react";

import { usePlayerStore } from "@/stores/player/store";

interface SkipEvent {
  startTime: number;
  endTime: number;
  skipDuration: number;
  timestamp: number;
  confidence: number; // 0.0-1.0 confidence score
  meta?: {
    title: string;
    type: string;
    tmdbId?: string;
    seasonNumber?: number;
    episodeNumber?: number;
  };
}

interface SkipTrackingResult {
  /** Array of skip events detected */
  skipHistory: SkipEvent[];
  /** The most recent skip event */
  latestSkip: SkipEvent | null;
  /** Clear the skip history */
  clearHistory: () => void;
  /** Add a manual skip event (e.g., from skip intro button) */
  addSkipEvent: (event: Omit<SkipEvent, "timestamp">) => void;
}

/**
 * Hook that tracks manual skip events and monitors user behavior patterns for confidence adjustment.
 * Only processes skip events added via addSkipEvent (e.g., from skip intro button).
 *
 * @param minSkipThreshold Minimum total forward movement in 5-second window to start session (default: 20)
 * @param maxHistory Maximum number of skip events to keep in history (default: 50)
 */
export function useSkipTracking(
  minSkipThreshold: number = 20,
  maxHistory: number = 50,
): SkipTrackingResult {
  const [skipHistory, setSkipHistory] = useState<SkipEvent[]>([]);
  const previousTimeRef = useRef<number>(0);
  const skipWindowRef = useRef<Array<{ time: number; delta: number }>>([]);
  const isInSkipSessionRef = useRef<boolean>(false);
  const skipSessionStartRef = useRef<number>(0);
  const sessionTotalRef = useRef<number>(0);

  // Get current player state
  const progress = usePlayerStore((s) => s.progress);
  const meta = usePlayerStore((s) => s.meta);

  const clearHistory = useCallback(() => {
    setSkipHistory([]);
    previousTimeRef.current = 0;
    skipWindowRef.current = [];
    isInSkipSessionRef.current = false;
    skipSessionStartRef.current = 0;
    sessionTotalRef.current = 0;
  }, []);

  const addSkipEvent = useCallback(
    (event: Omit<SkipEvent, "timestamp">) => {
      const skipEvent: SkipEvent = {
        ...event,
        timestamp: Date.now(),
      };

      setSkipHistory((prev) => {
        const newHistory = [...prev, skipEvent];
        return newHistory.length > maxHistory
          ? newHistory.slice(newHistory.length - maxHistory)
          : newHistory;
      });
    },
    [maxHistory],
  );

  const detectSkip = useCallback(() => {
    const now = Date.now();
    const currentTime = progress.time;

    // Initialize on first run
    if (previousTimeRef.current === 0) {
      previousTimeRef.current = currentTime;
      return;
    }

    const timeDelta = currentTime - previousTimeRef.current;

    // Track forward movements >= 1 second in sliding 6-second window
    if (timeDelta >= 1) {
      // Add forward movement to window and remove entries older than 6 seconds
      skipWindowRef.current.push({ time: now, delta: timeDelta });
      skipWindowRef.current = skipWindowRef.current.filter(
        (entry) => entry.time > now - 6000,
      );

      // Calculate total forward movement in current window
      const totalForwardMovement = skipWindowRef.current.reduce(
        (sum, entry) => sum + entry.delta,
        0,
      );

      // Start session when threshold exceeded
      if (
        totalForwardMovement >= minSkipThreshold &&
        !isInSkipSessionRef.current
      ) {
        isInSkipSessionRef.current = true;
        skipSessionStartRef.current = previousTimeRef.current;
        sessionTotalRef.current = totalForwardMovement;
      }
      // Update session total while active
      else if (isInSkipSessionRef.current) {
        sessionTotalRef.current = totalForwardMovement;
      }
    }

    // End session if no forward movement in last 8 seconds
    const recentEntries = skipWindowRef.current.filter(
      (entry) => entry.time > now - 8000,
    );

    if (isInSkipSessionRef.current && recentEntries.length === 0) {
      // Session ended - reset state but DON'T create skip event
      isInSkipSessionRef.current = false;
      skipSessionStartRef.current = 0;
      sessionTotalRef.current = 0;
      skipWindowRef.current = [];
    }

    previousTimeRef.current = currentTime;
  }, [progress.time, minSkipThreshold]);

  useEffect(() => {
    // Monitor time changes every 100ms to catch rapid skipping
    const interval = setInterval(detectSkip, 100);
    return () => clearInterval(interval);
  }, [detectSkip]);

  // Reset tracking when content changes
  useEffect(() => {
    clearHistory();
  }, [meta?.tmdbId, clearHistory]);

  return {
    skipHistory,
    latestSkip:
      skipHistory.length > 0 ? skipHistory[skipHistory.length - 1] : null,
    clearHistory,
    addSkipEvent,
  };
}
