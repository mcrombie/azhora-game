/**
 * The Elod Light, the woman who keeps it, and the thing Addison wants taken off her.
 *
 * Elod tells every delegation to the Svaleen Conclave the same sentence: *we observe the
 * measures and we keep our lighthouse* (src/elod-people.js). The lighthouse is real. It
 * stands on the head south of the city, seventeen metres up, black basalt out of the same
 * cliff, taller than anything Ambron ever built on this coast, and it is the one thing the
 * closed country is openly proud of.
 *
 * The woman Elod pays to keep it is Addison's twin sister. Her name is Meg. She has not
 * answered to it in eleven years; she calls herself SUBTRACTIDAUGHTER, which she thinks is
 * funny and which is, and she has made everyone on that coast say it, including the Elodi,
 * who say it with a completely straight face because they are polite.
 *
 * She is not mad. She is a wrecker. Her light is the best on this sea because of one object:
 * a stepped lens of Elagosi glass in a brass cradle, ground in rings like a beehive, the
 * height of a man's chest and a third of a ton, which takes a flame the size of a fist and
 * throws it twenty miles. That is the power of a light — not the fire, the glass. And twice
 * a year, on a night with weather in it, she moves it: sets it showing from the wrong place
 * at the wrong hour, and a master out there corrects onto it, and by morning there is a ship
 * on the ledge and whatever floats off it belongs to whoever walks the tideline at dawn.
 *
 * Addison's wreck book has a ship in it with no name that went past her in the dark under
 * full sail and was never heard of again. She has known whose light it steered on for six
 * winters and has had nothing anybody would act on, because it is her word against her own
 * face. So she wants the glass. Not the tower, not the woman: the glass. Without it that
 * light cannot reach far enough to move anybody, and the wrecking stops.
 *
 * East Suval is shut (src/closed-border.js), so the traveler does not walk in. Addison sails
 * them, lands them under the head in the dark, and waits on the water.
 *
 * Pure: no DOM, no three. The tower is built by src/lighthouse-world.js from this layout.
 */
const freeze = Object.freeze;

/** The head south of Elod, beyond the breakwater: seventeen metres, sea on the north and east. */
export const RIVAL_HEAD = freeze({ x: 22, z: 712 });
const at = (dx, dz) => freeze({ x: RIVAL_HEAD.x + dx, z: RIVAL_HEAD.z + dz });

export const ELOD_LIGHT = freeze({
  id: 'elod-light', name: 'The Elod Light', region: 'East Suval',
  head: freeze({ ...RIVAL_HEAD }),
  /** Taller than Addison's by half again, and black. It is meant to be looked at. */
  tower: freeze({ ...at(0, 0), base: 3.6, top: 2.5, height: 16.8, gallery: 1.2, lantern: 3.2 }),
  /** No cottage: a blockhouse with one window and a door that bars from inside. */
  cottage: freeze({ ...at(-6.4, -3.8), width: 6.6, depth: 4.8, eaves: 2.3, ridge: 3.4, yaw: -0.22 }),
  /** The wall is higher than a wall needs to be, and it is open only where the winch is. */
  yard: freeze({ ...at(-2.2, -1.4), radius: 9.2, height: 2.1, openFrom: 1.15, openTo: 2.05 }),
  store: freeze({ ...at(-9.4, 1.8), width: 3.8, depth: 3.2, height: 2.3 }),
  bell: freeze({ ...at(4.2, 3.2), height: 2.8 }),
  staff: freeze({ ...at(-1.6, 4.6), height: 6.8 }),
  gate: freeze({ ...at(6.8, 5.6) }),
  /** The derrick over the cliff edge, for bringing up what the sea leaves on the ledge. */
  winch: freeze({ ...at(7.4, 2.2), height: 4.6, reach: 3.2 }),
  /** Where the salvage stands about the yard, because there is more of it than she can sell. */
  salvage: freeze([at(-5.2, 2.6), at(-3.4, 3.4), at(3.2, -4.2), at(5.6, -2.4), at(-7.2, -0.6)]),
});
export const rivalPoint = at;

