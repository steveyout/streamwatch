import { useMemo } from "react";

import { useSkipTime } from "@/components/player/hooks/useSkipTime";
import { parseSubtitles } from "@/components/player/utils/captions";
import { usePlayerStore } from "@/stores/player/store";

export function useCaptionMatchScore() {
  const segments = useSkipTime();
  const videoDuration = usePlayerStore((s) => s.progress.duration);
  const srtData = usePlayerStore((s) => s.caption.selected?.srtData);

  const matchScore = useMemo(() => {
    if (!srtData || !segments.length) return null;
    const credits = segments.find((s) => s.type === "credits");
    if (!credits || !credits.start_ms) return null;

    const startMs = credits.start_ms;
    const endMs = credits.end_ms ?? videoDuration * 1000;
    const durationMs = endMs - startMs;

    if (durationMs <= 0) return null;

    const cues = parseSubtitles(srtData);
    const intervals: [number, number][] = [];

    cues.forEach((cue) => {
      const cueStart = cue.start;
      const cueEnd = cue.end;

      const overlapStart = Math.max(startMs, cueStart);
      const overlapEnd = Math.min(endMs, cueEnd);

      if (overlapEnd > overlapStart) {
        intervals.push([overlapStart, overlapEnd]);
      }
    });

    if (intervals.length === 0) return 100;

    intervals.sort((a, b) => a[0] - b[0]);

    const merged: [number, number][] = [];
    let current = intervals[0];

    for (let i = 1; i < intervals.length; i += 1) {
      const next = intervals[i];
      if (next[0] <= current[1]) {
        current[1] = Math.max(current[1], next[1]);
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);

    const overlapMs = merged.reduce(
      (acc, range) => acc + (range[1] - range[0]),
      0,
    );
    const percentage = (overlapMs / durationMs) * 100;
    return Math.round(100 - percentage);
  }, [srtData, segments, videoDuration]);

  return matchScore;
}
