import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIMBING, createClimbing, climbSurfaceClear, sampleClimbSurface, canWalkSlope, climbForbidden } from '../src/gameplay/movement/climbing.js';

const ground = (x, z) => 10 + Math.max(0, Math.min(20, z * 2));
const terrain = (extra = {}) => ({ heightAt: ground, waterAt: () => .45, colliders: [],
  regionAt: () => ({ id: 5, name: 'West Suval' }), bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, ...extra });
const at = (z = 1, x = 0) => ({ x, y: ground(x, z), z });
function run(controller, seconds, input = {}) {
  let stamina = input.stamina ?? 100, damage = 0, xp = 0, result;
  for (let t = 0; t < seconds - 1e-6; t += .05) {
    result = controller.tick(.05, { playing: true, up: 1, ...input, stamina });
    stamina -= result.staminaSpent; damage += result.damage; xp += result.xp;
    if (!controller.active) break;
  }
  return { ...result, stamina, damage, xp };
}

test('Suval climbing grabs a nearby uphill face without jumping high ledges', () => {
  const c = createClimbing({ world: terrain() });
  assert.equal(c.grab(at(-.5), 0, { stamina: 100 }), true);
  assert.ok(c.view().position.y - at(-.5).y < 2.1);
  assert.equal(c.view().phase, 'climbing');
  assert.deepEqual(c.view().safePosition, at(-.5));
  const wall = createClimbing({ world: terrain({ heightAt: (_x, z) => z < 0 ? 10 : 50 }) });
  assert.equal(wall.probe(at(-1), 0).available, false);
  const above = { ...at(), y: at().y + 10 }, below = { ...at(), y: at().y - 10 };
  assert.equal(createClimbing({ world: terrain() }).probe(above, 0).available, false, 'airborne feet cannot snap ten metres down to a face');
  assert.equal(createClimbing({ world: terrain() }).probe(below, 0).available, false, 'a face ten metres above the feet is out of reach');
  assert.equal(createClimbing({ world: terrain() }).probe({ ...at(), y: at().y + 1 }, 0).available, true, 'a face beside a small jump remains reachable');
});

test('climbing follows the heightfield and traverses sideways independently of the camera', () => {
  const c = createClimbing({ world: terrain() }); c.grab(at(), 0, { stamina: 100 });
  const climbed = run(c, 2);
  assert.ok(climbed.position.y > at().y + 3);
  assert.ok(Math.abs(climbed.position.y - ground(climbed.position.x, climbed.position.z)) < 1e-8);
  const start = climbed.position;
  const side = run(c, 1, { up: 0, side: 1 });
  assert.ok(side.position.x < start.x - 1.5);
  assert.ok(Math.abs(side.position.y - start.y) < 1e-8);
});

test('D traverses to the right of the uphill-facing avatar and A to its left at every heading', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, .7]) {
    const forward = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const right = { x: -forward.z, z: forward.x };
    const w = terrain({ heightAt: (x, z) => 10 + 2 * (x * forward.x + z * forward.z) });
    for (const side of [-1, 1]) {
      const start = { x: forward.x, y: 12, z: forward.z }, c = createClimbing({ world: w });
      assert.equal(c.grab(start, yaw, { stamina: 100 }), true);
      const result = run(c, .5, { up: 0, side });
      const delta = { x: result.position.x - start.x, z: result.position.z - start.z };
      assert.ok((delta.x * right.x + delta.z * right.z) * side > .8, `side ${side}, yaw ${yaw}`);
      assert.ok(Math.abs(delta.x * forward.x + delta.z * forward.z) < 1e-6, 'traverse follows the face contour');
      assert.ok(Math.abs(result.position.y - start.y) < 1e-6);
    }
  }
});

test('paused climbing freezes movement, stamina, damage and experience', () => {
  const c = createClimbing({ world: terrain() }); c.grab(at(), 0, { stamina: 100 }); run(c, 1);
  const before = c.view(), after = c.tick(.2, { playing: false, up: 1, stamina: 100 });
  assert.deepEqual(after.position, before.position); assert.equal(after.progress, before.progress);
  assert.equal(after.staminaSpent, 0); assert.equal(after.damage, 0); assert.equal(after.xp, 0);
});

