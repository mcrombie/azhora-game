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
  let previous = position(), previousMode = null, maxJump = 0, tookOver = false, restarted = false;

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
    // Six frames at the 50 ms simulation cap and 7.2 m/s running is at most 2.16 m; retries and arrivals are placed by the game itself.
    if (state.mode === 'playing' && previousMode === 'playing') { maxJump = Math.max(maxJump, stepDistance); assert(stepDistance <= 2.4, `autoplay moved ${stepDistance.toFixed(2)} m in six frames`); }
    else if (state.mode === 'playing') walked += 0;
    if (state.mode === 'playing' && previousMode === 'playing') walked += stepDistance;
    previous = now; previousMode = state.mode;
    if (state.questStage !== lastStage) { note(`quest stage ${state.questStage}`, { region: state.region }); lastStage = state.questStage; }
    if (state.region !== lastRegion) { note(`region ${state.region}`); lastRegion = state.region; }
    if (state.journeyView?.stage && state.journeyView.stage !== lastJourneyStage) { note(`road ${state.journeyView.stage}`); lastJourneyStage = state.journeyView.stage; }
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
      assert(state.journeyView?.complete, `autoplay stopped early: ${autopilot.stopReason}`);
      break;
    }
    assert(performance.now() - started < deadlineMs, `autoplay did not finish the road within ${Math.round(deadlineMs / 1000)} s (stage ${state.questStage}, road ${state.journeyView?.stage}, intent “${autopilot.intent}”)`);
  }
  const final = readState();
  assert(final.questStage === 10, 'the tutorial was not completed');
  assert(final.journeyView.complete, 'the road was not completed');
  assert(final.campaign?.chapterId === 'luscia-aftermath', 'the campaign did not advance to Luscia');
  assert(final.mode === 'playing', `autoplay ended in ${final.mode}`);
  assert(world.regionAt(final.position[0], final.position[2]).id === 4, 'the traveler did not end on Threefold Rise');
  assert(tookOver && restarted, 'the hand-over was never exercised');
  assert(fights >= 2, `only ${fights} fights were seen`);
  checks += 7;
  return {
    ok: true, checks, fights, retries, dialogueFrames: lines, walkedMeters: Math.round(walked * 10) / 10, maxSixFrameStep: Math.round(maxJump * 100) / 100,
    elapsedSeconds: Math.round((performance.now() - started) / 100) / 10, milestones, stopReason: autopilot.stopReason,
  };
}
