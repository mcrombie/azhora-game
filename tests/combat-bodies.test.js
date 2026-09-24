import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat, ENEMY_KINDS } from '../src/combat.js';
import { BODY, bodyWorld } from '../src/bodies.js';
import { moveCharacter } from '../src/game-state.js';
import { WEAPON_TYPES } from '../src/weapons.js';

function fixture(bodies = [], options = {}) {
  const world = { bounds: { minX: -80, maxX: 80, minZ: -80, maxZ: 80 }, colliders: [], heightAt: () => 1.5 };
  const position = { x: 0, z: 0 }, events = [];
  const combat = createCombat({ world, position, getBodies: () => bodies, onEvent: event => events.push(event), ...options });
  combat.setWeaponReady(true);
  const start = (enemies, allies = []) => assert.equal(combat.startEncounter({ id: 'solid-bodies', center: { x: 0, z: 0 },
    checkpoint: { x: 0, z: 8 }, retreatZ: 18, enemies, allies }), true);
  return { combat, position, world, events, start };
}

test('attack lunges and dodges stop at ordinary living people, including between encounters', () => {
  for (const move of ['attack', 'dodge']) {
    const sample = fixture([{ id: 'town-guard', x: 0, z: .7, r: BODY.person }]);
    if (move === 'attack') sample.combat.attack(0);
    else sample.combat.dodge({ x: 0, z: 1 });
    sample.combat.update(.8);
    assert.ok(sample.position.z <= .7 - BODY.traveler - BODY.person + 1e-8,
      `${move} passed inside the guard (${sample.position.z})`);
  }
});

test('active combatants block dodges, while dead or inactive combatants do not', () => {
  for (const kind of ['enemy', 'ally', 'dead']) {
    const { combat, position, start } = fixture();
    const blocker = { id: 'blocker', kind: kind === 'ally' ? 'legionary' : 'soldier', hp: 100, x: 0, z: .8, entry: 60 };
    start(kind === 'ally' ? [{ id: 'distant', kind: 'soldier', x: 8, z: 8, hp: 100, entry: 60 }] : [blocker], kind === 'ally' ? [blocker] : []);
    if (kind === 'dead') Object.assign(combat.state.enemies[0], { hp: 0, action: 'dead', active: false });
    if (kind === 'ally') combat.state.allies[0].action = 'hurt';
    combat.dodge({ x: 0, z: 1 }); combat.update(.25);
    if (kind === 'dead') assert.ok(position.z > 1, 'A fallen actor has no standing footprint');
    else assert.ok(position.z < .8 - BODY.traveler - BODY.person + 1e-8, `${kind} admitted a dodge through its body`);
  }
});

test('the giant spider blocks a dodge at its shell, while its long legs remain passable',()=>{
  const {combat,position,start}=fixture();
  position.x=0;position.z=2;
  start([{id:'shell',kind:'spider',x:0,z:0,hp:220,entry:60}]);
  const spider=combat.state.enemies[0];
  assert.equal(spider.r,BODY.spider);assert.ok(spider.r>=1&&spider.r<1.1,'the shell is about two metres wide');
  assert.equal(combat.dodge({x:0,z:-1}),true);combat.update(.35);
  assert.ok(position.z>=BODY.traveler+BODY.spider-1e-8,'the dodge entered the carapace');
  assert.ok(position.z<1.6,'the legs do not reserve their full five-metre spread');
});

test('an ordinary sword reaches the spider without walking inside its shell',()=>{
  const sword={id:'simple-sword',...WEAPON_TYPES['simple-sword'],usable:true};
  const {combat,position,world,start}=fixture([],{getWeapon:()=>sword});
  position.z=2.1;
  start([{id:'shell',kind:'spider',x:0,z:0,hp:220,entry:60}]);
  const spider=combat.state.enemies[0],nav=bodyWorld(world).moving(position,BODY.traveler,'traveler');
  assert.equal(combat.attack(Math.PI),true);
  for(let frame=0;frame<36;frame++){
    nav.setBodies([{id:spider.id,x:spider.x,z:spider.z,r:spider.r}]);
    moveCharacter(position,0,-4.2/60*combat.movementScale(),nav);
    combat.update(1/60);
    assert.ok(Math.hypot(position.x-spider.x,position.z-spider.z)>=BODY.traveler+spider.r-1e-8);
  }
  assert.equal(spider.hp,220-sword.damage[0]);
});

