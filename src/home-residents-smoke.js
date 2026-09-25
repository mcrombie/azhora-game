import { QUEST_HOMES } from './quest-homes.js';
import { HOME_FERRY_SECONDS } from './home-residents.js';
import { FERRY_LANDINGS } from './ferry.js';

/** Native integration: real reward choices, actor visibility, checkpoint
 * serialization, and the door prompt/response. Long routes have collision tests. */
export async function runHomeResidentsChecks(h) {
  const checks = [], check = (value, label) => { if (!value) throw new Error(label); checks.push(label); };
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  async function choose(id) {
    for (let i = 0; i < 12 && !document.querySelector(`[data-choice="${id}"]`); i++) h.nextSpeech();
    const button = document.querySelector(`[data-choice="${id}"]`);
    check(button && !button.disabled, `Choice available: ${id}`); button.click(); await h.frames(2);
  }
  await h.prepare();
  for (const [id, choice] of [['ben-sorcerer', 'ben-bounty'], ['bee-keeper', 'murder-lesson'], ['cagney', 'cagney-reward']]) {
    h.rewardReady(id); h.conversation(h.npcById.get(id)); await choose(choice); h.closeDialogue();
    check(h.homes.state(id)?.phase === 'walking', `${id}: reward starts journey home`);
    const before = h.homes.state(id).position;
    h.homes.frame(2, false);
    check(distance(before, h.homes.state(id).position) < 1e-9, `${id}: pause holds position`);
    for (let frame = 0; frame < 30; frame++) h.homes.frame(1 / 30, true);
    check(distance(before, h.homes.state(id).position) > .1, `${id}: same actor walks after reward`);
  }
  let loops = 0;
  while (h.homes.state('bee-keeper').phase !== 'sailing' && loops++ < 1200) h.homes.frame(.05, true);
  check(h.homes.state('bee-keeper').phase === 'sailing', 'Troy boards at the actual Cobble quay');
  check(distance(h.homes.state('bee-keeper').position, FERRY_LANDINGS.peblos.ashore) < .2, 'Troy does not walk across the sea');
  h.homes.frame(HOME_FERRY_SECONDS, false);
  check(h.homes.state('bee-keeper').phase === 'sailing', 'Paused ferry does not arrive');
  h.homes.frame(HOME_FERRY_SECONDS, true);
  check(distance(h.homes.state('bee-keeper').position, FERRY_LANDINGS['port-calos'].ashore) < .2, 'Troy disembarks at Port Calos');

  let steps = 0, restored = false;
  while (Object.keys(QUEST_HOMES).some(id => h.homes.state(id).phase !== 'inside') && steps++ < 24000) {
    h.homes.frame(.05, true);
    if (steps === 2000) {
      check(h.saveAndRestore(), 'A journey can be saved and resumed midway'); restored = true;
    }
    if (steps % 200 === 0) await h.frames(1);
  }
  for (const id of Object.keys(QUEST_HOMES)) check(h.homes.state(id).phase === 'inside',
    `${id}: reaches home through the real world while the player stays elsewhere`);
  check(restored, 'The independent walk was long enough to exercise a mid-journey load');

  // Position completed residents at their own thresholds; this tests the entry
  // and door interaction through the ordinary render loop, not a substitute UI.
  const saved = h.homes.snapshot();
  for (const [id, home] of Object.entries(QUEST_HOMES)) saved.people[id] = {
    phase: 'entering', leg: 'home', position: { ...home.door }, yaw: home.yaw, clock: 0 };
  h.homes.restore(saved); h.homes.frame(1, true); await h.frames(2);
  for (const id of Object.keys(QUEST_HOMES)) check(!h.npcById.get(id).actor.group.visible, `${id}: hidden inside, no exterior twin`);
  const result = h.saveAndRestore();
  check(result, 'Checkpoint retains journeys and indoor residents'); await h.frames(2);
  for (const id of Object.keys(QUEST_HOMES)) check(h.homes.state(id)?.phase === 'inside'
    && !h.npcById.get(id).actor.group.visible, `${id}: stays indoors after load`);
  for (const [id, home] of Object.entries(QUEST_HOMES)) {
    h.warp(home.entry); await h.frames(2);
    // Entry sits 5m off the wall. Move up to the porch where the normal F range applies.
    h.warp(home.porch); await h.frames(2);
    check(h.prompt().includes(`Knock on ${home.name}'s door`), `${home.name}: doorstep offers knock`);
    h.interact(); await choose('home-come-out');
    for (let frame = 0; frame < 50; frame++) h.homes.frame(.05, true);
    await h.frames(2);
    check(h.homes.state(id).phase === 'outside' && h.npcById.get(id).actor.group.visible, `${home.name}: comes out when asked`);
    check(h.prompt().includes(`Speak with ${home.name}`), `${home.name}: ordinary conversation available`);
    h.warp({ x: home.entry.x + 25, z: home.entry.z + 25 });
    for (let frame = 0; frame < 200; frame++) h.homes.frame(.05, true);
    check(h.homes.state(id).phase === 'inside', `${home.name}: returns indoors after visitor leaves`);
  }
  return { ok: true, checks, homes: h.homes.snapshot() };
}
