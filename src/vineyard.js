/**
 * Imani, who keeps the vines at Vaervelm Caelazh, and keeps something else as well.
 *
 * Livia makes the wine and Nico keeps the cellar; the fruit they both work with
 * is Imani's, and everything that decides what it will taste like happened out on
 * the hill months before a glass was poured. She is in the rows most of the year
 * with secateurs, a notebook and a pair of spectacles for close work: buds, mites
 * on the back of a leaf, her own handwriting. She has kept a book for every block
 * for eleven years — budburst, flowering, veraison, picking, and what the wine did
 * afterward.
 *
 * She will walk the traveler down any of the eight blocks and say what she does to
 * it and why (`VINE_WORK`), take them through the year in the order it happens
 * (`VINE_YEAR`), and explain why every vine on the hill but the Norton is two vines
 * spliced together (`GRAFTING`). Walking a block teaches the wine skill: the ground
 * is half of what ends up in the glass. Walking all eight teaches the rest of it.
 *
 * And there are the carriages. Imani owns one, her mother owns the other, and her
 * mother drives Imani's while Imani drives her mother's; it has been that way for
 * two years and she will not go into it. Hers is called Petunia, because her mother
 * named it. Her mother's has no name, because Imani will not name a carriage. Livia's
 * is called Bertha and has not moved since the army took the mule.
 *
 * Slung under Petunia's bed, on four leather straps between the axles, is a box.
 * Imani says it is tools. It is not tools. It is the only dragon anybody in Azhora
 * has seen alive, it hatched in her hands out of the bottom of the Norton block, it
 * cannot be kept still, and that is the entire reason her mother is on the roads all
 * day and Imani is standing in a row — which is the part she never explains. The
 * traveler hears it only after walking every block with her (`DRAGON_TOLD`), and is
 * given a shed scale that is warm on the side pointing home (`DRAGON_SCALE`). Where
 * that goes is still to be written.
 *
 * Pure: no DOM, no three.
 */
import { wineryPoint, VARIETIES, VARIETY_IDS } from './winery.js';
import { WINE_SKILL } from './wine.js';

const freeze = Object.freeze;

// Never the traveler's own model: a dark-skinned woman with a blunt black bob and
// spectacles, in a work shirt and a stained canvas apron with the shears in its pocket.
export const IMANI = freeze({
  id: 'vine-keeper', name: 'Imani', role: 'Keeper of the vines at Vaervelm Caelazh',
  modelRole: 'vine-keeper', color: 0x4b6b5e, skin: 0x6a4530,
});
/**
 * In the aisle between the Cabernet Franc and the Merlot: a three-metre gap between blocks,
 * running north and south the way every row on the hill does. She stands in the middle of it
 * facing along it, turned a little toward the Cabernet Franc row at her right hand, which is
 * the one she is working. Standing across an aisle would put her face in a canopy.
 */
export const IMANI_STAND = freeze({ ...wineryPoint(42.9, 4), yaw: 0.18 });

/** What a block is worth the first time she walks it, and what the eighth one is worth on top. */
export const ROW_XP = 12;
export const ROW_BONUS = 30;
/** The scale she hands over when she finally says what is in the box. */
export const DRAGON_SCALE = 'dragon-scale';

/**
 * The working of each block: what she does to it through the year and what happens if
 * she gets it wrong. The plates at the block heads say what the vine looks like
 * (`VARIETIES[id].vine`); this is the part of the wine that is decided outdoors.
 */
