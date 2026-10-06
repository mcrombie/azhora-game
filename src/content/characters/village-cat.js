/**
 * Tidehaven's cat: a harbour tabby who belongs to nobody and is fed by everyone.
 * It naps in the sun, washes, prowls between its places and stalks what moves
 * in the grass. It comes to the traveler only on its own terms: stand still near
 * it and it may come and wind round your legs; walk straight up to it and it
 * moves off; run at it, or bring the dog, or start a fight, and it is gone.
 * Fish buys trust, meat and cheese buy a little, bread buys a look.
 * A pure behaviour: the game loop moves the model where this says and poses it.
 */
export const VILLAGE_CAT = Object.freeze({
  id: 'village-cat', name: 'the harbour cat', role: 'Minding its own business',
  // Where a cat would be in Tidehaven, in world metres.
  spots: Object.freeze([
    Object.freeze({ id: 'crates', x: 3.5, z: 21.5, kind: 'perch', name: 'among the harbour crates' }),
    Object.freeze({ id: 'sunny-wall', x: -3, z: 14, kind: 'sun', name: 'against a sunny wall' }),
    Object.freeze({ id: 'fisher', x: 0, z: 46, kind: 'scraps', name: 'beside the fisher, hoping' }),
    Object.freeze({ id: 'doorstep', x: -22, z: 8.4, kind: 'sun', name: 'on a doorstep' }),
    Object.freeze({ id: 'fire', x: -24, z: 41.8, kind: 'warm', name: 'on the warm stones by the fire' }),
    Object.freeze({ id: 'shady-wall', x: -3.8, z: 41, kind: 'shade', name: 'in the shade of a wall' }),
  ]),
});

/** What the cat will cross the green for. */
export const CAT_FAVOURITES = Object.freeze(['raw-fish', 'cooked-fish', 'salt-shoal-fish', 'smoked-eel', 'smoked-whitefish', 'fish-stew', 'dressed-crab', 'stills-oysters']);
/** What it will eat if it is in the mood. Anything else is not food to a cat. */
export const CAT_WILL_EAT = Object.freeze(['roast-duck', 'dried-venison', 'smoked-sausage', 'salt-pork', 'boiled-egg', 'ewe-cheese', 'narcoshi-cheese', 'mutton-pie']);

/** Distances in metres, speeds in metres a second. */
export const CAT_SENSES = Object.freeze({
  notice: 7,       // the traveler is watched from this near
  shy: 1.4,        // nearer than this, a cat that does not trust you moves off
  running: 5,      // a traveler faster than this is running at it
  still: .4,       // slower than this, the traveler is standing still
  dog: 3,          // the dog nearer than this and the cat bolts
  fight: 14,       // a fight this near and the cat bolts
});

const MOVING = new Set(['prowling', 'stalking', 'pouncing', 'wary', 'bolting']);
const BUSY = new Set(['napping', 'eating', 'rubbing', 'wary', 'bolting', 'hiding', 'stalking', 'pouncing']);

/**
 * `clear(from, to)` says whether the cat can walk straight from one point to another;
 * the game answers it from the world, so the cat never sets off through a house.
 */
