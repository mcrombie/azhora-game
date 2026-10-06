/**
 * The Empire's garrison of Varn and of the three forts on the Lotharn passes: men-at-arms on the wall-walks,
 * the towers and the gates (the user, 2 October 2026: "garrison the walls").
 *
 * They are **wall figures** (src/world/life/town-life.js, `WALL_FIGURES`): drawn and animated, never spoken to, shown
 * within ninety-five metres, the way the army's outpost, Elod's frontier and Feradom's pass castles are
 * manned. The build is the Empire's own `legion-soldier` - a man-at-arms in mail and plate under the red
 * tabard (src/content/characters/characters.js), medieval and never Roman - and one `legion-officer` on each keep. Most stand;
 * a few walk a stretch of wall-walk between two towers (`walk`), back and forth. The two inside each gate
 * stand on the ground (`ground`), as Elod's man behind its gate does. Nobody has a name, nobody has a line,
 * and none of them does anything toward the traveler that a wall figure does not already do.
 *
 * Where each stands is the masonry's own geometry (src/world/scenery/imperial-masonry.js): a tower's platform is
 * `towerPlatform` over the floor inside it (a gate's two stand `gateRise` taller, Varn's Pass Gate's another
 * 1.2), the wall walk is `walkHeight` over the wall's footing, a gate's gallery floor is the wall's height and
 * its rise less a metre, a keep's battlements are its height, and the jambs' turrets are 7.15 m over the rock
 * they stand on. `base(gy, x, z)` gives the floor a figure's structure stands on where that is not the ground
 * under the figure itself. Pure: no three, no DOM.
 */
import { VARN_CIRCUIT, VARN_STANDARD, VARN_PASS_GATE, VARN_AMOD_GATE, VARN_KEEP, VARN_WATCHES, varnWicket } from './varn-world.js';
import { LOTHARN_FORTS, PASS_FORT_STANDARD } from '../west-lotharn/lotharn-forts.js';

const freeze = Object.freeze;
const SOLDIER = 'legion-soldier', OFFICER = 'legion-officer';
/** How a sentry walks his stretch of wall, in metres a second. */
export const PATROL_PACE = 1.05;

const figure = (id, role, spot, lift, yaw, extra = {}) => freeze({ id, role, x: spot.x, z: spot.z, lift, yaw, ...extra });
const facing = (dir) => Math.atan2(dir.x, dir.z);
/** The floor a circuit's tower stands on: the lowest ground just inside it, as the masonry finds it. */
const towerFloor = (circuit, S, tower) => gy => {
  const edge = circuit.edges[tower.edge], inward = { x: -edge.out.x, z: -edge.out.z }, h = S.towerSize / 2 + .6;
  return Math.min(gy(tower.x + inward.x * h, tower.z + inward.z * h), gy(tower.x + inward.x * h + edge.dir.x * 2, tower.z + inward.z * h + edge.dir.z * 2),
    gy(tower.x + inward.x * h - edge.dir.x * 2, tower.z + inward.z * h - edge.dir.z * 2));
};
/**
 * The footing of the wall under a point on an edge: the lowest of the ground under the wall and a little
 * inside it, at the middle of the piece of wall the point is on, as the masonry lays its pieces (four metres
 * and a bit, from the run's start) - so a man walking the walk stays on the step he is on.
 */
const wallFooting = (circuit, S, edge) => (gy, x, z) => {
  const along = (x - edge.a.x) * edge.dir.x + (z - edge.a.z) * edge.dir.z;
  const run = circuit.runs.find(one => one.edge === edge.index && along >= one.from - 1e-6 && along <= one.to + 1e-6) ?? circuit.runs.find(one => one.edge === edge.index);
  const length = run.to - run.from, pieces = Math.max(1, Math.ceil(length / 4.2)), k = Math.min(pieces - 1, Math.max(0, Math.floor((along - run.from) / length * pieces)));
  const mid = run.from + length * (k + .5) / pieces;
  const inner = circuit.pointOn(edge, mid, -S.wallThickness / 2 - .6), centre = circuit.pointOn(edge, mid, 0);
  return Math.min(gy(inner.x, inner.z), gy(centre.x, centre.z));
};
/** A sentry on a tower's platform, looking `yaw`. */
function onTower(id, circuit, S, towerId, yaw, { tall = 0, role = SOLDIER } = {}) {
  const tower = circuit.towers.find(one => one.id === towerId);
  return figure(id, role, tower, S.towerPlatform + tall + .2, yaw, { base: towerFloor(circuit, S, tower) });
}
/** A sentry on the wall walk, `along` an edge, a quarter metre inside the wall line; with `to`, he walks to there and back. */
function onWalk(id, circuit, S, edgeIndex, along, { to = null, face = null } = {}) {
  const edge = circuit.edges[edgeIndex], spot = circuit.pointOn(edge, along, -.25);
  const extra = { base: wallFooting(circuit, S, edge) };
  if (to !== null) { const there = circuit.pointOn(edge, to, -.25); extra.walk = freeze({ x: there.x, z: there.z, pace: PATROL_PACE }); }
  return figure(id, SOLDIER, spot, S.walkHeight + .07, face ?? facing(edge.out), extra);
}
/** A sentry on the gallery over a gate, looking out. */
const onGallery = (id, circuit, S, gate, rise) => figure(id, SOLDIER, gate.centre, S.wallHeight + rise - .99, facing({ x: -gate.inward.x, z: -gate.inward.z }));
/** A man on the ground inside a gate, `across` metres along the wall from its centre, facing the gate. */
const insideGate = (id, circuit, S, gate, across) => {
  const back = S.wallThickness / 2 + 2.2;
  return figure(id, SOLDIER, { x: gate.centre.x + gate.inward.x * back + gate.along.x * across, z: gate.centre.z + gate.inward.z * back + gate.along.z * across }, 0,
    facing({ x: -gate.inward.x, z: -gate.inward.z }), { ground: true });
};

