/**
 * **The rest of Minora's people for the Farmlands of the Lizeem** (docs/lizeem-farmlands-design.md 6.2 and 7.4, the
 * design of 5 October 2026; built 6 October 2026 for Build 5 under the user's "keep building everything").
 *
 * Five, tier B in the design, who wait for the countries they trade with: the three factors at the market corner by
 * the Temple Way (src/menora-city.js `LIZEEM_MARKET_STANDS`), Manawydan for Nethereum, Njord for Nesdor and Adapa for
 * Ovesos, beside Portunus's Carican stall; Hapi the barge master on the river side of the River storehouse; and
 * Amalthea the cheese-maker at her hamlet on the Isareos shoulder north-west of the city (src/isareos-hamlet.js).
 * Their names follow the design's rule, a tradition for each country: Welsh for Nethereum, Norse for Nesdor,
 * Mesopotamian for Ovesos, Egyptian for Minora's own, and Greek for the goat that nursed Zeus.
 *
 * Their looks are the design's, in the figure kit's own words (src/characters.js `createCharacter`): women as the
 * kit's slight figure in a long dress, men on the hired company's body. Nobody wears a hat, so Amalthea's kerchief
 * is left out; what the kit cannot draw (an oiled cloak, a whip through a belt, a sash, a cheesecloth apron) is left
 * to the role and the words. Every look still wants the user's yes.
 *
 * Talk: two or three lines each in the game's dry voice, the first a self-introduction, and a topic hub
 * (`minoraConversation`). Trading is the market's (`context.openTrade`, src/merchants.js); the buyers are declared
 * and registered here, at the top of the module, as each country's are, so whoever imports it has them. Njord
 * carries the Nesdor Way board's orders by naming that board as his own (`board: 'nesdor-way'`): the market reads a
 * buyer's board by its id, so the same three orders show at his stall and at Forseti's door, and filling one fills it
 * in both places. Amalthea teaches the rye loaf if Vertumnus has not.
 *
 * **Hapi's terms** (design 7.4: "one Fine sealed lot of each good a day, at twice the home price, for Nylon") are more
 * than the market can say today. `rate` buys without any limit (the commissary's terms), and `sealedOnly` takes any
 * sealed lot, Plain as well as Fine. Until src/merchants.js can hold a rate to an appetite, he is registered with what
 * keeps him honest: sealed goods only, one lot of each good a day (`HAPI_LOT` units of each, a want apiece), at the
 * city's price, and the usual second lot at six-tenths. `HAPI_TERMS` records what the design asks for.
 *
 * Pure: no DOM, no three; the host supplies the dialogue box.
 */
import { LIZEEM_MARKET_STANDS } from './menora-city.js';
import { ISAREOS_HAMLET_STAND } from './isareos-hamlet.js';
import { registerBuyers } from './merchants.js';
import { FARM_GOODS, DISH_PRICES } from './prices.js';
import { LIZEEM_RECIPES } from './lizeem-farmlands.js';

const freeze = Object.freeze;
/** `person(id, name, role, modelRole, color)` as src/amod-people.js has it, with the stand and look. */
const person = (id, name, role, modelRole, color, { look, at, ...extra }) =>
  freeze({ id, name, role, modelRole, color, hat: false, look: freeze({ ...look }), x: at.x, z: at.z, yaw: at.yaw, ...extra });
const stall = factor => LIZEEM_MARKET_STANDS.find(stand => stand.factor === factor);
const GREY = 0x9a968e;

/**
 * Where Hapi stands: on the river side of the River storehouse (-2337, 202), in the lane between its south wall and the
 * city wall, two metres clear of the one and more than two of the other, facing east toward the Isa Gate and the
 * Sacred Way, the way a carrier comes from the bridge.
 */
export const HAPI_STAND = freeze({ x: -2337, z: 209.6, yaw: Math.PI / 2 });

