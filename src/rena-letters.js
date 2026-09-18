/**
 * The Ardrys' letters: the one errand the ruins of Rena leave behind.
 *
 * Lorn Ardry mends crab pots on the shingle at Tidehaven. Hesta Ardry keeps an
 * orchard at Applegarth. They are brother and sister, they were six and eight
 * when Rena burned, they were parted at the town's bound stone that morning, and
 * neither of them can make the walk any more. The traveler carries six letters
 * over three exchanges: what they remember, what they disagree about, and what
 * each of them has never told the other. At the end of it they have caught up,
 * and both of them are fond of you.
 *
 * The only reward is that standing — the same `friendship` Lysa's acorn favour
 * gives (`src/acorn-quest.js`). No coin, no item: `REWARD_HOOK` below is where a
 * later reward goes.
 *
 * Pure: no DOM, no three. The host supplies the dialogue box, the satchel and
 * the journal; `src/rena-people.js` holds the conversations.
 */
export const RENA_LETTERS_VERSION = 1;
export const RENA_LETTERS_ID = 'the-ardrys-letters';
export const RENA_LETTERS_TITLE = 'The Ardrys’ letters';
/** The folded sheet in the satchel while it is being carried. */
export const LETTER_ITEM = 'ardry-letter';

export const LORN_ID = 'rena-lorn', HESTA_ID = 'rena-hesta';
export const ARDRY_IDS = Object.freeze([LORN_ID, HESTA_ID]);
const OTHER = Object.freeze({ [LORN_ID]: HESTA_ID, [HESTA_ID]: LORN_ID });
export const ARDRY_NAMES = Object.freeze({ [LORN_ID]: 'Lorn', [HESTA_ID]: 'Hesta' });
export const ARDRY_PLACES = Object.freeze({ [LORN_ID]: 'Tidehaven', [HESTA_ID]: 'Applegarth' });

/**
 * Nothing is paid for this yet. When the user decides what the errand is worth,
 * the grant goes here and in the host's `rena-letters-done` action: the quest
 * itself only records that both of them are fond of the traveler.
 */
export const REWARD_HOOK = Object.freeze({ id: 'rena-letters-reward', granted: false, note: 'Unpaid on purpose: the standing is the whole reward for now.' });

const letter = (id, from, subject, hand, text, handed) => Object.freeze({
  id, from, to: OTHER[from], subject, hand, text: Object.freeze(text), handed: Object.freeze(handed),
});

/**
 * The six letters, in the order they are carried. `hand` is what the sheet looks
 * like in the satchel; `text` is what it says; `handed` is what the person who
 * receives it says while they read it.
 */
