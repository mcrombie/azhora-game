/**
 * The people of Cobble, the fishing village in the Pebbles, and the Empire's
 * small garrison there.
 *
 * Ambient conversation only: nobody here moves a quest. Most islanders speak
 * in the compressed Drentish of the pilot families: few words, concrete work.
 * The army speaks in orders and requisitions. Only Imperial soldiers wear army
 * armour, and soldiers are men by default.
 *
 * The seam to write on is the Empire's share of the catch — one barrel in five,
 * counted on the quay — and it is a seam, not a quest: the islanders are sour
 * about the tally and not about the men, and the men are bored and not cruel.
 * No render or DOM dependencies; the host supplies the dialogue box.
 */
import { COBBLE_STANDS } from './peblos-world.js';

const person = (id, name, role, modelRole, color, look = null, skin = undefined) =>
  Object.freeze({ id, name, role, modelRole, color, yaw: COBBLE_STANDS[id].yaw,
    ...(look ? { look: Object.freeze(look) } : {}), ...(skin !== undefined ? { skin } : {}) });
const soldier = (id, name, role, modelRole) =>
  Object.freeze({ id, name, role, modelRole, color: 0x8f3b30, yaw: COBBLE_STANDS[id].yaw, armed: false });

/**
 * **Cobble, after the murder.** Bregga Sell, who kept the nets and the tally, is the woman who
 * was killed — she is not in this list because she is not in the world any more, and the line she
 * used to say ("I am the one who tells a man his boat came in light") is the motive
 * (src/content/quests/roadside/murder-quest.js). The islanders who stood with her have gone with her, at the user's word
 * of 22 September 2026, and these four stand in their places.
 */
export const PEBLOS_NPCS = Object.freeze([
  // Brenna repairs salvaged hulls and refuses to flatter the mainland's tally.
  person('cobble-boatwright', 'Brenna Vell', 'Boatwright of the Long Bars', 'bridge-keeper', 0xb07943,
    { hair: 0xac5832, hairStyle: 'cropped', slight: true, beard: false, cloak: false, hat: false }, 0xcf9c71),
  // Orren keeps written cargo accounts, never the pilotage his family teaches by eye.
  person('cobble-ledgerkeeper', 'Orren Pell', 'Keeper of Cobble’s cargo books', 'rise-custodian', 0x38556e,
    { hair: 0xc8c0aa, hairStyle: 'receding', beard: true, glasses: true,
      glassesColor: 0xa98747, cloak: false, staff: false, hat: false }, 0xb78562),
  // Sivra trades the kelp from Sorven. Her tied hair and reed basket form a narrow silhouette.
  person('cobble-kelp-trader', 'Sivra Noll', 'Kelp trader from Sorven', 'reed-worker', 0x924957,
    { hair: 0x241f1b, hairStyle: 'long-tied', slight: true, beard: false, hat: false, kelpBasket: true }, 0x79553d),
  // **Torven Oss**: he holds the weigh-beam, and he has held it a long time.
  person('cobble-weighmaster', 'Torven Oss', 'Weighmaster of the quay', 'commons-miller', 0x6f6657),
  soldier('peblos-decurion', 'Lieutenant Berold Ossan', 'Ambroni officer', 'legion-officer'),
  soldier('peblos-legionary-1', 'Footman Fennor', 'Ambroni soldier', 'legion-soldier'),
  soldier('peblos-legionary-2', 'Footman Nabel', 'Ambroni soldier', 'legion-soldier'),
  soldier('peblos-legionary-3', 'Footman Crick', 'Ambroni soldier', 'legion-soldier'),
]);
export const PEBLOS_NPC_IDS = Object.freeze(PEBLOS_NPCS.map(npc => npc.id));

