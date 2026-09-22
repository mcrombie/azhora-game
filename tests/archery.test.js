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
import { borderEncounter } from '../src/border-chapter.js';
import { COPPER_ITEM, STARTING_PURSE } from '../src/economy.js';
import { BOW, JERRYS_BOW, drawnBy, shotAt, solidAt, survives, recoveredOf, flightOf, inTheLine, groundAt } from '../src/archery.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

/** A fight with a bow in the traveler's hands and a quiver behind him. */
function archer({ arrows = 20, trees = [], level = 1, enemies = [{ id: 'goblin', x: 0, z: 12, hp: 200 }],
  allies = [], bodies = [], heightAt = () => 1.5, bout = false } = {}) {
  const world = {
    bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 }, colliders: [], heightAt,
    // The same shape `roomToSwing` reads: a circle with an `r`, or a box with `hx`/`hz`.
    nearColliders: (x, z, radius) => trees.filter(t => Math.hypot(t.x - x, t.z - z) <= radius + (t.r ?? 0)),
  };
  const position = { x: 0, y: heightAt(0, 0), z: 0 };
  const events = [];
  const skills = createSkills();
  const arms = createCombatSkills({ skills });
  arms.learn('bows');
  const quiver = { count: arrows };
  const type = WEAPON_TYPES[BOW.id];
  const weapon = { id: BOW.id, name: type.name, usable: true, owned: true,
    damage: [...type.damage], reachMultiplier: type.reachMultiplier, ...feelOf(BOW.id) };
  const combat = createCombat({ world, position, onEvent: event => events.push(event),
    getWeapon: () => weapon, getArrows: () => quiver.count, getBodies: () => bodies,
    getMargins: () => ({ ...marginsFor({ bows: level }), swingCost: 6 }) });
  combat.startEncounter({ id: 'archery', level: 0, center: { x: 0, z: 8 }, checkpoint: { x: 0, z: 0 },
    retreatAxis: 'z', retreatLine: 30, enemies, allies, ...(bout ? { bout: true } : {}) });
  return { combat, position, events, quiver, weapon, world, skills, arms, bodies,
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
  assert.match(main, /if\(mode!=='playing'\)\{combat\.guard\(false,player\.group\.rotation\.y\);combat\.lowerBow\(\);\}/,
    'and nothing is held while nothing is played — the bow comes down rather than going off');
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

/**
 * **Three bow repairs** (the user's answers, 2026-09-21, and the coordinator's rulings beside
 * them). All three come out of the hunter's round 5: the pause menu fired the bow, a blow that
 * ate a draw said nothing at all, and an arrow had no height so no ground could stop one.
 */
test('anything that stops the game lowers the bow and keeps the arrow', () => {
  const held = archer({ arrows: 5 });
  // Full draw, the button still down, and then the game stops: a pause, a lost focus, a dialogue.
  for (let t = 0; t < 1.3; t += 1 / 60) { held.combat.draw(true, 0); held.combat.update(1 / 60); }
  assert.equal(held.combat.drawn, 1, 'he is at full draw');
  assert.equal(held.combat.lowerBow(), true, 'and the bow comes down');
  assert.equal(held.of('loose').length, 0, 'nothing was loosed');
  assert.equal(held.combat.state.arrows.length, 0, 'and nothing is in the air');
  assert.equal(held.combat.drawn, 0);
  assert.equal(held.combat.state.player.drawing, false);
  assert.equal(held.quiver.count, 5, 'the arrow is still his');
  // The button is not latched either: coming back to the game does not fire the shot he never took.
  held.combat.update(1 / 60);
  assert.equal(held.of('loose').length, 0, 'and a frame later it is still not loosed');
  assert.equal(held.of('draw-spent').length, 0, 'and nothing was wasted, so nothing is reported');
  // He can draw again from nothing, which is what "keeps the arrow" is worth.
  const again = shoot(held, 1.3);
  assert.ok(again && Math.abs(again.pull - 1) < 1e-9, 'and the next draw is a whole draw');
  // The thing it is not: letting go while the game is being played is still the shot.
  const loosed = archer();
  assert.ok(shoot(loosed, 1.3), 'a release in play sends the arrow');
  // And lowering a bow nobody was drawing is not an event of any kind.
  assert.equal(archer().combat.lowerBow(), false);
});

test('a blow that eats the draw says so, and a twitch says something else', () => {
  // A goblin at the traveler's elbow, so the blow lands while the string is back.
  const struck = archer({ enemies: [{ id: 'goblin', x: 0, z: 1.6, hp: 200 }] });
  let after = 0;
  for (let t = 0; t < 8 && after < 6; t += 1 / 60) {
    struck.combat.draw(true, 0); struck.combat.update(1 / 60);
    if (struck.of('player-hit').length) after++;
  }
  assert.ok(struck.of('player-hit').length, 'he was hit, or this measures nothing');
  const spent = struck.of('draw-spent');
  assert.equal(spent.length, 1, 'and the lost draw is reported exactly once');
  assert.equal(spent[0].why, 'struck');
  assert.ok(spent[0].pull > 0, `and says how much of a draw went with it (${spent[0].pull.toFixed(2)})`);
  assert.equal(struck.of('loose').length, 0, 'no arrow left');
  // The other half of the same event: a draw too short to be a shot, which says something else.
  const twitch = archer();
  assert.equal(shoot(twitch, .1), null);
  assert.equal(twitch.of('draw-spent')[0].why, 'short');
  // And the host has a short line for each, the way it has one for everything else a fight says.
  assert.match(source('main.js'), /if\(e\.type==='draw-spent'\)toast\(e\.why==='struck'\?/);
});

test('an arrow flies at a height, and ground that rises above it stops it', () => {
  // A bank four metres out, standing two metres above the archer's feet: chest height is 1.25.
  const bank = archer({ heightAt: (x, z) => (z > 4 ? 3.5 : 1.5) });
  shoot(bank, 1.3);
  settle(bank);
  const stopped = bank.of('arrow-landed')[0];
  assert.equal(stopped.stopped, 'ground', 'the rise took it');
  assert.ok(stopped.z >= 4 && stopped.z < 5, `it stopped at the foot of the rise, at ${stopped.z.toFixed(1)} m`);
  assert.equal(bank.of('hit').length, 0, 'and the goblin over the rise is untouched');
  assert.equal(stopped.recovered, true, 'a shaft in the ground is a shaft you can pull out');
  // Ground below the flight is no ground at all: a shot downhill carries.
  const fall = archer({ heightAt: (x, z) => (z > 4 ? -8 : 1.5) });
  shoot(fall, 1.3);
  settle(fall);
  assert.equal(fall.of('arrow-landed')[0].stopped, 'target', 'downhill it reaches him');
  // Flat ground at exactly the height it left is not above it either.
  const flat = archer();
  shoot(flat, 1.3);
  settle(flat);
  assert.equal(flat.of('arrow-landed')[0].stopped, 'target');
  // The same question asked without a fight, which is what the host's mark sweep asks.
  const hill = { heightAt: (x, z) => (z > 6 ? 9 : 0), nearColliders: () => [] };
  assert.equal(flightOf({ yaw: 0, range: 20, world: hill }).stopped, 'ground');
  assert.ok(flightOf({ yaw: 0, range: 20, world: hill }).travelled <= 6.5);
  assert.equal(flightOf({ yaw: 0, range: 20, world: { heightAt: () => 0, nearColliders: () => [] } }).stopped, 'spent');
  assert.equal(groundAt(null, 0, 0), 0, 'a world with no floor is flat at nothing');
  assert.equal(groundAt({ heightAt: () => 4 }, 0, 0), 4);
});

/**
 * **Arrows hurt whoever they hit** (the user, 2026-09-21): real friendly fire, the traveler's
 * arrows and Jerry's alike. Until today `updateArrows` looked for a hit in `state.enemies` and in
 * nothing else, so a shaft went through every friendly body on the field and carried on - the
 * hunter drove it both ways and nine of Jerry's nine arrows passed through the traveler's back
 * (docs/known-issues.md, round 5).
 */
test('the first body in an arrow’s path stops it, whoever it belongs to', () => {
  const line = { id: 'merc-ciaran', name: 'Ciarán', kind: 'legionary', x: 0, z: 6, level: 35, toughness: 30 };
  const mid = archer({ allies: [line], enemies: [{ id: 'goblin', x: 0, z: 18, hp: 400, entry: 40 }] });
  const friend = mid.combat.state.allies[0];
  const whole = friend.hp;
  shoot(mid, 1.3);
  settle(mid);
  const landed = mid.of('arrow-landed')[0];
  assert.equal(landed.stopped, 'friend', 'it stopped on the man in front of him');
  assert.equal(landed.targetId, 'merc-ciaran');
  // He is a soldier and he is walking at the goblin while the arrow is in the air, so the range
  // is his own and not the spot he started from: what is pinned is that it stopped on him.
  assert.ok(landed.flown > 5 && landed.flown < 12, `on the man in front, at ${landed.flown.toFixed(1)} m`);
  assert.equal(mid.of('hit').length, 0, 'the goblin twelve metres further on is untouched');
  const hurt = mid.of('ally-hit');
  assert.equal(hurt.length, 1, 'and he is hurt by it');
  assert.equal(hurt[0].arrow, true);
  assert.equal(hurt[0].by, 'traveler', 'and it is written down whose arrow it was');
  assert.ok(friend.hp < whole, `${whole} down to ${friend.hp}`);

  // A man at the archer's own elbow is not in his way: a companion keeps nine tenths of a metre
  // off the traveler and no further, and without the grace every shot would end in his back.
  const beside = archer({ allies: [{ ...line, x: 0, z: .8 }] });
  beside.combat.state.arrows.push({ id: 'arrow-1', n: 1, x: 0, z: 0, y: 1.5 + BOW.height,
    yaw: 0, flown: 0, range: 20, damage: 40 });
  // Three frames: the shaft is 2.3 m out and has gone straight through where he was standing.
  // The grace is measured from where the shot was loosed, not from how far it has gone.
  for (let i = 0; i < 3; i++) beside.combat.update(1 / 60);
  assert.equal(beside.of('ally-hit').length, 0, 'the man at his shoulder is not shot');
  assert.ok(beside.combat.state.arrows[0]?.flown > BOW.clearOfShooter, 'and the shaft is past him and still flying');
});

test('an ally’s arrow can find the traveler, and a bystander only stops one', () => {
  // The hunter's own fixture, turned round: Jerry at the back, the traveler in front of him.
  const world = { bounds: { minX: -99, maxX: 99, minZ: -99, maxZ: 99 }, colliders: [], heightAt: () => 1.5, nearColliders: () => [] };
  const position = { x: 0, y: 1.5, z: 8 };
  const events = [];
  const combat = createCombat({ world, position, onEvent: e => events.push(e),
    getWeapon: () => ({ id: 'simple-sword', usable: true, damage: [24, 26, 34], reachMultiplier: 1 }) });
  assert.equal(combat.startEncounter({ id: 'behind', center: { x: 0, z: 12 }, checkpoint: { x: 0, z: 8 },
    retreatAxis: 'z', retreatLine: 40,
    enemies: [{ id: 'goblin', x: 0, z: 18, hp: 4000, entry: 60 }],
    allies: [{ id: 'merc-jerry', name: 'Jerry', kind: 'archer', x: 0, z: 0, level: 40, toughness: 34 }] }), true);
  const jerry = combat.state.allies[0];
  // He will not loose down a lane with the traveler in it, so he is made to: the arrow is put in
  // the air by hand, on his own line, which measures the flight and not the decision.
  combat.state.arrows.push({ id: 'ally-arrow-test', n: 0, owner: 'merc-jerry', x: jerry.x, z: jerry.z,
    y: 1.5 + BOW.height, yaw: 0, flown: 0, range: 34, damage: 40 });
  for (let i = 0; i < 300 && combat.state.arrows.length; i++) combat.update(1 / 60);
  const struck = events.filter(e => e.type === 'player-hit');
  assert.equal(struck.length, 1, 'it finds him');
  assert.equal(struck[0].arrow, true);
  assert.equal(struck[0].by, 'merc-jerry');
  assert.ok(combat.state.player.hp < combat.state.player.maxHp, `he is at ${combat.state.player.hp}`);
  const landed = events.find(e => e.type === 'arrow-landed');
  assert.equal(landed.stopped, 'friend');
  assert.equal(landed.targetId, 'traveler');

  // **A body that is only in the way is only in the way.** A villager running for a door carries
  // nothing and is in no sense fighting: she stops a shaft and is unhurt (the user, 2026-09-21).
  const running = archer({ allies: [{ id: 'villager-1', name: 'A villager', kind: 'bystander',
    x: 0, z: 6, refuge: { x: 8, z: 6 } }], enemies: [{ id: 'goblin', x: 0, z: 18, hp: 400, entry: 40 }] });
  const her = running.combat.state.allies[0], whole = her.hp;
  shoot(running, 1.3);
  settle(running);
  assert.equal(running.of('arrow-landed')[0].stopped, 'body', 'she stopped it');
  assert.equal(running.of('arrow-landed')[0].targetId, 'villager-1');
  assert.equal(running.of('ally-hit').length, 0, 'and took no harm from it');
  assert.equal(her.hp, whole);
  assert.equal(running.of('hit').length, 0, 'nor did the goblin behind her');
});

test('the world’s own bodies stop an arrow and are unhurt', () => {
  // A horse on a picket, a villager on a street: not in the fight, and the fight is never told
  // about them except to answer this one question (`getBodies`, src/main.js).
  const yard = archer({ bodies: [{ id: 'line-horse-2', x: 0, z: 7, r: .8 }],
    enemies: [{ id: 'goblin', x: 0, z: 18, hp: 400, entry: 40 }] });
  shoot(yard, 1.3);
  settle(yard);
  const landed = yard.of('arrow-landed')[0];
  assert.equal(landed.stopped, 'body');
  assert.equal(landed.targetId, 'line-horse-2');
  assert.equal(yard.of('hit').length + yard.of('ally-hit').length, 0, 'and nothing at all is hurt');
  assert.equal(landed.recovered, true, 'the shaft is still a shaft');
  // The fight is told about them nowhere else: a body is not a collider, so nothing about a
  // swing, a step or where an enemy may stand has moved (tests/every-fight.test.js holds the rest).
  assert.match(source('main.js'), /getBodies:\(\)=>gatherBodies\(\)/, 'and the host hands in the frame’s own list');
});

/**
 * **An ally archer does not loose while a friend stands in the corridor of his shot** (the user,
 * 2026-09-21). The hunter's fixture exactly: Jerry at the back, the traveler between him and the
 * enemy. Nine of nine went through the traveler before; none goes through him now.
 */
test('Jerry waits or shifts rather than shooting a friend', () => {
  const world = { bounds: { minX: -99, maxX: 99, minZ: -99, maxZ: 99 }, colliders: [], heightAt: () => 1.5, nearColliders: () => [] };
  const position = { x: 0, y: 1.5, z: 8 };
  const events = [];
  const combat = createCombat({ world, position, onEvent: e => events.push(e),
    getWeapon: () => ({ id: 'simple-sword', usable: true, damage: [24, 26, 34], reachMultiplier: 1 }) });
  assert.equal(combat.startEncounter({ id: 'lane', center: { x: 0, z: 12 }, checkpoint: { x: 0, z: 8 },
    retreatAxis: 'z', retreatLine: 40,
    // Held back for the whole run, so what is measured is Jerry's judgement and not a scrum.
    enemies: [{ id: 'goblin', x: 0, z: 18, hp: 9000, entry: 60 }],
    allies: [{ id: 'merc-jerry', name: 'Jerry', kind: 'archer', x: 0, z: 0, level: 40, toughness: 34 },
      { id: 'merc-matt', name: 'Matt', kind: 'legionary', x: 0, z: 14, level: 35, toughness: 32 }] }), true);
  const jerry = combat.state.allies[0], matt = combat.state.allies[1];
  const counted = new Set();
  let shafts = 0, crossed = 0;
  for (let i = 0; i < 60 * 30; i++) {
    combat.update(1 / 60);
    for (const arrow of combat.state.arrows) {
      if (arrow.owner !== 'merc-jerry' || counted.has(arrow.id)) continue;
      counted.add(arrow.id); shafts++;
      // Was anybody of ours in the corridor of it at the moment it left? Measured between him
      // and the man he was shooting at, which is the lane he actually chose.
      const from = { x: arrow.x - Math.sin(arrow.yaw) * arrow.flown, z: arrow.z - Math.cos(arrow.yaw) * arrow.flown };
      const foe = combat.state.enemies.filter(one => one.active)
        .sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z))[0];
      if (foe && inTheLine(from, foe, [{ x: position.x, z: position.z }, { x: matt.x, z: matt.z }], { far: BOW.body })) crossed++;
    }
  }
  assert.equal(events.filter(e => e.type === 'player-hit').length, 0, 'the traveler is never shot in the back');
  assert.equal(events.filter(e => e.type === 'ally-hit' && e.arrow).length, 0, 'and neither is the man in front');
  assert.equal(crossed, 0, `no shaft was loosed down an occupied lane (${shafts} loosed)`);
  // And he is not simply frozen: he moves off the line rather than standing in it for ever.
  assert.ok(Math.abs(jerry.x) > .5 || shafts > 0, `he shifted to ${jerry.x.toFixed(1)}, ${jerry.z.toFixed(1)} or found a lane`);
  // The corridor arithmetic itself, which the host's mark sweep uses too.
  assert.ok(inTheLine({ x: 0, z: 0 }, { x: 0, z: 10 }, [{ x: .5, z: 5 }]), 'a man half a metre off the line is in it');
  assert.equal(inTheLine({ x: 0, z: 0 }, { x: 0, z: 10 }, [{ x: 4, z: 5 }]), null, 'four metres off is not');
  assert.equal(inTheLine({ x: 0, z: 0 }, { x: 0, z: 10 }, [{ x: 0, z: -3 }]), null, 'and behind him is not');
  assert.equal(inTheLine({ x: 0, z: 0 }, { x: 0, z: 10 }, [{ x: 0, z: .4 }]), null, 'nor is his own body space');
});

