import { ProgressItem, ProgressMediaItem } from "@/stores/progress";

/**
 * Options for modifying progress item properties
 */
export interface ProgressModificationOptions {
  /** Update the title of the progress item */
  title?: string;
  /** Update the year of the progress item */
  year?: number;
  /** Update the poster URL of the progress item */
  poster?: string;
  /** Update the overall progress for movies or shows */
  progress?: ProgressItem;
}

/**
 * Result of a progress modification operation
 */
export interface ProgressModificationResult {
  /** IDs of progress items that were modified */
  modifiedIds: string[];
  /** Whether any progress items were actually changed */
  hasChanges: boolean;
}

/**
 * Modifies a single progress item with the provided options
 */
export function modifyProgressItem(
  progressItem: ProgressMediaItem,
  options: ProgressModificationOptions,
): ProgressMediaItem {
  const modified = { ...progressItem, updatedAt: Date.now() };

  if (options.title !== undefined) {
    modified.title = options.title;
  }

  if (options.year !== undefined) {
    modified.year = options.year;
  }

  if (options.poster !== undefined) {
    modified.poster = options.poster;
  }

  if (options.progress !== undefined) {
    modified.progress = { ...options.progress };
  }

  return modified;
}

/**
 * Modifies multiple progress items by their IDs
 */
export function modifyProgressItems(
  progressItems: Record<string, ProgressMediaItem>,
  progressIds: string[],
  options: ProgressModificationOptions,
): {
  modifiedProgressItems: Record<string, ProgressMediaItem>;
  result: ProgressModificationResult;
} {
  const modifiedProgressItems = { ...progressItems };
  const modifiedIds: string[] = [];
  let hasChanges = false;

  progressIds.forEach((id) => {
    const original = modifiedProgressItems[id];
    if (original) {
      const modified = modifyProgressItem(original, options);
      modifiedProgressItems[id] = modified;
      modifiedIds.push(id);

      // Check if anything actually changed
      if (!hasChanges) {
        hasChanges = Object.keys(options).some((key) => {
          const optionKey = key as keyof ProgressModificationOptions;
          const optionValue = options[optionKey];
          const currentValue = modified[optionKey as keyof ProgressMediaItem];

          if (optionKey === "progress" && optionValue && currentValue) {
            return (
              (optionValue as ProgressItem).watched !==
                (currentValue as ProgressItem).watched ||
              (optionValue as ProgressItem).duration !==
                (currentValue as ProgressItem).duration
            );
          }

          return optionValue !== currentValue;
        });
      }
    }
  });

  return {
    modifiedProgressItems,
    result: { modifiedIds, hasChanges: hasChanges && modifiedIds.length > 0 },
  };
}
