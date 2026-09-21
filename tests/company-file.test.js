import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';
import { RIDE } from '../src/riding.js';
import { LUMBER_TOWN_STABLE } from '../src/region-world.js';
import { COMPANION_REACH } from '../src/long-road.js';
import { createMercenaryCompany, MERCENARY_ROSTER } from '../src/mercenaries.js';
import { RIDE_FILE, FILE_RETREAT, fileSpotFor, companyHorses, picketSpots } from '../src/company-horses.js';
import { dismountSpot } from '../src/riding.js';
import { COMPANION_IDS } from '../src/companions.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());

/** The host's own loop: one man at a time, each seeing the ground the men in front have taken. */
function layOut(at, yaw, count, { mounted = true } = {}) {
  const reach = mounted ? RIDE_FILE : COMPANION_REACH;
  const radius = mounted ? RIDE.radius : undefined;
  const room = (mounted ? RIDE.radius : BODY.person) * 2;
  const taken = [];
  const spots = [];
  for (let place = 0; place < count; place++) {
    const spot = fileSpotFor({ at, yaw, place, reach, room, taken,
      canStand: (x, z) => canStand(x, z, world, radius) });
    if (spot) taken.push(spot);
    spots.push(spot);
  }
  return spots;
}

test('the mounted file at Bede Harrow’s yard never puts two riders on one stone', () => {
  // The yard is where the first render collapsed Jerry and Kristen onto the same point. The
  // arithmetic is the host's, asked of the real ground.
  const hitch = LUMBER_TOWN_STABLE.hitch;
  for (const count of [3, 10]) {
    const spots = layOut(hitch, hitch.yaw, count);
    const placed = spots.filter(Boolean);
    assert.equal(placed.length, count, `all ${count} riders were given ground at the yard`);
    for (let a = 0; a < placed.length; a++) {
      assert.ok(canStand(placed[a].x, placed[a].z, world, RIDE.radius), `rider ${a} stands as a rider`);
      for (let b = a + 1; b < placed.length; b++) {
        const apart = Math.hypot(placed[a].x - placed[b].x, placed[a].z - placed[b].z);
        assert.ok(apart >= RIDE.radius * 2 - 0.01,
          `riders ${a} and ${b} are ${apart.toFixed(2)} m apart, not on one stone`);
      }
    }
  }
  // And on foot, which is what the yard held before any of this.
  const onFoot = layOut(hitch, hitch.yaw, 10, { mounted: false }).filter(Boolean);
  assert.equal(onFoot.length, 10);
  for (let a = 0; a < onFoot.length; a++) for (let b = a + 1; b < onFoot.length; b++)
    assert.ok(Math.hypot(onFoot[a].x - onFoot[b].x, onFoot[a].z - onFoot[b].z) >= BODY.person * 2 - 0.01);
});

test('a file that cannot spread goes single and long, and never doubles up', () => {
  // Ground that holds a line and nothing either side of it: every man must end up on the
  // centreline, strung out, and no two of them in the same place.
  const at = { x: 0, z: 0 }, lane = 1.0;
  const canStand = (x, z) => Math.abs(x) <= lane;
  const spots = [];
  const taken = [];
  for (let place = 0; place < 10; place++) {
    const spot = fileSpotFor({ at, yaw: 0, place, reach: RIDE_FILE, room: RIDE.radius * 2, taken, canStand });
    assert.ok(spot, `man ${place} was given ground`);
    taken.push(spot); spots.push(spot);
  }
  for (const spot of spots) assert.ok(Math.abs(spot.x) <= lane, 'single file, on the centreline');
  for (let a = 0; a < spots.length; a++) for (let b = a + 1; b < spots.length; b++)
    assert.ok(Math.hypot(spots[a].x - spots[b].x, spots[a].z - spots[b].z) >= RIDE.radius * 2 - 0.01);
  // When there is truly nowhere, it says so rather than inventing a shared spot.
  assert.equal(fileSpotFor({ at, yaw: 0, place: 0, reach: RIDE_FILE, room: 0, canStand: () => false }), null);
  assert.equal(fileSpotFor({ at: null, reach: RIDE_FILE }), null);
  // It trails a bounded distance and then gives up, rather than walking off the map.
  assert.equal(FILE_RETREAT, 6);
  const far = fileSpotFor({ at, yaw: 0, place: 0, reach: RIDE_FILE, room: 0,
    canStand: (x, z) => Math.hypot(x, z) > RIDE_FILE.shoulder + 5 * RIDE_FILE.stride });
  assert.ok(far && Math.hypot(far.x, far.z) <= RIDE_FILE.shoulder + (FILE_RETREAT + 1) * RIDE_FILE.stride);
});

