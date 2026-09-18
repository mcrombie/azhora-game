/**
 * Puck, the wine goblin of Solis: small, clever, magic and permanently drunk.
 * He steals wine from everyone in the city (Juan's shelves at Tharganhom, the
 * merchant's stall, the Bronze Mare's casks, the offering cups at the temple),
 * talks in slurred couplets, and goes up in a puff of purple smoke the moment
 * anybody tries to catch him, to turn up again somewhere else.
 *
 * The city hates him. The city does not know that it keeps him. Solis stands
 * where three old things meet (the spirits of the vines on the hills, the
 * things under the sea wall, the springs beneath the town), and Puck's magic
 * keeps them from quarrelling, but only while it runs loose, which is to say
 * only while he is drunk. The old kings kept a Cup-Bearer to the Goblin. The
 * Empire abolished the office with everything else it did not understand. Now
 * Prime Minister Viviana Dorsael pays for his wine from a line in the harbour
 * accounts, and her secretary leaves it for him in a niche in the sea wall. If
 * Solis learned that its taxes keep Puck in wine, she would be finished by
 * supper.
 *
 * The traveler can find the cask, get the truth from the secretary, and choose:
 * keep the arrangement, or expose it. Exposed, the deliveries stop and Puck
 * sobers, and the city feels it, until somebody starts feeding him again.
 * Pure: no DOM, no three.
 */
import { solisPoint } from './region-world.js';
import { ATTIC_BOTTLES, ATTIC_WINES } from './attic-wines.js';

const freeze = Object.freeze;
const P = solisPoint;

/** `stay`: seconds at one haunt before he moves on. He goes at once if somebody hurries at him (`spook`) or swings at him (`swingSpook`). */
export const PUCK = freeze({ id: 'puck', name: 'Puck', role: 'The wine goblin of Solis', stay: 95, spook: 2.6, swingSpook: 3.6, talk: 3.4 });
export const PRIME_MINISTER = 'Prime Minister Viviana Dorsael';
export const SECRETARY = freeze({ id: 'solis-secretary', name: 'Tancredi Vel', role: 'Private secretary to the Prime Minister of Solis', modelRole: 'relay-clerk', color: 0x2f5a4a });
/** At the door of the Prime Minister's offices, in the old counting house. */
export const SECRETARY_STAND = freeze({ ...P(-7.4, 9.1), yaw: Math.PI });
export const KEEP_REWARD = 25;

/** Where Puck turns up. On the ridge of Tharganhom's roof he is out of reach, and knows it. */
export const PUCK_HAUNTS = freeze([
  freeze({ id: 'attic-ridge', name: 'the ridge of Tharganhom’s roof', ...P(12.8, -17), perch: 'attic-ridge', yaw: -Math.PI / 2 }),
  freeze({ id: 'merchant-stall', name: 'Aurel Mendo’s wine stall', ...P(-29.6, -21.4), yaw: .4 }),
  freeze({ id: 'fountain', name: 'the king’s fountain', ...P(-16.6, -26.6), yaw: -1.2 }),
  freeze({ id: 'inn-yard', name: 'the casks behind the Bronze Mare', ...P(-23, 20.6), yaw: 0 }),
  freeze({ id: 'temple-steps', name: 'the offering cups on the temple steps', ...P(20.2, 21.4), yaw: Math.PI }),
  freeze({ id: 'sea-wall', name: 'the patched sea wall by the quay', ...P(-44.6, 5.2), yaw: -Math.PI / 2 }),
]);
export const PUCK_HAUNT_IDS = freeze(PUCK_HAUNTS.map(haunt => haunt.id));
/**
 * The niche in the inner face of the sea wall (the wall line is at a = -50 and
 * 2.4 m thick) where the Prime Minister's cask is left every tenth night.
 */
export const SEA_WALL_NICHE = freeze({ ...P(-48.35, 7.4), yaw: Math.PI / 2, reach: 2.2 });

