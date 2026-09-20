/**
 * The burying at the Lauvel: helping the valley bury its dead, and what that turns up.
 *
 * The scene is already there (src/lauvel-aftermath.js): two bearers carrying the dead in one
 * at a time, Old Hewe digging, seven in their shrouds beside the graves, a widow sitting on
 * the ground, the shrine keeper singing them down with their names. A traveler could walk
 * past it at thirteen metres and never stop. Now Sela calls out as they pass, because she
 * calls out to everybody who comes up that road, and has for ten days.
 *
 * What she asks is whether you saw a young man in a green coat.
 *
 * Her position when you meet her is fixed and she is sure of it: she has looked at every face
 * in the row and every face on the field, he is not in it, so he is somewhere else, so he is
 * alive. She is right about the row. What she cannot do is look at the ones the field has not
 * given up yet, and the field keeps giving them up — nine yesterday, twelve the day before.
 *
 * So the work is the story. There are three jobs and the valley is short-handed for all of
 * them: a turn on the spade so Hewe can straighten his back, the other end of the hurdle, and
 * the shrine's list of names so the ground knows who it is being given. Take the hurdle and on
 * the fourth trip out you bring in a man in a green coat, and his left hand is missing two
 * fingers, which a reaping hook took when he was twelve.
 *
 * Then you have to go and tell her. That is the quest. There is no reward and nothing is
 * carried away: what changes is that a grave at the Lauvel has a name on the board afterward,
 * and it stays there for the rest of the game.
 *
 * Pure: no DOM, no three.
 */
import { fieldPoint } from './lauvel-aftermath.js';

const freeze = Object.freeze;

/** Her son, and the two things she can tell you to know him by. */
export const SON = freeze({
  name: 'Bevan', age: 19,
  coat: 'a green coat, cut down from his aunt’s, too big in the shoulder and taken in with a band of the same cloth',
  hand: 'two fingers gone off the left hand, which a reaping hook took when he was twelve',
});

/** Where she is close enough to the road to call out to somebody on it. */
export const HAIL_FROM = freeze({ ...fieldPoint(4.2, 21.9), reach: 34 });

/** The three jobs, each a different kind of work, each with somebody short-handed for it. */
export const JOBS = freeze({
  spade: freeze({ id: 'spade', who: 'lauvel-digger', name: 'A turn on the spade',
    ask: 'Old Hewe is forty years a gravedigger and is digging a row a day. He will not ask, and he will not refuse.' }),
  hurdle: freeze({ id: 'hurdle', who: 'lauvel-bearer-front', name: 'The other end of the hurdle',
    ask: 'Dorran and Corlan carry them in one at a time, all day, and the field keeps giving them up.' }),
  names: freeze({ id: 'names', who: 'lauvel-keeper', name: 'The shrine’s list',
    ask: 'Maudry sings them down with their names, and somebody has to find out what the names are.' }),
});
export const JOB_IDS = freeze(Object.keys(JOBS));

export const BURYING_VERSION = 1;
/**
 * 'unknown' (not seen); 'hailed' (she has called out); 'asked' (she has asked about her son);
 * 'helping' (the traveler has taken work); 'found' (the green coat has come in off the field);
 * 'told' (she knows); 'done' (he is in the ground with his name on the board).
 */
export const BURYING_STAGES = freeze(['unknown', 'hailed', 'asked', 'helping', 'found', 'told', 'done']);

export function validateBuryingSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== BURYING_VERSION) return false;
  if (!BURYING_STAGES.includes(data.stage)) return false;
  if (!Array.isArray(data.done) || data.done.length > JOB_IDS.length) return false;
  if (!data.done.every(id => JOB_IDS.includes(id)) || new Set(data.done).size !== data.done.length) return false;
  return Number.isInteger(data.carried) && data.carried >= 0 && data.carried <= 1e6;
}

