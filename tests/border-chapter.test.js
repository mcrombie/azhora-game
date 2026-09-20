import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';
import {
  BORDER_ENCOUNTER_ID, BORDER_LEGATE_ID, BORDER_GATE_ID, BORDER_NPCS, BORDER_MARCHERS, COALITION_SIGNING, MARCH,
  borderConversation, borderEncounter, createBorderChapter, validateBorderSnapshot, marchSlot,
} from '../src/border-chapter.js';
import { MOROS_PAY } from '../src/moros-chapter.js';
import { regionNameAt } from '../src/region-world.js';

test('the chapter runs terms, gate, envoy, report, march and battle; the side is chosen once, and winning the fight wins the day', () => {
  const events = [], border = createBorderChapter({ onEvent: event => events.push(event) });
  assert.equal(border.act('take-legate-terms').ok, false, 'nothing before the muster');
  assert.equal(border.start().ok, true);
  assert.deepEqual(border.view().destinationIds, [BORDER_LEGATE_ID]);
  assert.deepEqual(border.cast(), ['coalition-envoy', 'envoy-guard-north', 'envoy-guard-south'], 'the envoy is already waiting at Solis');
  assert.equal(border.act('side-empire').ok, false, 'no parley without the Marshal’s terms');
  assert.equal(border.act('take-legate-terms').ok, true);
  assert.equal(border.view().stage, 'pass-gate');
  assert.deepEqual(border.view().destinationIds, [BORDER_GATE_ID], 'the terms go to the Gate of Sun Horses first');
  assert.equal(border.act('side-empire').ok, false, 'no parley before the gate');
  assert.equal(border.act('enter-solis').ok, true);
  assert.deepEqual(border.view().destinationIds, ['coalition-envoy']);
  assert.match(border.view().detail, /Court of Oaths/);
  const signed = border.act('side-empire');
  assert.equal(signed.ok, true); assert.equal(signed.reward, undefined, 'keeping the Empire’s contract pays nothing extra');
  assert.equal(border.act('side-coalition').ok, false, 'a side is chosen once');
  assert.equal(border.view().side, 'empire');
  // The report: back to the Marshal, who asks whether you are ready.
  assert.equal(border.view().stage, 'report');
  assert.deepEqual(border.view().destinationIds, [BORDER_LEGATE_ID]);
  assert.deepEqual(border.cast(), [], 'the envoy has gone and the line is not yet formed');
  assert.equal(border.act('sound-advance').ok, false, 'no fight before the march');
  assert.equal(border.act('march-out').ok, true);
  assert.equal(border.view().stage, 'march');
  assert.deepEqual(border.view().destinationIds, ['battle-tribune']);
  assert.deepEqual(border.cast(), ['battle-tribune', 'march-legionary-1', 'march-legionary-2'], 'the Captain holds the line and a file of the left marches');
  // The column comes up and the fight begins.
  const arrival = border.act('reach-line');
  assert.equal(arrival.startEncounter, BORDER_ENCOUNTER_ID);
  assert.equal(border.view().stage, 'fighting');
  assert.deepEqual(border.cast(), ['battle-tribune'], 'the column fights as allies and is not drawn twice');
  assert.equal(border.endEncounter(BORDER_ENCOUNTER_ID).ok, true);
  assert.equal(border.view().stage, 'join-line', 'a retreat leaves the line waiting');
  assert.equal(border.resolveBattle(BORDER_ENCOUNTER_ID).ok, false, 'no fight, no verdict');
  border.act('sound-advance');
  assert.equal(border.resolveBattle('other', 50, 10).ok, false);
  assert.equal(border.resolveBattle(BORDER_ENCOUNTER_ID).outcome, 'victory');
  assert.equal(border.view().complete, true);
  assert.match(border.view().detail, /Coalition broke/);
  assert.equal(border.resolveBattle(BORDER_ENCOUNTER_ID).ok, false);
  assert.deepEqual(events.map(event => event.actionId), ['start-chapter', 'take-legate-terms', 'enter-solis', 'side-empire', 'march-out', 'reach-line', 'resolve-border-battle']);
  const lost = createBorderChapter(); lost.start(); lost.act('take-legate-terms'); lost.act('enter-solis');
  const joined = lost.act('side-coalition');
  assert.deepEqual(joined.reward, { id: 'copper-piece', quantity: COALITION_SIGNING }, 'the Republic pays on signing');
  assert.equal(lost.view().stage, 'report');
  assert.deepEqual(lost.view().destinationIds, ['solis-captain'], 'Voss asks the question at the Gate of Sun Horses');
  assert.deepEqual(lost.cast(), ['solis-captain']);
  lost.act('march-out');
  assert.deepEqual(lost.cast(), ['coalition-captain', 'march-valley-1', 'march-valley-2', 'march-valley-3', 'march-valley-4'], 'Voss rides ahead and the valley companies march');
  lost.act('reach-line');
  assert.equal(lost.resolveBattle(BORDER_ENCOUNTER_ID).outcome, 'victory', 'the Republic’s sellsword wins the day by winning the fight, whatever the odds');
  assert.deepEqual(lost.cast(), []);
  assert.match(lost.view().detail, /The army broke/);
});

