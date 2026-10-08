import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { MENORA, MENORA_OUTLINE, MENORA_GATES, MENORA_PATHS, MENORA_BRIDGES, MENORA_BUILDINGS, MENORA_NPC_ANCHORS, LIZEEM_MARKET_STANDS,
  inMenora, menoraGround, menoraRiverClearance, menoraBridgeAt, menoraSegmentDistance } from '../src/content/regions/minora-frontier/menora-city.js';
import { MINORA_PEOPLE } from '../src/content/quests/lizeem-farmlands/lizeem-minora-people.js';
import { LIZEEM_MINORA_PEOPLE } from '../src/content/quests/lizeem-farmlands/lizeem-people.js';
import { TALETH } from '../src/content/quests/lizeem-farmlands/taleth.js';
import { DIVIDING_PLACES } from '../src/content/quests/lizeem-farmlands/dividing.js';
import { MINORA_START } from '../src/app/startup/minora-opening.js';

/**
 * Minora's polish pass (src/content/regions/minora-frontier/menora-polish.js, 7 October 2026): the wall walk, bridge
 * arches, house detail, trees, hedges, courts and street furniture added on the unchanged layout. These hold its
 * placement rules against the layout and the quests' people independently of the module's own checks.
 */
const THREE = await sourceModule('../vendor/three.module.js');
const { createMenoraScenery } = await sourceModule('../src/content/regions/minora-frontier/menora-scenery.js');
const { planMenoraPolish, MENORA_POLISH_KEEP_CLEAR } = await sourceModule('../src/content/regions/minora-frontier/menora-polish.js');

const flat = (x, z) => menoraGround(x, z, MENORA.elevation);
const mine = c => String(c.id ?? '').startsWith('menora-polish-');
function build(heightAt = flat) {
  const colliders = [], scene = createMenoraScenery({ parent: new THREE.Group(), colliders, heightAt });
  return { scene, colliders, polish: colliders.filter(mine) };
}
const city = build();
const plan = planMenoraPolish({ obstacles: city.colliders.filter(c => !mine(c) && c.kind !== 'city-wall') });

const PEOPLE = [MENORA.arrival, MENORA.templeCourt, MENORA_NPC_ANCHORS.cedric, MENORA_NPC_ANCHORS.wilhelm, ...MENORA_NPC_ANCHORS.army,
  ...MENORA_NPC_ANCHORS.guards, ...LIZEEM_MARKET_STANDS, ...MINORA_PEOPLE.filter(p => p.id !== 'amalthea'), ...LIZEEM_MINORA_PEOPLE,
  TALETH, MINORA_START, DIVIDING_PLACES.trestle, ...Object.values(DIVIDING_PLACES.guests)];
