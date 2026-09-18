/**
 * Region layout: how the authored atlas becomes playable ground.
 *
 * Pure geometry, no render or DOM dependencies. The atlas (assets/azhora-dev-regions.json)
 * is a pointy-top hex survey in pixels; the game world is metres with -Z as
 * "up" on the minimap. A transform ties the two together:
 *
 *  - LEGACY_ROAD_TRANSFORM describes today's hand-built road. Its -Z axis runs
 *    south-west across the atlas, from Tidehaven on Drent's coast toward Luscia,
 *    so the compass and the traveler's marker on the chart tell the truth even
 *    though the terrain was laid out along a straight line.
 *  - HEX_WORLD_TRANSFORM is the target for the rebuilt regions: north up, one
 *    authored hex is METRES_PER_HEX metres wide, and each playable region's
 *    outline is the outline of its authored hexes.
 *
 * Everything the rebuild needs to place ground, trees, roads and borders comes
 * from these functions, so a region can be regenerated from the atlas rather
 * than drawn by hand.
 */
import { METRES_PER_HEX, WORLD_SCALE } from './world-scale.js';

export const ATLAS_HEX_SIZE = 16;                       // circumradius in atlas pixels
export const ATLAS_HEX_WIDTH = ATLAS_HEX_SIZE * Math.sqrt(3);
// Flat-to-flat width of one authored hex in the rebuilt world; world-scale.js owns it.
export { METRES_PER_HEX };
export const PLAYABLE_REGIONS = Object.freeze(['Drent', 'Luscia', 'Moros Plain', 'East Suval', 'West Suval', 'Pueth', 'Peblos', 'West Izol', 'Elagos']);
/** Scatter is per hex, so a hex worth k times more ground carries k² times as much of it. */
const perHex = count => Math.round(count * WORLD_SCALE * WORLD_SCALE);

