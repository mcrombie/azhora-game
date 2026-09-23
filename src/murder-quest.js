/**
 * **The tally-keeper of Cobble**, and who killed her. Troy's quest in Peblos (the user,
 * 22 September 2026).
 *
 * Bregga Sell kept the nets and kept the tally, "which means I am the one who tells a man his
 * boat came in light" — she said so herself, in the ambient lines this file replaces. She was
 * found at the quay root with the tally book gone. The Empire's decurion would like it to be
 * nobody, the village will not say a word to a soldier, and so the guild sent Troy, who is not a
 * soldier and can hear what people decided not to say.
 *
 * **Three suspects, and all three are innocent** (the user's ruling). What each of them has is a
 * true thing they would rather not say, and the shape of the case is that those three true things
 * do not add up to a murder — and the fourth person, who is not a suspect at all, is the only one
 * they can add up to.
 *
 *   **Jessi**   fishes, and teaches it. Her boat came in light three weeks running and it did
 *               not. She thinks Bregga was cheating her and she is not sorry Bregga is dead,
 *               which she knows sounds bad and says anyway.
 *   **Ari**     the village's own accountant, who keeps Cobble's books against the Empire's
 *               tally. She will not say where she was that night, because she was out at the
 *               rocky skerry with men who mutinied off Ed the Word's ship, and that is a hanging
 *               matter on its own. Her evasion is the red herring and it does all the work.
 *   **Imani**   in Cobble for kelp for the vineyard, and therefore at the drying racks before
 *               light, and therefore the only person who saw somebody at the weigh-beam in the
 *               dark. She does not know that is unusual. Nobody thought to ask the outsider.
 *
 * **Torven Oss** holds the beam. The boats were coming in light because the *weights* were light,
 * not the counts — he had been shaving the barrels for years — and Bregga's tally had finally got
 * close enough to say so. He is the only person who says the tally book was never found rather
 * than that it was lost, which is a thing you only know if you know where it went.
 *
 * **The deduction is the player's.** Troy will not act on a guess: name the wrong person and he
 * says why it cannot be them and sends you back out, and **he will not hear another name for a
 * while** (`ACCUSE_REST`), so the list cannot be walked. When you have the three readings the
 * fourth name is the only one left standing.
 *
 * Pure: no DOM, no three, no clock of its own — the host hands in the time.
 */

export const MURDER_QUEST_VERSION = 1;

/** Who it was, which is not one of the three people the village suspects. */
export const MURDERER = 'cobble-weighmaster';

/** The woman who kept the tally, and is not in the world any more. */
export const VICTIM = Object.freeze({ name: 'Bregga Sell', was: 'net-mistress of Cobble, and keeper of the tally' });

/**
 * What each of them knows, and what it is worth. `reading` is what Mindread turns up — the thing
 * they decided not to say — and it is not needed to solve the case: every one of these can be got
 * out of them by asking, if you ask the right way. Mind makes it quicker and kinder, not possible.
 */
export const TESTIMONY = Object.freeze({
  'cobble-jessi': Object.freeze({
    id: 'cobble-jessi', name: 'Jessi',
    says: 'Three weeks running she told me my boat came in light. It did not come in light. I am not going to stand here and be sorry.',
    reading: 'She is doing the sum again. Three weeks, and every week the number on the beam was smaller than the number in her own head.',
    gives: 'light-boats',
  }),
  'cobble-ari': Object.freeze({
    id: 'cobble-ari', name: 'Ari',
    says: 'I keep the village’s books against theirs. The counts have matched for years. It is the weights that have not, and I have said so in writing twice.',
    reading: 'She is not thinking about the books at all. She is thinking about a rocky little island with a boat behind it, and whether you are the sort of person who asks.',
    gives: 'weights-not-counts',
  }),
  'cobble-imani': Object.freeze({
    id: 'cobble-imani', name: 'Imani',
    says: 'I am here for kelp, so I am at the racks before it is light. There was a man at the weigh-beam that morning with a lamp. I assumed that was when it is done.',
    reading: 'She is going back over it and getting to the same place: the lamp was under the beam, not over the barrels. You do not need a lamp under a beam to weigh anything.',
    gives: 'lamp-under-the-beam',
  }),
});
export const WITNESS_IDS = Object.freeze(Object.keys(TESTIMONY));

/** The three things that have to be in hand before the fourth name is the only one left. */
export const CLUES = Object.freeze(['light-boats', 'weights-not-counts', 'lamp-under-the-beam']);

/**
 * How long Troy needs before he will hear another name. He is not being difficult: he goes back
 * over what you have both got, and he would rather you did too. Long enough that the list cannot
 * be walked, short enough that a player who has actually worked it out is not punished.
 */
export const ACCUSE_REST = 180;

