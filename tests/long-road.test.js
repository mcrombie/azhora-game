import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import {
  LONG_ROAD_VERSION, LONG_ROAD_LEGS, LONG_ROAD_STOPS, LONG_ROAD_STOP_IDS, LONG_ROAD_SPINE, DRILL_COUNT, DRILL_EXPOSURE,
  NOTICE_RANGE, DRENT_GROUNDS, drentCharted, longRoadStop, stopGround, createLongRoad, validateLongRoadSnapshot,
  VILLAGE_CORNERS, CORNERS_XP, cornersWalked, LANDINGS, LANDING_KEYS, landingAt, DRILLS, drillFor, drillScene, DRILL_LANGUAGE,
  GROUND_PREFIX, isGround, groundOfSighting, longRoadStop as stopById,
  companionPace, COMPANION_REACH, TRAVELER_RUN, knowsAlready, RECOGNISED, recognisedAt, PLAY_TROUPE_STOP,
} from '../src/long-road.js';
import { TROUPE_STOPS } from '../src/troupe.js';
import { PLAYABLE_IDS, startingSkills } from '../src/player-characters.js';
import { LONG_ROAD_STOPS as ALL_STOPS } from '../src/long-road.js';
import { ARRIVALS } from '../src/mercenaries.js';
import { MAIN_ROAD } from '../src/region-world.js';
import { renderLine } from '../src/linguist.js';
import { SUBREGION_IDS, subregionsAt } from '../src/map-fog.js';
import { MERCENARY_ROSTER } from '../src/mercenaries.js';
import { SKILLS } from '../src/skills.js';

/** Everything the world would say if the traveler had done the whole of Drent. */
const ALL_SKILLS = ['cartography', 'birding', 'cooking', 'fishing', 'woodcutting', 'construction', 'mycology', 'archaeology', 'botany', 'geology', 'farming'];
const everything = (over = {}) => ({
  skills: ALL_SKILLS, acornQuest: 'complete',
  journey: { courierComplete: true, bridgeComplete: true },
  mapFog: { found: [...SUBREGION_IDS], knowsPoint: () => true }, linguist: { drentish: 62, ambroni: 54 },
  companion: { with: true }, ...over,
});
const nothing = (over = {}) => ({ skills: [], acornQuest: 'available', journey: {},
  mapFog: { found: [], knowsPoint: () => false }, linguist: {}, ...over });
/** The three things the long road keeps itself, done: the fork, the play and Mara's countersign. */
const itsOwn = (road, world = everything()) => { road.act('told'); road.act('played'); road.act('corners-ask'); road.act('corners-sign', world); };
const ground = point => subregionsAt(point.x, point.z)[0]?.id ?? null;

test('every stop names a leg, a kind, a named ground and the view that says it is done', () => {
  assert.equal(new Set(LONG_ROAD_STOP_IDS).size, LONG_ROAD_STOPS.length, 'no id twice');
  const views = new Set(['skills', 'acornQuest', 'journey', 'mapFog', 'linguist', 'longRoad']);
  for (const row of LONG_ROAD_STOPS) {
    assert.ok(Number.isInteger(row.leg) && row.leg >= 0 && row.leg <= 5, row.id + ' belongs to a leg');
    assert.ok(['spine', 'branch'].includes(row.kind), row.id + ' is spine or branch');
    assert.ok(row.npc || row.place, row.id + ' is somebody or somewhere');
    assert.ok(row.skill || row.system, row.id + ' teaches something or is something');
    assert.ok(!row.skill || Object.hasOwn(SKILLS, row.skill) || row.skill === 'farming', row.id + ' names a real skill');
    assert.ok(row.subregion === null || SUBREGION_IDS.includes(row.subregion), row.id + ' stands in a named ground, or in none');
    assert.ok(views.has(row.reads), row.id + ' names a view: ' + row.reads);
    assert.equal(typeof row.done, 'function', row.id + ' derives its own done');
    assert.ok(Number.isFinite(row.point.x) && Number.isFinite(row.point.z), row.id + ' is somewhere in the world');
    assert.ok(row.title && row.detail, row.id + ' says what it is');
  }
  // The point a stop is remembered by is in the ground it claims, so the muster's line is true.
  for (const row of LONG_ROAD_STOPS) {
    if (row.id === 'east-rena-stone' || row.id === 'scouts-camp') continue;   // a stone and a camp, not a stand
    const areas = subregionsAt(row.point.x, row.point.z).map(area => area.id);
    assert.ok(row.subregion === null ? areas.length === 0 : areas.includes(row.subregion),
      `${row.id} claims ${row.subregion} and stands in [${areas}]`);
  }
  assert.equal(LONG_ROAD_STOPS.filter(row => row.subregion === null).map(row => row.id).join(), 'silas-stream',
    'the Toll House stream is the one stop the chart has no name for');
  assert.equal(LONG_ROAD_LEGS.length, 6, 'the harbour and five legs, one for each boat that lands');
  for (const leg of LONG_ROAD_LEGS) assert.ok(LONG_ROAD_STOPS.some(row => row.leg === leg.leg && row.kind === 'spine'), leg.title + ' has a spine');
  assert.ok(LONG_ROAD_SPINE.length >= 15, 'seventeen lessons, near enough: ' + LONG_ROAD_SPINE.length);
});

