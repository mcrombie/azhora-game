import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { INVENTORY_ITEMS } from '../src/inventory.js';
import { TROUPE_STOPS, TROUPE_PEOPLE, TROUPE_STAY, TROUPE_UNSEEN, TROUPE_HEAR, PLAYBILL_ITEM, REGULAR_AFTER, TWIST_IDS, SUGGESTIONS,
  wagonPoint, wagonBodies, createTroupe, improvScene, suggestionChoices, twistChoices, troupeConversation, troupeThanks, validateTroupeSnapshot } from '../src/troupe.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const sequence = values => { let i = 0; return () => values[i++ % values.length]; };
const talker = () => {
  const log = { opened: null, acted: [] };
  return { log, context: { openDialogue: (npc, lines, event, close, options) => { log.opened = { lines, options }; }, closeDialogue() {}, act: action => log.acted.push(action) } };
};
const choose = (log, id) => { const choice = log.opened.options.choices.find(c => c.id === id || c.id.startsWith(id)); assert.ok(choice, `no ${id} among ${log.opened.options.choices.map(c => c.id)}`); choice.action(); };

test('eight camps across the country, each on level open ground with room for the wagon, the mare and an audience', () => {
  const regions = new Set();
  for (const s of TROUPE_STOPS) {
    regions.add(s.region);
    const heights = [];
    const footprint = [];
    for (let lx = -2.6; lx <= 6.4; lx += .6) for (let lz = -1.6; lz <= 1.6; lz += .6) footprint.push([lx, lz]);   // the wagon and the mare
    for (let lx = -3.4; lx <= 3.4; lx += .8) for (let lz = 2; lz <= 8; lz += .8) footprint.push([lx, lz]);       // the audience
    for (const [lx, lz] of footprint) {
      const p = wagonPoint(s, lx, lz);
      assert.ok(canStand(p.x, p.z, world, .3), `${s.id}: open ground at ${lx}, ${lz}`);
      assert.equal(world.regionAt(p.x, p.z)?.name, s.region, `${s.id} lies in ${s.region}`);
      heights.push(world.heightAt(p.x, p.z));
    }
    assert.ok(Math.max(...heights) - Math.min(...heights) < 1, `${s.id} is level enough`);
    for (const [id, home] of Object.entries(world.npcPositions)) assert.ok(Math.hypot(home.x - s.x, home.z - s.z) > 9, `${s.id} is clear of ${id}`);
    for (const body of wagonBodies(s)) assert.ok(Number.isFinite(body.x) && body.r > 0);
  }
  assert.ok(regions.size >= 7, 'from Drent to Amod');
  for (const who of TROUPE_PEOPLE) assert.ok(who.spot.length === 3);
});

test('they move on only when nobody is watching, never while playing, and are heard before they are seen', () => {
  const troupe = createTroupe({ random: sequence([.3, .7, .1, .9]), start: 'avrel' });
  const avrel = troupe.stop, near = { x: avrel.x + 20, z: avrel.z };
  const [heard] = troupe.update(1, near);
  assert.equal(heard.type, 'heard'); assert.ok(heard.line.length > 20);
  assert.deepEqual(troupe.update(1, near), [], 'heard once per camp');
  assert.deepEqual(troupe.update(TROUPE_STAY * 2, near), [], 'not while the traveler is by');
  troupe.beginScene();
  assert.deepEqual(troupe.update(TROUPE_STAY * 2, { x: 99999, z: 0 }), [], 'not mid-play');
  troupe.cancelScene();
  const far = { x: avrel.x + TROUPE_UNSEEN * 4, z: avrel.z };
  const [moved] = troupe.update(1, far);
  assert.equal(moved.type, 'moved'); assert.notEqual(moved.to.id, 'avrel');
  assert.ok(Math.hypot(moved.to.x - far.x, moved.to.z - far.z) > TROUPE_UNSEEN, 'nor where the traveler is');
  assert.ok(TROUPE_HEAR < TROUPE_UNSEEN);
});

