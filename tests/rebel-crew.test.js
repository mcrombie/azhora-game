import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sourceModule } from './module-loader.js';
import { REBEL_CREW, CREW_IDS, DECK_Y, DROP_RAIL, crewPose, CREW_ALWAYS_IN_FULL } from '../src/rebel-crew.js';
import { shipAt, WORD_SHIP, WORD_TRACK, WORD_BEACH } from '../src/word-arrival.js';
import { HULL } from '../src/salt-sultan.js';
import { alwaysInFull, figureDetail } from '../src/figure-lod.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

test('there are pirates on the ship, five of them, and no two alike', () => {
  assert.ok(REBEL_CREW.length >= 5 && REBEL_CREW.length <= 6, `${REBEL_CREW.length} aboard`);
  assert.equal(new Set(CREW_IDS).size, REBEL_CREW.length, 'no id twice');
  const looks = new Set(), skins = new Set(), builds = new Set();
  for (const man of REBEL_CREW) {
    assert.ok(man.station, man.id + ' has something to be doing');
    assert.ok(Number.isFinite(man.x) && Number.isFinite(man.z) && Number.isFinite(man.yaw), man.id);
    // Weathered colours, and nothing that reads as a uniform.
    assert.ok(Number.isInteger(man.look.tunic) && Number.isInteger(man.look.skin), man.id + ' is dressed');
    assert.ok(!looks.has(man.look.tunic), man.id + ' is wearing what somebody else is wearing');
    looks.add(man.look.tunic); skins.add(man.look.skin); builds.add(man.look.build);
  }
  assert.equal(looks.size, REBEL_CREW.length, 'five coats, five colours');
  assert.ok(skins.size >= 4 && builds.size >= 4, 'and they are not the same man five times');
  assert.ok(REBEL_CREW.filter(man => man.look.headgear !== 'bare').length >= 2, 'a headscarf or two between them');
  // Nobody is named. A name invented at the keyboard is what the house rules forbid, and when
  // Peblos is built the user's own registers can name whichever of them needs it.
  for (const man of REBEL_CREW) assert.equal(man.name, undefined, man.id + ' has been given a name');
});

test('every one of them is on her deck, inside her bulwarks', () => {
  const B = HULL.beam / 2, L = HULL.length / 2;
  for (const man of REBEL_CREW) {
    assert.ok(Math.abs(man.x) < B * .92, `${man.id} is standing through her side (${man.x.toFixed(2)} of ${B.toFixed(2)})`);
    assert.ok(Math.abs(man.z) < L * .86, `${man.id} is off her bow or her stern (${man.z.toFixed(2)} of ${L.toFixed(2)})`);
  }
  assert.equal(DECK_Y, 1.16, 'the deck is where salt-ship.js lays it');
  // One at the tiller, two at the rail, one at the sail.
  const by = station => REBEL_CREW.filter(man => man.station === station);
  assert.equal(by('tiller').length, 1);
  assert.equal(by('rail').length, 2, 'two of them put him over, and two of them watch');
  assert.equal(by('sail').length, 1);
  assert.ok(by('tiller')[0].z < 0, 'the helmsman is aft, where the tiller is');
  assert.ok(by('sail')[0].z > 0, 'and the man at the sail is forward of the mast');
  for (const man of by('rail')) assert.equal(Math.sign(man.x), Math.sign(DROP_RAIL.x), 'both at the same rail');
  assert.ok(Math.abs(by('rail')[0].z - by('rail')[1].z) > 1.5, 'and not standing on each other');
});

test('the rail they are at is the rail he goes over, which is the one facing the shore', () => {
  // She is halfway through her turn as he drops, and the shore bears hard over her port side.
  const pose = shipAt(WORD_SHIP.drops);
  const toShore = { x: WORD_BEACH.x - WORD_TRACK.standOff.x, z: WORD_BEACH.z - WORD_TRACK.standOff.z };
  const length = Math.hypot(toShore.x, toShore.z);
  const starboard = { x: Math.cos(pose.yaw), z: -Math.sin(pose.yaw) };
  const side = (toShore.x * starboard.x + toShore.z * starboard.z) / length;
  assert.ok(side < -.5, `the shore is ${side.toFixed(2)} of the way to starboard, so it is over her port rail`);
  assert.ok(DROP_RAIL.x < 0, 'and that is the rail they are leaning over');
});

