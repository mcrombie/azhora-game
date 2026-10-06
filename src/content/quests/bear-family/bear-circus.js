/**
 * **Kayla's family is a circus** (the user, 26 September 2026: "Can we make Kayla's bear family a
 * circus family? Michael is her husband. Ava is a daughter. Elle is her other daughter.").
 *
 * Five bears, each with an act: Kayla, the strongest, presses the iron bar over her head; Michael,
 * her husband and the ringmaster, juggles; their daughters Ava, who balances on the big ball, and
 * Elle, who dances on her hind paws; and Bodhi, the cub of the Stealth lesson, who tumbles.
 *
 * Until Kayla's race and Bodhi's lesson are both done, Michael and the girls wait in camp beside
 * Bodhi at the Tessen crossing, practising. Then the whole family walks Kayla's honey rounds in
 * one file, and wherever she stops to rest they put on the show. Pure data, timing and dialogue
 * here; the walking is src/content/quests/bear-family/bear-family.js and the acts are drawn by src/kayla-character.js.
 */
import { CUB, CUB_STAND } from './cub-honey-quest.js';
import { KAYLA } from '../kayla/kayla.js';

export const MICHAEL = Object.freeze({ id: 'kayla-michael', name: 'Michael', role: 'Ringmaster of the bear circus, and Kayla’s husband',
  look: 'michael', maxHp: 520, radius: .88, swimDepth: .7 });
export const AVA = Object.freeze({ id: 'kayla-ava', name: 'Ava', role: 'Kayla’s daughter, who balances on the ball',
  look: 'ava', maxHp: 220, radius: .62, swimDepth: .46 });
export const ELLE = Object.freeze({ id: 'kayla-elle', name: 'Elle', role: 'Kayla’s daughter, who dances',
  look: 'elle', maxHp: 200, radius: .58, swimDepth: .44 });
/** The bears added for the circus; Kayla and Bodhi have their own modules. */
export const CIRCUS_BEARS = Object.freeze([MICHAEL, AVA, ELLE]);
export const CIRCUS_BEAR_IDS = Object.freeze(CIRCUS_BEARS.map(bear => bear.id));

/** Each bear's act (src/content/quests/kayla/kayla-character.js draws it) and look. */
export const CIRCUS_ACTS = Object.freeze({ [KAYLA.id]: 'lift', [MICHAEL.id]: 'juggle', [AVA.id]: 'ball', [ELLE.id]: 'dance', [CUB.id]: 'tumble' });
export const CIRCUS_LOOKS = Object.freeze({ [KAYLA.id]: 'kayla', [MICHAEL.id]: 'michael', [AVA.id]: 'ava', [ELLE.id]: 'elle', [CUB.id]: 'bodhi' });

// The camp: on the grass east of the road, a little short of the Tessen bridge, facing the road
// and the traveler coming up it from Drent. Bodhi's own stand is across the road from them.
const campSpot = (dx, dz, yaw) => Object.freeze({ x: CUB_STAND.x + dx, z: CUB_STAND.z + dz, yaw });
export const CIRCUS_CAMP = Object.freeze({
  [MICHAEL.id]: campSpot(10.5, 4.5, -.95),
  [AVA.id]: campSpot(13, -.5, -1.2),
  [ELLE.id]: campSpot(9.5, 9, -.75),
});

/**
 * The file on the road, behind Kayla: Bodhi keeps to Mum, then the girls, and Michael at the back
 * where he can count everybody. Each follows the living bear ahead of it.
 */
export const CIRCUS_FILE = Object.freeze([CUB.id, AVA.id, ELLE.id, MICHAEL.id]);

/** The show runs sixteen seconds in every twenty-two; the other six they bow, breathe and argue. */
export const CIRCUS_SHOW = Object.freeze({ perform: 16, cycle: 22 });
export function circusPerforming(seconds) {
  if (!Number.isFinite(seconds)) return false;
  const t = ((seconds % CIRCUS_SHOW.cycle) + CIRCUS_SHOW.cycle) % CIRCUS_SHOW.cycle;
  return t < CIRCUS_SHOW.perform;
}