test('hanging uses a little stamina but cannot farm climbing experience or animation progress', () => {
  const c = createClimbing({ world: terrain() }); c.grab(at(), 0, { stamina: 100 });
  const after = run(c, 2, { up: 0 });
  assert.equal(after.xp, 0); assert.equal(after.progress, 0); assert.equal(after.moving, false);
  assert.ok(after.stamina > 97 && after.stamina < 98);
});

test('experienced climbers move faster while spending less stamina', () => {
  const novice = createClimbing({ world: terrain() }), practiced = createClimbing({ world: terrain() });
  novice.grab(at(), 0, { stamina: 100 }); practiced.grab(at(), 0, { stamina: 100 });
  const a = run(novice, 2, { level: 1 }), b = run(practiced, 2, { level: 15 });
  assert.ok(b.position.y > a.position.y); assert.ok(b.stamina > a.stamina);
});

test('gentle summits finish climbing and provide a safe saving position', () => {
  const c = createClimbing({ world: terrain() }); c.grab(at(8.8), 0, { stamina: 100 });
  const result = run(c, 5);
  assert.equal(result.phase, 'idle'); assert.ok(result.position.z >= 10);
  assert.deepEqual(result.safePosition, result.position); assert.equal(result.damage, 0);
});

test('letting go descends physically rather than teleporting and a large fall hurts', () => {
  const c = createClimbing({ world: terrain() }); c.grab(at(8), 0, { stamina: 100 });
  const start = c.view().position; c.release();
  const first = c.tick(.05, { stamina: 100 });
  assert.equal(first.phase, 'falling'); assert.ok(Math.hypot(first.position.x - start.x, first.position.z - start.z) < .3);
  const result = run(c, 8);
  assert.equal(result.phase, 'idle'); assert.ok(result.position.y < start.y - 8);
  assert.ok(result.damage > 20); assert.equal(result.xp, 0);
});

test('a small release is harmless and an exhausted climber starts falling', () => {
  const c = createClimbing({ world: terrain() }); c.grab(at(.5), 0, { stamina: 100 }); c.release();
  assert.equal(run(c, 4).damage, 0);
  const tired = createClimbing({ world: terrain() }); tired.grab(at(8), 0, { stamina: 100 });
  assert.equal(tired.tick(.1, { stamina: .1, up: 1 }).phase, 'falling');
});

test('only Suval natural bedrock skins are permeable to a climber', () => {
  const spot = { x: 0, z: 1, r: 3 };
  const kinds = ['suval-pass-rock', 'bat-cave-wall', 'frontier-gate-shut', 'elodi-frontier-ridge',
    'elodi-hill-gate-locked', 'elodi-hill-pass-wall', 'imlamdris-rebuild', 'npc-body', 'tree'];
  assert.equal(climbSurfaceClear(terrain({ colliders: [{ ...spot, kind: 'suval-peak-face' }] }), 0, 1), true);
  for (const kind of kinds) {
    const w = terrain({ colliders: [{ ...spot, kind }] });
    assert.equal(climbSurfaceClear(w, 0, 1), false, kind);
    assert.equal(createClimbing({ world: w }).grab(at(), 0, { stamina: 100 }), false, kind);
  }
});

test('a blocker in front prevents grabbing a face behind it', () => {
  const w = terrain({ colliders: [{ x: 0, z: -.1, r: .1, kind: 'tree' }] });
  assert.equal(createClimbing({ world: w }).grab(at(-.8), 0, { stamina: 100 }), false);
});

test('climbing cannot enter the closed East Suval border even with no collider there', () => {
  const w = terrain({ regionAt: (_x, z) => ({ id: z > 2 ? 4 : 5 }), canClimbMove: (a, b) => a.z > 1.8 || b.z <= 1.8 });
  const c = createClimbing({ world: w }); c.grab(at(), 0, { stamina: 100 });
  const result = run(c, 3); assert.ok(result.position.z <= 1.8);
  const inside = createClimbing({ world: w });
  assert.equal(inside.grab(at(5), 0, { stamina: 100 }), true);
  assert.ok(run(inside, 1).position.z > 5);
});

