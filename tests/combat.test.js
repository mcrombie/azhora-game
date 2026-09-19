import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';
import { createWeapons } from '../src/weapons.js';

function fixture(options = {}) {
  const world = {
    bounds: { minX: -100, maxX: 100, minZ: -110, maxZ: 60 },
    colliders: [], heightAt: () => 1.5,
    ...options.world,
  };
  const position = { x: 0, y: 1.5, z: -34, ...options.position };
  const events = [];
  const combat = createCombat({ world, position, ...options.combat, onEvent: event => events.push(event) });
  return { combat, world, position, events };
}

function advanceUntil(combat, condition, seconds = 20, observer = () => {}) {
  for (let i = 0; i < seconds * 60 && !condition(); i++) {
    combat.update(1 / 60);
    observer();
  }
  assert.ok(condition(), `Condition was not reached within ${seconds} seconds`);
}

test('practice contacts occur at the swing window, once, and a late press chains the next swing', () => {
  const { combat, position, events } = fixture();
  combat.startPractice({ x: 0, z: position.z + 1.7 });
  assert.equal(combat.attack(0), true);
  assert.equal(combat.attack(0), false, 'early button spam cannot queue a combo');
  combat.update(.18);
  assert.equal(events.filter(event => event.type === 'practice-hit').length, 0);
  combat.update(.03);
  assert.equal(events.filter(event => event.type === 'practice-hit').length, 1);
  combat.update(.11);
  assert.equal(combat.attack(0), true, 'a deliberate recovery press is buffered');
  combat.update(.42);
  assert.equal(events.filter(event => event.type === 'practice-hit').length, 2);
  assert.equal(combat.state.player.combo, 1);
  combat.update(.5);
  assert.equal(events.filter(event => event.type === 'practice-hit').length, 2);
  assert.equal(combat.state.enemies[0].hp, 100, 'training target remains usable');
});

test('soft targeting helps nearby forward targets without hitting a target behind the player', () => {
  const { combat, position, events } = fixture();
  combat.startPractice({ x: 1, z: position.z + 1.5 });
  combat.attack(0);
  assert.ok(combat.state.player.yaw > 0);
  combat.update(.6);
  assert.equal(events.filter(event => event.type === 'practice-hit').length, 1);
  combat.finishPractice();
  combat.startPractice({ x: position.x, z: position.z - 1.2 });
  combat.attack(0);
  combat.update(.6);
  assert.equal(events.filter(event => event.type === 'practice-hit').length, 1);
});

test('contact and dodge distance survive a slow frame without repeated hits or tunnelling', () => {
  const a = fixture();
  const b = fixture();
  for (const sample of [a, b]) {
    sample.combat.startPractice({ x: 0, z: -32 });
    sample.combat.attack(0);
  }
  a.combat.update(.8);
  for (let i = 0; i < 48; i++) b.combat.update(1 / 60);
  assert.equal(a.events.filter(event => event.type === 'practice-hit').length, 1);
  assert.deepEqual(a.events, b.events);
  assert.ok(Math.abs(a.position.z - b.position.z) < 1e-8);

  const blocked = fixture({ world: { colliders: [{ x: 1.6, z: -34, r: .45 }] } });
  blocked.combat.startPractice({ x: 0, z: -31 });
  assert.equal(blocked.combat.dodge({ x: 1, z: 0 }), true);
  blocked.combat.update(.8);
  assert.ok(blocked.position.x < .82, 'dodge is swept against the tree instead of jumping through it');
  assert.equal(blocked.combat.state.player.action, 'idle');
  assert.equal(blocked.combat.state.player.invulnerable, false);
});

