import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { ELOD_LIGHT, RIVAL_HEAD, LANDING, SUBTRACTIDAUGHTER, SUBTRACTIDAUGHTER_STAND, LENS_ITEM, LENS,
  SISTER_TOLD, SISTER_WHY, CROSSING_PLAN, RIVAL_FIRST, RIVAL_CASE, RIVAL_WATCHES, RIVAL_UNSEEN,
  HEIST_ENDINGS, HEIST_ENDING_IDS, createHeist, rivalConversation, validateHeistSnapshot } from '../src/rival-light.js';
import { SUVAL_LIGHT, ADDISON, createLightKeeper, addisonConversation } from '../src/lighthouse.js';
import { createBatmanHunt } from '../src/batman.js';
import { insideRegion, SEA_LEVEL } from '../src/region-world.js';
import { closedRegionEntered, CLOSED_REGIONS } from '../src/closed-border.js';
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
const rival = { id: SUBTRACTIDAUGHTER.id };
/** Everything up to the moment the glass comes off the cradle. */
const upToTheStair = () => {
  const heist = createHeist();
  heist.tell(); heist.accept(); heist.land();
  return heist;
};

test('the twins keep the two lights of this sea, one on each coast', () => {
  assert.equal(SUVAL_LIGHT.region, 'West Suval');
  assert.equal(ELOD_LIGHT.region, 'East Suval');
  assert.equal(insideRegion('West Suval', SUVAL_LIGHT.tower.x, SUVAL_LIGHT.tower.z), true);
  assert.equal(insideRegion('East Suval', ELOD_LIGHT.tower.x, ELOD_LIGHT.tower.z), true);
  // Hers is the better site and the better tower, which is half of why this is a quest.
  assert.ok(ELOD_LIGHT.tower.height > SUVAL_LIGHT.tower.height + 4, 'her tower is taller');
  assert.ok(ELOD_LIGHT.yard.height > SUVAL_LIGHT.yard.height, 'and her wall is higher');
  // And she has the two things Addison does not: a derrick over the cliff, and salvage in the yard.
  assert.ok(ELOD_LIGHT.winch && ELOD_LIGHT.salvage.length >= 4);
  assert.equal(SUVAL_LIGHT.winch, undefined);
});

test('East Suval is shut, so the only way in is the one Addison sails', () => {
  assert.ok(CLOSED_REGIONS.includes('East Suval'));
  // Walking across the border is refused wherever it happens...
  const outside = { x: SUVAL_LIGHT.tower.x, z: SUVAL_LIGHT.tower.z };
  assert.equal(closedRegionEntered(outside, { x: RIVAL_HEAD.x, z: RIVAL_HEAD.z }), 'East Suval');
  // ...but the landing is inside it, which is why she puts the traveler there by boat.
  assert.equal(insideRegion('East Suval', LANDING.x, LANDING.z), true);
  // And moving about once ashore is not a crossing at all.
  assert.equal(closedRegionEntered({ x: LANDING.x, z: LANDING.z }, { x: RIVAL_HEAD.x, z: RIVAL_HEAD.z }), null);
  // The landing is below the tower and a short climb from it.
  const climb = Math.hypot(LANDING.x - ELOD_LIGHT.tower.x, LANDING.z - ELOD_LIGHT.tower.z);
  assert.ok(climb > 20 && climb < 60, `the boat lies off the head, not in the yard (${climb.toFixed(0)}m)`);
});

test('the glass is the power of the light, and it is one carryable thing', () => {
  assert.ok(INVENTORY_ITEMS[LENS_ITEM], 'the lens is a real item');
  assert.match(INVENTORY_ITEMS[LENS_ITEM].description, /not the fire, the glass/);
  assert.match(LENS.why, /twenty miles/);
  assert.match(SISTER_WHY.join(' '), /It is the glass/);
  // Addison wants the lens and says so: not the tower, not her sister.
  assert.match(SISTER_WHY.join(' '), /not the tower, not her/);
});

test('the heist happens in order, and cannot be skipped to the end', () => {
  const heist = createHeist();
  assert.equal(heist.stage, 'unknown');
  assert.equal(heist.accept().ok, false, 'she has not told you yet');
  assert.equal(heist.land().ok, false);
  assert.equal(heist.take().ok, false);
  assert.equal(heist.finish('sea').ok, false);
  assert.equal(heist.tell().ok, true);
  assert.equal(heist.tell().ok, false, 'she only says it once');
  assert.equal(heist.accept().ok, true);
  assert.equal(heist.land().ok, true);
  assert.equal(heist.ashore, true);
  const granted = [];
  assert.equal(heist.take({ grant: id => granted.push(id) }).ok, true);
  assert.deepEqual(granted, [LENS_ITEM]);
  assert.equal(heist.carrying, true);
  assert.equal(heist.home().ok, true);
  assert.equal(heist.stage, 'home');
});

