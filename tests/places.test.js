import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { PLACE_LANDMARKS, PLACE_CLEARINGS, LUMBER_TOWN_WORKS, STABLE_CLEARANCE, AVREL_HAMLET } from '../src/places.js';
import { WAYSIDE_PLACES, DRENT_WAYSIDE, MOROS_WAYSIDE, MOROS_MILESTONES } from '../src/wayside.js';
import { FRONTIER_LANDMARKS } from '../src/frontier.js';
import { OUTPOST_BENCH, OUTPOST_FIRE } from '../src/outpost.js';
import { LUMBER_TOWN, LUMBER_TOWN_STABLE, STORY_SITES, townPoint, hexOwnerAt, insideRegion } from '../src/region-world.js';
import { validateWoodlandProgress } from '../src/woodland-progress.js';
import { LEGION_POSTS } from '../src/legion-posts.js';
import { BODY } from '../src/bodies.js';

const scene = new THREE.Scene();
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(scene);
const lineDistance = (points, x, z) => {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
};
// Everything that already stood before this pass keeps its own clearances; these are the colliders the pass adds.
const NEW_KINDS = /^(signpost|notice-board|border-stone|milestone|palisade-|stockade-|frontier-|outpost-|legion-tent|command-tent|legion-standard|smithy|forge|anvil|quench|spear-rack|granary|horse-trough|hay-stack|mess-|wall-stair|truce-pole|moros-gate-|watch-platform|fold-|picket-|brazier|dead-campfire|barn|byre|stack-yard|field-wall|shelter-wall|farm-well|gatehouse|guard-hut|fernway|charcoal|bark-hut|foresters|porch|chopping|pole-rack|wayside-shrine|log-stack|cart|sawhorse|ferry-hut|reed-|punt|shrine-court|signal-|relay-fence|field-hospital|cairn|hamlet-|dead-tree|town-|washing|stable|hitching|paddock|ranger|picket-post|crates|barrels|stockade-shelter)/;

test('no new building, wall or prop stands on a road, and the whole main road can still be ridden', () => {
  const added = world.colliders.filter(c => NEW_KINDS.test(c.kind ?? ''));
  assert.ok(added.length > 400, `the pass adds its colliders (${added.length})`);
  for (const c of added) {
    if (/frontier-gate-shut/.test(c.kind)) continue;   // the shut gate closes the road on purpose, beyond where it may be walked
    const reach = c.r ?? Math.min(c.hx, c.hz);
    for (const [name, road, half] of [['the main road', world.paths[0], 2.1], ['the Suval branch', world.suvalRoute, 1.7]]) {
      const clearance = lineDistance(road, c.x, c.z) - reach;
      assert.ok(clearance >= half - .15, `${c.kind} at ${c.x.toFixed(1)}, ${c.z.toFixed(1)} is ${clearance.toFixed(2)} m from ${name}`);
    }
  }
});

test('the stable yard is dressed without a collider within 6 m of the ostler’s stand or the hitch', () => {
  for (const spot of [LUMBER_TOWN_STABLE.stand, LUMBER_TOWN_STABLE.hitch]) for (const c of world.colliders.filter(k => NEW_KINDS.test(k.kind ?? ''))) {
    const gap = c.r !== undefined ? Math.hypot(c.x - spot.x, c.z - spot.z) - c.r : Math.hypot(Math.max(0, Math.abs(c.x - spot.x) - c.hx), Math.max(0, Math.abs(c.z - spot.z) - c.hz));
    assert.ok(gap >= STABLE_CLEARANCE, `${c.kind} is ${gap.toFixed(2)} m from the stable yard's ${spot === LUMBER_TOWN_STABLE.stand ? 'stand' : 'hitch'}`);
  }
  for (const name of ['stable', 'horse-trough', 'hitching-rail', 'paddock-fence']) assert.ok(world.colliders.some(c => c.kind === name), `the yard has its ${name}`);
  assert.equal(LUMBER_TOWN_WORKS.gates.length, 2, 'a palisade gate at each end of the road');
});

