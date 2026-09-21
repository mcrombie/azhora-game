/**
 * Wine, the traveler's skill of looking, smelling and tasting properly. Lakota
 * learned it at Vaervelm Caelazh, Paradise Springs (src/winery.js), and teaches
 * the first of it in Tidehaven, then sends the traveler to the winery itself, in
 * the north-east of West Suval, with a warning about the war around Solis.
 * Livia Seravo pours there; every wine tasted properly for the first time
 * teaches something.
 *
 * The wines are the eight grapes of its blocks, real varieties the Virginia
 * vineyards grow: Viognier, Chardonnay and Vidal Blanc; Cabernet Franc, Merlot,
 * Petit Verdot, Tannat, and Norton, the native vine.
 *
 * Once the traveler has tasted four of the eight, Livia opens the cellar: five
 * more wines made from those same grapes by the other things a winemaker can do
 * to them — a second fermentation shut inside the bottle, a red pressed straight
 * off its skins, white grapes picked frozen, a white left on its skins in clay,
 * and a red stopped with spirit while it is still sweet. Each is a real way wine
 * is made, and each teaches more than the plain bottling does.
 *
 * The skill also carries the words for what is in the glass (`TASTING_TERMS`),
 * which arrive as it levels, and Nico's walk through the cellar (`CELLAR_WALK`),
 * which is the making of it in order.
 * Pure: no DOM, no three.
 */
import { VINTNER, CELLAR_HAND, WINEMAKER, KAT_LINES, WINERY, VARIETIES } from './winery.js';
import { ATTIC_WINES, ATTIC_WINE_IDS } from './attic-wines.js';

export const WINE_VERSION = 1;
export const WINE_SKILL = 'wine';
export const VISIT_XP = 25;

const wine = (id, entry) => Object.freeze({ id, name: VARIETIES[id].name, colour: VARIETIES[id].colour, ...entry });
export const WINES = Object.freeze({
  viognier: wine('viognier', { xp: 15,
    note: 'Pale gold. Apricot and honeysuckle on the nose, round and soft in the mouth, and a little bitter at the end like the skin of the fruit.',
    lore: 'The white this country is proudest of. It is fussy in the vineyard and generous in the glass, which Livia says describes most of her family.' }),
  chardonnay: wine('chardonnay', { xp: 10,
    note: 'Straw coloured. Baked apple, butter and a smell of the barrel it rested in, cream and a little smoke.',
    lore: 'It will taste of wherever you grow it and whatever you keep it in. Here, of the hall’s oak.' }),
  'vidal-blanc': wine('vidal-blanc', { xp: 15,
    note: 'Pale and bright. Grapefruit, pineapple and green apple, off-dry, with an edge of acid that keeps it lively.',
    lore: 'The hardy one: it laughs at a winter that kills the others. The rows at the end are left hanging into the cold, and what they make then is sweet enough to finish a meal.' }),
  'cabernet-franc': wine('cabernet-franc', { xp: 15,
    note: 'Bright ruby. Red cherry, a green note like a snapped pepper, and something like pencil shavings. Light enough to drink cool.',
    lore: 'The red that suits this ground best: it ripens before the autumn storms, when its cousins are still hard and green.' }),
  merlot: wine('merlot', { xp: 10,
    note: 'Deep garnet. Plum and black cherry, soft and round, the tannin like velvet rather than sandpaper.',
    lore: 'The easy red, the one Livia pours for soldiers. It forgives a cold year better than it forgives a wet one.' }),
  'petit-verdot': wine('petit-verdot', { xp: 15,
    note: 'Nearly black. Violets, blueberry and ink, and a grip that dries your whole mouth. It wants food, or ten years.',
    lore: 'Elsewhere it goes into a blend a spoonful at a time. Here it ripens fully, and Livia bottles it on its own out of pride.' }),
  tannat: wine('tannat', { xp: 20,
    note: 'Black at the rim. Blackberry, smoke and leather, and more grip than anything else in the cellar.',
    lore: 'Named, they say, for the very thing it has most of. Five years in the barrel before Livia will pour it for anyone, and she still warns them.' }),
  norton: wine('norton', { xp: 20,
    note: 'Deep purple. Wild and grapey, dark plum and a smell of the woods after rain. Nothing else tastes like it.',
    lore: 'The native vine. It grew wild on this coast before anyone planted a row, and it laughs at the rot that kills the imported ones. Lakota’s favourite, and he will tell you so.' }),
});
/**
 * What else the cellar does with the same eight grapes. `from` is the block it starts in,
 * `made` is how it is made — each one a real method, done here the way it is done anywhere.
 * Livia keeps these back until somebody has tasted four of the plain wines: they are easier
 * to understand once you know what the grape tastes like on its own.
 */
