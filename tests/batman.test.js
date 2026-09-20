import test from 'node:test';
import assert from 'node:assert/strict';
import { BATMAN, BATMAN_PERCH, HANDOVER, VELAETH, CARTEL, EVIDENCE, EVIDENCE_IDS, LEDGER_ITEM,
  ENDINGS, ENDING_IDS, BATMAN_FIRST, BATMAN_CASE, BUST_SCENE, createBatmanHunt, batmanConversation,
  validateHuntSnapshot } from '../src/batman.js';
import { wallStateAt } from '../src/solis-sack.js';
import { SOLIS } from '../src/region-world.js';
import { WINERY_LAYOUT } from '../src/winery.js';
import { KATY, createKaty, katyConversation } from '../src/katy.js';
import { INVENTORY_ITEMS } from '../src/inventory.js';

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
const npc = { id: BATMAN.id };
/** Everything the traveler does, in the order the game does it. */
function wholeCase(hunt, inventory = null) {
  hunt.find('vial', inventory); hunt.sight(); hunt.accept();
  hunt.find('chit', inventory); hunt.find('pass', inventory);
  return hunt;
}

test('the blue is a perfume off the Empire’s own dye beds, and it takes both sides to move it', () => {
  assert.match(VELAETH.look, /blue/);
  assert.match(VELAETH.look, /purple/);
  assert.match(VELAETH.made, /snail/);
  // The cover is the Empire's purple; the cost is real.
  assert.match(VELAETH.made, /purple/);
  assert.ok(VELAETH.cost.length > 80);
  assert.equal(CARTEL.rask.side, 'Empire');
  assert.equal(CARTEL.trelith.side, 'Coalition');
  // One holds the licences and the paper, the other holds the passes: neither can work alone.
  assert.match(CARTEL.rask.holds, /licence/);
  assert.match(CARTEL.trelith.holds, /pass/);
});

test('he sits on the rock above the winery spring, and the carts go through the east breach', () => {
  // The perch is the outcrop the spring comes out from under, and he is off the ground on it.
  const source = WINERY_LAYOUT.spring.source;
  assert.ok(Math.hypot(BATMAN_PERCH.x - source.x, BATMAN_PERCH.z - source.z) < 1, 'on the outcrop');
  assert.ok(BATMAN_PERCH.lift > 1.5, 'up on top of it, not standing in the water');
  // The handover is at the hole in Solis's east wall that nobody has repaired in three years.
  assert.equal(wallStateAt('east', HANDOVER.z - SOLIS.centre.z), 'breach');
  assert.ok(HANDOVER.x - SOLIS.centre.x > 48, 'out in the rubble beyond the wall line');
});

test('he does not come until the traveler is carrying the blue', () => {
  const hunt = createBatmanHunt();
  assert.equal(hunt.willCome, false);
  assert.equal(hunt.sight().ok, false, 'there is nothing on the rock yet');
  assert.equal(hunt.stage, 'unknown');
  // The other two pieces mean nothing before there is a case to put them in.
  assert.equal(hunt.find('chit').ok, false);
  assert.equal(hunt.find('pass').ok, false);
  assert.equal(hunt.find('vial').ok, true, 'the vial comes out of a barrel, not out of him');
  assert.equal(hunt.willCome, true);
  assert.equal(hunt.sight().ok, true);
  assert.equal(hunt.stage, 'sighted');
});

