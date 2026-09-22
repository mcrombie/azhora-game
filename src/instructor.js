/**
 * **Officer Glun, who teaches you to fight and then gives you a map.**
 *
 * The user's direction of 22 September 2026. The opening used to point a quest card at an
 * unattended straw post and hand the traveler Tidehaven's rough chart along with the letter, so
 * fighting was learned from a caption and three-quarters of the map was answered before he had
 * walked anywhere. Now an Imperial officer stands at the post and does both jobs in order:
 *
 *   1. Jojo sends the traveler to him.
 *   2. He sets the lesson - two hits and a dodge - and watches it. Nothing counts until he has.
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

/** How much of the lesson is done, from the two numbers the host already keeps. */
export const LESSON = Object.freeze({ hits: 2, dodges: 1 });

/**
 * The state of the lesson, which is not remembered anywhere of its own: it is read off the
 * traveler's quest stage and the practice tally the save already carries.
 *
 *   `waiting`   he has not been spoken to; the post banks nothing
 *   `set`       the lesson is set and unfinished
 *   `done`      two hits and a dodge, and he has not yet been back to
 *   `finished`  he has given the map
 */
export function lessonStage({ briefed = false, hits = 0, dodges = 0, taught = false } = {}) {
  if (taught) return 'finished';
  if (!briefed) return 'waiting';
  return hits >= LESSON.hits && dodges >= LESSON.dodges ? 'done' : 'set';
}

const BRIEF = Object.freeze([
  'Glun. I hold the post here, which this morning means I am the one who decides whether you go up that road or back on your boat.',
  'Hired swords come off every boat saying they can fight. Show me. That is a straw post; it does not hit back and it does not lie about you either.',
  `Two clean strikes on it, and step out of the way once. The strike is the left button or R. The step is C and a direction, and it is the half of this that keeps you alive.`,
]);

const NOT_YET = Object.freeze([
  'Not finished. Two strikes on the straw, and one step out of the way.',
  'It is not a test of strength. It is a test of whether you can do the same thing twice and still be standing.',
]);

const DONE = Object.freeze([
  'That will do. You will not frighten anybody, but you know which end goes in, and you can get out of the way. That is more than half of them manage.',
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
