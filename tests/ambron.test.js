import {AMBRON_FIELDS,AMBRON_FARMSTEADS,AMBRON_CROPS,farmPoint,farmRoadDistance} from '../src/content/regions/ambron/ambron-farmland.js';
import {ambronCultivatedField,ambronGroundTint,ELAGOS_ROADS} from '../src/content/regions/ambron/elagos-world.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand, moveCharacter } from '../src/gameplay/movement/game-state.js';
import { AMBRON, ambronPoint, WORLD_BOUNDS, SOLIS } from '../src/world/terrain/region-world.js';
import { SOLIS_CIRCUIT } from '../src/content/regions/solis/west-suval.js';
import { FORT_STANDARD, longestTowerGap } from '../src/world/scenery/fortification.js';
import {
  AMBRON_STANDARD, AMBRON_CIRCUIT, AMBRON_GATES, AMBRON_LAND_GATES, AMBRON_WATER_GATES, AMBRON_BUILDINGS,
  ambronLocal, ambronDryDistance, AMBRON_SHORE_GAPS,
  AMBRON_OUTSIDE, AMBRON_STREETS, AMBRON_QUAYS, AMBRON_STANDS, AMBRON_ENCLOSURE, AMBRON_CHAIN, AMBRON_MARKET,
  AMBRON_FORGE, CAUSEWAY, CHANNEL, ambronDeckHeight, cityGround,
} from '../src/content/regions/ambron/ambron.js';
import {
  AMBRON_NPCS, ELAGOS_NPCS, ELAGOS_AMBIENT, ELAGOS_NPC_POSITIONS, elagosConversation, isElagosNpc,
  AMBRON_SPECIALISTS, SPECIALIST_IDS, TALKING_TREE_QUEST, TALKING_TREE_LINES,
} from '../src/content/regions/ambron/ambron-people.js';
import { elagosWaterDistance, onLinkBridge, elagosGround, AMBRON_ROAD } from '../src/content/regions/ambron/elagos-world.js';
import { RIDE } from '../src/gameplay/movement/riding.js';
import {AMBRON_OUTLINE,inAmbronOutline,ambronTerraceWeight} from '../src/content/regions/ambron/ambron-city-layout.js';
import {ELAGOS_BASINS} from '../src/content/regions/ambron/elagos-world.js';
import {AMBRON_PALACE,CITY_CANALS,cityCanalAt,ambronGroundLevel} from '../src/content/regions/ambron/ambron-city-layout.js';
import {AMBRON_FORTRESSES,AMBRON_HARBOURS,AMBRON_SHIPS} from '../src/content/regions/ambron/ambron-capital.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene(), {enabledRegions:[9], initialRegion:9, regionalFineGround:true});
globalThis.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),0);
globalThis.cancelAnimationFrame=clearTimeout;
world.loading.setTravelBudget(32);
await world.loading.ensureRegion(9);
world.loading.stop();
const P = ambronPoint;
const WALKER = .45;

/** The world with only the colliders near Ambron: a fine grid over the city stays quick. */
const nearAmbron = (() => {
  const reach = 290;
  const colliders = world.colliders.filter(c => Math.abs(c.x - AMBRON.centre.x) < reach && Math.abs(c.z - AMBRON.centre.z) < reach);
  return { bounds: world.bounds, heightAt: world.heightAt, colliders };
})();

