/**
 * Talaelos ("fiery speech"), the players of Nylon: a company of Elizabethan
 * players who travel the country in a painted pageant wagon and play nothing
 * but improvisation, because a goat in Luscia ate the only script they had.
 * Nylon is the city that argues (azhora_lore/geography/regions/nylon.md), and
 * in the lore it carries the news "by theatrical troupe, because no people in
 * Azhora had ever been able to resist turning disaster into staged argument".
 *
 * They camp at one of eight stops across the country, move on while nobody is
 * watching, and can be run into anywhere from the Avrel clearing to Ostel.
 * Galeon asks the traveler for a place, a thing and a trouble, the company
 * makes a play of them, and at the turn the traveler decides what happens
 * next. Whatever the traveler says, they say yes to it: Galeon cannot say no.
 *
 * Pure: no DOM, no three. The figures are in src/troupe-models.js.
 */
const freeze = Object.freeze;

export const TALAELOS = freeze({ id: 'talaelos', name: 'Talaelos', gloss: 'fiery speech', from: 'Nylon' });
/** Seconds of play at a stop before they think of moving on; how far off the traveler must be (from both stops) before they do; how near before the traveler hears them. */
export const TROUPE_STAY = 600, TROUPE_UNSEEN = 220, TROUPE_HEAR = 55;
/** The height of the wagon's stage above the ground. */
export const DECK = 1.15;
export const PLAYBILL_ITEM = 'talaelos-playbill';
export const REGULAR_AFTER = 3;

const stop = (id, region, where, x, z, yaw) => freeze({ id, region, where, x, z, yaw });
/** Where the wagon camps: level open ground beside a road in each region (found by searching the world with tests/find-troupe-stops.mjs, and checked in tests/troupe.test.js). */
export const TROUPE_STOPS = freeze([
  stop('avrel', 'Drent', 'the edge of the Avrel clearing', -430.4, 46.4, .785),
  stop('fernway', 'Drent', 'the verge by Fernway Rest', -110.6, 29.3, Math.PI),
  stop('lumber-town', 'Luscia', 'the meadow outside Lumber Town', -679.1, 334.9, Math.PI / 2),
  stop('moros', 'Moros Plain', 'a wayside on the Moros Plain', -867.1, 543.2, Math.PI),
  stop('solis-road', 'West Suval', 'the verge of the Solis road', -536.5, 865.7, .785),
  stop('rimeholt', 'Pueth', 'the green below Rimeholt', -339.7, -344.6, 3.927),
  stop('nemmel', 'Elagos', 'the field by Nemmel', -1251.3, 100.9, Math.PI * 1.5),
  stop('ostel', 'Amod', 'the road below Ostel', -764, -504, .785),
]);
export const TROUPE_STOP_IDS = freeze(TROUPE_STOPS.map(s => s.id));
/** A point in the wagon's frame: `lx` along its length (the mare is at +x), `lz` toward its audience. */
export function wagonPoint(s, lx, lz) {
  const c = Math.cos(s.yaw), n = Math.sin(s.yaw);
  return { x: s.x + lx * c + lz * n, z: s.z - lx * n + lz * c };
}

