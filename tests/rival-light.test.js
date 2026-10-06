import test from 'node:test';
import assert from 'node:assert/strict';
import { ELOD_LIGHT, RIVAL_HEAD, SUBTRACTIDAUGHTER, SUBTRACTIDAUGHTER_STAND, BLOCKHOUSE_DOOR, SOVIK, SOVIK_ITEM, KEY_ITEM, PASSPORT_ITEM,
  SMUGGLERS_DOOR, LIGHT_GUARDS, TOWER_STEP, ROUTE_IN, ROUTE_OUT, SISTER_TOLD, SISTER_WHY, CROSSING_PLAN, ADDISON_AFTER, SOVIK_MET,
  SOVIK_TAKEN, RIVAL_FIRST, RIVAL_CASE, RIVAL_YIELDS, RIVAL_AFTER, HEIST_ENDINGS, HEIST_ENDING_IDS, WATCH_FIGHT_ID, LIGHT_FIGHT_ID,
  createHeist, rivalConversation, validateHeistSnapshot, watchesTraveler, watchFight, arenaAround } from '../src/content/quests/rival-light/rival-light.js';
import { SUVAL_LIGHT, ADDISON, createLightKeeper, addisonConversation } from '../src/content/quests/lighthouse/lighthouse.js';
import { createBatmanHunt } from '../src/content/quests/batman/batman.js';
import { insideRegion } from '../src/world/terrain/region-world.js';
import { closedRegionEntered, CLOSED_REGIONS } from '../src/world/travel/closed-border.js';
import { INVENTORY_ITEMS } from '../src/gameplay/inventory/inventory.js';
import { createCombat, ENEMY_KINDS } from '../src/gameplay/combat/combat.js';

/**
 * Addison's errand, as the user set it on 26 September 2026: steal the fire spirit (loosely
 * Calcifer) out of her rival's lighthouse, quietly - he is dangerous to touch - or by fighting past
 * Subtractidaughter and the Elodi guards; in through a secret passage with Addison's key; the guards
 * attack anybody they see without a passport; and smuggle him back to her.
 */
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
const satchel = () => { const items = new Map(); return { items, grant: id => items.set(id, (items.get(id) ?? 0) + 1),
  remove: (id, n = 1) => items.set(id, Math.max(0, (items.get(id) ?? 0) - n)), count: id => items.get(id) ?? 0 }; };
const errand = () => { const heist = createHeist(), bag = satchel(); heist.tell(); heist.accept(bag); return { heist, bag }; };

test('the twins keep the two lights of this coast, one either side of the ridge', () => {
  assert.equal(SUVAL_LIGHT.region, 'West Suval');
  assert.equal(ELOD_LIGHT.region, 'East Suval');
  assert.equal(insideRegion('West Suval', SUVAL_LIGHT.tower.x, SUVAL_LIGHT.tower.z), true);
  assert.equal(insideRegion('East Suval', ELOD_LIGHT.tower.x, ELOD_LIGHT.tower.z), true);
  assert.ok(ELOD_LIGHT.tower.height > SUVAL_LIGHT.tower.height + 4, 'her tower is taller');
  assert.ok(ELOD_LIGHT.yard.height > SUVAL_LIGHT.yard.height, 'and her wall is higher');
  assert.ok(ELOD_LIGHT.winch && ELOD_LIGHT.salvage.length >= 4);
  assert.ok(ELOD_LIGHT.yard.postern, 'and it has a postern on the land side');
});

test('the power of her light is a fire spirit, and he is dangerous to touch', () => {
  assert.equal(SOVIK.name, 'Sovik');
  assert.ok(INVENTORY_ITEMS[SOVIK_ITEM], 'he can be carried');
  assert.ok(SOVIK.burn >= 20, 'and he burns');
  assert.ok(SOVIK.glow > 1, 'and he glows, so the watch sees a traveler carrying him farther off');
  assert.match(SISTER_WHY.join(' '), /It is not the glass/);
  assert.match(SISTER_WHY.join(' '), /not the tower, not her\. The fire/);
  assert.match(SOVIK_MET.join(' '), /face in it/);
  assert.match(SOVIK_TAKEN.join(' '), /live coal/);
});