test('Ambron is built to the shared fortification standard, at the measures of a capital', () => {
  assert.ok(AMBRON_STANDARD.wallHeight > FORT_STANDARD.wallHeight, 'a higher wall than an outpost');
  assert.ok(AMBRON_STANDARD.wallThickness >= FORT_STANDARD.wallThickness, 'and a thicker one');
  assert.ok(AMBRON_STANDARD.towerPlatform - AMBRON_STANDARD.wallHeight >= 2.5, 'towers stand a storey above the wall');
  assert.ok(AMBRON_STANDARD.gateWidth >= 4 && AMBRON_STANDARD.gateWidth <= 6, 'gates wide enough for a cart');
  assert.ok(AMBRON_STANDARD.ditchWidth >= 4, 'a ditch outside');
  // Bigger and older than Solis: longer circuit, more ground, more towers, more buildings.
  const solisPerimeter = 4 * (SOLIS_CIRCUIT.halfA + SOLIS_CIRCUIT.halfB);
  assert.ok(AMBRON_CIRCUIT.perimeter > solisPerimeter * 1.6, `${AMBRON_CIRCUIT.perimeter.toFixed(0)} m of circuit against Solis's ${solisPerimeter.toFixed(0)}`);
  assert.ok(AMBRON.halfA * AMBRON.halfB > SOLIS.halfX * SOLIS.halfZ * 2.5, 'and three times the ground');
  assert.ok(AMBRON_CIRCUIT.towers.length >= 20, `${AMBRON_CIRCUIT.towers.length} towers`);
  assert.ok(AMBRON_CIRCUIT.towers.every(t=>elagosWaterDistance(t.x,t.z)>7), 'all towers stand on dry land');
  for (const gate of AMBRON_LAND_GATES) assert.equal(AMBRON_CIRCUIT.towers.filter(tower => tower.id.startsWith(`${gate.id}-tower`)).length, 2, `${gate.name} has two flanking towers`);
  // No curtain run goes far uncovered, once the two water gates (which are water, not wall) are set aside.
  const along = tower => { let before = 0; for (let i = 0; i < tower.edge; i++) before += AMBRON_CIRCUIT.edges[i].length; return before + tower.at; };
  const positions = AMBRON_CIRCUIT.towers.map(along).sort((a, b) => a - b);
  const gaps = positions.map((p, i) => (i + 1 < positions.length ? positions[i + 1] : positions[0] + AMBRON_CIRCUIT.perimeter) - p);
  assert.ok(gaps.some(gap=>gap>46),'lakes replace curtains along open shore arcs');
  assert.ok(longestTowerGap(AMBRON_CIRCUIT) === Math.max(...gaps));
  const counts = AMBRON_BUILDINGS.length + AMBRON_OUTSIDE.length;
  assert.ok(counts >= 26, `${counts} buildings inside the walls and out`);
  assert.ok(world.elagosMetrics.buildings >= 26, 'and the scenery built them');
});

test('Ambron curtains block passage between lake defenses, and each land gate can be walked', () => {
  const passages = AMBRON_LAND_GATES.map(gate => AMBRON_CIRCUIT.gates.find(entry => entry.id === gate.id));
  let samples = 0, blocked = 0;
  for (const edge of AMBRON_CIRCUIT.edges) {
    for (let at = 1; at < edge.length; at += 2) {
      const gate = AMBRON_CIRCUIT.gates.find(g => g.edge === edge.index && Math.abs(at - g.at) <= g.halfWidth + .6);
      for (const depth of [-AMBRON_STANDARD.wallThickness / 2 + .2, 0, AMBRON_STANDARD.wallThickness / 2 - .2]) {
        const spot = AMBRON_CIRCUIT.pointOn(edge, at, depth);
        samples++;
        if (gate || elagosWaterDistance(spot.x,spot.z)<6) continue;
        if (canStand(spot.x, spot.z, world, WALKER)) blocked++;
      }
    }
  }
  assert.ok(samples > 500, `${samples} samples of the wall line`);
  assert.equal(blocked, 0, 'nobody stands on the wall line except in a gate');
  // The two water gates are water: nobody walks through them either.
  for (const gate of AMBRON_WATER_GATES) {
    const entry = AMBRON_CIRCUIT.gates.find(g => g.id === gate.id);
    for (const across of [-16, -8, 0, 8, 16]) {
      const spot = { x: entry.centre.x + entry.along.x * across, z: entry.centre.z + entry.along.z * across };
      assert.equal(canStand(spot.x, spot.z, world, WALKER), false, `${gate.name} is water, not a way in`);
    }
  }
  // Each land gate can be walked end to end with the real movement rule.
  for (const gate of passages) {
    const passage = AMBRON_CIRCUIT.passage(gate.id), walker = { ...passage.from };
    for (let frame = 0; frame < 900 && Math.hypot(walker.x - passage.to.x, walker.z - passage.to.z) > .4; frame++) {
      const dx = passage.to.x - walker.x, dz = passage.to.z - walker.z, d = Math.hypot(dx, dz), step = Math.min(d, .15);
      moveCharacter(walker, dx / d * step, dz / d * step, nearAmbron, WALKER);
    }
    assert.ok(Math.hypot(walker.x - passage.to.x, walker.z - passage.to.z) <= .4,
      `${gate.id} can be walked end to end; stopped at ${walker.x.toFixed(1)}, ${walker.z.toFixed(1)}`);
    // And a rider can take the gate the road comes to.
    if (gate.id === 'plain-gate') assert.ok(canStand(gate.centre.x, gate.centre.z, world, RIDE.radius), 'a rider passes the Plain Gate');
  }
});

