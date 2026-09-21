import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAIN_ROAD, regionNpcPositions, regionAt, villageToWorld, TIDEHAVEN_SMITHY } from '../src/region-world.js';
import { OPENING_FIGHT_GROUND, GREENWAY_RAID } from '../src/opening-fights.js';
import { LANDING_QUEUE } from '../src/mercenaries.js';
import { subregionsAt } from '../src/map-fog.js';
import { distanceAlongRoad, pointAlongRoad } from '../src/mercenaries.js';
import { LONG_ROAD_SPINE, longRoadStop } from '../src/long-road.js';
import { MYCOLOGIST_STAND } from '../src/mycology.js';
import { BOTANIST_STAND } from '../src/botany.js';
import { GEOLOGIST_STAND } from '../src/geology.js';
import { BOWDEN_STAND } from '../src/woodcutting.js';
import { DRENT_DEEP_PLACES } from '../src/rena.js';
import { LEGION_POSTS } from '../src/legion-posts.js';
import { sourceModule } from './module-loader.js';

// Three of the tables this checks live in files that draw as well as describe, so they are
// loaded the way tests/quest-markers.test.js loads the marker meshes: with three stubbed out.
const { BIRD_HABITATS } = await sourceModule('../src/drent-birds.js');
const { STONE_GROUNDS } = await sourceModule('../src/drent-stones.js');
const { AUTHORED_STANDS } = await sourceModule('../src/drent-flora.js');

/**
 * The long road is spaced, and this is what keeps it spaced.
 *
 * Today seven teachers stood within a hundred metres of Tidehaven's pier and the two hundred and
 * forty-five metres from the Caloss Gate to the Avrel clearing taught nothing. Three people moved
 * — Odger Pell to Fernway Rest, Nell Harrow to the Sunken Lane, Silas Garrow to the Toll House
 * stream — and the road now teaches something every few minutes of walking. A stand that drifts
 * back toward the harbour undoes the whole shape, so the shape is stated here.
 *
 * Pure, and stands are read from the modules that own them. The two that live in files which
 * import three — Bowden's woodlot and the village's own people — are read as world points, and
 * `src/main.js` is read as text to prove it uses the stands rather than a literal of its own.
 */
const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** How far a point is from the main road, measured to the nearest point on it. */
const fromRoad = point => { const on = pointAlongRoad(MAIN_ROAD, distanceAlongRoad(MAIN_ROAD, point)); return Math.hypot(on.x - point.x, on.z - point.z); };

/**
 * Every spine teacher who is a person, and where that person stands. The long road's own table
 * carries a point per stop so the muster can say where you were; these are the stands the world
 * actually places, and the two must agree.
 */
const TEACHERS = Object.freeze({
  'pier-chart': villageToWorld(4, 20),                             // Mara, at the head of the pier
  'bird-garden': villageToWorld(24.6, -4.4),                       // Perrin, in the bird garden
  'lysa-acorns': villageToWorld(-5.6, 9.1),                        // Lysa, at her kitchen
  'bran-rod': villageToWorld(20.4, -82),                           // Bran, at Willowmere
  'bowden-axe': BOWDEN_STAND,
  'odger-fernway': MYCOLOGIST_STAND,
  'corvan-register': regionNpcPositions['meadow-courier'],
  'enna-rows': { x: -418.4, z: 59.8 },                             // Enna, at the Mill Commons
  'nell-hedge': BOTANIST_STAND,
  'silas-stream': GEOLOGIST_STAND,
  'hollis-bridge': regionNpcPositions['crossing-keeper'],
});
/** The three the long road moved, and the only three it is allowed to have moved. */
const MOVED = Object.freeze(['odger-fernway', 'nell-hedge', 'silas-stream']);
/**
 * A bird's home ground in world metres. The first four are authored in Tidehaven's own local
 * frame, as the village is, and everything past them is out in the country (`world: true`).
 */
const birdGround = home => home.world ? { ...home.center, radius: home.radius }
  : { ...villageToWorld(home.center.x, home.center.z), radius: home.radius };