test('the case comes in one piece at a time and cannot be finished early', () => {
  const granted = [], inventory = { grant: id => granted.push(id) };
  const hunt = createBatmanHunt();
  hunt.find('vial', inventory); hunt.sight();
  assert.equal(hunt.witness(inventory).ok, false, 'no handover before the case is whole');
  assert.equal(hunt.finish('boards').ok, false, 'and no ending before the handover');
  assert.deepEqual(hunt.accept(), { ok: true, wants: ['chit', 'pass'] });
  const chit = hunt.find('chit', inventory);
  assert.equal(chit.complete, false);
  assert.deepEqual(chit.remaining, ['pass']);
  assert.equal(hunt.find('chit', inventory).ok, false, 'Juan has only the one sheet');
  assert.equal(hunt.stage, 'hunting');
  const pass = hunt.find('pass', inventory);
  assert.equal(pass.complete, true);
  assert.equal(hunt.stage, 'ready');
  assert.deepEqual(granted, EVIDENCE_IDS.map(id => EVIDENCE[id].item));
  // The handover hands over the one thing with both names in it.
  assert.equal(hunt.witness(inventory).ok, true);
  assert.equal(hunt.stage, 'bust');
  assert.equal(granted.at(-1), LEDGER_ITEM);
  for (const id of [...EVIDENCE_IDS.map(key => EVIDENCE[key].item), LEDGER_ITEM]) assert.ok(INVENTORY_ITEMS[id], `${id} is a real item`);
});

test('every ending is a real outcome, and only one of them stops the trade', () => {
  for (const id of ENDING_IDS) {
    const hunt = wholeCase(createBatmanHunt());
    hunt.witness();
    const result = hunt.finish(id);
    assert.equal(result.ok, true);
    assert.equal(hunt.stage, 'done');
    assert.equal(hunt.ending, id);
    assert.ok(result.outcome.outcome.length > 120, `${id} says what actually happens`);
    assert.equal(hunt.finish('boards').ok, false, 'it is decided once');
  }
  // Handing it to either army buries half of it; the boards are the only way both names stay up.
  assert.match(ENDINGS.provost.outcome, /Trelith is never named/);
  assert.match(ENDINGS.coalition.outcome, /Rask keeps his desk/);
  assert.match(ENDINGS.boards.outcome, /[Bb]oth of them are finished/);
});

test('he talks by stage, and his first words are not a greeting', () => {
  const hunt = createBatmanHunt();
  hunt.find('vial');
  const first = talk(batmanConversation, npc, { hunt });
  assert.deepEqual(first.screens[0].lines, [...BATMAN_FIRST]);
  assert.match(first.screens[0].lines.at(-1), /Say where you got it/);
  first.pick('batman-sighted');
  assert.deepEqual(first.acted, ['batman-sighted']);

  hunt.sight();
  const case_ = talk(batmanConversation, npc, { hunt });
  assert.deepEqual(case_.screens[0].lines, [...BATMAN_CASE]);
  assert.equal(case_.has('batman-who'), true, 'he can be asked what he is');
  case_.pick('batman-accept');
  case_.screens.at(-1).onComplete();
  assert.deepEqual(case_.acted, ['batman-accept']);

  hunt.accept();
  const mid = talk(batmanConversation, npc, { hunt }).screens[0].lines[0];
  assert.match(mid, /1 of three/, 'he counts what is in hand');
  assert.match(mid, /night pass/, 'and names what is not');
  hunt.find('chit'); hunt.find('pass');
  const ready = talk(batmanConversation, npc, { hunt });
  assert.match(ready.screens[0].lines.join(' '), /east wall of Solis has a hole in it/);
  hunt.witness();
  const choice = talk(batmanConversation, npc, { hunt });
  for (const id of ENDING_IDS) assert.equal(choice.has(`case-${id}`), true, `${id} is offered`);
  assert.equal(choice.has('batman-wait'), true, 'and it can wait');
  assert.equal(BUST_SCENE.length, 4);
  assert.match(BUST_SCENE.join(' '), /tally book/);
});

test('Katy hears it from the traveler, and never asks where he sits', () => {
  const katy = createKaty(), hunt = createBatmanHunt();
  katy.meet(); katy.accept();
  const before = talk(katyConversation, { id: KATY.id }, { katy, hunt });
  assert.equal(before.has('told-katy'), false, 'nothing to tell her yet');
  hunt.find('vial'); hunt.sight();
  const after = talk(katyConversation, { id: KATY.id }, { katy, hunt });
  assert.equal(after.has('told-katy'), true);
  after.pick('told-katy');
  const said = after.screens.at(-1).lines.join(' ');
  assert.match(said, /do not tell me where/i);
  assert.match(said, /help him/);
});

