import test from 'node:test';
import assert from 'node:assert/strict';
import { CROPS, FARM_ROWS, createFarming, farmRow, farmsteadRows, validateFarmingSnapshot } from '../src/farming.js';
import { SKILLS, createSkills } from '../src/skills.js';
import { ICON_KINDS, INVENTORY_ITEMS } from '../src/inventory.js';
import { FOODS } from '../src/consumables.js';
import { RECIPES } from '../src/cooking.js';
import { BLACKWATER_SECONDS, DEEP_BED_IDS, MEADOW_BED_IDS, MEADOW_WORKING, NETHEREUM_CROPS, NETHEREUM_FOODS, NETHEREUM_ITEMS, NETHEREUM_RECIPES,
  SECOND_CUT_LEVEL, SECOND_CUT_SECONDS, SILTSHINE_SECONDS, createMeadowWater, createWeir, meadowPhase, validateMeadowWater, validateWeir, waterTakes,
  weirFresh } from '../src/meadow-water.js';
import { sourceModule } from './module-loader.js';

/**
 * Build 2 of the Farmlands of the Lizeem (docs/lizeem-farmlands-design.md §5.2, the design of 5 October 2026;
 * built 6 October 2026): timing the water on the Haethom meadow, the hay it grows and the second cut, the deep
 * plots below the line, Gwyddno's weir and Airmid's harvest basket.
 */
const MEADOW = MEADOW_BED_IDS[0], DEEP = DEEP_BED_IDS[0];
const SHINE = BLACKWATER_SECONDS, FROGS = BLACKWATER_SECONDS + SILTSHINE_SECONDS;

/** A satchel that holds anything, so no item needs registering here; `full` refuses everything. */
function satchel(start = {}, { full = false } = {}) {
  const owned = new Map(Object.entries(start));
  return { count: id => owned.get(id) ?? 0, has: id => (owned.get(id) ?? 0) > 0,
    add: (id, n = 1) => { if (full) return false; owned.set(id, (owned.get(id) ?? 0) + n); return true; },
    remove: (id, n = 1) => { if ((owned.get(id) ?? 0) < n) return false; owned.set(id, owned.get(id) - n); return true; } };
}
function skillsAt({ farming = 1, fishing = 1 } = {}) {
  const skills = createSkills(), saved = skills.snapshot();
  if (farming > 1) saved.skills.farming = { xp: SKILLS.farming.thresholds[farming - 1] };
  if (fishing > 1) saved.skills.fishing = { xp: SKILLS.fishing.thresholds[fishing - 1] };
  skills.restore(saved);
  return skills;
}
function fixture({ level = 1, start = {} } = {}) {
  let t = 0;
  const clock = () => t, events = [], skills = skillsAt({ farming: level }), inventory = satchel({ 'flood-oats-seed': 20, 'carrot-seed': 4, ...start });
  const farming = createFarming({ skills, inventory, clock, onEvent: event => events.push(event) });
  const meadow = createMeadowWater({ farming, clock, skills, inventory, onEvent: event => events.push(event) });
  return { farming, meadow, inventory, skills, events, at: seconds => { t = seconds; return seconds; } };
}
/** Mend the hatch, open it at `open`, and draw it off at `draw`. */
function flood(fx, open, draw) {
  fx.inventory.add('pine-plank', 2); fx.inventory.add('salvaged-metal', 1);
  if (!fx.meadow.mended) assert.equal(fx.meadow.mendHatch().ok, true);
  assert.equal(fx.meadow.openHatch(fx.at(open)).ok, true);
  return fx.meadow.drawOff(fx.at(draw));
}
/** Ripen a growing bed with the working Quicken and take it in. */
const reap = (fx, id, at) => { fx.at(at); if (fx.farming.rowState(id, at).stage === 'sown') assert.equal(fx.farming.ripen(id, at).ok, true); return fx.farming.harvest(id, at); };