test('a stop is done when the world says so, and the long road never writes to the world', () => {
  const road = createLongRoad();
  const empty = road.view(nothing());
  assert.equal(empty.spine.done, 0, 'a traveler who has done nothing has closed nothing');
  assert.equal(empty.next.id, LONG_ROAD_SPINE[0].id, 'the open gold starts at the head of the pier');
  assert.equal(empty.finished, false);
  // Learning birding anywhere, by any road, closes the bird garden. Nobody tells this module.
  const birder = road.view(nothing({ skills: ['birding'] }));
  assert.equal(birder.stop('bird-garden').done, true);
  assert.equal(birder.stop('lysa-acorns').done, false);
  assert.equal(road.view(nothing({ acornQuest: { status: 'complete' } })).stop('lysa-acorns').done, true);
  assert.equal(road.view(nothing({ journey: { courierComplete: true } })).stop('corvan-register').done, true);
  const signed = createLongRoad();
  signed.act('corners-ask'); signed.act('corners-sign', everything());
  assert.equal(signed.view(nothing()).stop('village-corners').done, true, 'her countersign is what closes it');
  assert.equal(road.view(nothing({ linguist: { level: id => id === 'drentish' ? 50 : 0 } })).stop('east-rena-stone').done, true);
  assert.equal(road.view(nothing({ linguist: { level: () => 49 } })).stop('east-rena-stone').done, false);
  // All of it done but the two the long road keeps itself.
  const all = road.view(everything());
  assert.equal(all.stop('the-fork').done, false, 'the fork is this module’s own');
  assert.equal(all.stop('fernway-play').done, false, 'so is the play');
  assert.equal(all.stop('village-corners').done, false, 'and so is Mara’s countersign');
  assert.equal(all.next.id, 'the-fork');
});

test('the open gold moves down the spine in order and the legs close behind it', () => {
  const road = createLongRoad();
  // The spine is the curriculum, so it is walked leg by leg and never doubles back.
  const legs = LONG_ROAD_SPINE.map(row => row.leg);
  for (let i = 1; i < legs.length; i++) assert.ok(legs[i] >= legs[i - 1], 'the spine is in leg order');
  assert.equal(road.view(nothing()).next.id, 'pier-chart', 'the first gold is Mara’s');
  // Give the world everything but one stop, and that stop is what the open gold points at.
  road.act('told'); road.act('corners-ask'); road.act('corners-sign', everything());
  assert.equal(road.view(everything()).next.id, 'fernway-play', 'the play is the only thing left');
  road.act('played');
  const done = road.view(everything());
  assert.equal(done.next, null, 'nothing left to point at');
  assert.deepEqual(done.legs.map(leg => leg.done), [true, true, true, true, true, true]);
  assert.equal(done.spine.done, done.spine.of);
  assert.equal(done.finished, false, 'the drills are part of the walk');
});

test('a drill closes a leg, is never given twice, and is refused to a traveler walking alone', () => {
  const road = createLongRoad();
  itsOwn(road);
  const alone = everything({ companion: false });
  assert.equal(road.view(alone).drill, null, 'nobody to give it');
  assert.equal(road.act('drill', alone).ok, false, 'and it is refused, not skipped');
  const withHim = everything();
  for (let i = 1; i <= DRILL_COUNT; i++) {
    const offer = road.view(withHim).drill;
    assert.deepEqual([offer.index, offer.leg, offer.exposure], [i, i, DRILL_EXPOSURE], 'drill ' + i + ' closes leg ' + i);
    assert.equal(road.act('drill', withHim).ok, true);
  }
  assert.equal(road.view(withHim).drill, null, 'five is all he has');
  assert.equal(road.act('drill', withHim).ok, false);
  assert.equal(road.drills, DRILL_COUNT);
  assert.equal(road.view(withHim).finished, true, 'the whole of it walked');
  // 175 taught is Ambroni 51 with what is heard on the road: docs/drent-long-road.md §6.
  assert.equal(DRILL_COUNT * DRILL_EXPOSURE, 175);
});

test('a drill waits on its own leg, so the fourth is not offered at Fernway', () => {
  const road = createLongRoad();
  road.act('told');
  // Leg 1 done, nothing after it: one drill, and no second.
  const leg1 = { skills: ['cartography', 'birding'], acornQuest: 'complete', journey: {},
    mapFog: { found: [...SUBREGION_IDS], knowsPoint: () => true }, linguist: {}, companion: true };
  road.act('corners-ask'); road.act('corners-sign', leg1);
  assert.equal(road.view(leg1).drill.index, 1);
  assert.equal(road.act('drill', leg1).ok, true);
  assert.equal(road.view(leg1).drill, null, 'leg two is not walked yet');
});

test('the fork and the play are told once and refuse to be told twice', () => {
  const road = createLongRoad();
  const heard = [];
  const spoken = createLongRoad({ onEvent: event => heard.push(event.type) });
  assert.equal(road.act('told').ok, true);
  assert.equal(road.act('told').ok, false, 'a man says it once');
  assert.equal(road.view(nothing()).stop('the-fork').done, true);
  assert.equal(road.act('played').ok, true);
  assert.equal(road.act('played').ok, false);
  spoken.act('told'); spoken.act('played');
  assert.deepEqual(heard, ['long-road-told', 'long-road-played'], 'the host is told, and decides what it means');
  assert.equal(road.act('nothing-of-the-kind').ok, false);
});

