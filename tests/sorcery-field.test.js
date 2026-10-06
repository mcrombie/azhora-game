import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHOOLS, SPELLS, SORCERY, castWith, learnableSpell, fieldXp, soundingText } from '../src/gameplay/magic/sorcery.js';
import { createMagic, validateMagicSnapshot } from '../src/gameplay/magic/magic.js';
import { createCombat } from '../src/gameplay/combat/combat.js';
import { SKILLS, createSkills } from '../src/gameplay/skills/skills.js';
import { createWeapons, WEAPON_TYPES } from '../src/gameplay/combat/weapons.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createFarming, ALL_FARM_ROWS, farmRow } from '../src/gameplay/skills/farming/farming.js';
import { registerNesdorFarming, lockLong, unlockLong } from '../src/content/regions/nesdor/flats-ground.js';

/**
 * **Field sorcery** (the user, 5 October 2026): the farming techniques are sorcery cast with the
 * staff, and Taleth, Master Sorcerer of the Guild, is the only one who teaches them. Two workings
 * in this build: Sound the Soil, given with his charge, and Call the Dew, earned in Caricas.
 */
function fixture({ farming = null, beds = undefined, weapon = 'oak-staff', at = { x: 0, z: 0 }, clock = () => 77 } = {}) {
  const world = { bounds: { minX: -5000, maxX: 5000, minZ: -5000, maxZ: 5000 }, colliders: [], heightAt: () => 0 };
  const position = { x: at.x, y: 0, z: at.z, yaw: 0 }, events = [];
  const inventory = createInventoryState(); inventory.grant(weapon);
  const weapons = createWeapons({ inventory }); weapons.setCondition(weapon, WEAPON_TYPES[weapon].maxDurability); weapons.equip(weapon);
  const skills = createSkills();
  const combat = createCombat({ world, position, getWeapon: () => weapons.profile() });
  const magic = createMagic({ skills, inventory, weapons, combat, world, position, farming, clock,
    ...(beds === undefined ? {} : { fieldBeds: beds }), onEvent: event => events.push(event) });
  return { magic, skills, weapons, inventory, position, events };
}

/** A farm that records what it was asked. */
function fakeFarm({ watered = 0 } = {}) {
  const asked = [];
  return { asked,
    describeBed: (id, now) => { asked.push(['describe', id, now]); return { heart: 2, last: 'beans', likes: ['rye'], readiness: 'ready', text: `The ground at ${id} is in fair heart.` }; },
    waterAllWithin: (point, radius, now) => { asked.push(['water', point, radius, now]);
      return watered ? { ok: true, count: watered, watered: Array.from({ length: watered }, (_, i) => `bed-${i}`) } : { ok: false, count: 0, watered: [], reason: 'Nothing here is growing.' }; } };
}

test('field sorcery is a released school with four workings, and only Taleth and his charge teach them', () => {
  // Quicken and the Work of Nine join for Builds 2 and 3 (6 October 2026), learned in Nethereum and Nesdor.
  assert.deepEqual([...SCHOOLS.field.spells], ['sound-the-soil', 'call-the-dew', 'quicken', 'work-of-nine']);
  assert.equal(SCHOOLS.field.reserved, undefined, 'a school anybody may be taught, by the one man who teaches it');
  assert.equal(SKILLS.field.name, 'Field Sorcery');
  assert.equal(SKILLS.field.group, 'Sorcery');
  assert.match(SKILLS.field.teacher, /Taleth/);
  for (const id of ['sound-the-soil', 'call-the-dew', 'quicken', 'work-of-nine']) {
    assert.equal(SPELLS[id].school, 'field');
    assert.equal(learnableSpell(id), true, `${id} can be taught`);
  }
  // The user's rulings stand: Frost and Wards are nobody's to teach, and nor is Time.
  for (const id of ['frost', 'wards', 'time']) { assert.equal(SCHOOLS[id].reserved, true); assert.equal(SKILLS[id].reserved, true); }
  assert.equal(learnableSpell('slow'), false);
});

