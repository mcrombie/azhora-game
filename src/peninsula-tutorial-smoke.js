import { PENINSULA_LESSONS, PENINSULA_SKIP_MINUTES, PENINSULA_TUTORIAL_ANCHORS as A } from './peninsula-tutorial.js';
import { LOCOMOTION } from './locomotion-skills.js';

const copy = value => JSON.parse(JSON.stringify(value));
const position = state => Array.isArray(state.position)
  ? { x: state.position[0], z: state.position[2] } : state.position;
const distance = (a, b) => a && b ? Math.hypot(a.x - b.x, a.z - b.z) : 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Native renderer exercise. The playtest hook is the same F8 button handler;
 * frames lets the actual game loop run. No lesson flags, inventory, movement
 * speed or clocks are modified by this driver. begin('skip') prepares a fresh
 * opening and selects Start game. restore uses the ordinary checkpoint loader.
 */
export async function runPeninsulaTutorialChecks({ state, frames, playtest, begin, host,
  snapshot, restore, startRoad, stopRoad, pilot = () => ({}), clearAnnouncement = () => {}, warp, hold, flight, pause,
  openingOnly = false, deadlineMs = 8 * 60 * 1000 }) {
  const checks = [], milestones = [], started = performance.now();
  let completed = null, chrisRelease = null, travelled = 0, maxMetresPerFrame = 0;
  const read = () => host.view?.() ?? host.model.view();
  const report = () => ({ tutorial: read(), game: state(), pilot: pilot(), milestones });
  const assert = (ok, text) => { if (!ok) throw new Error(`Peninsula: ${text}\n${JSON.stringify(report())}`); };
  const check = (ok, text) => { assert(ok, text); checks.push(text); };
  const note = (stage, extra = {}) => {
    const item = { stage, seconds: Math.round((performance.now() - started) / 100) / 10, ...extra };
    milestones.push(item); console.log(`PENINSULA_PROGRESS ${JSON.stringify(item)}`);
  };
  const capture = async name => { clearAnnouncement(); await frames(2); console.log(`PENINSULA_CAPTURE ${name}`); await frames(3); };
  const count = (save, id) => save.inventory?.find(item => item.id === id)?.quantity ?? 0;
  const allPracticed = v => PENINSULA_LESSONS.every(l => v.lessons[l.id].introduced && v.lessons[l.id].practiced);
  if (!openingOnly) {
  // Exercise the same NPC host/collision path at an accelerated simulation rate
  // before the real-time run, so blocked demonstration routes fail promptly.
  await begin('tutorial'); await frames(2);
  let chrisSeconds = 0, chrisTask = -1;
  while (read().chris.name !== 'waiting-in-tidehaven' && chrisSeconds < 600) {
    for (let i = 0; i < 120; i++) { host.frame(.05); chrisSeconds += .05; }
    await frames(1);
    const c = read().chris;
    if (c.task !== chrisTask) { note('Chris route preflight', { simulatedSeconds: Math.round(chrisSeconds), chris: c }); chrisTask = c.task; }
  }
  check(read().chris.name === 'waiting-in-tidehaven' && distance(read().chris.at, A.tidehavenWait) < 1,
    'Chris can physically complete his example lessons and walk to Tidewater Haven');
  check(read().active && read().chris.departedAt === null,
    'Chris waits in Tidewater Haven until the player finishes the tutorial');
  await playtest(); await frames(2);
  check(read().active && read().path === 'tutorial', 'The first main-quest playtest starts the real peninsula tutorial');
  check(state().autoplay, 'The F8 quest button starts computer autoplay');
  let previous = state(), lastStamp = '', lastNote = performance.now();
  const observed = new Set();
  while (!read().completed || state().autoplay) {
    await frames(6);
    const s = state(), v = read(), stamp = `${v.next?.id ?? 'graduate'}:${v.next?.introduced}:${s.mode}`;
    assert(!s.frameErrors?.count, 'The renderer threw while the tutorial played');
    assert(s.mode !== 'defeated' && s.hp > 0, 'Autoplay was defeated during an introductory lesson');
    assert(!v.boundary.encounter && !v.boundary.recoveries, 'The ordinary tutorial route escaped its sheltered boundary');
    assert(!v.enlisted, 'The tutorial pilot enlisted instead of stopping at Glun\'s letter');
    if (!v.completed) {
      assert(s.autoplay, `Autoplay stopped before graduation: ${pilot().reason ?? pilot().intent ?? s.mode}`);
      assert(v.chris.departedAt === null, 'Chris left Tidewater Haven before the player graduated');
    }
    const rendered = Math.max(1, (s.frames ?? 0) - (previous.frames ?? -6));
    const moved = distance(position(s), position(previous));
    if (previous.mode === 'playing' && s.mode === 'playing') {
      const dodging = s.playerAction === 'dodge' || previous.playerAction === 'dodge';
      assert(moved <= rendered * LOCOMOTION.runCap * .05 + .3 + (dodging ? 3.1 : 0), 'The pilot jumped across a lesson instead of walking');
      travelled += moved; maxMetresPerFrame = Math.max(maxMetresPerFrame, moved / rendered);
    }
    for (const lesson of PENINSULA_LESSONS) if (v.lessons[lesson.id].practiced && !observed.has(lesson.id)) {
      observed.add(lesson.id); note(`completed ${lesson.id}`, { position: s.position, practice: v.practice });
      if (['combat', 'swimming', 'cooking'].includes(lesson.id)) await capture(lesson.id);
    }
    if (stamp !== lastStamp || performance.now() - lastNote > 10000) {
      note(v.next?.id ?? 'graduation', { mode: s.mode, position: s.position, intent: pilot().intent ?? '', practice: v.practice, chris: v.chris });
      lastStamp = stamp; lastNote = performance.now();
    }
    assert(performance.now() - started < deadlineMs, 'The real-time tutorial exceeded its eight-minute deadline');
    previous = s;
  }
  completed = read(); const finished = snapshot();
  note('graduated', { signedOffAt: completed.signedOffAt, chris: completed.chris });
  check(allPracticed(completed) && observed.size === PENINSULA_LESSONS.length, 'All eight lessons were introduced and actually practiced');
  check(completed.practice.walked >= 4 && completed.practice.ran >= 6 && completed.practice.recovered >= 2,
    'The traveler walked, ran and recovered stamina');
  check(completed.practice.strikes >= 2 && completed.practice.guarded >= 1.5 && completed.practice.dodges >= 1,
    'Glun\'s drill used strikes, a sustained guard and a dodge');
  check(completed.practice.swam >= 4 && completed.practice.buoy && completed.practice.catches >= 1,
    'The traveler swam to the buoy, returned and reeled in a real fish');
  check(count(finished, 'tutorial-letter') === 1 && count(finished, 'cooked-fish') >= 1 && count(finished, 'raw-fish') === 0,
    'The catch was cooked and Glun awarded exactly one letter');
  check(!completed.enlisted && !state().autoplay, 'Autoplay stops after graduation, before enlisting');
  check(state().arrivalClock >= 0 && state().arrivalClock < 3, 'Ed\'s arrival clock begins at the letter handoff');
  const objective = host.objective();
  check(objective?.title === 'Report to Tidewater Haven', 'The journal now directs the traveler to enlist in Tidewater Haven');
  await capture('graduation');
  if (restore) {
    const facts = { lessons: completed.lessons, grants: completed.grants, signedOffAt: completed.signedOffAt, enlisted: completed.enlisted };
    assert(await restore(copy(finished)), 'The graduated adventure could not be restored'); await frames(3);
    const after = read();
    check(same(facts, { lessons: after.lessons, grants: after.grants, signedOffAt: after.signedOffAt, enlisted: after.enlisted }),
      'Continue restores lesson completion, the letter timestamp and enlistment state');
    check(count(snapshot(), 'tutorial-letter') === 1 && count(snapshot(), 'cooked-fish') === count(finished, 'cooked-fish'),
      'Continue does not duplicate the letter or cooked fish');
  }
  const chrisStarted = performance.now(); let lastChrisNote = 0;
  while (read().chris.departedAt === null) {
    await frames(6);
    assert(!state().frameErrors?.count, 'The renderer threw while Chris finished his independent routine');
    // Rendering can share a GPU with the user's desktop game; simulation dt is
    // capped, so a wall-clock budget must allow an otherwise advancing route.
    assert(performance.now() - chrisStarted < 12 * 60 * 1000, 'Chris did not physically finish his lessons and reach Tidewater Haven');
    if (performance.now() - lastChrisNote > 10000) { note('Chris returning', { chris: read().chris }); lastChrisNote = performance.now(); }
  }
  chrisRelease = copy(read().chris);
  check(chrisRelease.trained && distance(chrisRelease.at, A.tidehavenWait) < 1,
    'Chris physically finishes his lessons and walks the land route to Tidewater Haven');
  check(chrisRelease.departedAt >= completed.signedOffAt,
    'Chris leaves Tidewater Haven only after the player receives Glun\'s letter');
  note('Chris released', { chris: chrisRelease });
  }
  await begin('skip'); await frames(2);
  const skipped = read(), skippedSave = snapshot(), skipState = state();
  check(skipped.path === 'skip' && skipped.completed && !skipped.active && allPracticed(skipped),
    'Start game skips every peninsula lesson and opens the exit');
  check(skipped.signedOffAt - skipped.startedAt === PENINSULA_SKIP_MINUTES,
    'Skipping advances the game calendar by fifteen minutes before Ed arrives');
  check(!skipped.enlisted && count(skippedSave, 'tutorial-letter') === 1 && count(skippedSave, 'cooked-fish') === 1,
    'Skipping grants beginner supplies and the letter without enlisting or duplicate rewards');
  check(skipState.arrivalClock >= 0 && skipState.arrivalClock < 2,
    'The skipped fifteen minutes do not fast-forward Ed\'s newly triggered arrival');
  check(!skipState.frameErrors?.count, 'The tutorial, Continue and skipped opening rendered without frame errors');
  await capture('skip');
  const escapes = [];
  if (warp && hold && flight) for (const kind of ['sea', 'air']) {
    await begin('tutorial'); await frames(2);
    const lessonsBefore = copy(read().lessons), recoveries = read().boundary.recoveries;
    if (kind === 'sea') warp({ x: 125, z: 28, yaw: Math.PI / 2 });
    else { warp({ ...A.arrival, yaw: 0 }); await flight(); }
    await frames(3);
    const key = kind === 'sea' ? 'KeyW' : 'Space', escapeStart = performance.now();
    hold(key, true);
    try {
      while (!read().boundary.encounter) {
        await frames(3);
        assert(!state().frameErrors?.count, `The renderer threw during ${kind} escape`);
        assert(performance.now() - escapeStart < 60000, `Ordinary ${kind} movement never crossed the tutorial boundary`);
      }
    } finally { hold(key, false); }
    check(read().boundary.encounter?.kind === kind, `${kind === 'sea' ? 'Swimming' : 'Flying'} beyond the boundary triggers the correct creature`);
    check(state().hp > 0 && read().boundary.encounter.elapsed < 3.15, `The ${kind} creature appears before dealing lethal damage`);
    while (read().boundary.encounter?.elapsed < 1.5) await frames(2);
    await capture(`${kind}-reveal`);
    if (pause) {
      pause(true); const frozen = read().boundary.encounter.elapsed;
      await frames(18);
      check(read().boundary.encounter?.elapsed === frozen, `Pausing freezes the ${kind} creature's attack sequence`);
      pause(false);
    }
    if (restore) {
      const midEncounter = snapshot(), encounterAt = copy(read().boundary.encounter.at);
      assert(await restore(copy(midEncounter)), `The interrupted ${kind} encounter could not be restored`);
      await frames(2);
      check(read().boundary.encounter?.kind === kind && same(read().lessons, lessonsBefore),
        `Continue resumes the interrupted ${kind} creature reveal without completing lessons`);
      check(distance(position(state()), encounterAt) < .4 && Math.abs(state().position[1] - encounterAt.y) < .4,
        `Continue preserves the ${kind} encounter's position and altitude`);
    }
    let sawDefeat = false;
    while (read().boundary.recoveries === recoveries) {
      await frames(2);
      if (state().hp <= 0 && !sawDefeat) { sawDefeat = true; await capture(`${kind}-defeat`); }
      assert(performance.now() - escapeStart < 80000, `The ${kind} creature did not return the traveler to training`);
    }
    const after = read();
    check(sawDefeat, `The ${kind} creature visibly defeats the escaping traveler`);
    check(after.active && !after.completed && same(after.lessons, lessonsBefore), `The ${kind} defeat preserves the unfinished tutorial`);
    check(distance(position(state()), A.arrival) < 3 && state().hp > 0 && !state().developerBat?.active,
      `The ${kind} defeat returns the traveler alive and on foot to the peninsula pier`);
    check(!state().frameErrors?.count, `The ${kind} creature sequence rendered without errors`);
    escapes.push({ kind, sawDefeat, recoveries: after.boundary.recoveries }); note(`${kind} escape checked`);
    await capture(`${kind}-return`);
  }
  // Enlisting starts the main journey. Run this last so boundary checkpoint tests
  // above remain fresh tutorial scenarios without an already-started campaign.
  if (startRoad && stopRoad) {
    await begin('skip'); await frames(3);
    check(startRoad(), 'Main-road autoplay resumes after the skipped tutorial');
    const enlistStarted=performance.now(); let lastEnlistNote=0;
    try {
      while (!read().enlisted) {
        await frames(6);
        assert(!state().frameErrors?.count, 'The graduation-to-enlistment journey renders without errors');
        if(performance.now()-lastEnlistNote>10000) { note('taking letter to Ottar',{position:state().position,intent:pilot().intent}); lastEnlistNote=performance.now(); }
        assert(state().autoplay, `Road autoplay stopped before enlistment: ${pilot().reason}`);
        assert(performance.now()-enlistStarted<180000, 'Road autoplay did not deliver the letter to Footman Ottar');
      }
    } finally { stopRoad(); }
    const enlisted=snapshot();
    check(count(enlisted,'harbor-letter')===1 && count(enlisted,'road-token')===1,
      'Enlistment grants the army letter and road token through the actual conversation');
    check(host.objective()===null, 'Enlistment releases the tutorial objective to the main road');
    note('enlisted through road autoplay'); await capture('enlisted');
  }

  return { ok: true, checks, milestones, seconds: Math.round((performance.now() - started) / 100) / 10,
    travelled: Math.round(travelled * 10) / 10, maxMetresPerFrame, completed, chrisRelease, skipped, escapes, openingOnly, state: state() };
}