const emptyState = () => ({ version: MURDER_QUEST_VERSION, stage: 'unmet', heard: [], accused: [], restUntil: 0 });
export const STAGES = Object.freeze(['unmet', 'asking', 'solved', 'paid', 'taught']);
export const REWARDS = Object.freeze({
  purse: Object.freeze({ id: 'purse', stage: 'paid', label: 'Take the guild’s purse' }),
  lesson: Object.freeze({ id: 'lesson', stage: 'taught', label: 'Ask him to teach you the reading' }),
});
/** What the guild is paying, in copper, if you would rather have it than the lesson. */
export const PURSE = 40;

const listOf = (value, allowed) => Array.isArray(value) && value.every(one => allowed.includes(one))
  && new Set(value).size === value.length;

export function validateMurderQuestSnapshot(value) {
  if (!value || typeof value !== 'object' || value.version !== MURDER_QUEST_VERSION) return false;
  if (!STAGES.includes(value.stage)) return false;
  if (!listOf(value.heard, [...CLUES])) return false;
  if (!listOf(value.accused, [...WITNESS_IDS, MURDERER])) return false;
  if (!Number.isFinite(value.restUntil) || value.restUntil < 0) return false;
  // He cannot have been paid for a case that is not closed, and it is not closed until the
  // right name has been said.
  if (['paid', 'taught'].includes(value.stage) && !value.accused.includes(MURDERER)) return false;
  if (value.stage === 'solved' && !value.accused.includes(MURDERER)) return false;
  if (value.accused.includes(MURDERER) && value.stage === 'asking') return false;
  return true;
}

export function createMurderQuest({ onEvent = () => {} } = {}) {
  let state = emptyState();
  const snapshot = () => ({ ...state, heard: [...state.heard], accused: [...state.accused] });

  /** Troy sets it out; from here the town will talk to you. */
  function begin() {
    if (state.stage !== 'unmet') return false;
    state.stage = 'asking';
    onEvent({ type: 'murder-begun' });
    return true;
  }

  /**
   * Somebody told you something. `id` is whose it was; the same person told twice tells you
   * nothing new, which is what stops the three being got from one person.
   */
  function hear(id) {
    const witness = TESTIMONY[id];
    if (!witness || state.stage !== 'asking' || state.heard.includes(witness.gives)) return null;
    state.heard.push(witness.gives);
    onEvent({ type: 'murder-heard', clue: witness.gives, from: id });
    return witness;
  }

  /** Whether the three add up, which is the only gate on naming anybody with confidence. */
  const ready = () => CLUES.every(clue => state.heard.includes(clue));

  /**
   * Name somebody. Answers what happened rather than a bare boolean, because the wrong name has
   * several different wrong-nesses and Troy says which: nobody at all, too early, too soon after
   * the last one, or simply not them.
   */
  function accuse(id, now = 0) {
    if (state.stage !== 'asking') return { ok: false, why: 'closed' };
    if (!Number.isFinite(now)) return { ok: false, why: 'closed' };
    // A name he has never heard of is not a name: nothing is written down and nothing is spent.
    if (id !== MURDERER && !WITNESS_IDS.includes(id)) return { ok: false, why: 'nobody', named: id };
    if (now < state.restUntil) return { ok: false, why: 'resting', until: state.restUntil };
    if (!state.accused.includes(id)) state.accused.push(id);
    if (id !== MURDERER) {
      state.restUntil = now + ACCUSE_REST;
      onEvent({ type: 'murder-wrong', named: id });
      return { ok: false, why: 'wrong', named: id, until: state.restUntil };
    }
    if (!ready()) {
      // The right name with nothing behind it is still a guess, and he says so.
      state.restUntil = now + ACCUSE_REST;
      state.accused = state.accused.filter(one => one !== MURDERER);
      onEvent({ type: 'murder-unproven', named: id });
      return { ok: false, why: 'unproven', named: id, until: state.restUntil };
    }
    state.stage = 'solved';
    onEvent({ type: 'murder-solved' });
    return { ok: true, why: '', named: id };
  }

  /** The fork, once the case is closed. */
  function take(rewardId) {
    const reward = REWARDS[rewardId];
    if (!reward || state.stage !== 'solved') return null;
    state.stage = reward.stage;
    onEvent({ type: 'murder-paid', reward: reward.id });
    return reward;
  }

  function restore(data) {
    if (!validateMurderQuestSnapshot(data)) return false;
    state = { version: MURDER_QUEST_VERSION, stage: data.stage, heard: [...data.heard],
      accused: [...data.accused], restUntil: data.restUntil };
    return true;
  }

  return {
    begin, hear, accuse, take, snapshot, restore,
    get ready() { return ready(); },
    /** What Troy will hear right now, and when he will hear it if the answer is not yet. */
    rests: (now = 0) => Math.max(0, state.restUntil - now),
    choices: () => (state.stage === 'solved' ? Object.values(REWARDS) : []),
    get state() { return { ...snapshot(), ready: ready(), over: ['paid', 'taught'].includes(state.stage) }; },
  };
}

