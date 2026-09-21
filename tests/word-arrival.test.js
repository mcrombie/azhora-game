import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, canSwim, WATERLINE } from '../src/game-state.js';
import { ARRIVALS, MERCENARY_ROSTER, mercenaryById, createMercenaryCompany } from '../src/mercenaries.js';
import { PLAYABLE } from '../src/player-characters.js';
import { skillLevel } from '../src/skills.js';
import { SWIM, swimSpeed, swimStep, levelForCrossing, levelForDryCrossing, SWIMMING_LESSON } from '../src/swimming.js';
import {
  WORD_ID, WORD_LEVEL, WORD_SHIP, WORD_TRACK, WORD_BEACH, WORD_SWIM, WORD_LINGERS, WORD_ASHORE,
  WORD_TOASTS, shipAt, swimmerAt, wordToastAt,
} from '../src/word-arrival.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

let world = null;
const built = async () => (world ??= (async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  return createWorld(new THREE.Scene());
})());

test('the hour is the roster’s hour, and the loitering is the roster’s too', () => {
  const ed = mercenaryById(WORD_ID);
  assert.equal(WORD_SHIP.drops, ed.arrival, 'the moment he goes over the side is the moment he arrives');
  assert.equal(WORD_SHIP.drops, ARRIVALS.word);
  assert.equal(WORD_LINGERS, ed.departs);
  assert.equal(WORD_LINGERS, 1500, 'twenty-five minutes on the beach before the road gets him');
  assert.equal(ed.route, 'shore');
  // The clock runs forwards and nothing overlaps.
  const order = [WORD_SHIP.sighted, WORD_SHIP.turns, WORD_SHIP.drops, WORD_SHIP.away, WORD_SHIP.gone];
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1], `${order[i]} follows ${order[i - 1]}`);
  assert.ok(WORD_ASHORE > WORD_SHIP.drops && WORD_ASHORE < WORD_SHIP.gone, 'he is out of the water before she is hull down');
  // He is the second of the eleven to land, and the only one the sea brings.
  const shore = MERCENARY_ROSTER.filter(m => m.route === 'shore');
  assert.deepEqual(shore.map(m => m.id), [WORD_ID]);
});

test('his level is what his own experience buys, and the crossing is cut to it', () => {
  const ed = PLAYABLE.find(who => who.roster === WORD_ID);
  assert.equal(WORD_LEVEL, skillLevel('swimming', ed.skills.swimming).level, 'the level his 260 experience is');
  assert.ok(Math.abs(WORD_SWIM.metres - 68.2) < .2, `${WORD_SWIM.metres.toFixed(1)} m of open water`);
  // Survivable by anybody, but not on wind alone by him: he spends the last of it drowning, which
  // is the whole demonstration. A traveler who copies him learns the same lesson at the same price.
  assert.equal(levelForCrossing(WORD_SWIM.metres), 1);
  assert.ok(levelForDryCrossing(WORD_SWIM.metres) > WORD_LEVEL,
    `dry only from level ${levelForDryCrossing(WORD_SWIM.metres)}, and he is ${WORD_LEVEL}`);
  let wind = SWIM.wind, health = 100, metres = 0;
  while (metres < WORD_SWIM.metres && health > 0) {
    const step = swimStep({ dt: 1 / 30, level: WORD_LEVEL, wind, health });
    wind = step.wind; health = step.health; metres += step.metres;
  }
  assert.ok(health > 40 && health < 65, `he walks out with ${health.toFixed(0)} of 100: spent, and making a joke of it`);
  assert.ok(Math.abs(WORD_SWIM.seconds - WORD_SWIM.metres / swimSpeed(WORD_LEVEL)) < 1e-9);
  assert.ok(WORD_SWIM.seconds > 25 && WORD_SWIM.seconds < 35, `${WORD_SWIM.seconds.toFixed(0)} seconds of it to watch`);
});

