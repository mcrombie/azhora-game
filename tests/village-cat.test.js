import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { VILLAGE_CAT, CAT_FAVOURITES, CAT_WILL_EAT, CAT_SENSES, createVillageCat } from '../src/village-cat.js';

const sequence = values => { let i = 0; return () => values[i++ % values.length]; };
const far = { player: { x: 200, z: 200 } };

/** Let the cat live for a while, moving it where it wants to go the way the game loop does. */
function live(cat, seconds, env = far, dt = .1, seen = null) {
  let want;
  for (let t = 0; t < seconds; t += dt) {
    want = cat.update(dt, typeof env === 'function' ? env(t) : env);
    seen?.add(cat.state.mode);
    const { x, z } = cat.state, d = Math.hypot(want.x - x, want.z - z);
    if (d > .01) { const step = Math.min(d, want.pace * dt); cat.place(x + (want.x - x) / d * step, z + (want.z - z) / d * step); }
  }
  return want;
}
const awake = (random = sequence([.5])) => { const cat = createVillageCat({ random }); live(cat, 21); return cat; };
const gapTo = (cat, p) => Math.hypot(cat.state.x - p.x, cat.state.z - p.z);

test('the cat naps in the sun, washes, prowls between its places, and now and then stalks and pounces', () => {
  const cat = createVillageCat({ random: sequence([.1, .8, .3, .6, .2, .9, .45]) });
  assert.equal(cat.state.mode, 'napping', 'it starts asleep');
  assert.equal(live(cat, 5).posture, 'nap');
  const seen = new Set(), visited = new Set();
  for (let i = 0; i < 90; i++) { live(cat, 10, far, .1, seen); visited.add(cat.state.spot); }
  for (const mode of ['napping', 'grooming', 'prowling', 'stalking', 'pouncing']) assert.ok(seen.has(mode), `it was never ${mode}`);
  assert.ok(visited.size >= 3, 'it gets about');
  assert.ok(cat.state.stalks >= 1 && cat.state.naps >= 2);
});

test('it watches a traveler who comes near, and comes to wind round their legs only if they stand still', () => {
  const cat = awake();
  const player = { x: cat.state.x + 3.5, z: cat.state.z };
  let want = live(cat, 1, { player, speed: 0 });
  assert.equal(cat.state.mode, 'watching');
  assert.equal(want.posture, 'sit');
  assert.deepEqual(want.face, player, 'it looks at you');
  want = live(cat, 8, { player, speed: 0 });
  assert.equal(cat.state.mode, 'rubbing', 'standing still, it comes over');
  assert.equal(want.posture, 'rub');
  assert.ok(gapTo(cat, player) < 1, 'round your ankles');
  live(cat, 10, { player, speed: 0 });
  assert.equal(cat.state.rubs, 1);
  assert.ok(cat.state.trust > 0, 'it trusts you a little more');

  // Walk straight up to a cat that does not know you, and it moves off.
  const shy = awake(), toward = { x: shy.state.x + .9, z: shy.state.z };
  live(shy, .3, { player: toward, speed: 2 });
  assert.equal(shy.state.mode, 'wary');
  live(shy, 3, { player: toward, speed: 2 });
  assert.ok(gapTo(shy, toward) > 3, 'it keeps its distance');
  assert.equal(live(shy, 2, { player: toward, speed: 0 }).posture, 'sit', 'and then sits and watches again');
});

test('running at it, the dog, or a fight sends it off to hide, and a fight keeps it hidden', () => {
  const cat = awake(), runner = { x: cat.state.x + 2.5, z: cat.state.z };
  live(cat, .2, { player: runner, speed: 7 });
  assert.equal(cat.state.mode, 'bolting');
  assert.ok(live(cat, .1, { player: runner, speed: 7 }).pace > 5, 'it goes at a sprint');
  live(cat, 12, { player: runner, speed: 0 });
  assert.ok(gapTo(cat, runner) > 8, 'well away');

  const chased = awake();
  live(chased, .2, { ...far, dog: { x: chased.state.x + 1.5, z: chased.state.z } });
  assert.equal(chased.state.mode, 'bolting', 'the dog is not welcome');

  const scared = awake(), fighter = { x: scared.state.x + 6, z: scared.state.z };
  live(scared, 15, { player: fighter, fight: true });
  assert.equal(scared.state.mode, 'hiding');
  live(scared, 60, { player: fighter, fight: true });
  assert.equal(scared.state.mode, 'hiding', 'it stays hidden while the fight goes on');
  assert.equal(scared.state.bolts, 1, 'once hidden it does not keep running');
  live(scared, 25, far);
  assert.notEqual(scared.state.mode, 'hiding', 'and comes out after');
});

