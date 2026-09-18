import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AMOD_ROAD, AMOD_JUNCTION, AMOD_BORDER, AMOD_LANDMARKS, AMOD_SIGNS, AMOD_CLEARINGS, AMOD_NPC_POSITIONS,
  AMOD_BORDER_HEXES, OSTEL, ostelPoint, OSTEL_BUILDINGS, OSTEL_STANDS, OSTEL_SPRING, OSTEL_STONE_YARD,
  TARVEL, TARVEL_BRIDGE, DROMEL_CHANNEL, DROMEL_GATE, TARVEL_HEAD, VESSEN, TIR_OSTEL, TOLL_STONE, OGRE_STAND,
  KELMOD_ROAD_END, tarvelDistance,
} from '../src/amod-world.js';
import { PUETH_ROAD } from '../src/pueth-world.js';
import { regionNameAt, hexAt, hexCentre, REGION_IDS, WORLD_BOUNDS, regions } from '../src/region-world.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/region-layout.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { BUILD_STATUS } from '../src/build-status.js';
import { sourceModule } from './module-loader.js';
import {
  AMOD_TERRACE_GROUND, AMOD_ROAD_PROFILE, TARVEL_PROFILE, DROMEL_PROFILE, TARVEL_DECK_Y,
  TERRACE_RISE, terraceHeight, terraceLevel, amodShaping, amodGround, amodTerracedGround, amodNaturalGround,
} from '../src/amod-terraces.js';
import { groundWithRiver } from '../src/world-terrain.js';

// signs.js draws its own lettering atlas, so it needs three: load it the way the other tests do.
const { SIGN_LABELS } = await sourceModule('../src/signs.js');