test('the Coalition’s offer is plainly better than the Empire’s pay, in copper and not in scrip', () => {
  assert.equal(COALITION_SIGNING, MOROS_PAY * 2, 'fifty copper on the table against the muster’s twenty-five');
  const border = createBorderChapter(), screens = [];
  const context = { border, openDialogue: (npc, lines, unused, label, options) => screens.push({ npc, lines, options }), closeDialogue: () => {}, act: id => border.act(id) };
  border.start(); border.act('take-legate-terms'); border.act('enter-solis');
  assert.equal(borderConversation(BORDER_NPCS.find(npc => npc.id === 'coalition-envoy'), context), true);
  const speech = screens.at(-1).lines.join(' ');
  assert.match(speech, new RegExp(`${COALITION_SIGNING} copper`));
  assert.match(speech, /Double the Marshal’s rate/);
  assert.match(speech, /Land when the Republic wins/);
  assert.doesNotMatch(speech, /scrip/i, 'paper is the merchant’s grumble, not the offer');
  assert.match(screens.at(-1).options.choices.find(choice => choice.id === 'side-coalition').label, new RegExp(String(COALITION_SIGNING)));
});

test('saves round-trip without a running fight; saves from the stockade version keep their side; contradictory saves are refused', () => {
  const border = createBorderChapter(); border.start(); border.act('take-legate-terms'); border.act('enter-solis'); border.act('side-coalition'); border.act('march-out'); border.act('reach-line');
  border.endEncounter(BORDER_ENCOUNTER_ID);
  const saved = border.snapshot();
  assert.equal(Object.hasOwn(saved, 'active'), false);
  const other = createBorderChapter();
  assert.equal(other.restore(saved), true);
  assert.deepEqual(other.snapshot(), saved);
  assert.equal(other.view().stage, 'join-line'); assert.equal(other.view().side, 'coalition');
  // The march itself survives a save.
  const marching = createBorderChapter(); marching.start(); marching.act('take-legate-terms'); marching.act('enter-solis'); marching.act('side-empire'); marching.act('march-out');
  const resumed = createBorderChapter(); assert.equal(resumed.restore(marching.snapshot()), true);
  assert.equal(resumed.view().stage, 'march'); assert.deepEqual(resumed.cast(), ['battle-tribune', 'march-legionary-1', 'march-legionary-2']);
  for (const bad of [null, [], {}, { ...saved, version: 2 }, { ...saved, revision: 1 }, { ...saved, side: 'pirates' }, { ...saved, outcome: 'draw' },
    { ...saved, ordered: false }, { ...saved, marched: false }, { ...saved, entered: 'yes' }, { ...saved, side: null, outcome: 'defeat', revision: 6 }, { ...saved, extra: 1 }]) {
    assert.equal(validateBorderSnapshot(bad), false);
    assert.equal(other.restore(bad), false);
    assert.equal(other.view().side, 'coalition');
  }
  const { entered, ready, ...partial } = saved;
  assert.equal(validateBorderSnapshot(partial), false, 'a save has all of the new stages or none of them');
  // Saves from before the parley moved to Solis.
  const legacy = (fields, revision) => ({ version: 1, revision, started: true, ordered: false, side: null, outcome: null, ...fields });
  const atEnvoy = createBorderChapter();
  assert.equal(atEnvoy.restore(legacy({ ordered: true }, 2)), true);
  assert.equal(atEnvoy.view().stage, 'pass-gate', 'terms in hand at the stockade: the envoy is now at Solis');
  const atLine = createBorderChapter();
  assert.equal(atLine.restore(legacy({ ordered: true, side: 'empire' }, 3)), true);
  assert.equal(atLine.view().side, 'empire', 'a save already past the envoy keeps its side');
  assert.equal(atLine.view().stage, 'report');
  assert.equal(validateBorderSnapshot(atLine.snapshot()), true);
  const fought = createBorderChapter();
  assert.equal(fought.restore(legacy({ ordered: true, side: 'coalition', outcome: 'defeat' }, 4)), true);
  assert.equal(fought.view().stage, 'complete'); assert.equal(fought.view().outcome, 'victory', 'a recorded defeat was a won fight rolled as lost: it comes back a victory');
  assert.equal(validateBorderSnapshot(legacy({ ordered: true, side: 'empire' }, 4)), false);
  assert.equal(validateBorderSnapshot(undefined), true);
});