test('a falling climber cannot cross sealed region boundaries or solid props', () => {
  const w = terrain({ canClimbMove: (a, b) => b.z >= 2 });
  const c = createClimbing({ world: w }); c.grab(at(5), 0, { stamina: 100 }); c.release();
  const result = run(c, 8); assert.ok(result.position.z >= 2); assert.equal(result.phase, 'idle');
});

test('a face the world marks unclimbable gives no hold and no step, while walking and falling are the ground’s own', () => {
  // Kethorn's rock in Telemonia is such a face (src/content/regions/telemonia/telemonia-world.js, `kethornUnclimbable`): here the
  // face from z = 2 up is marked, and the rest of the slope is ordinary climbing rock.
  const marked = terrain({ unclimbableAt: (_x, z) => z >= 2 });
  assert.equal(climbForbidden(marked, 0, 3), true);
  assert.equal(climbForbidden(terrain(), 0, 3), false, 'no mark, no rule');
  assert.equal(sampleClimbSurface(marked, 0, 3).allowed, false);
  assert.equal(sampleClimbSurface(marked, 0, 3).climbable, false);
  assert.equal(createClimbing({ world: marked }).grab(at(2.5), 0, { stamina: 100 }), false, 'no hold on the marked face');
  // A climber on the rock below it climbs up to the mark and no further.
  const c = createClimbing({ world: marked });
  assert.equal(c.grab(at(), 0, { stamina: 100 }), true);
  const result = run(c, 4);
  assert.ok(result.position.z < 2 && result.position.z > 1.5, `the climb stopped at ${result.position.z.toFixed(2)}`);
  // Walking up it is refused by the slope, as before, and coming down it is a fall the rule does not stop.
  assert.equal(canWalkSlope(0, 3, 0, 3.1, marked), false);
  assert.equal(canWalkSlope(0, 3.1, 0, 3, marked), true);
  const faller = createClimbing({ world: marked }); faller.grab(at(1.5), 0, { stamina: 100 }); faller.release();
  assert.ok(run(faller, 6).position.z < 1.5, 'a falling climber still slides down');
});

test('unbuilt regions and water are not climbing surfaces', () => {
  const far = terrain({ regionAt: () => ({ id: 1, name: 'Drent' }) });
  assert.equal(sampleClimbSurface(far, 0, 1).climbable, false);
  assert.equal(createClimbing({ world: far }).grab(at(), 0, { stamina: 100 }), false);
  assert.equal(sampleClimbSurface(terrain({ waterAt: () => 99 }), 0, 1).allowed, false);
});

test('the optional walking guard leaves gentle routes alone and refuses steep walking', () => {
  assert.equal(canWalkSlope(0, 1, 0, 1.1, terrain()), false);
  assert.equal(canWalkSlope(0, -4, 0, -3, terrain()), true);
  assert.equal(canWalkSlope(0, 1, .2, 1, terrain()), true);
  assert.equal(canWalkSlope(0, 1, 0, 1.1, terrain({ regionAt: () => ({ id: 1 }) })), true);
  const diagonal = terrain({ heightAt: (x, z) => 10 + x * .8 + z * .8 });
  assert.equal(canWalkSlope(0, 0, .1, 0, diagonal), false);
  assert.equal(canWalkSlope(0, 0, 0, .1, diagonal), false);
});

test('holding the burst input cannot give an unlimited paid-once speed boost', () => {
  const c = createClimbing({ world: terrain() }); c.grab(at(), 0, { stamina: 100 });
  const first = c.tick(.1, { stamina: 100, burst: true, up: 1 });
  assert.ok(first.staminaSpent >= CLIMBING.burstCost);
  const firstDistance = first.position.z - 1;
  run(c, .6, { stamina: 80, burst: true });
  const before = c.view().position, second = c.tick(.1, { stamina: 75, burst: true, up: 1 });
  assert.ok(second.position.z - before.z < firstDistance * .5);
  assert.ok(second.staminaSpent < 1);
});

test('a paid climbing boost carries upward without needing to hold a direction', () => {
  const c = createClimbing({ world: terrain() }); c.grab(at(), 0, { stamina: 100 });
  c.tick(.05, { stamina: 100, burst: true });
  const result = run(c, .4, { up: 0, stamina: 85 });
  assert.ok(result.position.y > at().y + 1.8);
});


