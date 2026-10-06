/**
 * **The people of Ovesos for the Farmlands of the Lizeem** (docs/lizeem-farmlands-design.md 6.6; the user, 5 October
 * 2026: "go ahead and add people characters as needed with mythological names... Give them roles in the society",
 * and on 6 October 2026, "keep building everything"). Mesopotamian names, as the design gives Ovesos: Enbilulu the
 * gods' canal inspector, Nisaba of writing and accounts, Ziusudra who was warned of the Flood, Ashnan and Lahar of the
 * debate between grain and sheep, Ezina, another name of the grain, Ninkasi whose hymn is a beer recipe, and Uttu of
 * weaving. King Melos of the house Oveth-Hold is the lore's own king; he is spoken of, and his seal is on every grant,
 * but he is never placed.
 *
 * Each stands where src/ovesos-farm.js puts them (`OVESOS_NPC_STANDS`): Velsorten on the terrace, the divider and the
 * warden's hut at the canal head, Ashnan's house at the tail, the mill, the brewhouse, the fulling mill, and Lahar's
 * camp on the upland grass. Their looks are the design's, in the figure kit's words (src/characters.js
 * `createCharacter`): women as the kit's slight figure in a long dress, men on the hired company's body. Nobody wears
 * a hat. What the kit cannot draw - Ashnan's dust-coloured scarf and Ezina's hair-cloth (both would be headgear),
 * Enbilulu's wet hem, Nisaba's reed pens, Lahar's sling, the flour on Ezina's arms and the blue on Uttu's hands - is
 * left to the role and the lines.
 *
 * Talk: two or three lines each in the game's dry voice, the first a self-introduction, and a topic hub
 * (`ovesosConversation`) for the arc's roles (src/lizeem-ovesos.js): Nisaba's register, the rights she sells, the
 * Harvest Close and the hearing; Enbilulu's lesson, salt and the canal head; Ziusudra's grant, seniority and his
 * draw; Ashnan's millet, her witness and the porridge; Lahar's roasted barley before trade, and his offence at a
 * refusal; Ezina's mill and the flatbread; Ninkasi's ale; Uttu's cloth and the dye crop. The voice is the lore's
 * Ovesian one: careful, long-memoried and slightly aggrieved, and always asking who was here first and what the
 * document said. Trading is the market's (`context.openTrade`); the buyers and the register board are registered
 * here, at the top level, so whoever imports this module (the game, the save's validator, a test) has them.
 *
 * Pure: no DOM, no three; the host supplies the dialogue box.
 */
import { OVESOS_NPC_STANDS } from './ovesos-farm.js';
import { registerBoards, registerBuyers } from './merchants.js';
import { purse } from './economy.js';
import { ASHNAN_DUES, HEAD_STRETCHES, OVESOS_DISHES, OVESOS_ROLES, OVESOS_STAGES, SENIORITY, SETTLE_COPPER } from './lizeem-ovesos.js';

const freeze = Object.freeze;
/** `person(id, name, role, modelRole, color)` as src/amod-people.js has it, at the stand Velsorten keeps for them. */
const person = (id, name, role, modelRole, color, { look, ...extra }) => {
  const stand = OVESOS_NPC_STANDS[id];
  return freeze({ id, name, role, modelRole, color, hat: false, look: freeze({ ...look }), x: stand.x, z: stand.z, yaw: stand.yaw ?? 0, ...extra });
};
const GREY = 0x8e8a83, WHITE = 0xeeebe4;

// ---------------------------------------------------------------------------
// Ovesos (design 6.6)
// ---------------------------------------------------------------------------
export const OVESOS_PEOPLE = freeze([
  // Fifties, dark skin, shaved head, a close grey beard, a wet hem; the measuring rod is the kit's staff.
  person(OVESOS_ROLES.enbilulu, 'Enbilulu', 'Canal-warden of the Water Council', 'mercenary', 0x5f6b6e,
    { look: { build: 'wiry', headgear: 'bare', hairStyle: 'bald', hair: GREY, facialHair: 'trimmed', garment: 'robe', weapon: 'staff' }, skin: 0x6b4a32, essential: true }),
  // Forties, black hair oiled and coiled, a white robe.
  person(OVESOS_ROLES.nisaba, 'Nisaba', 'Clerk and registrar of the Water Council', 'villager', 0xe8e4da,
    { look: { slight: true, dress: true, hair: 0x14110f, hairStyle: 'long-tied' }, skin: 0xb98a64, essential: true }),
  // Seventies, a long white beard, a fine blue robe, gold at the ears.
  person(OVESOS_ROLES.ziusudra, 'Ziusudra', 'Head of the oldest house on the canal', 'mercenary', 0x2e4a7a,
    { look: { build: 'tall-lean', headgear: 'bare', hairStyle: 'fine', hair: WHITE, facialHair: 'long', garment: 'robe', marks: ['earring'] }, skin: 0xc08e66, essential: true }),
  // Thirties, thin, dark hair (the scarf over it stays in her lines), a patched brown dress.
  person(OVESOS_ROLES.ashnan, 'Ashnan', 'Tenant farmer at the canal’s tail', 'villager', 0x6b5038,
    { look: { slight: true, dress: true, hair: 0x2a1d14, hairStyle: 'long-tied' }, skin: 0xb98a64, essential: true }),
  // Fifties, wind-burnt, grey hair braided, sheepskin over a tunic.
  person('lahar', 'Lahar', 'Headman of the upland herders', 'mercenary', 0x7a6a4f,
    { look: { build: 'raw-boned', headgear: 'bare', hairStyle: 'braid', hair: GREY, facialHair: 'stubble', garment: 'fur-mantle' }, skin: 0xc98a68 }),
  // Forties, strong, brown hair bound back (the cloth over it stays in her lines), flour to the elbows.
  person(OVESOS_ROLES.ezina, 'Ezina', 'Miller on the canal', 'villager', 0xcdc6b4,
    { look: { slight: true, dress: true, hair: 0x5c4124, hairStyle: 'long-tied' }, skin: 0xc49470, essential: true }),
  // Thirties, dark curls (the kit's short curls: its long curls are over a civilian's triangles), a stained blue apron.
  person('ninkasi', 'Ninkasi', 'Brewer of Velsorten', 'villager', 0x3d5a80,
    { look: { slight: true, dress: true, hair: 0x1e1612, hairStyle: 'curls' }, skin: 0xb98a64 }),
  // Sixties, white hair cropped, a grey smock.
  person('uttu', 'Uttu', 'Fuller and dyer', 'villager', 0x8a8a86,
    { look: { slight: true, dress: true, hair: WHITE, hairStyle: 'short-cropped' }, skin: 0xc49470 }),
]);
export const OVESOS_PEOPLE_IDS = freeze(OVESOS_PEOPLE.map(npc => npc.id));
const ids = new Set(OVESOS_PEOPLE_IDS);
export const isOvesosNpc = id => ids.has(id);
/** Who trades at all (`context.openTrade`); Nisaba keeps the register board, and the rest only talk. Lahar serves barley first. */
export const OVESOS_TRADERS = freeze(['ezina', 'ninkasi', 'uttu', 'lahar']);