const laneGap = (x, z) => Math.min(...MENORA_PATHS.flatMap(p => p.points.slice(1).map((b, i) => menoraSegmentDistance(x, z, p.points[i], b) - p.width / 2)));
const inStall = (x, z) => LIZEEM_MARKET_STANDS.some(({ stall: s }) => Math.abs(x - s.x) < s.width / 2 && Math.abs(z - s.z) < s.depth / 2);
/** Every rule a free-standing piece of footprint `r` breaks at (x, z), or '' when it keeps them all. */
function broken(x, z, r = 0) {
  const why = [];
  if (laneGap(x, z) <= 1 + r) why.push('on a lane');
  if (MENORA_GATES.some(g => Math.hypot(x - g.x, z - g.z) <= 6 + r)) why.push('at a gate');
  const who = PEOPLE.find(p => Math.hypot(x - p.x, z - p.z) <= 4 + r);
  if (who) why.push(`within four metres of ${who.id ?? `${who.x},${who.z}`}`);
  if (inStall(x, z) || LIZEEM_MARKET_STANDS.some(({ stall: s }) => Math.abs(x - s.x) < s.width / 2 + 1 + r && Math.abs(z - s.z) < s.depth / 2 + 1 + r)) why.push('at a stall');
  if (menoraBridgeAt(x, z, 3 + r)) why.push('on or by a bridge');
  if (menoraRiverClearance(x, z) <= 4 + r) why.push('by water');
  const home = MENORA_BUILDINGS.find(b => Math.abs(x - b.x) < b.width / 2 + .6 + r && Math.abs(z - b.z) < b.depth / 2 + .6 + r);
  if (home) why.push(`against ${home.id}`);
  return why.join(', ');
}
const boxPoints = c => [[0, 0], [-1, -1], [-1, 1], [1, -1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]].map(([u, v]) => [c.x + u * c.hx, c.z + v * c.hz]);
function overlaps(a, b) {
  const circle = c => c.r !== undefined;
  if (circle(a) && circle(b)) return Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r;
  if (!circle(a) && !circle(b)) return Math.abs(a.x - b.x) < a.hx + b.hx && Math.abs(a.z - b.z) < a.hz + b.hz;
  const [c, box] = circle(a) ? [a, b] : [b, a];
  return Math.hypot(Math.max(0, Math.abs(c.x - box.x) - box.hx), Math.max(0, Math.abs(c.z - box.z) - box.hz)) < c.r;
}
// The opening of a gate: its passage through the curtain, the gate's width along the wall and the gatehouse's depth across it.
function inGateOpening(x, z) {
  return MENORA_GATES.some(g => {
    const a = MENORA_OUTLINE[g.edge], b = MENORA_OUTLINE[(g.edge + 1) % MENORA_OUTLINE.length], l = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / l, dz = (b.z - a.z) / l, along = (x - g.x) * dx + (z - g.z) * dz, across = (x - g.x) * dz - (z - g.z) * dx;
    return Math.abs(along) < g.width / 2 && Math.abs(across) < 2.7;
  });
}

test('The polish builds into its seven batched meshes within its vertex budget, and the whole city within its own', () => {
  const { metrics } = city.scene, p = metrics.polish;
  assert.equal(p.batches, 7);
  assert.ok(p.vertices > 20000 && p.vertices < 250000, `the polish has ${p.vertices} vertices`);
  assert.ok(metrics.vertices < 250000 && metrics.batches < 65, 'tests/menora-city.test.js pins the whole city');
  for (const key of ['buttresses', 'corbels', 'slits', 'banners', 'torches', 'dormers', 'shutters', 'chimneys', 'windows', 'lanterns', 'poles', 'props', 'trees', 'hedges', 'courts', 'kerbs'])
    assert.ok(p[key] > 0, `no ${key}`);
  assert.ok(p.lanterns >= 30 && p.trees >= 40 && p.buttresses >= 8, JSON.stringify(p));
  assert.equal(p.bartizans, MENORA_OUTLINE.filter(c => menoraRiverClearance(c.x, c.z) <= 7).length, 'a bartizan on every corner without a turret');
  assert.equal(p.houses, MENORA_BUILDINGS.filter(b => !['temple', 'sorcerers-tower'].includes(b.kind)).length);
  assert.equal(p.colliders, city.polish.length);
  assert.equal(p.trees, plan.trees.length);assert.equal(p.buttresses, plan.buttresses.length);
});

test('It builds without fault on rolling ground as well as on the levelled city', () => {
  const rolling = (x, z) => menoraGround(x, z, 14 + Math.sin(x * .07) * 3 + Math.cos(z * .05) * 2);
  const { scene, polish } = build(rolling);
  assert.ok(scene.metrics.polish.vertices > 20000);
  for (const c of polish) assert.ok(Number.isFinite(c.x + c.z + c.minY + c.maxY) && c.maxY > c.minY, c.id);
  let meshes = 0;
  scene.root.traverse(o => {
    if (!o.isMesh || !o.name.startsWith('Minora polish')) return;
    meshes++;
    for (const v of o.geometry.attributes.position.array) assert.ok(Number.isFinite(v), `${o.name} has a broken vertex`);
  });
  assert.equal(meshes, 7);
});