export function createVillageCat({ spots = VILLAGE_CAT.spots, random = Math.random, clear = () => true } = {}) {
  const state = {
    mode: 'napping', spot: 0, timer: 20, clock: 0, trust: 0, fed: 0, pets: 0, rubs: 0, naps: 1, stalks: 0, bolts: 0,
    still: 0, angle: 0, loiterUntil: 0, snubbedAt: -Infinity, ignoreUntil: 0, stalkPlanned: false, gx: spots[0].x, gz: spots[0].z,
    closest: Infinity, stalled: 0,
  };
  const point = { x: spots[0].x, z: spots[0].z };
  const between = (a, b) => a + random() * (b - a);
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const goal = () => ({ x: state.gx, z: state.gz });
  const aim = (x, z) => { state.gx = x; state.gz = z; state.closest = Infinity; state.stalled = 0; };
  /** Its other places it can see from where it stands. */
  const inView = () => spots.map((spot, i) => i).filter(i => gap(spots[i], point) > 1 && clear(point, spots[i]));

  function settle(mode, timer) { state.mode = mode; state.timer = timer; }

  function prowl() {
    const choices = inView();
    if (!choices.length) { settle('sitting', between(8, 16)); return; }
    const next = choices[Math.floor(random() * choices.length) % choices.length];
    state.spot = next;
    aim(spots[next].x, spots[next].z);
    state.stalkPlanned = random() < .35;
    settle('prowling', 0);
  }

  /** Arrived at its place: a warm or sunny spot is for sleeping; anywhere else, for sitting and looking. */
  function arrive() {
    const kind = spots[state.spot].kind;
    if ((kind === 'sun' || kind === 'warm') && random() < .7) { state.naps++; settle('napping', between(35, 80)); }
    else settle('sitting', between(8, 20));
  }

  /** Away from whatever frightened it: to the one of its places in sight that is farthest from the fright, or just away. */
  function bolt(threat) {
    let best = -1, far = gap(point, threat);
    for (const i of inView()) { const d = gap(spots[i], threat); if (d > far) { far = d; best = i; } }
    if (best >= 0) { state.spot = best; aim(spots[best].x, spots[best].z); }
    else {
      const dx = point.x - threat.x, dz = point.z - threat.z, d = Math.hypot(dx, dz) || 1;
      aim(point.x + dx / d * 6, point.z + dz / d * 6);
    }
    state.bolts++; state.still = 0;
    settle('bolting', 0);
  }

  /** Off a few steps, directly away from the traveler, then turn and watch again. */
  function edgeAway(player, distance = 4.5) {
    const dx = point.x - player.x, dz = point.z - player.z, d = Math.hypot(dx, dz) || 1;
    aim(player.x + dx / d * distance, player.z + dz / d * distance);
    state.still = 0; state.snubbedAt = state.clock;
    settle('wary', 4);
  }

  function beginRub(player) {
    state.angle = Math.atan2(point.z - player.z, point.x - player.x);
    settle('rubbing', between(6, 9));
  }

  /**
   * Advance the cat. `player` is where the traveler stands and `speed` how fast they
   * are moving; `dog` is the dog's position; `fight` is true while a fight is on nearby.
   */
  function update(dt, { player = null, speed = 0, dog = null, fight = false } = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return target(player);
    state.clock += dt;
    const near = player ? gap(player, point) : Infinity;
    const running = speed > CAT_SENSES.running, standing = speed < CAT_SENSES.still;

    // Whatever frightens a cat outranks whatever it was doing. Once hidden, only something
    // right on top of it moves it again.
    if (state.mode !== 'bolting') {
      if (dog && gap(dog, point) < CAT_SENSES.dog) { bolt(dog); return target(player); }
      if (fight && player && near < CAT_SENSES.fight && state.mode !== 'hiding') { bolt(player); return target(player); }
      if (player && running && near < 3 && state.trust < .8) { bolt(player); return target(player); }
    }

    // Something in the way it cannot get round: a cat simply sits down where it is.
    if (MOVING.has(state.mode) && state.mode !== 'pouncing') {
      const left = gap(goal(), point);
      if (left < state.closest - .05) { state.closest = left; state.stalled = 0; }
      else if ((state.stalled += dt) > 3) {
        aim(point.x, point.z);
        if (state.mode === 'bolting') settle('hiding', between(10, 16));
        else if (state.mode === 'wary') settle('watching', 20);
        else settle('sitting', between(6, 12));
        return target(player);
      }
    }

    switch (state.mode) {
      case 'napping':
        // Asleep, it lets the world go by; only a hand, or the time, wakes it.
        state.timer -= dt;
        if (state.timer <= 0) settle('grooming', between(6, 12));
        break;
      case 'grooming': case 'sitting':
        state.timer -= dt;
        if (state.timer <= 0) { if (state.mode === 'sitting') settle('grooming', between(5, 9)); else prowl(); }
        break;
      case 'prowling': {
        const left = gap(goal(), point);
        // Halfway there, something in the grass wants stalking.
        if (state.stalkPlanned && left < 6 && left > 3) {
          state.stalkPlanned = false; state.stalks++;
          const dx = state.gx - point.x, dz = state.gz - point.z, d = Math.hypot(dx, dz) || 1;
          aim(point.x + dx / d * 1.6, point.z + dz / d * 1.6);
          settle('stalking', between(3, 5));
        } else if (left < .4) arrive();
        break;
      }
      case 'stalking':
        state.timer -= dt;
        if (state.timer <= 0) {
          const dx = state.gx - point.x, dz = state.gz - point.z, d = Math.hypot(dx, dz) || 1;
          aim(point.x + dx / d * 1.8, point.z + dz / d * 1.8);
          settle('pouncing', .35);
        }
        break;
      case 'pouncing':
        state.timer -= dt;
        // Whatever it was got away. It meant to do that, and washes to prove it.
        if (state.timer <= 0) settle('grooming', between(4, 7));
        break;
      case 'eating':
        state.timer -= dt;
        if (state.timer <= 0) { if (player) beginRub(player); else prowl(); }
        break;
      case 'rubbing':
        state.timer -= dt;
        if (!player || near > 3.5) { prowl(); break; }
        if (speed > 3) { settle('sitting', between(4, 8)); break; }
        state.angle += dt * 1.7;
        aim(player.x + Math.cos(state.angle) * .55, player.z + Math.sin(state.angle) * .55);
        if (state.timer <= 0) {
          state.rubs++; state.trust = Math.min(1, state.trust + .05); state.still = 0;
          if (state.clock < state.loiterUntil) settle('loitering', 0); else prowl();
        }
        break;
      case 'loitering':
        // Keeping the traveler company, as if it happened to be going the same way.
        if (!player || state.clock >= state.loiterUntil || near > 40) { prowl(); break; }
        if (near > 7) {
          const dx = point.x - player.x, dz = point.z - player.z, d = Math.hypot(dx, dz) || 1;
          aim(player.x + dx / d * 4, player.z + dz / d * 4);
        } else if (near < 2.5) {
          aim(point.x, point.z);
        } else if (gap(goal(), point) < .4) aim(point.x, point.z);
        break;
      case 'wary':
        state.timer -= dt;
        if (state.timer <= 0 || gap(goal(), point) < .4) settle('watching', 20);
        break;
      case 'bolting':
        if (gap(goal(), point) < .5) settle('hiding', between(10, 16));
        break;
      case 'hiding':
        // Pressed low until the trouble is over and a while after.
        if (fight) state.timer = Math.max(state.timer, 6);
        state.timer -= dt;
        if (state.timer <= 0) settle('grooming', between(5, 9));
        break;
      case 'watching':
        state.timer -= dt;
        if (!player || near > CAT_SENSES.notice + 2 || state.timer <= 0) {
          // Bored of you: it will not sit and watch again for a while.
          state.still = 0; if (state.timer <= 0) state.ignoreUntil = state.clock + 30;
          settle('grooming', between(4, 8)); break;
        }
        if (near < CAT_SENSES.shy && state.trust < .5) { edgeAway(player); break; }
        // Stand still long enough and it decides, all by itself, to come and see you.
        if (standing && near < 4.5 && state.clock - state.snubbedAt > 15) state.still += dt; else if (!standing) state.still = Math.max(0, state.still - dt * 2);
        if (state.still > 7 - state.trust * 5) { state.still = 0; beginRub(player); }
        break;
    }
    // Awake and not otherwise engaged, it notices the traveler and watches.
    if (player && near < CAT_SENSES.notice && !BUSY.has(state.mode) && state.mode !== 'watching' && state.mode !== 'loitering'
      && state.clock >= state.ignoreUntil) {
      aim(point.x, point.z); settle('watching', 20);
    }
    return target(player);
  }

  function target(player) {
    const posture = {
      napping: 'nap', grooming: 'groom', sitting: 'sit', watching: 'sit', prowling: 'walk', stalking: 'crouch', pouncing: 'pounce',
      eating: 'eat', rubbing: 'rub', loitering: 'sit', wary: 'low', bolting: 'low', hiding: 'low',
    }[state.mode] ?? 'sit';
    const pace = { prowling: 1.1, stalking: .4, pouncing: 6, rubbing: 1.3, loitering: 1.6, wary: 2.6, bolting: 5.5 }[state.mode] ?? 0;
    const looking = player && (state.mode === 'watching' || state.mode === 'loitering' || state.mode === 'eating');
    const moving = MOVING.has(state.mode) || state.mode === 'rubbing' || state.mode === 'loitering';
    return { x: moving ? state.gx : point.x, z: moving ? state.gz : point.z, pace, posture,
      sitting: !MOVING.has(state.mode) && state.mode !== 'rubbing', face: looking ? { x: player.x, z: player.z } : null };
  }

  /** The game reports where the model actually is, so distances stay honest. */
  function place(x, z) { point.x = x; point.z = z; }

  /** Offer something. Fish is gone at once; meat or cheese, perhaps; anything else earns a look. */
  function feed({ itemId, roll = random() }) {
    if (state.mode === 'bolting' || state.mode === 'wary' || state.mode === 'hiding') return { ate: false, line: 'The cat is well out of reach and intends to stay there.' };
    const first = state.fed === 0;
    if (CAT_FAVOURITES.includes(itemId)) {
      state.fed++; state.trust = Math.min(1, state.trust + .3); state.loiterUntil = state.clock + 75;
      settle('eating', 5);
      const line = itemId === 'raw-fish'
        ? 'The fish is out of your hand before you have finished offering it. The cat eats it in the lee of the crates, growling softly at nobody.'
        : 'The cat takes it delicately, carries it two steps away in case you change your mind, and eats every scrap.';
      return { ate: true, line: first ? `${line} Then it looks at you properly for the first time.` : line };
    }
    if (CAT_WILL_EAT.includes(itemId) && roll < .7) {
      state.fed++; state.trust = Math.min(1, state.trust + .15); state.loiterUntil = state.clock + 40;
      settle('eating', 4);
      return { ate: true, line: 'The cat eats it without making a fuss about it, which from a cat is thanks enough.' };
    }
    state.snubbedAt = state.clock; state.still = 0;
    if (CAT_WILL_EAT.includes(itemId)) return { ate: false, line: 'The cat sniffs it, considers you, and leaves it where it is. You pick it up again.' };
    prowl();
    return { ate: false, line: 'The cat sniffs it once, gives you a look of open disappointment, and walks off with its tail straight up.' };
  }

  /** Reach out a hand. What happens is up to the cat. */
  function pet({ roll = random() } = {}) {
    state.pets++;
    if (state.mode === 'bolting' || state.mode === 'wary' || state.mode === 'hiding') return { purred: false, line: 'It is having none of it.' };
    if (state.mode === 'napping') {
      state.trust = Math.min(1, state.trust + .02);
      return { purred: true, line: 'It opens one eye, allows one stroke, and closes the eye again. You have been permitted.' };
    }
    const tolerance = .3 + state.trust * .6;
    if (state.trust > .5 && roll < .15) {
      return { purred: true, line: 'It rolls over and shows you its belly. You know better than to believe it, and you reach for it anyway. Four paws close round your wrist at once and let go again. It purrs the whole time.' };
    }
    if (roll < tolerance) {
      state.trust = Math.min(1, state.trust + .05); settle('sitting', between(6, 10));
      return { purred: true, line: 'It pushes its head hard into your hand and purrs like a cart on cobbles.' };
    }
    state.snubbedAt = state.clock; state.still = 0; prowl();
    return { purred: false, line: 'Two strokes, then it bats your hand away, claws mostly in, and stalks off with its tail up.' };
  }

  function greeting() {
    switch (state.mode) {
      case 'napping': return 'The cat is asleep in the sun, curled nose to tail. One ear turns toward you. The rest of it does not.';
      case 'grooming': return 'The cat is washing one paw with great care and does not look up. You are not, it seems, the most important thing here.';
      case 'stalking': case 'pouncing': return 'The cat is pressed flat in the grass, tail tip twitching, staring at something you cannot see.';
      case 'rubbing': return 'The cat winds between your ankles, one way and then the other, and leaves half its coat on your boots.';
      case 'eating': return 'The cat is busy.';
      case 'loitering': return 'The cat has been keeping you company at a careful distance, as if it happened to be going your way.';
      case 'wary': case 'bolting': case 'hiding': return 'The cat watches you from a safe distance, ears half back.';
      default: return state.trust < .3
        ? 'The cat sits very upright and watches you with its eyes half closed. It belongs to nobody in Tidehaven, and everybody calls it something different.'
        : 'The cat looks at you and blinks, slowly. From a cat, that is a great deal.';
    }
  }

  return { update, place, feed, pet, greeting, get state() { return { ...state, x: point.x, z: point.z }; } };
}