test('the workings cost five and twenty focus at the first level, hurt nobody, and still want a staff or a wand', () => {
  const sound = castWith('sound-the-soil', { level: 1, weapon: 'oak-staff' }), dew = castWith('call-the-dew', { level: 1, weapon: 'oak-staff' });
  assert.equal(sound.cost, 5);
  assert.equal(dew.cost, 20);
  assert.equal(sound.field, 'sound'); assert.equal(dew.field, 'water');
  assert.equal(sound.range, 6, 'the nearest bed within six metres');
  assert.equal(dew.range, 40, 'every bed within forty');
  assert.equal(sound.damage + dew.damage, 0);
  assert.equal(sound.cast, 0, 'planted, not thrown');
  assert.ok(castWith('call-the-dew', { level: 99, weapon: 'wand' }).cost < dew.cost, 'cheaper with practice');
  assert.equal(castWith('sound-the-soil', { level: 1, weapon: 'simple-sword' }), null, 'a sword casts nothing');
  assert.equal(castWith('fireball', { level: 1, weapon: 'oak-staff' }).field, null, 'and fire is not field work');
});

test('Sound the Soil reads the nearest bed within reach through the farm, for five focus', () => {
  const farm = fakeFarm();
  const game = fixture({ farming: farm, beds: [{ id: 'far', name: 'The far bed', x: 0, z: 5.5 }, { id: 'near', name: 'The near bed', x: 2, z: 1 }, { id: 'out', x: 0, z: 30 }] });
  assert.equal(game.magic.cast('sound-the-soil').ok, false, 'not before Taleth has shown it');
  assert.equal(game.magic.learn('sound-the-soil', { announce: false }).ok, true);
  assert.equal(game.inventory.has('wand'), false, 'the staff is focus enough; no spare wand');
  const before = game.magic.view().focus;
  const result = game.magic.cast('sound-the-soil');
  assert.equal(result.ok, true);
  assert.equal(result.bedId, 'near', 'the nearest bed answers');
  assert.equal(result.name, 'The near bed');
  assert.equal(result.text, 'The ground at near is in fair heart.');
  assert.deepEqual(farm.asked, [['describe', 'near', 77]], 'read on the play clock');
  assert.equal(game.magic.view().focus, before - 5);
  assert.equal(game.skills.xp('field'), SORCERY.xp.perSounding, 'a sounding that reached a bed pays the school');
  const event = game.events.find(entry => entry.type === 'field-working');
  assert.equal(event?.text, result.text, 'the host is told what to show');
  // Too far from any bed: refused, and it costs nothing.
  game.position.z = 20;
  const refused = game.magic.cast('sound-the-soil');
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /6 paces of a crop bed/);
  assert.equal(game.magic.view().focus, before - 5, 'bare earth costs nothing');
  // A sword in the hand is no staff.
  game.position.z = 0; game.inventory.grant('simple-sword'); game.weapons.equip('simple-sword');
  assert.equal(game.magic.cast('sound-the-soil').ok, false);
});

test('Sound the Soil reads a real bed of the farm, from where its beds are', () => {
  const farming = createFarming({ skills: createSkills() });
  const bed = ALL_FARM_ROWS.find(row => row.region === 'Caricas') ?? ALL_FARM_ROWS[0];
  const game = fixture({ farming, at: { x: bed.x + 1.5, z: bed.z } });
  game.magic.learn('sound-the-soil', { announce: false });
  const result = game.magic.cast('sound-the-soil');
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.bedId, bed.id);
  assert.ok(result.text.length > 20, 'and it says something about the ground');
});

