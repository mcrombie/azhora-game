/**
 * **Officer Glun, who teaches you to fight and then gives you a map.**
 *
 * The user's direction of 22 September 2026. The opening used to point a quest card at an
 * unattended straw post and hand the traveler Tidehaven's rough chart along with the letter, so
 * fighting was learned from a caption and three-quarters of the map was answered before he had
 * walked anywhere. Now an Imperial officer stands at the post and does both jobs in order:
 *
 *   1. Jojo sends the traveler to him.
 *   2. He sets the lesson - two strikes, one guard and one step - and watches it. Nothing counts
 *      until he has. The guard is the user's, 22 September 2026: Cromb comes ashore with a shield
 *      now (src/player-characters.js) and blocking is the third of the three things a sword,
 *      a shield and a pair of feet can do.
 *   3. When it is done he says so, gives the map, and explains what the other skills are: the
 *      ground you walk draws itself, and anybody who lives somewhere can tell you which way the
 *      next country is. That map opens on Tidehaven and nothing else.
 *
 * He is an officer of the same army as every soldier on the road - the plumed helm, the gold at
 * the shoulder and the red cloak are the `legion-officer` build - with a white drill plume of
 * his own, because he is the one who teaches rather than the one who commands (src/characters.js,
 * `look.plume`).
 *
 * Pure: no DOM, no three, no world. The host places him, runs the practice and hands his lines
 * to the dialogue.
 */

export const INSTRUCTOR_SKILL_LESSON = 'cartography';

export const INSTRUCTOR = Object.freeze({
  id: 'instructor', name: 'Officer Glun', role: 'Imperial officer, at the practice post',
  modelRole: 'legion-officer', color: 0x9a3b30, skin: 0xd2a077,
  look: Object.freeze({ plume: 'white' }),
});

/**
 * Where he stands: two metres north of the straw post at the village crossroads, on the side the
 * village comes from, so a traveler walking up from the landing meets him before he meets the
 * straw. Measured on the built world - `canStand` at the body radius, and sixteen metres clear of
 * anybody else's stand (tests/instructor.test.js).
 */
export const INSTRUCTOR_STAND = Object.freeze({ x: -32, z: 28.5, yaw: Math.PI });

/** How much of the lesson is done, from the three numbers the host already keeps. */
export const LESSON = Object.freeze({ hits: 2, guards: 1, dodges: 1 });

/**
 * How long the shield has to be up to count for anything. A tap of the key is not a guard; this
 * is about as long as a blow takes to arrive, which is the point of the exercise.
 */
export const GUARD_SECONDS = .7;

/**
 * The state of the lesson, which is not remembered anywhere of its own: it is read off the
 * traveler's quest stage and the practice tally the save already carries.
 *
 *   `waiting`   he has not been spoken to; the post banks nothing
 *   `set`       the lesson is set and unfinished
 *   `done`      two hits and a dodge, and he has not yet been back to
 *   `finished`  he has given the map
 */
export function lessonStage({ briefed = false, hits = 0, guards = 0, dodges = 0, taught = false } = {}) {
  if (taught) return 'finished';
  if (!briefed) return 'waiting';
  return hits >= LESSON.hits && guards >= LESSON.guards && dodges >= LESSON.dodges ? 'done' : 'set';
}

const BRIEF = Object.freeze([
  'Glun. I hold the post here, which this morning means I am the one who decides whether you go up that road or back on your boat.',
  'Hired swords come off every boat saying they can fight. Show me. That is a straw post; it does not hit back and it does not lie about you either.',
  `Three things, and a sword is only the first of them. Two clean strikes on the straw: the left button, or R.`,
  `Then the shield. Hold V and keep it there - not a tap, hold it, the way you would hold it while somebody who means it comes at you. Most of them never learn that a shield is something you decide to be behind.`,
  `And the step: C and a direction. Strike, guard, step. Two of those three are how you are still standing at the end of a day, and it is not the sword.`,
]);

const NOT_YET = Object.freeze([
  'Not finished. Two strikes on the straw, the shield up and held, and one step out of the way.',
  'It is not a test of strength. It is a test of whether you can do the same thing twice and still be standing.',
]);

const DONE = Object.freeze([
  'That will do. You will not frighten anybody, but you know which end goes in, you can get behind your own shield, and you can get out of the way. That is more than half of them manage.',
  'Now the other half of staying alive, which is knowing where you are. Take this.',
  'A chart. It is blank, and that is not a fault - it is blank because you have not been anywhere. Ground you walk draws itself on it. This village is on it already, because you are standing in it.',
  'For the rest: ask. Anybody who lives somewhere can tell you which way the next country is, and a name and a bearing is worth having before you need it. Same with everything else out there - the man who fishes will show you fishing, the woman with the hedge will name a plant for you. None of them will come and find you.',
  'West, then, and mind the road. Corvan at the Avrel clearing puts you into service.',
]);

const AFTER = Object.freeze([
  'You have the chart and you have the measure of a straw post. The road is west.',
  'Everything else in this country you will have to go and ask for.',
]);

/** What he says, by where the lesson has got to. */
export function instructorLines(stage) {
  if (stage === 'waiting') return [...BRIEF];
  if (stage === 'set') return [...NOT_YET];
  if (stage === 'done') return [...DONE];
  return [...AFTER];
}

/**
 * His conversation. The host hands in where the lesson stands and the two things it can do:
 * `begin` sets it (and is what makes the post count), `finish` gives the map.
 */
export function instructorConversation(npc, { stage = 'waiting', openDialogue, begin = () => {}, finish = () => {} } = {}) {
  const lines = instructorLines(stage);
  if (stage === 'waiting') return openDialogue(npc, lines, null, 'Take up the sword', { onComplete: begin });
  if (stage === 'done') return openDialogue(npc, lines, null, 'Take the chart', { onComplete: finish });
  return openDialogue(npc, lines, null, 'Back to the post');
}