// ---------------------------------------------------------------------------
// The market (design 7.4 and 7.7; the contract for Builds 4 and 5)
// ---------------------------------------------------------------------------
export const OVESOS_BUYERS = freeze([
  { id: 'ezina', name: 'Ezina', role: 'Miller on the canal', place: 'Ovesos', at: 'the mill on the canal',
    wants: [{ item: 'hard-wheat', appetite: 24 }], sells: [{ id: 'hard-wheat-flour', price: 3 }], services: ['grind'],
    lines: {
      open: '“Hard wheat I buy, for the stones. Flour I sell. Grinding your own is a sixteenth, and that is a different conversation.”',
      full: '“The bins are full until tomorrow.”',
      none: '“No hard wheat. Then you are here for flour, or for the noise.”',
      paid: total => `She weighs the sheaves against a stone she trusts more than any scale, and pays ${total} copper.`,
    } },
  { id: 'ninkasi', name: 'Ninkasi', role: 'Brewer of Velsorten', place: 'Ovesos', at: 'the brewhouse',
    wants: [{ item: 'barley', appetite: 24 }], sells: [{ id: 'ale', price: 3 }],
    lines: {
      open: '“Barley in, ale out. The Sorten drinks whatever I can brew, and I can brew whatever you can grow.”',
      full: '“The steep is full. Tomorrow, or have a drink.”',
      none: '“No barley. Then it is ale you want, and that is the easier trade.”',
      paid: total => `She pays ${total} copper and pours a cup you did not ask for.`,
    } },
  { id: 'uttu', name: 'Uttu', role: 'Fuller and dyer', place: 'Ovesos', at: 'the fulling mill',
    wants: [{ item: 'madder', appetite: 12 }], sells: [{ id: 'cloth', price: 8 }],
    lines: {
      open: '“Madder roots I buy, every one. Fulled cloth I sell, and Gala buys the rest.”',
      full: '“The vats have all the red they can take today.”',
      none: '“No madder. Nobody ever has madder. That is why I pay for it.”',
      paid: total => `She breaks a root to see the red inside, and pays ${total} copper with a blue hand.`,
    } },
  { id: 'lahar', name: 'Lahar', role: 'Headman of the upland herders', place: 'Ovesos', at: 'the herders’ camp on the upland grass',
    wants: [{ item: 'barley', appetite: 12 }, { item: 'meadow-hay', appetite: 12 }], sells: [{ id: 'mutton', price: 3 }, { id: 'ewe-cheese', price: 4 }],
    lines: {
      open: '“Barley for the winter and hay for the ewes. Mutton off the fire and cheese off the ewes, for whoever has eaten at it.”',
      full: '“The flock has enough until tomorrow. So have I.”',
      none: '“Nothing a ewe would eat. Then buy, or sit.”',
      paid: total => `He pays ${total} copper out of a pouch that smells of sheep and smoke.`,
    } },
  { id: 'nisaba', name: 'Nisaba', role: 'Clerk and registrar of the Water Council', place: 'Ovesos', at: 'the register house', board: 'ovesos-register',
    services: ['water-rights'],
    lines: {
      open: '“I buy nothing. I sell rights on the canal, when a house gives one up, and the board has the valley’s orders.”',
      full: '', none: '“I deal in what is written, not in what is grown.”',
      paid: total => `${total} copper, entered in the register before it is put away.`,
    } },
]);
registerBuyers(OVESOS_BUYERS);