test('the enlarged capital uses unchanged lakes as open defensive arcs', () => {
  let twiceArea=0;
  for(let i=0;i<AMBRON_OUTLINE.length;i++){const a=AMBRON_OUTLINE[i],b=AMBRON_OUTLINE[(i+1)%AMBRON_OUTLINE.length];twiceArea+=a.x*b.z-b.x*a.z;}
  for(const run of AMBRON_CIRCUIT.runs){const edge=AMBRON_CIRCUIT.edges[run.edge];for(let at=run.from;at<=run.to;at+=.5){const p=AMBRON_CIRCUIT.pointOn(edge,at);assert.ok(ambronDryDistance(p.x,p.z)>=3,'no curtain masonry in water');}}
  assert.ok(Math.abs(twiceArea)/2>184*136*2,'more than twice the former footprint');
  assert.ok(AMBRON_BUILDINGS.length>=160,'expanded districts have substantial building density');
  assert.equal(CHANNEL.enabled,false);assert.equal(AMBRON_QUAYS.length,0);
  assert.equal(ambronDeckHeight(AMBRON.centre.x,AMBRON.centre.z),null,'no phantom causeway deck on the market');
  for(const lake of ELAGOS_BASINS){assert.ok(elagosWaterDistance(lake.centre.x,lake.centre.z)<0);assert.equal(canStand(lake.centre.x,lake.centre.z,world,WALKER),false);}
  assert.ok(inAmbronOutline(-1250,-58),'the oval includes a Thelas basin without draining it');
});

test('the royal skyline, dry fortresses and lake fleet are built in the real world', () => {
  const palaceTop=ambronGroundLevel(AMBRON_PALACE.x,AMBRON_PALACE.z)+AMBRON_PALACE.height;
  for(const dx of [-1,1])for(const dz of [-1,1])assert.ok(elagosWaterDistance(AMBRON_PALACE.x+dx*AMBRON_PALACE.w/2,AMBRON_PALACE.z+dz*AMBRON_PALACE.d/2)>3,'the palace footprint is on dry central ground');
  for(const h of AMBRON_BUILDINGS)assert.ok(cityGround(h.a,h.b)+h.h<palaceTop,`${h.id} leaves the royal palace highest`);
  for(const f of AMBRON_FORTRESSES)for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
    const x=f.x+dx*(f.w/2+3.5),z=f.z+dz*(f.d/2+3.5);
    assert.ok(elagosWaterDistance(x,z)>0,`${f.id} has no masonry in a lake`);
    assert.ok(Math.abs(world.heightAt(x,z)-f.level)<1,`${f.id} has a grounded foundation at ${x}, ${z}`);
  }
  assert.deepEqual(Object.fromEntries(['warship','trader','fishing'].map(kind=>[kind,AMBRON_SHIPS.filter(s=>s.kind===kind).length])),{warship:4,trader:5,fishing:6});
  for(const s of AMBRON_SHIPS)for(const dx of [-1,1])for(const dz of [-1,1]){
    const x=s.x+dx*s.width/2*Math.cos(s.yaw)+dz*s.length/2*Math.sin(s.yaw);
    const z=s.z-dx*s.width/2*Math.sin(s.yaw)+dz*s.length/2*Math.cos(s.yaw);
    assert.ok(elagosWaterDistance(x,z)<-1,`${s.id} floats within its lake`);
  }
  assert.equal(world.elagosMetrics.fortresses,3);assert.equal(world.elagosMetrics.ships,15);
  assert.ok(world.elagosMetrics.soldiers>=30,'gates, towers and fortresses have an anonymous garrison');
});