test('the Nethereum beds and crops join the farm when the meadow is imported, and the hay is never offered for seed', () => {
  assert.equal(MEADOW_BED_IDS.length, 8); assert.equal(DEEP_BED_IDS.length, 4);
  assert.deepEqual([farmRow(MEADOW).country, farmRow(MEADOW).farmstead, farmRow(DEEP).farmstead], ['nethereum', 'haethom-meadow', 'haethom-deep']);
  assert.deepEqual(farmsteadRows('haethom-meadow').map(row => row.id), [...MEADOW_BED_IDS]);
  const oats = CROPS['flood-oats'], hay = CROPS['meadow-hay'];
  assert.deepEqual([oats.seconds, oats.xp, oats.level, oats.yield, oats.item, oats.seed, oats.fine, oats.region], [240, 30, 1, 2, 'flood-oats', 'flood-oats-seed', 'flood-oats-fine', 'nethereum']);
  assert.deepEqual([hay.sown, hay.level, hay.item, hay.fine, hay.seed, hay.region], [false, 5, 'meadow-hay', 'meadow-hay-fine', undefined, 'nethereum']);
  const { farming } = fixture({ level: 10 });
  assert.ok(farming.countries().includes('nethereum'));
  assert.deepEqual(farming.sowable(MEADOW).map(entry => entry.id).filter(id => NETHEREUM_CROPS.some(c => c.id === id)), ['flood-oats'], 'oats are sown; hay is not');
  assert.match(farming.sow(MEADOW, 'meadow-hay', 0).reason, /not sown/);
  assert.match(farming.sow(FARM_ROWS[0].id, 'flood-oats', 0).reason, /Nethereum/, 'flood oats grow only on the Nethereum beds');
});

test('the hatch starts broken, and mends with two planks and a piece of ironwork, taking nothing until all of it is there', () => {
  const fx = fixture({ start: { 'pine-plank': 1 } });
  assert.equal(fx.meadow.hatch, 'broken');
  assert.match(fx.meadow.openHatch(0).reason, /broken/);
  assert.match(fx.meadow.drawOff(0).reason, /broken/);
  const short = fx.meadow.mendHatch();
  assert.deepEqual([short.ok, short.lacking], [false, ['planks', 'ironwork']]);
  fx.inventory.add('oak-plank', 1);
  assert.deepEqual(fx.meadow.mendHatch().lacking, ['ironwork']);
  assert.deepEqual([fx.inventory.count('pine-plank'), fx.inventory.count('oak-plank')], [1, 1], 'nothing taken');
  fx.inventory.add('salvaged-metal', 2);
  const mended = fx.meadow.mendHatch();
  assert.deepEqual(mended, { ok: true, used: { 'pine-plank': 1, 'oak-plank': 1, 'salvaged-metal': 1 } }, 'the cheapest planks first, of any kind');
  assert.deepEqual(['pine-plank', 'oak-plank', 'salvaged-metal'].map(id => fx.inventory.count(id)), [0, 0, 1]);
  assert.equal(fx.meadow.mended, true);
  assert.match(fx.meadow.mendHatch().reason, /sound already/);
  assert.ok(fx.events.some(event => event.type === 'meadow-mended'));
  const other = fixture({ start: { 'walnut-plank': 3, 'salvaged-metal': 1 } });
  assert.equal(other.meadow.mendHatch({ inventory: satchel({ 'pine-plank': 2, 'salvaged-metal': 1 }) }).ok, true, 'a satchel may be handed to it');
  assert.equal(other.inventory.count('walnut-plank'), 3);
});

test('the water runs blackwater, siltshine and frogcall on the play clock, and stays sour until it is drawn off', () => {
  const fx = fixture({ start: { 'pine-plank': 2, 'salvaged-metal': 1 } });
  fx.meadow.mendHatch();
  assert.equal(fx.meadow.phase(), 'dry');
  fx.at(100);
  const opened = fx.meadow.openHatch();
  assert.deepEqual([opened.ok, opened.phase, opened.siltshineAt, opened.frogcallAt], [true, 'blackwater', 280, 520]);
  assert.match(fx.meadow.openHatch().reason, /open already/);
  const read = at => { fx.at(at); return fx.meadow.phase(); };
  assert.deepEqual([read(100), read(279), read(280), read(519), read(520), read(100 + 86400)], ['blackwater', 'blackwater', 'siltshine', 'siltshine', 'frogcall', 'frogcall']);
  fx.at(160);
  assert.deepEqual((({ phase, left, next, drawsTo, open }) => ({ phase, left, next, drawsTo, open }))(fx.meadow.state()),
    { phase: 'blackwater', left: 120, next: 'siltshine', drawsTo: 'thin', open: true });
  fx.at(400);
  assert.deepEqual([fx.meadow.state().drawsTo, fx.meadow.state().left], ['fine', 120]);
  assert.deepEqual([meadowPhase(null, 50), meadowPhase(0, SHINE - 1), meadowPhase(0, SHINE), meadowPhase(0, FROGS)], ['dry', 'blackwater', 'siltshine', 'frogcall']);
  assert.ok(fx.events.some(event => event.type === 'meadow-opened' && event.at === 100));
});

