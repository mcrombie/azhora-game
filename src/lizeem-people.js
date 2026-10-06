/**
 * **The people of Minora and Caricas for the Farmlands of the Lizeem** (docs/lizeem-farmlands-design.md
 * 6.2 and 6.3, tiers A and B; the user, 5 October 2026: "go ahead and add people characters as
 * needed with mythological names... Give them roles in the society", and on the same day, "go ahead
 * and implement").
 *
 * Each has the role, backstory and look the design gives them, the look written in the figure kit's
 * own words (src/characters.js `createCharacter`). Nobody wears a hat. What the kit cannot draw - a
 * ring of keys, ink on the hands, bare feet, freckles, a fox pelt - is left to the role and the lines.
 *
 * Where they stand: Minora's people more than four metres from water and a metre from any building
 * (tests/menora-city.test.js), Caricas's people off the beds, the stalls and the guard posts, and all
 * of them on ground a body stands on (tests/lizeem-people.test.js measures each one on the built
 * world). They are stood up after the cast is trimmed (src/cast.js), as the frontier people are.
 *
 * Talk: two or three lines each in the game's dry voice, the first a self-introduction, and a topic
 * hub (`lizeemConversation`) for those who hold a step in the Caricas arc (src/lizeem-farmlands.js).
 * Trading is the market's (`context.openTrade`, src/merchants.js); recipes are the kitchen's
 * (`context.cooking.learn`, src/cooking.js).
 *
 * Pure: no DOM, no three; the host supplies the dialogue box.
 */
import { LIZEEM_ROLES, LIZEEM_RECIPES, MEASURE_LEAVES, TART_ITEM, carriedTart, measureEntriesFor } from './lizeem-farmlands.js';
import { LIZEEM_MARKET_STANDS } from './menora-city.js';

const freeze = Object.freeze;
/** `person(id, name, role, modelRole, color)` as src/amod-people.js has it, with the stand and look. */
const person = (id, name, role, modelRole, color, { look, x, z, yaw, ...extra }) =>
  freeze({ id, name, role, modelRole, color, hat: false, look: freeze({ ...look }), x, z, yaw, ...extra });
const GREY = 0x9a968e, WHITE = 0xe4e1d8;
/** Portunus keeps the Carican factor's stall in the market corner by the Temple Way (src/menora-city.js). */
const PORTUNUS_STAND = LIZEEM_MARKET_STANDS.find(stand => stand.factor === 'portunus');

// ---------------------------------------------------------------------------
// Minora and Isareos (design 6.2)
// ---------------------------------------------------------------------------
export const LIZEEM_MINORA_PEOPLE = freeze([
  // Fifties, grey hair pulled back, narrow, ink on both hands, dark blue tunic. The clerk's desk coat.
  person(LIZEEM_ROLES.seshat, 'Seshat', 'Keeper of the Guild’s ledger', 'relay-clerk', 0x2f3d5c,
    { look: { slight: true, dress: true, hair: GREY, hairStyle: 'long-tied' }, x: -2328, z: 59.5, yaw: 0, essential: true }),
  // Sixties, bald, trimmed white beard, leather apron over a brown tunic: broad from the sacks.
  person('lizeem-nepri', 'Nepri', 'Sworn grain clerk of the Measure House', 'mercenary', 0x6b5238,
    { look: { build: 'broad', headgear: 'bare', hairStyle: 'bald', hair: WHITE, facialHair: 'trimmed', garment: 'jerkin' }, x: -2337, z: 192.5, yaw: Math.PI }),
  // Thirties, russet hair, stubble, green tunic. The keys are his own business.
  person('lizeem-portunus', 'Portunus', 'The Carican factor', 'mercenary', 0x4f6b3c,
    { look: { headgear: 'bare', hairStyle: 'cropped', hair: 0x8b4a1f, facialHair: 'stubble', garment: 'jerkin' }, x: PORTUNUS_STAND.x, z: PORTUNUS_STAND.z, yaw: PORTUNUS_STAND.yaw }),
  // Forties, cropped brown hair, the garrison's red, a ledger: the clerk's coat and book, in the tabard's colour.
  person('lizeem-rudiger', 'Rudiger', 'Commissary to Cedric’s garrison', 'relay-clerk', 0x8f3b30,
    { look: { hairStyle: 'cropped', hair: 0x5b3a28 }, x: -2421, z: 79.5, yaw: Math.PI }),
  // Forties, cropped black hair, grey tunic with the Wardens' cord: the bridge-keeper's build without his moustache or bandanna.
  person('lizeem-imhotep', 'Imhotep', 'Warden of the White Bridge', 'bridge-keeper', 0x7c7f80,
    { look: { slight: true, hairStyle: 'short-cropped', hair: 0x141710, beard: false, hat: false }, x: -2254, z: 127, yaw: .6 }),
  // Thirties, long dark braid, pale grey robe with a blue hem.
  person('lizeem-satet', 'Satet', 'Bowl-Keeper of the Grand Temple', 'villager', 0xbfc0bc,
    { look: { slight: true, dress: true, hair: 0x221812, hairStyle: 'braid' }, x: -2343, z: 129, yaw: .34 }),
]);