export const MINORA_PEOPLE = freeze([
  // Fifties, grey braided hair, weathered, an oiled wool cloak.
  person('manawydan', 'Manawydan', 'The Nethrani factor', 'villager', 0x5b5a46,
    { look: { slight: true, dress: true, hair: GREY, hairStyle: 'braid' }, skin: 0xc29a7c, at: stall('manawydan') }),
  // Forties, blond beard, a fur-lined short cloak. The whip through his belt is the role's, not the kit's.
  person('njord', 'Njord', 'The Nesdor carter', 'mercenary', 0x6b4a2e,
    { look: { build: 'broad', headgear: 'bare', hairStyle: 'cropped', hair: 0xcfae6a, facialHair: 'full', garment: 'fur-mantle' }, at: stall('njord') }),
  // Sixties, tall, a long grey forked beard, grey hair going back, a brown robe; the wide sash is left to the words.
  person('adapa', 'Adapa', 'The Ovesian factor', 'mercenary', 0x6e5034,
    { look: { build: 'tall-lean', headgear: 'bare', hairStyle: 'receding', hair: GREY, facialHair: 'forked', garment: 'robe', jerkin: false }, at: stall('adapa') }),
  // Fifties, heavy, grey curls, bare arms, a sailcloth smock.
  person('hapi', 'Hapi', 'Barge master', 'mercenary', 0xcbc2a6,
    { look: { build: 'heavy', headgear: 'bare', hairStyle: 'curls', hair: GREY, facialHair: 'stubble', garment: 'bare-forearms' }, skin: 0xb98a66, at: HAPI_STAND }),
  // Forties, brown hair, a wool dress. The kerchief would be a hat, and the cheesecloth apron is her lines'.
  person('amalthea', 'Amalthea', 'Cheese-maker of the Isareos hills', 'villager', 0x8a7a5c,
    { look: { slight: true, dress: true, hair: 0x5c4124, hairStyle: 'long-tied' }, at: ISAREOS_HAMLET_STAND }),
]);
export const MINORA_PEOPLE_IDS = freeze(MINORA_PEOPLE.map(npc => npc.id));
const ids = new Set(MINORA_PEOPLE_IDS);
export const isMinoraNpc = id => ids.has(id);
/** All five trade (`context.openTrade`, the market's). */
export const MINORA_TRADERS = MINORA_PEOPLE_IDS;

// ---------------------------------------------------------------------------
// The market (design 7.4; the contract for Build 5)
// ---------------------------------------------------------------------------
/** A lot, to the barge: what one good fills of Hapi's day. First pass. */
export const HAPI_LOT = 10;
/** Every good of the river, by its price-table id: the crops of the four countries and the dishes. */
export const RIVER_GOODS = freeze([...Object.keys(FARM_GOODS), ...Object.keys(DISH_PRICES)]);
/**
 * What the design asks of the barge (7.4 and 7.5): twice the home price
 * (`rate`), Fine or Prize only, one lot of each good a day and no second lot at six-tenths. src/merchants.js says
 * all of it since the integration of 6 October 2026 (a `rate` with a finite appetite, `fineOnly`, `secondLot: false`).
 */
export const HAPI_TERMS = freeze({ rate: 2, grades: freeze(['fine', 'prize']), lot: HAPI_LOT, secondLot: false });

