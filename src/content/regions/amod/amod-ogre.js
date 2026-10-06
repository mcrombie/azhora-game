/**
 * Mallec, who holds the Pueth road at the Amod pass stones.
 *
 * He is not a spawn. He is a creature three times a person's size who sits on a
 * pass stone, keeps a tally, takes three copper off carts, and has been entered
 * in the road house's book at Ostel for two generations as a charge on the road,
 * because paying him is cheaper than the alternative and Amodians can price an
 * alternative. The water court of the Tarvel served him a judgement once. He
 * keeps it under the stone. Nobody had ever given him anything in writing.
 *
 * Everything he offers is peaceable: pay, talk, or walk on. **One** choice starts
 * a fight, it is marked as what it is, and it can be declined for ever — this is
 * optional content beside a level-one road. Losing is the ordinary loss the rest
 * of the game handles: he does not finish people who have stopped, which is both
 * his character and exactly what `combat.js` does with a defeat and a checkpoint.
 *
 * Pure: no DOM, no three. The host supplies the dialogue box, the purse and the
 * encounter; `src/amod-ogre-fight.js` has nothing in it because the fight is an
 * ordinary `ENEMY_KINDS` entry (`ogre`) and an ordinary encounter config.
 */
import { OGRE_STAND, TOLL_STONE } from './amod-world.js';

export const OGRE_VERSION = 1;
/** Three copper for a cart, since before anybody alive was born, and never put up. */
export const OGRE_TOLL = 3;

/** Who he is, for the roster and the badge over his head. */
export const OGRE_NPC = Object.freeze({
  id: 'amod-ogre', name: 'Mallec', role: 'Who holds the road at the pass stones',
  ogre: true, color: 0x6d6551, yaw: OGRE_STAND.yaw, viewRange: 240,
});

/**
 * The fight, if it is ever asked for. The arena runs along +X, so walking east —
 * back toward Pueth, the way the traveler came — ends it, and the checkpoint
 * stands on that side. Twenty-odd clean swings with a simple sword; two of his
 * connect and you are finished.
 */
export const OGRE_ENCOUNTER = Object.freeze({
  id: 'amod-ogre', center: Object.freeze({ x: -679, z: -471 }),
  checkpoint: Object.freeze({ x: -658, z: -467 }),
  retreatAxis: 'x', retreatLine: -652,
  enemies: Object.freeze([
    Object.freeze({ id: 'amod-ogre', x: -681, z: -473, kind: 'ogre', hp: 620, entry: .6 }),
  ]),
});

/** What Ostel gives back when the road house is told it need not pay again. */
export const OGRE_BOUNTY = 24;

const fail = reason => ({ ok: false, reason });
const booleans = ['met', 'declined', 'challenged', 'beaten', 'reported'];

const emptyState = () => ({ version: OGRE_VERSION, revision: 0, met: false, paid: 0, declined: false, challenged: false, beaten: false, reported: false });

/** Reject an inconsistent save atomically; a restored toll never re-grants the bounty. */
export function validateOgreSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== OGRE_VERSION) return false;
  if (Object.keys(data).some(key => key !== 'version' && key !== 'revision' && key !== 'paid' && !booleans.includes(key))) return false;
  if (!Number.isSafeInteger(data.revision) || data.revision < 0) return false;
  if (!Number.isSafeInteger(data.paid) || data.paid < 0 || data.paid > 9999) return false;
  if (booleans.some(key => typeof data[key] !== 'boolean')) return false;
  // He cannot have been reported to the road house before he was beaten, and he
  // cannot have been beaten by somebody who never met him.
  if (data.reported && !data.beaten) return false;
  if ((data.beaten || data.challenged || data.paid || data.declined) && !data.met) return false;
  return true;
}

/**
 * The toll, and what has happened at the stone. `spendToll` is the host's purse:
 * it is asked for the coins and answers whether it could pay, so this module
 * never has to know what a copper piece is.
 */
