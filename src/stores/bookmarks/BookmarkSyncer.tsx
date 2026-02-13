import { useEffect } from "react";

import { addBookmark, removeBookmark } from "@/backend/accounts/bookmarks";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { AccountWithToken, useAuthStore } from "@/stores/auth";
import { BookmarkUpdateItem, useBookmarkStore } from "@/stores/bookmarks";

const syncIntervalMs = 5 * 1000;

async function syncBookmarks(
  items: BookmarkUpdateItem[],
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
        await removeBookmark(url, account, item.tmdbId);
        continue;
      }

      if (item.action === "add") {
        await addBookmark(url, account, {
          meta: {
            poster: item.poster,
            title: item.title ?? "",
            type: item.type ?? "",
            year: item.year ?? NaN,
          },
          tmdbId: item.tmdbId,
          group: item.group,
          favoriteEpisodes: item.favoriteEpisodes,
        });
        continue;
      }
    } catch (err) {
      console.error(
        `Failed to sync bookmark: ${item.tmdbId} - ${item.action}`,
        err,
      );
    }
  }
}

export function BookmarkSyncer() {
  const clearUpdateQueue = useBookmarkStore((s) => s.clearUpdateQueue);
  const removeUpdateItem = useBookmarkStore((s) => s.removeUpdateItem);
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
        const state = useBookmarkStore.getState();
        const user = useAuthStore.getState();
        await syncBookmarks(
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
      const state = useBookmarkStore.getState();
      const user = useAuthStore.getState();
      // Only sync if there are items in the queue
      if (state.updateQueue.length > 0) {
        await syncBookmarks(
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

    // Override the addBookmark function to trigger immediate sync
    const originalAddBookmark = useBookmarkStore.getState().addBookmark;
    useBookmarkStore.setState({
      addBookmark: (...args) => {
        originalAddBookmark(...args);
        // Trigger debounced sync after adding bookmark
        debouncedSync();
      },
    });

    // Override removeBookmark to trigger immediate sync
    const originalRemoveBookmark = useBookmarkStore.getState().removeBookmark;
    useBookmarkStore.setState({
      removeBookmark: (...args) => {
        originalRemoveBookmark(...args);
        // Trigger debounced sync after removing bookmark
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
