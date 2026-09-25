/**
 * The blue trade: Batman's hunt, and the traveler's part in it.
 *
 * Katy at Vaervelm Caelazh starts the looking (src/katy.js). This is what the looking
 * finds. Batman is real, he is not a man in a costume, and he is already most of the
 * way through a case when the traveler walks into it.
 *
 * VELAETH is a perfume. It is made on the Suval coast out of a sea snail taken off the
 * same beds that give the Empire its purple dye, thousands of them to the bottle, and it
 * comes out the colour of the sea an hour after sunset: blue with the purple coming up
 * underneath. A drop behind the ear and an evening goes well. A season of it and the
 * colour is in the whites of your eyes and nothing else in the world smells of anything.
 * It is worth more by weight than anything else moving on this coast, which is why it
 * takes a fleet, a licence and a war to move it.
 *
 * The trade runs straight through the front. Quartermaster Edmund Rask signs the Empire's
 * dye-bed licences and writes the requisitions; Captain Nessa Trelith signs the Coalition's
 * night passes through the lines. Neither side can work the beds and move the goods alone,
 * and so, while their armies kill each other over Solis, the two of them are partners. The
 * carts go through the breach in Solis's east wall that nobody has repaired in three years:
 * no gate, no toll, no book.
 *
 * Batman has been taking couriers off that road for a year and it has changed nothing,
 * because he cannot walk into a town, stand in a market, or ask a question of anybody who
 * will not scream. That is what the traveler is for. He does the dark; the traveler does
 * the daylight.
 *
 * Three papers make the case, and each is already in somebody's hands: the stuff itself,
 * in a barrel that came back to the winery heavier than it left (Kat); an Empire
 * requisition used as packing paper in a crate of wine (Juan, at Tharganhom in Solis);
 * and a Coalition night pass, kept by the one trader on this coast who was offered the
 * work and said no (John, of the Sultana). Then the handover at the breach, and then
 * what to do with what you are holding, which is the only real decision in it.
 *
 * Pure: no DOM, no three. The beast himself is src/batman-model.js.
 */
import { solisPoint } from './region-world.js';

const freeze = Object.freeze;

export const BATMAN = freeze({ id: 'batman', name: 'Batman', role: 'Whatever he is' });

/** The substance. Sold openly as a perfume; that is not what it is bought for. */
export const VELAETH = freeze({
  id: 'velaeth', name: 'Velaeth', trade: 'Suval Evening',
  colour: 0x4b52a8,
  look: 'Thick as oil and slow to move, blue with the purple coming up under it, the way the sea goes an hour after the sun has gone.',
  smell: 'Rain landing on hot stone, and something underneath that you cannot name and would very much like to keep smelling.',
  cost: 'A drop behind the ear and the evening goes well and you are a little further away from yourself than usual. A season of it and the colour is in the whites of your eyes, and nothing else anywhere smells of anything at all.',
  made: 'Out of a sea snail off the Suval beds, thousands of them to a bottle, in vats that have to be kept out of town because of what the making smells like. The same beds give the Empire the purple its officers wear, which is the joke, and the licence, and the whole of the cover.',
});

/** The two who cannot do it without each other, and are at war. */
export const CARTEL = freeze({
  rask: freeze({ id: 'cartel-rask', name: 'Quartermaster Edmund Rask', side: 'Empire',
    holds: 'The dye-bed licences, and a requisition book nobody audits in a war.',
    tell: 'A careful man. He has never once been near the goods and his name is on every piece of paper that moves them, because he believes paper is what makes a thing lawful.' }),
  trelith: freeze({ id: 'cartel-trelith', name: 'Captain Nessa Trelith', side: 'Coalition',
    holds: 'The night passes. Nothing crosses the lines after dark without her hand on it.',
    tell: 'She believes she is funding the rebellion, and a little of it does go that way, and she has stopped counting how little.' }),
});

/**
 * On top of the biggest boulder of the limestone outcrop the winery spring comes out from under
 * (src/winery-world.js): a stride and a half above the water, facing down the rill toward the
 * pool where Katy sits with her spyglass, twenty-five strides away, watching the wrong half of
 * the sky. He has been sitting behind her for most of a year.
 */
