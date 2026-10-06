import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';
import { MICHAEL, AVA, ELLE, CIRCUS_BEARS, CIRCUS_ACTS, CIRCUS_LOOKS, CIRCUS_CAMP, CIRCUS_FILE, CIRCUS_LINES,
  circusConversation, circusPerforming } from '../src/content/quests/bear-family/bear-circus.js';
import { createBearFamily, validateBearFamilySnapshot } from '../src/content/quests/bear-family/bear-family.js';
import { createKaylaHost } from '../src/content/quests/kayla/kayla-host.js';
import { KAYLA, KAYLA_LINES, kaylaConversation, createKayla, kaylaMaySwim } from '../src/content/quests/kayla/kayla.js';
import { KAYLA_RACE_LANE } from '../src/content/quests/kayla/kayla-race.js';
import { CUB, CUB_STAND } from '../src/content/quests/bear-family/cub-honey-quest.js';
import { canStand, canSwim } from '../src/gameplay/movement/game-state.js';

const { createCircusBear, createKaylaBear, CIRCUS_BEAR_LOOKS } = await sourceModule('../src/content/quests/kayla/kayla-character.js');
const world = await scopedWorld(new THREE.Scene(), [1, 2, 6]);
world.setJourneySiteState('bridge-repair', false);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('Kayla’s family is a circus: Michael her husband, Ava and Elle her daughters, and Bodhi, each with an act', () => {
  assert.deepEqual(CIRCUS_BEARS.map(bear => bear.name), ['Michael', 'Ava', 'Elle']);
  assert.match(MICHAEL.role, /Kayla’s husband/); assert.match(MICHAEL.role, /Ringmaster/);
  for (const daughter of [AVA, ELLE]) assert.match(daughter.role, /Kayla’s daughter/);
  assert.deepEqual(CIRCUS_ACTS, { kayla: 'lift', 'kayla-michael': 'juggle', 'kayla-ava': 'ball', 'kayla-elle': 'dance', 'kayla-cub': 'tumble' });
  for (const id of Object.keys(CIRCUS_ACTS)) assert.equal(CIRCUS_BEAR_LOOKS[CIRCUS_LOOKS[id]].act, CIRCUS_ACTS[id], `${id} is drawn doing its own act`);
  assert.match(KAYLA.role, /circus/);
  assert.match(KAYLA_LINES.circus, /Michael/); assert.match(KAYLA_LINES.circus, /Ava/); assert.match(KAYLA_LINES.circus, /Elle/);
  assert.match(KAYLA_LINES.circus, /husband/); assert.match(KAYLA_LINES.circus, /daughters/);
  assert.deepEqual([...CIRCUS_FILE].sort(), [CUB.id, ...CIRCUS_BEARS.map(bear => bear.id)].sort(), 'everybody walks in the file');
  // Kayla herself is asked about it.
  const dialogs = [], kayla = createKayla();
  kaylaConversation(KAYLA, { kayla, openDialogue: (npc, lines, event, label, options) => dialogs.push({ lines, ...options }), closeDialogue() {} });
  dialogs.at(-1).choices.find(choice => choice.id === 'kayla-circus').action();
  assert.match(dialogs.at(-1).lines.join(' '), /ringmaster/);
});

test('the camp stands on open grass by Bodhi, clear of the road, the river and each other', () => {
  const spots = Object.entries(CIRCUS_CAMP);
  assert.deepEqual(spots.map(([id]) => id), CIRCUS_BEARS.map(bear => bear.id));
  for (const [id, spot] of spots) {
    const bear = CIRCUS_BEARS.find(one => one.id === id);
    assert.ok(canStand(spot.x, spot.z, world, bear.radius), `${id} can stand in camp`);
    assert.ok(!(world.waterAt?.(spot.x, spot.z) > world.heightAt(spot.x, spot.z)), `${id} is not in the river`);
    assert.ok(gap(spot, CUB_STAND) > 5 && gap(spot, CUB_STAND) < 16, `${id} camps near Bodhi`);
    for (const [other, at] of spots) if (other !== id) assert.ok(gap(spot, at) > 3.5, `${id} has room to perform beside ${other}`);
  }
});

