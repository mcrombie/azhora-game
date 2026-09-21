import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';
import { createMercenaryCompany, MERCENARY_ROSTER, ESCORT_OFFSETS, escortSpotFor } from '../src/mercenaries.js';
import { BODY } from '../src/bodies.js';
import { INTERPRETER } from '../src/languages.js';
import {
  SEQUENCE_SECONDS, SHORE_SECONDS, BEATS, SHORE_BEATS, BOAT_PATH, BOAT, BOAT_REST, SPAWN, PIER_HEAD, BELL, LANDED, LOOKS, PHASES,
  CAPTION_LIMITS, PLAYABLE_IDS, DEFAULT_PLAYER, VARIANT_IDS, SEA_LEVEL,
  captionsFor, companionFor, normalisePlayer, variantFor, stateAt, eventsBetween, eventsOf, boatBob, SKIP, SKIP_BY_VARIANT,
} from '../src/opening-sequence.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const file = rel => readFileSync(fileURLToPath(new URL(rel, new URL('../', import.meta.url))), 'utf8');
const near = (a, b, tolerance, message) => assert.ok(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b}`);
const gap = (a, b) => Math.hypot(a.x - b.x, (a.y ?? 0) - (b.y ?? 0), a.z - b.z);
/** Distance over the water, for things whose height the world decides. */
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const heading = yaw => ({ x: Math.sin(yaw), z: Math.cos(yaw) });

test('the beats are in order, touch without overlapping, and fill thirty-five to fifty seconds', () => {
  assert.ok(SEQUENCE_SECONDS >= 35 && SEQUENCE_SECONDS <= 50, `${SEQUENCE_SECONDS} s`);
  assert.equal(BEATS[0].at, 0);
  assert.equal(BEATS.at(-1).until, SEQUENCE_SECONDS);
  for (let i = 0; i < BEATS.length; i++) {
    const b = BEATS[i];
    assert.ok(b.until > b.at, `${b.id} lasts`);
    assert.ok(b.until - b.at >= 1.5, `${b.id} is long enough for the eye to settle`);
    if (i) assert.equal(b.at, BEATS[i - 1].until, `${b.id} begins where ${BEATS[i - 1].id} ends`);
    if (b.caption) assert.ok(b.caption.at >= b.at && b.caption.until <= b.until && b.caption.until > b.caption.at, `${b.id}'s caption sits inside it`);
    for (const e of b.events) assert.ok(e.at >= b.at && e.at <= b.until, `${b.id}'s ${e.type} happens during it`);
  }
  assert.ok(Object.isFrozen(BEATS) && BEATS.every(b => Object.isFrozen(b)), 'the beats are data');
  for (const beats of Object.values(SHORE_BEATS)) {
    assert.equal(beats[0].at, 0);
    assert.equal(beats.at(-1).until, SHORE_SECONDS);
    assert.ok(beats.some(b => b.caption), 'a shore variant says how the traveler got here');
  }
});

test('the landing is the world’s: the spawn, the pier head, the bell and the boat’s berth come from createWorld', () => {
  assert.deepEqual({ x: SPAWN.x, z: SPAWN.z }, world.spawn);
  near(world.heightAt(SPAWN.x, SPAWN.z), SPAWN.y, 1e-9, 'the deck height');
  assert.deepEqual({ x: PIER_HEAD.x, z: PIER_HEAD.z }, { x: world.pierHead.x, z: world.pierHead.z });
  assert.ok(canStand(LANDED.traveler.x, LANDED.traveler.z, world), 'the traveler lands on footing');
  assert.ok(canStand(PIER_HEAD.x, PIER_HEAD.z, world), 'the harbourmaster has footing');
  // The berth is the arrival boat's own mooring in world.js: beside the spawn, off the pier's south face, over water.
  near(gap(BOAT_REST, { x: world.boatStart.x, z: world.boatStart.z }), 0, .5, 'the berth is where world.boatStart says the boat is');
  assert.ok(world.heightAt(BOAT_REST.x, BOAT_REST.z) < SEA_LEVEL - 3, 'the berth is afloat');
  assert.ok(Math.abs(BOAT_REST.z - SPAWN.z) < 6 && Math.abs(BOAT_REST.x - SPAWN.x) < 1, 'the berth lies alongside the landing');
  assert.equal(world.landmarks.find(l => l.id === 'harbor').name, 'Tidehaven Landing');
  // The bell the sequence rings is the Greenway warning bell the village has.
  assert.ok(gap(BELL, LOOKS.bell) < 4);
  assert.ok(world.heightAt(BELL.x, BELL.z) > SEA_LEVEL, 'the bell stands on land');
});

