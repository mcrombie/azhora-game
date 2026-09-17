import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';
import { BORDER_ENCOUNTER_ID, BORDER_LEGATE_ID, BORDER_NPCS, borderConversation, borderEncounter, createBorderChapter, validateBorderSnapshot } from '../src/border-chapter.js';

test('the chapter runs orders, envoy, line and battle; the side is chosen once and the day is decided by the odds', () => {
  const events = [], border = createBorderChapter({ onEvent: event => events.push(event) });
  assert.equal(border.act('take-legate-terms').ok, false, 'nothing before the muster');
  assert.equal(border.start().ok, true);
  assert.deepEqual(border.view().destinationIds, [BORDER_LEGATE_ID]);
  assert.deepEqual(border.cast(), ['coalition-envoy', 'envoy-guard-north', 'envoy-guard-south'], 'the envoy is already waiting at the stockade');
  assert.equal(border.act('side-empire').ok, false, 'no parley without the Legate’s terms');
  assert.equal(border.act('take-legate-terms').ok, true);
  assert.deepEqual(border.view().destinationIds, ['coalition-envoy']);
  assert.equal(border.act('side-empire').ok, true);
  assert.equal(border.act('side-coalition').ok, false, 'a side is chosen once');
  assert.equal(border.view().side, 'empire');
  assert.deepEqual(border.cast(), ['battle-tribune'], 'the envoy has gone; the Tribune holds the line');
  assert.deepEqual(border.view().destinationIds, ['battle-tribune']);
  const advance = border.act('sound-advance');
  assert.equal(advance.startEncounter, BORDER_ENCOUNTER_ID);
  assert.equal(border.view().stage, 'fighting');
  assert.equal(border.endEncounter(BORDER_ENCOUNTER_ID).ok, true);
  assert.equal(border.view().stage, 'join-line', 'a retreat leaves the line waiting');
  assert.equal(border.resolveBattle(BORDER_ENCOUNTER_ID, 50, 10).ok, false, 'no fight, no verdict');
  border.act('sound-advance');
  assert.equal(border.resolveBattle('other', 50, 10).ok, false);
  assert.equal(border.resolveBattle(BORDER_ENCOUNTER_ID, 50, 10).outcome, 'victory');
  assert.equal(border.view().complete, true);
  assert.match(border.view().detail, /Coalition broke/);
  assert.equal(border.resolveBattle(BORDER_ENCOUNTER_ID, 50, 10).ok, false);
  assert.deepEqual(events.map(event => event.actionId), ['start-chapter', 'take-legate-terms', 'side-empire', 'resolve-border-battle']);
  const lost = createBorderChapter(); lost.start(); lost.act('take-legate-terms'); lost.act('side-coalition'); lost.act('sound-advance');
  assert.equal(lost.resolveBattle(BORDER_ENCOUNTER_ID, 35, 80).outcome, 'defeat');
  assert.deepEqual(lost.cast(), []);
  assert.match(lost.view().detail, /thrown back toward Solis/);
});

test('saves round-trip without a running fight; contradictory saves are refused', () => {
  const border = createBorderChapter(); border.start(); border.act('take-legate-terms'); border.act('side-coalition'); border.act('sound-advance');
  const saved = border.snapshot();
  assert.equal(Object.hasOwn(saved, 'active'), false);
  const other = createBorderChapter();
  assert.equal(other.restore(saved), true);
  assert.equal(other.view().stage, 'join-line'); assert.equal(other.view().side, 'coalition');
  for (const bad of [null, [], {}, { ...saved, version: 2 }, { ...saved, revision: 1 }, { ...saved, side: 'pirates' }, { ...saved, outcome: 'draw' },
    { ...saved, ordered: false }, { ...saved, outcome: 'victory' }, { ...saved, side: null, outcome: 'defeat', revision: 3 }, { ...saved, extra: 1 }]) {
    assert.equal(validateBorderSnapshot(bad), false);
    assert.equal(other.restore(bad), false);
    assert.equal(other.view().side, 'coalition');
  }
  assert.equal(validateBorderSnapshot(undefined), true);
});

test('each side’s encounter is a valid fight against the other side’s soldiers, with the allies placed on the line', () => {
  const world = { bounds: { minX: -900, maxX: 200, minZ: -300, maxZ: 700 }, colliders: [], heightAt: () => 2 };
  for (const [side, look] of [['empire', 'coalition'], ['coalition', 'legion']]) {
    const allies = [{ id: 'merc-brannock', name: 'Brannock', kind: 'legionary' }, { id: 'ally-2', name: 'Legionary', kind: 'legionary' }, { id: 'ally-3', name: 'Tribune', kind: 'officer' }];
    const config = borderEncounter(side, allies);
    assert.equal(config.enemies.length, 6);
    assert.ok(config.enemies.every(enemy => enemy.kind === 'soldier' && enemy.look === look));
    const position = { x: config.checkpoint.x, y: 2, z: config.checkpoint.z };
    const combat = createCombat({ world, position });
    assert.equal(combat.startEncounter(config), true, `${side} encounter validates`);
    assert.equal(combat.state.allies.length, 3);
    assert.deepEqual(combat.state.enemies.map(enemy => enemy.look), Array(6).fill(look));
    assert.ok(combat.state.enemies.filter(enemy => enemy.kind === 'soldier').length === 6);
  }
  assert.equal(borderEncounter('empire', Array.from({ length: 9 }, (_, i) => ({ id: `a${i}`, kind: 'legionary' }))).allies.length, 5, 'five stand with the traveler at most');
});

test('the Legate, the envoy and the commander speak only in their turn, and the envoy names the Coalition truly', () => {
  const border = createBorderChapter(), screens = [], acts = [];
  const context = { border, musterCount: 7, openDialogue: (npc, lines, unused, label, options) => screens.push({ npc, lines, options }), closeDialogue: () => {}, act: id => { acts.push(id); return border.act(id); } };
  const npc = id => BORDER_NPCS.find(person => person.id === id) ?? { id };
  assert.equal(borderConversation(npc(BORDER_LEGATE_ID), context), false);
  border.start();
  assert.equal(borderConversation(npc('coalition-envoy'), context), false, 'the envoy has nothing to say to a man without terms');
  assert.equal(borderConversation(npc(BORDER_LEGATE_ID), context), true);
  assert.match(screens.at(-1).lines[0], /7 of twelve/);
  screens.at(-1).options.choices.find(choice => choice.id === 'take-legate-terms').action();
  assert.equal(borderConversation(npc('coalition-envoy'), context), true);
  const speech = screens.at(-1).lines.join(' ');
  for (const member of ['Izoli', 'Suvali', 'Luscia', 'Pyros', 'Selemis', 'Marosh', 'island cities']) assert.match(speech, new RegExp(member));
  assert.doesNotMatch(speech, /South Pyros/);
  assert.deepEqual(screens.at(-1).options.choices.map(choice => choice.id), ['side-empire', 'side-coalition', 'leave-border']);
  screens.at(-1).options.choices.find(choice => choice.id === 'side-coalition').action();
  assert.equal(borderConversation(npc('battle-tribune'), context), true, 'whoever commands the line speaks');
  assert.equal(borderConversation(npc('coalition-captain'), context), true);
  assert.match(screens.at(-1).lines[0], /Arlen Voss/);
  screens.at(-1).options.choices.find(choice => choice.id === 'sound-advance').action();
  assert.deepEqual(acts, ['take-legate-terms', 'side-coalition', 'sound-advance']);
  assert.equal(border.view().stage, 'fighting');
});