test('dodge costs stamina, has recovery, and cannot be spammed without regenerating', () => {
  const { combat } = fixture();
  combat.startPractice({ x: 0, z: -30 });
  assert.equal(combat.dodge({ x: 1, z: 0 }), true);
  assert.equal(combat.state.player.stamina, 75);
  assert.equal(combat.movementScale(), 0);
  assert.equal(combat.dodge({ x: 1, z: 0 }), false);
  combat.update(.57);
  assert.equal(combat.movementScale(), 1);
  for (let i = 0; i < 3; i++) { assert.equal(combat.dodge({ x: i % 2 ? 1 : -1, z: 0 }), true); combat.update(.57); }
  assert.ok(combat.state.player.stamina < 25);
  assert.equal(combat.dodge({ x: 1, z: 0 }), false);
  combat.update(2);
  assert.ok(combat.state.player.stamina > 25);
  assert.equal(combat.dodge({ x: 1, z: 0 }), true);
});

test('goblins announce a locked strike and an early dodge protects even when terrain blocks travel', () => {
  const { combat, position, world, events } = fixture();
  combat.startEncounter();
  advanceUntil(combat, () => events.some(event => event.type === 'windup'));
  const attacker = combat.state.enemies.find(enemy => enemy.action === 'windup');
  const lockedYaw = attacker.yaw;
  const originalHp = combat.state.player.hp;
  combat.update(.82);
  assert.equal(combat.state.player.hp, originalHp, 'the long tell itself does no damage');
  assert.equal(attacker.yaw, lockedYaw);
  // Surround the hero after the tell so this checks invulnerability, not just outranging the swing.
  world.colliders.push({ x: position.x + .65, z: position.z, r: .3 });
  assert.equal(combat.dodge({ x: 1, z: 0 }), true);
  combat.update(.32);
  assert.equal(combat.state.player.hp, originalHp);
  assert.equal(events.filter(event => event.type === 'player-hit').length, 0);
});

test('goblins take turns attacking and uninterrupted hits can defeat the player once', () => {
  const { combat, position, events } = fixture();
  combat.startEncounter();
  advanceUntil(combat, () => combat.state.phase === 'defeated', 50, () => {
    const attackers = combat.state.enemies.filter(enemy => ['windup', 'attack'].includes(enemy.action));
    assert.ok(attackers.length <= 1, 'only one committed attack may be active');
    // Stay put for this failure-path test after each small reaction shove.
    position.x = 0; position.z = -34;
  });
  assert.equal(combat.state.player.hp, 0);
  assert.equal(combat.state.player.action, 'dead');
  assert.equal(combat.movementScale(), 0);
  assert.equal(combat.attack(0), false);
  assert.equal(combat.dodge({ x: 1, z: 0 }), false);
  combat.update(2);
  assert.equal(events.filter(event => event.type === 'defeat').length, 1);
  combat.resetEncounter();
  assert.equal(combat.state.phase, 'active');
  assert.equal(combat.state.player.hp, 100);
  assert.equal(combat.state.player.stamina, 100);
  assert.equal(position.z, -25);
  assert.equal(position.y, 1.5);
  assert.equal(combat.state.enemies.filter(enemy => enemy.active).length, 3);
});

test('crowded goblins recover their spacing after lunges and keep approaching a retreating target', () => {
  const { combat } = fixture({ position: { z: -27 } });
  combat.startEncounter();
  // Leave the player still and allow hit reactions to push them naturally; the group
  // must recover from its own overlapping lunges instead of freezing out of range.
  advanceUntil(combat, () => combat.state.phase === 'defeated', 45);
  assert.equal(combat.state.player.hp, 0);
});

test('three timed strikes defeat each goblin and victory is emitted once', () => {
  const { combat, position, events } = fixture();
  combat.startEncounter();
  for (const enemy of combat.state.enemies) {
    let swings = 0;
    while (enemy.active && swings < 4) {
      // Move to striking distance; real contact, interruption, and health rules still run.
      position.x = enemy.x;
      position.z = enemy.z + 1.6;
      assert.equal(combat.attack(Math.PI), true);
      combat.update(.7);
      swings++;
    }
    assert.equal(enemy.active, false);
    assert.equal(swings, 3);
  }
  assert.equal(combat.state.phase, 'won');
  assert.equal(combat.state.enemies.filter(enemy => enemy.action === 'dead').length, 3);
  assert.equal(events.filter(event => event.type === 'enemy-defeated').length, 3);
  assert.equal(events.filter(event => event.type === 'victory').length, 1);
  combat.update(5);
  assert.equal(events.filter(event => event.type === 'victory').length, 1);
});

