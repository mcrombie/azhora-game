import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIRD_ON_THE_WING, BIRD_VIEW_HALF_ANGLE, findBird, birdBearing, birdDirection, birdNearness, birdQuarter, birdWords,
} from '../src/bird-finder.js';
import { BIRD_SPECIES, DRENT_BIRDS, observeRange } from '../src/birding.js';

/** A settled bird, as src/drent-birds.js reports one in state().birds. */
const bird = (id, x, z, extra = {}) => ({ id, species: 'wren', variant: 'wren', x, y: 1.2, z, yaw: 0, action: 'peck', perched: false, visible: true, ...extra });
const at = (x, z) => ({ x, z });
/** Facing +Z, which is the world's zero heading: the traveler's right hand is then -X. */
const SOUTH = 0, EAST = Math.PI / 2, NORTH = Math.PI, WEST = -Math.PI / 2;

test('the nearest settled bird within range is the bird, and a tie goes to the earlier one', () => {
  const flock = [bird('far', 0, 14), bird('near', 0, 4), bird('middling', 0, 9)];
  assert.equal(findBird(flock, { position: at(0, 0), range: 18 }).id, 'near');
  // Two birds at exactly the same distance: the list's own order decides, so the
  // answer does not flicker between them frame after frame.
  const tied = [bird('first', 5, 0), bird('second', -5, 0), bird('third', 0, -5)];
  for (let pass = 0; pass < 3; pass++) assert.equal(findBird(tied, { position: at(0, 0), range: 18 }).id, 'first');
  assert.equal(findBird([...tied].reverse(), { position: at(0, 0), range: 18 }).id, 'third');
  assert.equal(findBird(tied, { position: at(0, 0), range: 18 }).choices, 3);
});

test('nothing is found when nothing qualifies, and nonsense is refused rather than guessed at', () => {
  const flock = [bird('yonder', 0, 40), bird('across-the-village', 60, 0)];
  assert.equal(findBird(flock, { position: at(0, 0), range: 18 }), null);
  assert.equal(findBird([], { position: at(0, 0), range: 18 }), null);
  // Exactly at the range is within it; a hand's breadth past it is not.
  assert.equal(findBird([bird('edge', 0, 18)], { position: at(0, 0), range: 18 }).id, 'edge');
  assert.equal(findBird([bird('edge', 0, 18.01)], { position: at(0, 0), range: 18 }), null);
  for (const bad of [null, undefined, 'birds', 42, {}])
    assert.equal(findBird(bad, { position: at(0, 0), range: 18 }), null, String(bad));
  for (const bad of [null, { x: 0 }, { x: NaN, z: 0 }, { x: 0, z: Infinity }])
    assert.equal(findBird([bird('near', 0, 2)], { position: bad, range: 18 }), null);
  for (const bad of [0, -5, NaN])
    assert.equal(findBird([bird('near', 0, 2)], { position: at(0, 0), range: bad }), null, String(bad));
  // No range asked for is the range a beginner has, so the caller need not know one.
  assert.equal(findBird([bird('near', 0, 2)], { position: at(0, 0) }).range, 18);
  // A bird with no position of its own is skipped, not crashed on.
  assert.equal(findBird([{ id: 'ghost', visible: true }, bird('real', 0, 3)], { position: at(0, 0), range: 18 }).id, 'real');
});

test('birds on the wing and birds not out are no use to a pointer', () => {
  const position = at(0, 0);
  for (const action of BIRD_ON_THE_WING)
    assert.equal(findBird([bird('aloft', 0, 2, { action }), bird('settled', 0, 9)], { position, range: 18 }).id, 'settled', action);
  assert.equal(findBird([bird('hidden', 0, 2, { visible: false }), bird('settled', 0, 9)], { position, range: 18 }).id, 'settled');
  assert.equal(findBird([bird('aloft', 0, 2, { action: 'flight' })], { position, range: 18 }), null);
  // Everything the birds actually do while they are worth looking at still counts.
  for (const action of ['peck', 'look', 'hop', 'walk', 'sing', 'hover'])
    assert.ok(findBird([bird('busy', 0, 5, { action })], { position, range: 18 }), action);
});