test('drawn off at each phase the beds are left thin, fine or sour, and flood oats take that fit', () => {
  for (const [draw, silt, fit] of [[10, 'thin', 1], [SHINE + 10, 'fine', 2], [FROGS + 900, 'sour', 0]]) {
    const fx = fixture();
    const drawn = flood(fx, 0, draw);
    assert.deepEqual([drawn.ok, drawn.silt, drawn.fit], [true, silt, fit], silt);
    assert.equal(fx.meadow.phase(), 'dry', 'the water is off');
    assert.ok([...MEADOW_BED_IDS, ...DEEP_BED_IDS].every(id => fx.meadow.silt(id) === silt), `${silt} on every meadow and deep bed`);
    // The meadow's beds are under hay; cut one and sow oats in the silt it grew in.
    const cut = reap(fx, MEADOW, draw + 1);
    assert.equal(cut.crop, 'meadow-hay');
    assert.equal(fx.farming.sow(MEADOW, 'flood-oats', fx.at(draw + 2)).fit, fit, `oats on ${silt} silt`);
    assert.equal(fx.farming.sow(DEEP, 'flood-oats', draw + 2).fit, silt === 'thin' ? 2 : fit, 'the deep ground makes thin silt as good as fine');
  }
  const fx = fixture();
  assert.equal(fx.farming.sow(DEEP, 'flood-oats', 0).fit, 0, 'ground never flooded has no silt');
  fx.inventory.add('pine-plank', 2); fx.inventory.add('salvaged-metal', 1); fx.meadow.mendHatch();
  fx.meadow.openHatch(fx.at(5));
  assert.equal(fx.farming.sow(DEEP_BED_IDS[1], 'flood-oats', fx.at(SHINE + 20)).fit, 0, 'nothing sown under water comes to anything');
  assert.match(fx.meadow.drawOff(fx.at(SHINE + 30)).silt, /fine/);
  fx.inventory.add('barley-seed', 1);
  assert.equal(fx.farming.sow(DEEP_BED_IDS[2], 'barley', fx.at(SHINE + 31)).fit, 1, 'fresh silt helps any crop a step less than the oats bred to it');
  assert.match(fixture().meadow.drawOff(0).reason, /broken/);
});

