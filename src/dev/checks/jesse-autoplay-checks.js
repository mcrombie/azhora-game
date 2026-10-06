import { CARRIAGE_PARTS, JESSE_WORKSHOP, JESSE_GUILD } from '../../content/quests/jesse/jesse-carriage-world.js';
import { JESSE_QUEST, CARRIAGE_ASSEMBLY, JESSE_RIDE_LINES } from '../../content/quests/jesse/jesse-carriage-quest.js';
import { PLANKS } from '../../gameplay/skills/woodcutting/construction.js';

/** Uses the public F8 card and real rendered frames. No quest shortcuts, warps,
 * direct movement, or accelerated carriage ticks are used after each start. */
export async function runJesseAutoplayChecks(h) {
  const checks = [], samples = [], stages = new Set();
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const frames = async (n = 1) => { for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame); };
  const key = code => { h.press(code); h.release(code); };
  const summary = () => ({ mode: h.mode(), pilot: h.pilot(), quest: h.quest(), position: h.position(), jesse: h.person(), samples });
  const fail = message => { throw new Error(`Jesse autoplay: ${message}; ${JSON.stringify(summary())}`); };
  const check = (ok, message) => { if (!ok) fail(message); checks.push(message); };
  const until = async (test, message, seconds = 60) => {
    const deadline = performance.now() + seconds * 1000;
    while (!test()) {
      if (performance.now() > deadline) fail(message);
      if (!h.pilot().enabled || h.mode() === 'defeated') fail(`Autoplay stopped: ${message}`);
      await frames();
    }
  };
  async function startFromMenu() {
    key('F8'); await frames(2);
    check(h.mode() === 'testing', 'F8 opens the testing tools');
    const button = document.getElementById('test-jesse-autoplay');
    check(button && !button.disabled && button.getClientRects().length, 'Quest playtests offers the Jesse computer autoplay card');
    button.click(); await frames(3);
    check(h.isTesting() && h.pilot().enabled && h.pilot().id === 'jesse', 'The public card starts an isolated Jesse autoplay');
    const q = h.quest();
    check(q.assembly === 0 && !q.xpGranted && !q.collected.length && !q.spoken.length
      && gap(q.cart, JESSE_WORKSHOP.carriage) < .01, 'The public card resets the workshop, parts, assembly, and carriage');
  }

  await h.prepare(); await frames(3);
  const savedBefore = JSON.stringify(h.checkpointCopy());
  check(!!h.checkpointCopy(), 'A normal adventure checkpoint exists before testing');
  await startFromMenu();
  await until(() => h.quest().stage === 'riding' && gap(h.quest().cart, JESSE_WORKSHOP.carriage) > 8,
    'The first run did not collect, assemble, and board the carriage', 180);
  check(h.quest().collected.length === CARRIAGE_PARTS.length && h.quest().timber === 'pine',
    'The first run collects all four parts and assembles the supplied pine carriage');
  await startFromMenu();
  check(!h.quest().mounted && gap(h.position(), JESSE_WORKSHOP.stand) < 12,
    'Restarting during the passenger ride releases the old carriage and returns to Jesse');
  check(JSON.stringify(h.checkpointCopy()) === savedBefore, 'Restarting during a ride preserves the normal saved adventure');

  const started = performance.now(), initialXp = h.xp(), expectedXp = PLANKS['pine-plank'].xp * 4 + 45;
  let last = h.position(), lastCart = h.quest().cart, previousStage = h.quest().stage;
  let groundTravel = 0, carriageTravel = 0, largestGroundStep = 0, largestCartStep = 0, largestSeatStep = 0;
  let saveChecked = false, pauseChecked = false, assemblyXp = null, lastReport = 0;
  let progressAt = performance.now(), progressStamp = '';
  while (h.pilot().enabled) {
    if (performance.now() - started > 600000) fail('The live carriage quest exceeded its ten-minute limit');
    if (h.mode() === 'defeated') fail('The traveler fell during the carriage lesson');
    await frames();
    const q = h.quest(), position = h.position(), step = gap(last, position), cartStep = gap(lastCart, q.cart);
    const changingSeat = (q.stage === 'riding') !== (previousStage === 'riding');
    if (changingSeat) largestSeatStep = Math.max(largestSeatStep, step);
    else if (q.stage !== 'riding') { groundTravel += step; largestGroundStep = Math.max(largestGroundStep, step); }
    carriageTravel += cartStep; largestCartStep = Math.max(largestCartStep, cartStep);
    last = position; lastCart = q.cart; previousStage = q.stage; stages.add(q.stage);
    if (!q.complete && q.stage !== 'available' && h.tracked() !== JESSE_QUEST.id) fail('Jesse lost quest objective focus');
    const stamp = `${q.stage}:${q.collected.length}:${q.assembly}:${Math.round(position.x)}:${Math.round(position.z)}:${q.jesse.next}`;
    if (stamp !== progressStamp || h.mode() === 'dialogue') { progressStamp = stamp; progressAt = performance.now(); }
    if (performance.now() - progressAt > 50000) fail('The quest stopped progressing for fifty seconds');
    if (q.xpGranted && assemblyXp === null) {
      assemblyXp = h.xp();
      check(assemblyXp === initialXp + expectedXp, 'The three assembly steps award exactly one pine-carriage lesson of Carpentry experience');
    }
    if (assemblyXp !== null && h.xp() !== assemblyXp) fail('Carpentry experience changed after the completed assembly');
    if (q.stage === 'riding' && carriageTravel > 40 && !saveChecked) {
      const saved = h.quest();
      check(h.save(), 'The passenger journey can be saved to a testing checkpoint');
      check(h.reload(), 'The testing checkpoint reloads into the actual game'); await frames(2);
      const loaded = h.quest();
      check(loaded.stage === 'riding' && loaded.mounted && loaded.timber === saved.timber
        && loaded.assembly === saved.assembly && loaded.collected.join() === saved.collected.join()
        && saved.spoken.every(line => loaded.spoken.includes(line)), 'Loading preserves the carriage, assembled parts, and spoken narration');
      check(gap(saved.cart, loaded.cart) < 1 && gap(h.position(), loaded.cart) < 4,
        'Loading restores the traveler to the moving carriage at its saved road position');
      check(h.xp() === assemblyXp, 'Loading does not repeat the assembly experience reward');
      h.resume();
      check(h.pilot().enabled && h.pilot().id === 'jesse', 'P resumes the focused Jesse quest while riding');
      saveChecked = true; last = h.position(); lastCart = h.quest().cart;
    }
    if (saveChecked && q.stage === 'riding' && !pauseChecked) {
      key('F8'); await frames(3); const paused = h.quest(); await frames(20);
      check(h.mode() === 'testing' && gap(paused.cart, h.quest().cart) === 0
        && paused.spoken.join() === h.quest().spoken.join(), 'Opening the testing menu pauses carriage travel and narration');
      key('Escape'); await frames(2); h.resume();
      check(h.mode() === 'playing' && h.pilot().enabled && h.quest().mounted,
        'Closing the menu and pressing P continues the same passenger journey');
      pauseChecked = true; last = h.position(); lastCart = h.quest().cart;
    }
    if (performance.now() - lastReport > 15000) {
      lastReport = performance.now(); samples.push({ seconds: Math.round((lastReport - started) / 1000), stage: q.stage,
        parts: q.collected.length, assembly: q.assembly, position, cart: q.cart, intent: h.pilot().intent });
      if (samples.length > 60) samples.shift();
      console.log('JESSE_AUTOPLAY_PROGRESS ' + JSON.stringify(samples.at(-1)));
    }
  }
  const complete = h.quest();
  check(complete.stage === 'inside' && complete.hidden && !h.person().visible,
    'Jesse autoplay completes the road journey and waits for Jesse to enter the guild');
  check(['collecting', 'assembling', 'ready', 'riding', 'entering', 'inside'].every(stage => stages.has(stage)),
    'The rendered quest plays collection, construction, boarding, travel, and the walk through the guild door');
  check(complete.collected.length === CARRIAGE_PARTS.length && complete.timber === 'pine'
    && complete.assembly === CARRIAGE_ASSEMBLY.length, 'All four parts were gathered and all three assembly steps completed');
  check(['carriage-wheel', 'carriage-axle', 'carriage-pine-bundle'].every(item => h.inventory.count(item) === 0),
    'Assembly consumes the collected wheels, axle, and prepared pine bundle');
  check(complete.spoken.length === JESSE_RIDE_LINES.length, 'Jesse delivers every road-trip narration line');
  check(saveChecked && pauseChecked, 'The real passenger journey exercises save, load, pause, and resume');
  check(groundTravel > 35 && carriageTravel > 400, 'The traveler walks around the workshop and rides the full western road to Ambron');
  check(largestGroundStep < 4 && largestCartStep < 1 && largestSeatStep < 8,
    'Autoplay moves continuously, with only short physical boarding and dismount steps');
  check(gap(complete.cart, JESSE_GUILD.cartParking) < .2 && gap(complete.jesse, JESSE_GUILD.door) < .2,
    'The carriage parks beside the Carpenter\'s Guild and Jesse reaches its actual door');
  check(h.mode() === 'playing' && !complete.mounted && h.xp() === assemblyXp,
    'Finishing returns player control without repeating the lesson reward');
  check(JSON.stringify(h.checkpointCopy()) === savedBefore, 'The complete playtest preserves the normal saved adventure');
  check(h.frameErrors().count === 0, 'The full rendered carriage quest produces no frame errors');
  const completion = { seconds: Math.round((performance.now() - started) / 1000), groundTravel, carriageTravel,
    largestGroundStep, largestCartStep, largestSeatStep, stages: [...stages], xp: assemblyXp - initialXp,
    position: h.position(), jesse: h.person(), samples };

  await startFromMenu();
  await until(() => h.quest().stage === 'collecting' && h.mode() === 'playing', 'The repeated playtest did not accept the lesson', 60);
  const restartAt = h.position();
  await until(() => gap(restartAt, h.position()) > 1.5, 'The repeated playtest did not start walking to the parts', 30);
  check(h.tracked() === JESSE_QUEST.id, 'Repeating the playtest focuses Jesse again');
  check(JSON.stringify(h.checkpointCopy()) === savedBefore, 'Repeating the playtest preserves the normal saved adventure');
  return { ok: true, checks, completion, awaitingNativeTakeover: true,
    restart: { stage: h.quest().stage, position: h.position(), pilot: h.pilot() }, frameErrors: h.frameErrors().count };
}