const member = (id, model, name, role, spot, stage = null) => freeze({ id, model, name, role, spot: freeze(spot), stage: stage && freeze(stage) });
/** The company. `spot` and `stage` are [lx, lz, turn] in the wagon's frame; turn 0 faces the audience. */
export const TROUPE_PEOPLE = freeze([
  member('troupe-galeon', 'galeon', 'Galeon Trell', '“The Magnificent”, actor-manager of Talaelos', [0, 2.8, 0], [.5, .35, 0]),
  member('troupe-isaura', 'isaura', 'Isaura Thale', 'Tragedian of Talaelos', [-1.6, 2.4, .4], [-1.1, .5, .35]),
  member('troupe-pim', 'pim', 'Pim Belloss', 'Clown of Talaelos', [1.6, 2.5, -.4], [1.6, .3, -.35]),
  member('troupe-nilor', 'nilor', 'Old Nilor', 'Book-holder of Talaelos (the book is blank)', [-3.1, 1.3, .9]),
  member('troupe-zaela', 'zaela', 'Zaela Caeren', 'Musician of Talaelos', [3.0, 1.7, -.7]),
  member('troupe-understudy', 'understudy', 'Understudy', 'The company dog (he understudies every part)', [.9, 3.6, 2.4]),
  member('troupe-critic', 'critic', 'The Critic', 'The company mare', [4.9, 0, Math.PI / 2]),
]);
export const TROUPE_IDS = freeze(new Set(TROUPE_PEOPLE.map(p => p.id)));
/** Where each of them stands at a stop: on the ground, or on the stage while a scene is on. */
export function troupeHomes(s, performing = false) {
  return Object.fromEntries(TROUPE_PEOPLE.map(p => {
    const onStage = performing && p.stage, [lx, lz, turn] = onStage ? p.stage : p.spot, at = wagonPoint(s, lx, lz);
    return [p.id, { ...at, yaw: s.yaw + turn, lift: onStage ? DECK : 0 }];
  }));
}
/** The wagon as bodies for the frame: three wide circles down its length, one for the shafts. */
export function wagonBodies(s) {
  return [...[-1.45, 0, 1.45].map((lx, i) => ({ id: `troupe-wagon-${i}`, ...wagonPoint(s, lx, 0), r: 1.25 })), { id: 'troupe-wagon-shafts', ...wagonPoint(s, 3.1, 0), r: .5 }];
}

// ---------------------------------------------------------------------------
// Where they are, and when they move on
// ---------------------------------------------------------------------------
export function validateTroupeSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) return false;
  if (!TROUPE_STOP_IDS.includes(data.stop) || typeof data.met !== 'boolean' || typeof data.gifted !== 'boolean') return false;
  for (const key of ['scenes', 'tips', 'deaths']) if (!Number.isInteger(data[key]) || data[key] < 0 || data[key] > 1e6) return false;
  if (!Number.isFinite(data.clock) || data.clock < 0) return false;
  return !data.gifted || data.scenes >= REGULAR_AFTER;
}

