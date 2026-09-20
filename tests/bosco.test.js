import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSCO, BOSCO_HAUNTS, BOSCO_DYES, BOSCO_GREETS, BOSCO_PETS, BOSCO_FACTS,
  createBosco, boscoConversation, validateBoscoSnapshot } from '../src/bosco.js';
import { BRANDY, BRANDY_ON_BOSCO, BRANDY_YARD, YARD_LAYOUT, yardPoint, brandyConversation } from '../src/brandy.js';

function talk(conversation, npc, context) {
  const screens = [], acted = [];
  conversation(npc, {
    openDialogue: (who, lines, event, action, options = {}) => screens.push({ lines, ...options }),
    closeDialogue: () => {}, act: id => acted.push(id), ...context,
  });
  return { screens, acted,
    pick: id => screens.at(-1).choices.find(choice => choice.id === id)?.action(),
    has: id => screens.at(-1).choices.some(choice => choice.id === id) };
}
const npc = { id: BOSCO.id };
/** A deterministic dog. */
const fixed = value => () => value;

test('he lives in the dye yard and never goes further than the gate', () => {
  const middle = yardPoint(0, 0);
  assert.ok(BOSCO_HAUNTS.length >= 4);
  for (const haunt of BOSCO_HAUNTS) {
    assert.ok(Math.hypot(haunt.x - middle.x, haunt.z - middle.z) < 6, 'every spot is in the yard');
    assert.ok(haunt.what.length > 20, 'and each one is somewhere for a reason');
  }
  // One of them is the vats, which is the reason he is never his own colour.
  assert.ok(BOSCO_HAUNTS.some(haunt => haunt.what.includes('vats')));
  // And the colours he comes away wearing are Brandy's own.
  const hers = new Set([...YARD_LAYOUT.vats.map(vat => vat.dye), ...YARD_LAYOUT.lines.flatMap(line => line.cloths)]
    .filter(value => Number.isInteger(value)));
  assert.ok(BOSCO_DYES.every(dye => Number.isInteger(dye.colour)));
  assert.ok(BOSCO_DYES.some(dye => hers.has(dye.colour)), 'out of her own vats');
});

test('he holds the yard, and abandons the post the instant anybody arrives', () => {
  const bosco = createBosco({ random: fixed(.5) });
  const away = { x: BOSCO_HAUNTS[0].x + 60, z: BOSCO_HAUNTS[0].z };
  // Nobody about: he patrols, and he is somewhere in his own yard.
  let step = bosco.update(1, away);
  assert.equal(step.mode, 'patrol');
  const middle = yardPoint(0, 0);
  for (let k = 0; k < 40; k++) step = bosco.update(.5, away);
  assert.ok(Math.hypot(step.x - middle.x, step.z - middle.z) < 8, 'he stays in the yard');

  // Somebody arrives: he drops everything and comes, and stops just short.
  const here = { x: step.x + 4, z: step.z };
  let greeted = bosco.update(.1, here);
  assert.equal(greeted.mode, 'greet');
  assert.ok(greeted.speed > 2, 'at a flat run');
  for (let k = 0; k < 40; k++) greeted = bosco.update(.1, here);
  const gap = Math.hypot(greeted.x - here.x, greeted.z - here.z);
  assert.ok(gap > .5 && gap < 1.2, `he stops on your boots, not through them (${gap.toFixed(2)})`);
  assert.equal(greeted.speed, 0);
  assert.equal(greeted.sitting, true, 'and sits down to be admired');
  // A silly dt does not move him anywhere strange.
  const still = bosco.update(0, here);
  assert.ok(Number.isFinite(still.x) && Number.isFinite(still.z));
});

test('making a fuss of him always works, and is counted', () => {
  const bosco = createBosco({ random: fixed(.2) });
  assert.equal(bosco.pets, 0);
  const first = bosco.pet();
  assert.equal(first.ok, true);
  assert.equal(first.pets, 1);
  assert.equal(first.line, BOSCO_PETS[0]);
  assert.equal(bosco.pet().line, BOSCO_PETS[1], 'and it is different the next time');
  assert.equal(bosco.pets, 2);
});

