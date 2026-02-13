import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { get } from "@/backend/metadata/tmdb";
import {
  PROVIDER_TO_TRAKT_MAP,
  getAppleMovieReleases,
  getAppleTVReleases,
  getDisneyMovies,
  getDisneyTVShows,
  getHBOMovies,
  getHBOTVShows,
  getHuluMovies,
  getHuluTVShows,
  getLatest4KReleases,
  getLatestReleases,
  getLatestTVReleases,
  getNetflixMovies,
  getNetflixTVShows,
  getParamountMovies,
  getParamountTVShows,
  getPrimeMovies,
  getPrimeTVShows,
} from "@/backend/metadata/traktApi";
import { paginateResults } from "@/backend/metadata/traktFunctions";
import type { TraktListResponse } from "@/backend/metadata/types/trakt";
import {
  EDITOR_PICKS_MOVIES,
  EDITOR_PICKS_TV_SHOWS,
  MOVIE_PROVIDERS,
  TV_PROVIDERS,
} from "@/pages/discover/types/discover";
import type {
  DiscoverContentType,
  DiscoverMedia,
  Genre,
  MediaType,
  Provider,
  UseDiscoverMediaProps,
  UseDiscoverMediaReturn,
} from "@/pages/discover/types/discover";
import { conf } from "@/setup/config";
import { useLanguageStore } from "@/stores/language";
import { getTmdbLanguageCode } from "@/utils/language";

// Re-export types for backward compatibility
export type {
  DiscoverContentType,
  DiscoverMedia,
  Genre,
  MediaType,
  Provider,
  UseDiscoverMediaProps,
  UseDiscoverMediaReturn,
};

// Re-export constants for backward compatibility
export {
  EDITOR_PICKS_MOVIES,
  EDITOR_PICKS_TV_SHOWS,
  MOVIE_PROVIDERS,
  TV_PROVIDERS,
};

export function useDiscoverOptions(mediaType: MediaType) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userLanguage = useLanguageStore((s) => s.language);
  const formattedLanguage = getTmdbLanguageCode(userLanguage);

  const providers = mediaType === "movie" ? MOVIE_PROVIDERS : TV_PROVIDERS;

  useEffect(() => {
    const fetchGenres = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await get<any>(`/genre/${mediaType}/list`, {
          api_key: conf().TMDB_READ_API_KEY,
          language: formattedLanguage,
        });
        setGenres(data.genres.slice(0, 50));
      } catch (err) {
        console.error(`Error fetching ${mediaType} genres:`, err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenres();
  }, [mediaType, formattedLanguage]);

  return {
    genres,
    providers,
    isLoading,
    error,
  };
}