export function createBurying({ onEvent = () => {} } = {}) {
  const state = { stage: 'unknown', done: new Set(), carried: 0 };
  const at = (...stages) => stages.includes(state.stage);

  /** She calls out to everybody who comes up that road, and has for ten days. */
  function hail() {
    if (!at('unknown')) return { ok: false };
    state.stage = 'hailed';
    onEvent({ type: 'sela-hailed' });
    return { ok: true };
  }
  /** What she asks, and the two marks she gives you to know him by. */
  function ask() {
    if (!at('unknown', 'hailed')) return { ok: false };
    state.stage = 'asked';
    onEvent({ type: 'son-described' });
    return { ok: true, son: SON };
  }
  /** Taking work. Any of the three; the valley is short-handed for all of them. */
  function start() {
    if (!at('asked')) return { ok: false };
    state.stage = 'helping';
    onEvent({ type: 'burying-begun' });
    return { ok: true };
  }
  /**
   * A turn at one of the jobs. The hurdle is the one that matters: the fourth man you carry in
   * off the field is wearing a green coat, and you check his left hand before you say anything.
   */
  function work(id) {
    const job = JOBS[id];
    if (!job) return { ok: false, reason: 'Nobody here is doing that.' };
    if (!at('helping', 'found', 'told', 'done')) return { ok: false, reason: 'Nobody has asked you for anything yet.' };
    const first = !state.done.has(id);
    state.done.add(id);
    if (id === 'hurdle') state.carried++;
    // He comes in on the fourth trip, and only once, and only while she still believes he is elsewhere.
    const foundNow = id === 'hurdle' && state.carried >= 4 && at('helping');
    if (foundNow) state.stage = 'found';
    onEvent({ type: 'job-worked', id, first, found: foundNow });
    return { ok: true, first, job, carried: state.carried, found: foundNow,
      trips: id === 'hurdle' ? Math.max(0, 4 - state.carried) : 0 };
  }
  /** Going back across the field to tell her. */
  function tell() {
    if (!at('found')) return { ok: false };
    state.stage = 'told';
    onEvent({ type: 'sela-told' });
    return { ok: true };
  }
  /** Carrying him to the row, and the board cut with his name. */
  function finish() {
    if (!at('told')) return { ok: false };
    state.stage = 'done';
    onEvent({ type: 'bevan-buried' });
    return { ok: true };
  }

  function task() {
    if (at('hailed')) return { title: 'A woman on the field', detail: 'She called to you from the burial ground at the Lauvel, and she is asking everybody who comes up that road the same question.' };
    if (at('asked')) return { title: 'The burying at the Lauvel', detail: 'Sela is looking for her son: a green coat, and two fingers gone off the left hand. The valley is short-handed at every part of burying its dead.' };
    if (at('helping')) return { title: 'The burying at the Lauvel', detail: `Work at the Lauvel: a turn on Old Hewe's spade, the other end of Dorran's hurdle, or Maudry's list of names. ${state.carried ? `${state.carried} carried in off the field so far.` : 'The field keeps giving them up.'}` };
    if (at('found')) return { title: 'The burying at the Lauvel', detail: 'The man you have just carried in is wearing a green coat, and his left hand is missing two fingers. Sela is forty paces away, kneeling at the end of the row.' };
    if (at('told')) return { title: 'The burying at the Lauvel', detail: 'She asked you to help carry him. Maudry will sing his name and Old Hewe will cut the board.' };
    return null;
  }

  const snapshot = () => ({ version: BURYING_VERSION, stage: state.stage, done: JOB_IDS.filter(id => state.done.has(id)), carried: state.carried });
  function restore(data) {
    state.stage = 'unknown'; state.done = new Set(); state.carried = 0;
    if (!validateBuryingSnapshot(data, { allowMissing: false })) return false;
    state.stage = data.stage; state.done = new Set(data.done); state.carried = data.carried;
    return true;
  }

  return { hail, ask, start, work, tell, finish, task, snapshot, restore,
    get stage() { return state.stage; }, get carried() { return state.carried; },
    get helping() { return at('helping', 'found', 'told', 'done'); },
    get found() { return at('found', 'told', 'done'); },
    get buried() { return at('done'); },
    hasWorked: id => state.done.has(id) };
}

// ---------------------------------------------------------------------------
// What is said
// ---------------------------------------------------------------------------

/** She calls across the field. She has called to everybody who has come up that road for ten days. */
export const HAIL = freeze([
  'A woman kneeling at the end of the shroud row gets up when she sees you on the road, and comes two steps, and stops, because she has learned not to run at people.',
  '"You! On the road — did you come up from the crossing?"',
]);

