import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { hexOwnerAt, insideRegion } from '../src/world/terrain/region-world.js';
import { CLIMBING, isClimbTerrain, canWalkSlope } from '../src/gameplay/movement/climbing.js';
// The authored hiking routes retain their modest grades; the main build also allows
// deliberate stamina-driven free climbing on steeper ground. These are geometry budgets,
// not an obsolete player movement controller.
const HIKING_ROUTE = Object.freeze({ easy: .7, limit: 1.19, stand: 1.35, reach: 1.2 });
import { moveCharacter, canStand } from '../src/gameplay/movement/game-state.js';
import {
  FERADOM, FERADOM_BOX, INLAND_BORDER, MIDLINE, PASSES, BELT, GULLIES, GULLY_HALF, SUMMITS, TOWERS, YARDS,
  hillRise, beltAt, beltPoint, beltScale, midlineAt, passPoint, inBarrierHills, feradomGround, scarpAt,
} from '../src/content/regions/feradom/feradom-world.js';
import { PASS_CASTLES, FERADOM_TOWERS, FERADOM_LANDMARKS } from '../src/content/regions/feradom/feradom-forts.js';
import { FERADOM_GARRISON, FERADOM_WALL_FIGURES } from '../src/content/regions/feradom/feradom-people.js';
import { closedRegionEntered, createBorderWatch } from '../src/world/travel/closed-border.js';
import { FERADOM_BARRIER } from '../src/content/regions/pueth/pueth-world.js';
import { SUBREGIONS } from '../src/ui/map/map-fog.js';
import { FERADOM_PASS_WILDLIFE_ZONES } from '../src/content/regions/feradom/feradom-wildlife.js';
const { LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');

/**
 * Feradom's barrier hills (the user, 27 September 2026: "start building the Feradom region, paying
 * careful attention to detail when crafting the hills, making them obstacles but not mountains, and
 * lining the border with fortresses occupied by soldiers from the Duchy of Feradom's own independent
 * army"). The lore: "not dramatic in height but dense in tree cover and limited in crossing points. A
 * half-dozen usable passes... A tower above the narrows. A castle at the point where the valley behind a
 * pass opens... Cleared ground in front, walls at the back."
 */
test('the belt runs the whole inland border, from the Ordel to the East Lotharn, and only in Feradom', () => {
  assert.equal(INLAND_BORDER[0].neighbour, 'Pueth', 'it starts on the Ordel, at the Pueth border');
  assert.equal(INLAND_BORDER.at(-1).neighbour, 'East Lotharn Mountains', 'and ends against the East Lotharn');
  assert.deepEqual([...new Set(INLAND_BORDER.map(edge => edge.neighbour))], ['Pueth', 'Amod', 'East Lotharn Mountains']);
  assert.ok(INLAND_BORDER[0].a.x > INLAND_BORDER.at(-1).b.x, 'east to west');
  assert.ok(MIDLINE.length > 1300);
  // Nothing is raised outside Feradom: not in Pueth, Amod or the mountains.
  for (let x = FERADOM_BOX.minX; x <= FERADOM_BOX.maxX; x += 7) for (let z = FERADOM_BOX.minZ; z <= FERADOM_BOX.maxZ; z += 7) {
    if (hexOwnerAt(x, z) !== FERADOM) assert.equal(hillRise(x, z), 0, `raised at ${x}, ${z} in ${hexOwnerAt(x, z)}`);
  }
});

test('hills, not mountains: forty metres at the most, twenty and more along most of the border', () => {
  let highest = 0;
  const crests = [];
  for (let s = 140; s < MIDLINE.length - 140; s += 10) {
    let top = 0;
    for (let d = 0; d < 180; d += 3) { const p = beltPoint(s, d); top = Math.max(top, hillRise(p.x, p.z)); }
    crests.push(top); highest = Math.max(highest, top);
  }
  crests.sort((a, b) => a - b);
  assert.ok(highest < 45, `the highest summit stands ${highest.toFixed(0)} m above its ground`);
  assert.ok(crests[Math.floor(crests.length * .5)] > 20, `half the border's hills top twenty metres (${crests[Math.floor(crests.length * .5)].toFixed(0)})`);
  // Summits in two rows and knolls between: hills, not a wall.
  assert.ok(SUMMITS.filter(one => one.kind === 'front').length >= 12 && SUMMITS.filter(one => one.kind === 'back').length >= 10);
  assert.equal(PASSES.length, 6, '"a half-dozen usable passes"');
});

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const g = world.groundHeight;

test('the ground as the world has it: the hills stand on the ground beneath them, the passes are cut through', () => {
  for (const castle of PASS_CASTLES) {
    const levels = castle.circuit.corners.map(p => g(p.x, p.z));
    assert.ok(Math.max(...levels) - Math.min(...levels) < .05, `${castle.id}'s yard is level`);
  }
  for (const tower of TOWERS) {
    const levels = [[0, 0], [2.5, 0], [0, 2.5], [-2.5, -2.5]].map(([a, b]) => g(tower.x + a, tower.z + b));
    assert.ok(Math.max(...levels) - Math.min(...levels) < .05, `${tower.id} stands on a level pad`);
  }
  // Every pass's floor through the hills - the gorge, the yard, the valley behind - is walked: never steeper
  // than a walk. The valley's last stretch down to the coast is the hills' own back slope, which under the
  // East Lotharn falls with the mountains' foot and may be a short climb from below, never a wall; and in
  // front of the mouth is the ground as it was.
  for (const pass of PASSES) {
    let steepest = 0, lowest = 0;
    for (let rel = 4; rel < 146; rel += 2) {
      const a = passPoint(pass, 0, rel), b = passPoint(pass, 0, rel + 2);
      const grade = Math.abs(g(b.x, b.z) - g(a.x, a.z)) / Math.hypot(b.x - a.x, b.z - a.z);
      if (rel < 100) steepest = Math.max(steepest, grade); else lowest = Math.max(lowest, grade);
    }
    assert.ok(steepest < HIKING_ROUTE.easy, `${pass.id}'s floor rises ${steepest.toFixed(2)} at the steepest`);
    assert.ok(lowest < 1, `${pass.id}'s valley falls ${lowest.toFixed(2)} at the steepest`);
  }
});

// Where a traveler can get to, stepping a metre and a half at a time: up no steeper than the climbing
// rule allows, never up onto ground too steep to stand on (he slips off it, `slip`), down anything.
// Started along the whole foot of the belt, clear of its dying ends.
const STEP = 1.5, box = FERADOM_BOX, W = Math.ceil((box.maxX - box.minX) / STEP), H = Math.ceil((box.maxZ - box.minZ) / STEP);
const heights = new Float32Array(W * H), where = new Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const x = box.minX + i * STEP, z = box.minZ + j * STEP, k = j * W + i;
  heights[k] = g(x, z);
  where[k] = hexOwnerAt(x, z) === FERADOM ? beltAt(x, z) : null;
}
const steep = new Float32Array(W * H);
for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
  const k = j * W + i;
  steep[k] = Math.hypot(heights[k + 1] - heights[k - 1], heights[k + W] - heights[k - W]) / (2 * STEP);
}
const ENDS = 150;
function reachable(open) {
  const reach = new Uint8Array(W * H), queue = [];
  const usable = k => {
    const at = where[k];
    if (!at || at.s < ENDS || at.s > MIDLINE.length - ENDS) return false;
    const x = box.minX + (k % W) * STEP, z = box.minZ + Math.floor(k / W) * STEP;
    // Along the shore the hills lie down to nothing; the shore is not the way through them.
    if (world.waterAt && world.waterAt(x, z) > heights[k] - 1) return false;
    if (hillRise(x, z) <= 0 && at.d > BELT.foot * at.k + 2) return true;
    const inPass = PASSES.some(pass => Math.abs(at.s - pass.s) < 40 * pass.k);
    const inGully = GULLIES.some(gully => Math.abs(at.s - gully.s) < GULLY_HALF + 4);
    return (!inPass || open.passes) && (!inGully || open.gullies);
  };
  for (let k = 0; k < W * H; k++) {
    const at = where[k];
    if (at && at.d > 0 && at.d < BELT.foot * at.k - 4 && usable(k)) { reach[k] = 1; queue.push(k); }
  }
  while (queue.length) {
    const k = queue.pop(), i = k % W, j = (k - i) / W;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ii = i + a, jj = j + b;
      if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
      const n = jj * W + ii;
      if (reach[n] || !usable(n)) continue;
      const rise = heights[n] - heights[k];
      if (rise > HIKING_ROUTE.limit * STEP * Math.hypot(a, b) || (rise > 0 && steep[n] > HIKING_ROUTE.stand)) continue;
      reach[n] = 1; queue.push(n);
    }
  }
  return reach;
}
const behind = k => where[k] && where[k].d > (BELT.backTo + 20) * where[k].k && hillRise(box.minX + (k % W) * STEP, box.minZ + Math.floor(k / W) * STEP) === 0;

