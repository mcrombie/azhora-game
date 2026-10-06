import test from 'node:test';
import assert from 'node:assert/strict';
import { lotharnWoodlandHabitat, lotharnCanopyHabitat, lotharnTreeFoot, lotharnCrestRows } from '../src/content/regions/east-lotharn/east-lotharn-habitat.js';
import { EAST_LOTHARN_WILDLIFE_ZONES } from '../src/content/regions/east-lotharn/east-lotharn-wildlife.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { hexOwnerAt } from '../src/world/terrain/region-world.js';
import { LOTHARN, lotharnOpen, onRamp } from '../src/content/regions/east-lotharn/east-lotharn-world.js';
import { inWestWater } from '../src/content/regions/western-regions/west-regions.js';

test('sheltered soil carries woodland above the old altitude limit while an exposed crest stays bare', () => {
  const hollow = (x, z) => 280 + .045 * (x * x + z * z);
  const crest = (x, z) => 280 - .045 * (x * x + z * z);
  const sheltered = lotharnWoodlandHabitat(0, 0, hollow);
  const exposed = lotharnWoodlandHabitat(0, 0, crest);
  assert.ok(sheltered.density > .7);
  assert.equal(exposed.density, 0);
  assert.ok(sheltered.shelter > exposed.shelter);
});

test('woodland soil rejects cliffs and narrow broken footing even at low altitude', () => {
  assert.equal(lotharnWoodlandHabitat(0, 0, (x, z) => 170 + x * 1.5).density, 0);
  assert.equal(lotharnWoodlandHabitat(0, 0, (x, z) => x === 0 && z === 0 ? 170 : 176).density, 0);
  assert.equal(lotharnWoodlandHabitat(0, 0, () => NaN).density, 0);
});

test('soil pockets vary coherently without consuming random numbers or introducing a sharp altitude cutoff', () => {
  const sample = (x, y) => lotharnWoodlandHabitat(x, -940, () => y).density;
  assert.notEqual(sample(-1240, 260), sample(-1280, 260));
  assert.ok(Math.abs(sample(-1240, 260) - sample(-1240.01, 260)) < .001);
  assert.ok(Math.abs(sample(-1240, 279.99) - sample(-1240, 280.01)) < .001);
  assert.deepEqual(lotharnWoodlandHabitat(-1240, -940, () => 260), lotharnWoodlandHabitat(-1240, -940, () => 260));
});

test('the extended canopy follows relative soil and shelter at every height instead of a climatic tree line', () => {
  const low = lotharnCanopyHabitat(-1240, -940, (x, z) => 40 + (x + 1240) * .3);
  const high = lotharnCanopyHabitat(-1240, -940, (x, z) => 380 + (x + 1240) * .3);
  for (const field of ['slope', 'soil', 'shelter', 'grove', 'density', 'stature']) {
    assert.ok(Math.abs(low[field] - high[field]) < 1e-10, field);
  }
  assert.ok(high.density > 0);
});

test('the extended canopy leaves sheer rock and narrow unstable ledges bare while favouring hollows', () => {
  assert.equal(lotharnCanopyHabitat(0, 0, x => 200 + x * 2).density, 0);
  assert.equal(lotharnCanopyHabitat(0, 0, (x, z) => x === 0 && z === 0 ? 200 : 205).density, 0);
  const hollow = lotharnCanopyHabitat(0, 0, (x, z) => 350 + .025 * (x * x + z * z));
  const exposed = lotharnCanopyHabitat(0, 0, (x, z) => 350 - .025 * (x * x + z * z));
  assert.ok(hollow.density > exposed.density * 3);
  assert.ok(hollow.stature > exposed.stature);
  assert.equal(lotharnCanopyHabitat(0, 0, () => NaN).density, 0);
});

test('the extended canopy forms coherent groves with short edges rather than uniform contour planting', () => {
  const flat = () => 350;
  const interior = lotharnCanopyHabitat(-1300, -1000, flat);
  const close = lotharnCanopyHabitat(-1300.01, -1000.01, flat);
  assert.ok(Math.abs(interior.grove - close.grove) < .001);
  const groves = [];
  for (let x = -1400; x <= -1200; x += 10) for (let z = -1100; z <= -900; z += 10) groves.push(lotharnCanopyHabitat(x, z, flat).grove);
  assert.ok(Math.min(...groves) < .05, 'coherent exposed gaps remain');
  assert.ok(Math.max(...groves) > .95, 'deeper soil carries full groves');
});