test('East Lotharn and Feradom use the existing free-climbing controller and steep-walking guard', () => {
  for (const region of [20, 21, 'East Lotharn Mountains', 'Feradom', { id: 20 }, { name: 'Feradom' }]) {
    const w = terrain({ regionAt: () => region }), c = createClimbing({ world: w });
    assert.equal(sampleClimbSurface(w, 0, 1).climbable, true, JSON.stringify(region));
    assert.equal(canWalkSlope(0, 1, 0, 1.1, w), false, 'walking cannot bypass climbing');
    assert.equal(c.grab(at(), 0, { stamina: 100 }), true);
    const climbed = run(c, 1);
    assert.ok(climbed.position.y > at().y + 1 && climbed.stamina < 100);
  }
});

test('closed-region fallback blocks entering Feradom or East Suval while allowing an inside tester to exit', () => {
  for (const closed of [4, 21, 'East Suval', 'Feradom']) {
    const w = terrain({ regionAt: (_x, z) => z > 2 ? closed : 20 });
    const outside = createClimbing({ world: w });
    assert.equal(outside.grab(at(), 0, { stamina: 100 }), true);
    assert.ok(run(outside, 3).position.z <= 2, `cannot enter ${closed}`);
    const inside = createClimbing({ world: w });
    assert.equal(inside.grab(at(2.5), 0, { stamina: 100 }), true);
    assert.ok(run(inside, 2, { up: -1 }).position.z < 2, `can leave ${closed}`);
  }
  const border = terrain({ regionAt: (_x, z) => z > 2 ? 21 : 4 });
  const c = createClimbing({ world: border }); c.grab(at(), 0, { stamina: 100 });
  assert.ok(run(c, 3).position.z <= 2, 'being in one closed region does not open another');
});

test('walking can leave a steep downhill edge in every climbing region while uphill still requires a grab', () => {
  for (const id of [4, 5, 18, 20, 21]) {
    const w = terrain({ regionAt: () => ({ id }) });
    assert.equal(canWalkSlope(0, 1, 0, .9, w), true, `descent in ${id}`);
    assert.equal(canWalkSlope(0, .9, 0, 1, w), false, `ascent in ${id}`);
    const ledge = terrain({ regionAt: () => ({ id }), heightAt: (_x, z) => z < 0 ? 5 : 50 });
    assert.equal(canWalkSlope(0, .05, 0, -.05, ledge), true, `ledge drop in ${id}`);
    assert.equal(canWalkSlope(0, -.05, 0, .05, ledge), false, `ledge ascent in ${id}`);
  }
});

test('small trail irregularities can be stepped over without making steep faces walkable', () => {
  const trail = terrain({ heightAt: (_x, z) => 10 + z * .65 + (z >= 0 ? .035 : 0) });
  assert.equal(canWalkSlope(0, -.01, 0, .01, trail), true, 'a short rough join on a walkable ramp is a footstep');
  const roughRamp = terrain({ heightAt: (_x, z) => 10 + z * .75 + (z >= 0 ? .04 : 0) });
  for (const fps of [30, 60, 120]) {
    const step = 4.2 / fps;
    for (let z = -.5; z < .5; z += step)
      assert.equal(canWalkSlope(0, z, 0, z + step, roughRamp), true, `rough ramp at ${fps}fps`);
  }
  const ledge = terrain({ heightAt: (_x, z) => 10 + (z >= 0 ? .2 : 0) });
  assert.equal(canWalkSlope(0, -.01, 0, .01, ledge), false, 'the allowance does not snap up larger ledges');
  const wall = terrain({ heightAt: (_x, z) => 10 + z * 2 });
  assert.equal(canWalkSlope(0, 0, 0, .01, wall), false, 'tiny input steps still cannot walk up a cliff');
  const diagonal = terrain({ heightAt: (x, z) => 10 + .8 * (x + z) });
  assert.equal(canWalkSlope(0, 0, .01, 0, diagonal), false);
  assert.equal(canWalkSlope(0, 0, 0, .01, diagonal), false, 'axis sliding cannot evade the face slope');
});