test('the authored hiking-grade crossings follow passes and gullies rather than the bare rock band', () => {
  const count = reach => { let n = 0; for (let k = 0; k < W * H; k++) if (reach[k] && behind(k)) n++; return n; };
  assert.equal(count(reachable({ passes: false, gullies: false })), 0, 'the rock band shuts the border everywhere else');
  assert.ok(count(reachable({ passes: true, gullies: false })) > 1000, 'through the passes');
  assert.ok(count(reachable({ passes: false, gullies: true })) > 1000, 'up the gullies, for a determined traveler');
});

test('direct border slopes exceed the authored hiking grade before the rock band top', () => {
  // The ground's own verdict, step by step up the fall line: the first step the rule refuses. (Walking
  // into the rock with the game's own move slides a traveler along its foot, and into the nearest gully.)
  const withinHikingGrade = (x, z, dx, dz) => {
    if (!inBarrierHills(x, z)) return true;
    const length = Math.hypot(dx, dz), reach = HIKING_ROUTE.reach;
    return !length || (g(x + dx / length * reach, z + dz / length * reach) - g(x, z)) / reach <= HIKING_ROUTE.limit;
  };
  const tried = [];
  for (let s = 180; s < MIDLINE.length - 180; s += 13) {
    if (GULLIES.some(gully => Math.abs(s - gully.s) < GULLY_HALF + 8) || PASSES.some(pass => Math.abs(s - pass.s) < 50 * pass.k)) continue;
    tried.push(s);
    const m = midlineAt(s), at = { ...beltPoint(s, 4) }, start = g(at.x, at.z), k = beltScale(s);
    for (let i = 0; i < 900 && withinHikingGrade(at.x, at.z, m.inward.x * .12, m.inward.z * .12); i++) { at.x += m.inward.x * .12; at.z += m.inward.z * .12; }
    // Up the talus - which, where the ground falls away from the East Lotharn, is itself too steep to go
    // all the way up - and never past the rock band's top.
    const reached = beltAt(at.x, at.z).d, scarp = scarpAt(s);
    assert.ok(reached > scarp.foot, `at ${s} he never reached the hills (${reached.toFixed(0)} m in)`);
    assert.ok(reached < scarp.cragTop + 2, `at ${s} he got ${reached.toFixed(0)} m in, past the rock at ${scarp.cragTop.toFixed(0)}`);
    assert.ok(g(at.x, at.z) - start < (BELT.talusRise + BELT.cragRise) * k + 2, 'and no higher than the rock band');
  }
  assert.ok(tried.length > 30, `${tried.length} places along the border`);
});

