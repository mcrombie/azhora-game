import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { INSTRUCTOR, INSTRUCTOR_STAND, LESSON, lessonStage, instructorLines, instructorConversation } from '../src/instructor.js';

/**
 * Officer Glun, who teaches the sword and then hands over the chart (the user, 22 September 2026).
 * The opening used to point a quest card at an unattended straw post and give the traveler
 * Tidehaven's rough chart along with the letter.
 */
test('the lesson is read off the two numbers the save already keeps', () => {
  assert.equal(lessonStage(), 'waiting', 'nobody has spoken to him');
  assert.equal(lessonStage({ briefed: true }), 'set');
  assert.equal(lessonStage({ briefed: true, hits: LESSON.hits, dodges: 0 }), 'set', 'a dodge is half of it');
  assert.equal(lessonStage({ briefed: true, hits: 1, dodges: LESSON.dodges }), 'set', 'and so are the strikes');
  assert.equal(lessonStage({ briefed: true, hits: LESSON.hits, dodges: LESSON.dodges }), 'done');
  // Once the chart is handed over he is finished, whatever the tally says.
  assert.equal(lessonStage({ briefed: true, taught: true }), 'finished');
  assert.equal(lessonStage({ taught: true }), 'finished');
});

test('he says a different thing at each of the four, and the chart comes with the acknowledgment', () => {
  const said = new Map();
  for (const stage of ['waiting', 'set', 'done', 'finished']) {
    const lines = instructorLines(stage);
    assert.ok(lines.length >= 2, `${stage} has something to say`);
    for (const line of lines) assert.ok(line.length > 30, `${stage}: ${line}`);
    said.set(stage, lines.join(' '));
  }
  assert.equal(new Set(said.values()).size, 4, 'two of his four states say the same thing');
  assert.match(said.get('waiting'), /straw post/, 'he sets the lesson');
  assert.match(said.get('done'), /chart/, 'and hands the chart over when it is done');
  assert.match(said.get('done'), /ask/, 'and says the rest of it has to be asked for');

  // The conversation calls `begin` when the lesson is set and `finish` when the chart is given,
  // and nothing at all in between - the host hangs the straw post's tally on those two.
  const calls = [];
  const talk = stage => instructorConversation({ id: INSTRUCTOR.id }, { stage,
    openDialogue: (npc, lines, event, action, options = {}) => options.onComplete?.(),
    begin: () => calls.push('begin'), finish: () => calls.push('finish') });
  talk('waiting'); talk('set'); talk('done'); talk('finished');
  assert.deepEqual(calls, ['begin', 'finish']);
});

test('he is an Ambroni officer with a plume of his own, and stands on ground that holds him', async () => {
  assert.equal(INSTRUCTOR.modelRole, 'legion-officer', 'the same army as every soldier on the road');
  assert.equal(INSTRUCTOR.look.plume, 'white', 'and a drill officer’s white plume, not a commander’s red');
  assert.match(INSTRUCTOR.name, /Glun/);
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const { x, z } = INSTRUCTOR_STAND;
  assert.ok(canStand(x, z, world, .45), 'he is standing in something');
  assert.equal(world.regionAt(x, z)?.name, 'Drent');
  // Beside the straw post, and not in it: close enough to watch, far enough to swing at.
  const post = Math.hypot(world.training.x - x, world.training.z - z);
  assert.ok(post > 1.5 && post < 6, `he is ${post.toFixed(1)} m from the post he is teaching at`);
  // And not standing on anybody else.
  for (const [id, stand] of Object.entries(world.npcPositions)) {
    if (id === INSTRUCTOR.id) continue;
    assert.ok(Math.hypot(stand.x - x, stand.z - z) > 2, `${id} is standing on top of him`);
  }
});