export const CIRCUS_LINES = Object.freeze({
  michael: Object.freeze({
    hello: Object.freeze([
      'Michael sweeps off his top hat and bows so low that the brim brushes the grass.',
      '“Roll up, roll up! Michael, ringmaster, at your service. Husband of Kayla, the strongest bear on any road, and father of three performers of rare and varied talent.”',
    ]),
    show: Object.freeze([
      '“Kayla lifts the iron bar. I keep three balls in the air, which is three more than most bears manage. Ava balances on the big ball, Elle dances, and Bodhi tumbles, mostly on purpose.”',
      '“There is no tent. The road is the ring, and whoever stops is the audience. The show is free. Honey is welcome.”',
    ]),
    away: Object.freeze(['“Kayla has gone up to Ambron after honey. She will be back. She always comes back with honey, or with a very good story about honey.”']),
    near: Object.freeze(['“Just there, at the front. We follow Kayla. Everybody follows Kayla; it is the first rule of this circus, and the only one she wrote.”']),
  }),
  ava: Object.freeze({
    hello: Object.freeze(['“I am Ava. Watch my feet, not my face. The ball goes where I go, as long as I go first.”']),
    how: Object.freeze(['“You do not stand on it. You keep walking on it, very slowly, and never all the way anywhere. Dad says that is how to get through life. Mum says that is how to fall off a ball.”']),
    sister: Object.freeze(['“Elle dances. She says dancing is balancing that goes somewhere. I say balancing is dancing with the sense to stay put.”']),
  }),
  elle: Object.freeze({
    hello: Object.freeze(['“Hello! I am Elle. I dance. Round and round, until the trees go round too.”']),
    dance: Object.freeze(['“Up on your back paws, front paws high, and turn. If you are dizzy, you are doing it right. Bodhi is learning. Bodhi mostly falls over, but on purpose now, which counts.”']),
    family: Object.freeze([
      '“Mum lifts things, Dad juggles and shouts, Ava wobbles on her ball and Bodhi tumbles. I am the one people clap for.”',
      'She thinks about it. “Everybody is the one people clap for. That is what makes it a circus.”',
    ]),
  }),
});

/**
 * Michael's, Ava's and Elle's conversations. `kaylaNear()` says whether Kayla is walking with them
 * yet. Returns false for anybody else.
 */
export function circusConversation(npc, { openDialogue, closeDialogue, kaylaNear = () => false }) {
  const bear = CIRCUS_BEARS.find(one => one.id === npc?.id);
  if (!bear) return false;
  const back = () => circusConversation(npc, { openDialogue, closeDialogue, kaylaNear });
  const say = lines => openDialogue(npc, [...lines], null, 'Back to the show', { onComplete: back });
  const leave = { id: 'leave-circus', label: 'Enjoy the show.', action: closeDialogue };
  if (bear === MICHAEL) {
    const lines = CIRCUS_LINES.michael;
    openDialogue(npc, [...lines.hello], null, 'Watch the show', { choices: [
      { id: 'circus-show', label: 'What is the show?', action: () => say(lines.show) },
      { id: 'circus-kayla', label: 'Where is Kayla?', action: () => say(kaylaNear() ? lines.near : lines.away) },
      leave,
    ] });
  } else if (bear === AVA) {
    const lines = CIRCUS_LINES.ava;
    openDialogue(npc, [...lines.hello], null, 'Watch the show', { choices: [
      { id: 'circus-ball', label: 'How do you stay on the ball?', action: () => say(lines.how) },
      { id: 'circus-sister', label: 'What does your sister do?', action: () => say(lines.sister) },
      leave,
    ] });
  } else {
    const lines = CIRCUS_LINES.elle;
    openDialogue(npc, [...lines.hello], null, 'Watch the show', { choices: [
      { id: 'circus-dance', label: 'How do you dance like that?', action: () => say(lines.dance) },
      { id: 'circus-family', label: 'Who else is in the circus?', action: () => say(lines.family) },
      leave,
    ] });
  }
  return true;
}
