import test from 'node:test';
import assert from 'node:assert/strict';
import { createRivalLightHost } from '../src/content/quests/rival-light/rival-light-host.js';
import { createHeist, SMUGGLERS_DOOR, LIGHT_GUARDS, TOWER_STEP, SUBTRACTIDAUGHTER, SOVIK, SOVIK_ITEM, KEY_ITEM, PASSPORT_ITEM,
  LIGHT_FIGHT_ID, RIVAL_YIELDS } from '../src/content/quests/rival-light/rival-light.js';

function fixture({ key = false, stage = 'asked', at = { x: SMUGGLERS_DOOR.west.x, z: SMUGGLERS_DOOR.west.z } } = {}) {
  const heist = createHeist(), items = new Map(), placed = [], started = [], toasts = [], dialogues = [], shown = [];
  const inventory = { count: id => items.get(id) ?? 0, grant: id => items.set(id, (items.get(id) ?? 0) + 1),
    remove: (id, n = 1) => items.set(id, Math.max(0, (items.get(id) ?? 0) - n)), refresh() {} };
  if (stage !== 'unknown') { heist.tell(); if (stage !== 'told') heist.accept(key ? inventory : null); }
  const person = (id, p, yaw, modelRole) => ({ id, name: id, modelRole, hidden: false, fallen: false,
    actor: { group: { position: { x: p.x, y: 0, z: p.z }, rotation: { y: yaw } } } });
  const people = [...LIGHT_GUARDS.map(g => person(g.id, g, g.yaw, 'elodi-guard')), person(SUBTRACTIDAUGHTER.id, { x: 0, z: 0 }, 0, 'rival-keeper')];
  const player = { group: { position: { x: at.x, y: 0, z: at.z } } };
  const combat = { state: { phase: 'peaceful', encounterId: null, player: { hp: 100, maxHp: 100 } },
    startEncounter(spec) { started.push(spec); this.state.phase = 'active'; this.state.encounterId = spec.id; return true; },
    exhaust(wind, harm) { this.state.player.hp -= harm; } };
  const host = createRivalLightHost({ heist, world: { npcPositions: {}, colliders: [] }, player, combat, inventory, people: () => people,
    place: (x, z, yaw) => { placed.push({ x, z, yaw }); Object.assign(player.group.position, { x, z }); },
    toast: (...t) => toasts.push(t), openDialogue: (who, lines, a, b, options = {}) => dialogues.push({ who: who.id, speaker: who, lines, options }),
    showSovik: where => shown.push(where) });
  const tick = (seconds = .1) => { for (let t = 0; t < seconds; t += .05) host.frame(.05, { playing: true }); };
  const moveTo = p => Object.assign(player.group.position, { x: p.x, z: p.z });
  return { heist, items, inventory, placed, started, toasts, dialogues, shown, people, player, combat, host, tick, moveTo };
}

test('the smugglers’ door is locked without Addison’s key, and with it goes under the ridge both ways', () => {
  const locked = fixture({ key: false });
  locked.tick();
  assert.equal(locked.host.nearby.id, 'smugglers-door-locked');
  locked.host.interact();
  assert.deepEqual(locked.placed, [], 'it does not open');
  const f = fixture({ key: true });
  assert.equal(f.inventory.count(KEY_ITEM), 1, 'she gave you the key');
  f.tick();
  assert.equal(f.host.nearby.id, 'smugglers-door');
  f.host.interact();
  assert.deepEqual(f.placed.at(-1), { x: SMUGGLERS_DOOR.east.x, z: SMUGGLERS_DOOR.east.z, yaw: SMUGGLERS_DOOR.east.yaw });
  f.tick();
  assert.equal(f.host.nearby.id, 'smugglers-hatch', 'and from the other side it is the hatch');
  f.host.interact();
  assert.deepEqual(f.placed.at(-1), { x: SMUGGLERS_DOOR.west.x, z: SMUGGLERS_DOOR.west.z, yaw: SMUGGLERS_DOOR.west.yaw });
});