test('retreat clears the encounter cleanly and allows another attempt without replacing quest state', () => {
  const { combat, position, events } = fixture();
  combat.startEncounter();
  combat.update(1);
  position.z = -15;
  combat.update(.1);
  assert.equal(combat.state.phase, 'peaceful');
  assert.equal(combat.state.enemies.length, 0);
  assert.equal(events.filter(event => event.type === 'retreat').length, 1);
  combat.update(1);
  assert.equal(events.filter(event => event.type === 'retreat').length, 1);
  position.z = -27;
  assert.equal(combat.startEncounter(), true);
  assert.equal(combat.state.enemies.length, 3);
  assert.equal(combat.state.player.hp, 100);
});

test('finishing the lesson retains the learned moves and weapon while removing its target', () => {
  const { combat, events } = fixture();
  assert.equal(combat.pose().armed, false);
  assert.equal(combat.attack(0), false);
  combat.startPractice({ x: 0, z: -32 });
  combat.finishPractice();
  assert.equal(combat.state.phase, 'peaceful');
  assert.equal(combat.state.enemies.length, 0);
  assert.equal(combat.pose().armed, true);
  assert.equal(combat.attack(0), true);
  combat.update(.6);
  assert.equal(events.filter(event => event.type === 'hit').length, 0);
  assert.equal(combat.dodge({ x: 1, z: 0 }), true);
});

function equippedFixture() {
  const stock = new Map([['simple-sword', 1], ['forest-stick', 2]]);
  const inventory = {
    has: id => (stock.get(id) ?? 0) > 0,
    count: id => stock.get(id) ?? 0,
    remove(id, amount) { stock.set(id, (stock.get(id) ?? 0) - amount); return true; },
  };
  const weapons = createWeapons({ wear: true, inventory });
  const result = fixture({ combat: {
    getWeapon: () => weapons.profile(), onWeaponContact: id => weapons.contact(id),
  } });
  return { ...result, weapons };
}

test('weapon wear is charged once for a real practice contact and never for a missed swing', () => {
  const { combat, weapons, position, events } = equippedFixture();
  combat.startPractice({ x: 0, z: position.z + 5 });
  combat.attack(0); combat.update(.7);
  assert.equal(weapons.profile().durability, 24);
  combat.state.enemies[0].z = position.z + 1.7;
  combat.attack(0); combat.update(.7);
  assert.equal(events.filter(event => event.type === 'practice-hit').length, 1);
  assert.equal(weapons.profile().durability, 23);
  combat.update(2);
  assert.equal(weapons.profile().durability, 23, 'the contact window cannot charge twice');
});

test('sticks hit less hard at each combo step and cannot reach a sword-distance target', () => {
  for (const [id, expected] of [['simple-sword', [24, 26, 34]], ['forest-stick', [14, 16, 20]]]) {
    const { combat, weapons, position } = equippedFixture();
    weapons.equip(id);
    combat.startPractice({ x: 0, z: position.z + 1.5 });
    const enemy = combat.state.enemies[0];
    enemy.kind = 'goblin';
    for (const damage of expected) {
      position.x = enemy.x; position.z = enemy.z - 1.5;
      const before = enemy.hp;
      combat.attack(0); combat.update(.8);
      assert.equal(before - enemy.hp, damage);
    }
  }
  for (const [id, expectedHits] of [['simple-sword', 1], ['forest-stick', 0]]) {
    const { combat, weapons, position, events } = equippedFixture();
    weapons.equip(id);
    combat.startPractice({ x: 0, z: position.z + 2.5 });
    combat.attack(0); combat.update(.7);
    assert.equal(events.filter(event => event.type === 'practice-hit').length, expectedHits);
  }
});