test('Michael, Ava and Elle talk about the show, and Michael knows where Kayla is', () => {
  for (const bear of CIRCUS_BEARS) {
    const dialogs = []; let closed = 0, near = false;
    const context = { openDialogue: (npc, lines, event, label, options) => dialogs.push({ lines, ...options }), closeDialogue: () => closed++, kaylaNear: () => near };
    assert.equal(circusConversation({ id: 'somebody-else' }, context), false);
    assert.equal(circusConversation(bear, context), true);
    const choices = dialogs.at(-1).choices;
    assert.ok(choices.length >= 3);
    for (const choice of choices.filter(one => one.id !== 'leave-circus')) {
      choice.action(); assert.ok(dialogs.at(-1).lines.join(' ').length > 40, `${bear.name}: ${choice.id}`);
      assert.equal(typeof dialogs.at(-1).onComplete, 'function', 'and back to the rest of the conversation');
    }
    if (bear === MICHAEL) {
      const where = choices.find(one => one.id === 'circus-kayla');
      where.action(); assert.deepEqual(dialogs.at(-1).lines, [...CIRCUS_LINES.michael.away]);
      near = true; where.action(); assert.deepEqual(dialogs.at(-1).lines, [...CIRCUS_LINES.michael.near]);
    }
    choices.find(one => one.id === 'leave-circus').action(); assert.equal(closed, 1);
  }
  assert.equal(circusPerforming(3), true); assert.equal(circusPerforming(18), false); assert.equal(circusPerforming(22 + 3), true);
  assert.equal(circusPerforming(NaN), false);
});

function run(actor, seconds, pose, speed = 0, from = 0) {
  for (let f = 0; f <= seconds * 60; f++) actor.animate(from + f / 60, speed, true, pose);
  actor.group.updateMatrixWorld(true);
  return from + seconds;
}
const world_ = (object, name) => object.getObjectByName(name).getWorldPosition(new THREE.Vector3());
const hindPaws = actor => ['Left Hind Paw', 'Right Hind Paw'].map(name => world_(actor.group, name));
const forePaws = actor => ['Left Fore Paw', 'Right Fore Paw'].map(name => world_(actor.group, name));

test('every bear performs its own act with its own props, and only while standing still and not talking', () => {
  for (const look of Object.keys(CIRCUS_BEAR_LOOKS)) {
    const bear = createCircusBear(look), act = CIRCUS_BEAR_LOOKS[look].act, pose = { act };
    let draws = 0; bear.group.traverse(object => { if (object.isMesh) draws++; });
    assert.ok(draws <= 21, `${look}: the costume is sewn into the fur batches (${draws} draws)`);
    const standing = world_(bear.group, 'Head').y;
    let t = run(bear, 3, pose);
    assert.ok(bear.performance() > .99, `${look} is into the act`);
    bear.group.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite), `${look}: ${object.name}`));
    const head = world_(bear.group, 'Head').y, props = [];
    bear.group.traverse(object => { if (/Circus barbell|Juggling ball|Circus ball$/.test(object.name)) props.push(object); });
    if (['lift', 'juggle', 'dance'].includes(act)) {
      assert.ok(head > standing + .3 * CIRCUS_BEAR_LOOKS[look].size, `${look} rears up on the hind paws (${standing.toFixed(2)} to ${head.toFixed(2)})`);
      for (const paw of hindPaws(bear)) assert.ok(paw.y < .22, `${look}'s hind paws stay on the ground (${paw.y.toFixed(2)})`);
      assert.ok(Math.min(...forePaws(bear).map(paw => paw.y)) > .6, `${look}'s front paws are up`);
    }
    if (act === 'lift') {
      const bar = bear.group.getObjectByName('Circus barbell');
      assert.equal(bar.visible, true);
      let highest = 0; for (let f = 0; f < 160; f++) { t += 1 / 60; bear.animate(t, 0, true, pose); bear.group.updateMatrixWorld(true); highest = Math.max(highest, bar.getWorldPosition(new THREE.Vector3()).y); }
      assert.ok(highest > head, `Kayla presses the bar over her head (${highest.toFixed(2)} over ${head.toFixed(2)})`);
    }
    if (act === 'juggle') {
      const balls = props.filter(object => object.name === 'Juggling ball');
      assert.equal(balls.length, 3); assert.ok(balls.every(ball => ball.visible));
      const heights = balls.map(ball => ball.getWorldPosition(new THREE.Vector3()).y);
      assert.ok(Math.max(...heights) - Math.min(...heights) > .05, 'the three balls are at different points of the throw');
    }
    if (act === 'ball') {
      const ball = bear.group.getObjectByName('Circus ball');
      assert.equal(ball.visible, true);
      const top = ball.getWorldPosition(new THREE.Vector3()).y * 2;
      for (const paw of [...forePaws(bear), ...hindPaws(bear)]) assert.ok(paw.y > top * .75, `Ava's paws are up on the ball (${paw.y.toFixed(2)}, top ${top.toFixed(2)})`);
    }
    if (act === 'tumble') {
      let turned = 0;
      for (let f = 0; f < 200; f++) { t += 1 / 60; bear.animate(t, 0, true, pose); turned = Math.max(turned, Math.abs(bear.group.getObjectByName('Weight and hips').rotation.x)); }
      assert.ok(turned > 2.5, `Bodhi rolls right over (${turned.toFixed(2)})`);
    }
    // Asked to talk, or to walk, the act is put down and the props with it.
    t = run(bear, 3, { ...pose, conversing: true }, 0, t + 1 / 60);
    assert.equal(bear.performance(), 0, `${look} stops to talk`);
    assert.ok(props.every(prop => !prop.visible));
    assert.ok(Math.abs(world_(bear.group, 'Head').y - standing) < .12, `${look} is back on four feet`);
    run(bear, 2, pose, 0, t + 1 / 60); assert.ok(bear.performance() > .9);
    run(bear, 3, pose, 1.8, t + 2 + 1 / 60); assert.equal(bear.performance(), 0, `${look} does not perform on the move`);
  }
  // Without a look, Kayla and her cub are exactly the bears they were.
  assert.equal(createKaylaBear().act, null);
  assert.equal(createKaylaBear().group.name, 'Kayla the bear'); assert.equal(createCircusBear('kayla').group.name, 'Kayla the bear');
  assert.equal(createCircusBear('bodhi').group.name, 'Kayla’s cub');
  assert.throws(() => createCircusBear('nobody'));
});