test('Addison’s key opens a secret passage through the ridge into a country that is shut', () => {
  assert.ok(CLOSED_REGIONS.includes('East Suval'));
  assert.ok(INVENTORY_ITEMS[KEY_ITEM], 'the key is a real thing');
  const { west, east } = SMUGGLERS_DOOR;
  assert.equal(insideRegion('West Suval', west.x, west.z), true, 'the door is on her side');
  assert.equal(insideRegion('East Suval', east.x, east.z), true, 'the hatch on the other');
  assert.equal(closedRegionEntered(west, east), 'East Suval', 'walking it would be a crossing the pickets refuse');
  assert.ok(Math.hypot(west.x - east.x, west.z - east.z) < 20, 'it goes straight under the ridge');
  assert.ok(Math.hypot(west.x - SUVAL_LIGHT.tower.x, west.z - SUVAL_LIGHT.tower.z) < 420, 'a walk east from her light');
  assert.match(CROSSING_PLAN.join(' '), /smugglers’ door/);
  assert.match(CROSSING_PLAN.join(' '), /papers/);
});

test('the Elodi attack anybody they see in East Suval without a passport', () => {
  assert.equal(watchesTraveler({ inside: true, passport: false }), true);
  assert.equal(watchesTraveler({ inside: true, passport: true }), false, 'papers are enough');
  assert.equal(watchesTraveler({ inside: false, passport: false }), false, 'and outside it they are nobody’s business');
  assert.ok(INVENTORY_ITEMS[PASSPORT_ITEM]);
  assert.match(INVENTORY_ITEMS[PASSPORT_ITEM].description, /Nobody has been given any/);
  assert.equal(LIGHT_GUARDS.length, 2);
  for (const guard of LIGHT_GUARDS) assert.equal(insideRegion('East Suval', guard.x, guard.z), true);
});

test('the watch’s fight fits the combat’s arena from wherever it catches the traveler, and she comes with it at the light', () => {
  const world = { bounds: { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 }, colliders: [], heightAt: () => 1, regionAt: () => ({ name: 'East Suval' }), npcPositions: {} };
  for (const traveler of [{ x: 15, z: 730 }, { x: -5, z: 720 }, { x: 40, z: 700 }, { x: TOWER_STEP.x, z: TOWER_STEP.z }, { x: 0, z: 690 }, { x: -1, z: 727 }]) {
    const spec = watchFight({ traveler, guards: LIGHT_GUARDS, rival: BLOCKHOUSE_DOOR });
    assert.equal(spec.id, LIGHT_FIGHT_ID);
    assert.ok(createCombat({ world, position: { ...traveler, y: 1 } }).startEncounter(spec), `a fight starts with the traveler at ${JSON.stringify(traveler)}`);
    const her = spec.enemies.find(e => e.npcId === SUBTRACTIDAUGHTER.id);
    assert.equal(her.kind, 'timekeeper'); assert.equal(her.yields, true); assert.ok(her.entry > 0, 'a few seconds behind the guards');
    assert.equal(her.model.look.clock, true, 'with her clock');
  }
  // Far from the light it is only the guards.
  const alone = watchFight({ traveler: { x: -350, z: 740 }, guards: [{ id: 'elodi-west-pass-guard-a', x: -345, z: 730 }] });
  assert.equal(alone.id, WATCH_FIGHT_ID); assert.equal(alone.enemies.length, 1);
  assert.equal(watchFight({ traveler: { x: 0, z: 0 }, guards: [] }), null, 'nobody to fight, no fight');
  assert.equal(arenaAround({ x: 0, z: 0 }, [{ x: -80, z: 0 }, { x: 80, z: 0 }]), null, 'people too far apart for one fight');
});