/** Under the head, on the shingle, where a boat can lie in the dark and nobody sees it from above. */
export const LANDING = freeze({ ...at(26, 24), yaw: -2.2 });
/** Where she stands: at the tower door, between whoever is coming and her glass. */
export const SUBTRACTIDAUGHTER_STAND = freeze({ ...at(-3.4, 1.6), yaw: 0.6 });

// Addison's face, eleven years of a different life on it: the same dirty blonde, cut short and
// square, and black oilskins instead of a jersey. Never the traveler's own model.
export const SUBTRACTIDAUGHTER = freeze({
  id: 'rival-keeper', name: 'Subtractidaughter', given: 'Meg',
  role: 'Keeper of the Elod Light',
  modelRole: 'rival-keeper', color: 0x24262b, skin: 0xd9ae83,
});

/** The glass. One object, a third of a ton, and the whole of the quest. */
export const LENS_ITEM = 'elodi-lens';
export const LENS = freeze({
  id: LENS_ITEM, name: 'The stepped lens',
  look: 'Rings of Elagosi glass ground one inside the next like a beehive, in a brass cradle, the height of your chest and heavier than you are.',
  why: 'A flame the size of a fist goes in the middle of it and comes out the other side as a bar of light twenty miles long. It is the only one on this sea and there is no replacing it.',
});

export const HEIST_VERSION = 1;
/**
 * 'unknown' (Addison has not said); 'told' (the traveler knows what her sister does);
 * 'asked' (the traveler has agreed to go); 'landed' (put ashore under the head);
 * 'met' (Subtractidaughter has been spoken to); 'taken' (the glass is off its cradle);
 * 'home' (back across the water with it); 'done' (Addison has decided what to do with it).
 */
export const HEIST_STAGES = freeze(['unknown', 'told', 'asked', 'landed', 'met', 'taken', 'home', 'done']);
/** What Addison does with a third of a ton of somebody else's glass. */
export const HEIST_ENDINGS = freeze({
  keep: freeze({ id: 'keep', name: 'Put it in the Suval Light',
    outcome: 'It goes up her own stair in pieces of cradle and gets set over her eleven wicks, and from the first night her light reaches places it has never reached, and every master on this coast notices and nobody knows why. She is not sorry. She says the glass was made to save people and has spent eleven years doing the other thing, and it can work off the debt in her tower.' }),
  conclave: freeze({ id: 'conclave', name: 'Give it to the Svaleen Conclave',
    outcome: 'It goes to the Conclave with the wreck book and a statement in Addison’s hand, and the Conclave does what bodies like that do: it takes nine months, it never once uses the word wrecker, and at the end of it the Elod Light has a new keeper, the glass goes back into the tower it was ground for, and a woman who is not named in any of the papers is living quietly somewhere on the Peblos coast.' }),
  sea: freeze({ id: 'sea', name: 'Put it over the side',
    outcome: 'Addison rows out past the ledge on a flat morning and tips a third of a ton of Elagosi glass into ninety feet of water, and sits there a while afterward. Nobody will ever make another. Her sister will never have it, nobody else will either, and the ships that come up this coast will go on steering by two ordinary lights kept by ordinary people, which she says is all a coast was ever owed.' }),
});
export const HEIST_ENDING_IDS = freeze(Object.keys(HEIST_ENDINGS));

export function validateHeistSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== HEIST_VERSION) return false;
  if (!HEIST_STAGES.includes(data.stage)) return false;
  if (data.ending !== null && !HEIST_ENDING_IDS.includes(data.ending)) return false;
  return typeof data.spoke === 'boolean';
}

