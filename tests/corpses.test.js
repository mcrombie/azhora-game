import test from 'node:test';
import assert from 'node:assert/strict';
import { createCorpses, corpseId, corpseLoot, CORPSE_TIMING, validateCorpsesSnapshot } from '../src/corpses.js';
import { createInventoryState, INVENTORY_ITEMS, ICON_KINDS } from '../src/inventory.js';
import { sourceModule } from './module-loader.js';
const { createCorpseHost } = await sourceModule('../src/corpse-host.js');
const body = overrides => ({ id: 'enemy:road-ambush:rebel-one', sourceId: 'rebel-one', name: 'Rebel ambusher', kind: 'rebel', x: 8, z: 12, yaw: .8, ...overrides });

test('body identity is stable across event replay and scoped between encounters', () => {
  const corpses = createCorpses();
  assert.equal(corpses.add(body()), true);
  assert.equal(corpses.add(body()), false);
  assert.equal(corpseId({ encounterId: 'a', id: 'one' }), 'enemy:a:one');
  assert.notEqual(corpseId({ encounterId: 'b', id: 'one' }), corpseId({ encounterId: 'a', id: 'one' }));
  assert.equal(corpseId({ npcId: 'glun', encounterId: 'a', id: 'one' }), 'npc:glun');
  assert.equal(corpses.list().length, 1);
});

test('every enemy and NPC type has sensible registered loot without manufacturing quest items', () => {
  for (const kind of ['wolf', 'dog', 'cat', 'spider', 'ogre', 'troll', 'goblin', 'rebel', 'soldier', 'officer', 'archer', 'person']) {
    const items = corpseLoot({ kind });
    assert.ok(items.length, kind);
    for (const item of items) {
      assert.ok(Object.hasOwn(INVENTORY_ITEMS, item.id), item.id);
      assert.notEqual(INVENTORY_ITEMS[item.id].type, 'Quest item');
      assert.ok(ICON_KINDS.includes(INVENTORY_ITEMS[item.id].icon));
    }
    if (['wolf', 'dog', 'cat', 'spider'].includes(kind)) assert.ok(items.every(item => INVENTORY_ITEMS[item.id].type === 'Material'));
  }
  assert.ok(corpseLoot({ model: { wields: 'bearded-axe' } }).some(item => item.id === 'bearded-axe'));
  assert.ok(corpseLoot({ armed: false, model: { role: 'legion-soldier' } }).some(item => item.id === 'ash-spear'), 'A standing guard still owns the grounded spear');
  assert.ok(corpseLoot({ armed: false, model: { role: 'legion-officer' } }).some(item => item.id === 'simple-sword'));
  assert.deepEqual(corpseLoot({ dead: false, kind: 'soldier' }), []);
});

test('loot transfers atomically once and leaves duplicate equipment on the body', () => {
  const corpses = createCorpses(), inventory = createInventoryState();
  corpses.add(body()); inventory.add('simple-sword');
  const first = corpses.loot(body().id, inventory);
  assert.equal(first.ok, true); assert.equal(inventory.count('copper-piece'), 1);
  assert.deepEqual(first.remaining, [{ id: 'simple-sword', quantity: 1 }]);
  assert.equal(corpses.loot(body().id, inventory).ok, false);
  assert.equal(inventory.count('copper-piece'), 1);
  inventory.remove('simple-sword');
  assert.equal(corpses.loot(body().id, inventory).ok, true);
  assert.equal(corpses.get(body().id).lootable, false);
  assert.equal(corpses.loot(body().id, inventory).ok, false);
  assert.equal(inventory.count('simple-sword'), 1);
});

test('failed inventory baskets leave both ownership and corpse loot unchanged', () => {
  const inventory = createInventoryState(), corpses = createCorpses();
  inventory.add('copper-piece', Number.MAX_SAFE_INTEGER); corpses.add(body());
  assert.equal(corpses.loot(body().id, inventory).ok, false);
  assert.equal(inventory.has('simple-sword'), false);
  assert.equal(inventory.count('copper-piece'), Number.MAX_SAFE_INTEGER);
  assert.equal(corpses.get(body().id).loot.length, 2);
  assert.equal(inventory.addMany([{ id: 'wolf-hide', quantity: 1 }, { id: '__proto__', quantity: 1 }]), false);
  assert.equal(inventory.has('wolf-hide'), false);
});