const cellarWine = (id, entry) => Object.freeze({ id, cellar: true, ...entry });
export const CELLAR_WINES = Object.freeze({
  'sparkling-chardonnay': cellarWine('sparkling-chardonnay', { name: 'Bottle-fermented Chardonnay', colour: 'white', from: 'chardonnay', xp: 25,
    note: 'Pale gold, and the bubbles come up in threads from the bottom of the glass. Green apple, bread crust and hazelnut; it is bone dry, and the fizz scrubs your tongue clean.',
    made: 'The second fermentation happens shut inside the bottle, not in a tank: a little yeast and sugar, a crown cap, and eighteen months lying on its side in the dark while the dead yeast gives it the bread smell.',
    lore: 'Every bottle is turned a little further onto its nose by hand, a few days at a time, until the dregs collect in the neck. Then the neck is frozen, the cap comes off, and the plug of ice fires out. Nico can do sixty in an hour and will show you if you stand still.' }),
  'cabernet-franc-rose': cellarWine('cabernet-franc-rose', { name: 'Cabernet Franc rosé', colour: 'rosé', from: 'cabernet-franc', xp: 20,
    note: 'Onion-skin pink, barely there. Strawberry, white peach and a green herb edge; dry, light and cold enough to hurt your teeth.',
    made: 'Pressed straight off the skins after four hours, not bled off a red ferment: the colour is all it takes in that time, and the wine is made for itself rather than left over from something else.',
    lore: 'Livia makes it because the pickers asked for something to drink at noon that would not put them to sleep. It is the first thing to sell out every year, which she says is a judgement on her serious wines.' }),
  'vidal-ice': cellarWine('vidal-ice', { name: 'Vidal picked frozen', colour: 'sweet', from: 'vidal-blanc', xp: 25,
    note: 'Deep gold and thick enough to coat the glass. Candied apricot, honey and lime marmalade, and under all that sweetness an acid like a wire.',
    made: 'The end rows hang until a hard frost, and are picked and pressed while they are still frozen. The water in the grape stays behind as ice; what runs out is a trickle of syrup. A whole row makes a few bottles.',
    lore: 'It has to be picked in the dark, before the sun gets at it, and the whole valley turns out for it with lanterns and gloves. Nico says it is the only night of the year the work is a party.' }),
  'amber-viognier': cellarWine('amber-viognier', { name: 'Viognier left on its skins', colour: 'amber', from: 'viognier', xp: 25,
    note: 'Amber, and cloudy if the jar is moved. Dried apricot, orange peel, black tea and beeswax, with a grip at the back you never expect from a white.',
    made: 'A white made the way a red is: the juice sits on its own skins for a month in a buried clay jar, taking colour and tannin out of them, with nothing added and nothing filtered out.',
    lore: 'The oldest way there is, and the one people find strangest now. Livia keeps two jars buried to the neck in the hall floor, and argues with every merchant who calls it spoiled.' }),
  'fortified-norton': cellarWine('fortified-norton', { name: 'Fortified Norton', colour: 'red', from: 'norton', xp: 30,
    note: 'Opaque, and it clings to the glass. Stewed plum, fig, cocoa and spirit warmth; sweet, but the wild grapey edge of the Norton cuts straight through it.',
    made: 'Spirit goes in while the ferment is still running, which kills the yeast and leaves the unfermented sugar where it is. Strong and sweet at once, and it keeps for years after the bottle is opened.',
    lore: 'A winter wine, and the one Livia pours for anybody who has walked up the lane in the rain. There is a barrel of it started before she was born that gets topped up and never emptied.' }),
});
export const CELLAR_WINE_IDS = Object.freeze(Object.keys(CELLAR_WINES));
/** How many of the plain eight must be tasted before Livia opens the cellar. */
export const CELLAR_OPENS_AT = 4;

/**
 * The words for what is in the glass, in the order the skill hands them over. Each is
 * the ordinary meaning, said plainly: this is the vocabulary a taster actually uses.
 */
