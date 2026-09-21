import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCombat } from '../src/combat.js';
import { createWeapons, WEAPON_TYPES, feelOf } from '../src/weapons.js';
import { createInventoryState } from '../src/inventory.js';
import { createSkills } from '../src/skills.js';
import { createCombatSkills, ARMS_SKILLS, familyOf, marginsFor, drawTime } from '../src/combat-skills.js';
import { smithOffers, buyFromSmith, ARROWS } from '../src/smith.js';
import { COPPER_ITEM, STARTING_PURSE } from '../src/economy.js';
import { BOW, JERRYS_BOW, drawnBy, shotAt, solidAt, survives, recoveredOf, flightOf } from '../src/archery.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

/** A fight with a bow in the traveler's hands and a quiver behind him. */
function archer({ arrows = 20, trees = [], level = 1, enemies = [{ id: 'goblin', x: 0, z: 12, hp: 200 }] } = {}) {
  const world = {
    bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 }, colliders: [], heightAt: () => 1.5,
    // The same shape `roomToSwing` reads: a circle with an `r`, or a box with `hx`/`hz`.
    nearColliders: (x, z, radius) => trees.filter(t => Math.hypot(t.x - x, t.z - z) <= radius + (t.r ?? 0)),
  };
  const position = { x: 0, y: 1.5, z: 0 };
  const events = [];
  const skills = createSkills();
  const arms = createCombatSkills({ skills });
  arms.learn('bows');
  const quiver = { count: arrows };
  const type = WEAPON_TYPES[BOW.id];
  const weapon = { id: BOW.id, name: type.name, usable: true, owned: true,
    damage: [...type.damage], reachMultiplier: type.reachMultiplier, ...feelOf(BOW.id) };
  const combat = createCombat({ world, position, onEvent: event => events.push(event),
    getWeapon: () => weapon, getArrows: () => quiver.count,
    getMargins: () => ({ ...marginsFor({ bows: level }), swingCost: 6 }) });
  combat.startEncounter({ id: 'archery', level: 0, center: { x: 0, z: 8 }, checkpoint: { x: 0, z: 0 },
    retreatAxis: 'z', retreatLine: 30, enemies });
  return { combat, position, events, quiver, weapon, world, skills, arms,
    of: type => events.filter(e => e.type === type) };
}
/** Hold the button for `seconds`, then let go. Returns the arrow that left, if one did. */
function shoot(fixture, seconds, yaw = 0) {
  const before = fixture.of('loose').length;
  for (let t = 0; t < seconds; t += 1 / 60) { fixture.combat.draw(true, yaw); fixture.combat.update(1 / 60); }
  fixture.combat.draw(false, yaw);
  return fixture.of('loose')[before] ?? null;
}
/** Let every arrow in the air finish its flight. */
const settle = fixture => { for (let i = 0; i < 300 && fixture.combat.state.arrows.length; i++) fixture.combat.update(1 / 60); };

test('the bow is a weapon like any other, and nobody sells one', () => {
  const type = WEAPON_TYPES[BOW.id];
  assert.ok(type, 'the game has a bow');
  assert.equal(type.ranged, true, 'and it is the only thing that is not a swing');
  assert.deepEqual(ARMS_SKILLS.bows.weapons, [BOW.id], 'it has the family the brief left empty for it');
  assert.equal(familyOf(BOW.id), 'bows');
  for (const other of Object.keys(WEAPON_TYPES)) if (other !== BOW.id)
    assert.notEqual(WEAPON_TYPES[other].ranged, true, `${other} is swung`);
  // It travels the same road every other weapon travels: through `profile()`, with its feel.
  const weapons = createWeapons({ inventory: { has: () => true, count: () => 1 } });
  weapons.equip(BOW.id);
  assert.equal(weapons.profile().ranged, true, 'and the fight is told so by the profile, not by a flag of its own');
  assert.equal(weapons.profile().id, BOW.id);
  // Skill in Bows makes an arrow hurt, exactly as skill in Blades makes a sword hurt.
  const skilled = createWeapons({ inventory: { has: () => true, count: () => 1 }, damageScale: () => 2 });
  skilled.equip(BOW.id);
  assert.equal(skilled.profile().damage[0], WEAPON_TYPES[BOW.id].damage[0] * 2);
});