test('Every collider the polish pushes keeps a metre off the lanes, six from a gate, four from anybody and from water, clear of bridges and buildings', () => {
  assert.ok(city.polish.length > 50);
  for (const [x, z] of [[-2308, 100], [MENORA_GATES[1].x - 3, MENORA_GATES[1].z + 3], [-2338, 140], [-2210, 135], [-2280, 160], [-2366, 140]]) assert.notEqual(broken(x, z), '', 'the rules see nothing wrong');
  for (const c of city.polish) {
    assert.ok(['tree', 'prop', 'city-wall'].includes(c.kind), `${c.id} is a ${c.kind}`);
    const points = c.r !== undefined ? [[c.x, c.z, c.r]] : boxPoints(c).map(([x, z]) => [x, z, 0]);
    for (const [x, z, r] of points) { const why = broken(x, z, r); assert.equal(why, '', `${c.id} is ${why}`); }
  }
  // The buttresses stand on the inner face of the curtain; nothing else free-standing sits in what the city already built.
  const outline = (x, z) => Math.min(...MENORA_OUTLINE.map((a, i) => menoraSegmentDistance(x, z, a, MENORA_OUTLINE[(i + 1) % MENORA_OUTLINE.length])));
  for (const c of city.polish.filter(c => c.kind === 'city-wall')) assert.ok(inMenora(c.x, c.z) && outline(c.x, c.z) > 2 && outline(c.x, c.z) < 3.2, c.id);
  const before = city.colliders.filter(c => !mine(c));
  for (const c of city.polish.filter(c => c.kind !== 'city-wall'))
    for (const o of before) assert.ok(!overlaps(c, o), `${c.id} overlaps ${o.id ?? o.kind}`);
  for (const [i, a] of city.polish.entries()) for (const b of city.polish.slice(i + 1))
    if (a.kind !== 'city-wall' || b.kind !== 'city-wall') assert.ok(!overlaps(a, b), `${a.id} overlaps ${b.id}`);
});

