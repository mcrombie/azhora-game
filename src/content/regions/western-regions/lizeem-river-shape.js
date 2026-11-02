// Break up the repeated hex-edge scallops without moving the river out of its
// border valley. Applied once at construction, before water/terrain/map sampling.
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const fixedBanks = [
  [-2203, 135, 28], // White Bridge
  [-2250, 231, 24], // Isa confluence
  [-2100, 491, 24], // Neth confluence
  [-1960, 510, 70], // Velsorten intake and the warden's bank
  [-1800, 606, 32], // Carica confluence
  [-1665, 933, 26], // Oveth approach
];
// Unequal lengths and amplitudes: a long sweep, a straighter reach, then a
// tighter turn. These are small edits to the actual course, not a lookout proxy.
const bends = [[.035, .145, -7], [.235, .345, -11], [.35, .48, 10],
  [.59, .75, -8], [.76, .885, 12], [.90, .985, -5]];

export function shapeLizeem(points) {
  return points.map((p, i) => {
    const t = i / (points.length - 1);
    let freedom = smooth(t / .04) * smooth((1 - t) / .04);
    for (const [x, z, radius] of fixedBanks)
      freedom *= smooth((Math.hypot(p.x - x, p.z - z) - radius) / 30);
    if (!freedom) return p;
    let x = 0, z = 0, weight = 0;
    for (let j = Math.max(0, i - 4); j <= Math.min(points.length - 1, i + 4); j++) {
      const w = 5 - Math.abs(j - i);
      x += points[j].x * w; z += points[j].z * w; weight += w;
    }
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    let offset = 0;
    for (const [from, to, amplitude] of bends)
      if (t > from && t < to) offset += amplitude * Math.sin(Math.PI * (t - from) / (to - from)) ** 2;
    const dx = x / weight - p.x - (b.z - a.z) / length * offset;
    const dz = z / weight - p.z + (b.x - a.x) / length * offset;
    const scale = freedom * Math.min(1, 16 / (Math.hypot(dx, dz) || 1));
    return {x: p.x + dx * scale, z: p.z + dz * scale};
  });
}
