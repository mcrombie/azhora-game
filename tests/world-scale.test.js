import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';
import {
  AUTHORED_METRES_PER_HEX, METRES_PER_HEX, WORLD_SCALE, SCALE_ANCHOR, CLUSTERS,
  clusterAt, clusterAtWorld, clusterShift, clusterTable, scalePoint, scaleLength,
  toWorld, toWorldRoad, toWorldIn, toAuthored,
} from '../src/world-scale.js';
import {
  ANCHORS, MAIN_ROAD, SUVAL_ROAD, ONWARD_ROAD, CALOSS, CALOSS_GATE, CALOSS_BANK, FERNWAY_REST,
  AVREL_CLEARING, LUMBER_TOWN, STORY_SITES, VILLAGE, villageToWorld, regionNpcPositions, journeySites,
} from '../src/regions.js';

const near = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;

test('the world is 100 m per authored hex, anchored on Tidehaven and unchanged there', () => {
  assert.equal(AUTHORED_METRES_PER_HEX, 56);
  assert.equal(METRES_PER_HEX, 100);
  assert.ok(near(WORLD_SCALE, 100 / 56));
  assert.deepEqual(SCALE_ANCHOR, { x: 0, z: 29 });
  // The anchor is the fixed point of the whole conversion.
  assert.deepEqual(toWorld(SCALE_ANCHOR.x, SCALE_ANCHOR.z), { x: 0, z: 29 });
  assert.deepEqual(ANCHORS.tidehaven, { x: 0, z: 29 });
  assert.ok(near(scaleLength(56), 100));
  // A point in no cluster scales plainly about the anchor.
  const open = toWorld(-700, 300);
  assert.ok(near(open.x, -700 * WORLD_SCALE) && near(open.z, 29 + 271 * WORLD_SCALE));
  // Invalid input is passed through, never turned into a finite coordinate.
  assert.ok(Number.isNaN(toWorld(Number.NaN, 4).x));
  assert.equal(clusterAt(Number.NaN, 4), null);
});

test('every authored point round-trips through the cluster-aware conversion', () => {
  const samples = [[0, 29], [-15, 29], [-176, 29], [-236, 30], [-345, 92.9], [-306, 104], [-380, 120],
    [-374, 134], [-456, 154], [-386, 182.9], [-401, 196], [-348, 212], [-408, 228], [-427, 259.4],
    [-549.2, 348.1], [-368, 308], [-224, 292], [-154, 328], [-28, 368.5], [-74, 498], [-700, 20], [140, -300]];
  for (const [x, z] of samples) {
    const world = toWorld(x, z), back = toAuthored(world.x, world.z);
    assert.ok(near(back.x, x, 1e-6) && near(back.z, z, 1e-6), `round trip ${x},${z} -> ${world.x},${world.z}`);
  }
});

test('a cluster moves as one piece: every distance inside a place is the one it was authored with', () => {
  for (const entry of CLUSTERS) {
    const shift = clusterShift(entry);
    // Four points spread across the cluster's own ground.
    const inside = [[0, 0], [entry.radius * .4, 0], [0, -entry.radius * .4], [-entry.radius * .3, entry.radius * .3]]
      .map(([dx, dz]) => ({ x: entry.x + dx, z: entry.z + dz }))
      .filter(point => clusterAt(point.x, point.z)?.id === entry.id);
    assert.ok(inside.length >= 2, `${entry.id} owns its own ground`);
    for (const point of inside) {
      const moved = toWorld(point.x, point.z);
      assert.ok(near(moved.x, point.x + shift.x) && near(moved.z, point.z + shift.z), `${entry.id} is rigid`);
    }
    for (let i = 1; i < inside.length; i++) {
      const a = toWorld(inside[i - 1].x, inside[i - 1].z), b = toWorld(inside[i].x, inside[i].z);
      assert.ok(near(Math.hypot(b.x - a.x, b.z - a.z), Math.hypot(inside[i].x - inside[i - 1].x, inside[i].z - inside[i - 1].z)),
        `${entry.id} keeps its internal distances`);
    }
    // The pivot lands exactly where plain scaling would put it, so a place
    // hinged on the road stays on the road.
    const pivot = toWorldIn(entry.id, entry.pivotX, entry.pivotZ), plain = scalePoint(entry.pivotX, entry.pivotZ);
    assert.ok(near(pivot.x, plain.x) && near(pivot.z, plain.z), `${entry.id} hangs from its pivot`);
    assert.equal(clusterAtWorld(entry.x + shift.x, entry.z + shift.z)?.id, entry.id);
  }
  assert.throws(() => toWorldIn('no-such-place', 0, 0), /no-such-place/i);
});

