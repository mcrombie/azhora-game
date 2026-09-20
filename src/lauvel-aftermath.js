/**
 * The field at the Lauvel, ten days after the battle (src/luscia-chapter.js):
 * the dead are still coming in. The Empire's soldiers took their own away in
 * carts on the first day; the valley buries the rest. The fallen still lie
 * where they fell, among the dropped shields and the arrows, and the crows are
 * at them. Two bearers carry them one at a time on a hurdle to the burial
 * ground east of the road, where they are laid out in their shrouds beside the
 * graves Old Hewe is digging. A woman looks at every face for her son; a widow
 * sits by the row her husband is in; the keeper of the valley shrine sings the
 * names down.
 *
 * This module is the layout (in the field's own frame: `dx` east, `dz` south,
 * in metres from the field's centre), the people, what they say, and the
 * bearers' round. Pure: no DOM, no three. The scenery is built by
 * src/lauvel-field-world.js; the people are placed by the host.
 */
import { STORY_SITES } from './region-world.js';

const freeze = Object.freeze;
const F = STORY_SITES.lauvelField;
export const fieldPoint = (dx, dz) => freeze({ x: F.x + dx, z: F.z + dz });

/** The burial ground, east of the road: new graves open, the shrouded dead laid out beside them. */
export const BURIAL = freeze({
  graves: freeze([1.5, 4, 6.5, 9, 11.5, 14].map((dx, i) => freeze({ dx, dz: 16.5, open: i >= 2 }))),
  shrouds: freeze([1.5, 3.4, 5.3, 7.2, 9.1, 11, 12.9].map(dx => freeze({ dx, dz: 20.5 }))),
});
/**
 * Which grave Old Hewe is standing in: the one at his feet, at the head of the open ones, and
 * so the one Sela's son goes into if anybody ever finds him (src/lauvel-burying.js).
 */
export const HEWES_GRAVE = 2;
/**
 * The fallen, where they fell: `turn` is which way the body lies, `face` whether
 * it lies face down, `side` whose man he was (the valley's, mostly), `arms`
 * what lies beside him. West of the road and east of it, never on it.
 */
const fallen = (dx, dz, turn, side = 'valley', arms = 'spear', face = false) => freeze({ dx, dz, turn, side, arms, face });
export const FALLEN = freeze([
  fallen(14, 6, .4), fallen(18, 2, 2.1, 'valley', 'shield'), fallen(21, 8, 3.7, 'valley', 'none', true), fallen(22, 12, 5.1, 'empire', 'sword'),
  fallen(24, 3, 1.2), fallen(12, -14, 4.4, 'valley', 'shield', true), fallen(19, -12, .9), fallen(26, -8, 2.8, 'valley', 'spear', true),
  fallen(-26, -12, 1.6), fallen(-24, -4, 4.9, 'valley', 'shield'), fallen(-21, 6, .2, 'empire', 'sword', true), fallen(-27, 12, 3.3),
  fallen(-20, 22, 5.7, 'valley', 'none'), fallen(-29, -16, 2.4, 'valley', 'spear', true),
]);
/** Where the bearers take up the dead (among the fallen in the east field) and where they lay them down (the head of the shroud row). */
export const BEARERS_ROUND = freeze({ pickUp: fieldPoint(20.5, 5.5), layDown: fieldPoint(14.8, 20.5), pace: 1.1, lift: 4, rest: 5 });

const person = (id, name, role, modelRole, color, dx, dz, yaw, extra = {}) => freeze({ id, name, role, modelRole, color, ...fieldPoint(dx, dz), yaw, ...extra });
/** The valley's people on the field. The bearers are placed by their round; the rest stand, kneel, sit or dig where they are. */
export const LAUVEL_PEOPLE = freeze([
  person('lauvel-bearer-front', 'Dorran', 'Carrying the dead, for the valley', 'reed-worker', 0x5d6a58, 19, 5, 0, { bearer: 'front' }),
  person('lauvel-bearer-back', 'Corlan', 'Carrying the dead, for the valley', 'shelter-keeper', 0x6d6450, 19, 3, 0, { bearer: 'back' }),
  person('lauvel-digger', 'Old Hewe', 'Gravedigger of the Lauvel valley', 'shelter-keeper', 0x5b5140, 6.5, 15.2, 0, { digs: true }),
  person('lauvel-seeker', 'Sela', 'Looking for her son', 'rise-custodian', 0x7b6f86, 4.2, 21.9, Math.PI, { posture: 'kneel' }),
  person('lauvel-widow', 'Kerrin', 'Widowed at the Lauvel', 'shelter-keeper', 0x4f4a55, 2.6, 13.4, 0, { posture: 'sit-ground' }),
  person('lauvel-keeper', 'Maudry', 'Keeper of the valley shrine', 'rise-custodian', 0xd8d0bc, 16.6, 21.6, -Math.PI / 2),
]);
export const LAUVEL_PEOPLE_IDS = freeze(LAUVEL_PEOPLE.map(p => p.id));