test('Nothom has a continuous enclosing palisade, interrupted only by its two usable road gates', () => {
  const [west,east]=LUMBER_TOWN_WORKS.palisade;
  const outline=[...west,...east];
  const inside=p=>{
    let result=false;
    for(let i=0,j=outline.length-1;i<outline.length;j=i++) {
      const a=outline[i],b=outline[j];
      if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x) result=!result;
    }
    return result;
  };
  for(const point of [LUMBER_TOWN.square,LUMBER_TOWN_WORKS.hall,LUMBER_TOWN_WORKS.smithy,
    LUMBER_TOWN_WORKS.stable,LUMBER_TOWN_STABLE.stand,LUMBER_TOWN_STABLE.hitch,...LUMBER_TOWN_WORKS.paddock])
    assert.ok(inside(point),'town buildings and the entire horse yard lie inside the perimeter');
  const gates=[[west.at(-1),east[0]],[east.at(-1),west[0]]];
  for(const [index,[a,b]] of gates.entries()) {
    const center={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
    const gate=LUMBER_TOWN_WORKS.gates.find(g=>Math.hypot(g.x-center.x,g.z-center.z)<.01);
    assert.ok(gate,`the only opening ${index} is an existing gateway`);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>10,'the gateway is wide enough for a mounted traveler');
    for(let k=-8;k<=8;k++) assert.ok(canStand(gate.x+LUMBER_TOWN.along.x*k,gate.z+LUMBER_TOWN.along.z*k,world,.7),'gate approach is traversable on horseback');
  }
  const wallWorld={...world,colliders:world.colliders.filter(c=>c.kind==='town-palisade'),nearColliders:null};
  for(const collider of wallWorld.colliders) assert.ok(lineDistance(world.paths[0],collider.x,collider.z)-collider.r>=1.95,'the actual curved main road stays clear of every new wall');
  for(const chain of LUMBER_TOWN_WORKS.palisade) for(let i=1;i<chain.length;i++) {
    const a=chain[i-1],b=chain[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2);
    for(let k=0;k<=steps;k++) assert.equal(canStand(a.x+(b.x-a.x)*k/steps,a.z+(b.z-a.z)*k/steps,wallWorld,.34),false,'no person-sized gap between palisade colliders');
  }
  const routes=[[townPoint(23,0),LUMBER_TOWN_STABLE.stand,LUMBER_TOWN_STABLE.hitch]];
  for(const route of routes) for(let i=1;i<route.length;i++) {
    const a=route[i-1],b=route[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2);
    for(let k=0;k<=steps;k++) assert.ok(canStand(a.x+(b.x-a.x)*k/steps,a.z+(b.z-a.z)*k/steps,world,.7),'road to ostler and horse remains open');
  }
});