/**
 * **Nothing at a lesson goes below one.** A bout already floored at one on both sides; the mark
 * runs in the practice phase and now floors there too, so that an arrow and a sword cannot
 * disagree about who may be killed in a lesson (the user, 2026-09-21).
 */
test('an arrow cannot take anybody below one in a bout or at a mark', () => {
  const mate = { id: 'merc-altun', name: 'Al the Tun', kind: 'legionary', x: 0, z: 6, level: 20, toughness: 17 };
  // One shaft, worth far more than the man has: he is a soldier and walks at the enemy while an
  // arrow is in the air, so the arrow is put two metres short of him by hand and the measurement
  // is of the floor rather than of his feet.
  const run = bout => {
    const fight = archer({ bout, allies: [mate],
      enemies: [{ id: 'sparring-partner', kind: 'sparring', x: 0, z: 14, hp: 60, entry: 60 }] });
    const friend = fight.combat.state.allies[0];
    friend.hp = 40;
    fight.combat.state.arrows.push({ id: 'arrow-1', n: 1, x: friend.x, z: friend.z - 2,
      y: 1.5 + BOW.height, yaw: 0, flown: 2, range: 20, damage: 500 });
    for (let i = 0; i < 120 && fight.combat.state.arrows.length; i++) fight.combat.update(1 / 60);
    return { fight, friend };
  };
  const lesson = run(true);
  assert.equal(lesson.fight.of('ally-hit').length, 1, 'he is hit');
  assert.equal(lesson.friend.hp, 1, 'and he stops at one');
  assert.equal(lesson.friend.active, true, 'still on his feet');
  assert.equal(lesson.fight.of('ally-down').length, 0, 'and nobody is dead');
  // The control, which is what makes the floor mean anything: the same shaft in a real fight.
  const real = run(false);
  assert.equal(real.friend.hp, 0, 'in a fight that is not a lesson the same arrow kills him');
  assert.equal(real.fight.of('ally-down').length, 1);
  assert.equal(real.fight.of('ally-down')[0].by, 'traveler', 'and it was the traveler’s');
  // And at the mark, which is the practice phase: the straw takes nothing and neither does anybody.
  const mark = archer({ arrows: 9 });
  mark.combat.startPractice({ x: 0, z: 10 });
  for (let t = 0; t < 1.3; t += 1 / 60) { mark.combat.draw(true, 0); mark.combat.update(1 / 60); }
  mark.combat.draw(false, 0);
  settle(mark);
  const straw = mark.combat.state.enemies[0];
  assert.equal(straw.hp, straw.maxHp, 'the straw is not hurt by being shot at');
  assert.ok(mark.of('practice-hit').length, 'but it counts as a hit on it');
  // And the host will not set a mark across anybody at all: the line is asked the arrow's own
  // three questions - solid things, rising ground, and people - before the stake goes in.
  assert.match(source('main.js'), /const lineIsClear=\(from,at,ignore=\[\]\)=>flightOf\(/);
  assert.match(source('main.js'), /&&lineIsClear\(me,spot\)\)\{at=spot;break;\}/, 'startMark asks it');
});