test('No piece of the polish stands in a lane, a gate opening or a stall, and the free-standing ones keep every rule', () => {
  const pieces = [...plan.lanterns, ...plan.banners, ...plan.trees, ...plan.hedges, ...plan.props, ...plan.courts, ...plan.buttresses,
    ...plan.kerbs.flatMap(k => [k.a, k.b, { x: (k.a.x + k.b.x) / 2, z: (k.a.z + k.b.z) / 2 }])];
  assert.ok(pieces.length > 300);
  for (const p of pieces) {
    assert.ok(laneGap(p.x, p.z) > 0, `a piece stands in a lane at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    assert.ok(!inGateOpening(p.x, p.z), `a piece stands in a gate opening at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    assert.ok(!inStall(p.x, p.z), `a piece stands in a stall at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
  }
  for (const p of [...plan.lanterns.map(p => ({ ...p, r: .25 })), ...plan.banners.map(p => ({ ...p, r: .3 })), ...plan.props, ...plan.trees.map(p => ({ ...p, r: .35 })), ...plan.hedges]) {
    const why = broken(p.x, p.z, p.r ?? 0);
    assert.equal(why, '', `${p.kind ?? p.at ?? 'a hedge'} at ${p.x.toFixed(1)},${p.z.toFixed(1)} is ${why}`);
  }
  // The raised course outside the gates lies on its lane, outside the walls and off the bridges.
  assert.equal(plan.causeways.length, 3);
  for (const c of plan.causeways) for (const t of [0, .5, 1]) {
    const x = c.a.x + (c.b.x - c.a.x) * t, z = c.a.z + (c.b.z - c.a.z) * t;
    assert.ok(laneGap(x, z) < 0 && !inMenora(x, z) && !menoraBridgeAt(x, z, 3) && !inGateOpening(x, z), `the raised course at ${x},${z}`);
  }
  // Courts are ground, not obstacles, but they stay off the lanes' paving and out from under the buildings.
  for (const c of plan.courts) for (const [u, v] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const x = c.x + u * c.width / 2, z = c.z + v * c.depth / 2;
    assert.ok(laneGap(x, z) > 0 && !MENORA_BUILDINGS.some(b => Math.abs(x - b.x) < b.width / 2 && Math.abs(z - b.z) < b.depth / 2), `court ${c.x},${c.z}`);
  }
});

test('The temple court and the plaza stay open: only lamps and banner poles stand at the plaza’s edge', () => {
  const plaza = { x: -2338, z: 137, width: 34, depth: 28 }; // the plaza menora-scenery.js paves
  const inside = p => Math.abs(p.x - plaza.x) < plaza.width / 2 && Math.abs(p.z - plaza.z) < plaza.depth / 2;
  for (const p of [...plan.trees, ...plan.props, ...plan.hedges, ...plan.courts]) assert.ok(!inside(p), `${p.kind ?? 'a court or hedge'} in the plaza at ${p.x},${p.z}`);
  for (const p of [...plan.lanterns, ...plan.banners].filter(inside))
    assert.ok(Math.min(plaza.width / 2 - Math.abs(p.x - plaza.x), plaza.depth / 2 - Math.abs(p.z - plaza.z)) < 2.5, `a post in the middle of the plaza at ${p.x},${p.z}`);
  for (const p of [...plan.trees, ...plan.props, ...plan.lanterns, ...plan.banners])
    for (const q of [MENORA_NPC_ANCHORS.cedric, MENORA.templeCourt]) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > 4);
});

test('The polish knows where all of Minora’s people stand', () => {
  const known = [...MENORA_POLISH_KEEP_CLEAR, ...LIZEEM_MARKET_STANDS];
  for (const p of [...MINORA_PEOPLE.filter(p => p.id !== 'amalthea'), ...LIZEEM_MINORA_PEOPLE, TALETH, MINORA_START, DIVIDING_PLACES.trestle, ...Object.values(DIVIDING_PLACES.guests)])
    assert.ok(known.some(k => Math.hypot(k.x - p.x, k.z - p.z) < .01), `${p.id ?? `${p.x},${p.z}`} is missing from MENORA_POLISH_KEEP_CLEAR`);
});

test('The bridges keep their decks and rails: nothing but a rail stands on a deck, and the arches add no collider', () => {
  const rails = city.colliders.filter(c => c.kind === 'bridge-rail');
  assert.equal(rails.length, MENORA_BRIDGES.length * 2);
  for (const c of city.colliders.filter(c => menoraBridgeAt(c.x, c.z))) assert.equal(c.kind, 'bridge-rail', `${c.id ?? c.kind} on a deck`);
  for (const name of ['The White Bridge', 'The Pilgrims’ Bridge']) {
    // The arch soffits hang under the deck, between the piers, and never rise through it.
    const mesh = city.scene.root.children.find(o => o.name === name), y = MENORA_BRIDGES[0].deck;
    const ys = mesh.geometry.attributes.position.array.filter((_, i) => i % 3 === 1);
    assert.ok(Math.max(...ys) < y + 2.3 && Math.min(...ys) < y - 9, name);
  }
});

const {getTreeRegistry}=await sourceModule('../src/world/scenery/tree-registry.js');
const {MINORA_STABLE}=await sourceModule('../src/content/regions/minora-frontier/minora-stable.js');
test('City planting is typed timber with separate harvestable instance slots; Bear and his horse stay clear',()=>{
  const registry=getTreeRegistry(city.colliders),trees=registry.trees.filter(t=>mine(t));
  assert.equal(trees.length,city.scene.metrics.polish.trees);
  assert.deepEqual(new Set(trees.map(t=>t.species)),new Set(['red-cedar','apple','dogwood','holm-oak']));
  for(const tree of trees){assert.equal(tree.harvestable,true);assert.equal(city.colliders.find(c=>c.id===tree.id).species,tree.species);}
  const tree=trees[0],neighbor=trees[1],blocker=city.colliders.find(c=>c.id===tree.id);
  assert.equal(registry.fell(tree.id),true);assert.ok(!city.colliders.includes(blocker));
  assert.ok(city.colliders.some(c=>c.id===neighbor.id));registry.regrow(tree.id);assert.ok(city.colliders.includes(blocker));
  for(const p of [MINORA_STABLE.bear,MINORA_STABLE.horse,{x:-2414,z:59}])
    for(const c of city.polish)assert.ok(!overlaps({...p,r:1.8},c),`${c.id} blocks the new tower departure`);
});