test('they lean out as he goes over and straighten as she stands out, on the ship’s own clock', () => {
  const rail = REBEL_CREW.find(man => man.station === 'rail');
  const leanAt = t => crewPose(rail, shipAt(t), 0).lean;
  // Standing in: upright, and nothing to look at yet.
  assert.equal(shipAt(WORD_SHIP.sighted + 5).lean, 0);
  const upright = leanAt(WORD_SHIP.sighted + 5);
  // Rounding up: over they go, and hard over by the time he is in the water.
  assert.ok(shipAt(WORD_SHIP.drops).lean > .9, 'hard over as he goes');
  assert.ok(leanAt(WORD_SHIP.drops) > upright + .25, 'and it shows in the man');
  assert.ok(leanAt(WORD_SHIP.turns + 2) > upright, 'it comes on as she rounds up');
  assert.ok(leanAt(WORD_SHIP.turns + 2) < leanAt(WORD_SHIP.drops), 'and comes on rather than snapping');
  // Standing out: they straighten, and by the time she is gone they are upright again.
  assert.ok(leanAt(WORD_SHIP.away + 3) < leanAt(WORD_SHIP.drops), 'her sail fills and they stop caring');
  assert.equal(shipAt(WORD_SHIP.away + 20).lean, 0);
  assert.ok(Math.abs(leanAt(WORD_SHIP.away + 20) - upright) < 1e-9, 'upright again');
  // It is a function of the clock and of nothing else, so a reload shows the right pose.
  assert.equal(leanAt(WORD_SHIP.drops), leanAt(WORD_SHIP.drops), 'the same second is the same pose');
  assert.equal(shipAt(WORD_SHIP.drops).lean, shipAt(WORD_SHIP.drops).lean);
});

test('a pose is four numbers, allocates nothing worth naming, and never throws', () => {
  for (const man of REBEL_CREW) for (const t of [0, WORD_SHIP.sighted, WORD_SHIP.turns, WORD_SHIP.drops, WORD_SHIP.away, WORD_SHIP.gone]) {
    const stance = crewPose(man, shipAt(t), t);
    assert.deepEqual(Object.keys(stance).sort(), ['lean', 'lift', 'sway', 'turn']);
    for (const [key, value] of Object.entries(stance)) assert.ok(Number.isFinite(value), `${man.id}.${key} at ${t}`);
    assert.ok(Math.abs(stance.lean) < 1 && Math.abs(stance.turn) < 1 && Math.abs(stance.sway) < .3, man.id + ' is falling over');
  }
  // Nonsense in, a pose out: the render loop must never be the place this is found out.
  for (const rubbish of [undefined, null, {}, 'aboard', Number.NaN]) {
    const stance = crewPose(rubbish, rubbish, rubbish);
    for (const value of Object.values(stance)) assert.ok(Number.isFinite(value), String(rubbish));
  }
  // The helmsman's body goes with his tiller, and it moves.
  const helm = REBEL_CREW.find(man => man.station === 'tiller');
  const turns = [0, 2, 4, 6].map(t => crewPose(helm, shipAt(WORD_SHIP.sighted + t), t).turn);
  assert.ok(new Set(turns.map(v => v.toFixed(4))).size > 1, 'the tiller is not held in a vice');
});

test('they are men at sixty-eight metres and never a row of pegs', () => {
  // She lies 68 m off the pier and the stand-in comes in at 62, so every one of them would be
  // one mesh. They are `posed` and `made`, which are two of the cases the rule already keeps in
  // full, and a row of pegs on a deck would be worse than the empty deck the user complained of.
  const off = Math.hypot(WORD_TRACK.standOff.x - WORD_BEACH.x, WORD_TRACK.standOff.z - WORD_BEACH.z);
  assert.ok(off > 62, `she lies ${off.toFixed(0)} m off, which is past the stand-in line`);
  assert.equal(alwaysInFull(CREW_ALWAYS_IN_FULL), true, 'the rule itself says they stay whole');
  assert.equal(figureDetail(undefined, off, CREW_ALWAYS_IN_FULL), 'full');
  assert.equal(figureDetail('stand-in', off, CREW_ALWAYS_IN_FULL), 'full', 'and never come back as pegs');
  // And in practice they are not npcs at all: they are built into the hull's own group, so the
  // loop that swaps figures for stand-ins never sees them.
  const ship = source('salt-ship.js');
  assert.match(ship, /ship\.add\(actor\.group\)/, 'they ride inside her, so they rock and heel with her');
  assert.match(ship, /castShadow = false/, 'and cast no shadow on open water');
});

