import { useEffect, useState } from "react";
import { useIdle } from "react-use";

import { getMediaDetails, getMediaLogo } from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import { useShouldShowControls } from "@/components/player/hooks/useShouldShowControls";
import { useIsMobile } from "@/hooks/useIsMobile";
import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

interface PauseDetails {
  voteAverage: number | null;
  genres: string[];
}

export function PauseOverlay() {
  const isIdle = useIdle(5e3); // 5 seconds
  const isPaused = usePlayerStore((s) => s.mediaPlaying.isPaused);
  const status = usePlayerStore((s) => s.status);
  const meta = usePlayerStore((s) => s.meta);
  const enablePauseOverlay = usePreferencesStore((s) => s.enablePauseOverlay);
  const enableImageLogos = usePreferencesStore((s) => s.enableImageLogos);
  const { isMobile } = useIsMobile();
  const { showTargets } = useShouldShowControls();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [details, setDetails] = useState<PauseDetails>({
    voteAverage: null,
    genres: [],
  });

  let shouldShow = isPaused && isIdle && enablePauseOverlay;
  if (isMobile && status === playerStatus.SCRAPING) shouldShow = false;
  if (isMobile && showTargets) shouldShow = false;

  useEffect(() => {
    let mounted = true;
    const fetchLogo = async () => {
      if (!meta?.tmdbId || !enableImageLogos) {
        setLogoUrl(null);
        return;
      }

      try {
        const type =
          meta.type === "movie" ? TMDBContentTypes.MOVIE : TMDBContentTypes.TV;
        const url = await getMediaLogo(meta.tmdbId, type);
        if (mounted) setLogoUrl(url || null);
      } catch {
        if (mounted) setLogoUrl(null);
      }
    };

    fetchLogo();
    return () => {
      mounted = false;
    };
  }, [meta?.tmdbId, meta?.type, enableImageLogos]);

  useEffect(() => {
    let mounted = true;
    const fetchDetails = async () => {
      if (!meta?.tmdbId) {
        setDetails({ voteAverage: null, genres: [] });
        return;
      }
      try {
        const type =
          meta.type === "movie" ? TMDBContentTypes.MOVIE : TMDBContentTypes.TV;
        const data = await getMediaDetails(meta.tmdbId, type, false);
        if (mounted && data) {
          const voteAverage =
            typeof data.vote_average === "number" ? data.vote_average : null;
          const genres = (data.genres ?? []).map(
            (g: { name: string }) => g.name,
          );
          setDetails({ voteAverage, genres });
        }
      } catch {
        if (mounted) setDetails({ voteAverage: null, genres: [] });
      }
    };

    fetchDetails();
    return () => {
      mounted = false;
    };
  }, [meta?.tmdbId, meta?.type]);

  if (!meta) return null;

  const overview =
    meta.type === "show" ? meta.episode?.overview : meta.overview;

  // Don't render anything if we don't have content, but keep structure for fade if valid
  const hasDetails = details.voteAverage !== null || details.genres.length > 0;
  const hasContent = overview || logoUrl || meta.title || hasDetails;
  if (!hasContent) return null;

  return (
    <div
      className={`absolute inset-0 z-[60] flex items-center bg-black/60 transition-opacity duration-500 pointer-events-none ${
        shouldShow ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="md:ml-16 max-w-sm lg:max-w-2xl p-8">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={meta.title}
            className="mb-6 max-h-32 object-contain drop-shadow-lg"
          />
        ) : (
          <h1 className="mb-4 text-4xl font-bold text-white drop-shadow-lg">
            {meta.title}
          </h1>
        )}

        {meta.type === "show" && meta.episode && (
          <h2 className="mb-2 text-2xl font-semibold text-white/90 drop-shadow-md">
            {meta.episode.title}
          </h2>
        )}

        {(details.voteAverage !== null || details.genres.length > 0) && (
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/80 drop-shadow-md">
            {details.voteAverage !== null && (
              <span>
                {details.voteAverage.toFixed(1)}
                <span className="text-white/60 ml-0.5">/10</span>
              </span>
            )}
            {details.genres.length > 0 && (
              <>
                {details.voteAverage !== null && (
                  <span className="text-white/60">•</span>
                )}
                <span>{details.genres.slice(0, 4).join(", ")}</span>
              </>
            )}
          </div>
        )}

        {overview && (
          <p className="text-lg text-white/80 drop-shadow-md line-clamp-6">
            {overview}
          </p>
        )}
      </div>
    </div>
  );
}