export function createOgreToll({ spendToll = () => false } = {}) {
  let state = emptyState();

  function view() {
    return {
      ...state,
      title: state.beaten ? 'The road at the pass stones is open' : 'An ogre holds the Pueth road',
      detail: state.beaten
        ? 'Mallec sits on his stone and asks nobody for anything. Ostel’s road house has a line in its book it no longer has to pay.'
        : state.met ? `Three copper for a cart at the Amod pass stones. Paid ${state.paid} time${state.paid === 1 ? '' : 's'}.`
          : 'Something is sitting on the pass stones on the Amod border.',
    };
  }

  function meet() {
    if (state.met) return false;
    state.met = true; state.revision++;
    return true;
  }

  /** Pay the toll. The purse decides; a purse that cannot pay changes nothing. */
  function pay() {
    if (state.beaten) return fail('Mallec does not take the toll any more.');
    if (!spendToll(OGRE_TOLL)) return fail(`You do not have ${OGRE_TOLL} copper.`);
    state.met = true; state.paid++; state.revision++;
    return { ok: true, paid: state.paid, reason: '' };
  }

  /** Walk on without paying. He adds it to the tally and does nothing else about it. */
  function decline() {
    state.met = true; state.declined = true; state.revision++;
    return { ok: true, reason: '' };
  }

  /** The only action that starts a fight, and it is never taken by walking into him. */
  function challenge() {
    if (state.beaten) return fail('It is settled. He has nothing left to take from you.');
    state.met = true; state.challenged = true; state.revision++;
    return { ok: true, startEncounter: OGRE_ENCOUNTER.id, reason: '' };
  }

  /** The traveler broke off, or was put down. Either way the challenge is over and can be made again. */
  function endEncounter(encounterId) {
    if (encounterId !== OGRE_ENCOUNTER.id) return fail('That is not the fight at the pass stones.');
    if (!state.challenged) return fail('No challenge was made.');
    state.challenged = false; state.revision++;
    return { ok: true, reason: '' };
  }

  function winEncounter(encounterId) {
    if (encounterId !== OGRE_ENCOUNTER.id) return fail('That is not the fight at the pass stones.');
    if (state.beaten) return fail('It is already settled.');
    state.challenged = false; state.beaten = true; state.revision++;
    return { ok: true, reason: '' };
  }

  /** Telling Ostel closes the line in the road house's book. Once, and only once. */
  function report() {
    if (!state.beaten) return fail('There is nothing to tell them yet.');
    if (state.reported) return fail('The road house has closed the line already.');
    state.reported = true; state.revision++;
    return { ok: true, bounty: OGRE_BOUNTY, reason: '' };
  }

  function snapshot() { return { ...state }; }
  function restore(data) {
    if (!validateOgreSnapshot(data, { allowMissing: false })) { state = emptyState(); return false; }
    state = { ...emptyState(), ...data };
    return true;
  }

  return { get state() { return { ...state }; }, view, meet, pay, decline, challenge, endEncounter, winEncounter, report, snapshot, restore };
}

// ---------------------------------------------------------------------------
// What he says
// ---------------------------------------------------------------------------
const GREETING = Object.freeze({
  first: Object.freeze([
    'Stop there. This is a toll road and I am the toll.',
    'Three copper. Three copper for a man on foot, three copper for a mule, six for a cart, and it has not gone up in my lifetime, which is longer than the Empire can say about anything.',
  ]),
  again: Object.freeze(['You again. Three copper. I do not keep accounts on credit — well. I keep one.']),
  declined: Object.freeze([
    'You. Yes. You are on the tally.',
    'It is not a threat. It is a tally. I like knowing the number.',
  ]),
  beaten: Object.freeze([
    'The road-taker. Sit down if you like. The stone is warm on that end.',
    'I am not asking you for anything. I am not asking anybody for anything. It turns out that is restful and I did not know.',
  ]),
});

