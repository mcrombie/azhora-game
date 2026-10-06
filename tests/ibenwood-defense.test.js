import test from 'node:test';
import assert from 'node:assert/strict';
import { createIbenwoodDefense, validateIbenwoodDefenseSnapshot, IBENWOOD_DEFENSE as C } from '../src/content/regions/ibenwood/ibenwood-defense.js';

const post = (extra = {}) => ({ id: 'ibenwood-ranger-0', x: 0, z: 0, yaw: 0, patrol: [], ...extra });
const point = (x = 0, z = 12) => ({ x, y: 5, z });
function fixture(options = {}) {
  const shots = [], practice = [], posts = options.posts ?? [post()];
  const defense = createIbenwoodDefense({ posts, inside: x => x >= 0, groundAt: () => 5,
    onShot: shot => shots.push(shot), onPractice: xp => practice.push(xp), ...options });
  return { defense, shots, practice, posts };
}
function advance(defense, frames, input = {}) {
  let view;
  for (let i = 0; i < frames; i++) view = defense.update(.1, { position: point(), ...input });
  return view;
}

test('crossing the boundary needs actual detection and a full draw tell before the first lethal shot', () => {
  const { defense, shots } = fixture();
  const outside = advance(defense, 100, { position: point(-.1) });
  assert.equal(outside.inside, false); assert.equal(outside.suspicion, 0); assert.equal(shots.length, 0);
  const noticing = advance(defense, 9);
  assert.ok(noticing.visible && noticing.suspicion > .9 && !noticing.detected);
  assert.equal(shots.length, 0);
  const detected = advance(defense, 1);
  assert.equal(detected.detected, true); assert.equal(detected.caught, true);
  assert.equal(detected.actors[0].drawing, false, 'detection itself does not fire or consume the draw tell');
  const drawing = advance(defense, 6);
  assert.ok(drawing.actors[0].drawing && drawing.actors[0].draw > .8);
  assert.equal(shots.length, 0);
  advance(defense, 1);
  assert.equal(shots.length, 1); assert.equal(shots[0].damage, 70);
  assert.deepEqual(shots[0].origin, { x: 0, y: 6.5, z: 0 });
  assert.deepEqual(shots[0].target, { x: 0, y: 6, z: 12 });
  assert.equal(shots[0].rangerId, 'ibenwood-ranger-0');
  advance(defense, 20); assert.equal(shots.length, 1, 'cooldown does not release an instant second shot');
  advance(defense, 8); assert.equal(shots.length, 2);
});

test('cover blocks awareness and interrupts the full draw rather than queuing a shot through it', () => {
  let clear = false;
  const { defense, shots } = fixture({ lineClear: () => clear });
  assert.equal(advance(defense, 100).suspicion, 0);
  assert.equal(defense.view().danger, false); assert.equal(shots.length, 0);
  clear = true; advance(defense, 15);
  assert.equal(defense.view().actors[0].drawing, true);
  clear = false; advance(defense, 1);
  assert.equal(defense.view().visible, false); assert.equal(defense.view().actors[0].drawing, false);
  assert.equal(shots.length, 0);
  clear = true; advance(defense, 6);
  assert.equal(shots.length, 0, 'reappearing starts the tell again');
  advance(defense, 1); assert.equal(shots.length, 1);
});

test('sight uses real facing and range, and an alerted ranger does not alert an unseen neighbour', () => {
  const { defense, shots } = fixture({ posts: [post(), post({ id: 'ibenwood-ranger-1', yaw: Math.PI }),
    post({ id: 'ibenwood-ranger-2', x: 400 })] });
  const view = advance(defense, 30);
  assert.equal(view.actors.length, 2, 'only nearby actors are exposed');
  const front = view.actors.find(actor => actor.id === 'ibenwood-ranger-0');
  const back = view.actors.find(actor => actor.id === 'ibenwood-ranger-1');
  assert.equal(front.detected, true); assert.equal(back.suspicion, 0); assert.equal(back.detected, false);
  assert.ok(shots.length > 0 && shots.every(shot => shot.id === front.id));
  defense.reset();
  assert.equal(advance(defense, 40, { position: point(0, C.visionRange + 1) }).visible, false);
  assert.equal(defense.view().suspicion, 0);
});

test('nearby patrols move on actual ground, obey movement clearance, and freeze when distant or paused', () => {
  const { defense } = fixture({ posts: [post({ patrol: [{ x: 10, z: 0 }, { x: 0, z: 0 }] })],
    groundAt: (x, z) => 5 + x * .2 + z * .1, canMove: (_from, to) => to.x <= 2 });
  let view = advance(defense, 10, { position: point(-1, 30) });
  assert.ok(view.actors[0].x > 1 && view.actors[0].x < 2);
  assert.equal(view.actors[0].y, 5 + view.actors[0].x * .2);
  assert.equal(view.actors[0].yaw, Math.PI / 2);
  for (let i = 0; i < 80; i++) {
    view = advance(defense, 1, { position: point(-1, 30) });
    assert.ok(view.actors[0].x <= 2 && view.actors[0].x >= 0, 'blocked route never teleports through the obstruction');
  }
  const saved = defense.snapshot();
  advance(defense, 100, { position: point(500, 500) });
  assert.deepEqual(defense.snapshot(), saved); assert.deepEqual(defense.view().actors, []);
  advance(defense, 100, { position: point(-1, 30), paused: true });
  assert.deepEqual(defense.snapshot(), saved);
  assert.equal(defense.view().moving, false);
});

