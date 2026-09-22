import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { TRIMMED, KEEP_IDS, QUEST_IDS, OWN_IDS, SMITH_IDS, DROP_IDS, SOLDIER_ROLES, keepsNpc, trimCast } from '../src/cast.js';

/**
 * The user, 22 September 2026: take out everybody who is not in a quest, except the soldiers and
 * the characters they made themselves, and the skill teachers with them. It is a switch and a
 * list, so these are the laws of the list.
 */
test('the trim keeps the quest, the soldiers, the company and the user’s own, and nobody else', () => {
  const mercenaryIds = new Set(['merc-jerry', 'merc-gotwood']);
  const keep = npc => keepsNpc(npc, { mercenaryIds, trimmed: true });
  for (const id of KEEP_IDS) assert.equal(keep({ id }), true, `${id} is on the list and was taken out anyway`);
  for (const id of mercenaryIds) assert.equal(keep({ id }), true, `${id} is one of the eleven`);
  for (const role of SOLDIER_ROLES) assert.equal(keep({ id: 'somebody', modelRole: role }), true, `a ${role} is a soldier`);
  // The life of the towns, which is what the crowd was.
  for (const id of ['elod-fishwife', 'ambron-scrivener', 'ostel-muleteer-1', 'town-innkeeper', 'timber-stall-hand'])
    assert.equal(keep({ id, modelRole: 'commons-miller' }), false, `${id} is still standing about`);
  // And the teachers, by name, because each of them is somebody's favourite.
  for (const id of ['garden-keeper', 'pond-fisher', 'mycologist', 'botanist', 'geologist', 'commons-miller', 'woodcutter-bowden', 'acorn-cook'])
    assert.equal(keep({ id, modelRole: 'forest-woodcutter' }), false, `${id} teaches a skill and stayed`);
  assert.equal(keep({ id: 'anybody', dog: true }), true, 'a dog is not a crowd');
  assert.equal(keep(null), false);
});

test('Eren is dropped by name, because the soldier rule would otherwise keep him, and Sava with her waymarkers', () => {
  assert.deepEqual([...DROP_IDS], ['warden', 'ridge-keeper']);
  assert.equal(keepsNpc({ id: 'ridge-keeper', modelRole: 'rise-custodian' }, { trimmed: true }), false,
    'the keeper of the rise had one errand and it is off the slate (src/quest-slate.js)');
  assert.equal(keepsNpc({ id: 'warden', modelRole: 'legion-soldier' }, { trimmed: true }), false,
    'the waykeeper is built as a legionary and must still be taken out');
  assert.equal(keepsNpc({ id: 'warden', modelRole: 'legion-soldier' }, { trimmed: false }), true,
    'and comes back with everybody else when the switch goes off');
});

test('with the switch off nobody is taken out at all', () => {
  const cast = [{ id: 'elod-fishwife' }, { id: 'warden', modelRole: 'legion-soldier' }, { id: 'harbormaster' }];
  assert.equal(trimCast(cast, { trimmed: false }).length, 3);
  assert.deepEqual(trimCast(cast, { trimmed: true }).map(n => n.id), ['harbormaster']);
});

test('every id on the list is somebody the world actually places', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  // The world places most of them; the rest are pushed in by their own module in the host, so
  // this checks the ones it can and holds the shape of the list for the others.
  const placed = new Set(Object.keys(world.npcPositions));
  const known = new Set([...placed,
    // Pushed in by src/main.js from their own modules rather than by the world.
    'harbormaster', 'instructor', 'boatman', 'brandy-frank', 'bird-watcher', 'attic-juan', 'attic-nika',
    'solis-secretary', 'john-salt', 'katy', 'vintner', 'winemaker', 'vine-keeper', 'light-keeper',
    'rival-keeper', 'tidehaven-smith', 'moros-armourer', 'ambron-armourer', 'lumber-ostler',
    'aftermath-tribune', 'aftermath-captain', 'aftermath-envoy', 'post-camp-legate',
    'solis-captain', 'coalition-envoy', 'coalition-captain', 'battle-tribune', 'courier-satchel',
    'lauvel-bearer-front', 'lauvel-bearer-back', 'lauvel-seeker']);   // the burying party, laid by the chapter
  const strangers = [...QUEST_IDS, ...SMITH_IDS, ...OWN_IDS, ...DROP_IDS].filter(id => !known.has(id));
  assert.deepEqual(strangers, [], 'the list names somebody the game does not have');
  assert.equal(typeof TRIMMED, 'boolean');
});