test('Tidehaven does not move: the village, its trail and everything in its frame come out unchanged', () => {
  assert.deepEqual(clusterShift(CLUSTERS.find(entry => entry.id === 'tidehaven')), { x: 0, z: 0 });
  assert.deepEqual(VILLAGE, { x: -20, z: 29, yaw: Math.PI / 2 });
  assert.deepEqual(villageToWorld(0, 43), { x: 23, z: 29 });
  // The whole carried-over settlement, out to the Caloss Gate and its barrier.
  for (const [x, z] of [[0, 29], [-15, 29], [-56, 29], [-86, 29], [-97, 2], [-128, 34], [-138, -31], [-176, 29], [-182, 29]])
    assert.deepEqual(toWorld(x, z), { x, z }, `${x},${z} is inside the village`);
  assert.deepEqual(CALOSS_GATE.x, -176);
  assert.deepEqual(CALOSS_GATE.barrierX, -182);
  assert.deepEqual(FERNWAY_REST.x, -128);
  // The village's own trail is the one road that does not scale.
  for (let i = 0; i <= 12; i++) assert.deepEqual(toWorldRoad(MAIN_ROAD[i].x, MAIN_ROAD[i].z), MAIN_ROAD[i]);
  assert.deepEqual(ONWARD_ROAD[0], { x: -176, z: 29 });
});

test('village-local modules come out of the world untouched by the new scale', async () => {
  const { forestPlaceDefinitions, forestPlacePaths, forestWoodcutter } = await sourceModule('../src/forest-places.js');
  const { FOREST_HIDEOUT } = await sourceModule('../src/forest-hideout-world.js');
  const { PEDDLER } = await sourceModule('../src/economy.js');
  const { VILLAGE_DOG } = await sourceModule('../src/village-dog.js');
  // These modules build in the village's own local metres and must not have
  // been rewritten: converted, every one of their points stays where it was.
  const local = [...forestPlaceDefinitions, ...forestPlacePaths.flat(), forestWoodcutter];
  for (const site of local) {
    const world = villageToWorld(site.x, site.z);
    assert.deepEqual(toWorld(world.x, world.z), world, `${site.id ?? `${site.x},${site.z}`} does not move`);
  }
  // The peddler's stand and the dog's round are already world metres, inside
  // the anchored village: converting them is the identity.
  for (const point of [PEDDLER.stand, ...VILLAGE_DOG.haunts])
    assert.deepEqual(toWorld(point.x, point.z), { x: point.x, z: point.z });
  // The goblin camp keeps its own local frame too; only the frame's origin moved.
  assert.deepEqual(FOREST_HIDEOUT.center, { x: 60, z: -118 });
  assert.deepEqual(FOREST_HIDEOUT.trail[0], { x: 1, z: -117 });
});

test('the route anchors and the places built on them agree exactly', () => {
  // A hex-derived anchor scales plainly; where a cluster is named for one, the
  // two must be the same point, not two points a metre apart.
  assert.deepEqual({ x: CALOSS.crossing.x, z: CALOSS.crossing.z }, { x: ANCHORS.calossCrossing.x, z: ANCHORS.calossCrossing.z });
  for (const [anchor, place] of [[ANCHORS.calossCrossing, toWorld(-345, 92.9)], [ANCHORS.morosGate, STORY_SITES.morosGate],
    [ANCHORS.legionCamp, STORY_SITES.legionCamp], [ANCHORS.elod, STORY_SITES.elodGate], [ANCHORS.lauvelField, STORY_SITES.lauvelField]])
    assert.ok(Math.hypot(anchor.x - place.x, anchor.z - place.z) < .3, `${anchor.x},${anchor.z} and its place agree`);
  // Every route anchor is a plain scaling of the 56 m world's anchor.
  for (const [name, point] of Object.entries(ANCHORS)) {
    const authored = { x: point.x / WORLD_SCALE, z: 29 + (point.z - 29) / WORLD_SCALE };
    assert.ok(Number.isFinite(authored.x) && Number.isFinite(authored.z), name);
  }
});