test('the long road’s table and the world’s own stands are the same places', () => {
  for (const [id, stand] of Object.entries(TEACHERS)) {
    const stop = longRoadStop(id);
    assert.ok(stop, id + ' is a stop on the long road');
    assert.ok(gap(stop.point, stand) < 1.5,
      `${id}: the long road remembers (${stop.point.x.toFixed(1)}, ${stop.point.z.toFixed(1)}) and the world stands at (${stand.x.toFixed(1)}, ${stand.z.toFixed(1)})`);
  }
  // Every spine stop with a person is one of these; the rest are places, and Mara is twice.
  for (const stop of LONG_ROAD_SPINE) {
    if (!stop.npc || stop.id === 'village-corners') continue;   // her second errand, at her own stand
    assert.ok(Object.hasOwn(TEACHERS, stop.id), stop.id + ' has a person and no stand to check');
  }
});

test('the three who moved stand well clear of everybody, and the road is spaced as the design counts it', () => {
  // The rule is about the road, not about the village. Tidehaven is meant to hold three of them
  // within thirty metres of each other - it is a village, and a village is people in one place -
  // and the design counts the whole of Drent out: three at the harbour, two in the near wood,
  // one at Fernway, two in the clearing, two on the Caloss road, one at the bridge
  // (docs/drent-long-road.md §4). What must not happen is a teacher drifting back into a cluster.
  for (const id of MOVED) for (const [other, stand] of Object.entries(TEACHERS)) {
    if (other === id) continue;
    assert.ok(gap(TEACHERS[id], stand) >= 35, `${id} is ${gap(TEACHERS[id], stand).toFixed(1)} m from ${other}`);
  }
  const places = { harbour: 0, wood: 0, fernway: 0, clearing: 0, caloss: 0, bridge: 0 };
  for (const [id, stand] of Object.entries(TEACHERS)) {
    const where = id === 'hollis-bridge' ? 'bridge' : id === 'odger-fernway' ? 'fernway'
      : ['nell-hedge', 'silas-stream'].includes(id) ? 'caloss'
      : ['corvan-register', 'enna-rows'].includes(id) ? 'clearing'
      : ['bran-rod', 'bowden-axe'].includes(id) ? 'wood' : 'harbour';
    places[where]++;
    assert.ok(Number.isFinite(stand.x), id);
  }
  assert.deepEqual(places, { harbour: 3, wood: 2, fernway: 1, clearing: 2, caloss: 2, bridge: 1 },
    'the road no longer teaches everything in the first hundred metres and nothing for the next two hundred and forty-five');
});

test('every spine teacher is on the road or in a named ground, and stands in Drent', () => {
  for (const [id, stand] of Object.entries(TEACHERS)) {
    const road = fromRoad(stand), ground = subregionsAt(stand.x, stand.z)[0]?.id ?? null;
    assert.ok(road <= 45 || ground, `${id} is ${road.toFixed(1)} m off the road and in no named ground`);
    // What the traveler is told about the ground he is standing on (regionAt, with its shore
    // fringe), not the strict hex ownership the scatter asks about.
    const region = regionAt(stand.x, stand.z);
    assert.equal(region?.name, id === 'hollis-bridge' ? 'Luscia' : 'Drent', `${id} stands in ${region?.name}`);
  }
});

