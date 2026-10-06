import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NYLON, NYLON_AREA, NYLON_OUTLINE, NYLON_GATES, NYLON_BUILDINGS, NYLON_PATHS,
  NYLON_LANDMARKS, NYLON_HARBOR_WALLS, NYLON_HARBOR_DECKS, NYLON_HARBOR_BOATS, NYLON_HARBOR, inNylon, nylonGround, nylonReserved, nylonHarborDeckHeight,
  nylonSegmentDistance, nylonRiverClearance,
} from '../src/content/regions/nylon/nylon-city.js';
import { SOLIS, hexOwnerAt, landDistance } from '../src/world/terrain/region-world.js';
import { LIZEEM_REACH, EER_CHANNELS } from '../src/content/regions/western-regions/west-regions.js';
import { MENORA } from '../src/content/regions/minora-frontier/menora-city.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';

const samples = building => [-1, 0, 1].flatMap(a => [-1, 0, 1].map(b => ({ x: building.x + a * building.width / 2, z: building.z + b * building.depth / 2 })));
const insideBuilding = (point, building, margin = 0) => Math.abs(point.x - building.x) < building.width / 2 + margin && Math.abs(point.z - building.z) < building.depth / 2 + margin;

test('Nylon stands on the Eer bank at the Lizeem mouth, about a fifth larger than Solis', () => {
  assert.equal(hexOwnerAt(NYLON.x, NYLON.z), 'Eer');
  assert.ok(NYLON.x > NYLON.mouth.x);
  assert.ok(Math.hypot(NYLON.x - NYLON.mouth.x, NYLON.z - NYLON.mouth.z) < 120);
  const solisArea = SOLIS.halfX * SOLIS.halfZ * 4;
  assert.equal(solisArea, NYLON.referenceSolisArea);
  assert.ok(NYLON_AREA > solisArea * 1.18 && NYLON_AREA < solisArea * 1.35);
  assert.equal(NYLON.wallHeight, 40);
  assert.ok(NYLON.wallHeight > MENORA.wallHeight * 2);
  assert.ok(NYLON.palaceHeight > NYLON.libraryCrownHeight && NYLON.libraryCrownHeight > NYLON.wallHeight);
});

test('All tall buildings are separate, fully on dry land, and clear of the thick curtain wall', () => {
  for (const building of NYLON_BUILDINGS) {
    assert.ok(building.height >= 23, `${building.id} contributes to the vertical city`);
    for (const p of samples(building)) {
      assert.ok(inNylon(p.x, p.z), `${building.id} inside its city`);
      assert.equal(hexOwnerAt(p.x, p.z), 'Eer', building.id);
      assert.ok(groundWithRiver(p.x, p.z) > 1.5, `${building.id} dry ground`);
      assert.ok(nylonRiverClearance(p.x, p.z) >= 18, `${building.id} preserves both rivers and channel banks`);
      assert.ok(landDistance(p.x, p.z) > 24, `${building.id} stays inland of the beach`);
      const edge = Math.min(...NYLON_OUTLINE.map((a, i) => nylonSegmentDistance(p.x, p.z, a, NYLON_OUTLINE[(i + 1) % NYLON_OUTLINE.length])));
      assert.ok(edge >= NYLON.wallThickness / 2 + .4, `${building.id} clear of wall foundations`);
    }
  }
  for (let i = 0; i < NYLON_BUILDINGS.length; i++) for (let j = i + 1; j < NYLON_BUILDINGS.length; j++) {
    const a = NYLON_BUILDINGS[i], b = NYLON_BUILDINGS[j];
    assert.ok(Math.abs(a.x - b.x) >= (a.width + b.width) / 2 + .8 || Math.abs(a.z - b.z) >= (a.depth + b.depth) / 2 + .8, `${a.id} overlaps ${b.id}`);
  }
});