test('fish is gone at once and buys company; meat, perhaps; bread earns a look; a hand may be welcome or not', () => {
  const cat = awake(), player = { x: cat.state.x + 2, z: cat.state.z };
  const fish = cat.feed({ itemId: 'raw-fish' });
  assert.equal(fish.ate, true); assert.match(fish.line, /fish is out of your hand/); assert.match(fish.line, /first time/);
  assert.equal(cat.state.mode, 'eating'); assert.equal(cat.state.trust, .3);
  live(cat, 5.5, { player, speed: 0 });
  assert.equal(cat.state.mode, 'rubbing', 'and says thank you');
  live(cat, 10, { player, speed: 0 });
  assert.equal(cat.state.mode, 'loitering');
  const onward = { x: player.x + 14, z: player.z };
  live(cat, 12, { player: onward, speed: 1.5 });
  const kept = gapTo(cat, onward);
  assert.ok(kept > 2 && kept < 7.5, `it keeps you company at a careful distance (${kept.toFixed(1)} m)`);
  live(cat, 90, { player: onward, speed: 0 });
  assert.notEqual(cat.state.mode, 'loitering', 'for a while');

  const picky = awake();
  const bread = picky.feed({ itemId: 'rye-loaf' });
  assert.equal(bread.ate, false); assert.match(bread.line, /disappointment/);
  assert.equal(picky.feed({ itemId: CAT_WILL_EAT[0], roll: .9 }).ate, false, 'not in the mood');
  assert.equal(picky.feed({ itemId: CAT_WILL_EAT[0], roll: .2 }).ate, true);
  assert.ok(CAT_FAVOURITES.every(id => !CAT_WILL_EAT.includes(id)));

  const stranger = awake();
  const swat = stranger.pet({ roll: .95 });
  assert.equal(swat.purred, false); assert.match(swat.line, /bats your hand/);
  assert.equal(stranger.state.mode, 'prowling', 'and stalks off');
  const friend = awake(); friend.feed({ itemId: 'cooked-fish' }); friend.feed({ itemId: 'smoked-eel' });
  assert.match(friend.pet({ roll: .4 }).line, /purrs/);
  assert.match(friend.pet({ roll: .1 }).line, /belly/);
  assert.match(createVillageCat().pet().line, /one eye/, 'a sleeping cat allows one stroke');

  const before = JSON.stringify(stranger.state);
  stranger.update(NaN, far); stranger.update(-1, far);
  assert.equal(JSON.stringify(stranger.state), before, 'invalid time is ignored');
});

test('it only sets off for a place it can see, and sits down where it is when something blocks it', () => {
  const spots = VILLAGE_CAT.spots;
  const cat = createVillageCat({ random: sequence([.5]), clear: (from, to) => to === spots[2] });
  for (let i = 0; i < 6; i++) { live(cat, 30); if (cat.state.mode === 'prowling') break; }
  assert.equal(cat.state.mode, 'prowling');
  assert.equal(cat.state.spot, 2, 'the only place in sight');

  const blocked = awake();
  blocked.pet({ roll: .99 });
  assert.equal(blocked.state.mode, 'prowling');
  for (let i = 0; i < 40; i++) blocked.update(.1, far);   // the game never lets it move
  assert.equal(blocked.state.mode, 'sitting', 'it gives up and sits');
  assert.ok(CAT_SENSES.shy < CAT_SENSES.notice);
});

test('the harbour cat’s places are in Tidehaven, on open ground, clear of people, and joined by clear lines', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const { canStand } = await import('../src/game-state.js');
  const { clearLine } = await import('../src/autopilot.js');
  const world = createWorld(new THREE.Scene());
  const people = Object.values(world.npcPositions);
  for (const spot of VILLAGE_CAT.spots) {
    assert.equal(world.regionAt(spot.x, spot.z)?.name, 'Drent', spot.id);
    assert.ok(canStand(spot.x, spot.z, world, .3), `${spot.id} is not open ground`);
    assert.ok(people.every(p => Math.hypot(p.x - spot.x, p.z - spot.z) > 2.5), `${spot.id} is on top of somebody`);
  }
  // Every place can be reached from every other by clear straight legs.
  const clear = (a, b) => clearLine(a, b, world, .25), reached = new Set([0]), queue = [0];
  while (queue.length) { const i = queue.shift(); VILLAGE_CAT.spots.forEach((spot, j) => { if (!reached.has(j) && clear(VILLAGE_CAT.spots[i], spot)) { reached.add(j); queue.push(j); } }); }
  assert.equal(reached.size, VILLAGE_CAT.spots.length, 'a place the cat can never walk to');
});

test('the cat is a small four-legged tabby that holds every pose it is asked for', async () => {
  const { createCat } = await sourceModule('../src/characters.js');
  for (const variant of [0, 1]) {
    const cat = createCat({ variant });
    assert.equal(cat.group.name, `cat-${variant}`);
    for (const name of ['Weight and hips', 'Spine', 'Neck', 'Head', 'Tail', 'Tail Tip', 'Left Fore Hip', 'Right Fore Knee', 'Left Hind Hip', 'Right Hind Knee']) {
      assert.ok(cat.group.getObjectByName(name)?.isGroup, `cat has a ${name}`);
    }
    let draws = 0, triangles = 0;
    cat.group.traverse(object => { if (object.isMesh) { draws++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3; } });
    assert.ok(draws <= 16, `cat ${variant} draws ${draws} batches`);
    assert.ok(triangles < 4500, `cat ${variant} has ${triangles} triangles`);
    let time = 0;
    for (const posture of ['stand', 'walk', 'nap', 'sit', 'groom', 'crouch', 'pounce', 'eat', 'rub', 'low']) {
      for (let i = 0; i < 60; i++) { time += 1 / 30; cat.animate(time, posture === 'walk' ? 1.1 : posture === 'low' ? 5.5 : 0, true, { posture }); }
      cat.group.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(cat.group);
      assert.ok([bounds.min.y, bounds.max.y, bounds.min.z, bounds.max.z].every(Number.isFinite), `${posture} is finite`);
      assert.ok(bounds.min.y > -0.035 && bounds.min.y < 0.05, `${posture}: paws or belly rest at the ground (${bounds.min.y.toFixed(3)})`);
      assert.ok(bounds.max.y < 0.65, `${posture}: a cat stands below a man's knee (${bounds.max.y.toFixed(2)})`);
      if (posture === 'nap') assert.ok(bounds.max.y < 0.32, 'curled up, it is low');
    }
  }
});