const TOPICS = Object.freeze({
  'ogre-who-pays': Object.freeze({
    label: 'Who put you on this road?',
    lines: Object.freeze([
      'Nobody put me here. I put me here. That is the whole difference between me and a gate.',
      'The road house at Ostel pays for its carts four times a year and enters it in the book. I have seen the line. It says *the stone-keeper’s due*.',
      'They wrote me down. In a book. With the mule feed and the roof lime.',
    ]),
  }),
  'ogre-judgement': Object.freeze({
    label: 'Has anyone tried to make you stop?',
    lines: Object.freeze([
      'A woman came up from Ostel with a paper. She stood where you are standing and she read it out to me, all of it, and she did not hurry.',
      'It said I was to cease taking toll upon the road, by judgement of the water court of the Tarvel, at the instance of the pass families. Then she asked whether I wanted to keep the paper.',
      'It is under the stone. Nobody had ever given me anything in writing before.',
    ]),
  }),
  'ogre-amodians': Object.freeze({
    label: 'What do you make of Amodians?',
    lines: Object.freeze([
      'They are the only people I have met who did not scream. The first one stood there and asked what my terms were. I did not have terms. I had to think of some, on the spot, with him watching.',
      'They mend things. I respect that. I have mended this stone twice — the frost gets under the east side and lifts it.',
      'And they do not lie to you about water. If an Amod man says a channel can be trusted overnight, you can sleep by it.',
    ]),
  }),
  'ogre-pueth': Object.freeze({
    label: 'You watch the road out of Pueth. What is Pueth to you?',
    lines: Object.freeze([
      'Wet. Cold. A birch every place a chestnut ought to be.',
      'They send men down it in red and the men look at me and keep walking, which is correct, and I let them, which is also correct.',
      'A Pueth man argues about the toll. An Amod man asks for a receipt. I cannot write. We have agreed to be sad about it together.',
    ]),
  }),
  'ogre-tally': Object.freeze({
    label: 'How many have tried to take the road from you?',
    lines: Object.freeze([
      'Twenty-six. I count. Counting is important; it is the only part of the job I chose.',
      'Nineteen ran, which does not shame anybody. Six I put down, and all six got up afterwards, because I do not finish people who have stopped.',
      'One did not get up. That was a long time ago. He had a good sword and no sense and he would not stop, and I think about it more than I would like to.',
    ]),
  }),
});

/** Everything he can be asked, for the tests and for the host's choice list. */
export const OGRE_TOPIC_IDS = Object.freeze(Object.keys(TOPICS));
export const ogreTopicLines = id => [...(TOPICS[id]?.lines ?? [])];
export const ogreTopicLabel = id => TOPICS[id]?.label ?? '';
/** How he opens: the first time, the fifth time, after a walk-past, after a loss. */
export const ogreGreeting = kind => [...(GREETING[kind] ?? GREETING.first)];

/** The one dangerous choice, its warning, and the second time of asking. */
export const OGRE_CHALLENGE = Object.freeze({
  id: 'ogre-challenge',
  label: 'Take the road from him. (He is three times your size. This will very probably kill you.)',
  confirmLabel: 'Say it again, and mean it.',
  declineLabel: 'No. I misspoke.',
  warning: Object.freeze([
    'He does not get up at once. He looks at you for a while, the way a man looks at a wall that has moved.',
    'Say it again, and mean it, because I do not stop when you change your mind. That is not cruelty. I am slow, and by the time I have understood you have changed it, it is done.',
  ]),
  opening: Object.freeze([
    'Then put your feet where you want them.',
    'I am slow. That is the only help you get, and it is more than most of them took.',
  ]),
  withdrawn: Object.freeze(['Good. Sit down a moment if your legs have gone. It happens. It is not a thing to be ashamed of.']),
});

export const OGRE_VICTORY = Object.freeze([
  'Enough. Enough — put it down.',
  'Sit. No. I will sit. There.',
  'The road is yours, if a road can be anybody’s. Tell the road house at Ostel; they will want to stop paying, and they will want it in the book, and they are right to.',
  'Tell the court too. They will write it down. Somebody should write down that it ended, since somebody wrote down that it should.',
]);

export const OGRE_RETURNED = Object.freeze([
  'You got up. Good. Most of them get up.',
  'Take your time. The road is not going anywhere and neither, it turns out, am I.',
]);

/** Where he stands and what he sits on, for the scenery and the chart. */
export const OGRE_SITE = Object.freeze({ stand: OGRE_STAND, stone: TOLL_STONE });