test('harbour ramps can be walked from the city to the water, and canals preserve street crossings', () => {
  for(const h of AMBRON_HARBOURS){
    let previous=null;
    for(let along=-16;along<=59;along++){
      const x=h.shore.x+h.dx*along,z=h.shore.z+h.dz*along;
      assert.ok(canStand(x,z,world,WALKER),`${h.id} blocks its deck at ${along}: ${JSON.stringify(world.colliders.filter(c=>Math.hypot(c.x-x,c.z-z)<7))}`);
      const y=world.heightAt(x,z);if(previous!==null)assert.ok(Math.abs(y-previous)<.5,`${h.id} has a continuous graded approach`);previous=y;
    }
  }
  let crossings=0,water=0;
  for(const c of CITY_CANALS)for(let i=1;i<c.points.length;i++){
    const a=c.points[i-1],b=c.points[i],length=Math.hypot(b.a-a.a,b.b-a.b);
    for(let d=4;d<length-4;d+=4){
      const p=P(a.a+(b.a-a.a)*d/length,a.b+(b.b-a.b)*d/length),sample=cityCanalAt(p.x,p.z);
      if(sample.bridge){crossings++;assert.ok(world.heightAt(p.x,p.z)>sample.surface,`the street crosses above ${c.id} at ${p.x}, ${p.z}`);}
      else {water++;assert.equal(canStand(p.x,p.z,world,WALKER),false,'open canals are not dry paving');}
    }
  }
  assert.ok(crossings>5&&water>20,'both canal banks and street bridges are exercised');
});

test('everyone in Ambron and the lake country has footing, and every stand in the city is reachable from the Plain Gate', () => {
  for (const [id, at] of Object.entries(ELAGOS_NPC_POSITIONS)) {
    assert.ok(canStand(at.x, at.z, world, WALKER), `${id} has footing`);
    assert.equal(world.regionAt(at.x, at.z)?.name, 'Elagos', `${id} is in Elagos`);
    assert.ok(elagosWaterDistance(at.x, at.z) > 0, `${id} is not standing in a lake`);
  }
  for (const [id, stand] of Object.entries(AMBRON_STANDS)) assert.ok(Number.isFinite(stand.yaw), `${id} faces somewhere`);
  // Flood the ground from the haul road outside the Plain Gate, on a half-metre grid.
  const minA = -152, maxA = 184, minB = -188, maxB = 245, cell = 1;
  const columns = Math.round((maxA - minA) / cell) + 1;
  const seen = new Uint8Array(columns * (Math.round((maxB - minB) / cell) + 1)), queue = [];
  const index = (a, b) => Math.round((b - minB) / cell) * columns + Math.round((a - minA) / cell);
  const open = (a, b) => { const p = P(a, b); return canStand(p.x, p.z, nearAmbron, WALKER); };
  const g=AMBRON_ENCLOSURE.gates.find(g=>g.id==='plain-gate').inner; const start=[Math.round(g.x-AMBRON.centre.x),Math.round(g.z-AMBRON.centre.z)];
  assert.ok(open(...start), 'the haul road outside the Plain Gate is open');
  seen[index(...start)] = 1; queue.push(start);
  while (queue.length) {
    const [a, b] = queue.pop();
    for (const [da, db] of [[cell, 0], [-cell, 0], [0, cell], [0, -cell]]) {
      const na = a + da, nb = b + db;
      if (na < minA || na > maxA || nb < minB || nb > maxB) continue;
      const k = index(na, nb);
      if (seen[k]) continue;
      seen[k] = open(na, nb) ? 1 : 2;
      if (seen[k] === 1) queue.push([na, nb]);
    }
  }
  const reached = (x, z) => {
    const a = Math.round((x - AMBRON.centre.x) / cell) * cell, b = Math.round((z - AMBRON.centre.z) / cell) * cell;
    return [[0, 0], [cell, 0], [-cell, 0], [0, cell], [0, -cell]].some(([da, db]) => seen[index(a + da, b + db)] === 1);
  };
  for (const [id, stand] of Object.entries(AMBRON_STANDS)) assert.ok(reached(stand.x, stand.z), `${id} can be walked to from the haul road`);
  // The armourer is placed by the host rather than by the world, so he is in neither list above.
  assert.ok(canStand(AMBRON_FORGE.stand.x, AMBRON_FORGE.stand.z, world, WALKER), 'the armourer has footing at his own door');
  assert.ok(reached(AMBRON_FORGE.stand.x, AMBRON_FORGE.stand.z), 'and can be walked to from the haul road');
  // And the places that matter: the market, the Seat's plaza, both quays and the far bank.
  for (const [a, b, what] of [[-5,0,'the market'],[-39,-95,'the Seat'],[-20,77,'the guild lane'],[-68,85,'the homes']])
    assert.ok(reached(P(a, b).x, P(a, b).z), `${what} can be reached`);
});

