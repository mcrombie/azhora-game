import { QUEST_HOMES } from './quest-homes.js';
import { createHomeResidents, validateHomeResidents } from './home-residents.js';
import { homeReturnRoute, homeReturnQuayRoute } from './home-return-routes.js';
import { FERRY_LANDINGS } from './ferry.js';

/** One actor per resident, indoors or on the road. Normal NPC culling must see
 * actual feet as its goal, never a distant waypoint it could teleport them to. */
export function createHomeResidentHost({ world, npcById, player, combat, crime, corpses,
  move, complete, toast, save, openDialogue, closeDialogue, ferryView = null, passengerOpacity = () => {} } = {}) {
  const available = id => !!npcById.get(id) && !npcById.get(id).fallen && !crime.isDown(id) && !corpses.ownsNpc(id);
  const initial = new Map(Object.keys(QUEST_HOMES).map(id => [id, { ...world.npcPositions[id] }]));
  const resident = createHomeResidents({
    route: (id, from, home, leg) => leg === 'quay' ? homeReturnQuayRoute(world, from) : homeReturnRoute(world, id, from, home),
    move,
    onEvent: event => {
      const near = Math.hypot(npcById.get(event.id).actor.group.position.x - player.group.position.x,
        npcById.get(event.id).actor.group.position.z - player.group.position.z) < 25;
      if (event.type === 'departing' && near) toast(event.id === 'bee-keeper'
        ? 'Troy is heading home to Ambron. He will take the ferry to Port Calos, then walk west.'
        : event.id === 'cagney' ? 'Cagney is going inside. Knock on her door whenever you want to speak with her.'
          : 'Ben is walking home to Ambron, beside Cagney’s house. You can visit and knock on his door.', 'HEADING HOME');
      if (event.type === 'sailing' && near) toast('Troy boards the ferry for Port Calos.', 'BOUND FOR AMBRON');
      if (event.type === 'inside' && near) toast(`${event.home.name} has gone inside. Knock at the door to ask them out.`, 'AT HOME');
      save();
    },
  });
  function begin(id, { announce = true } = {}) {
    const npc = npcById.get(id);
    if (!npc || !complete(id) || !available(id)) return false;
    const at = npc.combatPosition ?? npc.actor.group.position;
    return resident.begin(id, at, { ferry: id === 'bee-keeper'
      && Math.hypot(at.x - FERRY_LANDINGS.peblos.ashore.x, at.z - FERRY_LANDINGS.peblos.ashore.z) < 240, announce });
  }
  function apply(id, state, pace = 0) {
    const npc = npcById.get(id);
    if (!npc || !state || !available(id)) {
      if (id === 'bee-keeper') { ferryView?.update(null); if (npc) { npc.residentFerry = null; passengerOpacity(npc, 1); } }
      return;
    }
    const passenger = id === 'bee-keeper' ? ferryView?.update(state) : null;
    npc.residentFerry = passenger ?? null;
    if (id === 'bee-keeper') passengerOpacity(npc, passenger?.opacity ?? 1);
    const p = passenger?.position ?? state.position;
    npc.residentMotion = passenger?.pace ?? pace; npc.escorting = false; npc.walkingWith = false; npc.pace = undefined;
    npc.hidden = passenger ? !passenger.visible : ['inside', 'sailing'].includes(state.phase);
    npc.actor.group.visible = !npc.hidden; if (npc.hidden) npc.marker.visible = false;
    world.npcPositions[id] = { x: p.x, z: p.z };
    npc.actor.group.position.set(p.x, passenger ? p.y : world.heightAt(p.x, p.z), p.z);
    npc.actor.group.rotation.y = passenger?.yaw ?? state.yaw;
  }
  function frame(dt, playing = true) {
    if (!playing) return;
    if (!available('bee-keeper')) apply('bee-keeper', null);
    for (const id of Object.keys(QUEST_HOMES)) if (!resident.get(id) && complete(id)) begin(id);
    const placements = resident.tick(dt, { player: player.group.position, available,
      readActor: id => {
        const npc = npcById.get(id), fighter = [...combat.state.enemies, ...combat.state.allies]
          .find(one => ['active', 'defeated'].includes(combat.state.phase) && (one.id === id || one.npcId === id));
        return { ...(fighter ?? npc.actor.group.position), busy: !!fighter || crime.controlsNpc(id) };
      } });
    for (const one of placements) apply(one.id, one, one.pace);
  }
  function restore(data) {
    if (!validateHomeResidents(data)) return false;
    for (const id of Object.keys(QUEST_HOMES)) {
      const npc = npcById.get(id); if (!npc) continue; npc.residentMotion = undefined; npc.residentFerry = null;
      if (id === 'bee-keeper') { ferryView?.update(null); passengerOpacity(npc, 1); }
      // Cagney's quest host and Ben's guide restore their unfinished positions.
      if (id === 'bee-keeper' && !data?.people?.[id] && available(id)) {
        const at = initial.get(id); npc.actor.group.position.set(at.x, world.heightAt(at.x, at.z), at.z);
        world.npcPositions[id] = { ...at }; npc.hidden = false;
      }
    }
    if (!resident.restore(data)) return false;
    for (const id of Object.keys(QUEST_HOMES)) {
      if (!resident.get(id) && complete(id)) begin(id, { announce: false });
      apply(id, resident.get(id));
    }
    return true;
  }
  function reset(id) {
    resident.reset(id); const npc = npcById.get(id);
    if (npc) { npc.residentMotion = undefined; npc.residentFerry = null; if (available(id)) npc.hidden = false; }
    if (id === 'bee-keeper') { ferryView?.update(null); if (npc) passengerOpacity(npc, 1); }
  }
  function nearby() {
    return Object.values(QUEST_HOMES).filter(home => Math.hypot(home.door.x - player.group.position.x,
      home.door.z - player.group.position.z) < 3.2)
      .sort((a, b) => Math.hypot(a.door.x - player.group.position.x, a.door.z - player.group.position.z)
        - Math.hypot(b.door.x - player.group.position.x, b.door.z - player.group.position.z))[0] ?? null;
  }
  function knock(home) {
    if (!home) return false;
    const npc = npcById.get(home.npcId), state = resident.get(home.npcId);
    if (!available(home.npcId) || state?.phase !== 'inside') {
      toast(state && ['entering', 'coming-out', 'outside'].includes(state.phase)
        ? `${home.name} is at the doorstep.` : `No answer. ${home.name} is not at home.`, `${home.name.toUpperCase()}’S DOOR`);
      return true;
    }
    openDialogue(npc, [`A voice answers from inside. “Who is it?”`], null, 'At the door', { noWayfinding: true, choices: [
      { id: 'home-come-out', label: `Ask ${home.name} to come outside`, action: () => {
        closeDialogue(); if (resident.knock(home.npcId, { available: available(home.npcId) })) save();
      } },
      { id: 'home-leave', label: 'Leave them in peace', action: closeDialogue },
    ] });
    return true;
  }
  return Object.freeze({ begin, frame, restore, reset, nearby, knock,
    snapshot: resident.snapshot, state: resident.get });
}
