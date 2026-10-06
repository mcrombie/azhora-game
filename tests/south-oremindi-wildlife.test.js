import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, canSwim } from '../src/gameplay/movement/game-state.js';
import { SOUTH_OREMINDI_WILDLIFE_ZONES as zones } from '../src/content/regions/south-oremindi/south-oremindi-wildlife.js';
import { SOUTH_OREMINDI, SOUTH_OREMINDI_CELLS, LAKES, southOremindiCellAt,
  southOremindiGround, southOremindiWaterAt, southOremindiOwns, southOremindiFeatures } from '../src/content/regions/south-oremindi/south-oremindi-world.js';

const { createWestLife, WEST_LIFE_ZONES, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const ground = zones.filter(z => !z.air && !z.float);
const centre = z => ({ x: (z.minX + z.maxX) / 2, z: (z.minZ + z.maxZ) / 2 });
const terrainWorld = () => ({ bounds: { minX: -10000, maxX: 10000, minZ: -10000, maxZ: 10000 },
  heightAt: southOremindiGround, waterAt: southOremindiWaterAt, colliders: [], paths: [],
  regionAt: (x, z) => ({ name: southOremindiOwns(x, z) ? SOUTH_OREMINDI : null }) });

function checkFooting(animal, zone, world) {
  assert.equal(world.regionAt(animal.x, animal.z)?.name, zone.region, `${animal.id}: owner`);
  assert.ok(canStand(animal.x, animal.z, world, zone.radius)
    || zone.float && canSwim(animal.x, animal.z, world, zone.radius), `${animal.id}: body clearance`);
  const y = world.heightAt(animal.x, animal.z);
  assert.ok(y >= (zone.minHeight ?? -Infinity) && y <= (zone.maxHeight ?? Infinity), `${animal.id}: altitude`);
  assert.ok(animal.x >= zone.minX && animal.x <= zone.maxX && animal.z >= zone.minZ && animal.z <= zone.maxZ);
  if (zone.float) {
    assert.ok(world.waterAt(animal.x, animal.z) > y, `${animal.id}: real lake`);
    assert.ok(Math.abs(animal.groundY - (world.waterAt(animal.x, animal.z) - .04)) < .001, `${animal.id}: elevated surface`);
  } else {
    assert.ok(Math.abs(animal.groundY - y) < .001, `${animal.id}: actual ground`);
    assert.ok(Math.abs(animal.y - animal.groundY - animal.lift) < 1e-8, `${animal.id}: rendered gait height`);
    assert.ok(animal.lift >= 0 && animal.lift <= (animal.species === 'upland-hare' ? .3 : 0), `${animal.id}: bounded hopping lift`);
    const s = Math.max(.4, zone.radius), east = world.heightAt(animal.x + s, animal.z), west = world.heightAt(animal.x - s, animal.z);
    const north = world.heightAt(animal.x, animal.z - s), south = world.heightAt(animal.x, animal.z + s);
    assert.ok(Math.hypot((east - west) / (s * 2), (south - north) / (s * 2)) <= zone.maxSlope + 1e-8, `${animal.id}: grade`);
  }
}

test('persistent fauna covers every hill and the real lakes, with alpine hares and sparse ice', () => {
  for (const cell of SOUTH_OREMINDI_CELLS.filter(c => c.terrain === 'hills')) {
    const local = ground.filter(z => z.sourceCell[0] === cell.q && z.sourceCell[1] === cell.r);
    assert.ok(local.length, `${cell.q},${cell.r}: inhabited hill`);
    assert.ok(local.some(z => z.sites.some(([x, z]) => southOremindiCellAt(x, z)?.q === cell.q
      && southOremindiCellAt(x, z)?.r === cell.r)), 'a real owned home, not an overlapping range');
  }
  assert.deepEqual(new Set(zones.map(z => z.species)), new Set([
    'red-deer', 'boar', 'upland-hare', 'oremindi-snowgoat', 'duck', 'oremindi-mountain-eagle',
  ]));
  const alpine = ground.filter(z => z.species === 'upland-hare')
    .flatMap(z => z.sites).filter(([x, z]) => {
      const f = southOremindiFeatures(x, z);
      return f.height >= f.treeline - 30;
    });
  assert.ok(alpine.length >= 3, 'hares have scattered upper turf homes, not just wooded-foot populations');
  assert.ok(ground.filter(z => z.species === 'oremindi-snowgoat').some(z => z.sites.some(([x, z]) => {
    const f = southOremindiFeatures(x, z);
    return f.height > f.treeline;
  })), 'wild goats occupy genuine upper-mountain ground');
  for (const zone of ground) for (const [x, z] of zone.sites) {
    assert.notEqual(southOremindiCellAt(x, z)?.climate, 'EF', 'no stock on the ice crown');
    assert.equal(southOremindiWaterAt(x, z), null, 'land animals are not placed on lake beds');
    assert.ok(southOremindiFeatures(x, z).pathDistance >= 5, 'home is off the natural traverse');
  }
  for (const lake of LAKES) assert.ok(zones.some(z => z.float && z.sites.some(([x, z]) => southOremindiWaterAt(x, z) === lake.surface)));
  for (const cell of SOUTH_OREMINDI_CELLS) {
    const nearby = ground.filter(z => Math.hypot(centre(z).x - cell.x, centre(z).z - cell.z) < LIFE_REACH)
      .reduce((n, z) => n + z.sites.length, 0);
    assert.ok(nearby <= 17, `${cell.q},${cell.r}: local animal count ${nearby} remains sparse`);
  }
});

test('atlas-derived identities, body sizes and bounded ranges are stable', async () => {
  const again = await import('../src/content/regions/south-oremindi/south-oremindi-wildlife.js?stable=1');
  assert.deepEqual(again.SOUTH_OREMINDI_WILDLIFE_ZONES, zones);
  assert.equal(new Set(zones.map(z => z.id)).size, zones.length);
  for (const zone of zones) {
    assert.ok(WEST_LIFE_ZONES.includes(zone), `${zone.id}: integrated into the actual controller`);
    assert.ok(Object.isFrozen(zone) && Object.isFrozen(zone.sites));
    assert.ok(zone.sites.length > 0 && zone.sites.length <= 2);
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH);
    assert.equal(zone.habitat, 'mountain'); assert.equal(zone.keepRegion, true);
    if (!zone.air && !zone.float) assert.equal(zone.radius,
      { 'red-deer': .55, boar: .7, 'upland-hare': .3, 'oremindi-snowgoat': .6 }[zone.species]);
    if (zone.air) for (let i = 0; i < 144; i++) {
      const [x, z] = zone.sites[0], angle = i / 144 * Math.PI * 2;
      assert.ok(southOremindiOwns(x + Math.sin(angle) * zone.circle, z + Math.cos(angle) * zone.circle));
    }
  }
});

