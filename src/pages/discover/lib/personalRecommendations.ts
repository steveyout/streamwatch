import { getRelatedMedia } from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import type {
  TMDBMovieSearchResult,
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
 * Fetches personal recommendations by:
 * 1. Getting related media for up to MAX_HISTORY_FOR_RELATED history items, MAX_CURRENT_FOR_RELATED progress items, and MAX_BOOKMARK_FOR_RELATED bookmark
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

  const relatedPromises = sourceIds.map((id) =>
    getRelatedMedia(id, type, RELATED_PER_ITEM_LIMIT),
  );

  const relatedResults = await Promise.allSettled(relatedPromises);
  const merged: DiscoverMedia[] = [];
  const seenIds = new Set<number>([]);

  for (const result of relatedResults) {
    if (result.status !== "fulfilled" || !result.value) continue;
    for (const item of result.value) {
      const idStr = String(item.id);
      if (excludeIds.has(idStr) || seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      merged.push(toDiscoverMedia(item, isTVShow));
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