export const BATMAN_PERCH = freeze({ x:-501.5,z:710, yaw: 0.98, lift: 1.86 });
/** The breach in Solis's east wall, three years unrepaired: where the carts go through. */
export const HANDOVER = freeze({ ...solisPoint(54, 8), yaw: -1.9 });

/** The three papers, and who is already holding each one. */
export const EVIDENCE = freeze({
  vial: freeze({ id: 'vial', item: 'velaeth-vial', holder: 'winemaker', where: 'Vaervelm Caelazh',
    name: 'A vial of Velaeth',
    told: 'One of the twelve barrels the Coalition took came back. It came back heavier than it went out, and what was in the false head of it was not wine.' }),
  chit: freeze({ id: 'chit', item: 'rask-chit', holder: 'attic-juan', where: 'Tharganhom, in Solis',
    name: 'Rask’s requisition',
    told: 'A crate of wine came up to the attic packed with waste paper, the way they all are, and one sheet of the waste is an Empire requisition for dye stock in a quantity that would dye an army twice over.' }),
  pass: freeze({ id: 'pass', item: 'trelith-pass', holder: 'john-salt', where: 'wherever the Sultana is tied up',
    name: 'Trelith’s night pass',
    told: 'A trader who sails between four ports in a war gets offered every kind of cargo. John was offered this one, and kept the pass they sent him with, and said no in writing, which took nerve.' }),
});
export const EVIDENCE_IDS = freeze(Object.keys(EVIDENCE));
/** What comes off the cart at the breach, and ties the two names together in one place. */
export const LEDGER_ITEM = 'cartel-ledger';

export const HUNT_VERSION = 1;
/**
 * 'unknown' (nothing yet); 'sighted' (he has come, and been seen); 'hunting' (the traveler is
 * working the daylight); 'ready' (all three in hand); 'bust' (the handover, witnessed);
 * 'done' (the case has gone where the traveler sent it).
 */
export const HUNT_STAGES = freeze(['unknown', 'sighted', 'hunting', 'ready', 'bust', 'done']);
/** What the traveler decides to do with a case that convicts both sides of a war. */
export const ENDINGS = freeze({
  provost: freeze({ id: 'provost', name: 'The Empire’s provost',
    outcome: 'Rask hangs inside a month, in a yard, with a drum. The Empire prints a notice about corruption and discipline. Trelith is never named, because naming her would mean admitting who her partner was, and the beds go on working under a new signature by the spring.' }),
  coalition: freeze({ id: 'coalition', name: 'The Coalition’s council',
    outcome: 'Trelith is broken and sent home and the Coalition makes a speech about the rot in the Empire. Rask keeps his desk and his licences, and within a season he has found somebody else on the other side of the line who needs the money as much as she did.' }),
  boards: freeze({ id: 'boards', name: 'Both boards, both sides, the same night',
    outcome: 'Copies go up on the notice boards on both sides of the line before dawn: the requisition, the pass, the tally, and the two names side by side. Neither side can bury a thing the other side is already reading. Both of them are finished, the beds stop working by summer, and nobody thanks you, because a thing that is nailed up where everybody can read it has no owner.' }),
});
export const ENDING_IDS = freeze(Object.keys(ENDINGS));

export function validateHuntSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== HUNT_VERSION) return false;
  if (!HUNT_STAGES.includes(data.stage)) return false;
  if (data.ending !== null && !ENDING_IDS.includes(data.ending)) return false;
  if (!Array.isArray(data.found) || data.found.length > EVIDENCE_IDS.length) return false;
  return data.found.every(id => EVIDENCE_IDS.includes(id)) && new Set(data.found).size === data.found.length;
}

