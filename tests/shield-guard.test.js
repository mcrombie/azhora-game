import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCombat, GUARD_ARC } from '../src/combat.js';
import { ARMS, guardShare, guardCost, createCombatSkills, TOP_LEVEL } from '../src/combat-skills.js';
import { createSkills } from '../src/skills.js';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
const { createCharacter, BUCKLER_NAME } = await sourceModule('../src/characters.js');

/** Flat ground and nothing to walk into: the fight, and only the fight. */
const world = { heightAt: () => 1.5, colliders: [], bounds: { minX: -300, maxX: 300, minZ: -300, maxZ: 300 } };

/** A fight with one goblin standing due north of the traveler, and a shield to hand. */
function fight({ level = 0, shield = true, shieldLevel = 1 } = {}) {
  const position = { x: 0, y: 1.5, z: 0 };
  const events = [];
  const combat = createCombat({ world, position, onEvent: event => events.push(event),
    getMargins: () => ({ guardShare: guardShare(shieldLevel), guardCost: guardCost(shieldLevel), hasShield: shield }) });
  assert.equal(combat.startEncounter({ id: 'guard-test', level, center: { x: 0, z: 0 },
    checkpoint: { x: 0, z: 13 }, retreatLine: 21, retreatAxis: 'z',
    enemies: [{ id: 'g1', kind: 'goblin', x: 0, z: 2, hp: 100 }] }, { atCheckpoint: true }), true);
  return { combat, events, position };
}

/**
 * Let the one goblin come up and strike, with the guard held or not. The guard is offered every
 * frame, exactly as the host offers it, so nothing here can latch it on the module's behalf.
 *
 * The facing is worked out from **where the goblin actually is**, every frame, rather than from
 * where it was put: it walks, and the first draft of this aimed at the spot it started from and
 * proved the opposite of what it meant to. `off` turns him that far away from the blow.
 */
function takeABlow({ combat, events, position }, { held = false, off = 0 } = {}) {
  const before = combat.state.player.hp;
  for (let step = 0; step < 60 * 20 && combat.state.player.hp === before && combat.state.phase === 'active'; step++) {
    const foe = combat.state.enemies.find(one => one.active && one.action !== 'dead') ?? combat.state.enemies[0];
    combat.guard(held, Math.atan2(foe.x - position.x, foe.z - position.z) + off);
    combat.update(1 / 60);
  }
  return { hp: combat.state.player.hp, lost: before - combat.state.player.hp,
    caught: events.filter(one => one.type === 'caught'), hit: events.filter(one => one.type === 'player-hit') };
}

test('level 1 is today: with no shield there is no guard, however hard the key is held', () => {
  // The whole of phase 4 has to be invisible to a traveler who owns no shield.
  const bare = fight({ shield: false });
  assert.equal(bare.combat.guard(true, 0), false, 'nothing to guard with');
  const blow = takeABlow(bare, { held: true });
  assert.equal(blow.caught.length, 0, 'nothing is caught');
  assert.ok(blow.lost > 0, 'and the blow lands in full');
  assert.equal(bare.combat.state.player.action, 'hurt', 'and rocks him, exactly as it does today');
  // A combat wired to nothing at all is the same: TODAY says `hasShield: false`.
  const nothing = createCombat({ world, position: { x: 0, y: 0, z: 0 }, getWeapon: () => null });
  assert.equal(nothing.guard(true, 0), false);
});

test('a blow at his front is caught: the shield takes its share and the rest costs him wind', () => {
  const held = fight({ shieldLevel: 1 });
  const open = fight({ shieldLevel: 1 });
  const guarded = takeABlow(held, { held: true });
  const unguarded = takeABlow(open, { held: false });
  assert.equal(guarded.caught.length, 1, 'one blow, caught');
  assert.ok(guarded.lost < unguarded.lost, `${guarded.lost} got through against ${unguarded.lost}`);
  // Six tenths of it at level 1, which is the brief's own number.
  const [caught] = guarded.caught;
  assert.equal(caught.absorbed, Math.round(unguarded.lost * ARMS.guard.low));
  assert.equal(caught.absorbed + caught.damage, unguarded.lost, 'what it took and what got through are the blow');
  // It costs wind, and it does not rock him: the guard is still up for the next one.
  assert.equal(held.combat.state.player.stamina, 100 - ARMS.guardCost.low);
  assert.equal(held.combat.state.player.action, 'idle', 'not rocked');
  assert.equal(held.combat.state.player.guarding, true, 'and the shield is still up');
  // Toughness is still paid for what got through, and Shield for what was stopped.
  assert.equal(guarded.hit.length, 1);
  assert.equal(guarded.hit[0].caught, true);
  assert.equal(guarded.hit[0].damage, caught.damage);
});