/**
 * **Troy**, who kept bees at the Bee Fold in Drent until the guild sent him to sea. Red-bearded,
 * smiling, thin on top, spectacles, canvas smock — and since 22 September 2026 half his hair is
 * dirty blonde and the other half is the red he came with (`look.hairSplit`, src/characters.js).
 * He does not explain it. His stand is Cobble's (`COBBLE_STANDS`, src/peblos-world.js).
 */
export const TROY = Object.freeze({
  id: 'bee-keeper', name: 'Troy', role: 'Of the sorcerer’s guild, in Cobble',
  modelRole: 'bee-keeper', color: 0xe7e0c8, skin: 0xe8b98f,
  look: Object.freeze({ hairSplit: 0xb9995c }),
});

/** What he will talk about when the case is not the thing being talked about. */
export const TROY_LINES = Object.freeze([
  'I kept bees. Three skeps in a fold in Drent’s wood, and the whole of my year was whether the heather came early. I am not being nostalgic; I am telling you what I would rather be doing.',
  'The guild does not have many of us, and it has fewer who are any use out of a chair. So when a thing wants a man who can hear what a room decided not to say, it is me who goes.',
  'The hair is the question everybody asks and nobody asks. It went like that over one winter. I have a theory and it is not a good one.',
  'Mind is not a trick for taking things out of people. It is standing close enough to somebody that you cannot pretend you do not know what they are carrying. It is mostly unpleasant.',
  'The lieutenant has been perfectly correct with me and perfectly useless, which is what four bored men and no authority gets you.',
]);

/** How he sets it out, the first time. */
export const TROY_OPENING = Object.freeze([
  'You are not from here and you are not one of his, so you are the third kind of person on this quay, and I have been waiting a week for one.',
  'Troy. Of the sorcerer’s guild, which on an island this size means a man in a smock that nobody will talk to either.',
  'Bregga Sell kept the nets and she kept the tally — the book that says what every boat landed. She was found at the root of the quay, and the book was not found at all.',
  'The Empire would like it to be nobody. The village will not say a word to a soldier, and I am near enough a soldier to them. You are not.',
]);

/** What he says while you are still short of it. */
export const TROY_PRESSING = Object.freeze([
  'Go and be talked to. Jessi is angry and honest, Ari is frightened and careful, and the outsider has been treated kindly and asked nothing at all.',
  'When the three of them have told you what they will not tell me, come back and say a name. Not before — I will not act on a guess.',
]);

/** What Troy says to a name that is not the one. Each of the three has its own reason. */
export const CLEARED = Object.freeze({
  'cobble-jessi': 'Jessi says out loud that she is not sorry, which is not what somebody who did it says, and she was hauling with two other boats until after light. It is not her.',
  'cobble-ari': 'Ari is lying about that night, and she is lying about something that is not this. Whatever she was doing out at the skerry, she was not at the quay root, and I will not be the man who hangs her for the wrong thing.',
  'cobble-imani': 'She came four days ago for kelp and did not know the woman’s name until I said it to her. No.',
});
/** And what he says to the right name, said too early. */
export const UNPROVEN =
  'That may even be true. Bring me the three things that make it true and I will take it to the lieutenant; bring me a feeling and he will laugh at us both.';

const nameOf = id => (id === MURDERER ? 'Torven Oss, the weighmaster.' : `${TESTIMONY[id].name}.`);

/**
 * **Troy's conversation.** He sets it out, takes names, and refuses the ones that are guesses.
 * `now` is the host's play clock in seconds, which is what `ACCUSE_REST` is counted in.
 */