test('each side’s encounter is a valid fight against the other side’s soldiers, with the allies placed on the line', () => {
  const world = { bounds: { minX: -900, maxX: 200, minZ: -300, maxZ: 700 }, colliders: [], heightAt: () => 2 };
  for (const [side, look] of [['empire', 'coalition'], ['coalition', 'legion']]) {
    const allies = [{ id: 'merc-gotwood', name: 'Chris Gotwood', kind: 'legionary' }, { id: 'ally-2', name: 'Soldier', kind: 'legionary' }, { id: 'ally-3', name: 'Captain', kind: 'officer' }];
    const config = borderEncounter(side, allies);
    assert.equal(config.enemies.length, 8);
    assert.ok(config.enemies.every(enemy => enemy.kind === 'soldier' && enemy.look === look));
    const position = { x: config.checkpoint.x, y: 2, z: config.checkpoint.z };
    const combat = createCombat({ world, position });
    assert.equal(combat.startEncounter(config), true, `${side} encounter validates`);
    assert.equal(combat.state.allies.length, 3);
    assert.deepEqual(combat.state.enemies.map(enemy => enemy.look), Array(8).fill(look));
    assert.ok(combat.state.enemies.filter(enemy => enemy.kind === 'soldier').length === 8);
  }
  assert.equal(borderEncounter('empire', Array.from({ length: 9 }, (_, i) => ({ id: `a${i}`, kind: 'legionary' }))).allies.length, 5, 'five stand with the traveler at most');
});

