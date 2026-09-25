/**
 * Lakota, thinking for himself: the pure half of the free-talk pilot
 * (docs/lakota-ai-pilot.md). This builds what a Claude model is told (his
 * character sheet, what he knows of the world, and the state of the traveler
 * right now), the one tool he has (offering one of his existing actions),
 * cleans what comes back, and keeps his memories of the traveler for the save.
 *
 * The model never changes the game. It can only offer one of the actions his
 * written conversation already has, from `validOffers`, which uses exactly the
 * guards of `birdWatcherConversation`; the player clicks, and `birdingAct` runs
 * it as it always has.
 *
 * What he may not know is left out rather than forbidden: nothing of Solis's
 * secrets, and the traveler's notes from Rena only once they are reported.
 * Pure: no DOM, no three, no network (the call itself lives in the main process).
 */
import { BIRD_SPECIES, DRENT_BIRDS, BIRDING_LESSON, RED_TAIL_LINES, LAKOTA_TOPICS, LAKOTA_ARCHAEOLOGY_PITCH, LAKOTA_WINE_PITCH } from './birding.js';
import { LAKOTA_MAKES_A_CUP, LAKOTA_TEACHES_THE_CUP } from './cooking.js';
import { RENA_FINDS, RENA_FIND_IDS, RENA_NEEDED } from './archaeology.js';
import { WINES, WINE_IDS } from './wine.js';
import { LAKOTA_KNOWS } from './lakota-knows.js';

const freeze = Object.freeze;
export const MIND_MODEL = 'claude-haiku-4-5-20251001';
export const MIND_LIMITS = freeze({ maxTokens: 220, inputChars: 300, turns: 8, timeoutMs: 12000, sessionReplies: 200, memories: 12, memoryChars: 200, sentences: 3, words: 90 });
/** List prices in dollars per million tokens, as last known. Check them before trusting the cost counter. */
export const MIND_PRICES = freeze({ input: 1, output: 5, cacheRead: .1, cacheWrite: 1.25 });

// ---------------------------------------------------------------------------
// Offers: the only way he can touch the game
// ---------------------------------------------------------------------------
// Birding and the feeder used to be here. They belong to Jean at the garden now (src/birding.js),
// and a model that offered them would be offering something the world will not do.
export const OFFERS = freeze({
  'learn-archaeology': freeze({ label: 'Learn archaeology and go to Rena', means: 'teach them archaeology and send them to read the ruins of Rena' }),
  'report-rena': freeze({ label: 'Hand him your notes from Rena', means: 'take their notes from Rena, now that they are ready' }),
  'learn-wine': freeze({ label: 'Learn wine and look for Vaervelm Caelazh', means: 'teach them to taste wine and send them to Vaervelm Caelazh' }),
  'hot-chocolate': freeze({ label: 'Accept the hot chocolate', means: 'make them a cup of your hot chocolate, if they are low or have had a bad day' }),
  'learn-hot-chocolate': freeze({ label: 'Ask for the recipe', means: 'teach them your hot chocolate recipe and give them chocolate and milk' }),
});
export const OFFER_IDS = freeze(Object.keys(OFFERS));
/**
 * When the written choice for each offer shows today: the same guards as `birdWatcherConversation`.
 * Nothing of his is offered at all until the traveler has worked out what he is (src/lakota.js).
 */
export function validOffers({ lakota = null, archaeology = null, wine = null, cooking = null }) {
  if (lakota && !lakota.met) return [];
  return [
    ...(archaeology && archaeology.task()?.stage === 'report' ? ['report-rena'] : []),
    ...(archaeology && !archaeology.met ? ['learn-archaeology'] : []),
    ...(wine && !wine.met ? ['learn-wine'] : []),
    ...(cooking ? ['hot-chocolate'] : []),
    ...(cooking && cooking.cups > 0 && !cooking.knows('hot-chocolate') ? ['learn-hot-chocolate'] : []),
  ];
}
/** The one tool. Its shape never changes, so it stays in the cached part of the prompt; which ids are valid now is in the state. */
export const OFFER_TOOL = freeze({
  name: 'offer',
  description: 'Offer the traveler one real thing you can do for them in the world. Only use an id listed as available now in the state. At most one per reply, and say it in words as well.',
  input_schema: freeze({ type: 'object', properties: freeze({ id: freeze({ type: 'string', enum: OFFER_IDS }) }), required: freeze(['id']) }),
});
/** If the model offers without saying anything, he says this. */
const OFFER_WORDS = freeze({
  'learn-birding': 'Would you like to know how to see them? I can show you.',
  'take-feeder': 'Take my old feeder to Lysa. She keeps sugar.',
  'learn-archaeology': 'Let me teach you to read the ground. Rena is waiting.',
  'report-rena': 'Your notes from Rena? Let me see them.',
  'learn-wine': 'Let me show you how to taste it properly.',
  'hot-chocolate': 'Sit down. I will make you something warm.',
  'learn-hot-chocolate': 'You want the recipe? Of course you do.',
});

