/**
 * Rendered autoplay check: the computer plays the road from the boat to Iven's
 * relay using only ordinary inputs, while the harness watches for teleports,
 * confirms synthetic (untrusted) key presses cannot steal control, and takes
 * control back once by hand to prove the hand-over works.
 */
export async function runAutoplaySmoke(h) {
  const { autopilot, start, stop, readState, frames, press, release, player, world, deadlineMs = 9 * 60 * 1000 } = h;
  const assert = (condition, message) => { if (!condition) throw new Error(`Autoplay smoke: ${message}`); };
  const position = () => ({ x: player.group.position.x, z: player.group.position.z });
  const started = performance.now();
  const milestones = [];
  let checks = 0, lastStage = -1, lastRegion = null, lastJourneyStage = '', fights = 0, retries = 0, lines = 0, walked = 0;
  let lastChapterStage = '', wolfFight = false;
  let previous = position(), previousMode = null, maxJump = 0, tookOver = false, restarted = false;
  let previousFrames = readState().frames, previousAction = null;

  const note = (label, extra = {}) => milestones.push({ label, seconds: Math.round((performance.now() - started) / 100) / 10, ...extra });
  autopilot.configure({ dialoguePace: .35, choicePace: .3 });
  autopilot.onEvent(event => note(`autopilot ${event.type}`, event.reason ? { reason: event.reason } : {}));

  assert(readState().mode === 'opening', 'the check must begin on the opening screen');
  assert(start(), 'autoplay did not start from the opening screen');
  checks++;

  while (true) {
    await frames(6);
    const state = readState(), now = position();
    const stepDistance = Math.hypot(now.x - previous.x, now.z - previous.z);
    // Each rendered frame simulates at most 50 ms, so running at 7.2 m/s covers
    // at most .36 m per frame. Count the frames the game actually rendered: the
    // frame waiter can miss one under load, and a missed frame is not a teleport.
    const renderedFrames = Number.isFinite(state.frames) && Number.isFinite(previousFrames)
      ? Math.max(1, state.frames - previousFrames) : 6;
    previousFrames = state.frames;
    // A dodge is an ordinary player action that lunges 3.05 m of its own.
    const dodging = state.combat?.action === 'dodge' || previousAction === 'dodge';
    if (state.mode === 'playing' && previousMode === 'playing') {
      maxJump = Math.max(maxJump, stepDistance / renderedFrames);
      assert(stepDistance <= renderedFrames * 7.2 * .05 + .24 + (dodging ? 3.05 : 0),
        `autoplay moved ${stepDistance.toFixed(2)} m over ${renderedFrames} rendered frame(s)`);
    }
    previousAction = state.combat?.action ?? null;
    if (state.mode === 'playing' && previousMode === 'playing') walked += stepDistance;
    previous = now; previousMode = state.mode;
    if (state.questStage !== lastStage) { note(`quest stage ${state.questStage}`, { region: state.region }); lastStage = state.questStage; }
    if (state.region !== lastRegion) { note(`region ${state.region}`); lastRegion = state.region; }
    if (state.journeyView?.stage && state.journeyView.stage !== lastJourneyStage) { note(`road ${state.journeyView.stage}`); lastJourneyStage = state.journeyView.stage; }
    if (state.luscia?.stage && state.luscia.stage !== lastChapterStage) { note(`luscia ${state.luscia.stage}`); lastChapterStage = state.luscia.stage; }
    if (state.enemies?.some(enemy => String(enemy.id).startsWith('lauvel-wolf'))) wolfFight = true;
    if (state.phase === 'active' && milestones.at(-1)?.label !== 'fight') { note('fight'); fights++; }
    if (state.mode === 'defeated') retries++;
    if (state.mode === 'dialogue') lines++;

    // Untrusted input, such as a harness key press, must not stop autoplay.
    if (state.questStage === 3 && autopilot.active && !tookOver) {
      press('KeyW'); await frames(2); release('KeyW');
      assert(autopilot.active, 'a synthetic key press stopped autoplay');
      checks++;
      stop('The harness took the reins.');
      assert(!autopilot.active, 'stop() left autoplay running');
      await frames(3);
      const rest = position(); await frames(6);
      assert(Math.hypot(position().x - rest.x, position().z - rest.z) < .05, 'the traveler kept walking after control was taken back');
      checks += 2; tookOver = true;
      assert(start(), 'autoplay could not resume after a hand-over');
      restarted = true; checks++;
    }
    if (!autopilot.active) {
      assert(state.journeyView?.complete && state.luscia?.complete, `autoplay stopped early: ${autopilot.stopReason}`);
      break;
    }
    assert(performance.now() - started < deadlineMs, `autoplay did not finish the road within ${Math.round(deadlineMs / 1000)} s (stage ${state.questStage}, road ${state.journeyView?.stage}, luscia ${state.luscia?.stage}, intent “${autopilot.intent}”)`);
  }
  const final = readState();
  assert(final.questStage === 10, 'the tutorial was not completed');
  assert(final.journeyView.complete, 'the road was not completed');
  assert(final.luscia?.complete, 'the field at the Lauvel was not finished');
  assert(final.campaign?.chapterId === 'moros-camp', `the campaign stopped at ${final.campaign?.chapterId} instead of the Moros camp`);
  assert(final.campaign?.horse === true, 'the chapter did not pay the Legion horse');
  assert(wolfFight, 'no wolf came off the burial line');
  assert(/Moros camp/i.test(autopilot.stopReason), `autoplay stopped with “${autopilot.stopReason}”`);
  assert(final.mapTutorial === 3, `the map tutorial was not completed on entering Luscia (step ${final.mapTutorial})`);
  assert(final.mode === 'playing', `autoplay ended in ${final.mode}`);
  assert(world.regionAt(final.position[0], final.position[2]).id === 2, "the traveler did not end at Iven's relay post in Luscia");
  assert(tookOver && restarted, 'the hand-over was never exercised');
  assert(fights >= 3, `only ${fights} fights were seen`);
  checks += 12;
  return {
    ok: true, checks, fights, wolfFight, chapter: final.luscia?.stage, campaign: final.campaign?.chapterId,
    retries, dialogueFrames: lines, walkedMeters: Math.round(walked * 10) / 10, maxMetresPerRenderedFrame: Math.round(maxJump * 100) / 100,
    elapsedSeconds: Math.round((performance.now() - started) / 100) / 10, milestones, stopReason: autopilot.stopReason,
  };
}