/** The register board (design 7.7: "the clerk's house in Ovesos"). Postings for goods not yet priced or in the satchel are skipped. */
export const OVESOS_BOARDS = freeze([
  { id: 'ovesos-register', name: 'The register board', buyer: 'nisaba', place: 'Ovesos', postings: [
    { item: 'hard-wheat', min: 8, max: 16, requester: 'The granary at Oveth-Hold' },
    { item: 'hard-wheat-fine', min: 3, max: 6, requester: 'A grain house in Minora' },
    { item: 'barley', min: 10, max: 20, requester: 'Ninkasi’s brewhouse' },
    { item: 'silver-millet', min: 6, max: 12, requester: 'The tail households’ winter store' },
    { item: 'hard-wheat-flour', min: 4, max: 8, requester: 'The bakers of the market town' },
    { item: 'flatbread', min: 3, max: 6, requester: 'The Council’s table at the Close' },
    { item: 'millet-porridge', min: 3, max: 6, requester: 'The herders’ camp on the upland' },
    { item: 'madder', min: 2, max: 4, requester: 'A Galan wool buyer' },
  ] },
]);
registerBoards(OVESOS_BOARDS);

// ---------------------------------------------------------------------------
// What they say
// ---------------------------------------------------------------------------
/** What each of them says when nothing in the arc is the subject. */
export const OVESOS_AMBIENT = freeze({
  enbilulu: freeze([
    'Enbilulu. I keep the canal for the Water Council: every sluice from the divider to the tail, and every argument about them.',
    'I know each sluice by its sound. A sluice that sings is open. One that hums is half shut, and somebody is lying about it.',
    'Everybody on this canal outranks me. Their grants are older than my office. The water does not read grants, so somebody has to tell it where to go.',
  ]),
  nisaba: freeze([
    'Nisaba. I keep the Council’s register: every right on the canal, who holds it, on what grant, and since when.',
    'Three times a year I read from it in public. At the Harvest Close I read the whole of it. It is not entertaining. It is very well attended.',
    'Rights change hands when a house dies out or goes to Gala. Whoever buys one takes its place on the canal, and its grant, and its arguments.',
  ]),
  ziusudra: freeze([
    'Ziusudra. My house holds the oldest grant on this canal. It is older than the canal. It is older, my grandfather said, than the flood.',
    'King Melos sealed our grant again in his first year, as his father sealed it, and his father’s father. The seal changes. The water does not.',
    'The tail-enders pour good water on sand. Half of every turn at the tail goes into the ground and stays there. I say so at every Council, and I am not thanked.',
  ]),
  ashnan: freeze([
    'Ashnan. I work the last plot on the canal, on a lease from a house that has never seen it. The water reaches me after everybody else has finished with it.',
    'The millet patch by my door is mine. The law says nobody may seize it for debt. Nobody has, and I look every morning.',
    'Three children, one lease, and no landlord who has ever stayed to dinner. We manage. Millet manages.',
  ]),
  lahar: freeze([
    'Lahar. I speak for the herders on the upland grass. We hold no water and want none: the sheep find it.',
    'We have agreements, not rights. When the king calls up men he calls ours first, and the Council remembers it until about the next harvest.',
    'Sit, if you are staying. Roasted barley first, then talk, then trade. That is the order up here.',
  ]),
  ezina: freeze([
    'Ezina. The mill on the canal is mine for as long as I keep it. I grind for a sixteenth, and there is a club behind the door for anybody who thinks a sixteenth is negotiable.',
    'A mill is worth a war on this river. Two of the last three were about mills. Nobody has fought over a sixteenth yet, which is why I keep it at a sixteenth.',
    'Hard wheat, I buy. Flour, I sell. What happens between the two is noisy, and it pays.',
  ]),
  ninkasi: freeze([
    'Ninkasi. I brew the Sorten’s ale from Sorten barley, in the brewhouse by the market. The recipe is a hymn. I will not sing it to you.',
    'The Council meets dry, in the register house. Afterwards it meets here. More gets settled afterwards.',
  ]),
  uttu: freeze([
    'Uttu. I full and dye the Sorten’s wool at the mill on the canal. The blue on my hands is permanent. So is the mill.',
    'A Galan buyer can tell a Sorten fleece by touch, in the dark, through a sack. That is what fulling is for.',
    'Madder for the red. I buy every root grown on this canal, because nobody else knows what to do with it.',
  ]),
});
export const ovesosAmbientLines = id => [...(OVESOS_AMBIENT[id] ?? [])];