/** What each rebuilt region should feel like, whatever the survey's raw terrain says. */
export const REGION_BIOMES = Object.freeze({
  Drent: Object.freeze({ id: 'dense-forest', name: 'Drent forest', ground: '#4d7a3e', canopy: '#2f5a2c', treesPerHex: perHex(42), rocksPerHex: perHex(1), undergrowth: 'dense',
    relief: { amplitude: 2.6, wavelength: 90 }, clearings: ['village', 'farm'],
    note: 'All of Drent is green forest: broadleaf canopy, ferns and sorrel, the village and one farm clearing cut out of it.' }),
  Luscia: Object.freeze({ id: 'sparse-woodland', name: 'Luscian woods and meadows', ground: '#8fa35a', canopy: '#5f8a48', treesPerHex: perHex(9), rocksPerHex: perHex(1), undergrowth: 'light',
    relief: { amplitude: 4.5, wavelength: 140 }, clearings: ['battlefield', 'hamlet'],
    note: 'Rolling grass with copses of trees that thin toward the Moros; the Lauvel battlefield and a burned hamlet.' }),
  'Moros Plain': Object.freeze({ id: 'open-plain', name: 'Moros Plain', ground: '#b9b36c', canopy: null, treesPerHex: 0, rocksPerHex: 0, undergrowth: 'none',
    relief: { amplitude: .9, wavelength: 260 }, clearings: ['legion-camp'],
    note: 'Absolutely flat grassland, an enormous sky, and the Legion camp visible from a long way off. Horse country.' }),
  // East Suval scatters its own country (src/east-suval-world.js): what grows on
  // this blade of limestone depends on how far the ground is from the sea and how
  // high it stands, which a single count per hex cannot say.
  'East Suval': Object.freeze({ id: 'stone-hills', name: 'East Suval hills', ground: '#9b9d85', canopy: '#6c7f5a', treesPerHex: perHex(3), rocksPerHex: perHex(26), undergrowth: 'aromatic-scrub',
    relief: { amplitude: 11, wavelength: 120 }, clearings: ['border-post', 'elod'], ownScatter: true,
    note: 'The stone blade of the peninsula: pale limestone ridges, thin soil, aromatic cushion scrub, dry terraces and field walls, Elod on its shelf above an exposed eastern sea, and the shut frontier in the north.' }),
  'West Suval': Object.freeze({ id: 'coastal-downs', name: 'West Suval downs', ground: '#a9a95c', canopy: '#76834f', treesPerHex: perHex(4), rocksPerHex: perHex(2), undergrowth: 'long-grass',
    relief: { amplitude: 3.6, wavelength: 210 }, clearings: ['solis', 'coalition-camp', 'shepherds-fold', 'watchtower', 'wayside-well'],
    note: 'Rolling coastal grassland: long tawny grass, scattered thorn and olive trees, low field walls of pale stone, and downs that rise toward the white cliffs above Solis. Not the Moros’s flat treeless sky, not East Suval’s grey rock.' }),
  // Pueth builds its own scatter (src/pueth-scenery.js): its woods thin from the Tessen northward, which a per-hex count cannot say.
  Pueth: Object.freeze({ id: 'cold-woodland', name: 'Pueth birch woods and bare hills', ground: '#7f9175', canopy: '#44604c', treesPerHex: perHex(20), rocksPerHex: perHex(3), undergrowth: 'light',
    relief: { amplitude: 4, wavelength: 130 }, clearings: ['road-post', 'town'], ownScatter: true,
    note: 'Cold timber country north of Drent: birch and fir among the last broadleaf by the Tessen, open valley grass in the middle, bare-shouldered hills toward Feradom.' }),
  // Peblos scatters its own islands (src/peblos-scenery.js): everything there is measured from the waterline, which a per-hex count cannot say.
  Peblos: Object.freeze({ id: 'salt-islands', name: 'The Peblos islands', ground: '#76855f', canopy: '#4d6a4f', treesPerHex: perHex(2), rocksPerHex: perHex(9), undergrowth: 'salt-grass',
    relief: { amplitude: 3.4, wavelength: 95 }, clearings: ['harbour', 'headland'], ownScatter: true,
    note: 'Low barrier islands south-east of Drent: salt grass, thrift and gorse, grey rock at the waterline, pale sand in the coves, and a few wind-bent pines on the higher ground. No forest anywhere.' }),
  // West Izol scatters its own ground (src/izol-scenery.js): the rock gathers on the headlands and the turf in the hollows, which a per-hex count cannot say.
  'West Izol': Object.freeze({ id: 'izoli-rock', name: 'The West Izol headlands', ground: '#7e8b62', canopy: '#4c6647', treesPerHex: perHex(2), rocksPerHex: perHex(9), undergrowth: 'sea-turf',
    relief: { amplitude: 5.2, wavelength: 115 }, clearings: ['izolveth', 'harbour', 'fishing-village', 'boatyard'], ownScatter: true,
    note: 'The western half of the island of Izol: old hard rock, iron-brown at the water and slate-grey at height, cropped sea turf and gorse on the softer slopes, thorn and wind-bent pine in the hollows, and one alluvial flat at the river mouth where Izolveth stands.' }),
  // Elagos is the lake country: its water is authored in src/elagos-world.js, and the scatter keeps out of it through ELAGOS_CLEARINGS.
  Elagos: Object.freeze({ id: 'lake-shelf', name: 'The Lake Lands', ground: '#7d9560', canopy: '#3f6446', treesPerHex: perHex(7), rocksPerHex: perHex(2), undergrowth: 'light',
    relief: { amplitude: 2.6, wavelength: 165 }, clearings: ['ambron', 'nemmel', 'ice-road', 'lake-shrine'], blockHexes: 6,
    note: 'The northern shelf: cold clear lakes in a rolling green country, dense-grained lake timber in stands rather than forest, hay meadow and barley on the lake margins, and Ambron on the narrows. High ground: everything drops from here to the Moros.' }),
});

const AXIAL_NEIGHBORS = Object.freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
const NEIGHBOR_TO_EDGE = Object.freeze([0, 5, 4, 3, 2, 1]);