test('Mara asks for the three corners, and signs the chart only when all three are walked', () => {
  // Her second cartography lesson. The first was the rough chart she hands over on the pier,
  // which is somebody else's drawing; this is the traveler's own ground, walked.
  const road = createLongRoad();
  assert.equal(VILLAGE_CORNERS.length, 3);
  assert.deepEqual(VILLAGE_CORNERS.map(corner => corner.id), ['pier', 'weatherhead', 'koopwood']);
  for (const corner of VILLAGE_CORNERS) assert.ok(corner.name && corner.hint && Number.isFinite(corner.x), corner.id);
  const nowhere = nothing(), everywhere = everything();
  assert.equal(road.corners(nowhere).stage, 'unasked');
  assert.equal(road.act('corners-sign', everywhere).ok, false, 'she has to ask first');
  assert.equal(road.act('corners-ask').ok, true);
  assert.equal(road.act('corners-ask').ok, false, 'and she asks once');
  assert.equal(road.corners(nowhere).canSign, false, 'nothing walked');
  assert.equal(road.corners(nowhere).walked, 0);
  assert.equal(road.act('corners-sign', nowhere).ok, false, 'a chart with nothing on it is not signed');
  // Two of the three is two of the three.
  const two = nothing({ mapFog: { found: [], knowsPoint: (x, z) => Math.hypot(x - 0, z - 25) < 3 || Math.hypot(x - 2, z - 102) < 3 } });
  assert.equal(road.corners(two).walked, 2);
  assert.equal(road.act('corners-sign', two).ok, false);
  const signed = road.act('corners-sign', everywhere);
  assert.deepEqual(signed, { ok: true, xp: CORNERS_XP });
  assert.equal(road.act('corners-sign', everywhere).ok, false, 'and it pays once');
  assert.equal(road.corners(everywhere).signed, true);
  assert.equal(road.view(nothing()).stop('village-corners').done, true, 'the ground stays walked whatever else happens');
});

test('the three corners are places the chart can tell you it has the ground of', () => {
  // The chart cannot name the Weatherhead or the Koopwood - neither is a landmark or a named
  // ground - so the errand is keyed to the fog's own answer at each of the three points.
  const walked = cornersWalked({ mapFog: { knowsPoint: (x, z) => x < -20 } });
  assert.deepEqual(walked.map(corner => corner.walked), [false, false, true]);
  assert.deepEqual(cornersWalked({}).map(corner => corner.walked), [false, false, false], 'no chart, nothing walked');
  assert.equal(CORNERS_XP > 0, true);
});

test('Chris goes back on the clock from a moment and a place, or not at all', () => {
  const road = createLongRoad();
  assert.equal(road.released, null, 'he is beside you until he is not');
  assert.equal(road.act('release', { at: 4800 }).ok, false, 'a second with no place');
  assert.equal(road.act('release', { distance: 620 }).ok, false, 'a place with no second');
  assert.equal(road.act('release', { at: -1, distance: 620 }).ok, false, 'and never before the game began');
  assert.deepEqual(road.act('release', { at: 4800, distance: 620 }), { ok: true, releasedAt: 4800, releasedDistance: 620 });
  assert.deepEqual(road.released, { releasedAt: 4800, releasedDistance: 620 });
  assert.equal(road.act('release', { at: 5000, distance: 700 }).ok, false, 'he has gone');
  assert.equal(road.view(everything()).companionWith, false, 'and cannot give you a drill from the road');
  assert.equal(road.view(everything()).drill, null);
  assert.equal(road.act('recall').ok, true, 'until the march, he can be asked back');
  assert.equal(road.released, null);
  assert.equal(road.act('recall').ok, false);
});

test('a mercenary is noticed once, on his feet, in your ground or within forty metres', () => {
  const road = createLongRoad();
  const at = { x: -102, z: 8.6 };                       // Bran's ledge at Willowmere
  const walking = (id, x, z, phase = 'walking') => ({ id, name: id, phase, x, z });
  // Still on the water, or already counted at the camp: neither is somebody going past you.
  assert.deepEqual(road.notice([walking('merc-word', -102, 9, 'landing'), walking('merc-matt', -102, 9, 'mustered'),
    walking('merc-altun', -102, 9, 'coming')], at, ground), []);
  // Two hundred metres up the road in country of his own: not noticed.
  assert.deepEqual(road.notice([walking('merc-lakota', -300, 60)], at, ground), []);
  const seen = road.notice([walking('merc-word', -85, 20)], at, ground);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].id, 'merc-word');
  assert.ok(seen[0].metres <= NOTICE_RANGE);
  assert.deepEqual(road.notice([walking('merc-word', -85, 20)], at, ground), [], 'once in a game');
  assert.equal(road.notice([walking('nobody-at-all', -102, 9)], at, ground).length, 0, 'and he has to be one of the company');
  // Sharing the traveler's own named ground counts however far off in it he is. The Avrel
  // clearing is a hundred and fifty metres across, and a man crossing it has gone past you.
  const clearing = { x: -415.4, z: 17.8 };
  const far = road.notice([walking('merc-lakota', -421, 90)], clearing, ground);
  assert.equal(far.length, 1, 'one ground, one passing');
  assert.equal(far[0].shared, true);
  assert.ok(far[0].metres > NOTICE_RANGE, 'and it was not the forty metres that did it');
});