export function createBatmanHunt({ onEvent = () => {} } = {}) {
  const state = { stage: 'unknown', found: new Set(), ending: null };
  const at = (...stages) => stages.includes(state.stage);

  /**
   * He only comes once the traveler is carrying the stuff itself. Katy's looking is the
   * reason they are carrying it; he is the reason it was worth carrying.
   */
  const willCome = () => state.found.has('vial') && at('unknown');
  function sight() {
    if (!willCome()) return { ok: false, first: false };
    state.stage = 'sighted';
    onEvent({ type: 'batman-seen' });
    return { ok: true, first: true };
  }
  /** He asks for the daylight half of the work, and says who is holding what. */
  function accept() {
    if (!at('sighted')) return { ok: false };
    state.stage = 'hunting';
    onEvent({ type: 'hunt-begun' });
    return { ok: true, wants: EVIDENCE_IDS.filter(id => !state.found.has(id)) };
  }
  /** A piece of the case comes in. The vial can come before he has ever been seen. */
  function find(id, inventory = null) {
    const entry = EVIDENCE[id];
    if (!entry) return { ok: false, reason: 'That is not part of this.' };
    if (id !== 'vial' && !at('hunting')) return { ok: false, reason: 'There is no case to put it in yet.' };
    if (state.found.has(id)) return { ok: false, reason: 'You have that already.' };
    state.found.add(id);
    inventory?.grant?.(entry.item);
    const complete = state.found.size === EVIDENCE_IDS.length;
    if (complete && at('hunting')) state.stage = 'ready';
    onEvent({ type: 'evidence-found', id, complete });
    return { ok: true, entry, complete, remaining: EVIDENCE_IDS.filter(other => !state.found.has(other)) };
  }
  /** The handover at the breach: he takes the men, the traveler takes the cart's tally book. */
  function witness(inventory = null) {
    if (!at('ready')) return { ok: false };
    state.stage = 'bust';
    inventory?.grant?.(LEDGER_ITEM);
    onEvent({ type: 'handover-taken' });
    return { ok: true };
  }
  /** Where the case goes. There is no version of this where everybody is punished. */
  function finish(ending) {
    if (!at('bust') || !ENDINGS[ending]) return { ok: false };
    state.stage = 'done';
    state.ending = ending;
    onEvent({ type: 'case-closed', ending });
    return { ok: true, outcome: ENDINGS[ending] };
  }

  const found = () => EVIDENCE_IDS.filter(id => state.found.has(id));
  const view = () => ({ stage: state.stage, found: found(), ending: state.ending,
    complete: state.found.size === EVIDENCE_IDS.length, total: EVIDENCE_IDS.length,
    task: task() });
  /** What the side-quest panel says while this is running. */
  function task() {
    if (at('unknown')) return state.found.has('vial')
      ? { title: 'Something in a wine barrel', detail: 'A vial of something blue out of a barrel that came back heavy. Katy said to watch the sky. The rise above the winery spring is the only high thing here.' }
      : null;
    if (at('sighted')) return { title: 'He is real', detail: 'On the outcrop above the spring, thirty strides behind Katy, who has been watching the wrong half of the sky for a year. Hear him out.' };
    if (at('hunting')) {
      const want = EVIDENCE_IDS.filter(id => !state.found.has(id)).map(id => `${EVIDENCE[id].name} (${EVIDENCE[id].where})`);
      return { title: 'The blue trade', detail: `He does the dark; you do the daylight. Still wanted: ${want.join('; ')}.` };
    }
    if (at('ready')) return { title: 'The blue trade', detail: 'All three. Take them back to the outcrop above the spring, and he will tell you where the carts go through.' };
    if (at('bust')) return { title: 'Two names on one tally', detail: 'Rask and Trelith, in one book, in your satchel. The Empire’s provost would take it. So would the Coalition’s council. So would every notice board on both sides of the line.' };
    return null;
  }

  const snapshot = () => ({ version: HUNT_VERSION, stage: state.stage, found: found(), ending: state.ending });
  function restore(data) {
    state.stage = 'unknown'; state.found = new Set(); state.ending = null;
    if (!validateHuntSnapshot(data, { allowMissing: false })) return false;
    state.stage = data.stage; state.found = new Set(data.found); state.ending = data.ending;
    return true;
  }

  return { sight, accept, find, witness, finish, view, task, snapshot, restore,
    get stage() { return state.stage; }, get ending() { return state.ending; },
    get willCome() { return willCome(); },
    get complete() { return state.found.size === EVIDENCE_IDS.length; },
    has: id => state.found.has(id), foundCount: () => state.found.size };
}

/** How he talks: not much, and it costs him. The throat is wrong for it. */
export const BATMAN_FIRST = freeze([
  'The stone above you moves, and it is not stone. It comes down the outcrop head first, the way a thing with hands on its wings has to, and stands up, and it is a head and a half over you and hunched, and there is a sound of breathing that is too big for the space it is in.',
  'Its ears turn to you separately. Its eyes take the last of the light the way a dog’s do. The wings come down off its shoulders and hang, ragged, exactly like a cloak, which is what everybody says afterward, and what nobody believes.',
  '"…Don’t." A voice out of the wrong throat: low, and wet, and slow, as if each word has to be found first. "Don’t run. You will make me chase. I hate that I still want to."',
  '"You have it in your hand. The blue. I could smell it on the road an hour ago." A long breath. "Say where you got it. Say it slowly. I am better at listening than talking."',
]);

