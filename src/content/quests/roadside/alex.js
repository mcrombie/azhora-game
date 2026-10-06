/**
 * **Alex**, who lives with Cagney in Ambron. The user, 26 September 2026: "a character named
 * Alex, and she has short brown hair and green glasses. Say Alex lives with Cagney, and once you
 * finish the Cagney quest, Alex will come out with Cagney when you knock on the door. And if you
 * try and flirt with Cagney, she'll beat you up."
 *
 * So she is indoors until there is a door to knock on: the Cagney quest done, Cagney home and
 * inside (src/content/quests/homes/home-residents.js). Knock, Cagney comes out, and Alex comes out with her and stands
 * at her shoulder on the step; when Cagney goes back in, so does she. Flirt with Cagney while Alex
 * is standing there and Alex puts her fists up. It is a **bout** (src/gameplay/combat/combat.js): nobody dies of it,
 * on either side - she beats you until you yield, or, if you are good, you beat her.
 *
 * Pure: no three, no DOM. `src/content/quests/roadside/alex-host.js` puts it in the world.
 */
import { CAGNEY_RESIDENCE } from '../homes/quest-homes.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });

export const ALEX = freeze({
  id: 'alex', name: 'Alex', role: 'Lives with Cagney in Ambron', modelRole: 'villager', color: 0x8c4f5f,
  // Short brown hair and green glasses: a bob to the earlobe under a fringe, in a mid brown, and
  // the spectacles Cagney wears with green frames of their own. (Lee Anne's crop was tried first:
  // on this body, beside Cagney, it read as a boy.)
  look: freeze({ slight: true, beard: false, hat: false, cloak: false, glasses: true, glassesColor: 0x2e8b4c,
    hair: 0x5e3d24, hairStyle: 'bob' }),
});

/**
 * Where she stands. Indoors she is at the threshold, out of sight; on the step she is a pace and a
 * bit to Cagney's side, on the side away from the mailbox, facing out the way Cagney does.
 */
const home = CAGNEY_RESIDENCE;
const across = point(Math.cos(home.yaw), -Math.sin(home.yaw));
const side = (() => {
  const a = { x: home.porch.x + across.x * 1.4, z: home.porch.z + across.z * 1.4 };
  const b = { x: home.porch.x - across.x * 1.4, z: home.porch.z - across.z * 1.4 };
  const gap = p => Math.hypot(p.x - home.mailbox.x, p.z - home.mailbox.z);
  return gap(a) >= gap(b) ? 1 : -1;
})();
export const ALEX_STEP = point(home.porch.x + across.x * 1.4 * side, home.porch.z + across.z * 1.4 * side);
export const ALEX_DOOR = point(home.door.x + across.x * .5 * side, home.door.z + across.z * .5 * side);
export const ALEX_FACING = home.yaw + Math.PI;

/**
 * Whether she is out, and where she is making for. `out` is last frame's answer: she comes out
 * only on the knock - when Cagney does - and stays out until Cagney is inside again. Before the
 * quest is done there is no door to knock on and she is not in the world at all.
 */
export function alexPresence(out, { questComplete, cagney } = {}) {
  if (!questComplete || !cagney) return { out: false, target: ALEX_DOOR };
  const phase = cagney.phase;
  if (phase === 'inside') return { out: false, target: ALEX_DOOR };
  if (!out && phase !== 'coming-out' && phase !== 'outside') return { out: false, target: ALEX_DOOR };
  const onStep = phase === 'coming-out' || phase === 'outside';
  return { out: true, target: onStep ? ALEX_STEP : ALEX_DOOR };
}

/** What they say. Cagney's are hers; Alex's are Alex's. */
export const ALEX_LINES = freeze({
  hello: freeze([
    'You are the one who walked Cagney home from the fork. Thank you. I mean that.',
    'She has told the whole lane about the cagnappers. Twice. I still do not know what a cagnapper is.',
  ]),
  wary: freeze(['Hands where I can see them.']),
  stepIn: freeze(['Hey. Eyes off her. She is spoken for.']),
  won: freeze(['Stay down a moment. You will live.', 'Next time you have something nice to say to her, say it to me first.']),
  lost: freeze(['...All right. You can fight.', 'You still do not flirt with her.']),
});
export const CAGNEY_AT_HOME = freeze({
  greeting: freeze([
    'It is good to be home. Thank you again.',
    'This is Alex. We live here together. She heard about the cagnappers before I had my boots off.',
  ]),
  flirted: freeze(['Oh! That is very sweet of you, but -']),
  alexWon: freeze(['Alex! ...Are you all right? You did walk into that one.']),
  alexLost: freeze(['Both of you, stop it. Nobody is flirting with anybody. Come inside, Alex.']),
});
export const FLIRT_LABEL = 'Flirt with Cagney.';

/**
 * The fight: Alex against the traveler, fists, on the step where they stand. `bout: true` is what
 * makes it one nobody dies of (src/gameplay/combat/combat.js); `brawler` is how she fights; her own strength, not
 * the country's. The enemy's `npcId` is hers, so the world's Alex yields to the fighting one for
 * as long as it lasts and there is only ever one of her.
 */
export const ALEX_BOUT_ID = 'alex-bout';
export const ALEX_HEALTH = 150;
export function alexBout(traveler, alex) {
  const apart = Math.hypot(alex.x - traveler.x, alex.z - traveler.z);
  const face = apart > .4 ? Math.atan2(alex.x - traveler.x, alex.z - traveler.z) : 0;
  const reach = Math.min(3.2, Math.max(2.4, apart));
  const stand = { x: traveler.x + Math.sin(face) * reach, z: traveler.z + Math.cos(face) * reach };
  const centre = { x: (traveler.x + stand.x) / 2, z: (traveler.z + stand.z) / 2 };
  return {
    id: ALEX_BOUT_ID, bout: true, level: 0, center: centre, checkpoint: { x: traveler.x, z: traveler.z },
    retreatAxis: 'z', retreatLine: centre.z + 24,
    enemies: [{ id: 'alex-brawl', npcId: ALEX.id, kind: 'brawler', name: ALEX.name, x: stand.x, z: stand.z,
      hp: ALEX_HEALTH, armed: false, model: { role: ALEX.modelRole, tunic: ALEX.color, look: { ...ALEX.look } } }],
  };
}
