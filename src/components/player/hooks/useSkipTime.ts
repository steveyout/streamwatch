import { useEffect } from "react";

import { proxiedFetch } from "@/backend/helpers/fetch";
import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { conf } from "@/setup/config";
import type { PlayerMeta } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { TheIntroDbApiError, getIntroDbMedia } from "@/utils/tidb";
import { getTurnstileToken } from "@/utils/turnstile";

const FED_SKIPS_BASE_URL = "https://fed-skips.pstream.mov";
const INTRODB_BASE_URL = "https://api.introdb.app/intro";
const MAX_RETRIES = 3;

let currentSkipTimeSource: "fed-skips" | "introdb" | "theintrodb" | null = null;
let fetchingForCacheKey: string | null = null;

function getSkipSegmentsCacheKey(meta: PlayerMeta | null): string | null {
  if (!meta?.tmdbId) return null;
  if (meta.type === "movie") return `skip-${meta.type}-${meta.tmdbId}`;
  if (meta.type === "show" && meta.season != null && meta.episode != null) {
    return `skip-${meta.type}-${meta.tmdbId}-${meta.season.number}-${meta.episode.number}`;
  }
  return null;
}

export function useSkipTimeSource(): typeof currentSkipTimeSource {
  return currentSkipTimeSource;
}

export interface SegmentData {
  type: "intro" | "recap" | "credits" | "preview";
  start_ms: number | null;
  end_ms: number | null;
  confidence: number | null;
  submission_count: number;
}

export function useSkipTime() {
  const { playerMeta: meta } = usePlayerMeta();
  const febboxKey = usePreferencesStore((s) => s.febboxKey);
  const cacheKey = getSkipSegmentsCacheKey(meta ?? null);
  const skipSegmentsCacheKey = usePlayerStore((s) => s.skipSegmentsCacheKey);
  const skipSegments = usePlayerStore((s) => s.skipSegments);
  const setSkipSegments = usePlayerStore((s) => s.setSkipSegments);
  const tidbKey = usePreferencesStore((s) => s.tidbKey);
  const duration = usePlayerStore((s) => s.progress.duration);

  useEffect(() => {
    if (!cacheKey) return;
    if (usePlayerStore.getState().skipSegmentsCacheKey === cacheKey) return;
    if (fetchingForCacheKey === cacheKey) return;
    fetchingForCacheKey = cacheKey;

    const fetchTheIntroDBSegments = async (): Promise<{
      segments: SegmentData[];
      tidbNotFound: boolean;
    }> => {
      if (!meta?.tmdbId) return { segments: [], tidbNotFound: false };

      try {
        const media = await getIntroDbMedia(
          meta.type === "movie"
            ? {
                tmdbId: Number(meta.tmdbId),
                durationMs:
                  duration > 0 ? Math.round(duration * 1000) : undefined,
              }
            : {
                tmdbId: Number(meta.tmdbId),
                season: meta.season?.number,
                episode: meta.episode?.number,
                durationMs:
                  duration > 0 ? Math.round(duration * 1000) : undefined,
              },
          tidbKey,
        );

        const segments: SegmentData[] = [];
        const segmentTypes = ["intro", "recap", "credits", "preview"] as const;
        for (const type of segmentTypes) {
          for (const segment of media[type]) {
            segments.push({
              type,
              start_ms: segment.startsAtBeginning ? null : segment.startMs,
              end_ms: segment.endMs,
              confidence: segment.confidence ?? null,
              submission_count: segment.submissionCount ?? 0,
            });
          }
        }
        return { segments, tidbNotFound: false };
      } catch (error: unknown) {
        if (error instanceof TheIntroDbApiError && error.status === 404) {
          return { segments: [], tidbNotFound: true };
        }
        console.error("Error fetching TIDB segments:", error);
        return { segments: [], tidbNotFound: false };
      }
    };

    const fetchFedSkipsTime = async (retries = 0): Promise<number | null> => {
      if (!meta?.imdbId || meta.type === "movie") return null;
      if (!conf().ALLOW_FEBBOX_KEY || !febboxKey) return null;

      try {
        const apiUrl = `${FED_SKIPS_BASE_URL}/${meta.imdbId}/${meta.season?.number}/${meta.episode?.number}`;
        const turnstileToken = await getTurnstileToken(
          "0x4AAAAAAB6ocCCpurfWRZyC",
        );
        if (!turnstileToken) return null;
        const response = await fetch(apiUrl, {
          headers: { "cf-turnstile-response": turnstileToken },
        });
        if (!response.ok) {
          if (response.status === 500 && retries < MAX_RETRIES) {
            return fetchFedSkipsTime(retries + 1);
          }
          throw new Error("Fed-skips API request failed");
        }
        const data = await response.json();
        const match =
          typeof data.introSkipTime === "string"
            ? data.introSkipTime.match(/^(\d+)s$/)
            : null;
        return match ? parseInt(match[1], 10) : null;
      } catch (error) {
        console.error("Error fetching fed-skips time:", error);
        return null;
      }
    };

    const fetchIntroDBTime = async (): Promise<number | null> => {
      if (!meta?.imdbId || meta.type === "movie") return null;
      try {
        const data = await proxiedFetch(
          `${INTRODB_BASE_URL}?imdb_id=${meta.imdbId}&season=${meta.season?.number}&episode=${meta.episode?.number}`,
        );
        return data && typeof data.end_ms === "number"
          ? Math.floor(data.end_ms / 1000)
          : null;
      } catch (error) {
        console.error("Error fetching IntroDB time:", error);
        return null;
      }
    };

    const applySegments = (segmentsToApply: SegmentData[]) => {
      const currentKey = getSkipSegmentsCacheKey(
        usePlayerStore.getState().meta ?? null,
      );
      if (currentKey === cacheKey) setSkipSegments(cacheKey, segmentsToApply);
    };

    const fetchSkipTime = async (): Promise<void> => {
      currentSkipTimeSource = null;
      try {
        const { segments: tidbSegments, tidbNotFound } =
          await fetchTheIntroDBSegments();
        if (!tidbNotFound) {
          currentSkipTimeSource = "theintrodb";
          applySegments(tidbSegments);
          return;
        }

        let fallbackIntroSegment: SegmentData | null = null;
        if (febboxKey && meta?.type !== "movie") {
          const fedSkipsTime = await fetchFedSkipsTime();
          if (fedSkipsTime !== null) {
            currentSkipTimeSource = "fed-skips";
            fallbackIntroSegment = {
              type: "intro",
              start_ms: 0,
              end_ms: fedSkipsTime * 1000,
              confidence: null,
              submission_count: 1,
            };
          }
        }
        if (!fallbackIntroSegment && meta?.type !== "movie") {
          const introDBTime = await fetchIntroDBTime();
          if (introDBTime !== null) {
            currentSkipTimeSource = "introdb";
            fallbackIntroSegment = {
              type: "intro",
              start_ms: 0,
              end_ms: introDBTime * 1000,
              confidence: null,
              submission_count: 1,
            };
          }
        }
        applySegments(fallbackIntroSegment ? [fallbackIntroSegment] : []);
      } finally {
        if (fetchingForCacheKey === cacheKey) fetchingForCacheKey = null;
      }
    };

    fetchSkipTime();
  }, [
    cacheKey,
    meta?.tmdbId,
    meta?.imdbId,
    meta?.title,
    meta?.type,
    meta?.season?.number,
    meta?.episode?.number,
    febboxKey,
    setSkipSegments,
    tidbKey,
    duration,
  ]);

  return cacheKey === skipSegmentsCacheKey ? skipSegments : [];
}
