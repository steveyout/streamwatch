import { useEffect } from "react";

import {
  progressUpdateItemToInput,
  removeProgress,
  setProgress,
} from "@/backend/accounts/progress";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { AccountWithToken, useAuthStore } from "@/stores/auth";
import { ProgressUpdateItem, useProgressStore } from "@/stores/progress";

const syncIntervalMs = 20 * 1000; // 20 second intervals

async function syncProgress(
  items: ProgressUpdateItem[],
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
        await removeProgress(
          url,
          account,
          item.tmdbId,
          item.seasonId,
          item.episodeId,
        );
        continue;
      }

      if (item.action === "upsert") {
        await setProgress(url, account, progressUpdateItemToInput(item));
        continue;
      }
    } catch (err) {
      console.error(
        `Failed to sync progress: ${item.tmdbId} - ${item.action}`,
        err,
      );
    }
  }
}

export function ProgressSyncer() {
  const clearUpdateQueue = useProgressStore((s) => s.clearUpdateQueue);
  const removeUpdateItem = useProgressStore((s) => s.removeUpdateItem);
  const url = useBackendUrl();

  // when booting for the first time, clear update queue.
  // we dont want to process persisted update items
  useEffect(() => {
    clearUpdateQueue();
  }, [clearUpdateQueue]);

  // Regular interval sync
  useEffect(() => {
    const interval = setInterval(() => {
      (async () => {
        if (!url) return;
        const state = useProgressStore.getState();
        const user = useAuthStore.getState();
        await syncProgress(
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

  // Immediate sync when items are added or removed
  useEffect(() => {
    let syncTimeout: NodeJS.Timeout | null = null;

    const syncImmediately = async () => {
      if (!url) return;
      const state = useProgressStore.getState();
      const user = useAuthStore.getState();
      // Only sync if there are items in the queue
      if (state.updateQueue.length > 0) {
        await syncProgress(
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

    // Override the updateItem function to trigger immediate sync
    const originalUpdateItem = useProgressStore.getState().updateItem;
    useProgressStore.setState({
      updateItem: (...args) => {
        originalUpdateItem(...args);
        // Trigger debounced sync after updating item
        debouncedSync();
      },
    });

    // Override removeItem to trigger immediate sync
    const originalRemoveItem = useProgressStore.getState().removeItem;
    useProgressStore.setState({
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

  return null;
}
