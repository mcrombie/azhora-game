import { ARI_STAND, SUNFLOWER_ROWS } from '../../content/quests/ari/ari-garden.js';
import { SUNFLOWER_QUEST_ID, SUNFLOWER_LESSON_XP } from '../../content/quests/skill-lessons/sunflower-lesson.js';
import { CROPS, WATERING_XP, WATERED_GROWTH } from '../../gameplay/skills/farming/farming.js';

/** Public F8 button, ordinary controls and actual rendered crop time. No warps,
 * automatic harvests or growth acceleration occur after the menu starts a run. */
export async function runAriAutoplayChecks(h) {
  const checks = [], stages = new Set(), started = performance.now();
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const frames = async (n = 1) => { for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame); };
  const key = code => { h.press(code); h.release(code); };
  const summary = () => ({ mode: h.mode(), pilot: h.pilot(), quest: h.quest(), beds: h.beds(), position: h.position(), ari: h.person() });
  const check = (ok, message) => { if (!ok) throw new Error(`${message}; ${JSON.stringify(summary())}`); checks.push(message); };
  const until = async (test, message, seconds = 60) => {
    const end = performance.now() + seconds * 1000;
    while (!test()) { checkProgress(message, end); await frames(); }
  };
  function checkProgress(message, deadline) {
    if (performance.now() > deadline || !h.pilot().enabled || h.mode() === 'defeated')
      throw new Error(`Ari autoplay: ${message}; ${JSON.stringify(summary())}`);
  }
  async function startFromMenu() {
    key('F8'); await frames(2);
    check(h.mode() === 'testing', 'F8 opens the testing tools');
    const button = document.getElementById('test-ari-autoplay');
    check(button && !button.disabled && button.getClientRects().length, 'Named quest-givers includes the Ari sunflower autoplay card');
    button.click(); await frames(3);
    check(h.isTesting() && h.pilot().enabled && h.pilot().id === 'ari', 'The card starts a fresh isolated Ari autoplay');
    check(h.quest().stage === 'offered' && h.beds().every(b => b.stage === 'bare'), 'The lesson and both sunflower beds reset for each run');
    check(gap(h.position(), ARI_STAND) < 8, 'The playtest starts beside Ari in Applegarth');
  }

  await h.prepare(); await frames(3);
  const savedBefore = JSON.stringify(h.checkpointCopy());
  check(!!h.checkpointCopy(), 'A normal adventure checkpoint exists before testing');
  await startFromMenu();
  await until(() => h.quest().stage === 'growing' && h.mode() === 'playing', 'The first run did not plant and water its sunflowers');
  await startFromMenu();
  check(JSON.stringify(h.checkpointCopy()) === savedBefore, 'Restarting during growth preserves the normal saved adventure');
  const initialXp = h.xp(), expectedXp = WATERING_XP + CROPS.sunflower.xp + SUNFLOWER_LESSON_XP;
  let last = h.position(), walked = 0, largestStep = 0, saveChecked = false, pauseChecked = false;
  let plantedAt = null, harvestedAt = null, lastReport = performance.now();
  const deadline = performance.now() + 300000;
  while (h.pilot().enabled) {
    if (performance.now() > deadline) throw new Error(`Ari autoplay exceeded five minutes; ${JSON.stringify(summary())}`);
    await frames();
    const q = h.quest(), here = h.position(), step = gap(last, here); stages.add(q.stage);
    walked += step; largestStep = Math.max(largestStep, step); last = here;
    if (q.stage !== 'offered' && !q.complete) checkProgress('The lesson lost autoplay before completion', deadline);
    if (!q.complete && q.stage !== 'offered' && h.tracked() !== SUNFLOWER_QUEST_ID) throw new Error('Ari lost objective focus during her lesson');
    const bed = h.beds().find(b => b.crop === 'sunflower');
    if (bed && plantedAt === null) plantedAt = bed.sownAt;
    if (q.stage === 'report' && harvestedAt === null) harvestedAt = h.clock();
    if (q.stage === 'growing' && !saveChecked) {
      const savedBed = { ...bed }, xp = h.xp();
      check(h.save(), 'The growing sunflower lesson saves into a testing checkpoint');
      check(h.reload(), 'The growing lesson reloads through the actual checkpoint path'); await frames(2);
      const loaded = h.beds().find(b => b.id === savedBed.id);
      check(h.quest().stage === 'growing' && loaded.watered && Math.abs(loaded.sownAt - savedBed.sownAt) < .011,
        'Loading preserves the planted bed, watering and original growth time');
      check(h.xp() === xp, 'Loading never repeats the tending experience');
      h.resume(); check(h.pilot().enabled && h.pilot().id === 'ari', 'P resumes the focused sunflower quest');
      saveChecked = true; last = h.position();
    }
    if (q.stage === 'growing' && saveChecked && !pauseChecked) {
      key('F8'); await frames(2); const pausedClock = h.clock(), left = h.beds().find(b => b.crop === 'sunflower').left;
      await frames(30);
      check(h.mode() === 'testing' && h.clock() === pausedClock && h.beds().find(b => b.crop === 'sunflower').left === left,
        'The testing menu pauses the real crop-growth clock');
      key('Escape'); await frames(2); h.resume();
      check(h.mode() === 'playing' && h.pilot().enabled && h.pilot().id === 'ari', 'Closing the menu and pressing P resumes the same garden lesson');
      pauseChecked = true; last = h.position();
    }
    if (performance.now() - lastReport > 20000) {
      lastReport = performance.now(); console.log('ARI_AUTOPLAY_PROGRESS ' + JSON.stringify(summary()));
    }
  }
  check(h.quest().complete && h.mode() === 'playing', 'Ari autoplay reports the harvest and hands control back after the final conversation');
  check(['plant', 'water', 'growing', 'harvest', 'report', 'complete'].every(s => stages.has(s)), 'Every stage plays through the real planting, tending, growth and reward flow');
  check(h.inventory.count('sunflower') === 3 && h.inventory.count('sunflower-seed') === 2, 'The harvest leaves three flowers and two seed packets in the satchel');
  check(h.xp() === initialXp + expectedXp, 'Watering, harvest and completion pay exactly one lesson of Farming experience');
  check(plantedAt !== null && harvestedAt - plantedAt >= CROPS.sunflower.seconds * WATERED_GROWTH, 'The sunflowers grow for their normal ninety active-play seconds');
  check(saveChecked && pauseChecked, 'The playtest exercised live save, reload, pause and resume');
  check(walked > 4 && largestStep < 2, 'The player walks continuously between Ari and the garden beds');
  check(JSON.stringify(h.checkpointCopy()) === savedBefore, 'The completed playtest preserves the normal saved adventure');
  check(h.frameErrors().count === 0, 'The live garden lesson finishes without renderer errors');
  const completion = { stages: [...stages], walked, largestStep, growthSeconds: harvestedAt - plantedAt, xp: h.xp() - initialXp };
  await startFromMenu();
  await until(() => h.quest().stage === 'plant' && h.mode() === 'playing', 'A completed lesson could not be restarted');
  check(h.tracked() === SUNFLOWER_QUEST_ID, 'Repeating after completion focuses a fresh Ari lesson');
  check(JSON.stringify(h.checkpointCopy()) === savedBefore, 'Repeated playtests continue to protect the normal saved adventure');
  h.stop();
  return { ok: true, ariAutoplayChecks: checks.length, checks, completion, elapsedMs: Math.round(performance.now() - started) };
}
