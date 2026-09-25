import { PORT_CALOS_NPC_POSITIONS } from './port-calos-world.js';

const person = (id, name, role, modelRole, color, look = {}) => Object.freeze({
  id: `port-calos-${id}`, name, role, modelRole, color, look: Object.freeze(look),
  yaw: PORT_CALOS_NPC_POSITIONS[`port-calos-${id}`].yaw,
});

export const PORT_CALOS_NPCS = Object.freeze([
  person('harbourmaster', 'Caella', 'Harbourmaster of Port Calos', 'rise-custodian', 0x415d70,
    { beard: false, hair: 0x443127, hairStyle: 'long-tied', staff: false, cloak: false }),
  person('innkeeper', 'Halom', 'Keeper of the River Lantern', 'commons-miller', 0x8a684f),
  person('fishmonger', 'Meriel', 'Fishmonger at the river market', 'pond-fisher', 0x4c756d,
    { beard: false, hair: 0x8b5b36, hairStyle: 'long-tied' }),
  person('netmaker', 'Lessa', 'Netmaker of the Caloss', 'bridge-keeper', 0x8c795a,
    { beard: false, hair: 0xbeb6a0, hairStyle: 'long-tied' }),
  person('shipwright', 'Oswen', 'Shipwright at the river mouth', 'forest-woodcutter', 0x65714b),
  person('carter', 'Talom', 'Carter on the Nothom road', 'commons-miller', 0x7b634e),
  person('resident', 'Brenn', 'A retired river pilot', 'bridge-keeper', 0x59667a,
    { hair: 0xb9b3a1 }),
  person('dockhand', 'Velom', 'Dockhand on the outer quay', 'commons-miller', 0x886648,
    { beard: false, hair: 0x27211d }),
]);
export const PORT_CALOS_NPC_IDS = Object.freeze(PORT_CALOS_NPCS.map(npc => npc.id));

const LINES = Object.freeze({
  'port-calos-harbourmaster': [
    'Welcome to Port Calos. Caella, harbourmaster. River cargo on the inner bank, sea cargo on the long quay. If somebody leaves a barrel in the middle of the road, you have my permission to shout.',
    'Jess keeps her boat beside the outer quay. She can take you back to Tidewater Haven. For Nothom, take the road inland through the market; you are already in Luscia.',
  ],
  'port-calos-innkeeper': [
    'Halom. The River Lantern is mine, though half the dock seems to think it belongs to them. Leave the river mud at the door and we shall get along.',
    'Most travelers come down from Nothom with timber or go up with salt and fish. Coming by sea saves you the long road through Drent. It does nothing about the mud once you get here.',
  ],
  'port-calos-fishmonger': [
    'Meriel. That lot came out of the inlet this morning. The river fish go on the other slab. People here can tell the difference before I have finished unloading.',
    'The boats leave on the tide. The market opens when the boats get back. That is the whole of our timetable.',
  ],
  'port-calos-netmaker': [
    'A knot is a small thing until it is the one that lets the whole catch out. Sit in the sun a little and you will see how many small things there are in one net.',
    'The Caloss brings branches down after rain. The sea puts shells through the mesh. Between them they keep me in work. Lessa, if you need a name for the complaint.',
  ],
  'port-calos-shipwright': [
    'Oswen. Mind the shavings. River boats want a shallow bottom; sea boats want something that will take a wave. A fellow who asks for both usually means he cannot afford two boats.',
    'Timber comes down from the woods. We shape it here, tar it here, and hope it comes home here. That last part is beyond a shipwright.',
  ],
  'port-calos-carter': [
    'Nothom? Follow the road out of the market to the inland junction, then west to town. Keep to the road unless you want to find out why I keep spare wheels.',
    'I carry salt up and timber down. Armies ask me what side I am on. The side with a sound axle, usually.',
  ],
  'port-calos-resident': [
    'I used to bring ships through that mouth in weather you would not put a dog out in. Now I watch younger fools do it. Brenn. Retired, before you ask.',
    'The long quay reaches into the inlet. The town keeps to this bank. Give a river room to leave the land and it is much less likely to come through your kitchen.',
  ],
  'port-calos-dockhand': [
    'Stand clear of the ropes, please. A loose rope lies still right up until it takes your feet away.',
    'Jess is alongside. Tidewater Haven by water, Nothom by road. Either way, you can carry your own bag; these sacks have already claimed my back for the morning.',
  ],
});

/** Town conversation uses the ordinary NPC system and never advances a campaign. */
export function portCalosConversation(npc, { openDialogue, closeDialogue }) {
  const lines = LINES[npc?.id];
  if (!lines) return false;
  openDialogue(npc, [...lines], null, 'Back to the harbor', { choices: [
    { id: 'port-directions', label: 'How do I get to Nothom or back to Tidewater Haven?', action: () => openDialogue(npc, [
      'For Nothom, follow the street inland through the market to the road junction, then turn west toward town. Jess waits with her boat at the end of the harbor quay; she sails back to Tidewater Haven.',
    ], null, 'Thank you.') },
    { id: 'leave-port-neighbor', label: 'Good day to you.', action: closeDialogue },
  ] });
  return true;
}
