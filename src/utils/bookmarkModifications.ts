import { BookmarkMediaItem } from "@/stores/bookmarks";

/**
 * Options for modifying bookmark properties
 */
export interface BookmarkModificationOptions {
  /** Update the title of the bookmark */
  title?: string;
  /** Update the year of the bookmark */
  year?: number;
  /** Update the poster URL of the bookmark */
  poster?: string;
  /** Update the groups array (replaces existing groups) */
  groups?: string[];
  /** Add groups to existing groups (doesn't remove existing ones) */
  addGroups?: string[];
  /** Remove specific groups from the bookmark */
  removeGroups?: string[];
  /** Update favorite episodes */
  favoriteEpisodes?: string[];
}

/**
 * Result of a bookmark modification operation
 */
export interface BookmarkModificationResult {
  /** IDs of bookmarks that were modified */
  modifiedIds: string[];
  /** Whether any bookmarks were actually changed */
  hasChanges: boolean;
}

/**
 * Modifies a single bookmark item with the provided options
 */
export function modifyBookmark(
  bookmark: BookmarkMediaItem,
  options: BookmarkModificationOptions,
): BookmarkMediaItem {
  const modified = { ...bookmark, updatedAt: Date.now() };

  if (options.title !== undefined) {
    modified.title = options.title;
  }

  if (options.year !== undefined) {
    modified.year = options.year;
  }

  if (options.poster !== undefined) {
    modified.poster = options.poster;
  }

  if (options.groups !== undefined) {
    modified.group = options.groups;
  }

  if (options.addGroups && options.addGroups.length > 0) {
    const currentGroups = modified.group || [];
    const newGroups = [...currentGroups];
    options.addGroups.forEach((group) => {
      if (!newGroups.includes(group)) {
        newGroups.push(group);
      }
    });
    modified.group = newGroups;
  }

  if (options.removeGroups && options.removeGroups.length > 0) {
    const currentGroups = modified.group || [];
    modified.group = currentGroups.filter(
      (group) => !options.removeGroups!.includes(group),
    );
  }

  if (options.favoriteEpisodes !== undefined) {
    modified.favoriteEpisodes = options.favoriteEpisodes;
  }

  return modified;
}

/**
 * Modifies multiple bookmarks by their IDs
 */
export function modifyBookmarks(
  bookmarks: Record<string, BookmarkMediaItem>,
  bookmarkIds: string[],
  options: BookmarkModificationOptions,
): {
  modifiedBookmarks: Record<string, BookmarkMediaItem>;
  result: BookmarkModificationResult;
} {
  const modifiedBookmarks = { ...bookmarks };
  const modifiedIds: string[] = [];
  let hasChanges = false;

  bookmarkIds.forEach((id) => {
    const original = modifiedBookmarks[id];
    if (original) {
      const modified = modifyBookmark(original, options);
      modifiedBookmarks[id] = modified;
      modifiedIds.push(id);

      // Check if anything actually changed
      if (!hasChanges) {
        hasChanges = Object.keys(options).some((key) => {
          const optionKey = key as keyof BookmarkModificationOptions;
          if (optionKey === "addGroups" || optionKey === "removeGroups")
            return true;

          const optionValue = options[optionKey];
          const currentValue = modified[optionKey as keyof BookmarkMediaItem];

          if (Array.isArray(optionValue) && Array.isArray(currentValue)) {
            return (
              optionValue.length !== currentValue.length ||
              !optionValue.every((val) => currentValue.includes(val))
            );
          }

          return optionValue !== currentValue;
        });
      }
    }
  });

  return {
    modifiedBookmarks,
    result: { modifiedIds, hasChanges: hasChanges && modifiedIds.length > 0 },
  };
}

/**
 * Options for bulk group modifications
 */
export interface BulkGroupModificationOptions {
  /** The old group name to replace */
  oldGroupName: string;
  /** The new group name */
  newGroupName: string;
  /** Whether to only modify bookmarks that have this as their only group */
  onlyIfExclusive?: boolean;
}

/**
 * Modifies all bookmarks that contain a specific group name
 */
export function modifyBookmarksByGroup(
  bookmarks: Record<string, BookmarkMediaItem>,
  options: BulkGroupModificationOptions,
): {
  modifiedBookmarks: Record<string, BookmarkMediaItem>;
  result: BookmarkModificationResult;
} {
  const modifiedBookmarks = { ...bookmarks };
  const modifiedIds: string[] = [];

  Object.entries(bookmarks).forEach(([id, bookmark]) => {
    if (bookmark.group && bookmark.group.includes(options.oldGroupName)) {
      // Check if we should only modify exclusive groups
      if (options.onlyIfExclusive && bookmark.group.length > 1) {
        return;
      }

      const newGroups = bookmark.group.map((group) =>
        group === options.oldGroupName ? options.newGroupName : group,
      );

      modifiedBookmarks[id] = {
        ...bookmark,
        group: newGroups,
        updatedAt: Date.now(),
      };
      modifiedIds.push(id);
    }
  });

  return {
    modifiedBookmarks,
    result: { modifiedIds, hasChanges: modifiedIds.length > 0 },
  };
}

/**
 * Finds all bookmarks that belong to a specific group
 */
export function findBookmarksByGroup(
  bookmarks: Record<string, BookmarkMediaItem>,
  groupName: string,
): string[] {
  return Object.entries(bookmarks)
    .filter(([, bookmark]) => bookmark.group?.includes(groupName))
    .map(([id]) => id);
}

/**
 * Gets all unique group names from bookmarks
 */
export function getAllGroupNames(
  bookmarks: Record<string, BookmarkMediaItem>,
): string[] {
  const groups = new Set<string>();
  Object.values(bookmarks).forEach((bookmark) => {
    if (bookmark.group) {
      bookmark.group.forEach((group) => groups.add(group));
    }
  });
  return Array.from(groups);
}

/**
 * Validates a group name format
 */
export function isValidGroupName(groupName: string): boolean {
  // Group names should be non-empty and not contain only whitespace
  return groupName.trim().length > 0;
}

/**
 * Parses a group string to extract icon and name components
 */
export function parseGroupString(group: string): {
  icon: string;
  name: string;
} {
  const match = group.match(/^\[([a-zA-Z0-9_]+)\](.*)$/);
  if (match) {
    return { icon: match[1], name: match[2].trim() };
  }
  return { icon: "", name: group };
}

/**
 * Creates a formatted group string from icon and name
 */
export function createGroupString(icon: string, name: string): string {
  if (icon && name) {
    return `[${icon}]${name}`;
  }
  return name;
}