test('he is never entirely his own colour, and it changes', () => {
  const bosco = createBosco({ random: fixed(.1) });
  const before = bosco.dye;
  assert.ok(BOSCO_DYES.includes(before));
  assert.match(before.where, /\w/);
  const after = bosco.redye();
  assert.notEqual(after.colour, before.colour, 'he has been against another vat');
  assert.ok(BOSCO_DYES.includes(after));
});

test('meeting him is a description of a dog, and petting him is the whole mechanic', () => {
  const bosco = createBosco({ random: fixed(.3) });
  const first = talk(boscoConversation, npc, { bosco });
  assert.equal(bosco.met, true);
  assert.equal(first.screens[0].lines[0], BOSCO_GREETS[0]);
  const said = first.screens[0].lines.join(' ');
  assert.match(said, /plump/, 'there is no kind way to put it');
  assert.match(said, /fruit bat/);
  assert.match(said, new RegExp(bosco.dye.name.split(' ')[0]), 'and he is wearing a colour');
  assert.equal(first.has('pet-bosco'), true);
  first.pick('pet-bosco');
  assert.deepEqual(first.acted, ['pet-bosco']);
  // Watching him a minute gets one of the things that are true about him.
  const again = talk(boscoConversation, npc, { bosco, visits: 2 });
  again.pick('bosco-about');
  assert.equal(again.screens.at(-1).lines[0], BOSCO_FACTS[2]);
});

test('Brandy will talk about him, and it is the one thing she is not sorry about', () => {
  const brandy = { met: true, visits: 0, ribbon: true };
  const said = talk(brandyConversation, { id: BRANDY.id }, { brandy, random: fixed(0) });
  assert.equal(said.has('brandy-bosco'), true);
  said.pick('brandy-bosco');
  assert.deepEqual(said.screens.at(-1).lines, [...BRANDY_ON_BOSCO]);
  assert.match(BRANDY_ON_BOSCO.join(' '), /came out right/);
  assert.match(BRANDY_ON_BOSCO.join(' '), /rare one/);
});

test('the dog survives a save', () => {
  const bosco = createBosco({ random: fixed(.4) });
  bosco.meet(); bosco.pet(); bosco.pet(); bosco.redye();
  const restored = createBosco({ random: fixed(.9) });
  assert.equal(restored.restore(bosco.snapshot()), true);
  assert.equal(restored.met, true);
  assert.equal(restored.pets, 2);
  assert.equal(restored.dye.colour, bosco.dye.colour, 'still the colour he was');
  assert.equal(validateBoscoSnapshot(undefined), true);
  assert.equal(validateBoscoSnapshot({ version: 1, met: true, pets: 3, dye: 0 }), true);
  assert.equal(validateBoscoSnapshot({ version: 1, met: true, pets: -1, dye: 0 }), false);
  assert.equal(validateBoscoSnapshot({ version: 1, met: true, pets: 3, dye: BOSCO_DYES.length }), false);
  assert.equal(validateBoscoSnapshot({ version: 2, met: true, pets: 3, dye: 0 }), false);
});

// He wants three things, and they are always the same three things.
test('beef: he asks for beef, takes anything, and never raises the discrepancy', async () => {
  const { BOSCO_BEEF, BOSCO_TAKES, BOSCO_WANTS } = await import('../src/bosco.js');
  const { INVENTORY_ITEMS } = await import('../src/inventory.js');
  assert.deepEqual([...BOSCO_WANTS], ['beef', 'walk', 'pets']);
  assert.ok(INVENTORY_ITEMS[BOSCO_BEEF], 'the beef is a real thing you can carry');
  for (const id of BOSCO_TAKES) assert.ok(INVENTORY_ITEMS[id], `${id} is a real item`);

  const bosco = createBosco({ random: fixed(.5) });
  const taken = [];
  const beef = bosco.feed(BOSCO_BEEF, { take: id => { taken.push(id); return true; } });
  assert.equal(beef.ok, true);
  assert.equal(beef.beef, true);
  assert.match(beef.line, /enormous care/);
  assert.deepEqual(taken, [BOSCO_BEEF]);
  // Anything else on the list goes down just as fast and he says nothing about it.
  const { BOSCO_FOOD_GIVEN } = await import('../src/bosco.js');
  const other = bosco.feed('smoked-sausage', { take: () => true });
  assert.equal(other.beef, false);
  assert.ok(BOSCO_FOOD_GIVEN.includes(other.line), 'and he does not raise it');
  assert.equal(bosco.fed, 2);
  // A stone is not food, and an empty satchel is an empty satchel.
  assert.equal(bosco.feed('road-token', { take: () => true }).ok, false);
  assert.equal(bosco.feed(BOSCO_BEEF, { take: () => false }).ok, false);
  assert.equal(bosco.fed, 2);
});