test('Ambron is a walled place the autopilot enters by its gates', () => {
  assert.ok(world.enclosures.some(entry => entry.id === 'ambron'), 'the world lists it');
  assert.equal(AMBRON_ENCLOSURE.gates.length, AMBRON_LAND_GATES.length, 'one waypoint pair per land gate');
  assert.ok(AMBRON_ENCLOSURE.contains(AMBRON.centre.x + 40, AMBRON.centre.z), 'inside is inside');
  assert.equal(AMBRON_ENCLOSURE.contains(AMBRON.centre.x, AMBRON.centre.z - AMBRON.halfB - 20), false, 'and outside is outside');
  for (const gate of AMBRON_ENCLOSURE.gates) {
    assert.equal(AMBRON_ENCLOSURE.contains(gate.outer.x, gate.outer.z), false, `${gate.id}'s outer waypoint is outside the walls`);
    assert.ok(AMBRON_ENCLOSURE.contains(gate.inner.x, gate.inner.z), `${gate.id}'s inner waypoint is inside them`);
    assert.ok(canStand(gate.outer.x, gate.outer.z, world, WALKER) && canStand(gate.inner.x, gate.inner.z, world, WALKER), `${gate.id}'s waypoints have footing`);
  }
});

test('Ambron’s streets and buildings are laid out on the ground, not through each other', () => {
  for (let i = 0; i < AMBRON_BUILDINGS.length; i++) for (let j = i + 1; j < AMBRON_BUILDINGS.length; j++) {
    const p = AMBRON_BUILDINGS[i], q = AMBRON_BUILDINGS[j];
    assert.ok(Math.abs(p.a - q.a) >= (p.w + q.w) / 2 || Math.abs(p.b - q.b) >= (p.d + q.d) / 2, `${p.id} and ${q.id} overlap`);
  }
  const inset = AMBRON.halfA - AMBRON_STANDARD.wallThickness / 2, insetB = AMBRON.halfB - AMBRON_STANDARD.wallThickness / 2;
  for (const entry of AMBRON_BUILDINGS) {
    assert.ok(Math.abs(entry.a) + entry.w / 2 <= inset + .01, `${entry.id} stands clear of the east and west walls`);
    assert.ok(Math.abs(entry.b) + entry.d / 2 <= insetB + .01, `${entry.id} stands clear of the north and south walls`);
    for(const dx of [-1,1])for(const dz of [-1,1]){const p=P(entry.a+dx*(entry.w/2+1),entry.b+dz*(entry.d/2+1));assert.ok(inAmbronOutline(p.x,p.z),`${entry.id} fits the dry irregular outline`);assert.ok(ambronDryDistance(p.x,p.z)>=0,`${entry.id} keeps its foundations out of water`);}
  }
  for (const street of AMBRON_STREETS) for (let i = 1; i < street.points.length; i++) {
    const a = street.points[i - 1], b = street.points[i];
    for (let t = 0; t <= 1; t += .02) {
      const pa = a.a + (b.a - a.a) * t, pb = a.b + (b.b - a.b) * t;
      const p=P(pa,pb);assert.ok(elagosWaterDistance(p.x,p.z)>=0||onLinkBridge(p.x,p.z),`${street.id} uses dry land or the Link bridge`);
      for (const entry of AMBRON_BUILDINGS)
        assert.ok(Math.abs(entry.a - pa) >= entry.w / 2 || Math.abs(entry.b - pb) >= entry.d / 2, `${street.id} runs through ${entry.id}`);
    }
  }
  // The four ages are all on the ground: the streets name which Ambron laid them.
  assert.equal(new Set(AMBRON_STREETS.map(street => street.layer)).size, 4, 'four periods of paving');
  assert.equal(new Set(AMBRON_BUILDINGS.map(entry => entry.layer)).size >= 3, true, 'and at least three of building');
  // The market is a widening of the main street, not a separate square behind it.
  const main = AMBRON_STREETS.find(street => street.id === 'ela-street');
  assert.ok(main.points.some(p => p.a > AMBRON_MARKET.minA && p.a < AMBRON_MARKET.maxA + 40 && p.b > AMBRON_MARKET.minB && p.b < AMBRON_MARKET.maxB),
    'the main street runs through the market');
  // The road from the Moros arrives at the Plain Gate and the spawn stands on it.
  const spawn = world.regions.find(region => region.name === 'Elagos').spawn;
  assert.ok(canStand(spawn.x, spawn.z, world, WALKER), 'the region spawns somewhere standable');
  assert.ok(Math.min(...AMBRON_ROAD.map(p => Math.hypot(p.x - spawn.x, p.z - spawn.z))) < 30, 'on the haul road below the gate');
  assert.ok(spawn.z > AMBRON.centre.z + AMBRON.halfB, 'outside the walls, looking at the city');
  assert.ok(spawn.x > WORLD_BOUNDS.minX && spawn.x < WORLD_BOUNDS.maxX);
});