test('the three who moved are where the ground said they could stand, and not where it said they could not', () => {
  // Odger: on the bench side of Fernway Rest. Beside the cairn is inside the pileated
  // woodpecker's home ground, and a stand takes a bird's perches away (src/rena.js).
  const woodpecker = birdGround(BIRD_HABITATS.find(area => area.id === 'greenway-pileated'));
  assert.ok(Number.isFinite(woodpecker.x), 'the pileated woodpecker keeps a home ground');
  // The rule in src/rena.js is about the stands a pass places: an existing stand is not moved,
  // and a new one goes nowhere near an army post or a bird. These three are new stands.
  for (const id of MOVED) for (const home of BIRD_HABITATS) {
    const ground = birdGround(home);
    assert.ok(gap(TEACHERS[id], ground) > ground.radius, `${id} stands inside ${home.id}, which takes its perches away`);
  }
  assert.ok(gap(MYCOLOGIST_STAND, woodpecker) > woodpecker.radius + 2, 'Odger is properly clear of the woodpecker');
  // Beside the cairn, which is where the design first put him, he would not have been.
  assert.ok(gap({ x: -132.3, z: 34.6 }, woodpecker) < woodpecker.radius, 'the cairn is inside the bird’s ground, which is why he is at the bench');
  // And out of the 4.6 m either side of the centreline that the company walks in. Mara is the
  // exception and always was: the head of the pier is where the road starts, and the company
  // queues down it past her (LANDING_QUEUE, src/mercenaries.js).
  for (const id of MOVED) assert.ok(fromRoad(TEACHERS[id]) > 4.6, `${id} stands in the road`);
  // Nell and Silas are at the two deep places the design names, to the metre.
  assert.ok(gap(BOTANIST_STAND, DRENT_DEEP_PLACES[0]) < .5, 'Nell is at the Sunken Lane');
  // Silas is at the Toll House's stream rather than at its centre: the house is a stone box and
  // there is no room to stand in it. He is inside its kept-clear disc and on the road side of it.
  assert.ok(gap(GEOLOGIST_STAND, DRENT_DEEP_PLACES[1]) < DRENT_DEEP_PLACES[1].radius + 3, 'Silas is at the Toll House');
  assert.ok(gap(GEOLOGIST_STAND, DRENT_DEEP_PLACES[1]) > 5, 'and not inside its walls');
  // Nothing within reach of an army post (src/rena.js's other standing rule).
  for (const id of MOVED) for (const post of LEGION_POSTS) {
    assert.ok(gap(TEACHERS[id], post) > 12, `${id} stands on top of ${post.id}`);
  }
});

test('each of the three who moved has something to teach with, within sight of where he stands', () => {
  // A teacher with nothing to find is a lesson the traveler cannot finish.
  // Odger: mushrooms scatter inside one box of Drent's wood, and he has to be in it.
  const woods = source('mushrooms.js').match(/const inWoods = \(x, z\) => x >= (-?[\d.]+) && x <= (-?[\d.]+) && z >= (-?[\d.]+) && z <= (-?[\d.]+);/);
  assert.ok(woods, 'the mushroom scatter still names the wood it uses');
  const [, minX, maxX, minZ, maxZ] = woods.map(Number);
  assert.ok(MYCOLOGIST_STAND.x > minX + 20 && MYCOLOGIST_STAND.x < maxX - 20
    && MYCOLOGIST_STAND.z > minZ + 20 && MYCOLOGIST_STAND.z < maxZ - 20,
    'Odger stands twenty metres inside the wood the mushrooms grow in');
  // Silas: ironstone and clay down the stream, because the Avrel furrows are too far to send
  // a man who has just been taught what a stone is.
  const stream = STONE_GROUNDS.find(ground => ground.id === 'tollhouse-stream');
  assert.ok(stream, 'the Toll House stream has stones of its own');
  assert.ok(gap(stream, GEOLOGIST_STAND) < 60, 'and they are within sight of him');
  assert.ok(stream.kinds.ironstone > 0 && stream.kinds.clay > 0, 'ironstone out of a furrow, and the clay with it');
  assert.ok(STONE_GROUNDS.some(ground => ground.id === 'weatherhead-bank'), 'the old pit under the Weatherhead stays where it is');
  // Nell: her own weed came with her, because the whole of that scene is her standing over it.
  const weed = AUTHORED_STANDS.find(stand => stand.id === 'jimson-nell');
  assert.ok(weed && gap(weed, BOTANIST_STAND) < 6, 'the jimson weed is on the bank behind her');
  assert.ok(gap(weed, BOTANIST_STAND) > 2, 'and not under her feet');
});