export const MINORA_BUYERS = freeze([
  { id: 'manawydan', name: 'Manawydan', role: 'The Nethrani factor', place: 'Minora', at: 'the market corner',
    wants: [{ item: 'east-bank', appetite: 20 }], sells: [{ id: 'smoked-fish', price: 4 }, { id: 'meadow-hay', price: 2 }, { id: 'hides', price: 2 }],
    lines: {
      open: '“East-bank goods, for home. Smoked fish, hay and hides, from home.”',
      full: '“Enough for today. The cart for the Pilgrims’ Bridge goes in the morning.”',
      none: '“Nothing from the east bank. Then you are buying, or you are talking.”',
      paid: total => `She counts out ${total} copper without looking at the coins, and is right.`,
    } },
  { id: 'njord', name: 'Njord', role: 'The Nesdor carter', place: 'Minora', at: 'the market corner', board: 'nesdor-way',
    wants: [{ item: ['flour', 'dish'], appetite: 12 }],
    lines: {
      open: '“Flour and cooked food for the Way. And the Way board’s orders, the same paper Forseti pins up at the far end.”',
      full: '“The cart is loaded. It goes at first light.”',
      none: '“Flour or a dish. Something a man on the Way can eat without stopping.”',
      paid: total => `${total} copper, and he tells you what the road charged him for knowing that.`,
    } },
  { id: 'adapa', name: 'Adapa', role: 'The Ovesian factor', place: 'Minora', at: 'the market corner',
    wants: [{ item: ['bridge-rye', 'rye', 'flood-oats', 'weir-fish', 'meadow-hay'], appetite: 20 }],
    sells: [{ id: 'hard-wheat-flour', price: 3 }, { id: 'cloth', price: 8 }, { id: 'hard-wheat-seed', price: 2 }],
    lines: {
      open: '“Rye, oats, fish and hay, which Ovesos would grow itself if it had the water. Flour, cloth and seed, which it does.”',
      full: '“That is my commission filled for the day. I shall write to say so.”',
      none: '“Rye, oats, fish or hay. You have none of the four, and I have a submission to finish.”',
      paid: total => `He pays ${total} copper and writes a receipt longer than the sale.`,
    } },
  { id: 'hapi', name: 'Hapi', role: 'Barge master', place: 'Minora', at: 'the quay below the River storehouse',
    wants: RIVER_GOODS.map(item => ({ item, appetite: HAPI_TERMS.lot })), sealedOnly: true, fineOnly: true, secondLot: HAPI_TERMS.secondLot, rate: HAPI_TERMS.rate,
    lines: {
      open: '“One lot of each good a day, sealed, for Nylon. Nylon pays for the best of the valley and complains about the rest.”',
      full: '“The barge has her lot of that. Bring me something else, or bring it tomorrow.”',
      none: '“Sealed, or it does not go aboard. Nylon has measurers too, and they are not friends of ours.”',
      paid: total => `He stows it below and pays ${total} copper from a purse that has been in the river at least once.`,
    } },
  { id: 'amalthea', name: 'Amalthea', role: 'Cheese-maker of the Isareos hills', place: 'Isareos', at: 'her stand at the hamlet',
    wants: [{ item: 'meadow-hay', appetite: 12 }], sells: [{ id: 'ewe-cheese', price: 4 }],
    lines: {
      open: '“Hay I buy, for the ewes, this close to the walls. Cheese I sell.”',
      full: '“The rick will hold no more today.”',
      none: '“Hay, or nothing. The ewes are particular and so am I.”',
      paid: total => `She pulls a handful from the truss, smells it, and pays ${total} copper.`,
    } },
]);
registerBuyers(MINORA_BUYERS);

// ---------------------------------------------------------------------------
// What they say
// ---------------------------------------------------------------------------
/** What each of them says when nothing else is the subject. */
export const MINORA_AMBIENT = freeze({
  manawydan: freeze([
    'Manawydan. I keep the Nethrani stall: smoked fish, hay and hides out, and whatever grows on the east bank back in. The fish trade is my commission. The rest is my own business.',
    'Minora’s merchants have twice asked the council to move my stall. It is still here. So am I. They are, I am told, still asking.',
    'We lost a meadow in a bad year, and half the houses beside it. You write the names down, and then you plant. There is no third thing to do.',
  ]),
  njord: freeze([
    'Njord. I drive a cart on the Nesdor Way, from here to the Moros and back, and I carry what the route towns want brought.',
    'Flour and dishes I buy, for the Way. It is a long road and nobody on it wants to cook.',
    'I charge for knowing the road. Everybody who drives it knows it. I am the one who says so.',
  ]),
  adapa: freeze([
    'Adapa, factor for Ovesos in the capital. I sell flour, cloth and seed, and I buy rye, oats, fish and hay, all of which Ovesos could grow if it were given its water.',
    'I am eleven years into the Middle Reach proceeding. My submissions run to four hundred pages. The other side’s run to three hundred and ninety, which is how I know I am winning.',
    'My submissions carry the genealogy of every right in question. Some say that is excessive. Those people have never lost a right to a man whose grandfather was better documented.',
  ]),
  hapi: freeze([
    'Hapi. The barge below the storehouse is mine, and so is the one behind it when my cousin is sober.',
    'A house here, rooms in Nylon and cousins in three branch towns. A boat family is a family that is always partly somewhere else.',
    'The river is rising in the hills. The Flood Office will post it in three days. I knew three days ago, because my knee told me.',
  ]),
  amalthea: freeze([
    'Amalthea. My family grazes cattle and sheep up here, on grass that never dries out, and makes the cheese the bridge workers eat with their rye.',
    'Hay I buy, because the flock eats more of it this close to the walls. Cheese I sell, to anybody who comes up the track, the army included.',
    'I take the cheese down through the camp on market days. The soldiers count the wheels on the cart. I have never yet seen one of them count the cheeses.',
  ]),
});
export const minoraAmbientLines = id => [...(MINORA_AMBIENT[id] ?? [])];