export const VINE_WORK = freeze({
  viognier: freeze({ work: [
    'Fussy, this one. Half the flowers drop in a wet June and it sets a shy crop, so I prune it long — ten buds to a cane where the others get six — just to be left with enough fruit to bother pressing.',
    'Then I pull the leaves off the morning side only. It wants sun on the berries and it burns like a redhead, so it gets the gentle half of the day and shade through the afternoon.',
    'And the window to pick it is about five days wide. Early and it is green water. Late and it is apricot jam and the sugar has run away with it. I walk this block every morning for a fortnight, eating berries, and then one morning I say today, and everybody drops what they are doing.',
  ] }),
  chardonnay: freeze({ work: [
    'It buds first of anything on this hill, which means the spring frost finds it first as well.',
    'So this block is pruned last of all, in the very end of winter, to hold it back three or four days. That is the whole of the trick, and three days is often the difference between a crop and no crop.',
    'On a clear still night in the spring, when the air goes to nothing and the cold lies down on the ground, we are out at the row ends before dawn burning damp straw so the smoke sits over the buds. You are welcome to come and be cold with us.',
  ] }),
  'vidal-blanc': freeze({ work: [
    'The hardy one. A winter that kills the Viognier back to the ground leaves Vidal grumbling and carrying on. It is a crossed vine, bred to be tough, and it is the reason we are not ruined in a hard year.',
    'Big heavy clusters. I cut the shoulder off each one in the summer so what is left ripens together instead of half green and half raisin.',
    'And the six far rows I do not pick in the autumn at all. They get netted and left hanging, through the leaf fall, through the first frosts, until a night comes hard enough to freeze the berries solid on the vine. Then we pick in the dark, in gloves, and press them still frozen. Livia has the wine; ask her for it.',
  ] }),
  'cabernet-franc': freeze({ work: [
    'The grape this hill was looking for. It ripens before the autumn storms come up the valley off the sea, and on this coast that is the whole argument, every year.',
    'I hedge it twice in the summer and open the fruit line on the morning side so the air moves through the bunches. Anything that stays wet here has mildew on it by the first week of the dry month.',
    'If you taste green pepper in that wine, it is because I left too many leaves on and the fruit never saw the sun. That is mine, not Livia’s. She has been kind about it exactly once.',
  ] }),
  merlot: freeze({ work: [
    'Thin skins, early sugar, and every bird in West Suval knows the week it turns. The nets go on this block first, before the others are thought about.',
    'Katy up by the pool tells me what is working the rows — waxwings mostly, and one thrush that has got under the nets twice and which I have come to respect.',
    'And if it rains three days in the harvest the berries swell and split, and then I am out here cutting rot out cluster by cluster, because one bad bunch in a basket walks into the cellar and spoils a whole lot. Nico will tell you the cellar is where wine is saved. The cellar is where it is kept. It is saved out here.',
  ] }),
  'petit-verdot': freeze({ work: [
    'Last thing picked on the hill, so it has the warmest end of the slope: the top corner, where the stone holds the heat of the day overnight and gives it back.',
    'In a cool year it does not get there at all and we sell the fruit off. In a good year it is the best thing we grow.',
    'In high summer I go down these rows and drop half the crop on the ground, green, so the half that is left has the whole vine behind it. Visitors cannot stand watching it. They ask whether we could not just make more wine. We could. It would not be worth drinking.',
  ] }),
  tannat: freeze({ work: [
    'Too much of everything: skin, seed, colour, grip. Left to itself it makes a wine that wants twenty years and gets drunk in two.',
    'So this is the one block I let carry a heavy crop on purpose. More bunches on the vine means less of all that in each of them — the vine spreads itself thinner — and what comes out is something a person can drink this side of old age.',
    'And it is tied up high. It would grow through the fence and into the wood if I turned my back on it for a season.',
  ] }),
  norton: freeze({ work: [
    'The native vine. It was growing wild up the trees on this hill before anybody planted a row here, and it has never given the idea up, so it gets cut back harder than anything else in the vineyard.',
    'It shrugs off the damp that takes the others. I have not sprayed it for anything in eleven years.',
    'And it is the only vine standing here on its own roots. Every other block is two vines. Ask me, if you want the long answer.',
  ] }),
});

/** Why every block but the Norton is two vines spliced at a knuckle above the soil. */
export const GRAFTING = freeze([
  'The top is the grape — Viognier, Merlot, whatever the plate at the head of the block says. The bottom is a root grown from the native vine’s kin, and the two were cut, fitted, bound and waxed together in a shed over a winter.',
  'It is because of a louse. There is a thing in this ground that eats the roots of the foreign vines and leaves the native ones alone; the natives grew up with it and have made their peace. A block of Viognier on its own roots would be sickly in three years and dead in six, and it would take the ground with it.',
  'So: cut a bud off the vine you want, cut a notch in the root you trust, bind them, wax them, keep them warm and damp until they take. About half take. The other half go on the fire in the spring.',
  'Dig one up and you will find the join a hand above the soil — a knuckle with a scar all the way round it. Everything you have ever drunk off this hill grew up through that scar.',
]);

