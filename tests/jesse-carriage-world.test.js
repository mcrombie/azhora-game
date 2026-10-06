import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createJesseCarriage } from '../src/content/quests/jesse/jesse-carriage-quest.js';
import { JESSE_WORKSHOP, JESSE_GUILD, CARRIAGE_PARTS, JESSE_CARRIAGE_ROUTE, JESSE_CARRIAGE_RADIUS, JESSE_HORSE_OFFSET } from '../src/content/quests/jesse/jesse-carriage-world.js';
import { KAYLA_RACE_START } from '../src/content/quests/kayla/kayla-race.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createSkills } from '../src/gameplay/skills/skills.js';
import { bodyWorld, stepToward, BODY } from '../src/gameplay/combat/bodies.js';
import { createHomeReturnWalker } from '../src/content/quests/homes/home-return-routes.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('the actual carriage route passes waiting Kayla, enters Ambron and lets Jesse walk around the parked horse into the guild', () => {
  const inventory = createInventoryState(), skills = createSkills(), quest = createJesseCarriage({ inventory, skills });
  quest.accept(); for (const part of CARRIAGE_PARTS) quest.collect(part.id, part);
  quest.chooseTimber('pine', JESSE_WORKSHOP.stand); for (let i = 0; i < 3; i++) quest.assemble(JESSE_WORKSHOP.stand);
  quest.board(quest.view().cart);
  const nav = bodyWorld(world), cursor = { ...quest.view().cart }, kayla = { id: 'kayla', ...KAYLA_RACE_START, r: BODY.bear };
  nav.setBodies([kayla]); let stalled = 0, closest = Infinity;
  const moveCart = (from, target, amount) => {
    Object.assign(cursor, from); nav.moving(cursor, JESSE_CARRIAGE_RADIUS, 'jesse-carriage');
    stepToward(cursor, target, amount, nav, JESSE_CARRIAGE_RADIUS);
    return { x: cursor.x, z: cursor.z };
  };
  for (let i = 0; i < 16000 && quest.view().mounted; i++) {
    const before = quest.view().cart, state = quest.tick(.05, { moveCart });
    assert.ok(gap(before, state.cart) <= .251);
    stalled = gap(before, state.cart) < 1e-6 ? stalled + .05 : 0;
    assert.ok(stalled < 4, `carriage stalled at ${JSON.stringify(state.cart)} toward ${JSON.stringify(JESSE_CARRIAGE_ROUTE[state.cart.next])}`);
    closest = Math.min(closest, gap(state.cart, kayla));
  }
  assert.equal(quest.view().stage, 'arrived');
  assert.ok(closest >= JESSE_CARRIAGE_RADIUS + BODY.bear - .01, 'neither the bear nor the cart is walked through');
  assert.ok(gap(quest.view().cart, JESSE_GUILD.cartParking) < .13);
  const cart = quest.view().cart;
  nav.setBodies([{ id: 'jesse-carriage', ...cart, r: JESSE_CARRIAGE_RADIUS },
    { id: 'jesse-carriage-horse', x: cart.x + Math.sin(cart.yaw) * JESSE_HORSE_OFFSET,
      z: cart.z + Math.cos(cart.yaw) * JESSE_HORSE_OFFSET, r: .55 }]);
  const walk = createHomeReturnWalker(nav); stalled = 0;
  for (let i = 0; i < 2000 && quest.view().stage !== 'inside'; i++) {
    const before = quest.view(), after = quest.tick(.05, { moveJesse: (from, target, amount) => walk('cobble-jessi', from, target, amount) });
    stalled = before.stage === after.stage && gap(before.jesse, after.jesse) < 1e-6 ? stalled + .05 : 0;
    assert.ok(stalled < 4, `Jesse stalled at ${JSON.stringify(after.jesse)}`);
  }
  assert.equal(quest.view().stage, 'inside');
  assert.ok(gap(quest.view().jesse, JESSE_GUILD.door) < .13);
});
