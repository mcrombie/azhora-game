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

test('Lakota’s garden is in Tidehaven: his stand, the feeder hook and the hover point are all reachable', async () => {
  const { world } = await fixture();
  const garden = world.birdGarden;
  assert.equal(world.regionAt(garden.center.x, garden.center.z)?.name, 'Drent');
  assert.ok(canStand(garden.stand.x, garden.stand.z, world, .45), 'Lakota stands on open ground');
  for (const [id, p] of Object.entries(world.npcPositions)) assert.ok(flat(p, garden.stand) > 8, `Lakota stands clear of ${id}`);
  assert.ok(flat(garden.stand, world.spawn) < 90, 'the garden is in the village, not out in the woods');
  // The traveler can get close enough to the hook to hang the feeder, from open ground.
  let reachable = 0;
  for (let a = 0; a < 16; a++) { const x = garden.hook.x + Math.sin(a * Math.PI / 8) * 1.4, z = garden.hook.z + Math.cos(a * Math.PI / 8) * 1.4; if (canStand(x, z, world)) reachable++; }
  assert.ok(reachable >= 8, `the hook can be walked up to (${reachable} of 16 sides)`);
  assert.ok(garden.feeder.y > garden.hook.y + 1.2 && garden.feeder.y < garden.hook.y + 1.7, 'the feeder hangs at eye level');
  assert.ok(flat(garden.hover, garden.feeder) < .25 && flat(garden.hover, garden.feeder) > .1, 'the hummingbird feeds from beside the port');
  assert.equal(typeof world.setFeederHung, 'function');
});

/**
 * The user, 21 September 2026: spread the birds through the world, and make Drent less dense -
 * you observe one too easily there. Nine kinds left the first country, six of them out of the
 * village itself, which went from eleven habitats in sixty metres of street to five. The whole
 * list can no longer be filled without crossing the Caloss.
 */
test('every habitat has open ground and real perches, in the country it belongs to, clear of the roads’ people', async () => {
  const { world, BIRD_HABITATS, habitatSpots } = await fixture();
  const stands = Object.values(world.npcPositions);
  const species = new Set(), countries = new Map();
  for (const habitat of BIRD_HABITATS) {
    const spots = habitatSpots(habitat, world, stands);
    species.add(habitat.species);
    const country = world.regionAt(spots.center.x, spots.center.z)?.name ?? 'nowhere';
    countries.set(country, (countries.get(country) ?? 0) + 1);
    assert.ok(country !== 'nowhere', `${habitat.id} stands in no country at all`);
    assert.ok(spots.ground.length >= 6, `${habitat.id} has ground to forage (${spots.ground.length})`);
    for (const p of spots.ground) {
      assert.ok(canStand(p.x, p.z, world, .2), `${habitat.id} ground is open`);
      assert.ok(stands.every(s => flat(s, p) >= 1.6), `${habitat.id} ground is not under someone’s feet`);
    }
    // Some of them never leave the ground here: the heron in the shallows, the
    // ducks, the vultures in the stubble, the gulls on the landing.
    if (habitat.perches.length) assert.ok(spots.perches.length >= 3, `${habitat.id} keeps its perches`);
    for (const p of spots.perches) {
      const rise = p.y - world.heightAt(p.x, p.z);
      // In the village a perch is the top of a fence post or a barrel; out in
      // the country it is a branch, and a branch is higher.
      const ceiling = habitat.world ? 5 : 1.6;
      assert.ok(rise > .6 && rise < ceiling, `${habitat.id} perch at ${rise.toFixed(2)} m is not on top of anything`);
    }
  }
  assert.equal(species.size, 24, 'every bird but the hummingbird has somewhere to live');
  for (const id of ['cardinal', 'crow', 'heron', 'mallard', 'gull', 'barred-owl', 'turkey-vulture', 'kingfisher']) {
    assert.ok(species.has(id), `${id} lives nowhere`);
  }
  // Spread, and measured: Drent keeps its forest and its shore, the farm birds are across the
  // Caloss, the open-country birds are on the plain, and two want the lake country.
  assert.deepEqual([...countries.entries()].sort(), [['Amod', 1], ['Drent', 15], ['Elagos', 2], ['Luscia', 4], ['Moros Plain', 2]],
    'the birds are spread across five countries');
  const village = BIRD_HABITATS.filter(habitat => !habitat.world);
  assert.equal(village.length, 5, 'and Tidehaven itself keeps five, where it used to hold eleven');
});

