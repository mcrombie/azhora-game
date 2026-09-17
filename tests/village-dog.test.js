import test from 'node:test';
import assert from 'node:assert/strict';
import { VILLAGE_DOG, DOG_DISLIKES, DOG_APPETITE, createVillageDog } from '../src/village-dog.js';

const sequence = values => { let i = 0; return () => values[i++ % values.length]; };

test('the dog sniffs from haunt to haunt around the green and comes over when someone is near', () => {
  const dog = createVillageDog({ random: sequence([.3, .9, .1, .6]) });
  let target = dog.update(3, { x: 200, z: 200 });
  assert.ok(VILLAGE_DOG.haunts.some(h => h.x === target.x && h.z === target.z), 'it heads for a haunt');
  const first = dog.state.haunt;
  for (let i = 0; i < 40; i++) target = dog.update(.5, { x: 200, z: 200 });
  assert.notEqual(dog.state.haunt, first, 'it moves on after a while');
  assert.ok(dog.state.sniffs >= 2);
  dog.place(-16, 33);
  target = dog.update(.1, { x: -13, z: 33 });
  assert.equal(dog.state.mode, 'approaching');
  assert.ok(Math.hypot(target.x + 13, target.z - 33) < 2.5, 'it stops just short of the traveler');
  target = dog.update(.1, { x: -60, z: 33 });
  assert.equal(dog.state.mode, 'sniffing', 'it loses interest when the traveler walks off');
});

test('it usually eats what it is given, refuses what is not food or not to its taste, and then follows for a while', () => {
  const dog = createVillageDog({ random: sequence([.2]) });
  assert.equal(dog.feed({ itemId: 'tinderbox', isFood: false }).ate, false);
  assert.equal(dog.feed({ itemId: DOG_DISLIKES[0], isFood: true }).ate, false);
  assert.equal(dog.feed({ itemId: 'cooked-fish', isFood: true, roll: DOG_APPETITE + .01 }).ate, false, 'now and then it is not hungry');
  const meal = dog.feed({ itemId: 'cooked-fish', isFood: true, roll: .5 });
  assert.equal(meal.ate, true); assert.match(meal.line, /following/);
  assert.equal(dog.state.mode, 'eating');
  dog.update(3, { x: 0, z: 0 });
  assert.equal(dog.state.mode, 'following');
  const target = dog.update(.1, { x: 0, z: 0 });
  assert.ok(Math.hypot(target.x, target.z) < 3, 'it keeps to heel');
  assert.ok(target.pace > 2);
  for (let i = 0; i < 200; i++) dog.update(.5, { x: 0, z: 0 });
  assert.equal(dog.state.mode, 'sniffing', 'after a while it goes back to the green');
  assert.equal(dog.state.fed, 1);
  assert.match(dog.greeting(), /sits/);
});

test('a refusal makes it keep its distance for a while, and invalid time is ignored', () => {
  const dog = createVillageDog({ random: sequence([.5]) });
  dog.place(-16, 33);
  dog.update(.1, { x: -14, z: 33 });
  assert.equal(dog.state.mode, 'approaching');
  dog.feed({ itemId: 'tinderbox', isFood: false });
  dog.update(.1, { x: -60, z: 33 });
  dog.update(.1, { x: -14, z: 33 });
  assert.equal(dog.state.mode, 'sniffing', 'snubbed, it stays at its haunts for a while');
  const before = JSON.stringify(dog.state);
  dog.update(NaN, { x: -14, z: 33 }); dog.update(-1, { x: -14, z: 33 });
  assert.equal(JSON.stringify(dog.state), before);
});