/** The year in the vineyard, in the order it happens. Nico's walk is the making; this is the growing. */
export const VINE_YEAR = freeze([
  'Deep winter, and pruning. Every vine on this hill goes through my hands once — two thousand of them — and what I choose to leave on each one is the entire crop. There is no fixing it later. Cut wrong in the cold and you are wrong all the way to the glass.',
  'End of winter: the prunings dragged out to the headland and burned, the posts put back, the wires strained tight again. The smoke off a vineyard in the cold is the best smell of my year.',
  'Spring, budburst, and no sleep. Clear still nights are the enemy now. We watch the sky, and when the air goes to nothing we are out before dawn with damp straw.',
  'Early summer, flowering. Ten days, and the whole size of the crop is settled inside them. Rain in that week and half the berries never set at all, and nothing anybody does afterward changes it.',
  'Summer is one long job in four parts: thin the shoots, tuck the canopy up into the wires, hedge the tops, pull the leaves off the morning side. Air and light to the fruit, and keep it dry. That is all any of it is.',
  'High summer, veraison: the reds turn from green to black over about ten days and the whites go soft and gold. That is when the green crop comes off the blocks that need it, and when the nets go on.',
  'Autumn, picking, block by block as they come ripe — Chardonnay first, Petit Verdot and Norton last. I walk each block in the morning and eat berries until I am certain, and then it is baskets and everybody’s back.',
  'Then the leaves go yellow and drop and the vine goes to sleep, and I start again at the first row. Twelve months, one crop, one chance at it. Eleven times now.',
]);

/**
 * The carriages. Imani owns Petunia and her mother drives it; her mother owns the
 * other one and Imani drives that; it is not explained. The last line is where she
 * nearly explains it, and stops.
 */
export const CARRIAGE_TALK = freeze([
  'There are two carriages. I own one and my mother owns the other. My mother drives mine. I drive hers. It has been that way two years and I would rather not go into it.',
  'Mine is called Petunia. I did not name it. My mother named it the week she started driving it, which tells you a great deal about my mother and nothing whatever about the arrangement.',
  'Hers — the one I drive — is not called anything. It is a carriage. You do not name a thing you are only borrowing, and one name in a family is plenty.',
  'Livia’s is called Bertha. Bertha has not moved since the army took the mule, and Livia still says her name like she is in the next room listening.',
  'Petunia is out most days, which suits everybody. My mother likes the roads, the horse likes the work, and the box under the bed likes the— the tools. There is a box of tools slung under the bed. Was there anything else?',
]);

/** What is actually in the box. Said once, after every row on the hill has been walked. */
export const DRAGON_TOLD = freeze([
  'You have walked every row on this hill with me and not once told me I was doing any of it wrong, so I am going to say a thing out loud that I have not said out loud in eleven years. The box under Petunia is not tools.',
  'It is the size of a seed crate, slung under the bed between the axles on four leather straps, and there is a dragon in it.',
  'It hatched in my hands out of the bottom of the Norton block, in the wet ground, in the same corner Lakota dug his jaw out of. I was nineteen and I had gone down there to see why four vines were dying, and they were dying because something underneath them was warm.',
  'It is the length of my forearm and no longer. Slate-coloured, wet-looking, hot all the way through like a stone that has sat in the sun, and it will not be still. Keep it in one place more than a day or two and it wakes up, and it gets hotter, and the air around it starts to smell like a smithy.',
  'On the road, with the wheels turning under it, it sleeps like a baby. So my mother drives, every day, all day, up the coast and back again, and I stand in a row with a pair of shears, and the two of us have never once discussed why.',
  'It eats the thrushes that get under the nets. I take them down to it. Katy has never understood why I am so calm about the thrushes.',
  'And the jaw on Livia’s mantel is not a cow’s, and it is not a lizard’s either. Lakota was closer than he ever knew, and nobody has told him, and nobody has told Livia, and now there is you.',
]);

/** What she says handing over the scale. */
export const SCALE_GIVEN = freeze([
  'Here. It threw this in the spring; they shed, the way a snake does, a little at a time.',
  'Keep it in a pocket and do not show it to anybody. It is warm on one side and cold on the other, always, and the warm side is the side that is pointing at the rest of it.',
  'I do not know what that is for yet. Eleven years and I have not worked it out. But you are on the roads and I am not, so you may work it out first. Come and tell me if you do.',
]);