test('the draw fills in the time the traveler’s skill says, and nothing sooner', () => {
  assert.equal(drawnBy(0, 1.1), 0);
  assert.ok(Math.abs(drawnBy(.55, 1.1) - .5) < 1e-9, 'half the time is half the draw');
  assert.equal(drawnBy(3, 1.1), 1, 'and a draw never goes past full');
  // Level 1 takes 1.1 s and level 99 takes .6, which is ARMS.draw and is already in the margins.
  assert.ok(Math.abs(drawTime(1) - 1.1) < 1e-9);
  assert.ok(Math.abs(drawTime(99) - .6) < 1e-9);
  const slow = archer({ level: 1 }), quick = archer({ level: 99 });
  for (let t = 0; t < .7; t += 1 / 60) { slow.combat.draw(true, 0); slow.combat.update(1 / 60); quick.combat.draw(true, 0); quick.combat.update(1 / 60); }
  assert.ok(quick.combat.drawn > slow.combat.drawn, `an archer of 99 is at ${quick.combat.drawn.toFixed(2)} where a beginner is at ${slow.combat.drawn.toFixed(2)}`);
  assert.equal(quick.combat.drawn, 1, 'and is already full');
  assert.ok(slow.combat.drawn < 1, 'while the beginner is still pulling');
});

test('hold to draw, release to loose, and a snatched shot falls short', () => {
  const full = archer();
  const shot = shoot(full, 1.2);
  assert.ok(shot, 'letting go of a full draw sends an arrow');
  assert.equal(Math.abs(shot.pull - 1) < 1e-9, true);
  assert.equal(full.combat.state.arrows.length, 1, 'and it is in the air');
  // A half draw is a real arrow that does not reach and does not hurt as much.
  const half = archer();
  const weak = shoot(half, .55);
  assert.ok(weak && weak.pull < .6, `a half draw is ${weak.pull.toFixed(2)}`);
  const strong = shotAt(1, { damage: 30 }), weakShot = shotAt(.5, { damage: 30 });
  assert.ok(weakShot.damage < strong.damage && weakShot.range < strong.range, 'weaker and shorter, together');
  assert.ok(weakShot.damage >= 1, 'and never nothing at all');
  // Below the least draw, letting go is not a shot: the arrow stays in the quiver.
  const twitch = archer();
  assert.equal(shoot(twitch, .1), null, 'a twitch sends nothing');
  assert.equal(twitch.of('draw-spent').length, 1, 'and the traveler is told the draw was wasted');
  assert.equal(twitch.combat.state.arrows.length, 0);
  assert.equal(shotAt(BOW.least - .01, {}), null);
  assert.ok(shotAt(BOW.least, {}), 'and the least draw is a shot');
});

test('nothing draws without a bow, an arrow, the wind and an idle body', () => {
  // An empty quiver: the button does nothing at all, and nothing is spent.
  const empty = archer({ arrows: 0 });
  assert.equal(shoot(empty, 1.2), null, 'a bow with no arrows is a stick with a string on it');
  assert.equal(empty.combat.drawn, 0);
  // A sword cannot be drawn, and a bow cannot be swung.
  const swordsman = archer();
  swordsman.weapon.ranged = false;
  swordsman.combat.draw(true, 0); swordsman.combat.update(1 / 60);
  assert.equal(swordsman.combat.drawn, 0, 'a sword does not draw');
  const archerToo = archer();
  assert.equal(archerToo.combat.attack(0), false, 'and a bow does not swing');
  assert.equal(archerToo.combat.state.player.action, 'idle');
  // The wind pays for it, and a spent bar cannot even begin. Asked of one frame, because the bar
  // fills itself back up at twenty-four a second and a long hold would answer a different question.
  const winded = archer();
  winded.combat.state.player.stamina = BOW.wind - 1;
  assert.equal(winded.combat.draw(true, 0), 0, 'no wind, no draw');
  winded.combat.state.player.stamina = BOW.wind;
  assert.equal(winded.combat.draw(true, 0) >= 0 && winded.combat.state.player.drawing, true, 'exactly enough is enough');
  const spent = archer();
  const before = spent.combat.state.player.stamina;
  shoot(spent, 1.2);
  assert.ok(spent.combat.state.player.stamina < before, 'and a shot costs wind');
});