test('every metre of it is real water, and the strand is real ground', async () => {
  const w = await built();
  // The ship's whole track, in and out, with room for a twelve-metre hull.
  const leg = (a, b) => { const bad = [];
    for (let t = 0; t <= 1; t += 1 / 240) { const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (!canSwim(x, z, w, 7)) bad.push([Math.round(x), Math.round(z)]); }
    return bad; };
  assert.deepEqual(leg(WORD_TRACK.offing, WORD_TRACK.standOff), [], 'she stands in over open water');
  assert.deepEqual(leg(WORD_TRACK.standOff, WORD_TRACK.away), [], 'and stands out over it');
  // The swim: water all the way, and never a shortcut across anything standable.
  let dry = 0;
  for (let t = 0; t < .94; t += 1 / 400) {
    const x = WORD_SWIM.from.x + (WORD_SWIM.to.x - WORD_SWIM.from.x) * t, z = WORD_SWIM.from.z + (WORD_SWIM.to.z - WORD_SWIM.from.z) * t;
    assert.ok(canSwim(x, z, w, .34), `(${x.toFixed(1)}, ${z.toFixed(1)}) is not water`);
    if (canStand(x, z, w, .34)) dry++;
  }
  assert.equal(dry, 0, 'he does not wade any of it');
  // The strand: he walks out onto ground, with room to stand about on for twenty-five minutes.
  assert.ok(canStand(WORD_BEACH.x, WORD_BEACH.z, w, .34), 'the beach is standable');
  assert.ok(w.heightAt(WORD_BEACH.x, WORD_BEACH.z) < WATERLINE + .3, 'and it is a beach, not a cliff');
  let room = 0;
  for (let dx = -3; dx <= 3; dx += .5) for (let dz = -3; dz <= 3; dz += .5) if (canStand(WORD_BEACH.x + dx, WORD_BEACH.z + dz, w, .34)) room++;
  assert.ok(room > 40, `${room} of 169 places to stand within three metres`);
  assert.equal(w.regionAt(WORD_BEACH.x, WORD_BEACH.z)?.name, 'Drent', 'and it is Drent, so the region card is right');
});

test('the ship stands in, rounds up, waits, and goes', () => {
  const seen = t => shipAt(t);
  assert.equal(seen(0).visible, false);
  assert.equal(seen(WORD_SHIP.sighted - 1).visible, false);
  assert.equal(seen(WORD_SHIP.gone).visible, false, 'hull down and taken out of the scene');
  const phases = [WORD_SHIP.sighted, WORD_SHIP.sighted + 20, WORD_SHIP.turns, WORD_SHIP.drops, WORD_SHIP.away, WORD_SHIP.gone - 1]
    .map(t => seen(t).phase);
  assert.deepEqual(phases, ['standing-in', 'standing-in', 'lying-to', 'lying-to', 'standing-out', 'standing-out']);
  // She comes all the way in and stops where she says she stops.
  const at = seen(WORD_SHIP.turns);
  assert.ok(Math.hypot(at.x - WORD_TRACK.standOff.x, at.z - WORD_TRACK.standOff.z) < .01, 'rounded up on the mark');
  // She never comes nearer than that, which is the point of her.
  let closest = Infinity;
  for (let t = WORD_SHIP.sighted; t <= WORD_SHIP.gone; t += .5) {
    const p = seen(t); if (!p.visible) continue;
    closest = Math.min(closest, Math.hypot(p.x - WORD_BEACH.x, p.z - WORD_BEACH.z));
  }
  assert.ok(Math.abs(closest - WORD_SWIM.metres) < .01, `she never comes inside ${closest.toFixed(1)} m of the shore`);
  // Canvas: full standing in and out, spilled while she lies there.
  assert.equal(seen(WORD_SHIP.sighted + 5).sail, 1);
  assert.ok(seen(WORD_SHIP.drops).sail < .5 && !seen(WORD_SHIP.drops).moving, 'backed and lying to');
  assert.equal(seen(WORD_SHIP.away + 5).sail, 1);
  // And she is never anywhere but on her own line: monotonic out, monotonic away.
  let last = -Infinity;
  for (let t = WORD_SHIP.sighted; t < WORD_SHIP.turns; t += 1) { const d = -Math.hypot(seen(t).x - WORD_TRACK.standOff.x, seen(t).z - WORD_TRACK.standOff.z); assert.ok(d >= last); last = d; }
  for (const bad of [NaN, null, undefined, 'soon']) assert.ok(typeof shipAt(bad).phase === 'string', String(bad));
});

