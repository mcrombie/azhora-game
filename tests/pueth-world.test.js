import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { createCombat } from '../src/combat.js';
import { RIDE } from '../src/riding.js';
import { PLAYABLE_REGIONS, REGION_BIOMES, riverCourses } from '../src/region-layout.js';
import { PLAYABLE_SURVEY } from '../src/region-survey.js';
import { RIVER_EDGES, RIVER_SOURCE } from '../src/region-rivers.js';
import { REGION_CELLS, REGION_OUTLINES, WORLD_BOUNDS, MAIN_ROAD, regionAt, insideRegion, landDistance, worldToVillage } from '../src/region-world.js';
import { villageWeight } from '../src/world-terrain.js';
import { toWorld, toAuthored } from '../src/world-scale.js';
import {
  TESSEN, ORDEL, PUETH_RIVERS, TESSEN_BRIDGE, TESSEN_MOUTH_REACH, TIDEHAVEN_GROUND_REACH, PUETH_ROAD, PUETH_JUNCTION,
  TESSEN_POST, GARRISON_STANDS, RIMEHOLT, RIMEHOLT_STANDS, PUETH_NPC_POSITIONS, PUETH_LANDMARKS, HIDEOUT_APPROACH_TRAIL,
  FERADOM_BARRIER, riverLineDistance,
} from '../src/pueth-world.js';
import { FOREST_HIDEOUT_QUEST, HIDEOUT_GARRISON, createForestHideoutQuest } from '../src/forest-hideout.js';
import { PUETH_NPCS, puethConversation } from '../src/pueth-people.js';
import { createRoadCheckpoint } from '../src/road-checkpoint.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createJourney } from '../src/journey.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());