test('wilderness bodies stay full size through weathering, fade only at final decay, and notify locally', () => {
  const events = [], corpses = createCorpses({ onEvent: event => events.push(event) });
  corpses.add(body());
  corpses.update(CORPSE_TIMING.weathered); assert.equal(corpses.get(body().id).phase, 'weathered');
  assert.equal(corpses.get(body().id).opacity, 1);
  corpses.update(CORPSE_TIMING.remains - CORPSE_TIMING.weathered); assert.equal(corpses.get(body().id).phase, 'remains');
  corpses.update(CORPSE_TIMING.decay - CORPSE_TIMING.remains - 20);
  assert.ok(corpses.get(body().id).opacity > 0 && corpses.get(body().id).opacity < 1);
  corpses.update(20, { x: 8, z: 12 });
  assert.equal(corpses.list().length, 0); assert.equal(corpses.add(body()), false);
  const event = events.find(event => event.type === 'body-cleared');
  assert.equal(event.reason, 'decay'); assert.equal(event.nearby, true); assert.match(event.message, /scavengers/);
});

test('town watch covers then collects bodies, and distant removal produces no toast', () => {
  const toasts = [], host = createCorpseHost({ getPosition: () => ({ x: 100, z: 100 }), toast: (...args) => toasts.push(args) });
  host.model.add(body({ settlement: true })); host.update(CORPSE_TIMING.townCover);
  assert.equal(host.model.get(body().id).phase, 'covered');
  host.update(CORPSE_TIMING.townClear - CORPSE_TIMING.townCover);
  assert.equal(host.model.list().length, 0); assert.equal(toasts.length, 0);
});

test('reload preserves pose, gear, partial looting, elapsed time and cleared tombstones', () => {
  const corpses = createCorpses(), inventory = createInventoryState();
  corpses.add(body({ model: { role: 'mercenary', look: { weapon: 'bearded-axe', hair: 0x554433, marks: ['scar'] } } }));
  inventory.add('simple-sword'); corpses.loot(body().id, inventory); corpses.update(501);
  const saved = JSON.parse(JSON.stringify(corpses.snapshot())), restored = createCorpses();
  assert.equal(validateCorpsesSnapshot(saved), true); assert.equal(restored.restore(saved), true);
  assert.deepEqual(restored.snapshot(), saved); assert.equal(restored.get(body().id).age, 501);
  assert.equal(restored.loot(body().id, inventory).ok, false); assert.equal(inventory.count('copper-piece'), 1);
  restored.update(CORPSE_TIMING.decay); const tombstone = restored.snapshot();
  const again = createCorpses(); again.restore(tombstone);
  assert.equal(again.add(body()), false); assert.equal(again.list().length, 0);
});

test('unconscious NPCs cannot be looted or decay, recover cleanly, and may later actually die', () => {
  const inventory = createInventoryState(), host = createCorpseHost({ inventory, getNpc: () => ({ id: 'glun', name: 'Glun', modelRole: 'legion-officer' }) });
  assert.equal(host.captureNpc({ id: 'glun', position: { x: 2, z: 3 }, dead: false }), true);
  host.update(5000); assert.equal(host.model.get('npc:glun').status, 'unconscious');
  assert.equal(host.model.loot('npc:glun', inventory).ok, false); assert.equal(inventory.items().length, 0);
  assert.equal(host.reviveNpc('glun'), true); assert.equal(host.ownsNpc('glun'), false);
  assert.equal(host.captureNpc({ id: 'glun', position: { x: 2, z: 3 }, dead: true }), true);
  assert.equal(host.model.get('npc:glun').status, 'dead');
});

