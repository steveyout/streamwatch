import { useEffect } from "react";

// import { proxiedFetch } from "@/backend/helpers/fetch";
import { mwFetch, proxiedFetch } from "@/backend/helpers/fetch";
import { usePlayerMeta } from "@/components/player/hooks/usePlayerMeta";
import { conf } from "@/setup/config";
import type { PlayerMeta } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { getTurnstileToken } from "@/utils/turnstile";

// Thanks Nemo for this API
const THE_INTRO_DB_BASE_URL = "https://api.theintrodb.org/v1";
const FED_SKIPS_BASE_URL = "https://fed-skips.pstream.mov";
const INTRODB_BASE_URL = "https://api.introdb.app/intro";
const MAX_RETRIES = 3;

// Track the source of the current skip time (for analytics filtering)
let currentSkipTimeSource: "fed-skips" | "introdb" | "theintrodb" | null = null;

// Prevent multiple components from triggering overlapping fetches for the same media
let fetchingForCacheKey: string | null = null;

/** Cache key for skip segments – matches TIDB API (tmdbId + season + episode number). */
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

  useEffect(() => {
    if (!cacheKey) return;
    // Already have segments for this media – don't refetch (e.g. when opening menu)
    if (usePlayerStore.getState().skipSegmentsCacheKey === cacheKey) return;
    // Another fetch for this key is already in progress (e.g. two components mounted)
    if (fetchingForCacheKey === cacheKey) return;
    fetchingForCacheKey = cacheKey;

    const fetchTheIntroDBSegments = async (): Promise<{
      segments: SegmentData[];
      tidbNotFound: boolean;
    }> => {
      if (!meta?.tmdbId) return { segments: [], tidbNotFound: false };

      try {
        let apiUrl = `${THE_INTRO_DB_BASE_URL}/media?tmdb_id=${meta.tmdbId}`;
        if (
          meta.type !== "movie" &&
          meta.season?.number &&
          meta.episode?.number
        ) {
          apiUrl += `&season=${meta.season.number}&episode=${meta.episode.number}`;
        }

        const data = await mwFetch(apiUrl, {
          headers: {
            Authorization: tidbKey ? `Bearer ${tidbKey}` : undefined,
          } as HeadersInit,
        });

        const fetchedSegments: SegmentData[] = [];

        // Add intro segment if it has data
        if (data?.intro && data.intro.submission_count > 0) {
          fetchedSegments.push({
            type: "intro",
            start_ms: data.intro.start_ms,
            end_ms: data.intro.end_ms,
            confidence: data.intro.confidence,
            submission_count: data.intro.submission_count,
          });
        }

        // Add recap segment if it has data
        if (data?.recap && data.recap.submission_count > 0) {
          fetchedSegments.push({
            type: "recap",
            start_ms: data.recap.start_ms,
            end_ms: data.recap.end_ms,
            confidence: data.recap.confidence,
            submission_count: data.recap.submission_count,
          });
        }

        // Add credits segment if it has data
        if (data?.credits && data.credits.submission_count > 0) {
          fetchedSegments.push({
            type: "credits",
            start_ms: data.credits.start_ms,
            end_ms: data.credits.end_ms,
            confidence: data.credits.confidence,
            submission_count: data.credits.submission_count,
          });
        }

        // Add preview segment if it has data
        if (data?.preview && data.preview.submission_count > 0) {
          fetchedSegments.push({
            type: "preview",
            start_ms: data.preview.start_ms,
            end_ms: data.preview.end_ms,
            confidence: data.preview.confidence,
            submission_count: data.preview.submission_count,
          });
        }

        // TIDB returned 200 – we have segment data for this media (even if no intro)
        return { segments: fetchedSegments, tidbNotFound: false };
      } catch (error: unknown) {
        const err = error as {
          response?: { status?: number };
          status?: number;
        };
        const status = err?.response?.status ?? err?.status;
        if (status === 404) {
          return { segments: [], tidbNotFound: true };
        }
        console.error("Error fetching TIDB segments:", error);
        return { segments: [], tidbNotFound: false };
      }
    };

    const fetchFedSkipsTime = async (retries = 0): Promise<number | null> => {
      if (!meta?.imdbId || meta.type === "movie") return null;
      if (!conf().ALLOW_FEBBOX_KEY) return null;
      if (!febboxKey) return null;

      try {
        const apiUrl = `${FED_SKIPS_BASE_URL}/${meta.imdbId}/${meta.season?.number}/${meta.episode?.number}`;

        const turnstileToken = await getTurnstileToken(
          "0x4AAAAAAB6ocCCpurfWRZyC",
        );
        if (!turnstileToken) return null;

        const response = await fetch(apiUrl, {
          headers: {
            "cf-turnstile-response": turnstileToken,
          },
        });

        if (!response.ok) {
          if (response.status === 500 && retries < MAX_RETRIES) {
            return fetchFedSkipsTime(retries + 1);
          }
          throw new Error("Fed-skips API request failed");
        }

        const data = await response.json();

        const parseSkipTime = (timeStr: string | undefined): number | null => {
          if (!timeStr || typeof timeStr !== "string") return null;
          const match = timeStr.match(/^($\d+$)s$/);
          if (!match) return null;
          return parseInt(match[1], 10);
        };

        const skipTime = parseSkipTime(data.introSkipTime);

        return skipTime;
      } catch (error) {
        console.error("Error fetching fed-skips time:", error);
        return null;
      }
    };

    const fetchIntroDBTime = async (): Promise<number | null> => {
      if (!meta?.imdbId || meta.type === "movie") return null;

      try {
        const apiUrl = `${INTRODB_BASE_URL}?imdb_id=${meta.imdbId}&season=${meta.season?.number}&episode=${meta.episode?.number}`;

        const data = await proxiedFetch(apiUrl);

        if (data && typeof data.end_ms === "number") {
          // Convert milliseconds to seconds
          return Math.floor(data.end_ms / 1000);
        }

        return null;
      } catch (error) {
        console.error("Error fetching IntroDB time:", error);
        return null;
      }
    };

    const applySegments = (segmentsToApply: SegmentData[]) => {
      // Only update store if this fetch is still for the current media (avoid stale overwrite)
      const currentKey = getSkipSegmentsCacheKey(
        usePlayerStore.getState().meta ?? null,
      );
      if (currentKey === cacheKey) {
        setSkipSegments(cacheKey, segmentsToApply);
      }
    };

    const fetchSkipTime = async (): Promise<void> => {
      currentSkipTimeSource = null;

      try {
        // Try TheIntroDB API first (supports both movies and TV shows with full segment data)
        const { segments: tidbSegments, tidbNotFound } =
          await fetchTheIntroDBSegments();

        // TIDB returned 200 – use whatever segments we got (intro, recap, credits; may be empty)
        if (!tidbNotFound) {
          currentSkipTimeSource = "theintrodb";
          applySegments(tidbSegments);
          return;
        }

        // TIDB returned 404 – no segment data for this media; try fallbacks for intro only
        const nonIntroSegments: SegmentData[] = [];
        let fallbackIntroSegment: SegmentData | null = null;

        // Fall back to Fed-skips (TV shows only)
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

        // Last resort: IntroDB API (TV shows only)
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

        const finalSegments: SegmentData[] = [];
        if (fallbackIntroSegment) {
          finalSegments.push(fallbackIntroSegment);
        }
        finalSegments.push(...nonIntroSegments);

        applySegments(finalSegments);
      } finally {
        if (fetchingForCacheKey === cacheKey) {
          fetchingForCacheKey = null;
        }
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
  ]);

  // Only return segments when they're for the current media (avoid showing stale data)
  return cacheKey === skipSegmentsCacheKey ? skipSegments : [];
}
