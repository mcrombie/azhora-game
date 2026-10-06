/** Small per-path cache for repeated height, tint and slope queries. Keys are
 * authored path objects; each retains at most eight exact coordinates. Cached
 * records stay private to the terrain module, whose consumers only read them.
 */
export function cacheTerrainPointSamples(sample) {
  const paths = new WeakMap();
  return (path, x, z) => {
    let cache = paths.get(path);
    if (!cache) { cache = { entries: [], next: 0 }; paths.set(path, cache); }
    for (const entry of cache.entries) if (entry.x === x && entry.z === z) return entry.value;
    const value = sample(path, x, z);
    cache.entries[cache.next] = { x, z, value };
    cache.next = (cache.next + 1) % 8;
    return value;
  };
}
