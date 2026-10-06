import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createJesseCarriage, validateJesseCarriage, CARRIAGE_TIMBERS, JESSE_RIDE_LINES } from '../src/content/quests/jesse/jesse-carriage-quest.js';
import { JESSE, JESSE_WORKSHOP, JESSE_GUILD, CARRIAGE_PARTS, JESSE_CARRIAGE_ROUTE } from '../src/content/quests/jesse/jesse-carriage-world.js';
import { createJesseCarriageHost, JESSE_GUILD_NOTICE } from '../src/content/quests/jesse/jesse-carriage-host.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createSkills, RUNESCAPE_TABLE } from '../src/gameplay/skills/skills.js';
import { PLANKS } from '../src/gameplay/skills/woodcutting/construction.js';
import { normalizeTrackableQuests } from '../src/gameplay/quests/quest-tracker.js';

const { createJesseCarriageScenery } = await sourceModule('../src/content/quests/jesse/jesse-carriage-scenery.js');
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const move = (from, target, amount) => {
  const t = Math.min(1, amount / (distance(from, target) || 1));
  return { x: from.x + (target.x - from.x) * t, z: from.z + (target.z - from.z) * t };
};
const setup = () => {
  const inventory = createInventoryState(), skills = createSkills(), events = [];
  return { inventory, skills, events, quest: createJesseCarriage({ inventory, skills, onEvent: event => events.push(event) }) };
};
function collectAll(quest) {
  assert.ok(quest.accept().ok);
  for (const part of CARRIAGE_PARTS) assert.ok(quest.collect(part.id, part).ok);
}
function build(ctx, timber = 'pine') {
  collectAll(ctx.quest);
  if (timber !== 'pine') ctx.inventory.add(CARRIAGE_TIMBERS.find(t => t.id === timber).plank, 4);
  assert.ok(ctx.quest.chooseTimber(timber, JESSE_WORKSHOP.stand).ok);
  for (let i = 0; i < 3; i++) assert.ok(ctx.quest.assemble(JESSE_WORKSHOP.stand).ok);
  return ctx;
}
function until(quest, stage, options = {}) {
  for (let i = 0; i < 25000 && quest.view().stage !== stage; i++) {
    const before = quest.view();
    const after = quest.tick(.1, { moveCart: move, moveJesse: move, ...options });
    assert.ok(distance(before.cart, after.cart) <= .501, 'carriage never jumps a waypoint');
    if (before.stage !== 'riding') assert.ok(distance(before.jesse, after.jesse) <= .261, 'Jesse walks to the guild door');
  }
  assert.equal(quest.view().stage, stage);
}

test('Jesse teaches existing Carpentry and only nearby uncollected parts enter the satchel', () => {
  const { quest, inventory, skills } = setup();
  assert.equal(quest.collect('wheel-near', CARRIAGE_PARTS[0]).ok, false);
  assert.ok(quest.accept().ok); assert.equal(skills.taught('construction'), true);
  assert.equal(inventory.count('hammer'), 1); assert.equal(inventory.count('saw'), 1);
  assert.equal(quest.accept().ok, false); assert.equal(inventory.count('hammer'), 1);
  assert.equal(quest.collect('wheel-near', { x: 0, z: 0 }).ok, false);
  assert.equal(quest.chooseTimber('pine', JESSE_WORKSHOP.stand).ok, false);
  for (const part of CARRIAGE_PARTS) {
    assert.ok(quest.collect(part.id, part).ok);
    assert.equal(quest.collect(part.id, part).ok, false);
  }
  assert.equal(inventory.count('carriage-wheel'), 2); assert.equal(inventory.count('carriage-axle'), 1);
  assert.equal(inventory.count('carriage-pine-bundle'), 1);
  assert.equal(quest.chooseTimber('pine', { x: 0, z: 0 }).ok, false);
});

test('three visible assembly steps consume parts once and grant Carpentry experience once across saves', () => {
  const { quest, inventory, skills } = setup(); collectAll(quest);
  assert.ok(quest.chooseTimber('pine', JESSE_WORKSHOP.stand).ok);
  for (const id of ['carriage-wheel', 'carriage-axle', 'carriage-pine-bundle']) assert.equal(inventory.count(id), 0);
  assert.equal(quest.chooseTimber('pine', JESSE_WORKSHOP.stand).ok, false);
  assert.equal(quest.assemble({ x: 0, z: 0 }).ok, false);
  assert.equal(quest.assemble(JESSE_WORKSHOP.stand).complete, false);
  const saved = quest.snapshot(); assert.ok(validateJesseCarriage(saved));
  const restored = createJesseCarriage({ inventory, skills }); assert.ok(restored.restore(saved));
  assert.equal(restored.assemble(JESSE_WORKSHOP.stand).complete, false);
  const built = restored.assemble(JESSE_WORKSHOP.stand);
  assert.equal(built.complete, true); assert.equal(built.xp, PLANKS['pine-plank'].xp * 4 + 45);
  assert.equal(skills.xp('construction'), built.xp);
  assert.ok(restored.restore(restored.snapshot()));
  assert.equal(restored.assemble(JESSE_WORKSHOP.stand).ok, false);
  assert.equal(skills.xp('construction'), built.xp);
});

