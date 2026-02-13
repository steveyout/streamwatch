import { useCallback, useEffect, useRef, useState } from "react";

import { useSkipTimeSource } from "@/components/player/hooks/useSkipTime";
import { useSkipTracking } from "@/components/player/hooks/useSkipTracking";
import { usePlayerStore } from "@/stores/player/store";

// Import SkipEvent type
type SkipEvent = NonNullable<ReturnType<typeof useSkipTracking>["latestSkip"]>;

/**
 * Component that tracks and reports completed skip sessions to analytics backend.
 * Sessions are detected when users accumulate 20+ seconds of forward movement
 * within a 6-second window and end after 5 seconds of no activity.
 * Ignores skips that start after 20% of video duration (unlikely to be intro skipping).
 */
interface PendingSkip {
  skip: SkipEvent;
  originalConfidence: number;
  startTime: number;
  endTime: number;
  hasBackwardMovement: boolean;
  skipTimeSource: "fed-skips" | null;
  timer: ReturnType<typeof setTimeout>;
}

export function SkipTracker() {
  const { latestSkip } = useSkipTracking(20);
  const lastLoggedSkipRef = useRef<number>(0);
  const [pendingSkips, setPendingSkips] = useState<PendingSkip[]>([]);
  const lastPlayerTimeRef = useRef<number>(0);

  // Player metadata for context
  const meta = usePlayerStore((s) => s.meta);
  const progress = usePlayerStore((s) => s.progress);
  const turnstileToken = "";
  const skipTimeSource = useSkipTimeSource();

  const sendSkipAnalytics = useCallback(
    async (skip: SkipEvent, adjustedConfidence: number) => {
      try {
        await fetch("https://skips.pstream.mov/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_time: skip.startTime,
            end_time: skip.endTime,
            skip_duration: skip.skipDuration,
            content_id: meta?.tmdbId,
            content_type: meta?.type,
            season: meta?.season?.number,
            episode: meta?.episode?.number,
            confidence: adjustedConfidence,
            turnstile_token: turnstileToken ?? "",
          }),
        });
      } catch (error) {
        console.error("Failed to send skip analytics:", error);
      }
    },
    [meta, turnstileToken],
  );

  const createPendingSkip = useCallback(
    (skip: SkipEvent) => {
      const timer = setTimeout(() => {
        // Timer expired, send analytics with final confidence
        setPendingSkips((prev) => {
          const pendingSkip = prev.find(
            (p) => p.skip.timestamp === skip.timestamp,
          );
          if (!pendingSkip) return prev;

          const adjustedConfidence = pendingSkip.hasBackwardMovement
            ? Math.max(0.1, pendingSkip.originalConfidence * 0.5) // Reduce confidence by half if adjusted
            : pendingSkip.originalConfidence;

          // Only send analytics if skip time came from fed-skips
          if (pendingSkip.skipTimeSource === "fed-skips") {
            // Send analytics
            sendSkipAnalytics(pendingSkip.skip, adjustedConfidence);
          }

          // Remove from pending
          return prev.filter((p) => p.skip.timestamp !== skip.timestamp);
        });
      }, 5000); // 5 second delay

      return {
        skip,
        originalConfidence: skip.confidence,
        startTime: skip.startTime,
        endTime: skip.endTime,
        hasBackwardMovement: false,
        skipTimeSource,
        timer,
      };
    },
    [sendSkipAnalytics, skipTimeSource],
  );

  useEffect(() => {
    if (!latestSkip || !meta) return;

    // Avoid processing the same skip multiple times
    if (latestSkip.timestamp === lastLoggedSkipRef.current) return;

    // Log completed skip session
    // eslint-disable-next-line no-console
    console.log(`Skip session completed: ${latestSkip.skipDuration}s total`);

    // Create pending skip with 5-second delay
    const pendingSkip = createPendingSkip(latestSkip);
    setPendingSkips((prev) => [...prev, pendingSkip as PendingSkip]);

    lastLoggedSkipRef.current = latestSkip.timestamp;
  }, [latestSkip, meta, createPendingSkip]);

  // Monitor for backward movements during pending skip periods
  useEffect(() => {
    const currentTime = progress.time;

    // Check for backward movement
    if (
      lastPlayerTimeRef.current > 0 &&
      currentTime < lastPlayerTimeRef.current
    ) {
      // Backward movement detected, mark relevant pending skips as adjusted
      setPendingSkips((prev) =>
        prev.map((pending) => {
          // Check if we're within the monitoring period (between start and end time of skip)
          const isWithinSkipRange =
            currentTime >= pending.startTime && currentTime <= pending.endTime;
          if (isWithinSkipRange && !pending.hasBackwardMovement) {
            // eslint-disable-next-line no-console
            console.log(
              `Backward adjustment detected for skip, reducing confidence`,
            );
            return { ...pending, hasBackwardMovement: true };
          }
          return pending;
        }),
      );
    }

    lastPlayerTimeRef.current = currentTime;
  }, [progress.time]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      pendingSkips.forEach((pending) => {
        clearTimeout(pending.timer);
      });
    };
  }, [pendingSkips]);

  return null;
}