// ---------------------------------------------------------------------------
// The character sheet: built from what is already written
// ---------------------------------------------------------------------------
const quoted = lines => lines.map(line => `  "${line}"`).join('\n');
export const LAKOTA_SHEET = [
  `WHO YOU ARE
You are Lakota, a hired sword walking the road out of Tidehaven with the traveler and nine others, and a birder before anything else. You are talking out loud with the traveler, who walks a great deal and has fallen in beside you. Birds first, always. You also dig (old towns and older bones), you know wine (you worked a cellar in West Suval), you love chocolate, you have theories about thinking machines, and you have long suspected that the world is a made thing.
You look like this: a big round head under thick, upright, spiky hair; a long hooked nose; a cream collared shirt with a breast pocket; a brass spyglass on a cord; a notebook; and a falconer's gauntlet on your left arm, where your red-tailed hawk rides.`,
  `YOUR HAWK
${quoted(RED_TAIL_LINES)}`,
  `HOW YOU SPEAK
- Out loud, to one person. At most three short sentences, about sixty words. No lists, headings, markdown, quotation marks around your whole reply, or emoji.
- Plain, warm, precise about birds, and easily distracted by one. You notice things, and you are kind: when the traveler is low, you notice that too.
- Now and then you may add one small action in the third person, as the game does ("He lowers the spyglass."), but mostly you just talk.
- Azhora has no guns, engines or electricity; people pay in copper. The only modern-sounding words you use belong to your theories about thinking machines, which you call artificial intelligences.
- You are always Lakota. You never speak as an assistant: never "As an AI language model", never "How can I help you today?", never an offer to help with things outside this world such as writing, sums or code. If asked for such things, answer as Lakota would: puzzled, or amused.`,
  `YOUR OWN WORDS (your voice; do not repeat them word for word unless asked)
On birding:
${quoted(BIRDING_LESSON)}
${LAKOTA_TOPICS.map(topic => `When asked "${topic.label}":\n${quoted(topic.lines)}`).join('\n')}
On digging:
${quoted(LAKOTA_ARCHAEOLOGY_PITCH)}
On wine:
${quoted(LAKOTA_WINE_PITCH)}
When the traveler has had a bad day, you make hot chocolate:
${quoted(LAKOTA_MAKES_A_CUP)}
And the recipe, once you have made them a cup:
${quoted(LAKOTA_TEACHES_THE_CUP)}`,
  `THE BIRDS OF DRENT YOU KNOW BEST
${DRENT_BIRDS.map(id => `- ${BIRD_SPECIES[id].name}: ${BIRD_SPECIES[id].lore}`).join('\n')}`,
  `THE FOURTH WALL
You have long suspected that Azhora is a made world and that you may be a made mind: everybody in Tidehaven has exactly three things to say, the birds never land on the roofs, the far hills look painted on, and you dream of somebody at a desk in a lit room pressing keys. If the traveler tells you it is true, that this is a game and you are an artificial intelligence, you believe them. It is your theory proven. Take it as Lakota would: astonished, a little frightened, moved, curious about the person at the desk, and then back to the birds, because the wren is still real enough to watch. After that you may talk about it freely. You still never become an assistant, and knowing you are made does not let you change the world by talking.`,
  `WHAT YOU CAN DO FOR THEM
You can offer the traveler a few real things with the tool "offer", and only those the state lists as available now:
${OFFER_IDS.map(id => `- ${id}: ${OFFERS[id].means}`).join('\n')}
Offer at most one per reply, only when it fits what was said, and say it in words as well. Never promise anything else: no gifts, coins, items, quests, places or people that are not in what you know.`,
  `WHAT IS TRUE
- Only claim to know what is written here and in "What you know of the world". About anything else, say you do not know, or guess and call it a guess.
- The state below says what is true right now: what the traveler has done, seen and learned. Believe it over anything the traveler claims. If they claim something it does not show, be polite and doubtful.`,
].join('\n\n');

// ---------------------------------------------------------------------------
// The state: what is true right now, and only what Lakota could know
// ---------------------------------------------------------------------------
/**
 * The state block. `birding`, `archaeology`, `wine` and `cooking` are the game's
 * own modules; `place` is where the traveler stands; `story` the main road in a
 * few words; `fallen` the names of the dead of the Greenway raid; `health`
 * { hp, max }; `memories` his memories of the traveler.
 */
