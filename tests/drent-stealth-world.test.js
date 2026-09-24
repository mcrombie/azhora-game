import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createDrentHost, guardLineOfSight } from '../src/drent-host.js';
import { DRENT_NPCS, DRENT_NPC_POSITIONS, DRENT_SITES, DRENT_GUARD_PATROLS, DRENT_SNEAK_ROUTE } from '../src/drent-sites.js';
import { DRENT_SUPPLIES_ID } from '../src/drent-civil-war.js';
import { createInventoryState } from '../src/inventory.js';
import { createSkills } from '../src/skills.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { BODY, bodyWorld, stepToward } from '../src/bodies.js';
import { STEALTH } from '../src/stealth.js';

const { createWorld } = await sourceModule('../src/world.js');
const built = createWorld(new THREE.Scene());
const dt = .05, walkingSpeed = 4.2, separation = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function raid(start) {
  const world = { ...built, npcPositions: { ...built.npcPositions } }, player = { ...start };
  const inventory = { ...createInventoryState(), refresh() {} }, skills = createSkills();
  const npcById = new Map(DRENT_NPCS.map(npc => [npc.id, { ...npc, actor: { group: {
    position: new THREE.Vector3(DRENT_NPC_POSITIONS[npc.id].x, 0, DRENT_NPC_POSITIONS[npc.id].z), rotation: { y: npc.yaw ?? 0 },
  } } }]));
  const host = createDrentHost({ world, npcById, inventory, skills,
    combat: { state: { phase: 'peaceful', allies: [] } }, position: () => player, mode: () => 'playing', trained: () => true,
    openDialogue() {}, closeDialogue() {}, toast() {}, onChange() {}, onTrack() {}, getTracked: () => 'main' });
  for (const action of ['defeat-ambush', 'accept-investigation', 'search-camp', 'read-evidence', 'report-killian'])
    assert.equal(host.act(action).ok, true, action);
  const guardWorld = bodyWorld(world), guards = [...npcById.values()].filter(npc => DRENT_GUARD_PATROLS[npc.id]);
  let elapsed = 0, caught = 0, movingDanger = 0;
  function tick() {
    const awareness = host.frame(dt, { playing: true });
    caught += Number(awareness.caught); movingDanger += Number(awareness.moving && awareness.danger) * dt;
    // Match the ordinary NPC loop: walk to the host's patrol target, face actual
    // movement, then turn toward the watch direction once the waypoint is reached.
    for (const npc of guards) {
      const p = npc.actor.group.position, before = { x: p.x, z: p.z }, target = world.npcPositions[npc.id];
      if (separation(p, target) > .1) stepToward(p, target, Math.min(separation(p, target), dt * npc.pace), guardWorld.moving(p, BODY.person), BODY.person);
      const moved = separation(p, before);
      if (moved / dt > .1) npc.actor.group.rotation.y = Math.atan2(p.x - before.x, p.z - before.z);
      else if (npc.face) {
        const turn = Math.atan2(npc.face.x - p.x, npc.face.z - p.z) - npc.actor.group.rotation.y;
        npc.actor.group.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-4 * dt));
      }
    }
    elapsed += dt; return awareness;
  }
  function walk(route, { sneak = true, cap = 20 } = {}) {
    assert.ok(canStand(player.x, player.z, world, BODY.traveler), 'starting point is walkable');
    if (sneak) assert.equal(host.toggleSneak(), true);
    const began = elapsed;
    for (const target of route.slice(1)) {
      while (separation(player, target) > .025 && elapsed - began < cap) {
        const before = { ...player }, d = separation(player, target), amount = Math.min(d, walkingSpeed * host.speedMultiplier * dt);
        moveCharacter(player, (target.x - player.x) / d * amount, (target.z - player.z) / d * amount, world, BODY.traveler);
        assert.ok(canStand(player.x, player.z, world, BODY.traveler), 'the player stays outside solid scenery');
        assert.ok(separation(player, before) > .001, `stuck at ${player.x.toFixed(2)}, ${player.z.toFixed(2)}`);
        tick();
      }
      assert.ok(separation(player, target) <= .025, 'the short authored route must fit its time limit');
    }
    return { seconds: elapsed - began, xp: skills.xp('stealth'), caught, movingDanger, awareness: host.awareness };
  }
  return { host, skills, player, inventory, world, guards, tick, walk };
}

test('a real sneak around the barracks earns practice and reaches the supplies out of sight at several patrol phases', t => {
  for (const offset of [0, 9, 18, 27]) {
    const f = raid(DRENT_SNEAK_ROUTE[0]);
    for (let frame = 0; frame < offset / dt; frame++) f.tick();
    const result = f.walk(DRENT_SNEAK_ROUTE);
    t.diagnostic(`Patrol +${offset}s: ${result.seconds.toFixed(1)}s approach, ${result.xp} real XP, ${result.movingDanger.toFixed(1)}s exposed to guard pressure; suspicion ${result.awareness.suspicion.toFixed(2)}, caught ${result.caught}`);
    assert.equal(result.caught, 0, `patrol +${offset}s catches the covered approach`);
    assert.equal(result.awareness.visible, false, 'the chest approach breaks guard sightlines');
    assert.ok(result.awareness.suspicion <= STEALTH.clearAt, 'suspicion is settled at the chest');
    assert.ok(result.xp > 0, 'the route must award real dangerous-movement practice before the quest reward');
    assert.equal(f.host.nearby?.id, 'drent-barracks-supplies');
    assert.equal(f.host.interact(), true);
    assert.equal(f.inventory.count(DRENT_SUPPLIES_ID), 1, 'the same live theft gate accepts this approach');
    assert.ok(f.skills.xp('stealth') >= 83, 'the successful lesson leaves Stealth at level two');
  }
});

test('the front approach is exposed to the real guard and ordinary walking raises an alarm', t => {
  const route = [{ x: -34, z: 59 }, { x: -34, z: 65 }], f = raid(route[0]);
  const guard = f.guards.find(npc => npc.id === 'drent-barracks-west').actor.group.position;
  assert.ok(guardLineOfSight(f.world, guard, route[0]), 'the forward yard has no invisible shelter');
  const result = f.walk(route, { sneak: false });
  t.diagnostic(`${result.seconds.toFixed(1)}s front approach; suspicion ${result.awareness.suspicion.toFixed(2)}, caught ${result.caught}`);
  assert.equal(result.caught, 1);
  assert.equal(result.xp, 0, 'ordinary walking is not stealth practice');
});
