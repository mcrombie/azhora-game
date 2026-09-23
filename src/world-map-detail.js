import { TRANSFORM, hexAt } from './region-world.js';
import { MARKER_STYLE } from './quest-markers.js';

export const questMapColour = kind => `#${(Object.hasOwn(MARKER_STYLE, kind) ? MARKER_STYLE[kind] : MARKER_STYLE.main).colour.toString(16).padStart(6, '0')}`;

const finite = point => point && Number.isFinite(point.x) && Number.isFinite(point.z);
const point = p => TRANSFORM.worldToAtlas(p.x, p.z);

/** The atlas and the playable ground use one transform, even at street scale. */
export function atlasCellKey(p) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  const world = TRANSFORM.atlasToWorld(p.x, p.y), h = hexAt(world.x, world.z);
  return `${h.q},${h.r}`;
}

/** Read-only local detail; malformed/trimmed NPC locations never become map marks. */
export function atlasLocalDetail(model) {
  const paths = [], buildings = [], markers = new Map();
  for (const path of model?.paths ?? []) {
    if (!Array.isArray(path)) continue;
    let run = [];
    const finish = () => { if (run.length > 1) paths.push(run); run = []; };
    for (const p of path) { if (finite(p)) run.push(point(p)); else finish(); }
    finish();
  }
  for (const b of model?.buildings ?? []) {
    if (!finite(b) || !(b.width > 0) || !(b.depth > 0) || !Number.isFinite(b.width + b.depth)) continue;
    const angle = Number.isFinite(b.angle) ? b.angle : 0, c = Math.cos(angle), s = Math.sin(angle);
    buildings.push([[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx, sz]) => {
      const x = sx * b.width / 2, z = sz * b.depth / 2;
      return point({ x: b.x + x * c + z * s, z: b.z + z * c - x * s });
    }));
  }
  const add = (p, kind) => {
    if (!finite(p) || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string') return;
    const markerKind = Object.hasOwn(MARKER_STYLE, p.markerKind) ? p.markerKind : 'main';
    markers.set(p.id, { id: p.id, name: p.name, kind, ...point(p),
      ...(kind === 'quest' ? { markerKind, colour: questMapColour(markerKind) } : {}) });
  };
  for (const p of model?.landmarks ?? []) if (p?.known || p?.discovered) add(p, 'local');
  add(model?.tracked, 'tracked');
  add(model?.openGoal, 'quest');
  add(model?.goal, 'quest');
  return { paths, buildings, markers: [...markers.values()] };
}

/** Entered tiles own exact details. Adjacent terrain alone never earns a label. */
export function atlasMarkKnown(mark, visited, reveal = false) {
  return !!mark && (reveal || visited.has(atlasCellKey(mark)));
}

// Muted, deliberately indistinct terrain on adjacent hexes. No atlas lettering
// or authored points of interest are copied into this layer.
export const GLIMPSED_TERRAIN = Object.freeze({
  ocean: '#23495b', coast: '#3d6571', lake: '#456d79', riverland: '#567569',
  forest: '#4e624a', deep_forest: '#3d5241', jungle: '#49674f', deep_jungle: '#354f40',
  plains: '#837960', grassland: '#737b59', hills: '#716e58', highland: '#786e61',
  mountain: '#747775', high_mountain: '#949793', wetland: '#5b7062', desert: '#938067',
  unknown: '#515d59',
});