// ---------------------------------------------------------------------------
// Caricas (design 6.3)
// ---------------------------------------------------------------------------
const NORTH = { x: -2105, z: 159 }, ORCHARD = { x: -2015, z: 300 };
export const LIZEEM_CARICAS_PEOPLE = freeze([
  // Seventies, white hair cropped, full grey beard, green tunic; the custodian's fieldbook is his sighting record.
  person(LIZEEM_ROLES.vertumnus, 'Vertumnus', 'Fox-keeper elder, holder of the North Farm', 'rise-custodian', 0x55703f,
    { look: { hairStyle: 'cropped', hair: 0xd8d6d0, cloak: false }, x: NORTH.x + 16, z: NORTH.z + 8, yaw: -Math.PI / 2, essential: true }),
  // Fifties, grey-streaked dark hair in a knot, a long grey-green gown. Behind the west stall of the grain court.
  person(LIZEEM_ROLES.egeria, 'Egeria', 'Voice of the Council', 'villager', 0x7d8a72,
    { look: { slight: true, dress: true, hair: 0x4a443e, hairStyle: 'topknot' }, x: -2100, z: 272.6, yaw: Math.PI, essential: true }),
  // Sixties, round, bald, white moustache, a dusty brown apron. Behind the east stall.
  person(LIZEEM_ROLES.consus, 'Consus', 'Grain factor and sworn measurer', 'mercenary', 0x7a6248,
    { look: { build: 'heavy', headgear: 'bare', hairStyle: 'bald', hair: WHITE, facialHair: 'moustache', garment: 'jerkin' }, x: -2084, z: 272.6, yaw: Math.PI, essential: true }),
  // Forties, black hair, the garrison's tabard; a soldier, armed, bare-headed as the frontier officers are.
  person(LIZEEM_ROLES.hagen, 'Hagen', 'Captain of Cedric’s garrison in Caricas', 'legion-officer', 0x722b2e,
    { look: { hairStyle: 'short-cropped', hair: 0x141210, noHat: true }, x: -2079, z: 238, yaw: -Math.PI / 2, armed: true, soldier: true, essential: true }),
  // Fifties, soot-dark, bushy grey beard, leather apron, burn scars.
  person('lizeem-ilmarinen', 'Ilmarinen', 'Toolsmith of the eastern upland', 'mercenary', 0x5b4a3a,
    { look: { build: 'broad', headgear: 'bare', hairStyle: 'cropped', hair: 0x7f7f7f, facialHair: 'bushy', garment: 'bare-forearms', marks: ['scar'] },
      skin: 0x8f6a52, x: -2091, z: 306.5, yaw: Math.PI }),
  // Forties, auburn hair loose, a green dress. At her own orchard, clear of the trees and the beds.
  person(LIZEEM_ROLES.pomona, 'Pomona', 'Orchard-wife of the East Orchard', 'villager', 0x5f7a45,
    { look: { slight: true, dress: true, hair: 0x8a3f1f, hairStyle: 'long-loose' }, x: ORCHARD.x - 5, z: ORCHARD.z - 9, yaw: Math.PI, essential: true }),
  // Sixties, long grey hair, bushy beard, a smoke-stained grey tunic. At the corridor's edge, eighty metres from the Carica.
  person('lizeem-silvanus', 'Silvanus', 'Charcoal burner of the keepers’ wood', 'mercenary', 0x6f6d66,
    { look: { headgear: 'bare', hairStyle: 'long-loose', hair: 0x999999, facialHair: 'bushy', garment: 'jerkin' }, x: -1785, z: 450, yaw: Math.PI / 2 }),
  // A young man in brown, no beard. Hidden until Caricas is restored and he comes back to reap.
  person(LIZEEM_ROLES.messor, 'Messor', 'Reaper, back on the North Farm', 'mercenary', 0x6b5232,
    { look: { headgear: 'bare', hairStyle: 'cropped', hair: 0x5c4124, facialHair: 'clean', garment: 'jerkin' }, x: NORTH.x - 6, z: NORTH.z + 9, yaw: Math.PI / 2, essential: true, hidden: true }),
]);