export function useDiscoverMedia({
  contentType,
  mediaType,
  id,
  fallbackType,
  page = 1,
  genreName,
  providerName,
  mediaTitle,
  isCarouselView = false,
  enabled = true,
}: UseDiscoverMediaProps): UseDiscoverMediaReturn {
  const [media, setMedia] = useState<DiscoverMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [sectionTitle, setSectionTitle] = useState<string>("");
  const [currentContentType, setCurrentContentType] =
    useState<string>(contentType);
  const [actualContentType, setActualContentType] =
    useState<DiscoverContentType>(contentType);

  const { t } = useTranslation();
  const userLanguage = useLanguageStore((s) => s.language);
  const formattedLanguage = getTmdbLanguageCode(userLanguage);

  // Reset media when content type or media type changes
  useEffect(() => {
    if (contentType !== currentContentType) {
      setMedia([]);
      setCurrentContentType(contentType);
      setActualContentType(contentType); // Reset actual content type to original
    }
  }, [contentType, currentContentType]);

  const fetchTMDBMedia = useCallback(
    async (endpoint: string, params: Record<string, any> = {}) => {
      try {
        // For carousel views, we only need one page of results
        if (isCarouselView) {
          params.page = "1"; // Always use first page for carousels
        } else {
          params.page = page.toString(); // Use the requested page for "view more" pages
        }

        const data = await get<any>(endpoint, {
          api_key: conf().TMDB_READ_API_KEY,
          language: formattedLanguage,
          ...params,
        });

        // For carousel views, we might want to limit the number of results
        const results = isCarouselView
          ? data.results.slice(0, 20)
          : data.results;

        return {
          results: results.map((item: any) => ({
            ...item,
            type: mediaType === "movie" ? "movie" : "show",
          })),
          hasMore: page < data.total_pages,
        };
      } catch (err) {
        console.error("Error fetching TMDB media:", err);
        throw err;
      }
    },
    [formattedLanguage, page, mediaType, isCarouselView],
  );

  const fetchTraktMedia = useCallback(
    async (traktFunction: () => Promise<TraktListResponse>) => {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<TraktListResponse>((_, reject) => {
          setTimeout(() => reject(new Error("Trakt request timed out")), 3000);
        });

        // Race between the Trakt request and timeout
        const response = await Promise.race([traktFunction(), timeoutPromise]);

        // Check if response is null
        if (!response) {
          throw new Error("Trakt API returned null response");
        }

        // Paginate the results
        const pageSize = isCarouselView ? 20 : 100; // Limit to 20 items for carousels, get more for detailed views
        const { tmdb_ids: tmdbIds, hasMore: hasMoreResults } = paginateResults(
          response,
          page,
          pageSize,
          mediaType === "movie" ? "movie" : mediaType === "tv" ? "tv" : "both",
        );

        // For carousel views, we only need to fetch details for displayed items
        const idsToFetch = isCarouselView ? tmdbIds.slice(0, 20) : tmdbIds;

        // Fetch details for each TMDB ID
        const mediaPromises = idsToFetch.map(async (tmdbId: number) => {
          const endpoint = `/${mediaType}/${tmdbId}`;
          try {
            const data = await get<any>(endpoint, {
              api_key: conf().TMDB_READ_API_KEY,
              language: formattedLanguage,
            });
            return {
              ...data,
              type: mediaType === "movie" ? "movie" : "show",
            };
          } catch (err) {
            console.error(`Error fetching details for TMDB ID ${tmdbId}:`, err);
            return null; // Return null for failed items
          }
        });

        // Use Promise.allSettled to handle failed requests gracefully
        const settledResults = await Promise.allSettled(mediaPromises);

        // Filter out failed requests and nulls
        const results = settledResults
          .filter(
            (result): result is PromiseFulfilledResult<any> =>
              result.status === "fulfilled" && result.value !== null,
          )
          .map((result) => result.value);

        return {
          results,
          hasMore: hasMoreResults,
        };
      } catch (err) {
        console.error("Error fetching Trakt media:", err);
        throw err;
      }
    },
    [mediaType, formattedLanguage, page, isCarouselView],
  );

  // Get Trakt function for provider
  const getTraktProviderFunction = useCallback(
    (providerId: string) => {
      // Create the key based on provider ID and media type
      const key = mediaType === "tv" ? `${providerId}tv` : providerId;
      const trakt =
        PROVIDER_TO_TRAKT_MAP[key as keyof typeof PROVIDER_TO_TRAKT_MAP];

      if (!trakt) return null;

      // Map trakt endpoint to corresponding function
      switch (trakt) {
        case "appletv":
          return getAppleTVReleases;
        case "applemovie":
          return getAppleMovieReleases;
        case "netflixmovies":
          return getNetflixMovies;
        case "netflixtv":
          return getNetflixTVShows;
        case "primemovies":
          return getPrimeMovies;
        case "primetv":
          return getPrimeTVShows;
        case "hulumovies":
          return getHuluMovies;
        case "hulutv":
          return getHuluTVShows;
        case "disneymovies":
          return getDisneyMovies;
        case "disneytv":
          return getDisneyTVShows;
        case "hbomovies":
          return getHBOMovies;
        case "hbotv":
          return getHBOTVShows;
        case "paramountmovies":
          return getParamountMovies;
        case "paramounttv":
          return getParamountTVShows;
        default:
          return null;
      }
    },
    [mediaType],
  );

  const fetchEditorPicks = useCallback(async () => {
    const picks =
      mediaType === "movie" ? EDITOR_PICKS_MOVIES : EDITOR_PICKS_TV_SHOWS;

    // For carousel views, limit the number of picks to fetch
    const picksToFetch = isCarouselView ? picks.slice(0, 20) : picks;

    try {
      const mediaPromises = picksToFetch.map(async (item) => {
        const endpoint = `/${mediaType}/${item.id}`;
        const data = await get<any>(endpoint, {
          api_key: conf().TMDB_READ_API_KEY,
          language: formattedLanguage,
          append_to_response: "videos,images",
        });
        return {
          ...data,
          type: item.type,
        };
      });

      const results = await Promise.all(mediaPromises);
      return {
        results,
        hasMore: picks.length > picksToFetch.length,
      };
    } catch (err) {
      console.error("Error fetching editor picks:", err);
      throw err;
    }
  }, [mediaType, formattedLanguage, isCarouselView]);

  const fetchMedia = useCallback(async () => {
    // Skip fetching recommendations if no ID is provided
    if (contentType === "recommendations" && !id) {
      setIsLoading(false);
      setMedia([]);
      setHasMore(false);
      setSectionTitle("");
      return;
    }

    setIsLoading(true);
    setError(null);

    const attemptFetch = async (type: DiscoverContentType) => {
      let data;
      let traktProviderFunction;

      // Map content types to their endpoints and handling logic
      switch (type) {
        case "popular":
          data = await fetchTMDBMedia(`/${mediaType}/popular`);
          setSectionTitle(t("discover.carousel.title.popular"));
          break;

        case "topRated":
          data = await fetchTMDBMedia(`/${mediaType}/top_rated`);
          setSectionTitle(t("discover.carousel.title.topRated"));
          break;

        case "onTheAir":
          if (mediaType === "tv") {
            data = await fetchTMDBMedia("/tv/on_the_air");
            setSectionTitle(t("discover.carousel.title.onTheAir"));
          } else {
            throw new Error("onTheAir is only available for TV shows");
          }
          break;

        case "nowPlaying":
          if (mediaType === "movie") {
            data = await fetchTMDBMedia("/movie/now_playing");
            setSectionTitle(t("discover.carousel.title.inCinemas"));
          } else {
            throw new Error("nowPlaying is only available for movies");
          }
          break;

        case "latest":
          data = await fetchTraktMedia(getLatestReleases);
          setSectionTitle(t("discover.carousel.title.latestReleases"));
          break;

        case "latest4k":
          data = await fetchTraktMedia(getLatest4KReleases);
          setSectionTitle(t("discover.carousel.title.4kReleases"));
          break;

        case "latesttv":
          data = await fetchTraktMedia(getLatestTVReleases);
          setSectionTitle(t("discover.carousel.title.latestTVReleases"));
          break;

        case "genre":
          if (!id) throw new Error("Genre ID is required");

          // Use TMDB for genres (Trakt genre endpoints removed)
          data = await fetchTMDBMedia(`/discover/${mediaType}`, {
            with_genres: id,
          });
          setSectionTitle(
            mediaType === "movie"
              ? t("discover.carousel.title.movies", { category: genreName })
              : t("discover.carousel.title.tvshows", { category: genreName }),
          );
          break;

        case "provider":
          if (!id) throw new Error("Provider ID is required");

          // Try to use Trakt provider endpoint if available
          traktProviderFunction = getTraktProviderFunction(id);
          if (traktProviderFunction) {
            try {
              data = await fetchTraktMedia(traktProviderFunction);
              setSectionTitle(
                mediaType === "movie"
                  ? t("discover.carousel.title.moviesOn", {
                      provider: providerName,
                    })
                  : t("discover.carousel.title.tvshowsOn", {
                      provider: providerName,
                    }),
              );
            } catch (traktErr) {
              console.error(
                "Trakt provider fetch failed, falling back to TMDB:",
                traktErr,
              );
              // Fall back to TMDB
              data = await fetchTMDBMedia(`/discover/${mediaType}`, {
                with_watch_providers: id,
                watch_region: "US",
              });
              setSectionTitle(
                mediaType === "movie"
                  ? t("discover.carousel.title.moviesOn", {
                      provider: providerName,
                    })
                  : t("discover.carousel.title.tvshowsOn", {
                      provider: providerName,
                    }),
              );
            }
          } else {
            // Use TMDB if no Trakt endpoint exists for this provider
            data = await fetchTMDBMedia(`/discover/${mediaType}`, {
              with_watch_providers: id,
              watch_region: "US",
            });
            setSectionTitle(
              mediaType === "movie"
                ? t("discover.carousel.title.moviesOn", {
                    provider: providerName,
                  })
                : t("discover.carousel.title.tvshowsOn", {
                    provider: providerName,
                  }),
            );
          }
          break;

        case "recommendations":
          if (!id) throw new Error("Media ID is required for recommendations");
          data = await fetchTMDBMedia(`/${mediaType}/${id}/recommendations`);
          setSectionTitle(
            t("discover.carousel.title.recommended", { title: mediaTitle }),
          );
          break;

        case "editorPicks":
          data = await fetchEditorPicks();
          setSectionTitle(
            mediaType === "movie"
              ? t("discover.carousel.title.editorPicksMovies")
              : t("discover.carousel.title.editorPicksShows"),
          );
          break;

        default:
          throw new Error(`Unsupported content type: ${type}`);
      }

      return data;
    };

    try {
      const data = await attemptFetch(contentType);
      setMedia((prevMedia) => {
        // If page is 1, replace the media array, otherwise append
        return page === 1 ? data.results : [...prevMedia, ...data.results];
      });
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Error fetching media:", err);
      setError((err as Error).message);

      // Try fallback content type if available
      if (fallbackType && fallbackType !== contentType) {
        console.info(`Falling back from ${contentType} to ${fallbackType}`);
        try {
          const fallbackData = await attemptFetch(fallbackType);
          setActualContentType(fallbackType); // Set actual content type to fallback
          setMedia((prevMedia) => {
            // If page is 1, replace the media array, otherwise append
            return page === 1
              ? fallbackData.results
              : [...prevMedia, ...fallbackData.results];
          });
          setHasMore(fallbackData.hasMore);
          setError(null); // Clear error if fallback succeeds
        } catch (fallbackErr) {
          console.error("Error fetching fallback media:", fallbackErr);
          setError((fallbackErr as Error).message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    contentType,
    mediaType,
    id,
    fallbackType,
    genreName,
    providerName,
    mediaTitle,
    fetchTMDBMedia,
    fetchTraktMedia,
    fetchEditorPicks,
    t,
    page,
    getTraktProviderFunction,
  ]);

  useEffect(() => {
    // Reset media when content type, media type, or id changes
    if (contentType !== currentContentType || page === 1) {
      setMedia([]);
      setCurrentContentType(contentType);
    }
    // Only fetch when enabled
    if (enabled) {
      fetchMedia();
    }
  }, [fetchMedia, contentType, currentContentType, page, id, enabled]);

  return {
    media,
    isLoading,
    error,
    hasMore,
    refetch: fetchMedia,
    sectionTitle,
    actualContentType,
  };
}