export const TASTING_TERMS = Object.freeze([
  Object.freeze({ id: 'acid', name: 'Acid', level: 1, what: 'The sharpness that makes you salivate and makes the wine feel alive. Too little and it is flat and tiring; too much and it is a lemon. It is what lets a sweet wine not cloy.' }),
  Object.freeze({ id: 'tannin', name: 'Tannin', level: 1, what: 'The dryness that grips your gums, out of the skins, seeds and the barrel. It is texture, not taste. Time softens it; so does fat on the plate.' }),
  Object.freeze({ id: 'body', name: 'Body', level: 2, what: 'How heavy the wine feels in the mouth, mostly a matter of alcohol and sugar. Skimmed milk, whole milk, cream: light, medium, full.' }),
  Object.freeze({ id: 'finish', name: 'Finish', level: 3, what: 'How long the taste stays after you swallow, and what it turns into while it goes. A great wine is still talking twenty seconds later.' }),
  Object.freeze({ id: 'minerality', name: 'Minerality', level: 4, what: 'Wet stone, chalk, flint, a struck match. Nobody can prove the ground puts it there, and nobody who has tasted the Ostel white will hear a word against it.' }),
  Object.freeze({ id: 'oak', name: 'Oak', level: 5, what: 'Vanilla, clove, toast and coconut, out of the barrel rather than the grape. New barrels shout; old ones only breathe air in and water out.' }),
  Object.freeze({ id: 'lees', name: 'Lees', level: 6, what: 'The spent yeast a wine rests on after the ferment. Left in and stirred, it gives bread, biscuit and a soft thickness. It is why the sparkling smells like a bakery.' }),
  Object.freeze({ id: 'malolactic', name: 'Malolactic', level: 7, what: 'A second, quieter change where sharp apple acid turns to soft milk acid. It is where butter and cream in a white come from, and most reds go through it without being asked.' }),
  Object.freeze({ id: 'noble-rot', name: 'Noble rot', level: 8, what: 'A grey mould that pierces a ripe grape and lets the water out, leaving honey, apricot and marmalade behind. On a wet year it is just rot; on a good one it is the sweetest wine there is.' }),
  Object.freeze({ id: 'corked', name: 'Corked', level: 9, what: 'A fault, not a style: wet cardboard and damp cellar, from a tainted cork. It does not hurt you. Send it back, and do not let anybody tell you it will blow off.' }),
]);
/** The terms the skill has handed over at this level. */
export const termsAt = level => TASTING_TERMS.filter(term => term.level <= (Number.isFinite(level) ? level : 1));

/** Nico's walk through the hall, in the order it happens to the grape. */
export const CELLAR_WALK = Object.freeze([
  'Right. It comes in on a cart in the cold of the morning, and the first thing is the sorting table: anything green, anything rotten, anything with legs, off the belt.',
  'Then the crusher. For a white we press it straight away and ferment the juice alone; for a red we put the whole lot in the vat, skins and all, because every bit of the colour and all of the grip is in those skins.',
  'Ferment. The yeast eats the sugar and gives back spirit and heat, and a red vat climbs to the warmth of a bath and smells like the inside of a loaf. We push the cap of floating skins down four times a day.',
  'Press, for the reds, once the sugar is gone. The free-run comes out first and is the finest of it; what the press squeezes after is darker and harder, and goes back in only if the year was thin.',
  'Then the second change, the quiet one: the sharp apple acid turns to the soft milk acid. We let it happen to everything red and to whichever whites Livia wants round rather than sharp.',
  'Barrels, and waiting. We rack it off its lees into a clean barrel when it has dropped bright — twice in the first year, and less after that. The barrel breathes: it loses a little every year, and we top it up.',
  'And bottling, which is the only part that has to be done fast, in one day, with everybody in the valley pressed into it and Livia counting corks. Then you leave it alone, which is the hardest work in the cellar.',
]);

export const WINE_IDS = Object.freeze(Object.keys(WINES));

export const WINE_LESSON = Object.freeze([
  'Look at it first: tip the glass against something white. Colour tells you the grape, the age, and whether it has been in a barrel.',
  'Then swirl it and smell it, and do not be shy about it. Most of what you taste you are really smelling.',
  'Then a small mouthful, held and moved about. Is it sharp? Does it dry your gums? Does it stay after you swallow? Now you have tasted it, instead of drinking it.',
]);

export function validateWineSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== WINE_VERSION) return false;
  if (typeof data.met !== 'boolean' || !['none', 'recommended', 'visited'].includes(data.quest)) return false;
  if (!data.tasted || typeof data.tasted !== 'object' || Array.isArray(data.tasted)) return false;
  return Object.entries(data.tasted).every(([id, count]) => (Object.hasOwn(WINES, id) || Object.hasOwn(CELLAR_WINES, id) || Object.hasOwn(ATTIC_WINES, id))
    && Number.isInteger(count) && count >= 1 && count <= 1e6);
}

