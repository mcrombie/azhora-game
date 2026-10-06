import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { villageToWorld } from '../src/world/terrain/region-world.js';
import { moveCharacter } from '../src/gameplay/movement/game-state.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { PENINSULA_TUTORIAL_ANCHORS as A, PENINSULA_TUTORIAL_PATHS, PENINSULA_HOME_ROUTE, PENINSULA_CHRIS_TASKS, peninsulaWoodcuttingRoute, peninsulaFishingRoute, PENINSULA_FERRY_LANDING } from '../src/content/chapters/prologue/peninsula-tutorial.js';
import { GLUN_WOOD_LESSON } from '../src/content/quests/skill-lessons/glun-woodcutting.js';
const THREE = await sourceModule('../vendor/three.module.js');
const { createPeninsulaTutorialScenery, tutorialSceneryClearAt } = await sourceModule('../src/content/chapters/prologue/peninsula-tutorial-scenery.js');
const { createTutorialBoundaryVisuals } = await sourceModule('../src/world/environment/tutorial-boundary-visuals.js');

test('The peninsula teachers, trail and exit stand on actual dry ground; swimming has real water', () => {
  for (const id of ['arrival', 'jojo', 'chris', 'walkingEnd', 'bear', 'ryan', 'jess', 'glun', 'dummy', 'cookfire', 'gate', 'graduation']) {
    assert.ok(groundWithRiver(A[id].x, A[id].z) > .3, `${id} is on dry ground`);
  }
  assert.ok(groundWithRiver(PENINSULA_FERRY_LANDING.mooring.x, PENINSULA_FERRY_LANDING.mooring.z) < -.9);
  assert.ok(groundWithRiver(PENINSULA_FERRY_LANDING.ashore.x, PENINSULA_FERRY_LANDING.ashore.z) > .3);
  assert.ok(groundWithRiver(A.swimTurn.x, A.swimTurn.z) < -.9);
  assert.ok(groundWithRiver(A.fishingCast.x, A.fishingCast.z) < -.9);
  const spot = { fishingSpot: villageToWorld(20.4, -77) };
  for (const path of [...PENINSULA_TUTORIAL_PATHS, PENINSULA_HOME_ROUTE, peninsulaWoodcuttingRoute(GLUN_WOOD_LESSON.stand), peninsulaFishingRoute('instructor', spot), peninsulaFishingRoute('willowmere-ryan', spot)]) for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
    let last = groundWithRiver(a.x, a.z);
    for (let k = 1; k <= steps; k++) {
      const p = { x: a.x + (b.x - a.x) * k / steps, z: a.z + (b.z - a.z) * k / steps };
      const h = groundWithRiver(p.x, p.z); assert.ok(h > .2, `Dry path at ${p.x},${p.z}: ${h}`);
      assert.ok(Math.abs(h - last) < 1, `Passable grade at ${p.x},${p.z}: ${h - last}`); last = h;
    }
  }
});
test('The peninsula scenery has a real pier floor, working gate and tree clearings without new NPCs', () => {
  const parent = new THREE.Group(), colliders = [], scenery = createPeninsulaTutorialScenery({ parent, heightAt: groundWithRiver, colliders });
  assert.equal(scenery.walkSurfaces.length, 2); assert.equal(scenery.gate.open, true);
  assert.ok(!colliders.some(c => c.kind === 'tutorial-gate'));
  scenery.gate.setOpen(false); scenery.gate.setOpen(false);
  assert.equal(colliders.filter(c => c.kind === 'tutorial-gate').length, 1);
  scenery.gate.setOpen(true); assert.ok(!colliders.some(c => c.kind === 'tutorial-gate'));
  assert.ok(scenery.root.children.length > 3);
  assert.equal(tutorialSceneryClearAt(A.dummy.x, A.dummy.z), true);
  assert.equal(tutorialSceneryClearAt(231, 40), false, 'The rest of the peninsula keeps its woods.');
});
test('Both boundary creatures materialize visibly before the lethal frame and disappear on recovery', () => {
  const parent = new THREE.Group(), visuals = createTutorialBoundaryVisuals({ parent });
  for (const kind of ['sea', 'air']) {
    const shot = visuals.sync({ kind, elapsed: 2.4, at: { x: 140, z: 10, y: kind === 'air' ? 30 : .1 } }, { yaw: 1 });
    assert.equal(visuals.root.visible, true); assert.ok(Number.isFinite(shot.cameraTarget.y));
    const model = visuals.root.children.find(c => c.visible && c.isGroup); assert.ok(model);
    model.updateMatrixWorld(true); const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
    assert.ok(size.y > 10 && size.x > 12, 'The encounter dwarfs the player.');
    visuals.sync(null); assert.equal(visuals.root.visible, false);
  }
});


test('Ordinary walking physically stops at the closed gate and crosses the neck after it opens', () => {
  const colliders = [], scenery = createPeninsulaTutorialScenery({ parent: new THREE.Group(), heightAt: groundWithRiver, colliders });
  const world = { colliders, heightAt: groundWithRiver, bounds: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 } };
  const walker = { ...A.graduation, y: groundWithRiver(A.graduation.x, A.graduation.z) };
  scenery.gate.setOpen(false); moveCharacter(walker, -20, 0, world, .34);
  assert.ok(walker.x > A.gate.x + .3 && walker.x < A.gate.x + 1);
  scenery.gate.setOpen(true); moveCharacter(walker, -12, 0, world, .34);
  assert.ok(walker.x < 92, 'The same physical walk can leave after graduation.');
});