test('the case survives a save, and nonsense is refused', () => {
  const hunt = wholeCase(createBatmanHunt());
  hunt.witness(); hunt.finish('boards');
  const restored = createBatmanHunt();
  assert.equal(restored.restore(hunt.snapshot()), true);
  assert.equal(restored.stage, 'done');
  assert.equal(restored.ending, 'boards');
  assert.equal(restored.foundCount(), 3);
  assert.equal(validateHuntSnapshot(undefined), true);
  assert.equal(validateHuntSnapshot({ version: 1, stage: 'hunting', found: ['vial'], ending: null }), true);
  assert.equal(validateHuntSnapshot({ version: 1, stage: 'hunting', found: ['vial', 'vial'], ending: null }), false);
  assert.equal(validateHuntSnapshot({ version: 1, stage: 'hunting', found: ['smell'], ending: null }), false);
  assert.equal(validateHuntSnapshot({ version: 1, stage: 'arrested', found: [], ending: null }), false);
  assert.equal(validateHuntSnapshot({ version: 1, stage: 'done', found: [], ending: 'nobody' }), false);
  assert.equal(validateHuntSnapshot({ version: 2, stage: 'done', found: [], ending: 'boards' }), false);
});

// The three people who already have a piece of it, each in their own place and their own voice.
test('Kat, Juan and John each hand over their piece, and only when it is wanted', async () => {
  const { WINEMAKER } = await import('../src/winery.js');
  const { winemakerConversation } = await import('../src/wine.js');
  const { JUAN } = await import('../src/wine-attic.js');
  const { juanConversation } = await import('../src/wine-attic.js');
  const { JOHN, johnConversation } = await import('../src/salt-sultan.js');

  // Kat will not raise the barrel until Katy has the traveler looking for him.
  const katy = createKaty(), hunt = createBatmanHunt();
  const quiet = talk(winemakerConversation, { id: WINEMAKER.id }, { hunt, katy });
  assert.equal(quiet.has('kat-barrel'), false, 'she keeps it to herself');
  katy.meet(); katy.accept();
  const kat = talk(winemakerConversation, { id: WINEMAKER.id }, { hunt, katy });
  assert.equal(kat.has('kat-barrel'), true);
  kat.pick('kat-barrel');
  assert.match(kat.screens.at(-1).lines.join(' '), /heavier than it went out/);
  kat.screens.at(-1).onComplete();
  assert.deepEqual(kat.acted, ['take-velaeth-vial']);

  // Juan and John only have their piece once there is a case: before that, nobody asks.
  hunt.find('vial'); hunt.sight(); hunt.accept();
  const juan = talk(juanConversation, { id: JUAN.id },
    { hunt, attic: { met: true, visits: 0 }, wine: { met: true }, purse: 0, items: {} });
  assert.equal(juan.has('attic-packing'), true);
  juan.pick('attic-packing');
  assert.match(juan.screens.at(-1).lines.join(' '), /Rask/);
  juan.screens.at(-1).onComplete();
  assert.deepEqual(juan.acted, ['take-rask-chit']);

  const john = talk(johnConversation, { id: JOHN.id },
    { hunt, salt: { met: true, visits: 0, edTold: false, port: { id: 'tidehaven', name: 'Tidehaven', edge: 'quay' }, visit: () => {} } });
  assert.equal(john.has('john-refused'), true);
  john.pick('john-refused');
  assert.match(john.screens.at(-1).lines.join(' '), /Trelith/);
  john.screens.at(-1).onComplete();
  assert.deepEqual(john.acted, ['take-trelith-pass']);
});
