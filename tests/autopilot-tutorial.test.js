import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutopilot } from '../src/autopilot.js';
import { createCombat } from '../src/combat.js';
import { BODY, bodyWorld } from '../src/bodies.js';
import { moveCharacter, QUEST_DONE } from '../src/game-state.js';
import { createChartLesson } from '../src/chart-lesson.js';
import { GUARD_SECONDS, lessonStage, instructorConversation } from '../src/instructor.js';

test('autoplay completes real strike, held shield and dodge practice with solid bodies before reading and reporting the chart', () => {
  const position = { x: 0, z: 5 }, training = { x: 0, z: 0 }, instructor = { x: 2.2, z: 0 };
  const base = { bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, colliders: [], heightAt: () => 1.5 };
  const people = [{ id: 'instructor', ...instructor, r: BODY.person }];
  const world = bodyWorld(base).moving(position, BODY.traveler, 'traveler');
  Object.assign(world, { training, npcPositions: { instructor }, paths: [], border: { x: 0, z: -15 } });
  const chart = createChartLesson(), actions = [];
  let hits = 0, guards = 0, dodges = 0, held = 0, questStage = 2, mode = 'playing', mapSeconds = 0;
  const combat = createCombat({ world: base, position, getBodies: () => people, getMargins: () => ({ hasShield: true }),
    onEvent: event => { if (event.type === 'practice-hit') hits++; if (event.type === 'dodge') dodges++; } });
  combat.startPractice(training); combat.setWeaponReady(true);
  const read = () => ({ mode, questStage, lessonSet: true, practiceHits: hits, practiceGuards: guards, practiceDodges: dodges,
    chartLesson: chart.stage, position, weapon: { usable: true }, inventory: {}, journey: { started: false },
    combat: { ...combat.state.player, phase: combat.state.phase, enemies: combat.state.enemies, hasShield: true },
    interaction: { npcId: Math.hypot(position.x - instructor.x, position.z - instructor.z) < 3.3 ? 'instructor' : null } });
  const pilot = createAutopilot({ world, read, act: {
    attack: ({ yaw }) => combat.attack(yaw), dodge: ({ x, z }) => combat.dodge({ x, z }),
    interact: () => instructorConversation({ id: 'instructor' }, {
      stage: lessonStage({ briefed: true, hits, guards, dodges, chartLesson: chart.stage }),
      openDialogue: (_npc, _lines, _event, _label, options) => options?.onComplete?.(),
      giveChart: () => { actions.push('issue'); chart.issue(); },
      report: () => { actions.push('report'); assert.equal(chart.report(), true); questStage = QUEST_DONE; combat.finishPractice(); },
    }),
    'open-chart': () => { actions.push('map'); mode = 'journal'; assert.equal(chart.noteMapOpened(), true); },
    'close-journal': () => { assert.ok(mapSeconds >= 3 - 1e-8, 'The explanation receives its actual reading interval'); mode = 'playing'; },
  } });
  pilot.start();
  for (let frame = 0; frame < 60 * 40 && questStage < QUEST_DONE; frame++) {
    const dt = 1 / 60;
    world.setBodies([...people, ...combat.state.enemies.map(actor => ({ id: actor.id, get x() { return actor.x; }, get z() { return actor.z; }, r: BODY.person }))]);
    if (mode === 'journal') mapSeconds += dt;
    const command = pilot.step(dt);
    assert.ok(command && pilot.active, 'The tutorial must not time out');
    if (mode !== 'playing') { combat.guard(false); continue; }
    if (Number.isFinite(command.yaw)) {
      const move = command.move, speed = (move.run ? 7.2 : 4.2) * combat.movementScale();
      moveCharacter(position, (-Math.sin(command.yaw) * move.forward + Math.cos(command.yaw) * move.side) * speed * dt,
        (-Math.cos(command.yaw) * move.forward - Math.sin(command.yaw) * move.side) * speed * dt, world);
    }
    combat.guard(pilot.guard, Math.PI + (command.yaw ?? 0)); combat.update(dt);
    if (combat.state.player.guarding) { held += dt; if (held >= GUARD_SECONDS) guards = 1; }
    else held = 0;
    for (const body of people) assert.ok(Math.hypot(position.x - body.x, position.z - body.z) >= BODY.person + BODY.traveler - 1e-8);
  }
  assert.equal(questStage, QUEST_DONE, `Stopped at ${pilot.intent}: hits=${hits}, guards=${guards}, dodges=${dodges}`);
  assert.equal(hits, 2); assert.equal(guards, 1); assert.equal(dodges, 1);
  assert.deepEqual(actions, ['issue', 'map', 'report']); assert.equal(chart.stage, 'complete');
});