test('oak is stronger than walnut, different planks matter, and woodcutting improves craftsmanship', () => {
  const builds = new Map();
  for (const timber of CARRIAGE_TIMBERS) {
    const ctx = build(setup(), timber.id); builds.set(timber.id, ctx);
    assert.equal(ctx.quest.view().durability, timber.durability);
    if (timber.id !== 'pine') {
      assert.equal(ctx.inventory.count(timber.plank), 0);
      assert.equal(ctx.inventory.count('carriage-pine-bundle'), 1, 'the unused teaching bundle was not consumed');
    }
  }
  assert.ok(builds.get('oak').quest.view().durability > builds.get('walnut').quest.view().durability);
  const skilled = setup(); skilled.skills.gain('woodcutting', RUNESCAPE_TABLE[60]); build(skilled, 'oak');
  assert.ok(skilled.quest.view().durability > builds.get('oak').quest.view().durability);
});

test('failed inventory removal restores earlier parts instead of leaving a half-paid carriage', () => {
  const ctx = setup(); collectAll(ctx.quest);
  const remove = ctx.inventory.remove;
  ctx.inventory.remove = (id, n) => id === 'carriage-pine-bundle' ? false : remove(id, n);
  assert.equal(ctx.quest.chooseTimber('pine', JESSE_WORKSHOP.stand).ok, false);
  assert.equal(ctx.inventory.count('carriage-wheel'), 2); assert.equal(ctx.inventory.count('carriage-axle'), 1);
  assert.equal(ctx.quest.view().stage, 'collecting');
});

test('a saved passenger journey walks the complete road, narrates once, and only hides Jesse at the guild door', () => {
  const ctx = build(setup()), { quest } = ctx;
  assert.equal(quest.board(JESSE_WORKSHOP.stand).ok, false, 'boarding requires coming alongside');
  assert.ok(quest.board(quest.view().cart).ok);
  for (let i = 0; i < 500; i++) quest.tick(.1, { moveCart: move });
  const saved = quest.snapshot(); assert.equal(saved.stage, 'riding');
  const restored = createJesseCarriage({ inventory: ctx.inventory, skills: ctx.skills });
  assert.ok(restored.restore(saved)); assert.equal(restored.view().mounted, true);
  const frozen = restored.snapshot(); restored.tick(100, { playing: false, moveCart: move });
  assert.deepEqual(restored.snapshot(), frozen);
  until(restored, 'arrived');
  assert.equal(restored.view().mounted, false); assert.equal(restored.view().hidden, false);
  assert.ok(distance(restored.view().cart, JESSE_GUILD.cartParking) < .13);
  assert.deepEqual(restored.view().spoken, JESSE_RIDE_LINES.map((_, i) => i));
  until(restored, 'inside');
  assert.ok(distance(restored.view().jesse, JESSE_GUILD.door) < .13); assert.ok(restored.view().hidden);
  assert.ok(validateJesseCarriage(restored.snapshot())); assert.ok(restored.knock().ok);
  assert.equal(restored.knock().ok, false);
  until(restored, 'outside', { player: JESSE_GUILD.porch });
  assert.equal(restored.view().hidden, false);
  restored.tick(20, { player: JESSE_GUILD.porch }); assert.equal(restored.view().stage, 'outside');
  until(restored, 'inside', { player: { x: 0, z: 0 } });
});

test('blocked movement and a teleporting adapter cannot skip the drive or slide Jesse through a guild wall', () => {
  const { quest } = build(setup()); quest.board(quest.view().cart);
  const before = quest.view().cart;
  quest.tick(.1, { moveCart: from => from }); assert.deepEqual(quest.view().cart, before);
  quest.tick(.1, { moveCart: (_, target) => target }); assert.deepEqual(quest.view().cart, before);
  assert.equal(quest.view().stage, 'riding'); assert.equal(quest.view().mounted, true);
});

test('malformed or contradictory progress is rejected without altering the live carriage', () => {
  const { quest } = build(setup()), saved = quest.snapshot();
  for (const corrupt of [
    { ...saved, collected: [] }, { ...saved, xpGranted: false }, { ...saved, assembly: 1 },
    { ...saved, timber: null }, { ...saved, cart: { ...saved.cart, x: Infinity } },
    { ...saved, cart: { ...saved.cart, next: JESSE_CARRIAGE_ROUTE.length + 1 } },
    { ...saved, spoken: [0, 0] }, { ...saved, stage: 'inside' },
  ]) { assert.equal(quest.restore(corrupt), false); assert.deepEqual(quest.snapshot(), saved); }
  assert.ok(validateJesseCarriage(undefined)); assert.equal(validateJesseCarriage(undefined, { allowMissing: false }), false);
  saved.cart.x = 999; assert.notEqual(quest.view().cart.x, 999, 'snapshots are independent');
});

