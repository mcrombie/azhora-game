/** Isolated strategic fixture on the authored frontier. Balance values describe
 * this test scenario only: they are not troop counts, new countries or canon. */
import { REGION_CELLS, hexAt, hexCentre } from '../../world/terrain/region-world.js';
import { MENORA, MENORA_BRIDGES, MENORA_PATHS } from '../../content/regions/minora-frontier/menora-city.js';
import { CARICAS_TOWN, CARICAS_ROADS } from '../../content/regions/minora-frontier/caricas-settlement.js';
import { YUNETHRE_CAMP, YUNETHRE_TOWN, YUNETHRE_PATHS } from '../../content/regions/minora-frontier/yunethre-world.js';
import { FARMSTEADS } from '../../world/scenery/regional-farmland.js';
import { LIZEEM, ISAREOS_RIVER, CARICA } from '../../content/regions/western-regions/west-regions.js';

const freeze = Object.freeze;
export const STRATEGIC_REGIONS = freeze(['Isareos', 'Caricas', 'Yunethre']);
export const STRATEGIC_SCENARIO_ID = 'menora-frontier-v1';
export const strategicCellId = ({ q, r }) => `${q},${r}`;
export const STRATEGIC_FACTIONS = freeze([
  freeze({ id: 'empire', name: 'Ambroni Empire', color: '#d2ad5d' }),
  freeze({ id: 'yunethre', name: 'Yunethre free clans', color: '#8aa875' }),
  freeze({ id: 'neutral', name: 'Lakeside Free Town', color: '#c2c4c1' }),
]);
const dirs = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
export const STRATEGIC_CELLS = freeze(STRATEGIC_REGIONS.flatMap(region => REGION_CELLS[region].map(cell => {
  const corners = Array.from({ length: 6 }, (_, i) => ({ x: cell.x + Math.cos((i * 60 - 30) * Math.PI / 180) * 100 / Math.sqrt(3), z: cell.z + Math.sin((i * 60 - 30) * Math.PI / 180) * 100 / Math.sqrt(3) }));
  return freeze({ ...cell, id: strategicCellId(cell), sovereignClaim: region === 'Yunethre' ? 'yunethre' : 'empire', corners: freeze(corners.map(freeze)) });
})));
const cells = new Map(STRATEGIC_CELLS.map(c => [c.id, c]));
export const strategicCellAt = at => cells.get(strategicCellId(hexAt(at.x, at.z))) ?? null;
export const strategicEdgeId = (a, b) => [a, b].sort().join('|');
const cross = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
const intersects = (a, b, c, d) => cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
const riverSegments = [LIZEEM, ISAREOS_RIVER, CARICA].flatMap(r => r.points.slice(1).map((b, i) => ({ a: r.points[i], b, name: r.name, id: r.id })));
export const STRATEGIC_RIVERS = freeze([LIZEEM, ISAREOS_RIVER, CARICA].map(r => freeze({ id: r.id, name: r.name, points: r.points })));
const whiteBridge = MENORA_BRIDGES.find(b => b.id === 'menora-lizeem-bridge');
const bridgeEnds = [whiteBridge.start - 12, whiteBridge.end + 12].map(x => strategicCellAt({ x, z: whiteBridge.z }).id);
export const STRATEGIC_BRIDGE_EDGE = strategicEdgeId(...bridgeEnds);
const distanceTo = (p, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz); };
const roads = [...MENORA_PATHS, ...CARICAS_ROADS, ...YUNETHRE_PATHS].flatMap(p => p.points.slice(1).map((b, i) => [p.points[i], b]));
export const STRATEGIC_EDGES = freeze(STRATEGIC_CELLS.flatMap(a => dirs.flatMap(([dq, dr]) => {
  const b = cells.get(`${a.q + dq},${a.r + dr}`); if (!b || a.id > b.id) return [];
  const id = strategicEdgeId(a.id, b.id), river = riverSegments.find(r => intersects(a, b, r.a, r.b)), bridge = id === STRATEGIC_BRIDGE_EDGE;
  const middle = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  const road = bridge || roads.some(([start, end]) => distanceTo(middle, start, end) < 36);
  const terrainHours = a.region === 'Isareos' || b.region === 'Isareos' ? 5 : 4;
  return [freeze({ id, a: a.id, b: b.id, road, river: river?.name ?? null,
    crossing: bridge ? whiteBridge.name : river ? 'No army crossing' : null,
    bridge, blocked: !!river && !bridge, hours: bridge ? 3 : road ? 3 : terrainHours })];
})));
export const STRATEGIC_NEIGHBORS = freeze(Object.fromEntries(STRATEGIC_CELLS.map(c => [c.id, freeze(STRATEGIC_EDGES.filter(e => e.a === c.id || e.b === c.id).map(e => e.a === c.id ? e.b : e.a))])));
const holding = (site, kind, controller, food, coins, support, extra = {}) => freeze({ id: site.id, name: site.name, kind, cellId: strategicCellAt(site).id,
  at: freeze({ x: site.x, z: site.z }), sovereignClaim: controller === 'neutral' ? null : controller, controller, localSupport: support, reserves: freeze({ food, coins }), ...extra });
export const STRATEGIC_HOLDINGS = freeze([
  holding(MENORA, 'city', 'empire', 240, 80, 85, { reservedStory: true }),
  holding(whiteBridge, 'bridge', 'empire', 0, 0, 60),
  holding(CARICAS_TOWN, 'town', 'empire', 120, 30, 45),
  ...FARMSTEADS.filter(f => f.region === 'Caricas').map(f => holding(f, 'farm', 'empire', 50, 5, 45)),
  holding(YUNETHRE_CAMP, 'camp', 'yunethre', 200, 35, 90),
  holding(YUNETHRE_TOWN, 'free-town', 'neutral', 80, 30, 75, { neutral: true, reservedStory: true }),
]);
export const STRATEGIC_ARMIES = freeze([
  freeze({ id: 'imperial-field-force', name: 'Imperial field force', faction: 'empire', homeId: MENORA.id, cellId: strategicCellAt(MENORA).id, strength: 100, morale: 85, supplies: 100, unit: 'Generic field-force detachment' }),
  freeze({ id: 'centaur-band', name: 'Centaur band', faction: 'yunethre', homeId: YUNETHRE_CAMP.id, cellId: strategicCellAt(YUNETHRE_CAMP).id, strength: 100, morale: 90, supplies: 100, unit: 'Generic centaur raiding band' }),
]);
export const STRATEGIC_BOUNDS = freeze({ minX: Math.min(...STRATEGIC_CELLS.map(c => c.x)) - 65, maxX: Math.max(...STRATEGIC_CELLS.map(c => c.x)) + 65,
  minZ: Math.min(...STRATEGIC_CELLS.map(c => c.z)) - 65, maxZ: Math.max(...STRATEGIC_CELLS.map(c => c.z)) + 65 });