test('a shield is not a wall: behind, winded, swinging or rocked, it is not there', () => {
  // Behind him. The arc is the soldiers' own sixty degrees, read from the other side.
  assert.equal(GUARD_ARC, Math.PI / 3);
  const behind = fight();
  const took = takeABlow(behind, { held: true, off: Math.PI });
  assert.equal(took.caught.length, 0, 'a blow in the back finds no shield');
  assert.ok(took.lost > 0 && behind.combat.state.player.action === 'hurt');
  // Just inside and just outside the arc, from the same blow.
  const inside = fight(), outside = fight();
  assert.equal(takeABlow(inside, { held: true, off: GUARD_ARC - .05 }).caught.length, 1, 'just inside the arc');
  assert.equal(takeABlow(outside, { held: true, off: GUARD_ARC + .05 }).caught.length, 0, 'just outside it');
  // Winded. With less wind than a catch costs, the shield is not up at all.
  const winded = fight();
  winded.combat.state.player.stamina = ARMS.guardCost.low - 1;
  assert.equal(winded.combat.guard(true, 0), false, 'no wind, no guard');
  winded.combat.state.player.stamina = ARMS.guardCost.low;
  assert.equal(winded.combat.guard(true, 0), true, 'exactly enough is enough');
  // Swinging or rocked. It needs an idle body, which is what the soldiers' guard needs too.
  const busy = fight();
  busy.combat.attack(0);
  assert.equal(busy.combat.state.player.action, 'attack');
  assert.equal(busy.combat.guard(true, 0), false, 'a man swinging is not a man guarding');
});

test('levels only make it better, and never make him unhittable', () => {
  // The brief's two numbers, from both ends.
  assert.equal(guardShare(1), ARMS.guard.low);
  assert.equal(guardShare(TOP_LEVEL), ARMS.guard.high);
  assert.equal(guardCost(1), ARMS.guardCost.low);
  assert.equal(guardCost(TOP_LEVEL), ARMS.guardCost.high);
  assert.ok(guardShare(TOP_LEVEL) > guardShare(1) && guardCost(TOP_LEVEL) < guardCost(1));
  for (let level = 2; level <= TOP_LEVEL; level++) {
    assert.ok(guardShare(level) >= guardShare(level - 1), `share rises at ${level}`);
    assert.ok(guardCost(level) <= guardCost(level - 1), `wind falls at ${level}`);
  }
  // **Even at ninety-nine a caught blow still hurts.** No level turns the shield into a wall.
  const master = fight({ shieldLevel: TOP_LEVEL });
  const took = takeABlow(master, { held: true });
  assert.equal(took.caught.length, 1);
  assert.ok(took.lost > 0, 'the best shield in the game still lets something through');
  assert.ok(took.lost < 0.5 * 24, 'but not much of it');
  // And it buys no invulnerable moment: only a dodge makes a blow miss.
  assert.equal(master.combat.state.player.invulnerable, false);
});