/** What she says while she works, one at a time, round and round. */
export const IMANI_LINES = freeze([
  'I keep a book for every block: when it budded, when it flowered, when it turned, when it came in, and what the wine did afterward. Eleven years of it, up in the cabin. Livia makes the wine; the book makes the next one better.',
  'People think a vineyard is a garden. It is a hillside argument with the weather, and you lose a little of it every year.',
  'Limestone under a hand’s depth of clay. That is the reason for all of this — the roots go down through the cracks after water and they find it in high summer, when the grass on the downs has gone brown and everything else has given up.',
  'A troop of horse came through the Tannat in the spring taking what they wanted. Nine posts and four vines broken. The vines I can replace in three years. I wrote down their standard, and the day, and what their officer looked like.',
  'The spectacles are for close work: buds, a mite on the underside of a leaf, my own handwriting. Past the end of a row I have never needed them.',
  'Lakota? He would stop an entire picking to watch a hawk go over. I would have had him off this hill in a week. Livia kept him four years and she was right and I was wrong, which she has not mentioned since. Often.',
  'My mother went out at first light and will be back at dark, as ever. No, she is not delivering anything. She likes the roads.',
]);

export const VINEYARD_VERSION = 1;
/** 'unknown' (the box is tools); 'told' (the traveler knows, and carries the scale). */
export const DRAGON_STAGES = freeze(['unknown', 'told']);

export function validateVineyardSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== VINEYARD_VERSION) return false;
  if (typeof data.met !== 'boolean' || typeof data.carriages !== 'boolean') return false;
  if (!DRAGON_STAGES.includes(data.dragon)) return false;
  if (!Array.isArray(data.walked) || data.walked.length > VARIETY_IDS.length) return false;
  return data.walked.every(id => VARIETY_IDS.includes(id)) && new Set(data.walked).size === data.walked.length;
}