test('what is remembered is the stop the traveler was nearest, which is his line at the muster', () => {
  const road = createLongRoad();
  const near = (point, id) => {
    const fresh = road.notice([{ id, name: id, phase: 'walking', x: point.x + 2, z: point.z + 2 }], point, ground);
    return fresh[0]?.stopId;
  };
  assert.equal(near({ x: -102, z: 8.6 }, 'merc-word'), 'bran-rod', 'up to your knees in a pond');
  assert.equal(near({ x: -128.4, z: 39.6 }, 'merc-eliana'), 'odger-fernway', 'at the bench with a basket');
  assert.equal(near({ x: -415, z: 18 }, 'merc-matt'), 'corvan-register', 'at the quartermaster’s table');
  assert.equal(near({ x: -482, z: 38 }, 'merc-altun'), 'nell-hedge', 'in a hedge');
  assert.equal(road.seenAt('merc-word'), 'bran-rod');
  assert.equal(road.seenAt('merc-jerry'), null, 'nobody remembers a man they never saw');
  assert.equal(road.nearestStop(null), null);
});

test('the save carries what cannot be derived, and refuses what the long road would never have written', () => {
  const road = createLongRoad();
  itsOwn(road);
  road.act('drill', everything()); road.act('drill', everything());
  road.notice([{ id: 'merc-lakota', name: 'Lakota', phase: 'walking', x: -100, z: 10 }], { x: -102, z: 8.6 }, ground);
  road.act('release', { at: 4800, distance: 620 });
  const saved = road.snapshot();
  assert.equal(saved.version, LONG_ROAD_VERSION);
  assert.ok(validateLongRoadSnapshot(saved), 'a validator that refuses its own output loses the player’s save');
  const back = createLongRoad();
  assert.equal(back.restore(saved), true);
  assert.deepEqual(back.snapshot(), saved);
  assert.equal(back.view(everything()).told, true);
  assert.equal(back.seenAt('merc-lakota'), 'bran-rod');
  assert.deepEqual(back.released, { releasedAt: 4800, releasedDistance: 620 });
  // Old saves have none of this at all, and that is a game that never walked the long road.
  assert.equal(validateLongRoadSnapshot(undefined), true);
  assert.equal(validateLongRoadSnapshot(undefined, { allowMissing: false }), false);
  const bad = extra => validateLongRoadSnapshot({ ...saved, ...extra });
  assert.equal(bad({ drills: 6 }), false, 'there is no sixth drill');
  assert.equal(bad({ drills: -1 }), false);
  assert.equal(bad({ drills: 2.5 }), false);
  assert.equal(bad({ seenAt: { 'merc-lakota': 'not-a-stop' } }), false, 'an unknown stop');
  assert.equal(bad({ seenAt: { nobody: 'bran-rod' } }), false, 'an unknown man');
  assert.equal(bad({ chris: { releasedAt: 4800 } }), false, 'a release with no place');
  assert.equal(bad({ chris: { releasedDistance: 620 } }), false, 'a release with no moment');
  assert.equal(bad({ chris: null }), true, 'he is simply still with you');
  assert.equal(bad({ told: 1 }), false);
  assert.equal(bad({ corners: 'nearly' }), false, 'a stage she has no word for');
  assert.equal(bad({ corners: undefined }), true, 'a save from before she asked is simply unasked');
  assert.equal(bad({ version: 2 }), false);
  // A refused save leaves the module empty rather than half filled.
  const fresh = createLongRoad();
  assert.equal(fresh.restore({ ...saved, drills: 9 }), false);
  assert.equal(fresh.view(nothing()).drills, 0);
  assert.equal(fresh.released, null);
});

test('every man on the roster can be remembered, and Drent has nine grounds to chart', () => {
  const road = createLongRoad();
  for (const mercenary of MERCENARY_ROSTER) {
    road.notice([{ id: mercenary.id, name: mercenary.name, phase: 'stopped', x: -102, z: 9 }], { x: -102, z: 8.6 }, ground);
  }
  assert.equal(Object.keys(road.snapshot().seenAt).length, MERCENARY_ROSTER.length);
  assert.ok(validateLongRoadSnapshot(road.snapshot()));
  assert.equal(DRENT_GROUNDS.length, 9, 'Mara signs your chart when all nine are on it');
  for (const id of DRENT_GROUNDS) assert.ok(SUBREGION_IDS.includes(id), id);
  assert.equal(drentCharted({ mapFog: DRENT_GROUNDS }), true);
  assert.equal(drentCharted({ mapFog: DRENT_GROUNDS.slice(1) }), false);
  assert.equal(stopGround('bran-rod').name, 'Willowmere');
  assert.equal(longRoadStop('nothing'), null);
});

test('a boat landing is announced, in the traveler\u2019s own notes and in the companion\u2019s mouth', () => {
  // Two of the five cannot be seen from where the player is meant to be, and the bell is silent
  // until somebody clicks Sound, so what reaches every player is the caption and the remark.
  assert.equal(LANDINGS.length, 5, 'five boats, five legs');
  assert.deepEqual(LANDINGS.map(entry => entry.at),
    [ARRIVALS.word, ARRIVALS.riders, ARRIVALS.lakota, ARRIVALS.eliana, ARRIVALS.princes],
    'the clock\u2019s own seconds and no others');
  for (const entry of LANDINGS) {
    assert.ok(entry.title === entry.title.toUpperCase(), entry.key + ' has a kicker');
    assert.ok(entry.caption.length > 20 && entry.said.length > 20, entry.key + ' says something either way');
  }
  assert.match(LANDINGS.at(-1).caption, /last boat|no more boats/i, 'the fifth is the one that matters');
});

