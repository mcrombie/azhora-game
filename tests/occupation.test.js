import test from 'node:test';
import assert from 'node:assert/strict';
import { occupationControl, isOut, hasStake, stakeOf, legionPostStake } from '../src/occupation.js';
import { LEGION_POSTS } from '../src/legion-posts.js';
import { AFTERMATH_NPCS, AFTERMATH_VARIANTS } from '../src/aftermath-chapter.js';
import * as campaignModule from '../src/campaign.js';

const legionary = { id: 'outpost-sentry', holds: 'empire', region: 'Moros Plain' };
const rebel = { id: 'outpost-valley-captain', holds: 'coalition', region: 'Moros Plain' };
const baker = { id: 'solis-baker' };

test('a garrison is out only while its side holds its region; everyone else always is', () => {
  const empire = { 'Moros Plain': 'empire', 'West Suval': 'coalition' };
  assert.equal(isOut(legionary, empire), true);
  assert.equal(isOut(rebel, empire), false);
  assert.equal(isOut(baker, empire), true);
  const taken = { ...empire, 'Moros Plain': 'coalition' };
  assert.deepEqual([isOut(legionary, taken), isOut(rebel, taken), isOut(baker, taken)], [false, true, true]);
  // A region nobody has recorded yet, or a third party's, shows neither garrison.
  assert.equal(isOut(legionary, {}), false);
  assert.equal(isOut(rebel, { 'Moros Plain': 'elod' }), false);
  for (const broken of [{ holds: 'empire' }, { holds: 'elod', region: 'East Suval' }, { region: 'Moros Plain' }, null]) assert.equal(hasStake(broken), false);
});

test('a place falls when its fight is won, before the campaign files the chapter', () => {
  const map = { 'Moros Plain': 'empire', 'West Suval': 'coalition' };
  assert.deepEqual(occupationControl(map, null), map);
  assert.deepEqual(occupationControl(map, { variant: 'moros-outpost', cleared: false }), map);
  assert.equal(occupationControl(map, { variant: 'moros-outpost', cleared: true })['Moros Plain'], 'coalition');
  assert.equal(occupationControl(map, { variant: 'solis-sweep', cleared: true })['West Suval'], 'empire');
  // Holding a gate changes nothing on the map.
  for (const variant of ['moros-fallback', 'solis-fallback']) assert.deepEqual(occupationControl(map, { variant, cleared: true }), map);
  assert.notEqual(occupationControl(map, null), map, 'the campaign’s own map is never handed back to be mutated');
  for (const variant of Object.keys(AFTERMATH_VARIANTS)) assert.ok(occupationControl(map, { variant, cleared: true }));
});

test('the Legion’s posts inside the outpost leave with the Legion; the road’s posts and the chapter’s people do not', () => {
  const inside = LEGION_POSTS.filter(post => legionPostStake(post.id));
  assert.ok(inside.length >= 3 && inside.every(post => post.id.startsWith('post-camp-')));
  assert.ok(inside.some(post => post.id === 'post-camp-legate'), 'the Legate goes too');
  assert.equal(legionPostStake('post-landing'), null);
  assert.equal(legionPostStake('post-moros-gate-north'), null);
  const taken = { 'Moros Plain': 'coalition' };
  for (const post of inside) assert.equal(isOut(stakeOf(post), taken), false);
  for (const person of AFTERMATH_NPCS) assert.equal(stakeOf(person), null, `${person.id} is placed by the chapter, not by the map`);
  assert.equal(stakeOf(rebel), rebel);
});

test('the campaign flips a place only for the side that won it', () => {
  const { CHAPTERS } = campaignModule;
  assert.deepEqual(CHAPTERS['solis-sweep'].control, { 'West Suval': 'empire' });
  assert.equal(CHAPTERS['moros-outpost'].control['Moros Plain'], 'coalition');
  // A lost field changes no garrisons: the Legion keeps its outpost, the Coalition keeps Solis.
  assert.equal(CHAPTERS['moros-fallback'].control, undefined);
  assert.equal(CHAPTERS['solis-fallback'].control, undefined);
});
