import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createCombat, ENEMY_KINDS } from '../src/gameplay/combat/combat.js';
import { BATMAN_COMBAT } from '../src/content/quests/batman/batman-quest.js';
import { BODY } from '../src/gameplay/combat/bodies.js';
import { sourceModule } from './module-loader.js';
const { createCombatView } = await sourceModule('../src/gameplay/combat/combat-view.js');
const { createBatman } = await sourceModule('../src/content/quests/batman/batman-model.js');
const world = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, colliders: [], heightAt: () => 0 };
const enemySpec = { id: 'batman', npcId: 'batman', name: 'Batman', kind: 'batman', x: 0, z: 0, hp: BATMAN_COMBAT.hp };

test('A provoked Batman retains his own body and swiftly kills an unguarded starting traveler', () => {
  for (const level of [0, 5]) {
    const position = { x: 0, y: 0, z: 2 }, events = [];
    const combat = createCombat({ world, position, onEvent: event => events.push(event) });
    assert.equal(combat.startEncounter({ id: 'batman-self-defense', level, center: { x: 0, z: 0 }, checkpoint: { ...position }, retreatZ: 20, enemies: [enemySpec] }), true);
    const enemy = combat.state.enemies[0]; assert.equal(enemy.maxHp, 420); assert.equal(enemy.r, BODY.batman);
    for (let i = 0; i < 240 && enemy.action !== 'windup'; i++) combat.update(1 / 60);
    assert.equal(enemy.action, 'windup'); combat.spellHit('batman', 24);
    assert.equal(enemy.action, 'windup', 'spamming weak hits does not cancel his swipe');
    assert.equal(enemy.hp, 408, 'his durable body mitigates an ordinary hit');
    let time = 0;
    while (combat.state.player.hp > 0 && time < 12) { combat.update(1 / 60); time += 1 / 60; }
    assert.equal(combat.state.player.hp, 0); assert.ok(time < 8, `An undefended starting character survived ${time} seconds`);
    assert.ok(events.filter(e => e.type === 'player-hit').every(e => e.damage === BATMAN_COMBAT.damage));
    assert.equal(ENEMY_KINDS.batman.fixedStats, true);
  }
});
test('Combat borrows the single cave resident and has a bat creature fallback, never a goblin', () => {
  const original = { document: globalThis.document, innerWidth: globalThis.innerWidth, innerHeight: globalThis.innerHeight };
  const node = () => ({ style: {}, classList: { toggle() {} }, append() {}, remove() {}, hidden: false });
  const elements = new Map();
  globalThis.document = { createElement: node, getElementById(id) { if (!elements.has(id)) elements.set(id, node()); return elements.get(id); } };
  globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
  try {
    for (const borrowed of [false, true]) {
      const scene = new THREE.Scene(), actor = borrowed ? createBatman() : null;
      const view = createCombatView(scene, world, new THREE.PerspectiveCamera(), { getActor: id => id === 'batman' ? actor : null });
      const enemy = { ...enemySpec, maxHp: 420, yaw: 0, action: 'attack', progress: .5, active: true };
      view.update(.1, 0, { encounterId: 'batman-self-defense', phase: 'active', enemies: [enemy], allies: [], player: { action: 'idle', progress: 0, yaw: 0 } }, new THREE.Vector3());
      const shown = view.actor('batman'); assert.equal(shown.group.name, 'Batman');
      assert.equal(scene.children.filter(object => object.name === 'Batman').length, 1);
      if (borrowed) assert.equal(shown, actor);
    }
  } finally {
    for (const [key, value] of Object.entries(original)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
  }
});