// ---------------------------------------------------------------------------
// What the arc gives them to say
// ---------------------------------------------------------------------------
/** Nisaba enters Rollo in the register (the arc's `enter`). */
export const NISABA_ENTRY = freeze([
  'Water. Then you will want to be written in, because nobody draws a drop on this canal who is not in the register. Sit while I find the page.',
  'Entered this day: a sorcerer of the Guild at Minora, on no grant, the most junior right on the canal. Your plot is at the tail. It is dry. That is why it was free.',
  'Your turn comes after everybody else’s. When it comes, the water is yours to divide and nobody else’s. Ask Enbilulu at the divider how. He will tell you more than you asked.',
]);
/** What the register is, and whose seal is on it. */
export const REGISTER_LINES = freeze([
  'The register is the canal written down: every right, the grant it stands on, the seal on the grant, and the order of the turns. The water does what the register says, or Enbilulu finds out why.',
  'Every grant on this canal carries King Melos’s seal, or his father’s, or his father’s father’s. The king does not come to Velsorten. His seal does, and it is enough.',
]);
/** The Harvest Close, as Nisaba explains it. */
export const CLOSE_LINES = freeze([
  'Three reckonings a year: the Planting Feast, the Allocation Settlement and the Harvest Close. At the Close the Council reckons the water every right drew against what it owes, in public, with the register open.',
  'A measure of grain for every ten units of water drawn. Millet draws nothing: a household’s millet cannot be seized, and the Council does not tax what it cannot take. Barley first, then wheat, and plain before fine.',
  'Then I read the register aloud, from the divider to the tail. Ask anybody what the Close is for and they will tell you it is for the reading.',
]);
/** Enbilulu on the canal itself. */
export const CANAL_LINES = freeze([
  'The divider is a stone with three sluices in it, at the head, where the Lizeem stands highest. One feeds the canal, one feeds the mills, and one has been shut since a dispute in my grandfather’s time.',
  'From the divider the canal runs down to the tail at the dry end. Five rights draw on it, oldest first, a turn each, round and round. The oldest is Ziusudra’s house. The youngest was Ashnan’s plot, until you.',
]);
/** Enbilulu on sharing the water (design 5.4): turns, the measure, the thirst. */
export const TURNS_LESSON = freeze([
  'Five rights, five turns, a round. When your turn comes, the water is yours at the divider until the turn runs out, and you divide your measure among your beds. Four units, for the most junior right. One more for every place you climb.',
  'Every crop has a thirst. Hard wheat drinks three units a planting. Barley two. Silver millet one, and complains about none of it. Madder two, if you ever grow madder, which you will not for a while.',
  'Give a crop its thirst exactly and it fills. One short, and it does well enough. Less than that, it comes up thin. Water you do not use on your turn is gone: the next right is waiting at the stone.',
  'Too much is worse than too little. Ask me about salt when you have made the mistake. Everybody makes it once.',
]);
/** Enbilulu on salt. */
export const SALT_LESSON = freeze([
  'Water beyond the thirst does not go away. It goes down, lifts what is in the ground, and leaves it on top when it dries. That white crust at the edges of the furrows is salt.',
  'The next crop in a salted bed comes to nothing, whatever you give it. Barley stands it, and takes the salt up as it grows. Otherwise leave the bed bare a whole day, and the salt goes back where it came from.',
  'The tail is saltier than the head because the tail has been greedy for longer. Ziusudra says so. He is not wrong, which is the trouble with him.',
]);
/** Ashnan on salt, which also counts as learning it. */
export const ASHNAN_SALT = freeze([
  'Salt is what you get for being generous with water you do not have. Barley eats it. Nothing else will, until the bed has rested a day.',
  'My husband learned that the year we married. I learned it from watching him.',
]);
/** Enbilulu's request, when the canal stage begins. */
export const HEAD_REQUEST = freeze([
  'The divider is choked: a winter of silt and two years of reeds, and the young men who used to clear it are with the rebellion. Every turn comes down short at the head, and shorter at the tail.',
  'Three stretches between the stone and the first sluice. We dig between turns, while the channel is dry at the head. Nobody digs in running water twice.',
]);
/** A stretch of the head cleared, by number, and a day's work once it is clear. */
export const HEAD_WORK = freeze([
  'The first stretch, below the divider. Silt up on the bank and reeds to the fire. The canal sluice moves again. It squeals. That is the sound of it working.',
  'The second stretch. There is a sandal in the silt, older than either of you. Enbilulu says it belongs to the canal, and sets it on the bank to dry.',
  'The third stretch, and the head is clear. Enbilulu puts his ear to the stone and listens. “That is what a turn sounds like when it arrives whole,” he says.',
]);
export const HEAD_DAY = 'A turn on the head: reeds, silt, and the sluice greased with mutton fat. Enbilulu writes it in the warden’s book against your dues, a measure of grain you will not owe at the Close.';
/** Nisaba on what the register says of the turns, before the hearing. */
export const REGISTER_EXTRACT = freeze([
  'The register says this. The turns go in the order written, from the divider down, and the order is sealed by the king. The oldest grant stands first in it. In it, not above it.',
  'Ziusudra’s grant gives his house the first turn of the round. It does not give him a second. The page with his grandfather’s seal says so in his grandfather’s words, and I will read them to the Council if you ask me to.',
]);
/** Ashnan on what she saw, before the hearing. */
export const ASHNAN_WITNESS = freeze([
  'I was up with the youngest. I heard the head sluice sing at midnight, and I walked up the bank and saw who stood at it with a lamp. Ziusudra’s steward.',
  'I will say so before the Council, if you ask me. A tenant who speaks against a noble house finds her dues called in early, all at once. That is how it is done here. I know the price. I am telling you so that you know it too.',
]);
/** The Water Council sits (Nisaba's "Bring the draw before the Water Council"). */
export const HEARING_OPENING = freeze([
  'The Water Council sits. Ziusudra at the head of the table, by right of the oldest grant; the rest in order; you at the foot, by right of the newest. The register is open in front of me.',
  'The matter: a draw out of turn at the head sluice, on the night before your turn. Speak to it.',
]);
/** How the hearing ends, by the answer given. */
export const HEARING_OUTCOMES = freeze({
  register: freeze([
    'Nisaba reads the page aloud: the order of the turns, sealed by the king, and the oldest grant first in it and not above it. She reads Ziusudra’s grandfather’s words in something very like Ziusudra’s grandfather’s voice.',
    'Ziusudra hears it to the end. “The document says what it says,” he says. “My house keeps its turn, and only its turn.” The Council orders the half turn given back, and writes you up a place on the canal for having read the page before he did.',
  ]),
  witness: freeze([
    'Ashnan stands up at the foot of the table in her patched dress and says what she saw: the sluice singing at midnight, the steward with the lamp. Nobody asks her to say it twice.',
    'The Council finds for you and orders the half turn given back. And Nisaba notes, without looking up, that the tenant at the tail has a season’s dues owed to the Council, and owed now.',
  ]),
  settle: freeze([
    `You send ${SETTLE_COPPER} copper to Ziusudra’s house with your compliments, which is not how it is meant to be done and is how it is mostly done.`,
    'The half turn stays drawn. Nothing is written in the register. The Council is spared an afternoon, and Ziusudra’s steward is spared a great deal more.',
  ]),
});
/** Ziusudra on his grant and on seniority: who was here first, and what the document said. */
export const ZIUSUDRA_GRANT = freeze([
  'My grandfather Atrahasis held the first turn, and his father Utnapishtim before him, who had it from a king whose name is on the stone at the divider and nowhere else. I can show you the grant. It takes most of an afternoon.',
  'Osk-milis, the old word is: the order of the water. Nobody knows where the word comes from. It is older than the way we speak now, which tells you how old the order is.',
  'When the water is short, the oldest right drinks first. That is not greed. That is what the word means.',
]);
/** Lahar's roasted barley, offered before any trade, and taken badly when refused. */
export const LAHAR_BARLEY = 'Sit. Roasted barley first, then we talk, then we trade. That is the order. It was the order before there was a canal to argue about.';
export const LAHAR_REFUSED = 'You come to my fire and refuse my barley. Then go and sell to the brewer.';
export const LAHAR_TAKEN = 'It tastes of smoke and of the upland. Lahar watches you eat it, nods once, and only then asks what you have.';