export const LIZEEM_PEOPLE = freeze([...LIZEEM_MINORA_PEOPLE, ...LIZEEM_CARICAS_PEOPLE]);
export const LIZEEM_PEOPLE_IDS = freeze(LIZEEM_PEOPLE.map(npc => npc.id));
export const LIZEEM_CARICAS_IDS = freeze(LIZEEM_CARICAS_PEOPLE.map(npc => npc.id));
const ids = new Set(LIZEEM_PEOPLE_IDS);
export const isLizeemNpc = id => ids.has(id);
/** Who stays out of sight now: Messor, until Caricas is restored and the hands come back. */
export const lizeemHiddenIds = farmlands => (farmlands?.handsReturned?.().includes('messor') ? [] : [LIZEEM_ROLES.messor]);

/** Who trades at all (`context.openTrade`, the market's): the rest only talk. */
export const LIZEEM_TRADERS = freeze([LIZEEM_ROLES.seshat, 'lizeem-nepri', 'lizeem-portunus', 'lizeem-rudiger', 'lizeem-satet',
  LIZEEM_ROLES.consus, 'lizeem-ilmarinen', LIZEEM_ROLES.pomona]);
/** Silvanus barters dishes for herbs "as consideration" (design 7.4); until that is built, he says why not. */
export const SILVANUS_NOT_YET = freeze(['Not this season. The wood has given me what I need, and I do not take what I cannot answer for. Come back when the fox has had a better year.']);

