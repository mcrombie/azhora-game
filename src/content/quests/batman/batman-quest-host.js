import { BATMAN_QUEST, BATMAN_COMBAT, BATSMASHER, CATIE_BATMAN_OFFER, BATSMASHER_OFFER,
  BATMAN_GREETING, BATMAN_PEACE, BATMAN_HISTORY, BATMAN_LANDING_WORDS, createBatmanQuest, migrateBatmanQuest } from './batman-quest.js';
import { buildSuvalFlightRoute, createBatmanFlight, SUVAL_FLIGHT_REGIONS } from './batman-flight.js';
import { BAT_CAVE, BAT_LANDING } from '../../regions/suval-highlands/suval-highlands.js';
import { REGION_CELLS } from '../../../world/terrain/region-world.js';
import { COPPER_ITEM } from '../../../gameplay/inventory/economy.js';

export const BATSMASHER_STAND = Object.freeze({ x: -426, z: 908, yaw: Math.PI });
export const BATMAN_FIGHT = 'batman-self-defense';

/** The cave, conversation, combat and flight use one persistent creature. */
export function createBatmanQuestHost({ npc, world, combat, crime, inventory, skills,
  player, openDialogue, closeDialogue, mount, dismount, reveal, focus = () => {},
  changed = () => {}, toast = () => {}, narrate = () => {} }) {
  let clock = 0, fighting = false, ready = false, corpsePosition = null;
  const quest = createBatmanQuest({ onEvent(event) {
    if (event.type === 'batman-flight-complete') {
      skills.gain('flying', event.flyingXp); skills.gain('cartography', event.cartographyXp);
    }
    if (ready) changed();
  } });
  const routes = buildSuvalFlightRoute({ cells: SUVAL_FLIGHT_REGIONS.flatMap(region =>
    REGION_CELLS[region].map(cell => ({ ...cell, region }))), cave: BAT_CAVE.perch,
    apron: BAT_CAVE.apron, landing: BAT_LANDING, heightAt: world.heightAt });
  const flight = createBatmanFlight({ ...routes, onEvent(event) {
    if (event.type === 'cell-revealed') reveal(event);
    if (event.type === 'regions-revealed') changed();
    if (event.type === 'narration') narrate(event);
    if (event.type === 'landed') {
      placeFlight(); dismount({ ...BAT_LANDING, x: BAT_LANDING.x + 2.8 });
      quest.finishFlight(); narrate(null);
      speak([...BATMAN_LANDING_WORDS], [{ id: 'batman-landed', label: 'Thank you. I will remember.', onSelect() {
        closeDialogue(); flight.returnHome(); changed();
      } }]);
    }
    if (event.type === 'home') { placeFlight(); quest.finishReturn(); changed(); }
  } });
  function speak(lines, choices, speaker = npc) {
    openDialogue(speaker, lines, null, 'Continue', { choices: choices.map((choice, index) => ({
      ...choice, id: choice.id ?? `batman-choice-${index}`, action: choice.action ?? choice.onSelect,
    })), noWayfinding: true });
  }
  const goodbye = () => ({ label: 'Goodbye.', onSelect: closeDialogue });
  function placeHome() {
    npc.actor.group.position.set(BAT_CAVE.perch.x, world.heightAt(BAT_CAVE.perch.x, BAT_CAVE.perch.z), BAT_CAVE.perch.z);
    npc.actor.group.rotation.y = BAT_CAVE.yaw;
    if (world.npcPositions) world.npcPositions[npc.id] = { ...BAT_CAVE.perch };
  }
  function placeFlight() {
    const s = flight.state(); npc.actor.group.position.set(s.x, s.y, s.z); npc.actor.group.rotation.y = s.yaw;
    npc.actor.update(clock, { flying: s.airborne ?? s.flying, speed: s.speed });
    npc.actor.group.updateMatrixWorld(true);
    if (world.npcPositions) world.npcPositions[npc.id] = { x: s.x, z: s.z };
    if (s.mounted) mount(npc.actor);
  }
  function beginFlight() {
    if (combat.state.phase === 'active' || crime.isDown(npc.id)) { toast('Finish the fight first.', 'BATMAN'); return false; }
    closeDialogue();
    if (quest.state().stage !== 'friendly' || flight.state().stage !== 'idle') return false;
    ready = false; quest.beginFlight();
    skills.learn('flying'); skills.learn('cartography');
    flight.start(); placeFlight(); ready = true; focus(BATMAN_QUEST.id); changed(); return true;
  }
  function beginFight() {
    if (fighting || flight.mounted || crime.isDown(npc.id) || combat.state.player.hp <= 0) return false;
    const health = crime.health(npc.id), at = npc.actor.group.position;
    const enemy = { id: npc.id, npcId: npc.id, name: npc.name, kind: 'batman', x: at.x, z: at.z,
      hp: BATMAN_COMBAT.hp, currentHp: health.hp };
    fighting = combat.state.phase === 'active' ? combat.joinEnemy(enemy)
      : combat.startEncounter({ id: BATMAN_FIGHT, level: 0, center: { x: at.x, z: at.z },
        checkpoint: { x: BAT_CAVE.approach.x, z: BAT_CAVE.approach.z }, retreatZ: at.z + 50, enemies: [enemy], allies: [] });
    return fighting;
  }
  function attack() { closeDialogue(); quest.attack(); beginFight(); changed(); }
  function converseCatie(catie) {
    const s = quest.state(); quest.offer();
    if (s.stage === 'complete') {
      quest.reportToCatie(); speak(['You saw him as he really is. Thank you for listening. I will keep telling our neighbors what he has done for Suval.'], [goodbye()], catie); return;
    }
    if (s.stage === 'dead') { speak(['He was protecting people. I asked you to listen to him.'], [goodbye()], catie); return; }
    speak([...CATIE_BATMAN_OFFER], [
      { id: 'catie-accept', label: s.stage === 'available' ? 'I will look for him and hear his story.' : 'Remind me where to look.', onSelect() {
        quest.accept(); closeDialogue(); focus(BATMAN_QUEST.id); changed();
        toast('Follow the hollow ridge path from southern West Suval into the highlands.', 'CATIE’S SEARCH');
      } }, goodbye()], catie);
  }
  function converseOfficer(officer) {
    const s = quest.state(); quest.offerBounty();
    if (s.bounty === 'paid') { speak(['The bounty is paid.'], [goodbye()], officer); return; }
    if (['flying', 'complete'].includes(s.stage)) { speak(['You chose to believe the creature. I have no payment for that.'], [goodbye()], officer); return; }
    if (s.bounty === 'accepted' && inventory.count(BATMAN_QUEST.headItem)) {
      speak(['You have brought the proof. One hundred copper, as promised.'], [{ label: 'Hand over the head · receive 100 copper', onSelect() {
        quest.claimBounty({ take: id => inventory.remove(id, 1), reward: n => inventory.add(COPPER_ITEM, n) });
        inventory.refresh(); closeDialogue(); changed();
      } }, goodbye()], officer); return;
    }
    speak([...BATSMASHER_OFFER], [{ label: 'Accept the bounty.', onSelect() {
      quest.acceptBounty(); closeDialogue(); focus(BATMAN_QUEST.id); changed();
    } }, goodbye()], officer);
  }
  function converseBatman() {
    if (crime.isDown(npc.id) || quest.state().stage === 'dead') return false;
    const s = quest.state();
    if (s.stage === 'hostile') { closeDialogue(); beginFight(); return true; }
    if (s.stage === 'complete') { speak(['There are still people on these roads who need someone to watch over them. Remember what you saw.'], [goodbye()]); return true; }
    quest.discover();
    if (s.stage === 'friendly') { offerFlight(); return true; }
    speak([...BATMAN_GREETING], [
      { id: 'batman-speak', label: 'Speak to him. I want to understand.', onSelect() { quest.speak(); offerFlight(); } },
      { label: 'Attack him.', onSelect: attack }, { label: 'Leave the cave.', onSelect: closeDialogue }
    ]); return true;
  }
  function offerFlight() {
    speak([...BATMAN_PEACE], [{ id: 'batman-fly', label: 'Show me Suval · learn Flying', onSelect: beginFlight },
      { label: 'I need to prepare first.', onSelect: closeDialogue }]);
  }
  function assault(event) { if (event.npcId === npc.id && event.source === 'player' && event.hp > 0) { quest.attack(); beginFight(); } }
  function killed(id) {
    if (id !== npc.id || corpsePosition) return;
    corpsePosition = { x: npc.actor.group.position.x, z: npc.actor.group.position.z };
    quest.killed(); fighting = false; if (ready) changed();
  }
  function rememberEnemy(one = combat.state.enemies.find(e => e.id === npc.id)) {
    if (!one) return;
    npc.actor.group.position.set(one.x, world.heightAt(one.x, one.z), one.z);
    // Crime's change callback can save immediately. Finish the quest's terminal
    // half first, while suppressing its own callback, so that callback sees the
    // same death in both persistent stores rather than a hostile living quest.
    const terminal = one.hp <= 0 && !corpsePosition, wasReady = ready;
    if (terminal) { ready = false; killed(npc.id); }
    crime.recordCombatHit({ id: npc.id, hp: one.hp, maxHp: one.maxHp, source: 'world', selfDefense: true,
      permanent: one.hp <= 0, notify: false, x: one.x, z: one.z });
    ready = wasReady; if (terminal && ready) changed();
  }
  function combatEvent(event) {
    if (!fighting) return false;
    const one = combat.state.enemies.find(e => e.id === npc.id) ?? event.enemies?.find(e => e.id === npc.id);
    rememberEnemy(one);
    if (['victory', 'retreat', 'defeat'].includes(event.type)) { fighting = false; if (ready) changed(); }
    return !!one;
  }
  function tick(dt, { playing = true } = {}) {
    if (playing) clock += dt;
    if (fighting) { rememberEnemy(); if (combat.state.phase !== 'active') fighting = false; }
    if (crime.isDown(npc.id)) { npc.actor.group.visible = false; return; }
    flight.tick(dt, { playing });
    if (flight.active) placeFlight();
    else if (!fighting) npc.actor.animate(clock, 0, true, { alert: quest.state().stage === 'hostile' });
    const at = npc.actor.group.position, p = player.group.position;
    npc.actor.group.visible = flight.active || Math.hypot(at.x - p.x, at.z - p.z) < 200;
    if (playing && !fighting && quest.state().stage === 'hostile' && Math.hypot(at.x-p.x, at.z-p.z) < 15) beginFight();
  }
  function nearby() {
    const s = quest.state(), at = corpsePosition ?? npc.actor.group.position, p = player.group.position;
    return s.stage === 'dead' && !s.headTaken && Math.hypot(at.x - p.x, at.z - p.z) < 3
      ? { prompt: 'Take the head for the bounty', x: at.x, z: at.z } : null;
  }
  function takeHead() {
    if (!nearby()) return false;
    speak(['The creature is dead. The officer wanted its head as proof.'], [{ label: 'Take the head.', onSelect() {
      if (quest.takeHead({ grant: id => inventory.add(id, 1) })) { inventory.refresh(); toast('Bring the proof to Officer Verradross.', 'THE BOUNTY'); }
      closeDialogue(); changed();
    } }, { label: 'Leave him in peace.', onSelect: closeDialogue }]); return true;
  }
  function trackableView() {
    const s = quest.state(), active = s.stage !== 'available' && !quest.completed;
    const dead = s.stage === 'dead';
    return { id: BATMAN_QUEST.id, type: 'secondary', active, title: s.bounty === 'accepted' ? 'The Batsmasher’s Bounty' : BATMAN_QUEST.title,
      stage: s.stage, detail: s.stage === 'flying' ? 'Ride with Batman and hear what happened to Suval.' : dead ?
        s.headTaken ? 'Bring the head to Officer Verradross.' : 'The vigilante is dead. The officer requires his head as proof.' :
        'Find the hidden cave by following the winding hollow ridge path into the Suval highlands. Decide whether to listen to the creature.',
      target: s.stage === 'flying' ? { ...BAT_LANDING, id: 'suval-flight-landing', name: 'Northern West Suval' } :
        { ...(dead && s.headTaken ? BATSMASHER_STAND : dead ? corpsePosition ?? BAT_CAVE.perch : BAT_CAVE.approach),
          id: dead && s.headTaken ? BATSMASHER.id : 'suval-bat-cave', name: dead && s.headTaken ? BATSMASHER.name : 'The highland cave' } };
  }
  function restore(saved = {}) {
    const nextQuest = createBatmanQuest(), nextFlight = createBatmanFlight(routes);
    if (!nextQuest.restore(saved.batmanQuest ?? migrateBatmanQuest(saved)) || !nextFlight.restore(saved.batmanFlight)) return false;
    const stage = nextQuest.state().stage, flightStage = nextFlight.state().stage;
    if ((stage === 'flying') !== nextFlight.mounted || (stage === 'complete') !== ['landed', 'returning', 'home'].includes(flightStage)) return false;
    const ground = saved.batmanGround;
    if (ground && (!Number.isFinite(ground.x) || !Number.isFinite(ground.z) || !Number.isFinite(ground.yaw))) return false;
    ready = false; fighting = false; corpsePosition = saved.batmanCorpse ? { ...saved.batmanCorpse } : null;
    quest.restore(nextQuest.snapshot()); flight.restore(nextFlight.snapshot());
    placeHome();
    if (flight.active || flightStage === 'home') placeFlight();
    else if (ground) {
      npc.actor.group.position.set(ground.x, world.heightAt(ground.x, ground.z), ground.z); npc.actor.group.rotation.y = ground.yaw;
      if (world.npcPositions) world.npcPositions[npc.id] = { x: ground.x, z: ground.z };
    }
    if (flight.mounted) narrate(BATMAN_HISTORY[Math.max(0, flight.state().narration - 1)]);
    else narrate(null);
    ready = true; return true;
  }
  function cancelForTesting() {
    if (!flight.mounted) return;
    ready = false; quest.interruptFlight(); flight.restore(); placeHome(); narrate(null);
    dismount({ ...BAT_CAVE.approach }); ready = true; changed();
  }
  placeHome(); ready = true;
  return { quest, flight, routes, tick, combatEvent, beginFlight, attack, assault, killed, converseCatie, converseOfficer, converseBatman,
    trackableView, nearby, takeHead, restore, cancelForTesting,
    snapshot: () => ({ batmanQuest: quest.snapshot(), batmanFlight: flight.snapshot(), batmanCorpse: corpsePosition ? { ...corpsePosition } : null,
      batmanGround: { x: npc.actor.group.position.x, z: npc.actor.group.position.z, yaw: npc.actor.group.rotation.y } }),
    get mounted() { return flight.mounted; }, get fighting() { return fighting; } };
}