test('Ambron keeps a specialist for every skill the country teaches, and one of them sends the traveler after the talking tree', () => {
  // The user's rule: a skill belongs to whoever practises it, and the big city has
  // one of everybody. Every skill Drent teaches has a counterpart here.
  assert.deepEqual([...new Set(SPECIALIST_IDS.map(id => AMBRON_SPECIALISTS[id].skill))].sort(),
    ['birding', 'botany', 'fishing', 'geology', 'mycology'], 'one specialist per skill');
  for (const id of SPECIALIST_IDS) {
    const entry = AMBRON_SPECIALISTS[id];
    assert.ok(ELAGOS_NPCS.some(npc => npc.id === id), `${id} is a person in the city`);
    assert.ok(AMBRON_STANDS[id], `${id} stands somewhere in Ambron`);
    assert.ok(canStand(AMBRON_STANDS[id].x, AMBRON_STANDS[id].z, world, WALKER), `${id} has footing`);
    assert.ok(entry.lesson.length >= 3 && entry.known.length >= 2, `${id} teaches, and has something else for somebody who knows`);
    assert.ok(entry.offer.length > 8);
    // A city specialist is not the village one under another name.
    assert.notEqual(entry.lesson.join(' '), ELAGOS_AMBIENT[id].join(' '));
  }
  // Teaching: a traveler who does not know the skill is offered it, and the host is
  // asked to teach it. Birding goes through its own module's first meeting.
  const opened = [], taught = [], acted = [];
  const host = knows => ({
    openDialogue: (npc, lines, _, back, extra) => opened.push({ id: npc.id, lines, back, choices: (extra?.choices ?? []).map(choice => choice) }),
    closeDialogue: () => {}, skills: { known: id => knows.includes(id), learn: id => { taught.push(id); return { ok: true }; } },
    teachSkill: id => { taught.push(id); return { ok: true }; },
    birding: { met: knows.includes('birding'), meet: () => { taught.push('birding'); return { ok: true }; } },
    act: id => { acted.push(id); return { ok: true, repeat: acted.filter(entry => entry === id).length > 1 }; },
  });
  for (const id of SPECIALIST_IDS) {
    opened.length = 0; taught.length = 0;
    const context = host([]);
    assert.equal(elagosConversation({ id, modelRole: 'rise-custodian' }, context), true);
    const offer = opened[0].choices.find(choice => choice.id === `learn-${AMBRON_SPECIALISTS[id].skill}`);
    assert.ok(offer, `${id} offers to teach`);
    offer.action();
    assert.deepEqual(taught, [AMBRON_SPECIALISTS[id].skill], `${id} teaches its own skill and nothing else`);
    assert.deepEqual(opened.at(-1).lines, [...AMBRON_SPECIALISTS[id].lesson]);
  }
  // And somebody who already knows it is told something else, and not offered it again.
  for (const id of SPECIALIST_IDS) {
    opened.length = 0;
    elagosConversation({ id }, host([AMBRON_SPECIALISTS[id].skill]));
    assert.deepEqual(opened[0].lines, [...AMBRON_SPECIALISTS[id].known], `${id} says something else to somebody who knows`);
    assert.equal(opened[0].choices.some(choice => choice.id.startsWith('learn-')), false, `${id} does not teach it twice`);
  }
  // The talking tree: the botanist's own branch, and the flag the host remembers it by.
  assert.equal(TALKING_TREE_QUEST, 'talking-tree-told');
  opened.length = 0; acted.length = 0;
  const context = host([]);
  elagosConversation({ id: 'ambron-botanist' }, context);
  const errand = opened[0].choices.find(choice => choice.id === TALKING_TREE_QUEST);
  assert.ok(errand, 'the botanist can be asked about it');
  errand.action();
  assert.deepEqual(acted, [TALKING_TREE_QUEST], 'and the host is told');
  const told = opened.at(-1).lines.join(' ');
  assert.match(told, /Drent/, 'the tree is in Drent');
  assert.match(told, /last|one/i, 'and it is the last of them');
  assert.match(told, /looks at you/i, 'it looks at the traveler');
  assert.ok(!/press|button|key/i.test(told), 'how the talking works is left to whoever builds it');
  // Asked twice, she does not repeat herself.
  elagosConversation({ id: 'ambron-botanist' }, context);
  opened.at(-1).choices.find(choice => choice.id === TALKING_TREE_QUEST).action();
  assert.notDeepEqual(opened.at(-1).lines, [...TALKING_TREE_LINES.told]);
});

