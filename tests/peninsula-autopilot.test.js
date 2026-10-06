import test from 'node:test';
import assert from 'node:assert/strict';
import { createPeninsulaAutopilot } from '../src/content/chapters/prologue/peninsula-autopilot.js';
import { createPeninsulaTutorial, PENINSULA_TUTORIAL_ANCHORS as A } from '../src/content/chapters/prologue/peninsula-tutorial.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createCampcraft } from '../src/gameplay/skills/crafting/campcraft.js';
import { createCombat } from '../src/gameplay/combat/combat.js';
import { createSkills } from '../src/gameplay/skills/skills.js';
import { createLocomotionSkills } from '../src/gameplay/movement/locomotion-skills.js';
import { BODY, bodyWorld } from '../src/gameplay/combat/bodies.js';
import { moveCharacter } from '../src/gameplay/movement/game-state.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const terrain = () => ({ bounds: { minX: 90, maxX: 275, minZ: -130, maxZ: 110 }, colliders: [], heightAt: x => x < 151 ? 0 : 3 });
const teachers = { harbormaster: A.jojo, 'merc-gotwood': A.chris, instructor: A.glun,
  'willowmere-barrett': A.bear, 'willowmere-ryan': A.ryan, boatman: A.jess };

for (const shore of [151, 145]) test(`peninsula autoplay completes actual lessons with the shore at ${shore}, then stops at the letter`, () => {
  const world = terrain(), inventory = createInventoryState(), skills = createSkills(), walk = createLocomotionSkills({ skills });
  const position = { ...A.arrival, y: 3 }, navigation = bodyWorld(world).moving(position, BODY.traveler, 'traveler');
  const lessonIds = new Set(), inputActions = [], events = [];
  let mode = 'playing', dialogue = null, selectedItem = null, clock = 0, traveled = 0, swimmingDistance = 0, paused = false, takenOver = false;
  const tutorial = createPeninsulaTutorial({ onEvent: event => {
    events.push(event);
    if (event.type === 'tutorial-grant') {
      if (event.item) inventory.grant(event.item);
      if (event.skill) skills.learn(event.skill);
    }
  } });
  const combat = createCombat({ world, position, getMargins: () => ({ hasShield: true }), onEvent: event => {
    if (event.type === 'practice-hit') tutorial.practice('combat', 'strike');
    if (event.type === 'dodge') tutorial.practice('combat', 'dodge');
  } });
  const campcraft = createCampcraft({ inventory, weapons: { spendSticks: () => false }, fireIds: ['peninsula-fire'], canCook: () => tutorial.view().lessons.cooking.introduced,
    onEvent: event => {
      if (event.type === 'catch') tutorial.practice('fishing', 'catch');
      if (event.type === 'cook') tutorial.practice('cooking', 'cook');
    } });
  assert.equal(campcraft.restore({ version: 1, taught: false, catches: 0, fires: { 'peninsula-fire': 120 } }), true);
  tutorial.choose('tutorial');
  const close = () => { mode = 'playing'; dialogue = null; };
  const interaction = () => {
    if (gap(position, A.cookfire) < 2.1) return { fireId: 'peninsula-fire' };
    const npc = Object.entries(teachers).filter(([, at]) => gap(position, at) < 2.6).sort((a, b) => gap(position, a[1]) - gap(position, b[1]))[0];
    if (npc) return { npcId: npc[0] };
    return { nearFishing: gap(position, { x: 156, z: 32 }) < 1.8 };
  };
  function showFire() {
    mode = 'dialogue'; dialogue = { npcId: 'peninsula-fire', choices: [
      { id: 'cook-fish', enabled: campcraft.fireStatus('peninsula-fire').canCook }, { id: 'leave-fire' },
    ] };
  }
  const pilot = createPeninsulaAutopilot({ world: navigation, read: () => ({ mode, position, tutorial: tutorial.view(),
    tutorialTeachers: teachers, dialogue, interaction: interaction(), campcraft: campcraft.state, selectedItem,
    combat: { ...combat.state.player, phase: combat.state.phase }, inWater: position.x < shore }),
    options: { dialoguePace: .1, choicePace: .1, interactEvery: .1, readingPace: .5 }, act: {
      interact: () => {
        inputActions.push('interact');
        if (mode === 'fishing') { if (campcraft.reel().ok || campcraft.state.phase === 'idle') close(); return; }
        const near = interaction();
        if (near.fireId) { showFire(); return; }
        if (near.npcId) {
          mode = 'dialogue'; const q = tutorial.view(), id = q.canGraduate ? 'graduate' : q.next.id;
          dialogue = { npcId: near.npcId, choices: [{ id: `peninsula-${id}` }] }; return;
        }
        if (near.nearFishing && campcraft.cast().ok) mode = 'fishing';
      },
      choose: ({ id }) => {
        assert.ok(dialogue.choices.some(c => c.id === id && c.enabled !== false), `only shown replies: ${id}`);
        inputActions.push(id);
        if (id === 'leave-fire') { close(); return; }
        if (id === 'cook-fish') { assert.equal(campcraft.cook('peninsula-fire').ok, true); showFire(); return; }
        if (id === 'peninsula-graduate') { assert.equal(tutorial.signOff(clock).ok, true); close(); return; }
        const lesson = id.slice('peninsula-'.length);
        assert.equal(tutorial.introduce(lesson).ok, true); lessonIds.add(lesson);
        if (lesson === 'combat') { combat.startPractice(A.dummy); combat.setWeaponReady(true); }
        if (lesson === 'fishing') campcraft.teachFishing();
        // The tutorial's communal fire stays lit while Jojo supervises supper.
        if (lesson === 'cooking') campcraft.restore({ ...campcraft.checkpoint(), fires: { 'peninsula-fire': 120 } });
        close();
      },
      'open-inventory': () => { inputActions.push('open-inventory'); mode = 'inventory'; },
      'select-item': ({ id }) => { assert.ok(inventory.has(id)); selectedItem = id; tutorial.practice('inventory', 'inspect-sandwich'); },
      'close-inventory': close,
      'open-chart': () => { inputActions.push('open-chart'); mode = 'journal'; tutorial.practice('cartography', 'open-map'); },
      'close-journal': close,
      attack: ({ yaw }) => { inputActions.push('attack'); combat.attack(yaw); },
      dodge: ({ x, z }) => { inputActions.push('dodge'); combat.dodge({ x, z }); },
    } });
  pilot.onEvent(event => events.push(event)); pilot.start();
  for (let i = 0; i < 7000 && pilot.active; i++) {
    const dt = .1, before = { ...position };
    navigation.setBodies(Object.entries(teachers).map(([id, at]) => ({ id, ...at, r: BODY.person })));
    const command = pilot.step(dt);
    if (!command) break;
    if (mode === 'playing') {
      clock += dt;
      const pace = walk.pace({ run: command.move.run, stamina: combat.state.player.stamina });
      const inWater = position.x < shore, speed = (inWater ? 2.31 : pace.speed) * combat.movementScale();
      const { forward, side, basisYaw = command.yaw ?? 0 } = command.move;
      moveCharacter(position, (-Math.sin(basisYaw) * forward + Math.cos(basisYaw) * side) * speed * dt,
        (-Math.cos(basisYaw) * forward - Math.sin(basisYaw) * side) * speed * dt, navigation, BODY.traveler, { swimming: true });
      const moved = gap(before, position);
      traveled += moved; if (inWater) swimmingDistance += moved;
      assert.ok(moved < 1, 'no tutorial controller teleports');
      combat.guard(pilot.guard, Math.PI + (command.yaw ?? 0)); combat.update(dt);
      if (combat.state.player.guarding) tutorial.practice('combat', 'guard', dt);
      if (moved > .001 && !inWater) {
        const counted = walk.update(dt, { distance: moved, mode: pace.mode });
        combat.exhaust(counted.staminaCost, 0, { hold: counted.staminaCost > 0, cause: 'running' });
        if (pace.mode === 'running') tutorial.practice('running', 'run', counted.practicedSeconds);
        else tutorial.practice('walking', 'walk', counted.practicedSeconds);
      }
      if (!command.move.run) tutorial.practice('running', 'recover', dt);
      if (gap(position, A.walkingEnd) < 1.5) tutorial.practice('walking', 'arrive');
      if (inWater && moved > .001) tutorial.practice('swimming', 'swim', dt);
      if (gap(position, A.swimTurn) < 1.5) tutorial.practice('swimming', 'buoy');
      if (position.x >= shore && gap(position, A.swimExit) < 3) tutorial.practice('swimming', 'exit');
      if (tutorial.view().lessons.combat.practiced && combat.state.phase === 'practice') combat.finishPractice();
    }
    campcraft.update(dt, mode === 'fishing');
    if (tutorial.view().next?.id === 'running' && !paused) {
      const saved = tutorial.snapshot(); mode = 'pause'; for (let f = 0; f < 500; f++) pilot.step(.25);
      assert.deepEqual(tutorial.snapshot(), saved); assert.ok(pilot.active); assert.deepEqual(pilot.move, { forward: 0, side: 0, run: false });
      mode = 'playing'; paused = true;
    }
    if (tutorial.view().next?.id === 'swimming' && !takenOver) {
      const saved = tutorial.snapshot(); pilot.stop('You took control.'); pilot.step(60); assert.deepEqual(tutorial.snapshot(), saved);
      pilot.start(); takenOver = true;
    }
  }
  assert.equal(tutorial.view().completed, true, JSON.stringify({ reason: pilot.reason, intent: pilot.intent, position, tutorial: tutorial.view(), dialogue, inputActions }));
  assert.equal(pilot.active, false); assert.equal(events.at(-1).completed, true);
  assert.deepEqual([...lessonIds], ['inventory', 'walking', 'running', 'combat', 'cartography', 'swimming', 'fishing', 'cooking']);
  assert.equal(inventory.count('tutorial-letter'), 1); assert.equal(inventory.count('jojo-sandwich'), 1);
  assert.equal(inventory.count('raw-fish'), 0); assert.equal(inventory.count('cooked-fish'), 1);
  assert.equal(campcraft.state.catches, 1); assert.ok(traveled > 150 && swimmingDistance > 10);
  assert.ok(inputActions.includes('attack') && inputActions.includes('dodge'));
  assert.ok(paused && takenOver); assert.equal(events.filter(e => e.type === 'tutorial-signoff').length, 1);
});

test('a disabled lesson reply or hostile encounter returns control without granting completion', () => {
  for (const danger of [false, true]) {
    const tutorial = createPeninsulaTutorial(); tutorial.choose('tutorial');
    const state = { mode: danger ? 'playing' : 'dialogue', position: A.arrival, tutorial: tutorial.view(),
      combat: { hp: 100, phase: danger ? 'active' : 'peaceful' },
      dialogue: { npcId: 'harbormaster', choices: [{ id: 'peninsula-inventory', enabled: false }] } };
    const actions = [], pilot = createPeninsulaAutopilot({ world: terrain(), read: () => state, act: { choose: a => actions.push(a) } });
    pilot.start(); for (let i = 0; i < 12; i++) pilot.step(.25);
    assert.equal(pilot.active, false); assert.deepEqual(actions, []); assert.equal(tutorial.view().completed, false);
  }
});
