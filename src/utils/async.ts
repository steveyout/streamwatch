/**
 * Maps an array to a promise that resolves with an array of results,
 * limiting the number of concurrent operations.
 *
 * @param items The array of items to map
 * @param concurrency The maximum number of concurrent operations
 * @param fn The async function to apply to each item
 * @returns A promise that resolves with an array of results
 */
export async function concurrentMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const queue = items.map((item, index) => ({ item, index }));

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (queue.length > 0) {
        const entry = queue.shift();
        if (!entry) break;
        const { item, index } = entry;
        results[index] = await fn(item);
      }
    },
  );

  await Promise.all(workers);
  return results;
}
