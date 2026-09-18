/**
 * The people this pass adds to Drent: the two Ardrys who remember Rena, the
 * five villagers of Applegarth, two more in Tidehaven and one on the Greenway.
 *
 * Everyone here speaks plainly, in the register of `docs/content-pass.md`. The
 * age of the two old ones is in what they remember, not in how they talk: they
 * do not quaver, they do not lecture, and they use the old names — Rena, East
 * Rena, Eastreena, Westerina — the way people use the names they grew up with.
 *
 * Pure: no DOM, no three. The host supplies the dialogue box and runs the two
 * actions this module asks for, `take-ardry-letter` and `give-ardry-letter`.
 */
import { RENA_STANDS } from './rena.js';
import { LORN_ID, HESTA_ID, ARDRY_NAMES, ARDRY_PLACES } from './rena-letters.js';

const person = (id, name, role, modelRole, color) => Object.freeze({
  id, name, role, modelRole, color, yaw: RENA_STANDS[id]?.yaw ?? 0,
});

/** Everyone the pass places. The two Ardrys carry the letters; the rest have a line or two each. */
export const RENA_NPCS = Object.freeze([
  person(LORN_ID, 'Lorn Ardry', 'Basket-mender on the shingle', 'rise-custodian', 0x6b6150),
  person(HESTA_ID, 'Hesta Ardry', 'Orchard-keeper of Applegarth', 'shelter-keeper', 0x7a6f5c),
  person('apple-reeve', 'Corwen Vale', 'Reeve of Applegarth', 'rise-custodian', 0x5f6b72),
  person('apple-cider', 'Fenn', 'At the apple press', 'commons-miller', 0x7d6a4c),
  person('apple-cooper', 'Wick', 'Cooper of Applegarth', 'forest-woodcutter', 0x62705a),
  person('apple-carter', 'Aldith', 'Carter on the old road', 'reed-worker', 0x6f6a5c),
  person('apple-young', 'Bern', 'Orchard hand', 'bridge-keeper', 0x6b5d45),
  person('tide-carter', 'Nell Ordway', 'Carter of Tidehaven', 'commons-miller', 0x7d6a4c),
  person('tide-boy', 'Dob', 'Fisher’s boy', 'reed-worker', 0x4f6a66),
  person('greenway-forager', 'Marn', 'Fern-gatherer on the Greenway', 'forest-woodcutter', 0x62705a),
]);
export const RENA_NPC_IDS = Object.freeze(RENA_NPCS.map(npc => npc.id));
const byId = new Map(RENA_NPCS.map(npc => [npc.id, npc]));
export const renaNpc = id => byId.get(id) ?? null;

/** The ambient people: two or more lines each, and the old names in ordinary use. */
export const RENA_AMBIENT = Object.freeze({
  'apple-reeve': Object.freeze([
    'Corwen Vale, reeve. Which in Applegarth means I keep the tally of whose trees are whose, and one year in four somebody disagrees with it.',
    'Applegarth is what we have called ourselves since before my grandfather. The stone at the east end still says Westerina, and the stone is older than the name, and neither of them is wrong.',
    'The Empire’s man comes up from the Torn mouth once a year, counts barrels, and goes away again. That is the whole of Ambron as far as this village has ever seen it, and we would rather keep it that way.',
  ]),
  'apple-cider': Object.freeze([
    'Fenn. The press is mine from the first apple to the last barrel, and I do not let anybody help who has not done it before.',
    'Sharp ones and sweet ones in the same tub, three of sharp to one of sweet. Anybody who tells you otherwise is selling you vinegar with a good story on it.',
  ]),
  'apple-cooper': Object.freeze([
    'Wick. Barrels. Somebody has to make the thing the cider goes in, and it is never the one who gets thanked.',
    'Oak from the upland, and I char the insides. Fenn says it does nothing. Fenn has never drunk out of an uncharred barrel in July.',
  ]),
  'apple-carter': Object.freeze([
    'Aldith. I take the barrels east on the old road twice a season, out past the ruins and down to the main road at the fork.',
    'The road is straighter than the new one and it goes through a dead town, so nobody uses it but me. Suits me. Nobody to pull over for.',
    'Old Hesta at the top of the village grew up with the man who mends pots on the shingle at Tidehaven. Brother and sister. I have offered to carry for them and she will not have a letter she cannot watch you fold.',
  ]),
  'apple-young': Object.freeze([
    'Bern. I pick, I carry, I stack. Ask Corwen anything that needs a thought put into it.',
    'I have been through the ruins once, on a dare, at midday, and I came back the long way round the orchards and I am not going again. There is nothing in there. That is the trouble with it.',
  ]),
  'tide-carter': Object.freeze([
    'Nell Ordway. Fish and salt inland, grain and iron back. I know every rut between here and the Avrel clearing by the way the cart complains.',
    'There is a fork off the main road past the timber landing that goes north to the old town. Nobody goes up it but the Applegarth carter, and she is the only one who keeps the brambles off it.',
  ]),
  'tide-boy': Object.freeze([
    'I bring Old Lorn his withies. He does not pay me. He tells me things instead, and some of them are worth more than a copper and some of them are not.',
    'He calls this place Eastreena when he forgets. My grandmother used to as well. Nobody else does.',
  ]),
  'greenway-forager': Object.freeze([
    'Marn. Fern for thatch and moss for packing, and in a good week the makings of a dye nobody else in Drent can mix.',
    'There is a stone in the fern west of the bench, sunk to its shoulders. EAST RENA, it says. I clear the fern off it twice a year because somebody ought to.',
  ]),
});