test('the boat comes in from the roads over water the whole way and ends exactly at its berth', () => {
  const first = stateAt(0).boat;
  assert.ok(gap(first, SPAWN) >= 120, `it starts far enough out to be a crossing: ${gap(first, SPAWN).toFixed(0)} m`);
  let previous = null, deepest = Infinity;
  for (let t = 0; t <= SEQUENCE_SECONDS; t += .25) {
    const { boat } = stateAt(t);
    const depth = world.heightAt(boat.x, boat.z);
    deepest = Math.min(deepest, SEA_LEVEL - depth);
    assert.ok(depth < SEA_LEVEL - .8, `at ${t}s the boat is afloat at (${boat.x.toFixed(1)}, ${boat.z.toFixed(1)}), ground ${depth.toFixed(2)}`);
    if (previous) {
      const speed = gap(boat, previous) / .25;
      assert.ok(speed <= 6.5, `at ${t}s the boat makes ${speed.toFixed(1)} m/s, no faster than the Sultana`);
    }
    previous = boat;
  }
  const end = stateAt(SEQUENCE_SECONDS).boat;
  near(flat(end, BOAT_REST), 0, 1e-9, 'the boat ends at the berth');
  assert.equal(end.moving, false);
  const h = heading(end.yaw), rest = heading(BOAT_REST.yaw);
  near(h.x, rest.x, 1e-9, 'bow as the world moors it'); near(h.z, rest.z, 1e-9, 'bow as the world moors it');
  assert.ok(h.x > .9, 'bow east along the pier’s face');
  // It slows into the berth rather than stopping dead.
  const late = gap(stateAt(SEQUENCE_SECONDS - .25).boat, end) / .25, early = gap(stateAt(20.25).boat, stateAt(20).boat) / .25;
  assert.ok(late < 1 && early > 4, `it loses way at the end: ${late.toFixed(2)} m/s against ${early.toFixed(2)} at sea`);
  assert.ok(BOAT_PATH.every(k => Object.isFrozen(k)));
});

test('every caption fits the block, for every traveler the game can be', () => {
  for (const id of PLAYABLE_IDS) {
    const variant = variantFor(id);
    assert.ok(variant.captions.length >= 1, `${id} is told something`);
    for (const c of variant.captions) {
      assert.ok(c.eyebrow.length > 0 && c.eyebrow.length <= CAPTION_LIMITS.eyebrow, `${id} ${c.beat} eyebrow: ${c.eyebrow.length}`);
      assert.ok(c.text.length > 0 && c.text.length <= CAPTION_LIMITS.text, `${id} ${c.beat} text: ${c.text.length}`);
      assert.equal(c.eyebrow, c.eyebrow.toUpperCase(), 'the eyebrow is set in capitals');
      assert.doesNotMatch(c.text, /[{}]/, 'no slot is left unfilled');
      assert.match(c.text, /[.!?]$/, 'a caption is a sentence');
    }
  }
  // On screen, the alpha rises and falls inside the caption's own window and nothing shows between captions.
  const standard = captionsFor();
  for (const c of standard) {
    assert.equal(stateAt(c.at).caption.alpha, 0);
    assert.equal(stateAt((c.at + c.until) / 2).caption.alpha, 1);
    assert.equal(stateAt(c.until).caption.alpha, 0);
    assert.equal(stateAt(c.at - .05).caption, null);
  }
  assert.equal(stateAt(SEQUENCE_SECONDS).caption, null, 'the last frame is clean for the toast');
});