const HUB_LABEL = 'Back to the conversation';
const at = (arc, stage) => OVESOS_STAGES.indexOf(arc?.stage?.() ?? 'arrive') >= OVESOS_STAGES.indexOf(stage);
const ORDINALS = freeze(['first', 'second', 'third', 'fourth', 'fifth']);
/** Rollo's place in the round at a seniority: the fifth right is first at the stone. */
export const turnPlace = seniority => ORDINALS[Math.max(0, Math.min(4, SENIORITY.most - Math.round(Number(seniority) || SENIORITY.least)))];

/**
 * The first Harvest Close after Ovesos is restored (design 5.4: "his name read out at the Harvest Close"): Nisaba
 * reads the register from the divider to the tail, and his name in its new place.
 */
export function harvestCloseReading(name = 'Rollo', seniority = SENIORITY.reward) {
  return [
    'The Harvest Close. The Council sits, the register is open, and the water the canal gave this season is reckoned against the grain it is owed. Nobody leaves early. Nobody ever has.',
    'Then the register, read aloud from the divider to the tail. Ziusudra’s house first, by a grant older than any flood, he says, and by the king’s seal, I say.',
    `And ${turnPlace(seniority)} at the stone, by the Council’s writing and King Melos’s seal: ${name}, of the Guild at Minora, who came in at the tail, cleared the head with the warden, answered the hearing, and brought the hard wheat in Fine.`,
    'Nobody claps. In Ovesos a name read at the Close is the applause. Ziusudra nods once. Enbilulu writes it in his own book as well, which he says is for the sluices.',
  ];
}

/**
 * **The conversation** for the people of Ovesos. The arc's steps sit with the people who hold them.
 *
 * `context`: { ovesos (the arc), openDialogue, closeDialogue, inventory?, cooking?, openTrade?, openOrders?, notify?,
 *   onChange?(), playerName?, visits? }. `onChange` hears what changes hands or advances, so the host can save.
 */
export function ovesosConversation(npc, context) {
  if (!isOvesosNpc(npc?.id)) return false;
  const { ovesos = null, openDialogue, closeDialogue, openTrade = null, visits = 0 } = context;
  const back = () => ovesosConversation(npc, { ...context, visits: visits + 1 });
  const say = (lines, extra = {}) => openDialogue(npc, lines, null, HUB_LABEL, { noWayfinding: true, onComplete: back, ...extra });
  const ambient = OVESOS_AMBIENT[npc.id];
  const leave = { id: `${npc.id}-leave`, label: 'Good day to you.', action: closeDialogue };
  const about = { id: `${npc.id}-about`, label: `Ask about ${npc.name}.`, action: () => say([ambient[(visits + 1) % ambient.length]]) };
  const trade = openTrade && OVESOS_TRADERS.includes(npc.id)
    ? [{ id: `${npc.id}-trade`, label: 'Trade', action: () => (npc.id === 'lahar' ? serveBarley(npc, context) : (closeDialogue(), openTrade(npc))) }] : [];
  const choices = [...topicChoices(npc, context, say), ...trade, about, leave];
  openDialogue(npc, [openingLine(npc, ovesos, visits)], null, 'Back to the road', { noWayfinding: true, choices });
  return true;
}

/** Lahar's fire: the roasted barley first, then the trade; a refusal ends the visit on one line. */
function serveBarley(npc, context) {
  const { openDialogue, closeDialogue, openTrade, notify = null } = context;
  openDialogue(npc, [LAHAR_BARLEY], null, 'Leave the fire', { noWayfinding: true, choices: [
    { id: 'lahar-barley-take', label: 'Take the roasted barley.', action: () => { closeDialogue(); notify?.(LAHAR_TAKEN, 'LAHAR'); openTrade(npc); } },
    { id: 'lahar-barley-refuse', label: 'Refuse it.', action: () => openDialogue(npc, [LAHAR_REFUSED], null, 'Leave the fire', { noWayfinding: true }) },
  ] });
}

