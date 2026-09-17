import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { TOWN_LIFE_NPCS, TOWN_LIFE_IDS, townLifeLines, WALL_FIGURES } from '../src/town-life.js';
import { isOut, stakeOf, occupationControl } from '../src/occupation.js';
import { LEGION_POSTS } from '../src/legion-posts.js';
import { JOURNEY_NPCS } from '../src/journey-content.js';
import { LUSCIA_NPCS } from '../src/luscia-chapter.js';
import { BORDER_NPCS } from '../src/border-chapter.js';
import { AFTERMATH_SITES } from '../src/aftermath-sites.js';
import { LUMBER_TOWN_STABLE, MAIN_ROAD, SUVAL_ROAD, regionNameAt } from '../src/region-world.js';
import { createMercenaryCompany } from '../src/mercenaries.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const ROLES = new Set(['legion-soldier', 'legion-officer', 'suvali-guard', 'elodi-guard', 'commons-miller', 'reed-worker', 'shelter-keeper', 'forest-woodcutter', 'bridge-keeper', 'acorn-cook']);

test('each new person has a name, a known look and at least two lines, and nobody says what Luscia must not hear', () => {
  assert.equal(TOWN_LIFE_IDS.size, TOWN_LIFE_NPCS.length, 'ids are unique');
  for (const npc of TOWN_LIFE_NPCS) {
    assert.ok(npc.name && npc.role, npc.id);
    assert.ok(ROLES.has(npc.modelRole), `${npc.id} wears ${npc.modelRole}`);
    assert.ok(townLifeLines(npc.id).length >= 2, `${npc.id} has two lines`);
    for (const line of npc.lines) {
      assert.doesNotMatch(line, /goblin|South Pyros/i, `${npc.id}: ${line}`);
      assert.ok(line.length > 12 && line.length < 260, `${npc.id} speaks in lines, not speeches`);
    }
    // Only the Legion's people wear the Legion's armour, and the Legion's people leave with the Legion.
    if (npc.modelRole.startsWith('legion-')) assert.equal(npc.holds, 'empire', `${npc.id} is the Legion's`);
  }
  assert.deepEqual(townLifeLines('nobody'), []);
});

test('Elod keeps eight to twelve guards at its frontier, one captain who explains the closed border, all in the new black armour', () => {
  const ground = TOWN_LIFE_NPCS.filter(npc => npc.modelRole === 'elodi-guard'), figures = WALL_FIGURES.filter(figure => figure.role === 'elodi-guard');
  assert.ok(ground.length + figures.length >= 8 && ground.length + figures.length <= 12, `${ground.length + figures.length} Elodi guards`);
  const captains = ground.filter(npc => npc.look?.officer);
  assert.equal(captains.length, 1);
  assert.ok(captains[0].lines.length >= 3 && captains[0].lines.length <= 4);
  assert.ok(captains[0].lines.some(line => /Elod/.test(line)) && captains[0].lines.some(line => /war/.test(line)));
  for (const npc of ground) assert.equal(stakeOf(npc), null, 'Elod’s guard belongs to no side of the war');
});

test('the outpost changes hands: the Legion’s people and flag are out while the Empire holds the Moros, the Coalition’s once it falls', () => {
  const legion = TOWN_LIFE_NPCS.filter(npc => npc.holds === 'empire'), coalition = TOWN_LIFE_NPCS.filter(npc => npc.holds === 'coalition');
  assert.ok(legion.length >= 5 && coalition.length >= 3);
  assert.ok(coalition.some(npc => /captain/i.test(npc.name) && npc.lines.length === 2), 'a valley captain with two lines');
  for (const npc of [...legion, ...coalition]) assert.equal(npc.region, 'Moros Plain');
  const empire = occupationControl({ 'Moros Plain': 'empire' }), fallen = occupationControl({ 'Moros Plain': 'empire' }, { variant: 'moros-outpost', cleared: true });
  assert.ok(legion.every(npc => isOut(stakeOf(npc), empire) && !isOut(stakeOf(npc), fallen)));
  assert.ok(coalition.every(npc => !isOut(stakeOf(npc), empire) && isOut(stakeOf(npc), fallen)));
  const flags = world.stakedProps;
  assert.deepEqual(flags.map(flag => flag.holds).sort(), ['coalition', 'empire']);
  assert.ok(flags.every(flag => flag.region === 'Moros Plain' && flag.object.isMesh));
  for (const figure of WALL_FIGURES) assert.ok(figure.lift > 3 || figure.id === 'wall-elodi-behind', `${figure.id} stands up on a wall or tower`);
});

