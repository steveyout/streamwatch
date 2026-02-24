import { getMediaDetails, getRelatedMedia } from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import type {
  TMDBMovieData,
  TMDBMovieSearchResult,
  TMDBShowData,
  TMDBShowSearchResult,
} from "@/backend/metadata/types/tmdb";
import type { DiscoverMedia } from "@/pages/discover/types/discover";

// Tuning constants for the recommendation algorithm
export const MAX_HISTORY_FOR_RELATED = 5;
export const MAX_CURRENT_FOR_RELATED = 2;
export const MAX_BOOKMARK_FOR_RELATED = 1;
export const MAX_BOOKMARK_REMINDERS = 2;
export const RELATED_PER_ITEM_LIMIT = 10;

export interface HistorySource {
  tmdbId: string;
  type: "movie" | "show";
  watchedAt: number;
}

export interface ProgressSource {
  tmdbId: string;
  type: "movie" | "show";
}

export interface BookmarkSource {
  tmdbId: string;
  type: "movie" | "show";
  title: string;
  year?: number;
  poster?: string;
}

function toDiscoverMedia(
  item: TMDBMovieSearchResult | TMDBShowSearchResult,
  isTVShow: boolean,
): DiscoverMedia {
  const isMovie = !isTVShow;
  return {
    id: item.id,
    title: isMovie
      ? (item as TMDBMovieSearchResult).title
      : (item as TMDBShowSearchResult).name,
    name: isTVShow ? (item as TMDBShowSearchResult).name : undefined,
    poster_path: item.poster_path ?? "",
    backdrop_path: item.backdrop_path ?? "",
    overview: item.overview ?? "",
    vote_average: item.vote_average ?? 0,
    vote_count: item.vote_count ?? 0,
    type: isTVShow ? "show" : "movie",
    release_date: isMovie
      ? (item as TMDBMovieSearchResult).release_date
      : undefined,
    first_air_date: isTVShow
      ? (item as TMDBShowSearchResult).first_air_date
      : undefined,
  };
}

function bookmarkToDiscoverMedia(b: BookmarkSource): DiscoverMedia {
  return {
    id: Number(b.tmdbId),
    title: b.title,
    poster_path: b.poster ?? "",
    backdrop_path: "",
    overview: "",
    vote_average: 0,
    vote_count: 0,
    type: b.type,
    release_date: b.year ? `${b.year}-01-01` : undefined,
    first_air_date: b.year ? `${b.year}-01-01` : undefined,
  };
}

/**
 * Fetches similar items from the fed-similar API
 */
export async function fetchFedSimilarItems(
  tmdbId: string,
  isTVShow: boolean,
): Promise<string[]> {
  try {
    const endpoint = isTVShow
      ? `https://fed-similar.up.railway.app/tv/${tmdbId}`
      : `https://fed-similar.up.railway.app/movie/${tmdbId}`;
    const response = await fetch(endpoint);
    if (!response.ok) return [];
    const items = await response.json();
    return Array.isArray(items) ? items : [];
  } catch (error) {
    return [];
  }
}

/**
 * Fetches personal recommendations by:
 * 1. Getting related media from fed-similar API and TMDB for history, progress, and bookmark items
 * 2. Merging and deduping, excluding items already in history/progress/bookmarks
 * 3. Adding up to MAX_BOOKMARK_REMINDERS bookmarked items as "reminders"
 */
export async function fetchPersonalRecommendations(
  isTVShow: boolean,
  history: HistorySource[],
  progress: ProgressSource[],
  bookmarks: BookmarkSource[],
  excludeIds: Set<string>,
): Promise<DiscoverMedia[]> {
  const type = isTVShow ? TMDBContentTypes.TV : TMDBContentTypes.MOVIE;

  const historyFiltered = history
    .filter((h) => h.type === (isTVShow ? "show" : "movie"))
    .sort((a, b) => b.watchedAt - a.watchedAt)
    .slice(0, MAX_HISTORY_FOR_RELATED);

  const progressFiltered = progress
    .filter((p) => p.type === (isTVShow ? "show" : "movie"))
    .slice(0, MAX_CURRENT_FOR_RELATED);

  const bookmarksFiltered = bookmarks.filter(
    (b) => b.type === (isTVShow ? "show" : "movie"),
  );

  const sourceIds: string[] = [];
  const seenSources = new Set<string>();

  for (const h of historyFiltered) {
    if (!seenSources.has(h.tmdbId)) {
      seenSources.add(h.tmdbId);
      sourceIds.push(h.tmdbId);
    }
  }
  for (const p of progressFiltered) {
    if (!seenSources.has(p.tmdbId)) {
      seenSources.add(p.tmdbId);
      sourceIds.push(p.tmdbId);
    }
  }
  for (const b of bookmarksFiltered.slice(0, MAX_BOOKMARK_FOR_RELATED)) {
    if (!seenSources.has(b.tmdbId)) {
      seenSources.add(b.tmdbId);
      sourceIds.push(b.tmdbId);
    }
  }

  // Fetch from both fed-similar API and TMDB
  const fedSimilarPromises = sourceIds.map((id) =>
    fetchFedSimilarItems(id, isTVShow),
  );

  const tmdbPromises = sourceIds.map((id) =>
    getRelatedMedia(id, type, RELATED_PER_ITEM_LIMIT),
  );

  const [fedSimilarResults, tmdbResults] = await Promise.allSettled([
    Promise.all(fedSimilarPromises),
    Promise.all(tmdbPromises),
  ]);

  const merged: DiscoverMedia[] = [];
  const seenIds = new Set<number>([]);
  const seenFedSimilarIds = new Set<string>();

  // Process fed-similar results first (higher priority)
  if (fedSimilarResults.status === "fulfilled") {
    for (const fedSimilarItems of fedSimilarResults.value) {
      for (const tmdbId of fedSimilarItems) {
        if (excludeIds.has(tmdbId) || seenFedSimilarIds.has(tmdbId)) {
          continue;
        }
        seenFedSimilarIds.add(tmdbId);
      }
    }

    // Fetch full details for fed-similar items
    const fedSimilarDetailPromises = Array.from(seenFedSimilarIds)
      .slice(0, 20)
      .map((tmdbId) => getMediaDetails(tmdbId, type));

    const fedSimilarDetails = await Promise.allSettled(
      fedSimilarDetailPromises,
    );

    for (const result of fedSimilarDetails) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const item = result.value as TMDBMovieData | TMDBShowData;
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);

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

      merged.push(toDiscoverMedia(searchItem, isTVShow));
    }
  }

  // Process TMDB results (lower priority)
  if (tmdbResults.status === "fulfilled") {
    for (const result of tmdbResults.value) {
      for (const item of result) {
        const idStr = String(item.id);
        if (excludeIds.has(idStr) || seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        merged.push(toDiscoverMedia(item, isTVShow));
      }
    }
  }

  const reminders: DiscoverMedia[] = [];
  for (const b of bookmarksFiltered) {
    if (excludeIds.has(b.tmdbId) || seenIds.has(Number(b.tmdbId))) continue;
    if (reminders.length >= MAX_BOOKMARK_REMINDERS) break;
    seenIds.add(Number(b.tmdbId));
    reminders.push(bookmarkToDiscoverMedia(b));
  }

  return [...reminders, ...merged];
}