export const PEBLOS_AMBIENT = Object.freeze({
  // **What each of them will say when they are only passing the time.** What they say about the
  // murder is Troy's quest and lives in src/content/quests/roadside/murder-quest.js; this is the rest of them.
  'cobble-boatwright': Object.freeze([
    'Brenna Vell. Boats, not promises. If the seam opens, bring it before the next tide.',
    'A wreck belongs to the island that gets to it. That plank was a merchant’s rail. Now it keeps a fishing boat afloat. Better work for it.',
    'My mother called the inlet from the bow. I mend the hulls she brings through. Follow her boat without hiring a pilot and you may bring me work too.',
    'Bregga called our full loads short three weeks running. I said I was not sorry when she died. Cruel thing to say. Still said it. That does not mean I struck her.',
  ]),
  'cobble-ledgerkeeper': Object.freeze([
    'Orren Pell. Cargo goes in the book. The bar does not. A written channel is yesterday’s channel; my grandchildren learn the water from the bow.',
    'The Empire wants one barrel in five. It counts every barrel. I count them too. Counts agree. Weights do not. I have put that in writing twice.',
    'Up here I can see the skerry. Sometimes people need a boat brought through quietly. No names. The water does not ask whose coat you wore.',
    'We settle things together here. When the whole quay stops lending you rope, you tend to listen. A mainland court would take longer.',
  ]),
  'cobble-kelp-trader': Object.freeze([
    'Sivra Noll. Sorven. I bring kelp across the Stills, before the mainland buyers decide what it ought to cost.',
    'Fresh water holds better under Sorven than the northern sands. My aunt moved her house twice. Never left the island. The island moved under her.',
    'The racks are fullest before light. I sort the dry from the wet then. A buyer can cheat a stranger on weight; not on what is in her own hands.',
    'They offer me a chair and tell me the weather. Kind people. Very careful kindness since the woman died.',
  ]),
  'cobble-weighmaster': Object.freeze([
    'Torven Oss. I hold the beam. Every barrel that goes off this quay goes across it first and I have written the number for eleven years.',
    'It is not interesting work and I will not pretend it is. You stand, you look at a needle, you say a number.',
    'Bad business about Bregga. She and I did the same job from two ends of it.',
  ]),
  'peblos-decurion': Object.freeze([
    'Lieutenant Berold Ossan, in command of the Empire’s presence in Peblos. The Empire’s presence in Peblos is myself and three men.',
    'We count the catch and we take the fifth barrel. That is the whole of the duty here. No garrison, no wall, no rebels — the nearest thing to an enemy is the weather.',
    'The islanders think the share is too high. They may be right. I wrote down what Sell told me and I sent it to Ambron, and Ambron has had a war on its hands for a year and did not write back.',
    'Now Sell is dead, and I have four men and no authority to ask anybody here a question they do not want to answer. The guild has sent somebody. Let him. Keep your sword sheathed on this quay and you and I will have no business.',
  ]),
  'peblos-legionary-1': Object.freeze([
    'Sixty-one days. Ask me tomorrow and I will tell you sixty-two.',
    'The duty is the quay. Count the barrels in, mark the fifth, stand here. Nobody has ever landed here who was not carrying fish.',
  ]),
  'peblos-legionary-2': Object.freeze([
    'Four hundred and twelve barrels this season, and I have counted every one of them twice because the lieutenant likes a clean column.',
    'They are not rebels, before you ask. They are people who wish the number were six instead of five. That is not the same thing, whatever the reports say.',
  ]),
  'peblos-legionary-3': Object.freeze([
    'You are the first person off a boat in three weeks who was not from here. Say something. Anything.',
    'There is a wreck on the next island but one, and a cove full of seals, and a light nobody lights. That is Peblos. I have seen all of it twice.',
  ]),
});

/** A plain conversation for one of Cobble's people. */
export function peblosConversation(npc, context) {
  const { openDialogue, closeDialogue } = context;
  const lines = PEBLOS_AMBIENT[npc.id];
  if (!lines) return false;
  const legion = npc.id.startsWith('peblos-');
  openDialogue(npc, [...lines], null, legion ? 'Back to the quay' : 'Back to the village',
    { choices: [{ id: 'leave-cobble-talk', label: legion ? 'Lieutenant.' : 'Fair weather to you.', action: closeDialogue }] });
  return true;
}
