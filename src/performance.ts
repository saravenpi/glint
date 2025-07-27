/**
 * Execute promises in parallel with a concurrency limit
 * @param {T[]} items - Array of items to process
 * @param {function} fn - Function that returns a promise for each item
 * @param {number} limit - Maximum number of concurrent executions
 * @returns {Promise<R[]>} Array of results in the same order as input
 */
export async function parallelLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit = 10
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing = new Set<Promise<void>>();

  for (let i = 0; i < items.length; i++) {
    const promise = fn(items[i]).then(result => {
      results[i] = result;
    }).finally(() => {
      executing.delete(promise);
    });

    executing.add(promise);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Split an array into smaller chunks
 * @param {T[]} array - Array to split
 * @param {number} chunkSize - Size of each chunk
 * @returns {T[][]} Array of chunks
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}