/** Each person's own topics, which every visit offers. */
export const MINORA_TOPICS = freeze({
  manawydan: freeze([freeze({ id: 'manawydan-council', label: 'Ask about the Flood Council.', lines: freeze([
    'The Flood Council decides by consensus. Consensus is not unanimity. It means everybody has said what they will not live with, and what is left is the decision.',
    'Nethereum is in rising, as you will have heard. It rises the Nethrani way: slowly, by council, and then all at once.',
  ]) })]),
  njord: freeze([freeze({ id: 'njord-way', label: 'Ask about the Way.', lines: freeze([
    'Minora to the Moros, by the Nesdor Way: over the White Bridge, through Caricas, across the Flats and past the Army’s Line where the rope is down.',
    'The route towns post what they want on the board at the end of the Way, and I carry the same paper here. Fill it here or fill it there: it is the same order and the same copper.',
    'Forseti writes the paper and I carry it. Between us we know everything on the Way that has a price.',
  ]) })]),
  adapa: freeze([freeze({ id: 'adapa-proceeding', label: 'Ask about the Middle Reach proceeding.', lines: freeze([
    'It concerns the turns of water on the middle of the Ovesos canal, and who was owed them in my grandfather’s grandfather’s time. I have been at it eleven years.',
    'The Water Council hears it every spring and adjourns it every spring. Adjourned is not lost. I explain that to my principals every spring.',
    'If you go down to Velsorten, Nisaba keeps the register. Tell her Adapa sends his respects. She will know exactly how many.',
  ]) })]),
  hapi: freeze([freeze({ id: 'hapi-barge', label: 'Ask about the barge.', lines: freeze([
    'Flat-bottomed, twelve oars and a sail when the wind is honest. Down to Nylon on the current, and back up on the oars and on my cousins’ patience.',
    'One lot of each good a day, Fine and sealed, and nothing else. Nylon will pay for the best of the valley. It will not pay for the rest, and it says so at length.',
  ]) })]),
  amalthea: freeze([freeze({ id: 'amalthea-camp', label: 'Ask about the summer camp.', lines: freeze([
    'We took the flock up to the high grass every year, with hurdles and a cheese hut. The centaurs came through in the spring and took the hurdles, the hut and eleven ewes. The hut I can build again.',
    'This year we stay where we can see the walls. The army is closer than I would like, and the centaurs are further. You choose your neighbours by what they take.',
  ]) })]),
});

/** Amalthea's half of the rye loaf: Vertumnus teaches it in Caricas; she teaches it if he has not. */
export const AMALTHEA_LOAF = freeze([
  'Two of bridge rye, an onion worked through the dough, and a wedge of my cheese melted over the top at the fire. The bridge workers eat it standing up, which is how a bridge worker eats.',
  'Vertumnus will tell you the loaf is Carican, because the rye is. The cheese is mine. Ask him which half he would rather go without.',
]);

/** What the barge carries besides goods: the river's news, read off how far the farmlands have come. */
export function hapiNews({ farmlands = null, dividing = null } = {}) {
  const stage = id => { try { return id === 'caricas' ? farmlands?.caricas?.stage ?? null : farmlands?.arc?.(id)?.stage?.() ?? null; } catch { return null; } };
  const lines = [];
  if (stage('caricas') === 'done') lines.push('Caricas is sending rye over the White Bridge again, sealed. The garrison counts it at one end and Consus at the other, and they nearly agree.');
  if (stage('nethereum') === 'done') lines.push('They say Haethom drowned its meadow and drew it off at the shine this year. The hay coming down the Isa smells like it.');
  if (stage('nesdor') === 'done') lines.push('The Way is moving again. Njord says so, which is the same as the Way saying so, only louder.');
  if (stage('ovesos') === 'done') lines.push('Velsorten has its turns of water back, and its mill. Adapa has begun a new submission about it. I have not seen the end of it, and nor will he.');
  let held = false;
  try { held = !!dividing?.held?.(); } catch { held = false; }
  if (held) lines.push('And the Dividing was held on the Guild forecourt, with four bowls and a pot of stew. Nylon will not believe it. I am taking a bowl down to show them.');
  if (!lines.length) lines.push('Nothing moves on the river that the garrison has not already counted. That is the news, and there is not much of it.');
  return lines;
}

