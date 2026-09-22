/**
 * Tidehaven's dog: a friendly stray that sniffs about the green, comes to see
 * who has arrived, and will usually eat whatever food it is offered. A pure
 * behaviour so the game loop only has to move the model where this says.
 */
export const VILLAGE_DOG = Object.freeze({
  id: 'village-dog', name: 'the village dog', role: 'Sniffing about',
  haunts: Object.freeze([
    Object.freeze({ x: -16, z: 33 }), Object.freeze({ x: -8, z: 40 }), Object.freeze({ x: -22, z: 38 }),
    Object.freeze({ x: -28, z: 27 }), Object.freeze({ x: -12, z: 24 }), Object.freeze({ x: -34, z: 33 }),
  ]),
  greetings: Object.freeze([
    'The dog trots over, nose going, and sniffs at your satchel. Its tail has not stopped since it saw you.',
    'The dog sits, then stands, then sits again, watching your hands.',
    'The dog leans against your leg and looks up. Nobody in Tidehaven admits to owning it.',
  ]),
});

/** Foods the dog turns its nose up at; everything else it eats gladly. */
export const DOG_DISLIKES = Object.freeze(['brined-olives', 'dried-figs', 'dried-pears', 'wood-sorrel', 'marsh-samphire']);

export const DOG_APPETITE = .85;

export function createVillageDog({ haunts = VILLAGE_DOG.haunts, random = Math.random } = {}) {
  const state = { mode: 'sniffing', haunt: 0, timer: 2, followUntil: 0, clock: 0, fed: 0, lastRefusal: -Infinity, sniffs: 0 };
  const point = { x: haunts[0].x, z: haunts[0].z };

  function nextHaunt() {
    let next = Math.floor(random() * haunts.length) % haunts.length;
    if (next === state.haunt) next = (next + 1) % haunts.length;
    state.haunt = next;
    state.timer = 2.5 + random() * 3.5;
    state.sniffs++;
  }

  /**
   * Advance the dog. `player` is where the traveler stands; returns where the dog
   * wants to be, how fast, and whether it is sitting.
   */
  function update(dt, player) {
    if (!Number.isFinite(dt) || dt <= 0) return target();
    state.clock += dt;
    const near = player ? Math.hypot(player.x - point.x, player.z - point.z) : Infinity;
    if (state.mode === 'eating') {
      state.timer -= dt;
      // **It does not follow.** Fed, it is pleased with you and goes back to its own rounds:
      // ninety seconds of dog underfoot got in the way of everything (the user, 22 September
      // 2026). Greeting it, feeding it and the rest of its day are unchanged.
      if (state.timer <= 0) { state.mode = 'sniffing'; nextHaunt(); }
    } else if (state.mode === 'following') {
      if (state.clock >= state.followUntil || near > 40) { state.mode = 'sniffing'; nextHaunt(); }
    } else if (state.mode === 'approaching') {
      if (near > 12) { state.mode = 'sniffing'; nextHaunt(); }
    } else {
      // Sniffing about: linger at a haunt, then wander to the next; come over when someone new is close.
      state.timer -= dt;
      if (near < 7 && state.clock - state.lastRefusal > 20) state.mode = 'approaching';
      else if (state.timer <= 0) nextHaunt();
    }
    return target(player);
  }

  function target(player) {
    if (player && (state.mode === 'approaching' || state.mode === 'following')) {
      const dx = point.x - player.x, dz = point.z - player.z, d = Math.hypot(dx, dz) || 1, keep = state.mode === 'following' ? 2.2 : 1.4;
      return { x: player.x + dx / d * keep, z: player.z + dz / d * keep, pace: state.mode === 'following' ? 2.2 : 1.8, sitting: d <= keep + .3 };
    }
    const haunt = haunts[state.haunt];
    return { x: haunt.x, z: haunt.z, pace: 1.4, sitting: state.mode === 'sniffing' && state.timer > 0 && Math.hypot(haunt.x - point.x, haunt.z - point.z) < .6 };
  }

  /** The game reports where the model actually is, so distances stay honest. */
  function place(x, z) { point.x = x; point.z = z; }

  /** Offer food. The dog usually eats, unless the item is not food or is one of the few it dislikes. */
  function feed({ itemId, isFood, roll = random() }) {
    if (!isFood) { state.lastRefusal = state.clock; return { ate: false, line: 'The dog sniffs it, looks at you, and sits down. That is not food to a dog.' }; }
    if (DOG_DISLIKES.includes(itemId)) { state.lastRefusal = state.clock; return { ate: false, line: 'The dog sniffs it twice and turns its head away, offended.' }; }
    if (roll >= DOG_APPETITE) { state.lastRefusal = state.clock; return { ate: false, line: 'The dog sniffs it, thinks about it, and decides against it. You keep it.' }; }
    state.fed++; state.mode = 'eating'; state.timer = 2.5;
    // It is pleased with you and it is not coming with you: the lines used to promise a dog at
    // your heel, which is what was taken out (the user, 22 September 2026).
    return { ate: true, line: state.fed === 1 ? 'Gone in two bites. The dog looks at your satchel, then at you, and decides you are all right.' : 'Gone at once. The dog thumps its tail twice and goes back to its rounds.' };
  }

  function greeting() { return VILLAGE_DOG.greetings[state.fed === 0 ? 0 : state.mode === 'following' ? 2 : 1]; }

  return { update, place, feed, greeting, get state() { return { ...state, x: point.x, z: point.z }; } };
}
