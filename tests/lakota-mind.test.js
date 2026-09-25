import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirding, birdWatcherConversation, BIRD_WATCHER } from '../src/birding.js';
import { createLakota } from '../src/lakota.js';
import { createArchaeology, RENA_FINDS, RENA_FIND_IDS, RENA_NEEDED } from '../src/archaeology.js';
import { createWine } from '../src/wine.js';
import { createCooking } from '../src/cooking.js';
import { LAKOTA_KNOWS } from '../src/lakota-knows.js';
import { LAKOTA_SHEET, OFFER_IDS, OFFER_TOOL, MIND_LIMITS, validOffers, lakotaState, lakotaRequest, cleanReply, readReply, replyCost,
  memoryRequest, createLakotaMind, validateLakotaMindSnapshot } from '../src/lakota-mind.js';

const satchel = () => { const bag = {}; return { add(id, n = 1) { bag[id] = (bag[id] ?? 0) + n; return true; }, has: id => (bag[id] ?? 0) > 0, remove(id, n = 1) { bag[id] -= n; return true; } }; };
const world = () => ({ birding: createBirding(), lakota: known(), archaeology: createArchaeology(), wine: createWine(), cooking: createCooking() });
/** The traveler has worked out what he is; nothing of his is offered before that (src/lakota.js). */
const known = () => { const l = createLakota(); l.know(); return l; };
/** The written menu's choices that lead to each offer. */
const CHOICE_TO_OFFER = { 'report-rena': 'report-rena', 'learn-archaeology': 'learn-archaeology',
  'learn-wine': 'learn-wine', 'feeling-bad': 'hot-chocolate', 'ask-recipe': 'learn-hot-chocolate' };
const writtenOffers = modules => {
  let choices = [];
  birdWatcherConversation({ id: BIRD_WATCHER.id }, { ...modules, openDialogue: (npc, lines, event, close, options) => { choices = options?.choices ?? []; }, closeDialogue() {}, act() {} });
  return choices.map(choice => CHOICE_TO_OFFER[choice.id]).filter(Boolean).sort();
};

test('his sheet is built from what is already written, and knows nothing of Solis’s secrets', () => {
  const all = `${LAKOTA_SHEET}\n${LAKOTA_KNOWS}`;
  for (const fact of [/one hundred and six/, /bittern/, /Norton/, /red-tailed hawk/, /birds are what is left of them/, /Vaervelm Caelazh/, /KAT/, /Thareth/, /peninsula, not an island/])
    assert.match(all, fact);
  assert.match(LAKOTA_SHEET, /you believe them/, 'he can be told he is made, and believe it');
  assert.match(LAKOTA_SHEET, /never speak as an assistant/);
  for (const secret of [/Puck/, /Tharganhom/, /Prime Minister/, /Dorsael/, /Tancredi/, /Juan/, /Nika/]) assert.doesNotMatch(all, secret, `${secret} is not his to know`);
});

test('the model may offer exactly what his written menu offers, in every state', () => {
  const m = world(), check = label => assert.deepEqual([...validOffers(m)].sort(), writtenOffers(m), label);
  check('before he has met them');
  m.birding.meet(); check('birding taught');
  m.birding.lendFeeder(satchel()); check('feeder lent');
  m.archaeology.meet(); check('sent to Rena');
  for (const id of RENA_FIND_IDS.slice(0, RENA_NEEDED)) m.archaeology.find(id);
  check('notes ready');
  m.archaeology.report(); m.wine.learn({ recommend: true }); check('Rena reported, wine taught');
  m.cooking.cup(0); check('one cup made');
  m.cooking.learn('hot-chocolate'); check('recipe known');
});

test('the state tells him only what he could know: Rena’s finds once reported, and what is true now', () => {
  const m = world();
  m.birding.meet(); m.birding.observe('cardinal'); m.archaeology.meet();
  m.archaeology.find('coin'); m.archaeology.find('track');
  const before = lakotaState({ ...m, place: 'your garden in Tidehaven', health: { hp: 20, max: 100 }, fallen: ['Marn the fern-gatherer'] });
  assert.match(before, /Cardinal/); assert.match(before, /badly hurt/); assert.match(before, /Marn the fern-gatherer died/);
  assert.match(before, /2 of the 5 places are written up/);
  assert.doesNotMatch(before, new RegExp(RENA_FINDS.coin.name), 'not before he has seen the notes');
  for (const id of ['arrowheads', 'lintel', 'whorl']) m.archaeology.find(id);
  m.archaeology.report();
  assert.match(lakotaState(m), new RegExp(RENA_FINDS.coin.name));
  assert.match(lakotaState(m), /Offers available now: .*hot-chocolate/);
  const mind = createLakotaMind(); mind.remember('The traveler hates crows.', 10);
  assert.match(lakotaState({ ...m, memories: mind.memories }), /hates crows/);
});

