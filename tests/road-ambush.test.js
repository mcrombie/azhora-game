import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sourceModule } from './module-loader.js';
import { AMBUSH, PARTIES, AMBUSHED_IDS, RISK, roll, outcomeFor, createRoadAmbush,
  validateRoadAmbushSnapshot } from '../src/road-ambush.js';
import { MERCENARY_ROSTER, CROMB, roadLengths, distanceAlongRoad } from '../src/mercenaries.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';

/** The whole company walks past, in the order the roster sends them, with nobody interfering. */
function walkTheRoad(ambush, { withTraveler = [], dead = [] } = {}) {
  const met = [];
  for (const party of PARTIES) met.push(ambush.reach(party.id, { withTraveler, dead }));
  return met;
}

test('left alone: Chris dies on that road, Ed runs, and the three riders finish them', () => {
  // The user's default, 22 September 2026, and the reason the road has a body on it.
  const ambush = createRoadAmbush({ seed: 7 });
  const met = walkTheRoad(ambush);
  const by = id => met.find(one => one.party === id);
  assert.deepEqual(by('gotwood').fallen, ['merc-gotwood'], 'first through, and alone');
  assert.equal(by('gotwood').cleared, false, 'and they are still there afterwards');
  assert.equal(ambush.fell('merc-gotwood'), true, 'so there is a body on the road');
  assert.deepEqual(by('word').fallen, [], 'Ed always gets clear');
  assert.equal(by('word').cleared, false, 'and never fights');
  assert.equal(by('riders').cleared, true, 'three swords beat three');
  assert.equal(ambush.alive, false);
  // And so the three who come after find an empty road.
  for (const later of ['lakota', 'eliana', 'princes']) {
    assert.equal(by(later).met, false, `${later} met rebels who were already dead`);
    assert.deepEqual(by(later).fallen, []);
  }
  assert.equal(ambush.state.sprung, true);
});

test('walk that road with him and nothing happens to him at all', () => {
  const ambush = createRoadAmbush({ seed: 7 });
  const met = walkTheRoad(ambush, { withTraveler: ['merc-gotwood'] });
  assert.equal(met[0].met, false, 'he was not on the road to be caught on it');
  assert.deepEqual(ambush.state.fallen, [], 'and nobody died in his place');
  assert.equal(met.find(one => one.party === 'riders').cleared, true, 'the riders still clear it');
});

test('spring it yourself first and there is nothing left for anybody to walk into', () => {
  const ambush = createRoadAmbush({ seed: 7 });
  assert.equal(ambush.sprang(), true, 'the traveler walked into it');
  assert.equal(ambush.cleared(), true, 'and won');
  assert.equal(ambush.cleared(), false, 'which happens once');
  const met = walkTheRoad(ambush);
  assert.deepEqual(ambush.state.fallen, [], 'the whole company walks it and nobody falls');
  for (const one of met) assert.equal(one.met, false);
});

test('take the riders apart and the road takes them apart: two still win, one alone does not', () => {
  // The user did not say what happens to a trio the traveler has broken up. The rule is the one
  // the rest of the road already keeps: two swords win at a thinner margin, one man alone dies.
  const two = createRoadAmbush({ seed: 7 });
  two.reach('gotwood', {});                                   // Chris falls as usual
  const pair = two.reach('riders', { withTraveler: ['merc-jerry'] });
  assert.equal(pair.cleared, true, 'two of them still finish it');
  assert.ok(pair.fallen.every(id => id !== 'merc-jerry'), 'and the one at your shoulder is never the one lost');

  const one = createRoadAmbush({ seed: 7 });
  one.reach('gotwood', {});
  const alone = one.reach('riders', { withTraveler: ['merc-jerry', 'merc-christin'] });
  assert.deepEqual(alone.fallen, ['merc-ciaran'], 'the last of them walks into what Chris walked into');
  assert.equal(alone.cleared, false, 'and the rebels are still there');
  // Which is why Matt and Al the Tun exist: somebody finishes them in the end.
  assert.equal(one.reach('lakota', {}).fallen.length, 0, 'Lakota runs past living rebels');
  assert.equal(one.reach('eliana', {}).fallen.length, 0, 'and so does Eliana');
  const princes = one.reach('princes', {});
  assert.equal(princes.cleared, true, 'and the princes always finish the last of them');
  assert.equal(one.alive, false);
});

