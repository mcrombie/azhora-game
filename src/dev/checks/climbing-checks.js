/** Exercise the shipped input, stamina, animation, save and recovery wiring in the real renderer. */
export async function runClimbingChecks(h) {
  const checks = [], check = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const tall = { x: -517.273331, z: 677.280100, yaw: 1.34536 };
  const easy = { x: -501.981207, z: 610.925240, yaw: -.5111 };
  const { climbing, combat, skills, player, frames } = h;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const tap = code => { h.press(code); h.release(code); };
  const panel = () => document.getElementById('climbing-status');
  const grab = at => {
    h.warp(at); h.refresh();
    check(climbing.probe(player.group.position, player.group.rotation.y).available, 'A real Suval rock face can be reached at the test foothold');
    tap('Space');
    check(climbing.view().phase === 'climbing', 'Space takes a grip through the ordinary game input');
  };
  h.prepare(); await frames(3);
  try {
    grab(tall);
    check(skills.taught('climbing'), 'The first successful grip introduces the Climbing skill');
    h.refresh();
    check(panel() && !panel().hidden, 'A visible climbing stamina meter appears while gripping rock');
    const meter = panel().querySelector('[role="progressbar"]');
    check(Number(meter?.getAttribute('aria-valuenow')) === Math.ceil(combat.state.player.stamina), 'The grip meter displays the real combat stamina pool');
    await h.capture('gripping');

    h.freeze(false); h.press('KeyW');
    const begin = player.group.position.clone(), wind = combat.state.player.stamina;
    await frames(18); h.release('KeyW');
    check(player.group.position.y > begin.y + .05 && distance(player.group.position, begin) > .02, 'Holding W climbs the actual highland terrain');
    check(combat.state.player.stamina < wind, 'Climbing movement consumes stamina instead of regenerating it');
    const beforeTraverse = player.group.position.clone(), facing = player.group.rotation.y;
    h.press('KeyD'); await frames(12); h.release('KeyD');
    const traverse = player.group.position.clone().sub(beforeTraverse);
    check(-Math.cos(facing) * traverse.x + Math.sin(facing) * traverse.z > .03,
      'D traverses to the climber\'s right, consistent with ordinary movement from behind');
    for (const key of ['KeyR', 'KeyC', 'KeyF', 'KeyZ']) tap(key);
    check(climbing.view().phase === 'climbing' && combat.state.player.action === 'idle' && h.mode() === 'playing',
      'Ground attacks, dodges, interaction and casting cannot interrupt the held grip');
    h.pause(true);
    const pausedAt = player.group.position.clone(), pausedWind = combat.state.player.stamina;
    await frames(8);
    check(player.group.position.distanceTo(pausedAt) < 1e-7 && combat.state.player.stamina === pausedWind, 'Pause freezes both the climber and stamina use');
    h.pause(false);
    const hangingAt = player.group.position.clone(), hangingWind = combat.state.player.stamina;
    await frames(18); h.freeze(true);
    check(player.group.position.distanceTo(hangingAt) < 1e-7, 'Releasing movement holds the same place on the cliff');
    check(combat.state.player.stamina < hangingWind, 'Hanging still slowly consumes stamina and cannot refill it');

    const xpBefore = skills.xp('climbing');
    h.step(2.2, 1, 0); h.refresh();
    check(skills.xp('climbing') > xpBefore, 'Fractional climb progress accumulates into actual skill experience');
    check(climbing.view().progress > 0, 'Climbing animation advances with distance actually covered');
    await h.capture('climbing');
    const safe = { ...climbing.view().safePosition }, xpSaved = skills.xp('climbing'), saved = h.snapshot();
    check(h.validate(saved).ok, 'A checkpoint taken while gripping a cliff is valid');
    check(distance(saved.position, safe) < .01, 'The cliff checkpoint stores the last foothold rather than a suspended position');
    check(await h.restore(saved), 'The checkpoint restores through the ordinary game recovery flow');
    h.freeze(true);
    check(!climbing.active && distance(player.group.position, safe) < .1, 'Loading returns the traveler to the saved foothold without a dangling grip');
    check(skills.taught('climbing') && skills.xp('climbing') === xpSaved, 'Loading keeps Climbing learned and preserves its earned experience');

    grab(tall); h.step(4.2, 1, 0);
    const top = player.group.position.clone(); tap('KeyX');
    check(climbing.view().phase === 'falling', 'X releases the grip into a continuous fall');
    h.step(.2, 0, 0);
    check(player.group.position.y < top.y && player.group.position.distanceTo(top) < 3, 'The released traveler slides down visibly instead of teleporting to the foot of the mountain');
    for (let i = 0; i < 100 && climbing.active; i++) h.step(.2, 0, 0);
    check(!climbing.active, 'The fall ends at a foothold or in the normal defeat flow');
    check(combat.state.player.hp < combat.state.player.maxHp, 'A fall beyond the safe drop applies health damage');

    grab(easy);
    const ledgeStart = player.group.position.clone();
    for (let i = 0; i < 120 && climbing.view().phase === 'climbing'; i++) h.step(.1, 1, 0);
    check(!climbing.active && combat.state.player.hp > 0 && player.group.position.y > ledgeStart.y, 'The short Suval practice face ends on a genuine walkable ledge');
    const tired = combat.state.player.stamina;
    h.freeze(false); await frames(40); h.freeze(true);
    check(combat.state.player.stamina > tired, 'Stamina recovers after the traveler reaches solid ground');
    h.refresh(); check(panel().hidden, 'The climbing meter clears when the traveler stands on the ledge');
    await h.capture('ledge');

    grab(tall);
    combat.exhaust(Math.max(0, combat.state.player.stamina - 20), 0, { hold: true }); h.refresh();
    check(panel().dataset.warning === 'true' && /Low stamina/.test(panel().textContent), 'A nearly empty grip meter warns the player to find a ledge');
    const destination = { x: -404, z: 703 };
    h.travel(destination); h.freeze(true);
    check(!climbing.active && distance(player.group.position, destination) < 3, 'Testing travel cancels climbing cleanly and places the player at the destination');

    grab(tall); h.step(1, 1, 0);
    const recovery = { ...climbing.view().safePosition }, earned = skills.xp('climbing');
    h.fall(combat.state.player.maxHp + 1);
    check(h.mode() === 'defeated' && combat.state.player.hp === 0 && !climbing.active, 'A fatal fall opens the normal defeat screen and ends the grip');
    check(/foothold/i.test(document.getElementById('retry')?.textContent ?? ''), 'Fall recovery clearly offers the last foothold');
    h.recover();
    check(h.mode() === 'playing' && combat.state.player.hp > 0 && distance(player.group.position, recovery) < .1, 'Recover returns the traveler safely to the last foothold');
    check(skills.xp('climbing') === earned, 'Foothold recovery preserves earned climbing progress');
    check(h.frameErrors() === 0, 'Climbing produces no renderer frame errors');
    return { ok: true, checks, climbingXp: skills.xp('climbing') };
  } finally {
    for (const code of ['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyX']) h.release(code);
    h.freeze(true);
  }
}