export function createHeist({ onEvent = () => {} } = {}) {
  const state = { stage: 'unknown', spoke: false, ending: null };
  const at_ = (...stages) => stages.includes(state.stage);

  /** Addison says what her sister is, which she has not said out loud to anybody in six winters. */
  function tell() {
    if (!at_('unknown')) return { ok: false };
    state.stage = 'told';
    onEvent({ type: 'sister-told' });
    return { ok: true };
  }
  /** The traveler agrees to go over the water and take the glass off her. */
  function accept() {
    if (!at_('told')) return { ok: false };
    state.stage = 'asked';
    onEvent({ type: 'heist-accepted' });
    return { ok: true };
  }
  /** Put ashore on the shingle under the head, in a country that is shut. */
  function land() {
    if (!at_('asked')) return { ok: false };
    state.stage = 'landed';
    onEvent({ type: 'landed' });
    return { ok: true };
  }
  /** She was never going to let anybody walk up that head without being seen. */
  function meet() {
    if (!at_('landed')) return { ok: false, first: false };
    state.stage = 'met';
    state.spoke = true;
    onEvent({ type: 'rival-met' });
    return { ok: true, first: true };
  }
  /** The glass comes off its cradle. It takes both arms and it is not quiet. */
  function take(inventory = null) {
    if (!at_('landed', 'met')) return { ok: false };
    state.stage = 'taken';
    inventory?.grant?.(LENS_ITEM);
    onEvent({ type: 'lens-taken', spoke: state.spoke });
    return { ok: true, spoke: state.spoke };
  }
  /** Back across the water with a third of a ton of glass in a boat built for two people. */
  function home() {
    if (!at_('taken')) return { ok: false };
    state.stage = 'home';
    onEvent({ type: 'lens-home' });
    return { ok: true };
  }
  /** And what she does with it, which she leaves to the traveler. */
  function finish(ending) {
    if (!at_('home') || !HEIST_ENDINGS[ending]) return { ok: false };
    state.stage = 'done';
    state.ending = ending;
    onEvent({ type: 'heist-finished', ending });
    return { ok: true, outcome: HEIST_ENDINGS[ending] };
  }

  function task() {
    if (at_('told')) return { title: 'Her sister', detail: 'Addison has told you what the Elod Light is for. She has not asked you for anything yet, and she is working up to it.' };
    if (at_('asked')) return { title: 'The stepped lens', detail: 'Addison will put you ashore under the Elod head on a dark night. Talk to her at the Suval Light when you are ready to go.' };
    if (at_('landed') || at_('met')) return { title: 'The stepped lens', detail: 'You are in East Suval, which is shut, on the shingle under her tower. The glass is in the lantern at the top of the stair. Addison is on the water and will not wait past first light.' };
    if (at_('taken')) return { title: 'The stepped lens', detail: 'You are carrying a third of a ton of Elagosi glass. Get down the head to the boat.' };
    if (at_('home')) return { title: 'The stepped lens', detail: 'Back at the Suval Light with the glass. Addison will not decide what happens to it. She says it is yours to decide, which is the most annoying thing she has ever done.' };
    return null;
  }

  const snapshot = () => ({ version: HEIST_VERSION, stage: state.stage, spoke: state.spoke, ending: state.ending });
  function restore(data) {
    state.stage = 'unknown'; state.spoke = false; state.ending = null;
    if (!validateHeistSnapshot(data, { allowMissing: false })) return false;
    state.stage = data.stage; state.spoke = data.spoke; state.ending = data.ending;
    return true;
  }

  return { tell, accept, land, meet, take, home, finish, task, snapshot, restore,
    get stage() { return state.stage; }, get ending() { return state.ending; },
    get spoke() { return state.spoke; },
    get carrying() { return at_('taken', 'home'); },
    get ashore() { return at_('landed', 'met', 'taken'); } };
}

// ---------------------------------------------------------------------------
// What Addison says about her sister
// ---------------------------------------------------------------------------

/** The first time she says it out loud, which is harder for her than the sailing. */
export const SISTER_TOLD = freeze([
  'She puts the line down, which she has not done once while you have been talking to her.',
  '"There is a light on the other side of the water. East Suval, the head south of Elod, seventeen metres up and black. It is the best light on this sea and I am not being modest about mine when I say that."',
  '"The woman who keeps it is my sister. Twin. Her name is Meg. She has not answered to it in eleven years — she calls herself Subtractidaughter, out loud, to people, and she has got the Elodi saying it, which if you knew the Elodi is the single most impressive thing she has ever done."',
  '"I am going to say the rest of it plainly because if I go carefully I will not get it out. Twice a year, in weather, she takes her light and she shows it from the wrong place. A master out there corrects onto it. In the morning there is a ship on the ledge and everything that floats off it belongs to whoever is on the tideline."',
  '"You have read the book. The trader with no name that went past me in the dark under full sail, six winters ago, and was never heard of after? It went past me because it was steering on her."',
]);