export function createVineyard({ skills, onEvent = () => {} } = {}) {
  const state = { met: false, walked: new Set(), carriages: false, dragon: 'unknown' };

  function meet() { const first = !state.met; state.met = true; return { first }; }

  /**
   * She walks a block and says what she does to it. The first time each block is walked
   * it teaches the wine skill; the eighth teaches `ROW_BONUS` more on top.
   */
  function walk(variety) {
    const entry = VINE_WORK[variety];
    if (!entry) return { ok: false, reason: 'Nothing of that name grows here.' };
    const first = !state.walked.has(variety);
    state.walked.add(variety);
    const complete = first && state.walked.size === VARIETY_IDS.length;
    const xp = first ? ROW_XP + (complete ? ROW_BONUS : 0) : 0;
    const gained = xp ? skills?.gain?.(WINE_SKILL, xp) ?? { ok: false } : null;
    onEvent({ type: 'block-walked', variety, first, complete });
    return { ok: true, first, complete, entry, xp, name: VARIETIES[variety].name, levelled: !!gained?.levelled };
  }

  /** The carriage business, ending in the box she says is tools. */
  function hearCarriages() { const first = !state.carriages; state.carriages = true; return { first }; }
  /** She can only be asked about the box once she has let it slip and the whole hill has been walked. */
  const dragonReady = () => state.dragon === 'unknown' && state.carriages && state.walked.size === VARIETY_IDS.length;
  /** She says what is in it, and hands over a shed scale. */
  function tellDragon(inventory) {
    if (state.dragon !== 'unknown') return { ok: false, first: false };
    state.dragon = 'told';
    inventory?.grant?.(DRAGON_SCALE);
    onEvent({ type: 'dragon-told' });
    return { ok: true, first: true };
  }

  const walked = () => VARIETY_IDS.filter(id => state.walked.has(id));
  const view = () => ({ met: state.met, walked: walked(), walkedCount: state.walked.size, total: VARIETY_IDS.length,
    complete: state.walked.size === VARIETY_IDS.length, carriages: state.carriages, dragon: state.dragon,
    blocks: VARIETY_IDS.map(id => ({ id, name: VARIETIES[id].name, colour: VARIETIES[id].colour, walked: state.walked.has(id) })) });

  const snapshot = () => ({ version: VINEYARD_VERSION, met: state.met, walked: walked(), carriages: state.carriages, dragon: state.dragon });
  function restore(data) {
    state.met = false; state.walked = new Set(); state.carriages = false; state.dragon = 'unknown';
    if (!validateVineyardSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.walked = new Set(data.walked); state.carriages = data.carriages; state.dragon = data.dragon;
    return true;
  }

  return { meet, walk, view, snapshot, restore, hearCarriages, tellDragon,
    get met() { return state.met; }, get walkedCount() { return state.walked.size; },
    get complete() { return state.walked.size === VARIETY_IDS.length; },
    get carriages() { return state.carriages; }, get dragon() { return state.dragon; },
    get dragonReady() { return dragonReady(); },
    hasWalked: id => state.walked.has(id) };
}

/**
 * Imani out in the rows. `act('walk-block-<variety>')` runs a walk in the host and
 * `act('tell-dragon')` hands over the scale, so both go through the same door every
 * other gain does. `visits` rotates what she says while she works.
 */
export function imaniConversation(npc, context) {
  const { vineyard, openDialogue, closeDialogue, act, wine = null, visits = 0 } = context;
  if (npc?.id !== IMANI.id) return false;
  const again = () => imaniConversation(npc, { ...context, visits: visits + 1 });
  const leave = { id: 'leave-imani', label: 'I will let you work.', action: closeDialogue };
  const tell = (lines, back = 'Back to the rows') => openDialogue(npc, [...lines], null, back, { onComplete: again });

  const blocks = {
    id: 'walk-a-block', label: vineyard.complete ? 'Walk me down a block again.' : 'Walk me down a block.',
    action: () => openDialogue(npc, [vineyard.complete
      ? 'Any of them. You have had the whole hill off me once; I do not mind saying it twice.'
      : 'Pick one and we will walk it. It is quicker than explaining it, and you will remember it.'],
    null, 'Which block', { choices: [
      ...VARIETY_IDS.map(id => ({ id: `walk-block-${id}`, label: `The ${VARIETIES[id].name}${vineyard.hasWalked(id) ? ', again' : ''}.`,
        action: () => { closeDialogue(); act(`walk-block-${id}`); } })),
      { id: 'back-from-blocks', label: 'Another time.', action: again },
    ] }),
  };
  const year = { id: 'vine-year', label: 'What does a year out here look like?', action: () => tell(VINE_YEAR) };
  const graft = { id: 'vine-grafting', label: 'You said every vine is two vines.', action: () => tell(GRAFTING) };
  const work = { id: 'imani-talk', label: 'How is it going?', action: () => tell([IMANI_LINES[visits % IMANI_LINES.length]]) };
  // The carriage on the lane is the traveler's own business to raise; the last line of it is a slip.
  const carriages = { id: 'imani-carriages', label: 'Whose carriage is that on the lane?',
    action: () => { vineyard.hearCarriages(); tell(CARRIAGE_TALK); } };
  // Only once she has let the box slip and the whole hill has been walked with her.
  const dragon = { id: 'imani-dragon', label: 'What is in the box under Petunia?',
    action: () => openDialogue(npc, [...DRAGON_TOLD, ...SCALE_GIVEN], null, 'Take the scale', { onComplete: () => act('tell-dragon') }) };
  const kept = { id: 'imani-dragon-again', label: 'How is the thing in the box?', action: () => tell([
    'Asleep, and half way up the coast road by now. It is a better life than it sounds. It has never once been shut in a cellar or shown to anybody.',
    'Anything from the scale? No. Warm on the one side, as ever. You will know before I do.',
  ]) };

  if (!vineyard.met) {
    vineyard.meet();
    openDialogue(npc, [
      'Stand there a moment — mind the wire, it is strained tight enough to take a finger off.',
      '…There. Look under that leaf. That is a mite, and if I had not looked this morning there would be forty of them by the end of the week and a bald row by harvest.',
      'Imani. I keep the vines. Livia makes the wine out of them and Nico looks after it in the barrel, and the pair of them get told how clever they are by people who have never stood in a row in the rain in the cold month.',
      'Which is fair enough. Nobody comes up a lane to admire a vineyard in winter. Was it the wine you came for?',
    ], null, 'Back to the rows', { choices: [
      ...(wine && !wine.met ? [{ id: 'imani-to-livia', label: 'I came to learn about wine.', action: () => tell([
        'Then go up to the cabin and let Livia pour for you; she will teach you the glass end of it properly.',
        'And when you have, come back down and I will walk you through where any of it came from. Half of what you taste up there was decided out here, in a cold month, by me, with a pair of shears.',
      ]) }] : []),
      blocks, year, carriages, work, leave,
    ] });
    return true;
  }
  openDialogue(npc, [vineyard.complete
    ? 'Back again. You have walked the whole hill with me now, which is more than the soldiers managed and they were here a week.'
    : `Back again. ${vineyard.walkedCount ? `You have had ${vineyard.walkedCount} of the eight blocks off me.` : 'Eight blocks, and I will walk you down any of them.'}`],
  null, 'Back to the rows', { choices: [blocks, year, graft,
    ...(vineyard.dragonReady ? [dragon] : vineyard.dragon === 'told' ? [kept] : [carriages]), work, leave] });
  return true;
}