test('the clock owes each landing once, and a game loaded past one owes nothing', () => {
  assert.equal(landingAt(0), null, 'nothing at the start');
  assert.equal(landingAt(359), null);
  assert.equal(landingAt(360).key, 'word');
  assert.equal(landingAt(1079, 'word'), null, 'said once');
  assert.equal(landingAt(1080, 'word').key, 'riders');
  // Loading a save at minute fifty: everything up to then has already happened, so the next
  // thing owed is the next boat and not four bells at once.
  const caughtUp = landingAt(3000);
  assert.equal(caughtUp.key, 'eliana', 'the latest one passed, not the earliest');
  assert.equal(landingAt(3000, 'eliana'), null, 'and then nothing until the princes');
  assert.equal(landingAt(3780, 'eliana').key, 'princes');
  assert.equal(landingAt(99999, 'princes'), null, 'there is no sixth boat');
  assert.equal(landingAt(NaN), null);
  assert.deepEqual(LANDING_KEYS, ['word', 'riders', 'lakota', 'eliana', 'princes']);
});

test('a drill is six lines of the army\u2019s speech with what each one means, and never a quiz', () => {
  assert.equal(DRILLS.length, DRILL_COUNT);
  for (const entry of DRILLS) {
    assert.equal(entry.lines.length, 6, `drill ${entry.index} is six lines`);
    assert.equal(entry.leg, entry.index, 'one drill closes one leg');
    assert.ok(entry.title && entry.opening.length > 30 && entry.closing.length > 20, `drill ${entry.index} has a scene round it`);
    for (const line of entry.lines) assert.ok(line.length > 2 && line.length < 60, `"${line}" is a thing somebody shouts`);
  }
  assert.equal(new Set(DRILLS.flatMap(entry => entry.lines)).size, DRILL_COUNT * 6, 'thirty lines, none of them twice');
  assert.equal(drillFor(6), null);
  // The tongue is the game's own: the line is rendered by the same renderer as every other
  // line of speech, and what the drill adds is the English under it.
  const scene = drillScene(1, { render: line => renderLine(line, 'ambroni', { full: true }) });
  assert.equal(scene.lines.length, 6);
  assert.equal(scene.lines[0].means, DRILLS[0].lines[0]);
  assert.notEqual(scene.lines[0].said, scene.lines[0].means, 'it is said in Ambroni');
  assert.deepEqual(scene.study, { language: DRILL_LANGUAGE, exposure: DRILL_EXPOSURE });
  assert.equal(drillScene(9), null);
});

test('when the traveler is Chris the same drill runs the other way round, and pays the same', () => {
  const his = drillScene(1, { name: 'Cromb the Barbarian' });
  const hers = drillScene(1, { name: 'Cromb the Barbarian', asChris: true });
  assert.deepEqual(his.lines, hers.lines, 'the same six lines');
  assert.deepEqual(his.study, hers.study, 'and the same thirty-five');
  assert.notEqual(his.opening, hers.opening, 'but a different mouth asks');
  assert.match(hers.opening, /Cromb the Barbarian/);
  assert.match(hers.opening, /You have the Ambroni/, 'because the traveler is the one who has it');
});

test('the companion keeps up with a running traveler, and the set-down is left for walls and boats', () => {
  // His top pace used to be 6.4 against a traveler's 7.2, so the gap opened at 0.8 m/s and hit
  // the forty-metre set-down after about fifty seconds of unbroken running - three times over on
  // the length of Drent's road - and the player watched him pop to their shoulder over and over.
  assert.equal(COMPANION_REACH.setDown, 40);
  assert.equal(companionPace(0), COMPANION_REACH.walk, 'at your shoulder he walks');
  assert.equal(companionPace(COMPANION_REACH.stride), COMPANION_REACH.walk);
  assert.ok(companionPace(COMPANION_REACH.stride + .01) > TRAVELER_RUN, 'and past a stride he runs, harder than you do');
  assert.ok(companionPace(30) > companionPace(6), 'the further behind, the harder he comes');
  assert.ok(companionPace(500) <= TRAVELER_RUN + 2.5, 'and never at a sprint nobody could watch');
  // The whole road, run without stopping. The bug hunter measured the old pace along this exact
  // polyline: over 1,668 m the gap reached 40.0 m and Chris was set down beside the traveler
  // four times. The answer that matters is zero.
  const road = MAIN_ROAD.map(point => ({ x: point.x, z: point.z }));
  let leg = 1, along = 0, gap = 0, setDowns = 0, walked = 0;
  const legLength = i => Math.hypot(road[i].x - road[i - 1].x, road[i].z - road[i - 1].z);
  for (let t = 0; t < 6000 && leg < road.length; t++) {
    const dt = .1, step = TRAVELER_RUN * dt;
    along += step; walked += step;
    while (leg < road.length && along >= legLength(leg)) { along -= legLength(leg); leg++; }
    gap += step;                                       // the traveler pulls away
    gap = Math.max(0, gap - companionPace(gap) * dt);   // and he answers
    if (gap > COMPANION_REACH.setDown) { setDowns++; gap = 0; }
  }
  assert.ok(walked > 1600, `the run covered ${walked.toFixed(0)} m of the 1,668 m road`);
  assert.equal(setDowns, 0, `he was set down ${setDowns} times over the length of the road`);
  assert.ok(gap < COMPANION_REACH.stride + 2, `he settles a stride behind, not ${gap.toFixed(1)} m`);
  // A horse canters at 13 m/s (RIDE, src/riding.js), which nobody runs down. That is what the
  // set-down is for, and he reaches it inside a minute of cantering.
  let mounted = 0, seconds = 0;
  while (mounted <= COMPANION_REACH.setDown && seconds < 600) { mounted += (13 - companionPace(mounted)) * .1; seconds += .1; }
  assert.ok(mounted > COMPANION_REACH.setDown, 'a rider does leave him, and he is set down beside them');
  assert.ok(seconds < 60, `and it takes ${seconds.toFixed(0)} s of cantering, not a walk across Drent`);
});

