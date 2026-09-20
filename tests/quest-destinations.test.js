import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { createJourney } from '../src/journey.js';
import { createLusciaChapter, LUSCIA_SITES } from '../src/luscia-chapter.js';
import { createMorosChapter, MOROS_SITES } from '../src/moros-chapter.js';
import { createBorderChapter, BORDER_NPCS } from '../src/border-chapter.js';
import { createAftermathChapter } from '../src/aftermath-chapter.js';
import { AFTERMATH_SITES } from '../src/aftermath-sites.js';
import { AFTERMATH_NPCS } from '../src/aftermath-chapter.js';
import { createRegionalLife } from '../src/regional-life.js';
import { createForestStory } from '../src/forest-story.js';
import { createForestHideoutQuest, FOREST_HIDEOUT_QUEST, HIDEOUT_GARRISON } from '../src/forest-hideout.js';
import { LEGION_POSTS } from '../src/legion-posts.js';
import { SOLIS_NPCS } from '../src/solis-town.js';

/**
 * A quest step points the traveler at a destination by id: the journal writes its name,
 * the local map pins it and the autopilot walks to it. If nothing in the world answers
 * to that id the marker is silently nothing, and if the place it names has no standable
 * ground beside it the traveler can be sent somewhere they cannot arrive.
 *
 * Every view each chapter can show is visited by restoring every combination of its own
 * boolean flags — its validator throws out the combinations that are not real states —
 * so this covers steps a walkthrough would have to reach the hard way.
 */
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const PLAYER = .45;
const inventory = { count: () => 99, has: () => true, add() {}, remove: () => true, grant: () => true, refresh() {} };

/** Everywhere the game can name: what the world builds, plus what main.js places at run time. */
const places = new Map();
const put = (id, point, from) => { if (id && Number.isFinite(point?.x) && Number.isFinite(point?.z) && !places.has(id)) places.set(id, { ...point, from }); };
for (const [id, point] of Object.entries(world.npcPositions)) put(id, point, 'the world');
for (const site of world.landmarks) put(site?.id, site, 'a landmark');
for (const key of ['storySites', 'journeySites', 'regionalActivitySites']) for (const [id, site] of Object.entries(world[key] ?? {})) put(site?.id ?? id, site, key);
for (const site of world.forestPlaces ?? []) put(site?.id, site, 'a forest place');
for (const site of world.fishingSpots ?? []) put(site?.id, site, 'a fishing spot');
for (const table of [LUSCIA_SITES, MOROS_SITES, AFTERMATH_SITES]) for (const [id, site] of Object.entries(table)) put(site?.id ?? id, site, 'a quest site');
for (const person of [...BORDER_NPCS, ...AFTERMATH_NPCS, ...HIDEOUT_GARRISON, ...LEGION_POSTS, ...SOLIS_NPCS]) put(person.id, person, 'a person main.js places');
put(FOREST_HIDEOUT_QUEST.supplies.id, FOREST_HIDEOUT_QUEST.supplies, 'the stolen stores');

/** Every destination id a chapter can ever name, over all of its states. */
function destinations(make) {
  const named = new Set(), states = new Set();
  const look = chapter => {
    const view = chapter.view?.(); if (!view) return;
    states.add(view.stage ?? view.step ?? String(view.destinationIds));
    for (const id of view.destinationIds ?? []) named.add(id);
    if (view.objectiveId) named.add(view.objectiveId);
  };
  const base = make().snapshot();
  look(make());
  const flags = Object.keys(base).filter(key => typeof base[key] === 'boolean');
  for (let mask = 0; mask < (1 << flags.length); mask++) {
    const saved = { ...base };
    flags.forEach((key, bit) => { saved[key] = Boolean(mask & (1 << bit)); });
    if (Object.hasOwn(saved, 'revision')) saved.revision = flags.reduce((count, key) => count + Number(saved[key]), 0);
    const chapter = make();
    if (chapter.restore(saved)) look(chapter);
  }
  return { named, states };
}

const CHAPTERS = [
  ['the journey down the road', () => createJourney({ inventory })],
  ['Luscia', () => createLusciaChapter({ inventory })],
  ['the Moros Plain', () => createMorosChapter({ inventory, hasHorse: () => true })],
  ['the border', () => createBorderChapter()],
  ['the day after', () => createAftermathChapter()],
  ['regional life', () => createRegionalLife({ inventory })],
  ["Drent's woods", () => createForestStory({ inventory })],
  ['the Bramble scout camp', () => createForestHideoutQuest({ inventory })],
];

test('every destination a chapter can name is somewhere the world actually has', () => {
  for (const [label, make] of CHAPTERS) {
    const { named, states } = destinations(make);
    assert.ok(states.size >= 1, `${label} shows no view at all`);
    assert.deepEqual([...named].filter(id => !places.has(id)), [], `${label} points at somewhere that does not exist`);
  }
});

test('every destination a chapter can name has ground beside it to stand on', () => {
  for (const [label, make] of CHAPTERS) {
    for (const id of destinations(make).named) {
      const place = places.get(id);
      assert.ok(place, `${label} points at ${id}, which is nowhere`);
      let arrived = false;
      for (let turn = 0; turn < 36 && !arrived; turn++) {
        const angle = turn / 36 * Math.PI * 2;
        for (const reach of [1, 1.8, 2.6, 3.2]) if (canStand(place.x + Math.cos(angle) * reach, place.z + Math.sin(angle) * reach, world, PLAYER)) { arrived = true; break; }
      }
      assert.ok(arrived, `${label} sends the traveler to ${id} (${place.from}) at ${place.x.toFixed(0)}, ${place.z.toFixed(0)}, where there is nowhere to stand`);
    }
  }
});
