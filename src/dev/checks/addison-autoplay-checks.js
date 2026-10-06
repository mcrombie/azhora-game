import { SMUGGLERS_DOOR, SOVIK } from '../../content/quests/rival-light/rival-light.js';

/**
 * Drives the public F8 button and watches real render frames while the Addison pilot plays her errand
 * the quiet way (src/gameplay/autoplay/addison-autopilot.js): through the smugglers' door and back, never seen by the
 * Elodi, Sovik lifted and burning, carried home, and kept in the Suval Light.
 */
export async function runAddisonAutoplayChecks(h) {
  const checks = [], stages = new Set(), samples = [], check = (ok, message) => { if (!ok) fail(message); checks.push(message); };
  const frames = async (n = 1) => { for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame); };
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const state = () => ({ mode: h.mode(), pilot: h.pilot(), heist: h.heist(), position: h.position(), hp: h.hp(),
    sovik: h.sovikShown(), phase: h.combat.state.phase, encounter: h.combat.state.encounterId, samples });
  function fail(message) { throw new Error(`Addison autoplay: ${message}; ${JSON.stringify(state())}`); }
  const until = async (test, message, seconds = 30) => { const end = performance.now() + seconds * 1000;
    while (!test()) { if (performance.now() > end) fail(message); await frames(); } };
  async function startFromMenu() {
    h.press('F8'); h.release('F8'); await frames(2);
    check(h.mode() === 'testing', 'F8 opens the testing tools');
    const button = document.getElementById('test-addison-autoplay');
    check(button && !button.disabled && button.getClientRects().length, 'Testing tools offer Play Addison’s errand');
    button.click(); await frames(3);
    check(h.isTesting() && h.pilot().enabled && h.pilot().id === 'addison', 'The public button starts an isolated Addison autoplay');
  }
  await h.prepare(); await frames(3);
  const savedBefore = JSON.stringify(h.checkpointCopy());
  check(!!h.checkpointCopy(), 'A normal adventure checkpoint exists before testing');
  await startFromMenu();
  check(h.heist().stage === 'unknown', 'The playtest begins the errand from the start');
  const start = performance.now();
  let last = h.position(), lastHp = h.hp(), jumps = [], burn = null, carriedSeen = false, saveChecked = false, lastReport = 0;
  while (h.pilot().enabled) {
    if (performance.now() - start > 1200000) fail('The errand exceeded its twenty-minute limit');
    if (h.mode() === 'defeated') fail('The traveler fell');
    if (h.frameErrors().count) fail(`A frame error stopped the game: ${JSON.stringify(h.frameErrors().first)}`);
    await frames();
    const q = h.heist(), now = h.position(), step = gap(last, now);
    stages.add(q.stage);
    if (h.combat.state.phase === 'active') fail(`The Elodi saw the traveler and a fight started (${h.combat.state.encounterId})`);
    if (step > 4) jumps.push({ from: last, to: now });
    if (q.stage === 'taken' && burn === null) burn = lastHp - h.hp();
    if (q.stage === 'taken') { carriedSeen ||= h.sovikShown() === 'carried'; if (!h.inventory.count(SOVIK.item)) fail('Sovik is not in the satchel while carried'); }
    // Once back on the West Suval side with the fire: save, reload, and carry on.
    if (q.stage === 'taken' && !saveChecked && h.mode() === 'playing' && gap(now, SMUGGLERS_DOOR.west) < 30 && gap(now, SMUGGLERS_DOOR.west) > 4) {
      check(h.save(), 'A checkpoint can be saved while smuggling Sovik');
      check(h.reload(), 'The saved errand resumes in the real game'); await frames(2);
      check(h.heist().stage === 'taken' && h.inventory.count(SOVIK.item) === 1 && h.inventory.count('smugglers-key') === 1, 'Loading keeps Sovik, the key and the errand');
      h.resume(); check(h.pilot().enabled && h.pilot().id === 'addison', 'P resumes the Addison pilot after loading');
      saveChecked = true; await frames(2);
    }
    last = h.position(); lastHp = h.hp();
    if (performance.now() - lastReport > 5000) {
      lastReport = performance.now();
      samples.push({ seconds: Math.round((lastReport - start) / 1000), stage: q.stage, position: now, hp: Math.round(h.hp()), intent: h.pilot().intent });
      if (samples.length > 200) samples.shift();
      if (samples.length % 3 === 1) console.log('ADDISON_AUTOPLAY_PROGRESS ' + JSON.stringify(samples.at(-1)));
    }
  }
  const q = h.heist();
  check(q.stage === 'done' && q.ending === 'keep', 'The pilot brings Sovik home and keeps him in the Suval Light');
  check(['unknown', 'told', 'asked', 'taken', 'home', 'done'].every(stage => stages.has(stage)), 'Every stage of the errand was played');
  check(q.alarm === false && q.way === 'quiet', 'Nobody at the Elod Light was ever roused: the quiet way');
  check(burn >= SOVIK.burn - 1, `Lifting Sovik burns (${burn})`);
  check(carriedSeen, 'Sovik is drawn in the traveler’s arms while carried');
  check(h.sovikShown() === 'addison', 'And afterwards in Addison’s lantern');
  check(h.inventory.count(SOVIK.item) === 0, 'He is not in the satchel any more');
  check(saveChecked, 'A save and load while smuggling him were exercised');
  check(jumps.length === 2 && gap(jumps[0].to, SMUGGLERS_DOOR.east) < 1.5 && gap(jumps[1].to, SMUGGLERS_DOOR.west) < 1.5,
    `The only jumps are the two passages under the ridge (${JSON.stringify(jumps)})`);
  check(h.mode() === 'playing' && h.combat.state.player.hp > 0, 'The finished errand returns ordinary control');
  check(JSON.stringify(h.checkpointCopy()) === savedBefore, 'Autoplay preserves the normal saved adventure');
  const completion = { seconds: Math.round((performance.now() - start) / 1000), burn, jumps: jumps.length, samples };
  await startFromMenu();
  check(h.heist().stage === 'unknown', 'A repeated playtest begins the errand again');
  // Hand back to the desktop's own keys walking, as the other quest playtests do: the second run
  // takes the key and sets off east before the native takeover is tried.
  await until(() => h.heist().stage === 'asked' && h.mode() === 'playing', 'The second run did not take Addison’s key', 90);
  const restart = h.position(); await until(() => gap(restart, h.position()) > 1.5, 'The restarted pilot did not walk', 30);
  check(h.frameErrors().count === 0, 'The whole rendered errand produces no frame errors');
  return { ok: true, checks, completion, awaitingNativeTakeover: true, frameErrors: h.frameErrors().count };
}