/** What each of them says when nothing in the arc is the subject. */
export const LIZEEM_AMBIENT = freeze({
  [LIZEEM_ROLES.seshat]: freeze([
    'Seshat. I keep the Guild’s ledger, which is the one count in Minora that no merchant house can buy a line in.',
    'I was a grain clerk at a Measure House. I caught a great house giving short measure and wrote it down. The house had friends. Taleth had a chair going spare.',
    'Fine is a grade, not a compliment. If it is not Fine I do not write it. If it is Prize I write it in gold and look at it for a while afterwards.',
  ]),
  'lizeem-nepri': freeze([
    'Nepri, sworn clerk of the Measure House. Bring me grain and I will tell you what it is, which is not always what you were told.',
    'Thirty years of sample sacks. I know which houses wet their barley and which salt the top of the sack, and which of them sit on the council.',
    'The granary feeds an army now. There is a column in my book that used to say sold. I write requisitioned in it, in a neat hand.',
  ]),
  'lizeem-portunus': freeze([
    'Portunus. Carican factor. Tools, charcoal, seed. I buy what grows on this side of the river and send it home.',
    'I was sent to the city because I could count. My brothers kept the bank. I keep the keys.',
    'A Carican submission fits on one hand. Minora reads it three times and asks what we meant.',
  ]),
  'lizeem-rudiger': freeze([
    'Rudiger, commissary to the garrison. I buy anything that can be eaten, at six-tenths of what it is worth, and I buy all of it.',
    'The garrison eats and the court eats, and the valley would rather they did not. My orders do not mention what the valley would rather.',
    'The army outside the Muster Gate is not my concern. I am told so often enough to believe it some days.',
  ]),
  'lizeem-imhotep': freeze([
    'Imhotep, Warden of the White Bridge. It is the only crossing of the Lizeem, and it is mine to keep whoever holds the city.',
    'The Blood Prince wanted his siege wagons over it. Twice. The bridge does not like lateral load, and I told him so both times.',
    'The marks on the piers are the named floods. The highest is the Grey Year. Nobody who saw it wants to talk about it, and they all do.',
  ]),
  'lizeem-satet': freeze([
    'Satet. I keep the bowls at the Grand Temple. I pour for the river, and on feast days for whoever the river is putting up with.',
    'I went into the water at eight, off my father’s boat, and came out again. The temple says I was received. My father said I was lucky. They are both right.',
    'The river did not submit to Minora. It agreed to be divided. People forget the difference, and then they are surprised in a flood year.',
  ]),
  [LIZEEM_ROLES.vertumnus]: freeze([
    'Vertumnus. My family has kept this stretch of bank for eight generations. The North Farm is mine as well, which is one thing too many.',
    'My sons are in the upland with the rest of them. I can keep the corridor or the farm, not both. The fox does not take turns.',
    'The ground keeps the fox. The rotation keeps the ground.',
  ]),
  [LIZEEM_ROLES.egeria]: freeze([
    'Egeria. I am the Voice of the Council this year. I speak for it. I do not decide for it, which is the point of me.',
    'The garrison captain asks me questions. I answer the ones he asks.',
    'The farms are idle because the families are in the upland or keeping their heads down. Neither is a crime. Both are bad for the ground.',
  ]),
  [LIZEEM_ROLES.consus]: freeze([
    'Consus. I keep the granary’s books. The garrison keeps an eye on them, and I keep an eye on the garrison’s eye.',
    'I buy the valley’s grain, I sell its seed, and I seal what deserves sealing. Bring me a lot and I will tell you what it is worth here and what it is worth in Minora.',
    'The orders on the board are real. The people who posted them are less patient than the board.',
  ]),
  [LIZEEM_ROLES.hagen]: freeze([
    'Hagen. I hold this town, the granary and the bridge road for the League. You will find me correct.',
    'The Council speaks and I listen, and afterwards the granary is still mine. We understand each other.',
    'I am not cruel. I am thorough. The town has not decided yet whether that is worse.',
  ]),
  'lizeem-ilmarinen': freeze([
    'Ilmarinen. Hoes, sickles, pruning hooks and the water yoke, in wood, iron or steel. Not swords.',
    'The iron comes off the upland shelf a basket at a time. I turn it into things that feed people, which is the better use of a basket.',
    'A man once asked me for a mill that ground out grain by itself. I said I would think about it. I am still thinking about it.',
  ]),
  [LIZEEM_ROLES.pomona]: freeze([
    'Pomona. The east orchard. I shut the gate when the soldiers came and nobody has given me a reason to open it since.',
    'Canes want rich ground and a year’s patience. Most people bring one of those.',
    'I buy soft fruit, I sell canes and preserves, and I do not sell to the garrison.',
  ]),
  'lizeem-silvanus': freeze([
    'Silvanus. I burn charcoal at the edge of the keepers’ wood, and the keepers let me, because I have never burned anything I was not asked to.',
    'Fungi, bark, the plants that grow where the water meets the trees. They are not sold. They are given, as consideration. Bring me a dish and we will see what I owe you.',
    'The fox was here an hour ago. It looked at the fire, then at me, and went away to think about it.',
  ]),
  [LIZEEM_ROLES.messor]: freeze([
    'Messor. I reaped for the Vertumnus family before the trouble. I can reap for you, for six copper a day and my dinner.',
    'I do one thing and I do it all day. If you want weeding, there is a man called Sarritor, and he is still in the upland.',
  ]),
});
export const lizeemAmbientLines = id => [...(LIZEEM_AMBIENT[id] ?? [])];

// ---------------------------------------------------------------------------
// What the Caricas arc gives them to say
// ---------------------------------------------------------------------------
/** Vertumnus on the rotation (design 5.1). */
export const ROTATION_LESSON = freeze([
  'Every bed remembers what it grew. Beans and a rest put heart back into it. Grain and fruit take it out.',
  'Bridge rye wants lean ground and falls over on rich. Barley and soft fruit want it rich. So: beans, then fruit or barley, then rye, then beans again.',
  'The same crop twice running comes up plain, and serves you right. Rye straight after beans comes up plain as well: the beans leave the ground too rich, and rye lies down on rich ground.',
  'Beans, a day’s rest, fruit or barley to take the richness off, and then rye. That is the rye that comes up fine. Put rye where the beans were on the north fields anyway, and see it for yourself.',
]);
const HUB_LABEL = 'Back to the conversation';
const grades = { fine: 'Fine', prize: 'Prize' };