test('the four facts are announced, and nothing else is claimed', () => {
  const text = captionsFor().map(c => c.text).join(' ');
  assert.match(text, /mercenary, hired from abroad by the Ambroni Empire/);
  assert.match(text, /rebellion/);
  assert.match(text, /Drent, the quietest province the Empire has left/);
  assert.match(text, /Tidehaven/);
  assert.match(text, /Ambron, a city built in a lake, to the west/);
  assert.match(text, /a war in this country/);
  assert.match(text, /not understood it yet/);
  // The errand and the bell are the harbourmaster's to explain; the captions do not.
  assert.doesNotMatch(text, /Mara|letter|Corvan|Lakota|goblin/i);
  assert.doesNotMatch(text, /Legion|Legate/, 'the army is never the Legion');
  assert.doesNotMatch(LANDED.toast.kicker + LANDED.toast.title, /Lakota|CHRIS/, 'the landing sends the traveler to the harbourmaster');
  assert.match(LANDED.toast.kicker, /MARA/);
});

test('the companion slot names whoever came off the boat: Chris, or Cromb when the traveler is Chris', () => {
  assert.equal(normalisePlayer(undefined), DEFAULT_PLAYER);
  assert.equal(normalisePlayer('nobody-at-all'), DEFAULT_PLAYER);
  assert.equal(normalisePlayer('merc-gotwood'), 'gotwood');
  assert.equal(normalisePlayer('Chris'), 'gotwood');
  assert.equal(normalisePlayer('Ed the Word'), 'word');
  assert.deepEqual(PLAYABLE_IDS, ['cromb', ...MERCENARY_ROSTER.map(m => m.id.slice('merc-'.length))]);
  assert.equal(PLAYABLE_IDS.length, 11);
  for (const id of PLAYABLE_IDS) {
    const expected = id === 'gotwood' ? 'Cromb' : 'Chris Gotwood';
    assert.equal(companionFor(id), expected, id);
    assert.equal(companionFor(`merc-${id}`), expected, `merc-${id}`);
    const first = variantFor(id).captions[0].text;
    if (variantFor(id).id === 'standard') assert.match(first, new RegExp(`${expected} is in the bow`), `${id} sails with ${expected}`);
  }
  assert.equal(stateAt(4, { companion: 'Cromb' }).caption.text, 'The last morning of the crossing. Cromb is in the bow, watching the coast come up.');
});

test('two travelers never took the boat: Ed the Word and Mus get one card over the landed frame', () => {
  assert.deepEqual(VARIANT_IDS, ['standard', 'word', 'mus']);
  assert.equal(variantFor('merc-word').id, 'word');
  assert.equal(variantFor('mus').id, 'mus');
  for (const id of PLAYABLE_IDS.filter(p => !['word', 'mus'].includes(p))) assert.equal(variantFor(id).id, 'standard', id);
  for (const id of ['word', 'mus']) {
    const v = variantFor(id);
    assert.equal(v.seconds, SHORE_SECONDS);
    assert.ok(v.seconds <= 8, 'straight to the shore');
    assert.equal(v.captions.length, 1, 'one line');
    const start = stateAt(0, { variant: id }), end = stateAt(v.seconds, { variant: id });
    assert.equal(start.traveler.visible, true, 'already standing on the pier');
    assert.deepEqual(start.camera, SKIP.camera, 'seen from the ordinary camera');
    assert.deepEqual(end.landed, LANDED);
    assert.deepEqual(SKIP_BY_VARIANT[id], end);
    assert.deepEqual(eventsOf(id).map(e => e.type), ['landed']);
  }
  assert.match(variantFor('word').captions[0].text, /swam/);
  assert.match(variantFor('mus').captions[0].text, /headland/);
});

