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

const person = (id, name, role, modelRole, color) =>
  Object.freeze({ id, name, role, modelRole, color, yaw: COBBLE_STANDS[id].yaw });
const soldier = (id, name, role, modelRole) =>
  Object.freeze({ id, name, role, modelRole, color: 0x8f3b30, yaw: COBBLE_STANDS[id].yaw, armed: false });

export const PEBLOS_NPCS = Object.freeze([
  person('cobble-netmistress', 'Bregga Sell', 'Net-mistress of Cobble', 'rise-custodian', 0x5d7079),
  person('cobble-boatwright', 'Hallin Orme', 'Boatwright', 'forest-woodcutter', 0x6d6a4f),
  person('cobble-lobsterman', 'Maun', 'Lobsterman', 'bridge-keeper', 0x6a7264),
  person('cobble-salter', 'Wyn Tarrow', 'Salter', 'shelter-keeper', 0x7c6a58),
  person('cobble-oldhand', 'Old Pell', 'Pilot, retired', 'commons-miller', 0x6f6657),
  person('cobble-keeper', 'Sela Vane', 'Keeper of the sea shrine', 'rise-custodian', 0x5f6d6b),
  person('cobble-runner', 'Dunnock', 'Quay runner', 'reed-worker', 0x83734e),
  soldier('peblos-decurion', 'Lieutenant Berold Ossan', 'Ambroni officer', 'legion-officer'),
  soldier('peblos-legionary-1', 'Footman Fennor', 'Ambroni soldier', 'legion-soldier'),
  soldier('peblos-legionary-2', 'Footman Nabel', 'Ambroni soldier', 'legion-soldier'),
  soldier('peblos-legionary-3', 'Footman Crick', 'Ambroni soldier', 'legion-soldier'),
]);
export const PEBLOS_NPC_IDS = Object.freeze(PEBLOS_NPCS.map(npc => npc.id));

export const PEBLOS_AMBIENT = Object.freeze({
  'cobble-netmistress': Object.freeze([
    'Bregga Sell. I keep the nets and I keep the tally, which means I am the one who tells a man his boat came in light.',
    'Cobble is what you see: ten roofs, one quay, and the water. Everybody here fishes. The ones who did not fish went to Tidehaven a long time ago and we do not hear from them.',
    'One barrel in five goes to the Empire. That was set when there were twice as many of us to catch it, and nobody has come out to set it again. I say it to the lieutenant once a season and he writes it down.',
  ]),
  'cobble-boatwright': Object.freeze([
    'Hallin Orme. Every hull on this quay came off that slip, and I have mended most of them twice.',
    'Pitch and oakum and a dry week. That is the whole of it. The dry week is the hard part out here.',
    'The boats are small on purpose. A big boat cannot come in over the bar at Cobble, and a small one can go anywhere a man knows the way.',
  ]),
  'cobble-lobsterman': Object.freeze([
    'Maun. Pots, mostly. Lobster and crab off the rocks under the light, and whatever climbs in after them.',
    'Set them at slack water and leave them a night. Set them wrong and the tide walks off with the lot, and then you have made a gift to the sea.',
    'The soldiers do not count pots. There is no fifth barrel in a lobster, so a lobster is mine.',
  ]),
  'cobble-salter': Object.freeze([
    'Wyn Tarrow. I salt and I dry. The racks are mine and the salt house is mine, and the fish belongs to whoever caught it until it is in a barrel.',
    'Salt comes out from Tidehaven by the barrel and goes back inside the fish. If the salt boat is late the whole island smells of it, and I hear about that too.',
  ]),
  'cobble-oldhand': Object.freeze([
    'Pell. I took boats in and out of these channels for forty years and now I sit and watch other people do it worse.',
    'There is no chart of the Pebbles worth the vellum. The rocks move — the sand does, anyway — and the channel that was there in my father’s time is a bank now. You learn it or you do not come.',
    'Keep the Pilot’s Stone on your left hand going out of Tidehaven. On your right hand is where the Sea-Mare put herself, and she had a pilot aboard who knew better.',
  ]),
  'cobble-keeper': Object.freeze([
    'Sela Vane. I keep the niche above the quay swept, and what is in it is what the sea gave back this year.',
    'We do not name it and we do not ask it for anything. The sea is owed, that is all, and a thing put in the niche is a thing not asked for again.',
    'When a boat is out late we light the headland. It is a poor light and it is ours, and I have never once seen the Empire pay for the wood.',
  ]),
  'cobble-runner': Object.freeze([
    'Dunnock. I take the lines and I run the tallies up to the shed and I watch the gulls off the racks. That is three jobs, and I am paid in fish for all three.',
    'You came over with Jess? He is my mother’s cousin. Everybody on this quay is somebody’s cousin, and that is why nothing here stays quiet for long.',
  ]),
  'peblos-decurion': Object.freeze([
    'Lieutenant Berold Ossan, in command of the Empire’s presence in Peblos. The Empire’s presence in Peblos is myself and three men.',
    'We count the catch and we take the fifth barrel. That is the whole of the duty here. No garrison, no wall, no rebels — the nearest thing to an enemy is the weather.',
    'The islanders think the share is too high. They may be right. I write down what Sell tells me and I send it to Ambron, and Ambron has had a war on its hands for a year. Keep your sword sheathed on this quay and you and I will have no business.',
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