test('an arrow travels, and the first solid thing stops it', () => {
  // Open ground, at a goblin twelve metres off: it flies, it takes time, and it lands on him.
  const clear = archer();
  shoot(clear, 1.2);
  const flying = clear.combat.state.arrows[0];
  assert.ok(flying && flying.flown === 0, 'it starts where he is standing');
  clear.combat.update(1 / 60);
  assert.ok(clear.combat.state.arrows[0]?.flown > 0, 'and it is somewhere else a frame later');
  settle(clear);
  const landed = clear.of('arrow-landed')[0];
  assert.equal(landed.stopped, 'target');
  assert.equal(landed.targetId, 'goblin');
  assert.ok(clear.of('hit').some(hit => hit.targetId === 'goblin' && hit.damage > 0), 'and it hurt him');

  // **Trees stop arrows.** "In woodland I am a man holding a stick."
  const wood = archer({ trees: [{ x: 0, z: 6, r: .5 }] });
  shoot(wood, 1.2);
  settle(wood);
  const stopped = wood.of('arrow-landed')[0];
  assert.equal(stopped.stopped, 'solid', 'the tree took it');
  assert.ok(stopped.z < 7 && stopped.z > 4, `it stopped at the tree, at ${stopped.z.toFixed(1)} m`);
  assert.equal(wood.of('hit').length, 0, 'and the goblin behind it is untouched');
  // The same question, asked without a fight.
  assert.ok(solidAt({ nearColliders: () => [{ x: 0, z: 6, r: .5 }] }, 0, 6));
  assert.equal(solidAt({ nearColliders: () => [] }, 0, 6), null, 'and open ground stops nothing');
  assert.equal(solidAt(null, 0, 6), null, 'as does a world with no colliders at all');
  assert.equal(flightOf({ yaw: 0, range: 20, world: { nearColliders: () => [{ x: 0, z: 6, r: .5 }] } }).stopped, 'solid');
  assert.equal(flightOf({ yaw: 0, range: 20 }).stopped, 'spent');
  assert.ok(Math.abs(flightOf({ yaw: 0, range: 20 }).travelled - 20) < .3, 'and open ground is the whole of its range');

  // A miss into nothing: it carries its range and drops.
  const miss = archer({ enemies: [{ id: 'goblin', x: 10, z: 12, hp: 200 }] });
  shoot(miss, 1.2);
  settle(miss);
  assert.equal(miss.of('arrow-landed')[0].stopped, 'spent');
  assert.equal(miss.of('hit').length, 0);
  // **A half-drawn arrow falls short of the same target a full one reaches.** At a beginner's
  // 1.1 s draw, .6 s is a pull of .55 and a range of 18.7 m, and he is standing at 24.
  const far = [{ id: 'goblin', x: 0, z: 24, hp: 200, entry: 30 }];
  const short = archer({ enemies: far });
  shoot(short, .6);
  settle(short);
  assert.equal(short.of('arrow-landed')[0].stopped, 'spent', 'it never got there');
  assert.ok(short.of('arrow-landed')[0].z < 24);
  assert.equal(short.of('hit').length, 0);
  const reached = archer({ enemies: far });
  shoot(reached, 1.2);
  settle(reached);
  assert.equal(reached.of('arrow-landed')[0].stopped, 'target', 'and a full draw does');
});