test('the draw-off grows hay on the bare meadow beds, its first cut takes the silt, and a sowing takes the silt with it', () => {
  const fx = fixture({ level: 5 });
  const late = MEADOW_BED_IDS.at(-1);
  assert.equal(fx.farming.sow(late, 'flood-oats', 0).fit, 0);
  const drawn = flood(fx, 1, SHINE + 50);
  assert.deepEqual(drawn.hay, MEADOW_BED_IDS.slice(0, -1), 'every bare meadow bed, and not the one already in oats');
  assert.ok(DEEP_BED_IDS.every(id => fx.farming.rowState(id, drawn.at).stage === 'bare'), 'no hay below the line');
  const sown = fx.events.filter(event => event.type === 'row-sown' && event.crop === 'meadow-hay');
  assert.equal(sown.length, 7); assert.ok(sown.every(event => event.working === MEADOW_WORKING && event.fit === 2), 'one notice, from the draw-off');
  assert.ok(fx.events.some(event => event.type === 'meadow-drawn' && event.silt === 'fine' && event.hay.length === 7));
  assert.deepEqual([fx.farming.rowState(MEADOW, drawn.at).crop, fx.farming.rowState(MEADOW, drawn.at).fit], ['meadow-hay', 2]);
  fx.farming.water(MEADOW, drawn.at);
  const seeds = fx.inventory.count('flood-oats-seed');
  const cut = reap(fx, MEADOW, drawn.at + 30);
  assert.deepEqual([cut.grade, cut.produce, cut.count], ['fine', 'meadow-hay-fine', 3], 'fine silt, watered, at level 5: Fine hay');
  assert.equal(fx.inventory.count('flood-oats-seed'), seeds, 'hay gives no seed back');
  assert.equal(fx.meadow.silt(MEADOW), 'fine', 'the hay does not take the silt');
  const plain = fixture();
  flood(plain, 0, SHINE + 10);
  assert.equal(reap(plain, MEADOW, SHINE + 20).grade, 'good', 'unwatered at level 1: Good');
  assert.equal(fx.farming.sow(MEADOW, 'flood-oats', fx.at(drawn.at + 31)).fit, 2);
  assert.equal(fx.meadow.silt(MEADOW), 'dry', 'the oats took the silt');
  assert.equal(fx.farming.sow(DEEP, 'flood-oats', drawn.at + 31).fit, 2);
  const oats = reap(fx, DEEP, drawn.at + 40);
  assert.equal(fx.farming.sow(DEEP, 'flood-oats', fx.at(drawn.at + 41)).fit, 0, 'the next sowing wants the meadow drowned again');
  assert.equal(oats.crop, 'flood-oats');
  const sour = fixture();
  flood(sour, 0, FROGS + 1);
  reap(sour, MEADOW, FROGS + 2);
  sour.farming.sow(MEADOW, 'flood-oats', sour.at(FROGS + 3));
  assert.equal(sour.meadow.silt(MEADOW), 'sour', 'sour ground stays sour until it is drowned and drawn off in time');
});

test('a farmer of level 10 has a second cut five minutes after the first, Good at best, and only one', () => {
  const fx = fixture({ level: SECOND_CUT_LEVEL });
  const { at: drawn } = flood(fx, 0, SHINE + 20);
  const first = reap(fx, MEADOW, drawn + 10);
  assert.equal(first.crop, 'meadow-hay');
  const due = drawn + 10 + SECOND_CUT_SECONDS;
  assert.deepEqual(fx.meadow.update(due - 1), []);
  assert.equal(fx.farming.rowState(MEADOW, due - 1).stage, 'bare');
  assert.match(fx.farming.describeBed(MEADOW, due - 60).text, /aftermath comes up in about 60 seconds/);
  // The host may tick late: the aftermath is sown at the moment it was due.
  assert.deepEqual(fx.meadow.update(due + 500), [MEADOW]);
  const second = fx.farming.rowState(MEADOW, due + 500);
  assert.deepEqual([second.crop, second.sownAt, second.fit, second.stage], ['meadow-hay', due, 1, 'ripe']);
  assert.ok(fx.events.some(event => event.type === 'meadow-aftermath' && event.rows[0] === MEADOW));
  assert.match(fx.farming.describeBed(MEADOW, due + 500).text, /aftermath/);
  const cut = fx.farming.harvest(MEADOW, fx.at(due + 500));
  assert.equal(cut.grade, 'good');
  assert.deepEqual(fx.meadow.update(due + 5000), [], 'the second cut is the last off that draw-off');
  assert.equal(fx.farming.rowState(MEADOW, due + 5000).stage, 'bare');

  // At level 20 the farmer's level alone counts two: the aftermath has no fit, and watered it is still Good.
  const master = fixture({ level: 20 });
  const { at: masterDrawn } = flood(master, 0, SHINE + 20);
  master.farming.water(MEADOW, masterDrawn);
  assert.equal(reap(master, MEADOW, masterDrawn + 5).grade, 'prize', 'the first cut can be Prize');
  master.meadow.update(masterDrawn + 5 + SECOND_CUT_SECONDS);
  assert.equal(master.farming.rowState(MEADOW, masterDrawn + 5 + SECOND_CUT_SECONDS).fit, 0);
  master.farming.water(MEADOW, masterDrawn + 5 + SECOND_CUT_SECONDS);
  assert.equal(reap(master, MEADOW, masterDrawn + 10 + SECOND_CUT_SECONDS).grade, 'good');

  // Below level 10 there is no second cut, and a sowing in the five minutes is chosen over it.
  const young = fixture({ level: 9 });
  const { at: youngDrawn } = flood(young, 0, SHINE + 20);
  reap(young, MEADOW, youngDrawn + 1);
  assert.deepEqual(young.meadow.update(youngDrawn + 1 + SECOND_CUT_SECONDS), []);
  assert.equal(young.farming.rowState(MEADOW, youngDrawn + 2 + SECOND_CUT_SECONDS).stage, 'bare');
  const later = due + 6000;
  reap(fx, MEADOW_BED_IDS[1], later);
  fx.farming.sow(MEADOW_BED_IDS[1], 'flood-oats', fx.at(later + 10));
  assert.deepEqual(fx.meadow.update(later + 10 + SECOND_CUT_SECONDS), []);
  assert.equal(fx.farming.rowState(MEADOW_BED_IDS[1], later + 10 + SECOND_CUT_SECONDS).crop, 'flood-oats', 'oats sown in the five minutes are chosen over the aftermath');
});

