import { conf } from "@/setup/config";
import { SimpleCache } from "@/utils/cache";
import { getTurnstileToken } from "@/utils/turnstile";

import { getMediaDetails } from "./tmdb";
import { TMDBContentTypes, TMDBMovieData } from "./types/tmdb";
import type {
  CuratedMovieList,
  TraktListResponse,
  TraktNetworkResponse,
  TraktReleaseResponse,
} from "./types/trakt";

export const TRAKT_BASE_URL = "https://fed-airdate.pstream.mov";

// Token cookie configuration
const TOKEN_COOKIE_NAME = "turnstile_token";
const TOKEN_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Get turnstile token from cookie or fetch new one
 * Returns an object indicating if the token was cached or freshly fetched
 */
const getFreshTurnstileToken = async (): Promise<{
  token: string;
  isCached: boolean;
}> => {
  const now = Date.now();

  // Check if we have a valid cached token in cookie
  if (typeof window !== "undefined") {
    const cookies = document.cookie.split(";");
    const tokenCookie = cookies.find((cookie) =>
      cookie.trim().startsWith(`${TOKEN_COOKIE_NAME}=`),
    );

    if (tokenCookie) {
      try {
        const cookieValue = tokenCookie.split("=")[1];
        const cookieData = JSON.parse(decodeURIComponent(cookieValue));
        const { token, timestamp } = cookieData;

        // Check if token is still valid (within 10 minutes)
        if (token && timestamp && now - timestamp < TOKEN_CACHE_DURATION) {
          return { token, isCached: true };
        }
      } catch (error) {
        // Invalid cookie format, continue to get new token
        console.warn("Invalid turnstile token cookie:", error);
      }
    }
  }

  // Get new token from Cloudflare
  try {
    const token = await getTurnstileToken("0x4AAAAAAB6ocCCpurfWRZyC");

    // Store token in cookie with expiration
    if (typeof window !== "undefined") {
      const expiresAt = new Date(now + TOKEN_CACHE_DURATION);
      const cookieData = {
        token,
        timestamp: now,
      };
      const cookieValue = encodeURIComponent(JSON.stringify(cookieData));

      document.cookie = `${TOKEN_COOKIE_NAME}=${cookieValue}; expires=${expiresAt.toUTCString()}; path=/; SameSite=Strict`;
    }

    return { token, isCached: false };
  } catch (error) {
    throw new Error(`Failed to get turnstile token: ${error}`);
  }
};

/**
 * Validate turnstile token with server and store for 10 minutes within api.
 */