test('about two in three come back, and which ones is arithmetic rather than a roll', () => {
  assert.equal(BOW.breaksEvery, 3);
  let back = 0;
  for (let n = 1; n <= 300; n++) if (survives(n)) back++;
  assert.equal(back, 200, 'exactly two in three over three hundred');
  assert.equal(recoveredOf(300), 200);
  assert.equal(recoveredOf(3), 2);
  assert.equal(recoveredOf(0), 0);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(survives), [true, true, false, true, true, false]);
  // And the fight says so of every arrow it lands, hit or miss.
  const fixture = archer({ arrows: 9 });
  for (let i = 0; i < 6; i++) { shoot(fixture, 1.2); settle(fixture); }
  const landed = fixture.of('arrow-landed');
  assert.equal(landed.length, 6);
  assert.equal(landed.filter(one => one.recovered).length, 4, 'four of six');
  assert.deepEqual(landed.map(one => one.n), [1, 2, 3, 4, 5, 6], 'and they are numbered in the order they left');
});

/**
 * **And an archer beside him does not touch the count.** The rule above is worth exactly as much
 * as it is true with Jerry on the field, and it was not: the ally's arrows took their id from the
 * traveler's own tally, so every shot of Jerry's moved the traveler's next shaft along one. Thirty
 * shots came back seventeen instead of twenty, and because Jerry's cadence is not the same twice,
 * a reload changed which of the traveler's shafts broke - the one thing the arithmetic was chosen
 * to prevent.
 */
test('an archer fighting beside him does not change which of his shafts break', () => {
  const run = jerry => {
    const world = { bounds: { minX: -99, maxX: 99, minZ: -99, maxZ: 99 }, colliders: [], heightAt: () => 1.5, nearColliders: () => [] };
    const position = { x: 0, y: 1.5, z: 0 };
    const events = [];
    const quiver = { count: 200 };
    const type = WEAPON_TYPES[BOW.id];
    const weapon = { id: BOW.id, name: type.name, usable: true, owned: true,
      damage: [...type.damage], reachMultiplier: type.reachMultiplier, ...feelOf(BOW.id) };
    const combat = createCombat({ world, position, onEvent: e => events.push(e),
      getWeapon: () => weapon, getArrows: () => quiver.count, getMargins: () => ({ ...marginsFor({ bows: 1 }), swingCost: 6 }) });
    assert.equal(combat.startEncounter({ id: 'beside', level: 0, center: { x: 0, z: 10 }, checkpoint: { x: 0, z: 0 },
      retreatAxis: 'z', retreatLine: 40,
      // Tough enough to stand there and be shot at for the whole run, and held back so the
      // measurement is of the shafts rather than of a fight.
      enemies: [{ id: 'butt', x: 0, z: 26, hp: 10000, entry: jerry ? 0 : 60 }],
      allies: jerry ? [{ id: 'merc-jerry', name: 'Jerry', kind: 'archer', x: -3, z: 2, level: 40, toughness: 34 }] : [] }), true);
    for (let shot = 0; shot < 30; shot++) {
      for (let t = 0; t < 1.3; t += 1 / 60) { combat.draw(true, 0); combat.update(1 / 60); }
      combat.draw(false, 0);
      for (let i = 0; i < 90 && combat.state.arrows.length; i++) combat.update(1 / 60);
    }
    const mine = events.filter(e => e.type === 'arrow-landed' && !e.owner);
    return { numbers: events.filter(e => e.type === 'loose').map(e => e.n),
      back: mine.filter(one => one.recovered).length, loosed: mine.length,
      jerrysArrows: events.filter(e => e.type === 'arrow-landed' && e.owner).length };
  };
  const alone = run(false), beside = run(true);
  assert.equal(alone.loosed, 30);
  assert.equal(beside.loosed, 30);
  assert.ok(beside.jerrysArrows > 0, 'Jerry is actually shooting, or this measures nothing');
  assert.deepEqual(beside.numbers, alone.numbers,
    'the traveler\'s shafts are numbered by his own shots and nobody else\'s');
  assert.equal(alone.back, recoveredOf(30));
  assert.equal(beside.back, recoveredOf(30), `two in three with an archer beside him too (${beside.back} of 30)`);
});

