import { useCallback, useEffect, useState } from "react";

import { getMediaDetails, getRelatedMedia } from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import type {
  TMDBMovieData,
  TMDBMovieSearchResult,
  TMDBShowData,
  TMDBShowSearchResult,
} from "@/backend/metadata/types/tmdb";

import { fetchFedSimilarItems } from "../lib/personalRecommendations";

export function useSimilarMedia({
  mediaId,
  mediaType,
  limit = 12,
  enabled = true,
}: {
  mediaId: string;
  mediaType: TMDBContentTypes;
  limit?: number;
  enabled?: boolean;
}) {
  const [media, setMedia] = useState<
    TMDBMovieSearchResult[] | TMDBShowSearchResult[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTVShow = mediaType === TMDBContentTypes.TV;
  const type = isTVShow ? TMDBContentTypes.TV : TMDBContentTypes.MOVIE;

  const fetch = useCallback(async () => {
    if (!mediaId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try fed-similar API first
      const fedSimilarIds = await fetchFedSimilarItems(mediaId, isTVShow);

      if (fedSimilarIds.length > 0) {
        // Fetch full details for fed-similar items
        const fedSimilarDetailPromises = fedSimilarIds
          .slice(0, limit)
          .map((tmdbId) => getMediaDetails(tmdbId, type));

        const fedSimilarDetails = await Promise.allSettled(
          fedSimilarDetailPromises,
        );

        const results: (TMDBMovieSearchResult | TMDBShowSearchResult)[] = [];

        for (const result of fedSimilarDetails) {
          if (result.status !== "fulfilled" || !result.value) continue;
          const item = result.value as TMDBMovieData | TMDBShowData;

          let searchItem: TMDBMovieSearchResult | TMDBShowSearchResult;
          if (isTVShow) {
            const showItem = item as TMDBShowData;
            searchItem = {
              adult: showItem.adult ?? false,
              backdrop_path: showItem.backdrop_path ?? "",
              id: showItem.id,
              name: showItem.name,
              original_language: showItem.original_language ?? "",
              original_name: showItem.original_name ?? "",
              overview: showItem.overview ?? "",
              poster_path: showItem.poster_path ?? "",
              media_type: TMDBContentTypes.TV,
              genre_ids: showItem.genres?.map((g) => g.id) ?? [],
              popularity: showItem.popularity ?? 0,
              first_air_date: showItem.first_air_date ?? "",
              vote_average: showItem.vote_average,
              vote_count: showItem.vote_count,
              origin_country: showItem.origin_country ?? [],
            };
          } else {
            const movieItem = item as TMDBMovieData;
            searchItem = {
              adult: movieItem.adult ?? false,
              backdrop_path: movieItem.backdrop_path ?? "",
              id: movieItem.id,
              title: movieItem.title,
              original_language: movieItem.original_language ?? "",
              original_title: movieItem.original_title ?? "",
              overview: movieItem.overview ?? "",
              poster_path: movieItem.poster_path ?? "",
              media_type: TMDBContentTypes.MOVIE,
              genre_ids: movieItem.genres?.map((g) => g.id) ?? [],
              popularity: movieItem.popularity ?? 0,
              release_date: movieItem.release_date ?? "",
              video: movieItem.video ?? false,
              vote_average: movieItem.vote_average,
              vote_count: movieItem.vote_count,
            };
          }

          results.push(searchItem);
        }

        if (results.length >= limit / 2) {
          // If we have enough results from fed-similar, use them
          setMedia(
            results.slice(0, limit) as
              | TMDBMovieSearchResult[]
              | TMDBShowSearchResult[],
          );
          return;
        }
      }

      // Fall back to TMDB recommendations
      console.info(
        "Fed-similar API returned insufficient or no results, falling back to TMDB",
      );
      const tmdbResults = await getRelatedMedia(mediaId, type, limit);
      setMedia(tmdbResults);
    } catch (err) {
      console.error("Failed to load similar media:", err);

      // Try TMDB fallback on error
      try {
        console.info("Attempting TMDB fallback...");
        const tmdbResults = await getRelatedMedia(mediaId, type, limit);
        setMedia(tmdbResults);
        setError(null);
      } catch (tmdbErr) {
        setError((tmdbErr as Error).message);
        setMedia([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [mediaId, type, isTVShow, limit, enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    media,
    isLoading,
    error,
    refetch: fetch,
  };
}