test('only the rebel has a crew, and the meshes she costs are counted', async () => {
  const { createSultana, createRebelShip } = await sourceModule('../src/salt-ship.js');
  const count = group => { let n = 0; group.traverse(object => { if (object.isMesh) n++; }); return n; };
  const sultana = createSultana(false), rebel = createRebelShip();
  const aboard = id => { let found = null; rebel.group.traverse(object => { if (object.name === id) found = object; }); return found; };
  for (const id of CREW_IDS) {
    assert.ok(aboard(id), `${id} is not on her deck`);
    assert.equal(sultana.group.getObjectByName(id), undefined, `${id} is on the Sultana, and he should not be`);
  }
  const added = count(rebel.group) - count(sultana.group);
  assert.ok(added > 0, 'the crew are drawn');
  assert.ok(added < 180, `five men cost ${added} meshes, which is more than a distant ship is worth`);
  // Nobody on her deck casts a shadow: she is sixty-eight metres out over open water.
  for (const id of CREW_IDS) aboard(id).traverse(object => { if (object.isMesh) assert.equal(object.castShadow, false, id); });
  // And she still updates without throwing, at every phase of the arrival.
  for (const t of [WORD_SHIP.sighted, WORD_SHIP.turns, WORD_SHIP.drops, WORD_SHIP.away, WORD_SHIP.gone - 1]) rebel.update(t, shipAt(t));
});

test('Ed says whose ship it was, once, and does not give anybody a name', () => {
  const main = source('main.js');
  const line = main.slice(main.indexOf("id:'word-crew'"), main.indexOf("id:'word-swim'"));
  assert.ok(line.length > 100, 'he has something to say about them');
  assert.match(line, /Whose ship was that\?/);
  assert.match(line, /at the rail/, 'and he saw them watching');
  assert.match(line, /has my hat/, 'in his own voice');
  assert.doesNotMatch(line, /\bcaptain [A-Z]/, 'nobody aboard her is given a name');
  assert.equal(main.split("id:'word-crew'").length - 1, 1, 'he says it in one place');
});

test('the whole deck rides her own clock, so a reload mid-arrival is the same picture', () => {
  const main = source('main.js');
  // Everything else about this arrival is a function of `playSeconds`: where she is, which way
  // she heads, how far the two at the rail lean. The four numbers a man's body is made of came
  // off `elapsed`, which starts at nought every time the game is opened - so the module's own
  // promise, that a game reloaded mid-arrival shows the right pose without anything being saved,
  // was true of her hull and false of everybody standing on it.
  assert.match(main, /rebelShip\.update\(playSeconds,pose\)/, 'the play clock, which the save carries');
  assert.doesNotMatch(main, /rebelShip\.update\(elapsed/, 'never the session clock');
  // The same play-second is the same deck, man for man.
  const at = WORD_SHIP.drops, pose = shipAt(at);
  for (const man of REBEL_CREW) assert.deepEqual(crewPose(man, pose, at), crewPose(man, pose, at), man.id);
  // And what the wrong clock was worth, measured: two sessions, the same second of the arrival.
  const moving = REBEL_CREW.filter(man => man.station !== 'rail');
  for (const man of moving) {
    const here = crewPose(man, pose, at);
    const drift = Math.max(...[37, 121, 300, 904].map(off => {
      const there = crewPose(man, pose, at + off);
      return Math.max(Math.abs(here.turn - there.turn), Math.abs(here.sway - there.sway), Math.abs(here.lift - there.lift));
    }));
    assert.ok(drift > .02, `${man.id} moved ${(drift * 180 / Math.PI).toFixed(1)} degrees between two sessions`);
  }
  // The rail men's lean is the one part that was always right: it comes off the ship's own pose.
  const rail = REBEL_CREW.find(man => man.station === 'rail');
  assert.equal(crewPose(rail, pose, at).lean, crewPose(rail, pose, at + 904).lean, 'the lean was never on the session clock');
});