test('the smiths sell arrows, and a starting purse can afford some', () => {
  const board = smithOffers(0);
  const arrows = board.find(item => item.kind === 'arrows');
  assert.ok(arrows, 'the board has them');
  assert.equal(arrows.id, BOW.arrow);
  assert.ok(arrows.price <= STARTING_PURSE, `a dozen is ${arrows.price} against a purse of ${STARTING_PURSE}`);
  assert.equal(arrows, ARROWS);
  // Every forge sells them, in every country, at the same price: a shaft is a shaft.
  for (let level = 0; level <= 11; level++)
    assert.deepEqual(smithOffers(level).find(item => item.kind === 'arrows'), ARROWS, `level ${level}`);
  // Buying is atomic, the same way a jack is.
  const inventory = createInventoryState();
  inventory.add(COPPER_ITEM, STARTING_PURSE);
  const bought = buyFromSmith({ inventory, gear: null, item: arrows });
  assert.equal(bought.ok, true);
  assert.equal(inventory.count(BOW.arrow), arrows.bundle);
  assert.equal(inventory.count(COPPER_ITEM), STARTING_PURSE - arrows.price);
  // Too poor: nothing moves, and he is told the price and what he has.
  const broke = createInventoryState();
  broke.add(COPPER_ITEM, arrows.price - 1);
  const refused = buyFromSmith({ inventory: broke, gear: null, item: arrows });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /copper/);
  assert.equal(broke.count(BOW.arrow), 0);
  assert.equal(broke.count(COPPER_ITEM), arrows.price - 1);
  // A man may lay arrows in before anybody has given him a bow.
  assert.ok(!inventory.has(BOW.id));
  assert.equal(buyFromSmith({ inventory, gear: null, item: arrows }).ok, true);
});