test('the Marshal, the gate, the envoy and the commanders speak only in their turn, and the envoy names the Coalition truly', () => {
  const border = createBorderChapter(), screens = [], acts = [];
  const context = { border, musterCount: 7, openDialogue: (npc, lines, unused, label, options) => screens.push({ npc, lines, options }), closeDialogue: () => {}, act: id => { acts.push(id); return border.act(id); } };
  const npc = id => BORDER_NPCS.find(person => person.id === id) ?? { id };
  assert.equal(borderConversation(npc(BORDER_LEGATE_ID), context), false);
  border.start();
  assert.equal(borderConversation(npc('coalition-envoy'), context), true, 'the envoy answers');
  assert.equal(screens.at(-1).options, undefined, 'but has nothing to offer a man without terms');
  assert.equal(borderConversation(npc(BORDER_LEGATE_ID), context), true);
  assert.match(screens.at(-1).lines[0], /7 of twelve/);
  assert.match(screens.at(-1).lines.join(' '), /Solis/);
  screens.at(-1).options.choices.find(choice => choice.id === 'take-legate-terms').action();
  border.act('enter-solis'); acts.push('enter-solis');
  assert.equal(borderConversation(npc('coalition-envoy'), context), true);
  const speech = screens.at(-1).lines.join(' ');
  for (const member of ['Izoli', 'Suvali', 'Luscia', 'Pyros', 'Selemis', 'Marosh', 'island cities']) assert.match(speech, new RegExp(member));
  assert.doesNotMatch(speech, /South Pyros/);
  assert.deepEqual(screens.at(-1).options.choices.map(choice => choice.id), ['side-empire', 'side-coalition', 'leave-border']);
  screens.at(-1).options.choices.find(choice => choice.id === 'side-coalition').action();
  assert.equal(borderConversation(npc('solis-captain'), context), true, 'Voss asks at the gate');
  assert.equal(screens.at(-1).lines.at(-1), 'Are you ready?');
  assert.deepEqual(screens.at(-1).options.choices.map(choice => [choice.id, choice.label]), [['march-out', 'Yes.'], ['leave-border', 'Give me a moment.']]);
  screens.at(-1).options.choices[0].action();
  assert.equal(borderConversation(npc('coalition-captain'), context), true);
  screens.at(-1).options.choices.find(choice => choice.id === 'reach-line').action();
  assert.deepEqual(acts, ['take-legate-terms', 'enter-solis', 'side-coalition', 'march-out', 'reach-line']);
  assert.equal(border.view().stage, 'fighting');
  // The Empire's report goes to the Marshal, with the same question.
  const empire = createBorderChapter(); empire.start(); empire.act('take-legate-terms'); empire.act('enter-solis'); empire.act('side-empire');
  assert.equal(borderConversation(npc(BORDER_LEGATE_ID), { ...context, border: empire }), true);
  assert.equal(screens.at(-1).lines.at(-1), 'Are you ready?');
  assert.deepEqual(screens.at(-1).options.choices.map(choice => choice.label), ['Yes.', 'Give me a moment.']);
});

test('the envoy and her escort wait in Solis, the line at the border, and a marching column keeps a file behind the traveler', () => {
  for (const id of ['coalition-envoy', 'envoy-guard-north', 'envoy-guard-south', 'solis-captain']) {
    const person = BORDER_NPCS.find(npc => npc.id === id);
    assert.equal(regionNameAt(person.x, person.z), 'West Suval', `${person.name} is in West Suval`);
  }
  for (const id of ['battle-tribune', 'coalition-captain']) {
    const person = BORDER_NPCS.find(npc => npc.id === id);
    assert.equal(regionNameAt(person.x, person.z), 'Moros Plain', `${person.name} holds the line on the Moros side`);
  }
  assert.deepEqual(BORDER_MARCHERS, ['march-legionary-1', 'march-legionary-2', 'march-valley-1', 'march-valley-2', 'march-valley-3', 'march-valley-4']);
  const traveler = { x: 10, z: 20 }, heading = Math.PI / 2;   // walking east
  const slots = [0, 1, 2, 3].map(index => marchSlot(index, traveler, heading));
  for (const slot of slots) {
    assert.ok(slot.x < traveler.x, 'behind the traveler');
    assert.ok(Math.hypot(slot.x - traveler.x, slot.z - traveler.z) < MARCH.catchUp / 2);
  }
  assert.ok(slots[2].x < slots[0].x, 'the second pair walks behind the first');
  assert.ok(Math.sign(slots[0].z - traveler.z) !== Math.sign(slots[1].z - traveler.z), 'two abreast');
});
