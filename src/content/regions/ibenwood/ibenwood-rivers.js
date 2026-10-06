import { finishBuild } from '../../../world/loading/build-steps.js';
/** The two Ibenwood watercourses, derived only from the authored atlas edges.
 * Heights, widths and beds are the game's interpretation; the map supplies no
 * river names or elevations. North and East Ibenwood have no mapped river.
 * Pure until createIbenwoodRiverScenery receives THREE and a scene parent.
 */
import { PLAYABLE_SURVEY } from '../../../dev/tools/region-survey.js';
import { riverCourses } from '../../../world/terrain/region-layout.js';
import { RIVER_EDGES } from '../../../world/terrain/region-rivers.js';

const NAMES = ['North Ibenwood', 'East Ibenwood', 'South Ibenwood', 'West Ibenwood', 'Central Ibenwood'];
export const IBENWOOD_RIVER_EDGES = Object.freeze(RIVER_EDGES.filter(edge => edge.regions.some(name => NAMES.includes(name))));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const HALF = { small: 1.7, medium: 3.4, large: 5.5 };
const GRID = 32, REACH = 48, QUERY_REACH = 80;

function projection(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return { t, distance: Math.hypot(x - lerp(a.x, b.x, t), z - lerp(a.z, b.z, t)) };
}
function bounds(points) {
  return Object.freeze({ minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
    minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)) });
}
const oriented = points => points[0].z <= points.at(-1).z ? points : [...points].reverse();

export const IBENWOOD_RIVERS = Object.freeze(riverCourses(PLAYABLE_SURVEY, IBENWOOD_RIVER_EDGES).map(chain => {
  const central = chain.edges.some(edge => edge.regions.includes('Central Ibenwood'));
  const rawPoints = oriented(riverCourses(PLAYABLE_SURVEY, chain.edges, undefined, { soften: 0 })[0].points);
  const points = oriented(chain.points).map(Object.freeze);
  return Object.freeze({ id: central ? 'ibenwood-central-south-river' : 'ibenwood-west-stream',
    name: central ? 'Central and South Ibenwood river' : 'West Ibenwood border stream',
    edges: Object.freeze(chain.edges), points: Object.freeze(points), rawPoints: Object.freeze(rawPoints.map(Object.freeze)),
    bounds: bounds(points) });
}));

