import { bodyWorld, stepToward } from './bodies.js';
import { canStand } from './game-state.js';
import { createKayla, KAYLA, KAYLA_RADIUS, kaylaMaySwim, kaylaNavigationWorld } from './kayla.js';

export const KAYLA_FIGHT = 'kayla-self-defense';

/** One named bear: her roaming feet, conversation and combat share one body and one health record. */
export function createKaylaHost({ npc, world, combat, crime, bodies = () => [], playerPosition,
  lizAlive = () => true, roaming = () => true, toast = () => {}, save = () => {} }) {
  const model = createKayla({ onEvent(event) {
    if (event.type === 'kayla-liz-honey' && Math.hypot(model.position.x - playerPosition().x, model.position.z - playerPosition().z) < 24)
      toast(event.text, 'KAYLA AND LIZ');
    if (event.type === 'kayla-stop' || event.type === 'kayla-met') save();
  } });
  const navigation = bodyWorld(kaylaNavigationWorld(world));
  let provoked = false, fighting = false, retry = 0;
  const enemy = () => combat.state.enemies.find(one => one.id === KAYLA.id);
  const height = () => {
    const { x, z } = model.position, ground = world.heightAt(x, z), water = world.waterAt?.(x, z);
    return kaylaMaySwim(x, z) && Number.isFinite(water) && water > ground ? water - .65 : ground;
  };
  function place() {
    const at = model.position;
    npc.actor.group.position.set(at.x, height(), at.z);
    world.npcPositions[npc.id] = { x: at.x, z: at.z };
  }
  function remember(one) {
    if (!one) return;
    model.position.x = one.x; model.position.z = one.z;
    npc.actor.group.rotation.y = one.yaw;
    // The combat renderer owns a live bear; the corpse host reconstructs the fallen bear.
    crime.recordCombatHit({ id: npc.id, hp: one.hp, maxHp: one.maxHp,
      source: 'world', selfDefense: true, permanent: one.hp <= 0, notify: false, x: one.x, z: one.z });
    place();
  }
  function assault({ npcId, source, hp }) {
    if (npcId !== npc.id || source !== 'player' || !(hp > 0)) return;
    provoked = true; retry = 0; save();
    toast('Kayla draws herself up. “No, dear. You must not hurt me.”', 'KAYLA');
  }
  function begin() {
    const health = crime.health(npc.id), at = model.position;
    if (health.status !== 'alive' || combat.state.player.hp <= 0) return false;
    const spec = { id: npc.id, npcId: npc.id, name: npc.name, kind: 'bear',
      x: at.x, z: at.z, hp: health.maxHp, currentHp: health.hp };
    const joined = combat.state.phase === 'active' ? combat.joinEnemy(spec)
      : combat.startEncounter({ id: KAYLA_FIGHT, level: 0, center: { ...at },
        checkpoint: { ...playerPosition() }, retreatZ: at.z + 42, enemies: [spec], allies: [] });
    if (joined) { fighting = true; npc.kaylaFighting = true; save(); }
    return joined;
  }
  function frame(dt, { playing = true, talking = false } = {}) {
    npc.kaylaMotion = 0;
    if (fighting) {
      remember(enemy());
      if (combat.state.phase !== 'active') { fighting = false; provoked = false; npc.kaylaFighting = false; }
    }
    if (crime.isDown(npc.id)) { fighting = false; provoked = false; npc.kaylaFighting = false; return; }
    if (!playing || talking || fighting) return;
    if (provoked && canStand(model.position.x, model.position.z, world, KAYLA_RADIUS)) {
      retry -= dt;
      if (retry <= 0) { retry = .5; begin(); }
      // If a training bout or distant fight cannot admit another body, she waits rather than duplicating it.
      return;
    }
    if(!roaming()&&!provoked)return;
    // Combat needs dry footing. Keep her anger while she swims normally to the bank;
    // admitting her midriver would let combat's safe-point search move her off her route.
    navigation.setBodies(bodies()).moving(model.position, KAYLA_RADIUS, npc.id);
    const before = { ...model.position };
    const state = model.tick(dt, { lizAlive: lizAlive(), move: (position, target, distance) =>
      stepToward(position, target, distance, navigation, KAYLA_RADIUS) });
    const moved = Math.hypot(model.position.x - before.x, model.position.z - before.z);
    npc.kaylaMotion = dt > 0 ? moved / dt : 0;
    npc.kaylaPose = { posture: state.honey > 0 ? 'eat' : state.walking ? undefined : 'sniff' };
    if (moved > .001) npc.actor.group.rotation.y = Math.atan2(model.position.x - before.x, model.position.z - before.z);
    place();
  }
  function combatEvent(event) {
    if (!fighting) return;
    remember(enemy() ?? event.enemies?.find(one => one.id === npc.id));
    if (['victory', 'retreat', 'defeat'].includes(event.type) || crime.isDown(npc.id)) {
      fighting = false; provoked = false; npc.kaylaFighting = false; npc.combatPosition = null;
      save();
    }
  }
  function restore(value) {
    if (!model.restore(value)) return false;
    provoked = value?.provoked === true; fighting = false; retry = 0;
    npc.kaylaFighting = false; npc.kaylaMotion = 0; npc.combatPosition = null;
    place(); return true;
  }
  place(); npc.kaylaMotion = 0;
  return { model, frame, assault, combatEvent, restore,
    placeExternal(at){if(fighting||provoked||crime.isDown(npc.id))return false;
      model.position.x=at.x;model.position.z=at.z;if(Number.isFinite(at.yaw))npc.actor.group.rotation.y=at.yaw;
      npc.kaylaMotion=at.speed??0;npc.kaylaPose={};place();return true;},
    snapshot: () => ({ ...model.snapshot(), provoked }),
    state: () => ({ ...model.state(), provoked, fighting, health: crime.health(npc.id) }) };
}