test('Subtractidaughter is the strongest thing in the fight, casts Time, and yields', () => {
  const kind = ENEMY_KINDS.timekeeper;
  assert.ok(kind.damage > ENEMY_KINDS.rebel.damage && kind.fixedStats, 'she hits harder than the guards, and at her own strength');
  assert.equal(kind.spell.id, 'slow');
  assert.ok(SUBTRACTIDAUGHTER.health >= 300);
  assert.match(RIVAL_YIELDS.join(' '), /Take him, then/);
});

test('the errand happens in order: told, the key, the fire, home, decided', () => {
  const heist = createHeist(), bag = satchel();
  assert.equal(heist.accept(bag).ok, false, 'she has not told you yet');
  assert.equal(heist.take(bag).ok, false);
  assert.equal(heist.finish('keep').ok, false);
  assert.equal(heist.tell().ok, true);
  assert.equal(heist.tell().ok, false, 'she only says it once');
  assert.equal(heist.accept(bag).ok, true);
  assert.equal(bag.count(KEY_ITEM), 1, 'and gives you the key');
  assert.equal(heist.errand, true); assert.equal(heist.carrying, false);
  const taken = heist.take(bag);
  assert.equal(taken.ok, true); assert.equal(taken.way, 'quiet'); assert.equal(taken.burn, SOVIK.burn);
  assert.equal(bag.count(SOVIK_ITEM), 1); assert.equal(heist.carrying, true);
  assert.equal(heist.take(bag).ok, false, 'there is one of him');
  assert.equal(heist.deliver(bag).ok, true);
  assert.equal(bag.count(SOVIK_ITEM), 0, 'he goes into her scuttle');
  assert.equal(heist.stage, 'home');
});

test('a light that was roused is a fire that was fought for', () => {
  const { heist, bag } = errand();
  assert.equal(heist.rouse(), true);
  assert.equal(heist.rouse(), false, 'once');
  assert.equal(heist.take(bag).way, 'fought');
  assert.equal(heist.alarm, true);
});

test('every ending is a real outcome', () => {
  for (const id of HEIST_ENDING_IDS) {
    const { heist, bag } = errand();
    heist.take(bag); heist.deliver(bag);
    const result = heist.finish(id);
    assert.equal(result.ok, true);
    assert.equal(heist.stage, 'done');
    assert.ok(result.outcome.outcome.length > 140, `${id} says what actually happens`);
    assert.equal(heist.finish('keep').ok, false, 'it is decided once');
  }
  assert.deepEqual(HEIST_ENDING_IDS, ['keep', 'conclave', 'free']);
  assert.match(HEIST_ENDINGS.keep.outcome, /her eleven wicks/);
  assert.match(HEIST_ENDINGS.free.outcome, /Nobody will ever steer on him again/);
});

test('Addison works up to it, gives the key, takes the fire, and hands the decision back', () => {
  const keeper = createLightKeeper(), hunt = createBatmanHunt(), heist = createHeist(), bag = satchel();
  keeper.meet();
  const npc = { id: ADDISON.id };
  const first = talk(addisonConversation, npc, { light: keeper, hunt, heist });
  first.pick('light-sister');
  assert.deepEqual(first.acted, ['sister-tell']);
  assert.match(SISTER_TOLD.join(' '), /Subtractidaughter/);
  heist.tell();
  const asked = talk(addisonConversation, npc, { light: keeper, hunt, heist });
  asked.pick('light-sister-ask');
  assert.deepEqual(asked.acted, ['sister-ask']);
  heist.accept(bag);
  const again = talk(addisonConversation, npc, { light: keeper, hunt, heist });
  again.pick('light-passage');
  assert.deepEqual(again.screens.at(-1).lines, [...CROSSING_PLAN], 'she will go over the way again');
  heist.take(bag);
  const carrying = talk(addisonConversation, npc, { light: keeper, hunt, heist });
  carrying.pick('light-deliver');
  assert.deepEqual(carrying.acted, ['sovik-deliver']);
  heist.deliver(bag);
  const decide = talk(addisonConversation, npc, { light: keeper, hunt, heist });
  decide.pick('light-decide');
  assert.deepEqual(decide.screens.at(-1).lines, [...ADDISON_AFTER]);
  for (const id of HEIST_ENDING_IDS) assert.equal(decide.has(`fire-${id}`), true, `${id} is offered`);
});