const roadDistance = (x, z) => {
  let best = Infinity;
  for (let i = 1; i < AMOD_ROAD.length; i++) {
    const a = AMOD_ROAD[i - 1], b = AMOD_ROAD[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
};

test('Amod is a playable region of the atlas, entered from western Pueth over a three-hex border', () => {
  assert.ok(PLAYABLE_REGIONS.includes('Amod'));
  assert.equal(REGION_IDS.Amod, 8);
  assert.ok(REGION_BIOMES.Amod.ownScatter, 'Amod scatters its own slopes');
  const region = regions.find(entry => entry.name === 'Amod');
  assert.ok(region && region.outline.length, 'the region takes its outline from the authored hexes');
  assert.equal(regionNameAt(region.spawn.x, region.spawn.z), 'Amod', 'its spawn is inside it');
  // The atlas draws the border for us: each named hex is Amod and touches Pueth.
  const neighbours = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  for (const cell of AMOD_BORDER_HEXES) {
    const home = hexCentre(cell.q, cell.r);
    assert.equal(regionNameAt(home.x, home.z), 'Amod', `${cell.q},${cell.r} is Amod`);
    const touching = neighbours.map(([dq, dr]) => hexCentre(cell.q + dq, cell.r + dr))
      .filter(point => regionNameAt(point.x, point.z) === 'Pueth');
    assert.ok(touching.length >= 1, `Amod ${cell.q},${cell.r} touches Pueth`);
  }
});

test('the road crosses the border at the pass stones and forks off an existing Pueth road vertex', () => {
  assert.equal(regionNameAt(AMOD_BORDER.x, AMOD_BORDER.z), 'Amod', 'the crossing point is already Amod');
  const home = hexAt(AMOD_BORDER.x, AMOD_BORDER.z);
  assert.ok(AMOD_BORDER_HEXES.some(cell => cell.q === home.q && cell.r === home.r),
    `the road crosses through one of the three border hexes, not ${home.q},${home.r}`);
  // The junction is a vertex of the Pueth road, so the fork is exact rather than a seam.
  assert.ok(PUETH_ROAD.some(point => point.x === AMOD_JUNCTION.x && point.z === AMOD_JUNCTION.z),
    'the Amod road leaves the Pueth road at one of its own vertices');
  assert.equal(AMOD_ROAD[0], AMOD_JUNCTION);
});

test('every place, person and sign of Amod stands in Amod, off the road and out of the water', () => {
  for (const place of AMOD_LANDMARKS) {
    assert.equal(regionNameAt(place.x, place.z), 'Amod', place.id);
    assert.ok(place.description.length > 60, `${place.id} says what it is`);
    assert.ok(place.name.length > 3, place.id);
  }
  assert.equal(new Set(AMOD_LANDMARKS.map(place => place.id)).size, AMOD_LANDMARKS.length, 'each landmark once');
  for (const [id, stand] of Object.entries(AMOD_NPC_POSITIONS)) {
    assert.equal(regionNameAt(stand.x, stand.z), 'Amod', id);
    assert.ok(roadDistance(stand.x, stand.z) > 1.6, `${id} does not stand in the middle of the road`);
    assert.ok(tarvelDistance(stand.x, stand.z) > 3, `${id} does not stand in the Tarvel`);
  }
  // Nobody stands inside a building, and no two buildings overlap.
  for (const building of OSTEL_BUILDINGS) {
    assert.equal(regionNameAt(building.x, building.z), 'Amod', building.id);
    assert.ok(roadDistance(building.x, building.z) > 2.8, `${building.id} is clear of the road`);
    for (const other of OSTEL_BUILDINGS) {
      if (other === building) continue;
      const gap = Math.hypot(other.x - building.x, other.z - building.z);
      const need = (Math.max(building.width, building.depth) + Math.max(other.width, other.depth)) / 2 + .8;
      assert.ok(gap > need, `${building.id} and ${other.id} are ${gap.toFixed(1)} m apart, need ${need.toFixed(1)}`);
    }
  }
  // A building is square to the town's frame, not to the world's, so a footprint
  // test has to be taken in the frame as well.
  const frame = (from, to) => {
    const dx = to.x - from.x, dz = to.z - from.z;
    return { a: dx * OSTEL.along.x + dz * OSTEL.along.z, b: dx * OSTEL.across.x + dz * OSTEL.across.z };
  };
  for (const [id, stand] of Object.entries(OSTEL_STANDS)) {
    const inside = OSTEL_BUILDINGS.find(building => {
      const offset = frame(building, stand);
      return Math.abs(offset.a) < building.width / 2 + .4 && Math.abs(offset.b) < building.depth / 2 + .4;
    });
    assert.equal(inside, undefined, `${id} is not standing inside ${inside?.id}`);
  }
  for (const sign of AMOD_SIGNS) {
    assert.ok(SIGN_LABELS.includes(sign.label), `${sign.label} is a known sign label`);
    assert.ok(SIGN_LABELS.includes(sign.returnLabel), `${sign.returnLabel} is a known sign label`);
  }
  assert.ok(AMOD_CLEARINGS.length >= 8 && AMOD_CLEARINGS.every(spot => spot.r > 4));
});

test('Ostel is laid out on the contour, on a shoulder above the Tarvel and below the burial terrace', () => {
  // The town's own frame is orthonormal, or `a` and `b` do not mean what they say.
  const dot = OSTEL.along.x * OSTEL.across.x + OSTEL.along.z * OSTEL.across.z;
  assert.ok(Math.abs(dot) < 1e-6, 'the contour and the fall line are square to each other');
  assert.ok(Math.abs(Math.hypot(OSTEL.along.x, OSTEL.along.z) - 1) < 1e-3);
  assert.deepEqual(ostelPoint(0, 0), { x: OSTEL.centre.x, z: OSTEL.centre.z });
  // `across` really is the fall line: the ground drops going that way.
  const uphill = groundWithRiver(...Object.values(ostelPoint(0, -22)));
  const downhill = groundWithRiver(...Object.values(ostelPoint(0, 22)));
  assert.ok(uphill > downhill + 1.5, `the town falls across its frame (${uphill.toFixed(1)} to ${downhill.toFixed(1)})`);
  // The dead are above the village, never below it, and the water is below the town.
  assert.ok(groundWithRiver(TIR_OSTEL.x, TIR_OSTEL.z) > groundWithRiver(OSTEL.centre.x, OSTEL.centre.z) + 2,
    'Tir Ostel stands above Ostel');
  const water = TARVEL_PROFILE.reduce((best, s) => Math.hypot(s.x - OSTEL.centre.x, s.z - OSTEL.centre.z) < Math.hypot(best.x - OSTEL.centre.x, best.z - OSTEL.centre.z) ? s : best);
  assert.ok(water.surface < groundWithRiver(OSTEL.centre.x, OSTEL.centre.z) - 2, 'the town stands above its valley floor');
  assert.ok(OSTEL_BUILDINGS.filter(b => b.storeys >= 3).length >= 5, 'Amodian houses are vertical');
  assert.ok(Math.hypot(OSTEL_SPRING.x - OSTEL.centre.x, OSTEL_SPRING.z - OSTEL.centre.z) < OSTEL.radius);
  assert.ok(Math.hypot(OSTEL_STONE_YARD.x - OSTEL.centre.x, OSTEL_STONE_YARD.z - OSTEL.centre.z) < OSTEL.radius + 10);
});

test('the water is made to work: the Tarvel falls, the Dromel holds grade, and the road keeps one in nine', () => {
  for (let i = 1; i < TARVEL_PROFILE.length; i++)
    assert.ok(TARVEL_PROFILE[i].surface < TARVEL_PROFILE[i - 1].surface, `the Tarvel falls at sample ${i}`);
  // The channel is a work, not a stream: it falls, and gently.
  for (let i = 1; i < DROMEL_PROFILE.length; i++) {
    const fall = (DROMEL_PROFILE[i - 1].level - DROMEL_PROFILE[i].level) / 5;
    assert.ok(fall > -.06 && fall < .06, `the Dromel holds grade at sample ${i} (${fall.toFixed(3)})`);
  }
  assert.ok(DROMEL_PROFILE[0].level > DROMEL_PROFILE.at(-1).level, 'and it falls from the head');
  assert.ok(Math.hypot(DROMEL_GATE.x - DROMEL_CHANNEL[4].x, DROMEL_GATE.z - DROMEL_CHANNEL[4].z) < 12, 'the gate is on the channel');
  assert.ok(tarvelDistance(TARVEL_HEAD.x, TARVEL_HEAD.z) < 3, 'the head is on the Tarvel');
  // The bench: no pitch on the built road steeper than one in nine, sampled on the real ground.
  let worst = 0, worstAt = null;
  for (let i = 1; i < AMOD_ROAD.length; i++) {
    const a = AMOD_ROAD[i - 1], b = AMOD_ROAD[i], steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 5));
    for (let k = 1; k <= steps; k++) {
      const t0 = (k - 1) / steps, t1 = k / steps;
      const p0 = { x: a.x + (b.x - a.x) * t0, z: a.z + (b.z - a.z) * t0 };
      const p1 = { x: a.x + (b.x - a.x) * t1, z: a.z + (b.z - a.z) * t1 };
      // The arch's own span is not ground: `world.js` walks the traveler over the deck
      // there, and the channel is cut back through the causeway underneath it.
      const span = point => Math.abs((point.x - TARVEL_BRIDGE.crossing.x) * TARVEL_BRIDGE.axis.x + (point.z - TARVEL_BRIDGE.crossing.z) * TARVEL_BRIDGE.axis.z);
      if (span(p0) < TARVEL_BRIDGE.halfSpan + 5 || span(p1) < TARVEL_BRIDGE.halfSpan + 5) continue;
      const run = Math.hypot(p1.x - p0.x, p1.z - p0.z);
      const grade = Math.abs(groundWithRiver(p1.x, p1.z) - groundWithRiver(p0.x, p0.z)) / run;
      if (grade > worst) { worst = grade; worstAt = p1; }
    }
  }
  assert.ok(worst < .12, `the road keeps grade: worst pitch ${(worst * 100).toFixed(1)}% at ${JSON.stringify(worstAt)}`);
  // The bridge carries the road over water, not through it.
  const deck = TARVEL_DECK_Y, surface = TARVEL_PROFILE.reduce((best, s) =>
    Math.hypot(s.x - TARVEL_BRIDGE.crossing.x, s.z - TARVEL_BRIDGE.crossing.z) < Math.hypot(best.x - TARVEL_BRIDGE.crossing.x, best.z - TARVEL_BRIDGE.crossing.z) ? s : best).surface;
  assert.ok(deck > surface + .8, `the deck stands ${(deck - surface).toFixed(2)} m over the water`);
  assert.ok(tarvelDistance(TARVEL_BRIDGE.crossing.x, TARVEL_BRIDGE.crossing.z) < 1.5, 'the bridge is on the water');
});