test('the whole six-sided trunk footprint stays buried on a sloping rendered triangle', () => {
  const tree = { x: 13, z: -7, s: 1.27, rot: .47 }, surface = (x, z) => 12 + x * .8 - z * .55;
  const foot = lotharnTreeFoot(tree, surface), gaps = [];
  for (let i = 0; i < 6; i++) {
    const angle = tree.rot + i / 6 * Math.PI * 2;
    gaps.push(foot - surface(tree.x + Math.sin(angle) * .36 * tree.s, tree.z + Math.cos(angle) * .36 * tree.s));
  }
  assert.ok(Math.abs(Math.max(...gaps) + .03) < 1e-10);
  assert.ok(gaps.every(gap => gap < 0));
});

test('a cave ridge ribbon keeps its exact crest on straight runs and rounds an outside corner without a gap', () => {
  const line = [{ x: -10, z: 0 }, { x: 0, z: 0 }, { x: 0, z: -10 }], radius = 2.65;
  const rows = lotharnCrestRows(line), corner = rows.filter(row => row.x === 0 && row.z === 0);
  assert.ok(corner.length > 10);
  for (const row of rows) assert.ok(Math.abs(Math.hypot(row.nx, row.nz) - 1) < 1e-9);
  const crests = rows.map(row => ({ x: row.x + row.nx * radius, z: row.z + row.nz * radius }));
  for (let i = 1; i < crests.length; i++) assert.ok(Math.hypot(crests[i].x - crests[i - 1].x, crests[i].z - crests[i - 1].z) <= .401);
  assert.deepEqual(crests[0], { x: -10, z: radius });
  assert.ok(Math.abs(crests.at(-1).x - radius) < 1e-9);
});

test('an inside ridge corner meets both offset segments at their true crest intersection', () => {
  const rows = lotharnCrestRows([{ x: -10, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 10 }]);
  const corner = rows.filter(row => row.x === 0 && row.z === 0);
  assert.equal(corner.length, 1);
  assert.equal(corner[0].nx, -1);
  assert.equal(corner[0].nz, 1);
});

test('the original eighteen Lotharn animals retain their zone and site identities', () => {
  const original = [
    ['olveth-sheep', [[-1340, -1010], [-1300, -1030], [-1310, -1022], [-1352, -1026], [-1346, -1048]]],
    ['central-bald-deer', [[-1228, -972], [-1214, -960], [-1242, -986], [-1220, -990]]],
    ['eastern-bald-hares', [[-966, -824], [-952, -838], [-980, -810]]],
    ['kemrath-herons', [[-1493, -821], [-1524, -821]]],
    ['kemrath-boar', [[-1520, -842], [-1540, -838], [-1505, -834]]],
    ['central-massif-hawk', [[-1230, -965]]],
  ];
  assert.deepEqual(EAST_LOTHARN_WILDLIFE_ZONES.slice(0, original.length).map(zone => [zone.id, zone.sites]), original);
  assert.equal(new Set(EAST_LOTHARN_WILDLIFE_ZONES.map(zone => zone.id)).size, EAST_LOTHARN_WILDLIFE_ZONES.length);
});

test('woodland residents occupy dry interior habitat and keep their whole ranges inside the simulation reach', () => {
  const woods = EAST_LOTHARN_WILDLIFE_ZONES.filter(zone => zone.habitat === 'woodland');
  assert.equal(woods.length, 4);
  assert.equal(woods.reduce((sum, zone) => sum + zone.sites.length, 0), 10);
  for (const zone of woods) {
    assert.equal(zone.keepRegion, true);
    assert.ok(zone.maxSlope <= .65);
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < 130, zone.id);
    for (const [x, z] of zone.sites) {
      assert.equal(hexOwnerAt(x, z), LOTHARN, zone.id);
      assert.equal(lotharnOpen(x, z, 3), false, zone.id);
      assert.equal(onRamp(x, z, 2), false, zone.id);
      assert.equal(inWestWater(x, z, 3), false, zone.id);
      const habitat = lotharnWoodlandHabitat(x, z, groundWithRiver);
      assert.ok(habitat.slope < zone.maxSlope, `${zone.id} slope ${habitat.slope}`);
      assert.ok(habitat.soil > .7, zone.id);
    }
  }
});
