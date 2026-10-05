import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createBarrettGeography, validateBarrettGeography, barrettConversation, BARRETT_GEOGRAPHY_COOLDOWN } from '../src/barrett-geography.js';
import { BARRETT, RYAN } from '../src/willowmere-family.js';
import { createCartography, CHART_XP } from '../src/cartography.js';
import { createSkills } from '../src/skills.js';

const regions = [{ name: 'Drent', centerX: 0, centerY: 0 }, { name: 'Cape Thalmagar', centerX: -100, centerY: -100 },
  { name: 'Unbuilt northern land', centerX: 0, centerY: -100 }];
function setup(extra = {}) {
  const skills = createSkills(), cartography = createCartography({ skills }); cartography.learn(); cartography.hear('Drent');
  const events = [], changed = [];
  const geography = createBarrettGeography({ cartography, regions, random: () => 0, onEvent: e => events.push(e), onChange: s => changed.push(s), ...extra });
  return { skills, cartography, geography, events, changed };
}

test('Barrett names one random unknown region, even unbuilt or distant lands, through normal Cartography', () => {
  const { geography, cartography, skills, events, changed } = setup();
  const xp = skills.xp('cartography'), first = geography.ask(20);
  assert.equal(first.region, 'Cape Thalmagar'); assert.equal(first.kind, 'new-region');
  assert.equal(cartography.named(first.region), true); assert.equal(cartography.state(first.region), 'heard');
  assert.equal(cartography.hexes(first.region), 0, 'a name never fabricates visited terrain');
  assert.equal(skills.xp('cartography') - xp, CHART_XP.heard);
  assert.match(first.lines[0], /north-west of Drent/); assert.equal(events.length, 1); assert.equal(changed.length, 1);
  const second = geography.ask(20 + BARRETT_GEOGRAPHY_COOLDOWN);
  assert.equal(second.region, 'Unbuilt northern land'); assert.match(second.lines[0], /north of Drent/);
  const snapshot = cartography.snapshot(), before = skills.xp('cartography');
  const third = geography.ask(260); assert.equal(third.kind, 'remembered-region'); assert.notEqual(third.region, second.region);
  assert.deepEqual(cartography.snapshot(), snapshot); assert.equal(skills.xp('cartography'), before);
});

test('the active-play cooldown survives saving and reloading and repeated early visits are quiet', () => {
  const { geography, cartography } = setup(); geography.ask(50);
  const saved = geography.snapshot(), chart = cartography.snapshot();
  for (const at of [50, 50, 50, 70, 169.999]) {
    const response = geography.ask(at); assert.equal(response.kind, 'quiet'); assert.ok(response.remaining > 0);
    assert.deepEqual(geography.snapshot(), saved); assert.deepEqual(cartography.snapshot(), chart);
  }
  const restored = createBarrettGeography({ cartography, regions, random: () => 0 });
  assert.equal(restored.restore(saved), true); assert.equal(restored.remaining(70), 100); assert.equal(restored.ask(169).kind, 'quiet');
  assert.equal(restored.ask(170).ok, true); assert.equal(restored.remaining(170), 120);
  // Moving the queried clock backwards never refreshes the cooldown.
  assert.equal(restored.ask(0).kind, 'quiet');
});