test('the roads and the places along them are consistent at the new scale', () => {
  // The junction is one point, however the two roads reach it.
  assert.deepEqual(MAIN_ROAD.find(p => Math.hypot(p.x - SUVAL_ROAD[0].x, p.z - SUVAL_ROAD[0].z) < 1e-9), SUVAL_ROAD[0]);
  const length = road => road.reduce((sum, p, i) => i ? sum + Math.hypot(p.x - road[i - 1].x, p.z - road[i - 1].z) : 0, 0);
  // About 1.7 km of main road, as the brief asks for.
  assert.ok(length(MAIN_ROAD) > 1500 && length(MAIN_ROAD) < 1900, `the main road is ${length(MAIN_ROAD).toFixed(0)} m`);
  assert.ok(length(SUVAL_ROAD) > 600, `the Suval branch is ${length(SUVAL_ROAD).toFixed(0)} m`);
  // Places keep their own size: only the ground between them grew.
  assert.equal(AVREL_CLEARING.radius, 38);
  assert.equal(LUMBER_TOWN.radius, 30);
  assert.ok(near(Math.hypot(LUMBER_TOWN.square.x - LUMBER_TOWN.along.x * 16 - LUMBER_TOWN.square.x,
    LUMBER_TOWN.square.z - LUMBER_TOWN.along.z * 16 - LUMBER_TOWN.square.z), 16, 1e-3), 'the town frame is still metres');
  // The fishing bank keeps its place on the water: its cluster hangs from a
  // river vertex, so the cast still lands in the channel.
  const toRiver = point => {
    let best = Infinity;
    for (let i = 1; i < CALOSS.points.length; i++) {
      const a = CALOSS.points[i - 1], b = CALOSS.points[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t));
    }
    return best;
  };
  // The bank's own geometry is what it always was: the stool sits 14 m back
  // from the centre line and the float lands at the water's edge, rather than
  // both being flung 1.79 times further out.
  assert.ok(near(Math.hypot(CALOSS_BANK.cast.x - CALOSS_BANK.spot.x, CALOSS_BANK.cast.z - CALOSS_BANK.spot.z), Math.hypot(6, 10), 1e-9));
  assert.ok(toRiver(CALOSS_BANK.cast) < 11, `the cast lands at the water, ${toRiver(CALOSS_BANK.cast).toFixed(1)} m from the centre line`);
  assert.ok(toRiver(CALOSS_BANK.spot) > toRiver(CALOSS_BANK.cast) && toRiver(CALOSS_BANK.spot) < 16, 'the rod rest still stands on the bank');
});

