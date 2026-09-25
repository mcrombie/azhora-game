import { canStand } from './game-state.js';
import { FOREST_HIDEOUT_QUEST as QUEST } from './forest-hideout.js';
import { CAT } from './cat-quest.js';

/** Walk into scout range without pressing F, in an isolated desktop test profile. */
export async function runHideoutHostilityChecks(h) {
  const { world, player, combat, forestHideout, hideoutWatch, weapons, frames, warp,
    prepareHideout, getMode, setMode, setYaw, press, release, readState } = h;
  const checks = [], check = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const until = async (condition, message, timeout = 15000) => {
    const deadline = performance.now() + timeout;
    while (!condition()) { if (performance.now() > deadline) throw new Error(message); await frames(3); }
  };
  const scout = QUEST.encounter.enemies[0], approach = QUEST.approach;
  const d = Math.hypot(approach.x - scout.x, approach.z - scout.z);
  const near = { x: scout.x + (approach.x - scout.x) * 8 / d, z: scout.z + (approach.z - scout.z) * 8 / d };
  check(canStand(near.x, near.z, world), 'The scout approach is physically walkable');
  try {
    prepareHideout(1); await frames(10);
    check(getMode() === 'playing' && combat.state.phase !== 'active' && !forestHideout.state.inspected,
      'The outer approach is safe without inspecting the camp');
    warp(CAT.at.x, CAT.at.z); await frames(30);
    check(combat.state.phase !== 'active', 'Mop can be reached quietly on the camp outskirts');
    warp(approach.x, approach.z); await frames(5);
    weapons.setCondition('simple-sword', 0);
    check(!weapons.profile().usable, 'The hostility test starts with an unusable sword');
    const start = player.group.position.clone();
    setYaw(Math.atan2(start.x - scout.x, start.z - scout.z)); press('KeyW');
    await until(() => combat.state.phase === 'active', 'Walking toward a scout never triggered hostility');
    release('KeyW'); await frames(2);
    check(player.group.position.distanceTo(start) > 1, 'Ordinary walking, without F, alerts the goblins');
    check(combat.state.encounterId === QUEST.id && forestHideout.state.active && combat.state.enemies.length === 2,
      'Both scouts enter the normal combat system');
    check(readState().questStage === 1 && !weapons.profile().usable && getMode() === 'playing',
      'Hostility needs neither training, inspection, a usable weapon, nor a dialogue');
    check(hideoutWatch.state().visible === 0, 'The passive scout models do not duplicate active combatants');
    const health = combat.state.player.hp;
    await until(() => combat.state.player.hp < health, 'The alerted goblins never approached and struck the traveler');
    check(combat.state.player.hp > 0, 'Alerted goblins approach and deal actual damage');
    setMode('pause'); const pausedHealth = combat.state.player.hp;
    await frames(20); check(combat.state.player.hp === pausedHealth, 'Pause stops the hostile fight'); setMode('playing');
    combat.revive(); forestHideout.endEncounter(QUEST.id);
    prepareHideout(1); setMode('pause'); warp(near.x, near.z); await frames(15);
    check(combat.state.phase !== 'active', 'A paused game does not start proximity combat');
    setMode('playing'); await frames(5);
    check(combat.state.encounterId === QUEST.id && combat.state.phase === 'active', 'Resuming within range alerts the living scouts');
    for (const enemy of combat.state.enemies) combat.spellHit(enemy.id, 999);
    await until(() => forestHideout.state.cleared, 'Victory did not clear the camp');
    warp(near.x, near.z); await frames(30);
    check(!forestHideout.state.active && combat.state.phase !== 'active', 'Cleared goblins do not restart their encounter');
    const completed = forestHideout.snapshot(); forestHideout.restore(completed);
    await frames(10); check(!forestHideout.state.active, 'Restoring cleared progress keeps the camp quiet');
    check(readState().frameErrors.count === 0, 'The renderer records no frame errors');
    setMode('pause');
    return { ok: true, checks, frameErrors: readState().frameErrors };
  } finally { release('KeyW'); }
}