test('opening the hatch drowns any aftermath still waiting on a cut bed', () => {
  const fx = fixture({ level: SECOND_CUT_LEVEL });
  const { at: drawn } = flood(fx, 0, SHINE + 20);
  reap(fx, MEADOW, drawn + 10);
  assert.equal(Object.keys(fx.meadow.state(drawn + 11).cuts).length, 1);
  assert.equal(fx.meadow.openHatch(fx.at(drawn + 100)).ok, true);
  assert.deepEqual(fx.meadow.state(drawn + 100).cuts, {});
  assert.deepEqual(fx.meadow.update(drawn + 1000), []);
});

test('Sound the Soil reads the water and the silt on a Nethereum bed', () => {
  const fx = fixture();
  const text = at => fx.farming.describeBed(DEEP, at).text;
  assert.match(text(0), /hatch is broken/);
  assert.match(text(0), /no fresh silt/);
  fx.inventory.add('pine-plank', 2); fx.inventory.add('salvaged-metal', 1); fx.meadow.mendHatch();
  fx.meadow.openHatch(fx.at(0));
  assert.match(text(30), /^Blackwater: .*thin silt; the silt shines in about 150 seconds\. Nothing sown under water/);
  assert.match(text(SHINE + 40), /^Siltshine: .*fine ground; the frogs start in about 200 seconds/);
  assert.match(text(FROGS + 1), /^Frogcall: /);
  fx.meadow.drawOff(fx.at(SHINE + 50));
  assert.match(text(SHINE + 51), /fine silt .* flood oats would do best in it\. Below the line/);
  assert.match(fx.farming.describeBed(MEADOW, SHINE + 51).text, /hay is coming up through the silt/);
});

test('below the line the water takes one planting in five, and the farm says so', () => {
  const times = Array.from({ length: 1000 }, (_, n) => n);
  const taken = times.filter(n => waterTakes(DEEP, n)).length;
  assert.ok(taken > 150 && taken < 250, `${taken} in a thousand`);
  assert.equal(waterTakes(DEEP, 12.7), waterTakes(DEEP, 12), 'the whole second of the sowing');
  const lost = times.find(n => waterTakes(DEEP, n));
  const fx = fixture();
  fx.farming.sow(DEEP, 'flood-oats', fx.at(lost));
  const gone = reap(fx, DEEP, lost + 1);
  assert.deepEqual([gone.ok, gone.grown, gone.taken, gone.count, fx.inventory.count('flood-oats')], [true, 2, 2, 0, 0]);
  assert.match(gone.notes.join(' '), /took the crop/);
  assert.ok(fx.events.some(event => event.type === 'deep-plot-drowned' && event.row === DEEP));
  const kept = times.find(n => n > lost + 1 && !waterTakes(DEEP, n));
  fx.farming.sow(DEEP, 'flood-oats', fx.at(kept));
  assert.equal(reap(fx, DEEP, kept + 1).count, 2, 'four plantings in five come in');
  const meadowFx = fixture();
  meadowFx.farming.sow(MEADOW, 'flood-oats', meadowFx.at(lost));
  assert.equal(reap(meadowFx, MEADOW, lost + 1).count, 2, 'the meadow above is not at risk');
});