/** The first thing said: the arc's business when there is any, the introduction otherwise. */
function openingLine(npc, arc, visits) {
  const lines = OVESOS_AMBIENT[npc.id], on = !!arc?.accepted?.(), stage = on ? arc.stage() : null, s = arc?.view?.() ?? null, mood = arc?.regard?.(npc.id) ?? 0;
  const answer = s?.hearing?.answer ?? null;
  switch (npc.id) {
    case 'nisaba':
      if (stage === 'arrive') return 'A traveller from Minora, at the register house. The last one wanted a census. What do you want?';
      if (stage === 'wheat') return 'The warden says the head was cleared with your spade, and the register says your barley came in full. The Council has moved you up a turn.';
      if (stage === 'hearing') return 'A draw out of turn goes before the Water Council. The Council sits here, with the register open. Bring what you have, and bring it in order.';
      if (stage === 'done' && s?.named === 'due') return 'The register has you in a new place. The Close will hear it read. Come when you are ready to be reckoned.';
      if (stage === 'done' && s?.named === 'read') return 'Your name is in the register, and it has been read. In Ovesos that is as far as anybody gets.';
      if (mood > 0) return 'You argued from the page. The Council will remember that longer than it remembers the water.';
      break;
    case 'enbilulu':
      if (stage === 'arrive') return 'You will be the one from the tower. Nobody draws a drop on this canal who is not in the register. Nisaba keeps it, at the house on the terrace.';
      if (stage === 'register') return 'Nisaba has written you in at the tail. Then you will want to know how the water comes down. Ask.';
      if (stage === 'canal' && (s?.head ?? 0) < HEAD_STRETCHES) return HEAD_REQUEST[0];
      if (stage === 'hearing') return 'Somebody lifted the head sluice in the night and let it run till dawn. I know every sluice by its sound. That one was Ziusudra’s.';
      break;
    case 'ziusudra':
      if (stage === 'hearing') return 'Yes, my house drew the water. It was going down to the tail, and the tail was going to give it to the sand. I gave it to wheat.';
      if (answer === 'register') return 'You read the document. Most men from Minora read the river and think it is the same thing. Sit with me at the Close.';
      if (answer === 'witness') return 'You put a tenant on her feet against my house, and you won. She will pay for it, and you will not. Remember which of you that was.';
      if (answer === 'settle') return 'Forty copper and a quiet afternoon. You are learning how the canal works. I am not certain I wanted you to.';
      break;
    case 'ashnan':
      if (stage === 'hearing' && !s?.consulted?.includes('witness')) return 'You will want to know who lifted the sluice. Everybody at the tail knows. Nobody at the tail says.';
      if (answer === 'witness' && s?.ashnan === 'owed') return 'They called my dues in, all of them, at once. The millet is still mine. It was always going to be.';
      if (answer === 'witness' && s?.ashnan === 'paid') return 'Somebody paid my dues at the register house. Nisaba would not say who, which is how I know.';
      if (stage === 'register' || stage === 'turns') return 'So you are the new tail. I was the tail for nine years. It is quieter than it looks, and drier.';
      break;
    case 'ezina':
      if (stage === 'mill') return 'You have hard wheat for the stones. I can smell it on you. Two sheaves to the measure, and one measure in sixteen to me.';
      if (stage === 'done') return 'The Council says you grind free. I have never ground free for anybody. I am doing it with very bad grace, and I want that noted.';
      break;
    default: break;
  }
  return lines[visits % lines.length];
}

