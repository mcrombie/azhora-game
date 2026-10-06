/** Native integration: real conversations, guide feet, demonstration and F fishing.
 * Player warps only keep pace/visit test points; NPC movement uses the game loop. */
export async function runFishingLessonsChecks(h) {
  const checks = [], failures = [], started = performance.now();
  const assert = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const stage = () => h.fishingLessons.view().stage;
  const until = async (condition, message, seconds = 65, tick = null) => {
    const deadline = Math.min(started + 180000, performance.now() + seconds * 1000);
    while (!condition()) {
      if (performance.now() >= deadline) throw new Error(message + '; stage=' + stage() + '; mode=' + h.getState().mode);
      await tick?.(); await h.frames(2);
      if (h.getState().frameErrors?.count) throw new Error('Renderer failed: ' + h.getState().frameErrors.first?.message);
    }
  };
  const visit = async id => { await h.close(); await h.visit(id); await h.finish(); };
  const run = async (name, action) => {
    try { await action(); h.notify?.({ name, ok: true }); }
    catch (error) { failures.push({ name, message: error.message }); h.notify?.({ name, ok: false, message: error.message }); }
  };
  await h.prepare(); h.fishingLessons.restore(); h.fishing.restore({ version: 1, taught: false, caught: {} });
  if (h.inventory.has('fishing-rod')) h.inventory.remove('fishing-rod', h.inventory.count('fishing-rod'));
  // The opening deliberately shows only Jojo until his first introduction.
  // Complete it normally before asserting optional teachers' green markers.
  await visit('harbormaster'); await h.close(); await h.frames(2);
  assert(h.getState().questStage >= 2, 'Jojo introduction opens the normal teacher markers');
  for (const id of ['garden-keeper', 'avrel-farmer']) {
    await run(id + ' guided fishing', async () => {
      await visit(id);
      assert(h.marker(id).visible && h.marker(id).kind === 'skill', id + ' has a green teaching marker');
      await h.choose('fishing-lesson-begin'); await h.finish();
      assert(stage() === 'leading' && h.fishingLessons.view().teacher === id, id + ' accepts the outing through ordinary dialogue');
      const npc = h.npcById.get(id), origin = npc.actor.group.position.clone();
      const follow = () => { const p = npc.actor.group.position; h.warp(p.x + 3.5, p.z + 2); };
      await until(() => npc.actor.group.position.distanceTo(origin) > 2, id + ' did not lead', 15, follow);
      if (id === 'garden-keeper') {
        const at = npc.actor.group.position.clone(); h.warp(at.x + 23, at.z + 15); await h.frames(5);
        const stopped = npc.actor.group.position.clone(); await h.frames(10);
        assert(h.fishingLessons.view().waiting && npc.actor.group.position.distanceTo(stopped) < .1, 'Jean waits when the player falls behind');
        follow(); await h.frames(3);
        h.tap('Escape'); await h.frames(2); const paused = npc.actor.group.position.clone(); await h.frames(12);
        assert(h.getState().mode === 'pause' && npc.actor.group.position.distanceTo(paused) < .01, 'A paused outing has no guide movement');
        await h.close(); await h.frames(2);
        const saved = h.snapshot(), savedPosition = saved.fishingLessons.position;
        await h.restore(saved); await h.frames(2);
        assert(stage() === 'leading' && Math.hypot(npc.actor.group.position.x - savedPosition.x, npc.actor.group.position.z - savedPosition.z) < .3,
          'Reloading mid-walk restores the guide position and unfinished lesson');
      }
      await until(() => stage() === 'demonstrating', id + ' did not reach the pond', 70, follow);
      await h.frames(2);
      assert(npc.actor.fishingTip() && h.fishingView().visible, id + ' visibly demonstrates with a real rod, line and float');
      const demoAt = h.fishingLessons.view().demonstration;
      assert(demoAt < 4, 'The demonstration is shown for real play time');
      await until(() => stage() === 'practice', id + ' did not finish showing the cast', 10, follow);
      assert(h.skills.taught('fishing') && h.inventory.count('fishing-rod') === 1, id + ' teaches Fishing and leaves exactly one rod');
      const lesson = h.fishingLessons.view(), spot = h.world.fishingSpots.find(s => s.id === lesson.spot), before = h.inventory.count('raw-fish');
      h.warp(spot.fishingSpot.x, spot.fishingSpot.z); await h.frames(4); h.tap('KeyF'); await h.frames(2);
      assert(h.getState().mode === 'fishing', id + ' bank F casts instead of reopening the teacher conversation');
      await until(() => h.campcraft.state.phase === 'bite', 'No real bite arrived', 8);
      h.tap('KeyF'); await h.frames(3);
      assert(h.inventory.count('raw-fish') === before + 1 && h.fishingLessons.view().completed.includes(id), id + ' exercise completes only after the actual F catch');
      assert(h.inventory.count('fishing-rod') === 1, 'Success cannot duplicate the fishing rod');
      if (id === 'garden-keeper') await until(() => stage() === 'idle', 'Jean did not return by the path', 65, follow);
    });
    if (failures.length) break;
  }
  assert(!h.getState().frameErrors?.count, 'No renderer errors during fishing outings');
  const result = { ok: failures.length === 0, checks, failures, elapsedMs: Math.round(performance.now() - started) };
  h.notify?.(result); return result;
}