export const LETTERS = Object.freeze([
  // --- First exchange: what they remember.
  letter('lorn-1', LORN_ID, 'What I remember', 'A single sheet folded in three, unsealed, written large and slowly in a hand that presses hard.', [
    'Hesta. There is a traveler in Tidehaven going west who says they will carry this, so you are getting a letter instead of nothing, which is what you have had from me for eleven years.',
    'I will tell you what I have first, in case you want to know. My hands still work. I mend pots on the shingle and the boys bring me withies and do not pay me, and I let them.',
    'What I remember is the roof of the hall going. Not the fire. The roof. It lifted a little first, the whole of it together, like the lid coming off a pot, and then it went in. I was six and I thought that was a thing roofs did.',
    'After that the road, and being carried, and Aunt Yarrow’s shoulder in my stomach the whole way east.',
    'Do you remember the roof? Tell me you do. There is nobody else left alive who saw it.',
  ], [
    'She turns the sheet over before she reads it, as if there might be more on the back.',
    '“Eleven years. He has counted them, then. So have I.”',
  ]),
  letter('hesta-1', HESTA_ID, 'No, and here is why', 'A smaller sheet, written close and fast, with a brown thumbprint at one corner that smells of apples.', [
    'Lorn.',
    'No. I do not remember the roof and I do not believe you saw it, because by the time the hall went we were past the bound stone and Aunt Yarrow had you on her shoulder facing the other way.',
    'What I remember is the smoke coming first. A whole morning of it and no fire anywhere, and the men from the river mouths riding away east on the good road while we stood in the street and watched them go. That is the part that never gets told. They did not lose. They left.',
    'And I remember the parting at the stone. Mother took my hand and Aunt Yarrow took you and there was no argument about it, which is the thing I have never understood, because there was time for one.',
    'I keep an orchard. My hands work too. Send your traveler back.',
  ], [
    'He reads it twice. The second time his mouth moves.',
    '“Eighty years and she is still telling me what I did not see. Good. Good.”',
  ]),
  // --- Second exchange: what they disagree about.
  letter('lorn-2', LORN_ID, 'He went back for the horses', 'The same large, hard-pressed hand, and the last line gone over twice so the ink stands up off the sheet.', [
    'Hesta. Then you may have the smoke and I will keep the roof, and we will both be right, which is how it has always gone with us.',
    'But there is one I will not let you have.',
    'Father went back down the street after we were out. You have said all your life that he went back for the box. He did not. He went back for the horses, because he was the only man in that street who could bring a frightened horse out of a stable, and I saw him turn in at Arder’s yard, and I watched that door until Aunt Yarrow carried me round the bend.',
    'I am eighty-seven. I would like it written down somewhere by somebody who is not me that he went back for the horses.',
  ], [
    'She reads it standing, and does not sit down afterwards.',
    '“Oh, Lorn.” She folds it very small. “Wait there. This one is not going to be short.”',
  ]),
  letter('hesta-2', HESTA_ID, 'He went back for the book', 'Four sheets, written both sides, the first line larger than the rest.', [
    'Lorn. You are eighty-seven and you are wrong, and I am eighty-nine, so I shall say it plainly and you will have to take it.',
    'He did not go back for the box and he did not go back for the horses. He went back for the ledger.',
    'He was the congress’s tallyman. Every acre and boat and toll in Drent that was not a river lord’s own was written in that book in his hand. When the Protector’s men came up from the Torn, the lords of the river mouths each made their own bargain and rode home, and what was left in Rena was our father, a market town that belonged to nobody in particular, and the book that said who owned what.',
    'He knew what pulling a town down means. It does not mean burning it. It means that in thirty years nobody can prove anything was ever there. He went back for the book so that it could be proved.',
    'He did not come out. The book did not come out either. I have never found any record that it did.',
    'I am not ashamed of him and you are not to be either. He went back for us, Lorn. In our father’s trade, a book was how a man went back for people.',
  ], [
    'He holds the sheets a long way off and reads them very slowly.',
    '“The tally.” He looks at the water for a while. “He used to let me hold the ruler. I had forgotten I ever knew that.”',
  ]),
  // --- Third exchange: what neither of them has said.
  letter('lorn-3', LORN_ID, 'The byre door', 'Sealed with candle wax, and then broken open again by the same thumb before it was handed over.', [
    'Hesta.',
    'I have not slept since your letter, which at my age is not the loss it would once have been.',
    'You have given me eighty years of the wrong thing and taken it back in four pages, so you may as well have mine.',
    'I left the byre door open. That morning. I had been told twice and I went to look at the smoke instead, and the beasts were out in the street when we came down it, and we were slow because of them, and we were still at the bound stone when the horsemen came up the hill, and that is why Father turned round.',
    'I have never said that to anybody. There is nobody else left to say it to.',
    'I sealed this and then I broke the seal again, because if a stranger is to carry it they may as well know what they are carrying. At eighty-seven a man is finished with pretending.',
  ], [
    'She reads it sitting on the bench by her door, and does not look up for a long while.',
    '“You had better come inside,” she says to you. “This one wants two cups of something first.”',
  ]),
  letter('hesta-3', HESTA_ID, 'I saw you do it', 'A single sheet, written slowly and evenly, with a second, smaller sheet folded inside it and addressed to the traveler.', [
    'Lorn, my dear, I saw you do it.',
    'I was eight and I was at the corner with the water and I watched you swing that door, and I said nothing then, and I have said nothing since. If you have carried it for eighty years then so have I, and we are a pair of old fools who could have put it down in an afternoon any time these eighty years.',
    'And the beasts were not why we were slow. We were slow because Mother would not leave without the doorpost stone with our name cut in it, and she stood in that street with a chisel like a woman with all the day in front of her.',
    'I have it in my window. ARDRY, and the R gone shallow at the end where she hurried.',
    'It is too heavy to send, and you are too old to come, and I am too old to go. All three are true and none of them matters now, because you know it is here and I know that you know.',
    '(To the traveler, and you may read this, since you have read the rest: there is a bed in this house and cider in the press and neither is going anywhere. And you have done a thing this year that you will be glad of when you are as old as we are.)',
  ], [
    'He reads it on the shingle with a pot half mended across his knees, and does not finish the pot that day.',
    '“She saw me.” He laughs, which turns into a cough, which turns back into a laugh. “Eighty years, and the old article saw me the whole time.”',
  ]),
]);