function topicChoices(npc, context, say) {
  const { ovesos: arc = null, openDialogue, closeDialogue, inventory = null, cooking = null, openOrders = null, notify = null, onChange = null } = context;
  const out = [], on = !!arc?.accepted?.(), changed = () => onChange?.();
  const stage = on ? arc.stage() : null, s = arc?.view?.() ?? null, entered = on && at(arc, 'register');
  // A recipe counts as taught only when the kitchen takes it (6 October 2026): heard and not kept otherwise.
  const learn = (id, name) => {
    const learned = cooking?.learn ? cooking.learn(id) : { ok: true };
    if (learned?.ok === false) { notify?.(learned.reason || `You cannot make ${name} yet.`, `${npc.name.toUpperCase()} TRIED TO TEACH YOU A RECIPE`); return false; }
    arc.noteTaught(id); changed();
    notify?.(`You can make ${name} now.`, `${npc.name.toUpperCase()} TAUGHT YOU A RECIPE`);
    return true;
  };
  const taught = id => !!s?.taught?.includes(id);

  if (npc.id === 'nisaba') {
    if (on && stage === 'arrive') out.push({ id: 'ovesos-nisaba-enter', label: 'Ask to be entered for water.', action: () => { arc.enter(); changed(); say([...NISABA_ENTRY]); } });
    out.push({ id: 'ovesos-nisaba-register', label: 'Ask about the register.', action: () => say([...REGISTER_LINES]) });
    out.push({ id: 'ovesos-nisaba-close-about', label: 'Ask about the Harvest Close.', action: () => say([...CLOSE_LINES]) });
    if (on && stage === 'hearing') {
      if (!s.consulted.includes('register')) out.push({ id: 'ovesos-nisaba-extract', label: 'Ask what the register says of the turns.', action: () => { arc.consult('register'); changed(); say([...REGISTER_EXTRACT]); } });
      out.push({ id: 'ovesos-nisaba-hearing', label: 'Bring Ziusudra’s draw before the Water Council.', action: () => hearing(npc, context, say) });
    }
    if (entered) {
      out.push({ id: 'ovesos-nisaba-close', label: 'Attend the Harvest Close.', action: () => {
        const result = arc.close();
        if (!result.ok) { say([result.reason]); return; }
        changed();
        say(closeLines(result, context.playerName));
      } });
      out.push({ id: 'ovesos-nisaba-right', label: 'Buy a senior water right (1,500 copper).', action: () => {
        const result = arc.buyRight();
        if (!result.ok) { say([result.reason]); return; }
        changed();
        say([`A house at the head has sold up and gone to Gala. Its place on the canal is written over to you, and your turn comes ${turnPlace(result.seniority)} at the stone now. Fifteen hundred copper. I count it twice, and so does the register.`]);
      } });
    }
    if (openOrders) out.push({ id: 'ovesos-nisaba-board', label: 'Read the register board.', action: () => { closeDialogue(); openOrders(npc); } });
  }

  if (npc.id === 'enbilulu') {
    out.push({ id: 'ovesos-enbilulu-canal', label: 'Ask about the canal.', action: () => say([...CANAL_LINES]) });
    if (on && stage === 'canal' && (s?.head ?? 0) < HEAD_STRETCHES) out.push({ id: 'ovesos-enbilulu-head', label: 'Ask about the canal head.', action: () => say([...HEAD_REQUEST]) });
    if (entered) {
      out.push({ id: 'ovesos-enbilulu-turns', label: 'Ask how the water is shared.', action: () => { arc.learnTurns(); changed(); say([...TURNS_LESSON]); } });
      out.push({ id: 'ovesos-enbilulu-salt', label: 'Ask about salt.', action: () => { arc.learnSalt(); changed(); say([...SALT_LESSON]); } });
    }
    if (on && at(arc, 'canal')) out.push({ id: 'ovesos-enbilulu-work', label: 'Work the canal head with him.', action: () => {
      const result = arc.workHead();
      if (!result.ok) { say([result.reason]); return; }
      changed();
      say(result.stretch ? [HEAD_WORK[result.stretch - 1]] : [HEAD_DAY]);
    } });
  }

  if (npc.id === 'ziusudra') {
    out.push({ id: 'ovesos-ziusudra-grant', label: 'Ask about his grant.', action: () => say([...ZIUSUDRA_GRANT]) });
    if (on && stage === 'hearing') out.push({ id: 'ovesos-ziusudra-draw', label: 'Ask him why his house drew the water.', action: () => say([
      'Because it was there, and the tail was going to waste it. I have watched the tail waste water for sixty years. I watched my father watch it.',
      'Take it to the Council, if you like. My grant will be read, and so will yours. One of them is older.']) });
  }

  if (npc.id === 'ashnan') {
    out.push({ id: 'ovesos-ashnan-millet', label: 'Ask about the millet.', action: () => say([
      'Silver millet. Sown late, in small rounds: the first round risks the cold, the second is the one you mean, the third is insurance. One unit of water a planting, and the Council takes no dues on it.',
      'Landlords call it poor grain. Mothers call it honest grain. Soldiers call it better than hunger. I have heard all three at this door.']) });
    if (entered) out.push({ id: 'ovesos-ashnan-salt', label: 'Ask about salt.', action: () => { arc.learnSalt(); changed(); say([...ASHNAN_SALT]); } });
    if (entered && !taught(OVESOS_DISHES.porridge)) out.push({ id: 'ovesos-ashnan-porridge', label: 'Ask how millet porridge is made.', action: () => {
      if (!learn(OVESOS_DISHES.porridge, 'millet porridge')) { say(['You cannot keep a fire yet. A pot wants a fire. Come back with one.']); return; }
      say(['Two of millet, washed, water, and a pot you watch. Millet porridge. It is what we eat when the turn comes down short.',
        'It is what we eat when it does not, as well. Nobody ever took a child’s porridge for debt, and nobody will while the law stands.']);
    } });
    if (on && stage === 'hearing' && !s.consulted.includes('witness')) out.push({ id: 'ovesos-ashnan-witness', label: 'Ask Ashnan what she saw.', action: () => { arc.consult('witness'); changed(); say([...ASHNAN_WITNESS]); } });
    if (s?.ashnan === 'owed') out.push({ id: 'ovesos-ashnan-dues', label: `Pay her season’s dues (${ASHNAN_DUES} copper).`, action: () => {
      const result = arc.payAshnan();
      if (!result.ok) { say([result.reason]); return; }
      changed();
      say([`${ASHNAN_DUES} copper, into the register under my name. I will not thank you in front of anybody. I am thanking you now.`]);
    } });
  }

  if (npc.id === 'lahar') out.push({ id: 'ovesos-lahar-upland', label: 'Ask about the upland.', action: () => say([
    'The herders hold the upland grass on agreements older than half the grants on the canal. No water right, no seat on the Council, and no need of either.',
    'When the king calls up men, he calls ours first, because ours can ride and walk and go without. That is our standing. It is not written anywhere, which suits us.']) });

  if (npc.id === 'ezina') {
    out.push({ id: 'ovesos-ezina-mill', label: 'Ask about the mill.', action: () => say([
      'Two sheaves of hard wheat make a measure of flour, and one measure in sixteen is mine. That is the toll. It was the toll before the king, and it will be the toll after him.',
      'The mills are worth wars on this river. That is why the club is behind the door and not in my hand.']) });
    for (const [item, label] of [['hard-wheat-fine', 'Have your Fine hard wheat ground.'], ['hard-wheat', 'Have your hard wheat ground.']]) {
      if (!arc || (inventory?.count?.(item) ?? 0) < 2) continue;
      out.push({ id: `ovesos-ezina-grind-${item}`, label, action: () => {
        const result = arc.grind(item);
        if (!result?.ok) { say([result?.reason ?? 'The stones are not turning today.']); return; }
        changed();
        const measures = `${result.flour} ${result.flour === 1 ? 'measure' : 'measures'}`;
        say([`${measures} of ${item.endsWith('-fine') ? 'fine ' : ''}flour${result.toll ? `, and ${result.toll} kept for the mill` : result.waived ? ', and nothing kept: the toll is waived for you, by order' : ''}. ${item.endsWith('-fine') ? 'Fine wheat, fine flour. Bake it before it forgets which it is.' : 'Take it before the mice decide it is theirs.'}`]);
      } });
    }
    if (entered && !taught(OVESOS_DISHES.flatbread)) out.push({ id: 'ovesos-ezina-flatbread', label: 'Ask how the Sorten’s flatbread is made.', action: () => {
      if (!learn(OVESOS_DISHES.flatbread, 'flatbread')) { say(['You cannot keep a fire yet. Bread wants a fire, or at least a very hot stone. Come back with one.']); return; }
      say(['Two measures of flour, water, a pinch of salt, and a stone hot enough to spit on. Flatbread. The whole country eats it with everything, and complains about it with everything.',
        'Fine flour makes a bread you could seal for Minora. Plain makes one you tear at the canal and do not mention.']);
    } });
  }

  if (npc.id === 'ninkasi') out.push({ id: 'ovesos-ninkasi-ale', label: 'Ask about the ale.', action: () => say([
    'Barley steeped, sprouted, dried and crushed, boiled with what grows on the bank, and sung over. The hymn is the recipe. Every brewer on the Sorten sings it, and every one of us leaves a verse out.',
    'The Council drinks it after the Close and complains about the price before it. Both are traditions.']) });

  if (npc.id === 'uttu') {
    out.push({ id: 'ovesos-uttu-cloth', label: 'Ask about the cloth.', action: () => say([
      'Wool off the upland, woven at the tail, and beaten under my hammers in water and fuller’s earth until it shrinks and closes and turns the rain. That is fulling.',
      'The hammers run off the mill sluice at the divider. Ezina and I have agreed about that sluice for twenty years and argued about it for nineteen.']) });
    out.push({ id: 'ovesos-uttu-madder', label: 'Ask about the dye crop.', action: () => say([
      'Madder. A root, not a flower, and slow: eight minutes in the ground as the farm counts it, and two units of water a planting, exactly. It wants a farmer of some years. Farming eighteen, the old men say, and they are usually right about numbers.',
      'The red is in the root. You will be red to the elbow by the end of the digging, and I will buy every root you bring me, because nobody else in Ovesos knows what to do with them.']) });
  }
  return out;
}