test('she does not stop anybody, whether or not she is spoken to', () => {
  // Spoken to: she watches, and says one thing at the end that Addison has never asked about.
  const met = upToTheStair();
  const first = talk(rivalConversation, rival, { heist: met });
  assert.deepEqual(first.screens[0].lines, [...RIVAL_FIRST]);
  assert.equal(met.stage, 'met');
  assert.equal(met.spoke, true);
  first.pick('rival-case');
  assert.deepEqual(first.screens.at(-1).lines, [...RIVAL_CASE]);
  assert.match(RIVAL_CASE.join(' '), /some people matter more than other people/);
  first.pick('take-lens');
  assert.deepEqual(first.acted, ['take-lens']);
  assert.match(RIVAL_WATCHES.join(' '), /Marrow Girl was not me/);

  // Never spoken to: nobody comes, and somebody is at the rail when you look back.
  const quiet = upToTheStair();
  assert.equal(quiet.spoke, false);
  assert.equal(quiet.take().ok, true);
  assert.match(RIVAL_UNSEEN.join(' '), /watching you get into it/);
});

test('every ending is a real outcome, and only one of them ends the glass', () => {
  for (const id of HEIST_ENDING_IDS) {
    const heist = upToTheStair();
    heist.take(); heist.home();
    const result = heist.finish(id);
    assert.equal(result.ok, true);
    assert.equal(heist.stage, 'done');
    assert.ok(result.outcome.outcome.length > 140, `${id} says what actually happens`);
    assert.equal(heist.finish('sea').ok, false, 'it is decided once');
  }
  assert.match(HEIST_ENDINGS.keep.outcome, /her own stair/);
  assert.match(HEIST_ENDINGS.conclave.outcome, /new keeper/);
  assert.match(HEIST_ENDINGS.sea.outcome, /Nobody will ever make another/);
});

test('Addison works up to it, and hands the decision back at the end', () => {
  const keeper = createLightKeeper(), hunt = createBatmanHunt(), heist = createHeist();
  keeper.meet();
  const npc = { id: ADDISON.id };
  const quiet = talk(addisonConversation, npc, { light: keeper, hunt, heist });
  assert.equal(quiet.has('light-sister'), true, 'the other light can be asked about');
  quiet.pick('light-sister');
  assert.deepEqual(quiet.acted, ['sister-tell']);
  assert.match(SISTER_TOLD.join(' '), /Subtractidaughter/);
  assert.match(SISTER_TOLD.join(' '), /she shows it from the wrong place/);

  heist.tell();
  const asked = talk(addisonConversation, npc, { light: keeper, hunt, heist });
  assert.equal(asked.has('light-sister-ask'), true);
  heist.accept();
  const sail = talk(addisonConversation, npc, { light: keeper, hunt, heist });
  assert.equal(sail.has('light-sail'), true);
  assert.match(CROSSING_PLAN.join(' '), /do not drop the glass/);

  // Ashore, she is not at her own light to be talked to; back home, she will not decide.
  heist.land(); heist.take(); heist.home();
  const decide = talk(addisonConversation, npc, { light: keeper, hunt, heist });
  assert.equal(decide.has('light-decide'), true);
  decide.pick('light-decide');
  for (const id of HEIST_ENDING_IDS) assert.equal(decide.has(`glass-${id}`), true, `${id} is offered`);
});

test('her tower is built, on a head with the sea on two sides of it', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const scene = new THREE.Scene(), world = createWorld(scene);
  assert.ok(scene.getObjectByName(ELOD_LIGHT.name), 'the Elod Light is built');
  assert.ok(scene.getObjectByName(`${ELOD_LIGHT.name} gear`), 'and its yard has things in it');
  assert.ok(world.colliders.some(c => c.kind === 'lighthouse-winch'), 'the derrick is solid');
  const t = ELOD_LIGHT.tower;
  assert.ok(world.heightAt(t.x, t.z) > SEA_LEVEL + 12, 'seventeen metres up');
  const wet = [[0, -40], [40, 0], [28, -28]].filter(([dx, dz]) => world.heightAt(t.x + dx, t.z + dz) < SEA_LEVEL);
  assert.ok(wet.length >= 2, 'sea on two sides of her head');
  // The shingle she is landed on is at the water's edge, not up the cliff.
  assert.ok(world.heightAt(LANDING.x, LANDING.z) < world.heightAt(t.x, t.z) - 8, 'the landing is under the head');
});

test('the business with the other light survives a save', () => {
  const heist = upToTheStair();
  heist.meet(); heist.take(); heist.home(); heist.finish('conclave');
  const restored = createHeist();
  assert.equal(restored.restore(heist.snapshot()), true);
  assert.equal(restored.stage, 'done');
  assert.equal(restored.ending, 'conclave');
  assert.equal(restored.spoke, true);
  assert.equal(validateHeistSnapshot(undefined), true);
  assert.equal(validateHeistSnapshot({ version: 1, stage: 'landed', spoke: false, ending: null }), true);
  assert.equal(validateHeistSnapshot({ version: 1, stage: 'swimming', spoke: false, ending: null }), false);
  assert.equal(validateHeistSnapshot({ version: 1, stage: 'done', spoke: true, ending: 'sold-it' }), false);
  assert.equal(validateHeistSnapshot({ version: 2, stage: 'done', spoke: true, ending: 'sea' }), false);
});
