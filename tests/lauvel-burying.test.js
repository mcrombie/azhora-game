import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { LAUVEL_PEOPLE, LAUVEL_PEOPLE_IDS, LAUVEL_LINES, BURIAL, HEWES_GRAVE, fieldPoint } from '../src/lauvel-aftermath.js';
import { createBurying, validateBuryingSnapshot, selaConversation, workerChoice, SON, HAIL, HAIL_FROM, JOBS, JOB_IDS, JOB_FIRST, JOB_AGAIN, THE_QUESTION, NOTHING_SEEN, OFFER_HELP, THE_GREEN_COAT, TELLING, THE_BURYING, AFTER } from '../src/lauvel-burying.js';

/** Take the quest as far as a stage, the way a traveler would. */
function play(to = 'done') {
  const burying = createBurying();
  if (to === 'unknown') return burying;
  burying.hail(); if (to === 'hailed') return burying;
  burying.ask(); if (to === 'asked') return burying;
  burying.start(); if (to === 'helping') return burying;
  for (let i = 0; i < 4; i++) burying.work('hurdle');
  if (to === 'found') return burying;
  burying.tell(); if (to === 'told') return burying;
  burying.finish();
  return burying;
}

test('she calls out once to whoever comes up the road, and asks about her son', () => {
  const burying = createBurying();
  assert.equal(burying.stage, 'unknown');
  assert.equal(burying.task(), null, 'nothing in the panel until she has spoken');
  assert.equal(burying.hail().ok, true);
  assert.equal(burying.stage, 'hailed');
  assert.equal(burying.hail().ok, false, 'she does not hail the same traveler twice');
  assert.ok(burying.task().detail.includes('asking everybody'));
  // The two marks she gives are the two the field can be searched by.
  const asked = burying.ask();
  assert.equal(asked.ok, true);
  assert.equal(asked.son, SON);
  assert.match(SON.coat, /green/);
  assert.match(SON.hand, /two fingers/);
  assert.ok(HAIL.some(line => line.includes('road')), 'she calls across the field about the road');
  assert.ok(THE_QUESTION.some(line => line.includes('green coat')));
});

test('the traveler can walk into her without the hail, and she asks all the same', () => {
  const burying = createBurying();
  assert.equal(burying.ask().ok, true, 'speaking to her first skips the hail');
  assert.equal(burying.stage, 'asked');
  assert.equal(burying.hail().ok, false, 'and she does not then call after them');
});

test('no work is possible until she has asked for it, and then all three jobs are', () => {
  const burying = play('asked');
  assert.equal(burying.work('spade').ok, false, 'nobody has asked you for anything yet');
  assert.equal(burying.helping, false);
  assert.equal(burying.start().ok, true);
  assert.equal(burying.start().ok, false, 'only once');
  assert.equal(burying.helping, true);
  for (const id of JOB_IDS) {
    const first = burying.work(id);
    assert.equal(first.ok, true, id);
    assert.equal(first.first, true, `${id} is new`);
    assert.equal(burying.hasWorked(id), true);
    assert.equal(burying.work(id).first, false, `${id} can be gone back to`);
  }
  assert.equal(burying.work('fetch-water').ok, false, 'nobody here is doing that');
});

test('the fourth man carried in off the field is the one she is looking for', () => {
  const burying = play('helping');
  // Digging and writing names do not turn him up, however long you do them: he is in the grass.
  for (let i = 0; i < 20; i++) { burying.work('spade'); burying.work('names'); }
  assert.equal(burying.found, false, 'he is not in the row and not on the list');
  for (const [trip, expected] of [[1, false], [2, false], [3, false], [4, true]]) {
    const result = burying.work('hurdle');
    assert.equal(result.found, expected, `trip ${trip}`);
    assert.equal(result.carried, trip);
    assert.equal(result.trips, Math.max(0, 4 - trip), 'the panel can count them down');
  }
  assert.equal(burying.stage, 'found');
  assert.equal(burying.work('hurdle').found, false, 'he is only found once');
  assert.equal(burying.stage, 'found', 'and carrying on does not move her past it');
  // The scene names both marks before anybody says his name.
  assert.ok(THE_GREEN_COAT.some(line => line.includes('green')));
  assert.ok(THE_GREEN_COAT.some(line => /[Tt]wo fingers/.test(line)));
});

test('telling her is the end of it, and comes in that order', () => {
  const burying = play('helping');
  assert.equal(burying.tell().ok, false, 'there is nothing to tell her yet');
  assert.equal(burying.finish().ok, false);
  for (let i = 0; i < 4; i++) burying.work('hurdle');
  assert.equal(burying.finish().ok, false, 'she is told before he is carried');
  assert.equal(burying.tell().ok, true);
  assert.equal(burying.tell().ok, false);
  assert.equal(burying.buried, false);
  assert.equal(burying.finish().ok, true);
  assert.equal(burying.stage, 'done');
  assert.equal(burying.buried, true);
  assert.ok(THE_BURYING.some(line => line.includes(SON.name.toUpperCase())), 'his name is cut into the board');
  assert.equal(burying.task(), null, 'and the panel lets go of it');
});