/**
 * **The conversation** for everybody in this module. The arc's steps sit with the people who hold
 * them: Egeria's lease, Vertumnus's teaching, recipes and the hiding of the tenth, Hagen's claim,
 * Consus's seal and orders, Pomona's tart, Seshat's Measure and Messor's hire.
 *
 * `context`: { farmlands, openDialogue, closeDialogue, inventory?, cooking?, openTrade?,
 *   merchants?, openOrders?, measureGoods?: [{ itemId, grade, name }], hireHand?, notify?, visits? }.
 */
export function lizeemConversation(npc, context) {
  if (!isLizeemNpc(npc?.id)) return false;
  const { farmlands = null, openDialogue, closeDialogue, openTrade = null, visits = 0 } = context;
  const arc = farmlands?.caricas ?? { stage: 'waiting', taught: [], claim: null, hands: [], hired: [] };
  const back = () => lizeemConversation(npc, { ...context, visits: visits + 1 });
  const ambient = LIZEEM_AMBIENT[npc.id];
  const say = (lines, extra = {}) => openDialogue(npc, lines, null, HUB_LABEL, { noWayfinding: true, onComplete: back, ...extra });
  const leave = { id: `${npc.id}-leave`, label: 'Good day to you.', action: closeDialogue };
  const about = { id: `${npc.id}-about`, label: `Ask about ${npc.name}.`, action: () => say([ambient[(visits + 1) % ambient.length]]) };
  const trade = openTrade && LIZEEM_TRADERS.includes(npc.id)
    ? [{ id: `${npc.id}-trade`, label: 'Trade', action: () => { closeDialogue(); openTrade(npc); } }] : [];
  const barter = npc.id === 'lizeem-silvanus'
    ? [{ id: 'lizeem-silvanus-consideration', label: 'Offer him a dish as consideration.', action: () => say([...SILVANUS_NOT_YET]) }] : [];
  const choices = [...questChoices(npc, context, arc, say), ...trade, ...barter, about, leave];
  openDialogue(npc, [openingLine(npc, arc, farmlands, visits)], null, 'Back to the road', { noWayfinding: true, choices });
  return true;
}

/** The first thing said, which is the introduction the first time and the arc's business after. */
function openingLine(npc, arc, farmlands, visits) {
  const R = LIZEEM_ROLES, at = arc.stage, lines = LIZEEM_AMBIENT[npc.id];
  if (npc.id === R.egeria && at === 'bridge') return 'A man from Minora, over the bridge on foot. You will want something. People from Minora generally do.';
  if (npc.id === R.hagen && at === 'claim') return 'Your harvest is in, I am told. My quartermaster has a column for it.';
  if (npc.id === R.hagen && farmlands?.regard?.(R.hagen) > 0) return 'You filled the column without being asked twice. I have written that down as well.';
  if (npc.id === R.vertumnus && at === 'claim') return 'Hagen’s quartermaster has been at the north fields with his tally stick. You will have heard.';
  if (npc.id === R.vertumnus && farmlands?.regard?.(R.vertumnus) > 0) return 'The upland ate this week. I am not going to say anything else about it, and neither are you.';
  if (npc.id === R.consus && at === 'tart') return 'You have the look of a man who has been baking. Bring it here and let me see it.';
  if (npc.id === R.messor && arc.hired?.includes('messor')) return 'The north fields are reaped when they are ripe. That is the arrangement, and I keep it.';
  return lines[visits % lines.length];
}