/** A world <-> atlas mapping. `forwardAtlas` is the atlas direction of world -Z. */
export function createAtlasTransform({ anchorAtlas, anchorWorld, forwardAtlas = { x: 0, y: -1 }, pixelsPerMetre }) {
  const length = Math.hypot(forwardAtlas.x, forwardAtlas.y) || 1;
  const forward = { x: forwardAtlas.x / length, y: forwardAtlas.y / length };
  const right = { x: -forward.y, y: forward.x };                 // world +X on the atlas
  const northOffset = Math.atan2(forward.x, -forward.y);          // compass bearing of world -Z, clockwise from north
  const k = pixelsPerMetre;
  return Object.freeze({
    pixelsPerMetre: k, metresPerHex: ATLAS_HEX_WIDTH / k, northOffset, forward, right,
    anchorAtlas: { ...anchorAtlas }, anchorWorld: { ...anchorWorld },
    worldToAtlas(x, z) {
      const dx = x - anchorWorld.x, dz = z - anchorWorld.z;
      return { x: anchorAtlas.x + (dx * right.x - dz * forward.x) * k, y: anchorAtlas.y + (dx * right.y - dz * forward.y) * k };
    },
    atlasToWorld(x, y) {
      const ax = x - anchorAtlas.x, ay = y - anchorAtlas.y;
      return { x: anchorWorld.x + (ax * right.x + ay * right.y) / k, z: anchorWorld.z - (ax * forward.x + ay * forward.y) / k };
    },
  });
}

/** The east-facing Drent coast hex where Tidehaven's landing is provisionally anchored. */
export const TIDEHAVEN_ATLAS = Object.freeze({ x: 1870.615, y: 2560 });
const LUSCIA_CENTER_ATLAS = Object.freeze({ x: 1680, y: 2636 });

/** Today's straight road: -Z points from the Drent coast toward the heart of Luscia. */
export const LEGACY_ROAD_TRANSFORM = createAtlasTransform({
  anchorAtlas: TIDEHAVEN_ATLAS, anchorWorld: { x: 0, z: 29 },
  forwardAtlas: { x: LUSCIA_CENTER_ATLAS.x - TIDEHAVEN_ATLAS.x, y: LUSCIA_CENTER_ATLAS.y - TIDEHAVEN_ATLAS.y },
  pixelsPerMetre: .24,
});

/** The rebuilt world: north up, hexes at METRES_PER_HEX, Tidehaven still near the origin. */
export const HEX_WORLD_TRANSFORM = createAtlasTransform({
  anchorAtlas: TIDEHAVEN_ATLAS, anchorWorld: { x: 0, z: 29 },
  forwardAtlas: { x: 0, y: -1 }, pixelsPerMetre: ATLAS_HEX_WIDTH / METRES_PER_HEX,
});

export function findRegion(survey, regionId) {
  return survey?.regions?.find(region => (region.name ?? region.id) === regionId) ?? null;
}

/** Hex cells of a region in world metres, each carrying its authored terrain and the region's biome. */
export function regionCells(survey, regionId, transform = HEX_WORLD_TRANSFORM) {
  const region = findRegion(survey, regionId);
  if (!region) return [];
  const biome = REGION_BIOMES[regionId] ?? null;
  return region.cells.map(cell => {
    const center = cellCenter(survey, cell), world = transform.atlasToWorld(center.x, center.y);
    return { q: cell.q, r: cell.r, x: world.x, z: world.z, terrain: cell.terrain, region: regionId, biome: biome?.id ?? cell.terrain };
  });
}

/**
 * Exact hex centre from axial coordinates. The survey's x/y are rounded to a
 * thousandth, which is enough to break corner matching between neighbours.
 */