test('a walk: he leaves the yard, follows anywhere, and comes home', () => {
  const bosco = createBosco({ random: fixed(.5) });
  assert.equal(bosco.walking, false);
  const start = bosco.startWalk();
  assert.equal(start.ok, true);
  assert.equal(start.first, true);
  assert.equal(bosco.walking, true);
  assert.equal(bosco.startWalk().ok, false, 'he is already out');

  // Half the map away from his yard, he still comes: on a walk the yard is not a consideration.
  // Well outside the yard and far outside the seven metres that would normally interest him.
  const far = { x: BOSCO_HAUNTS[0].x + 40, z: BOSCO_HAUNTS[0].z - 30 };
  let step = bosco.update(.1, far);
  assert.equal(step.mode, 'greet');
  for (let k = 0; k < 400; k++) step = bosco.update(.1, far);
  const gap = Math.hypot(step.x - far.x, step.z - far.z);
  assert.ok(gap < 2.2, `he keeps up (${gap.toFixed(1)}m)`);
  assert.equal(step.sitting, false, 'and he does not sit down on a walk');

  const home = bosco.endWalk();
  assert.equal(home.ok, true);
  assert.equal(home.walks, 1);
  assert.equal(bosco.walking, false);
  assert.equal(bosco.endWalk().ok, false);
  // Back to holding the yard: once the traveler walks off, he heads home to his spots.
  const gone = { x: far.x + 200, z: far.z + 200 };
  assert.equal(bosco.update(.1, gone).mode, 'patrol');
  let back = bosco.update(.1, gone);
  for (let k = 0; k < 600; k++) back = bosco.update(.1, gone);
  const middle = yardPoint(0, 0);
  assert.ok(Math.hypot(back.x - middle.x, back.z - middle.z) < 8, 'and he is back in his yard');
});

test('what he wants is offered when it can be, and asked about when it cannot', async () => {
  const { BOSCO_BEEF } = await import('../src/bosco.js');
  const bosco = createBosco({ random: fixed(.5) });
  const empty = talk(boscoConversation, npc, { bosco, carrying: [] });
  assert.equal(empty.has('feed-bosco'), false);
  assert.equal(empty.has('bosco-no-beef'), true, 'he stares at the hand anyway');
  assert.equal(empty.has('bosco-walk'), true);
  assert.equal(empty.has('pet-bosco'), true);

  const carrying = talk(boscoConversation, npc, { bosco, carrying: [BOSCO_BEEF, 'oatcake'] });
  assert.equal(carrying.has('feed-bosco'), true);
  carrying.pick('feed-bosco');
  assert.deepEqual(carrying.acted, [`feed-bosco-${BOSCO_BEEF}`], 'the beef first, if there is beef');

  bosco.startWalk();
  const out = talk(boscoConversation, npc, { bosco, carrying: [] });
  assert.equal(out.has('bosco-walk'), false);
  assert.equal(out.has('bosco-walk-end'), true, 'and he can be taken home');
});

test('John sells a piece out of the barrel, and knows exactly who it is for', async () => {
  const { JOHN, BEEF_PRICE, johnConversation } = await import('../src/salt-sultan.js');
  const context = { salt: { met: true, visits: 0, edTold: false, port: { id: 'tidehaven', name: 'Tidehaven', edge: 'quay' } } };
  const broke = talk(johnConversation, { id: JOHN.id }, { ...context, coppers: BEEF_PRICE - 1 });
  assert.equal(broke.has('john-beef'), false);
  const flush = talk(johnConversation, { id: JOHN.id }, { ...context, coppers: BEEF_PRICE });
  assert.equal(flush.has('john-beef'), true);
  flush.pick('john-beef');
  assert.deepEqual(flush.acted, ['buy-salt-beef']);
});
