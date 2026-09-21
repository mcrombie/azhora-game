/**
 * The army on the plain: the third chapter of the main quest. The traveler
 * reports at the camp gate on the Moros Plain, signs the Marshal's muster with
 * whichever of the eleven hired swords have arrived, and draws the horse the
 * army owes for the rolls carried out of the Lauvel. Pure: no DOM, no three.
 */
export const MOROS_VERSION = 1;
export const MOROS_CHAPTER_ID = 'moros-camp';
export const MOROS_PAY = 25;
export const MOROS_HORSE_TOKEN = 'horse-token';
export const MOROS_GATE_ID = 'post-camp-gate-north';
export const MOROS_LEGATE_ID = 'post-camp-legate';

import { toWorld } from './world-scale.js';
import { MERCENARY_COMPANY_SIZE } from './mercenaries.js';
import { groundOfSighting } from './long-road.js';

/**
 * The horse line: where the token is spent. Authored metres, and the point is
 * `campPoint(-13.8, -25.1)` — 25 m *north* of the camp's centre and 45 m north
 * of the Marshal's tent, in among the north-west tent lines beside the water
 * trough and the hay (`OUTPOST_LAYOUT` in `src/outpost.js`). Everything that
 * sends a traveler there has to say north-west, not south.
 */
export const MOROS_SITES = Object.freeze({
  'legion-horse-line': Object.freeze({ id: 'legion-horse-line', name: 'The army horse line', ...toWorld(-563, 323), prompt: 'Claim your army horse' }),
});
export const MOROS_SITE_ACTIONS = Object.freeze({ 'legion-horse-line': 'claim-legion-horse' });

const booleanFields = ['started', 'admitted', 'mustered', 'horseClaimed'];
const initial = () => ({ version: MOROS_VERSION, revision: 0, started: false, admitted: false, mustered: false, horseClaimed: false });
const fail = reason => ({ ok: false, reason });
const action = (id, label, objectiveId, reason = '') => ({ id, label, objectiveId, enabled: !reason, reason });

/** Reject inconsistent saves atomically; a missing section belongs to a save from before this chapter. */
export function validateMorosSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== MOROS_VERSION
    || Object.keys(data).some(key => key !== 'version' && key !== 'revision' && !booleanFields.includes(key))
    || !Number.isSafeInteger(data.revision) || data.revision < 0
    || booleanFields.some(key => typeof data[key] !== 'boolean')) return false;
  for (let i = 1; i < booleanFields.length; i++) if (data[booleanFields[i]] && !data[booleanFields[i - 1]]) return false;
  return data.revision === booleanFields.reduce((count, key) => count + Number(data[key]), 0);
}