test('Subtractidaughter talks when she is awake to talk, and makes her case', () => {
  const { heist } = errand(), rival = { id: SUBTRACTIDAUGHTER.id };
  const first = talk(rivalConversation, rival, { heist });
  assert.deepEqual(first.screens[0].lines, [...RIVAL_FIRST]);
  assert.equal(heist.spoke, true);
  first.pick('rival-case');
  assert.match(first.screens.at(-1).lines.join(' '), /some people matter more than other people/);
  heist.take(); heist.deliver(); heist.finish('free');
  const after = talk(rivalConversation, rival, { heist, visits: 2 });
  assert.deepEqual(after.screens[0].lines, [RIVAL_AFTER[2]]);
  assert.match(RIVAL_AFTER[2], /clock/);
  assert.ok(Math.hypot(SUBTRACTIDAUGHTER_STAND.x - RIVAL_HEAD.x, SUBTRACTIDAUGHTER_STAND.z - RIVAL_HEAD.z) < 9, 'her place is at her tower');
});

test('the quiet way in is laid from the hatch to the tower step, and out the same way', () => {
  assert.deepEqual(ROUTE_IN[0], { x: SMUGGLERS_DOOR.east.x, z: SMUGGLERS_DOOR.east.z });
  assert.ok(Math.hypot(ROUTE_IN.at(-1).x - TOWER_STEP.x, ROUTE_IN.at(-1).z - TOWER_STEP.z) < .01);
  assert.deepEqual(ROUTE_OUT, [...ROUTE_IN].reverse());
  for (const p of ROUTE_IN) assert.equal(insideRegion('East Suval', p.x, p.z), true, `${JSON.stringify(p)} is in East Suval`);
});

test('the errand survives a save, and the first saves (a boat and a lens) keep their place', () => {
  const { heist, bag } = errand();
  heist.meet(); heist.rouse(); heist.take(bag); heist.deliver(bag); heist.finish('conclave');
  const restored = createHeist();
  assert.equal(restored.restore(heist.snapshot()), true);
  assert.deepEqual(restored.snapshot(), heist.snapshot());
  assert.equal(validateHeistSnapshot(undefined), true);
  const old = saved => { const h = createHeist(); assert.equal(h.restore(saved), true, JSON.stringify(saved)); return h; };
  assert.equal(old({ version: 1, stage: 'landed', spoke: false, ending: null }).stage, 'asked', 'put ashore is holding the key');
  assert.equal(old({ version: 1, stage: 'met', spoke: true, ending: null }).stage, 'asked');
  assert.equal(old({ version: 1, stage: 'taken', spoke: false, ending: null }).stage, 'taken', 'carrying the lens is carrying him');
  const sea = old({ version: 1, stage: 'done', spoke: true, ending: 'sea' });
  assert.equal(sea.ending, 'free', 'over the side is let go');
  assert.equal(validateHeistSnapshot({ version: 1, stage: 'swimming', spoke: false, ending: null }), false);
  assert.equal(validateHeistSnapshot({ version: 2, stage: 'done', spoke: true, alarm: false, way: 'quiet', ending: 'sold-it' }), false);
  assert.equal(validateHeistSnapshot({ version: 2, stage: 'taken', spoke: true, alarm: false, way: null, ending: null }), false, 'carrying him means he came out somehow');
  assert.equal(validateHeistSnapshot({ version: 2, stage: 'done', spoke: true, alarm: false, way: 'quiet', ending: null }), false, 'done is decided');
});