/** What the city feels as Puck sobers, once the deliveries have stopped. */
export const SOBER_SIGNS = freeze([
  freeze({ at: .35, title: 'THE KING’S FOUNTAIN', line: 'The water from the king’s fountain tastes faintly of salt today. Nobody can say why.' }),
  freeze({ at: .7, title: 'THE SEA WALL', line: 'Out past the patched sea wall, something knocks under the water. Three times, slow.' }),
  freeze({ at: 1, title: 'THE ORANGE COURT', line: 'Every tree in the orange court has dropped its fruit, green. Puck has been sober for a whole day.' }),
]);
/** Seconds of play for a sober Puck to go from the first sign to the last. */
export const SOBERING = 420;

export const QUESTS = freeze(['none', 'heard', 'cask', 'told', 'kept', 'exposed']);
const rank = stage => QUESTS.indexOf(stage);

export function validatePuckSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) return false;
  if (!PUCK_HAUNT_IDS.includes(data.haunt) || typeof data.met !== 'boolean' || !QUESTS.includes(data.quest)) return false;
  if (!Number.isInteger(data.gifts) || data.gifts < 0 || data.gifts > 1e6 || !Number.isInteger(data.poofs) || data.poofs < 0 || data.poofs > 1e7) return false;
  if (typeof data.sober !== 'number' || !(data.sober >= 0 && data.sober <= 1)) return false;
  if (!Number.isInteger(data.signs) || data.signs < 0 || data.signs > SOBER_SIGNS.length) return false;
  return data.quest === 'exposed' || (data.sober === 0 && data.signs === 0);
}