test('changing equipment during a swing preserves its original damage and charges the original weapon', () => {
  const { combat, weapons, position } = equippedFixture();
  combat.startPractice({ x: 0, z: position.z + 1.5 });
  const enemy = combat.state.enemies[0];
  enemy.kind = 'goblin';
  combat.attack(0);
  weapons.equip('forest-stick');
  combat.update(.7);
  assert.equal(enemy.hp, 76);
  assert.equal(weapons.status('simple-sword').durability, 23);
  assert.equal(weapons.status('forest-stick').durability, 6);
});

test('a broken weapon cannot attack or buffer another swing but still permits dodging and repair', () => {
  const { combat, weapons, position } = equippedFixture();
  for (let i = 0; i < 23; i++) weapons.contact();
  combat.startPractice({ x: 0, z: position.z + 1.5 });
  combat.attack(0); combat.update(.32);
  assert.equal(weapons.profile().durability, 0);
  assert.equal(combat.attack(0), false, 'broken weapon cannot queue a combo');
  combat.update(.4);
  assert.equal(combat.attack(0), false);
  assert.equal(combat.dodge({ x: 1, z: 0 }), true);
  combat.update(.7);
  assert.equal(weapons.repair(), true);
  assert.equal(combat.attack(0), true);
});

test('a buffered swing rechecks weapon condition before it starts', () => {
  const { combat, weapons, position } = equippedFixture();
  combat.startPractice({ x: 0, z: position.z + 1.5 });
  combat.attack(0); combat.update(.32);
  assert.equal(combat.attack(0), true);
  while (weapons.profile().usable) weapons.contact();
  combat.update(.5);
  assert.equal(combat.state.player.action, 'idle');
  assert.equal(combat.state.player.combo, 0, 'the queued follow-up never started');
});

test('starting practice, finishing it, retreating, and retrying never restore equipment condition', () => {
  const { combat, weapons, position } = equippedFixture();
  weapons.contact();
  combat.setWeaponReady(true);
  assert.equal(combat.attack(0), true, 'the mercenary can use his own sword on arrival');
  combat.startPractice({ x: 0, z: position.z + 3 });
  assert.equal(weapons.profile().durability, 23);
  combat.finishPractice();
  assert.equal(weapons.profile().durability, 23);
  combat.startEncounter();
  position.z = -15; combat.update(.1);
  assert.equal(combat.state.phase, 'peaceful');
  assert.equal(weapons.profile().durability, 23);
  combat.resetEncounter();
  assert.equal(weapons.profile().durability, 23);
  weapons.equip('forest-stick'); weapons.contact();
  combat.resetEncounter();
  assert.equal(weapons.profile().durability, 5, 'retry does not renew a partly used stick');
});

const meadowEncounter = () => ({
  id: 'meadow-raiders', center: { x: 15, z: -231 }, checkpoint: { x: 8, z: -217 }, retreatZ: -209,
  enemies: [
    { id: 'meadow-scout', x: 12, z: -234, hp: 65, entry: .2 },
    { id: 'meadow-scrapper', x: 18, z: -237, hp: 65, entry: 1.5 },
  ],
});
const meadowFixture = () => fixture({
  world: { bounds: { minX: -100, maxX: 100, minZ: -400, maxZ: 60 } },
  position: { x: 15, z: -229 },
});

