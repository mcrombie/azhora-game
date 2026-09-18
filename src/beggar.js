/**
 * Smiths, the beggar of Lumber Town.
 *
 * Pure behaviour: no render, no DOM, no timers of its own. The host calls
 * `update(dt, { position })` once a frame with the traveler's position and gets
 * back the point Smiths wants to stand on, whether he is following, and the
 * occasional line he says. He wanders the square between a few points; when the
 * traveler comes close he follows at walking pace about two metres back and
 * asks for money; a coin, a word, or a minute of being ignored sends him back
 * to his wandering and he does not beg again for a good while.
 */
export const BEGGAR_NPC = Object.freeze({
  // Not the traveler's own model: he is a woodcutter's build gone thin, in a coat
  // that was somebody else's first.
  id: 'town-beggar', name: 'Smiths', role: 'Of Lumber Town', modelRole: 'forest-woodcutter', color: 0x5d564b, skin: 0xb98f68,
});

export const BEGGAR_DEFAULTS = Object.freeze({
  noticeRange: 13,      // metres at which he starts following
  keepDistance: 2,      // metres he tries to keep while following
  followSeconds: 60,    // how long he follows before giving up
  askEvery: 13,         // seconds between his begging lines
  askWithin: 7,         // he only asks when this close
  coinRest: 300,        // seconds he leaves you alone after a coin
  wordRest: 180,        // seconds he leaves you alone after being turned down
  giveUpRest: 90,       // seconds he leaves you alone after following in vain
  leaveRange: 52,       // metres from his patch: past this, the traveler has left town
  arriveWithin: 1.6,    // metres that count as reaching a wander point
  dwell: 6,             // seconds he stands at a wander point
  stuckAfter: 2,        // seconds of no progress before he tries another way round
  detourFor: 2.5,       // seconds he holds that other way
  sidestep: 2.6,        // metres he steps aside to get round it
});