test('the castles shut their passes: the front gate is shut, the back gate open, the yard walled across', () => {
  for (const castle of PASS_CASTLES) {
    const pass = PASSES.find(one => one.id === castle.pass);
    // Up the gorge to the shut gate, and no further.
    const walker = { ...passPoint(pass, 0, 20) }, gate = passPoint(pass, 0, 40);
    const dx = gate.x - walker.x, dz = gate.z - walker.z, l = Math.hypot(dx, dz);
    for (let i = 0; i < 300; i++) moveCharacter(walker, dx / l * .12, dz / l * .12, world, .34);
    assert.ok(Math.hypot(walker.x - passPoint(pass, 0, 20).x, walker.z - passPoint(pass, 0, 20).z) < l - .6, `${castle.id}'s front gate is shut`);
    // Out of the yard through the open back gate, down the valley.
    const inside = { ...passPoint(pass, 0, 60) }, out = passPoint(pass, 0, 92);
    for (let i = 0; i < 400 && Math.hypot(out.x - inside.x, out.z - inside.z) > .4; i++) {
      const ox = out.x - inside.x, oz = out.z - inside.z, ol = Math.hypot(ox, oz);
      moveCharacter(inside, ox / ol * .12, oz / ol * .12, world, .34);
    }
    assert.ok(Math.hypot(out.x - inside.x, out.z - inside.z) < 1, `${castle.id}'s back gate is open`);
    assert.ok(castle.circuit.towers.length >= (castle.great ? 8 : 4));
  }
  assert.equal(PASS_CASTLES.filter(castle => castle.great).map(castle => castle.pass).join(), 'road-pass', 'the great castle holds the road');
});

