import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWN_NPCS, TOWN_NPC_IDS, TOWN_BEGGAR_ROUTE, REBEL_CONTACT, townConversation } from '../src/luscia-town.js';
import { createCampaign, REGIONAL_ARCS } from '../src/campaign.js';
import { regionNpcPositions, LUMBER_TOWN, regionAt, MAIN_ROAD } from '../src/regions.js';
import { createInventoryState } from '../src/inventory.js';
import { canStand } from '../src/game-state.js';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());

function fixture() {
  const campaign = createCampaign();
  campaign.completeChapter('drent-road');          // the war begins beyond the Caloss
  const inventory = createInventoryState();
  const acted = [];
  let shown = null;
  const context = {
    campaign, inventory, act: id => { acted.push(id); return campaign.resolveArc(REBEL_CONTACT.region, REBEL_CONTACT.side); },
    openDialogue(npc, lines, event, label, options) { shown = { npc, lines, event, label, options }; },
    closeDialogue() { shown = null; },
  };
  const api = {
    campaign, inventory, acted, context,
    get shown() { return shown; },
    talk(id) { townConversation(TOWN_NPCS.find(npc => npc.id === id), context); return api; },
    choice(id) { return shown?.options?.choices?.find(item => item.id === id); },
    choose(id) { const choice = api.choice(id); assert.ok(choice, `missing choice ${id}`); choice.action(); return api; },
  };
  return api;
}

test('every townsperson stands in Lumber Town and says something of the town', () => {
  assert.ok(TOWN_NPCS.length >= 5 && TOWN_NPCS.length <= 8, `${TOWN_NPCS.length} townsfolk`);
  for (const npc of TOWN_NPCS) {
    const stand = regionNpcPositions[npc.id];
    assert.ok(stand, `${npc.id} has a stand`);
    assert.ok(Math.hypot(stand.x - LUMBER_TOWN.square.x, stand.z - LUMBER_TOWN.square.z) < LUMBER_TOWN.radius,
      `${npc.id} stands inside the town`);
    assert.equal(regionAt(stand.x, stand.z).name, 'Luscia', `${npc.id} stands in Luscia`);
    assert.ok(npc.name && npc.role && npc.modelRole, `${npc.id} is a person, not an id`);
  }
  assert.deepEqual([...TOWN_NPC_IDS].sort(), TOWN_NPCS.map(npc => npc.id).sort());
});

test('the main road runs through the town square and the town keeps its distance from the Lauvel', () => {
  const onRoad = MAIN_ROAD.some(point => Math.hypot(point.x - LUMBER_TOWN.square.x, point.z - LUMBER_TOWN.square.z) < 1);
  assert.ok(onRoad, 'the square is a point on the main road');
  for (const [name, place] of [['the field at the Lauvel', { x: -386, z: 182.9 }], ['the burned hamlet', { x: -348, z: 212 }],
    ['the Caloss bridge', { x: -345, z: 92.9 }]]) {
    assert.ok(Math.hypot(place.x - LUMBER_TOWN.square.x, place.z - LUMBER_TOWN.square.z) > 40, `open ground between the town and ${name}`);
  }
  assert.ok(TOWN_BEGGAR_ROUTE.every(point => Math.hypot(point.x - LUMBER_TOWN.square.x, point.z - LUMBER_TOWN.square.z) < LUMBER_TOWN.radius));
});

test('the townsfolk have ambient lines and hand out no errands', () => {
  const f = fixture();
  for (const id of ['town-innkeeper', 'town-carter', 'town-elder', 'town-sawyer', 'town-yardhand']) {
    f.talk(id);
    assert.ok(f.shown.lines.length >= 1 && f.shown.lines.length <= 2, `${id} says one or two lines`);
    assert.deepEqual(f.shown.options.choices.map(choice => choice.id), ['leave-town-talk'], `${id} offers no quest`);
  }
  f.talk('town-innkeeper');
  assert.match(f.shown.lines.join(' '), /chit/i, 'the Legion pays the inn in chits');
});