test('Call the Dew waters every growing bed within forty metres, for twenty focus, and costs nothing when nothing wanted water', () => {
  const farm = fakeFarm({ watered: 3 });
  const game = fixture({ farming: farm, at: { x: 10, z: -4 } });
  game.magic.learn('call-the-dew', { announce: false });
  const before = game.magic.view().focus;
  const result = game.magic.cast('call-the-dew');
  assert.equal(result.ok, true);
  assert.equal(result.count, 3);
  assert.deepEqual(result.bedIds, ['bed-0', 'bed-1', 'bed-2']);
  assert.match(result.text, /3 growing beds/);
  assert.deepEqual(farm.asked, [['water', { x: 10, z: -4 }, 40, 77]], 'from where he stands, forty metres round, on the play clock');
  assert.equal(game.magic.view().focus, before - 20);
  assert.equal(game.skills.xp('field'), 3 * SORCERY.xp.perBedWatered, 'paid for each bed it watered');
  // Nothing growing: the farm's own reason, and the focus kept.
  const dry = fixture({ farming: fakeFarm({ watered: 0 }) });
  dry.magic.learn('call-the-dew', { announce: false });
  const kept = dry.magic.view().focus, refused = dry.magic.cast('call-the-dew');
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'Nothing here is growing.');
  assert.equal(dry.magic.view().focus, kept);
  assert.equal(dry.skills.xp('field'), 0);
  // And a real farm with nothing sown says so.
  const real = fixture({ farming: createFarming({ skills: createSkills() }), at: { x: ALL_FARM_ROWS[0].x, z: ALL_FARM_ROWS[0].z } });
  real.magic.learn('call-the-dew', { announce: false });
  assert.equal(real.magic.cast('call-the-dew').ok, false);
});

test('a harvest gives a little focus back, never past the pool, and the workings survive a save', () => {
  const game = fixture({ farming: fakeFarm({ watered: 2 }) });
  game.magic.learn('sound-the-soil', { announce: false }); game.magic.learn('call-the-dew', { announce: false });
  game.magic.cast('call-the-dew');
  const low = game.magic.view().focus;
  assert.equal(game.magic.refocus(), SORCERY.harvestFocus);
  assert.equal(game.magic.view().focus, low + SORCERY.harvestFocus);
  game.magic.refocus(10_000);
  assert.equal(game.magic.view().focus, game.magic.view().maxFocus, 'never past the pool');
  const saved = game.magic.snapshot();
  assert.equal(validateMagicSnapshot(saved), true);
  const again = fixture();
  assert.equal(again.magic.restore(saved), true);
  assert.equal(again.magic.known('sound-the-soil') && again.magic.known('call-the-dew'), true);
});

test('what the ground says is read from the farm’s whole line, or from its parts when there is no line', () => {
  assert.equal(soundingText({ heart: 2, likes: ['rye'], text: ' Rested and rich. ' }), 'Rested and rich.');
  assert.equal(soundingText({ heart: 'Rested.', last: 'Beans last.', likes: { text: 'Rye next.' }, readiness: 'Ready.' }), 'Rested. Beans last. Rye next. Ready.');
  assert.equal(soundingText('Wet.'), 'Wet.');
  assert.equal(soundingText(null), '');
  assert.equal(fieldXp('sound'), SORCERY.xp.perSounding);
  assert.equal(fieldXp('sound', 0), 0);
  assert.equal(fieldXp('water', 4), 4 * SORCERY.xp.perBedWatered);
  assert.equal(fieldXp('fire', 4), 0);
});

/**
 * **Quicken and the Work of Nine** (the groundwork for Builds 2 and 3, 6 October 2026): the workings
 * the Nethereum and Nesdor arcs teach, on a real farm that shares the satchel and the skills.
 */
const NORTH_BEDS = ALL_FARM_ROWS.filter(row => row.farmstead === 'caricas-north-fields');
function fieldGame({ seeds = {}, at = NORTH_BEDS[0], fieldOpen = null } = {}) {
  const time = { now: 0 };
  const game = fixture({ at: { x: at.x + 1, z: at.z }, clock: () => time.now });
  const farming = createFarming({ skills: game.skills, inventory: game.inventory, clock: () => time.now });
  for (const [id, n] of Object.entries(seeds)) game.inventory.add(id, n);
  const magic = createMagic({ skills: game.skills, inventory: game.inventory, weapons: game.weapons, world: { colliders: [], heightAt: () => 0 },
    combat: createCombat({ world: { bounds: { minX: -5000, maxX: 5000, minZ: -5000, maxZ: 5000 }, colliders: [], heightAt: () => 0 }, position: game.position, getWeapon: () => game.weapons.profile() }),
    position: game.position, farming, clock: () => time.now, ...(fieldOpen ? { fieldOpen } : {}), onEvent: event => game.events.push(event) });
  return { ...game, magic, farming, time };
}

