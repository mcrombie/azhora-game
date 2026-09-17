/**
 * Lumber Town: the people of Luscia's market town.
 *
 * Ambient conversation only — nobody here moves the road quest or the chapter —
 * except the timber-and-cloth stall, where a careful line of questioning finds
 * the republic's contact. No render or DOM dependencies; the host supplies the
 * dialogue box, the satchel and the campaign.
 */
import { townPoint } from './regions.js';

export const TOWN_NPCS = Object.freeze([
  Object.freeze({ id: 'town-innkeeper', name: 'Bettis', role: 'Keeper of the Sawyer’s Rest', modelRole: 'shelter-keeper', color: 0x7d7561 }),
  Object.freeze({ id: 'town-carter', name: 'Pell', role: 'Carter', modelRole: 'commons-miller', color: 0x8a7550 }),
  Object.freeze({ id: 'town-elder', name: 'Iria', role: 'Of the town council', modelRole: 'rise-custodian', color: 0x6c7488 }),
  Object.freeze({ id: 'timber-stall', name: 'Hara', role: 'Timber and cloth stall', modelRole: 'rise-custodian', color: 0x86694f }),
  Object.freeze({ id: 'town-sawyer', name: 'Marek', role: 'Sawyer', modelRole: 'forest-woodcutter', color: 0x6f7b5e }),
  Object.freeze({ id: 'town-yardhand', name: 'Tolm', role: 'Timber yard hand', modelRole: 'bridge-keeper', color: 0x5f7d74 }),
]);

export const TOWN_NPC_IDS = Object.freeze(TOWN_NPCS.map(npc => npc.id));

/** Smiths's round of the square, starting on his own patch. */
export const TOWN_BEGGAR_ROUTE = Object.freeze([
  townPoint(0, -4), townPoint(-7, 3), townPoint(4, 8), townPoint(-3, -8), townPoint(-13, 1),
]);

/** The region and side the stall keeper's arc belongs to, for the campaign call. */
export const REBEL_CONTACT = Object.freeze({ npcId: 'timber-stall', region: 'Luscia', side: 'coalition',
  reveal: Object.freeze(['hara-legion', 'hara-other-side', 'hara-families']) });

const ambient = {
  'town-innkeeper': [
    'The Sawyer’s Rest, and you are welcome in it, though I will want a coin for the bed and not a chit. The Legion pays in chits now.',
    'Eleven roofs, a well and a sawpit. We were a village until the timber trade found us, and a town before anybody thought to ask us.',
  ],
  'town-carter': [
    'Four loads a week down to the Caloss landing, and the long timber goes on the barges from there. Or it did, before the road filled up with soldiers.',
    'I have hauled for imperial contractors and I have hauled for the valley. Same cart, same oxen, same hill. Only the arguing changes.',
  ],
  'town-elder': [
    'Town council, if two of us in a doorway is a council. We keep the well clean and we keep the peace, and lately that is the same job.',
    'Half the men who went out to the Lauvel came from these houses. We do not put that on a board for the Legion to read.',
  ],
  'town-sawyer': [
    'Mind the pit as you pass. Two of us on a saw, one above and one below, and the one below eats the dust. I have done twenty years below.',
    'Elm for wheels, oak for keels, and the straight pine for the Legion’s palisades. They ask for the pine now and they ask politely, which is new.',
  ],
  'town-yardhand': [
    'Stacked and strapped, and if you take one off the top it will take the other four with it. Stand clear and I will not have to shout.',
    'The yard hires anybody with a back. I came up from Elod’s road with nothing and Marek did not ask me a single question.',
  ],
};

/** Conversations for the town. The stall keeper's is a chain; everybody else's is plain. */
export function townConversation(npc, context) {
  const { openDialogue, closeDialogue } = context;
  const back = { id: 'leave-town-talk', label: 'Back to the square.', action: closeDialogue };
  if (npc.id === REBEL_CONTACT.npcId) return stallConversation(npc, context);
  const lines = ambient[npc.id] ?? ['Good day to you.'];
  openDialogue(npc, [...lines], null, 'Back to the square', { choices: [...(context.extraChoices?.(npc) || []), back] });
}