test('the terraces are in the ground, following the contours, and they stop where the shaped ground stops', () => {
  assert.ok(TERRACE_RISE > .8 && TERRACE_RISE < 2.2, 'one step is a wall you can see over');
  // The stair: most of a band is level tread, and the change of terrace is a riser.
  assert.equal(terraceLevel(TERRACE_RISE * 3 + .1), 3);
  const tread = terraceHeight(TERRACE_RISE * 3 + TERRACE_RISE * .3);
  assert.ok(Math.abs(tread - TERRACE_RISE * 3) < 1e-9, 'a point low in its band sits on the tread');
  assert.ok(terraceHeight(TERRACE_RISE * 4 - 1e-6) > TERRACE_RISE * 3.9, 'a point at the top of its band is up the riser');
  assert.ok(terraceHeight(10) <= 10 + 1e-9 && terraceHeight(10) >= 10 - TERRACE_RISE, 'the stair stays inside its own band');
  // The shaping fades out, so the unbuilt west of Amod is ordinary foothill.
  assert.equal(amodShaping(AMOD_TERRACE_GROUND.minX + 10, AMOD_TERRACE_GROUND.minZ + 10), 1);
  assert.equal(amodShaping(AMOD_TERRACE_GROUND.minX - 200, AMOD_TERRACE_GROUND.minZ), 0);
  assert.equal(amodGround(0, 0, 4.2), 4.2, 'Drent is not terraced');
  assert.equal(amodGround(-1200, -700, 31), 31, 'nor is the west of Amod');
  // Walking across the slope, the ground must actually step: level treads and a jump between them.
  const levels = new Set();
  let flatRuns = 0, run = 0, previous = null;
  for (let x = -700; x >= -790; x -= 1) {
    const height = groundWithRiver(x, -540);
    levels.add(terraceLevel(height));
    if (previous !== null && Math.abs(height - previous) < .02) run++;
    else { if (run >= 4) flatRuns++; run = 0; }
    previous = height;
  }
  if (run >= 4) flatRuns++;
  assert.ok(levels.size >= 4, `the hillside crosses several terraces (${levels.size})`);
  assert.ok(flatRuns >= 3, `and the treads between them are level (${flatRuns} flat runs)`);
  // The terraced ground and the world's ground agree: the scenery stands on what the traveler walks on.
  for (const [x, z] of [[-720, -500], [-760, -560], [-830, -560], [-690, -480]])
    assert.ok(Math.abs(amodTerracedGround(x, z) - groundWithRiver(x, z)) < 1e-9, `${x},${z}`);
  assert.ok(amodNaturalGround(-760, -560) > 0);
});