test('the staff passes over a bed that is shut: Baugi’s long strip until he lends it, and any bed the host shuts', () => {
  // Settled at integration (6 October 2026): src/content/regions/nesdor/flats-ground.js keeps the long strip shut, and the host may shut
  // others (Liban's deep plots before they are let) through `fieldOpen`.
  const nesdor = fieldGame({ seeds: { 'barley-seed': 20 }, at: (() => { registerNesdorFarming(createFarming()); return farmRow('nesdor-long-1'); })() });
  registerNesdorFarming(nesdor.farming);
  nesdor.magic.learn('work-of-nine', { announce: false });
  lockLong();
  const shut = nesdor.magic.cast('work-of-nine', { seed: 'barley' });
  assert.equal(shut.ok, true, shut.reason);
  assert.equal(shut.farmstead, 'ninehands', 'the long strip is passed over for the nearest open farm');
  assert.ok(shut.sown.length === 9 && shut.sown.every(id => !id.startsWith('nesdor-long')), shut.sown.join(', '));
  unlockLong();
  nesdor.magic.refocus(100);
  const lent = nesdor.magic.cast('work-of-nine', { seed: 'barley' });
  assert.deepEqual([lent.ok, lent.farmstead, lent.sown.length], [true, 'ninehands-long', 6], 'lent, it is worked like any farm');
  lockLong();
  const [first, second] = NORTH_BEDS.map(row => row.id);
  const caricas = fieldGame({ seeds: { 'carrot-seed': 4 }, fieldOpen: id => id !== first });
  caricas.magic.learn('quicken', { announce: false });
  caricas.farming.sow(first, 'carrot', 0); caricas.farming.sow(second, 'carrot', 0);
  caricas.time.now = 10;
  assert.equal(caricas.magic.cast('quicken').bedId, second, 'the nearest bed the host has not shut');
});

test('Quicken ripens the nearest growing bed within six metres, for thirty focus, once a game day', () => {
  const game = fieldGame({ seeds: { 'carrot-seed': 4 } });
  const [near, second] = NORTH_BEDS.map(row => row.id);
  assert.equal(castWith('quicken', { level: 1, weapon: 'oak-staff' }).cost, 30);
  assert.equal(castWith('quicken', { level: 1, weapon: 'oak-staff' }).daily, true);
  assert.equal(game.magic.learn('quicken', { announce: false }).ok, true, 'an arc teaches it through magic.learn');
  const full = game.magic.view().focus;
  const bare = game.magic.cast('quicken');
  assert.deepEqual([bare.ok, bare.code], [false, 'no-growing-bed'], 'nothing growing');
  assert.equal(game.magic.view().focus, full, 'and bare earth costs nothing');
  game.farming.sow(near, 'carrot', 0); game.farming.sow(second, 'carrot', 0);
  game.time.now = 10;
  const result = game.magic.cast('quicken');
  assert.deepEqual([result.ok, result.kind, result.bedId], [true, 'quicken', near], 'the nearest growing bed');
  assert.equal(game.farming.rowState(near, 10).stage, 'ripe');
  assert.equal(game.farming.rowState(second, 10).stage, 'sown', 'one bed, not the farm');
  assert.equal(game.magic.view().focus, full - 30);
  assert.equal(game.skills.xp('field'), SORCERY.xp.perQuicken);
  assert.equal(SORCERY.xp.perQuicken, 15);
  assert.match(game.events.find(event => event.type === 'field-working' && event.kind === 'quicken').text, /carrots/);
  // Once a game day: refused the same day, at no cost, and the button says so.
  game.magic.refocus(100);
  const again = game.magic.cast('quicken');
  assert.deepEqual([again.ok, again.code], [false, 'spent']);
  assert.equal(game.magic.readiness('quicken').code, 'spent');
  assert.equal(game.farming.rowState(second, 10).stage, 'sown');
  // The day is saved with the spells, and a save from before Quicken loads without it.
  const saved = game.magic.snapshot();
  assert.equal(saved.quickened, 0);
  assert.equal(validateMagicSnapshot(saved), true);
  assert.equal(validateMagicSnapshot({ ...saved, quickened: -1 }), false);
  const { quickened, ...older } = saved;
  assert.equal(validateMagicSnapshot(older), true);
  const restored = fieldGame();
  assert.equal(restored.magic.restore(saved), true);
  assert.equal(restored.magic.cast('quicken').code, 'spent', 'a reload does not give the day back');
  // The next game day (midnight is eighteen minutes in) it works again.
  game.time.now = 1080;
  game.farming.harvest(near, 1080); game.farming.harvest(second, 1080);
  assert.equal(game.farming.sow(near, 'carrot', 1080).ok, true);
  assert.equal(game.magic.cast('quicken').ok, true);
  assert.equal(game.farming.rowState(near, 1080).stage, 'ripe');
});