test('seen near the light without papers: the guards attack, and she comes out of her blockhouse with them', () => {
  const guard = LIGHT_GUARDS.find(g => g.id === 'elod-light-guard-land');
  const inFront = { x: guard.x + Math.sin(guard.yaw) * 5, z: guard.z + Math.cos(guard.yaw) * 5 };
  const f = fixture({ key: true, at: inFront });
  f.tick(.1);
  assert.equal(f.people.find(p => p.id === SUBTRACTIDAUGHTER.id).hidden, true, 'at night, during the errand, she is asleep');
  f.tick(3);
  assert.equal(f.started.length, 1, 'the watch saw the traveler');
  const spec = f.started[0];
  assert.equal(spec.id, LIGHT_FIGHT_ID);
  assert.ok(spec.enemies.some(e => e.npcId === guard.id), 'the guard who saw');
  assert.ok(spec.enemies.some(e => e.npcId === SUBTRACTIDAUGHTER.id && e.kind === 'timekeeper'), 'and her');
  assert.equal(f.heist.alarm, true, 'the light is roused');
  assert.match(f.toasts.at(-1)[0], /Papers/);
});

test('papers are enough, and in West Suval nobody is watching for them', () => {
  const guard = LIGHT_GUARDS[1], inFront = { x: guard.x + Math.sin(guard.yaw) * 5, z: guard.z + Math.cos(guard.yaw) * 5 };
  const papered = fixture({ key: true, at: inFront });
  papered.inventory.grant(PASSPORT_ITEM);
  papered.tick(4);
  assert.equal(papered.started.length, 0);
  assert.equal(papered.host.watching, false);
  const home = fixture({ key: true });
  home.tick(4);
  assert.equal(home.host.watching, false, 'the door’s side of the ridge is West Suval');
});

test('the stair, the fire, and the burn', () => {
  const f = fixture({ key: true, at: TOWER_STEP });
  f.tick();
  assert.equal(f.host.nearby.id, 'elod-stair');
  f.host.interact();
  const met = f.dialogues.at(-1);
  assert.equal(met.who, 'sovik');
  assert.ok(met.speaker.role, 'the fire has a line under his name, as every speaker must');
  met.options.choices.find(c => c.id === 'lift-sovik').action();
  assert.equal(f.heist.stage, 'taken');
  assert.equal(f.inventory.count(SOVIK_ITEM), 1);
  assert.equal(f.combat.state.player.hp, 100 - SOVIK.burn, 'dangerous to touch');
  assert.equal(f.heist.way, 'quiet');
  f.tick();
  assert.equal(f.shown.at(-1), 'carried', 'he is drawn in your arms');
  // A burn never takes the last of anybody.
  const low = fixture({ key: true, at: TOWER_STEP });
  low.combat.state.player.hp = 12;
  low.tick(); low.host.takeSovik();
  assert.equal(low.combat.state.player.hp, 1);
});

test('she yields, and afterwards has something to say', () => {
  const guard = LIGHT_GUARDS[1], inFront = { x: guard.x + Math.sin(guard.yaw) * 5, z: guard.z + Math.cos(guard.yaw) * 5 };
  const f = fixture({ key: true, at: inFront });
  f.tick(3);
  f.host.combatEvent({ type: 'enemy-yielded', npcId: SUBTRACTIDAUGHTER.id });
  assert.match(f.toasts.at(-1)[0], /one knee/);
  f.combat.state.phase = 'won';
  f.host.combatEvent({ type: 'victory' });
  assert.deepEqual(f.dialogues.at(-1).lines, [...RIVAL_YIELDS]);
  f.combat.state.phase = 'peaceful';
  f.tick();
  assert.equal(f.people.find(p => p.id === SUBTRACTIDAUGHTER.id).hidden, false, 'she is up and about now');
});
