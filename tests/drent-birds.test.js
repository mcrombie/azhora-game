import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BIRD_SPECIES } from '../src/birding.js';

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
let built = null;
async function fixture() {
  built ??= (async () => {
    const { createWorld } = await sourceModule('../src/world.js');
    const birds = await sourceModule('../src/drent-birds.js');
    return { world: createWorld(new THREE.Scene()), ...birds };
  })();
  return built;
}

test('Ansel’s garden is in Tidehaven: his stand, the feeder hook and the hover point are all reachable', async () => {
  const { world } = await fixture();
  const garden = world.birdGarden;
  assert.equal(world.regionAt(garden.center.x, garden.center.z)?.name, 'Drent');
  assert.ok(canStand(garden.stand.x, garden.stand.z, world, .45), 'Ansel stands on open ground');
  for (const [id, p] of Object.entries(world.npcPositions)) assert.ok(flat(p, garden.stand) > 8, `Ansel stands clear of ${id}`);
  assert.ok(flat(garden.stand, world.spawn) < 90, 'the garden is in the village, not out in the woods');
  // The traveler can get close enough to the hook to hang the feeder, from open ground.
  let reachable = 0;
  for (let a = 0; a < 16; a++) { const x = garden.hook.x + Math.sin(a * Math.PI / 8) * 1.4, z = garden.hook.z + Math.cos(a * Math.PI / 8) * 1.4; if (canStand(x, z, world)) reachable++; }
  assert.ok(reachable >= 8, `the hook can be walked up to (${reachable} of 16 sides)`);
  assert.ok(garden.feeder.y > garden.hook.y + 1.2 && garden.feeder.y < garden.hook.y + 1.7, 'the feeder hangs at eye level');
  assert.ok(flat(garden.hover, garden.feeder) < .25 && flat(garden.hover, garden.feeder) > .1, 'the hummingbird feeds from beside the port');
  assert.equal(typeof world.setFeederHung, 'function');
});

test('every habitat has open ground and real perches, in Drent, clear of the roads’ people', async () => {
  const { world, BIRD_HABITATS, habitatSpots } = await fixture();
  const stands = Object.values(world.npcPositions);
  const species = new Set();
  for (const habitat of BIRD_HABITATS) {
    const spots = habitatSpots(habitat, world, stands);
    species.add(habitat.species);
    assert.equal(world.regionAt(spots.center.x, spots.center.z)?.name, 'Drent', habitat.id);
    assert.ok(spots.ground.length >= 6, `${habitat.id} has ground to forage (${spots.ground.length})`);
    for (const p of spots.ground) {
      assert.ok(canStand(p.x, p.z, world, .2), `${habitat.id} ground is open`);
      assert.ok(stands.every(s => flat(s, p) >= 1.6), `${habitat.id} ground is not under someone’s feet`);
    }
    assert.ok(spots.perches.length >= 4, habitat.id);
    for (const p of spots.perches) {
      const rise = p.y - world.heightAt(p.x, p.z);
      assert.ok(rise > .6 && rise < 1.6, `${habitat.id} perch at ${rise.toFixed(2)} m sits on top of a fence or barrel`);
    }
  }
  assert.deepEqual([...species].sort(), ['cardinal', 'crow', 'titmouse', 'wren']);
});

test('Drent’s birds look different from one another: colour, size and silhouette', async () => {
  const { createBirdShapes, BIRD_FORMS } = await fixture();
  const shapes = createBirdShapes(), variants = Object.keys(BIRD_FORMS);
  assert.deepEqual(variants.sort(), ['cardinal-female', 'cardinal-male', 'crow', 'hummingbird', 'titmouse', 'wren']);
  const signature = variant => {
    const colors = shapes[variant].body.attributes.color.array, sum = [0, 0, 0];
    for (let i = 0; i < colors.length; i += 3) for (let c = 0; c < 3; c++) sum[c] += colors[i + c];
    const n = colors.length / 3, box = new THREE.Box3().setFromBufferAttribute(shapes[variant].body.attributes.position);
    return { r: sum[0] / n, g: sum[1] / n, b: sum[2] / n, length: (box.max.z - box.min.z) * (BIRD_FORMS[variant].scale ?? 1) };
  };
  const s = Object.fromEntries(variants.map(v => [v, signature(v)]));
  for (const a of variants) for (const b of variants) if (a < b)
    assert.ok(Math.hypot(s[a].r - s[b].r, s[a].g - s[b].g, s[a].b - s[b].b) > .03, `${a} and ${b} are coloured differently`);
  assert.ok(s['cardinal-male'].r > 2 * s['cardinal-male'].g, 'the cock cardinal is red');
  assert.ok(Math.max(s.crow.r, s.crow.g, s.crow.b) < .03, 'the crow is black');
  assert.ok(s.hummingbird.g > s.hummingbird.r, 'the hummingbird is green');
  assert.ok(s.crow.length > 1.3 * s['cardinal-male'].length && s.hummingbird.length < s.wren.length, 'a crow is big and a hummingbird is tiny');
  // The wren cocks its tail up; the cardinal's hangs down behind it.
  const tailRise = variant => { const p = shapes[variant].body.attributes.position.array; let rear = Infinity, y = 0; for (let i = 0; i < p.length; i += 3) if (p[i + 2] < rear) { rear = p[i + 2]; y = p[i + 1]; } return y; };
  assert.ok(tailRise('wren') > .18 && tailRise('cardinal-male') < .16);
});