export function troyConversation(npc, context) {
  const { murder, openDialogue, closeDialogue, act, now = 0, visits = 0 } = context;
  if (npc?.id !== TROY.id) return false;
  const state = murder.state;
  const leave = { id: 'leave-troy', label: 'Leave him to it.', action: closeDialogue };
  const talk = {
    id: 'ask-troy', label: 'Ask him about himself.',
    action: () => openDialogue(npc, [TROY_LINES[visits % TROY_LINES.length]], null, 'Back to Troy',
      { onComplete: () => troyConversation(npc, { ...context, visits: visits + 1 }) }),
  };
  const again = () => troyConversation(npc, { ...context, visits });

  if (state.stage === 'unmet') {
    openDialogue(npc, [...TROY_OPENING], null, 'Back to the quay', { choices: [
      { id: 'murder-take', label: 'I will ask around for you.', action: () => { closeDialogue(); act('murder-begin'); } },
      talk, leave] });
    return true;
  }
  if (state.stage === 'asking') {
    const rest = murder.rests(now);
    const lines = rest > 0
      ? [`Not yet. Give me a minute — I am going back over what we have, and I would rather you did the same.`]
      : state.ready
        ? ['You have all three of them, and all three of them are somebody else’s. Say the name you are left with.']
        : [...TROY_PRESSING];
    const names = rest > 0 ? [] : [{
      id: 'murder-name', label: 'I know who killed her.',
      action: () => openDialogue(npc, ['Say it, then.'], null, 'Name somebody', { choices: [
        ...[...WITNESS_IDS, MURDERER].map(id => ({ id: `accuse-${id}`, label: nameOf(id),
          action: () => { closeDialogue(); act('murder-accuse', id); } })),
        { id: 'accuse-nobody', label: 'Not yet.', action: () => { closeDialogue(); again(); } }] }),
    }];
    openDialogue(npc, lines, null, 'Back to the quay', { choices: [...names, talk, leave] });
    return true;
  }
  if (state.stage === 'solved') {
    openDialogue(npc, [
      'Torven Oss. The beam and not the book: the boats came in light because the weights were light, and Bregga’s tally had got close enough to say so out loud.',
      'He has gone up to the lieutenant, who is delighted to have a thing to do at last. The guild gave me a purse for this and I have spent none of it.',
      'So. The purse, or the other thing — I can show you how to stand close to somebody and hear what they are carrying. I will not pretend the two are the same size.'],
      null, 'Choose', { choices: [
        { id: 'murder-purse', label: `Take the purse · ${PURSE} copper`, action: () => { closeDialogue(); act('murder-reward', 'purse'); } },
        { id: 'murder-lesson', label: 'Show me the reading.', action: () => { closeDialogue(); act('murder-reward', 'lesson'); } }] });
    return true;
  }
  if (state.stage === 'paid') {
    openDialogue(npc, ['Spend it on this island, if you can find anybody selling anything.',
      'I am going to stay a week and look at the water. Then Ambron, and a chair, and a report nobody reads.'],
      null, 'Back to the quay', { choices: [talk, leave] });
    return true;
  }
  openDialogue(npc, [
    'Stand close. Do not reach — you are not taking anything, you are refusing to pretend you cannot hear it.',
    'It is strongest in somebody who has decided not to say a thing. That is most people, most of the time, and you will like them less for a while.'],
    null, 'Back to the quay', { choices: [talk, leave] });
  return true;
}

/** What Mindread turns up in the man himself: the only one of the four that is a confession. */
export const MURDERER_READING =
  'He is counting. Not barrels — days. He has got to eleven years of them and he is doing the sum on what the beam owes, and underneath it, flat and tidy, is the place he put the book.';
const readingOf = id => (id === MURDERER ? MURDERER_READING : TESTIMONY[id].reading);

/**
 * **One of Cobble's four**, while the case is running. The ambient lines are theirs
 * (`PEBLOS_AMBIENT`, src/peblos-people.js); this adds the one thing they will say about Bregga
 * Sell when somebody who is not a soldier asks — and, if the traveler has the reading, the thing
 * they decided not to say at all.
 */
export function cobbleConversation(npc, context) {
  const { murder, ambient = [], openDialogue, closeDialogue, act, reads = false } = context;
  const witness = TESTIMONY[npc?.id];
  const isMurderer = npc?.id === MURDERER;
  const asking = murder.state.stage === 'asking';
  // Once the case is closed there is nothing left to ask them - but a traveler Troy has taught
  // can still stand there and hear what they are carrying, which is the whole of what he taught.
  if ((!witness && !isMurderer) || (!asking && !reads)) return false;
  const leave = { id: 'leave-cobble-talk', label: 'Fair weather to you.', action: closeDialogue };
  const back = () => cobbleConversation(npc, context);
  const told = witness && murder.state.heard.includes(witness.gives);
  const choices = [];
  if (witness && asking) choices.push({
    id: 'ask-bregga', label: told ? 'About Bregga Sell, again.' : 'About Bregga Sell.',
    action: () => { if (!told) act('murder-hear', npc.id);
      openDialogue(npc, [witness.says], null, 'Back to the village', { onComplete: back }); },
  });
  if (isMurderer && asking) choices.push({
    id: 'ask-bregga', label: 'About Bregga Sell.',
    action: () => openDialogue(npc, [
      'They never found the book, you know. Not lost — never found. There is a difference, and nobody here is making it.',
      'She and I read the same barrels from two ends of the quay. If her numbers were wrong it was the counts, and the counts were hers.'],
      null, 'Back to the village', { onComplete: back }),
  });
  if (reads) choices.push({
    id: 'read-them', label: '⟨Read them.⟩',
    action: () => openDialogue(npc, [readingOf(npc.id)], null, 'Let go', { onComplete: back }),
  });
  openDialogue(npc, [...ambient], null, 'Back to the village', { choices: [...choices, leave] });
  return true;
}
