/**
 * The people of Solis and the Coalition's camp outside it: both garrisons, the
 * contingents' captains, and the townsfolk. Pure: no DOM, no three; the host
 * supplies the dialogue box and the border chapter.
 *
 * Garrisons carry an occupation stake (`src/occupation.js`): the Coalition's
 * people are out while the Coalition holds West Suval, the army's while the
 * Empire does. Townsfolk hold nothing and stay whoever holds the gate; each has
 * a line for each holder. While the army is still clearing the square after
 * the border battle the city is 'routed' (`solisHolder`), and neither garrison
 * stands.
 *
 * Tone (docs/content-pass.md): the army speaks in orders; Suvali and townsfolk
 * speak plainly. The townsfolk remember being a kingdom, resent the Empire, and
 * are not yet sure of the Republic.
 */
import { SOLIS_STANDS } from './west-suval.js';
import { SACK_MEMORIES } from './solis-sack.js';

const REGION = 'West Suval';
const COALITION = Object.freeze({ holds: 'coalition', region: REGION });
const EMPIRE = Object.freeze({ holds: 'empire', region: REGION });
const person = (id, name, role, modelRole, color, stake = null) => Object.freeze({ id, name, role, modelRole, color, ...(stake ?? {}), ...SOLIS_STANDS[id] });

export const SOLIS_NPCS = Object.freeze([
  // The Coalition's watch on the gates.
  person('solis-gate-captain', 'Sergeant Davo Kell', 'Suvali gate watch, the Gate of Sun Horses', 'suvali-guard', 0x55636f, COALITION),
  person('solis-gate-guard-west', 'Suvali spearman', 'Gate watch', 'suvali-guard', 0x6a7f3e, COALITION),
  person('solis-gate-guard-east', 'Izoli marine', 'Gate watch', 'suvali-guard', 0x3f6fb0, COALITION),
  person('solis-quay-guard', 'Island marine', 'The quay gate', 'suvali-guard', 0x3f9a6b, COALITION),
  // A captain for each contingent in the camp, and the whole Pyrosi contingent's spokesman.
  person('camp-captain-izoli', 'Captain Ruan Delisse', 'Captain of the Izoli companies', 'suvali-guard', 0x3f6fb0, COALITION),
  person('camp-captain-suval', 'Captain Hadrin Sorell', 'Captain of the Suvali companies', 'suvali-guard', 0x6a7f3e, COALITION),
  person('camp-captain-rebels', 'Captain Severin Dask', 'Captain of the Ambroni rebels', 'suvali-guard', 0x7d3f58, COALITION),
  person('camp-captain-selemis', 'Captain Ithren Mael', 'Captain of the Selemi contingent', 'suvali-guard', 0x2f7f7a, COALITION),
  person('camp-captain-marosh', 'Captain Gorvan Tesk', 'Captain of the Marosh riders', 'suvali-guard', 0xb0773a, COALITION),
  person('camp-captain-islands', 'Captain Pello Arrant', 'Captain for the island cities', 'suvali-guard', 0x3f9a6b, COALITION),
  person('camp-pyrosi', 'Kesh', 'Of the Pyrosi contingent', 'suvali-guard', 0x9a3a26, COALITION),
  // The townsfolk: nobody's garrison.
  person('solis-merchant', 'Aurel Mendo', 'Oil and wine merchant', 'commons-miller', 0x8a6a3e),
  person('solis-fountain-woman', 'Nerea', 'Water-carrier at the king’s fountain', 'rise-custodian', 0x5e7f96),
  person('solis-porter', 'Bastian', 'Quay porter', 'reed-worker', 0x7a6a50),
  person('solis-elder', 'Old Ismer', 'Who has watched the gate change hands', 'shelter-keeper', 0x8a7f6a),
  person('solis-temple-keeper', 'Keeper Ilaria', 'Of the temple of sea and sun', 'rise-custodian', 0xd2b56a),
  person('solis-innkeeper', 'Dorotea', 'Keeper of the Bronze Mare', 'shelter-keeper', 0xa0503a),
  // The army's occupation, smaller than the Coalition's garrison.
  person('solis-legion-gate-west', 'Soldier', 'The army’s watch on the Gate of Sun Horses', 'legion-soldier', 0x8f3b30, EMPIRE),
  person('solis-legion-gate-east', 'Soldier', 'The army’s watch on the Gate of Sun Horses', 'legion-soldier', 0x8f3b30, EMPIRE),
  person('solis-legion-square', 'Soldier', 'On the market square', 'legion-soldier', 0x8f3b30, EMPIRE),
  person('solis-tribune-clerk', 'Clerk Anselm Venn', 'Captain Brulan’s clerk, in the Court of Oaths', 'relay-clerk', 0x832d2b, EMPIRE),
]);
export const SOLIS_NPC_IDS = new Set(SOLIS_NPCS.map(npc => npc.id));
export const SOLIS_TOWNSFOLK_IDS = Object.freeze(SOLIS_NPCS.filter(npc => !npc.holds).map(npc => npc.id));