test('host shows the skill quest, real assembly choices and an unavailable resident cannot be summoned', () => {
  const inventory = createInventoryState(), skills = createSkills(); let host, dialogue, unavailable = false;
  const quest = createJesseCarriage({ inventory, skills, onEvent: e => host?.event(e) });
  const player = { group: new THREE.Group() }, npc = { ...JESSE, actor: { group: new THREE.Group() }, marker: new THREE.Group() };
  const world = { npcPositions: {}, heightAt: () => 0 };
  host = createJesseCarriageHost({ quest, world, npc, player, available: () => !unavailable,
    openDialogue: (_, lines, _v, _caption, options) => { dialogue = { lines, ...options }; }, closeDialogue() {}, moveCart: move, moveJesse: move });
  player.group.position.set(JESSE_WORKSHOP.stand.x, 0, JESSE_WORKSHOP.stand.z);
  assert.deepEqual(host.bodies().map(body => body.id), ['jesse-carriage-horse'], 'only the waiting horse is solid before assembly');
  assert.equal(host.trackableView(), null); host.conversation();
  dialogue.choices.find(c => c.id === 'jesse-accept').action();
  const tracked = normalizeTrackableQuests({ main: { active: false }, optional: [host.trackableView()] });
  assert.equal(tracked[0].type, 'skill'); assert.equal(tracked[0].target.name, CARRIAGE_PARTS[0].name);
  for (const part of CARRIAGE_PARTS) {
    player.group.position.set(part.x, 0, part.z); assert.equal(host.nearby().kind, 'part'); assert.ok(host.interact());
  }
  player.group.position.set(JESSE_WORKSHOP.stand.x, 0, JESSE_WORKSHOP.stand.z); host.conversation();
  dialogue.choices.find(c => c.id === 'jesse-timber-pine').action();
  for (const id of ['frame', 'wheels', 'braces']) dialogue.choices.find(c => c.id === `jesse-assemble-${id}`).action();
  assert.equal(quest.view().stage, 'ready');
  assert.deepEqual(host.bodies().map(body => body.id), ['jesse-carriage-horse', 'jesse-carriage']);
  assert.equal(host.bodies().find(body => body.id === 'jesse-carriage').r, 1.15);
  const readyXp = skills.xp('construction'); quest.board(quest.view().cart); until(quest, 'inside'); host.sync();
  player.group.position.set(JESSE_GUILD.door.x, 0, JESSE_GUILD.door.z); unavailable = true;
  assert.ok(host.interact()); assert.equal(quest.view().stage, 'inside', 'a dead or otherwise unavailable Jesse stays unavailable');
  unavailable = false; host.interact(); until(quest, 'outside', { player: JESSE_GUILD.porch }); host.sync();
  host.conversation(); assert.equal(dialogue.notice, JESSE_GUILD_NOTICE); assert.equal(skills.xp('construction'), readyXp);
});

test('carriage has staged bodywork, spoked wheels, independent seats, and a horse grounded on sloping terrain', () => {
  const heightAt = (x, z) => .12 * x + .08 * z, parent = new THREE.Group(), colliders = [], movingGroups = new Set();
  const scene = createJesseCarriageScenery({ parent, heightAt, colliders, movingGroups });
  const { quest } = setup(); scene.update(0, 0, quest.view());
  assert.ok(movingGroups.has(scene.root)); assert.equal(colliders.length, 1);
  assert.equal(scene.carriage.children[0].visible, false);
  collectAll(quest); quest.chooseTimber('pine', JESSE_WORKSHOP.stand); quest.assemble(JESSE_WORKSHOP.stand);
  scene.update(0, 0, quest.view()); assert.equal(scene.carriage.children[0].visible, true);
  assert.equal(scene.carriage.children[1].visible, false);
  for (const part of scene.loose.values()) assert.equal(part.visible, false);
  quest.assemble(JESSE_WORKSHOP.stand); quest.assemble(JESSE_WORKSHOP.stand);
  for (const yaw of [0, .8, Math.PI, -Math.PI / 2]) {
    const state = quest.view(); state.cart.yaw = yaw; state.cartSpeed = 5; scene.update(1, .1, state); parent.updateMatrixWorld(true);
    const feet = scene.horse.group.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(feet.y - heightAt(feet.x, feet.z)) < 1e-8, 'horse follows terrain once, without inheriting carriage slope');
    const driver = scene.driverAnchor.getWorldPosition(new THREE.Vector3()), passenger = scene.passengerAnchor.getWorldPosition(new THREE.Vector3());
    assert.ok(driver.distanceTo(passenger) > 1.2, 'driver and passenger have separate seats');
  }
  assert.ok(scene.carriage.getObjectByName('Spoked carriage wheel').children.length > 6);
  assert.equal(JESSE.look.hat, false); assert.equal(new Set(JESSE.look.hairColors).size, 12);
});