test('the default encounter retains its three starting goblins, health, checkpoint and completed guard', () => {
  const { combat, position } = fixture();
  assert.equal(combat.startEncounter(), true);
  assert.equal(combat.state.encounterId, 'tidehaven-raiders');
  assert.deepEqual(combat.state.enemies.map(({id,x,z,hp})=>({id,x,z,hp})), [
    { id: 'goblin-scout', x: -1.3, z: -36, hp: 75 },
    { id: 'goblin-scrapper', x: 1.3, z: -40, hp: 75 },
    { id: 'goblin-lookout', x: 0, z: -44, hp: 75 },
  ]);
  combat.resetEncounter();
  assert.deepEqual(position, { x: 0, y: 1.5, z: -25 });
  combat.state.phase = 'won';
  assert.equal(combat.startEncounter(), false, 'an old tutorial trigger cannot replay a completed fight');
});

test('custom encounters start after victory, respect staggered entry and approach within their own region', () => {
  const { combat, position } = meadowFixture();
  combat.state.phase = 'won';
  assert.equal(combat.startEncounter(meadowEncounter()), true);
  assert.equal(combat.state.encounterId, 'meadow-raiders');
  assert.equal(combat.state.enemies.length, 2);
  assert.ok(combat.state.enemies.every(enemy => enemy.hp === 65 && enemy.maxHp === 65));
  const [scout, scrapper] = combat.state.enemies;
  const firstDistance = Math.hypot(scout.x-position.x, scout.z-position.z);
  combat.update(.15);
  assert.equal(scout.x, 12); assert.equal(scout.z, -234);
  combat.update(.65);
  assert.ok(Math.hypot(scout.x-position.x, scout.z-position.z) < firstDistance - .7, 'scout approaches in the meadow');
  assert.equal(scrapper.x, 18); assert.equal(scrapper.z, -237, 'second raider is still entering');
  assert.ok(combat.state.enemies.every(enemy => enemy.x > 3 && enemy.z < -200), 'actors never target the old village arena');
  const before = JSON.stringify(combat.state);
  assert.equal(combat.startEncounter(meadowEncounter()), false, 'active encounters cannot be replaced');
  assert.equal(JSON.stringify(combat.state), before);
});

test('custom defeat and retry preserve the copied encounter and restore its own checkpoint', () => {
  const { combat, position, events } = meadowFixture();
  const config = meadowEncounter();
  combat.startEncounter(config);
  config.checkpoint.x = -80; config.enemies[0].hp = 1; config.center.z = -30;
  advanceUntil(combat, () => combat.state.phase === 'defeated', 55, () => {
    position.x = 15; position.z = -231;
    assert.ok(combat.state.enemies.filter(enemy => ['windup','attack'].includes(enemy.action)).length <= 1);
  });
  assert.equal(events.find(event => event.type === 'defeat').encounterId, 'meadow-raiders');
  assert.equal(combat.resetEncounter(), true);
  assert.deepEqual(position, { x: 8, y: 1.5, z: -217 });
  assert.equal(combat.state.player.hp, 100); assert.equal(combat.state.player.stamina, 100);
  assert.equal(combat.state.enemies.length, 2);
  assert.equal(combat.state.enemies[0].hp, 65, 'caller mutations cannot change the stored retry configuration');
});

test('custom retreat occurs at its own southern limit and retry stays in that region', () => {
  const { combat, position, events } = meadowFixture();
  combat.startEncounter(meadowEncounter());
  position.z = -210; combat.update(.1);
  assert.equal(combat.state.phase, 'active');
  position.z = -208; combat.update(.1);
  assert.equal(combat.state.phase, 'peaceful');
  assert.equal(combat.state.enemies.length, 0);
  assert.equal(events.find(event => event.type === 'retreat').encounterId, 'meadow-raiders');
  combat.update(1);
  assert.equal(events.filter(event => event.type === 'retreat').length, 1);
  combat.resetEncounter();
  assert.equal(position.z, -217);
  assert.equal(combat.state.encounterId, 'meadow-raiders');
});

