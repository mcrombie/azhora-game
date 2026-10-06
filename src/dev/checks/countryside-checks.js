import { canStand } from '../../gameplay/movement/game-state.js';
import { CLIMBING, sampleClimbSurface } from '../../gameplay/movement/climbing.js';
import { DEVELOPER_BAT } from '../tools/developer-bat.js';
import { TERRAIN_FALL } from '../../gameplay/movement/terrain-fall.js';
import { REGION_CELLS } from '../../world/terrain/region-world.js';

/** Native checks for walk-off gravity, high-altitude flight and populated countryside.
 * All movement after fixture placement uses the real held-key update loop. */
export async function runCountrysideChecks(h) {
  const checks = [], started = performance.now();
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const fail = message => { throw new Error(`Countryside: ${message}; ${JSON.stringify({
    mode: h.state().mode, position: h.position(), fall: h.terrainFall.view(),
    bat: h.developerBat.view(), hp: h.combat.state.player.hp, errors: h.state().frameErrors })}`); };
  const check = (ok, message) => { if (!ok) fail(message); checks.push(message); };
  const tap = code => { h.press(code); h.release(code); };
  const capture = async name => { h.clearTransient(); await h.frames(8); console.log(`COUNTRYSIDE_CAPTURE ${name}`); await h.frames(8); };
  const until = async (condition, message, seconds = 12) => {
    const deadline = performance.now() + seconds * 1000;
    while (!condition()) { if (performance.now() > deadline) fail(message); await h.frames(1); }
  };
  const control = id => {
    const node = document.getElementById(id), details = node?.closest('details');
    if (details && !details.open) details.querySelector('summary').click();
    check(node && !node.disabled && node.getClientRects().length, `${id} is available in the testing menu`);
    return node;
  };
  async function travel(name) {
    await h.open(); await h.frames(2);
    const country = control('test-country');
    country.value = name; country.dispatchEvent(new Event('change', { bubbles: true }));
    control('test-place').value = '0'; control('test-goto').click(); await h.frames(5);
    check(h.state().mode === 'playing' && h.world.regionAt(h.position().x, h.position().z)?.name === name,
      `Public travel reaches ${name}`);
  }
  await h.prepare(); await h.frames(3);
  const savedBefore = h.saved();
  try {
    await travel('East Lotharn Mountains');
    // An open eastern-summit ledge with a real thirty-four-metre drop to its west.
    const ledge = { x: -993, z: -814, yaw: -Math.PI / 2 };
    const surface = sampleClimbSurface(h.world, ledge.x, ledge.z);
    check(surface.slope < CLIMBING.grabSlope && canStand(ledge.x, ledge.z, h.world),
      'The Lotharn fall fixture starts on clear walkable ground');
    check(surface.height - h.world.heightAt(ledge.x - 6, ledge.z) > 20,
      'The test cliff is a genuine large drop in the rendered mountain');
    h.warp(ledge); h.face(ledge.yaw); await h.frames(2);
    h.press('KeyW');
    await until(() => h.terrainFall.active, 'W movement did not leave the mountain ledge');
    check(!h.climbing.active, 'Walking off an edge starts gravity without a climbing grip');
    await until(() => h.position().y - h.world.heightAt(h.position().x, h.position().z) > .4,
      'The traveler never became airborne over the descending face');
    h.release('KeyW');
    const airborne = h.position();
    check(h.terrainFall.view().velocity < 0 && airborne.y < surface.height,
      'The airborne traveler descends continuously instead of snapping to the ground');
    h.freeze(true); await capture('mountain-airborne'); h.freeze(false);
    h.pause(true);
    const paused = h.position(), fallPaused = h.terrainFall.view();
    await h.frames(8);
    check(gap(h.position(), paused) < 1e-7 && Math.abs(h.position().y - paused.y) < 1e-7
      && h.terrainFall.view().elapsed === fallPaused.elapsed, 'Pause freezes an ordinary terrain fall');
    h.pause(false);
    const steeringStart = h.position(), elapsed = h.terrainFall.view().elapsed;
    h.press('KeyD'); h.press('ShiftLeft'); h.press('Tab'); await h.frames(5);
    for (const code of ['KeyD', 'ShiftLeft', 'Tab']) h.release(code);
    const fall = h.terrainFall.view(), steerTime = Math.max(.001, fall.elapsed - elapsed);
    check(gap(h.position(), steeringStart) <= TERRAIN_FALL.maxDriftSpeed * steerTime + .25,
      'Air steering stays limited even while run and turbo keys are held');
    check(h.position().y < airborne.y, 'Gravity continues while steering in midair');
    await until(() => !h.terrainFall.active || h.state().mode === 'defeated', 'The fall did not settle', 18);
    check(h.combat.state.player.hp < h.combat.state.player.maxHp, 'A large walk-off fall applies health damage');
    if (h.state().mode === 'defeated') {
      h.recover(); await h.frames(3);
      check(h.state().mode === 'playing' && h.combat.state.player.hp > 0,
        'A fatal walk-off fall uses the normal recovery flow');
    }
    check(!h.terrainFall.active && Math.abs(h.position().y - h.world.heightAt(h.position().x, h.position().z)) < .1,
      'Landing or recovery leaves the traveler safely grounded');
    await capture('mountain-fall-recovery');

    // Take off through the public tool beside the summit, then climb above the old420m ceiling.
    h.warp({ x: -1010, z: -814, yaw: Math.PI / 2 });
    await h.open(); await h.frames(2); control('test-dev-bat').click(); await h.frames(2);
    check(h.developerBat.active, 'The public Hacks button grants the developer bat');
    h.freeze(true);
    h.stepDev(4.5, { lift: 1 });
    check(h.developerBat.view().position.y > 435, 'Developer flight climbs high enough to clear the East Lotharn summit');
    h.freeze(false); h.face(Math.PI / 2); h.press('KeyW');
    await until(() => h.position().x >= -964, 'The developer bat could not cross the high summit');
    h.release('KeyW');
    const top = h.position(), peakGround = h.world.heightAt(top.x, top.z);
    check(peakGround > 415 && top.y > peakGround + DEVELOPER_BAT.clearance,
      'The bat crosses the actual high mountain without a ceiling wall');
    tap('KeyG'); await h.frames(2);
    check(h.developerBat.view().landing, 'G requests physical landing on the summit');
    const landingY = h.position().y; await h.frames(5);
    check(h.position().y < landingY && h.position().y > peakGround,
      'The summit landing visibly descends instead of teleporting');
    await until(() => !h.developerBat.active, 'The developer bat did not finish landing', 15);
    check(Math.abs(h.position().y - h.world.heightAt(h.position().x, h.position().z)) < .1,
      'The developer bat lands on the summit surface');
    await capture('lotharn-summit-landing');

    await travel('Feradom');
    const animals = h.wildlife().filter(a => a.region === 'Feradom' && a.species !== 'plateau-hawk');
    check(animals.length >= 75, 'Feradom has persistent land wildlife beyond its old pass-valley bands');
    for (const cell of REGION_CELLS.Feradom.filter(c => c.terrain === 'plains')) {
      check(Math.min(...animals.map(a => gap(a, cell))) <= 65,
        `Feradom plain hex ${cell.q},${cell.r} has resident land animals`);
    }
    const birch = { x: -566.0107205633631, z: -656.9843006150509, yaw: -Math.PI / 2 };
    const birchSurface = sampleClimbSurface(h.world, birch.x, birch.z);
    check(birchSurface.slope < .5 && [0, .12, .24, .36].every(d => canStand(birch.x - d, birch.z, h.world)),
      'The former Birch Pass invisible wall is clear, gently sloping ground');
    h.warp(birch); h.face(birch.yaw); await h.frames(2);
    const birchStart = h.position(); h.press('KeyW');
    await until(() => birchStart.x - h.position().x > .25, 'Ordinary walking is still blocked at the Birch Pass shoulder', 4);
    h.release('KeyW'); await h.frames(2);
    check(!h.climbing.active && !h.terrainFall.active
      && Math.abs(h.position().y - h.world.heightAt(h.position().x, h.position().z)) < .1,
      'Held W walks over the repaired hill seam without requiring climbing or falling');
    await capture('feradom-birch-walking');
    h.warp({ x: -450, z: -750, yaw: Math.PI }); await h.frames(4);
    await capture('feradom-plain-wildlife');
    // The composition root may append farming/save/UI checks using the same result list.
    if (h.checkFarms) await h.checkFarms({ check, capture, travel, control });
    check(h.saved() === savedBefore, 'The countryside playtest preserves the normal saved adventure');
    const errors = h.state().frameErrors;
    check((typeof errors === 'number' ? errors : errors?.count ?? 0) === 0, 'No renderer errors occur during countryside checks');
    return { ok: true, checks, wildlife: animals.length, elapsedMs: Math.round(performance.now() - started) };
  } finally {
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'Tab', 'KeyG']) h.release(code);
    h.pause(false); h.freeze(false);
  }
}