const actor = () => ({ group: { position: new THREE.Vector3(), rotation: { y: 0 } } });
function fixture() {
  let race = false, lesson = false, family;
  const dead = new Set();
  const npc = { ...KAYLA, actor: actor() }, cub = { ...CUB, actor: actor() };
  const members = CIRCUS_BEARS.map(bear => ({ ...bear, actor: actor() }));
  const all = [npc, cub, ...members];
  const bodies = () => all.filter(one => !dead.has(one.id)).map(one => ({ id: one.id, x: one.actor.group.position.x, z: one.actor.group.position.z, r: one === npc ? .8 : one.radius }));
  const kayla = createKaylaHost({ npc, world, bodies, roaming: () => family?.motherMayRoam ?? false,
    crime: { health: () => ({ hp: 450, maxHp: 450, status: 'alive' }), isDown: id => dead.has(id) },
    combat: { state: { phase: 'peaceful', enemies: [], player: { hp: 100 } } }, playerPosition: () => ({ x: 0, z: 0 }) });
  kayla.placeExternal(KAYLA_RACE_LANE.at(-1));
  family = createBearFamily({ world, kayla, kaylaNpc: npc, cub, members, bodies, raceComplete: () => race, cubComplete: () => lesson,
    alive: id => !dead.has(id) });
  return { npc, cub, members, kayla, family, dead, all,
    step(dt = .1) { kayla.frame(dt, { playing: true }); family.frame(dt, { playing: true }); },
    reunite() { race = true; lesson = true; for (let i = 0; i < 20000 && family.phase !== 'roaming'; i++) this.step(); },
  };
}

test('until the reunion the rest of the circus waits in camp by Bodhi, practising', () => {
  const f = fixture();
  for (const member of f.members) assert.ok(gap(member.actor.group.position, CIRCUS_CAMP[member.id]) < 1e-9, `${member.name} is in camp`);
  for (let i = 0; i < 40; i++) f.step();
  for (const bear of [f.cub, ...f.members]) assert.equal(bear.kaylaPose?.act, CIRCUS_ACTS[bear.id], `${bear.name} practises in camp`);
  assert.equal(f.npc.kaylaPose?.act, undefined, 'Kayla is away at Ambron and does not perform there');
  for (let i = 0; i < 150; i++) f.step();
  assert.ok(!circusPerforming(19), 'the show rests part of the time');
  assert.equal(f.members[0].kaylaPose, undefined, 'and they rest with it');
  for (const member of f.members) assert.ok(gap(member.actor.group.position, CIRCUS_CAMP[member.id]) < 1e-9, `${member.name} never wanders off`);
  f.dead.add(AVA.id); f.step();
  assert.equal(f.members.find(one => one.id === AVA.id).kaylaPose, undefined, 'a dead bear does not perform');
});