/** The captains introduce themselves in two lines: who they are, and why they came. */
const CAPTAINS = Object.freeze({
  'camp-captain-izoli': [
    'Ruan Delisse, of the Izoli Republic. We raised this war and we pay for most of it, which the other contingents are good enough to mention every day.',
    'In Izol a citizen can shout down a magistrate in the square and still be home for supper. In Ambron they hang men for less. I would like my sons to keep the first habit.',
  ],
  'camp-captain-suval': [
    'Hadrin Sorell, of the Suvali companies. These are our downs. My men walked here from their own farms, which makes it the shortest march in this army.',
    'The Empire taxed the oil twice and the wine three times and called it order. When the Izoli sails came into the harbour, somebody had the gate open before they knocked.',
  ],
  'camp-captain-rebels': [
    'Severin Dask. I kept the Emperor’s tax rolls in the heartland for eleven years, so I know to the copper what it costs a family to be ruled from Ambron.',
    'The prince who gave up his name sits with the council. I did not follow him because he was a prince. I followed him because he stopped being one.',
  ],
  'camp-captain-selemis': [
    'Ithren Mael, of Selemis. My island keeps ledgers, not banners, but the council wanted a banner in the line, so there is a banner.',
    'Ambron closed three of our harbours with one proclamation. A merchant can live with pirates and with weather. He cannot live with a proclamation.',
  ],
  'camp-captain-marosh': [
    'Gorvan Tesk, of Marosh. We came up the desert road with horses that do not care for your grass. Neither do I.',
    'Marosh has a king, and nobody in this camp has asked me to hang him. We are here because the Emperor’s tax farmers came down our road with an army behind them.',
  ],
  'camp-captain-islands': [
    'Pello Arrant, for the island cities. You will not find our cities on an imperial map, and that is most of what we like about them.',
    'The Empire’s ships started putting in at our harbours to count things. We sent them home once. We would rather do it here than closer to home.',
  ],
  'camp-pyrosi': [
    'Kesh, of the Pyrosi contingent. The whole contingent is in that one tent. The rest of our army is at home fighting goblins and a cult, and the Emperor did not wait for us to finish.',
    'On our terraces there is a fire that has not gone out in four hundred years. I carried an ember of it here. No, you may not see it.',
  ],
});

/** Townsfolk speak for whoever holds the gate: one line each for the Coalition, the Empire, and the day between. */
const TOWNSFOLK = Object.freeze({
  'solis-merchant': {
    coalition: [
      'Oil from the lower terraces, wine from the upper, and hard coin only. The Republic’s quartermaster came by this morning with a fistful of paper and called it scrip.',
      'Paper, printed in Izol, signed by a council that sits in a borrowed hall, payable when the war is won. I asked him which war. He did not laugh.',
    ],
    empire: ['The army pays in coin, I will say that for it, and then takes the coin back at the tax house by the gate. I kept the Republic’s scrip. It lights a lamp.'],
    routed: ['Shutters closed and jars counted. Whoever comes through that gate next will want wine, and will not want to pay for it.'],
  },
  'solis-fountain-woman': {
    coalition: ['The water still runs through the king’s pipes, whoever holds the gate. My grandmother carried it for the palace. I carry it for whoever is thirsty, and this week that is Izoli marines.'],
    empire: ['The army put a sentry on the fountain as if we might poison it. It was the king’s fountain before it was the Emperor’s. The bronze horse on it never learned to salute.'],
    routed: ['Everyone is indoors. The fountain does not know who won. It runs.'],
  },
  'solis-porter': {
    coalition: ['The island ships come in half full of soldiers and go out full of our oil. The council says it pays for itself. My back says otherwise.'],
    empire: ['The army wants the boom chain up every night and a tally of every hull in the harbour. The fishing boats are the only ones still going out.'],
    routed: ['The council’s ship went out on the night tide with its lamps dark. Nobody told the porters. We found the empty berth in the morning.'],
  },
  'solis-elder': {
    coalition: ['I was a boy when the last king swore on those steps. Then the Emperor’s governors swore there. Now it is a council, and they swear a great deal. I am waiting to see what any of it is worth.'],
    empire: ['They have hung the Marshal’s standard where the Republic’s flag was, where the Emperor’s was before that, where the sun-horse was before any of them. The steps have outlasted every one.'],
    routed: ['Three masters in one life, and I have watched the gate change hands from this bench every time. Sit down. It takes a day or two.'],
  },
  'solis-temple-keeper': {
    coalition: ['The guest house of the temple is open to anyone who comes in unarmed. The Coalition’s wounded are in it now. Last month it was the army’s.'],
    empire: ['The Captain’s men asked whether the temple would give thanks for the Emperor’s victory. I told them the sea and the sun keep no side. They wrote that down.'],
    routed: ['Come in off the street if you have nowhere else to be. There is bread, and the doors are thick.'],
  },
  'solis-innkeeper': {
    coalition: ['The Bronze Mare has beds. The Republic’s officers pay for theirs in coin, which surprised me. The men from the camp drink on paper, which does not.'],
    empire: ['Army officers in every room and a chit for each. The Empire held this city for three years, from the night of the fire. I know exactly what a chit is worth.'],
    routed: ['The bar is shut. Whoever holds the gate by supper can buy the first round.'],
  },
});