test('Airmid’s harvest basket adds one to every harvest while it is carried', () => {
  const fx = fixture({ start: { 'harvest-basket': 1 } });
  fx.farming.sow(MEADOW, 'flood-oats', fx.at(0));
  const oats = reap(fx, MEADOW, 1);
  // The farm adds it (`added`, settled at integration, 6 October 2026), so the harvest's own count says three.
  assert.deepEqual([oats.grown, oats.count, oats.added, oats.quantity, fx.inventory.count('flood-oats')], [2, 3, 1, 3, 3]);
  assert.match(oats.notes.join(' '), /basket held one more/);
  fx.farming.sow(FARM_ROWS[0].id, 'carrot', fx.at(2));
  reap(fx, FARM_ROWS[0].id, 3);
  assert.equal(fx.inventory.count('carrot'), 3, 'on any farm, not only in Nethereum');
  fx.inventory.remove('harvest-basket', 1);
  fx.farming.sow(MEADOW, 'flood-oats', fx.at(4));
  reap(fx, MEADOW, 5);
  assert.equal(fx.inventory.count('flood-oats'), 5, 'set down, it adds nothing');
  fx.inventory.add('harvest-basket', 1);
  fx.meadow.dispose();
  fx.farming.sow(MEADOW, 'flood-oats', fx.at(6));
  reap(fx, MEADOW, 7);
  assert.equal(fx.inventory.count('flood-oats'), 7, 'a disposed meadow unhooks it');
});

test('the weir gives its catch once a game day, five fish with Fishing 5, and fine before noon', () => {
  let t = 0;
  const bag = satchel(), events = [];
  const weir = createWeir({ clock: () => t, skills: skillsAt(), inventory: bag, onEvent: event => events.push(event) });
  assert.deepEqual([weirFresh(0), weirFresh(359), weirFresh(360), weirFresh(1079), weirFresh(1080)], [true, true, false, false, true], 'play begins at six; noon is 360, midnight 1080');
  assert.deepEqual(weir.take(), { ok: true, item: 'weir-fish-fine', count: 3, quantity: 3, fine: true, day: 0 });
  t = 100;
  const empty = weir.take();
  assert.deepEqual([empty.ok, empty.nextIn], [false, 980]);
  assert.match(empty.reason, /empty/);
  t = 1080 + 720;
  const noon = weir.take();
  assert.deepEqual([noon.item, noon.count, noon.day], ['weir-fish', 3, 1]);
  assert.deepEqual([bag.count('weir-fish-fine'), bag.count('weir-fish')], [3, 3]);
  assert.equal(events.length, 2);
  const skilled = createWeir({ clock: () => 0, skills: skillsAt({ fishing: 5 }) });
  assert.equal(skilled.take().count, 5);
  const full = createWeir({ clock: () => 0, inventory: satchel({}, { full: true }) });
  assert.match(full.take().reason, /no room/);
  assert.equal(full.view().ready, true, 'the catch stays in the trap');
  assert.equal(full.take(0, { inventory: satchel() }).ok, true);
});