test('the shield is paid for what it stopped, and the host holds rather than presses it', () => {
  const arms = createCombatSkills({ skills: createSkills() });
  arms.learn('shield');
  const lesser = createCombatSkills({ skills: createSkills() });
  lesser.learn('shield');
  assert.ok(arms.caught({ damage: 10, countryLevel: 0 }).xp > lesser.caught({ damage: 3, countryLevel: 0 }).xp,
    'a bigger blow caught teaches more');
  assert.equal(arms.caught({ damage: 0 }).xp, 0, 'and catching nothing teaches nothing');
  // Nothing is banked before somebody shows you the skill, as with every other arm.
  const unshown = createCombatSkills({ skills: createSkills() });
  assert.equal(unshown.caught({ damage: 10 }).xp, 0, 'nothing is banked before you are shown');
  const main = source('main.js');
  assert.match(main, /if\(e\.type==='caught'&&e\.absorbed>0\)\{arms\.learn\('shield'\);armsPaid\(arms\.caught\(\{damage:e\.absorbed/,
    'paid by what the shield actually took off the blow');
  // Held, not pressed: the key is read every frame and combat remembers no press of its own.
  assert.match(main, /const GUARD_KEY='KeyV';/);
  assert.match(main, /const guardKey=!autopilot\.active&&keys\.has\(GUARD_KEY\);/);
  assert.match(main, /combat\.guard\(guardKey,player\.group\.rotation\.y\);/);
  assert.match(source('combat.js'), /guardHeld = !!held;/, 'and nothing in the module latches it');
  // The hand slot IS the shield, and what he is seen holding follows what he is wearing.
  assert.match(main, /hasShield:!!gear\.wearing\('hand'\)/);
  assert.match(main, /player\.setShield\(carried\);/);
  // Not an optional call. The player is a facade over a replaceable body, and a verb missing from
  // that facade did nothing at all, quietly: the buckler was never built and four renders showed
  // a traveler with no shield before I stopped believing the camera and read the code.
  assert.match(main, /setShield:\(\.\.\.a\)=>playerBody\.setShield\(\.\.\.a\),/, 'the facade forwards it');
  assert.doesNotMatch(main, /player\.setShield\?\./, 'and it is never called optionally');
  assert.match(source('characters.js'), /const setShield = value => \{/);
});

test('the buckler is a thing on his arm, built once and shown or hidden', () => {
  // A camera angle is not evidence: the first render of this was taken from his sword side and
  // showed nothing either way. This asks the model.
  const actor = createCharacter();
  const named = () => actor.group.getObjectByName('The traveler\u2019s buckler');
  assert.equal(named(), undefined, 'he carries nothing until he owns one');
  actor.setShield(true);
  const buckler = named();
  assert.ok(buckler, 'and then he does');
  assert.equal(buckler.visible, true);
  // It hangs off the arm, not off the middle of him: it moves when he moves.
  assert.notEqual(buckler.parent, actor.group);
  let onTheArm = false;
  for (let node = buckler.parent; node; node = node.parent) if (node === actor.group) onTheArm = true;
  assert.ok(onTheArm, 'and it is part of him');
  // Taking it off hides it; putting it back shows the same one rather than making another.
  actor.setShield(false);
  assert.equal(buckler.visible, false);
  actor.setShield(true);
  assert.equal(named(), buckler, 'built once, not once a frame');
  let bucklers = 0;
  actor.group.traverse(node => { if (node.name === 'The traveler\u2019s buckler') bucklers++; });
  assert.equal(bucklers, 1);
});

test('the picture tells the truth: the arm is up exactly when the rules say the shield is', () => {
  const actor = createCharacter({ role: 'traveler' });
  actor.setShield(true);
  const buckler = actor.group.getObjectByName('The traveler\u2019s buckler');
  // The animator settles over frames, so ask it the way the game does rather than once.
  const settle = pose => {
    for (let i = 0; i < 40; i++) actor.animate(i / 40, 0, true, { armed: true, ...pose });
    actor.group.updateMatrixWorld(true);
    const at = new THREE.Vector3(); buckler.getWorldPosition(at);
    const face = new THREE.Vector3(0, 1, 0)
      .applyQuaternion(buckler.getWorldQuaternion(new THREE.Quaternion())).normalize();
    return { at, face };
  };
  const down = settle({}), up = settle({ guarding: true });
  // Up: across the centreline, at about chin height, with the face turned to what is in front.
  // He faces +z and his head is around 1.37, so these are the numbers of a shield actually held.
  assert.ok(up.at.y - down.at.y > .35, `it rises ${(up.at.y - down.at.y).toFixed(2)} m`);
  assert.ok(up.at.z - down.at.z > .15, 'and comes forward');
  assert.ok(Math.abs(up.at.x) < Math.abs(down.at.x), 'and in across the body');
  assert.ok(up.face.z > .6, `its face turns to the front (${up.face.z.toFixed(2)})`);
  assert.ok(down.face.z < .3 && Math.abs(down.face.x) > .8, 'and hangs flat at his side when it is not up');
  // And it goes back down: the pose is a function of the flag, not a thing that latches.
  const again = settle({});
  assert.ok(Math.abs(again.at.y - down.at.y) < .02, 'dropping the guard drops the arm');
});

test('the arm follows the rules and not the key, and the footer follows the shield', () => {
  const main = source('main.js');
  // **Up iff `guard` says up.** The pose is drawn from what combat decided this frame, not from
  // whether V is held: no wind, mid-swing or rocked all put the key down and the arm with it.
  assert.match(main, /guarding:!!combat\.state\.player\.guarding\}\);/, 'the picture reads the rule');
  assert.doesNotMatch(main, /guarding:\s*guardKey/, 'and never the key');
  // The module sets the flag and returns the same answer, so nothing can read one and draw the other.
  const combat = source('combat.js');
  assert.match(combat, /player\.guarding = guarding\(\);\s*\r?\n\s*return player\.guarding;/);
  // The footer names the key only while there is a shield on the arm to use it with.
  assert.match(main, /document\.body\.classList\.toggle\('shielded',carried\);/);
  assert.match(main, /const carried=!!gear\.wearing\('hand'\);/, 'and "carried" is the hand slot');
  const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
  assert.match(html, /<span class="shield-control"><kbd>V<\/kbd> Guard<\/span>/);
  const css = readFileSync(fileURLToPath(new URL('../src/adventure.css', import.meta.url)), 'utf8');
  assert.match(css, /\.shield-control \{display:none;\}body\.shielded \.shield-control \{display:inline;\}/,
    'hidden until the body says he is carrying one');
  // It is its own class, not the combat one: being armed is not being shielded.
  assert.ok(!/combat-control[^<]*Guard/.test(html), 'the guard is not shown merely for being armed');
});

test('an eased pose needs time, and a frozen view has none — so the view spends it by hand', () => {
  // **This is the bug the pose test could not see.** `damping` is `1 - exp(-rate * dt)` and dt is
  // the change in the time handed to `animate`. A frozen review stops `walkTime`, so dt is 0,
  // `rotate` moves nothing, and the body keeps the pose it already had - while `guard` reported
  // `up: true` and the buckler hung at his hip. The old test settled the animator itself, so it
  // proved `characters.js` right and said nothing about the frame it runs in.
  const actor = createCharacter({ role: 'traveler' });
  actor.setShield(true);
  const buckler = actor.group.getObjectByName(BUCKLER_NAME);
  const height = () => {
    actor.group.updateMatrixWorld(true);
    return buckler.getWorldPosition(new THREE.Vector3()).y;
  };
  for (let i = 0; i < 40; i++) actor.animate(i / 40, 0, true, { armed: true });
  const resting = height();
  // Time standing still: the same instant over and over, which is what a frozen view gives.
  for (let i = 0; i < 40; i++) actor.animate(1, 0, true, { armed: true, guarding: true });
  const frozen = height() - resting;
  // Time moving: the same forty frames, spent.
  for (let i = 0; i < 40; i++) actor.animate(1 + i / 60, 0, true, { armed: true, guarding: true });
  const spent = height() - resting;
  assert.ok(spent > .35, `time spent raises it ${spent.toFixed(2)} m`);
  // Frozen time does not raise it. Not quite nothing — the first call still sees the step from
  // whatever instant came before — but a fraction of the way, and it never gets any further,
  // which is a shield drawn at the hip while the rules say it is up.
  assert.ok(frozen < spent * .3, `frozen time got ${frozen.toFixed(2)} m of ${spent.toFixed(2)} and stopped`);

  // So the view spends the time itself, before it freezes.
  const main = source('main.js');
  assert.match(main, /function settlePose\(pose,frames=48\)\{/);
  assert.match(main, /for\(let step=0;step<frames;step\+\+\)player\.animate\(walkTime\+step\/60,0,true,pose\);/,
    'with time that actually advances');
  const view = main.slice(main.indexOf("if(view==='shield-guard')"));
  const body = view.slice(0, view.indexOf('return;'));
  assert.match(body, /settlePose\(\{armed:true,guarding:true\}\);/, 'the view eases the arm in');
  assert.ok(body.indexOf('settlePose') < body.indexOf('reviewFrozen=true'), 'and does it before it freezes');
});

test('the view reports what was drawn, not only what was decided', () => {
  const main = source('main.js');
  // `up: true` beside a hip-height shield was reportable for two commits. It is not any more:
  // the block carries the buckler's own position and facing, in the traveler's frame.
  assert.match(main, /buckler:bucklerDrawn\(\)\}/);
  assert.match(main, /function bucklerDrawn\(\)\{/);
  assert.match(main, /const node=player\.group\.getObjectByName\(BUCKLER_NAME\);/,
    'it looks up the very object on the screen');
  assert.match(main, /if\(!node\|\|!node\.visible\)return null;/, 'and says nothing when there is nothing drawn');
  // In his own frame, so the numbers mean the same wherever he stands and whichever way he faces.
  assert.match(main, /applyAxisAngle\(axis,turn\)/);
  assert.match(main, /const axis=new THREE\.Vector3\(0,1,0\),turn=-player\.group\.rotation\.y;/);
  // One name, shared, so the host and the model cannot drift apart over it.
  assert.match(source('characters.js'), /export const BUCKLER_NAME = /);
  assert.match(source('characters.js'), /buckler\.name = BUCKLER_NAME;/);
});