test('every arrow loosed leaves the quiver, and the host is the one who empties it', () => {
  const main = source('main.js');
  // The module never touches the satchel: it asks how many there are, exactly as it asks who
  // walks with the traveler and how hard the country is.
  assert.match(source('combat.js'), /const arrowsLeft = \(\) => Math\.max\(0, Math\.floor\(Number\(getArrows\?\.\(\)\) \|\| 0\)\);/);
  assert.match(main, /getArrows:\(\)=>inventory\.count\(BOW\.arrow\)/, 'and the host answers from the satchel');
  assert.match(main, /if\(e\.type==='loose'\)\{inventory\.remove\(BOW\.arrow,1\)/, 'a loosed arrow is gone from it');
  // Held, not pressed, offered before the fight is stepped - the same rule the guard follows.
  assert.match(main, /combat\.draw\(drawKey,player\.group\.rotation\.y\);/);
  const from = main.indexOf("if(mode==='playing'&&!reviewFrozen) {");
  const frame = main.slice(from, main.indexOf('const floor=world.heightAt(player.group.position.x,player.group.position.z);', from));
  assert.ok(frame.indexOf('combat.draw(drawKey,player.group.rotation.y);') < frame.indexOf('combat.update(dt);'),
    'the button is offered before the arrow can land');
  assert.match(main, /if\(mode!=='playing'\)\{combat\.guard\(false,player\.group\.rotation\.y\);combat\.draw\(false\);\}/,
    'and nothing is held while nothing is played');
  // No new key: the swing button is the draw button when there is a bow in his hands.
  assert.match(main, /const ranged=\(\)=>!!heldWeapon\(\)\?\.ranged;/);
  assert.match(main, /if\(ranged\(\)\)return;/, 'a press does not swing a bow');
});

/**
 * **A drawn bow has to read**, and a picture can be looked at generously, so the pose is measured
 * instead. The first draft failed all three of these: `arm` is positive *forward* in this rig and
 * the draft had it backwards, which put both hands level and a little behind him, 0.70 m apart
 * across the body and 0.01 m apart in depth - a man holding a washing line. The bow lay flat, and
 * the arrow pointed at him.
 */
test('the drawn bow is a drawn bow, measured rather than admired', async () => {
  const { sourceModule } = await import('./module-loader.js');
  const THREE = await sourceModule('../vendor/three.module.js');
  const { createCharacter } = await sourceModule('../src/characters.js');
  /** Where something is in the figure's own frame: +x his right, +y up, **-z the way he faces**. */
  const own = (actor, node, local = [0, 0, 0]) => {
    node.updateWorldMatrix(true, true);
    return new THREE.Vector3(...local).applyMatrix4(node.matrixWorld)
      .sub(actor.group.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), -actor.group.rotation.y);
  };
  const settle = (actor, pose) => { for (let i = 0; i < 60; i++) actor.animate(i / 60, 0, true, pose); };
  const archerLook = { weapon: 'bow', tunic: 0x4a5560, skin: 0xd7ad7e, build: 'slight', headgear: 'bare', hairStyle: 'curls', facialHair: 'clean', garment: 'archer', marks: [] };

  for (const [who, actor, grip] of [
    ['the traveler', (() => { const a = createCharacter(); a.setWeapon(BOW.id); return a; })(), 'Traveler bow grip'],
    ['Jerry', createCharacter({ role: 'mercenary', armed: true, look: archerLook }), 'Bow grip'],
  ]) {
    const bow = actor.group.getObjectByName('Hunting bow (held)');
    assert.ok(bow, `${who} has a bow in his hand, not only across his back`);
    const arrow = actor.group.getObjectByName('Nocked arrow');
    assert.ok(arrow, `${who} has a shaft to put on it`);

    // At rest: no arrow on the string. A man standing about with a bow is not nocked.
    settle(actor, { armed: true, draw: 0 });
    assert.equal(arrow.visible, false, `${who} is not nocked while he is not drawing`);

    // At full draw: the two hands far apart in depth, the bow standing up, the head leading.
    settle(actor, { armed: true, draw: 1 });
    assert.equal(arrow.visible, true, `${who} has a shaft on the string at full draw`);
    const bowHand = own(actor, actor.group.getObjectByName(grip));
    const stringHand = own(actor, actor.group.getObjectByName('Traveler weapon grip') ?? actor.group.getObjectByName('Soldier weapon grip'));
    assert.ok(bowHand.z < -.3, `${who}'s bow hand is out in front of him (${bowHand.z.toFixed(2)} m)`);
    // Half a metre for the traveler, a little less for Jerry, who is a slighter build and has
    // shorter arms to do it with. The pose this forbids measured 0.01 m.
    assert.ok(stringHand.z - bowHand.z > .45, `${who}'s hands are ${(stringHand.z - bowHand.z).toFixed(2)} m apart in depth`);
    assert.ok(Math.abs(stringHand.y - bowHand.y) < .25, `${who} draws level, not uphill`);
    assert.ok(stringHand.y > 1, `${who} draws at chest height or better (${stringHand.y.toFixed(2)} m)`);
    // The limbs stand up: a bow held like a tray is what the first draft drew.
    const top = own(actor, bow, [0, .58, 0]), foot = own(actor, bow, [0, -.58, 0]);
    assert.ok(Math.abs(top.y - foot.y) > .9, `${who}'s bow stands (${Math.abs(top.y - foot.y).toFixed(2)} m of limb)`);
    assert.ok(Math.abs(top.x - foot.x) < .3, `${who}'s bow is not lying across him`);
    // And the arrow points where he is looking, head first.
    const head = own(actor, arrow, [.04, 0, .5]), nock = own(actor, arrow, [.04, 0, -.3]);
    assert.ok(head.z < nock.z, `${who}'s arrow head leads (head ${head.z.toFixed(2)}, nock ${nock.z.toFixed(2)})`);
    assert.ok(head.z < -.6, `${who}'s arrow is out past the bow (${head.z.toFixed(2)} m)`);
  }
  // Jerry's slung bow comes off his back when it is in his hands: he carries one bow, not two.
  const armed = createCharacter({ role: 'mercenary', armed: true, look: archerLook });
  assert.equal(armed.group.getObjectByName('Hunting bow').visible, false, 'the slung one is put away');
  assert.ok(armed.group.getObjectByName('Hunting bow (held)'), 'and the held one is out');
  const walking = createCharacter({ role: 'mercenary', armed: false, look: archerLook });
  assert.equal(walking.group.getObjectByName('Hunting bow').visible, true, 'on the road it is across his back');
  assert.equal(walking.group.getObjectByName('Hunting bow (held)'), undefined, 'and there is no second one');
});

