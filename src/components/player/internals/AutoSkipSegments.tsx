import { useEffect, useRef } from "react";

import { useSkipTime } from "@/components/player/hooks/useSkipTime";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

interface SegmentSkipState {
  segmentId: string;
  hasSkipped: boolean;
}

/**
 * Component that automatically skips segments (intro, recap, preview, credits)
 * when the enableAutoSkipSegments preference is enabled.
 * For credits segments, only skips if end_ms is null (end of video).
 */
export function AutoSkipSegments() {
  const enableAutoSkipSegments = usePreferencesStore(
    (s) => s.enableAutoSkipSegments,
  );
  const skipCredits = usePreferencesStore((s) => s.enableSkipCredits);
  const display = usePlayerStore((s) => s.display);
  const time = usePlayerStore((s) => s.progress.time);
  const meta = usePlayerStore((s) => s.meta);
  const segments = useSkipTime();

  // Track which segments we've already skipped to avoid re-skipping
  const skippedSegmentsRef = useRef<Map<string, SegmentSkipState>>(new Map());

  // Reset skip state when media changes
  useEffect(() => {
    skippedSegmentsRef.current.clear();
  }, [meta?.tmdbId, meta?.season?.number, meta?.episode?.number]);

  useEffect(() => {
    if (!enableAutoSkipSegments || !display) return;

    const currentSeconds = time;

    for (const segment of segments) {
      // For credits, only skip if skipCredits is enabled and end_ms is null (end of video)
      const isCreditsSegment = segment.type === "credits";
      if (isCreditsSegment) {
        if (!skipCredits) continue;
        // Check if credits go to end of video (end_ms is null)
        if (segment.end_ms !== null) continue;
      } else if (segment.end_ms === null) {
        // For intro, recap, preview - skip if enabled and end time is defined
        continue;
      }

      const startSeconds = (segment.start_ms ?? 0) / 1000;
      const endSeconds = segment.end_ms ? segment.end_ms / 1000 : Infinity;
      const segmentId = `${segment.type}-${startSeconds}-${endSeconds}`;

      // Check if we're inside the segment
      if (currentSeconds >= startSeconds && currentSeconds < endSeconds) {
        const skipState = skippedSegmentsRef.current.get(segmentId);

        // Only skip if we haven't skipped this segment yet
        if (!skipState || !skipState.hasSkipped) {
          // Skip to the end of the segment
          display.setTime(
            endSeconds === Infinity ? currentSeconds + 10 : endSeconds,
          );

          // Mark this segment as skipped
          skippedSegmentsRef.current.set(segmentId, {
            segmentId,
            hasSkipped: true,
          });
        }
      }
    }
  }, [
    enableAutoSkipSegments,
    skipCredits,
    display,
    time,
    segments,
    meta?.tmdbId,
    meta?.season?.number,
    meta?.episode?.number,
  ]);

  return null;
}