export function createPuck({ random = Math.random } = {}) {
  const state = { haunt: 0, clock: 0, met: false, quest: 'none', gifts: 0, poofs: 0, sober: 0, signs: 0 };
  const haunt = () => PUCK_HAUNTS[state.haunt];

  function poof(reason) {
    const from = haunt();
    let next = Math.floor(random() * (PUCK_HAUNTS.length - 1));
    if (next >= state.haunt) next++;
    state.haunt = next; state.clock = 0; state.poofs++;
    return { type: 'poof', reason, from, to: haunt() };
  }
  /**
   * One step of his evening. `traveler` is where the traveler is, whether they
   * are hurrying (running at him) and whether a blade is swinging. Returns the
   * events: a poof, or a sign that the city is feeling his sobriety.
   */
  function update(dt, traveler = null) {
    const events = [];
    state.clock += dt;
    const here = haunt(), d = traveler ? Math.hypot(traveler.x - here.x, traveler.z - here.z) : Infinity;
    if (traveler && ((traveler.hurrying && d < PUCK.spook) || (traveler.swinging && d < PUCK.swingSpook))) events.push(poof(traveler.swinging ? 'swung-at' : 'chased'));
    // Out of reach on the ridge, he moves on when he likes; on the ground he stays while somebody is with him.
    else if (state.clock > PUCK.stay && (d > 12 || here.perch)) events.push(poof('wandered'));
    if (state.quest === 'exposed') {
      state.sober = Math.min(1, state.sober + dt / SOBERING);
      while (state.signs < SOBER_SIGNS.length && state.sober >= SOBER_SIGNS[state.signs].at) events.push({ type: 'sober-sign', ...SOBER_SIGNS[state.signs++] });
    }
    return events;
  }
  /** The traveler grabs at him. He is never there. */
  const grab = () => poof('grabbed');
  function meet() { const first = !state.met; state.met = true; if (state.quest === 'none') state.quest = 'heard'; return { first }; }
  function hear() { if (state.quest === 'none') { state.quest = 'heard'; return { first: true }; } return { first: false }; }
  /** The cask in the niche in the sea wall, sealed with the Prime Minister's seal. */
  function findCask() { const first = rank(state.quest) < rank('cask'); if (first) state.quest = 'cask'; return { first }; }
  /** The secretary, shown the seal, tells the truth. */
  function confront() { if (state.quest !== 'cask') return { ok: false }; state.quest = 'told'; return { ok: true }; }
  function keep() { if (state.quest !== 'told') return { ok: false }; state.quest = 'kept'; return { ok: true, reward: KEEP_REWARD }; }
  function expose() { if (state.quest !== 'told') return { ok: false }; state.quest = 'exposed'; return { ok: true }; }
  /** A bottle for Puck, from the traveler's satchel: he drinks it, and whatever had started to go wrong settles. */
  function feed(item) {
    const id = ATTIC_BOTTLES[item];
    if (!id) return { ok: false, reason: 'He sniffs it and hands it back. “Wine, long-legs. Wine.”' };
    state.gifts++;
    const settled = state.sober > 0;
    state.sober = 0; state.signs = 0;
    return { ok: true, first: state.gifts === 1, wine: ATTIC_WINES[id], settled };
  }
  function task() {
    const q = state.quest;
    if (q === 'heard') return { title: 'Puck, the wine goblin', stage: 'heard', detail: 'Everybody in Solis hates Puck, and nobody can catch him. Juan says the goblin has drunk half his stock. And yet Puck has never once gone thirsty. Somebody is feeding him. Ask about the city; watch where he drinks.' };
    if (q === 'cask') return { title: 'Puck, the wine goblin', stage: 'cask', target: SECRETARY.id, detail: 'A cask of good wine in a niche in the sea wall, sealed in green wax with a sun-horse over a ledger: the seal of the Prime Minister’s office. Her secretary keeps the door of the old counting house.' };
    if (q === 'told') return { title: 'Puck, the wine goblin', stage: 'decide', target: SECRETARY.id, detail: `${PRIME_MINISTER} keeps Puck in wine to keep the old spirits of Solis at peace, and it would end her if the city knew. Tancredi Vel is waiting to hear what you will do.` };
    return null;
  }
  const sober = () => state.quest === 'exposed' && state.sober >= SOBER_SIGNS[0].at;
  function snapshot() { return { version: 1, haunt: haunt().id, met: state.met, quest: state.quest, gifts: state.gifts, poofs: state.poofs, sober: state.sober, signs: state.signs }; }
  function restore(data) {
    Object.assign(state, { haunt: 0, clock: 0, met: false, quest: 'none', gifts: 0, poofs: 0, sober: 0, signs: 0 });
    if (!validatePuckSnapshot(data, { allowMissing: false })) return false;
    Object.assign(state, { haunt: PUCK_HAUNT_IDS.indexOf(data.haunt), met: data.met, quest: data.quest, gifts: data.gifts, poofs: data.poofs, sober: data.sober, signs: data.signs });
    return true;
  }
  return { update, grab, meet, hear, findCask, confront, keep, expose, feed, task, snapshot, restore, sober,
    get haunt() { return haunt(); }, get met() { return state.met; }, get quest() { return state.quest; }, get gifts() { return state.gifts; }, get poofs() { return state.poofs; },
    get soberness() { return state.sober; } };
}

// ---------------------------------------------------------------------------
// What Puck says, drunk and sober
// ---------------------------------------------------------------------------
const PUCK_FIRST = freeze([
  'Well, well: a long-legs come to stare / at Puck, the goblin, sitting there.',
  'He raises a bottle that is certainly not his. “Your health! Or mine. I am not particular. Hic.”',
]);
const PUCK_AGAIN = freeze([
  'Back again? You must be fond / of goblins, or of vagabond— / hic. Vagabondage. That is a word.',
  'Long-legs! Sit. No, stand. No, sit. / I have had a drink. Or three of it.',
  'Shh. The wine is sleeping. So am I. / So is the sea. Do not ask me why.',
]);
const PUCK_SOBER = freeze([
  'He is sitting very still, and for the first time he looks like something old.',
  '“No rhymes. Rhymes need wine. Everything in this city needs wine, and nobody will say it out loud.”',
]);
const PUCK_TALK = freeze({
  who: [
    'Puck. Just Puck. The one they curse / when the wedding cask runs dry, or worse.',
    'I was in Solis before the walls, before the kings, before the first fool planted the first vine and called it his. I am the oldest thief in the city. Show some respect. Hic.',
  ],
  why: [
    'Steal? I borrow. I just never give it back. It is a very long borrow.',
    'Wine is sunlight that learned to sit still in a cup. When I drink it, it gets up again and goes where it is needed. Somebody has to. Nobody else is doing it properly.',
  ],
  hated: [
    'Hated! Yes! Adored by none, / despised by all beneath the sun.',
    'And yet: fed. Funny, that. The most hated goblin in Solis, and never once gone thirsty. Think about it, long-legs. No, do not. Thinking is how it starts.',
  ],
});

