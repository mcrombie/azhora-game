import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { GARDEN_KEEPER, BIRD_WATCHER, GARDEN_BIRDS, JEAN_STAND } from '../src/birding.js';
import { MERCENARY_ROSTER, ARRIVALS, createMercenaryCompany } from '../src/mercenaries.js';
import { villageToWorld } from '../src/region-world.js';

const root = new URL('../', import.meta.url);
const file = rel => readFileSync(fileURLToPath(new URL(rel, root)), 'utf8');

let built = null;
async function village() {
  built ??= (async () => {
    const { createWorld } = await sourceModule('../src/world.js');
    return createWorld(new THREE.Scene());
  })();
  return built;
}

test('Jean stands beside the departing road with clear ground, while her bird garden remains in town', async () => {
  const world = await village();
  assert.ok(canStand(JEAN_STAND.x, JEAN_STAND.z, world, .34), 'Jean has clear ground');
  assert.equal(world.regionAt(JEAN_STAND.x, JEAN_STAND.z)?.name, 'Drent');
  assert.ok(Math.hypot(JEAN_STAND.x - world.birdGarden.stand.x, JEAN_STAND.z - world.birdGarden.stand.z) > 10,
    'her garden and roadside teaching stand are separate');
  for (const spot of [world.birdGarden.hook, world.birdGarden.bath, world.birdGarden.bench]) {
    if (spot) assert.ok(Number.isFinite(spot.x) && Number.isFinite(spot.z));
  }
});

test('Lakota is not in Drent until he walks into it', () => {
  const lakota = MERCENARY_ROSTER.find(merc => merc.id === BIRD_WATCHER.id);
  assert.equal(lakota.arrival, ARRIVALS.lakota);
  assert.ok(lakota.arrival > 0, 'he is not ashore at the first minute');
  const road = [{ x: 0, z: 0 }, { x: -100, z: 0 }, { x: -400, z: 300 }];
  const company = createMercenaryCompany({ road, stops: [], muster: { x: -400, z: 250 }, landing: { x: 3, z: 3 } });
  const index = MERCENARY_ROSTER.indexOf(lakota);
  // Before his hour he is `coming`, which is what the host hides him by.
  for (const at of [0, 60, lakota.arrival - 1]) {
    assert.equal(company.placements(at)[index].phase, 'coming', `at ${at} s he has not landed`);
  }
  assert.notEqual(company.placements(lakota.arrival + 1)[index].phase, 'coming', 'and then he has');
});

test('the garden is Jean’s everywhere the game says so, and Lakota teaches none of it', () => {
  const main = file('src/main.js'), birding = file('src/birding.js');
  assert.match(main, /world\.npcPositions\[GARDEN_KEEPER\.id\]=\{x:JEAN_STAND\.x,z:JEAN_STAND\.z\}/, 'Jean uses her roadside stand');
  assert.doesNotMatch(main, /npcData\.push\(\{\.\.\.BIRD_WATCHER/, 'Lakota is not pushed in as a villager any more');
  assert.doesNotMatch(main, /function placeLakota/, 'and is not walked between a pier and a garden');
  assert.match(main, /modelRole:merc\.modelRole\?\?'mercenary'/, 'a hired sword may carry his own model');
  assert.match(main, /if\(npc\.id===GARDEN_KEEPER\.id\)\{gardenKeeperConversation/, 'the garden is Jean’s conversation');
  // Lakota's own conversation has to come before the roster's, or the company would answer for him.
  assert.ok(main.indexOf('birdWatcherConversation(npc,{birding,lakota') < main.indexOf("if(mercenaryIds.has(npc.id)){mercenaryConversation(npc)")
    || main.indexOf("if(mercenaryIds.has(npc.id)){mercenaryConversation(npc)") < 0
    || main.indexOf('if(npc.id===BIRD_WATCHER.id){birdWatcherConversation') > 0, 'his own conversation is dispatched');
  assert.match(main, /mercenaryChoices:mercenaryChoices\(npc(?:,|\))/, 'and carries the company’s two choices');
  assert.match(main, /lakota:lakota\.snapshot\(\)/, 'knowing him is saved');
  // The feeder errand is Jean's from end to end.
  assert.match(birding, /Jean says you keep sugar/, 'Lysa is asked on Jean’s behalf');
  assert.doesNotMatch(birding, /Lakota says you keep sugar/);
});

test('nothing left in the game teaches birding in Lakota’s name', () => {
  const stale = [/Speak with Lakota to learn birding/, /Lakota’s garden/, /Lakota's garden/, /Ansel in Tidehaven/,
    /the birder (of|in) Tidehaven/, /Tidehaven’s bird-watcher/, /Lakota[^.]{0,30}teaches (?:it|birding)[^.]{0,20}bird/i];
  const names = ['index.html', 'README.md', ...readdirSync(fileURLToPath(new URL('src/', root))).filter(n => n.endsWith('.js')).map(n => `src/${n}`)];
  for (const name of names) {
    const text = file(name);
    for (const pattern of stale) assert.doesNotMatch(text, pattern, `${name} still sends the player to Lakota for birding`);
  }
  // And the birds Jean talks about are her own garden's.
  assert.deepEqual([...GARDEN_BIRDS], ['chickadee', 'catbird', 'wren']);
  assert.equal(GARDEN_KEEPER.name, 'Jean');
  assert.equal(GARDEN_KEEPER.role, 'Birding teacher');
  assert.equal(GARDEN_KEEPER.look.hairStyle, 'long');
  assert.equal(GARDEN_KEEPER.look.straightHair, true);
  assert.equal(GARDEN_KEEPER.look.hair, 0xc6a15d);
  assert.equal(GARDEN_KEEPER.look.slight, true);
  assert.equal(GARDEN_KEEPER.hat, false);
  assert.equal(GARDEN_KEEPER.modelRole, 'garden-keeper');
  assert.notEqual(GARDEN_KEEPER.modelRole, BIRD_WATCHER.modelRole, 'and she has her own appearance');
});