// ---------------------------------------------------------------------------
// The two who remember
// ---------------------------------------------------------------------------
const RAZING = Object.freeze([
  'Ambron was away out of Drent for thirty years when I was born, and the lords did what the lords of Drent always do: they made a congress, and the congress met at Rena, because Rena was not any one lord’s town.',
  'Then Ambron came back. The Lord Protector came up from the Torn mouth wanting thirty years of arrears, and every lord with a river mouth to lose made his own bargain and rode home, one at a time, in a morning.',
  'What was left to meet the Protector’s men outside Rena was Rena. The fight was short. Then they took the town apart — not burned only, taken apart, course by course, so that nothing could meet there again.',
  'Drent has been quiet ever since. People say quiet as though it were a kind of peace. It is the other kind.',
]);

const LORN_OPENING = Object.freeze([
  'Mind the withies. Right. Sit if you want; the stones are dry this side.',
  'Lorn Ardry. I mend pots. Crab pots, eel pots, anything that has to hold a thing that wants out.',
  'Eighty-seven, if that is the question behind your face. I was six when Rena went, and I am the last man in this village who saw it whole.',
]);

const HESTA_OPENING = Object.freeze([
  'You came up the old road. Nobody comes up the old road but Aldith, and Aldith does not stop to look at my door.',
  'Hesta Ardry. I keep the orchard and I dry the fruit, and when the press is running I tell Fenn he is doing it wrong, which is the only exercise I get.',
  'Eighty-nine. I was eight when the town went, and I am the last woman here who remembers what the street sounded like full.',
]);

/** Shared topics. `again` reopens the conversation they came from. */
function topics(npc, context, again) {
  const { openDialogue } = context;
  const self = npc.id === LORN_ID;
  const talk = lines => openDialogue(npc, lines, null, 'Back to our conversation', { onComplete: again });
  return [
    { id: 'ask-rena', label: 'What was Rena?', action: () => talk(self ? [
      'The town. Not a town — the town, in the middle of Drent, where the roads met and the market was. Everything in this country used to face inward at it.',
      'Three streets and a hall and a market cross, and my father’s house on the north side with a rowan by the door.',
      'It is all still there, if you go and look. Just lower.',
    ] : [
      'Rena. The principal town of Drent, and the only one that was not somebody’s port, which is exactly why they could afford to lose it.',
      'The well still works. I would rather you heard that from me than found it out yourself and thought it was a happy thing.',
    ]) },
    { id: 'ask-razing', label: 'Who pulled it down?', action: () => talk([...RAZING]) },
    { id: 'ask-names', label: self ? 'You called this place Eastreena.' : 'The stone says Westerina.', action: () => talk(self ? [
      'So I did. That is its name. Eastreena — East Rena — because it was the village east of Rena, and there is no other reason for it in the world.',
      'They changed it to Tidehaven when I was a young man. New name for a place that had stopped being east of anywhere. I have never got my mouth round it.',
      'You will not hear it from anybody else. Dob says it back to me sometimes to be kind.',
    ] : [
      'West Rena. Westerina in anybody’s mouth who was not writing it down. There was an East Rena as well, on the coast, and it is called Tidehaven now.',
      'We were Applegarth inside ten years. Nobody voted on it. People stopped saying the old name the way you stop wearing a coat.',
      'The stone is still there because moving a stone is work and nobody was being paid for it.',
    ]) },
    { id: 'ask-other', label: self ? 'Is there anyone else who remembers?' : 'Your brother in Tidehaven.', action: () => talk(self ? [
      'One. My sister Hesta, at Applegarth, up the old road at the west end of it. Eighty-nine and sharper than me, which she would want said.',
      'We were parted at the bound stone outside the east gate that morning. Mother took her west and Aunt Yarrow took me east, and neither of us has ever been told why it was decided that way.',
      'Eleven years since I saw her. Neither of us can walk it any more, and neither of us will say so first.',
    ] : [
      'Lorn. Eighty-seven and still mending other people’s pots for nothing, if I know him.',
      'We were parted at the bound stone by the east gate on the day, and we have made the walk a dozen times in eighty years and not once in the last eleven.',
      'He will have told you it was the roof of the hall he saw. He did not see the roof. Ask him.',
    ]) },
  ];
}