test('Mus never goes that way, so he can neither spring it nor die in it', () => {
  assert.equal(AMBUSHED_IDS.includes('merc-mus'), false);
  assert.equal(PARTIES.some(one => one.men.includes('merc-mus')), false);
  // And everybody else on the roster is accounted for exactly once.
  const roster = [CROMB, ...MERCENARY_ROSTER].map(one => one.id);
  const listed = [...AMBUSHED_IDS];
  assert.equal(new Set(listed).size, listed.length, 'somebody walks that road twice');
  for (const id of listed) assert.ok(roster.includes(id), `${id} is not one of the eleven`);
  for (const id of roster) {
    if (id === 'merc-mus' || id === CROMB.id) continue;
    assert.ok(listed.includes(id), `${id} walks that road and nothing is written for him`);
  }
});

test('the roll is the playthrough’s, not the frame’s: the same seed always loses the same man', () => {
  for (const seed of [0, 1, 7, 12345, 999999]) {
    const first = createRoadAmbush({ seed }), second = createRoadAmbush({ seed });
    walkTheRoad(first); walkTheRoad(second);
    assert.deepEqual(first.state.fallen, second.state.fallen, `seed ${seed} is not stable`);
    // And a save taken halfway does not re-roll the rest of it.
    const half = createRoadAmbush({ seed });
    half.reach('gotwood', {});
    const loaded = createRoadAmbush({ seed: seed + 1 });
    assert.equal(loaded.restore(half.snapshot()), true, 'the seed travels with the save');
    walkTheRoad(loaded); walkTheRoad(half);
    assert.deepEqual(loaded.state.fallen, half.state.fallen);
  }
});

test('over a hundred playthroughs the riders pay about a third of the time and the pair about half', () => {
  const cost = { riders: 0, princes: 0 };
  const RUNS = 400;
  for (let seed = 0; seed < RUNS; seed++) {
    const riders = createRoadAmbush({ seed });
    const lost = riders.reach('riders', {});
    assert.equal(lost.cleared, true, `seed ${seed}: the three of them lost the fight`);
    if (lost.fallen.length) cost.riders++;
    // The princes, met on their own, are two against three.
    const princes = createRoadAmbush({ seed });
    const theirs = princes.reach('princes', {});
    assert.equal(theirs.cleared, true, `seed ${seed}: the princes lost the fight`);
    if (theirs.fallen.length) cost.princes++;
  }
  const share = n => n / RUNS;
  assert.ok(Math.abs(share(cost.riders) - RISK[3]) < .09, `the riders paid ${share(cost.riders).toFixed(2)} of the time`);
  assert.ok(Math.abs(share(cost.princes) - RISK[2]) < .09, `the princes paid ${share(cost.princes).toFixed(2)} of the time`);
  // And when the riders do pay, it is not always the same man: any of the three.
  const lost = new Set();
  for (let seed = 0; seed < RUNS; seed++) {
    const one = createRoadAmbush({ seed }).reach('riders', {});
    for (const id of one.fallen) lost.add(id);
  }
  assert.equal(lost.size, 3, `only ${[...lost].join(', ')} is ever the one lost`);
});

test('a save of it round-trips, and nonsense is refused without changing anything', () => {
  const ambush = createRoadAmbush({ seed: 11 });
  walkTheRoad(ambush);
  const saved = ambush.snapshot();
  assert.equal(validateRoadAmbushSnapshot(saved), true);
  const loaded = createRoadAmbush({ seed: 2 });
  assert.equal(loaded.restore(saved), true);
  assert.deepEqual(loaded.snapshot(), saved);
  // Snapshots own their arrays.
  saved.fallen.push('merc-lakota'); saved.settled.push('word');
  assert.deepEqual(loaded.snapshot().fallen, ambush.snapshot().fallen);
  const before = loaded.snapshot();
  for (const bad of [null, {}, { ...before, version: 2 }, { ...before, seed: -1 }, { ...before, seed: 1.5 },
    { ...before, rebels: 4 }, { ...before, rebels: -1 }, { ...before, sprung: 'yes' },
    { ...before, settled: ['nobody'] }, { ...before, settled: ['word', 'word'] },
    { ...before, fallen: ['merc-mus'] }, { ...before, rebels: 0, sprung: false }]) {
    assert.equal(validateRoadAmbushSnapshot(bad), false, JSON.stringify(bad));
    assert.equal(loaded.restore(bad), false);
    assert.deepEqual(loaded.snapshot(), before, 'a refused save changed the live one');
  }
});