test('invalid encounter configurations are rejected atomically without changing health, pose or practice', () => {
  const { combat, position } = meadowFixture();
  combat.startPractice({x:15,z:-227}); combat.attack(0); combat.update(.1);
  combat.state.player.hp = 63;
  const baseline = JSON.stringify({ state: combat.state, position, pose: combat.pose() });
  const broken = change => { const config = meadowEncounter(); change(config); return config; };
  for (const config of [null, {}, [],
    broken(c=>{c.id='';}), broken(c=>{c.center.x=NaN;}), broken(c=>{c.checkpoint.z=Infinity;}),
    broken(c=>{c.retreatZ=-240;}), broken(c=>{c.checkpoint.z=-200;}), broken(c=>{c.enemies=[];}),
    broken(c=>{c.enemies[1].id=c.enemies[0].id;}), broken(c=>{c.enemies[1].hp=0;}),
    broken(c=>{c.enemies[1].entry=-1;}), broken(c=>{c.enemies[1].x=Infinity;}),
    broken(c=>{c.enemies[1].z=-40;}),
  ]) {
    assert.equal(combat.startEncounter(config), false);
    assert.equal(JSON.stringify({ state: combat.state, position, pose: combat.pose() }), baseline);
  }
  combat.update(.2);
  assert.equal(combat.state.player.action, 'attack', 'an invalid request did not interrupt the original action');
});

test('leaving a custom arena north or sideways releases combat and permits a later retry', () => {
  for (const point of [{x:15,z:-280},{x:64,z:-231},{x:-34,z:-231}]) {
    const {combat,position,events}=meadowFixture();combat.startEncounter(meadowEncounter());
    Object.assign(position,point);combat.update(.05);
    assert.equal(combat.state.phase,'peaceful');assert.equal(combat.state.enemies.length,0);
    assert.equal(events.filter(event=>event.type==='retreat').length,1);
    combat.resetEncounter();assert.equal(combat.state.phase,'active');assert.equal(position.z,-217);
  }
});

test('custom victory reports its identity once and starting or retrying does not repair weapons', () => {
  const {combat, world, position, weapons, events} = equippedFixture();
  world.bounds.minZ = -400; position.x = 15; position.z = -229;
  weapons.contact();
  combat.startEncounter(meadowEncounter());
  assert.equal(weapons.profile().durability, 23);
  for (const enemy of combat.state.enemies) {
    for (let i=0; enemy.active && i<4; i++) {
      position.x=enemy.x; position.z=enemy.z+1.5;
      assert.equal(combat.attack(Math.PI), true); combat.update(.7);
    }
    assert.equal(enemy.active,false);
  }
  assert.equal(combat.state.phase,'won');
  const victories = events.filter(event=>event.type==='victory');
  assert.equal(victories.length,1); assert.equal(victories[0].encounterId,'meadow-raiders');
  const durability=weapons.profile().durability;
  assert.equal(durability,17);
  combat.update(2); combat.resetEncounter();
  assert.equal(weapons.profile().durability,durability);
  assert.equal(combat.state.enemies.length,2);
});

test('a fight can begin where it forms up, so one ordered from beyond its retreat line is not lost on its first step', () => {
  const world = { bounds: { minX: -300, maxX: 300, minZ: -300, maxZ: 300 }, colliders: [], heightAt: () => 1.5 };
  const arena = { id: 'far-arena', center: { x: 0, z: 0 }, checkpoint: { x: 0, z: 13 }, retreatLine: 21, retreatAxis: 'z',
    enemies: [{ id: 'far-foe', x: 0, z: -12, kind: 'soldier', hp: 70 }] };
  // Standing beside a commander thirty metres off, past the line.
  const orderedHere = () => ({ x: 4, y: 1.5, z: 30 });
  const events = [];
  const plain = createCombat({ world, position: orderedHere(), onEvent: e => events.push(e) });
  assert.equal(plain.startEncounter(arena), true);
  plain.update(1 / 60);
  assert.equal(plain.state.phase, 'peaceful', 'begun where the traveler stood, the fight is a retreat at once');
  assert.ok(events.some(e => e.type === 'retreat'));

  const position = orderedHere();
  const formed = createCombat({ world, position });
  assert.equal(formed.startEncounter(arena, { atCheckpoint: true }), true);
  assert.deepEqual([position.x, position.z], [0, 13], 'the traveler stands where the fight forms up');
  for (let step = 0; step < 60; step++) formed.update(1 / 60);
  assert.equal(formed.state.phase, 'active', 'and the fight is still on a second later');
});