test('every stage has something for the panel to say, and it changes as the work does', () => {
  const seen = new Set();
  for (const stage of ['hailed', 'asked', 'helping', 'found', 'told']) {
    const task = play(stage).task();
    assert.ok(task?.title && task.detail, stage);
    seen.add(task.detail);
  }
  assert.equal(seen.size, 5, 'the panel does not repeat itself');
  assert.equal(play('unknown').task(), null);
  assert.equal(play('done').task(), null);
  // The count of what has been carried reaches the panel.
  const burying = play('helping');
  burying.work('hurdle'); burying.work('hurdle');
  assert.match(burying.task().detail, /2 carried in/);
});

test('she says one thing before, one thing in the middle of it, and another after', () => {
  const lines = [], opened = [];
  const context = burying => ({ burying, act: () => {}, closeDialogue: () => {},
    openDialogue: (npc, said, _event, action, options = {}) => { opened.push({ npc, action, choices: options.choices ?? [] }); lines.push(...said); } });
  const npc = { id: 'lauvel-seeker', name: 'Sela' };
  assert.equal(selaConversation({ id: 'lauvel-digger' }, context(createBurying())), false, 'she is the only one this speaks for');

  const fresh = createBurying();
  assert.equal(selaConversation(npc, context(fresh)), true);
  assert.equal(fresh.stage, 'asked', 'speaking to her is her asking');
  assert.ok(opened.at(-1).choices.some(choice => choice.label.includes('not seen')));

  for (const stage of ['helping', 'found', 'told', 'done']) {
    opened.length = 0;
    selaConversation(npc, context(play(stage)));
    assert.equal(opened.length, 1, stage);
    assert.ok(opened[0].choices.length >= 1, `${stage} leaves a way on`);
  }
  // Afterward she has more than one thing to say, and rotates through it.
  const done = play('done'), afterwards = new Set();
  for (let visit = 0; visit < AFTER.length; visit++) { opened.length = 0; lines.length = 0; selaConversation(npc, { ...context(done), visits: visit }); afterwards.add(lines.join('')); }
  assert.equal(afterwards.size, AFTER.length);
});

test('the three with work only offer it once the traveler has taken it on', () => {
  const before = createBurying();
  for (const id of LAUVEL_PEOPLE_IDS) assert.equal(workerChoice(id, before, () => {}), null, `${id} asks nobody for anything`);
  const helping = play('helping');
  for (const job of Object.values(JOBS)) {
    const choice = workerChoice(job.who, helping, () => {});
    assert.ok(choice, `${job.who} has ${job.id}`);
    assert.equal(choice.label, job.name);
    helping.work(job.id);
    assert.match(workerChoice(job.who, helping, () => {}).label, /again/, `${job.id} can be done again`);
  }
  assert.equal(workerChoice('lauvel-widow', helping, () => {}), null, 'the widow is not put to work');
  assert.equal(workerChoice('lauvel-seeker', helping, () => {}), null, 'and neither is she');
});

test('the people with jobs are on the field, and their jobs are what they are already doing', () => {
  for (const job of Object.values(JOBS)) {
    const person = LAUVEL_PEOPLE.find(p => p.id === job.who);
    assert.ok(person, `${job.who} is somebody on the field`);
    assert.ok(LAUVEL_LINES[job.who]?.length, `${person.name} already had something to say`);
    assert.ok(JOB_FIRST[job.id].length >= 2 && JOB_AGAIN[job.id].length > 40, `${job.id} is written both ways`);
  }
  assert.equal(JOBS.spade.who, LAUVEL_PEOPLE.find(p => p.digs).id, 'the spade is the gravedigger’s');
  assert.equal(JOBS.hurdle.who, LAUVEL_PEOPLE.find(p => p.bearer === 'front').id, 'the hurdle is the bearers’');
  assert.equal(new Set(Object.values(JOBS).map(job => job.who)).size, 3, 'three jobs, three people');
});

test('nothing she is given to say is empty, and the writing keeps its promises', () => {
  for (const [name, lines] of Object.entries({ HAIL, THE_QUESTION, NOTHING_SEEN, OFFER_HELP, THE_GREEN_COAT, TELLING, THE_BURYING, AFTER }))
    for (const line of lines) assert.ok(typeof line === 'string' && line.trim().length > 30, `${name} has nothing thin in it`);
  // She is sure he is alive when you meet her, and the writing does not let anyone tell her otherwise early.
  assert.ok(THE_QUESTION.some(line => line.includes('he is alive')));
  assert.ok(!HAIL.join(' ').includes(SON.name), 'she does not name him before she is asked');
  // The three people who could have told her are named in what she says about the work.
  for (const who of ['Hewe', 'Dorran', 'Maudry']) assert.ok(OFFER_HELP.join(' ').includes(who), `${who} is named`);
});

