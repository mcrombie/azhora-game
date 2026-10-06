// Western expansion preserves the established terrain lattice and color stream.
// Feed the exact pre-expansion axis; never redistribute its western samples.
export function appendWesternTerrainSamples(previous, minimum, maximumSpacing = 7.1) {
  if (!previous.length || !Number.isFinite(minimum) || !(maximumSpacing > 0)) throw new TypeError('Valid axis/spacing required');
  if (minimum >= previous[0]) return { samples: previous.slice(), addedColumns: 0 };
  const count = Math.ceil((previous[0] - minimum) / maximumSpacing);
  const extension = Array.from({length:count}, (_, i) => previous[0] - (count - i) * (previous[0] - minimum) / count);
  return { samples: [...extension, ...previous], addedColumns: count };
}

// Existing tiles keep their old identity and exactly the same world footprint.
// Only their buffer indices move by the prepended count. Negative tile keys
// describe the added strip; old Full/Fast keys still start at zero.
export function preservedTerrainTileRanges(legacyColumns, addedColumns, span) {
  const result = [];
  for (let last = addedColumns, key = -1; last > 0; last -= span, key--)
    result.unshift({ key, first: Math.max(0, last - span), last, extension: true });
  for (let first = 0, key = 0; first < legacyColumns - 1; first += span, key++)
    result.push({ key, first: addedColumns + first, last: addedColumns + Math.min(first + span, legacyColumns - 1), extension: false });
  return result;
}

const bits = new DataView(new ArrayBuffer(8));
function mixWord(seed, value) {
  seed = Math.imul(seed ^ value, 0x85ebca6b) >>> 0;
  seed ^= seed >>> 13;
  return Math.imul(seed, 0xc2b2ae35) >>> 0;
}
// New columns use exact world coordinates and a separate domain seed. Inserting
// another column or changing load order never consumes an established draw.
export function extensionTerrainSeed(x, z) {
  let seed = 0xa1e24064;
  for (const value of [x, z]) {
    bits.setFloat64(0, value, true);
    seed = mixWord(seed, bits.getUint32(0, true)); seed = mixWord(seed, bits.getUint32(4, true));
  }
  return (seed ^ (seed >>> 16)) >>> 0;
}
