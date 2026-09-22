/**
 * **Who is standing in Azhora while the main quest is built out.**
 *
 * The user, 22 September 2026: "The number of NPCs is getting crowded and confusing. Lets
 * temporarily remove all NPCs that are not relevant to any quests, except soldiers... Lets remove
 * the NPCs who just teach skills too. We will incorporate them in somehow again later."
 *
 * A hundred and fifty-five people were placed. Most of them are the life of a country - the
 * fishwives of Elod, the clerks of Ambron, Ostel's muleteers - written to make a town feel lived
 * in, and none of them is in anybody's way in a town you have not reached. But the whole cast is
 * out at once, and the ground the main quest actually walks is thick with people who want
 * something that is not the main quest.
 *
 * So this is a **switch and a list**, not a deletion. `TRIMMED` is what turns it on, `KEEP` is
 * who stays, and every one of the hundred and fifty-five is still written, still placed by its
 * own module, still tested. Turning the cast back on is one word, and putting one person back is
 * one line in the list.
 *
 * **Who stays, and why:**
 *   - **The main quest**, every person a chapter names as somewhere to go.
 *   - **Soldiers**, by build rather than by name, because the user asked for them by that word
 *     and because the army is the spine of the story.
 *   - **The hired company**, who are the player's own eleven.
 *   - **The characters the user made themselves** - Brandy the dyer, Lakota, Ed the Word, Ed the
 *     Chameleon, Juan and Nika at the Wine Attic, John of the salt trade, Jess at the boat.
 *
 * **Who goes:** everybody who only teaches a skill (Perrin's birding, Bran's rod, Odger's
 * mushrooms, Nell's hedge, Silas's marl, Enna's rows, Bowden's axe), everybody who is a town's
 * atmosphere, and - at the user's word on 22 September - Eren the waykeeper, whose step in the
 * tutorial moved to Officer Glun with it.
 *
 * Pure: no DOM, no three, no world.
 */

/**
 * **On.** The world empties to the list below, and one word here puts every one of them back:
 * nobody is deleted, every module still writes and places its own people, and the rendered
 * story walkthrough was taught to run either way (`inCast` in src/main.js and src/road-smoke.js),
 * so the check that guards the game is honest with the cast trimmed or whole.
 */
export const TRIMMED = true;

/** Builds that are soldiers. A soldier is kept whatever his name is. */
export const SOLDIER_ROLES = Object.freeze(['legion-soldier', 'legion-officer', 'suvali-guard', 'elodi-guard']);

/**
 * The people the main quest sends you to, from the first morning to the day after the border
 * battle. Taken from the chapters' own `destinationIds` rather than remembered.
 */
export const QUEST_IDS = Object.freeze([
  'harbormaster',        // Jojo, the letter
  'instructor',          // Officer Glun, the lesson and the chart
  'crossing-keeper',     // Chip, and the one side quest on the slate (src/quest-slate.js)
  'relay-clerk',         // Iven at Nothom, who closes Chapter 1
  'lauvel-picket',       // the picket sergeant on the burial line
  'burial-searcher',     // the courier's satchel at the Lauvel
  'courier-satchel',     // the satchel itself, which the chapter turns on
  'hamlet-drover',       // the burned hamlet, on the same errand
  'lauvel-bearer-front', 'lauvel-bearer-back', 'lauvel-seeker',   // Sela and the burying on the Lauvel line
  'timber-stall',        // Hara at the Nothom stall, who is the Republic's own contact
  'solis-captain', 'coalition-envoy', 'coalition-captain', 'battle-tribune',
  'aftermath-tribune', 'aftermath-captain', 'aftermath-envoy', 'post-camp-legate',
]);

/**
 * The smiths. They are not quest-givers and they teach nothing, but they are where a traveler
 * buys the mail he takes to the border, so they belong to the arc as much as the armoury does
 * (src/smith.js, and the user's own register of mythical smiths).
 */
export const SMITH_IDS = Object.freeze(['tidehaven-smith', 'moros-armourer', 'ambron-armourer', 'ostel-smith', 'lumber-ostler']);

/** The characters the user made, which are theirs and not the game's furniture. */
export const OWN_IDS = Object.freeze([
  'ben-sorcerer',        // Ben, of the sorcerer's guild, and the only man who teaches fire
  'brandy-frank',        // Brandy Frank, dyer of impossible colours
  'bird-watcher',        // Lakota
  'boatman',             // Jess of the Stills
  'attic-juan', 'attic-nika',    // Juan and Nika at Tharganhom, the Wine Attic
  'solis-secretary',     // Tancredi Vel, who the chameleon's arrangement runs through
  'john-salt',           // John, Sultan of the Salt Trade, and the Sultana he sails
  'katy',                // Katy, who goes looking for Batman at dusk
  'vintner', 'winemaker', 'vine-keeper',   // Livia, Kat and the keeper at Vaervelm Caelazh
  'light-keeper', 'rival-keeper',// the two lighthouse keepers and their feud
]);

/**
 * And the two kept out whatever else is true of them.
 *
 * **Eren the waykeeper** is built as a legionary, so the soldier rule would hold him in the
 * world; the user named him on 22 September 2026 among the people to take out, and the tutorial
 * step he held went to Officer Glun with him.
 *
 * **Sava, keeper of the rise**, held the three waymarkers, which came off the slate with the
 * rest of the middle of Chapter 1 later the same day (src/quest-slate.js). With nothing to give
 * she is one more person standing in the way.
 *
 * Corvan is not on this list: his field register came off the slate too, but he is built as an
 * officer and the soldier rule keeps him standing at his cart, which is where he belongs.
 */
export const DROP_IDS = Object.freeze(['warden', 'ridge-keeper']);

/** Ids kept whatever else is true of them. */
export const KEEP_IDS = Object.freeze([...QUEST_IDS, ...SMITH_IDS, ...OWN_IDS]);

/**
 * Whether this person stands in the world while the cast is trimmed. The company is recognised by
 * its own roster rather than by a list here, so the eleven are never at the mercy of this file.
 */
export function keepsNpc(npc, { mercenaryIds = new Set(), trimmed = TRIMMED } = {}) {
  if (!npc || !npc.id) return false;
  if (!trimmed) return true;
  if (DROP_IDS.includes(npc.id)) return false;
  if (mercenaryIds.has?.(npc.id)) return true;
  if (KEEP_IDS.includes(npc.id)) return true;
  if (SOLDIER_ROLES.includes(npc.modelRole)) return true;
  // The beasts are not a crowd and nobody confuses them for a quest.
  if (npc.dog || npc.cat || npc.ogre) return true;
  return false;
}

/** The cast, trimmed. Everything else about each person is left exactly as its own module wrote it. */
export function trimCast(npcData, options = {}) {
  return (npcData ?? []).filter(npc => keepsNpc(npc, options));
}
