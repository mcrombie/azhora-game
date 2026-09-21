import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LONG_ROAD_VERSION, LONG_ROAD_LEGS, LONG_ROAD_STOPS, LONG_ROAD_STOP_IDS, LONG_ROAD_SPINE, DRILL_COUNT, DRILL_EXPOSURE,
  NOTICE_RANGE, DRENT_GROUNDS, drentCharted, longRoadStop, stopGround, createLongRoad, validateLongRoadSnapshot,
} from '../src/long-road.js';
import { SUBREGION_IDS, subregionsAt } from '../src/map-fog.js';
import { MERCENARY_ROSTER } from '../src/mercenaries.js';
import { SKILLS } from '../src/skills.js';

/** Everything the world would say if the traveler had done the whole of Drent. */
const ALL_SKILLS = ['cartography', 'birding', 'cooking', 'fishing', 'woodcutting', 'construction', 'mycology', 'archaeology', 'botany', 'geology', 'farming'];
const everything = (over = {}) => ({
  skills: ALL_SKILLS, acornQuest: 'complete',
  journey: { courierComplete: true, bridgeComplete: true },
  mapFog: [...SUBREGION_IDS], linguist: { drentish: 62, ambroni: 54 },
  companion: { with: true }, ...over,
});
const nothing = (over = {}) => ({ skills: [], acornQuest: 'available', journey: {}, mapFog: [], linguist: {}, ...over });
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
  assert.equal(road.view(nothing({ mapFog: { found: ['eastreena', 'the-greenway'] } })).stop('village-corners').done, true);
  assert.equal(road.view(nothing({ linguist: { level: id => id === 'drentish' ? 50 : 0 } })).stop('east-rena-stone').done, true);
  assert.equal(road.view(nothing({ linguist: { level: () => 49 } })).stop('east-rena-stone').done, false);
  // All of it done but the two the long road keeps itself.
  const all = road.view(everything());
  assert.equal(all.stop('the-fork').done, false, 'the fork is this module’s own');
  assert.equal(all.stop('fernway-play').done, false, 'so is the play');
  assert.equal(all.next.id, 'the-fork');
});

test('the open gold moves down the spine in order and the legs close behind it', () => {
  const road = createLongRoad();
  // The spine is the curriculum, so it is walked leg by leg and never doubles back.
  const legs = LONG_ROAD_SPINE.map(row => row.leg);
  for (let i = 1; i < legs.length; i++) assert.ok(legs[i] >= legs[i - 1], 'the spine is in leg order');
  assert.equal(road.view(nothing()).next.id, 'pier-chart', 'the first gold is Mara’s');
  // Give the world everything but one stop, and that stop is what the open gold points at.
  road.act('told');
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
  road.act('told'); road.act('played');
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
  const leg1 = { skills: ['cartography', 'birding'], acornQuest: 'complete', journey: {}, mapFog: [...SUBREGION_IDS], linguist: {}, companion: true };
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
  road.act('told'); road.act('played');
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