test('stateAt is continuous across every beat boundary, in the boat, the eye and where it looks', () => {
  const boundaries = [...BEATS.slice(1).map(b => b.at), PHASES.stand, PHASES.ashore, ...BOAT_PATH.map(k => k.at)];
  for (const b of new Set(boundaries)) {
    if (b <= 0 || b >= SEQUENCE_SECONDS) continue;
    const before = stateAt(b - .01), after = stateAt(b + .01);
    // Twenty milliseconds either side: at five metres a second the boat itself moves a tenth of a metre.
    assert.ok(gap(before.boat, after.boat) < .25, `the boat at ${b}s`);
    const hb = heading(before.boat.yaw), ha = heading(after.boat.yaw);
    assert.ok(Math.hypot(hb.x - ha.x, hb.z - ha.z) < .05, `the heading at ${b}s`);
    assert.ok(gap(before.camera.position, after.camera.position) < .3, `the eye at ${b}s`);
    // The look may be mid-turn at a boundary (the bell to the pier is sixty metres in a second and a
    // half), so a cut is a step that is not like the steps either side of it, not a step at all.
    const atB = stateAt(b);
    const stepIn = gap(before.camera.target, atB.camera.target), stepOut = gap(atB.camera.target, after.camera.target);
    assert.ok(Math.abs(stepIn - stepOut) < .05 && stepIn < 1.5, `the look at ${b}s: ${stepIn.toFixed(3)} then ${stepOut.toFixed(3)}`);
    assert.ok(gap(before.companion, after.companion) < .3, `the companion at ${b}s`);
  }
  // And into the last frame: the crane back to the ordinary camera arrives, it does not cut.
  const last = stateAt(SEQUENCE_SECONDS - .01), end = stateAt(SEQUENCE_SECONDS);
  assert.ok(gap(last.camera.position, end.camera.position) < .1 && gap(last.camera.target, end.camera.target) < .1, 'the camera settles');
  assert.ok(gap(last.companion, end.companion) < .1, 'the companion steps up');
  assert.ok(gap(last.boat, end.boat) < .05, 'the boat has stopped');
  // Past the end is the end; before the start is the start.
  assert.deepEqual(stateAt(SEQUENCE_SECONDS + 100), end);
  assert.deepEqual(stateAt(-5), stateAt(0));
  assert.deepEqual(stateAt(Number.NaN), stateAt(0));
});

test('the view is the traveler’s own: seated in the boat, standing at the end, then the ordinary camera behind them', () => {
  for (const t of [0, 10, 20, 30, 38]) {
    const s = stateAt(t);
    assert.equal(s.traveler.visible, false, 'the traveler is the eye');
    near(gap(s.camera.position, s.boat), Math.hypot(BOAT.seat.right, BOAT.seat.forward, BOAT.seat.eyeSeated), .01, `the eye rides the seat at ${t}s`);
    near(s.camera.position.y, BOAT.float + BOAT.seat.eyeSeated, 1e-9, 'seated eye height');
    assert.ok(gap(s.companion, s.boat) < BOAT.length / 2 + .5 && s.companion.aboard, `the companion is aboard at ${t}s`);
    assert.equal(s.traveler.x, s.camera.position.x, 'the host keeps the traveler at the eye for sound and light');
  }
  // The companion faces forward until the round-up, then turns to face the traveler.
  const early = stateAt(20), late = stateAt(38.5);
  const same = Math.cos(early.companion.yaw - early.boat.yaw), opposite = Math.cos(late.companion.yaw - late.boat.yaw);
  assert.ok(same > .99 && opposite < -.99, `forward then aft: ${same.toFixed(2)}, ${opposite.toFixed(2)}`);
  near(stateAt(PHASES.ashore).camera.position.y, BOAT.float + BOAT.seat.eyeStanding, 1e-6, 'standing by the time the boat is alongside');
  // The eye takes the boat's whole bob aboard, none ashore, and lets go of it through the step up.
  assert.equal(stateAt(20).bobWeight, 1);
  assert.equal(stateAt(PHASES.ashore).bobWeight, 1);
  const midStep = stateAt((PHASES.ashore + PHASES.end) / 2).bobWeight;
  assert.ok(midStep > 0 && midStep < 1, `letting go: ${midStep}`);
  assert.equal(stateAt(SEQUENCE_SECONDS).bobWeight, 0);
  assert.equal(stateAt(3, { variant: 'word' }).bobWeight, 0, 'a shore variant never bobs');
  const end = stateAt(SEQUENCE_SECONDS);
  assert.deepEqual(end.camera, LANDED.camera);
  assert.deepEqual(end.traveler, { visible: true, ...LANDED.traveler });
  // The ordinary camera: nine metres behind at pitch .39, east of the traveler, looking west along the pier.
  const view = LANDED.view;
  near(gap(LANDED.camera.position, LANDED.camera.target), view.distance, 1e-9, 'distance');
  assert.ok(LANDED.camera.position.x > LANDED.traveler.x + 8, 'east of the traveler');
  near(LANDED.camera.position.z, LANDED.traveler.z, 1e-9, 'square behind');
  near(Math.asin((LANDED.camera.position.y - LANDED.camera.target.y) / view.distance), view.pitch, 1e-9, 'pitch');
  assert.ok(heading(LANDED.traveler.yaw).x < -.99, 'the traveler faces west, up the pier');
  assert.ok(world.heightAt(LANDED.camera.position.x, LANDED.camera.position.z) < LANDED.camera.position.y - 1.2, 'the camera is not pushed up by the ground');
});