test('a stop whose skill the traveler landed with is open until its teacher has said so', () => {
  // Every one of the eleven lands knowing something, and `done` is re-derived from the skill
  // being known - so such a stop used to be ticked at t = 0, before its teacher was ever met.
  // Ticked, it was never the next open gold, so the teacher wore no mark and had nothing to say.
  // A lesson is shortened, never skipped: it is open until one conversation closes it.
  for (const stop of ALL_STOPS) {
    if (!stop.skill || !stop.npc) continue;
    assert.ok(recognisedAt(stop.id), `${stop.id} has a teacher and no line for somebody who already does this`);
    const road = createLongRoad();
    const world = nothing({ skills: [stop.skill], startingSkills: [stop.skill] });
    assert.equal(knowsAlready(world.skills, stop.skill), true, stop.id);
    assert.equal(road.view(world).stop(stop.id).done, false, `${stop.id} is ticked before its teacher is met`);
    const owed = road.view(world).recognising.find(entry => entry.id === stop.id);
    assert.ok(owed, `${stop.id} is not on the list of people who owe you a look`);
    assert.equal(owed.npc, stop.npc);
    // One conversation, and it pays nothing: the skill was already theirs.
    const said = road.act('recognise', { id: stop.id });
    assert.equal(said.ok, true);
    assert.equal(said.pays, 0, `${stop.id} paid for a skill the traveler already had`);
    assert.equal(said.line, recognisedAt(stop.id));
    assert.equal(road.act('recognise', { id: stop.id }).ok, false, 'and they say it once');
    // Recognised, the stop falls back to its own derivation. For all but one that is the skill,
    // so it closes. Mara's second errand is the exception the design allows for: cartography is
    // how you arrive at the three corners, not a reason to have walked them, and she still has
    // to countersign a chart she has actually been handed.
    const closes = stop.id !== 'village-corners';
    assert.equal(road.view(world).stop(stop.id).done, closes, `${stop.id} did not close on the conversation`);
    if (!closes) {
      road.act('corners-ask'); road.act('corners-sign', everything());
      assert.equal(road.view(everything({ startingSkills: [stop.skill] })).stop(stop.id).done, true, 'and closes when she signs');
    }
    // It survives being written down.
    const back = createLongRoad();
    assert.equal(back.restore(road.snapshot()), true);
    assert.equal(back.view(world).stop(stop.id).done, true, `${stop.id} forgot it across a save`);
  }
  assert.equal(knowsAlready([], 'birding'), false);
  assert.equal(knowsAlready({ known: id => id === 'botany' }, 'botany'), true, 'a real skill sheet answers too');
  assert.equal(recognisedAt('nowhere'), null);
  assert.equal(createLongRoad().act('recognise', { id: 'nowhere' }).ok, false);
});

test('each of the ten finds their own teachers open, and closes each in one conversation', () => {
  // As the bug hunter played it: be somebody, walk the road, and see what is already ticked.
  for (const who of PLAYABLE_IDS) {
    const started = Object.keys(startingSkills(who));
    const road = createLongRoad();
    const world = everything({ startingSkills: started });
    const owed = road.view(world).recognising;
    const expected = ALL_STOPS.filter(stop => stop.npc && recognisedAt(stop.id) && started.includes(stop.skill));
    assert.deepEqual(owed.map(entry => entry.id).sort(), expected.map(stop => stop.id).sort(),
      `playing as ${who}, the wrong teachers are waiting to recognise you`);
    for (const stop of expected) {
      assert.equal(road.view(world).stop(stop.id).done, false, `${who}: ${stop.id} was ticked before ${stop.npc} was met`);
      assert.equal(road.act('recognise', { id: stop.id }).ok, true);
      if (stop.id === 'village-corners') continue;   // hers closes on the countersign, not on being seen
      assert.equal(road.view(world).stop(stop.id).done, true, `${who}: ${stop.id} did not close`);
    }
  }
  // Cromb lands knowing nothing, so nobody has anything to recognise and the road is as written.
  assert.deepEqual(createLongRoad().view(everything({ startingSkills: [] })).recognising, []);
});