export function createWine({ skills, onEvent = () => {} } = {}) {
  const state = { met: false, quest: 'none', tasted: {} };

  /** Learned from Lakota (who also sends the traveler to the winery) or from Livia at the winery. */
  function learn({ recommend = false } = {}) {
    const first = !state.met;
    state.met = true;
    if (recommend && state.quest === 'none') state.quest = 'recommended';
    const learned = skills?.learn?.(WINE_SKILL) ?? { ok: false };
    if (first) onEvent({ type: 'wine-learned' });
    return { ok: true, first, ...learned };
  }

  /** Reaching the winery and meeting Livia. */
  function visit() {
    if (state.quest === 'visited') return { ok: true, first: false };
    const recommended = state.quest === 'recommended';
    state.quest = 'visited';
    const gained = recommended && state.met ? skills?.gain?.(WINE_SKILL, VISIT_XP) ?? { ok: false } : null;
    onEvent({ type: 'winery-visited' });
    return { ok: true, first: true, xp: gained ? VISIT_XP : 0, levelled: !!gained?.levelled };
  }

  /** A wine tasted properly. */
  function taste(id) {
    if (!state.met) return { ok: false, reason: 'You drank it. It was nice. Ask how to taste it properly, and you will get more out of the next glass.' };
    // Livia's eight, the five she makes from them in the cellar, or Juan's eight at Tharganhom in Solis.
    const entry = WINES[id] ?? CELLAR_WINES[id] ?? ATTIC_WINES[id];
    if (!entry) return { ok: false, reason: 'They do not pour that here.' };
    const first = !state.tasted[id];
    state.tasted[id] = (state.tasted[id] ?? 0) + 1;
    const gained = first ? skills?.gain?.(WINE_SKILL, entry.xp) ?? { ok: false } : null;
    onEvent({ type: 'wine-tasted', id, first });
    return { ok: true, first, entry, count: state.tasted[id], xp: first ? entry.xp : 0,
      level: skills?.level?.(WINE_SKILL) ?? 1, levelled: !!gained?.levelled };
  }

  const tastedCount = () => Object.keys(state.tasted).length;
  /** How many of the plain eight have been tasted: Livia opens the cellar at four. */
  const plainTasted = () => WINE_IDS.filter(id => state.tasted[id]).length;
  const cellarOpen = () => plainTasted() >= CELLAR_OPENS_AT;
  function task() {
    if (state.quest !== 'recommended') return null;
    return { title: `${WINERY.name}, Paradise Springs`, stage: 'visit', target: VINTNER.id,
      detail: `Lakota’s old winery in the north-east of West Suval: ${WINERY.name}, Paradise Springs in plain words. Take the lane east off the Solis road past the Suval Downs. There is a war around Solis. Keep your head down.` };
  }
  function view() {
    const attic = ATTIC_WINE_IDS.map(id => ({ id, tasted: !!state.tasted[id], colour: ATTIC_WINES[id].colour,
      name: state.tasted[id] ? `${ATTIC_WINES[id].name}, from ${ATTIC_WINES[id].from}` : `A ${ATTIC_WINES[id].colour === 'sweet' ? 'sweet wine' : ATTIC_WINES[id].colour} on Juan’s shelves`,
      detail: state.tasted[id] ? ATTIC_WINES[id].note : 'Juan pours it at Tharganhom, the Wine Attic in Solis.' }));
    const level = skills?.level?.(WINE_SKILL) ?? 1;
    const cellar = CELLAR_WINE_IDS.map(id => ({ id, tasted: !!state.tasted[id], colour: CELLAR_WINES[id].colour,
      name: state.tasted[id] ? CELLAR_WINES[id].name : `Something of Livia’s made from the ${WINES[CELLAR_WINES[id].from].name}`,
      detail: state.tasted[id] ? CELLAR_WINES[id].note
        : cellarOpen() ? 'Livia has offered it from the cellar.' : `Taste ${CELLAR_OPENS_AT} of the eight first; then Livia opens the cellar.` }));
    return { met: state.met, quest: state.quest, tastedCount: tastedCount(), total: WINE_IDS.length + CELLAR_WINE_IDS.length + ATTIC_WINE_IDS.length,
      task: task(), cellarOpen: cellarOpen(), plainTasted: plainTasted(), terms: termsAt(level),
      entries: [...WINE_IDS.map(id => ({ id, tasted: !!state.tasted[id], colour: WINES[id].colour,
        name: state.tasted[id] ? WINES[id].name : `A ${WINES[id].colour} of Vaervelm Caelazh`,
        detail: state.tasted[id] ? WINES[id].note : state.met ? `Livia pours it at ${WINERY.name}.` : 'Lakota, the man on the road with the hawk, knows wine.' })), ...cellar, ...attic] };
  }

  function snapshot() { return { version: WINE_VERSION, met: state.met, quest: state.quest, tasted: { ...state.tasted } }; }
  function restore(data) {
    state.met = false; state.quest = 'none'; state.tasted = {};
    if (!validateWineSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.quest = data.quest; state.tasted = { ...data.tasted };
    return true;
  }

  return { learn, visit, taste, task, view, snapshot, restore, tastedCount,
    terms: () => termsAt(skills?.level?.(WINE_SKILL) ?? 1),
    get cellarOpen() { return cellarOpen(); }, get plainTasted() { return plainTasted(); },
    get met() { return state.met; }, get quest() { return state.quest; }, hasTasted: id => !!state.tasted[id] };
}

/** Livia Seravo at the cabin porch. `act` runs 'learn-wine-here' and 'taste-<id>' in the host. */
export function vintnerConversation(npc, context) {
  const { wine, openDialogue, closeDialogue, act } = context;
  if (npc.id !== VINTNER.id) return false;
  const again = () => vintnerConversation(npc, context);
  const firstVisit = wine.quest !== 'visited';
  if (firstVisit) act('visit-winery');
  const opening = firstVisit
    ? [wine.quest === 'recommended' || wine.met
      ? 'Lakota sent you? Of course he did. He still owes me for a case of the Norton, and for the heron he let into the cellar.'
      : 'A traveler, all the way out here, and not a soldier. Sit down before somebody requisitions you.',
    `This is ${WINERY.name}. In your tongue, ${WINERY.meaning}: the good green place, where the water endures. The cabin is the first house anybody built on this land; we pour in it now. The hall is where the wine is made.`,
    'And the spring, up on the rise behind the cabin. It has never once failed, not in the worst summer. The Svaleen say one of Thareth\u2019s tears fell on that stone, and the first vine on this hill grew where it ran. Drink from it; everybody does.']
    : ['Back again. The terrace is yours. Nobody else has come up the lane since the armies came.'];
  const choices = [
    ...(!wine.met ? [{ id: 'learn-wine-here', label: 'Show me how to taste it properly.', action: () => { closeDialogue(); act('learn-wine-here'); } }] : []),
    ...(wine.met ? WINE_IDS.map(id => ({ id: `taste-${id}`, label: `A taste of the ${WINES[id].name}${wine.hasTasted(id) ? ' again' : ''}.`,
      action: () => { closeDialogue(); act(`taste-${id}`); } })) : []),
    // The cellar opens once four of the eight are known: the same grapes, made five other ways.
    ...(wine.met && wine.cellarOpen ? [{ id: 'winery-cellar', label: 'What else do you make from them?', action: () => openDialogue(npc, [
      'Now that you know what the grapes taste like on their own, come and see what else they can be talked into.',
      'The same eight rows make all of this. A wine is the grape and then everything a person decides to do to it, and most of those decisions happen indoors.',
    ], null, 'What is in the cellar', { choices: [
      ...CELLAR_WINE_IDS.map(id => ({ id: `taste-${id}`, label: `The ${CELLAR_WINES[id].name}${wine.hasTasted(id) ? ', again' : ''}.`,
        action: () => { closeDialogue(); act(`taste-${id}`); } })),
      { id: 'back-from-cellar', label: 'Back to the terrace.', action: again },
    ] }) }] : []),
    ...(wine.met && !wine.cellarOpen ? [{ id: 'winery-cellar-wait', label: 'Is this everything you make?', action: () => openDialogue(npc, [
      `Not nearly. But taste the eight first — four of them at least — and then I will open the cellar and show you what else they can be. You have had ${wine.plainTasted}.`,
      'You cannot hear what the making did to a wine until you know what the grape sounds like without it.',
    ], null, 'Back to our conversation', { onComplete: again }) }] : []),
    { id: 'winery-war', label: 'How has the war been for you?', action: () => openDialogue(npc, [
      'Both sides have been up the lane. The Coalition took twelve barrels “for the troops” and gave me a paper for them. The army took the mule and gave me nothing, which at least was honest.',
      'We make wine the same whoever holds Solis. People want a drink under every flag. That is not loyalty; it is weather.',
    ], null, 'Back to our conversation', { onComplete: again }) },
    { id: 'winery-vines', label: 'What do you grow?', action: () => openDialogue(npc, [
      'Eight grapes, two rows each, down the slope: the whites nearest the hall, Viognier, Chardonnay and Vidal Blanc; then the reds, Cabernet Franc, Merlot, Petit Verdot and Tannat; and at the bottom, where the ground stays wettest, Norton.',
      'There is a painted plate at the head of each block. Read them, then taste the wine from the same rows. That is how you learn a vineyard.',
    ], null, 'Back to our conversation', { onComplete: again }) },
    { id: 'winery-lakota', label: 'What was Lakota like here?', action: () => openDialogue(npc, [
      'The best nose I ever had in the cellar, and the worst cellar hand. He would stop a pressing to watch a hawk.',
      'He dug up the whole bottom of the vineyard looking for bones of some great old lizard he swore had walked here. He found a jaw. It is on the cabin mantel. Do not get him started.',
    ], null, 'Back to our conversation', { onComplete: again }) },
    { id: 'leave-vintner', label: 'Thank you.', action: closeDialogue },
  ];
  openDialogue(npc, opening, null, 'Back to the terrace', { choices });
  return true;
}

/**
 * Kat on the crush pad, arms purple to the elbow. She has the ferments and not much time,
 * and says one thing at a time. `visits` rotates what she is in the middle of.
 */
export function winemakerConversation(npc, context) {
  const { openDialogue, closeDialogue, act = () => {}, hunt = null, katy = null, visits = 0 } = context;
  if (npc?.id !== WINEMAKER.id) return false;
  const again = () => winemakerConversation(npc, { ...context, visits: visits + 1 });
  // One of the twelve barrels the Coalition requisitioned came back, and came back wrong. Kat is
  // the one who would notice, because she is the one who knows what a barrel of hers weighs.
  const barrel = hunt && katy?.looking && !hunt.has('vial') ? [{ id: 'kat-barrel', label: 'Has anything odd come back off the war?',
    action: () => openDialogue(npc, [
      'Funny you should. One of the twelve the Coalition took “for the troops” came back to us in the spring, on a cart, with an apology nobody signed.',
      'And it came back heavier than it went out. I know what my own barrels weigh; I put the wine in them. So I broke the head off it, and the head had another head behind it, and the space between was packed with straw and little flat bottles.',
      'That is what is in your hand now. It is not wine and it is not medicine. Hold it up to the light — it is blue with purple coming up under it, and when I got a drop on my thumb I could smell nothing else for two days and I liked it far too much.',
      'Take it. Livia does not know and I would rather she went on not knowing until somebody can tell her what it is. You are the one wandering about with a drawing of a monster in your satchel, so. You take it.',
    ], null, 'Take the vial', { onComplete: () => act('take-velaeth-vial') }) }] : [];
  openDialogue(npc, [KAT_LINES[visits % KAT_LINES.length]], null, 'Back to the terrace', { choices: [
    ...barrel,
    { id: 'kat-more', label: 'What are you doing exactly?', action: () => openDialogue(npc,
      [KAT_LINES[(visits + 1) % KAT_LINES.length]], null, 'Back to the pad', { onComplete: again }) },
    { id: 'leave-winemaker', label: 'I will let you get on.', action: closeDialogue },
  ] });
  return true;
}

/** Nico Arrend among the barrels, who will walk anybody who asks through the whole making of it. */
export function cellarHandConversation(npc, context) {
  const { openDialogue, closeDialogue } = context;
  if (npc.id !== CELLAR_HAND.id) return false;
  const again = () => cellarHandConversation(npc, context);
  openDialogue(npc, [
    'Mind the barrels. They are full, and they are the only thing in this valley both armies agree is worth stealing.',
    'Livia pours at the cabin. Ask her for the Norton. Nobody asks for the Norton, and she likes the ones who do.',
  ], null, 'Back to the terrace', { choices: [
    { id: 'cellar-walk', label: 'How is any of it actually made?', action: () => openDialogue(npc, [...CELLAR_WALK], null, 'Back to the barrels', { onComplete: again }) },
    { id: 'leave-cellar-hand', label: 'I will let you work.', action: closeDialogue },
  ] });
  return true;
}
