import test from 'node:test';
import assert from 'node:assert/strict';
import { SUBREGIONS, SUBREGION_IDS, subregion, subregionsAt, createMapFog, validateMapFogSnapshot } from '../src/ui/map/map-fog.js';
import { IBENWOOD_GROVES, IBENWOOD_ARRIVALS, IBENWOOD_PILOT } from '../src/content/regions/ibenwood/ibenwood-environment.js';
import { FACTIONS, describeRegion } from '../src/content/chapters/civil-war/campaign-world.js';
import { createCampaign, campaignGraphIssues, SIDES } from '../src/content/chapters/civil-war/campaign.js';
import { buildStatusList, regionBuildStatus } from '../src/dev/tools/build-status.js';
import { PLAYABLE_REGIONS } from '../src/world/terrain/region-layout.js';

test('Ibenwood chart names follow the actual groves and arrival points without duplicating the Central grove', () => {
  for (const grove of IBENWOOD_GROVES) {
    const area = subregion(grove.id);
    assert.ok(area);
    assert.equal(area.name, grove.name); assert.equal(area.region, grove.region);
    assert.equal(area.x, grove.x); assert.equal(area.z, grove.z); assert.equal(area.radius, grove.radius);
    assert.equal(subregionsAt(grove.x, grove.z)[0].id, grove.id);
  }
  for (const [region, point] of Object.entries(IBENWOOD_ARRIVALS)) {
    const areas = subregionsAt(point.x, point.z);
    assert.equal(areas[0]?.region, region, `${region} arrival needs a local label`);
    assert.equal(areas.length, 1, `${region} arrival should have one name`);
  }
  assert.equal(subregionsAt(IBENWOOD_PILOT.x, IBENWOOD_PILOT.z)[0].name, 'East Ibenwood Grove');
  const oldEnd = SUBREGION_IDS.indexOf('long-pasture');
  assert.ok(SUBREGIONS.slice(oldEnd + 1).every(area => area.region.endsWith(' Ibenwood')));
  assert.equal(new Set(SUBREGION_IDS).size, SUBREGION_IDS.length);
});

test('old version-one fog saves keep every old discovery and discover Ibenwood only on arrival', () => {
  const priorIds = SUBREGION_IDS.slice(0, SUBREGION_IDS.indexOf('long-pasture') + 1);
  const oldSave = { version: 1, cells: ['0,0', '-29,110'], subregions: [...priorIds] };
  assert.ok(validateMapFogSnapshot(oldSave));
  const fog = createMapFog();
  assert.ok(fog.restore(oldSave));
  assert.deepEqual(fog.snapshot(), oldSave);
  const grove = IBENWOOD_GROVES[0];
  assert.ok(fog.reveal(grove.x, grove.z).subregions.includes(grove.id));
  assert.deepEqual(fog.snapshot().subregions.slice(0, priorIds.length), priorIds);
  const copy = createMapFog();
  assert.ok(copy.restore(fog.snapshot()));
  assert.deepEqual(copy.snapshot(), fog.snapshot());
});

test('Elfland rules the Central heart while outer Ibenwood descriptions retain divided territorial control', () => {
  const heart = describeRegion('Central Ibenwood');
  assert.equal(heart.control, 'elfland'); assert.equal(heart.faction.name, 'Elfland');
  assert.ok(Object.isFrozen(FACTIONS.elfland));
  assert.match(FACTIONS.elfland.note, /independent elven kingdom/);
  for (const [direction, belt] of Object.entries({ North: 'southern', East: 'western', South: 'northern', West: 'eastern' })) {
    const outer = describeRegion(`${direction} Ibenwood`);
    assert.equal(outer.control, 'wild', 'one faction must not claim the whole outer region');
    assert.match(outer.role, /Human Forest Mittoli communities live in the outer forest/);
    assert.ok(outer.role.includes(`Elfland rules the ${belt} inner belt`));
  }
});

test('Elfland metadata leaves campaign sides, saved political overrides and the story graph intact', () => {
  const campaign = createCampaign(), saved = campaign.snapshot();
  assert.equal(campaign.mapControl()['Central Ibenwood'], 'elfland');
  assert.deepEqual(SIDES, ['empire', 'coalition']);
  assert.deepEqual(Object.keys(saved.trust).sort(), ['coalition', 'empire']);
  saved.control = { 'West Suval': 'empire', 'Moros Plain': 'coalition' };
  assert.ok(campaign.restore(saved));
  assert.deepEqual(campaign.snapshot(), saved);
  assert.equal(campaign.mapControl()['West Suval'], 'empire');
  assert.equal(campaign.mapControl()['Moros Plain'], 'coalition');
  assert.equal(campaign.mapControl()['Central Ibenwood'], 'elfland');
  assert.deepEqual(campaignGraphIssues(), []);
});

test('the five Ibenwood entries report environment previews and preserve playable chart ordering', () => {
  for (const region of Object.keys(IBENWOOD_ARRIVALS)) {
    const entry = regionBuildStatus(region);
    assert.equal(entry.state, 'environment');
    assert.equal(entry.label, 'Environment preview');
    assert.ok(entry.playable);
    for (const pending of ['Ranger', 'stealth', 'withdrawal', 'magical fauna', 'interiors']) assert.ok(entry.work.includes(pending));
    assert.match(entry.work, /incomplete/);
  }
  assert.deepEqual(buildStatusList().slice(0, PLAYABLE_REGIONS.length).map(entry => entry.id), [...PLAYABLE_REGIONS]);
  assert.equal(regionBuildStatus('Feradom').state, 'edge');
});