test('every stop that teaches a skill has a recognising line, spine or branch', () => {
  const lines = Object.values(RECOGNISED);
  assert.equal(new Set(lines).size, lines.length, 'somebody is repeating somebody else');
  for (const [id, line] of Object.entries(RECOGNISED)) {
    assert.ok(ALL_STOPS.some(stop => stop.id === id), `${id} is not a stop`);
    assert.ok(line.length > 60, `${id} says too little to be a scene`);
  }
  // This swept the spine only, and the house plot is a branch - which is exactly the stop a man
  // who lands able to build closes by landing. One of the eleven fell through the one place it
  // did not look, so it looks everywhere a skill is taught now.
  for (const stop of ALL_STOPS) {
    if (!stop.skill || !stop.npc) continue;
    assert.ok(RECOGNISED[stop.id], `${stop.id} teaches ${stop.skill} and has nothing to say to somebody who has it`);
  }
  assert.ok(RECOGNISED['house-plot'], 'the branch the sweep used to miss');
  // Lakota at Perrin's garden is the design's own worked example: a fen man at forty has still
  // never seen a Drent bird, and finds are finds.
  assert.match(RECOGNISED['bird-garden'], /Drent’s list/);
  assert.match(RECOGNISED['bird-garden'], /never seen these ones/);
  // Every spine stop that teaches a skill has one, whoever the player turns out to be.
  const starting = new Set(PLAYABLE_IDS.flatMap(id => Object.keys(startingSkills(id))));
  for (const stop of ALL_STOPS) {
    if (!stop.skill || !starting.has(stop.skill) || !stop.npc) continue;
    assert.ok(RECOGNISED[stop.id], `somebody lands already knowing ${stop.skill} and ${stop.id} has nothing to say to them`);
  }
});

test('a man can only say he saw you where he could actually see you', () => {
  // `nearestStop` had no reach, so a sighting anywhere on the road took the nearest stop however
  // far off: Jerry five metres away on open ground recorded Fernway Rest 123 m behind him and
  // told the camp the traveler had been at the bench holding a mushroom up to the light.
  const road = createLongRoad();
  const odger = stopById('odger-fernway').point;
  const far = { x: odger.x, z: odger.z + 123 };   // due south of the Rest, 123 m off and clear of everything
  assert.ok(LONG_ROAD_SPINE.every(stop => Math.hypot(stop.point.x - far.x, stop.point.z - far.z) > NOTICE_RANGE),
    'the fixture stands well clear of every stop');
  assert.equal(road.nearestStop(far), null, 'a hundred and twenty metres off is not "at" anything');
  assert.equal(road.nearestStop(odger), 'odger-fernway', 'and standing on it is');
  assert.equal(road.nearestStop({ x: odger.x, z: odger.z + NOTICE_RANGE - 1 }), 'odger-fernway', 'inside the forty he saw you there');
  assert.equal(road.nearestStop({ x: odger.x, z: odger.z + NOTICE_RANGE + 1 }), null, 'outside it he did not');
});

test('a sighting between stops is remembered as the road, and says so at the muster', () => {
  const road = createLongRoad();
  const odger = stopById('odger-fernway').point;
  const far = { x: odger.x, z: odger.z + 123 };
  // Five metres away on open ground: he saw the traveler, and he saw a road.
  const seen = road.notice([{ id: 'merc-jerry', name: 'Jerry', phase: 'walking', x: far.x + 5, z: far.z }], far, () => 'fernway');
  assert.equal(seen.length, 1);
  assert.equal(seen[0].stopId, `${GROUND_PREFIX}fernway`, 'the ground, not a stop he was nowhere near');
  assert.equal(isGround(road.seenAt('merc-jerry')), true);
  assert.equal(groundOfSighting(road.seenAt('merc-jerry')).name, 'Fernway Rest');
  // And on ground the chart has no name for, he has nothing to claim at all.
  const nowhere = road.notice([{ id: 'merc-ciaran', name: 'Ciarán', phase: 'walking', x: far.x + 5, z: far.z }], far, () => null);
  assert.equal(nowhere[0].stopId, null);
  assert.equal(isGround(null), false);
  assert.equal(isGround('ground:not-a-place'), false, 'and a ground the chart does not have is not one');
  assert.equal(groundOfSighting('odger-fernway'), null, 'a stop id is not a ground');
  // The save takes both, and refuses a ground nobody has heard of.
  assert.equal(validateLongRoadSnapshot(road.snapshot()), true);
  assert.equal(validateLongRoadSnapshot({ ...road.snapshot(), seenAt: { 'merc-jerry': 'ground:nowhere' } }), false);
});

test('nobody walking beside the traveler is ever recorded as having gone past him', () => {
  // Companions are "as many as will come" now (docs/design-answers.md). Every one of them is in
  // the phase `with-traveler` and never `walking` or `stopped`, so none of them can be a sighting.
  const road = createLongRoad();
  const at = { x: -102, z: 8.6 };
  const beside = ['merc-gotwood', 'merc-word', 'merc-lakota'].map(id =>
    ({ id, name: id, phase: 'with-traveler', distance: 0, stopId: null, x: at.x + 2.5, z: at.z }));
  assert.deepEqual(road.notice(beside, at, ground), [], 'three men at your shoulder, and not one sighting');
  assert.deepEqual(road.snapshot().seenAt, {}, 'and nothing written down about any of them');
  // The moment one of them is released and back on the road, he can be seen going past.
  const gone = road.notice([{ ...beside[0], phase: 'walking' }], at, ground);
  assert.equal(gone.length, 1);
  assert.equal(gone[0].id, 'merc-gotwood');
});