/** Why she has never done anything about it, and what she wants done now. */
export const SISTER_WHY = freeze([
  '"Why have I not said? I have said. I said it to the harbourman, and to a Conclave clerk, and once, stupidly, in a letter. It is my word against a woman with my face who keeps a public light for a country that does not let anybody in to look at it. Every single time it comes back the same: sisters fall out."',
  '"And she is careful. She does it twice a year and never in the same month, and the rest of the time she keeps the best light on this coast and everybody who sails past blesses her for it. That is the horrible part. Most nights she is saving people."',
  '"So: not the tower, not her. The glass."',
  '"People think the power of a light is the fire. It is not. It is the glass. She has a stepped lens out of Elagos, rings ground one inside the next like a beehive, chest high, a third of a ton, and it takes a flame the size of your fist and throws it twenty miles. There is one. There will not be another."',
  '"Take it off her and she has a fire in a tower like everybody else, and a fire in a tower cannot reach far enough to move anybody. The wrecking stops that night. Nobody has to be believed, and nobody has to be hanged, and my sister gets to keep being a woman who keeps a light."',
]);

/** The arrangement. She is not sending anybody anywhere she is not going herself. */
export const CROSSING_PLAN = freeze([
  '"East Suval is shut. You do not walk in, and I would not let you try; the pickets are not unkind but they are extremely thorough."',
  '"So we go round. My boat, at night, across and down the coast, and I put you on the shingle under the head where the cliff hides a boat from anybody standing on top of it. I have been landing on that beach since I was nine."',
  '"Up the cliff path, in at the yard, up the stair. The lens is in the lantern in a brass cradle with four pins. Pull the pins, take the glass, do not drop the glass."',
  '"She will hear you. She hears everything; it is the same ears. If she comes out, talk to her. Do not fight her, do not steal from her while she is looking at you and pretending you are not there, and do not, whatever she says, agree with her — she is very good and you will find yourself nodding."',
  '"And be off that head by first light, because I will be on the water under it and I am not staying past the light."',
]);

/** Talking to her about it afterward, before it is decided. */
export const ADDISON_AFTER = freeze([
  '"You got it." She looks at it for a long time and does not touch it. "Eleven years. It is smaller than I remember and it weighs exactly what I remember."',
  '"No. I am not deciding. I have decided about my sister every night for six winters and I am done with it. You carried it down a cliff; you say."',
]);

// ---------------------------------------------------------------------------
// Subtractidaughter
// ---------------------------------------------------------------------------

/** She comes out of the door before the traveler is halfway across the yard. */
export const RIVAL_FIRST = freeze([
  'The tower door opens while you are still crossing the yard, and a woman comes out with a lamp held low and away from her face, which is how somebody stands who wants to see you and not be seen.',
  'It is Addison. It is not: it is Addison with eleven years of somebody else on her, hair cut square at the jaw, black oilskins, and a way of standing that is entirely still.',
  '"Well," she says, pleasantly. "You came up the cliff path, which means somebody told you about the cliff path, which means my sister. How is she? She will not have asked."',
  '"Subtractidaughter. Say it properly, everybody does. She named herself Addison — Addi-son, our mother thought it was clever and it is — so when I stopped being what she was, I took the other one. I have never once regretted it. It is a tremendous name."',
]);