/**
 * Puck, if the traveler comes up quietly. `inventory` shows what bottles the
 * traveler carries. `act` runs 'puck-meet', 'puck-grab' and 'puck-gift-<item>'.
 */
export function puckConversation(npc, context) {
  const { puck, inventory = null, openDialogue, closeDialogue, act } = context;
  if (npc.id !== PUCK.id) return false;
  const again = () => puckConversation(npc, { ...context, back: true });
  const first = !puck.met;
  if (first) act('puck-meet');
  const sober = puck.sober();
  const opening = sober ? [...PUCK_SOBER] : first ? [...PUCK_FIRST] : context.back ? ['Hic. Where was I. Where are you.'] : [PUCK_AGAIN[puck.poofs % PUCK_AGAIN.length]];
  const talk = lines => openDialogue(npc, [...lines], null, 'Back to Puck', { onComplete: again });
  const bottles = Object.keys(ATTIC_BOTTLES).filter(item => inventory?.has?.(item));
  const q = puck.quest;
  const caskLines = q === 'exposed'
    ? ['You told. Everybody knows now. So: no more green wax, no more little horse.', 'Listen to the sea wall tonight, long-legs. That knocking under the water? That is not me.']
    : q === 'kept' || q === 'told'
      ? ['You know, then. Good. Somebody sensible should. The Minister’s man is a nervous little heron of a fellow, but his taste in wine is excellent.']
      : ['The sea wall? Green wax, a little horse on it, left every tenth night like clockwork. Clockwork! In Solis!', 'Somebody up the hill loves me very much, and would rather die than say so.'];
  openDialogue(npc, opening, null, 'Leave him be', { choices: [
    { id: 'puck-who', label: 'Who are you?', action: () => talk(PUCK_TALK.who) },
    { id: 'puck-why', label: 'Why do you steal the wine?', action: () => talk(PUCK_TALK.why) },
    { id: 'puck-hated', label: 'Everybody in Solis hates you, you know.', action: () => talk(PUCK_TALK.hated) },
    ...(rank(q) >= rank('cask') ? [{ id: 'puck-cask', label: 'Who leaves you the cask in the sea wall?', action: () => talk(caskLines) }] : []),
    ...(bottles.length ? [{ id: 'puck-gift', label: 'Here. Have a bottle.', action: () => openDialogue(npc, ['His eyes go very wide and very bright.'], null, 'Back to Puck', { choices: [
      ...bottles.map(item => ({ id: `puck-gift-${item}`, label: `The ${ATTIC_WINES[ATTIC_BOTTLES[item]].name}.`, action: () => { closeDialogue(); act(`puck-gift-${item}`); } })),
      { id: 'puck-gift-none', label: 'On second thought, no.', action: again },
    ] }) }] : []),
    { id: 'puck-grab', label: 'Grab him!', action: () => { closeDialogue(); act('puck-grab'); } },
    { id: 'leave-puck', label: 'Good night, Puck.', action: closeDialogue },
  ] });
  return true;
}
/** What he says to a gift, drunk again. */
export const puckThanks = (wine, settled) => [
  `For me? For ME? Oh, you beautiful long-legged thing. The ${wine.name}!`,
  'He drinks half of it in one go, sighs like a kettle, and the colour comes back into his ears.',
  ...(settled ? ['Somewhere down by the quay, something under the water goes quiet.'] : ['A rhyme for you, then: / The sea is calm, the hills are kind, / and Puck is drunk. Now never mind.']),
];