export function createTroupe({ random = Math.random, start = null } = {}) {
  const firstStop = start ?? (random() < .5 ? 'avrel' : 'fernway');
  const state = { stop: Math.max(0, TROUPE_STOP_IDS.indexOf(firstStop)), clock: 0, met: false, heard: false, scenes: 0, tips: 0, deaths: 412, gifted: false, performing: false };
  const here = () => TROUPE_STOPS[state.stop];
  const away = (s, t) => !t || Math.hypot(s.x - t.x, s.z - t.z) > TROUPE_UNSEEN;

  /**
   * One step. `traveler` is { x, z }. Events: 'heard' when the traveler first
   * comes within earshot of a stop, and 'moved' when the company has packed up
   * and gone somewhere nobody was looking.
   */
  function update(dt, traveler = null) {
    const events = [];
    state.clock += dt;
    const s = here();
    if (traveler && !state.heard && Math.hypot(s.x - traveler.x, s.z - traveler.z) < TROUPE_HEAR) { state.heard = true; events.push({ type: 'heard', stop: s, line: HEARD[Math.floor(random() * HEARD.length)] }); }
    if (!state.performing && state.clock > TROUPE_STAY && away(s, traveler)) {
      const options = TROUPE_STOPS.map((t, i) => i).filter(i => i !== state.stop && away(TROUPE_STOPS[i], traveler));
      if (options.length) {
        const from = s;
        state.stop = options[Math.floor(random() * options.length)]; state.clock = 0; state.heard = false;
        events.push({ type: 'moved', from, to: here() });
      }
    }
    return events;
  }
  function moveTo(id) { const i = TROUPE_STOP_IDS.indexOf(id); if (i < 0) return false; state.stop = i; state.clock = 0; state.heard = false; return true; }
  function meet() { const first = !state.met; state.met = true; return { first }; }
  function beginScene() { state.performing = true; }
  /** The traveler walked out before the end: the company climbs down, and nothing is counted. */
  function cancelScene() { const was = state.performing; state.performing = false; return was; }
  /** A scene played to the end. The third makes the traveler a regular, and brings the playbill. */
  function endScene() {
    state.performing = false; state.scenes++; state.deaths++;
    const gift = !state.gifted && state.scenes >= REGULAR_AFTER;
    if (gift) state.gifted = true;
    return { scenes: state.scenes, gift };
  }
  const tip = n => { state.tips += Math.max(0, Math.floor(n)); };
  const die = () => ++state.deaths;
  function snapshot() { return { version: 1, stop: here().id, clock: Math.round(state.clock * 10) / 10, met: state.met, scenes: state.scenes, tips: state.tips, deaths: state.deaths, gifted: state.gifted }; }
  function restore(data) {
    if (!validateTroupeSnapshot(data, { allowMissing: false })) return false;
    Object.assign(state, { stop: TROUPE_STOP_IDS.indexOf(data.stop), clock: data.clock, met: data.met, scenes: data.scenes, tips: data.tips, deaths: data.deaths, gifted: data.gifted, heard: false, performing: false });
    return true;
  }
  return { update, moveTo, meet, beginScene, cancelScene, endScene, tip, die, snapshot, restore, homes: () => troupeHomes(here(), state.performing), bodies: () => wagonBodies(here()),
    get stop() { return here(); }, get met() { return state.met; }, get scenes() { return state.scenes; }, get deaths() { return state.deaths; },
    get performing() { return state.performing; }, get gifted() { return state.gifted; }, get tips() { return state.tips; } };
}
const HEARD = freeze([
  'From somewhere ahead, a voice like a trumpet: “Is this a goblin I see before me?” Somebody laughs. Somebody else dies, loudly.',
  '“A horse! A horse! My kingdom for a hor— no, Pim, not that horse.” There are players on the road ahead.',
  'A lute, badly out of step with the mood, and a man declaiming at a hedge. There are players camped ahead.',
  'Bells, a dog barking in time, and a woman somewhere ahead dying at tremendous length. Players.',
]);

// ---------------------------------------------------------------------------
// The play
// ---------------------------------------------------------------------------
const pick = (random, list) => list[Math.floor(random() * list.length)];
function pickSome(random, list, n) { const pool = [...list], out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]); return out; }
/** "the Caloss bridge" → "Caloss Bridge"; "a turnip" → "Turnip". */
export const bare = phrase => String(phrase).replace(/^(a|an|the|some)\s+/i, '');
export const titled = phrase => bare(phrase).replace(/(^|\s)(\S)/g, (m, s, c) => s + c.toUpperCase());
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export const SUGGESTIONS = freeze({
  place: freeze(['the bottom of a well', 'the Caloss bridge', 'a goose farm', 'the Emperor’s bathtub', 'Tidehaven pier', 'a leaking rowboat', 'the ruins of Rena', 'an army latrine', 'the top of a very tall ladder', 'the Moros Plain, which is all of it the same', 'a wedding in Nylon', 'the inside of a whale']),
  thing: freeze(['a turnip', 'a wooden leg', 'a cup of hot chocolate', 'a stolen crown', 'a very small horse', 'a goblin’s hat', 'a love letter', 'a cursed spoon', 'the wrong baby', 'a skull that talks', 'a map to nowhere', 'a goose']),
  trouble: freeze(['a curse', 'unrequited love', 'taxes', 'a war nobody asked for', 'hiccups', 'a missing twin', 'bad weather', 'a debt to the Selemi', 'a prophecy, wrongly read', 'mistaken identity', 'bees', 'the plague of politeness']),
});
/** Three to choose from, and the place the traveler is standing in, if there is one. */
export function suggestionChoices(kind, random = Math.random, here = null) {
  const three = pickSome(random, SUGGESTIONS[kind], 3);
  if (kind === 'place' && here && !three.includes(here)) three[2] = here;
  return three;
}
export const TWISTS = freeze({
  twin: freeze({ label: t => `Reveal that ${t} is your long-lost twin.` }),
  goblins: freeze({ label: () => 'Declare that everyone on stage is secretly a goblin.' }),
  rain: freeze({ label: () => 'Make it start raining. Indoors.' }),
  duel: freeze({ label: t => `Challenge the Duke to a duel, with ${t}.` }),
  song: freeze({ label: () => 'Demand a song.' }),
  no: freeze({ label: () => 'Say no.' }),
});
export const TWIST_IDS = freeze(Object.keys(TWISTS));
/** Three turns for the traveler to choose from; "no" is always one of them, because Galeon cannot say it. */
export const twistChoices = (random = Math.random) => [...pickSome(random, TWIST_IDS.filter(id => id !== 'no'), 2), 'no'];