// ---------------------------------------------------------------------------
// Varn: fifteen
// ---------------------------------------------------------------------------
const V = VARN_STANDARD, C = VARN_CIRCUIT;
const passGate = C.gates.find(gate => gate.id === VARN_PASS_GATE), amodGate = C.gates.find(gate => gate.id === VARN_AMOD_GATE);
const north = Math.PI, south = 0;
export const VARN_GARRISON = freeze([
  // The Pass Gate: a man on each of its towers and one on the gallery between them, all looking up the pass.
  onTower('varn-pass-tower-a', C, V, `${VARN_PASS_GATE}-tower-a`, north, { tall: 2.2 + 1.2 }),
  onTower('varn-pass-tower-b', C, V, `${VARN_PASS_GATE}-tower-b`, north, { tall: 2.2 + 1.2 }),
  onGallery('varn-pass-gallery', C, V, passGate, 2.2),
  // Two on the ground inside it, either side of the shut leaves.
  insideGate('varn-pass-ground-a', C, V, passGate, -3.4),
  insideGate('varn-pass-ground-b', C, V, passGate, 3.4),
  // The pass front's wall-walk, walked: from the north-west corner tower to the first wall tower, and from the gate's east tower to the next.
  onWalk('varn-pass-walk-west', C, V, 0, 4.5, { to: 17.8 }),
  onWalk('varn-pass-walk-east', C, V, 0, 58.3, { to: 72.8 }),
  // The long sides: a man on the tower in the middle of each, looking along the wall toward the pass.
  onTower('varn-east-tower', C, V, 'varn-wall-1-30', north),
  onTower('varn-west-tower', C, V, 'varn-wall-5-30', north),
  // The Amod Gate: a man on each tower looking down the road, and one on the ground inside, at the wicket.
  onTower('varn-amod-tower-a', C, V, `${VARN_AMOD_GATE}-tower-a`, south, { tall: 2.2 }),
  onTower('varn-amod-tower-b', C, V, `${VARN_AMOD_GATE}-tower-b`, south, { tall: 2.2 }),
  insideGate('varn-amod-wicket', C, V, amodGate, varnWicket().side * (amodGate.halfWidth - 1.3)),
  // The castellan's officer on the keep's battlements, over the Pass Gate.
  figure('varn-keep', OFFICER, { x: VARN_KEEP.x + VARN_KEEP.size / 2 - .8, z: VARN_KEEP.z }, VARN_KEEP.height + .29, north),
  // The watch on each jamb's turret, by its beacon.
  ...VARN_WATCHES.map(watch => figure(`varn-${watch.jamb}-watch`, SOLDIER, { x: watch.x - 1.4, z: watch.z + 1.4 }, 7.15, north)),
]);

// ---------------------------------------------------------------------------
// The forts: four each, and a fifth who walks the Vastos Gate's wall
// ---------------------------------------------------------------------------
const F = PASS_FORT_STANDARD;
export const FORT_GARRISONS = freeze(LOTHARN_FORTS.flatMap(fort => {
  const circuit = fort.circuit, gate = circuit.gates[0], out = facing({ x: -fort.inward.x, z: -fort.inward.z });
  const men = [
    onTower(`${fort.id}-tower-a`, circuit, F, `${fort.gateId}-tower-a`, out, { tall: 1.8 }),
    onTower(`${fort.id}-tower-b`, circuit, F, `${fort.gateId}-tower-b`, out, { tall: 1.8 }),
    insideGate(`${fort.id}-ground`, circuit, F, gate, -3.2),
    figure(`${fort.id}-keep`, OFFICER, { x: fort.keep.x, z: fort.keep.z + fort.keep.size / 2 - .8 }, fort.keep.height + .29, out),
  ];
  // The Vastos Gate is the long wall: one man walks the stretch between the gate's western tower and the tower before it.
  if (fort.id === 'fort-vastos') {
    const towerHalf = F.towerSize / 2, west = gate.at - gate.halfWidth - F.towerSize, before = circuit.towers.filter(t => t.at < west - 1).sort((p, q) => q.at - p.at)[0];
    men.push(onWalk(`${fort.id}-walk`, circuit, F, 0, before.at + towerHalf + 1.2, { to: west - 1.2 }));
  }
  return men;
}));

/** Every figure of the Empire's garrison on the Lotharn, for src/town-life.js. */
export const LOTHARN_GARRISON_FIGURES = freeze([...VARN_GARRISON, ...FORT_GARRISONS]);
/** Who stands where, for the report and the tests: a count by place and by what they stand on. */
export function garrisonSummary() {
  const by = (figures) => ({ count: figures.length, towers: figures.filter(f => /tower|watch/.test(f.id)).length, walls: figures.filter(f => f.walk || /gallery/.test(f.id)).length,
    ground: figures.filter(f => f.ground).length, keeps: figures.filter(f => /keep/.test(f.id)).length, walking: figures.filter(f => f.walk).length });
  return { varn: by(VARN_GARRISON), ...Object.fromEntries(LOTHARN_FORTS.map(fort => [fort.id, by(FORT_GARRISONS.filter(f => f.id.startsWith(fort.id)))])), total: LOTHARN_GARRISON_FIGURES.length };
}