/** Who he is, when he is finally asked. He does not enjoy the question. */
export const BATMAN_SELF = freeze([
  '"A man. Once. There is more of the other one now than there was, and the ledger goes one way." He works the jaw, which does not close over the teeth. "Don’t ask the rest tonight."',
  '"I do not eat anybody. I want to say that once. I hunt over the water for fish, like any other bat with sense, and I am very good at it, and it is the only hour I am happy."',
  '"I cannot go into a town. I tried, the first year. A woman fell down a stair getting away from me and I carried her to a door and left her there and listened to what she said about what had taken her." A pause. "So. The roads at night. The ones who work them. That much I can do."',
]);

/** What the trade is, once he has the vial in front of him. */
export const BATMAN_CASE = freeze([
  '"Velaeth. They sell it as a perfume, in a shop, in daylight, with a ribbon on it. Suval Evening." The claw turns the vial. "It is a snail. Thousands of them to the bottle, off the beds under the east cliffs, and the beds are the Empire’s because the Empire’s purple comes off them."',
  '"So the licence is Imperial. The beds are Imperial. And the roads out of them go through the Coalition’s lines, and nothing crosses those after dark without a pass." He lets that sit. "Two signatures. One trade. They are at war in the daytime."',
  '"Rask. Quartermaster. Solis. He has never touched a bottle in his life and his hand is on every paper. And Trelith, captain, the other side, who thinks the money is going to the rebellion, and some of it is, and she has stopped counting how much."',
  '"I have taken eleven of their couriers off that road. Eleven. It changed nothing. They wrote off the carts and sent more, because I cannot stand in a market, or walk into an attic in Solis, or ask a harbourman a question." The ears go flat, and come back up. "You can. That is the whole of what I am asking."',
]);

/** The three pieces, named. */
export const BATMAN_ASKS = freeze([
  '"Three things and they are all already in somebody’s hand. Nobody has to steal anything."',
  '"The blue you are holding came out of a barrel. That is the first. Second: a requisition in Rask’s hand, in a wine crate, in the attic in Solis — they pack crates with waste paper and they were careless once. The man who keeps that attic will give it to you if you are the sort he likes. I am not."',
  '"Third: the pass. They offered the work to the trader who sails the four ports and he said no in writing, which took a spine. He kept what they sent him. Ask him."',
  '"Bring me all three at this rock. I will tell you where the carts go through, and then you will see it with your own eyes, because a thing you have only been told is a thing you can be talked out of."',
]);

/** Once the case is whole, he names the place. */
export const BATMAN_READY = freeze([
  '"Good." He looks at the three of them a long time, and something in the shoulders comes down. "That is a case. That is an actual case."',
  '"The east wall of Solis has a hole in it from the sack and nobody has ever repaired it, because a repaired wall needs a gate and a gate needs a man and a book. They take the carts through there. Tonight there is a handover: his men, her pass, one cart."',
  '"Be in the rubble on the north side and do not come out, whatever you hear. I want the men and I want them frightened of the dark rather than of me; there is a difference and it lasts longer."',
  '"You want the tally book off the seat of the cart. Both their names are in it in the same hand, which is the thing neither of them can explain."',
]);

/** The handover at the breach. He is very fast, and it is not pleasant to watch. */
export const BUST_SCENE = freeze([
  'The cart comes up out of the dark with no lamp and the wheels wrapped in sacking, and the men at the breach are Empire and the man on the seat is not, and nobody says a word, which tells you how many times they have done this.',
  'A lamp comes out of a hood. Papers change hands. A crate is opened and there is a smell across the whole gap in the wall like rain on hot stone, and for a moment every man there stands still and breathes it, which is when the dark over the wall comes down.',
  'You do not see much of it. You hear the lamp go out. You hear a man run into the rubble and stop running. You hear something land, very heavily, on the far side of the cart, and a voice that has no business being so quiet saying something too low to catch, and then a grown man sobbing and being told, patiently, to lie still.',
  'When you come out, the cart is standing, the horse has not moved, and four men are lying in the road in the stunned, careful way of people who have decided not to get up. The tally book is on the seat where he said it would be, and both names are in it in the same clerk’s hand.',
]);