test('src/main.js actually asks a teacher to recognise somebody', () => {
  // The lines existed and nothing imported them: `recognisedAt` and `knowsAlready` were reachable
  // only from this file, so Bowden's "YOU HAVE SWUNG ONE!" could not be got to by anybody.
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  assert.match(main, /function recogniseTeacher\(npc\)/, 'the host has to ask');
  assert.match(main, /if\(recogniseTeacher\(npc\)\)return;/, 'and ask before the teacher\u2019s own conversation is built');
  assert.match(main, /longRoad\.act\('recognise'/, 'and record it');
  assert.match(main, /startingSkills:startingSkills\(playerId\)/, 'and tell the long road what the traveler landed knowing');
  // Never before the letter: Mara hands it to everybody, whatever they already know.
  assert.match(main, /if\(questStage<2\)return false;/);
});

test('the play at Fernway stands where the players camp, and nothing else claims to close it', () => {
  // The leg-3 spine stop and the troupe's Fernway camp are the same verge. They are two tables in
  // two modules, so the numbers are held against each other here rather than trusted.
  const play = longRoadStop('fernway-play'), camp = TROUPE_STOPS.find(stop => stop.id === PLAY_TROUPE_STOP);
  assert.ok(camp, `the players camp at ${PLAY_TROUPE_STOP}`);
  assert.equal(camp.region, 'Drent');
  assert.deepEqual([play.point.x, play.point.z], [camp.x, camp.z], 'the gold is on the camp, to the metre');
  assert.equal(play.kind, 'spine', 'and it is on the curriculum, not beside it');
  assert.equal(play.reads, 'longRoad', 'it has no view of its own, so the host has to say');
});

test('src/main.js actually closes the play: a scene watched to the end at Fernway', () => {
  // The bug this pins: `act('played')` existed and nothing called it, so the leg-3 spine stop
  // could never be done and the open gold stuck on the Fernway verge for the rest of the game.
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  assert.match(main, /PLAY_TROUPE_STOP/, 'the host knows which camp the stop stands at');
  assert.match(main, /const onTheLongWay=troupe\.stop\.id===PLAY_TROUPE_STOP;/, 'and asks where the wagon is');
  // The hat is what ends a scene (`troupe-tip-<n>`, 0 being applause), so that is where it closes.
  const hat = main.slice(main.indexOf("const tip=/^troupe-tip-"));
  assert.ok(hat.indexOf('const onTheLongWay=') < hat.indexOf('troupe.endScene()'),
    'the wagon is asked where it is before the scene ends under it');
  assert.match(hat.slice(0, 900), /if\(onTheLongWay&&longRoad\.act\('played'\)\.ok\)toast\(/, 'a play played out closes the stop, once');
  assert.match(hat.slice(0, 1200), /saveRoad\(false\);/, 'and it is saved');
  // Walking out of a play is not watching one: `cancelScene` counts nothing and must close nothing.
  const walkOut = main.slice(main.indexOf('troupe.cancelScene()'));
  assert.doesNotMatch(walkOut.slice(0, 200), /act\('played'\)/, 'walking out of the play closes nothing');
  assert.equal(main.match(/longRoad\.act\('played'\)/g).length, 1, 'one place says it, and only one');
});

test('the whole spine walks only because the play can be watched', () => {
  // Before the host was wired this was the shape of the game: everything else in Drent done, and
  // the gold stuck on the play for ever, with legs 3 and every drill after the second out of reach.
  const stuck = createLongRoad();
  stuck.act('told'); stuck.act('corners-ask'); stuck.act('corners-sign', everything());
  const never = stuck.view(everything());
  assert.equal(never.next.id, 'fernway-play', 'the gold has nowhere else to go');
  assert.deepEqual(never.stops.filter(row => row.kind === 'spine' && !row.done).map(row => row.id), ['fernway-play'],
    'and it is the only thing in the whole of Drent that is not done');
  assert.equal(never.legs[3].done, false, 'so leg three never closes');
  for (let i = 0; i < DRILL_COUNT; i++) stuck.act('drill', everything());
  assert.equal(stuck.drills, 2, 'and only two of the five drills are ever on offer');

  // With the play watched, the same walk finishes: every leg, every drill, and `finished`.
  const road = createLongRoad();
  road.act('told'); road.act('corners-ask'); road.act('corners-sign', everything());
  assert.equal(road.act('played').ok, true, 'the host says a scene was watched to the end');
  assert.equal(road.act('played').ok, false, 'and says it once');
  const walked = road.view(everything());
  assert.equal(walked.next, null, 'no gold left on the spine');
  assert.deepEqual(walked.legs.map(leg => leg.done), [true, true, true, true, true, true]);
  assert.equal(walked.spine.done, walked.spine.of);
  for (let i = 0; i < DRILL_COUNT; i++) assert.equal(road.act('drill', everything()).ok, true, `drill ${i + 1}`);
  assert.equal(road.view(everything()).finished, true, 'the whole of the long road, walked');
  // And it keeps: the play is one of the things the long road saves for itself.
  const back = createLongRoad();
  assert.equal(back.restore(road.snapshot()), true);
  assert.equal(back.view(everything()).played, true);
});