test('the built world keeps its roads clear of colliders and its arenas standable', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const { FOREST_HIDEOUT_QUEST } = await sourceModule('../src/forest-hideout.js');
  const { LUSCIA_WOLVES } = await sourceModule('../src/luscia-chapter.js');
  const { BORDER_ARENA, borderEncounter } = await sourceModule('../src/border-chapter.js');
  const world = createWorld(new THREE.Scene());
  // Walk each road at a metre a step: no vertex and no span between two
  // vertices may have been scaled into a building or a fence.
  for (const road of [world.paths[0], world.suvalRoute]) for (let i = 1; i < road.length; i++) {
    const a = road[i - 1], b = road[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
    for (let step = 0; step <= steps; step++) {
      const t = step / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      assert.ok(canStand(x, z, world, .5), `the road is blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
  // Every encounter still has room around its centre, and its enemies still sit
  // inside the arena rules combat.startEncounter enforces.
  const arenas = [
    { id: 'goblin camp', ...FOREST_HIDEOUT_QUEST.encounter },
    { id: 'the Lauvel wolves', ...LUSCIA_WOLVES },
    { id: 'the border battle', ...borderEncounter('empire', []), checkpoint: BORDER_ARENA.checkpoint },
    { id: 'the Avrel raid', center: toWorld(-250, 12), checkpoint: toWorld(-236, 22),
      enemies: [toWorld(-253, 8), toWorld(-256, 18)], retreatAxis: 'x' },
  ];
  for (const arena of arenas) {
    // An arena centre is a measuring point, not a standing one — the Avrel raid
    // is fought around the tumbled cart — so only the retreat checkpoint and the
    // spawns have to be walkable.
    assert.ok(canStand(arena.checkpoint.x, arena.checkpoint.z, world, .6), `${arena.id} checkpoint is blocked`);
    for (const enemy of arena.enemies) {
      assert.ok(canStand(enemy.x, enemy.z, world, .6), `${arena.id} spawn ${enemy.id ?? ''} is blocked`);
      const across = arena.retreatAxis === 'z' ? enemy.x - arena.center.x : enemy.z - arena.center.z;
      const along = arena.retreatAxis === 'z' ? enemy.z - arena.center.z : enemy.x - arena.center.x;
      assert.ok(Math.abs(across) <= 12, `${arena.id} spawn is ${across.toFixed(1)} m across the arena`);
      assert.ok(along >= -21 && along <= 18, `${arena.id} spawn is ${along.toFixed(1)} m along the arena`);
    }
  }
  // The people who stand at a place are still beside the thing they belong to.
  const bridge = journeySites['bridge-repair'];
  assert.ok(Math.hypot(regionNpcPositions['crossing-keeper'].x - bridge.x, regionNpcPositions['crossing-keeper'].z - bridge.z) < 22,
    'Hollis still keeps the Caloss bridge');
  assert.ok(Math.hypot(regionNpcPositions['relay-clerk'].x - LUMBER_TOWN.square.x, regionNpcPositions['relay-clerk'].z - LUMBER_TOWN.square.z) < LUMBER_TOWN.radius,
    'Iven still keeps his desk on Lumber Town’s square');
  // The goblin camp moved to Pueth: its side trail leaves the road north of the Tessen and meets the camp's own trail.
  const { HIDEOUT_APPROACH_TRAIL } = await sourceModule('../src/pueth-world.js');
  const distanceToRoad = (point, road) => Math.min(...road.slice(1).map((b, i) => { const a = road[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz))); return Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t); }));
  assert.ok(distanceToRoad(HIDEOUT_APPROACH_TRAIL[0], world.puethRoute) < 1e-6, 'the camp\u2019s side trail is hinged on the road north');
  const trailStart = world.forestHideout.trail[0], trailEnd = HIDEOUT_APPROACH_TRAIL.at(-1);
  assert.ok(Math.hypot(trailStart.x - trailEnd.x, trailStart.z - trailEnd.z) < 1e-6, 'the side trail ends where the camp\u2019s own trail begins');
});

test('the only way over the Caloss is the bridge, and the road leads back to it', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const { nextWaypoint, freeDirection } = await import('../src/autopilot.js');
  const { moveCharacter } = await import('../src/game-state.js');
  const world = createWorld(new THREE.Scene());
  const road = world.paths[0];
  const at = road.reduce((best, point, index) => Math.hypot(point.x - CALOSS.crossing.x, point.z - CALOSS.crossing.z)
    < Math.hypot(road[best].x - CALOSS.crossing.x, road[best].z - CALOSS.crossing.z) ? index : best, 0);
  const deck = road[at], onward = road[at + 1];
  const unit = { x: (onward.x - deck.x) / Math.hypot(onward.x - deck.x, onward.z - deck.z),
    z: (onward.z - deck.z) / Math.hypot(onward.x - deck.x, onward.z - deck.z) };
  // There is no standable ledge of river beside the deck for a traveler to
  // wander onto and be trapped on: the rails reach from the deck's own edge out
  // to where the water blockers resume.
  const rails = world.colliders.filter(collider => collider.kind === 'bridge-rail');
  assert.ok(rails.length > 40, 'the deck has rails along both sides');
  for (const rail of rails) {
    const length = Math.hypot(rail.x - CALOSS.crossing.x, rail.z - CALOSS.crossing.z) || 1;
    const out = { x: (rail.x - CALOSS.crossing.x) / length, z: (rail.z - CALOSS.crossing.z) / length };
    for (const step of [.3, .6]) assert.equal(canStand(rail.x + out.x * step, rail.z + out.z * step, world), false,
      `there is standable ground ${step} m outside a bridge rail at ${rail.x.toFixed(1)}, ${rail.z.toFixed(1)}`);
  }
  // And the driftwood on the far bank can be fetched from the near one: the
  // autopilot follows the road back over the bridge rather than at the water.
  const target = world.journeySites['bridge-debris-1'];
  const position = { x: deck.x + unit.x * 12, z: deck.z + unit.z * 12 };
  assert.ok(canStand(position.x, position.z, world), 'the road just past the bridge is walkable');
  let arrived = false;
  for (let frame = 0; frame < 3000 && !arrived; frame++) {
    if (Math.hypot(position.x - target.x, position.z - target.z) < 1.5) { arrived = true; break; }
    const waypoint = nextWaypoint(position, target, world);
    const direction = freeDirection(position, waypoint.point, world);
    moveCharacter(position, direction.x * .12, direction.z * .12, world);
  }
  assert.ok(arrived, `the autopilot could not fetch driftwood across the Caloss; it stopped at ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`);
});

test('the cluster table names every hand-placed place, and none of them overlap by accident', () => {
  const table = clusterTable();
  assert.equal(table.length, CLUSTERS.length);
  for (const row of table) {
    assert.ok(row.note.length > 10, `${row.id} explains itself`);
    assert.ok(Number.isFinite(row.world.x) && Number.isFinite(row.world.z));
  }
  // Where two clusters overlap, the nearest centre owns the ground; no place may
  // lose its own centre to a neighbour.
  for (const entry of CLUSTERS) assert.equal(clusterAt(entry.x, entry.z)?.id, entry.id, `${entry.id} owns its own centre`);
});