test('the chart, the build status and the world bounds all know about Amod', () => {
  const areas = SUBREGIONS.filter(area => area.region === 'Amod');
  assert.ok(areas.length >= 5, 'the east end is charted in several named pieces');
  for (const area of areas) assert.equal(regionNameAt(area.x, area.z), 'Amod', area.id);
  assert.ok(areas.some(area => area.id === 'ostel') && areas.some(area => area.id === 'amod-pass-stones'));
  assert.equal(BUILD_STATUS.Amod.state, 'early');
  assert.ok(BUILD_STATUS.Amod.work.includes('Mavren'), 'the status is honest about what is only a name on a sign');
  // Adding Amod grew the world northward and nowhere else.
  assert.ok(WORLD_BOUNDS.minZ < -860 && WORLD_BOUNDS.minZ > -900, `world bounds reach Amod's northern hills (${WORLD_BOUNDS.minZ.toFixed(0)})`);
  assert.ok(AMOD_LANDMARKS.every(place => place.x > WORLD_BOUNDS.minX && place.z > WORLD_BOUNDS.minZ));
  assert.ok(KELMOD_ROAD_END.halfWidth > 20, 'the built world stops at a wall and a fingerpost, not an invisible line');
});

test('the pass stones, the toll stone and the ogre stand together on the road in', () => {
  const stones = AMOD_LANDMARKS.find(place => place.id === 'amod-pass-stones');
  assert.ok(Math.hypot(stones.x - TOLL_STONE.x, stones.z - TOLL_STONE.z) < 22, 'the toll stone is one of the pass stones');
  assert.ok(Math.hypot(OGRE_STAND.x - TOLL_STONE.x, OGRE_STAND.z - TOLL_STONE.z) < 8, 'he stands at his stone');
  assert.equal(regionNameAt(OGRE_STAND.x, OGRE_STAND.z), 'Amod');
  assert.ok(roadDistance(OGRE_STAND.x, OGRE_STAND.z) > 1.2, 'he is beside the road, not standing in it');
  assert.ok(roadDistance(OGRE_STAND.x, OGRE_STAND.z) < 6, 'and close enough to be the reason you stop');
  assert.ok(Number.isFinite(OGRE_STAND.yaw));
  // Everything about Vessen and the burial terrace stays out of the Elagos seam to the south-west.
  for (const place of [VESSEN, TIR_OSTEL]) assert.equal(regionNameAt(place.x, place.z), 'Amod');
  assert.ok(VESSEN.z < -560 && TIR_OSTEL.z < -520, 'both sit up the valley, away from the Elagos border');
});

