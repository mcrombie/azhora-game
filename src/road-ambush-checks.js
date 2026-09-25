import { AMBUSH, AMBUSH_REBELS } from './road-ambush.js';

/** Native renderer checks. Only preparation, damage and saved-time restoration
 * use fixture seams; proximity, combat, retreat and return run in real frames. */
export async function runRoadAmbushChecks(h) {
  const checks = [], failures = [], started = performance.now();
  const assert = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const wait = async (test, message, seconds = 14) => {
    const until = performance.now() + seconds * 1000;
    while (!test()) { if (performance.now() > until) throw new Error(message); await h.frames(2); }
  };
  const records = () => h.ambush.actors();
  const bodies = () => h.corpses.model.list().filter(one => one.id.startsWith('enemy:caloss-rebels:'));
  try {
    await h.prepare(); h.warp(AMBUSH.point.x + 20, AMBUSH.point.z); await h.frames(3);
    assert(h.combat.state.phase !== 'active', 'Watching from the approach does not start the ambush');
    assert(h.watch.snapshot().filter(one => one.visible && one.cover).length === 3,
      'Three camouflaged human figures already exist before the trigger');
    h.warp(AMBUSH.point.x, AMBUSH.point.z); await h.frames(3);
    assert(h.combat.state.phase === 'active' && h.combat.state.encounterId === 'caloss-rebels',
      'Walking onto the junction starts the ordinary proximity encounter');
    assert(h.watch.snapshot().filter(one => one.visible && !one.cover).length === 3,
      'The same visible ambushers drop their cover for combat');
    for (const one of AMBUSH_REBELS) assert(h.combatActor(one.id)?.group.userData.roadAmbushId === one.id,
      `${one.id} keeps its ordinary world model in combat`);
    h.combat.spellHit('rebel-lane', 1000); h.combat.spellHit('rebel-hedge', 41); h.events(); await h.frames(2);
    assert(records()[0].hp === 0 && records()[1].hp <= 79, 'A dead identity and a survivor injury are recorded immediately');
    const injured = records()[1].hp;
    h.warp(AMBUSH.point.x + 55, AMBUSH.point.z); await h.frames(3);
    assert(h.combat.state.phase === 'peaceful' && h.ambush.alive, 'Leaving the fight releases surviving ambushers without clearing the story');
    assert(bodies().length === 1, 'The one fallen ambusher has one persistent lootable body');
    await wait(() => h.ambush.ready, 'Surviving ambushers could not walk back to their cover');
    assert(h.watch.snapshot().filter(one => !one.released && one.visible && one.cover).length === 2,
      'Both injured survivors remain visible and take up cover again');
    const save = h.snapshot(); await h.restore(save); await h.frames(3);
    assert(records()[0].hp === 0 && records()[1].hp === injured, 'Reload preserves the dead ambusher and exact survivor health');
    h.warp(AMBUSH.point.x, AMBUSH.point.z); await h.frames(3);
    assert(h.combat.state.enemies.length === 2 && !h.combat.state.enemies.some(one => one.id === 'rebel-lane'),
      'Returning to the junction triggers only the two surviving people');
    assert(h.combat.state.enemies.find(one => one.id === 'rebel-hedge')?.hp === injured,
      'The second fight starts at the saved injury level');
    for (const one of [...h.combat.state.enemies]) h.combat.spellHit(one.id, 1000);
    h.events(); await h.frames(2);
    assert(!h.ambush.alive && bodies().length === 3, 'Killing the final survivors clears the event and leaves exactly three bodies');
    h.close(); h.warp(AMBUSH.point.x + 18, AMBUSH.point.z); await h.frames(2);
    h.warp(AMBUSH.point.x, AMBUSH.point.z); await h.frames(3);
    assert(h.combat.state.phase !== 'active', 'A completed ambush never respawns when revisited');

    await h.prepare(); h.warp(AMBUSH.point.x + 30, AMBUSH.point.z);
    assert(h.host.start({ allies: [{ id: 'merc-gotwood', name: 'Chris Scotwood', kind: 'villager',
      x: AMBUSH.point.x, z: AMBUSH.point.z, currentHp: 1,
      model: { role: 'mercenary', tunic: 0x596044 } }], partyIds: ['gotwood'] }), 'Chris can encounter the waiting ambushers while the player watches');
    await wait(() => h.ambush.fell('merc-gotwood'), 'Chris never fell to an actual ambusher strike', 18);
    await wait(() => h.combat.state.phase === 'peaceful', 'Ambushers kept the spectator in combat after Chris fell');
    assert(h.ambush.alive && h.ambush.state.settled.includes('gotwood'), 'Chris death settles his passage without clearing or respawning the ambush');
    await wait(() => h.ambush.ready, 'Ambushers did not return to cover after Chris fell');
    assert(h.watch.snapshot().filter(one => !one.released && one.visible && one.cover).length === h.ambush.state.rebels,
      'Surviving attackers visibly wait for their next victim');
    assert(!h.state().frameErrors?.count, 'The complete ambush lifecycle produced no renderer errors');
  } catch (error) { failures.push({ message: error.stack ?? error.message }); }
  return { ok: !failures.length, checks, failures, durationMs: Math.round(performance.now() - started),
    frameErrors: h.state().frameErrors, ambush: h.ambush.snapshot(), actors: h.watch.snapshot() };
}
