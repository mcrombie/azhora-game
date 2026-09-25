/**
 * The old tree in Drent's wood.
 *
 * Nobody in Tidehaven talks about it, because nobody in Tidehaven is sure. It is
 * the biggest tree in the country, standing in its own clearing south of the
 * Greenway and off every path, and if the traveler walks up to it the bark
 * gathers itself into a face and watches them come. It watches for a while. Then
 * it closes its eyes and the face goes back into the grain, as though it had
 * decided the traveler was not worth the effort, and for some time after that it
 * is only a tree.
 *
 * That is all it does, for now. Learning to talk to it begins a long way from
 * here: the botanist in Ambron knows there were once many of these and that one
 * is left standing in Drent, and sends the traveler back to find it. How the
 * talking itself is done is still to be written.
 *
 * Pure: no DOM, no three. `src/talking-tree-view.js` draws it.
 */

export const TALKING_TREE_VERSION = 1;

export const TALKING_TREE = Object.freeze({
  id: 'old-tree', name: 'The Old Tree',
  x: -136, z: 114,
  trunkRadius: 1.9, height: 24,
  note: 'The biggest tree in Drent, in a clearing of its own south of the Greenway, off every path. It is older than anything near it by a long way.',
});

/** How near the traveler must come before it notices, and how long it bothers to look. */
export const TREE_NOTICE = 20;
export const TREE_WATCH = 9;
export const TREE_REST = 70;

/**
 * Where the quest is. `told` is set by Ambron's botanist; everything after that
 * is waiting for the user to decide how the talking works.
 */
export const TREE_STAGES = Object.freeze(['unknown', 'seen', 'told']);

export function validateTalkingTreeSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== TALKING_TREE_VERSION) return false;
  if (!TREE_STAGES.includes(data.stage)) return false;
  return Number.isInteger(data.sightings) && data.sightings >= 0 && data.sightings <= 1e6;
}

export function createTalkingTree({ tree = TALKING_TREE, onEvent = () => {} } = {}) {
  // `open` runs 0..1: bark, then eyes. `phase` is what the face is doing now.
  const state = { stage: 'unknown', sightings: 0, phase: 'asleep', open: 0, clock: 0, faceYaw: 0 };

  function update(dt, player) {
    if (!Number.isFinite(dt) || dt <= 0) return view();
    const near = player ? Math.hypot(player.x - tree.x, player.z - tree.z) : Infinity;
    state.clock += dt;
    if (state.phase === 'asleep' && near < TREE_NOTICE) {
      state.phase = 'waking'; state.clock = 0;
      state.sightings += 1;
      if (state.stage === 'unknown') { state.stage = 'seen'; onEvent({ type: 'tree-seen' }); }
      onEvent({ type: 'tree-woke', sightings: state.sightings });
    }
    if (state.phase === 'waking') {
      state.open = Math.min(1, state.open + dt / 2.2);
      if (state.open >= 1) { state.phase = 'watching'; state.clock = 0; }
    } else if (state.phase === 'watching') {
      // It has seen enough, or the traveler has walked away: either way it is done.
      if (state.clock > TREE_WATCH || near > TREE_NOTICE * 1.6) { state.phase = 'hiding'; state.clock = 0; onEvent({ type: 'tree-hid' }); }
    } else if (state.phase === 'hiding') {
      state.open = Math.max(0, state.open - dt / 1.6);
      if (state.open <= 0) { state.phase = 'resting'; state.clock = 0; }
    } else if (state.phase === 'resting' && state.clock > TREE_REST && near > TREE_NOTICE) {
      state.phase = 'asleep';
    }
    // The face slides round the bark to follow the traveler while it is awake,
    // slowly, as a thing that size would.
    if (player && state.open > 0) {
      const want = Math.atan2(player.x - tree.x, player.z - tree.z);
      let delta = want - state.faceYaw;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      state.faceYaw += delta * Math.min(1, dt * .8);
    }
    return view();
  }

  function view() { return { phase: state.phase, open: state.open, faceYaw: state.faceYaw, stage: state.stage, sightings: state.sightings }; }

  /** Ambron's botanist has told the traveler what it is. */
  function tell() {
    if (state.stage === 'told') return false;
    state.stage = 'told'; onEvent({ type: 'tree-told' });
    return true;
  }

  function snapshot() { return { version: TALKING_TREE_VERSION, stage: state.stage, sightings: state.sightings }; }
  function restore(data) {
    state.stage = 'unknown'; state.sightings = 0; state.phase = 'asleep'; state.open = 0;
    if (!validateTalkingTreeSnapshot(data, { allowMissing: false })) return false;
    state.stage = data.stage; state.sightings = data.sightings;
    return true;
  }

  return { update, view, tell, snapshot, restore, tree,
    get stage() { return state.stage; }, get phase() { return state.phase; }, get awake() { return state.open > .35; } };
}

/** What the traveler gets for pressing F at it, which, for now, is very little. */
export function treeLines(view) {
  if (view.stage === 'told') return [
    'You put your hand flat on the bark the way the botanist in Ambron described, and wait.',
    'Nothing. Or not nothing: the kind of quiet a room has when somebody in it has just stopped talking. Whatever the way in is, it is not this, or not yet.',
  ];
  if (view.open > .35) return [
    'It is looking at you. There is no other way to put it. The bark has drawn itself up into a brow and two deep hollows, and something in the hollows is paying attention.',
    'You say something. You are not sure afterwards what. It does not answer, but it does not look away either.',
  ];
  if (view.phase === 'resting' || view.phase === 'hiding') return [
    'Bark. Very old bark, grooved deep enough to lose a hand in, and nothing in it but the grain.',
    'You could swear the grain was arranged differently a minute ago.',
  ];
  return [
    'The biggest tree you have ever seen, and nothing about it that anyone would call strange — except that the birds are quiet here, and the clearing around it is too round to be an accident.',
  ];
}