/** The question, and what she can give you to know him by. */
export const THE_QUESTION = freeze([
  '"Did you see a young man in a green coat? On the road, in a barn, walking anywhere at all. Nineteen. Thin through the face."',
  '"The coat is the thing. It is green, and it was his aunt’s, and it is too big in the shoulder, and it has a band of the same cloth let into the back where she took it in. You would not mistake it for a soldier’s."',
  '"And his left hand is short two fingers. A reaping hook, when he was twelve, and he was ashamed of it for a year and then he was not." She holds up her own hand and folds two fingers down without noticing she has done it.',
  '"I have looked at every face in that row and every face on that field. He is not in it. So he is somewhere else. So he is alive, and somebody has seen him, and it might be you."',
]);

/** When the traveler has nothing to give her, which is everybody, every day, for ten days. */
export const NOTHING_SEEN = freeze([
  '"No." She says it before you finish. "No, of course. I ask everybody. Ilva says I should stop."',
  '"Stay on the road if you are going on. The field is not a thing to walk over."',
]);

/** The valley is short-handed at every part of it, and does not ask. */
export const OFFER_HELP = freeze([
  'She looks at you a moment longer than is comfortable, and then at the row, and then at the two men coming up off the field with a hurdle between them.',
  '"If you are stopping. There is more of this than there are people to do it, and nobody will ask you, because asking is a thing you do to people who owe you something."',
  '"Hewe is seventy-one and has dug six today. Dorran and Corlan have carried since first light and the field is not half cleared. Maudry has a list with nine blanks in it, and a blank is a man nobody will ever come looking for."',
]);

/** What each job is like, the first time. */
export const JOB_FIRST = freeze({
  spade: freeze([
    'Old Hewe gives up the spade the way a man gives up an argument: slowly, and without admitting anything.',
    '"Straight down at the sides. Do not slope them. A sloping grave looks like a hole and a straight one looks like a room." He sits on the heap and watches you get it wrong and does not say so.',
    'It takes an hour and your hands are wrecked and the grave is half the depth of one of his. He looks into it and says, "That will do for a small one," and goes to find the next place.',
  ]),
  hurdle: freeze([
    'Dorran shows you where to hold the hurdle and how to stand up with it, which is with your legs, and how to walk with it, which is slowly and never in step with the other man, because in step makes it sway.',
    'The first one is a big man with grey in his beard and the weight is not the worst part. The worst part is that you can feel where his arm is against the boards.',
    '"You are the Empire’s, I would guess," says Corlan, at the far end, not unkindly. "Well. This end of it is the same work whoever is on it."',
  ]),
  names: freeze([
    'Maudry’s list is a board with a sheet pinned on it, and nine blanks. What goes in a blank comes off the man: a stamped buckle, a letter, a name inked in a collar, a ring with something cut inside it.',
    'You go along the row with her and she lifts each shroud at the head and does not flinch, and you write what she says. "Anwen’s boy, by the buckle. That is one." Three of the nine get names before the light goes.',
    '"The ground should know who it is being given," she says, pinning the sheet back. "It is not for us. It is for the ground."',
  ]),
});

/** Going back to a job you have already done. */
export const JOB_AGAIN = freeze({
  spade: 'You take another turn on the spade. Hewe stands at the end of it with his arms folded, and once says, "Better," and does not enlarge on it.',
  hurdle: 'Out to the field, lift, back to the row, lay down. Out again. The two of them have stopped explaining anything to you, which is how they say you are useful.',
  names: 'Another blank goes off the list. Maudry says the name out loud once when it is written, the way you would say it to somebody in the next room.',
});

/** The fourth trip out with the hurdle. */
export const THE_GREEN_COAT = freeze([
  'The fourth one is out at the far hedge where the grass is long, and you have him half onto the hurdle before you see the colour of what he is wearing.',
  'It is green. It is too big in the shoulder. There is a band of the same cloth let into the back, where somebody took it in.',
  'Dorran has gone very still at the other end. You do not have to say anything, and neither does he, and the two of you turn the left hand over together.',
  'Two fingers gone, old and healed, off a hand that never grew the rest of the way into the coat.',
  '"Forty paces," says Dorran, eventually, and does not look up the field to where she is kneeling. "She is forty paces away and she has been forty paces away for ten days."',
]);

/** Telling her, which is the quest. */
export const TELLING = freeze([
  'She watches you come the whole way. She knows before you are halfway; you can see the moment she knows, and she keeps standing.',
  '"Where." Not a question. You tell her: the far hedge, in the long grass, where the field has not been walked yet.',
  'She says, "He went that way because the hedge is the way home," and then nothing for a while.',
  '"Ten days I have been asking people on that road. And he was in the grass the whole time, four hundred paces from me, and I asked a hundred people and not one of them could have told me." She wipes her face with the back of her wrist, once, and is done with that. "Come on. I am not having him carried by strangers."',
]);