export function createMorosChapter({ inventory, hasHorse = () => false, onEvent = () => {} } = {}) {
  let state = initial();
  const snapshot = () => ({ ...state });

  function stage() {
    if (!state.started) return 'not-started';
    if (!state.admitted) return 'report-at-gate';
    if (!state.mustered) return 'report-to-legate';
    if (!state.horseClaimed) return 'claim-horse';
    return 'complete';
  }

  function view() {
    const current = stage();
    const views = {
      'not-started': [0, 'Out to the Moros', 'The army’s camp lies south-west of Lumber Town, past the Moros gate, out on the open plain.', 'MOROS PLAIN · THE ARMY ON THE PLAIN', []],
      'report-at-gate': [1, 'Name and contract', 'Follow the road south-west out of Lumber Town through the Moros gate and on across the plain. Report to the sentry at the camp’s gate; the army is expecting its hired swords.', 'MOROS PLAIN · 1 / 3 · THE ARMY ON THE PLAIN', [MOROS_GATE_ID]],
      'report-to-legate': [2, 'The Marshal’s muster', 'Marshal Hadric Venmor keeps the muster at the command tent beyond the tent lines. Sign it, and draw your first wage.', 'MOROS PLAIN · 2 / 3 · THE ARMY ON THE PLAIN', [MOROS_LEGATE_ID]],
      // A traveler who rode in pickets the horse they came on; one who walked the whole way with Iven's token still draws a horse here.
      'claim-horse': hasHorse()
        ? [3, 'A place on the line', 'Picket your horse on the army’s line at the north-west end of the camp, by the water trough and the hay, and draw its fodder. The quartermaster counts horses as carefully as men.', 'MOROS PLAIN · 3 / 3 · THE ARMY ON THE PLAIN', ['legion-horse-line']]
        : [3, 'What the army owes', 'Take Iven’s token to the horse line at the north-west end of the camp, by the water trough and the hay, and claim the horse the army owes you.', 'MOROS PLAIN · 3 / 3 · THE ARMY ON THE PLAIN', ['legion-horse-line']],
      complete: [4, 'One of eleven', 'You are on the Marshal’s muster with a horse on the line. When the company is full he will send an envoy to Solis in West Suval under a flag of truce.', 'MOROS PLAIN · CHAPTER COMPLETE', []],
    };
    const [step, title, detail, kicker, destinations] = views[current];
    return { chapterId: MOROS_CHAPTER_ID, regionName: 'Moros Plain', questTitle: 'The army on the plain', stage: current, step, steps: 3,
      title, detail, kicker, active: state.started && !state.horseClaimed, complete: state.horseClaimed,
      objectiveId: destinations[0] ?? null, destinationIds: [...destinations] };
  }

  function availableActions() {
    switch (stage()) {
      case 'report-at-gate': return [action('admit-to-camp', 'Show Iven’s receipt and the horse token', MOROS_GATE_ID)];
      case 'report-to-legate': return [action('join-muster', `Sign the muster · take ${MOROS_PAY} copper`, MOROS_LEGATE_ID)];
      case 'claim-horse': return [hasHorse() ? action('claim-legion-horse', 'Picket your horse and draw its fodder', 'legion-horse-line')
        : action('claim-legion-horse', 'Hand over the token and take your horse', 'legion-horse-line',
          inventory?.has?.(MOROS_HORSE_TOKEN) ? '' : 'You need the army’s horse token from Iven in Lumber Town.')];
      default: return [];
    }
  }

  function emit(actionId, detail = {}) {
    state.revision++;
    const event = { type: 'moros-progress', sequence: state.revision, actionId, chapterId: MOROS_CHAPTER_ID, stage: view().stage, ...detail };
    onEvent(event);
    return { ok: true, reason: '', ...event };
  }

  /** The host opens the chapter once the Lauvel is settled and the campaign has reached the Moros camp. */
  function start() {
    if (state.started) return fail('The army’s camp is already your chapter.');
    state.started = true;
    return emit('start-chapter');
  }

  function act(actionId) {
    const choice = availableActions().find(candidate => candidate.id === actionId);
    if (!choice) return fail(state.horseClaimed ? 'You are on the muster. The road to Solis is the next chapter.'
      : !state.started ? 'Settle the field at the Lauvel before the Moros camp is your business.' : `Your current task: ${view().detail}`);
    if (!choice.enabled) return fail(choice.reason);
    let reward = null;
    if (actionId === 'admit-to-camp') state.admitted = true;
    else if (actionId === 'join-muster') {
      if (!inventory?.add?.('copper-piece', MOROS_PAY)) return fail('The Marshal’s clerk could not pay you. Make room in your satchel and speak again.');
      state.mustered = true; reward = { id: 'copper-piece', quantity: MOROS_PAY };
    } else if (actionId === 'claim-legion-horse') {
      if (hasHorse()) state.horseClaimed = true;
      else {
        if (!inventory?.remove?.(MOROS_HORSE_TOKEN, 1)) return fail('You need the army’s horse token from Iven in Lumber Town.');
        state.horseClaimed = true; reward = { id: 'legion-horse', quantity: 1 };
      }
    }
    return emit(actionId, { objectiveId: choice.objectiveId, reward });
  }

  function restore(data) {
    if (!validateMorosSnapshot(data, { allowMissing: false })) return false;
    state = { version: MOROS_VERSION, revision: data.revision, ...Object.fromEntries(booleanFields.map(key => [key, data[key]])) };
    return true;
  }

  return { start, act, view, availableActions, snapshot, restore,
    get state() { return { ...snapshot(), stage: stage(), active: state.started && !state.horseClaimed, complete: state.horseClaimed }; } };
}


/* ------------------------------------------------------------------ *
 * The muster's two faces
 * ------------------------------------------------------------------ */

/**
 * The camp looks different depending on when you walk into it, and it is the same camp.
 *
 * **First in** — one or two of the eleven standing — the mercenaries' ground behind the standard
 * is eleven pegs and nobody on them, and Venmor has work for early men. Nobody else in the game
 * gets that, and it is what the short road has instead of a country it can read
 * (docs/drent-long-road.md \u00a79).
 *
 * **Last in** — all eleven — the ten are already drawn up in two files behind the standard, and
 * when you come through the gate they turn. Each of them has one line for you, and the line is
 * made from where you were standing when he walked past you on the road: ten templates and a
 * phrase per stop, not a hundred written lines (`seenAt` in src/long-road.js).
 */