test('the request: a cached prefix that never changes, the state after it, and the conversation capped', () => {
  const m = world(), early = lakotaState(m);
  m.birding.meet();
  const turns = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `line ${i}` }));
  const a = lakotaRequest({ state: early, question: 'Hello' }), b = lakotaRequest({ state: lakotaState(m), turns, question: 'x'.repeat(900) });
  assert.deepEqual(a.tools, b.tools, 'the tool never changes, so the cache holds');
  assert.equal(a.system[0].text, b.system[0].text); assert.equal(a.system[1].text, b.system[1].text);
  assert.deepEqual(b.system[1].cache_control, { type: 'ephemeral' });
  assert.equal(b.system[2].cache_control, undefined, 'the state is not cached');
  assert.notEqual(a.system[2].text, b.system[2].text);
  assert.ok(b.messages.length <= MIND_LIMITS.turns * 2 + 1);
  assert.equal(b.messages[0].role, 'user');
  assert.equal(b.messages.at(-1).content.length, MIND_LIMITS.inputChars);
  assert.equal(b.max_tokens, MIND_LIMITS.maxTokens);
  assert.deepEqual(OFFER_TOOL.input_schema.properties.id.enum, OFFER_IDS);
});

test('what comes back is trimmed to him, an assistant’s voice is caught, and only valid offers survive', () => {
  assert.deepEqual(cleanReply('**Look!** A wren 🐦. She sings. She scolds. She hops. She leaves.'), { ok: true, text: 'Look! A wren. She sings.' });
  assert.equal(cleanReply('“A heron, standing still.”').text, 'A heron, standing still.');
  assert.equal(cleanReply('As an AI language model, I cannot watch birds.').ok, false);
  assert.equal(cleanReply('How can I help you today?').ok, false);
  assert.equal(cleanReply('So I am a made thing. The wren does not care, and neither, I think, do I.').ok, true, 'being told he is made is allowed');
  const reply = { content: [{ type: 'text', text: 'Sit down.' }, { type: 'tool_use', name: 'offer', input: { id: 'hot-chocolate' } }] };
  assert.deepEqual(readReply(reply, ['hot-chocolate']), { ok: true, text: 'Sit down.', offer: 'hot-chocolate' });
  assert.equal(readReply(reply, ['learn-wine']).offer, null, 'an offer not available now is dropped');
  assert.equal(readReply({ content: [{ type: 'tool_use', name: 'offer', input: { id: 'give-gold' } }] }, OFFER_IDS).offer, null);
  const silent = readReply({ content: [{ type: 'tool_use', name: 'offer', input: { id: 'learn-wine' } }] }, ['learn-wine']);
  assert.ok(silent.ok && silent.text && silent.offer === 'learn-wine', 'an offer with no words brings its own');
  assert.ok(Math.abs(replyCost({ input_tokens: 500, output_tokens: 150, cache_read_input_tokens: 4000 }) - (500 + 750 + 400) / 1e6) < 1e-12);
});

test('his memories: one sentence at a time, at most twelve, and nothing that is not a memory', () => {
  const mind = createLakotaMind();
  assert.equal(mind.remember('NOTHING', 1), false);
  for (let i = 0; i < 15; i++) mind.remember(`Memory ${i}.`, i);
  assert.equal(mind.memories.length, MIND_LIMITS.memories);
  assert.equal(mind.memories[0].text, 'Memory 3.', 'the oldest go first');
  const saved = mind.snapshot(), again = createLakotaMind();
  assert.equal(validateLakotaMindSnapshot(saved), true);
  assert.ok(again.restore(saved) && again.memories.length === MIND_LIMITS.memories);
  assert.equal(validateLakotaMindSnapshot({ ...saved, memories: [{ at: 1, text: 'x'.repeat(500) }] }), false);
  assert.equal(validateLakotaMindSnapshot({ version: 1, memories: Array.from({ length: 13 }, (_, i) => ({ at: i, text: 'a' })) }), false);
  const request = memoryRequest({ turns: [{ role: 'user', text: 'My sister keeps pigeons.' }, { role: 'assistant', text: 'Pigeons! Tell her I said so.' }] });
  assert.match(request.messages[0].content, /Traveler: My sister keeps pigeons/);
  mind.forget(); assert.equal(mind.memories.length, 0);
});
