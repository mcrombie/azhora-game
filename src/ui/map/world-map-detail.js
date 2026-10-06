import { TRANSFORM, hexAt } from '../../world/terrain/region-world.js';
import { MARKER_STYLE } from '../../gameplay/quests/quest-markers.js';
import { AMBRON_CENTRE, AMBRON_OUTLINE } from '../../content/regions/ambron/ambron-city-layout.js';
import { MENORA_OUTLINE } from '../../content/regions/minora-frontier/menora-city.js';
import { NYLON_OUTLINE } from '../../content/regions/nylon/nylon-city.js';
import { AEVIS_OUTLINE } from '../../content/regions/aevis/aevis-city.js';
import { MITHALA_DISTRICTS } from '../../content/regions/mithala/mithala-city.js';
import { VARN_CORNERS } from '../../content/regions/varn/varn-world.js';
import { SEVRON_ENTRANCES } from '../../content/regions/west-oremindi/west-oremindi-world.js';

// Only built cities (including identifiable ruins) have this designation.
// Stable discovery/save IDs deliberately retain the former spelling of Minora.
export const ATLAS_CITY_DESIGNATIONS = Object.freeze({
  menora: Object.freeze({ name: 'Minora', subtitle: 'Holy city' }),
  varn: Object.freeze({ name: 'Varn', subtitle: 'Fortress city' }),
  solis: Object.freeze({ name: 'Solis', subtitle: 'City' }),
  nylon: Object.freeze({ name: 'Nylon', subtitle: 'City-state' }),
  selamus: Object.freeze({ name: 'Selemis', subtitle: 'Maritime city' }),
  aevis: Object.freeze({ name: 'Aevis', subtitle: 'Bronze city' }),
  mithala: Object.freeze({ name: 'Mithala', subtitle: 'Royal seat' }),
  elod: Object.freeze({ name: 'Elod', subtitle: 'City-state' }),
  'west-baldro-gate': Object.freeze({ name: 'West Hold', subtitle: 'Dwarven city' }),
  'east-baldro-gate': Object.freeze({ name: 'East Hold', subtitle: 'Dwarven city' }),
  imlamdris: Object.freeze({ name: 'Imlamdris', subtitle: 'City ruins' }),
  'zecron-ruins': Object.freeze({ name: 'Zecron', subtitle: 'City ruins' }),
  'sevron-city': Object.freeze({ name: 'Sevron', subtitle: 'Elven city' }),
});

export const questMapColour = kind => `#${(Object.hasOwn(MARKER_STYLE, kind) ? MARKER_STYLE[kind] : MARKER_STYLE.main).colour.toString(16).padStart(6, '0')}`;

const finite = point => point && Number.isFinite(point.x) && Number.isFinite(point.z);
const point = p => TRANSFORM.worldToAtlas(p.x, p.z);

/** The capital uses the same dry interlake footprint as its real streets and
 * walls. This is drawing data only: the ordinary fog still covers every
 * unvisited part, and the capital mark requires its own visited hex. */
export function atlasCityDetail() {
  return { marker: { id: 'ambron-capital', name: 'Ambron', kind: 'capital', subtitle: 'Imperial capital', ...point(AMBRON_CENTRE) },
    boundary: AMBRON_OUTLINE.map(point) };
}

/** Authored city footprints. Aevis has an open waterfront: its outline marks the city extent, not a continuous defensive wall.
 * Mithala is four quarters with the river between them, so it is drawn as four: each district's own made ground, the Fork
 * inside its curtain and the other three inside their banks, and the water at the meeting left as water. */
export function atlasCityBoundaries() {
  return [{ id: 'ambron', boundary: AMBRON_OUTLINE.map(point) },
    { id: 'menora', boundary: MENORA_OUTLINE.map(point) },
    { id: 'nylon', boundary: NYLON_OUTLINE.map(point) },
    { id: 'aevis', boundary: AEVIS_OUTLINE.map(point) },
    { id: 'varn', boundary: VARN_CORNERS.map(point) },
    ...MITHALA_DISTRICTS.map(district => ({ id: district.id, city: 'mithala', boundary: district.outline.map(point) }))];
}

/** A secret city gains a map badge only after its living galleries are found. */
export function atlasRevealedCityMarks({ sevron = false } = {}) {
  if (!sevron) return [];
  return [{ id: 'sevron-city', ...ATLAS_CITY_DESIGNATIONS['sevron-city'], kind: 'city',
    ...point(SEVRON_ENTRANCES.find(entrance => entrance.kind === 'city')) }];
}

/** An ordinary local Ambron label yields to the capital. A tracked destination
 * or quest keeps its own marker so the city never erases the player's goal. */
export function atlasPlaceMarks(places = [], local = []) {
  const capital = atlasCityDetail().marker;
  const entries = [...places, ...local].filter(p => p && !(p.id === 'ambron' && !['quest', 'tracked'].includes(p.kind)));
  return [...new Map([...entries, capital].map(mark => {
    const designation = ATLAS_CITY_DESIGNATIONS[mark.id];
    return [mark.id, designation && !['quest', 'tracked'].includes(mark.kind)
      ? { ...mark, ...designation, kind: 'city' } : { ...mark }];
  })).values()];
}

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
    const finish = () => {
      if (run.length > 1) {
        if (path.kind === 'trail' || path.kind === 'road') run.kind = path.kind;
        paths.push(run);
      }
      run = [];
    };
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

/**
 * The authored export keeps region lettering in one flat group. Separate that group before
 * painting terrain so revealing a region's name never needs a second label or uncovered hex.
 * Leave every authored text attribute and tspan untouched (including rotated mountain names).
 */
export function splitAtlasRegionLabels(svg) {
  const match = typeof svg === 'string' && svg.match(/<g\b(?=[^>]*\bid=["']region-labels["'])[^>]*>[\s\S]*?<\/g>/);
  if (!match) throw new Error('The authored atlas has no region lettering layer.');
  return { terrain: svg.slice(0, match.index) + svg.slice(match.index + match[0].length), labels: match[0] };
}

/** Knowledge of a country name is distinct from entering any of its terrain hexes. */
export function atlasRegionLabelKnown(name, labels, reveal = false) {
  return typeof name === 'string' && (reveal || (labels ?? []).some(label => label?.name === name));
}

/** Only visited and neighboring hex records can uncover ground. Knowledge of a country,
 * including legacy charted/explored silhouettes, never widens this scope. */
export function atlasExplorationScope({ cells = [], glimpsed = [], reveal = false } = {}) {
  const valid = key => typeof key === 'string' && /^-?\d+,-?\d+$/.test(key);
  const visited = new Set(Array.from(cells ?? []).filter(valid));
  const nearby = new Set(Array.from(glimpsed ?? []).filter(key => valid(key) && !visited.has(key)));
  return { visited, nearby, reveal: !!reveal };
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