/**
 * **Jerry shoots as an ally** (the user's answers, 2026-09-21). An archer does not close: he
 * stands off, draws, and looses, and his arrow is the same arrow the traveler's is - same list,
 * same flight, stopped by the same trees, because his own complaint about woodland should be one
 * rule and not two. There are no enemy archers yet, by the coordinator's ruling.
 */
test('an archer ally stands off and looses, and his arrows are his own', () => {
  const world = { bounds: { minX: -99, maxX: 99, minZ: -99, maxZ: 99 }, colliders: [], heightAt: () => 1.5, nearColliders: () => [] };
  const position = { x: 0, y: 1.5, z: 0 };
  const events = [];
  const combat = createCombat({ world, position, onEvent: e => events.push(e),
    getWeapon: () => ({ id: 'simple-sword', usable: true, damage: [24, 26, 34], reachMultiplier: 1 }) });
  assert.equal(combat.startEncounter({ id: 'aim', center: { x: 0, z: 8 }, checkpoint: { x: 0, z: 0 },
    retreatAxis: 'z', retreatLine: 30,
    // The goblin is held back so the measurement is of Jerry and not of a scrum.
    enemies: [{ id: 'goblin', x: 4, z: 14, hp: 600, entry: 60 }],
    allies: [{ id: 'merc-jerry', name: 'Jerry', kind: 'archer', x: -3, z: 2, level: 40, toughness: 34 }] }), true,
    'an archer is an ally the game will lay');

  let aimed = null;
  for (let i = 0; i < 60 * 12 && !aimed; i++) {
    combat.update(1 / 60);
    const jerry = combat.state.allies[0], goblin = combat.state.enemies[0];
    if (jerry.action === 'windup' && jerry.progress > .8) {
      const bearing = Math.atan2(goblin.x - jerry.x, goblin.z - jerry.z);
      aimed = { off: Math.abs(Math.atan2(Math.sin(bearing - jerry.yaw), Math.cos(bearing - jerry.yaw))),
        apart: Math.hypot(goblin.x - jerry.x, goblin.z - jerry.z) };
    }
  }
  assert.ok(aimed, 'he draws');
  // He draws at his target, not past it: the shot goes along his facing, so a man aiming askew
  // would send the arrow askew however good the pose looked.
  assert.ok(aimed.off < .05, `he is ${(aimed.off * 180 / Math.PI).toFixed(1)} degrees off his target`);
  // And he does it from a long way off - an archer at arm's length is the man holding a stick.
  assert.ok(aimed.apart > 8, `he draws from ${aimed.apart.toFixed(1)} m`);

  for (let i = 0; i < 60 * 12 && !events.some(e => e.type === 'arrow-landed' && e.owner); i++) combat.update(1 / 60);
  const landed = events.find(e => e.type === 'arrow-landed' && e.owner);
  assert.ok(landed, 'his arrow lands');
  assert.equal(landed.owner, 'merc-jerry');
  assert.equal(landed.stopped, 'target');
  assert.equal(landed.targetId, 'goblin');
  assert.equal(landed.recovered, false, 'and it is his, not something the traveler walks the field for');
  assert.ok(events.some(e => e.type === 'hit' && e.targetId === 'goblin' && e.damage > 0), 'it hurt the goblin');
  // No enemy archer exists to answer him.
  const combatSource = source('combat.js');
  const kinds = combatSource.slice(combatSource.indexOf('const ENEMY_KINDS'), combatSource.indexOf('const SOLDIER_LOOKS'));
  assert.ok(kinds.length > 200, 'the enemy kinds are still where they were');
  assert.ok(!kinds.includes('bow:'), 'no enemy kind carries a bow — there are no enemy archers yet');
  // And the host gives the family's own man the archer's kind, rather than writing a list.
  assert.match(source('main.js'), /kind:arms\.weapon==='bows'\?'archer':'legionary'/);
});