const HUB_LABEL = 'Back to the conversation';

/**
 * **The conversation** for everybody in this module.
 *
 * `context`: { openDialogue, closeDialogue, farmlands?, dividing?, inventory?, cooking?, openTrade?, openOrders?,
 *   notify?, onChange?, visits? }. `openOrders(npc)` is the market's orders board for whoever trades as `npc`
 *   (src/merchants.js `ordersConversation`), which for Njord is the Way board.
 */
export function minoraConversation(npc, context) {
  if (!isMinoraNpc(npc?.id)) return false;
  const { openDialogue, closeDialogue, openTrade = null, openOrders = null, visits = 0 } = context;
  const back = () => minoraConversation(npc, { ...context, visits: visits + 1 });
  const say = (lines, extra = {}) => openDialogue(npc, lines, null, HUB_LABEL, { noWayfinding: true, onComplete: back, ...extra });
  const ambient = MINORA_AMBIENT[npc.id];
  const choices = MINORA_TOPICS[npc.id].map(topic => ({ id: topic.id, label: topic.label, action: () => say([...topic.lines]) }));
  if (npc.id === 'hapi') choices.push({ id: 'hapi-news', label: 'Ask for news from the river.', action: () => say(hapiNews(context)) });
  if (npc.id === 'njord' && openOrders) choices.push({ id: 'njord-orders', label: 'Read the Way’s orders.', action: () => { closeDialogue(); openOrders(npc); } });
  if (npc.id === 'amalthea' && !knowsLoaf(context)) choices.push({ id: 'amalthea-loaf', label: 'Ask how the bridge workers eat it.', action: () => teachLoaf(npc, context, say) });
  if (openTrade && MINORA_TRADERS.includes(npc.id)) choices.push({ id: `${npc.id}-trade`, label: 'Trade', action: () => { closeDialogue(); openTrade(npc); } });
  choices.push({ id: `${npc.id}-about`, label: `Ask about ${npc.name}.`, action: () => say([ambient[(visits + 1) % ambient.length]]) });
  choices.push({ id: `${npc.id}-leave`, label: 'Good day to you.', action: closeDialogue });
  openDialogue(npc, [ambient[visits % ambient.length]], null, 'Back to the road', { noWayfinding: true, choices });
  return true;
}

/** Whether the rye loaf is already Rollo's: from Vertumnus, from Amalthea, or from anywhere the kitchen knows of. */
function knowsLoaf({ farmlands = null, cooking = null } = {}) {
  const loaf = LIZEEM_RECIPES.ryeLoaf;
  if (cooking?.knows?.(loaf)) return true;
  try { return !!farmlands?.caricas?.taught?.includes(loaf); } catch { return false; }
}

/** Amalthea teaches the loaf. A recipe counts as taught only when the kitchen takes it, as Vertumnus's do. */
function teachLoaf(npc, context, say) {
  const { farmlands = null, cooking = null, notify = null, onChange = null } = context;
  const loaf = LIZEEM_RECIPES.ryeLoaf;
  const learned = cooking?.learn ? cooking.learn(loaf) : { ok: true };
  if (learned?.ok === false) {
    notify?.(learned.reason || 'You cannot make a rye loaf yet.', 'AMALTHEA TRIED TO TEACH YOU A RECIPE');
    say(['Come back when you can keep a fire. A loaf is mostly fire, whatever the rye thinks.']);
    return;
  }
  farmlands?.noteTaught?.(loaf);
  notify?.('You can make a rye loaf with onion and river cheese now.', 'AMALTHEA TAUGHT YOU A RECIPE');
  onChange?.();
  say([...AMALTHEA_LOAF]);
}
