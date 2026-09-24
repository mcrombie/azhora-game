/**
 * **What is on the slate right now**: Chapter 1, the bridge, Mark and the Drent silver story.
 *
 * The user, 22 September 2026: "The only quests right now are going to be the main quests, the
 * main quest arc, indicated by gold icons. There should be only one other quest in the game right
 * now... the side quest to repair the bridge. Let's disable everything else, keeping in mind we
 * are going to bring back more quests later."
 *
 * So this is a **switch and a list**, the same shape as `src/cast.js` and for the same reason:
 * nothing is deleted, every quest is still written, still built, still tested, and putting one
 * back is one word in `LIVE`. What `TRIMMED` does is stop a quest being *startable* - no mark
 * over a head, no offer in the conversation, nothing in the journal - rather than merely hiding
 * its icon, which is what the user asked for when the choice was put to them.
 *
 * **The three grades of mark**, which is the other half of this file's job:
 *   `main`   the arc. Gold.
 *   `plot`   a story of its own, with its own state and its own ending. Silver. The user has
 *            since requested the Ambroni Civil War series. Drent is the current prototype;
 *            The Common Water in Vastos is preserved, but its offer is paused.
 *   `deed`   a one-off that changes the world and does not move the plot - the bridge over the
 *            Caloss. Copper.
 *
 * **Events are not quests and this file does not govern them** (the user, 22 September 2026).
 * An event is a thing the world does on its own clock whether the traveler is there or not: no
 * mark over anybody's head, nothing in the journal, nobody asking you to go. There are two:
 *
 *   `road-ambush`   three rebels on the emptiest stretch of the Drent road, who by default kill
 *                   Chris Scotwood and leave him on it (src/road-ambush.js).
 *   `word-arrival`  Ed the Word swimming ashore from the rebel ship (src/word-arrival.js).
 *
 * Both are live, and neither is in `LIVE` or `CLOSED` below, because neither is a quest.
 *
 * **What is off**, so that bringing it back is a reading exercise and not an excavation:
 *   `courier`     Corvan in the Avrel clearing, the letter, the three supply parcels and the
 *                 raiders among the field walls (src/journey.js, `meadowEncounter` in main.js).
 *   `waymarkers`  Sava on the rise and the three leaning markers (src/journey.js).
 *   `greenway`    the three goblins at the woodland bell (`startAmbush` in main.js).
 *   `acorns`      Lysa's five acorns (src/acorn-quest.js).
 *   `forest`      the forest story and the Bramble hideout (src/forest-story.js, forest-hideout.js).
 *   ~~`doomsayer`~~  the cape on the shore - back on, with Mark, 22 September 2026.
 *   `teachers`    every errand that pays a skill - the rod, the feeder, the hedge, the pegs.
 * The people who gave most of them are already out of the world (src/cast.js); this is what
 * closes the rest, and what keeps a save from a fuller game from re-opening one.
 *
 * Pure: no DOM, no three, no world.
 */

/** **On.** One word here puts every quest below back on the slate. */
export const TRIMMED = true;

/** What may be started while the slate is trimmed. */
export const LIVE = Object.freeze(['main', 'bridge', 'doomsayer', 'civil-war-drent']);

/** Everything the trim closes, by the name this file knows it under. */
export const CLOSED = Object.freeze(['courier', 'waymarkers', 'greenway', 'acorns', 'forest',
  'teachers', 'civil-war-vastos']);

/** Whether a quest can be started, offered, marked or listed today. */
export const questLive = id => !TRIMMED || LIVE.includes(id);

/**
 * The bridge over the Caloss, the copper good deed on the slate. It was
 * the fourth and fifth steps of the old Chapter 1 - Corvan's assignment, then Chip's repair -
 * and it is a side quest now: "helpful for the main quest because it repairs the bridge, so you
 * don't have to swim across. You can swim across, even though swimming across is dangerous."
 */
export const BRIDGE_QUEST = Object.freeze({
  id: 'bridge', giver: 'crossing-keeper', name: 'Chip', grade: 'deed',
  title: 'The crossing at the Caloss',
  detail: 'Six paces of the middle of the Caloss bridge are in the river, and two halves of a bridge are no bridge. Until it is mended the crossing is a swim. Bring Chip three forest sticks and the span goes back down.',
});