test('the bearing is right in all four quarters, from four headings', () => {
  const position = at(0, 0), quarter = Math.PI / 2;
  // Facing south (+Z), the traveler's right hand points west (-X), so a bird
  // to the west is to his right and one to the east is to his left.
  const expected = [
    [SOUTH, [[0, 5, 0], [-5, 0, quarter], [5, 0, -quarter], [0, -5, Math.PI]]],
    [NORTH, [[0, -5, 0], [5, 0, quarter], [-5, 0, -quarter], [0, 5, Math.PI]]],
    [EAST, [[5, 0, 0], [0, 5, quarter], [0, -5, -quarter], [-5, 0, Math.PI]]],
    [WEST, [[-5, 0, 0], [0, -5, quarter], [0, 5, -quarter], [5, 0, Math.PI]]],
  ];
  for (const [heading, cases] of expected) for (const [x, z, bearing] of cases) {
    const found = findBird([bird('one', x, z)], { position, heading, range: 18 });
    // Straight behind is the one bearing whose hand does not matter: plus or minus pi is the same place.
    const off = bearing === Math.PI ? Math.abs(found.bearing) - Math.PI : found.bearing - bearing;
    assert.ok(Math.abs(off) < 1e-9, `heading ${heading} bird ${x},${z}: ${found.bearing} not ${bearing}`);
    assert.ok(Math.abs(found.distance - 5) < 1e-9);
  }
  // Half way between two quarters reads as half a right angle, not as either quarter.
  const diagonal = findBird([bird('one', -5, 5)], { position, heading: SOUTH, range: 18 });
  assert.ok(Math.abs(diagonal.bearing - Math.PI / 4) < 1e-9);
  assert.equal(birdQuarter(diagonal.bearing), 'ahead');
  // A bird underfoot has no direction to give, and does not produce a NaN.
  assert.equal(findBird([bird('underfoot', 0, 0)], { position, heading: SOUTH, range: 18 }).bearing, 0);
});

test('a bird behind the traveler is reported as behind, and as out of view', () => {
  const position = at(0, 0);
  const behind = findBird([bird('one', 0, -6)], { position, heading: SOUTH, range: 18 });
  assert.equal(behind.behind, true);
  assert.equal(behind.quarter, 'behind');
  assert.equal(behind.inView, false);
  assert.equal(behind.words, 'Close, straight behind you');
  const ahead = findBird([bird('one', 0, 6)], { position, heading: SOUTH, range: 18 });
  assert.equal(ahead.behind, false);
  assert.equal(ahead.quarter, 'ahead');
  assert.equal(ahead.inView, true);
  assert.equal(ahead.words, 'Close, straight ahead');
  // Over the shoulder either way: behind, and named with the hand it is over.
  assert.equal(findBird([bird('one', -5, -5)], { position, heading: SOUTH, range: 18 }).words, 'Close, behind you, to the right');
  assert.equal(findBird([bird('one', 5, -5)], { position, heading: SOUTH, range: 18 }).words, 'Close, behind you, to the left');
  // In view is the camera's own field, not the whole half-circle in front.
  const edge = (angle, half = BIRD_VIEW_HALF_ANGLE) =>
    findBird([bird('one', -Math.sin(angle) * 8, Math.cos(angle) * 8)], { position, heading: SOUTH, range: 18, halfAngle: half });
  assert.equal(edge(BIRD_VIEW_HALF_ANGLE - .02).inView, true);
  assert.equal(edge(BIRD_VIEW_HALF_ANGLE + .02).inView, false);
  assert.equal(edge(BIRD_VIEW_HALF_ANGLE + .02, 1.4).inView, true);
});

test('the bird being watched is held while it lasts; otherwise the host’s own pick, then the nearest', () => {
  const position = at(0, 0), flock = [bird('watched', 0, 15), bird('closer', 0, 3), bird('middling', 0, 8)];
  assert.equal(findBird(flock, { position, range: 18 }).id, 'closer');
  const held = findBird(flock, { position, range: 18, watching: 'watched' });
  assert.equal(held.id, 'watched');
  assert.equal(held.watched, true);
  assert.equal(held.preferred, false);
  // The moment it goes out of range, or out of sight, the hold lapses of itself.
  assert.equal(findBird(flock, { position, range: 10, watching: 'watched' }).id, 'closer');
  assert.equal(findBird([bird('watched', 0, 15, { action: 'flight' }), bird('closer', 0, 3)], { position, range: 18, watching: 'watched' }).id, 'closer');
  assert.equal(findBird(flock, { position, range: 18, watching: 'a-bird-that-is-not-here' }).id, 'closer');
  // The host's pick is what B would take, so it beats the nearest but not the held one.
  const asked = findBird(flock, { position, range: 18, preferred: 'middling' });
  assert.equal(asked.id, 'middling');
  assert.equal(asked.preferred, true);
  assert.equal(findBird(flock, { position, range: 18, watching: 'watched', preferred: 'middling' }).id, 'watched');
  assert.equal(findBird(flock, { position, range: 18, preferred: 'gone' }).id, 'closer');
  const plain = findBird(flock, { position, range: 18 });
  assert.equal(plain.watched, false); assert.equal(plain.preferred, false);
});