/**
 * And the ground itself: the emptiest stretch of the road out of Drent, measured on the world the
 * game builds rather than chosen off a map.
 */
test('they lie up on the emptiest stretch of the Drent road, with ground to come off it', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const road = world.paths[0], lengths = roadLengths(road);
  assert.ok(AMBUSH.distance > 440 && AMBUSH.distance < 640,
    'between the Avrel clearing and the Caloss crossing, which is the empty part');
  const along = distanceAlongRoad(road, AMBUSH.point, lengths);
  assert.ok(Math.abs(along - AMBUSH.distance) < 6, `the point sits ${along.toFixed(0)} m along, not ${AMBUSH.distance}`);
  assert.equal(world.regionAt(AMBUSH.point.x, AMBUSH.point.z)?.name, 'Drent', 'the last of Drent before the river');
  // The bearing the bodies and the three of them are laid out along is the road's own.
  const ahead = distanceAlongRoad(road, { x: AMBUSH.point.x + AMBUSH.forward.dx * 10, z: AMBUSH.point.z + AMBUSH.forward.dz * 10 }, lengths);
  assert.ok(Math.abs(ahead - along - 10) < 1.2, `ten metres along the bearing is ${(ahead - along).toFixed(1)} m along the road`);
  assert.ok(canStand(AMBUSH.point.x, AMBUSH.point.z, world, BODY.person), 'the road itself is walkable there');
  // Nobody is standing near enough to watch it happen.
  for (const [id, stand] of Object.entries(world.npcPositions)) {
    const gap = Math.hypot(stand.x - AMBUSH.point.x, stand.z - AMBUSH.point.z);
    assert.ok(gap > 60, `${id} stands ${gap.toFixed(0)} m from the ambush`);
  }
  // Well outside Tidehaven, which is the whole point of where it is.
  const village = world.landmarks.find(place => place.id === 'village' || /Tidehaven Village/.test(place.name));
  if (village) assert.ok(Math.hypot(village.x - AMBUSH.point.x, village.z - AMBUSH.point.z) > 400,
    'it is close enough to the village to be its business');
});

test('the traveler’s own fight: three of them, and they are not goblins', async () => {
  const { ENEMY_KINDS } = await import('../src/combat.js');
  assert.equal(AMBUSH.rebels, 3);
  assert.ok(ENEMY_KINDS.rebel, 'the rebels have a kind of their own');
  const { rebel, goblin, soldier } = ENEMY_KINDS;
  assert.ok(rebel.damage > goblin.damage && rebel.damage < soldier.damage, 'harder than a goblin, softer than the army');
  assert.equal(rebel.guard, undefined, 'no shields');
  assert.equal(rebel.armor, undefined, 'and no mail');
  assert.ok(rebel.tell >= soldier.tell, 'timing never scales: their tell is as honest as anybody’s');
  // **Poise is what makes it a fight.** Without it a traveler who simply keeps swinging
  // interrupts every windup and finishes all three untouched - measured, 200 runs a setting.
  assert.equal(rebel.poise, true, 'they swing through a cut instead of flinching out of it');
  assert.equal(rebel.pack, 2, 'two at a time, not the soldiers’ three');
  // And the health they are authored with is the module’s, so the fight and its reason live together.
  assert.equal(AMBUSH.hp, 120);
  assert.ok(AMBUSH.hp > goblin.damage * 4, 'more man than the tutorial’s goblins');
});