test('the companion lands where the roster puts the first man who waits at the landing', () => {
  const road = [world.spawn, { x: world.spawn.x - 100, z: world.spawn.z }];
  const company = createMercenaryCompany({ road, muster: road[1], landing: world.spawn });
  const first = company.placements(0).find(p => p.id === 'merc-gotwood');
  assert.equal(first.phase, 'landing');
  near(first.x, LANDED.companion.x, 1e-9, 'x'); near(first.z, LANDED.companion.z, 1e-9, 'z');
  near(Math.cos(first.yaw - LANDED.companion.yaw), 1, 1e-9, 'facing');
  near(world.heightAt(LANDED.companion.x, LANDED.companion.z), SPAWN.y, 1e-9, 'on the deck, not the harbour floor');
  assert.ok(canStand(LANDED.companion.x, LANDED.companion.z, world), 'and standing');
});

test('the events fire once each, in order, and skipping fires whatever is left', () => {
  assert.deepEqual(eventsOf().map(e => e.type), ['bell', 'companion-turns', 'stand', 'ashore', 'landed']);
  assert.deepEqual(eventsOf().map(e => e.at), [30, PHASES.companionTurns, PHASES.stand, PHASES.ashore, SEQUENCE_SECONDS]);
  const bell = eventsOf().find(e => e.type === 'bell');
  assert.ok(bell.at > 20 && bell.at < SEQUENCE_SECONDS - 10, 'the bell is heard from the water, well before the pier');
  const fired = [];
  for (let last = 0, t = .1; t <= SEQUENCE_SECONDS + .1; last = t, t += .1) fired.push(...eventsBetween(last, t));
  assert.deepEqual(fired.map(e => e.type), eventsOf().map(e => e.type), 'stepping the clock fires each once');
  assert.deepEqual(eventsBetween(30, 30).length, 0, 'the window is open at the start and closed at the end');
  assert.deepEqual(eventsBetween(29.9, 30).map(e => e.type), ['bell']);
  assert.deepEqual(eventsBetween(12, Infinity).map(e => e.type), ['bell', 'companion-turns', 'stand', 'ashore', 'landed'], 'a skip at 12 s rings the bell');
  assert.deepEqual(eventsBetween(41, Infinity).map(e => e.type), ['ashore', 'landed']);
});

test('SKIP is the end of the sequence, exactly', () => {
  assert.deepEqual(SKIP, stateAt(SEQUENCE_SECONDS));
  assert.equal(SKIP.done, true);
  assert.equal(SKIP.caption, null);
  assert.deepEqual(SKIP.landed, LANDED);
  assert.deepEqual(SKIP_BY_VARIANT.standard, SKIP);
  assert.ok(Object.isFrozen(SKIP) && Object.isFrozen(LANDED) && Object.isFrozen(LANDED.toast));
  near(flat(SKIP.boat, BOAT_REST), 0, 1e-9, 'the boat at its berth');
  assert.equal(SKIP.boat.moving, false);
  near(boatBob(0), 0, 1e-12, 'the bob is the world’s, starting level');
  near(boatBob(Math.PI / 2 / .72), .085, 1e-9, 'and its amplitude');
});

test('the world lets the host move the arrival boat and put it back', () => {
  const rest = world.arrivalBoatPose();
  near(flat(rest, BOAT_REST), 0, 1e-9, 'it rests at the berth'); near(Math.cos(rest.yaw - BOAT_REST.yaw), 1, 1e-9, 'bow east');
  world.placeArrivalBoat(100, 50, 1); const moved = world.arrivalBoatPose();
  near(moved.x, 100, 1e-9, 'x'); near(moved.z, 50, 1e-9, 'z'); near(moved.yaw, 1, 1e-9, 'yaw');
  world.restArrivalBoat(); near(flat(world.arrivalBoatPose(), BOAT_REST), 0, 1e-9, 'and back');
});