test('exceptional taught sneaking can pass a real moving patrol, but lingering remains visible and lethal', () => {
  function crossing(level, taught = true) {
    const run = fixture({ posts: [post({ x: -8, patrol: [{ x: 8, z: 0 }, { x: -8, z: 0 }] })] });
    const startX = run.defense.snapshot().actors[0][2];
    let detected = false, exposure = 0;
    for (let i = 0; i <= 94; i++) {
      const view = run.defense.update(.1, { position: point(4, 14 - i * .3), sneaking: true, taught, stealthLevel: level });
      detected ||= view.detected; exposure += Number(view.visible);
    }
    return { ...run, detected, exposure, distanceWalked: run.defense.snapshot().actors[0][2] - startX };
  }
  const expert = crossing(99), beginner = crossing(1), untrained = crossing(99, false);
  assert.ok(expert.exposure > 20, 'the successful route includes actual sightline exposure');
  assert.ok(expert.distanceWalked > 8, 'the patrol is physically moving during the crossing');
  assert.equal(expert.detected, false); assert.equal(expert.shots.length, 0);
  assert.ok(expert.practice.reduce((sum, xp) => sum + xp, 0) > 0);
  assert.equal(beginner.detected, true); assert.ok(beginner.shots.length > 0);
  assert.equal(untrained.detected, true); assert.ok(untrained.shots.length > 0);
  const linger = fixture();
  const view = advance(linger.defense, 130, { sneaking: true, taught: true, stealthLevel: 99 });
  assert.equal(view.detected, true); assert.ok(linger.shots.length > 0, 'skill never grants invisibility');
});

test('retreat, permission and disabled travel cancel threats while pause freezes an ongoing draw', () => {
  const { defense, shots } = fixture();
  advance(defense, 15);
  const before = defense.snapshot();
  advance(defense, 100, { paused: true });
  assert.deepEqual(defense.snapshot(), before); assert.equal(shots.length, 0);
  const retreat = advance(defense, 1, { position: point(-.1) });
  assert.equal(retreat.inside, false); assert.equal(retreat.detected, false);
  assert.equal(retreat.actors[0].drawing, false); assert.equal(shots.length, 0);
  advance(defense, 100, { position: point(-.1) }); assert.equal(shots.length, 0);
  advance(defense, 100, { permitted: true });
  assert.equal(defense.view().permitted, true); assert.equal(defense.view().suspicion, 0); assert.equal(shots.length, 0);
  advance(defense, 15);
  assert.equal(defense.view().actors[0].drawing, true);
  advance(defense, 100, { disabled: true });
  assert.equal(defense.view().suspicion, 0); assert.equal(defense.view().actors[0].drawing, false); assert.equal(shots.length, 0);
});

test('combat can kill a ranger, and reset, leaving the area and legacy restore never respawn him', () => {
  const { defense, shots, posts } = fixture();
  advance(defense, 15);
  assert.deepEqual(defense.damage(posts[0].id, 70), { ok: true, id: posts[0].id, damage: 70, hp: 110, maxHp: 180, killed: false });
  assert.equal(defense.damage(posts[0].id, 200).killed, true);
  for (const [id, amount] of [[posts[0].id, 1], ['invented', 1], [posts[0].id, -4], [posts[0].id, Infinity]]) {
    assert.equal(defense.damage(id, amount).ok, false);
  }
  advance(defense, 100); assert.equal(shots.length, 0);
  const saved = defense.snapshot();
  assert.equal(validateIbenwoodDefenseSnapshot(saved, posts), true);
  defense.reset(); advance(defense, 100, { position: point(500, 500) });
  assert.equal(defense.restore(undefined), true);
  assert.equal(advance(defense, 100).actors[0].alive, false);
  assert.equal(defense.snapshot().actors[0][1], 0); assert.equal(shots.length, 0);
  const reloaded = fixture({ posts });
  assert.equal(reloaded.defense.restore(saved), true);
  assert.equal(advance(reloaded.defense, 100).actors[0].hp, 0); assert.equal(reloaded.shots.length, 0);
  defense.reset({ fresh: true });
  assert.equal(advance(defense, 1).actors[0].hp, 180, 'only an explicit fresh reset revives the post');
});