const validateAndStoreToken = async (token: string): Promise<void> => {
  const response = await fetch(`${TRAKT_BASE_URL}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(`Token validation failed: ${response.statusText}`);
  }
};

// Map provider names to their Trakt endpoints
export const PROVIDER_TO_TRAKT_MAP = {
  "8": "netflixmovies", // Netflix Movies
  "8tv": "netflixtv", // Netflix TV Shows
  "2": "applemovie", // Apple TV+ Movies
  "2tv": "appletv", // Apple TV+ (both)
  "10": "primemovies", // Prime Video Movies
  "10tv": "primetv", // Prime Video TV Shows
  "15": "hulumovies", // Hulu Movies
  "15tv": "hulutv", // Hulu TV Shows
  "337": "disneymovies", // Disney+ Movies
  "337tv": "disneytv", // Disney+ TV Shows
  "1899": "hbomovies", // Max Movies
  "1899tv": "hbotv", // Max TV Shows
  "531": "paramountmovies", // Paramount+ Movies
  "531tv": "paramounttv", // Paramount+ TV Shows
} as const;

// Map provider names to their image filenames
export const PROVIDER_TO_IMAGE_MAP: Record<string, string> = {
  Max: "max",
  "Prime Video": "prime",
  Netflix: "netflix",
  "Disney+": "disney",
  Hulu: "hulu",
  "Apple TV+": "appletv",
  "Paramount+": "paramount",
};

// Cache for Trakt API responses
interface TraktCacheKey {
  endpoint: string;
}

const traktCache = new SimpleCache<TraktCacheKey, any>();
traktCache.setCompare((a, b) => a.endpoint === b.endpoint);
traktCache.initialize();

// Base function to fetch from Trakt API
async function fetchFromTrakt<T = TraktListResponse>(
  endpoint: string,
): Promise<T> {
  if (!conf().USE_TRAKT) {
    return null as T;
  }

  // Check cache first
  const cacheKey: TraktCacheKey = { endpoint };
  const cachedResult = traktCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult as T;
  }

  // Try up to 2 times: first with cached/fresh token, retry with forced fresh token if auth fails
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      // 1. Get turnstile token (cached or fresh)
      const { token: turnstileToken, isCached } =
        await getFreshTurnstileToken();

      // 2. Only validate with server if token wasn't cached (newly fetched)
      if (!isCached) {
        await validateAndStoreToken(turnstileToken);
      }

      // 3. Make the API request with validated token
      const response = await fetch(`${TRAKT_BASE_URL}${endpoint}`, {
        headers: {
          "x-turnstile-token": turnstileToken,
        },
      });

      if (!response.ok) {
        // If auth error on first attempt, clear cookie and retry with fresh token
        if (
          (response.status === 401 || response.status === 403) &&
          attempt === 0
        ) {
          // Clear the cookie to force fresh token on retry
          if (typeof window !== "undefined") {
            document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
          }
          continue; // Try again
        }
        throw new Error(
          `Failed to fetch from ${endpoint}: ${response.statusText}`,
        );
      }

      const result = await response.json();

      // Cache the result for 1 hour (3600 seconds)
      traktCache.set(cacheKey, result, 3600);

      return result as T;
    } catch (error) {
      // If this was the second attempt or not an auth error, throw
      if (
        attempt === 1 ||
        !(error instanceof Error && error.message.includes("401"))
      ) {
        throw error;
      }
      // Otherwise, continue to retry
    }
  }

  throw new Error(`Failed to fetch from ${endpoint} after retries`);
}

// Release details
export async function getReleaseDetails(
  id: string,
  season?: number,
  episode?: number,
): Promise<TraktReleaseResponse> {
  let url = `/release/${id}`;
  if (season !== undefined && episode !== undefined) {
    url += `/${season}/${episode}`;
  }

  if (!conf().USE_TRAKT) {
    return null as unknown as TraktReleaseResponse;
  }

  // Check cache first
  const cacheKey: TraktCacheKey = { endpoint: url };
  const cachedResult = traktCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult as TraktReleaseResponse;
  }

  // Try up to 2 times: first with cached/fresh token, retry with forced fresh token if auth fails
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      // 1. Get turnstile token (cached or fresh)
      const { token: turnstileToken, isCached } =
        await getFreshTurnstileToken();

      // 2. Only validate with server if token wasn't cached (newly fetched)
      if (!isCached) {
        await validateAndStoreToken(turnstileToken);
      }

      // 3. Make the API request with validated token
      const response = await fetch(`${TRAKT_BASE_URL}${url}`, {
        headers: {
          "x-turnstile-token": turnstileToken,
        },
      });

      if (!response.ok) {
        // If auth error on first attempt, clear cookie and retry with fresh token
        if (
          (response.status === 401 || response.status === 403) &&
          attempt === 0
        ) {
          // Clear the cookie to force fresh token on retry
          if (typeof window !== "undefined") {
            document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
          }
          continue; // Try again
        }
        throw new Error(
          `Failed to fetch release details: ${response.statusText}`,
        );
      }

      const result = await response.json();

      // Cache the result for 1 hour (3600 seconds)
      traktCache.set(cacheKey, result, 3600);

      return result as TraktReleaseResponse;
    } catch (error) {
      // If this was the second attempt or not an auth error, throw
      if (
        attempt === 1 ||
        !(error instanceof Error && error.message.includes("401"))
      ) {
        throw error;
      }
      // Otherwise, continue to retry
    }
  }

  throw new Error(`Failed to fetch release details after retries`);
}

// Latest releases
export const getLatestReleases = () => fetchFromTrakt("/latest");
export const getLatest4KReleases = () => fetchFromTrakt("/latest4k");
export const getLatestTVReleases = () => fetchFromTrakt("/latesttv");

// Streaming service releases
export const getAppleTVReleases = () => fetchFromTrakt("/appletv");
export const getAppleMovieReleases = () => fetchFromTrakt("/applemovie");
export const getNetflixMovies = () => fetchFromTrakt("/netflixmovies");
export const getNetflixTVShows = () => fetchFromTrakt("/netflixtv");
export const getPrimeMovies = () => fetchFromTrakt("/primemovies");
export const getPrimeTVShows = () => fetchFromTrakt("/primetv");
export const getHuluMovies = () => fetchFromTrakt("/hulumovies");
export const getHuluTVShows = () => fetchFromTrakt("/hulutv");
export const getDisneyMovies = () => fetchFromTrakt("/disneymovies");
export const getDisneyTVShows = () => fetchFromTrakt("/disneytv");
export const getHBOMovies = () => fetchFromTrakt("/hbomovies");
export const getHBOTVShows = () => fetchFromTrakt("/hbotv");
export const getParamountMovies = () => fetchFromTrakt("/paramountmovies");
export const getParamountTVShows = () => fetchFromTrakt("/paramounttv");

// Popular content
export const getPopularTVShows = () => fetchFromTrakt("/populartv");
export const getPopularMovies = () => fetchFromTrakt("/popularmovies");

// Discovery content used for the featured carousel
export const getDiscoverContent = () =>
  fetchFromTrakt<TraktListResponse>("/discover");

// Network information
export const getNetworkContent = (tmdbId: string) =>
  fetchFromTrakt<TraktNetworkResponse>(`/network/${tmdbId}`);

// Curated movie lists
export const getNarrativeMovies = () => fetchFromTrakt("/narrative");
export const getTopMovies = () => fetchFromTrakt("/top");
export const getNeverHeardMovies = () => fetchFromTrakt("/never");
export const getLGBTQContent = () => fetchFromTrakt("/LGBTQ");
export const getMindfuckMovies = () => fetchFromTrakt("/mindfuck");
export const getTrueStoryMovies = () => fetchFromTrakt("/truestory");
export const getChristmasMovies = () => fetchFromTrakt("/christmas");
export const getHalloweenMovies = () => fetchFromTrakt("/halloween");
// export const getGreatestTVShows = () => fetchFromTrakt("/greatesttv"); // We only have movies set up. TODO add more tv routes for curated lists so we can have a new page.

// Get all curated movie lists
export const getCuratedMovieLists = async (): Promise<CuratedMovieList[]> => {
  const listConfigs = [
    {
      name: "Top Rated Christmas Movies",
      slug: "christmas",
      endpoint: "/christmas",
    },
    {
      name: "Letterboxd Top 250 Narrative Feature Films",
      slug: "narrative",
      endpoint: "/narrative",
    },
    {
      name: "1001 Greatest Movies of All Time",
      slug: "top",
      endpoint: "/top",
    },
    {
      name: "Great Movies You May Have Never Heard Of",
      slug: "never",
      endpoint: "/never",
    },
    {
      name: "LGBT Movies/Shows",
      slug: "LGBTQ",
      endpoint: "/LGBTQ",
    },
    {
      name: "Best Mindfuck Movies",
      slug: "mindfuck",
      endpoint: "/mindfuck",
    },
    {
      name: "Based on a True Story Movies",
      slug: "truestory",
      endpoint: "/truestory",
    },
    {
      name: "Halloween Movies",
      slug: "halloween",
      endpoint: "/halloween",
    },
    // {
    //   name: "Rolling Stone's 100 Greatest TV Shows",
    //   slug: "greatesttv",
    //   endpoint: "/greatesttv",
    // },
  ];

  const lists: CuratedMovieList[] = [];

  for (const config of listConfigs) {
    try {
      const response = await fetchFromTrakt(config.endpoint);
      lists.push({
        listName: config.name,
        listSlug: config.slug,
        tmdbIds: response.movie_tmdb_ids.slice(0, 30), // Limit to first 30 items
        count: Math.min(response.movie_tmdb_ids.length, 30), // Update count to reflect the limit
      });
    } catch (error) {
      console.error(`Failed to fetch ${config.name}:`, error);
    }
  }

  return lists;
};

// Fetch movie details for multiple TMDB IDs
export const getMovieDetailsForIds = async (
  tmdbIds: number[],
  limit: number = 50,
): Promise<TMDBMovieData[]> => {
  const limitedIds = tmdbIds.slice(0, limit);
  const movieDetails: TMDBMovieData[] = [];

  // Process in smaller batches to avoid overwhelming the API
  const batchSize = 10;
  const batchPromises: Promise<TMDBMovieData[]>[] = [];

  for (let i = 0; i < limitedIds.length; i += batchSize) {
    const batch = limitedIds.slice(i, i + batchSize);
    const batchPromise = Promise.all(
      batch.map(async (id) => {
        try {
          const details = await getMediaDetails(
            id.toString(),
            TMDBContentTypes.MOVIE,
          );
          return details as TMDBMovieData;
        } catch (error) {
          console.error(`Failed to fetch movie details for ID ${id}:`, error);
          return null;
        }
      }),
    ).then((batchResults) =>
      batchResults.filter((result): result is TMDBMovieData => result !== null),
    );
    batchPromises.push(batchPromise);
  }

  // Process all batches in parallel
  const batchResults = await Promise.all(batchPromises);
  movieDetails.push(...batchResults.flat());

  return movieDetails;
};
