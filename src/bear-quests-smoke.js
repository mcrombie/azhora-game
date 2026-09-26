import { CUB, CUB_HONEY_ITEM } from './cub-honey-quest.js';
import { HONEY_APPROACH, HONEY_WAIT } from './cub-honey-host.js';

const copy = value => JSON.parse(JSON.stringify(value));
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const accepted = value => value === true || value?.ok === true;

/** Native integration through real F8 cards, rendered input pilots, dialogue and theft.
 * h.setup(kind) clicks the real testing card; read normalizes live objects into the
 * documented fields below. No success-path progress is written by this driver.
 * read(): {mode,player:{x,z,hp},race,cub,family:{phase,roaming,kayla?,cub?},
 * bees:{active,swarmCount,elapsed},pilot:{active,intent,reason},stealthTaught,
 * honeyCount,cubItemCount,frameErrors,frames,checkpointAvailable}.
 * Other hooks: prepare,frames,stopPilot,resumePilot,snapshot,validate,restore,
 * checkpointCopy,warp,setSneaking,interact,speakCub,nextSpeech,closeDialogue,pause,
 * recover(), optional setHealth(hp), stepFamily(seconds), optional capture(name).
 * stepFamily runs ordinary movement
 * ticks without teleporting; it is used only after both live pilots have finished.
 */
