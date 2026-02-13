import { BookmarkMediaItem } from "@/stores/bookmarks";
import { ProgressMediaItem } from "@/stores/progress";
import { MediaItem } from "@/utils/mediaTypes";

export type SortOption =
  | "date"
  | "title-asc"
  | "title-desc"
  | "year-asc"
  | "year-desc";

export function sortMediaItems(
  items: MediaItem[],
  sortBy: SortOption,
  bookmarks?: Record<string, BookmarkMediaItem>,
  progressItems?: Record<string, ProgressMediaItem>,
): MediaItem[] {
  const sorted = [...items];

  switch (sortBy) {
    case "date": {
      sorted.sort((a, b) => {
        const bookmarkA = bookmarks?.[a.id];
        const bookmarkB = bookmarks?.[b.id];
        const progressA = progressItems?.[a.id];
        const progressB = progressItems?.[b.id];

        const dateA = Math.max(
          bookmarkA?.updatedAt ?? 0,
          progressA?.updatedAt ?? 0,
        );
        const dateB = Math.max(
          bookmarkB?.updatedAt ?? 0,
          progressB?.updatedAt ?? 0,
        );

        return dateB - dateA; // Newest first
      });
      break;
    }

    case "title-asc": {
      sorted.sort((a, b) => {
        const titleA = a.title?.toLowerCase() ?? "";
        const titleB = b.title?.toLowerCase() ?? "";
        return titleA.localeCompare(titleB);
      });
      break;
    }

    case "title-desc": {
      sorted.sort((a, b) => {
        const titleA = a.title?.toLowerCase() ?? "";
        const titleB = b.title?.toLowerCase() ?? "";
        return titleB.localeCompare(titleA);
      });
      break;
    }

    case "year-asc": {
      sorted.sort((a, b) => {
        const yearA = a.year ?? Number.MAX_SAFE_INTEGER;
        const yearB = b.year ?? Number.MAX_SAFE_INTEGER;
        if (yearA === yearB) {
          // Secondary sort by title for same year
          const titleA = a.title?.toLowerCase() ?? "";
          const titleB = b.title?.toLowerCase() ?? "";
          return titleA.localeCompare(titleB);
        }
        return yearA - yearB;
      });
      break;
    }

    case "year-desc": {
      sorted.sort((a, b) => {
        const yearA = a.year ?? 0; // Put undefined years at the end
        const yearB = b.year ?? 0;
        if (yearA === yearB) {
          // Secondary sort by title for same year
          const titleA = a.title?.toLowerCase() ?? "";
          const titleB = b.title?.toLowerCase() ?? "";
          return titleA.localeCompare(titleB);
        }
        return yearB - yearA;
      });
      break;
    }

    default: {
      // Fallback to date sorting for unknown sort options
      sorted.sort((a, b) => {
        const bookmarkA = bookmarks?.[a.id];
        const bookmarkB = bookmarks?.[b.id];
        const progressA = progressItems?.[a.id];
        const progressB = progressItems?.[b.id];

        const dateA = Math.max(
          bookmarkA?.updatedAt ?? 0,
          progressA?.updatedAt ?? 0,
        );
        const dateB = Math.max(
          bookmarkB?.updatedAt ?? 0,
          progressB?.updatedAt ?? 0,
        );

        return dateB - dateA; // Newest first
      });
      break;
    }
  }

  return sorted;
}
