import { BATMAN_QUEST } from '../../content/quests/batman/batman-quest.js';
import { BAT_CAVE, BAT_LANDING } from '../../content/regions/suval-highlands/suval-highlands.js';
import { hexOwnerAt } from '../../world/terrain/region-world.js';

/** The public F8 playtest, observed through ordinary rendered frames. The test
 * never advances a quest, moves the player or ticks a flight behind the game.
 */
export async function runCatieAutoplayChecks(h) {
  const checks = [], samples = [], stages = new Set();
  const frames = async (n = 1) => { for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame); };
  const capture = async name => { console.log('CATIE_CAPTURE ' + name); await frames(4); };
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const summary = () => ({ mode: h.mode(), pilot: h.pilot(), quest: h.quest(), flight: h.flight(), position: h.position(), samples });
  const fail = text => { throw new Error(`Catie autoplay: ${text}; ${JSON.stringify(summary())}`); };
  const check = (ok, text) => { if (!ok) fail(text); checks.push(text); };
  const key = code => { h.press(code); h.release(code); };
  await h.prepare(); await frames(3);
  const savedBefore = JSON.stringify(h.checkpointCopy());
  check(!!h.checkpointCopy(), 'A normal adventure checkpoint exists before testing');
  key('F8'); await frames(2); check(h.mode() === 'testing', 'F8 opens the testing tools');
  const button = document.getElementById('test-catie-autoplay');
  check(button && !button.disabled && button.getClientRects().length, 'Quest playtests includes the Catie computer autoplay button');
  button.click(); await frames(3);
  check(h.isTesting() && h.pilot().enabled && h.pilot().id === 'catie', 'The public button starts a fresh isolated Catie quest');
  const started = performance.now(); let lastReport = 0, last = h.position(), groundTravel = 0, airTravel = 0, largestGroundStep = 0, largestAirStep = 0;
  let takeoverChecked = false, flightChecked = false, caveSeen = false, previousStage = '';
  while (h.pilot().enabled) {
    if (performance.now() - started > 1200000) fail('The live quest exceeded its twenty-minute limit');
    if (h.mode() === 'defeated' || h.combat.state.phase === 'active') fail('The peaceful search entered a fight');
    await frames();
    const q = h.quest(), flight = h.flight(), p = h.position(), step = gap(last, p); last = p; stages.add(q.stage);
    if (q.stage === 'flying' || previousStage === 'flying') { airTravel += step; largestAirStep = Math.max(largestAirStep, step); }
    else { groundTravel += step; largestGroundStep = Math.max(largestGroundStep, step); }
    previousStage = q.stage;
    if (flight.mounted && flight.visited.length) fail('The full Suval chart was awarded before landing');
    if (q.stage !== 'available' && q.stage !== 'complete' && h.tracked() !== BATMAN_QUEST.id) fail('The selected quest lost focus');
    if (!flight.mounted && q.stage !== 'complete' && hexOwnerAt(p.x, p.z) === 'East Suval') fail('The walking approach crossed the closed East frontier');
    if (!caveSeen && gap(p, BAT_CAVE.perch) < 4) { caveSeen = true; await capture('cave'); }
    if (!takeoverChecked && q.stage === 'searching' && groundTravel > 30 && h.mode() === 'playing') {
      h.stop(); const before = h.position(); await frames(20);
      check(!h.pilot().enabled && gap(before, h.position()) < .05, 'Taking control stops ordinary autoplay movement');
      h.resume(); check(h.pilot().enabled && h.pilot().id === 'catie', 'P resumes Catie from the current road position');
      takeoverChecked = true; last = h.position();
    }
    if (!flightChecked && q.stage === 'flying' && flight.phase === 'survey' && flight.distance > 100) {
      check(h.skills.known('flying'), 'Accepting the carried tour teaches Flying');
      check(flight.routeLength < 3000 && flight.visited.length === 0, 'The tour follows a short scenic route and reserves full chart discovery for landing');
      h.stop(); await frames(2);
      check(!h.pilot().enabled && h.flight().mounted, 'Taking control does not cancel the carried tour');
      h.resume(); check(h.pilot().enabled && h.pilot().id === 'catie', 'P resumes the Catie pilot while riding Batman');
      key('F8'); await frames(3); const paused = h.flight().distance; await frames(20);
      check(h.mode() === 'testing' && h.flight().distance === paused, 'The testing menu pauses the carried flight');
      key('Escape'); await frames(2); if (!h.pilot().enabled) h.resume();
      check(h.mode() === 'playing' && h.pilot().enabled, 'Closing the menu continues the same Catie quest');
      await capture('flight'); flightChecked = true; last = h.position();
    }
    if (performance.now() - lastReport > 15000) {
      lastReport = performance.now(); samples.push({ seconds: Math.round((lastReport - started) / 1000), stage: q.stage, position: p,
        cells: flight.visited.length, progress: flight.progress, intent: h.pilot().intent });
      if (samples.length > 100) samples.shift();
      console.log('CATIE_AUTOPLAY_PROGRESS ' + JSON.stringify(samples.at(-1)));
    }
  }
  check(h.quest().stage === 'complete', 'Catie autoplay completes the peaceful Batman quest');
  check(stages.has('searching') && stages.has('friendly') && stages.has('flying'), 'The search, peaceful conversation and carried flight all ran');
  check(caveSeen && groundTravel > 1000, 'The traveler walks the roads and winding mountain path to the actual cave');
  check(takeoverChecked && flightChecked, 'Road and mid-flight pause and takeover checks ran');
  check(largestGroundStep < 4 && largestAirStep < 9, 'Autoplay travels continuously instead of teleporting between quest steps');
  check(h.flight().visited.length === h.flight().cellCount && h.flight().cellCount === 63, 'Landing after the short tour reveals all 63 Suval hexes');
  check(airTravel < 3000, 'The passenger completes a scenic loop instead of a flight through every hex');
  check(h.skills.xp('flying') >= BATMAN_QUEST.flyingXp, 'The completed tour awards Flying experience');
  check(gap(h.position(), BAT_LANDING) < 5, 'Batman lands the traveler safely in northern West Suval');
  check(h.mode() === 'playing' && !h.flight().mounted, 'The landing conversation ends with normal player control');
  check(JSON.stringify(h.checkpointCopy()) === savedBefore, 'The whole playtest preserves the normal saved adventure');
  check(h.frameErrors().count === 0, 'The full rendered quest produces no frame errors');
  await capture('complete');
  const completion = { seconds: Math.round((performance.now() - started) / 1000), groundTravel, airTravel, largestGroundStep, largestAirStep,
    stages: [...stages], cells: h.flight().visited.length, position: h.position(), samples };
  key('F8'); await frames(2); document.getElementById('test-catie-autoplay').click(); await frames(3);
  check(h.quest().stage === 'available' && h.flight().stage === 'idle' && !h.flight().visited.length,
    'Repeating the playtest resets the completed quest and tour');
  const restartAt = h.position(), deadline = performance.now() + 60000;
  while (!(h.quest().stage === 'searching' && h.mode() === 'playing' && gap(restartAt, h.position()) > 2)) {
    if (performance.now() > deadline || !h.pilot().enabled) fail('The repeated Catie run did not begin walking');
    await frames();
  }
  check(JSON.stringify(h.checkpointCopy()) === savedBefore, 'Repeating the playtest preserves the saved adventure');
  return { ok: true, checks, completion, awaitingNativeTakeover: true,
    restart: { stage: h.quest().stage, position: h.position(), pilot: h.pilot() }, frameErrors: h.frameErrors().count };
}