test('the found bird carries what the pointer, the chart and the card each need', () => {
  const found = findBird([bird('cardinal-1', -6, 8, { species: 'cardinal', variant: 'cardinal-female', y: 1.9 })],
    { position: at(0, 0), heading: SOUTH, range: observeRange(1) });
  assert.equal(found.id, 'cardinal-1');
  assert.equal(found.species, 'cardinal');
  assert.equal(found.variant, 'cardinal-female');
  assert.deepEqual([found.x, found.y, found.z], [-6, 1.9, 8]);
  assert.equal(found.range, 18);
  assert.ok(BIRD_SPECIES[found.species], 'the species names a bird the journal knows');
  assert.equal(found.words, 'Close, ahead and to the right');
  for (const key of ['distance', 'bearing', 'forward', 'side']) assert.ok(Number.isFinite(found[key]), key);
  // A bird's y is optional; without one the pointer still has somewhere to sit.
  assert.equal(findBird([{ id: 'flat', x: 0, z: 3, visible: true }], { position: at(0, 0), range: 18 }).y, 0);
});

test('every distance and every direction has words, and they say the same thing twice over', () => {
  assert.deepEqual([2, 8, 15, 25].map(birdNearness), ['very close', 'close', 'a little way off', 'far off']);
  assert.equal(birdNearness(-1), '');
  assert.equal(birdNearness(NaN), '');
  // Right round the compass, a degree at a time: always words, and the hand always
  // agrees with the sign of the bearing.
  for (let step = 0; step < 360; step++) {
    const bearing = (step - 180) * Math.PI / 180, words = birdDirection(bearing);
    assert.ok(words.length > 0, `no words at ${step}`);
    if (words.includes('left')) assert.ok(bearing < 0, `left at ${step}`);
    if (words.includes('right')) assert.ok(bearing > 0, `right at ${step}`);
    assert.ok(['ahead', 'left', 'right', 'behind'].includes(birdQuarter(bearing)), `quarter at ${step}`);
  }
  assert.equal(birdDirection(NaN), '');
  assert.equal(birdQuarter(NaN), '');
  assert.equal(birdWords(null), '');
  assert.equal(birdWords({ distance: NaN, bearing: 0 }), '');
  // The same bearing a whole turn on is the same bird in the same place.
  assert.equal(birdDirection(Math.PI / 4), birdDirection(Math.PI / 4 + Math.PI * 2));
  assert.equal(birdDirection(-Math.PI / 4 - Math.PI * 2), 'ahead and to the left');
});

test('the bearing is measured from a point, on its own, without a flock', () => {
  assert.equal(birdBearing(null, 0, { x: 1, z: 1 }), null);
  assert.equal(birdBearing({ x: 0, z: 0 }, 0, null), null);
  const straight = birdBearing({ x: 0, z: 0 }, SOUTH, { x: 0, z: 7 });
  assert.deepEqual([straight.distance, straight.forward, straight.side, straight.bearing], [7, 7, 0, 0]);
  const heading = birdBearing({ x: 0, z: 0 }, 'north', { x: 0, z: 7 });
  assert.equal(heading.bearing, 0, 'a heading that is not a number is taken as the world’s zero');
});

test('the range the finder is given is the range birding says the traveler has earned', () => {
  // Level 1 sees 18 m and a practised birder 30: at level 1 the far bird is out
  // of reach and at level 7 it is not, without the finder knowing anything of levels.
  const flock = [bird('far', 0, 24)], position = at(0, 0);
  assert.equal(findBird(flock, { position, range: observeRange(1) }), null);
  assert.equal(findBird(flock, { position, range: observeRange(7) }).id, 'far');
  assert.equal(findBird(flock, { position, range: observeRange(1) + 0 }), null);
  assert.ok(DRENT_BIRDS.length > 0);
});