test('soldiers fight like soldiers: a shield on guard, mail, no flinching once the swing has begun, and two swinging at once', () => {
  const world = { bounds: { minX: -300, maxX: 300, minZ: -300, maxZ: 300 }, colliders: [], heightAt: () => 1.5 };
  const start = enemies => {
    const position = { x: 0, y: 1.5, z: 13 }, events = [], combat = createCombat({ world, position, onEvent: e => events.push(e) });
    assert.equal(combat.startEncounter({ id: 'drill', center: { x: 0, z: 0 }, checkpoint: { x: 0, z: 13 }, retreatLine: 21, retreatAxis: 'z', enemies }, { atCheckpoint: true }), true);
    return { combat, position, events };
  };
  // On guard and facing the blow, he takes it on his shield and is not rocked.
  {
    const { combat, position, events } = start([{ id: 'guard', x: 0, z: 0, kind: 'soldier', hp: 100 }]);
    const soldier = combat.state.enemies[0];
    position.x = 0; position.z = 2;
    combat.update(.2);
    assert.equal(combat.attack(Math.PI), true); combat.update(.25);
    assert.ok(events.some(e => e.type === 'blocked'), 'the shield takes it');
    assert.ok(soldier.hp >= 93 && soldier.hp < 100, `a little gets through (${soldier.hp} left)`);
    assert.notEqual(soldier.action, 'hurt');
    // He swings, and hits hard; struck while he recovers, he is hurt, less the mail.
    advanceUntil(combat, () => soldier.action === 'attack', 5);
    advanceUntil(combat, () => soldier.action === 'idle', 5);
    assert.ok(combat.state.player.hp <= 100 - 20, 'a soldier’s blow is no goblin’s');
    advanceUntil(combat, () => combat.state.player.action === 'idle', 2);
    assert.ok(soldier.action === 'idle', 'still recovering from his swing');
    const before = soldier.hp;
    position.x = soldier.x; position.z = soldier.z + 1.6;
    assert.equal(combat.attack(Math.PI), true); combat.update(.25);
    assert.ok(before - soldier.hp >= 15 && before - soldier.hp <= 28, `the blow lands (${before - soldier.hp})`);
    assert.equal(soldier.action, 'hurt');
  }
  // Struck while he winds up, he keeps coming: the swing is not stopped.
  {
    const { combat, position } = start([{ id: 'poised', x: 0, z: 0, kind: 'soldier', hp: 100 }]);
    const soldier = combat.state.enemies[0];
    position.x = 0; position.z = 1.8;
    advanceUntil(combat, () => soldier.action === 'windup', 5);
    combat.attack(Math.PI); combat.update(.22);
    assert.ok(soldier.hp < 100, 'the blow lands');
    assert.ok(['windup', 'attack'].includes(soldier.action), 'and his swing comes anyway');
  }
  // Two press at once, where goblins take turns.
  {
    const { combat, position } = start([{ id: 'left', x: -1, z: 0, kind: 'soldier', hp: 100 }, { id: 'right', x: 1, z: 0, kind: 'soldier', hp: 100 }]);
    position.x = 0; position.z = 1.5;
    let most = 0;
    for (let i = 0; i < 300 && combat.state.phase === 'active'; i++) { combat.update(1 / 60); most = Math.max(most, combat.state.enemies.filter(e => ['windup', 'attack'].includes(e.action)).length); }
    assert.equal(most, 2);
  }
});