export const LETTER_COUNT = LETTERS.length;
export const EXCHANGES = LETTER_COUNT / 2;
const byId = new Map(LETTERS.map(entry => [entry.id, entry]));
export const letterById = id => byId.get(id) ?? null;

export function validateRenaLettersSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== RENA_LETTERS_VERSION) return false;
  if (!Number.isInteger(data.leg) || data.leg < 0 || data.leg > LETTER_COUNT) return false;
  if (typeof data.carrying !== 'boolean') return false;
  if (data.carrying && data.leg >= LETTER_COUNT) return false;     // nothing left to carry once they have caught up
  if (!Array.isArray(data.met) || data.met.length > ARDRY_IDS.length) return false;
  if (new Set(data.met).size !== data.met.length || !data.met.every(id => ARDRY_IDS.includes(id))) return false;
  // A letter cannot have been taken from somebody the traveler has never met.
  if ((data.leg > 0 || data.carrying) && !data.met.includes(LORN_ID)) return false;
  return true;
}

export function createRenaLetters({ onEvent = () => {} } = {}) {
  const state = { leg: 0, carrying: false, met: [] };

  const complete = () => state.leg >= LETTER_COUNT;
  /** The letter the traveler is carrying, or null. */
  const carried = () => (state.carrying && !complete() ? LETTERS[state.leg] : null);
  /** The letter that is next to be taken, and from whom, or null when they are done. */
  const pending = () => (complete() ? null : LETTERS[state.leg]);
  const hasMet = id => state.met.includes(id);

  function meet(id) {
    if (!ARDRY_IDS.includes(id)) return { ok: false, first: false };
    const first = !hasMet(id);
    if (first) { state.met.push(id); onEvent({ type: 'ardry-met', id, name: ARDRY_NAMES[id] }); }
    return { ok: true, first };
  }

  /** Take the next letter from whoever is holding it. The satchel carries the sheet. */
  function take(npcId, inventory) {
    const next = pending();
    if (!next) return { ok: false, reason: 'They have said everything they had to say to each other.' };
    if (state.carrying) return { ok: false, reason: `You are already carrying a letter for ${ARDRY_NAMES[carried().to]}.` };
    if (next.from !== npcId) return { ok: false, reason: `It is ${ARDRY_NAMES[next.from]}’s turn to write.` };
    if (inventory && !inventory.add?.(LETTER_ITEM, 1)) return { ok: false, reason: 'There is no room in your satchel for it.' };
    state.carrying = true;
    meet(npcId);
    onEvent({ type: 'letter-taken', id: next.id, from: npcId, to: next.to, letter: next });
    return { ok: true, letter: next, reason: '' };
  }

  /**
   * Give the letter to the one it is addressed to. The exchange is atomic: if
   * the sheet cannot leave the satchel, nothing else moves either.
   */
  function deliver(npcId, inventory) {
    const held = carried();
    if (!held) return { ok: false, reason: 'You have no letter to give.' };
    if (held.to !== npcId) return { ok: false, reason: `That letter is for ${ARDRY_NAMES[held.to]}, at ${ARDRY_PLACES[held.to]}.` };
    if (inventory && inventory.has?.(LETTER_ITEM) && !inventory.remove?.(LETTER_ITEM, 1))
      return { ok: false, reason: 'The letter will not come out of your satchel.' };
    state.carrying = false;
    state.leg += 1;
    meet(npcId);
    const done = complete();
    onEvent({ type: 'letter-delivered', id: held.id, to: npcId, letter: held, complete: done });
    if (done) onEvent({ type: 'ardrys-caught-up', friendship: 'fond' });
    return { ok: true, letter: held, complete: done, reason: '' };
  }

  /** Every letter the traveler has read: the delivered ones, and the one in hand. */
  function read() {
    const seen = LETTERS.slice(0, state.leg);
    const held = carried();
    return held ? [...seen, held] : seen;
  }

  /** Both of them end fond of you; before that, each one warms as soon as you have carried for them. */
  const friendship = id => (!ARDRY_IDS.includes(id) ? 'unfamiliar'
    : complete() ? 'fond'
    : state.leg >= (id === LORN_ID ? 1 : 2) ? 'friendly'
    : hasMet(id) ? 'acquainted' : 'unfamiliar');
  const friendshipLabel = id => ({ fond: 'Fond of you', friendly: 'Glad to see you', acquainted: 'Acquaintance', unfamiliar: 'A stranger' })[friendship(id)];

  /**
   * Under way: a letter has been taken. Meeting them is not the errand — the old
   * man only asks once he has told you there is a sister — so nothing is put on
   * the traveler's banner before then.
   */
  const started = () => state.leg > 0 || state.carrying;

  /** The side-quest banner while the errand is under way. */
  function task() {
    if (complete() || !started()) return null;
    const held = carried();
    if (held) return { id: RENA_LETTERS_ID, title: RENA_LETTERS_TITLE, stage: 'carrying', target: held.to,
      detail: `Carry ${ARDRY_NAMES[held.from]}’s letter to ${ARDRY_NAMES[held.to]} at ${ARDRY_PLACES[held.to]}. J · Read it` };
    const next = pending();
    return { id: RENA_LETTERS_ID, title: RENA_LETTERS_TITLE, stage: 'waiting', target: next.from,
      detail: `${ARDRY_NAMES[next.from]} at ${ARDRY_PLACES[next.from]} has an answer ready.` };
  }

  /** What the journal shows: the standing, the errand, and every letter read so far. */
  function view() {
    const held = carried(), pages = read();
    return {
      id: RENA_LETTERS_ID, title: RENA_LETTERS_TITLE,
      started: hasMet(LORN_ID) || hasMet(HESTA_ID),
      complete: complete(), exchanges: EXCHANGES, delivered: state.leg, total: LETTER_COUNT,
      carrying: !!held, task: task(),
      detail: complete()
        ? 'Lorn Ardry and Hesta Ardry have caught up. Eighty years, six letters and one doorpost stone: there is nothing left that either of them is keeping back.'
        : held ? `You are carrying ${ARDRY_NAMES[held.from]}’s letter to ${ARDRY_NAMES[held.to]} at ${ARDRY_PLACES[held.to]}.`
        : started() ? `${ARDRY_NAMES[pending().from]} at ${ARDRY_PLACES[pending().from]} is writing the next one.`
        : 'Lorn Ardry mends pots on the Tidehaven shingle. He has a sister at Applegarth he has not written to in eleven years, and he has been meaning to.',
      standing: `${ARDRY_NAMES[LORN_ID]}: ${friendshipLabel(LORN_ID)} · ${ARDRY_NAMES[HESTA_ID]}: ${friendshipLabel(HESTA_ID)}`,
      pages: pages.map(entry => ({
        id: entry.id, heading: `${ARDRY_NAMES[entry.from]} to ${ARDRY_NAMES[entry.to]} · ${entry.subject}`,
        sealed: false, lines: [...entry.text],
      })),
    };
  }

  function snapshot() { return { version: RENA_LETTERS_VERSION, leg: state.leg, carrying: state.carrying, met: [...state.met] }; }

  function restore(data) {
    state.leg = 0; state.carrying = false; state.met = [];
    if (!validateRenaLettersSnapshot(data, { allowMissing: false })) return false;
    state.leg = data.leg; state.carrying = data.carrying; state.met = [...data.met];
    return true;
  }

  return {
    meet, take, deliver, read, task, view, snapshot, restore, friendship, friendshipLabel,
    carried, pending, hasMet,
    get complete() { return complete(); },
    get leg() { return state.leg; },
    get carrying() { return state.carrying; },
    get met() { return [...state.met]; },
  };
}