/** The Water Council sits: three answers, two of them only once looked into, and a way out. */
function hearing(npc, context, say) {
  const { ovesos: arc, openDialogue, inventory = null, onChange = null } = context;
  const options = arc.hearingOptions(), copper = inventory?.count ? purse(inventory) : SETTLE_COPPER;
  const answer = choice => () => {
    const result = arc.answerHearing(choice);
    if (!result.ok) { say([result.reason]); return; }
    onChange?.();
    say([...HEARING_OUTCOMES[choice]]);
  };
  openDialogue(npc, [...HEARING_OPENING], null, HUB_LABEL, { noWayfinding: true, choices: [
    { id: 'ovesos-hearing-register', label: 'Argue from the register.', disabled: !options.register,
      reason: 'Ask Nisaba what the register says of the turns first. In Ovesos nobody argues from a page he has not read.', action: options.register ? answer('register') : () => {} },
    { id: 'ovesos-hearing-witness', label: 'Call Ashnan as witness.', disabled: !options.witness,
      reason: 'Nobody has told you what they saw. Ask at the tail.', action: options.witness ? answer('witness') : () => {} },
    { id: 'ovesos-hearing-settle', label: `Settle it quietly (${SETTLE_COPPER} copper).`, disabled: !options.settle,
      reason: `Forty copper, and you have ${copper}.`, action: options.settle ? answer('settle') : () => {} },
    { id: 'ovesos-hearing-later', label: 'Not yet.', action: () => ovesosConversation(npc, context) },
  ] });
}

/** What the Close says: the reckoning, and the reading of his name the first time after Ovesos is restored. */
function closeLines(result, playerName) {
  const measures = n => `${n} ${n === 1 ? 'measure' : 'measures'}`;
  const lines = [];
  if (!result.due) lines.push('The Close has nothing of yours to reckon. The register has you drawing water and owing nothing on it, which is either very careful or very millet.');
  else {
    const parts = [...(result.credited ? [`Enbilulu’s book covers ${result.credited}, for the days you worked the head`] : []),
      ...Object.entries(result.taken).map(([id, n]) => `${n} ${id.replace(/-fine$/, ', Fine').replace('hard-wheat', 'hard wheat')} from your satchel`)];
    lines.push(`The water your right drew comes to ${measures(result.due)} of grain in dues.${parts.length ? ` ${parts.join('; ')}.` : ''}${result.short ? ` You are ${measures(result.short)} short. I write the rest under your name for the next Close, which in Ovesos is worse than a fine.` : ' The register has you square.'}`);
  }
  if (result.reading) lines.push(...harvestCloseReading(typeof playerName === 'function' ? playerName() : playerName || 'Rollo', result.seniority));
  return lines;
}