test('the people of Ambron speak as the day and the place require', () => {
  assert.ok(ELAGOS_NPCS.length >= 15 && ELAGOS_NPCS.length <= 34, `${ELAGOS_NPCS.length} people`);
  assert.equal(new Set(ELAGOS_NPCS.map(npc => npc.id)).size, ELAGOS_NPCS.length, 'nobody is registered twice');
  for (const npc of ELAGOS_NPCS) {
    assert.ok(isElagosNpc(npc.id));
    assert.ok(ELAGOS_AMBIENT[npc.id]?.length >= 2, `${npc.id} has something to say`);
    assert.ok(npc.name && npc.role, `${npc.id} is somebody`);
    assert.ok(ELAGOS_NPC_POSITIONS[npc.id], `${npc.id} stands somewhere`);
  }
  // Only Imperial soldiers wear Imperial armour.
  const armoured = ELAGOS_NPCS.filter(npc => npc.modelRole === 'legion-soldier' || npc.modelRole === 'legion-officer');
  assert.ok(armoured.length >= 4 && armoured.length <= 8, 'the Empire keeps a garrison and not an army in the streets');
  for (const npc of armoured) assert.match(`${npc.name} ${npc.role}`, /Ambroni|army|Footman|Lieutenant|Marshal/i, `${npc.name} is the army’s`);
  // King or emperor is a declaration, never an accident: the council says king with a point.
  const council = ELAGOS_AMBIENT['ambron-committee'].join(' ');
  assert.match(council, /Not emperor\. King\./);
  // The toll is the seam, and it is spoken from both ends of it.
  const clerk = ELAGOS_AMBIENT['ambron-toll-clerk'].join(' ');
  assert.match(clerk, /toll|tenth|twentieth/i);
  assert.match(ELAGOS_AMBIENT['ambron-bargemaster'].join(' '), /paid|toll|line/i);
  assert.match(ELAGOS_AMBIENT['ambron-beggar'].join(' '), /toll/i);
  // The day is one day old, and the news out of the east is in the Marshal's mouth.
  assert.match(ELAGOS_AMBIENT['ambron-legate'].join(' '), /Valroy/);
  assert.match(ELAGOS_AMBIENT['ambron-printer'].join(' '), /proclamation/i);
  // The winters are somebody's job.
  assert.match(ELAGOS_AMBIENT['ambron-ice-warden'].join(' '), /ice-road|ice/i);
  // A conversation opens and closes without a host that knows anything about Elagos.
  let opened = null;
  const closed = () => { opened = { ...opened, closed: true }; };
  const ok = elagosConversation(AMBRON_NPCS[0], { openDialogue: (npc, lines, _, back, extra) => { opened = { npc, lines, back, extra }; }, closeDialogue: closed });
  assert.equal(ok, true);
  assert.ok(opened.lines.length >= 2 && opened.back && opened.extra.choices.length === 1);
  assert.equal(elagosConversation({ id: 'harbormaster' }, { openDialogue: () => {}, closeDialogue: () => {} }), false, 'and it answers for nobody else');
});


test('every separate dry wall section has a land gate', () => {
  const samples=[];
  for(const edge of AMBRON_CIRCUIT.edges)for(let at=0;at<edge.length;at+=.5)samples.push({
    wet:AMBRON_SHORE_GAPS.some(g=>g.edge===edge.index&&at>=g.from&&at<=g.to),
    gate:AMBRON_LAND_GATES.some(g=>g.edge===edge.index&&Math.abs(at-g.at)<2),
  });
  const start=samples.findIndex(s=>s.wet),groups=[];let current=null;
  for(let i=1;i<=samples.length;i++){
    const sample=samples[(start+i)%samples.length];
    if(sample.wet){current=null;continue;}
    if(!current){current={length:0,gate:false};groups.push(current);}
    current.length+=.5;current.gate||=sample.gate;
  }
  assert.equal(groups.length,5,'five curtains separated by the lakes');
  for(const section of groups)assert.ok(section.gate,`${section.length}m curtain has a gate`);
});

