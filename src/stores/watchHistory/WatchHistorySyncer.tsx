import { useEffect } from "react";

import {
  removeWatchHistory,
  setWatchHistory,
  watchHistoryUpdateItemToInput,
} from "@/backend/accounts/watchHistory";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { AccountWithToken, useAuthStore } from "@/stores/auth";
import {
  WatchHistoryUpdateItem,
  useWatchHistoryStore,
} from "@/stores/watchHistory";

const syncIntervalMs = 1 * 60 * 1000; // 1 minute intervals

async function syncWatchHistory(
  items: WatchHistoryUpdateItem[],
  finish: (id: string) => void,
  url: string,
  account: AccountWithToken | null,
) {
  for (const item of items) {
    // complete it beforehand so it doesn't get handled while in progress
    finish(item.id);

    if (!account) continue; // not logged in, dont sync to server

    try {
      if (item.action === "delete") {
        await removeWatchHistory(
          url,
          account,
          item.tmdbId,
          item.episodeId,
          item.seasonId,
        );
        continue;
      }

      if (item.action === "add" || item.action === "update") {
        await setWatchHistory(
          url,
          account,
          watchHistoryUpdateItemToInput(item),
        );
        continue;
      }
    } catch (err) {
      console.error(
        `Failed to sync watch history: ${item.tmdbId} - ${item.action}`,
        err,
      );
    }
  }
}

export function WatchHistorySyncer() {
  const clearUpdateQueue = useWatchHistoryStore((s) => s.clearUpdateQueue);
  const removeUpdateItem = useWatchHistoryStore((s) => s.removeUpdateItem);
  const url = useBackendUrl();

  // when booting for the first time, clear update queue.
  // we dont want to process persisted update items
  useEffect(() => {
    clearUpdateQueue();
  }, [clearUpdateQueue]);

  // Immediate sync when items are added or removed
  useEffect(() => {
    let syncTimeout: NodeJS.Timeout | null = null;

    const syncImmediately = async () => {
      if (!url) return;
      const state = useWatchHistoryStore.getState();
      const user = useAuthStore.getState();
      // Only sync if there are items in the queue
      if (state.updateQueue.length > 0) {
        await syncWatchHistory(
          state.updateQueue,
          removeUpdateItem,
          url,
          user.account,
        );
      }
    };

    const debouncedSync = () => {
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
      syncTimeout = setTimeout(syncImmediately, 100);
    };

    // Override the addItem function to trigger immediate sync
    const originalAddItem = useWatchHistoryStore.getState().addItem;
    useWatchHistoryStore.setState({
      addItem: (...args) => {
        originalAddItem(...args);
        // Trigger debounced sync after adding item
        debouncedSync();
      },
    });

    // Override removeItem to trigger immediate sync
    const originalRemoveItem = useWatchHistoryStore.getState().removeItem;
    useWatchHistoryStore.setState({
      removeItem: (...args) => {
        originalRemoveItem(...args);
        // Trigger debounced sync after removing item
        debouncedSync();
      },
    });

    return () => {
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
    };
  }, [removeUpdateItem, url]);

  // Regular interval sync
  useEffect(() => {
    const interval = setInterval(() => {
      (async () => {
        if (!url) return;
        const state = useWatchHistoryStore.getState();
        const user = useAuthStore.getState();
        await syncWatchHistory(
          state.updateQueue,
          removeUpdateItem,
          url,
          user.account,
        );
      })();
    }, syncIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [removeUpdateItem, url]);

  return null;
}