test('the meadow and the weir save and restore, and refuse a save they did not write', () => {
  const fx = fixture({ level: SECOND_CUT_LEVEL });
  const { at: drawn } = flood(fx, 0, SHINE + 20);
  reap(fx, MEADOW, drawn + 1);
  reap(fx, MEADOW_BED_IDS[1], drawn + 2);
  fx.meadow.update(drawn + 2 + SECOND_CUT_SECONDS);
  fx.meadow.openHatch(fx.at(drawn + 2 + SECOND_CUT_SECONDS));
  const saved = JSON.parse(JSON.stringify(fx.meadow.snapshot()));
  assert.deepEqual(saved.aftermath, [MEADOW, MEADOW_BED_IDS[1]]);
  assert.equal(saved.silt[DEEP], 'fine');
  assert.equal(validateMeadowWater(saved), true);
  assert.equal(validateFarmingSnapshot(fx.farming.snapshot()), true, 'the farm save names the Nethereum beds and crops');
  const again = fixture({ level: SECOND_CUT_LEVEL });
  assert.equal(again.meadow.restore(saved), true);
  assert.deepEqual(again.meadow.snapshot(), saved);
  assert.equal(again.meadow.phase(drawn + 2 + SECOND_CUT_SECONDS + SHINE), 'siltshine');
  const unfarmed = createMeadowWater();
  assert.equal(unfarmed.restore(saved), true, 'a save can be checked and copied with no farm about');
  assert.deepEqual(unfarmed.snapshot(), saved);
  assert.deepEqual(unfarmed.drawOff(drawn + 2 + SECOND_CUT_SECONDS + SHINE).hay, [], 'and with no farm nothing is sown');
  assert.equal(again.meadow.restore(undefined), true);
  assert.deepEqual([again.meadow.hatch, again.meadow.phase(0), again.meadow.snapshot().drawn], ['broken', 'dry', 0], 'a save from before the meadow');
  assert.equal(validateMeadowWater(undefined), true);
  assert.equal(validateMeadowWater(undefined, { allowMissing: false }), false);
  const bad = [
    { ...saved, version: 2 }, { ...saved, hatch: 'broken' }, { ...saved, hatch: 'leaking' }, { ...saved, openedAt: -1 },
    { ...saved, silt: { ...saved.silt, 'commons-row-1': 'fine' } }, { ...saved, silt: { [DEEP]: 'muddy' } },
    { ...saved, cuts: { [DEEP]: 5 } }, { ...saved, aftermath: [MEADOW, MEADOW] }, { ...saved, cuts: { [MEADOW]: 5 } },
    { ...saved, last: null }, { ...saved, drawn: 0 }, { ...saved, drawn: 1.5 }, { ...saved, aftermath: 'all' },
  ];
  for (const data of bad) assert.equal(validateMeadowWater(data), false, JSON.stringify(data).slice(0, 120));
  assert.equal(validateMeadowWater(saved, { playSeconds: saved.openedAt - 1 }), false, 'water let out in the future');
  assert.equal(again.meadow.restore(bad[0]), false);
  assert.equal(again.meadow.hatch, 'broken', 'a refused save leaves a dry meadow and a broken hatch');

  const weir = createWeir({ clock: () => 2000 });
  assert.deepEqual(weir.snapshot(), { version: 1, day: null, takes: 0 });
  weir.take();
  const caught = weir.snapshot();
  assert.deepEqual(caught, { version: 1, day: 1, takes: 1 });
  assert.equal(validateWeir(caught), true);
  const back = createWeir({ clock: () => 2000 });
  assert.equal(back.restore(caught), true);
  assert.equal(back.take().ok, false, 'the day’s catch is not taken twice across a save');
  assert.equal(back.restore(undefined), true);
  assert.equal(back.view(2000).ready, true);
  for (const data of [{ version: 1, day: 3, takes: 0 }, { version: 1, day: null, takes: 2 }, { version: 1, day: -1, takes: 1 }, { version: 2, day: 1, takes: 1 }, null])
    assert.equal(validateWeir(data), false, JSON.stringify(data));
  assert.equal(validateWeir(caught, { playSeconds: 0 }), false, 'a catch taken on a day still to come');
  assert.equal(validateWeir(undefined), true);
});

