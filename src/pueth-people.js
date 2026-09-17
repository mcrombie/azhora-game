/**
 * The people of Rimeholt, Pueth's timber town on the Feradom road.
 *
 * Ambient conversation only: nobody here moves a quest. Pueth's people speak
 * Drentish and meet outside officials with measured patience; they speak
 * plainly, and the east, where the rebels are, is rumour in their mouths and
 * nothing more. The Legion sentry at the garrison house speaks in orders.
 * No render or DOM dependencies; the host supplies the dialogue box.
 */
import { RIMEHOLT_STANDS, RIMEHOLT } from './pueth-world.js';

const facing = id => {
  const stand = RIMEHOLT_STANDS[id], dx = RIMEHOLT.square.x - stand.x, dz = RIMEHOLT.square.z - stand.z;
  return Math.hypot(dx, dz) > .5 ? Math.atan2(dx, dz) : Math.atan2(RIMEHOLT.across.x, RIMEHOLT.across.z);
};
const person = (id, name, role, modelRole, color) => Object.freeze({ id, name, role, modelRole, color, yaw: facing(id) });

export const PUETH_NPCS = Object.freeze([
  person('rimeholt-reeve', 'Asa Dunmore', 'Reeve of Rimeholt', 'rise-custodian', 0x5f6b72),
  person('rimeholt-innkeeper', 'Wenna', 'Keeper of the Birch Bench', 'shelter-keeper', 0x7a6f5c),
  person('rimeholt-foreman', 'Joss', 'Timber yard foreman', 'forest-woodcutter', 0x62705a),
  person('rimeholt-carter', 'Dagny', 'Carter on the coast road', 'commons-miller', 0x7d6a4c),
  person('rimeholt-trapper', 'Old Harl', 'Trapper from the hills', 'bridge-keeper', 0x6b6150),
  Object.freeze({ id: 'rimeholt-sentry', name: 'Legionary Otho', role: 'Ambroni Legion soldier', modelRole: 'legion-soldier', color: 0x8f3b30, yaw: facing('rimeholt-sentry') }),
]);
export const PUETH_NPC_IDS = Object.freeze(PUETH_NPCS.map(npc => npc.id));

export const PUETH_AMBIENT = Object.freeze({
  'rimeholt-reeve': Object.freeze([
    'Asa Dunmore, reeve, which here means I keep the tally of whose logs are whose and I listen to the Legion when it has something to say.',
    'Ambron buys our birch and sends a captain to count it. That has been the arrangement longer than anyone here has been alive. We are patient with it.',
    'What is east of the valley is the east’s business. The Legion calls them rebels. I call them people I do not trade with this year.',
  ]),
  'rimeholt-innkeeper': Object.freeze([
    'The Birch Bench. There is a fire, there is a bench, and the bench is birch, before you ask. Soup is a copper and the bed is two.',
    'The carters talk about the coast and the trappers talk about the hills, and I charge them both the same for the soup.',
  ]),
  'rimeholt-foreman': Object.freeze([
    'Cold-birch. It grows slow on the north slopes and it bends without splitting. The lake shipwrights at Ambron pay for it by the rib.',
    'We cut in the dry season and haul to the coast landing. This season the barges have not come, so the stacks sit and the men sit with them.',
  ]),
  'rimeholt-carter': Object.freeze([
    'Down to Birch Landing and back, two days with a load. The road south to the Tessen is the Legion’s now; the coast track is still mine.',
    'Goblins in the birch by the sea. I have seen their rags on the trees. I drive past quickly and I do not stop to read them.',
  ]),
  'rimeholt-trapper': Object.freeze([
    'Up past the Grey Shoulder the goblins are the hill kind. Bigger, and they do not run as quick as the little bramble ones down by the Tessen.',
    'There are fires in the east hills that nobody in town lit. I leave them be, and they leave my lines be.',
  ]),
  'rimeholt-sentry': Object.freeze([
    'Halt. State your business in Rimeholt. Hired sword? Then keep to the road and keep your blade sheathed inside the palisade.',
    'The Feradom road is closed by order of the Legate. Nobody passes the barrier north. Report anything moving in the east to the garrison house.',
  ]),
});

/** A plain conversation for one of Rimeholt's people. */
export function puethConversation(npc, context) {
  const { openDialogue, closeDialogue } = context;
  const lines = PUETH_AMBIENT[npc.id];
  if (!lines) return false;
  openDialogue(npc, [...lines], null, 'Back to the road', { choices: [{ id: 'leave-rimeholt-talk', label: 'Good day.', action: closeDialogue }] });
  return true;
}