function questChoices(npc, context, arc, say) {
  const { farmlands, closeDialogue, inventory = null, cooking = null, merchants = null, openOrders = null,
    measureGoods = null, hireHand = null, notify = null } = context;
  if (!farmlands) return [];
  const R = LIZEEM_ROLES, at = arc.stage, out = [];
  // A recipe counts as taught only when the kitchen takes it (6 October 2026): without Fire Making
  // or Cooking the lesson is heard and not kept, and the choice stays offered for another day.
  const learn = (id, name) => {
    const learned = cooking?.learn ? cooking.learn(id) : { ok: true };
    if (learned?.ok === false) { notify?.(learned.reason || `You cannot make ${name} yet.`, `${npc.name.toUpperCase()} TRIED TO TEACH YOU A RECIPE`); return false; }
    farmlands.noteTaught(id);
    notify?.(`You can make ${name} now.`, `${npc.name.toUpperCase()} TAUGHT YOU A RECIPE`);
    return true;
  };
  if (npc.id === R.egeria && at === 'bridge') out.push({ id: 'lizeem-egeria-lease', label: 'Ask for land to work.', action: () => {
    farmlands.lease();
    say(['The North Farm is Vertumnus’s, and he cannot work it. Custom lets the Council lend idle ground for a season.',
      'One in four of whatever it bears goes to the granary for the family that holds it. The rest is yours. That custom is older than the garrison.',
      'Three beds on the north fields, a shed and a seed bench. Vertumnus will tell you what to put in them, at length.']);
  } });
  if (npc.id === R.vertumnus && farmlands.accepted()) {
    out.push({ id: 'lizeem-vertumnus-rotation', label: 'Ask about the rotation.', action: () => say([...ROTATION_LESSON]) });
    if (!arc.taught.includes(LIZEEM_RECIPES.pottage) || !arc.taught.includes(LIZEEM_RECIPES.ryeLoaf)) out.push({ id: 'lizeem-vertumnus-recipes', label: 'Ask how the valley cooks.', action: () => {
      learn(LIZEEM_RECIPES.pottage, 'bean pottage'); learn(LIZEEM_RECIPES.ryeLoaf, 'a rye loaf');
      say(['Two of beans, one of barley, and the pot left alone longer than you think it wants. That is pottage.',
        'Rye loaf: two of rye, an onion if you have one, and river cheese if you have friends in the hills.']);
    } });
    if (at === 'claim') out.push({ id: 'lizeem-vertumnus-hide', label: 'Hide the tenth for the families in the upland.', action: () => {
      farmlands.settleClaim('hide');
      say(['Then it goes up the shelf tonight, in a sack that was never on anybody’s tally. My sons will eat it and not know whose it was. That is how it should be.',
        'If the quartermaster asks, the north fields were thin this year. They were. Everybody’s were.']);
    } });
  }
  if (npc.id === R.hagen && at === 'claim') {
    out.push({ id: 'lizeem-hagen-claim', label: 'Ask about the claim.', action: () => say([
      'A tenth of the north fields’ harvest for Cedric’s granary, and of what comes after until your rye is in. It is not a fine. It is a column, and the column has to be filled.',
      'Egeria’s quarter is between you and the Council. My tenth is between you and the League.']) });
    out.push({ id: 'lizeem-hagen-hand', label: 'Hand over the tenth.', action: () => {
      farmlands.settleClaim('hand');
      say(['Good. My quartermaster will take it at the bench as it comes in. You will find the garrison has a long memory for people who make its work shorter.']);
    } });
    out.push({ id: 'lizeem-hagen-thin', label: 'Tell him the harvest was thin.', action: () => {
      farmlands.settleClaim('hide');
      say(['Thin. My quartermaster will write thin. I will read it, and we will both know what I have read.']);
    } });
  }
  if (npc.id === R.pomona && farmlands.accepted() && !arc.taught.includes(TART_ITEM)) {
    const rested = ['claim', 'fine', 'tart', 'carry', 'done'].includes(at);
    out.push({ id: 'lizeem-pomona-tart', label: 'Ask how the tart is made.', action: () => {
      if (!rested) { say(['Rest your ground first. Rye where the beans were, on the north fields. Then come and ask me about tarts.']); return; }
      learn(TART_ITEM, 'a soft-fruit tart');
      say(['You rested the north fields. Vertumnus told me, which he does not do. The gate is open.',
        'Two of soft fruit, one of rye for the crust, and an oven that is not in a hurry. Fine fruit makes a Fine tart. Plain fruit makes something you eat standing up.']);
    } });
  }
  if (npc.id === R.consus) {
    const tart = carriedTart(inventory);
    if (at === 'tart' && tart) out.push({ id: 'lizeem-consus-seal', label: 'Have the tart sealed.', action: () => {
      // The seal is the market's (src/merchants.js); a tart sealed already through the trade counts.
      const already = merchants?.sealed?.(tart)?.count > 0;
      const sealed = !already && merchants?.seal ? merchants.seal(tart, 1, { by: 'consus' }) : null;
      if (sealed && sealed.ok === false) { say([sealed.reason || 'Not that one. Bring me something worth the wax.']); return; }
      farmlands.sealTart();
      say(['Soft fruit, a rye crust, baked through. Measured, and sealed. That seal is good in Minora, which is more than can be said for most things from this side of the bridge.',
        'Do not eat it on the bridge.']);
    } });
    if (openOrders) out.push({ id: 'lizeem-consus-orders', label: 'Read the orders board.', action: () => { closeDialogue(); openOrders(npc); } });
  }
  if (npc.id === R.seshat && farmlands.accepted()) {
    out.push({ id: 'lizeem-seshat-measure', label: 'Ask about the Measure.', action: () => say(measureLines(farmlands)) });
    const goods = Array.isArray(measureGoods) ? measureGoods : measureGoodsFrom(context);
    for (const good of goods.filter(item => measureEntriesFor(item?.itemId).length && grades[item.grade]).slice(0, 4))
      out.push({ id: `lizeem-measure-${good.itemId}`, label: `Lay ${good.name ?? good.itemId} before the Measure (${grades[good.grade]}).`, action: () => {
        const result = farmlands.enter(good.itemId, good.grade);
        if (!result.ok) { say([result.reason]); return; }
        inventory?.remove?.(good.itemId, 1);
        context.onMeasure?.(result);
        say([result.grade === 'prize' ? 'Prize. In gold, then. Give me a moment with it.' : 'Fine. Written, and laid up in the tower where it will outlast both of us.',
          ...(result.full ? ['That is the Caricas leaf full. Taleth will want to know before you have finished telling him.'] : [])]);
      } });
  }
  if (npc.id === R.messor && arc.hands?.includes('messor') && !arc.hired?.includes('messor')) out.push({ id: 'lizeem-messor-hire', label: 'Hire Messor to reap the north fields.', action: () => {
    // The first day's wage is paid at the hire (src/lizeem-farmlands.js `hire`; 6 October 2026).
    const ok = (hireHand ? hireHand(npc) !== false : true) && farmlands.hire('messor');
    say([ok ? 'Six copper a day, and I reap what is ripe. You will not need to tell me which.' : 'Six copper a day. Come back when you have it.']);
  } });
  return out;
}