test('the border is lined: a castle in every pass, a tower above every narrows, watchtowers between', () => {
  assert.equal(PASS_CASTLES.length, PASSES.length);
  assert.equal(FERADOM_TOWERS.filter(tower => tower.kind === 'narrows').length, PASSES.length);
  assert.ok(FERADOM_TOWERS.filter(tower => tower.kind === 'watch').length >= 4);
  // No stretch of the border is more than three hundred metres from a castle or a tower.
  const works = [...PASSES.map(pass => pass.s), ...FERADOM_TOWERS.map(tower => beltAt(tower.x, tower.z).s)].sort((a, b) => a - b);
  for (let i = 1; i < works.length; i++) assert.ok(works[i] - works[i - 1] < 300, `a gap of ${(works[i] - works[i - 1]).toFixed(0)} m`);
  // The Road Pass is where the Feradom road comes up from the army's barrier in Pueth.
  const road = PASSES.find(pass => pass.id === 'road-pass');
  assert.ok(Math.hypot(road.mouth.x - FERADOM_BARRIER.x, road.mouth.z - FERADOM_BARRIER.z) < 30);
  for (const id of ['barrier-hills', ...PASSES.map(pass => pass.id)]) assert.ok(FERADOM_LANDMARKS.some(place => place.id === id), id);
  // The chart's areas stand where the passes are.
  for (const pass of PASSES) {
    const area = SUBREGIONS.find(one => one.id === `feradom-${pass.id}`);
    assert.ok(area && Math.hypot(area.x - pass.yard.x, area.z - pass.yard.z) < 10, `the chart has ${pass.id} where it is`);
  }
});

test('the garrison is the Duchy\'s own, stands on its own ground, and keeps its towers', () => {
  for (const person of FERADOM_GARRISON) {
    assert.match(person.modelRole, /^feradom-(soldier|officer)$/);
    assert.ok(insideRegion(FERADOM, person.x, person.z), `${person.id} is in Feradom`);
    assert.ok(canStand(person.x, person.z, world, .34), `${person.id} has room to stand`);
    assert.ok(person.lines.length >= 2);
    for (const line of person.lines) assert.doesNotMatch(line, /\bEmpire’s men\b|legion/i);
  }
  assert.equal(FERADOM_GARRISON.filter(person => person.modelRole === 'feradom-officer').length, 1);
  assert.ok(FERADOM_WALL_FIGURES.length >= PASSES.length + 4, 'sentries on the towers and walls');
  for (const figure of FERADOM_WALL_FIGURES) assert.ok(figure.lift > 3, `${figure.id} is up on the works`);
});

test('the hills\' animals stand on open ground in the valleys behind the castles, and none of them is a fight', () => {
  const species = new Set(FERADOM_PASS_WILDLIFE_ZONES.map(zone => zone.species));
  for (const kind of ['red-deer', 'boar', 'upland-hare', 'plateau-hawk']) assert.ok(species.has(kind), kind);
  const population = FERADOM_PASS_WILDLIFE_ZONES.reduce((total, zone) => total + zone.sites.length, 0);
  assert.ok(population >= 8 && population <= 18, `a modest population (${population})`);
  for (const zone of FERADOM_PASS_WILDLIFE_ZONES) {
    assert.equal(zone.region, FERADOM);
    assert.ok(zone.note.length > 60 && /Extension/.test(zone.note), `${zone.id} says it is the builder's, not the lore's`);
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH, `${zone.id} can be kept in reach`);
    for (const [x, z] of zone.sites) {
      assert.ok(x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ, `${zone.id}: a site lies outside its range`);
      if (zone.air) continue;
      assert.equal(hexOwnerAt(x, z), FERADOM, `${zone.id} site out of Feradom`);
      assert.ok(canStand(x, z, world, zone.radius), `${zone.id} site cannot be stood on`);
    }
  }
});

