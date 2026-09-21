import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { talkTarget, placeKeepsPrompt } from '../src/prompt-priority.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

/**
 * Measured on the real road with the real company, two hours of play at a quarter-second step:
 * the repair on the Caloss bridge was silenced for 21 s in six passes, Mus stood nearer the
 * traveler than the meadow courier for 90 s running, and the crossing keeper was out-answered
 * for 127 s. Each case below is one of those, reduced to the numbers that decide it.
 */
const courier = { npc: 'meadow-courier', d: 1.8, marked: true, passing: false };
const keeper = { npc: 'crossing-keeper', d: 1.8, marked: false, passing: false };
const mus = { npc: 'merc-mus', d: 1.1, marked: false, passing: true };
const chris = { npc: 'merc-gotwood', d: .9, marked: false, passing: true };

test('the person the traveler came to see answers, however near a hired sword has stopped', () => {
  assert.equal(talkTarget([mus, courier]).npc, 'meadow-courier', 'Mus, stopped at the induction, answered for the courier');
  assert.equal(talkTarget([courier, mus]).npc, 'meadow-courier', 'and it does not depend on who was looked at first');
});

test('somebody who belongs there answers before a man who is only passing, marked or not', () => {
  assert.equal(talkTarget([chris, keeper]).npc, 'crossing-keeper');
  assert.equal(talkTarget([chris, mus]).npc, 'merc-gotwood', 'between two hired swords it is the nearer, as before');
  assert.equal(talkTarget([keeper, { ...courier, d: 3.2 }]).npc, 'meadow-courier', 'and the traveler’s business beats a nearer bystander');
});

test('a hired sword still answers when he is the only one there, and when he is the business', () => {
  assert.equal(talkTarget([mus]).npc, 'merc-mus');
  assert.equal(talkTarget([{ ...chris, marked: true, d: 3 }, keeper]).npc, 'merc-gotwood', 'the man on the landing, say');
  assert.equal(talkTarget([]), null);
  assert.equal(talkTarget([{ npc: 'nobody', d: Number.NaN }]), null, 'a distance that is not a number is nobody');
});

/**
 * The prompt is a panel and a line of words, and they used to be decided apart: the panel was
 * hidden by anything that was not play - a conversation above all, which hides it the instant it
 * opens - while every line that writes the words is gated on play, so nothing ever wrote over
 * them. The words outlived the panel. Nobody playing sees a hidden panel, so this is not a bug
 * anybody met; it is a bug that lies to whoever asks the HUD what it is offering, and it lied to
 * two bug hunts in a row, with "Speak with Iven" at a wrecked cart two hundred metres from Iven.
 */
test('the prompt panel and its words are one decision, and the words go when the panel does', () => {
  const main = source('main.js');
  assert.match(main, /const prompting=mode==='playing'&&\(!!currentNPC\|\|/, 'one value decides whether there is a prompt at all');
  assert.match(main, /&&combat\.state\.phase!=='active';show\('interaction',prompting\);/, 'and the panel is shown by it');
  assert.match(main, /if\(!prompting\)\$\('interaction-label'\)\.textContent='';/, 'and the words are cleared by it');
  // The clear has to come after everything that writes the label, or it clears the wrong frame.
  assert.ok(main.indexOf("if(!prompting)$('interaction-label').textContent='';")
    > main.lastIndexOf("$('interaction-label').textContent=currentHideoutSite"), 'the clear is the last word on the label');
  assert.match(main, /mode='dialogue';stopInput\(\);show\('interaction',false\);/, 'a conversation still takes the panel down on the spot');
});

test('a place the traveler has business at keeps the prompt from a passer-by, and from nobody else', () => {
  const repair = { id: 'bridge-repair' };
  assert.equal(placeKeepsPrompt(chris, repair), true, 'a man crossing the bridge took the prompt off the repair');
  assert.equal(placeKeepsPrompt(null, repair), true);
  assert.equal(placeKeepsPrompt(keeper, repair), false, 'somebody who belongs there still answers first, as they always have');
  assert.equal(placeKeepsPrompt({ ...chris, marked: true }, repair), false, 'and so does a hired sword who is the business');
  assert.equal(placeKeepsPrompt(chris, null), false, 'with no place there is nothing to keep it for');
});