test('the host is wired to the sequence: the caption layer, the Skip button, and every way out of it', () => {
  // The page and the stylesheet the sequence writes into (docs/opening-sequence-build.md step 2).
  const page = file('index.html'), css = file('src/adventure.css'), main = file('src/main.js');
  for (const id of ['cutscene', 'cutscene-eyebrow', 'cutscene-text', 'skip-cutscene']) {
    assert.ok(page.includes(`id="${id}"`), `index.html has #${id}`);
  }
  assert.match(page, /<div id="cutscene" class="hidden"/, 'the layer starts hidden');
  assert.match(css, /#cutscene \{[^}]*pointer-events:none/, 'the layer does not eat clicks');
  assert.match(css, /#skip-cutscene \{[^}]*pointer-events:auto/, 'but the Skip button does');
  assert.match(css, /body\.cutscene #location[^{]*\{display:none!important;\}/, 'and the HUD is out of the way');

  // The drive: the clock, the events, the boat, the companion and the eye, every frame.
  assert.match(main, /import \{ stateAt, eventsBetween, variantFor, boatBob, SKIP_BY_VARIANT \} from '\.\/opening-sequence\.js'/);
  assert.match(main, /opening=variantFor\(playerId\)/, 'which of the eleven you are picks the variant');
  assert.match(main, /world\.placeArrivalBoat\(s\.boat\.x,s\.boat\.z,s\.boat\.yaw\)/, 'the boat follows the path');
  assert.match(main, /eventsBetween\(openingFired,openingTime,opening\.id\)/, 'and each event fires once');
  // The bell rings from the sequence at thirty seconds and nowhere else.
  assert.doesNotMatch(main.slice(main.indexOf('function begin()'), main.indexOf('function landOpening')), /ringBell/,
    'Step ashore no longer rings the bell');
  assert.equal(main.split('openingBells++').length - 1, 2, 'the bell is counted wherever the sequence rings it');

  // Skipping, and every way in that is not the boat, put the harbour back as it was built.
  assert.match(main, /function leaveOpening\(\)\{opening=null;world\.restArrivalBoat\(\);player\.group\.visible=true;/);
  assert.equal(main.split('leaveOpening();').length - 1 >= 5, true, 'Continue, the newest chapter and the test hooks all use it');
  assert.match(main, /\$\('skip-cutscene'\)\.onclick=skipOpening;/);
  assert.match(main, /if\(mode==='arriving'\)\{e\.preventDefault\(\);skipOpening\(\);return;\}/, 'Esc lands you');
  assert.match(main, /if\(autopilot\.active\)skipOpening\(\)/, 'and the computer does not sit through it');

  // The clock the mercenary roster counts by does not run while the boat is still coming in.
  assert.match(main, /if\(!\['opening','pause','arriving'\]\.includes\(mode\)&&!reviewFrozen\)playSeconds\+=dt;/);
  // The camera is the eye exactly, with no lerp behind it.
  assert.match(main, /else if\(mode==='arriving'&&opening\)\{cameraTarget\.copy\(openingCamera\.position\);cameraFocus\.copy\(openingCamera\.target\);camera\.position\.copy\(cameraTarget\);\}/);
  // 'arriving' keeps its name: src/autopilot.js answers wait for it and the vitals stay hidden.
  assert.match(file('src/autopilot.js'), /arriving/);
});

test('the boat starts a long way out and the sequence ends it at the berth', () => {
  // What the title screen shows, and what the harness checks after Skip.
  const start = stateAt(0);
  assert.ok(Math.hypot(start.boat.x - world.spawn.x, start.boat.z - world.spawn.z) > 100, 'out in the roads');
  assert.equal(start.traveler.visible, false, 'and nobody is drawn on the title screen');
  for (const id of VARIANT_IDS) {
    const end = SKIP_BY_VARIANT[id];
    near(flat(end.boat, BOAT_REST), 0, 1e-9, `${id} moors the boat`);
    assert.equal(end.done, true, `${id} is over`);
    assert.equal(end.landed.toast.kicker, 'SPEAK TO MARA AT THE HEAD OF THE PIER', `${id} sends you to Mara`);
    assert.equal(end.companion.aboard, false, `${id} puts the companion on the deck`);
    assert.ok(canStand(end.companion.x, end.companion.z, world), `${id} puts him on footing`);
  }
});

/** Everywhere the traveler can stand and still be close enough to speak to somebody at `at`. */
function talkableSpots(at, reach) {
  const spots = [];
  for (let x = at.x - reach; x <= at.x + reach + 1e-9; x += .1) {
    for (let z = at.z - reach; z <= at.z + reach + 1e-9; z += .1) {
      if (Math.hypot(x - at.x, z - at.z) > reach) continue;
      if (canStand(x, z, world)) spots.push({ x: +x.toFixed(4), z: +z.toFixed(4) });
    }
  }
  return spots;
}

test('the man off your boat is within earshot everywhere you can stand to speak to Mara', () => {
  // The bug hunter measured this before he walked with you: from all 443 standable spots in her
  // talk range he was 20.5–27.0 m away, because he waited at the landing ring and
  // INTERPRETER.range is 12. The aside never showed, so the first conversation of the game — the
  // one that teaches you what an interpreter is for — was unreadable. Now he is at your shoulder.
  const mara = { x: PIER_HEAD.x, z: PIER_HEAD.z };
  const TALK = 3.3;  // src/main.js picks the nearest npc inside this, in metres
  const spots = talkableSpots(mara, TALK);
  assert.ok(spots.length > 300, `only ${spots.length} standable spots in Mara's talk range`);
  const standable = (x, z) => canStand(x, z, world);
  let placed = 0, heard = 0, worst = 0;
  for (const spot of spots) {
    // Whichever way the traveler happens to be facing when he speaks to her.
    for (let turn = 0; turn < 8; turn++) {
      const mate = escortSpotFor({ ...spot, yaw: turn * Math.PI / 4 }, standable);
      if (!mate) continue;
      placed++;
      assert.ok(standable(mate.x, mate.z), `he is over water at ${mate.x}, ${mate.z}`);
      const gap = Math.hypot(mate.x - spot.x, mate.z - spot.z);
      worst = Math.max(worst, gap);
      if (gap <= INTERPRETER.range) heard++;
    }
  }
  assert.equal(placed, spots.length * 8, 'there is ground for him from every spot and every facing');
  assert.equal(heard, placed, 'and he is inside the interpreter range from every one of them');
  assert.ok(worst < INTERPRETER.range, `the furthest he ever stands is ${worst.toFixed(2)} m`);
});

test('he walks the whole pier at your shoulder without once stepping off it', () => {
  // The pier deck is the only ground between the boat and the shore, and it is three metres
  // wide. Walking its length in both directions is the escort's whole job.
  const standable = (x, z) => canStand(x, z, world);
  assert.ok(ESCORT_OFFSETS.length >= 4 && ESCORT_OFFSETS.every(o => Math.hypot(o.lateral, o.back) < 2),
    'he keeps to arm’s length, or he is not at your shoulder');
  let steps = 0;
  for (let x = SPAWN.x; x >= PIER_HEAD.x - 1e-9; x -= .25) {
    if (!canStand(x, SPAWN.z, world, BODY.traveler)) continue;
    for (const yaw of [-Math.PI / 2, Math.PI / 2]) {  // west up the pier, and back east
      const mate = escortSpotFor({ x, z: SPAWN.z, yaw }, standable);
      assert.ok(mate, `nowhere for him beside the traveler at ${x.toFixed(2)}, ${SPAWN.z}`);
      assert.ok(standable(mate.x, mate.z), `he is over water at ${mate.x}, ${mate.z}`);
      steps++;
    }
  }
  assert.ok(steps > 40, `only ${steps} places checked along the pier`);
  // And escortSpotFor is honest about nowhere: over open water it answers null rather than guess.
  assert.equal(escortSpotFor({ x: 200, z: 60, yaw: 0 }, standable), null);
  assert.equal(escortSpotFor(null, standable), null);
});