/** What he says while he follows, in order. Short, cracked, harmless. */
export const BEGGAR_LINES = Object.freeze([
  'A copper for Smiths? One copper. I am not proud of it.',
  'You have the look of a soldier. Soldiers get paid. Smiths does not.',
  'One copper. I will say a good word for you at the shrine. I know the words.',
  'One copper and I am gone. That is the bargain. I keep my bargains.',
]);

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function createBeggar({ waypoints = [], options = {} } = {}) {
  const config = { ...BEGGAR_DEFAULTS, ...options };
  const route = waypoints.map(point => ({ x: point.x, z: point.z }));
  const home = route[0] ?? { x: 0, z: 0 };
  let index = 0, mode = 'wander', follow = 0, rest = 0, dwell = 0, asked = 0, line = 0;
  let stuck = 0, detour = 0, detourSide = 1, detours = 0, closest = Infinity;

  const target = () => route[index] ?? home;

  /**
   * Where he stands while following: `keepDistance` metres from the traveler,
   * on the side his own patch lies, so he trails rather than blocks the way.
   */
  function beside(position, here) {
    // Leaning on a stall or the well: step out sideways for a moment rather
    // than keep pushing at the stone. The host walks him and cannot plan a way.
    if (detour > 0 && here) {
      const dx = position.x - here.x, dz = position.z - here.z, length = Math.hypot(dx, dz) || 1;
      // Aim diagonally: half toward the traveler, half to one side, so the detour carries him past
      // the obstacle instead of only along it. Recomputed each frame, it slides him round a curve.
      const ux = dx / length, uz = dz / length;
      return { x: here.x + (ux - uz * detourSide) * config.sidestep, z: here.z + (uz + ux * detourSide) * config.sidestep };
    }
    let dx = home.x - position.x, dz = home.z - position.z;
    // Standing on his own patch, he steps off to one side rather than onto the traveler.
    if (Math.hypot(dx, dz) < .5) { dx = target().x - position.x + .7; dz = target().z - position.z + .7; }
    const length = Math.hypot(dx, dz) || 1;
    return { x: position.x + dx / length * config.keepDistance, z: position.z + dz / length * config.keepDistance };
  }

  function wanderStep(dt, here) {
    if (distance(here, target()) <= config.arriveWithin) {
      dwell += dt;
      if (dwell >= config.dwell) { dwell = 0; index = route.length ? (index + 1) % route.length : 0; }
    } else dwell = 0;
  }

  /**
   * One frame. `position` is the traveler; `here` is where Smiths actually
   * stands, so the host's own movement decides when he has arrived.
   */
  function update(dt = 1 / 60, { position, here = position, awake = true } = {}) {
    if (!Number.isFinite(dt) || dt <= 0 || !position) return step(null, position, null);
    if (!awake) return step(null, position, null);
    if (rest > 0) rest = Math.max(0, rest - dt);
    const gap = distance(position, home), reach = distance(position, here);
    let said = null;
    if (mode === 'follow') {
      follow += dt; asked += dt;
      if (reach < closest - .05) { closest = reach; stuck = 0; detours = 0; } else stuck += dt;
      if (detour > 0) detour = Math.max(0, detour - dt);
      else if (stuck > config.stuckAfter && reach > config.keepDistance + .6) {
        // Keep going the same way round for a few tries: alternating on every
        // attempt only walks him back into the same corner of the stall.
        detours++;
        if (detours % 3 === 0) detourSide = -detourSide;
        detour = config.detourFor; stuck = 0; closest = reach;
      }
      if (asked >= config.askEvery && reach <= config.askWithin) {
        said = BEGGAR_LINES[line % BEGGAR_LINES.length]; line++; asked = 0;
      }
      if (follow >= config.followSeconds || gap > config.leaveRange) give('give-up');
    } else {
      wanderStep(dt, here);
      if (rest <= 0 && reach <= config.noticeRange && gap <= config.leaveRange) {
        mode = 'follow'; follow = 0; asked = config.askEvery - 1.5; stuck = 0; detour = 0; detours = 0; closest = reach;
      }
    }
    return step(said, position, here);
  }

  /** A coin, or a word, sends him away for a while. */
  function give(kind) {
    mode = 'wander'; follow = 0; asked = 0; dwell = 0; stuck = 0; detour = 0; detours = 0; closest = Infinity;
    rest = kind === 'coin' ? config.coinRest : kind === 'give-up' ? config.giveUpRest : config.wordRest;
    return { ok: true, resting: rest };
  }

  function step(said = null, position = null, here = null) {
    const following = mode === 'follow' && !!position;
    return { following, target: following ? beside(position, here) : { ...target() },
      keepDistance: config.keepDistance, line: said, detouring: detour > 0, resting: rest > 0 };
  }

  return {
    update, satisfy: () => give('coin'), dismiss: () => give('word'),
    reset() { mode = 'wander'; follow = 0; rest = 0; dwell = 0; asked = 0; line = 0; index = 0; stuck = 0; detour = 0; detours = 0; closest = Infinity; },
    get state() { return { mode, following: mode === 'follow', resting: rest > 0, rest: Math.round(rest), asked: line, index }; },
  };
}

/** His replies when the traveler stops and speaks to him. */
export function beggarConversation(npc, context) {
  const { beggar, inventory, openDialogue, closeDialogue, act } = context;
  const coins = inventory?.count?.('copper-piece') ?? 0;
  const resting = beggar?.state?.resting;
  const choices = [];
  if (coins > 0) choices.push({ id: 'give-smiths-coin', label: 'Give Smiths a copper piece.', action: () => { closeDialogue(); act('give-smiths-coin'); } });
  choices.push({ id: 'thank-smiths', label: 'Thank you, Smiths. That is enough for today.', action: () => { closeDialogue(); act('dismiss-smiths'); } });
  choices.push({ id: 'nothing-for-smiths', label: 'I have nothing for you.', action: () => { closeDialogue(); act('dismiss-smiths'); } });
  const lines = resting
    ? ['Smiths is fed. Smiths is not asking. You see? I keep my bargains.',
      'Go on about your business. I will be here. I am always here.']
    : ['Smiths, they call me. Not my name. A name I had off a man who owned a forge, and he is gone, and the forge is gone.',
      'A copper. One copper buys bread at the stall and then nobody has to look at me. That is a fair trade for everyone.'];
  openDialogue(npc, lines, null, 'Back to the square', { choices });
}