test('a play made of the traveler’s place, thing and trouble, turned by the traveler, and Isaura dies in it', () => {
  const chosen = { place: 'the Caloss bridge', thing: 'a turnip', trouble: 'hiccups' };
  const first = improvScene({ ...chosen, random: sequence([.1, .5]) });
  assert.match(first.title, /Turnip|Hiccups/);
  assert.match(first.opening.join(' '), /turnip/); assert.match(first.opening.join(' '), /What happens next/);
  for (const twist of TWIST_IDS) {
    const scene = improvScene({ ...chosen, twist, random: sequence([.4, .2, .8]), death: 413, form: first.kind });
    assert.ok(scene.turn.length === 3 && scene.ending.length === 2, twist);
    assert.match(scene.turn.join(' '), /Isaura/, `${twist}: she dies`);
  }
  assert.match(improvScene({ ...chosen, twist: 'no' }).turn.join(' '), /nothing happens/);
  assert.match(improvScene({ ...chosen, twist: 'twin', death: 413 }).turn.join(' '), /413th/);
  assert.equal(suggestionChoices('place', sequence([.2, .6, .9]), 'the Avrel clearing').includes('the Avrel clearing'), true, 'where you stand is a choice');
  assert.ok(twistChoices(Math.random).includes('no'), 'no is always on offer, because Galeon cannot say it');
  for (const kind of Object.keys(SUGGESTIONS)) assert.ok(SUGGESTIONS[kind].length >= 10);
});

test('Galeon’s whole play: the suggestions, the turn, the hat; the third play makes you a regular', () => {
  const troupe = createTroupe({ start: 'avrel' }), { log, context } = talker();
  const galeon = { id: 'troupe-galeon' };
  troupeConversation(galeon, { ...context, troupe, purse: 2, here: 'the edge of the Avrel clearing' });
  assert.deepEqual(log.acted, ['troupe-meet']);
  assert.match(log.opened.lines.join(' '), /Talaelos/);
  choose(log, 'troupe-scene');
  assert.match(log.opened.lines[0], /place/); choose(log, 'troupe-place-0');
  assert.match(log.opened.lines[0], /thing/); choose(log, 'troupe-thing-surprise');
  assert.match(log.opened.lines[0], /trouble/); choose(log, 'troupe-trouble-1');
  assert.ok(log.acted.includes('troupe-scene-begin'));
  const twists = log.opened.options.choices.map(c => c.id);
  assert.equal(twists.length, 3); assert.ok(twists.includes('troupe-twist-no'));
  choose(log, 'troupe-twist-no');
  const tips = Object.fromEntries(log.opened.options.choices.map(c => [c.id, c.enabled ?? true]));
  assert.deepEqual(tips, { 'troupe-tip-1': true, 'troupe-tip-3': false, 'troupe-tip-5': false, 'troupe-applaud': true }, 'you can only give what you carry');
  choose(log, 'troupe-applaud');
  assert.equal(log.acted.at(-1), 'troupe-tip-0');
  troupe.beginScene();
  const ends = [troupe.endScene(), troupe.endScene(), troupe.endScene(), troupe.endScene()];
  assert.deepEqual(ends.map(e => e.gift), [false, false, true, false], `the playbill after ${REGULAR_AFTER}, once`);
  assert.equal(troupeThanks(3, true).length, 3);
  assert.equal(INVENTORY_ITEMS[PLAYBILL_ITEM].type, 'Quest item');
});

test('everyone in the company has something to say, and the dog and the mare have something to do', () => {
  const troupe = createTroupe({ start: 'avrel' });
  for (const who of TROUPE_PEOPLE) {
    const { log, context } = talker();
    assert.equal(troupeConversation({ id: who.id }, { ...context, troupe }), true, who.id);
    assert.ok(log.opened.lines.join(' ').length > 10, `${who.id} speaks`);
  }
  const { log, context } = talker();
  troupeConversation({ id: 'troupe-isaura' }, { ...context, troupe });
  choose(log, 'isaura-show');
  assert.deepEqual(log.acted, ['troupe-isaura-dies']);
  const saved = troupe.snapshot(), again = createTroupe();
  assert.equal(validateTroupeSnapshot(saved), true);
  assert.ok(again.restore(saved) && again.stop.id === 'avrel');
  assert.equal(validateTroupeSnapshot({ ...saved, stop: 'the moon' }), false);
  assert.equal(validateTroupeSnapshot({ ...saved, gifted: true, scenes: 1 }), false, 'no playbill before three plays');
});