export async function runBearQuestChecks(h) {
  const checks = [], samples = [], runs = {};
  const fail = message => { throw new Error(`Bear quests: ${message}; ${JSON.stringify(h.read())}`); };
  const check = (value, label) => { if (!value) fail(label); checks.push(label); };
  const frames = n => h.frames(n ?? 1);
  async function until(predicate, message, seconds = 30) {
    const end = performance.now() + seconds * 1000;
    while (!predicate()) { if (performance.now() > end) fail(message); await frames(2); }
  }
  async function choose(id) {
    for (let i = 0; i < 12 && !document.querySelector(`[data-choice="${id}"]`); i++) { h.nextSpeech(); await frames(1); }
    const button = document.querySelector(`[data-choice="${id}"]`);
    check(button && !button.disabled, `The visible ${id} reply is available`);
    button.click(); await frames(2);
  }
  await h.prepare(); await frames(2);
  const storageBefore = JSON.stringify(h.checkpointCopy());

  async function run(kind) {
    await h.setup(kind); await frames(3);
    let state = h.read(), previous = state.player, previousFrames = state.frames, previousStage = state[kind].stage;
    const stages = new Set([previousStage]); let distance = 0, maxStep = 0, restored = false;
    const initialHoney = state.honeyCount, started = performance.now(); let lastReport = started;
    check(state.pilot.active, `The ${kind} testing card starts its computer pilot`);
    while (state.pilot.active) {
      if (performance.now() - started > 900000) fail(`${kind} pilot exceeded fifteen minutes`);
      await frames(3); state = h.read();
      const stage = state[kind].stage, moved = gap(previous, state.player);
      const frameCount = Number.isFinite(state.frames) && Number.isFinite(previousFrames) ? Math.max(1, state.frames - previousFrames) : 3;
      if (stage === previousStage && state.mode === 'playing') {
        maxStep = Math.max(maxStep, moved); distance += moved;
        checkFrame(moved <= frameCount * .9 + .5, `${kind} teleported during ${stage}`);
      }
      previous = { ...state.player }; previousFrames = state.frames; previousStage = stage; stages.add(stage);
      if (state.mode === 'defeated' || state.player.hp <= 0) fail(`${kind} pilot lost the traveler`);
      if (state.frameErrors) fail(`${kind} produced a renderer error`);
      if (kind === 'cub' && state.cub.alerted) fail('The success demonstration was caught by Liz');
      if (kind === 'race' && stage === 'racing' && state.race.elapsed >= 4 && !restored && state.mode === 'playing') {
        check(document.getElementById('bear-race-status')?.getClientRects().length > 0, 'The mounted race displays its countdown and steering HUD');
        await h.capture?.('mounted-race');
        h.stopPilot(); h.pause(true); await frames(2);
        const pausedRace = copy(h.read().race);
        await frames(25);
        const stillRace = h.read().race;
        check(stillRace.elapsed === pausedRace.elapsed && gap(stillRace.kayla, pausedRace.kayla) < .001
          && gap(stillRace.ed, pausedRace.ed) < .001,
          'Pausing mid-race freezes the clock and both racers');
        const saved = copy(h.snapshot());
        check(accepted(h.validate(saved)), 'A checkpoint validates while riding Kayla mid-race');
        await h.restore(saved); await frames(2);
        const loaded = h.read();
        check(loaded.race.stage === 'racing' && loaded.race.mounted
          && loaded.race.kayla.next >= pausedRace.kayla.next && loaded.race.kayla.next <= pausedRace.kayla.next + 1
          && loaded.race.ed.next >= pausedRace.ed.next && loaded.race.ed.next <= pausedRace.ed.next + 1
          && loaded.race.elapsed >= pausedRace.elapsed && loaded.race.elapsed < pausedRace.elapsed + .35
          && gap(loaded.race.kayla, pausedRace.kayla) < 2 && gap(loaded.race.ed, pausedRace.ed) < 2,
          'Reload preserves the mounted race, both runners and their route progress');
        check(loaded.honeyCount === initialHoney, 'Loading a race cannot grant the honey reward early');
        h.resumePilot('race'); check(h.read().pilot.active, 'The race pilot resumes normally after loading');
        restored = true; state = h.read(); previous = { ...state.player }; previousFrames = state.frames;
      }
      if (kind === 'cub' && stage === 'carrying' && !restored && state.mode === 'playing') {
        // A real comb and its provenance survive a checkpoint; resuming still walks home.
        h.stopPilot(); const saved = copy(h.snapshot()), at = { ...state.player };
        check(accepted(h.validate(saved)), 'A checkpoint validates while carrying the stolen comb');
        await h.restore(saved); await frames(2);
        const loaded = h.read();
        check(loaded.cub.stage === 'carrying' && loaded.cubItemCount === 1 && gap(at, loaded.player) < .25,
          'Reload preserves the real comb and player position');
        h.resumePilot('cub'); check(h.read().pilot.active, 'The cub pilot resumes normally after loading');
        restored = true; state = h.read(); previous = { ...state.player }; previousFrames = state.frames;
      }
      if (performance.now() - lastReport > 10000) {
        lastReport = performance.now();
        const sample = { kind, seconds: Math.round((lastReport - started) / 1000), stage, intent: state.pilot.intent,
          player: state.player, family: state.family.phase };
        samples.push(sample); console.log('BEAR_QUEST_PROGRESS ' + JSON.stringify(sample));
      }
    }
    check(state[kind].stage === 'complete', `The ${kind} pilot completes the actual quest`);
    check(distance > (kind === 'race' ? 250 : 180), `The ${kind} pilot traverses the authored route`);
    if (kind === 'race') {
      check(stages.has('countdown') && stages.has('racing') && stages.has('won'), 'The race plays the countdown, race and win stages');
      check(restored, 'The race success run includes a mounted pause, save and resume');
      check(state.honeyCount === initialHoney + 3, 'Winning the race rewards exactly three honeycombs');
      check(!state.family.roaming, 'Winning only the race does not release the family to roam');
      check(['returning', 'waiting-cub'].includes(state.family.phase), 'Kayla begins her physical journey back to her cub');
    } else {
      check(stages.has('learning') && stages.has('carrying') && state.stealthTaught, 'The cub teaches Stealth and the pilot earns an unseen comb');
      check(state.cub.catches === 0 && state.cubItemCount === 0, 'The stolen comb is handed over without triggering Liz');
      check(restored, 'The cub success run includes a real mid-quest save and resume');
    }
    check(JSON.stringify(h.checkpointCopy()) === storageBefore, `${kind} testing preserves the saved adventure`);
    runs[kind] = { seconds: (performance.now() - started) / 1000, distance, maxStep, stages: [...stages] };
    await h.capture?.(`bear-${kind}-complete`);
  }
  // Frame checks intentionally do not fill the result with thousands of repeated labels.
  function checkFrame(value, label) { if (!value) fail(label); }
  await run('race'); await run('cub');
  check(h.read().race.stage === 'complete' && h.read().cub.stage === 'complete', 'Both independent quests remain complete');
  if (!h.read().family.roaming) {
    check(h.read().family.phase === 'returning', 'Kayla still has to finish walking to the cub');
    for (let i = 0; i < 80 && !h.read().family.roaming; i++) { await h.stepFamily(5); await frames(1); }
  }
  check(h.read().family.roaming, 'After both quests and the reunion, Kayla and her cub begin roaming together');
  const familySave = copy(h.snapshot());
  check(accepted(h.validate(familySave)), 'A roaming-family checkpoint validates');
  await h.restore(familySave); await frames(2);
  check(h.read().family.roaming, 'Loading preserves the completed quests and family roaming');

  // Deliberately bad ordinary F interaction exercises retaliation; it does not edit progress.
  await h.setup('cub'); h.stopPilot(); await frames(2);
  h.speakCub(); await frames(2); await choose('cub-honey-yes'); h.closeDialogue();
  h.warp(HONEY_APPROACH); h.setSneaking(false); await frames(3); h.interact();
  await until(() => h.read().bees.swarmCount === 10, 'Liz did not summon ten visible swarms', 8);
  check(h.read().cub.alerted && h.read().cub.catches === 1 && h.read().cub.stage === 'learning',
    'An open theft alerts Liz once without awarding honey');
  const health = h.read().player.hp;
  await until(() => h.read().player.hp < health, 'Liz swarms did not inflict real player damage', 10);
  check(h.read().bees.active && h.read().bees.swarmCount === 10, 'All ten NPC-owned swarms remain visible while damaging the thief');
  await h.capture?.('liz-ten-swarms');
  h.pause(true); const paused = copy(h.read()); await frames(35);
  check(h.read().player.hp === paused.player.hp && h.read().bees.elapsed === paused.bees.elapsed,
    'Pause freezes bee lifetimes and damage');
  h.pause(false); h.warp({ x: -77, z: -214 });
  await until(() => !h.read().cub.alerted && !h.read().bees.active, 'Escaping did not end Liz local hostility', 25);
  check(h.read().cub.stage === 'learning' && h.read().cubItemCount === 0, 'Escape leaves a retryable lesson with no counterfeit quest comb');
  // Approach normally far enough from the stores to record a safe recovery point, then
  // retry the same open theft. Only health is lowered for this short defeat fixture.
  h.warp(HONEY_WAIT); await frames(3);
  check(h.read().checkpointAvailable, 'The retry records a safe pre-theft recovery checkpoint');
  const beforeDefeat = { ...h.read().player };
  h.setHealth?.(20); h.warp(HONEY_APPROACH); h.setSneaking(false); await frames(3); h.interact();
  await until(() => h.read().mode === 'defeated', 'Liz retaliation did not cause ordinary player defeat', 14);
  const recovery = document.getElementById('defeat-restore');
  check(h.read().player.hp <= 0 && h.read().checkpointAvailable && recovery && !recovery.hidden
    && !recovery.disabled && recovery.getClientRects().length,
    'Bee defeat offers the ordinary return-to-checkpoint button');
  h.recover(); await until(() => h.read().mode === 'playing', 'The recovery button did not restore normal play', 4);
  await frames(3);
  check(h.read().player.hp > 0 && gap(h.read().player, beforeDefeat) < 1
    && h.read().cub.stage === 'learning' && !h.read().cub.alerted && !h.read().bees.active,
    'The recovery button returns before the theft with no hostile swarms or forced fight retry');
  check(JSON.stringify(h.checkpointCopy()) === storageBefore, 'Caught-case testing also preserves the saved adventure');
  check(h.read().frameErrors === 0, 'The rendered race, theft, reunion and retaliation produce no frame errors');
  return { ok: true, checks, runs, samples, state: h.read(), itemId: CUB_HONEY_ITEM, cubId: CUB.id };
}
