import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { questSteps } from '../src/game-state.js';

const root = new URL('../', import.meta.url);
const file = rel => readFileSync(fileURLToPath(new URL(rel, root)), 'utf8');

test('the first person the traveler speaks to is Mara, the harbourmaster at the head of the pier', () => {
  assert.match(questSteps[0].detail, /Mara, the harbourmaster, at the head of the pier/);
  assert.match(questSteps[1].detail, /Speak to Mara at the head of the pier/);
  assert.match(questSteps[1].hint, /Approach Mara/);
  const main = file('src/main.js');
  assert.match(main, /const HARBOURMASTER='harbormaster';/, 'she has an id');
  assert.match(main, /\{id:HARBOURMASTER,name:'Mara',role:'Harbourmaster of Tidehaven',modelRole:'harbormaster'/, 'and a place among Tidehaven’s people');
  assert.match(main, /world\.npcPositions\[HARBOURMASTER\]=\{x:pierHead\.x,z:pierHead\.z\}/, 'she stands at the head of the pier');
  assert.match(main, /if\(npc\.id===HARBOURMASTER\)\{maraOnTheLanding\(npc\);return;\}/, 'speaking to her is her own scene');
  assert.match(main, /questStage===1\)return\{\.\.\.npcById\.get\(HARBOURMASTER\)/, 'the arrow on the ground points at her');
  assert.match(main, /ids:\{harbourmaster:HARBOURMASTER,/, 'and so does the gold over her head (src/quest-markers.js)');
  // The toast the moment the boat ties up. It moved into the arrival sequence's data when the
  // cutscene was built (LANDED.toast); main.js shows whatever that says, and shows nothing else.
  assert.match(file('src/opening-sequence.js'), /'SPEAK TO MARA AT THE HEAD OF THE PIER'/, 'and the toast the moment the boat ties up');
  assert.match(main, /toast\(landed\.toast\.title,landed\.toast\.kicker\)/, 'which main.js puts on the screen at the landing');
  assert.doesNotMatch(main, /SPEAK TO CHRIS ON THE LANDING/);
  // The letter is hers to give, and the quest only moves when she gives it.
  const hers = main.slice(main.indexOf('function maraOnTheLanding'), main.indexOf('function chrisOnTheLanding'));
  assert.match(hers, /updateQuest\('ashore'\)/);
  assert.match(hers, /'accept-letter','Take the letter'/);
  assert.match(hers, /letter of introduction, for Quartermaster Corvan/);
  // Chris keeps the sword lesson and hands over nothing.
  const his = main.slice(main.indexOf('function chrisOnTheLanding'), main.indexOf('function doomsayerConversation'));
  assert.match(his, /straw post at the northern crossroads/);
  assert.match(his, /repair bench is beside the post/);
  assert.doesNotMatch(his, /accept-letter/, 'the errand is not Chris’s any more');
  assert.doesNotMatch(his, /updateQuest/, 'and neither is the quest');
});

test('nothing in the game still sends the player up the pier to Lakota', () => {
  // He is a birder with a garden, and has not met the boat since the harbourmaster took the landing back.
  const stale = [
    /Lakota[^.]{0,60}head of the pier/,
    /head of the pier[^.]{0,60}Lakota/,
    /pier to Lakota/,
    /Speaking with Lakota/,
    /find Lakota/,
    /Lakota’s message/,
    /Lakota's message/,
  ];
  const names = ['index.html', ...readdirSync(fileURLToPath(new URL('src/', root))).filter(name => name.endsWith('.js')).map(name => `src/${name}`)];
  assert.ok(names.length > 40, 'the source was found');
  for (const name of names) {
    const text = file(name);
    for (const pattern of stale) assert.doesNotMatch(text, pattern, `${name} still sends the traveler to Lakota off the boat`);
  }
});