/**
 * Hara keeps a stall of timber offcuts and cloth. She is the republic's contact
 * in Lumber Town, and she stays a stallholder unless the traveler asks what the
 * town makes of the Legion, offers to hear the other side, and then says the
 * families out here did not ask for this. Any other reply leaves her a
 * stallholder, and nothing is recorded.
 */
function stallConversation(npc, context) {
  const { campaign, openDialogue, closeDialogue, act } = context;
  const joined = campaign?.state?.arcs?.Luscia === REBEL_CONTACT.side;
  const back = { id: 'leave-town-talk', label: 'Back to the square.', action: closeDialogue };
  const again = () => stallConversation(npc, context);
  const say = (lines, choices) => openDialogue(npc, lines, null, 'Back to the square', { choices: [...choices, back] });
  const plain = (id, label, lines) => ({ id, label,
    action: () => openDialogue(npc, lines, null, 'Back to the stall', { onComplete: again }) });

  if (joined) {
    return say([
      'Cloth on the left, offcuts on the right, and whatever else you came for is not on the table. Word went south with the carter. They know your name at Solis.',
      'Keep buying something when you stop here. A stall with no customers gets looked at.',
    ], [plain('hara-after', 'How does word travel from here?', [
      'Timber goes down to the landing, the landing talks to the barges, the barges reach the coast, and a name in a cloth order is only a name in a cloth order.',
      'That is all you need of it. The less you can tell a sergeant, the better for both of us.',
    ])]);
  }

  // Step three: the reveal.
  const families = () => openDialogue(npc, [
    'No. They did not.',
    'You have said three careful things and none of them were careless. So: the republic is not a word out of Ambron’s register to me. I have carried for it since before the Lauvel, and I will carry for it after.',
    'The rangers who got out of that field are on the East Suval border, living off Elod’s neutrality and thin soup. They need somebody the pickets wave through. You have a Legion errand and a Legion face.',
  ], null, 'Answer her', { choices: [
    { id: 'hara-join', label: 'Tell me what the rangers need.', action: () => { closeDialogue(); act('join-luscia-rebels'); } },
    { id: 'hara-decline', label: 'I will keep this to myself. That is all I can promise.',
      action: () => openDialogue(npc, [
        'That is worth more than a promise to help and no nerve behind it. Keep it, then, and buy some cloth on your way past.',
      ], null, 'Back to the square', { onComplete: closeDialogue }) },
  ] });

  // Step two: she tests the ground.
  const otherSide = () => openDialogue(npc, [
    'The other side of a stall is the same stall. What other side would that be?',
  ], null, 'Answer her', { choices: [
    { id: 'hara-families', label: 'The families out here did not ask for this.', action: families },
    { id: 'hara-rebels', label: 'The rebels, then. Where are they hiding?',
      action: () => openDialogue(npc, [
        'Rebels. There is the word. I sell cloth, and I sell it to whoever is standing in front of me.',
        'Timber offcuts are two for a coin. That is the whole of my politics.',
      ], null, 'Back to the square', { onComplete: closeDialogue }) },
  ] });

  // Step one: an ordinary complaint, carefully worded.
  const legion = () => openDialogue(npc, [
    'The Legion? They pay for what they take, mostly. They took the long pine in the spring and left chits, and the chits are still chits.',
    'Nobody in this square will say more than that to a stranger, and you should not read anything into it either way.',
  ], null, 'Answer her', { choices: [
    { id: 'hara-other-side', label: 'I would hear the other side of it.', action: otherSide },
    { id: 'hara-loyal', label: 'The Legion keeps the road open, at least.',
      action: () => openDialogue(npc, [
        'It does. And an open road is good for a stall. There, we agree, and that is a comfortable place to stop.',
      ], null, 'Back to the square', { onComplete: closeDialogue }) },
  ] });

  return say([
    'Offcuts, shingles, and cloth by the ell. If you want the good linen it is under the counter, out of the dust.',
    'You are the one the clerk has running errands. Do not look surprised; the square watches the square.',
  ], [
    { id: 'hara-legion', label: 'What does the town make of the Legion?', action: legion },
    plain('hara-timber', 'What does a lumber town sell?', [
      'Straight pine and elm, mostly, cut in the yard and hauled to the Caloss landing. Every stick of it has grown since the last war, which tells you how long the quiet lasted.',
      'And cloth, because somebody has to, and because a stall of nothing but wood gets dull by noon.',
    ]),
  ]);
}