test('the border is shut: crossing from Pueth, Amod or the mountains is refused, with Feradom\'s own word', () => {
  const road = PASSES.find(pass => pass.id === 'road-pass');
  const from = { x: FERADOM_BARRIER.x, z: FERADOM_BARRIER.z }, to = passPoint(road, 0, 10);
  assert.equal(closedRegionEntered(from, to), FERADOM);
  const watch = createBorderWatch(), turned = watch.step(from, to, 0);
  assert.equal(turned.refused, true); assert.match(turned.title, /FERADOM/); assert.match(turned.toast, /russet|duchy|Feradom|passes/i);
  assert.equal(closedRegionEntered(to, from), null, 'leaving is allowed');
});

test('the hills\' ground stands on the ground beneath it, and without that ground the passes still cut', () => {
  const road = PASSES.find(pass => pass.id === 'road-pass'), p = passPoint(road, 0, 26), q = beltPoint(road.s + 60, 70);
  assert.ok(feradomGround(p.x, p.z, 10) < feradomGround(q.x, q.z, 10) - 8, 'the narrows lie well below the hills beside them');
  assert.equal(feradomGround(FERADOM_BARRIER.x, FERADOM_BARRIER.z, 7), 7, 'Pueth is left alone');
});



test('Feradom uses the current free-climbing terrain support and stops ordinary walking up steep hills', () => {
  for (const pass of PASSES) assert.ok(isClimbTerrain(world, pass.yard.x, pass.yard.z), pass.id);
  const s = 470, scarp = scarpAt(s), direction = midlineAt(s).inward;
  let blocked = 0;
  for (let depth = scarp.talusTop; depth < scarp.cragTop; depth += .2) {
    const from = beltPoint(s, depth), to = { x: from.x + direction.x * .12, z: from.z + direction.z * .12 };
    const slope = (g(to.x, to.z) - g(from.x, from.z)) / .12;
    if (slope <= CLIMBING.grabSlope) continue;
    assert.equal(canWalkSlope(from.x, from.z, to.x, to.z, world), false);
    blocked++;
  }
  assert.ok(blocked > 0, 'the scarp needs deliberate climbing instead of ordinary walking');
});

test('Birch Pass wooded hill overlaps have continuous ground and can be walked through', () => {
  // The old fixed-width summit blend jumped .69 m here over one 12 cm movement step.
  // Its 3 m render mesh hid that lip, so the character met an apparently invisible wall.
  const from = { x: -566.0107205633631, z: -656.9843006150509 };
  for (const [dx, dz] of [[-.12, 0], [0, -.12], [.12, 0], [0, .12]]) {
    const to = { x: from.x + dx, z: from.z + dz };
    const grade = Math.abs(g(to.x, to.z) - g(from.x, from.z)) / .12;
    assert.ok(grade < .5, `the wooded shoulder is gentle (${grade})`);
    assert.ok(canStand(to.x, to.z, world), 'there is no physical obstacle on the sampled shoulder');
    assert.equal(canWalkSlope(from.x, from.z, to.x, to.z, world), true);
    const walker = { ...from };
    moveCharacter(walker, dx, dz, world, .34, { canTraverse: (x,z,nx,nz) => canWalkSlope(x,z,nx,nz,world) });
    assert.ok(Math.hypot(walker.x - from.x, walker.z - from.z) > .115, 'ordinary walking crosses the former hidden lip');
  }
  // Check both sides of that overlap, not just its exact reported movement direction.
  for (let t = -.6; t < .6; t += .01) {
    const a = g(from.x + t, from.z), b = g(from.x + t + .001, from.z);
    assert.ok(Math.abs(a - b) < .001, 'no sub-metre discontinuity concealed by the terrain mesh');
  }
});

test('a clear steep descent beside Birch Pass is not an invisible wall', () => {
  const from = { x: -676.0107205633631, z: -798.9843006150509 };
  const to = { x: from.x, z: from.z + .12 };
  assert.ok(canStand(from.x,from.z,world) && canStand(to.x,to.z,world));
  assert.ok(g(from.x,from.z) - g(to.x,to.z) > .12 * CLIMBING.grabSlope);
  assert.equal(canWalkSlope(from.x,from.z,to.x,to.z,world),true,'stepping downward is allowed; gravity handles the fall');
  assert.equal(canWalkSlope(to.x,to.z,from.x,from.z,world),false,'climbing is still required to come back up the steep face');
});