test('every new stand is on walkable ground in its own region, clear of the quest people, the mercenaries’ muster and each other', () => {
  const quest = [...Object.entries(world.npcPositions).filter(([id]) => !TOWN_LIFE_IDS.has(id)).map(([id, p]) => ({ id, ...p })),
    ...LEGION_POSTS, ...BORDER_NPCS, ...JOURNEY_NPCS.map(npc => ({ ...npc, ...world.npcPositions[npc.id] })), ...LUSCIA_NPCS.map(npc => ({ ...npc, ...world.npcPositions[npc.id] })),
    ...Object.entries(AFTERMATH_SITES).filter(([, site]) => site).map(([id, site]) => ({ id, ...site })), { id: 'ostler', ...LUMBER_TOWN_STABLE.stand }, { id: 'hitch', ...LUMBER_TOWN_STABLE.hitch }];
  const muster = createMercenaryCompany({ road: world.paths[0], stops: [], muster: world.storySites.legionCamp, landing: world.spawn }).placements(1e7);
  for (const npc of TOWN_LIFE_NPCS) {
    assert.ok(canStand(npc.x, npc.z, world, .45), `${npc.id} has footing`);
    const region = regionNameAt(npc.x, npc.z);
    assert.notEqual(region, 'East Suval', `${npc.id} stands where the traveler can reach`);
    for (const other of quest) if (Number.isFinite(other.x)) assert.ok(Math.hypot(other.x - npc.x, other.z - npc.z) >= 4, `${npc.id} crowds ${other.id}`);
    for (const man of muster) assert.ok(Math.hypot(man.x - npc.x, man.z - npc.z) >= 3, `${npc.id} stands in the muster`);
    for (const other of TOWN_LIFE_NPCS) if (other !== npc) assert.ok(Math.hypot(other.x - npc.x, other.z - npc.z) >= 3, `${npc.id} and ${other.id} keep apart`);
  }
});

test('every new stand can be walked to from the road', () => {
  const step = 1.5, key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const roads = [world.paths[0], world.suvalRoute];
  const nearestRoadPoint = (x, z) => {
    let best = null, bestDistance = Infinity;
    for (const road of roads) for (let i = 1; i < road.length; i++) {
      const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      const px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < bestDistance) { bestDistance = d; best = { x: px, z: pz }; }
    }
    return best;
  };
  for (const npc of TOWN_LIFE_NPCS) {
    const start = nearestRoadPoint(npc.x, npc.z), limit = Math.hypot(start.x - npc.x, start.z - npc.z) + 45;
    const seen = new Set([key(start.x, start.z)]), queue = [start];
    let reached = false;
    for (let i = 0; i < queue.length && !reached && i < 60000; i++) {
      const { x, z } = queue[i];
      if (Math.hypot(x - npc.x, z - npc.z) < 2) { reached = true; break; }
      for (const [nx, nz] of [[x + step, z], [x - step, z], [x, z + step], [x, z - step]]) {
        const k = key(nx, nz);
        if (seen.has(k) || Math.hypot(nx - npc.x, nz - npc.z) > limit) continue;
        seen.add(k);
        if (canStand(nx, nz, world, .45)) queue.push({ x: nx, z: nz });
      }
    }
    assert.ok(reached, `${npc.id} cannot be reached from the road`);
  }
  assert.ok(MAIN_ROAD.length && SUVAL_ROAD.length);
});
