export interface TraktListResponse {
  movie_tmdb_ids: number[];
  tv_tmdb_ids: number[];
  count: number;
}

export interface TraktReleaseResponse {
  tmdb_id: number;
  title: string;
  year?: number;
  type: "movie" | "episode";
  season?: number;
  episode?: number;
  quality?: string;
  source?: string;
  group?: string;
  theatrical_release_date?: string;
  digital_release_date?: string;
}

export interface PaginatedTraktResponse {
  tmdb_ids: number[];
  hasMore: boolean;
  totalCount: number;
}

export type TraktContentType = "movie" | "episode";

export interface TraktNetworkResponse {
  type: string;
  platforms: string[];
  count: number;
}

export interface CuratedMovieList {
  listName: string;
  listSlug: string;
  tmdbIds: number[];
  count: number;
}