function cellCenter(survey, cell) {
  const origin = survey?.origin ?? { x: 0, y: 0 };
  return { x: ATLAS_HEX_WIDTH * (cell.q + cell.r / 2) - origin.x, y: ATLAS_HEX_SIZE * 1.5 * cell.r - origin.y };
}
function atlasCorners(center) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 180 * (60 * i - 30);
    return { x: center.x + ATLAS_HEX_SIZE * Math.cos(angle), y: center.y + ATLAS_HEX_SIZE * Math.sin(angle) };
  });
}
// Distinct corners are at least a hex side apart, so a tenth of a pixel is a safe key.
const cornerKey = point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`;

/** Closed outline loops of a region's hexes (largest first), in world metres. */
export function regionOutline(survey, regionId, transform = HEX_WORLD_TRANSFORM, { soften = 0 } = {}) {
  const region = findRegion(survey, regionId);
  if (!region) return [];
  const members = new Set(region.cells.map(cell => `${cell.q},${cell.r}`));
  const edges = [];
  for (const cell of region.cells) {
    const corners = atlasCorners(cellCenter(survey, cell));
    AXIAL_NEIGHBORS.forEach(([dq, dr], direction) => {
      if (members.has(`${cell.q + dq},${cell.r + dr}`)) return;
      const slot = NEIGHBOR_TO_EDGE[direction];
      edges.push([corners[slot], corners[(slot + 1) % 6]]);
    });
  }
  const byStart = new Map();
  for (const edge of edges) { const key = cornerKey(edge[0]); if (!byStart.has(key)) byStart.set(key, []); byStart.get(key).push(edge); }
  const used = new Set(), loops = [];
  for (const edge of edges) {
    if (used.has(edge)) continue;
    const loop = [edge[0]]; let current = edge;
    while (current && !used.has(current)) {
      used.add(current); loop.push(current[1]);
      current = (byStart.get(cornerKey(current[1])) ?? []).find(next => !used.has(next));
    }
    if (loop.length > 3) { loop.pop(); loops.push(loop); }
  }
  loops.sort((a, b) => b.length - a.length);
  return loops.map(loop => {
    let points = loop;
    for (let pass = 0; pass < soften; pass++) {
      const next = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        next.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 }, { x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 });
      }
      points = next;
    }
    return points.map(point => transform.atlasToWorld(point.x, point.y));
  });
}

export function pointInPolygon(polygon, x, z) {
  let inside = false;
  for (let i = 0, previous = polygon.length - 1; i < polygon.length; previous = i++) {
    const a = polygon[previous], b = polygon[i];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/** Which playable region (if any) contains a world point, by hex outline. */
export function regionAtWorld(survey, x, z, transform = HEX_WORLD_TRANSFORM, regions = PLAYABLE_REGIONS) {
  for (const id of regions) for (const loop of regionOutline(survey, id, transform)) if (pointInPolygon(loop, x, z)) return id;
  return null;
}

/** The nearest hex cell to a world point, with its terrain and biome. */
export function cellAtWorld(survey, x, z, transform = HEX_WORLD_TRANSFORM, regions = PLAYABLE_REGIONS) {
  let best = null, bestDistance = Infinity;
  for (const id of regions) for (const cell of regionCells(survey, id, transform)) {
    const distance = Math.hypot(cell.x - x, cell.z - z);
    if (distance < bestDistance) { bestDistance = distance; best = cell; }
  }
  return best && bestDistance <= transform.metresPerHex ? best : null;
}

/** World bounds enclosing the playable regions, with a margin for the horizon. */
export function worldBoundsFor(survey, transform = HEX_WORLD_TRANSFORM, regions = PLAYABLE_REGIONS, margin = 60) {
  const points = regions.flatMap(id => regionOutline(survey, id, transform)).flat();
  if (!points.length) return null;
  return { minX: Math.min(...points.map(p => p.x)) - margin, maxX: Math.max(...points.map(p => p.x)) + margin,
    minZ: Math.min(...points.map(p => p.z)) - margin, maxZ: Math.max(...points.map(p => p.z)) + margin };
}

function centroid(cells) {
  return { x: cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length, z: cells.reduce((sum, cell) => sum + cell.z, 0) / cells.length };
}

/** The middle of the shared border between two regions, in world metres. */
export function borderMidpoint(survey, a, b, transform = HEX_WORLD_TRANSFORM) {
  const first = regionCells(survey, a, transform), second = regionCells(survey, b, transform);
  const index = new Map(second.map(cell => [`${cell.q},${cell.r}`, cell]));
  const pairs = [];
  for (const cell of first) for (const [dq, dr] of AXIAL_NEIGHBORS) {
    const other = index.get(`${cell.q + dq},${cell.r + dr}`);
    if (other) pairs.push({ x: (cell.x + other.x) / 2, z: (cell.z + other.z) / 2 });
  }
  return pairs.length ? centroid(pairs) : null;
}

/**
 * Story anchors for the rebuild: where the road goes and what it connects.
 * Names match docs/region-rebuild.md. All in world metres.
 */
export function routeAnchors(survey, transform = HEX_WORLD_TRANSFORM) {
  const drent = regionCells(survey, 'Drent', transform), luscia = regionCells(survey, 'Luscia', transform);
  const moros = regionCells(survey, 'Moros Plain', transform), suval = regionCells(survey, 'East Suval', transform);
  if (!drent.length || !luscia.length || !moros.length || !suval.length) return null;
  const tidehaven = transform.atlasToWorld(TIDEHAVEN_ATLAS.x, TIDEHAVEN_ATLAS.y);
  const eastMost = cells => cells.reduce((best, cell) => cell.x > best.x ? cell : best, cells[0]);
  const northMost = cells => cells.reduce((best, cell) => cell.z < best.z ? cell : best, cells[0]);
  return {
    tidehaven, drentHeart: centroid(drent),
    calossCrossing: borderMidpoint(survey, 'Drent', 'Luscia', transform),
    lauvelField: centroid(luscia),
    morosGate: borderMidpoint(survey, 'Luscia', 'Moros Plain', transform),
    legionCamp: centroid(moros),
    suvalBorder: borderMidpoint(survey, 'Luscia', 'East Suval', transform),
    elod: (() => { const cell = northMost(suval.filter(cell => cell.x >= eastMost(suval).x - transform.metresPerHex * 2)); return { x: cell.x, z: cell.z }; })(),
    suvalHills: centroid(suval),
  };
}

/**
 * The atlas's river edges as watercourses in world metres. Edges that share a
 * hex corner join into one open polyline, breaking where three meet, and each
 * polyline is softened by Chaikin corner cutting, as the journal chart draws
 * them (scripts/export-world-map.mjs). `edges` are `{ a: [q, r], b: [q, r], size }`.
 */
export function riverCourses(survey, edges, transform = HEX_WORLD_TRANSFORM, { soften = 2 } = {}) {
  const pieces = edges.map(edge => {
    const direction = AXIAL_NEIGHBORS.findIndex(([dq, dr]) => dq === edge.b[0] - edge.a[0] && dr === edge.b[1] - edge.a[1]);
    if (direction < 0) throw new Error(`River edge ${edge.a}|${edge.b} does not join two neighbouring hexes.`);
    const corners = atlasCorners(cellCenter(survey, { q: edge.a[0], r: edge.a[1] })), slot = NEIGHBOR_TO_EDGE[direction];
    return { edge, ends: [corners[slot], corners[(slot + 1) % 6]] };
  });
  const byCorner = new Map();
  for (const piece of pieces) for (const end of piece.ends) {
    const key = cornerKey(end);
    if (!byCorner.has(key)) byCorner.set(key, []);
    byCorner.get(key).push(piece);
  }
  const used = new Set(), courses = [];
  const extend = (line, members) => {
    for (;;) {
      const at = byCorner.get(cornerKey(line.at(-1))) ?? [];
      const next = at.filter(piece => !used.has(piece));
      if (at.length > 2 || next.length !== 1) return;
      used.add(next[0]); members.push(next[0].edge);
      line.push(cornerKey(next[0].ends[0]) === cornerKey(line.at(-1)) ? next[0].ends[1] : next[0].ends[0]);
    }
  };
  for (const piece of pieces) {
    if (used.has(piece)) continue;
    used.add(piece);
    const line = [piece.ends[0], piece.ends[1]], members = [piece.edge];
    extend(line, members); line.reverse(); extend(line, members);
    let points = line;
    for (let pass = 0; pass < soften; pass++) {
      const next = [points[0]];
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        next.push({ x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25 }, { x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75 });
      }
      next.push(points.at(-1));
      points = next;
    }
    const sizes = [...new Set(members.map(edge => edge.size))];
    courses.push({ size: sizes.length === 1 ? sizes[0] : sizes, edges: members,
      points: points.map(point => { const world = transform.atlasToWorld(point.x, point.y); return { x: world.x, z: world.z }; }) });
  }
  return courses;
}

/** Compass label for a camera yaw, honouring the transform's true north. */
export function compassHeading(yaw, transform = LEGACY_ROAD_TRANSFORM) {
  const labels = ['N', 'NW', 'W', 'SW', 'S', 'SE', 'E', 'NE'];
  const degrees = (((yaw - transform.northOffset) * 180 / Math.PI) % 360 + 360) % 360;
  const index = Math.round(degrees / 45) % 8;
  return { index, label: labels[index], labels, degrees };
}