/** She knows exactly why you are there and makes the case anyway. */
export const RIVAL_CASE = freeze([
  '"You are here for the glass. Of course you are. She has wanted it since she found out I had it and she has never once come to ask me for it herself."',
  '"Let me put the whole thing to you honestly, because she will have put half of it. Ships come up this coast whether or not I am here. The ledge is there whether or not I am here. In a bad year this sea takes nine of them and gives them to nobody, and what comes ashore rots on a beach in a country that has shut its gate and has no money."',
  '"Twice a year I choose which one. Once. In weather, out of a season, from a ship that is insured in Ambron by men who will not miss it, and everything off it goes into a town that cannot buy grain. Look at the yard. Look at what is in it. Now tell me you have never once decided that some people matter more than other people."',
  '"And the other three hundred and sixty-three nights I keep the best light on this water and nobody dies on my ledge. She keeps hers too. We are the same. The only difference between my sister and me is that she has never had to choose and thinks that makes her better."',
]);

/** What she does when the glass goes off its cradle, which is nothing. */
export const RIVAL_WATCHES = freeze([
  'She does not stop you. She stands at the top of the stair with the lamp down by her knee and watches you pull the four pins, and she does not say a word until the glass is off the cradle and in your arms and you have found out what a third of a ton feels like.',
  '"Mind the second step from the bottom," she says. "It is worn hollow. I would hate for it to break on the stair after all this."',
  'And then, from behind you, without any particular feeling in it: "Tell her the Marrow Girl was not me. I was nineteen and I was asleep in the next room and she has never asked me once."',
]);

/** If the traveler takes it without ever speaking to her. */
export const RIVAL_UNSEEN = freeze([
  'Nobody comes. The yard is empty, the blockhouse door is barred from the inside, and the only sound on the head is the wind and the sea under it.',
  'The four pins come out. The glass is heavier than anything you have carried and the cradle rings like a struck bell when it comes free, and no door opens, and no lamp lights, and you go down the stair and down the cliff path with a third of a ton of Elagosi glass and a cold feeling between your shoulders the whole way.',
  'At the boat, when you look back, there is somebody standing at the gallery rail seventeen metres up with no lamp, watching you get into it.',
]);

/** Afterward, if you ever go back. She is unbothered, which is worse. */
export const RIVAL_AFTER = freeze([
  '"You again. There is a fire in a tower up there now and it reaches about four miles and I sit and watch it not reach anybody."',
  '"No, I am not going to do anything about it. What would I do? Row over and ask for it? She would give it back, that is the maddening thing. She would give it back and be gracious and I would have to live with that."',
  '"Tell her the offer stands. If she ever wants to sit in one room with me and count the ships, I will bring my book and she can bring hers, and we will find out which of us the sea likes better."',
]);

/**
 * Subtractidaughter's conversation. `act('take-lens')` lifts the glass in the host.
 * She never stops anybody; that is the point of her.
 */
export function rivalConversation(npc, context) {
  const { heist, openDialogue, closeDialogue, act, visits = 0 } = context;
  if (npc?.id !== SUBTRACTIDAUGHTER.id) return false;
  const again = () => rivalConversation(npc, { ...context, visits: visits + 1 });
  const leave = { id: 'leave-rival', label: 'Say nothing.', action: closeDialogue };
  const takeIt = { id: 'take-lens', label: 'Go up and take the glass.', action: () => { closeDialogue(); act('take-lens'); } };

  if (heist.stage === 'landed') {
    heist.meet();
    openDialogue(npc, [...RIVAL_FIRST], null, 'Stand there', { choices: [
      { id: 'rival-case', label: 'I am here for the lens.', action: () => openDialogue(npc, [...RIVAL_CASE], null, 'Back to her',
        { choices: [takeIt, { id: 'rival-refuse', label: 'Leave it, and leave.', action: closeDialogue }] }) },
      takeIt, leave,
    ] });
    return true;
  }
  if (heist.stage === 'met') {
    openDialogue(npc, ['"Still here. The stair is where it was."'], null, 'Back to her', { choices: [
      { id: 'rival-case-again', label: 'Say that again about choosing.', action: () => openDialogue(npc, [...RIVAL_CASE], null, 'Back to her', { onComplete: again }) },
      takeIt, leave,
    ] });
    return true;
  }
  openDialogue(npc, [RIVAL_AFTER[visits % RIVAL_AFTER.length]], null, 'Back to the head', { choices: [leave] });
  return true;
}