/**
 * What the traveler can lay before the Measure: the fine kind of each food of a walked leaf he carries
 * (`bridge-rye-fine`, src/prices.js), sealed by a measurer when there is a market to ask, since
 * away from home Fine counts only under seal (design 4.4). Prize is what the seal says it is. The
 * leaves walked are the quest's to say (`farmlands.measureView`); without it, Caricas's alone.
 */
export function measureGoodsFrom({ inventory = null, merchants = null, farmlands = null } = {}) {
  if (!inventory?.count) return [];
  const names = { 'bridge-rye': 'Fine bridge rye', 'field-beans': 'Fine field beans', 'soft-fruit': 'Fine soft fruit', [TART_ITEM]: 'a Fine soft-fruit tart' };
  // The other countries' foods (6 October 2026), once their leaves are walked.
  const walked = new Set(farmlands?.measureView?.().leaves.filter(leaf => leaf.walked).map(leaf => leaf.id) ?? []);
  for (const leaf of MEASURE_LEAVES.filter(entry => entry.id !== 'caricas' && walked.has(entry.id)))
    for (const item of leaf.lines.flatMap(entry => entry.items)) names[item] ??= `Fine ${item.replace(/-/g, ' ')}`;
  return Object.keys(names).map(base => `${base}-fine`).filter(id => inventory.count(id) > 0)
    .map(id => ({ id, seal: merchants?.sealed?.(id) ?? null }))
    .filter(({ seal }) => !merchants?.sealed || seal?.count > 0)
    .map(({ id, seal }) => ({ itemId: id, grade: seal?.prize > 0 ? 'prize' : 'fine', name: names[id.slice(0, -5)] }));
}

/** Seshat reading the Measure back. */
function measureLines(farmlands) {
  const view = farmlands.measureView();
  return [
    'The Measure is four leaves, one for each country, and four lines on each: three crops and the country’s dish. Fine or better, and sealed, or I do not write it.',
    ...view.leaves.map(leaf => !leaf.walked ? `${leaf.name}: not yet walked.`
      : `${leaf.name}: ${leaf.lines.map(entry => `${entry.name.toLowerCase()}, ${entry.prize ? 'Prize' : entry.filled ? 'Fine' : 'not yet'}`).join('; ')}.`),
  ];
}
