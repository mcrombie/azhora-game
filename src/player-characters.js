import { MERCENARY_ROSTER, CROMB, CROMB_OLD_ID } from './mercenaries.js';

/**
 * Who you are. The company is always the same eleven people called to the Moros muster; the
 * only question the opening screen asks is which of them you walk as. Choose Chris Gotwood
 * and Cromb the Barbarian takes the slot you left — his look, his arrival, his lines — and
 * you land in Chris's cloth with Chris's sword and the Ambroni Chris already speaks.
 *
 * Pure data and pure functions: no DOM, no three, no skills module. The experience below is
 * written as experience and not as levels on purpose, because two of these skills do not
 * exist yet and a third is about to get a longer table; a number survives all of that and a
 * level does not. Where a number is meant to read as a level it says so beside it.
 *
 * These are placeholders the user will rewrite from the character profiles. What is settled
 * here is the shape: eleven entries, in the user's order, Cromb first.
 */
export const PLAYER_CHARACTERS_VERSION = 1;

/**
 * The traveler as he has always been: the default, the only one who starts with nothing, and
 * a blank slate on purpose (docs/design-answers.md). The other ten have arcs; he has yours.
 */
export const DEFAULT_PLAYER = 'cromb';
/**
 * Ids that are not canonical but name somebody real. `crom` was Cromb for one morning before
 * the b; saves written then, and anything else that kept the old spelling, still load.
 */
export const PLAYER_ALIASES = Object.freeze({ crom: 'cromb', [CROMB_OLD_ID]: 'cromb', [CROMB.id]: 'cromb' });

const sword = Object.freeze([Object.freeze({ id: 'simple-sword', quantity: 1 })]);
const swordAnd = id => Object.freeze([...sword, Object.freeze({ id, quantity: 1 })]);

const playable = (id, name, title, roster, blurb, weapon, inventory, skills, extra = {}) =>
  Object.freeze({ id, name, title, roster, blurb, weapon, inventory, skills: Object.freeze(skills),
    startingLanguages: Object.freeze({}), ...extra });

/**
 * The eleven, in the order the user gave them. `roster` is the hired sword whose place in the
 * world this character is; Cromb has none, because when you are Cromb the ten on the road are
 * already the ten. `skills` is experience at the moment you step ashore, by skill id; ids that
 * every id here is registered in src/skills.js, so every number below is handed over whole.
 */
export const PLAYABLE = Object.freeze([
  playable('cromb', 'Cromb the Barbarian', 'No past, and no explanations', null,
    'Nothing is written about him and nothing is going to be. Everything he turns out to have been, you do on this road.',
    'simple-sword', sword, {}),
  playable('gotwood', 'Chris Gotwood', 'The one who can ask directions', 'merc-gotwood',
    'Sailed with the company’s papers in his coat and enough Ambroni to be understood at a gate. The letter is yours from the first step.',
    'simple-sword', sword, { linguist: 200 },
    // The language module reads this: Chris interprets for the company, so he begins the road
    // already able to hold a conversation in the Empire's tongue (src/linguist.js, src/languages.js).
    // Drentish at the same level because it is what he is said to know: `INTERPRETER.knows` has
    // him glossing drentish, feradom and ambroni, and in Drent the tongue he would be glossing
    // is Drentish — Mara speaks it. Without it, choosing Chris made the one conversation the
    // interpreter exists to teach you wholly foreign, with nobody in the world to gloss it,
    // because when you are Chris `interpreterFor` rightly answers nobody. Feradom is left out:
    // it is the user's to place with the rest of the profiles.
    { startingLanguages: Object.freeze({ ambroni: 40, drentish: 40 }) }),
  playable('word', 'Ed the Word', 'Came ashore under his own power', 'merc-word',
    'Off a pirate ship that never docked, out of a port he will not name, with a dagger and a great deal to say about none of it.',
    'long-dagger', swordAnd('long-dagger'), { swimming: 260 }),
  playable('jerry', 'Jerry', 'Thirty paces and no nearer', 'merc-jerry',
    'An archer who would rather settle a thing at a distance, and who has waited out more floats than most men have seen water.',
    'simple-sword', sword, { fishing: 140 }),
  // Kristen on screen, `christin` in the save: see the note at her roster row in src/mercenaries.js.
  playable('christin', 'Kristen', 'The one who feeds the company', 'merc-christin',
    'Sword and shield, and the only one of the eleven who can be relied on to put something hot in front of everybody afterwards.',
    'simple-sword', sword, { cooking: 90 }),
  playable('ciaran', 'Ciarán', 'Reads the ground he stands on', 'merc-ciaran',
    'Two paces of ash between him and trouble, and a habit of picking up whatever the road is made of and weighing it in his hand.',
    'simple-sword', sword, { geology: 140 }),
  playable('lakota', 'Lakota', 'The birder of the company', 'merc-lakota',
    'Late, unbothered, and the best pair of eyes on the coast. He has been watching birds and digging up old towns for years, and he has opinions about wine.',
    'simple-sword', sword,
    // 37,224 is level 40, and reads as 40: every skill is on the ninety-nine table now
    // (src/skills.js), which is the table growing that this number was written to survive.
    // 83 is the first experience that is level 2 on it, which is where his wine belongs:
    // he has opinions about it, which is a notch below the old towns he actually digs up.
    { birding: 37224, archaeology: 90, wine: 83 }),
  playable('eliana', 'Eliana', 'Two hands and one edge', 'merc-eliana',
    'Came on her own and would have come sooner. The great blade is slow to start and cannot be stopped, and neither can the woman holding it.',
    'greatsword', swordAnd('greatsword'), { woodcutting: 2411 }),  // level 15: white oak
  playable('matt', 'Matt, Prince of Zorkys', 'A hall, a valley and four hundred people', 'merc-matt',
    'Came because the histories are thin on men who went. He has raised a roof over other people before and he will do it again.',
    'simple-sword', sword, { construction: 1584 }),  // level 12: the roof
  playable('altun', 'Al the Tun', 'You are looking at the robe', 'merc-altun',
    'Travelled with a prince and has not agreed with him once. He will tell you what the robe is for when there is a reason to, and not before.',
    'iron-mace', swordAnd('iron-mace'), { mycology: 200 }),
  playable('mus', 'Mus', 'Does not use the road', 'merc-mus',
    'Beaches his own boat round the headland and walks to the muster through the woods, because a road goes where everybody knows it goes.',
    'simple-sword', sword, { cartography: 200 }),
]);