/** Lorn on the Tidehaven shingle, and Hesta at her door in Applegarth. */
export function ardryConversation(npc, context) {
  const { letters, openDialogue, closeDialogue, act } = context;
  if (npc.id !== LORN_ID && npc.id !== HESTA_ID) return false;
  const again = () => ardryConversation(npc, context);
  const self = npc.id;
  const other = self === LORN_ID ? HESTA_ID : LORN_ID;
  const leave = { id: 'leave-ardry', label: letters.complete ? 'I will look in again.' : 'Good day.', action: closeDialogue };

  // The first meeting is the introduction and the four topics, and no letter: the
  // errand is found by asking whether anybody else remembers. The meeting is
  // recorded as the conversation opens, because a dialogue that offers choices
  // is never "completed" — the host shows its choices on the last line instead.
  if (!letters.hasMet(self)) {
    act('meet-ardry', self);
    openDialogue(npc, [...(self === LORN_ID ? LORN_OPENING : HESTA_OPENING)], null, 'Back to the road', {
      choices: [...topics(npc, context, again), leave],
    });
    return true;
  }

  const held = letters.carried(), next = letters.pending();
  const choices = [];

  // The letter in hand comes first: this is what the traveler walked here for.
  if (held && held.to === self) {
    choices.push({ id: 'give-ardry-letter', label: `Give ${ARDRY_NAMES[held.from]}’s letter to ${ARDRY_NAMES[self]}.`, action: () => act('give-ardry-letter', self) });
  } else if (!held && next && next.from === self) {
    choices.push({ id: 'take-ardry-letter', label: letters.leg === 0
      ? `I am going west. I will carry a letter to ${ARDRY_NAMES[other]}.`
      : `I will take that to ${ARDRY_NAMES[other]}.`, action: () => act('take-ardry-letter', self) });
  }
  choices.push(...topics(npc, context, again), leave);

  const line = letters.complete
    ? (self === LORN_ID
      ? 'Six letters, and the last one told me a thing I had waited eighty years to be forgiven for without ever asking. You did that. Sit down and have some of this.'
      : 'It is done, then. Eighty years of two people being careful, undone by somebody with strong legs. You are welcome in this house whenever you are on this road.')
    : held && held.to === self ? (self === LORN_ID ? 'That is her hand. Give it here.' : 'From him. Well. Give it to me and stop looking pleased with yourself.')
    : held ? `That one is for ${ARDRY_NAMES[held.to]}, at ${ARDRY_PLACES[held.to]}. It is not going to get there in my hands.`
    : next && next.from === self ? (letters.leg === 0
      ? 'If you are going west along the old road, you will come out at Applegarth. There is somebody there I have not written to in eleven years, and I have been meaning to, which is what people my age say instead of no.'
      : 'I have the answer written. It took me two days and one of them was spent not writing it.')
    : `Nothing from ${ARDRY_NAMES[other]} yet? Then you have not been there yet. It is a fair walk and there is a dead town in the middle of it.`;

  openDialogue(npc, [line], null, 'Back to the road', { choices });
  return true;
}

/** Everybody else this pass places: one short conversation each. */
export function renaConversation(npc, context) {
  if (npc.id === LORN_ID || npc.id === HESTA_ID) return ardryConversation(npc, context);
  const lines = RENA_AMBIENT[npc.id];
  if (!lines) return false;
  const { openDialogue, closeDialogue } = context;
  openDialogue(npc, [...lines], null, 'Back to the road', { choices: [{ id: 'leave-rena-talk', label: 'Good day.', action: closeDialogue }] });
  return true;
}

export function renaLines(id) {
  if (RENA_AMBIENT[id]) return [...RENA_AMBIENT[id]];
  if (id === LORN_ID) return [...LORN_OPENING];
  if (id === HESTA_ID) return [...HESTA_OPENING];
  return [];
}
export { RAZING as RENA_RAZING };