/**
 * **Enemies come after an archer** (the user, 2026-09-21). The hunter drove the hole: an enemy
 * after the traveler steered at a point clamped into the middle of its ground - 8 m across the
 * arena by 16 m along it - while the traveler was bounded only by the retreat line and the 45 m
 * leash, and the bow carries 34. Standing 12 m across the border battle's arena he won it alone,
 * **untouched, with 304 arrows over 7.4 minutes**, the nearest living soldier stuck 3.8 m away
 * and unable to close (docs/known-issues.md, round 5).
 *
 * A bow buys a few free shots, not a free battle.
 */
test('a man shooting from where they cannot reach is come after, and the standoff is gone', () => {
  const flat = () => ({ bounds: { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 }, colliders: [], heightAt: () => 1.5, nearColliders: () => [] });
  /** The hunter's own fixture: he stands still, never fights back, and looses at the nearest man. */
  const standoff = across => {
    const fight = borderEncounter('empire', []);
    const position = { x: 0, y: 1.5, z: 0 };
    const events = [];
    const type = WEAPON_TYPES[BOW.id];
    const weapon = { id: BOW.id, name: type.name, usable: true, owned: true,
      damage: [...type.damage], reachMultiplier: type.reachMultiplier, ...feelOf(BOW.id) };
    const combat = createCombat({ world: flat(), position, onEvent: e => events.push(e),
      getWeapon: () => weapon, getArrows: () => 9999, getLevel: () => 2,
      getMargins: () => ({ ...marginsFor({ bows: 1, toughness: 1 }), swingCost: 6 }) });
    assert.equal(combat.startEncounter(fight, { atCheckpoint: true }), true, 'the border battle starts');
    const axis = fight.retreatAxis === 'x' ? 'x' : 'z', other = axis === 'x' ? 'z' : 'x';
    position[axis] = fight.center[axis];
    position[other] = fight.center[other] + across;
    let loosed = 0, seconds = 0;
    // Eight minutes of game time, which is longer than the seven the hunter's run lasted.
    for (let frame = 0; frame < 60 * 480 && combat.state.phase === 'active'; frame++) {
      seconds += 1 / 60;
      const foe = combat.state.enemies.filter(one => one.active && one.action !== 'dead')
        .sort((a, b) => Math.hypot(a.x - position.x, a.z - position.z) - Math.hypot(b.x - position.x, b.z - position.z))[0];
      const yaw = foe ? Math.atan2(foe.x - position.x, foe.z - position.z) : 0;
      if (combat.drawn >= 1) { combat.draw(false, yaw); loosed++; } else combat.draw(true, yaw);
      combat.update(1 / 60);
    }
    const nearest = combat.state.enemies.filter(one => one.active)
      .reduce((best, one) => Math.min(best, Math.hypot(one.x - position.x, one.z - position.z)), Infinity);
    return { across, loosed, seconds, nearest, phase: combat.state.phase,
      struck: events.filter(e => e.type === 'player-hit').length,
      retreated: events.some(e => e.type === 'retreat'), won: events.some(e => e.type === 'victory') };
  };
  for (const across of [12, 18, 30]) {
    const row = standoff(across);
    assert.ok(row.struck > 0 || row.retreated,
      `${across} m across: he is reached or he is retreating (struck ${row.struck}, ${row.loosed} arrows, ${row.seconds.toFixed(0)} s)`);
    assert.equal(row.won, false, `${across} m across: the battle is not won from out there`);
    assert.ok(row.loosed < 60, `${across} m across: ${row.loosed} arrows, against the hunter's 304`);
    assert.ok(row.seconds < 60, `${across} m across: ${row.seconds.toFixed(0)} s, against the hunter's 444`);
    assert.ok(!(row.phase === 'active') || row.nearest < 3,
      `${across} m across: nothing is left standing off at ${row.nearest.toFixed(1)} m unable to close`);
  }
  // **And there is one outer limit, not two.** The leash the chase stops at is the leash a
  // traveler retreats over, spelled once so nobody can tune them apart.
  const combatSource = source('combat.js');
  assert.match(combatSource, /^const LEASH = 45;$/m, 'the fight’s outer limit has a name');
  assert.equal(combatSource.match(/distance\([^)]*lastEncounter\.center\) > \d/g), null,
    'and nobody writes a radius of their own beside it');
  assert.equal(combatSource.match(/lastEncounter\.center\) > LEASH/g).length, 2,
    'the two readers of it: the traveler’s retreat, and the chase that stops where it begins');
  assert.match(combatSource, /const outsideTheFight = p => beyondTheLine\(p\) \|\| distance\(p, lastEncounter\.center\) > LEASH;/);
  assert.match(combatSource, /\(loose && !outsideTheFight\(\{ x, z \}\)\)/, 'the chase stops where a retreat begins');
  // The trigger is reach, not a box: a man they can still be met on the edge of their own ground
  // for is chased exactly as he was, which is what leaves every melee where it was.
  assert.match(combatSource, /const target = distance\(clamped, aim\) <= profile\.engage \? clamped : \{ x: aim\.x, z: aim\.z \};/);
});