// All lookups use local buckets; terrain generation must not scan every river
// sample for every vertex in the full world.
function addToGrid(grid, box, value, padding = 0) {
  for (let ix = Math.floor((box.minX - padding) / GRID); ix <= Math.floor((box.maxX + padding) / GRID); ix++)
    for (let iz = Math.floor((box.minZ - padding) / GRID); iz <= Math.floor((box.maxZ + padding) / GRID); iz++) {
      const key = `${ix},${iz}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(value);
    }
}
const bucket = (grid, x, z) => grid.get(`${Math.floor(x / GRID)},${Math.floor(z / GRID)}`) ?? [];

function profileFor(course, groundHeight) {
  const authored = course.edges.map(edge => ({ half: HALF[edge.size],
    points: riverCourses(PLAYABLE_SURVEY, [edge], undefined, { soften: 0 })[0].points }));
  const samples = [], points = course.points;
  let along = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(length / 3));
    for (let j = 0; j < steps; j++) {
      const t = j / steps, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t);
      samples.push({ x, z, along: along + length * t });
    }
    along += length;
  }
  samples.push({ ...points.at(-1), along });
  const widths = samples.map(p => {
    let distance = Infinity, half = HALF.small;
    for (const edge of authored) {
      const d = projection(p.x, p.z, ...edge.points).distance;
      if (d < distance) { distance = d; half = edge.half; }
    }
    return half;
  });
  const ground = samples.map(p => groundHeight(p.x, p.z));
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i], before = samples[Math.max(0, i - 1)], after = samples[Math.min(samples.length - 1, i + 1)];
    const length = Math.hypot(after.x - before.x, after.z - before.z);
    p.nx = -(after.z - before.z) / length; p.nz = (after.x - before.x) / length;
    const lo = Math.max(0, i - 4), hi = Math.min(samples.length, i + 5);
    p.half = widths.slice(lo, hi).reduce((sum, value) => sum + value, 0) / (hi - lo);
    // Stay below the local valley floor and fall gently throughout the course.
    // A later rise is cut through; water never climbs over a terrain hummock.
    const average = ground.slice(lo, hi).reduce((sum, value) => sum + value, 0) / (hi - lo);
    p.surface = Math.min(ground[i] - .45, average - .65,
      i ? samples[i - 1].surface - (p.along - before.along) * .001 : Infinity);
    p.depth = .85 + (p.half - HALF.small) * .25;
    Object.freeze(p);
  }
  return Object.freeze({ course, samples: Object.freeze(samples) });
}

function ribbonFor(profile) {
  const vertices = [], indices = [], left = [], right = [];
  for (const p of profile.samples) {
    // Match query coordinates to the actual Float32 renderer buffer, including
    // far-west world coordinates whose rounding is greater than at the origin.
    const a = { x: Math.fround(p.x + p.nx * p.half), z: Math.fround(p.z + p.nz * p.half), y: Math.fround(p.surface) };
    const b = { x: Math.fround(p.x - p.nx * p.half), z: Math.fround(p.z - p.nz * p.half), y: Math.fround(p.surface) };
    left.push(a); right.push(b); vertices.push(a, b);
    if (vertices.length > 2) {
      const k = vertices.length - 4;
      indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  return { vertices, indices, outline: [...left, ...right.reverse()] };
}

/** Construct once from the uncarved ground callback. ground(x,z,base) only
 * lowers terrain inside these two corridors; waterAt is null outside the exact
 * rendered ribbon. Pass the same object to scenery and the world's waterAt.
 * Mesh the channel corridors at <=2 m spacing so narrow stream beds are visible.
 */
export function createIbenwoodRiverSystem({ groundHeight }) {
  if (typeof groundHeight !== 'function') throw new TypeError('Ibenwood rivers require uncarved groundHeight.');
  const profiles = IBENWOOD_RIVERS.map(course => profileFor(course, groundHeight));
  const ribbons = profiles.map(ribbonFor), segments = new Map(), water = new Map();
  for (const profile of profiles) for (let i = 1; i < profile.samples.length; i++) {
    const a = profile.samples[i - 1], b = profile.samples[i];
    addToGrid(segments, bounds([a, b]), { a, b, course: profile.course }, QUERY_REACH);
  }
  for (const ribbon of ribbons) for (let i = 0; i < ribbon.indices.length; i += 3) {
    const triangle = ribbon.indices.slice(i, i + 3).map(k => ribbon.vertices[k]);
    addToGrid(water, bounds(triangle), triangle, .001);
  }
  function nearest(x, z, maxReach = REACH) {
    let distance = Math.min(QUERY_REACH, maxReach), found = null;
    for (const segment of bucket(segments, x, z)) {
      const hit = projection(x, z, segment.a, segment.b);
      if (hit.distance > distance) continue;
      distance = hit.distance; found = { ...segment, ...hit };
    }
    if (!found) return null;
    const { a, b, t, course } = found;
    return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), distance, course,
      surface: lerp(a.surface, b.surface, t), half: lerp(a.half, b.half, t),
      depth: lerp(a.depth, b.depth, t), along: lerp(a.along, b.along, t) };
  }
  function ground(x, z, base = groundHeight(x, z)) {
    const sample = nearest(x, z);
    if (!sample) return base;
    const inner = sample.half + .65;
    const reach = inner + 8 + clamp(base - sample.surface, 0, 18) * 1.6;
    if (sample.distance >= reach) return base;
    const bed = Math.min(base, sample.surface - sample.depth);
    return lerp(bed, base, smooth(inner, reach, sample.distance));
  }
  function waterAt(x, z) {
    let height = null;
    for (const [a, b, c] of bucket(water, x, z)) {
      const det = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
      if (Math.abs(det) < 1e-9) continue;
      const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / det;
      const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / det;
      // Sub-millimetre edge tolerance accounts for the Float32 shore rounding.
      if (u < -5e-5 || v < -5e-5 || u + v > 1 + 5e-5) continue;
      const y = u * a.y + v * b.y + (1 - u - v) * c.y;
      height = height === null ? y : Math.max(height, y);
    }
    return height;
  }
  return Object.freeze({ courses: IBENWOOD_RIVERS, profiles: Object.freeze(profiles), ribbons: Object.freeze(ribbons),
    ground, waterAt, nearest, channelReach: REACH,
    mapWaters: Object.freeze(ribbons.map((ribbon, i) => Object.freeze({ id: `${profiles[i].course.id}-water`, kind: 'polygon',
      points: Object.freeze(ribbon.outline.map(p => Object.freeze({ x: p.x, z: p.z }))) }))) });
}

/** Rendering uses exactly the triangles queried by rivers.waterAt. Water has no
 * solid colliders; normal heightAt/waterAt movement supplies swimming behavior.
 */
export function createIbenwoodRiverScenery(...args) { return finishBuild(createIbenwoodRiverScenerySteps(...args)); }
export function* createIbenwoodRiverScenerySteps({ THREE, parent, rivers, terrainRoot, heightAt, refinedGround = null }) {
  let buildWork = 0;
  const terrain = refinedGround ?? (terrainRoot ? (yield* refineIbenwoodRiverGroundSteps({ THREE, terrainRoot, rivers, heightAt })) : null);
  const material = new THREE.MeshStandardMaterial({ color: '#527e78', roughness: .3, metalness: .06 });
  const meshes = rivers.ribbons.map((ribbon, i) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(ribbon.vertices.flatMap(p => [p.x, p.y, p.z]), 3));
    geometry.setIndex(ribbon.indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = rivers.courses[i].id; mesh.receiveShadow = true; parent.add(mesh);
    return mesh;
  });
  return { meshes, mapWaters: rivers.mapWaters, terrain };
}

/** Replace only indexed ground faces near these rivers. Existing terrain tiles
 * share full-world attributes but have local index lists and custom bounds: do
 * not copy those attributes or recompute their bounds. New faces use compact
 * buffers, and their outer 6m retain the original face planes for a closed seam.
 * A common subdivision count keeps shared edges conforming across tile borders.
 */
export function refineIbenwoodRiverGround(...args) { return finishBuild(refineIbenwoodRiverGroundSteps(...args)); }
export function* refineIbenwoodRiverGroundSteps({ THREE, terrainRoot, rivers, heightAt, reach = REACH }) {
  let buildWork = 0;
  // Faces share their edge and corner points with their neighbours: each point's true height is asked of the ground once.
  const heights = new Map(), trueHeight = (x, z) => {
    const key = Math.round(x * 100) * 1e6 + Math.round(z * 100);
    let h = heights.get(key);
    if (h === undefined) heights.set(key, h = heightAt(x, z));
    return h;
  };
  if (typeof heightAt !== 'function') throw new TypeError('River terrain refinement requires final heightAt.');
  const tiles = [], corridors = rivers.courses.map(course => course.bounds);
  let longest = 0, removedTriangles = 0;
  const sourceMeshes = []; terrainRoot.traverse(mesh => sourceMeshes.push(mesh));
  for (const mesh of sourceMeshes) { if ((++buildWork & 31) === 0) yield;
    if (!mesh.isMesh || mesh.userData.ibenwoodRiverGround || mesh.userData.ibenwoodRiverRefined) continue;
    const geometry = mesh.geometry, position = geometry.attributes.position, index = geometry.index;
    if (!index || !position) continue;
    const box = geometry.boundingBox;
    if (box && !corridors.some(b => box.max.x >= b.minX - reach && box.min.x <= b.maxX + reach
      && box.max.z >= b.minZ - reach && box.min.z <= b.maxZ + reach)) continue;
    const keep = [], faces = [];
    for (let i = 0; i < index.count; i += 3) { if ((++buildWork & 31) === 0) yield;
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      const p = ids.map(id => ({ x: position.getX(id), y: position.getY(id), z: position.getZ(id) }));
      const x = (p[0].x + p[1].x + p[2].x) / 3, z = (p[0].z + p[1].z + p[2].z) / 3;
      const radius = Math.max(...p.map(v => Math.hypot(v.x - x, v.z - z)));
      if (!rivers.nearest(x, z, reach + radius)) { keep.push(...ids); continue; }
      faces.push({ ids, p });
      for (let j = 0; j < 3; j++) { if ((++buildWork & 31) === 0) yield; longest = Math.max(longest, Math.hypot(p[j].x - p[(j + 1) % 3].x, p[j].z - p[(j + 1) % 3].z)); }
    }
    if (faces.length) tiles.push({ mesh, geometry, keep, faces });
  }
  const divisions = Math.max(1, Math.ceil(longest / 2)), patches = [];
  for (const { mesh, geometry, keep, faces } of tiles) { if ((++buildWork & 31) === 0) yield;
    const position = [], color = [], indices = [], sourceColor = geometry.attributes.color;
    for (const { ids, p: [a, b, c] } of faces) { if ((++buildWork & 31) === 0) yield;
      const rows = [];
      for (let i = 0; i <= divisions; i++) { if ((++buildWork & 31) === 0) yield;
        rows.push(position.length / 3);
        for (let j = 0; j <= divisions - i; j++) { if ((++buildWork & 31) === 0) yield;
          const u = i / divisions, v = j / divisions, w = 1 - u - v;
          const x = a.x * w + b.x * u + c.x * v, z = a.z * w + b.z * u + c.z * v;
          const plane = a.y * w + b.y * u + c.y * v, near = rivers.nearest(x, z);
          const strength = near ? 1 - smooth(reach - 6, reach, near.distance) : 0;
          position.push(x, strength ? lerp(plane, trueHeight(x, z), strength) : plane, z);
          if (sourceColor) for (let k = 0; k < 3; k++) { if ((++buildWork & 31) === 0) yield; color.push(sourceColor.array[ids[0] * 3 + k] * w
            + sourceColor.array[ids[1] * 3 + k] * u + sourceColor.array[ids[2] * 3 + k] * v); }
        }
      }
      for (let i = 0; i < divisions; i++) { if ((++buildWork & 31) === 0) yield; for (let j = 0; j < divisions - i; j++) { if ((++buildWork & 31) === 0) yield;
        indices.push(rows[i] + j, rows[i + 1] + j, rows[i] + j + 1);
        if (j < divisions - i - 1) indices.push(rows[i + 1] + j, rows[i + 1] + j + 1, rows[i] + j + 1);
      } }
    }
    const fine = new THREE.BufferGeometry();
    fine.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    if (sourceColor) fine.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
    fine.setIndex(indices); fine.computeVertexNormals(); fine.computeBoundingBox(); fine.computeBoundingSphere();
    const patch = new THREE.Mesh(fine, mesh.material);
    patch.name = `Ibenwood river ground: ${mesh.name}`; patch.receiveShadow = true; patch.userData.ibenwoodRiverGround = true;
    geometry.setIndex(keep); mesh.userData.ibenwoodRiverRefined = true;
    terrainRoot.add(patch); patches.push(patch); removedTriangles += faces.length;
  }
  return { patches, removedTriangles, triangles: patches.reduce((n, mesh) => n + mesh.geometry.index.count / 3, 0), spacing: longest / divisions };
}
