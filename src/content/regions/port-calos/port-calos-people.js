import { PORT_CALOS_NPC_POSITIONS } from './port-calos-world.js';
import { IMANI } from '../../quests/wine/vineyard.js';
import { PORT_CALOS_PLACEHOLDER_NAMES } from './port-calos-roster.js';

// Newly named residents are literal blank mannequins until the user describes them.
// Previously designed people retain their authored appearances and provisional dialogue.
export const PORT_CALOS_NPCS = Object.freeze([
  /**
   * **Christina** (the user, 26 September 2026): "a party nugget whose head looks and spins like a
   * disco ball", in Port Calos for now. Small, in the brightest thing she owns, and her head is a
   * mirror ball that never stops turning (`look.discoHead`, src/content/characters/characters.js).
   */
  Object.freeze({
    id: 'christina', name: 'Christina', role: 'Resident of Port Calos',
    modelRole: 'villager', color: 0xd4388f,
    look: Object.freeze({ discoHead: true, slight: true, beard: false, hat: false, cloak: false, glasses: false }),
    yaw: PORT_CALOS_NPC_POSITIONS.christina.yaw,
  }),
  Object.freeze({
    id: 'port-calos-harbourmaster', name: 'Hallie', role: 'Harbourmaster of Port Calos',
    modelRole: 'ferry-keeper', color: 0x30485e,
    look: Object.freeze({ beard: false, hair: 0xdcc16e, hairStyle: 'long', straightHair: true,
      slight: true, hat: false, staff: false, cloak: false, nautical: true }),
    yaw: PORT_CALOS_NPC_POSITIONS['port-calos-harbourmaster'].yaw,
  }),
  Object.freeze({ id: 'cobble-imani', name: 'Imani', role: 'Resident of Port Calos',
    modelRole: IMANI.modelRole, color: IMANI.color, skin: IMANI.skin,
    look: Object.freeze({ hat: false }), yaw: PORT_CALOS_NPC_POSITIONS['cobble-imani'].yaw }),
  ...PORT_CALOS_PLACEHOLDER_NAMES
    .map(name => Object.freeze({ id: `port-calos-${name.toLowerCase()}`, name,
      role: 'Resident of Port Calos', modelRole: 'villager',
      look: Object.freeze({ blankSlate: true, hat: false }),
      yaw: PORT_CALOS_NPC_POSITIONS[`port-calos-${name.toLowerCase()}`].yaw })),
]);
export const PORT_CALOS_NPC_IDS = Object.freeze(PORT_CALOS_NPCS.map(npc => npc.id));

export const PORT_CALOS_PLACEHOLDER = 'This person could use more characterization.';

/** Basic harbor directions; the host also offers Hallie's sailing choices. */
export function portCalosConversation(npc, { openDialogue, closeDialogue }) {
  if (PORT_CALOS_NPC_IDS.includes(npc?.id) && npc.id !== 'port-calos-harbourmaster') {
    openDialogue(npc, [PORT_CALOS_PLACEHOLDER], null, 'Leave');
    return true;
  }
  if (npc?.id !== 'port-calos-harbourmaster') return false;
  openDialogue(npc, [
    'Hallie, harbourmaster. Welcome to Port Calos. The quay is for sea cargo; the houses and market stay up on the bank.',
    'I can sail you to Tidewater Haven or Peblos. For Nothom, follow the road inland from the market.',
  ], null, 'Back to the harbor', { choices: [
    { id: 'port-directions', label: 'How do I get to Nothom or the other harbors?', action: () => openDialogue(npc, [
      'For Nothom, follow the street inland to the road junction, then turn west toward town. I sail to Tidewater Haven and Peblos from this quay. Jess keeps Tidewater Haven; Maddie keeps the harbor on Peblos.',
    ], null, 'Thank you.') },
    { id: 'leave-port-neighbor', label: 'Good day to you.', action: closeDialogue },
  ] });
  return true;
}