const freeze = Object.freeze;

/** Where you were, in one clause, for a man who saw you there. One per spine stop. */
export const MUSTER_PLACES = freeze({
  'pier-chart': 'still on the pier, with a chart in your hands',
  'village-corners': 'walking the corners of a village you had already walked through',
  'the-fork': 'at the Watch, reading a letter you had been carrying all morning',
  'bird-garden': 'in a garden, looking at a bird',
  'lysa-acorns': 'picking things up off the floor of a wood for a cook',
  'bran-rod': 'up to your knees in a pond',
  'willowmere-fire': 'crouched over a fire with a fish on it',
  'bowden-axe': 'hitting a tree, repeatedly, with a great deal of conviction',
  'odger-fernway': 'at the bench at Fernway, holding a mushroom up to the light',
  'fernway-play': 'watching a play in a language you did not have',
  'corvan-register': 'at the quartermaster\u2019s table, signing something',
  'rena-dig': 'in the grass at Rena with a peg in your hand',
  'enna-rows': 'standing over a row of barley as though it might do something',
  'nell-hedge': 'in a hedge. In it. Not beside it',
  'silas-stream': 'squatting in a stream, turning a stone over',
  'hollis-bridge': 'on the bridge, listening to a man you could not follow',
});
const PLACE_UNKNOWN = 'somewhere back down that road';
/**
 * A man who passed the traveler between stops saw a road and not a lesson, and says so. The
 * ground is the chart's own name for where they were both standing (src/map-fog.js), which is
 * the most he can honestly claim: he did not see what the traveler was doing there.
 */
const onTheRoad = ground => `on the road through ${ground.name}, going the other way`;

/** What each of them says, once, when the eleventh walks in. `%s` is where you were. */
export const MUSTER_GREETINGS = freeze({
  'merc-gotwood': 'That\u2019s eleven. I told them you would come the long way and I was right, and I intend to keep being right about you.',
  'merc-cromb': 'Eleven. You took your time and you came in knowing things, which is not the usual trade.',
  'merc-word': 'Last I saw you, you were %s. I remember thinking: there is a person who is not in a hurry. I approve enormously.',
  'merc-jerry': 'We passed you. You were %s. I said you would be last and nobody took the bet, which is the only thing I regret.',
  'merc-christin': 'You were %s when we went by. Good. Somebody in this company should know the country we are standing on the edge of.',
  'merc-ciaran': 'I saw you %s. I nearly stopped. Together is warmer, and I have been arguing with myself about it since.',
  'merc-lakota': 'You were %s, and you did not see me at all, which is the correct way to be looked at. I watched you for a while.',
  'merc-eliana': 'You were %s. I walked past and thought, that one is either lost or learning. I see now which.',
  'merc-matt': 'We overtook you. You were %s. Four hundred people expect me back and not one of them has ever done that.',
  'merc-altun': 'I saw you %s. Everybody looks at the robe. Nobody looks at the ground. You were looking at the ground.',
  'merc-mus': 'I did not pass you on the road, because I was not on it. But I know where you were: %s. I have been here a while.',
});

/** A man who comes in after the traveler, which on the short road is nine of them. */
export const MUSTER_AFTER = freeze({
  'merc-gotwood': 'You beat me here, and I came off the same boat. I will not hear the end of that.',
  'merc-cromb': 'You were already here. Of course you were.',
  'merc-word': 'You are ALREADY here? I swam. I want that written in the book beside my name.',
  'merc-jerry': 'Here before us. Kristen owes me nothing and is somehow still pleased.',
  'merc-christin': 'You again, and standing still this time. Good.',
  'merc-ciaran': 'Alone is quicker. You have settled the argument and I am not grateful.',
  'merc-lakota': 'You got here first. There was a bird on the mast for two days; I am not sorry.',
  'merc-eliana': 'First in, and waiting. I would have come sooner, but the boat I wanted was not the boat that was leaving.',
  'merc-matt': 'You were here before a prince. The histories will find that very funny.',
  'merc-altun': 'Early. Hm. I will tell you what the robe is for when there is a reason to, and being early is not one.',
  'merc-mus': 'You came by the road, then. I did not. I have been here a while.',
});

/** Eleven of eleven: the company is in, which is the only count that ends the waiting. */
export const MUSTER_FULL = MERCENARY_COMPANY_SIZE;
/** One or two standing: the pegs are empty and the Marshal has work for early men. */
export const MUSTER_EARLY = 2;