// ---------------------------------------------------------------------------
// Tancredi Vel, at the Prime Minister's door
// ---------------------------------------------------------------------------
const SECRETARY_TRUTH = freeze([
  'He goes the colour of the counting house’s whitewash. He shuts the door behind you. He checks the door. He shuts it again.',
  'Keep your voice down. Yes, it is her seal. Yes, the cask is for the goblin. No, she is not mad.',
  'Solis stands where three old things meet: the spirits of the vines on the hills, the things under the sea wall, and the springs under the town. They have never liked each other. Before the walls and before the kings, something had to sit in the middle and keep them from quarrelling. That something is Puck.',
  'His magic does it, but only when it runs loose, which is to say only when he is drunk. Sober, it knots up tight inside him, and the three start in on each other. The fountain runs salt. The orange trees drop their fruit green. The bell under the sea wall starts knocking.',
  'The old kings had an office for it: Cup-Bearer to the Goblin, with a salary and a seal and a seat at the feasts. The Empire abolished it with everything else it did not understand, and we had the winter of the green oranges. Now the Prime Minister pays for his wine out of the harbour accounts, under sundries, and I carry it to the sea wall every tenth night.',
  `You have seen what this city thinks of Puck. He drank the wedding wine at half the weddings in Solis. If it came out that the city’s money keeps him in wine, ${PRIME_MINISTER} would be finished by supper, and whoever came next would stop the deliveries out of pure embarrassment. So. What are you going to do?`,
]);
/** The secretary. `act` runs 'puck-confront', 'puck-keep' and 'puck-expose'. */
export function secretaryConversation(npc, context) {
  const { puck, openDialogue, closeDialogue, act } = context;
  if (npc.id !== SECRETARY.id) return false;
  const q = puck.quest;
  const decide = lines => openDialogue(npc, lines, null, 'Leave the counting house', { choices: [
    { id: 'puck-keep', label: 'Your secret is safe with me.', action: () => { closeDialogue(); act('puck-keep'); } },
    { id: 'puck-expose-ask', label: 'The city has a right to know.', action: () => openDialogue(npc, [
      'Then you will tell them, and she will go, and the deliveries will stop, and you will hear the sea wall. You understand that?',
    ], null, 'Leave the counting house', { choices: [
      { id: 'puck-expose', label: 'Tell them anyway.', action: () => { closeDialogue(); act('puck-expose'); } },
      { id: 'puck-expose-no', label: 'No. Keep it.', action: () => { closeDialogue(); act('puck-keep'); } },
    ] }) },
  ] });
  if (q === 'cask') {
    openDialogue(npc, [`${SECRETARY.name}, private secretary to ${PRIME_MINISTER}. The Prime Minister is not receiving.`], null, 'Leave the counting house', { choices: [
      { id: 'puck-show-seal', label: 'I found a cask in the sea wall. Sealed with a sun-horse over a ledger.', action: () => { act('puck-confront'); decide([...SECRETARY_TRUTH]); } },
      { id: 'leave-secretary', label: 'Good day.', action: closeDialogue },
    ] });
  } else if (q === 'told') decide(['You came back. Well? What are you going to do?']);
  else if (q === 'kept') openDialogue(npc, ['The deliveries are made, the sea wall is quiet, and nobody knows but us. Every tenth night.', 'Bring him a bottle yourself sometime. He is not particular, whatever Juan says.'], null, 'Leave the counting house');
  else if (q === 'exposed') openDialogue(npc, [`${PRIME_MINISTER} resigned this morning. Her successor has stopped the deliveries, as I said he would.`, 'Listen to the sea wall tonight, and then tell me the city had a right to know. If you want to put it right, you know where the goblin drinks.'], null, 'Leave the counting house');
  else openDialogue(npc, [`${SECRETARY.name}, private secretary to ${PRIME_MINISTER}. The Prime Minister is not receiving. The Prime Minister is never receiving.`, 'She governs, mostly. And worries, the rest of the time. Mostly the worrying. Good day.'], null, 'Leave the counting house');
  return true;
}