test('the road beyond Nothom has no freestanding Moros gate, barrier, watch platform or gate signs', () => {
  const former = STORY_SITES.morosGate;
  assert.equal(scene.getObjectByName('The Moros gate'), undefined, 'the entire old gate mesh is removed');
  assert.equal(world.colliders.some(c => /^moros-gate-/.test(c.kind ?? '')), false, 'the old posts and palisade wings leave no invisible barriers');
  assert.equal(world.colliders.some(c => c.kind === 'watch-platform' && Math.hypot(c.x-former.x,c.z-former.z)<20), false, 'the old watch platform leaves no supports');
  assert.equal(world.roadSigns.some(sign => sign.label === 'The Moros Gate'), false, 'the obsolete name board is gone');
  assert.equal(world.roadSigns.some(sign => sign.kind === 'border' && Math.hypot(sign.x-former.x,sign.z-former.z)<20), false, 'the freestanding border stone is gone');
  assert.equal(world.landmarks.find(place => place.id === 'moros-gate')?.name, 'The Moros Road', 'old discovery saves retain an open-road landmark');
  // The original anchor still positions the plain's wayside props. The real
  // town gate and the camp fortifications remain separate structures.
  assert.ok(scene.getObjectByName('The Moros wayside'), 'the wayside scenery remains');
  assert.ok(world.colliders.some(c => c.kind === 'town-palisade'), 'Nothom keeps its enclosing walls');
  assert.ok(world.colliders.some(c => c.kind === 'legion-tent'), 'the army camp remains');
  const guards=LEGION_POSTS.filter(npc => ['post-moros-gate-north','post-moros-gate-south'].includes(npc.id));
  const gate=LUMBER_TOWN_WORKS.gates.find(site => site.id === 'south');
  assert.equal(guards.length,2,'both relocated guards keep their existing identities');
  for(const guard of guards) {
    assert.ok(canStand(guard.x,guard.z,world,BODY.person),'the relocated guard has legal footing');
    assert.ok(Math.hypot(guard.x-gate.x,guard.z-gate.z)<5,'the guard stands beside Nothom southwest gate');
  }
  for(let step=-8;step<=8;step++) {
    const x=gate.x+LUMBER_TOWN.along.x*step,z=gate.z+LUMBER_TOWN.along.z*step;
    assert.ok(canStand(x,z,world,BODY.horse),'the mounted road through the town gate remains open');
    for(const guard of guards) assert.ok(Math.hypot(guard.x-x,guard.z-z)>BODY.horse+BODY.person,'neither guard stands in the mounted passage');
  }
  const road = world.paths[0];
  for(let i=1;i<road.length;i++) {
    const a=road[i-1],b=road[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
    for(let k=0;k<=steps;k++) {
      const x=a.x+(b.x-a.x)*k/steps,z=a.z+(b.z-a.z)*k/steps;
      if(Math.hypot(x-former.x,z-former.z)<25) assert.ok(canStand(x,z,world,.7),'the former gate road remains passable on horseback');
    }
  }
});

test('the outpost’s smithy bench and mess fire are registered like every other bench and fire, and can be reached', () => {
  assert.ok(world.repairBenches.some(bench => bench.id === OUTPOST_BENCH.id));
  assert.ok(world.firePits.some(fire => fire.id === OUTPOST_FIRE.id));
  for (const spot of [OUTPOST_BENCH, OUTPOST_FIRE]) assert.ok(canStand(spot.x, spot.z, world, .48), `${spot.id} has room to work`);
  assert.equal(hexOwnerAt(OUTPOST_BENCH.x, OUTPOST_BENCH.z), 'Moros Plain');
  // A checkpoint taken with the mess fire burning, after discovering every place there is, still saves.
  const camp = { version: 1, taught: false, catches: 0, fires: Object.fromEntries(world.firePits.map(fire => [fire.id, fire.id === OUTPOST_FIRE.id ? 30 : 0])) };
  const progress = { version: 1, acornStatus: 'available', practiceHits: 0, practiceDodges: 0, acorns: [], sticks: [], fruits: [], discoveries: world.landmarks.map(landmark => landmark.id), camp };
  assert.ok(validateWoodlandProgress(progress, new Map()), 'the saved woodland progress accepts the outpost’s fire and every landmark');
});

test('the empty roads have wayside places, each a landmark with discovery text in its own region, and nothing in Drent to fight', () => {
  const ids = world.landmarks.map(landmark => landmark.id);
  assert.equal(new Set(ids).size, ids.length, 'landmark ids are unique');
  for (const place of [...WAYSIDE_PLACES, ...PLACE_LANDMARKS, ...FRONTIER_LANDMARKS]) {
    assert.ok(ids.includes(place.id), `${place.id} can be discovered`);
    assert.ok(place.description.length > 40, `${place.id} has discovery text`);
    assert.doesNotMatch(place.description, /goblin/i);
    assert.ok(canStand(place.x, place.z, world, .3) || world.colliders.some(c => Math.hypot(c.x - place.x, c.z - place.z) < 6), `${place.id} is somewhere`);
  }
  assert.equal(DRENT_WAYSIDE.length, 4); assert.ok(DRENT_WAYSIDE.every(place => hexOwnerAt(place.x, place.z) === 'Drent'));
  assert.ok(MOROS_WAYSIDE.length >= 4 && MOROS_WAYSIDE.every(place => hexOwnerAt(place.x, place.z) === 'Moros Plain'));
  assert.equal(MOROS_MILESTONES.length, 3);
  assert.equal(world.landmarks.filter(l => insideRegion('East Suval', l.x, l.z) && FRONTIER_LANDMARKS.includes(l)).length, 0, 'the frontier is discovered from Luscia');
});

test('the scatter keeps clear of every new building, and the farmsteads stand where the clearing is', () => {
  const trees = world.colliders.filter(c => c.kind === 'region-tree');
  const buildings = world.colliders.filter(c => /^(barn|byre|guard-hut|foresters|ferry-hut|field-hospital|stable|smithy|town-hall|frontier-building|legion-tent|command-tent)/.test(c.kind ?? ''));
  for (const b of buildings) for (const tree of trees) {
    const gap = b.r !== undefined ? Math.hypot(b.x - tree.x, b.z - tree.z) - b.r - tree.r : Math.hypot(Math.max(0, Math.abs(tree.x - b.x) - b.hx), Math.max(0, Math.abs(tree.z - b.z) - b.hz)) - tree.r;
    assert.ok(gap > -.05, `a tree grows through ${b.kind} at ${b.x.toFixed(1)}, ${b.z.toFixed(1)}`);
  }
  assert.ok(PLACE_CLEARINGS.length > 10);
  assert.equal(hexOwnerAt(AVREL_HAMLET.barn.x, AVREL_HAMLET.barn.z), 'Drent');
});