test('combat events and NPC callbacks share one identity; companion ground weapon remains its single source', () => {
  const host = createCorpseHost({ getNpc: id => id === 'friend' ? { id, corpseDead: false } : null, ownsCompanionWeapon: id => id === 'mercenary' });
  const person = { id: 'friend', name: 'Friend', hp: 0, kind: 'soldier', x: 1, z: 2 };
  host.combatEvent({ type: 'enemy-defeated', id: 'friend' }, { encounterId: 'fight', enemies: [person] });
  assert.equal(host.model.get('npc:friend').status, 'unconscious');
  assert.equal(host.captureNpc({ id: 'friend', dead: false, position: person }), false);
  assert.equal(host.model.list().length, 1);
  host.captureCombat({ ...person, id: 'arrest-friend', npcId: 'friend' }, { encounterId: 'other-fight' });
  assert.equal(host.model.list().length, 1, 'An encounter alias resolves to the same named NPC body');
  host.captureCombat({ ...person, id: 'mercenary', weapon: 'greatsword' }, { encounterId: 'fight', ally: true });
  assert.ok(host.model.get('ally:fight:mercenary').loot.every(item => INVENTORY_ITEMS[item.id].type !== 'Weapon'));
});

test('saved state validation rejects invalid loot, duplicate bodies, impossible time and corrupt model data without mutating current state', () => {
  const corpses = createCorpses(); corpses.add(body()); const saved = corpses.snapshot();
  for (const corrupt of [
    data => { data.bodies[0].loot[0].id = '__proto__'; },
    data => { data.bodies.push(data.bodies[0]); },
    data => { data.bodies[0].born = 1; },
    data => { data.bodies[0].model = { broken: Infinity }; },
  ]) {
    const data = structuredClone(saved); corrupt(data); assert.equal(validateCorpsesSnapshot(data), false); assert.equal(corpses.restore(data), false);
    assert.deepEqual(corpses.snapshot(), saved);
  }
  assert.equal(validateCorpsesSnapshot(undefined), true); assert.equal(corpses.restore(undefined), true); assert.equal(corpses.list().length, 0);
});

test('search dialogue takes available loot only once and pauses aging when not playing', () => {
  const inventory = createInventoryState(); let dialogue;
  const host = createCorpseHost({ inventory, getPosition: () => ({ x: 8, z: 12 }), openDialogue: (npc, lines, choices) => { dialogue = { npc, lines, choices }; } });
  host.model.add(body({ kind: 'wolf' })); host.update(200, 0, { playing: false }); assert.equal(host.model.clock, 0);
  assert.equal(host.interact(), true); assert.match(dialogue.lines.join(' '), /Wolf hide/);
  const take = dialogue.choices.find(choice => choice.id === 'loot-body'); take.action(); take.action();
  assert.equal(inventory.count('wolf-hide'), 1); assert.equal(host.nearest().lootable, false);
});

test('loot reports prior stack ownership so collecting sticks cannot repair the held stick', () => {
  const inventory = createInventoryState(), events = [], model = createCorpses({ onEvent: event => events.push(event) });
  inventory.add('forest-stick', 2); model.add(body({ kind: 'ogre' }));
  assert.equal(model.loot(body().id, inventory).ok, true);
  const event = events.find(event => event.type === 'body-looted');
  assert.equal(event.previousCounts['forest-stick'], 2);
  assert.equal(event.previousCounts['copper-piece'], 0);
});

test('crime status names do not overwrite animal identity and cleared NPCs remain owned by the body lifecycle', () => {
  const host = createCorpseHost({ getNpc: id => ({ id, name: 'Hound', dog: true }) });
  host.captureNpc({ id: 'hound', kind: 'dead', dead: true, x: 1, z: 2 });
  assert.equal(host.model.get('npc:hound').kind, 'dog');
  assert.deepEqual(host.model.get('npc:hound').loot, [{ id: 'animal-hide', quantity: 1 }]);
  host.update(CORPSE_TIMING.decay);
  assert.equal(host.ownsNpc('hound'), true, 'Old world lying models must never reappear after decay');
  const bosco = createCorpseHost({ getNpc: id => ({ id, name: 'Bosco', dog: true, kind: 'bosco', model: { dye: 0xff00aa } }) });
  bosco.captureNpc({ id: 'bosco', kind: 'dead', dead: true, x: 1, z: 2 });
  assert.equal(bosco.model.get('npc:bosco').kind, 'bosco', 'A health-profile dog flag must not replace a custom model');
  assert.equal(bosco.model.get('npc:bosco').model.dye, 0xff00aa);
});
