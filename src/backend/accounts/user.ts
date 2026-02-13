import { ofetch } from "ofetch";

import { SessionResponse, getAuthHeaders } from "@/backend/accounts/auth";
import { AccountWithToken } from "@/stores/auth";
import { BookmarkMediaItem } from "@/stores/bookmarks";
import { ProgressMediaItem } from "@/stores/progress";
import { WatchHistoryItem } from "@/stores/watchHistory";

export interface UserResponse {
  id: string;
  namespace: string;
  nickname: string;
  permissions: string[];
  profile: {
    colorA: string;
    colorB: string;
    icon: string;
  };
}

export interface UserEdit {
  profile?: {
    colorA: string;
    colorB: string;
    icon: string;
  };
  nickname?: string;
}

export interface BookmarkResponse {
  tmdbId: string;
  meta: {
    title: string;
    year: number;
    poster?: string;
    type: "show" | "movie";
  };
  group: string[];
  favoriteEpisodes?: string[];
  updatedAt: string;
}

export interface ProgressResponse {
  tmdbId: string;
  season: {
    id?: string;
    number?: number;
  };
  episode: {
    id?: string;
    number?: number;
  };
  meta: {
    title: string;
    year: number;
    poster?: string;
    type: "show" | "movie";
  };
  duration: string;
  watched: string;
  updatedAt: string;
}

export interface WatchHistoryResponse {
  tmdbId: string;
  season: {
    id?: string;
    number?: number;
  };
  episode: {
    id?: string;
    number?: number;
  };
  meta: {
    title: string;
    year: number;
    poster?: string;
    type: "show" | "movie";
  };
  duration: string;
  watched: string;
  watchedAt: string;
  completed: boolean;
}

export function bookmarkResponsesToEntries(responses: BookmarkResponse[]) {
  const entries = responses.map((bookmark) => {
    const item: BookmarkMediaItem = {
      ...bookmark.meta,
      group: bookmark.group?.length > 0 ? bookmark.group : undefined,
      favoriteEpisodes: bookmark.favoriteEpisodes,
      updatedAt: new Date(bookmark.updatedAt).getTime(),
    };
    return [bookmark.tmdbId, item] as const;
  });

  return Object.fromEntries(entries);
}

export function progressResponsesToEntries(responses: ProgressResponse[]) {
  const items: Record<string, ProgressMediaItem> = {};

  responses.forEach((v) => {
    if (!items[v.tmdbId]) {
      items[v.tmdbId] = {
        title: v.meta.title,
        poster: v.meta.poster,
        type: v.meta.type,
        updatedAt: new Date(v.updatedAt).getTime(),
        episodes: {},
        seasons: {},
        year: v.meta.year,
      };
    }

    const item = items[v.tmdbId];

    // Since each watched episode is a single array entry but with the same tmdbId, the root item updatedAt will only have the first episode's timestamp (which is not the newest).
    // Here, we are setting it explicitly so the updatedAt always has the highest updatedAt from the episodes.
    if (new Date(v.updatedAt).getTime() > item.updatedAt) {
      item.updatedAt = new Date(v.updatedAt).getTime();
    }

    if (item.type === "movie") {
      item.progress = {
        duration: Number(v.duration),
        watched: Number(v.watched),
      };
    }

    if (item.type === "show" && v.season.id && v.episode.id) {
      item.seasons[v.season.id] = {
        id: v.season.id,
        number: v.season.number ?? 0,
        title: "",
      };
      item.episodes[v.episode.id] = {
        id: v.episode.id,
        number: v.episode.number ?? 0,
        title: "",
        progress: {
          duration: Number(v.duration),
          watched: Number(v.watched),
        },
        seasonId: v.season.id,
        updatedAt: new Date(v.updatedAt).getTime(),
      };
    }
  });

  return items;
}

export function watchHistoryResponsesToEntries(
  responses: WatchHistoryResponse[],
) {
  const items: Record<string, WatchHistoryItem> = {};

  responses.forEach((v) => {
    const key = v.episode?.id ? `${v.tmdbId}-${v.episode.id}` : v.tmdbId;

    items[key] = {
      type: v.meta.type,
      title: v.meta.title,
      poster: v.meta.poster,
      year: v.meta.year,
      progress: {
        duration: Number(v.duration),
        watched: Number(v.watched),
      },
      watchedAt: new Date(v.watchedAt).getTime(),
      completed: v.completed,
      episodeId: v.episode?.id,
      seasonId: v.season?.id,
      seasonNumber: v.season?.number,
      episodeNumber: v.episode?.number,
    };
  });

  return items;
}

export async function getUser(
  url: string,
  token: string,
): Promise<{ user: UserResponse; session: SessionResponse }> {
  return ofetch<{ user: UserResponse; session: SessionResponse }>(
    "/users/@me",
    {
      headers: getAuthHeaders(token),
      baseURL: url,
    },
  );
}

export async function editUser(
  url: string,
  account: AccountWithToken,
  object: UserEdit,
): Promise<{ user: UserResponse; session: SessionResponse }> {
  return ofetch<{ user: UserResponse; session: SessionResponse }>(
    `/users/${account.userId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(account.token),
      body: object,
      baseURL: url,
    },
  );
}

export async function deleteUser(
  url: string,
  account: AccountWithToken,
): Promise<UserResponse> {
  return ofetch<UserResponse>(`/users/${account.userId}`, {
    method: "DELETE",
    headers: getAuthHeaders(account.token),
    baseURL: url,
  });
}

export async function getBookmarks(url: string, account: AccountWithToken) {
  return ofetch<BookmarkResponse[]>(`/users/${account.userId}/bookmarks`, {
    headers: getAuthHeaders(account.token),
    baseURL: url,
  });
}

export async function getProgress(url: string, account: AccountWithToken) {
  return ofetch<ProgressResponse[]>(`/users/${account.userId}/progress`, {
    headers: getAuthHeaders(account.token),
    baseURL: url,
  });
}

export async function getWatchHistory(url: string, account: AccountWithToken) {
  return ofetch<WatchHistoryResponse[]>(
    `/users/${account.userId}/watch-history`,
    {
      headers: getAuthHeaders(account.token),
      baseURL: url,
    },
  );
}