test('the real full atlas supplies every named region and does not filter by implementation or region level', async () => {
  const atlas = JSON.parse(await readFile(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
  const { geography, cartography } = setup({ regions: () => atlas.regions, random: () => .613 });
  const count = atlas.regions.filter(r => r.name !== 'Urubond' && !cartography.named(r.name ?? r.id)).length, names = new Set();
  for (let i = 0; i < count; i++) {
    const answer = geography.ask(i * BARRETT_GEOGRAPHY_COOLDOWN);
    assert.equal(answer.ok, true); assert.equal(answer.kind, 'new-region'); assert.equal(names.has(answer.region), false); names.add(answer.region);
  }
  assert.ok(names.has('Cape Thalmagar')); assert.ok(names.has('East Lotharn Mountains'));
  assert.equal(names.size, count); assert.ok(count > 100); assert.equal(names.has('Urubond'),false);
  assert.equal(geography.ask(count * BARRETT_GEOGRAPHY_COOLDOWN).kind, 'remembered-region');
});

test('missing maps, a still-loading atlas and invalid clocks do not consume a geography gift', () => {
  const cartography = createCartography(), geography = createBarrettGeography({ cartography, regions });
  const initial = geography.snapshot(); assert.equal(geography.ask(0).kind, 'no-chart'); assert.deepEqual(geography.snapshot(), initial);
  cartography.learn();
  const waiting = createBarrettGeography({ cartography, regions: () => null });
  assert.equal(waiting.ask(0).kind, 'not-ready'); assert.deepEqual(waiting.snapshot(), initial);
  for (const time of [NaN, Infinity, -1, 1e9]) assert.equal(geography.ask(time).ok, false);
  assert.deepEqual(geography.snapshot(), initial); assert.equal(geography.ask(0).ok, true);
});

test('saved geography validates chronology and unique region records without requiring a loaded atlas', () => {
  const { geography } = setup(); geography.ask(100); const saved = geography.snapshot();
  assert.equal(validateBarrettGeography(undefined), true); assert.equal(validateBarrettGeography(undefined, { allowMissing: false }), false);
  assert.equal(validateBarrettGeography(saved, { playSeconds: 100 }), true);
  assert.equal(validateBarrettGeography(saved, { playSeconds: 99 }), false);
  for (const bad of [{ ...saved, version: 2 }, { ...saved, lastAt: -1 }, { ...saved, lastAt: null },
    { ...saved, lastRegion: 'Unrecorded' }, { ...saved, told: [...saved.told, ...saved.told] }, { ...saved, told: [''] }]) {
    assert.equal(validateBarrettGeography(bad), false); assert.equal(geography.restore(bad), false); assert.deepEqual(geography.snapshot(), saved);
  }
  saved.told.push('Another place'); assert.notDeepEqual(geography.snapshot(), saved, 'snapshots do not share internal arrays');
  assert.equal(geography.restore(), true); assert.equal(geography.remaining(0), 0);
});

test('Barrett chooses a region himself and never adds a wayfinding or region-selection menu', () => {
  const { geography } = setup(), panels = [], closeDialogue = () => {};
  const context = { geography, playSeconds: () => 12, closeDialogue,
    openDialogue: (npc, lines, unused, label, options) => panels.push({ npc, lines, label, options }) };
  assert.equal(barrettConversation(RYAN, context), false); assert.equal(panels.length, 0);
  assert.equal(barrettConversation(BARRETT, context), true); assert.equal(panels.length, 1);
  assert.equal(panels[0].options.noWayfinding, true);
  assert.deepEqual(panels[0].options.choices.map(choice => choice.id), ['barrett-geography', 'barrett-leave']);
  assert.equal(geography.snapshot().lastAt, null, 'merely talking never consumes a chart gift');
  panels[0].options.choices[0].action();
  assert.match(panels[1].lines[0], /Cape Thalmagar/); assert.equal(panels[1].options.choices, undefined);
  panels[1].options.onComplete(); panels[2].options.choices[0].action();
  assert.equal(panels[3].label, 'Sit quietly'); assert.match(panels[3].lines[0], /quiet together/);
  assert.equal(geography.snapshot().lastAt, 12, 'an early repeat does not extend the cooldown');
  assert.equal(RYAN.look.hairStyle, 'short-cropped'); assert.equal(BARRETT.look.hairStyle, 'short-cropped');
  assert.equal(RYAN.look.hat, false); assert.equal(BARRETT.look.hat, false); assert.equal(BARRETT.scale, .68);
});