test('Drent’s birds look different from one another: colour, size and silhouette', async () => {
  const { createBirdShapes, BIRD_FORMS } = await fixture();
  const shapes = createBirdShapes(), variants = Object.keys(BIRD_FORMS);
  assert.equal(variants.length, 27, 'twenty-five kinds, with the cardinal and the mallard drawn twice');
  for (const variant of variants) assert.ok(shapes[variant]?.body && shapes[variant].head && shapes[variant].wing, `${variant} is drawn`);
  const average = (variant, parts) => {
    const sum = [0, 0, 0]; let n = 0;
    for (const part of parts) {
      const colors = shapes[variant][part].attributes.color.array;
      for (let i = 0; i < colors.length; i += 3) for (let c = 0; c < 3; c++) sum[c] += colors[i + c];
      n += colors.length / 3;
    }
    return sum.map(c => c / n);
  };
  const signature = variant => {
    // The plumage, and the plumage with the head counted in: what a bird wears on
    // its head is half of telling one from another, which is why a crest and a
    // face are drawn at all. A crow and a pileated woodpecker are the same black
    // bird until you look at the head.
    const box = new THREE.Box3().setFromBufferAttribute(shapes[variant].body.attributes.position);
    const scale = BIRD_FORMS[variant].scale ?? 1, body = average(variant, ['body']);
    return { r: body[0], g: body[1], b: body[2], body, all: average(variant, ['body', 'head']),
      length: (box.max.z - box.min.z) * scale, height: (box.max.y - box.min.y) * scale };
  };
  const s = Object.fromEntries(variants.map(v => [v, signature(v)]));
  // Two black birds are allowed to be black. What is not allowed is for any two
  // of them to be the same colour and the same size, which is the same as saying
  // a player could not tell them apart.
  const apart = (x, y) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
  for (const a of variants) for (const b of variants) if (a < b) {
    const colour = Math.max(apart(s[a].body, s[b].body), apart(s[a].all, s[b].all));
    const size = Math.max(s[a].length, s[b].length) / Math.max(1e-6, Math.min(s[a].length, s[b].length));
    const height = Math.max(s[a].height, s[b].height) / Math.max(1e-6, Math.min(s[a].height, s[b].height));
    assert.ok(colour > .03 || size > 1.2 || height > 1.2, `${a} and ${b} are the same colour, size and shape`);
  }
  assert.ok(s.goldfinch.r > 2 * s.goldfinch.b, 'the goldfinch is yellow');
  // A bluebird is blue on the back and rust on the breast, so the blue only wins
  // the average; the jay, which is blue nearly all over, wins it by more.
  assert.ok(s.bluebird.b > s.bluebird.r && s.bluebird.b > s.bluebird.g, 'the bluebird is blue');
  assert.ok(s['blue-jay'].b > 1.5 * s['blue-jay'].r, 'the jay is bluer still');
  assert.ok(s['cardinal-male'].r > 8 * s['cardinal-male'].b, 'the cock cardinal is red all over');
  assert.ok(s.gull.r > .5 && s.gull.g > .5 && s.gull.b > .5, 'the gull is white');
  // A heron is not much longer than a robin. It is three times as tall, which is
  // the whole of what a heron is.
  assert.ok(s.heron.height > 2 * s.robin.height, 'a heron stands far taller than a robin');
  assert.ok(s.chickadee.length < s.robin.length, 'a chickadee is smaller than a robin');
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
  // Watched from near enough to be drawn and far enough not to spook anything:
  // once about the village, once out in the Greenway wood, so both the birds
  // authored in village metres and the ones authored in world metres are run.
  const actions = new Set();
  let watched = 0;
  for (const watcher of [{ x: world.spawn.x - 34, z: world.spawn.z + 18 }, { x: -108, z: 34 }]) {
    for (let t = 0; t < 60; t += .05) birds.update(.05, watcher);
    for (const bird of birds.state().birds.filter(b => b.species !== 'hummingbird')) {
      if (flat(bird, watcher) > 62) continue;
      const { habitat, spots } = home[bird.habitat];
      actions.add(bird.action); watched++;
      const own = [...spots.ground, ...spots.perches].reduce((best, p) => Math.min(best, flat(bird, p)), Infinity);
      assert.ok(own < 3, `${bird.id} has wandered off its own ground (${own.toFixed(1)} m from the nearest of its places)`);
      assert.ok(flat(bird, spots.center) < habitat.radius + 12, `${bird.id} is a long way from home (${flat(bird, spots.center).toFixed(1)} m)`);
      assert.ok(Number.isFinite(bird.y) && bird.y >= world.heightAt(bird.x, bird.z) - .05, `${bird.id} is above ground`);
    }
  }
  assert.ok(watched >= 12, `only ${watched} birds were near enough to be watched`);
  assert.ok(actions.size >= 2, `they do more than one thing (${[...actions]})`);

  const crow = birds.state().birds.find(b => b.species === 'crow' && b.action !== 'flight');
  assert.ok(crow, 'a crow to walk up to');
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
