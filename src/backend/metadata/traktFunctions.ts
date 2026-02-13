import type { PaginatedTraktResponse, TraktListResponse } from "./types/trakt";

// Pagination utility
export function paginateResults(
  results: TraktListResponse,
  page: number,
  pageSize: number = 20,
  contentType: "movie" | "tv" | "both" = "both",
): PaginatedTraktResponse {
  if (!results) {
    return {
      tmdb_ids: [],
      hasMore: false,
      totalCount: 0,
    };
  }

  let tmdbIds: number[];

  if (contentType === "movie") {
    tmdbIds = results.movie_tmdb_ids || [];
  } else if (contentType === "tv") {
    tmdbIds = results.tv_tmdb_ids || [];
  } else {
    // For 'both', combine movies and TV shows
    tmdbIds = [
      ...(results.movie_tmdb_ids || []),
      ...(results.tv_tmdb_ids || []),
    ];
  }

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedIds = tmdbIds.slice(startIndex, endIndex);

  return {
    tmdb_ids: paginatedIds,
    hasMore: endIndex < tmdbIds.length,
    totalCount: tmdbIds.length,
  };
}