test('birds go about their business at home, and fly off when the traveler comes too close', async () => {
  const { world, createDrentBirds, BIRD_HABITATS, habitatSpots } = await fixture();
  let seed = 7; const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const birds = createDrentBirds(new THREE.Scene(), world, { garden: world.birdGarden, avoid: Object.values(world.npcPositions), random });
  const home = Object.fromEntries(BIRD_HABITATS.map(h => [h.id, { habitat: h, spots: habitatSpots(h, world) }]));
  const watcher = { x: world.spawn.x, z: world.spawn.z };
  for (let t = 0; t < 90; t += .05) birds.update(.05, watcher);
  let perched = 0, actions = new Set();
  for (const bird of birds.state().birds.filter(b => b.species !== 'hummingbird')) {
    const { habitat, spots } = home[bird.habitat];
    actions.add(bird.action); if (bird.perched) perched++;
    assert.ok(flat(bird, spots.center) < habitat.radius + 4, `${bird.id} stays about home (${flat(bird, spots.center).toFixed(1)} m)`);
    assert.ok(Number.isFinite(bird.y) && bird.y >= world.heightAt(bird.x, bird.z) - .05, `${bird.id} is above ground`);
  }
  assert.ok(actions.size >= 2, `they do more than one thing (${[...actions]})`);

  const crow = birds.state().birds.find(b => b.species === 'crow' && b.action !== 'flight');
  const near = { x: crow.x + 3, z: crow.z };
  birds.update(.05, near);
  assert.equal(birds.state().birds.find(b => b.id === crow.id).action, 'flight', 'a crow will not let you near');
  for (let t = 0; t < 4; t += .05) birds.update(.05, near);
  const landed = birds.state().birds.find(b => b.id === crow.id);
  assert.ok(flat(landed, near) > BIRD_SPECIES.crow.spook, `it lands out of reach (${flat(landed, near).toFixed(1)} m)`);
  birds.dispose();
});

test('the hummingbird comes only while the feeder is hung, and can be observed while it feeds', async () => {
  const { world, createDrentBirds } = await fixture();
  const birds = createDrentBirds(new THREE.Scene(), world, { garden: world.birdGarden, random: () => .5 });
  const garden = world.birdGarden, watcher = { x: garden.feeder.x + 7, z: garden.feeder.z + 3 };
  const hummer = () => birds.state().birds.find(b => b.species === 'hummingbird');
  for (let t = 0; t < 30; t += .05) birds.update(.05, watcher, { feederHung: false });
  assert.deepEqual([hummer().action, hummer().visible], ['away', false]);
  assert.equal(birds.observable(watcher, null, 30)?.species === 'hummingbird', false);
  let seen = false;
  for (let t = 0; t < 40 && !seen; t += .05) {
    birds.update(.05, watcher, { feederHung: true });
    seen = hummer().action === 'sip';
  }
  assert.ok(seen, 'it arrives and feeds');
  assert.ok(flat(hummer(), garden.hover) < .2);
  const spotted = birds.observable({ x: garden.feeder.x + 2.5, z: garden.feeder.z + .5 }, null, 18);
  assert.equal(spotted?.species, 'hummingbird');
  assert.equal(birds.observable({ x: garden.feeder.x + 40, z: garden.feeder.z }, null, 18)?.species === 'hummingbird', false, 'out of range');
  birds.update(.05, { x: garden.hover.x + .5, z: garden.hover.z }, { feederHung: true });
  assert.equal(hummer().action, 'leave', 'it will not feed with someone standing over it');
  birds.dispose();
});