test('Chris rides: the long road’s own man is in the file, and the file is what the rule reads', () => {
  // **Chris is not in `companions.walking`.** The landing mate is filtered out of the companions
  // list and carried separately, on the long road's own terms, because he is the one who can be
  // released and taken back. A rule that read the companions list would have a hole exactly
  // where the user is standing — so the rule reads the file the company actually placed.
  const plan = { road: [{ x: 0, z: 0 }, { x: -100, z: 0 }, { x: -100, z: 100 }, { x: -400, z: 100 }],
    stops: [], muster: { x: -400, z: 90 }, landing: { x: 3, z: 3 } };
  const mate = MERCENARY_ROSTER[0].id;
  assert.equal(mate, 'merc-gotwood', 'the man off the boat is Chris');
  // A traveler who came down the long road with him: he is carried as the mate, not as an ask.
  const company = createMercenaryCompany({ ...plan, companions: [{ id: mate, with: true }] });
  assert.deepEqual(company.companionIds, [mate], 'and the company places him');
  assert.equal(company.placements(4000).find(one => one.id === mate).phase, 'with-traveler',
    'at four thousand seconds he is still at the traveler’s shoulder, not away down his own clock');
  // So when the traveler owns a horse and gets on it, Chris is up with a horse under him.
  const rule = companyHorses({ owned: true, mounted: true, walking: company.companionIds });
  assert.equal(rule.mounted, true);
  assert.deepEqual(rule.ids, [mate], 'Chris has a horse, and he is on it');
  // He and the asked companions are one file, in roster order, with the mate at the front.
  const three = createMercenaryCompany({ ...plan,
    companions: [{ id: mate, with: true }, { id: 'merc-jerry', with: true }, { id: 'merc-christin', with: true }] });
  assert.deepEqual(three.companionIds, [mate, 'merc-jerry', 'merc-christin']);
  // The host reads the placed file for the horses, and not the companions list. This is the line
  // that closes the hole; if it ever reads `companions.companions` instead, Chris loses his horse.
  const main = source('main.js');
  assert.match(main, /walking:fileOrder\.filter\(id=>npcById\.get\(id\)\?\.walkingWith\)/,
    'the rule reads the file that was placed');
  assert.match(main, /fileOrder=company\.companionIds/, 'and the file is the company’s, mate included');
  // And the company is remade off the plan, which carries the mate, rather than off the
  // companions list, which never does.
  assert.match(main, /const companySignature=\(\)=>JSON\.stringify\(\[companionPlan\(\)\?\?null,companyDead\(\)\]\);/,
    'the signature is the plan and the dead');
  assert.match(main, /companyBuiltWith=companySignature\(\);/, 'and rebuilding records what it built with');
  assert.match(main, /if\(companySignature\(\)!==companyBuiltWith\)rebuildCompany\(\);/, 'and placeMercenaries asks every frame');
});

/**
 * **A man on foot must not be given a place inside a horse.**
 *
 * The file's footing test is the static world; a picketed horse and the traveler's own bay are
 * *bodies*, not colliders, so neither layout could see the other - and they are laid from two
 * different origins, the file from the traveler and the picket from his horse. Measured at Bede
 * Harrow's yard over all forty-eight facings, the blind file put men inside horses: one of three,
 * four of ten. The ruling is that men yield to horses, because a picketed horse's place is a
 * function of the traveler's own horse, which the save carries, while a man's is recomputed every
 * frame.
 */
const CLOSE = BODY.person + BODY.horse;

/** `companyHorseGround()` in src/main.js, on foot: the traveler's own bay and the picket line. */
function horsesOnTheGround(horse, count) {
  const picket = picketSpots(horse, COMPANION_IDS.slice(0, count), (x, z) => canStand(x, z, world, RIDE.radius));
  return [{ x: horse.x, z: horse.z, room: CLOSE },
    ...picket.filter(Boolean).map(spot => ({ x: spot.x, z: spot.z, room: CLOSE }))];
}

/** The host's loop for a file on foot, seeded with whatever ground is already taken. */
function fileOnFoot(at, yaw, count, taken) {
  const ground = [...taken], spots = [];
  for (let place = 0; place < count; place++) {
    const spot = fileSpotFor({ at, yaw, place, reach: COMPANION_REACH, room: BODY.person * 2, taken: ground,
      canStand: (x, z) => canStand(x, z, world) });
    if (spot) ground.push(spot);
    spots.push(spot);
  }
  return spots;
}