test('the burying survives a save, and a broken one is refused', () => {
  for (const stage of ['unknown', 'hailed', 'asked', 'helping', 'found', 'told', 'done']) {
    const burying = play(stage), saved = burying.snapshot();
    assert.equal(validateBuryingSnapshot(saved), true, stage);
    const back = createBurying();
    assert.equal(back.restore(saved), true);
    assert.equal(back.stage, burying.stage);
    assert.equal(back.carried, burying.carried);
    assert.deepEqual(back.snapshot(), saved);
    for (const id of JOB_IDS) assert.equal(back.hasWorked(id), burying.hasWorked(id), `${id} at ${stage}`);
  }
  assert.equal(validateBuryingSnapshot(undefined), true, 'an old checkpoint simply has none');
  for (const bad of [null, 'no', 7, [], { version: 2, stage: 'done', done: [], carried: 0 },
    { version: 1, stage: 'digging', done: [], carried: 0 },
    { version: 1, stage: 'done', done: ['spade', 'spade'], carried: 0 },
    { version: 1, stage: 'done', done: ['shovel'], carried: 0 },
    { version: 1, stage: 'done', done: [], carried: -1 },
    { version: 1, stage: 'done', done: [], carried: 1.5 },
    { version: 1, stage: 'done', done: [], carried: 1e9 }])
    assert.equal(validateBuryingSnapshot(bad), false, JSON.stringify(bad));
  // A restore that fails leaves nothing of the bad save behind.
  const wrecked = play('done');
  assert.equal(wrecked.restore({ version: 1, stage: 'nowhere', done: [], carried: 0 }), false);
  assert.equal(wrecked.stage, 'unknown');
  assert.equal(wrecked.carried, 0);
});

test('she can be heard from the road, and the grave her son goes into is the one being dug', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const scene = new THREE.Scene();
  const world = createWorld(scene);
  const sela = LAUVEL_PEOPLE.find(p => p.id === 'lauvel-seeker');
  assert.equal(HAIL_FROM.x, sela.x);
  assert.equal(HAIL_FROM.z, sela.z);

  // The hail has to catch somebody who keeps to the road, and not fire halfway across Luscia.
  const segments = world.paths.flatMap(path => path.slice(1).map((b, i) => [path[i], b]));
  const onRoad = [];
  for (const [a, b] of segments) {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
    for (let i = 0; i <= steps; i++) onRoad.push({ x: a.x + (b.x - a.x) * i / steps, z: a.z + (b.z - a.z) * i / steps });
  }
  const heard = onRoad.filter(p => Math.hypot(HAIL_FROM.x - p.x, HAIL_FROM.z - p.z) < HAIL_FROM.reach);
  assert.ok(heard.length > 12, 'a traveler who never leaves the road walks through the hail');
  const run = Math.max(...heard.map(a => Math.max(...heard.map(b => Math.hypot(a.x - b.x, a.z - b.z)))));
  assert.ok(run > 25 && run < 90, `the hail covers one stretch of road, not the county (${run.toFixed(1)} m)`);
  const nearestRoad = Math.min(...onRoad.map(p => Math.hypot(HAIL_FROM.x - p.x, HAIL_FROM.z - p.z)));
  assert.ok(nearestRoad < HAIL_FROM.reach - 8, `she is well inside her own reach of the road (${nearestRoad.toFixed(1)} m)`);
  assert.ok(HAIL_FROM.reach > 20 && HAIL_FROM.reach < 45, 'a shout across a field, not across Luscia');

  // Where she stands afterwards, at the head of the grave, with footing and clear of Old Hewe.
  const board = fieldPoint(7.9, 14.5);
  assert.ok(canStand(board.x, board.z, world, .45), 'she has footing at the board');
  const hewe = LAUVEL_PEOPLE.find(p => p.digs);
  assert.ok(Math.hypot(board.x - hewe.x, board.z - hewe.z) > 1.2, 'and is not standing in the gravedigger');

  // The grave that is filled in is an open one, and it is the one the gravedigger is working.
  const grave = BURIAL.graves[HEWES_GRAVE];
  assert.equal(grave.open, true, 'it is open until somebody is put in it');
  const at = fieldPoint(grave.dx, grave.dz);
  assert.ok(Math.hypot(at.x - hewe.x, at.z - hewe.z) < 2, 'Old Hewe is standing in the one his spade is in');
  assert.ok(scene.getObjectByName('The field at the Lauvel, after'), 'the burial ground is built');
  assert.equal(typeof world.lauvelField.setBuried, 'function', 'and the host can fill the grave in');
});