test('bounded compact snapshots preserve patrol, health and awareness and reject invalid rows atomically', () => {
  const posts = [post({ patrol: [{ x: 10, z: 0 }, { x: 0, z: 0 }] }), post({ id: 'ibenwood-ranger-1', x: 30 })];
  const { defense } = fixture({ posts });
  advance(defense, 12, { position: point(8, 3) }); defense.damage(posts[0].id, 25);
  const saved = defense.snapshot(), reloaded = fixture({ posts });
  assert.equal(validateIbenwoodDefenseSnapshot(saved, posts), true);
  assert.equal(validateIbenwoodDefenseSnapshot(saved), false, 'known posts are required');
  assert.equal(validateIbenwoodDefenseSnapshot(undefined), true);
  assert.equal(reloaded.defense.restore(saved), true); assert.deepEqual(reloaded.defense.snapshot(), saved);
  for (const [index, value] of [[0, 'ibenwood-ranger-999'], [1, 181], [2, 100000], [4, Infinity],
    [5, 2], [6, 1.1], [7, true], [8, .71], [9, 2.1], [10, 1]]) {
    const invalid = structuredClone(saved); invalid.actors[0][index] = value;
    assert.equal(validateIbenwoodDefenseSnapshot(invalid, posts), false, `field ${index}`);
    assert.equal(reloaded.defense.restore(invalid), false); assert.deepEqual(reloaded.defense.snapshot(), saved);
  }
  for (const invalid of [{ ...saved, version: 2 }, { ...saved, actors: [saved.actors[0], saved.actors[0]] },
    { ...saved, actors: [saved.actors[0].slice(0, -1)] }]) assert.equal(reloaded.defense.restore(invalid), false);
  const shiftedPosts = posts.map(p => ({ ...p, x: p.x + 8, z: p.z + 8, patrol: p.patrol.map(t => ({ x: t.x + 8, z: t.z + 8 })) }));
  assert.equal(validateIbenwoodDefenseSnapshot(fixture({ posts: shiftedPosts }).defense.snapshot(), posts), true,
    'authored validator allows the host to shift posts onto clear ground');
  const largePosts = Array.from({ length: 90 }, (_, i) => post({ id: `ibenwood-ranger-${i}`, x: -3500 + i * 21.41234, z: 587.81327 }));
  const large = fixture({ posts: largePosts }).defense.snapshot();
  assert.ok(Buffer.byteLength(JSON.stringify(large)) < 12000);
  assert.equal(validateIbenwoodDefenseSnapshot(large, largePosts), true);
  assert.throws(() => createIbenwoodDefense({ posts: [...largePosts, post({ id: 'ibenwood-ranger-90' })] }));
});

test('practice rewards only ordinary taught movement near danger, with no pause, teleport or stationary farming', () => {
  const { defense, practice, shots } = fixture({ inside: () => true });
  const input = { sneaking: true, taught: true, stealthLevel: 99 };
  defense.update(.1, { ...input, position: point(-2, -8) });
  for (let i = 1; i <= 20; i++) defense.update(.1, { ...input, position: point(-2 + i * .2, -8) });
  assert.equal(practice.reduce((sum, xp) => sum + xp, 0), Math.floor(4 * C.xpPerMetre));
  assert.equal(shots.length, 0);
  const count = practice.length;
  advance(defense, 50, { ...input, position: point(2, -8) });
  defense.update(.1, { ...input, position: point(2.1, -8), paused: true });
  defense.update(5, { ...input, position: point(2.2, -8) });
  defense.update(0, { ...input, position: point(2.3, -8) });
  defense.update(.1, { ...input, position: point(8, -8) });
  defense.update(.1, { ...input, position: point(8.1, -8), taught: false });
  defense.update(.1, { ...input, position: point(8.2, -8), disabled: true });
  assert.equal(practice.length, count);
  const view = defense.view(); view.actors[0].hp = 0;
  assert.equal(defense.view().actors[0].hp, 180, 'returned actors are detached copies');
});

test('nearby footfall can turn one ranger, while skilled sneaking reduces that audible range', () => {
  function behind(level, clear = true) {
    const run = fixture({ inside: () => true, lineClear: () => clear });
    const input = { sneaking: true, taught: true, stealthLevel: level };
    run.defense.update(.1, { ...input, position: point(0, -3) });
    for (let i = 1; i <= 10; i++) run.defense.update(.1, { ...input, position: point(i * .1, -3) });
    return run.defense.view();
  }
  const novice = behind(1), expert = behind(99), behindCover = behind(1, false);
  assert.equal(novice.visible, true); assert.ok(novice.suspicion > .3);
  assert.ok(novice.actors[0].yaw > 2, 'ranger faces the nearby footfall before seeing the player');
  assert.equal(expert.visible, false); assert.equal(expert.suspicion, 0); assert.equal(expert.actors[0].yaw, 0);
  assert.equal(behindCover.visible, false); assert.equal(behindCover.suspicion, 0);
});