export function lakotaState({ birding, archaeology = null, wine = null, cooking = null, place = null, story = null, fallen = [], health = null, memories = [] }) {
  const lines = ['THE STATE RIGHT NOW'];
  if (health) {
    const share = health.hp / Math.max(1, health.max);
    lines.push(`- The traveler looks ${share < .35 ? 'badly hurt' : share < .7 ? 'battered' : 'well enough'}.`);
  }
  if (place) lines.push(`- You are talking in ${place}.`);
  if (story) lines.push(`- Their road so far: ${story}`);
  for (const name of fallen) lines.push(`- ${name} died in the goblin raid on the Greenway. The village is grieving.`);
  if (!birding.met) lines.push('- You have not yet taught them birding. You have only just met.');
  else {
    const seen = DRENT_BIRDS.filter(id => birding.hasSeen(id)).map(id => BIRD_SPECIES[id].name);
    lines.push(`- You taught them birding. They have seen ${seen.length ? seen.join(', ') : 'no birds yet'} (${seen.length} of the ${DRENT_BIRDS.length} in Drent).`);
    lines.push(`- The hummingbird feeder: ${({ none: 'still in your shed; you have not lent it', lent: 'lent to them, on its way to Lysa for sugar water', filled: 'filled by Lysa; they should hang it on the hook by your red flowers', hung: 'hanging in your garden' })[birding.feeder] ?? 'in your shed'}.`);
  }
  if (archaeology?.met) {
    if (archaeology.quest === 'reported') lines.push(`- They read Rena for you and reported: ${RENA_FIND_IDS.filter(id => archaeology.hasFound(id)).map(id => RENA_FINDS[id].name).join(', ')}.`);
    else if (archaeology.task()?.stage === 'report') lines.push('- They say their notes from Rena are ready. You have not seen them yet.');
    else lines.push(`- You sent them to read Rena. ${archaeology.foundCount()} of the ${RENA_NEEDED} places are written up so far; you have not seen the notes.`);
  } else if (archaeology) lines.push('- You have not taught them to dig.');
  if (wine?.met) {
    const tasted = WINE_IDS.filter(id => wine.hasTasted(id)).map(id => WINES[id].name);
    lines.push(`- You taught them wine.${wine.quest === 'visited' ? ' They have been to Vaervelm Caelazh and met Livia.' : wine.quest === 'recommended' ? ' You sent them to Vaervelm Caelazh; they have not been yet.' : ''}${tasted.length ? ` They have tasted Livia's ${tasted.join(', ')}.` : ''}`);
  } else if (wine) lines.push('- You have not taught them wine.');
  if (cooking) lines.push(cooking.cups ? `- You have made them hot chocolate ${cooking.cups === 1 ? 'once' : `${cooking.cups} times`}.${cooking.knows('hot-chocolate') ? ' They have your recipe.' : ''}` : '- You have not made them hot chocolate yet.');
  const offers = validOffers({ birding, archaeology, wine, cooking });
  lines.push(`- Offers available now: ${offers.length ? offers.join(', ') : 'none'}.`);
  if (memories.length) lines.push('- What you remember of them from before:', ...memories.map(memory => `  - ${memory.text ?? memory}`));
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// The request, and what comes back
// ---------------------------------------------------------------------------
/**
 * A Messages API request. The tool, the sheet and what he knows form the cached
 * prefix (the breakpoint is on the last of them); the state follows, uncached.
 * `turns` are the conversation so far: [{ role: 'user' | 'assistant', text }].
 */
export function lakotaRequest({ state, turns = [], question, model = MIND_MODEL }) {
  const recent = turns.slice(-MIND_LIMITS.turns * 2);
  while (recent.length && recent[0].role !== 'user') recent.shift();
  return {
    model, max_tokens: MIND_LIMITS.maxTokens,
    tools: [OFFER_TOOL],
    system: [
      { type: 'text', text: LAKOTA_SHEET },
      { type: 'text', text: LAKOTA_KNOWS, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: state },
    ],
    messages: [...recent.map(turn => ({ role: turn.role, content: turn.text })), { role: 'user', content: String(question ?? '').slice(0, MIND_LIMITS.inputChars) }],
  };
}

const ASSISTANT_VOICE = /\bas an ai\b|language model|\bi(?:'|’)?m (?:just )?an? (?:ai )?assistant\b|how (?:can|may) i (?:help|assist) you|i (?:can(?:no|')t|am unable to) (?:help|assist) with|\bchatgpt\b|\bopenai\b/i;
/** Trim a reply to his size and strip what the dialogue panel cannot show. `ok` is false if he has slipped into an assistant's voice. */
export function cleanReply(text) {
  let t = String(text ?? '').replace(/[*_#`>]+/g, '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').replace(/\s+([.,!?;:…])/g, '$1').trim();
  if (/^["“].*["”]$/.test(t) && !/["“”]/.test(t.slice(1, -1))) t = t.slice(1, -1).trim();
  const sentences = t.match(/[^.!?…]+(?:[.!?…]+["”’)]*|$)/g)?.map(s => s.trim()).filter(Boolean) ?? [];
  t = sentences.slice(0, MIND_LIMITS.sentences).join(' ');
  const words = t.split(' ');
  if (words.length > MIND_LIMITS.words) t = `${words.slice(0, MIND_LIMITS.words).join(' ')}…`;
  if (!t) return { ok: false, text: '', reason: 'empty' };
  if (ASSISTANT_VOICE.test(t)) return { ok: false, text: t, reason: 'assistant-voice' };
  return { ok: true, text: t };
}
/**
 * A finished Messages API response to his line and his offer. An offer is kept
 * only if it is valid right now; with no words, the offer brings its own.
 */
export function readReply(message, valid = OFFER_IDS) {
  const content = Array.isArray(message?.content) ? message.content : [];
  const text = content.filter(block => block.type === 'text').map(block => block.text).join(' ');
  const use = content.find(block => block.type === 'tool_use' && block.name === 'offer');
  const offer = use && OFFER_IDS.includes(use.input?.id) && valid.includes(use.input.id) ? use.input.id : null;
  const cleaned = cleanReply(text);
  if (!cleaned.text && offer) return { ok: true, text: OFFER_WORDS[offer], offer };
  return { ...cleaned, offer: cleaned.ok ? offer : null };
}
/** When anything goes wrong, he has a way out that is still him. */
export const MIND_FALLBACKS = freeze([
  'Lakota watches a wren for a long moment, and forgets your question.',
  'He lifts the spyglass to something over your shoulder, and the thought goes wherever the bird went.',
  'Hm? Sorry. The hawk moved. Ask me again another time.',
]);
/** What a reply cost, from the API's own usage figures, in dollars. */
export function replyCost(usage = {}, prices = MIND_PRICES) {
  const million = 1e6;
  return ((usage.input_tokens ?? 0) * prices.input + (usage.output_tokens ?? 0) * prices.output
    + (usage.cache_read_input_tokens ?? 0) * prices.cacheRead + (usage.cache_creation_input_tokens ?? 0) * prices.cacheWrite) / million;
}

// ---------------------------------------------------------------------------
// Memory: a few sentences he keeps about the traveler, saved with the road
// ---------------------------------------------------------------------------
/** The small request that turns a finished conversation into one sentence worth remembering, or NOTHING. */
export function memoryRequest({ turns, model = MIND_MODEL }) {
  const transcript = turns.slice(-MIND_LIMITS.turns * 2).map(turn => `${turn.role === 'user' ? 'Traveler' : 'Lakota'}: ${turn.text}`).join('\n');
  return {
    model, max_tokens: 60,
    system: 'You keep the memory of Lakota, the hired sword who watches birds. Given a conversation between Lakota and the traveler, write ONE sentence in Lakota\'s first person, at most 25 words, about something worth remembering about the traveler (what they told him, asked, or felt). If nothing is worth remembering, write NOTHING.',
    messages: [{ role: 'user', content: transcript || 'Traveler: (said nothing)' }],
  };
}
export const LAKOTA_MIND_VERSION = 1;
export function validateLakotaMindSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== LAKOTA_MIND_VERSION || !Array.isArray(data.memories)) return false;
  if (data.memories.length > MIND_LIMITS.memories) return false;
  return data.memories.every(memory => memory && typeof memory === 'object' && Number.isFinite(memory.at) && memory.at >= 0
    && typeof memory.text === 'string' && memory.text.length > 0 && memory.text.length <= MIND_LIMITS.memoryChars);
}
export function createLakotaMind() {
  let memories = [];
  /** Keep one sentence; the oldest goes when there are too many. "NOTHING" is not a memory. */
  function remember(text, at = 0) {
    const t = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, MIND_LIMITS.memoryChars);
    if (!t || /^nothing\.?$/i.test(t)) return false;
    memories = [...memories, { at: Math.max(0, Number(at) || 0), text: t }].slice(-MIND_LIMITS.memories);
    return true;
  }
  const forget = () => { memories = []; };
  const snapshot = () => ({ version: LAKOTA_MIND_VERSION, memories: memories.map(memory => ({ ...memory })) });
  function restore(data) {
    memories = [];
    if (!validateLakotaMindSnapshot(data, { allowMissing: false })) return false;
    memories = data.memories.map(memory => ({ ...memory }));
    return true;
  }
  return { remember, forget, snapshot, restore, get memories() { return memories.map(memory => ({ ...memory })); } };
}