test('a man on foot is never given a place inside a horse', () => {
  for (const [name, horse] of [['the stable yard', LUMBER_TOWN_STABLE.hitch],
    ['Lumber Town square', { x: -728.57, z: 384.36, yaw: 1.1 }]]) {
    for (const count of [3, 10]) {
      const horses = horsesOnTheGround(horse, count);
      assert.ok(horses.length > count / 2, `${name}: there are horses standing about to avoid`);
      // He steps down beside his horse, the way `stepDown` does it, and then faces anywhere.
      const stand = dismountSpot(horse, horse.yaw, (x, z) => canStand(x, z, world)) ?? { x: horse.x, z: horse.z };
      let blind = 0;
      for (let step = 0; step < 48; step++) {
        const yaw = step / 48 * Math.PI * 2;
        for (const man of fileOnFoot(stand, yaw, count, horses).filter(Boolean)) {
          const near = Math.min(...horses.map(one => Math.hypot(one.x - man.x, one.z - man.z)));
          assert.ok(near >= CLOSE,
            `${name}, ${count} men, facing ${(yaw * 180 / Math.PI).toFixed(0)}\u00b0: a man stands ${near.toFixed(2)} m from a horse's centre`);
        }
        // The control: the same file with the horses hidden from it, which is what it was.
        for (const man of fileOnFoot(stand, yaw, count, []).filter(Boolean))
          if (horses.some(one => Math.hypot(one.x - man.x, one.z - man.z) < CLOSE)) blind++;
      }
      if (name === 'the stable yard') assert.ok(blind > 0, `${count} men: this is the ground the fault was measured on`);
    }
  }
});

test('yielding to the horses costs the file nothing', () => {
  // A file that avoids eleven more bodies could have gone further back or lost a man. It does
  // neither: at the yard, on the road and in the square the span and the count are unchanged.
  const road = world.paths[0];
  for (const [name, horse] of [['the stable yard', LUMBER_TOWN_STABLE.hitch],
    ['the open road', { x: road[6].x, z: road[6].z, yaw: 0 }],
    ['Lumber Town square', { x: -728.57, z: 384.36, yaw: 1.1 }]]) {
    const horses = horsesOnTheGround(horse, 10);
    const stand = dismountSpot(horse, horse.yaw, (x, z) => canStand(x, z, world)) ?? { x: horse.x, z: horse.z };
    let blindSpan = 0, yieldSpan = 0, blindOut = 0, yieldOut = 0;
    for (let step = 0; step < 48; step++) {
      const yaw = step / 48 * Math.PI * 2;
      const span = file => { const on = file.filter(Boolean); return on.length ? Math.max(...on.map(s => Math.hypot(s.x - stand.x, s.z - stand.z))) : 0; };
      const blind = fileOnFoot(stand, yaw, 10, []), yielded = fileOnFoot(stand, yaw, 10, horses);
      blindSpan = Math.max(blindSpan, span(blind)); yieldSpan = Math.max(yieldSpan, span(yielded));
      blindOut += 10 - blind.filter(Boolean).length; yieldOut += 10 - yielded.filter(Boolean).length;
    }
    assert.equal(yieldOut, blindOut, `${name}: nobody is left without ground who had it before`);
    assert.ok(yieldSpan <= blindSpan + 0.01, `${name}: the file trails ${yieldSpan.toFixed(1)} m against ${blindSpan.toFixed(1)} m`);
  }
});

test('the host lays the horses first, and every path that lays a file gets them', () => {
  const main = source('main.js');
  // One function, computed by both halves of the frame rather than stashed by one for the other,
  // so no snapping path - settleMercenaries, a load, a story start, a review view - can run one
  // without the other.
  assert.match(main, /function companyHorseGround\(\)\{/, 'the horses are laid in one place');
  assert.match(main, /const room=BODY\.horse\+BODY\.person,bodies=\[\];/, 'and a man is not inside a horse when their bodies do not overlap');
  assert.match(main, /fileTaken=companyHorseGround\(\)\.bodies;/, 'the file starts on the ground they have taken');
  assert.match(main, /const \{rule,picket\}=companyHorseGround\(\);/, 'and the drawing reads the same answer');
  // A ridden horse is not an obstacle: its man already is, at a rider's own footprint.
  assert.match(main, /if\(!spot\|\|\(npc\?\.mounted&&npc\.actor\.group\.visible\)\)continue;/);
  assert.match(main, /if\(riding\.owned&&riding\.horse&&!riding\.mounted\)bodies\.push/, 'and his own bay only while he is off it');
  // The fallback ring answers to the same taken ground, horses and their own room included.
  assert.match(main, /fileTaken\.every\(other=>Math\.hypot\(other\.x-sx,other\.z-sz\)>=\(Number\.isFinite\(other\.room\)\?other\.room:room\)\)/);
  // **And the traveler is in that ground.** `fileSpotFor` measures back from him and can never be
  // given his spot, but the escort ring it falls back on is a list of close-in offsets and had
  // nothing to stop it putting a man on top of him: on the road by Lumber Town it put Ciarán
  // 1.9 m from the traveler's horse, where two riders want RIDE_FILE.room.
  assert.match(main, /fileTaken\.push\(\{x:player\.group\.position\.x,z:player\.group\.position\.z,\s*room:riding\.mounted\?RIDE_FILE\.room:BODY\.person\*2\}\);/,
    'the man at the front is a body like the rest');
});
