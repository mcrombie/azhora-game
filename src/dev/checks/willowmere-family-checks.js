import { RYAN, BARRETT } from '../../content/quests/homes/willowmere-family.js';
import { BARRETT_GEOGRAPHY_COOLDOWN } from '../../content/quests/skill-lessons/barrett-geography.js';
import { CHART_XP } from '../../ui/map/cartography.js';
import { canStand } from '../../gameplay/movement/game-state.js';

/** Native checks through the real F prompts, dialogue buttons, fishing float
 * and checkpoint path. Only the geography cooldown uses an active-clock seam;
 * Ryan's demonstration, bite and catch run at their ordinary speeds.
 *
 * Hooks are roadSkillsHooks plus barrettGeography, cartography, atlasReady(),
 * dialogueChoices()->[{id,label}], and checkpointCopy() (or saved()). The host
 * must keep prepare/restore in an isolated testing session.
 */
export async function runWillowmereFamilyChecks(h) {
  const checks = [], started = performance.now();
  const normalSave = () => h.saved ? h.saved() : JSON.stringify(h.checkpointCopy());
  const normal = normalSave();
  const check = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const clock = () => h.getState().playSeconds;
  const stage = () => h.fishingLessons.view().stage;
  const speech = () => document.getElementById('speech')?.textContent ?? '';
  const visit = async id => { await h.close(); await h.visit(id); await h.finish(); };
  const until = async (condition, message, seconds = 15, tick = null) => {
    const deadline = Math.min(started + 120000, performance.now() + seconds * 1000);
    while (!condition()) {
      if (performance.now() >= deadline) throw new Error(`${message}; stage=${stage()}; mode=${h.getState().mode}`);
      await tick?.(); await h.frames(2);
      if (h.getState().frameErrors?.count) throw new Error('Renderer failed: ' + h.getState().frameErrors.first?.message);
    }
  };
  const chartHexes = () => Object.values(h.cartography.snapshot().regions).reduce((sum, entry) => sum + entry.hexes, 0);
  const chartNames = () => h.cartography.view().entries.filter(entry => entry.named).map(entry => entry.name);
  const fog = () => JSON.stringify(h.snapshot().chart);
  const onlyGeographyMenu = () => {
    const choices = h.dialogueChoices().map(choice => typeof choice === 'string' ? choice : choice.id);
    check(choices.includes('barrett-geography') && choices.includes('barrett-leave')
      && choices.every(id => ['barrett-geography', 'barrett-leave', 'household-home'].includes(id)),
    'Barrett offers one geography question, goodbye and optional home directions, without a region-selection menu');
  };
  const ask = async () => { await h.choose('barrett-geography'); };
  const returnToQuestions = async () => { await h.finish(); onlyGeographyMenu(); };

  await h.prepare();
  h.fishingLessons.restore(); h.fishing.restore({ version: 1, taught: false, caught: {} });
  h.barrettGeography.restore();
  h.cartography.restore({ version: 1, met: false, regions: {} });
  if (h.inventory.has('fishing-rod')) h.inventory.remove('fishing-rod', h.inventory.count('fishing-rod'));
  await h.frames(3);
  await until(() => h.atlasReady(), 'The full named atlas did not load');
  await visit('harbormaster'); await h.close(); await h.frames(2);
  check(h.getState().questStage >= 2, 'The normal Jojo introduction opens the optional fishing teacher');

  // Inspect their full appearances after approaching Willowmere. At the
  // harbour they may correctly be distant stand-ins with no detailed rig yet.
  await visit(RYAN.id); await h.close(); await h.frames(3);
  for (const definition of [RYAN, BARRETT]) {
    const npc = h.npcById.get(definition.id), group = npc?.actor?.group;
    check(!!group?.visible, `${definition.name} has a visible character at Willowmere`);
    check(!!group.getObjectByName('mercenary-hair-short-cropped') && npc.look?.hat === false,
      `${definition.name} renders short hair without an unrequested hat`);
    check(canStand(group.position.x, group.position.z, h.world, .45)
      && canStand(group.position.x + 1.3, group.position.z + .6, h.world, .45),
    `${definition.name} and the normal F interaction approach stand on clear pondshore ground`);
  }
  const ryan = h.npcById.get(RYAN.id), barrett = h.npcById.get(BARRETT.id);
  check(Math.abs(barrett.actor.group.scale.x - .68) < .001 && barrett.actor.group.scale.x < ryan.actor.group.scale.x,
    'Barrett has the intended smaller child silhouette beside his father');
  check(!!ryan.actor.fishingTip(), 'Ryan is visibly fishing before the lesson begins');
  await visit(RYAN.id); await h.choose('fishing-lesson-begin'); await h.finish();
  check(h.fishingLessons.view().teacher === RYAN.id && ['leading', 'demonstrating'].includes(stage()),
    'Ryan accepts a fishing lesson through his actual F conversation');
  const follow = () => { const p = ryan.actor.group.position; h.warp(p.x + 3.5, p.z + 2); };
  await until(() => stage() === 'demonstrating', 'Ryan did not show the cast at Willowmere', 10, follow);
  await h.frames(2);
  check(!!ryan.actor.fishingTip() && h.fishingView().visible,
    'The lesson uses Ryan\'s visible rod, line and float at the local pond');
  check(h.fishingLessons.view().demonstration < 4, 'The lesson begins with a real timed demonstration');
  await until(() => stage() === 'practice', 'Ryan did not finish demonstrating', 10, follow);
  check(h.skills.taught('fishing') && h.inventory.count('fishing-rod') === 1,
    'Ryan teaches Fishing and gives the traveler exactly one practice rod');
  const spot = h.world.fishingSpots.find(item => item.id === h.fishingLessons.view().spot);
  check(spot?.id === 'willowmere', 'Ryan uses Willowmere rather than another teacher\'s pond');
  const fishBefore = h.inventory.count('raw-fish');
  h.warp(spot.fishingSpot.x, spot.fishingSpot.z); await h.frames(4); h.tap('KeyF'); await h.frames(2);
  check(h.getState().mode === 'fishing', 'F at the open bank casts instead of selecting a nearby character');
  await until(() => h.campcraft.state.phase === 'bite', 'The practice float never received a bite', 8);
  h.tap('KeyF'); await h.frames(3);
  check(h.inventory.count('raw-fish') === fishBefore + 1 && h.fishingLessons.view().completed.includes(RYAN.id),
    'The ordinary F catch completes Ryan\'s fishing lesson and gives one real fish');
  await until(() => stage() === 'idle', 'Ryan did not finish his local outing', 10);
  check(h.inventory.count('fishing-rod') === 1 && !!ryan.actor.fishingTip(),
    'Ryan returns to fishing without duplicating the player\'s rod');

  // Preserve the chart tutorial: merely meeting the child is not a map grant.
  h.cartography.restore({ version: 1, met: false, regions: {} });
  await visit(BARRETT.id); onlyGeographyMenu();
  check(h.barrettGeography.snapshot().lastAt === null, 'Simply talking to Barrett does not consume a geography turn');
  const unchartedXp = h.skills.xp('cartography'), unchartedFog = fog();
  await ask();
  check(/bring your chart/i.test(speech()) && !h.cartography.met && chartNames().length === 0,
    'Before the chart lesson, Barrett asks for a chart and reveals no region');
  check(h.barrettGeography.snapshot().lastAt === null && h.skills.xp('cartography') === unchartedXp && fog() === unchartedFog,
    'The missing-chart response gives no XP, fog reveal or cooldown');
  await returnToQuestions();
  h.cartography.learn();
  const initialNames = new Set(chartNames()), initialHexes = chartHexes(), initialFog = fog(), initialXp = h.skills.xp('cartography');
  await ask();
  const first = h.barrettGeography.snapshot();
  check(!!first.lastRegion && first.told.length === 1 && !initialNames.has(first.lastRegion)
    && h.cartography.named(first.lastRegion) && chartNames().length === initialNames.size + 1,
  'The geography question chooses one previously unknown name from the loaded atlas');
  check(h.cartography.state(first.lastRegion) === 'heard' && chartHexes() === initialHexes && fog() === initialFog,
    'Barrett adds the region label without uncovering its hexes or silhouette');
  check(h.skills.xp('cartography') === initialXp + CHART_XP.heard,
    'Naming a new region uses the normal Cartography experience reward once');
  await returnToQuestions(); await ask();
  check(/quiet/i.test(speech()) && JSON.stringify(h.barrettGeography.snapshot()) === JSON.stringify(first)
    && h.skills.xp('cartography') === initialXp + CHART_XP.heard,
  'An immediate repeat produces a quiet response without extending the cooldown or rewarding again');
  await returnToQuestions(); await h.close();

  const saved = h.snapshot();
  check(saved.barrettGeography.lastAt === first.lastAt && saved.barrettGeography.lastRegion === first.lastRegion,
    'The actual road checkpoint includes Barrett\'s chosen region and active-play cooldown');
  await h.restore(saved); await h.frames(3);
  check(h.cartography.named(first.lastRegion) && JSON.stringify(h.barrettGeography.snapshot()) === JSON.stringify(first),
    'Reloading restores the learned label and the same cooldown without another reward');
  await visit(BARRETT.id); await ask();
  check(/quiet/i.test(speech()) && h.barrettGeography.snapshot().lastAt === first.lastAt,
    'Reloading and immediately asking again cannot bypass the waiting period');
  await returnToQuestions();
  const beforePause = clock(), remainingBeforePause = h.barrettGeography.remaining(clock());
  await h.close(); h.tap('F8'); await h.frames(12);
  check(h.getState().mode === 'testing' && clock() - beforePause < .15
    && Math.abs(h.barrettGeography.remaining(clock()) - remainingBeforePause) < .15,
  'Time in the testing menu does not advance Barrett\'s active-play cooldown');
  await h.close(); await visit(BARRETT.id);
  h.advancePlay(Math.max(0, h.barrettGeography.remaining(clock()) - .5));
  await ask();
  check(/quiet/i.test(speech()) && h.barrettGeography.snapshot().lastRegion === first.lastRegion,
    'Another region stays unavailable until the full two minutes have elapsed');
  await returnToQuestions();
  h.advancePlay(h.barrettGeography.remaining(clock()) + .05);
  await ask(); const second = h.barrettGeography.snapshot();
  check(second.lastAt - first.lastAt >= BARRETT_GEOGRAPHY_COOLDOWN && second.lastRegion !== first.lastRegion
    && !initialNames.has(second.lastRegion) && second.told.length === 2 && h.cartography.named(second.lastRegion),
  'After 120 active-play seconds Barrett names a different unknown region');
  check(h.skills.xp('cartography') === initialXp + CHART_XP.heard * 2,
    'Exactly two new names award exactly two ordinary heard-region rewards');
  check(normalSave() === normal, 'The family interaction test preserves the normal saved adventure');
  check(!h.getState().frameErrors?.count, 'The live fishing and geography checks finish without renderer errors');
  await h.close();
  return { ok: true, willowmereFamilyChecks: checks.length, checks, regions: [first.lastRegion, second.lastRegion],
    elapsedMs: Math.round(performance.now() - started) };
}