test('The two gates, travel arrival and map landmarks are reachable ground instead of building centres', () => {
  assert.equal(NYLON_GATES.length, 2);
  for (const gate of NYLON_GATES) {
    assert.ok(gate.width >= 11);
    assert.ok(nylonSegmentDistance(gate.x, gate.z, NYLON_OUTLINE[gate.edge], NYLON_OUTLINE[(gate.edge + 1) % NYLON_OUTLINE.length]) < .001);
  }
  for (const p of [NYLON.arrival, ...NYLON_LANDMARKS]) {
    if(p.id==='nylon-harbor')assert.equal(nylonHarborDeckHeight(p.x,p.z),NYLON_HARBOR.deckHeight);
    else{assert.equal(hexOwnerAt(p.x, p.z), 'Eer');assert.ok(groundWithRiver(p.x, p.z) > 1.5);}
    assert.equal(NYLON_BUILDINGS.some(building => insideBuilding(p, building, .8)), false, `Blocked location ${p.id ?? 'arrival'}`);
  }
  for (const path of NYLON_PATHS) for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1], b = path.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
    for (let j = 0; j <= steps; j++) {
      const p = { x: a.x + (b.x - a.x) * j / steps, z: a.z + (b.z - a.z) * j / steps };
      assert.equal(NYLON_BUILDINGS.some(building => insideBuilding(p, building, .8)), false, `${path.id} meets a building`);
      assert.ok(nylonReserved(p.x, p.z));
    }
  }
});

test('City grading preserves the Lizeem, Eer channels, sea shore and opposite bank', () => {
  for (const river of [LIZEEM_REACH, ...EER_CHANNELS]) for (const p of river.points) {
    assert.equal(nylonGround(p.x, p.z, -3), -3, `${river.id} bed is untouched`);
  }
  for (const p of [{x:-1400,z:1160},{x:-1345,z:1215},{x:-1295,z:1190},{x:0,z:0}]) {
    assert.equal(nylonGround(p.x, p.z, -2), -2, 'Opposite bank, coastal water and unrelated land stay untouched');
  }
  assert.equal(nylonGround(NYLON.x, NYLON.z, 4), NYLON.elevation);
  assert.ok(Math.abs(nylonGround(NYLON.arrival.x, NYLON.arrival.z, 7) - 7) < .1, 'Land arrival meets the natural plain gently');
});

test('The estuary fortification reaches the sea while leaving the original river channel open', () => {
  assert.equal(NYLON_HARBOR_WALLS.length, 2);
  let seaSamples=0;
  for (const wall of NYLON_HARBOR_WALLS) for (let i = 1; i < wall.points.length; i++) {
    const a = wall.points[i - 1], b = wall.points[i];
    for (let step = 0; step <= 20; step++) {
      const p = { x: a.x + (b.x - a.x) * step / 20, z: a.z + (b.z - a.z) * step / 20 };
      assert.notEqual(hexOwnerAt(p.x, p.z), 'Gala', 'Nylon does not build on the far bank');
      if(landDistance(p.x,p.z)<0)seaSamples++;
      assert.ok(nylonRiverClearance(p.x, p.z) > (wall.thickness+2.4)/2+.75,`${wall.id} foundation obstructs the Lizeem`);
      assert.ok(nylonReserved(p.x, p.z));
    }
  }
  assert.ok(seaSamples>60,'The harbor remains a small inland quay instead of reaching the sea');
  assert.ok(NYLON_HARBOR.entrance.z>NYLON.mouth.z+70);
  assert.ok(landDistance(NYLON_HARBOR.entrance.x,NYLON_HARBOR.entrance.z)<-20);
});

test('Physical harbor decks are above real water and join their land approach without an abrupt step',()=>{
  assert.equal(NYLON_HARBOR_DECKS.length,5);
  const ramp=NYLON_HARBOR_DECKS[0];
  assert.ok(Math.abs(groundWithRiver(ramp.a.x,ramp.a.z)-ramp.a.y)<.02);
  for(const d of NYLON_HARBOR_DECKS){
    const len=Math.hypot(d.b.x-d.a.x,d.b.z-d.a.z);
    assert.ok(Math.abs(d.b.y-d.a.y)/len<.08);
    for(let i=0;i<=10;i++){
      const x=d.a.x+(d.b.x-d.a.x)*i/10,z=d.a.z+(d.b.z-d.a.z)*i/10,y=d.a.y+(d.b.y-d.a.y)*i/10;
      assert.ok(Math.abs(nylonHarborDeckHeight(x,z)-y)<.001,d.id);
      assert.ok(y>NYLON_HARBOR.waterHeight+3);
    }
  }
  for(const b of NYLON_HARBOR_BOATS){assert.ok(groundWithRiver(b.x,b.z)<NYLON_HARBOR.waterHeight-3,b.id);assert.equal(nylonHarborDeckHeight(b.x,b.z),null,b.id);}
  assert.equal(nylonHarborDeckHeight(NYLON_HARBOR.entrance.x,NYLON_HARBOR.entrance.z),null,'There is no invisible deck across the sea gate');
});