/**
 * Where the bearers are, `seconds` into their round: out from the burial
 * ground to the fallen, a pause to lift one onto the hurdle, back to the row,
 * a pause to lay him down, and again. The back bearer keeps two metres behind
 * the front one, on the line they walk.
 */
export function bearersAt(seconds) {
  const { pickUp, layDown, pace, lift, rest } = BEARERS_ROUND;
  const length = Math.hypot(layDown.x - pickUp.x, layDown.z - pickUp.z), walk = length / pace, cycle = 2 * walk + lift + rest;
  let t = ((seconds % cycle) + cycle) % cycle;
  const along = (from, to, u) => ({ x: from.x + (to.x - from.x) * u, z: from.z + (to.z - from.z) * u });
  let front, heading, carrying, phase;
  if (t < lift) { phase = 'lifting'; front = { ...pickUp }; heading = Math.atan2(layDown.x - pickUp.x, layDown.z - pickUp.z); carrying = t > lift / 2; }
  else if ((t -= lift) < walk) { phase = 'carrying'; front = along(pickUp, layDown, t / walk); heading = Math.atan2(layDown.x - pickUp.x, layDown.z - pickUp.z); carrying = true; }
  else if ((t -= walk) < rest) { phase = 'laying'; front = { ...layDown }; heading = Math.atan2(layDown.x - pickUp.x, layDown.z - pickUp.z); carrying = t < rest / 2; }
  else { t -= rest; phase = 'returning'; front = along(layDown, pickUp, t / walk); heading = Math.atan2(pickUp.x - layDown.x, pickUp.z - layDown.z); carrying = false; }
  const back = { x: front.x - Math.sin(heading) * 2, z: front.z - Math.cos(heading) * 2 };
  return { front, back, heading, carrying, phase };
}

/** When there is a fight on the field, the bearers set the dead man down at the row and stand back by it until it is over. */
export function bearersStandingBack() {
  const { pickUp, layDown, pace, lift, rest } = BEARERS_ROUND;
  return { ...bearersAt(lift + Math.hypot(layDown.x - pickUp.x, layDown.z - pickUp.z) / pace + rest * .75), phase: 'standing-back' };
}

// ---------------------------------------------------------------------------
// What they say
// ---------------------------------------------------------------------------
export const LAUVEL_LINES = freeze({
  'lauvel-bearer-front': [
    'Mind your feet. We carry them the way we would want to be carried, and that means nobody steps on them.',
    'Nine yesterday. Twelve the day before. The field keeps giving them up. The grass grows fast over a man, it turns out.',
  ],
  'lauvel-bearer-back': [
    'I knew this one. We drank at the mill. Do not ask me his name; I am saving it for the grave.',
    'The soldiers took theirs away in carts the first morning. Ours they left for the crows. Then they let us bury them, and called it decent.',
  ],
  'lauvel-digger': [
    'Forty years I have dug for this valley, one at a time, the way it should be done. A grave is a door. You do not make a door in a hurry.',
    'Now it is a row a day, and I make them in a hurry. Do not stand on the fresh ones. The earth is still deciding.',
  ],
  'lauvel-seeker': [
    'I have looked at every face in that row, and every face on the field. He is not in it. So he is somewhere else. So he is alive.',
    'Ilva says I should go home. Home was the field. Everybody’s home is the field now.',
  ],
  'lauvel-widow': [
    'He went to the meeting at the mill because everybody went. He did not own a sword. He took a hay fork. They put him in the rebel row.',
    'Nobody asked him what he was. Nobody asks the dead. You are the Empire’s, I think. Then you can go and tell them: nobody asked.',
  ],
  'lauvel-keeper': [
    'We sing them down one at a time, with their names, so the ground knows who it is being given. It takes a long time. It ought to.',
    'She lifts her voice again: a slow valley song with the names in it, one after another, a long line of them. None of them is yours. You are glad of that, and ashamed of being glad.',
  ],
});
