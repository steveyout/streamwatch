import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { PlayerMeta } from "@/stores/player/slices/source";

export interface WatchHistoryItem {
  title: string;
  year?: number;
  poster?: string;
  type: "show" | "movie";
  progress: {
    watched: number;
    duration: number;
  };
  watchedAt: number; // timestamp when last watched
  completed: boolean; // whether the item was completed
  episodeId?: string;
  seasonId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface WatchHistoryUpdateItem {
  title?: string;
  year?: number;
  poster?: string;
  type?: "show" | "movie";
  progress?: {
    watched: number;
    duration: number;
  };
  watchedAt?: number;
  completed?: boolean;
  tmdbId: string;
  id: string;
  episodeId?: string;
  seasonId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  action: "add" | "update" | "delete";
}

export interface WatchHistoryStore {
  items: Record<string, WatchHistoryItem>;
  updateQueue: WatchHistoryUpdateItem[];
  addItem(
    meta: PlayerMeta,
    progress: { watched: number; duration: number },
    completed: boolean,
  ): void;
  updateItem(
    id: string,
    progress: { watched: number; duration: number },
    completed: boolean,
  ): void;
  removeItem(id: string): void;
  replaceItems(items: Record<string, WatchHistoryItem>): void;
  clear(): void;
  clearUpdateQueue(): void;
  removeUpdateItem(id: string): void;
}

let updateId = 0;

export const useWatchHistoryStore = create(
  persist(
    immer<WatchHistoryStore>((set) => ({
      items: {},
      updateQueue: [],
      addItem(meta, progress, completed) {
        set((s) => {
          const key = meta.episode
            ? `${meta.tmdbId}-${meta.episode.tmdbId}`
            : meta.tmdbId;

          // Only add/update if this is a completion or if the item doesn't exist yet
          const existingItem = s.items[key];
          const shouldUpdate =
            !existingItem || (completed && !existingItem.completed);

          if (!shouldUpdate) return;

          // add to updateQueue
          updateId += 1;
          s.updateQueue.push({
            tmdbId: meta.tmdbId,
            title: meta.title,
            year: meta.releaseYear,
            poster: meta.poster,
            type: meta.type,
            progress: { ...progress },
            watchedAt: Date.now(),
            completed,
            id: updateId.toString(),
            episodeId: meta.episode?.tmdbId,
            seasonId: meta.season?.tmdbId,
            seasonNumber: meta.season?.number,
            episodeNumber: meta.episode?.number,
            action: "add",
          });

          // add to watch history store
          s.items[key] = {
            type: meta.type,
            title: meta.title,
            year: meta.releaseYear,
            poster: meta.poster,
            progress: { ...progress },
            watchedAt: Date.now(),
            completed,
            episodeId: meta.episode?.tmdbId,
            seasonId: meta.season?.tmdbId,
            seasonNumber: meta.season?.number,
            episodeNumber: meta.episode?.number,
          };
        });
      },
      updateItem(id, progress, completed) {
        set((s) => {
          const existingItem = s.items[id];
          if (!existingItem) return;

          // Only update if this is becoming completed and wasn't completed before
          const shouldUpdate = completed && !existingItem.completed;

          if (!shouldUpdate) return;

          // add to updateQueue
          updateId += 1;
          s.updateQueue.push({
            tmdbId: existingItem.episodeId
              ? existingItem.seasonId || id.split("-")[0]
              : id,
            title: existingItem.title,
            year: existingItem.year,
            poster: existingItem.poster,
            type: existingItem.type,
            progress: { ...progress },
            watchedAt: Date.now(),
            completed,
            id: updateId.toString(),
            episodeId: existingItem.episodeId,
            seasonId: existingItem.seasonId,
            seasonNumber: existingItem.seasonNumber,
            episodeNumber: existingItem.episodeNumber,
            action: "update",
          });

          // update item
          existingItem.progress = { ...progress };
          existingItem.watchedAt = Date.now();
          existingItem.completed = completed;
        });
      },
      removeItem(id) {
        set((s) => {
          updateId += 1;

          // Parse the key to extract TMDB ID and episode ID for episodes
          const isEpisode = id.includes("-");
          const tmdbId = isEpisode ? id.split("-")[0] : id;
          const episodeId = isEpisode ? id.split("-")[1] : undefined;

          s.updateQueue.push({
            id: updateId.toString(),
            action: "delete",
            tmdbId,
            episodeId,
            // For movies, seasonId will be undefined, for episodes it might need to be derived from the item
            seasonId: s.items[id]?.seasonId,
            seasonNumber: s.items[id]?.seasonNumber,
            episodeNumber: s.items[id]?.episodeNumber,
          });

          delete s.items[id];
        });
      },
      replaceItems(items: Record<string, WatchHistoryItem>) {
        set((s) => {
          s.items = items;
        });
      },
      clear() {
        set((s) => {
          s.items = {};
        });
      },
      clearUpdateQueue() {
        set((s) => {
          s.updateQueue = [];
        });
      },
      removeUpdateItem(id: string) {
        set((s) => {
          s.updateQueue = [...s.updateQueue.filter((v) => v.id !== id)];
        });
      },
    })),
    {
      name: "__MW::watchHistory",
    },
  ),
);