test('src/main.js places the three from their own modules, and keeps no literal of its own', () => {
  const main = source('main.js');
  assert.match(main, /world\.npcPositions\[MYCOLOGIST\.id\]=\{x:MYCOLOGIST_STAND\.x,z:MYCOLOGIST_STAND\.z\}/, 'Odger’s stand was a literal in the host');
  assert.match(main, /world\.npcPositions\[BOTANIST\.id\]=\{x:BOTANIST_STAND\.x,z:BOTANIST_STAND\.z\}/);
  assert.match(main, /world\.npcPositions\[GEOLOGIST\.id\]=\{x:GEOLOGIST_STAND\.x,z:GEOLOGIST_STAND\.z\}/);
  assert.doesNotMatch(main, /world\.npcPositions\[MYCOLOGIST\.id\]=\{x:-50,z:25\}/, 'the old Greenway-edge literal is back');
  // And nothing anywhere still sends the traveler to the places they left.
  for (const [file, gone] of [['skills.js', /Odger Pell, at the edge of the Greenway/], ['skills.js', /Nell Harrow, on the outskirts/],
    ['skills.js', /Silas Garrow, digging marl under the Weatherhead'/], ['consumables.js', /edge of the Greenway/],
    ['mycology.js', /edge of the Greenway/], ['botany.js', /outskirts of Tidehaven/]])
    assert.doesNotMatch(source(file), gone, `${file} still says where somebody used to be`);
});

test('the smithy\u2019s plot is the one the four measurements chose', () => {
  const forge = TIDEHAVEN_SMITHY;
  // It is where the sweep said, and the measurement that chose it is written down with it.
  assert.deepEqual([forge.a, forge.b], [16.5, -35]);
  assert.deepEqual([+forge.x.toFixed(1), +forge.z.toFixed(1)],
    [+villageToWorld(16.5, -35).x.toFixed(1), +villageToWorld(16.5, -35).z.toFixed(1)]);
  // 1. Off the middle of the street - and still on a street, in the same band as the cottages,
  //    which stand 9 to 16 m off the road's centreline.
  const toRoad = (x, z) => {
    let best = Infinity;
    for (let i = 0; i + 1 < MAIN_ROAD.length; i++) {
      const a = MAIN_ROAD[i], b = MAIN_ROAD[i + 1], dx = b.x - a.x, dz = b.z - a.z, len = dx * dx + dz * dz;
      const t = len ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / len)) : 0;
      best = Math.min(best, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
    }
    return best;
  };
  const lane = toRoad(forge.x, forge.z);
  assert.ok(lane >= 6, `${lane.toFixed(1)} m clear of the road's middle lane`);
  assert.ok(lane <= 16, `${lane.toFixed(1)} m: on a street, not out in a field`);
  assert.equal(Math.round(lane * 10) / 10, forge.offRoad, 'and the constant says what was measured');
  // 2. Off the opening raid ground: the traveler's first fight is not in somebody's forge.
  for (const spot of [...OPENING_FIGHT_GROUND, GREENWAY_RAID.center])
    assert.ok(Math.hypot(spot.x - forge.x, spot.z - forge.z) > 14, 'clear of the opening fights');
  // 3. Clear of the queue that comes down the pier, where ten mercenaries land one behind the
  //    next. It runs from the pier head toward the road's first point, which is the arithmetic
  //    `createMercenaryCompany` itself uses (`queue`, src/mercenaries.js).
  const pier = villageToWorld(4, 20), head = MAIN_ROAD[0];
  const span = Math.hypot(head.x - pier.x, head.z - pier.z);
  const ux = (head.x - pier.x) / span, uz = (head.z - pier.z) / span;
  for (let seat = 0; seat < 12; seat++) {
    const along = LANDING_QUEUE.lead + seat * LANDING_QUEUE.spacing;
    const off = LANDING_QUEUE.offset * ((seat + 1) % 2 ? 1 : -1);
    const spot = { x: pier.x + ux * along - uz * off, z: pier.z + uz * along + ux * off };
    assert.ok(Math.hypot(spot.x - forge.x, spot.z - forge.z) > 14, `clear of landing seat ${seat}`);
  }
  // 4. Nobody's doorstep: every person Drent places stands well off it.
  for (const [id, spot] of Object.entries(regionNpcPositions))
    assert.ok(Math.hypot(spot.x - forge.x, spot.z - forge.z) > 8, `${id} is not in the forge`);
  // And it is in Drent, where a level-0 smith sells what you landed with.
  assert.equal(regionAt(forge.x, forge.z)?.id ?? regionAt(forge.x, forge.z), regionAt(villageToWorld(0, 0).x, villageToWorld(0, 0).z)?.id ?? regionAt(villageToWorld(0, 0).x, villageToWorld(0, 0).z));
});
