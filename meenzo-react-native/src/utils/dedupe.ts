/** Filters out null/malformed entries and dedupes by id — defends against backend
 * populate gaps (deleted referenced docs) and duplicate records in list responses. */
export function dedupeById<T>(items: (T | null | undefined)[], getId: (item: T) => string | undefined | null): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!item) continue;
    const id = getId(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }
  return result;
}
