import { PORT_CALOS_NPC_POSITIONS } from './port-calos-world.js';

// Port Calos receives only the civilian explicitly requested for it. Shared
// town scenery does not imply an invented cast of shopkeepers and neighbors.
export const PORT_CALOS_NPCS = Object.freeze([
  Object.freeze({
    id: 'port-calos-harbourmaster', name: 'Maddie', role: 'Harbourmaster of Port Calos',
    modelRole: 'rise-custodian', color: 0x415d70,
    look: Object.freeze({ beard: false, hair: 0x61412d, hairStyle: 'long', straightHair: true,
      slight: true, hat: false, staff: false, cloak: false }),
    yaw: PORT_CALOS_NPC_POSITIONS['port-calos-harbourmaster'].yaw,
  }),
]);
export const PORT_CALOS_NPC_IDS = Object.freeze(PORT_CALOS_NPCS.map(npc => npc.id));

/** Basic harbor directions; the host also offers Maddie's sailing choices. */
export function portCalosConversation(npc, { openDialogue, closeDialogue }) {
  if (npc?.id !== 'port-calos-harbourmaster') return false;
  openDialogue(npc, [
    'Maddie, harbourmaster. Welcome to Port Calos. The quay is for sea cargo; the houses and market stay up on the bank.',
    'I can sail you to Tidewater Haven or Peblos. For Nothom, follow the road inland from the market.',
  ], null, 'Back to the harbor', { choices: [
    { id: 'port-directions', label: 'How do I get to Nothom or the other harbors?', action: () => openDialogue(npc, [
      'For Nothom, follow the street inland to the road junction, then turn west toward town. I sail to Tidewater Haven and Peblos from this quay. Jess keeps Tidewater Haven; Howie keeps the harbor on Peblos.',
    ], null, 'Thank you.') },
    { id: 'leave-port-neighbor', label: 'Good day to you.', action: closeDialogue },
  ] });
  return true;
}
