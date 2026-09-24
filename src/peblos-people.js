/**
 * The people of Cobble, the fishing village in the Pebbles, and the Empire's
 * small garrison there.
 *
 * Ambient conversation only: nobody here moves a quest. The islanders speak
 * plainly and at their own speed, the way people do who see one boat a week;
 * the army speaks in orders and requisitions. Only Imperial soldiers wear army
 * armour, and soldiers are men by default.
 *
 * The seam to write on is the Empire's share of the catch — one barrel in five,
 * counted on the quay — and it is a seam, not a quest: the islanders are sour
 * about the tally and not about the men, and the men are bored and not cruel.
 * No render or DOM dependencies; the host supplies the dialogue box.
 */
import { COBBLE_STANDS } from './peblos-world.js';
import { IMANI } from './vineyard.js';

const person = (id, name, role, modelRole, color, look = null, skin = undefined) =>
  Object.freeze({ id, name, role, modelRole, color, yaw: COBBLE_STANDS[id].yaw,
    ...(look ? { look: Object.freeze(look) } : {}), ...(skin !== undefined ? { skin } : {}) });
const soldier = (id, name, role, modelRole) =>
  Object.freeze({ id, name, role, modelRole, color: 0x8f3b30, yaw: COBBLE_STANDS[id].yaw, armed: false });

/**
 * **Cobble, after the murder.** Bregga Sell, who kept the nets and the tally, is the woman who
 * was killed — she is not in this list because she is not in the world any more, and the line she
 * used to say ("I am the one who tells a man his boat came in light") is the motive
 * (src/murder-quest.js). The islanders who stood with her have gone with her, at the user's word
 * of 22 September 2026, and these four stand in their places.
 */
export const PEBLOS_NPCS = Object.freeze([
  // **Jessi**: long red and green hair in a ponytail, and glasses. She fishes, and she teaches it.
  person('cobble-jessi', 'Jessi', 'Fisher, of Cobble', 'pond-fisher', 0x4d6f63,
    { hair: 0x8c2f2a, hairSplit: 0x3f6b46, hairStyle: 'long-tied', glasses: true }),
  // **Ari**: brown skin, curly black hair. The village's own accountant, who keeps Cobble's books
  // against the Empire's tally — and who was not where she says she was.
  person('cobble-ari', 'Ari', 'Keeper of the village books', 'rise-custodian', 0x6a5f7d,
    { hair: 0x1d1a18, hairStyle: 'curls', slight: true, beard: false, cloak: false, staff: false }, 0xa9713f),
  // **Imani**: the vine keeper, in Cobble for kelp for Vaervelm Caelazh, and therefore the only
  // person who was at the racks before light. She is the same woman who keeps the vines at the
  // winery and she is built from the same entry (src/vineyard.js), so her skin and her green
  // cannot drift from hers by somebody typing a second Imani out by hand.
  person('cobble-imani', IMANI.name, 'Vine keeper, here for the kelp', IMANI.modelRole, IMANI.color, null, IMANI.skin),
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
  // murder is Troy's quest and lives in src/murder-quest.js; this is the rest of them.
  'cobble-jessi': Object.freeze([
    'Jessi. I fish, and I will show anybody else how to, which in Cobble is like offering to teach somebody to breathe.',
    'Everyone is very careful around me this week because I said out loud that I am not sorry. I am not going to start being sorry to make the week easier for them.',
    'The green is not dye, before you ask. It is, but I have stopped explaining it.',
  ]),
  'cobble-ari': Object.freeze([
    'Ari. I keep the village’s books, which means I write down what we actually landed and then I read what the Empire says we landed, and then I have a think.',
    'Two of those numbers have disagreed for years. Nobody wanted to hear it from a woman with a ledger, and now somebody is dead about it.',
    'I like it up here. You can see a long way out, and you can see who is coming in.',
  ]),
  'cobble-imani': Object.freeze([
    'Imani. I keep the vines at Vaervelm Caelazh, and the vines want kelp, and the kelp is here — so twice a year I am here, smelling of the sea and getting in everybody’s way.',
    'They have been very kind to me and nobody has told me anything. I am the outsider, so I am the one it is safe to be kind to.',
    'I am up before light for the racks. That is when the weed is heaviest and cheapest, and nobody else wants it.',
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