/** The last of it. */
export const THE_BURYING = freeze([
  'You take the front of the hurdle and she takes the back, which is the heavier end, and Dorran does not argue with her about it.',
  'Maudry sings him down with the others in the slow valley way, and his name is in the middle of the line of names, and the line does not stop for him, which is right.',
  'Old Hewe cuts the board himself, standing, with a knife he keeps sharp for it. BEVAN. And under it, because she asks for it: OF THIS VALLEY.',
  'Afterward she stands with her hands at her sides and looks at the board for a long time. "You can go on now," she says. "Thank you for asking me what he was called."',
]);

/** Afterward, if you come back that way. */
export const AFTER = freeze([
  '"I am still here. Somebody has to be, until the field is finished, and then I suppose I will find out what I do next."',
  '"There is a grave with his name on it. You would not think that would be worth anything. It is worth everything; I have watched nine go in with a blank board and I know exactly what it is worth."',
  '"Go carefully on that road. Somebody is asking after you, somewhere, whether you know it or not."',
]);

/**
 * Sela's conversation, by stage. `act('lauvel-*')` runs the state changes in the host.
 * `visits` rotates what she says when there is nothing left to say.
 */
export function selaConversation(npc, context) {
  const { burying, openDialogue, closeDialogue, act, visits = 0 } = context;
  if (npc?.id !== 'lauvel-seeker') return false;
  const again = () => selaConversation(npc, { ...context, visits: visits + 1 });
  const leave = { id: 'leave-sela', label: 'Leave her to it.', action: closeDialogue };

  if (burying.stage === 'unknown' || burying.stage === 'hailed') {
    burying.ask();
    openDialogue(npc, [...THE_QUESTION], null, 'Back to the field', { choices: [
      { id: 'sela-not-seen', label: 'I have not seen him.', action: () => openDialogue(npc, [...NOTHING_SEEN, ...OFFER_HELP], null, 'Back to the field',
        { choices: [
          { id: 'sela-help', label: 'Tell me what needs doing.', action: () => { closeDialogue(); act('lauvel-help'); } },
          { id: 'sela-go-on', label: 'Say nothing, and go on up the road.', action: closeDialogue },
        ] }) },
      leave,
    ] });
    return true;
  }
  if (burying.stage === 'asked') {
    openDialogue(npc, ['"You are still here."'], null, 'Back to the field', { choices: [
      { id: 'sela-help', label: 'What needs doing?', action: () => { closeDialogue(); act('lauvel-help'); } },
      leave,
    ] });
    return true;
  }
  if (burying.stage === 'helping') {
    openDialogue(npc, [`"${['Anything?', 'No. I would know by your face.', 'They are getting through the field faster with you on it. I do not know whether I want them to.'][visits % 3]}"`],
      null, 'Back to the work', { choices: [leave] });
    return true;
  }
  if (burying.stage === 'found') {
    openDialogue(npc, [...TELLING], null, 'Help her carry him', { choices: [
      { id: 'sela-tell', label: 'Take the front of the hurdle.', action: () => { closeDialogue(); act('lauvel-tell'); } },
    ] });
    return true;
  }
  if (burying.stage === 'told') {
    openDialogue(npc, ['She is waiting at the hurdle with her hands already on it.'], null, 'Carry him', { choices: [
      { id: 'sela-bury', label: 'Lift.', action: () => { closeDialogue(); act('lauvel-bury'); } },
    ] });
    return true;
  }
  openDialogue(npc, [AFTER[visits % AFTER.length]], null, 'Back to the road', { choices: [leave] });
  return true;
}

/**
 * The three people with work: Old Hewe, Dorran and Maudry. Each offers their own job once the
 * traveler has taken the work on, and says their own piece otherwise (src/lauvel-aftermath.js).
 */
export function workerChoice(npcId, burying, act) {
  const job = Object.values(JOBS).find(entry => entry.who === npcId);
  if (!job || !burying.helping) return null;
  return { id: `lauvel-work-${job.id}`,
    label: burying.hasWorked(job.id) ? `${job.name}, again.` : job.name,
    action: () => act(`lauvel-work-${job.id}`) };
}