const segmentDistance = (point, line) => {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t));
  }
  return best;
};
/** A flood over whole metres from one point, inside a box around both: can a walker of `radius` get from `from` to `to`? */
function reachable(from, to, radius = .45, margin = 30) {
  const ox = Math.floor(Math.min(from.x, to.x) - margin), oz = Math.floor(Math.min(from.z, to.z) - margin);
  const w = Math.ceil(Math.max(from.x, to.x) + margin) - ox, h = Math.ceil(Math.max(from.z, to.z) + margin) - oz;
  const seen = new Int8Array(w * h), queue = [];
  const start = Math.round(from.z - oz) * w + Math.round(from.x - ox);
  seen[start] = 1; queue.push(start);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor], ix = index % w, iz = Math.floor(index / w);
    if (Math.hypot(ox + ix - to.x, oz + iz - to.z) < 1.5) return true;
    for (const [nx, nz] of [[ix - 1, iz], [ix + 1, iz], [ix, iz - 1], [ix, iz + 1]]) {
      if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
      const next = nz * w + nx; if (seen[next]) continue;
      seen[next] = canStand(ox + nx, oz + nz, world, radius) ? 1 : -1;
      if (seen[next] === 1) queue.push(next);
    }
  }
  return false;
}
const nearestOnRoad = point => {
  let best = PUETH_ROAD[0], bestDistance = Infinity;
  for (let i = 1; i < PUETH_ROAD.length; i++) {
    const a = PUETH_ROAD[i - 1], b = PUETH_ROAD[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
    const x = a.x + dx * t, z = a.z + dz * t, d = Math.hypot(point.x - x, point.z - z);
    if (d < bestDistance) { bestDistance = d; best = { x, z }; }
  }
  return best;
};

test('Pueth is a playable region true to the atlas: 27 hexes north of Drent, with its own outline, id and colder biome', () => {
  assert.ok(PLAYABLE_REGIONS.includes('Pueth'));
  const cells = REGION_CELLS.Pueth, counts = {};
  for (const cell of cells) counts[cell.terrain] = (counts[cell.terrain] ?? 0) + 1;
  assert.equal(cells.length, 27);
  assert.deepEqual(counts, { grassland: 15, hills: 7, plains: 5 });
  const region = world.regions.find(entry => entry.name === 'Pueth');
  assert.ok(region && Number.isInteger(region.id) && !world.regions.some(entry => entry !== region && entry.id === region.id));
  for (const cell of cells) {
    assert.equal(regionAt(cell.x, cell.z).name, 'Pueth', `hex ${cell.q},${cell.r} belongs to Pueth`);
    assert.ok(insideRegion('Pueth', cell.x, cell.z));
  }
  const centre = list => list.reduce((sum, cell) => ({ x: sum.x + cell.x / list.length, z: sum.z + cell.z / list.length }), { x: 0, z: 0 });
  assert.ok(centre(cells).z < centre(REGION_CELLS.Drent).z - 200, 'Pueth lies north of Drent');
  for (const loop of REGION_OUTLINES.Pueth) for (const p of loop)
    assert.ok(p.x > WORLD_BOUNDS.minX && p.x < WORLD_BOUNDS.maxX && p.z > WORLD_BOUNDS.minZ && p.z < WORLD_BOUNDS.maxZ, 'the world bounds hold all of Pueth');
  assert.equal(regionAt(region.spawn.x, region.spawn.z).name, 'Pueth');
  // Colder and barer than Drent: a paler, greyer ground, and far fewer trees per hectare.
  const hsl = hex => new THREE.Color(hex).getHSL({});
  assert.ok(hsl(REGION_BIOMES.Pueth.ground).s < hsl(REGION_BIOMES.Drent.ground).s && hsl(REGION_BIOMES.Pueth.ground).l > hsl(REGION_BIOMES.Drent.ground).l);
  assert.ok(world.puethMetrics.birches > 0 && world.puethMetrics.firs > 0, 'Pueth grows birch and fir');
  assert.ok(world.puethMetrics.trees / cells.length < world.regionMetrics.trees / REGION_CELLS.Drent.length * .5, 'Pueth is barer than Drent');
});

test('the rivers are the map’s: every authored river edge on Pueth is built as water, and nothing else in Pueth is', () => {
  assert.equal(RIVER_SOURCE.edgeCount, RIVER_EDGES.length);
  assert.ok(RIVER_EDGES.every(edge => edge.regions.includes('Pueth')));
  // The map gives Pueth two rivers: one on the Drent border and one on the Feradom border.
  const raw = riverCourses(PLAYABLE_SURVEY, RIVER_EDGES, undefined, { soften: 0 });
  assert.equal(raw.length, 2);
  assert.deepEqual(PUETH_RIVERS.map(river => river.name), ['The Tessen', 'The Ordel']);
  assert.ok(TESSEN.regions.includes('Drent') && TESSEN.regions.includes('Pueth'));
  assert.ok(ORDEL.regions.includes('Feradom') && ORDEL.regions.includes('Pueth'));
  // Every authored edge lies under its built river (softening moves a corner at most a quarter of a 58 m edge).
  for (const course of raw) {
    const river = PUETH_RIVERS.find(candidate => candidate.edges.includes(course.edges[0]));
    assert.ok(river, 'each authored course is one built river');
    for (let i = 1; i < course.points.length; i++) {
      const mid = { x: (course.points[i - 1].x + course.points[i].x) / 2, z: (course.points[i - 1].z + course.points[i].z) / 2 };
      const local = worldToVillage(mid.x, mid.z);
      const inTidehaven = Math.abs(local.x) < TIDEHAVEN_GROUND_REACH;
      if (river === TESSEN && inTidehaven) {
        // The one reach the map runs through Tidehaven's carried-over ground: the built river turns to the sea at its edge instead.
        assert.ok(riverLineDistance(river, mid.x, mid.z) > 20, 'the Tessen does not cut through Tidehaven');
        continue;
      }
      assert.ok(riverLineDistance(river, mid.x, mid.z) < 16, `${river.name} follows the authored edge at ${mid.x.toFixed(0)},${mid.z.toFixed(0)}`);
    }
  }
  // Where the built Tessen leaves the map's line, it runs only its short reach to the Stills, clear of Tidehaven's ground.
  for (const sample of TESSEN.samples) {
    const local = worldToVillage(sample.x, sample.z);
    assert.ok(villageWeight(local.x, local.z) < .15, `the Tessen stays out of Tidehaven’s ground at ${sample.x.toFixed(0)},${sample.z.toFixed(0)}`);
    if (segmentDistance(sample, TESSEN.mapLine) > 16) assert.ok(segmentDistance(sample, [TESSEN.points.find(p => segmentDistance(p, TESSEN.mapLine) <= 16 && p.x > -10) ?? TESSEN_MOUTH_REACH[0], ...TESSEN_MOUTH_REACH]) < 16);
  }
  assert.ok(landDistance(TESSEN.points.at(-1).x, TESSEN.points.at(-1).z) < 0, 'the Tessen reaches the sea');
  assert.equal(villageWeight(TIDEHAVEN_GROUND_REACH, 0), 0, 'the reach constant agrees with Tidehaven’s height field');
  assert.ok(villageWeight(TIDEHAVEN_GROUND_REACH - 2, 0) > 0);
  // Water blocks the channel, and only the channel: every river collider in Pueth hugs a Pueth river.
  const water = world.colliders.filter(collider => collider.kind === 'river-water');
  const puethWater = water.filter(collider => collider.river);
  assert.ok(puethWater.length > 100);
  for (const collider of puethWater) {
    const river = PUETH_RIVERS.find(candidate => candidate.id === collider.river);
    assert.ok(riverLineDistance(river, collider.x, collider.z) < river.halfWidth + 2.6, `${collider.river} water at ${collider.x.toFixed(1)},${collider.z.toFixed(1)} is in its channel`);
  }
  for (const collider of water.filter(c => !c.river)) assert.notEqual(regionAt(collider.x, collider.z).name, 'Pueth', 'the Caloss never reaches Pueth');
  // The charts read the same water.
  for (const id of ['tessen-water', 'ordel-water']) assert.ok(world.mapWaters.some(entry => entry.id === id && entry.points.length > 40), `${id} is charted`);
});

test('the Tessen bridge carries the road north over the water, rideable end to end, and the river is crossed nowhere else', () => {
  const b = TESSEN_BRIDGE;
  assert.ok(riverLineDistance(TESSEN, b.crossing.x, b.crossing.z) < .01, 'the bridge stands on the river');
  assert.ok(regionAt(b.south.x, b.south.z).name === 'Drent' && regionAt(b.north.x - 1, b.north.z - 3).name === 'Pueth', 'Drent on the south bank, Pueth on the north');
  const road = world.puethRoute;
  assert.ok(road.some(p => Math.hypot(p.x - b.south.x, p.z - b.south.z) < 1e-9) && road.some(p => Math.hypot(p.x - b.north.x, p.z - b.north.z) < 1e-9), 'the deck’s ends are road vertices');
  // The whole road north, a metre at a time, at a mount's footprint.
  for (let i = 1; i < road.length; i++) {
    const a = road[i - 1], c = road[i], steps = Math.max(1, Math.ceil(Math.hypot(c.x - a.x, c.z - a.z)));
    for (let step = 0; step <= steps; step++) {
      const t = step / steps, x = a.x + (c.x - a.x) * t, z = a.z + (c.z - a.z) * t;
      assert.ok(canStand(x, z, world, RIDE.radius), `a rider is stopped on the road north at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
  // Across the deck on foot and on horseback, both ways, and the deck is what carries you.
  for (const radius of [.34, RIDE.radius]) for (const [from, to] of [[road[PUETH_ROAD.indexOf(b.south) - 1], road[PUETH_ROAD.indexOf(b.north) + 1]], [road[PUETH_ROAD.indexOf(b.north) + 1], road[PUETH_ROAD.indexOf(b.south) - 1]]]) {
    const p = { x: from.x, z: from.z };
    for (let i = 0; i < 400 && Math.hypot(p.x - to.x, p.z - to.z) > .3; i++) {
      const dx = to.x - p.x, dz = to.z - p.z, d = Math.hypot(dx, dz), stepLength = Math.min(.2, d);
      moveCharacter(p, dx / d * stepLength, dz / d * stepLength, world, radius);
    }
    assert.ok(Math.hypot(p.x - to.x, p.z - to.z) <= .3, `the bridge could not be crossed at radius ${radius}`);
  }
  const deck = world.heightAt(b.crossing.x, b.crossing.z);
  assert.ok(deck > world.heightAt(b.crossing.x + 6, b.crossing.z) + 1, 'the deck stands above the channel');
  // Rails over the water leave no standable ledge beside the deck, and the Tessen is water from source to sea.
  const rails = world.colliders.filter(collider => collider.kind === 'bridge-rail' && collider.bridge === b.id);
  assert.ok(rails.length >= 10);
  for (const rail of rails) {
    const out = Math.sign(rail.x - b.crossing.x) || 1;
    for (const step of [.3, .6]) assert.equal(canStand(rail.x + out * step, rail.z, world), false, `standable river beside the rail at ${rail.x.toFixed(1)},${rail.z.toFixed(1)}`);
  }
  let blocked = 0, sampled = 0;
  for (const river of PUETH_RIVERS) for (const sample of river.samples) {
    if (Math.hypot(sample.x - b.crossing.x, sample.z - b.crossing.z) < 12 || landDistance(sample.x, sample.z) < 2) continue;
    sampled++; if (!canStand(sample.x, sample.z, world)) blocked++;
  }
  assert.equal(blocked, sampled, 'no ford: the rivers are water everywhere but the bridge');
});

test('the road north leaves the main road past the Caloss Gate, clear of Tidehaven, and ends at the Legion’s Feradom barrier', () => {
  assert.ok(segmentDistance(PUETH_JUNCTION, MAIN_ROAD) < 1e-6, 'the junction is on the main road');
  assert.ok(Math.hypot(PUETH_JUNCTION.x, PUETH_JUNCTION.z - 29) > 190, 'the junction is outside the rigid Tidehaven ground');
  assert.deepEqual(toWorld(-176, 29), { x: -176, z: 29 }, 'the Caloss Gate has not moved');
  for (const point of PUETH_ROAD) assert.ok(['Drent', 'Pueth'].includes(regionAt(point.x, point.z).name));
  assert.equal(regionAt(PUETH_ROAD.at(-1).x, PUETH_ROAD.at(-1).z).name, 'Pueth');
  assert.ok(Math.hypot(PUETH_ROAD.at(-1).x - FERADOM_BARRIER.x, PUETH_ROAD.at(-1).z - FERADOM_BARRIER.z) < 6);
  assert.equal(canStand(FERADOM_BARRIER.x, FERADOM_BARRIER.z, world), false, 'the barrier closes the road north');
  // No bend a cart could not take.
  for (let i = 1; i < PUETH_ROAD.length - 1; i++) {
    const a = PUETH_ROAD[i - 1], p = PUETH_ROAD[i], c = PUETH_ROAD[i + 1];
    const turn = Math.abs(Math.atan2(Math.sin(Math.atan2(c.x - p.x, c.z - p.z) - Math.atan2(p.x - a.x, p.z - a.z)), Math.cos(Math.atan2(c.x - p.x, c.z - p.z) - Math.atan2(p.x - a.x, p.z - a.z))));
    assert.ok(turn < Math.PI / 5, `the road turns ${(turn * 180 / Math.PI).toFixed(0)}° at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
  }
  for (const place of [TESSEN_POST.yard, RIMEHOLT.square]) assert.ok(segmentDistance(place, PUETH_ROAD) < 20);
  assert.ok(world.paths.some(path => path.length === PUETH_ROAD.length && path.every((p, i) => p.x === PUETH_ROAD[i].x && p.z === PUETH_ROAD[i].z)), 'the road is drawn and charted');
  assert.deepEqual(world.paths[0], MAIN_ROAD.map(p => ({ x: p.x, z: p.z })), 'the main road is still the first path');
});

test('everyone Pueth places stands on reachable ground, at least 4 m from anyone else a quest puts on the map', () => {
  const others = Object.entries(world.npcPositions);
  const questPoints = [FOREST_HIDEOUT_QUEST.approach, FOREST_HIDEOUT_QUEST.supplies, ...world.fishingSpots.map(spot => spot.fishingSpot), ...Object.values(world.journeySites)];
  assert.deepEqual(Object.keys(GARRISON_STANDS).sort(), HIDEOUT_GARRISON.map(soldier => soldier.id).sort());
  assert.deepEqual(Object.keys(RIMEHOLT_STANDS).sort(), PUETH_NPCS.map(npc => npc.id).sort());
  for (const [id, stand] of Object.entries(PUETH_NPC_POSITIONS)) {
    assert.deepEqual(world.npcPositions[id], stand, `${id} stands where Pueth puts them`);
    assert.ok(canStand(stand.x, stand.z, world, .45), `${id} has footing`);
    assert.equal(regionAt(stand.x, stand.z).name, 'Pueth');
    for (const [other, place] of others) if (other !== id) assert.ok(Math.hypot(place.x - stand.x, place.z - stand.z) >= 4, `${id} is crowded by ${other}`);
    for (const place of questPoints) assert.ok(Math.hypot(place.x - stand.x, place.z - stand.z) >= 4, `${id} stands on a quest point`);
    assert.ok(reachable(nearestOnRoad(stand), stand), `${id} can be reached from the road`);
  }
  for (const soldier of HIDEOUT_GARRISON) assert.ok(Math.hypot(GARRISON_STANDS[soldier.id].x - TESSEN_POST.yard.x, GARRISON_STANDS[soldier.id].z - TESSEN_POST.yard.z) < 25, `${soldier.name} keeps the Tessen post`);
  for (const id of Object.keys(RIMEHOLT_STANDS)) assert.ok(Math.hypot(RIMEHOLT_STANDS[id].x - RIMEHOLT.square.x, RIMEHOLT_STANDS[id].z - RIMEHOLT.square.z) < RIMEHOLT.radius);
  // The post's yard is entered by its gate, and Rimeholt by its two.
  assert.ok(reachable(nearestOnRoad(TESSEN_POST.gate), { x: TESSEN_POST.yard.x - 2, z: TESSEN_POST.yard.z + 3 }), 'the post yard can be entered');
  for (const landmark of PUETH_LANDMARKS) assert.equal(regionAt(landmark.x, landmark.z).name, landmark.id === 'tessen-bridge' ? regionAt(landmark.x, landmark.z).name : 'Pueth', `${landmark.name} is in Pueth`);
  // Rimeholt's people talk, plainly, and nobody there hands out a quest.
  for (const npc of PUETH_NPCS) {
    const screens = [];
    assert.equal(puethConversation(npc, { openDialogue: (who, lines, event, label, options) => screens.push({ lines, options }), closeDialogue: () => {} }), true);
    assert.ok(screens[0].lines.length >= 2 && screens[0].options.choices.length === 1, `${npc.name} has a few lines and a goodbye`);
  }
  assert.match(PUETH_NPCS.find(npc => npc.id === 'rimeholt-sentry').modelRole, /legion/);
  assert.ok(PUETH_NPCS.filter(npc => /legion/.test(npc.modelRole)).every(npc => /Legionary/.test(npc.name)), 'only the Legion wears Legion armour');
});

test('the Bramble Scout Camp stands in the woods north of the Tessen, its fight valid and its retreat back toward the road', () => {
  const encounter = FOREST_HIDEOUT_QUEST.encounter;
  assert.equal(regionAt(encounter.center.x, encounter.center.z).name, 'Pueth');
  const fromRoad = segmentDistance(encounter.center, PUETH_ROAD);
  assert.ok(fromRoad >= 150 && fromRoad <= 300, `the camp is ${fromRoad.toFixed(0)} m off the road`);
  assert.ok(riverLineDistance(TESSEN, encounter.center.x, encounter.center.z) > 60, 'the camp is clear of the river');
  assert.ok(segmentDistance(HIDEOUT_APPROACH_TRAIL[0], PUETH_ROAD) < 1e-6 && regionAt(HIDEOUT_APPROACH_TRAIL[0].x, HIDEOUT_APPROACH_TRAIL[0].z).name === 'Pueth', 'the side trail leaves the road north of the river');
  for (const point of HIDEOUT_APPROACH_TRAIL) assert.equal(regionAt(point.x, point.z).name, 'Pueth');
  const retreatAxis = encounter.retreatAxis, across = retreatAxis === 'x' ? 'z' : 'x';
  assert.ok(['x', 'z'].includes(retreatAxis) && encounter.retreatLine > encounter.center[retreatAxis] && encounter.checkpoint[retreatAxis] < encounter.retreatLine);
  // Out past the retreat line is the way back down the trail, toward the road.
  const beyond = { ...encounter.checkpoint, [retreatAxis]: encounter.retreatLine + 2 };
  assert.ok(canStand(beyond.x, beyond.z, world, .45), 'the way out of the fight is open');
  assert.ok(world.forestHideout.trail[0][retreatAxis] > encounter.retreatLine, 'falling back crosses the line toward the trail that leads to the road');
  // Valid under combat.startEncounter's rules, alone and with the garrison beside the traveler at the approach.
  const position = { x: encounter.checkpoint.x, y: 0, z: encounter.checkpoint.z };
  assert.equal(createCombat({ world, position }).startEncounter(encounter), true, 'the fight starts alone');
  const allies = HIDEOUT_GARRISON.map((soldier, index) => {
    const at = { x: encounter.checkpoint.x + (index - 1) * 1.5, z: encounter.checkpoint.z + 2.5 };
    return { id: soldier.id, name: soldier.name, kind: soldier.kind,
      [retreatAxis]: Math.max(encounter.center[retreatAxis] - 20, Math.min(encounter.retreatLine - 1, at[retreatAxis])),
      [across]: Math.max(encounter.center[across] - 11, Math.min(encounter.center[across] + 11, at[across])) };
  });
  assert.equal(createCombat({ world, position }).startEncounter({ ...encounter, allies }), true, 'the fight starts with the garrison');
  for (const point of [encounter.checkpoint, ...encounter.enemies, ...allies, FOREST_HIDEOUT_QUEST.supplies]) assert.ok(canStand(point.x, point.z, world, .45), `camp point ${point.x.toFixed(1)},${point.z.toFixed(1)} has footing`);
  assert.ok(reachable(HIDEOUT_APPROACH_TRAIL[0], FOREST_HIDEOUT_QUEST.approach, .45, 40), 'the camp can be walked to from the road');
  // Drent is level 0: nothing of the fight is south of the river.
  for (const point of [encounter.center, encounter.checkpoint, beyond, ...encounter.enemies]) assert.equal(regionAt(point.x, point.z).name, 'Pueth');
});

test('old saves keep the camp as they left it: scouted, accepted or cleared in Luscia, the quest carries on at the Tessen', () => {
  const save = () => {
    const inventory = createInventoryState();
    for (const id of ['simple-sword', 'harbor-letter', 'road-token']) inventory.grant(id);
    const weapons = createWeapons({ inventory }), journey = createJourney({ inventory, weapons });
    journey.start();
    const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    return { checkpoint: createRoadCheckpoint({ storage }), data: { version: 1, questStage: 10, journey: journey.snapshot(),
      inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })), weapons: weapons.snapshot(),
      journeyGathered: [], meadowCleared: false, heardDoom: false, lysaComplete: false, health: 100 } };
  };
  const paidQuest = createForestHideoutQuest({ inventory: { add: () => true } });
  paidQuest.inspect(); paidQuest.begin({ questStage: 10 }); paidQuest.markCleared('forest-hideout'); paidQuest.recover(); paidQuest.turnIn();
  const acceptedQuest = createForestHideoutQuest({ inventory: { add: () => true } });
  acceptedQuest.inspect(); acceptedQuest.begin({ questStage: 10 }); acceptedQuest.endEncounter('forest-hideout');
  const scoutedQuest = createForestHideoutQuest({ inventory: { add: () => true } }); scoutedQuest.inspect();
  // Saves standing in the old camp in north Luscia: one from the 56 m world, two taken since the world grew.
  const oldCamp = { x: -456, z: 154 }, oldCampWorld = toWorld(oldCamp.x, oldCamp.z);
  for (const [label, position, worldScale, snapshot] of [
    ['a 56 m save with the camp cleared and paid', oldCamp, undefined, paidQuest.snapshot()],
    ['a 100 m save with the camp accepted but unfinished', oldCampWorld, 100, acceptedQuest.snapshot()],
    ['a 100 m save with the camp only scouted', oldCampWorld, 100, scoutedQuest.snapshot()],
  ]) {
    const { checkpoint, data } = save();
    const written = checkpoint.save({ ...data, ...(worldScale ? { worldScale } : {}), position, forestHideout: snapshot });
    assert.equal(written.ok, true, `${label} was refused: ${written.reason}`);
    const read = checkpoint.read();
    assert.equal(read.ok, true, `${label} did not load: ${read.reason}`);
    assert.deepEqual(read.data.forestHideout, snapshot, `${label} keeps its camp`);
    assert.equal(regionAt(read.data.position.x, read.data.position.z).name, 'Luscia', `${label} resumes in Luscia\u2019s woods`);
    assert.ok(Math.hypot(read.data.position.x - oldCampWorld.x, read.data.position.z - oldCampWorld.z) < 1e-6);
    const restored = createForestHideoutQuest({ inventory: { add: () => true } });
    assert.equal(restored.restore(read.data.forestHideout), true);
    if (snapshot.returned) {
      assert.equal(restored.turnIn().ok, false, 'a paid camp is never paid twice');
      assert.equal(restored.view().stage, 'complete');
    } else {
      assert.deepEqual(restored.view().destinationIds, ['bramble-scout-camp']);
      const destination = world.landmarks.find(place => place.id === 'bramble-scout-camp');
      assert.equal(regionAt(destination.x, destination.z).name, 'Pueth', 'an unfinished camp points at its new site');
    }
  }
  assert.deepEqual(toAuthored(oldCampWorld.x, oldCampWorld.z), oldCamp, 'the old camp ground still converts both ways');
});

test('src/region-rivers.js is the World Builder map\u2019s river edges, regenerated and never edited by hand', async t => {
  const { readFileSync } = await import('node:fs');
  const { readMap, buildSource } = await import('../scripts/build-region-rivers.mjs');
  const source = readMap();
  if (!source) { t.skip('the World Builder map is not checked out beside this repository'); return; }
  const shipped = readFileSync(new URL('../src/region-rivers.js', import.meta.url), 'utf8');
  assert.equal(shipped, buildSource(source), 'src/region-rivers.js is stale: run `node scripts/build-region-rivers.mjs`');
});