/** The order the opening screen shows them in, which is the user's order, Cromb first. */
export const PLAYABLE_IDS = Object.freeze(PLAYABLE.map(entry => entry.id));

/**
 * **Who the opening screen offers.** The user, 21 September 2026: build out the one main quest
 * first, so only Cromb can be chosen for now. The other ten are untouched - they are the hired
 * swords of the company, they still have their own looks, kits, skills and lines, and a save
 * written as one of them still loads as him. This is the choosing, not the cast. Put an id back
 * in the list and he is on the opening screen again.
 */
export const SELECTABLE_IDS = Object.freeze(['cromb']);
export const SELECTABLE = Object.freeze(PLAYABLE.filter(entry => SELECTABLE_IDS.includes(entry.id)));

/** The canonical id for anything that names one of the eleven, or null. */
export function canonicalPlayerId(id) {
  if (typeof id !== 'string') return null;
  const named = PLAYER_ALIASES[id] ?? id;
  return PLAYABLE.some(entry => entry.id === named) ? named : null;
}

/** One of the eleven by id, or null. Anything that is not a string is not a character. */
export function playableCharacter(id) {
  const named = canonicalPlayerId(id);
  return named ? PLAYABLE.find(entry => entry.id === named) : null;
}

/** Whether `id` names one of the eleven, by its own id or by an old one. */
export const isPlayableId = id => canonicalPlayerId(id) !== null;

/**
 * A saved character. A save written before anyone could choose has no field at all, and that
 * save is Cromb, because Cromb is who it was played as. A save from the morning he was spelled
 * `crom` names him that way, and is him.
 */
export function validatePlayerCharacter(id, { allowMissing = true } = {}) {
  if (id === undefined) return allowMissing;
  return typeof id === 'string' && isPlayableId(id);
}
export const savedPlayerCharacter = id => canonicalPlayerId(id) ?? DEFAULT_PLAYER;

/**
 * The ten hired swords the world places when you are `playerId`: the roster with the one you
 * chose taken out of it and Cromb put in his place, keeping his own look, arrival and lines.
 * The letter of introduction stays with the slot rather than the man, because it came off the
 * boat, not out of anybody's history.
 *
 * Pure, and stable: the same id gives the same ten in the same order, every time.
 */
export function companyFor(playerId = DEFAULT_PLAYER) {
  const chosen = playableCharacter(playerId);
  if (!chosen) throw new TypeError(`No such playable character: ${playerId}`);
  // Playing as Cromb leaves the roster exactly as it has always been.
  if (chosen.roster === null) return MERCENARY_ROSTER;
  return Object.freeze(MERCENARY_ROSTER.map(entry => (entry.id === chosen.roster
    ? Object.freeze({ ...CROMB, ...(entry.carriesLetter ? { carriesLetter: true } : {}) })
    : entry)));
}

/** The hired sword whose look, weapon and place you take; null when you are Cromb. */
export function rosterEntryFor(playerId = DEFAULT_PLAYER) {
  const chosen = playableCharacter(playerId);
  if (!chosen || chosen.roster === null) return null;
  return MERCENARY_ROSTER.find(entry => entry.id === chosen.roster) ?? null;
}

/**
 * What the player's own model is built from: the chosen character's look with his weapon and
 * whether he trades, in the shape `createCharacter({ role: 'traveler', look })` wants. Cromb
 * has no look, and gets none: the traveler's own model is his, unchanged.
 */
export function playerLook(playerId = DEFAULT_PLAYER) {
  const entry = rosterEntryFor(playerId);
  return entry ? Object.freeze({ ...entry.look, weapon: entry.weapon, trades: entry.trades }) : null;
}

/**
 * What to call him in one word, on a tile or in a caption: the first word of his name, which
 * is how each of them introduces himself anyway — Cromb, Chris, Ed, Jerry, Kristen, Ciarán,
 * Lakota, Eliana, Matt, Al, Mus.
 */
export const shortName = entry => String(entry?.name ?? '').split(/[ ,]/)[0];

/** Starting experience by skill id, as a plain object a caller can walk. */
export function startingSkills(playerId = DEFAULT_PLAYER) {
  return { ...(playableCharacter(playerId)?.skills ?? {}) };
}

/** What is in the satchel at the first step ashore. */
export function startingInventory(playerId = DEFAULT_PLAYER) {
  return (playableCharacter(playerId)?.inventory ?? []).map(item => ({ ...item }));
}

/**
 * The tongues a character already has when he lands, by language id, as proficiency out of a
 * hundred (src/linguist.js). Only Chris has any: he interprets for the company, so he begins
 * the road able to hold a conversation in the Empire's own speech.
 */
export function startingLanguages(playerId = DEFAULT_PLAYER) {
  return { ...(playableCharacter(playerId)?.startingLanguages ?? {}) };
}
