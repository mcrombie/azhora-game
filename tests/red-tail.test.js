import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { RED_TAIL, createHawkFlight } from '../src/hawk-flight.js';
import { BIRD_WATCHER, RED_TAIL_LINES, birdWatcherConversation } from '../src/birding.js';
import { createLakota } from '../src/lakota.js';

const sequence = values => { let i = 0; return () => values[i++ % values.length]; };
const anchor = { x: 10, y: 2, z: -5 }, glove = { x: 10.3, y: 3.2, z: -4.7, yaw: .4 };
const fly = (hawk, seconds, env = {}, dt = .1) => { let step; for (let t = 0; t < seconds; t += dt) step = hawk.update(dt, { glove, anchor, ...env }); return step; };

test('Lakota’s red-tail rides his glove, goes up to circle the green, and glides back down to his fist', () => {
  const hawk = createHawkFlight({ random: sequence([.5]) });
  let step = fly(hawk, 5);
  assert.equal(step.wings, 'perched');
  assert.deepEqual([step.x, step.y, step.z], [glove.x, glove.y, glove.z], 'on the glove');
  assert.equal(step.yaw, glove.yaw, 'facing the way Lakota faces');
  step = fly(hawk, RED_TAIL.perch[1]);
  assert.notEqual(hawk.state.mode, 'perched', 'in time she goes up');
  step = fly(hawk, RED_TAIL.launch + 1);
  assert.equal(hawk.state.mode, 'soaring');
  const heights = [], radii = [];
  for (let i = 0; i < 100; i++) { step = fly(hawk, .2); heights.push(step.y - anchor.y); radii.push(Math.hypot(step.x - anchor.x, step.z - anchor.z)); }
  assert.ok(Math.min(...heights) > RED_TAIL.height[0] - 2 && Math.max(...heights) < RED_TAIL.height[1] + 2, 'she circles high over the green');
  assert.ok(Math.min(...radii) > RED_TAIL.radius[0] - .1 && Math.max(...radii) < RED_TAIL.radius[1] + .1, 'round Lakota, not off across the country');
  for (let i = 0; i < 700 && !hawk.perched; i++) step = fly(hawk, .1);
  assert.equal(step.wings, 'perched', 'and comes back to the fist');
  assert.deepEqual([step.x, step.y, step.z], [glove.x, glove.y, glove.z]);
  assert.equal(hawk.state.flights, 1);
});

test('while the traveler talks with Lakota she comes in early and stays on the glove', () => {
  const hawk = createHawkFlight({ random: sequence([.5]) });
  fly(hawk, RED_TAIL.perch[1] + RED_TAIL.launch + 2);
  assert.equal(hawk.state.mode, 'soaring');
  const step = fly(hawk, RED_TAIL.landing + .5, { called: true });
  assert.equal(step.wings, 'perched');
  fly(hawk, 120, { called: true });
  assert.equal(hawk.perched, true, 'she does not leave mid-conversation');
  assert.equal(hawk.update(NaN, { glove, anchor }).wings, 'perched', 'and bad time is ignored');
});

test('the hawk is a half-metre raptor with a red tail, folded on the fist and a metre and more across in the air', async () => {
  const { createRedTailHawk } = await sourceModule('../src/lakota-hawk.js');
  const hawk = createRedTailHawk();
  for (const name of ['Hawk body', 'Hawk head', 'Hawk tail', 'Hawk left wing', 'Hawk right wing', 'Hawk legs']) assert.ok(hawk.group.getObjectByName(name), name);
  const span = () => { hawk.group.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(hawk.group); return b.max.x - b.min.x; };
  hawk.pose({ x: 0, y: 0, z: 0, yaw: 0, wings: 'perched' });
  assert.ok(span() < .45, `folded on the fist (${span().toFixed(2)} m)`);
  hawk.pose({ x: 0, y: 0, z: 0, yaw: 0, bank: .3, wings: 'soaring' }, 1);
  assert.ok(span() > 1.05 && span() < 1.5, `wings out (${span().toFixed(2)} m)`);
  assert.equal(hawk.group.getObjectByName('Hawk legs').visible, false, 'feet tucked in flight');
});

test('Lakota is drawn from the sketch, holds his fist up for her, and talks about her', async () => {
  const { createCharacter } = await sourceModule('../src/characters.js');
  const lakota = createCharacter({ role: BIRD_WATCHER.modelRole, tunic: BIRD_WATCHER.color });
  const wristHeight = pose => {
    for (let i = 0; i < 90; i++) lakota.animate(i / 30, 0, true, pose);
    lakota.group.updateMatrixWorld(true);
    return lakota.group.getObjectByName('Left Wrist').getWorldPosition(new THREE.Vector3()).y;
  };
  const down = wristHeight({}), up = wristHeight({ falconer: true });
  assert.ok(up > down + .15 && up > 1, `the gloved fist comes up for the hawk (${down.toFixed(2)} to ${up.toFixed(2)} m)`);
  assert.equal(BIRD_WATCHER.color, 0xe4d8bd, 'the cream shirt of the sketch');
  let opened = null;
  const birding = { met: true, hasSeen: () => false, feeder: 'none' }, known = createLakota();
  known.know();
  birdWatcherConversation({ id: BIRD_WATCHER.id }, { birding, lakota: known, openDialogue: (npc, lines, event, action, options) => { opened = options; }, closeDialogue() {}, act() {} });
  const ask = opened.choices.find(choice => choice.id === 'ask-hawk');
  assert.ok(ask, 'you can ask about the hawk');
  assert.ok(RED_TAIL_LINES.some(line => /brick red/.test(line)) && RED_TAIL_LINES.some(line => /scream/.test(line)));
});