test('shipping canals connect all seven basins with wet beds beneath the road bridges', () => {
  const links=[['thelas-upper','thelas-middle'],['thelas-middle','thelas-lower'],['thelas-lower','lake-ela'],...CITY_CANALS.map(c=>[c.from,c.to])];
  const reached=new Set(['lake-ela']);
  for(let i=0;i<ELAGOS_BASINS.length;i++)for(const [a,b] of links)if(reached.has(a)||reached.has(b)){reached.add(a);reached.add(b);}
  assert.deepEqual([...reached].sort(),ELAGOS_BASINS.map(b=>b.id).sort(),'no isolated lake');
  let bridges=0;
  for(const canal of CITY_CANALS){
    assert.ok(canal.navigable&&canal.width>=12,'wide enough for shipping');
    for(const p of [canal.points[0],canal.points.at(-1)])assert.ok(elagosWaterDistance(P(p.a,p.b).x,P(p.a,p.b).z)<-2,'canal mouths enter lake water');
    for(let j=1;j<canal.points.length;j++){
      const a=canal.points[j-1],b=canal.points[j],length=Math.hypot(b.a-a.a,b.b-a.b);
      for(let d=1;d<length;d+=3){
        const p=P(a.a+(b.a-a.a)*d/length,a.b+(b.b-a.b)*d/length),sample=cityCanalAt(p.x,p.z);
        assert.ok(elagosGround(p.x,p.z,80)<=sample.surface-2.5,'no dry dam under a bridge');
        if(sample.bridge){bridges++;assert.ok(world.heightAt(p.x,p.z)>=sample.surface+4,'clear passage for low cargo barges');}
      }
    }
  }
  assert.ok(bridges>10);assert.equal(world.elagosMetrics.locks,4);assert.ok(world.elagosMetrics.barges>=4);
});

test('the central palace rises above mixed high and low urban districts, with open fortress gates', () => {
  assert.ok(Math.hypot(AMBRON_PALACE.x-AMBRON.centre.x,AMBRON_PALACE.z-AMBRON.centre.z)<60,'palace is near the heart of the city');
  assert.ok(AMBRON_BUILDINGS.filter(b=>b.h>=20).length>=55,'substantial tall residential districts');
  assert.ok(AMBRON_BUILDINGS.filter(b=>b.h<10).length>=30,'older small buildings remain mixed in');
  for(const f of AMBRON_FORTRESSES)for(let dz=f.d/2+4;dz>9;dz-=.5)assert.ok(canStand(f.x,f.z+dz,world,WALKER),`${f.id} has an actual gateway into its courtyard`);
});


test('the farmland belt is planted outside the defenses and preserves roads and lake banks', () => {
  let samples=0;
  for(const field of AMBRON_FIELDS){
    let planted=0;
    for(let u=-field.w/2+4;u<field.w/2;u+=6)for(let v=-field.d/2+4;v<field.d/2;v+=6){
      const p=farmPoint(field,u,v);if(!ambronCultivatedField(p.x,p.z))continue;
      assert.equal(inAmbronOutline(p.x,p.z),false,'crops stay outside the walls');
      assert.ok(elagosWaterDistance(p.x,p.z)>=7,'lake banks stay open');
      assert.ok(farmRoadDistance(p.x,p.z,ELAGOS_ROADS)>=7,'fields respect road approaches');
      assert.ok(Object.values(AMBRON_CROPS[field.crop]).includes(ambronGroundTint(p.x,p.z)),'cultivated ground is painted as the field, not grass');
      planted++;samples++;
    }
    assert.ok(planted>5,`${field.id} has usable cultivated ground`);
  }
  for(const c of world.colliders.filter(c=>c.kind==='ambron-farm-building'||c.kind==='ambron-orchard-tree'||c.kind==='ambron-haystack')){
    const margin=Math.hypot(c.hx??c.r,c.hz??c.r)+1;
    assert.ok(elagosWaterDistance(c.x,c.z)>margin,'farm infrastructure stays on dry land');
    assert.ok(farmRoadDistance(c.x,c.z,ELAGOS_ROADS)>margin+4,'buildings and trees leave traffic room');
  }
  assert.ok(samples>700);assert.equal(world.elagosMetrics.fields,AMBRON_FIELDS.length);
  assert.equal(world.elagosMetrics.farmsteads,AMBRON_FARMSTEADS.length);
  assert.ok(world.elagosMetrics.orchardTrees>80&&world.elagosMetrics.cropClumps>1500,'the food belt is visibly planted');
});