test('an enemy lunge cannot push through the traveler or a bystander', () => {
  for (const target of ['traveler', 'bystander']) {
    const { combat, position, start } = fixture(target === 'bystander' ? [{ id: 'civilian', x: 0, z: 1, r: BODY.person }] : []);
    position.x = target === 'bystander' ? 5 : 0; position.z = 1;
    start([{ id: 'guard', kind: 'soldier', hp: 100, x: 0, z: 0 }]);
    const guard = combat.state.enemies[0]; guard.action = 'attack'; guard.yaw = 0;
    combat.update(ENEMY_KINDS.soldier.contact);
    assert.ok(guard.z <= 1 - BODY.person - (target === 'traveler' ? BODY.traveler : BODY.person) + 1e-8,
      `Guard lunged into ${target} (${guard.z})`);
  }
});

test('holding forward while repeatedly swinging cannot cross an attacking guard', () => {
  const { combat, position, world, events, start } = fixture();
  start([{ id: 'guard', kind: 'soldier', hp: 10000, x: 0, z: 1.5 }]);
  const guard = combat.state.enemies[0], nav = bodyWorld(world).moving(position, BODY.traveler, 'traveler');
  let closest = Infinity;
  for (let frame = 0; frame < 600 && combat.state.player.hp > 0; frame++) {
    nav.setBodies([{ id: guard.id, x: guard.x, z: guard.z, r: BODY.person }]);
    moveCharacter(position, 0, 4.2 / 60 * combat.movementScale(), nav);
    combat.attack(0); combat.update(1 / 60);
    const gap = Math.hypot(guard.x - position.x, guard.z - position.z); closest = Math.min(closest, gap);
    assert.ok(gap >= BODY.person + BODY.traveler - 1e-7, `Bodies overlapped by ${BODY.person + BODY.traveler - gap}`);
    assert.ok(position.z < guard.z, 'Forward swing spam crossed to the back of the guard');
  }
  assert.ok(closest < .8, 'The test actually pressed into the guard');
  assert.ok(events.some(event => event.type === 'player-hit'), 'A real level-one guard can still land its existing timed swing');
});

test('hit reactions stop against a bystander behind the player, an ally, or an enemy', () => {
  for (const victim of ['traveler', 'ally', 'enemy']) {
    const { combat, position, events, start } = fixture([{ id: 'bystander', x: 0, z: 1.8, r: BODY.person }]);
    let actor;
    if (victim === 'enemy') {
      start([{ id: 'victim', kind: 'goblin', hp: 100, x: 0, z: 1.1, entry: 60 }]);
      actor = combat.state.enemies[0]; combat.attack(0);
    } else {
      position.x = victim === 'ally' ? 5 : 0; position.z = 1.1;
      start([{ id: 'attacker', kind: 'soldier', hp: 100, x: 0, z: 0 }],
        victim === 'ally' ? [{ id: 'victim', kind: 'legionary', hp: 100, x: 0, z: 1.1 }] : []);
      actor = victim === 'ally' ? combat.state.allies[0] : position;
      const attacker = combat.state.enemies[0]; attacker.action = 'attack'; attacker.yaw = 0;
    }
    combat.update(.35);
    const hit = victim === 'enemy' ? 'hit' : `${victim === 'traveler' ? 'player' : victim}-hit`;
    assert.ok(events.some(event => event.type === hit), `${victim} must actually take a hit`);
    assert.ok(actor.z <= 1.8 - BODY.person - (victim === 'traveler' ? BODY.traveler : BODY.person) + 1e-8,
      `${victim}'s hit reaction passed into the bystander at ${actor.z}`);
  }
});

test('active actors own their NPC aliases and town footprints resume after victory', () => {
  const townAlly = { id: 'town-ally', x: 0, z: .8, r: BODY.person };
  const { combat, position, start } = fixture([townAlly]);
  start([{ id: 'victim', kind: 'goblin', hp: 100, x: 0, z: 1, entry: 60 }],
    [{ id: 'friend', npcId: 'town-ally', kind: 'legionary', hp: 100, x: 6, z: 0 }]);
  // The world representation of this active ally must not become a second body.
  combat.dodge({ x: 0, z: 1 }); combat.update(.25);
  assert.ok(position.z > .8 - BODY.person - BODY.traveler, 'The remote active ally owns its NPC alias');
  assert.ok(position.z <= 1 - BODY.person - BODY.traveler + 1e-8, 'Its enemy still blocks at its actual position');
  combat.state.phase = 'won'; position.z = 0; combat.update(1);
  combat.dodge({ x: 0, z: 1 }); combat.update(.25);
  assert.ok(position.z <= .8 - BODY.person - BODY.traveler + 1e-8, 'The town actor resumes its own footprint when the encounter ends');
});