test('he swims it at his own speed and then stands on the beach', () => {
  assert.equal(swimmerAt(WORD_SHIP.drops - 1).swimming, false, 'aboard until she puts him over');
  assert.equal(swimmerAt(WORD_SHIP.drops).swimming, true);
  const half = swimmerAt(WORD_SHIP.drops + WORD_SWIM.seconds / 2);
  assert.ok(Math.abs(half.metres - WORD_SWIM.metres / 2) < .5, 'halfway at half the time');
  assert.ok(half.x < WORD_SWIM.from.x && half.x > WORD_SWIM.to.x, 'and somewhere between the two');
  const out = swimmerAt(WORD_ASHORE + .1);
  assert.deepEqual([out.swimming, out.ashore], [false, true]);
  assert.ok(Math.hypot(out.x - WORD_BEACH.x, out.z - WORD_BEACH.z) < .01, 'exactly where the beach is');
  // He does not drift off it afterwards, and he does not go back in.
  for (const t of [WORD_ASHORE + 60, WORD_SHIP.drops + WORD_LINGERS, 99999]) {
    const later = swimmerAt(t);
    assert.deepEqual([later.swimming, later.x, later.z], [false, WORD_BEACH.x, WORD_BEACH.z]);
  }
  // Speed is the swimming module's, not a number written twice.
  const second = swimmerAt(WORD_SHIP.drops + 1);
  assert.ok(Math.abs(second.metres - swimSpeed(WORD_LEVEL)) < 1e-9);
});

test('the village says its five things once each, in order, and a reload does not replay them', () => {
  const keys = [];
  let said = null;
  for (let t = 0; t <= WORD_SHIP.gone + 60; t += 1) {
    const owed = wordToastAt(t, said);
    if (owed) { keys.push(owed.key); said = owed.key; }
  }
  assert.deepEqual(keys, ['sighted', 'turns', 'drops', 'away', 'ashore']);
  assert.equal(wordToastAt(99999, 'ashore'), null, 'and then it is over with');
  for (const key of keys) {
    assert.ok(WORD_TOASTS[key].line.length > 40 && WORD_TOASTS[key].title === WORD_TOASTS[key].title.toUpperCase(),
      `${key} has a line and a banner`);
  }
  // A game reloaded in the middle of it catches up silently: the host asks with no marker and is
  // told the last thing that was owed, which it stores instead of saying.
  assert.equal(wordToastAt(WORD_SHIP.drops + 1)?.key, 'drops');
  assert.equal(wordToastAt(99999)?.key, 'ashore');
  assert.equal(wordToastAt(0), null, 'and a game reloaded before any of it hears all of it');
});

test('a shore route means a shore: he waits on the beach, and everybody else at the landing', () => {
  const road = [{ x: 0, z: 0 }, { x: -200, z: 0 }, { x: -400, z: 0 }];
  const landing = { x: 23, z: 29 };
  const company = createMercenaryCompany({ road, muster: road[2], landing, shore: WORD_BEACH });
  const at = (t, id) => company.placements(t).find(p => p.id === id);
  const waiting = at(WORD_SHIP.drops + 60, WORD_ID);
  assert.equal(waiting.phase, 'landing');
  assert.deepEqual([waiting.x, waiting.z], [WORD_BEACH.x, WORD_BEACH.z], 'on the strand, and not shuffled off it');
  const gotwood = at(1, 'merc-gotwood');
  assert.ok(Math.hypot(gotwood.x - landing.x, gotwood.z - landing.z) < 6, 'a man off a boat stands by the boats');
  assert.ok(Math.hypot(gotwood.x - WORD_BEACH.x, gotwood.z - WORD_BEACH.z) > 6, 'and not on Ed’s beach');
  // Twenty-five minutes of standing there, and then the road.
  assert.equal(at(WORD_SHIP.drops + WORD_LINGERS - 5, WORD_ID).phase, 'landing');
  assert.equal(at(WORD_SHIP.drops + WORD_LINGERS + 5, WORD_ID).phase, 'walking');
  assert.equal(at(WORD_SHIP.drops - 5, WORD_ID).phase, 'coming', 'and nothing of him before the ship');
  // Without a shore given, nothing changes for anybody: the old behaviour is the fallback.
  const old = createMercenaryCompany({ road, muster: road[2], landing });
  const plain = old.placements(WORD_SHIP.drops + 60).find(p => p.id === WORD_ID);
  assert.ok(Math.hypot(plain.x - landing.x, plain.z - landing.z) < 8, 'he waits at the landing, as he always did');
});