const COUNT_WORDS = freeze(['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven']);

/**
 * What the Marshal and the company say when the traveler reports, given how many are standing
 * and where each of them last saw him.
 *
 * `seenAt` is `{ mercenaryId: stopId }` from `src/long-road.js`; a man who never went past the
 * traveler has no clause, and gets the one for a road he cannot place him on.
 */
export function musterVoices({ musterCount = 1, seenAt = {}, roster = [] } = {}) {
  const count = Math.max(1, Math.min(MUSTER_FULL, Math.round(Number(musterCount) || 1)));
  const place = id => {
    const where = seenAt?.[id];
    const ground = groundOfSighting(where);
    return MUSTER_PLACES[where] ?? (ground ? onTheRoad(ground) : PLACE_UNKNOWN);
  };
  const greeting = id => (MUSTER_GREETINGS[id] ?? '').replace('%s', place(id));
  const early = count <= MUSTER_EARLY;
  const full = count >= MUSTER_FULL;
  const turn = full
    ? ['The ten are drawn up in two files behind the standard, and when you come through the gate they turn and look at you.']
    : early
      ? ['The mercenaries\u2019 ground behind the standard has eleven pegs banged into it and nobody on them. A quartermaster\u2019s boy is counting them again in case he got it wrong the first time.']
      : [];
  const marshal = full
    ? `That is eleven, and eleven is what I was promised. Hadric Venmor, Marshal. You are the last of them in and the whole camp knows it, because the whole camp has been waiting on you.`
    : early
      ? `${COUNT_WORDS[count]} ${count === 1 ? 'stands' : 'stand'} in this camp, counting you, and the rest are somewhere on a road. Hadric Venmor, Marshal. I have work for early men, and I remember which ones they were.`
      : `By the gate\u2019s count, ${COUNT_WORDS[count]} stand in this camp, counting you.`;
  const company = full ? (roster.length ? roster : Object.keys(MUSTER_GREETINGS)).map(id => ({ id, line: greeting(id) })).filter(entry => entry.line) : [];
  return { count, early, full, turn, marshal, company };
}

/** What a man says when he walks into a camp the traveler is already standing in. */
export const musterArrivalLine = id => MUSTER_AFTER[id] ?? 'You were here first. I am told that happens.';

/**
 * The gate sentry and the Marshal speak for the chapter while it is theirs; otherwise the
 * host falls back to their ordinary lines. `musterCount` is how many of the company stand in camp:
 * `MERCENARY_COMPANY_SIZE` is eleven, the ten hired swords of the roster and the traveler.
 */
export function morosConversation(npc, context) {
  const { moros, openDialogue, closeDialogue, act, musterCount = 1, seenAt = {}, roster = [] } = context;
  const current = moros.view().stage;
  const choose = id => { const option = moros.availableActions().find(item => item.id === id); return option ? [{ ...option, action: () => { closeDialogue(); act(id); } }] : []; };
  const leave = { id: 'leave-moros', label: 'Understood.', action: closeDialogue };
  if (npc.id === MOROS_GATE_ID && current === 'report-at-gate') {
    openDialogue(npc, [
      'Halt. Name and contract.',
      'A hired sword off the Tidehaven boats, with a relay clerk’s receipt and a horse token. You are expected. The Marshal is at the command tent, past the tent lines, under the red standard. He sees hired men at once when they carry rolls from the Lauvel.',
    ], null, 'Back to the road', { choices: [...choose('admit-to-camp'), leave] });
    return true;
  }
  if (npc.id === MOROS_LEGATE_ID && current === 'report-to-legate') {
    const heard = musterVoices({ musterCount, seenAt, roster });
    openDialogue(npc, [
      ...heard.turn,
      `So you are the one who brought the muster rolls out of the Lauvel. The Empire promised me eleven hired swords. ${heard.marshal}`,
      ...heard.company.map(entry => entry.line),
      'The Coalition holds Solis in West Suval: Izoli ships, Suvali hill-men, our own rebels, and a handful each from Pyros, Selemis, Marosh and the southern islands. They want the border stockade south-east of here, and they will come for it when they think we are thin.',
      'When the muster is full I will send an envoy to Solis under a flag of truce, to count their spears before they count ours. It may be you. Until then: sign the muster, draw your first wage, and take your horse from the line at the north-west end of the camp.',
    ], null, 'Back to the camp', { choices: [...choose('join-muster'), leave] });
    return true;
  }
  return false;
}