/** What he says when the traveler is holding the whole thing and has to choose. */
export const BATMAN_CHOICE = freeze([
  '"It is yours. I mean that. I cannot hand it to anybody; the hand is the problem."',
  '"The Empire’s provost will take it and hang Rask and print a notice, and never once say her name, because saying her name means saying who he was working with. The Coalition will do the same in the other direction. Either way the beds are working again by summer under a different signature."',
  '"Or it goes up on the boards. Both sides. The same night, before it is light. Then neither of them can bury a thing the other one is already reading."',
  '"I know which I would do. I am not going to say it, because you will do it to please me, and then it will be mine." The ears turn. "Somebody is coming up the lane. Decide it in daylight."',
]);

/** Batman's whole conversation, by stage. `act` runs the state changes in the host. */
export function batmanConversation(npc, context) {
  const { hunt, openDialogue, closeDialogue, act, visits = 0 } = context;
  if (npc?.id !== BATMAN.id) return false;
  const again = () => batmanConversation(npc, { ...context, visits: visits + 1 });
  const leave = { id: 'leave-batman', label: 'Say nothing, and go.', action: closeDialogue };
  const tell = (lines, back = 'Back to the rock') => openDialogue(npc, [...lines], null, back, { onComplete: again });
  const who = { id: 'batman-who', label: 'What are you?', action: () => tell(BATMAN_SELF) };

  if (hunt.stage === 'unknown') {
    openDialogue(npc, [...BATMAN_FIRST], null, 'Stand still', { choices: [
      { id: 'batman-sighted', label: 'Tell him where the vial came from.', action: () => { closeDialogue(); act('batman-sighted'); } },
    ] });
    return true;
  }
  if (hunt.stage === 'sighted') {
    openDialogue(npc, [...BATMAN_CASE], null, 'Back to the rock', { choices: [
      { id: 'batman-accept', label: 'Tell me what you need.', action: () => openDialogue(npc, [...BATMAN_ASKS], null, 'Take the work',
        { onComplete: () => act('batman-accept') }) },
      who,
      { ...leave, label: 'This is too much. Go.' },
    ] });
    return true;
  }
  if (hunt.stage === 'hunting') {
    const want = EVIDENCE_IDS.filter(id => !hunt.has(id));
    // The vial is always one of them by now: it is the reason he came down off the rock at all.
    openDialogue(npc, [`"${EVIDENCE_IDS.length - want.length} of three." A long breath. "Still wanting: ${want.map(id => EVIDENCE[id].name).join(', ')}. Slowly. Slow is how nobody dies."`],
    null, 'Back to the rock', { choices: [
      { id: 'batman-asks-again', label: 'Say again who has what.', action: () => tell(BATMAN_ASKS) },
      who, leave,
    ] });
    return true;
  }
  if (hunt.stage === 'ready') {
    openDialogue(npc, [...BATMAN_READY], null, 'Back to the rock', { choices: [
      { id: 'batman-bust', label: 'I will be in the rubble.', action: () => { closeDialogue(); act('batman-bust'); } },
      who, leave,
    ] });
    return true;
  }
  if (hunt.stage === 'bust') {
    openDialogue(npc, [...BATMAN_CHOICE], null, 'Decide', { choices: [
      ...ENDING_IDS.map(id => ({ id: `case-${id}`, label: ENDINGS[id].name, action: () => { closeDialogue(); act(`case-${id}`); } })),
      { id: 'batman-wait', label: 'Not yet. Let me think.', action: closeDialogue },
    ] });
    return true;
  }
  openDialogue(npc, [[
    '"It is done, then." He is quiet a while. "Eleven couriers. A year. And it was a wine barrel and an attic and a harbourman in the end."',
    '"Tell the girl by the pool that she was right. Do not tell her where I sit; she has earned the looking."',
    '"There will be another one. There is always another one, and they always think they are the first. Come and find me when you hear a thing that does not sound right."',
  ][visits % 3]], null, 'Back to the rock', { choices: [who, leave] });
  return true;
}