test('in the built world, everyone in Amod has ground to stand on and the ogre has room to fight', async () => {
  const THREE = await import('../vendor/three.module.js');
  const { canStand } = await import('../src/game-state.js');
  const { OGRE_ENCOUNTER } = await import('../src/amod-ogre.js');
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  for (const [id, stand] of Object.entries(AMOD_NPC_POSITIONS))
    assert.ok(canStand(stand.x, stand.z, world, .34), `${id} has room to stand at ${stand.x.toFixed(1)},${stand.z.toFixed(1)}`);
  for (const point of [OGRE_ENCOUNTER.checkpoint, OGRE_ENCOUNTER.center, ...OGRE_ENCOUNTER.enemies])
    assert.ok(canStand(point.x, point.z, world, .45), `the fight at the pass stones has footing at ${point.x},${point.z}`);
  // The whole road is walkable, and the arch carries it over the water.
  for (let i = 1; i < AMOD_ROAD.length; i++) {
    const a = AMOD_ROAD[i - 1], b = AMOD_ROAD[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 3);
    for (let k = 0; k <= steps; k++) {
      const x = a.x + (b.x - a.x) * k / steps, z = a.z + (b.z - a.z) * k / steps;
      assert.ok(canStand(x, z, world, .34), `the road is open at ${x.toFixed(1)},${z.toFixed(1)}`);
    }
  }
  const deck = world.heightAt(TARVEL_BRIDGE.crossing.x, TARVEL_BRIDGE.crossing.z);
  assert.ok(Math.abs(deck - TARVEL_DECK_Y) < .2, `the traveler walks on the deck (${deck.toFixed(2)})`);
  assert.ok(world.amodMetrics.ribs > 1000, `the hillsides are walled (${world.amodMetrics.ribs} ribs)`);
  assert.ok(world.landmarks.some(place => place.id === 'ostel') && world.landmarks.some(place => place.id === 'amod-toll-stone'));
});