const FORMS = freeze({
  tragedy: (p, t, x) => `The Most Lamentable Tragedy of ${titled(t)}, at ${titled(p)}`,
  comedy: (p, t, x) => `A Comedy of ${titled(x)}, or, What Happened at ${titled(p)}`,
  history: (p, t, x) => `The True and Tolerably Accurate History of ${titled(t)}`,
  romance: (p, t, x) => `${titled(t)} in Love, or, ${titled(x)}`,
});
const OPENERS = freeze([
  (p, t, x) => `Now is the winter of our ${bare(x)}, made glorious summer by ${t}!`,
  (p, t, x) => `Something is rotten at ${p}, and I very much suspect it is ${t}.`,
  (p, t, x) => `Friends, strangers, passing sheep: lend me your ears! I come to bury ${t}, not to praise it.`,
  (p, t, x) => `Is this ${t} which I see before me? Come, let me clutch thee. No: I have thee not, and yet I see thee still.`,
  (p, t, x) => `But soft! What light through yonder ${bare(p)} breaks? It is ${t}, and ${bare(x)} is the sun!`,
]);
const COUPLETS = freeze([
  (p, t) => `“So ends the tale of ${t} and woe; / give us your hands, and let us go!”`,
  () => '“The play is done, the Duke is dead; / Pim, strike the jig, and then to bed!”',
  () => '“And if this play has been too long, / forgive us all! Zaela: the song!”',
  (p) => `“${cap(bare(p))} is saved, or else it’s not; / Nilor, remind me, what was the plot?” From the side, Nilor: “What plot?”`,
]);
const WRONG_MUSIC = freeze(['a funeral march', 'a lullaby', 'a hymn for the harvest', 'a sea shanty about a different sea', 'something for a coronation']);
const ordinal = n => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] ?? 'th'}`;

/**
 * A scene made of the traveler's suggestions: the first half up to the turn,
 * and the rest once the traveler has chosen `twist`. `death` is which of
 * Isaura's deaths this one will be.
 */
export function improvScene({ place, thing, trouble, twist = null, random = Math.random, death = 413, form = null }) {
  const p = place, t = thing, x = trouble;
  const kind = form ?? pick(random, Object.keys(FORMS));
  const title = FORMS[kind](p, t, x);
  const opening = [
    `Old Nilor opens the blank book, studies an empty page gravely, and announces: “${title}.”`,
    `Galeon, as the Duke of ${titled(p)}: “${pick(random, OPENERS)(p, t, x)}”`,
    `Isaura, as the Duke’s ${pick(random, ['sister', 'widow, somehow', 'conscience', 'long-suffering cook'])}: “Alas! ${cap(bare(x))}! ${cap(bare(x))} hath followed me from ${p} to here, and here, my lord, is also ${p}!”`,
    `Pim, as ${t} itself: “I am ${t}! Nobody ever asks what ${t} wants!” A pause. “Nobody is asking now, either.” He falls over.`,
    'Galeon turns to face you, arms wide: “And now, you! Yes, you, in the audience! What happens next?”',
  ];
  if (!twist) return { kind, title, opening, turn: null, ending: [] };
  const dies = `Isaura, finding herself not yet dead, dies anyway: of ${bare(x)}, at length, and with feeling. It is her ${ordinal(death)} death on this road.`;
  const turn = {
    twin: [`You declare that ${t} is your long-lost twin.`, `Galeon: “Yes! And our mother always said you had her eyes! Embrace, sibling!” Pim, still being ${t}, embraces you. It is not a good embrace.`, dies],
    goblins: ['You declare that everyone on stage is secretly a goblin.', 'Pim hunches at once and hisses. Galeon, magnificently: “Yes! And we have been goblins all along, even in Nylon, where nobody noticed!”', `Isaura dies of the shock. It is her ${ordinal(death)} death on this road, and one of her best.`],
    rain: ['You make it start raining. Indoors.', `Zaela plays something for drizzle. Galeon opens an umbrella he did not have a moment ago. “Yes! And it rains only upon ${p}, which deserves it!”`, dies],
    duel: [`You challenge the Duke to a duel, with ${t}.`, `Galeon: “Yes! And I accept, with ${t} of my own!” You fence. You win, because Galeon dies, and Isaura, who was not quick enough to die first, is furious.`, `Isaura dies of fury, which counts. It is her ${ordinal(death)} death on this road.`],
    song: ['You demand a song.', `Zaela plays ${pick(random, WRONG_MUSIC)}. The whole company sings a drinking song over it about ${t}. Understudy howls the harmony.`, dies],
    no: ['You say no.', 'Silence. Galeon turns slowly, eyes shining: “No? NO! The boldest word in all the theatre!” He cannot say it back; nobody in Talaelos can. “Yes, and... nothing happens! Behold, good people: nothing!”', 'The company stands very still, doing nothing magnificently. Old Nilor writes “nothing” in the book. It is the first word in it. Isaura dies of the tension anyway.'],
  }[twist];
  const ending = [
    `Galeon, stepping forward: ${pick(random, COUPLETS)(p, t, x)}`,
    `Zaela strikes up ${pick(random, WRONG_MUSIC)}. Pim jigs to it anyway, bells going. Understudy barks in time. The Critic sighs.`,
  ];
  return { kind, title, opening, turn, ending };
}

// ---------------------------------------------------------------------------
// What they say
// ---------------------------------------------------------------------------
const GALEON_FIRST = freeze([
  'Hold! Stay thy foot, good traveller! You have walked, all unknowing, into the second act of Talaelos, the players of Nylon, and you are, as of this moment, in it.',
  'I am Galeon Trell, called the Magnificent, chiefly by myself. The lady dying is Isaura Thale; she will be finished shortly. The clown is Pim. The old gentleman with the book is Nilor. The music, such as it is, is Zaela. The dog is Understudy. The horse is The Critic. Do not ask the horse.',
  'We play the whole of Azhora, from the Moros to Amod, and we play it without a script, for reasons Old Nilor will explain at a length you will regret. Give us a place, a thing and a trouble, and we will make you a play!',
]);
const GALEON_AGAIN = freeze([
  'The traveller returns! Act two! Or act nine; we have lost count, and Nilor has lost the count, and the count has lost interest.',
  'You! Our audience! Our critic! Not our Critic; she is eating a thistle. What shall it be today?',
  'Ah, the face that launched a thousand suggestions. Well, three. Shall we?',
]);
const GALEON_TALK = freeze({
  who: [
    'Talaelos: “fiery speech”, in the tongue of Nylon, where they argue in the streets for pleasure and on the stage for money.',
    'We were once the Lord Treasurer’s Men, until we did a scene about the Lord Treasurer. Now we are nobody’s men, which pays worse and feels better.',
  ],
  improv: [
    'Because the only book we had was eaten, and because a written play is a dead play. It says the same thing every night, like a man who has only three things to say.',
    'Ours are alive! Mostly. Isaura’s are dead, but vividly.',
  ],
  no: [
    'Say n— the other word? I cannot. None of us can. It is the first rule of the craft: whatever is offered, you take it, and you add to it. Yes, and.',
    'I have not said the other word in eleven years. It cost me a marriage and a very good horse. The Critic was the horse I got instead. Yes, and she has never forgiven me either.',
  ],
});
const ISAURA_DEATHS = freeze([
  'Of a broken heart, and then, to be safe, a bear.',
  'By poison, from a cup I will insist on drinking twice.',
  'Stabbed with a turnip. It is harder than it sounds, for both of us.',
  'Of grief, over a goose. You will understand when you see the goose.',
  'Slowly. Very slowly. Pim will fall asleep, and I will die over him.',
  'Pierced by the plot. Nilor will not say which plot. There is no plot.',
]);
const PIM_JOKES = freeze([
  'Why did the soldier cross the Caloss? Because the Coalition was on the other side. Nobody laughs at that one in Moros. Nobody laughs at it anywhere, actually.',
  'What do you call a goblin with a wooden sword? Whatever he likes.',
  'I asked The Critic what she thought of my jig. She sighed. From The Critic, that is a standing ovation.',
  'Isaura and I did a double act once: she died, and I fell over her. We were booked for a month in Eer. She died every night; I fell over her every night; the second week, they started betting on which.',
]);
const NILOR_PROMPTS = freeze(['Parsnip.', 'Treason.', 'Your mother.', 'Exit, pursued by a heron.', 'Louder.', 'Again, but sadder.', 'The goose did it.', 'Kneel.']);
const ZAELA_MOODS = freeze({
  happy: ['Something happy.', 'She plays a dirge so mournful that a passing crow lands on the wagon to listen. “That was happy,” she says. “For the crow.”'],
  sad: ['Something sad.', 'She plays a jig so bright that Pim starts dancing before he has decided to. “Sad,” she says, “is when it stops.”'],
  battle: ['Something for a battle.', 'She plays a lullaby, very gently. Understudy lies down. Somewhere, you suspect, a war is going worse than it should.'],
});
const UNDERSTUDY_GREETINGS = freeze([
  'Understudy sits. Then lies down. Then rolls over and plays dead, magnificently. Across the camp, Isaura looks furious.',
  'Understudy offers you a paw, then the other paw, then a third paw from somewhere, which is not his.',
  'Understudy sniffs your hand, decides you are a supporting part, and wags.',
]);
const CRITIC_GREETINGS = freeze([
  'The Critic looks at you for a long moment, and sighs.',
  'The Critic has seen better. She makes sure you know it.',
  'The Critic eats a thistle with the air of someone who expected more.',
]);

/**
 * Everybody in the company. `act` runs in the host: 'troupe-meet',
 * 'troupe-scene-begin', 'troupe-tip-<n>' (which ends the scene; 0 is applause)
 * and 'troupe-isaura-dies'.
 * `purse` is the copper carried; `here` the name of where the traveler stands.
 */
export function troupeConversation(npc, context) {
  const { troupe, random = Math.random, purse = 0, here = null, openDialogue, closeDialogue, act } = context;
  if (!TROUPE_IDS.has(npc.id)) return false;
  const who = TROUPE_PEOPLE.find(p => p.id === npc.id);
  const back = () => troupeConversation(npc, { ...context, again: true });
  const talk = lines => openDialogue(npc, [...lines], null, 'Back', { onComplete: back });
  if (who.model === 'understudy') { openDialogue(npc, [pick(random, UNDERSTUDY_GREETINGS)], null, 'Good dog'); return true; }
  if (who.model === 'critic') { openDialogue(npc, [pick(random, CRITIC_GREETINGS)], null, 'Leave her be'); return true; }
  if (who.model === 'isaura') {
    openDialogue(npc, [context.again ? 'Yes?' : `Isaura Thale. Tragedian. I have died ${troupe.deaths} times on this road, and I intend to do it again tonight.`], null, 'Let her rest', { choices: [
      { id: 'isaura-tonight', label: 'How will you die tonight?', action: () => talk([pick(random, ISAURA_DEATHS)]) },
      { id: 'isaura-show', label: 'Show me a death.', action: () => { act('troupe-isaura-dies'); openDialogue(npc, ['She clutches at nothing, staggers, sees something terrible over your shoulder, forgives it, and sinks. It takes most of a minute.', 'Then she stands, dusts off her cloak, and asks how it was.'], null, 'Back', { choices: [
        { id: 'isaura-magnificent', label: 'Magnificent.', action: () => talk(['I know. Thank you. Tell Galeon; he will be jealous, and it is good for him.']) },
        { id: 'isaura-long', label: 'A little long.', action: () => talk(['Long? LONG? The Moros Plain is long. My deaths are thorough.']) },
      ] }); } },
      { id: 'isaura-comedy', label: 'Do you ever play comedy?', action: () => talk(['I played a comedy once, in Eer. I died in it. They laughed. I have never forgiven them, and I have never been happier.']) },
      { id: 'leave-isaura', label: 'Rest well.', action: closeDialogue },
    ] });
    return true;
  }
  if (who.model === 'pim') {
    openDialogue(npc, [context.again ? 'More? You are a glutton for it.' : 'Pim Belloss, clown, at your service and frequently at your feet. Mind the bells; they are louder than they look.'], null, 'Leave him jingling', { choices: [
      { id: 'pim-joke', label: 'Tell me a joke.', action: () => talk([pick(random, PIM_JOKES)]) },
      { id: 'pim-jig', label: 'Why a jig after every play?', action: () => talk(['Because a tragedy without a jig at the end is just a funeral with better lighting.', 'Also it is in my contract. Also I wrote my contract.']) },
      { id: 'pim-bet', label: 'Is it true you once jigged somewhere for a bet?', action: () => talk(['Nylon to the Moros, nine days, bells on, for a bet with a Selemi merchant. He paid me in fish.', 'I have never been so famous, or smelled so bad.']) },
      { id: 'leave-pim', label: 'Keep jingling.', action: closeDialogue },
    ] });
    return true;
  }
  if (who.model === 'nilor') {
    openDialogue(npc, context.again ? ['Hm?'] : ['Hm? Oh. Nilor. I hold the book.', 'He shows you the book. Every page is blank.'], null, 'Leave him to it', { choices: [
      { id: 'nilor-blank', label: 'Why is the book blank?', action: () => talk(['It was not always. We had one play, the only copy in the world: The Tragical History of the Nine Kings of Caeras, in five acts and a jig. A goat ate it, in Luscia, between the third king and the fourth.', 'Since then I hold the book, and they make it up, and I prompt them anyway. A prompter without a script is still a prompter. He is only more honest.']) },
      { id: 'nilor-prompt', label: 'Prompt me.', action: () => talk([`He runs a finger down an empty page, frowns, and whispers: “${pick(random, NILOR_PROMPTS)}”`]) },
      { id: 'nilor-goat', label: 'What happened to the goat?', action: () => talk(['We left her in Luscia, with a good family and a bad review.']) },
      { id: 'leave-nilor', label: 'Good reading.', action: closeDialogue },
    ] });
    return true;
  }
  if (who.model === 'zaela') {
    openDialogue(npc, [context.again ? 'Another?' : 'Zaela. I play. Name a mood and I will play you something for it.'], null, 'Leave her playing', { choices: [
      ...Object.entries(ZAELA_MOODS).map(([mood, [label, line]]) => ({ id: `zaela-${mood}`, label, action: () => talk([line]) })),
      { id: 'zaela-why', label: 'Why always the wrong music?', action: () => talk(['Because the right music tells you what to feel. The wrong music makes you decide.', 'Galeon calls it counterpoint. Pim calls it Tuesday.']) },
      { id: 'leave-zaela', label: 'Play on.', action: closeDialogue },
    ] });
    return true;
  }
  // Galeon: the company's front door, and the play.
  const first = !troupe.met;
  if (first) act('troupe-meet');
  const opening = first ? [...GALEON_FIRST] : context.again ? ['Where were we? The play! Always the play.'] : [pick(random, GALEON_AGAIN)];
  openDialogue(npc, opening, null, 'Exit, pursued by nobody', { choices: [
    { id: 'troupe-scene', label: 'Perform something!', action: () => askSuggestions(npc, context) },
    { id: 'troupe-who', label: 'Who are you people?', action: () => talk(GALEON_TALK.who) },
    { id: 'troupe-improv', label: 'Why no script?', action: () => talk(GALEON_TALK.improv) },
    { id: 'troupe-no', label: 'Have you ever said no?', action: () => talk(GALEON_TALK.no) },
    { id: 'troupe-where', label: 'Where are you going next?', action: () => talk([`We go where the wagon goes, and the wagon goes where The Critic consents to pull it. After this, perhaps ${pick(random, TROUPE_STOPS.filter(s => s.id !== troupe.stop.id)).where}. Perhaps not! Perhaps anywhere!`]) },
    { id: 'leave-galeon', label: 'Break a leg.', action: closeDialogue },
  ] });
  return true;
}

/** Galeon asks for a place, a thing and a trouble, then the play, the traveler's turn, the end, and the hat. */
function askSuggestions(npc, context) {
  const { troupe, random = Math.random, purse = 0, here = null, openDialogue, closeDialogue, act } = context;
  const chosen = {};
  const ask = (kind, prompt, next) => {
    const options = suggestionChoices(kind, random, kind === 'place' ? here : null);
    openDialogue(npc, [prompt], null, 'Never mind', { choices: [
      ...options.map((option, i) => ({ id: `troupe-${kind}-${i}`, label: cap(option), action: () => { chosen[kind] = option; next(); } })),
      { id: `troupe-${kind}-surprise`, label: 'Surprise us.', action: () => { chosen[kind] = pick(random, SUGGESTIONS[kind]); next(); } },
    ] });
  };
  const play = () => {
    act('troupe-scene-begin');
    const scene = improvScene({ ...chosen, random, death: troupe.deaths + 1 });
    openDialogue(npc, scene.opening, null, 'Walk out of the play', { choices: twistChoices(random).map(id => ({ id: `troupe-twist-${id}`, label: TWISTS[id].label(chosen.thing), action: () => {
      const done = improvScene({ ...chosen, twist: id, random, death: troupe.deaths + 1, form: scene.kind });
      openDialogue(npc, [...done.turn, ...done.ending], null, 'Applaud and go', { choices: [
        ...[1, 3, 5].map(n => ({ id: `troupe-tip-${n}`, label: n === 1 ? 'Toss them a copper.' : `Toss them ${n} copper${n === 5 ? ', for the dog' : ''}.`, enabled: purse >= n,
          reason: purse >= n ? '' : `You carry ${purse} copper.`, action: () => { closeDialogue(); act(`troupe-tip-${n}`); } })),
        { id: 'troupe-applaud', label: 'Applaud, loudly.', action: () => { closeDialogue(); act('troupe-tip-0'); } },
      ] });
    } })) });
  };
  ask('place', 'A scene! Every scene needs a place. Where are we?', () => ask('thing', 'And a thing! Any thing! The first thing in your head!', () => ask('trouble', 'And a trouble, for there is no play without one.', play)));
}
/** What Galeon says as the hat comes round, and when the traveler has become a regular. */
export const troupeThanks = (n, gift) => [
  n ? `${n === 1 ? 'A copper' : `${n} copper`}! Nilor, write it in the book. The book has room.` : 'Applause! The only coin that never runs out, and never buys anything.',
  ...(gift ? ['Three plays! You are no longer an audience. You are a regular, which is worse, and a friend, which is better.', 'Take this: our playbill, signed by the whole company, and the dog. If anyone asks, you are with Talaelos.'] : []),
];