test('the stall keeper stays a stall keeper unless all three careful things are said', () => {
  const wrongTurns = [
    ['hara-legion', 'hara-loyal'],
    ['hara-legion', 'hara-other-side', 'hara-rebels'],
    ['hara-timber'],
  ];
  for (const path of wrongTurns) {
    const f = fixture();
    f.talk('timber-stall');
    for (const id of path) f.choose(id);
    const said = (f.shown?.lines ?? []).join(' ');
    assert.doesNotMatch(said, /republic/i, `${path.join(' → ')} must not reveal her`);
    assert.doesNotMatch(said, /rangers/i, `${path.join(' → ')} must not reveal the rangers`);
    assert.equal(f.acted.length, 0, 'nothing is recorded');
    assert.equal(f.campaign.state.arcs.Luscia, undefined);
  }
});

test('asking about the Legion, then the other side, then the families reveals the republic’s contact', () => {
  const f = fixture();
  f.talk('timber-stall');
  assert.match(f.shown.lines.join(' '), /cloth/i);
  f.choose(REBEL_CONTACT.reveal[0]);
  assert.match(f.shown.lines.join(' '), /chits/);
  f.choose(REBEL_CONTACT.reveal[1]);
  assert.match(f.shown.lines.join(' '), /What other side/);
  f.choose(REBEL_CONTACT.reveal[2]);
  const reveal = f.shown.lines.join(' ');
  assert.match(reveal, /republic/);
  assert.match(reveal, /rangers/);
  assert.ok(f.choice('hara-join'), 'she offers the arc');
  assert.ok(f.choice('hara-decline'), 'and it can be refused');
});

test('taking her offer starts Luscia’s Coalition arc through the campaign, and refusing records nothing', () => {
  const refused = fixture();
  refused.talk('timber-stall');
  for (const id of REBEL_CONTACT.reveal) refused.choose(id);
  refused.choose('hara-decline');
  assert.equal(refused.acted.length, 0);
  assert.equal(refused.campaign.state.arcs.Luscia, undefined);

  const f = fixture();
  f.talk('timber-stall');
  for (const id of REBEL_CONTACT.reveal) f.choose(id);
  f.choose('hara-join');
  assert.deepEqual(f.acted, ['join-luscia-rebels']);
  assert.equal(f.campaign.state.arcs.Luscia, 'coalition');
  assert.equal(f.campaign.mapControl().Luscia, 'coalition');
  assert.ok(f.campaign.view().trust.coalition > 15, 'the republic thinks better of you');
  assert.equal(f.campaign.view().exposed, false, 'one arc before the fork is not double-dealing');
  assert.ok(REGIONAL_ARCS.Luscia.coalition.includes('rangers'));
  // Afterwards she speaks as an ally and offers the arc no more.
  f.talk('timber-stall');
  assert.match(f.shown.lines.join(' '), /Solis/);
  assert.equal(f.choice('hara-join'), undefined);
  assert.equal(f.choice(REBEL_CONTACT.reveal[0]), undefined);
});

test('the town leaves clear ground under every stand and every point of Smiths’s round', () => {
  for (const npc of TOWN_NPCS) {
    const stand = regionNpcPositions[npc.id];
    assert.ok(canStand(stand.x, stand.z, world, .48), `${npc.id} is walled in at ${stand.x}, ${stand.z}`);
  }
  for (const id of ['relay-clerk', 'town-beggar']) {
    const stand = regionNpcPositions[id];
    assert.ok(canStand(stand.x, stand.z, world, .48), `${id} is walled in at ${stand.x}, ${stand.z}`);
  }
  // A blocked wander point would strand Smiths somewhere off his round for good.
  for (const [index, point] of TOWN_BEGGAR_ROUTE.entries())
    assert.ok(canStand(point.x, point.z, world, .48), `Smiths cannot reach point ${index} at ${point.x}, ${point.z}`);
  // The square and the road through it stay walkable between the stalls.
  assert.ok(canStand(LUMBER_TOWN.square.x, LUMBER_TOWN.square.z, world, .5), 'the market square is blocked');
  for (let step = -20; step <= 20; step += 4) {
    const x = LUMBER_TOWN.square.x + LUMBER_TOWN.along.x * step, z = LUMBER_TOWN.square.z + LUMBER_TOWN.along.z * step;
    assert.ok(canStand(x, z, world, .5), `the road through the town is blocked ${step} m along`);
  }
});