test('the rebel ship is the Sultana’s hull with everything worth seeing taken off her', async () => {
  const { createSultana, createRebelShip } = await sourceModule('../src/salt-ship.js');
  const { HULL } = await sourceModule('../src/salt-sultan.js');
  const size = group => new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  const sultana = createSultana(), rebel = createRebelShip();
  sultana.update(0, { sail: 1, moving: true }); rebel.update(0, { sail: 1, moving: true });
  const a = size(sultana.group), b = size(rebel.group);
  assert.ok(Math.abs(a.z - b.z) < .6 && Math.abs(a.x - b.x) < .6, 'the same hull: one length, one beam');
  assert.ok(b.z > HULL.length * .9 && b.y > 9, 'a ship, with a mast');
  const domes = group => { let n = 0; group.traverse(o => { if (o.isMesh && o.geometry.type === 'SphereGeometry') n++; }); return n; };
  assert.ok(domes(sultana.group) > 0 && domes(rebel.group) === 0, 'and no gilt dome on her');
  const count = group => { let n = 0; group.traverse(o => { if (o.isMesh) n++; }); return n; };
  assert.ok(count(rebel.group) < count(sultana.group) - 8, `${count(rebel.group)} pieces against the Sultana's ${count(sultana.group)}`);
  // No gold anywhere on her, and no salt.
  const golds = group => { const seen = new Set(); group.traverse(o => { if (o.isMesh && o.material?.color) seen.add(o.material.color.getHex()); }); return seen; };
  assert.ok(golds(sultana.group).has(0xd2a843) && !golds(rebel.group).has(0xd2a843), 'the gold is the Sultana’s alone');
  assert.ok(!golds(rebel.group).has(0xf4f1ea), 'and so is the salt');
  // Her sail sets and brails like any other.
  let sail = null; rebel.group.traverse(o => { if (o.isMesh && o.geometry.type === 'PlaneGeometry' && o.geometry.parameters.height > 4) sail = o; });
  assert.ok(sail?.visible, 'the sail is set under way');
  rebel.update(1, { sail: 0, moving: false });
  assert.equal(sail.visible, false, 'and spilled when she lies to');
  assert.match(source('salt-ship.js'), /rebelCloth/, 'she flies her own cloth');
});

test('the host puts her on the water, floats him in it, and lets him teach it', () => {
  const main = source('main.js');
  assert.match(main, /const pp=player\.group\.position,pose=shipAt\(playSeconds\);/, 'the ship rides the play clock');
  assert.match(main, /if\(seen&&!rebelShip\)rebelShip=createRebelShip\(\);/, 'and is built only when somebody could see her');
  assert.match(main, /rebelShip\.group\.position\.set\(pose\.x,SEA_LEVEL\+\.04,pose\.z\)/, 'and sits on the sea like the Sultana');
  assert.match(main, /const owed=wordToastAt\(playSeconds,wordSaid\);/, 'the village braces once per thing');
  assert.match(main, /audio\?\.effect\('bell'\)/, 'with a bell');
  assert.match(main, /if\(npc\.swimming\)\{pos\.set\(npc\.swimming\.x,WATERLINE-SWIM\.sink,npc\.swimming\.z\)/, 'he floats where the traveler would');
  assert.match(main, /dHome>\.1&&!npc\.swimming/, 'and is not walked there over the seabed');
  assert.match(main, /swimming:!!npc\.swimming\}\);/, 'with the swimmer’s posture');
  assert.match(main, /id:'word-swim',label:'Nobody swims that\. How is it done\?'/, 'and he will say how it is done');
  assert.match(main, /const learned=swimming\.learn\(\);/, 'which is what teaches it');
  assert.match(main, /wordSaid=wordToastAt\(playSeconds\)\?\.key\?\?null;/, 'a reload catches up without saying a word');
  assert.match(main, /view==='word-ship'\|\|view==='word-ashore'/, 'and there is a view of it to look at');
  assert.match(main, /landing:world\.spawn,shore:WORD_BEACH[,}]/, 'the company knows where the sea puts a man down');
  // The lesson is Ed's, in his own words, and it is the swimming module's copy.
  assert.ok(SWIMMING_LESSON.length >= 4);
  assert.match(SWIMMING_LESSON.join(' '), /Walk in/, 'and it starts where the skill starts');
  assert.doesNotMatch(main, /SWIMMING_LESSON\s*=\s*\[/, 'written once, in src/swimming.js');
});
