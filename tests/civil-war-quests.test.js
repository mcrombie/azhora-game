import test from 'node:test';
import assert from 'node:assert/strict';
import { CIVIL_WAR_SERIES, CIVIL_WAR_REGIONS, civilWarRegion } from '../src/civil-war-quests.js';
import { REGION_DESIGN } from '../src/campaign-world.js';

test('The Ambroni Civil War is a silver plot series with a distinct regional registry', () => {
  assert.deepEqual(CIVIL_WAR_SERIES, { id: 'ambroni-civil-war', title: 'Ambroni Civil War', grade: 'plot' });
  const required = ['Vastos', 'Meneth', 'Caricas', 'Moros Plain', 'Nesdor', 'Luscia', 'Peblos', 'Pueth', 'Feradom', 'Amod', 'East Lotharn Mountains', 'West Lotharn Mountains'];
  for (const name of required) assert.ok(civilWarRegion(name), `Missing regional quest: ${name}`);
  const authored = new Set(REGION_DESIGN.map(item => item.id));
  for (const quest of CIVIL_WAR_REGIONS) assert.ok(authored.has(quest.region), `Non-atlas region: ${quest.region}`);
  assert.equal(new Set(CIVIL_WAR_REGIONS.map(item => item.id)).size, CIVIL_WAR_REGIONS.length);
  assert.equal(new Set(CIVIL_WAR_REGIONS.map(item => item.region)).size, CIVIL_WAR_REGIONS.length);
  assert.equal(new Set(CIVIL_WAR_REGIONS.map(item => item.title)).size, CIVIL_WAR_REGIONS.length);
});

test('Only The Common Water in Vastos is playable in this pass', () => {
  assert.deepEqual(CIVIL_WAR_REGIONS.filter(item => item.status === 'playable').map(item => item.id), ['civil-war-vastos']);
  assert.equal(civilWarRegion('Vastos').title, 'The Common Water');
  for (const quest of CIVIL_WAR_REGIONS) assert.ok(['planned', 'playable'].includes(quest.status));
});

test('Each regional design has its own problem and all three local political routes', () => {
  assert.equal(new Set(CIVIL_WAR_REGIONS.map(item => item.premise)).size, CIVIL_WAR_REGIONS.length);
  for (const outcome of ['republican', 'monarchist', 'mediation']) {
    const hooks = CIVIL_WAR_REGIONS.map(item => item.routes[outcome]);
    assert.ok(hooks.every(hook => typeof hook === 'string' && hook.length > 30));
    assert.equal(new Set(hooks).size, hooks.length, `Repeated ${outcome} design`);
  }
});

test('Undiscovered premises do not expose the hidden mediation route or its prerequisites', () => {
  for (const quest of CIVIL_WAR_REGIONS) assert.doesNotMatch(quest.premise, /hidden|mediation|concession|covenant|unlock|republican|monarchist/i);
});

test('Moros resolves to the canonical Moros Plain quest and unknown regions have none', () => {
  assert.equal(civilWarRegion('Moros'), civilWarRegion('Moros Plain'));
  assert.equal(civilWarRegion('  moros   plain  '), civilWarRegion('Moros Plain'));
  assert.equal(civilWarRegion('civil-war-vastos'), civilWarRegion('Vastos'));
  assert.equal(civilWarRegion('Unmapped Province'), null);
  assert.equal(civilWarRegion(null), null);
});