test('all real-terrain homes instantiate, ground rigs animate and elevated ducks float', () => {
  const world = terrainWorld(), scene = new THREE.Scene(), life = createWestLife(scene, world, { zones });
  try {
    const animals = life.state().creatures;
    assert.equal(animals.length, zones.reduce((n, z) => n + z.sites.length, 0), 'no whole habitat is lost in collision adjustment');
    for (const zone of zones) {
      life.update(.05, centre(zone));
      for (const animal of animals.filter(a => a.id.startsWith(`${zone.id}-`))) {
        if (!zone.air && animal.action !== 'fly') checkFooting(animal, zone, world);
        if (zone.air) assert.ok(animal.y > world.heightAt(animal.x, animal.z) + 38, 'eagle clears its current face');
      }
    }
    for (const species of ['oremindi-snowgoat', 'oremindi-mountain-eagle']) {
      const zone = zones.find(z => z.species === species);
      life.setObserver(centre(zone)); // Distant rigs are unloaded; inspect the herd from its own habitat.
      const group = scene.children.find(g => g.name === zone.id);
      assert.ok(group.children.some(m => m.name === `${species} bodies`));
      assert.ok(group.children.some(m => m.name === `${species} ${species.endsWith('eagle') ? 'wings' : 'legs'}`));
      for (const mesh of group.children) assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));
    }
    assert.equal(life.calm(animals.find(a => a.species === 'oremindi-snowgoat').id, 20), false, 'wild goats are not domestic care targets');
    const saved = life.snapshot(); life.update(.25, centre(zones[0]), false);
    assert.deepEqual(life.snapshot(), saved, 'paused wildlife does not advance');
    life.update(.25, { x: 9000, z: 9000 });
    assert.ok(life.state().groups.every(g => !g.visible));
    assert.equal(life.state().creatures, animals, 'culling retains the original residents');
  } finally { life.dispose(); }
});

test('mountain residents flee without crossing steep faces, water or regional ownership', () => {
  const zone = { ...ground.find(z => z.species === 'oremindi-snowgoat'), id: 'mountain-footing-test',
    minX: -45, maxX: 45, minZ: -45, maxZ: 45, minHeight: 80, maxHeight: 160, sites: [[0, 0]] };
  const world = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, paths: [], colliders: [],
    heightAt: (x, z) => 100 + Math.max(0, x - 15) * 3 + Math.max(0, z - 25) * 4,
    waterAt: x => x < -18 ? 101 : null,
    regionAt: (x, z) => ({ name: z > -26 && Math.abs(x) < 36 ? SOUTH_OREMINDI : 'Other' }) };
  const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
  try {
    const animal = life.state().creatures[0], saved = life.snapshot().creatures[0];
    let farthest = 0, fleeing = false;
    for (let i = 0; i < 350; i++) {
      const angle = Math.floor(i / 50) * 1.7;
      life.update(.1, { x: animal.x - Math.cos(angle) * 6, z: animal.z - Math.sin(angle) * 6 });
      checkFooting(animal, zone, world);
      farthest = Math.max(farthest, Math.hypot(animal.x, animal.z)); fleeing ||= animal.action === 'flee';
    }
    assert.ok(fleeing && farthest > 12, 'the goat actually flees within its terrain, rather than remaining frozen');
    assert.equal(saved.x, 0, 'saved observations are detached');
    assert.equal(saved.z, 0);
  } finally { life.dispose(); }
});

test('an unwatched mountain resident cannot teleport home through a newly blocked route', () => {
  const zone = { ...ground.find(z => z.species === 'oremindi-snowgoat'), id: 'mountain-return-test',
    minX: -70, maxX: 70, minZ: -70, maxZ: 70, sites: [[0, 0]] };
  const world = { bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 }, paths: [], colliders: [],
    heightAt: () => 100, waterAt: () => null, regionAt: () => ({ name: SOUTH_OREMINDI }) };
  const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
  try {
    const animal = life.state().creatures[0];
    for (let i = 0; i < 70; i++) life.update(.1, { x: animal.x - 5, z: animal.z });
    assert.ok(animal.x > 20, 'the resident moved well away from home');
    const wallX = animal.x / 2;
    world.colliders.push({ x: wallX, z: 0, hx: 1, hz: 150 });
    for (let i = 0; i < 200; i++) life.update(.25, { x: 1000, z: 1000 });
    life.update(.1, { x: animal.x + 45, z: animal.z });
    assert.ok(animal.x > wallX + 1 + zone.radius, 'elapsed time does not jump across the obstruction');
    checkFooting(animal, zone, world);
  } finally { life.dispose(); }
});