test('the goods of Nethereum are whole satchel items, larder foods and kitchen recipes for the game to spread in', () => {
  const foods = Object.keys(NETHEREUM_FOODS), edible = Object.keys(NETHEREUM_ITEMS).filter(id => NETHEREUM_ITEMS[id].type === 'Food');
  assert.deepEqual(foods.sort(), edible.sort(), 'every food is a satchel item and every Food item is edible');
  const heals = { 'weir-fish': 10, 'weir-fish-fine': 15, oatcakes: 25, 'oatcakes-fine': 35, 'smoked-fish': 40, 'smoked-fish-fine': 50, butter: 10 };
  for (const [id, healing] of Object.entries(heals)) {
    assert.equal(NETHEREUM_FOODS[id].healing, healing, id);
    assert.match(NETHEREUM_ITEMS[id].brief, new RegExp(`Restores up to ${healing} health`), id);
    assert.match(NETHEREUM_ITEMS[id].description, new RegExp(`Restores up to ${healing} health`), id);
    assert.match(NETHEREUM_FOODS[id].missing, /^You have no .+\. .+\.$/, id);
    assert.ok(NETHEREUM_ITEMS[id].stackable && NETHEREUM_ITEMS[id].eatName, id);
  }
  for (const [id, item] of Object.entries(NETHEREUM_ITEMS)) {
    assert.ok(item.name && item.type && item.brief && item.description && ICON_KINDS.includes(item.icon), id);
    if (Object.hasOwn(INVENTORY_ITEMS, id)) assert.equal(INVENTORY_ITEMS[id], item, `${id} is the same entry once the satchel spreads it in`);
    if (Object.hasOwn(FOODS, id)) assert.equal(FOODS[id], NETHEREUM_FOODS[id]);
  }
  assert.equal(NETHEREUM_ITEMS['harvest-basket'].stackable, undefined, 'one basket is enough');
  for (const crop of NETHEREUM_CROPS) for (const id of [crop.item, `${crop.item}-fine`, ...(crop.seed ? [crop.seed] : [])]) assert.ok(NETHEREUM_ITEMS[id], `${id} is an item`);
  assert.deepEqual(NETHEREUM_RECIPES.oatcakes.needs, { 'flood-oats': 2 });
  assert.deepEqual(NETHEREUM_RECIPES['smoked-fish'].needs, { 'weir-fish': 1 });
  assert.equal(NETHEREUM_RECIPES['smoked-fish'].at, 'gwyddno-smokehouse');
  for (const plainId of ['oatcakes', 'smoked-fish']) {
    const plain = NETHEREUM_RECIPES[plainId], fine = NETHEREUM_RECIPES[plain.fine];
    assert.equal(fine.fineOf, plainId);
    assert.equal(NETHEREUM_FOODS[fine.makes].healing, Math.min(50, NETHEREUM_FOODS[plain.makes].healing + 10));
    assert.deepEqual(Object.keys(fine.needs).map(need => need.replace(/-fine$/, '')), Object.keys(plain.needs));
    for (const recipe of [plain, fine]) {
      assert.ok(NETHEREUM_ITEMS[recipe.makes] && Object.keys(recipe.needs).every(id => NETHEREUM_ITEMS[id]), recipe.id);
      if (Object.hasOwn(RECIPES, recipe.id)) assert.equal(RECIPES[recipe.id], recipe);
    }
  }
});

test('the beds draw flood oats with nodding heads, short meadow grass, and floodwheat ripening bronze', async () => {
  const THREE = await import('../vendor/three.module.js');
  const { createFarmingView } = await sourceModule('../src/farming-view.js');
  const [oats, hay, wheat] = MEADOW_BED_IDS;
  const growing = { [oats]: 'flood-oats', [hay]: 'meadow-hay', [wheat]: 'floodwheat' };
  const farming = { rowState: id => ({ ...farmRow(id), stage: growing[id] ? 'ripe' : 'bare', crop: growing[id] ?? null, progress: growing[id] ? 1 : 0, watered: false, heart: 2 }) };
  const scene = new THREE.Scene(), view = createFarmingView({ scene, world: { heightAt: () => 15 }, farming });
  view.update(0, farmRow(oats));
  const bed = id => view.group.children.find(group => group.name === farmRow(id).name);
  const part = (id, name) => bed(id).children.find(mesh => new RegExp(name).test(mesh.name));
  const pose = (id, name) => { const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3();
    part(id, name).getMatrixAt(0, matrix); matrix.decompose(new THREE.Vector3(), turn, scale); return { turn, scale }; };
  assert.ok(Math.abs(pose(oats, 'crop produce').turn.x) > .2, 'an oat panicle nods');
  assert.ok(Math.abs(pose(wheat, 'crop produce').turn.x) < 1e-9, 'a wheat ear stands');
  assert.ok(pose(hay, 'crop stalks').scale.y < .6 && pose(oats, 'crop stalks').scale.y > 1.1, 'meadow grass is short beside the oats');
  assert.equal(part(wheat, 'crop produce').material.color.getHex(), 0xa8692f, 'bronze heads');
  assert.ok(pose(wheat, 'crop produce').scale.y > pose(oats, 'crop produce').scale.y, 'bearded ears longer than the oat heads');
  view.dispose();
});