test('saves keep where every bear is, and an older save puts the circus in camp', () => {
  const f = fixture(); f.reunite(); for (let i = 0; i < 300; i++) f.step();
  const saved = f.family.snapshot();
  assert.equal(saved.version, 2); assert.deepEqual(Object.keys(saved.family).sort(), CIRCUS_BEARS.map(bear => bear.id).sort());
  assert.equal(validateBearFamilySnapshot(saved), true);
  assert.equal(validateBearFamilySnapshot({ ...saved, family: { stranger: { x: 0, z: 0 } } }), false);
  assert.equal(validateBearFamilySnapshot({ ...saved, family: { [AVA.id]: { x: NaN, z: 0 } } }), false);
  const loaded = fixture(); assert.equal(loaded.family.restore(saved), true);
  assert.deepEqual(loaded.family.snapshot(), saved);
  for (const member of loaded.members) assert.ok(gap(member.actor.group.position, saved.family[member.id]) < 1e-9);
  for (const version of [1, 2]) {
    const invalid = { ...saved, version, family: { [AVA.id]: { x: NaN, z: 0 } } };
    assert.equal(loaded.family.restore(invalid), false);
    assert.deepEqual(loaded.family.snapshot(), saved, 'rejected family data does not move anybody');
  }
  const { family, ...older } = saved;
  assert.equal(loaded.family.restore({ ...older, version: 1 }), true);
  for (const member of loaded.members) assert.ok(gap(member.actor.group.position, CIRCUS_CAMP[member.id]) < 1e-9, `${member.name} is back in camp`);
});

test('after the reunion all five walk Kayla’s honey rounds in one file, solid, and put on the show at her stops', t => {
  const f = fixture(); f.reunite();
  assert.equal(f.family.phase, 'roaming');
  const radius = one => one === f.npc ? .8 : one.radius;
  // They walk over from camp to fall in behind her first; Kayla waits for that before she sets off.
  let frames = 0, shows = 0, widest = 0, formed = false; const regions = new Set(), stops = new Set();
  for (; frames < 60000 && f.kayla.model.state().loops < 1; frames++) {
    const before = f.all.map(one => one.actor.group.position.clone());
    f.step();
    f.all.forEach((one, i) => {
      const at = one.actor.group.position;
      assert.ok(gap(before[i], at) <= .32, `${one.name} never skips forward`);
      assert.ok(canStand(at.x, at.z, world, radius(one)) || (kaylaMaySwim(at.x, at.z) && canSwim(at.x, at.z, world, radius(one))), `${one.name} at ${at.x.toFixed(1)}, ${at.z.toFixed(1)}`);
      for (const other of f.all.slice(i + 1)) assert.ok(gap(at, other.actor.group.position) >= (radius(one) + radius(other)) * .9, `${one.name} and ${other.name} do not pass through each other`);
    });
    const file = [f.npc, f.cub, ...CIRCUS_FILE.slice(1).map(id => f.members.find(one => one.id === id))];
    formed ||= f.family.motherMayRoam;
    if (formed) for (let i = 1; i < file.length; i++) widest = Math.max(widest, gap(file[i].actor.group.position, file[i - 1].actor.group.position));
    regions.add(world.regionAt(f.npc.actor.group.position.x, f.npc.actor.group.position.z)?.name);
    const state = f.kayla.model.state();
    if (f.npc.kaylaPose?.act === 'lift') {
      shows++; stops.add(state.stop);
      assert.ok(f.members.every(one => one.kaylaPose?.act === CIRCUS_ACTS[one.id]), 'the whole family performs together');
    }
    if (state.walking) assert.ok(f.all.every(one => !one.kaylaPose?.act), 'nobody performs on the move');
  }
  assert.equal(f.kayla.model.state().loops, 1, `the family finished the round (${frames} updates)`);
  for (const name of ['Drent', 'Pueth', 'Luscia']) assert.ok(regions.has(name));
  assert.ok(widest < 9, `nobody straggles (${widest.toFixed(2)} m at most between neighbours)`);
  assert.ok(shows > 0 && stops.size >= 2, `they performed at ${[...stops].join(', ')}`);
  t.diagnostic(`${frames} updates; ${(shows / 10).toFixed(0)} s of shows; widest gap ${widest.toFixed(2)} m.`);
});

test('a bear that dies drops out of the file and the rest close up behind the one ahead', () => {
  const f = fixture(); f.reunite();
  f.dead.add(AVA.id);
  const elle = f.members.find(one => one.id === ELLE.id), ava = f.members.find(one => one.id === AVA.id);
  const avaAt = ava.actor.group.position.clone();
  for (let i = 0; i < 2500; i++) f.step();
  assert.ok(gap(ava.actor.group.position, avaAt) < 1e-9, 'Ava lies where she fell');
  assert.ok(gap(elle.actor.group.position, f.cub.actor.group.position) < 7.5, 'Elle follows Bodhi instead');
  assert.equal(f.family.roaming, true);
});
