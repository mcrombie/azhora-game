import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUILD_STATES, BUILD_STATUS, buildStatusList, regionBuildStatus } from '../src/build-status.js';
import { PLAYABLE_REGIONS } from '../src/region-layout.js';

const atlasNames = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'))
  .regions.map(region => region.name);

test('the build chart lists every canonical atlas region exactly once', () => {
  const names = buildStatusList().map(entry => entry.id);
  assert.equal(atlasNames.length, 132);
  assert.equal(new Set(names).size, names.length, 'no duplicate regions');
  assert.deepEqual([...names].sort(), [...atlasNames].sort(), 'no omitted regions or campaign-only aliases');
});

test('registered regions keep their order ahead of alphabetically sorted unbuilt regions', () => {
  const names = buildStatusList().map(entry => entry.id);
  assert.deepEqual(names.slice(0, PLAYABLE_REGIONS.length), [...PLAYABLE_REGIONS]);
  const extraStatuses = Object.keys(BUILD_STATUS).filter(id => !PLAYABLE_REGIONS.includes(id));
  assert.deepEqual(names.slice(PLAYABLE_REGIONS.length, PLAYABLE_REGIONS.length + extraStatuses.length), extraStatuses);
  const remaining = names.slice(PLAYABLE_REGIONS.length + extraStatuses.length);
  assert.deepEqual(remaining, [...remaining].sort());
});

test('listing the whole atlas preserves authored build states and closed borders', () => {
  for (const entry of buildStatusList()) {
    const authored = BUILD_STATUS[entry.id];
    if (!authored) continue;
    const state = BUILD_STATES[authored.state];
    assert.deepEqual(entry, {
      id: entry.id, state: state.id, label: state.label, colour: state.colour, order: state.order,
      playable: state.order >= 2, detail: authored.detail || state.note, work: authored.work,
    }, entry.id);
    assert.ok(Object.isFrozen(entry), entry.id);
  }
  for (const id of ['East Suval', 'Feradom']) {
    assert.equal(regionBuildStatus(id).state, 'edge', id);
    assert.equal(regionBuildStatus(id).playable, false, `${id} remains closed`);
  }
  assert.equal(regionBuildStatus('Drent').state, 'built');
  assert.equal(regionBuildStatus('East Ibenwood').state, 'environment');
});

test('all atlas regions without authored build status remain unbuilt and inaccessible', () => {
  const list = buildStatusList();
  const unbuiltNames = atlasNames.filter(id => !Object.hasOwn(BUILD_STATUS, id));
  assert.ok(unbuiltNames.includes('Anubrul'), 'an atlas region absent from campaign design is covered');
  for (const id of unbuiltNames) {
    const entry = list.find(region => region.id === id);
    assert.ok(entry, `${id} is listed`);
    assert.equal(entry.state, 'unbuilt', id);
    assert.equal(entry.playable, false, id);
    assert.equal(entry.order, 0, id);
    assert.equal(entry.detail, BUILD_STATES.unbuilt.note, id);
    assert.equal(entry.work, 'The whole region.', id);
  }
});