test('the host authors them at the health the module names, and answers a refused fight', () => {
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  assert.match(main, /const REBEL_HP=AMBUSH\.hp;/, 'one number, named where the reason for it is written');
  assert.doesNotMatch(main, /kind:'rebel',name:'Rebel of the Lauvel',hp:\d/, 'and not a literal beside each of them');
  // A refused fight that nothing answers is a fight that silently never happens.
  assert.match(main, /else if\(!ambushHeldOff\)\{ambushHeldOff=true;/);
  assert.match(main, /if\(!near\)ambushHeldOff=false;/, 'and he is told again if he walks away and comes back');
});

/**
 * And the host, which is where an event is the difference between a rule and a thing that happens.
 */
test('src/main.js walks the road, springs it, lays the bodies and saves all of it', () => {
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  assert.match(main, /function walkTheAmbush\(\)\{/, 'the company walks it whether the traveler does or not');
  assert.match(main, /if\(mode==='playing'&&!reviewFrozen\)walkTheAmbush\(\);/, 'once a frame of ordinary play, and never in a frozen review');
  assert.match(main, /const withTraveler=new Set\(companions\.walking\),dead=fallen\.ids;/,
    'a man at your shoulder is not on that road');
  assert.match(main, /one\.phase!=='with-traveler'&&one\.phase!=='coming'&&one\.phase!=='landing'/,
    'and neither is a man still at sea or still on the landing');
  assert.match(main, /for\(const id of told\?\.fallen\?\?\[\]\)\{if\(fallen\.fall\(id\)\)lost=true;\}/,
    'a man killed out there is dead in the game, not only in the event');
  assert.match(main, /if\(lost\)\{rebuildCompany\(\);placeMercenaries\(\);saveRoad\(false\);\}/,
    'the file closes over him and the save remembers');
  // The traveler's own way into it, and the way out of it.
  assert.match(main, /if\(combat\.startEncounter\(ambushEncounter\)\)\{ambush\.sprang\(\);/);
  assert.match(main, /combat\.state\.encounterId===ambushEncounter\.id\)\{ambush\.cleared\(\);saveRoad\(false\);\}/,
    'and winning it clears the road for everybody after you');
  assert.doesNotMatch(main, /markerFor\([^)]*ambush/, 'an event wears no mark');
  // The body.
  assert.match(main, /for\(const id of ambush\.state\.fallen\)\{const npc=npcById\.get\(id\);/, 'and he lies where he fell');
  assert.match(main, /npc\.actor\.animate\(walkTime\+2,0,true,\{action:'dead',progress:1\}\);/, 'drawn as a body, not steered as a man');
  assert.match(main, /for\(const id of ambush\.state\.fallen\)\{if\(bodiesFound\.has\(id\)\)continue;/,
    'and the traveler is told once when he walks up to him');
  assert.match(main, /if\(\(npc\.hidden\|\|npc\.fallen\)&&!npc\.lying\)/, 'and not put out of the world with the rest of the dead');
  // Saved with the road, and restored with the seed it was rolled from.
  assert.match(main, /ambush:ambush\.snapshot\(\)\}\);/);
  assert.match(main, /ambush\.restore\(saved\.ambush\?\?createRoadAmbush\(\{seed:ambushSeed\}\)\.snapshot\(\)\);/);
});

/**
 * **The Caloss, which is now a river and not a wall** (the user, 22 September 2026: all rivers
 * should be real swimmable water, and the bridge is what saves you from swimming). Six paces of
 * the middle of the span are in the water, so the crossing is a swim or a repair.
 */
test('the Caloss span is down, and the break leaves the repair within reach of sound planks', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const site = world.journeySites['bridge-repair'];
  // The bridge's own line, taken from the break itself: Drent is the end at -13.5 (650 m along
  // the road, against the far bank's 677), which is the bank the traveler arrives on.
  const damage = world.colliders.filter(one => one.kind === 'bridge-damage');
  assert.ok(damage.length > 20, `only ${damage.length} shapes close the break`);
  const first = damage[0], last = damage.at(-1);
  const axis = { x: -0.810, z: 0.587 };
  const deck = along => {
    const x = site.x + axis.x * along, z = site.z + axis.z * along;
    return canStand(x, z, world, BODY.person);
  };
  // Walked from the Drent bank: sound planks, then nothing.
  let reached = null;
  for (let along = -13; along <= 13; along += .25) { if (deck(along)) reached = along; else if (reached !== null && along > reached + .4) break; }
  assert.ok(reached !== null && reached < 1, `the deck carries on to ${reached}`);
  assert.ok(Math.abs(reached) < 2.7, `the repair is ${Math.abs(reached).toFixed(2)} m past the last sound plank, and F reaches 2.7`);
  // The far side is not walked to from here, at any point in the break.
  for (let along = 1.5; along <= 6; along += .5) assert.equal(deck(along), false, `the break is walkable at ${along}`);
  // Wider than a running jump: 6.3 m/s up against 17 of gravity is .74 s in the air.
  const hole = damage.reduce((most, one) => Math.max(most, Math.hypot(one.x - first.x, one.z - first.z)), 0);
  assert.ok(hole > 5, `the break is only ${hole.toFixed(1)} m across`);
  // And mended, the bridge is a bridge again, end to end.
  world.setJourneySiteState('bridge-repair', true);
  for (let along = -13; along <= 13; along += .5) assert.equal(deck(along), true, `the mended deck is broken at ${along}`);
});