test('the Work of Nine reaps every ripe bed of the nearest farmstead and sows the bare ones, asking which seed when there is a choice', () => {
  const game = fieldGame({ seeds: { 'carrot-seed': 2, 'barley-seed': 4 } });
  const [first, second, third] = NORTH_BEDS.map(row => row.id);
  assert.deepEqual([castWith('work-of-nine', { level: 1, weapon: 'oak-staff' }).cost, castWith('work-of-nine', { level: 1, weapon: 'oak-staff' }).range], [40, 40]);
  game.magic.learn('work-of-nine', { announce: false });
  game.farming.sow(first, 'carrot', 0);
  game.time.now = 100;
  const full = game.magic.view().focus;
  const asked = game.magic.cast('work-of-nine');
  assert.deepEqual([asked.ok, asked.code, asked.ripe, asked.bare], [false, 'choose-seed', 1, 2]);
  assert.ok(['carrot', 'barley'].every(id => asked.choices.some(choice => choice.id === id)), asked.choices.map(choice => choice.id).join(', '));
  assert.equal(game.magic.view().focus, full, 'asking costs nothing');
  assert.equal(game.farming.rowState(first, 100).stage, 'ripe', 'and nothing is done until he answers');
  assert.equal(game.magic.cast('work-of-nine', { seed: 'bridge-rye' }).code, 'no-seed', 'a seed he does not carry');
  const done = game.magic.cast('work-of-nine', { seed: 'barley' });
  assert.deepEqual([done.ok, done.kind, done.reaped, done.sown, done.crop, done.farmstead], [true, 'nine', [first], [second, third], 'barley', 'caricas-north-fields']);
  assert.equal(game.farming.rowState(first, 100).stage, 'bare', 'a bed reaped is left to rest or be sown again');
  assert.equal(game.inventory.count('barley-seed'), 2);
  assert.equal(game.magic.view().focus, full - 40);
  assert.equal(game.skills.xp('field'), 3 * SORCERY.xp.perBedWorked);
  assert.match(done.text, /one bed reaped and 2 beds sown with barley/);
  assert.ok(game.events.filter(event => event.type === 'field-working').length === 1);
  // Nothing ripe and nothing bare: refused, and free.
  game.magic.refocus(100);
  game.inventory.remove('carrot-seed', 2);
  game.farming.sow(first, 'barley', 100);
  const idle = game.magic.cast('work-of-nine');
  assert.deepEqual([idle.ok, idle.code], [false, 'idle']);
  // One kind of seed and nothing to ask: it simply sows.
  const single = fieldGame({ seeds: { 'barley-seed': 3 } });
  single.magic.learn('work-of-nine', { announce: false });
  const sown = single.magic.cast('work-of-nine');
  assert.deepEqual([sown.ok, sown.sown.length, sown.crop], [true, 3, 'barley']);
  // Out of reach of any farm.
  const far = fieldGame({ at: { x: 0, z: 0 } });
  far.magic.learn('work-of-nine', { announce: false });
  assert.equal(far.magic.cast('work-of-nine').code, 'no-farm');
});