const GARRISON = Object.freeze({
  'solis-gate-guard-west': ['Suvali, from the downs. Bandits took a wine cart on the south road last week and the wolves have had two lambs from the fold by the road. The war gets the blame for both.'],
  'solis-gate-guard-east': ['Izoli marine. We came ashore under that gate a week ago. The children threw flowers at the horses and then at us.'],
  'solis-quay-guard': ['Nobody takes a boat out without the council’s pass. The fishermen are furious. The fish are delighted.'],
  'solis-legion-gate-west': ['Solis is under the army’s protection. Keep to the street and keep your hands where they can be seen.'],
  'solis-legion-gate-east': ['Papers at the gate from sunset. Rebels, deserters and hired swords of the rebels are to be reported to the Captain.'],
  'solis-legion-square': ['The square is closed by order of Captain Brulan. Trade resumes when the Captain says it does. Move along.'],
  'solis-tribune-clerk': ['Captain Brulan’s clerk. Every paper the rebel council left behind is being catalogued. What they signed is evidence now. Do not touch the table.'],
});

/** What a townsperson says under a holder, and then what they remember of the fire (src/solis-sack.js). */
export const townsfolkLines = (id, holder) => [...(TOWNSFOLK[id]?.[holder] ?? TOWNSFOLK[id]?.coalition ?? []), ...(SACK_MEMORIES[id] ? [SACK_MEMORIES[id]] : [])];
export const captainLines = id => [...(CAPTAINS[id] ?? [])];

/** Sergeant Kell reads the Marshal's seal: the second stage of the border chapter. */
function gateCaptain(npc, context) {
  const { border, openDialogue, closeDialogue, act } = context;
  const stage = border?.view?.().stage ?? 'not-started', side = border?.view?.().side ?? null;
  const leave = { id: 'leave-solis-gate', label: 'Back to the road.', action: closeDialogue };
  const offered = border?.availableActions?.().find(item => item.id === 'enter-solis');
  if (stage === 'pass-gate' && offered) {
    openDialogue(npc, [
      'Hold there. That is an army seal on your satchel, and this is the Coalition’s gate.',
      'Terms from Venmor for the envoy. Everyone in the camp has been waiting to hear what the Marshal thinks we are worth. Show me the seal and keep your hand off the hilt.',
    ], null, 'Back to the road', { choices: [{ ...offered, action: () => { closeDialogue(); act('enter-solis'); } }, leave] });
    return;
  }
  const lines = stage === 'meet-envoy' ? ['Up the main street, past the square, to the Court of Oaths. The envoy is inside. You have an escort; you will not notice it.']
    : side === 'coalition' ? [context.border?.view?.().entryOrigin==='luscia'
      ? 'Hara’s word came ahead of you from Nothom. No Imperial seal is needed here. Captain Arlen Voss has the Republican companies just inside the gate.'
      : 'Orren says you are one of ours now. Then this is your gate as much as mine.']
      : side === 'empire' ? ['You gave the envoy your answer. The gate is open to you going out. Do not come back up this road with the army behind you.']
        : ['The Gate of Sun Horses is open by day to anyone with business and a sheathed blade. Keep yours sheathed.'];
  openDialogue(npc, lines, null, 'Back to the road', { choices: [leave] });
}

/**
 * Conversations for Solis and the camp. `context.holder` is who holds the city
 * on the ground ('coalition', 'empire' or 'routed'); `context.border` is the
 * border chapter, for Sergeant Kell. Returns false for anyone not from Solis.
 */
export function solisConversation(npc, context) {
  if (!SOLIS_NPC_IDS.has(npc?.id)) return false;
  const { openDialogue, closeDialogue, holder = 'coalition' } = context;
  const back = { id: 'leave-solis-talk', label: 'Back to the street.', action: closeDialogue };
  if (npc.id === 'solis-gate-captain') { gateCaptain(npc, context); return true; }
  const lines = CAPTAINS[npc.id] ?? (TOWNSFOLK[npc.id] ? townsfolkLines(npc.id, holder) : GARRISON[npc.id] ?? ['Good day.']);
  openDialogue(npc, [...lines], null, CAPTAINS[npc.id] ? 'Back to the camp' : 'Back to the street', { choices: [back] });
  return true;
}
