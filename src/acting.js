/** Acting practice uses the ordinary skill ledger. An interrupted expression
 * earns nothing; finishing it once awards XP and may open another expression.
 * No DOM or renderer: the host animates pose() and supplies pause/busy state. */
export const ACTING_SKILL = 'acting';
export const AMANDA_TEACHES = Object.freeze([ACTING_SKILL]);
export const ACTING_XP = 12;
const emote = (id, name, level, duration, description) => Object.freeze({ id, name, level, duration, xp: ACTING_XP, description });
export const ACTING_EMOTES = Object.freeze([
  emote('happy', 'Happy', 1, 3, 'Open your stance and greet the world with a bright flourish.'),
  emote('sad', 'Sad', 1, 3.4, 'Let your shoulders sink and hide your face in your hands.'),
  emote('surprised', 'Surprised', 2, 2.8, 'Recoil, open your hands, and take in the unexpected.'),
  emote('angry', 'Angry', 3, 3.2, 'Plant your feet and shake a fist in theatrical outrage.'),
  emote('afraid', 'Afraid', 4, 3.4, 'Shrink back behind raised hands and look for an escape.'),
  emote('proud', 'Proud', 5, 3.2, 'Stand tall, present yourself, and finish with a bow.'),
]);
export const ACTING_LESSON = Object.freeze([
  'An audience reads your body before it hears a word. Lift your chest for happiness. Let the shoulders fall for sadness. Give the feeling somewhere to live.',
  'You can now find your expressions under Actions (U). Choose Happy or Sad and let the performance finish to earn Acting experience. More expressions open as your Acting level rises. Moving or fighting interrupts the performance.',
]);

export function createActing({ skills, onEvent = () => {} }) {
  let active = null;
  const level = () => skills.level(ACTING_SKILL);
  const taught = () => skills.taught(ACTING_SKILL);
  const list = () => ACTING_EMOTES.map(entry => ({ ...entry, unlocked: level() >= entry.level }));
  const pose = () => active ? { id: active.emote.id, progress: Math.min(1, active.time / active.emote.duration) } : null;
  const teach = () => skills.learn(ACTING_SKILL);
  const emit = event => { onEvent(event); return event; };
  function perform(id, { blocked = false } = {}) {
    const entry = ACTING_EMOTES.find(candidate => candidate.id === id);
    if (!entry) return { ok: false, reason: 'There is no such expression.' };
    if (blocked) return { ok: false, reason: 'Find a moment to stand still, out of combat.' };
    if (active) return { ok: false, reason: 'Finish your current expression first.' };
    if (level() < entry.level) return { ok: false, reason: `${entry.name} requires Acting level ${entry.level}.` };
    active = { emote: entry, time: 0 };
    emit({ type: 'acting-started', id: entry.id });
    return { ok: true, id: entry.id, duration: entry.duration };
  }
  function cancel(reason = 'interrupted') {
    if (!active) return false;
    const id = active.emote.id;
    active = null;
    emit({ type: 'acting-cancelled', id, reason });
    return true;
  }
  function update(dt, { paused = false, blocked = false } = {}) {
    if (!active || paused) return null;
    if (blocked) { cancel(); return null; }
    if (!Number.isFinite(dt) || dt <= 0) return null;
    active.time += dt;
    if (active.time < active.emote.duration) return null;
    const entry = active.emote, before = level();
    active = null;
    const gain = skills.gain(ACTING_SKILL, entry.xp);
    return emit({ type: 'acting-completed', id: entry.id, gained: gain.gained ?? 0, level: level(),
      unlocked: ACTING_EMOTES.filter(emotion => emotion.level > before && emotion.level <= level()).map(emotion => emotion.id) });
  }
  return { teach, taught, list, level, perform, update, cancel, pose,
    view: () => ({ level: level(), xp: skills.xp(ACTING_SKILL), taught: taught(), active: pose(), emotes: list() }) };
}

/** Amanda's practice picker also explains future expressions without granting
 * them early. The host uses the same action for her lesson and the Emotes UI. */
export function actingPracticeConversation(npc, { acting, openDialogue, closeDialogue, act }) {
  openDialogue(npc, ['Choose a feeling and make it readable. Finish the expression for 12 Acting experience. A little practice makes room for a wider range.'], null, 'Back to the road', {
    noWayfinding: true,
    choices: [...acting.list().map(entry => ({ id: `acting-emote-${entry.id}`,
      label: `${entry.name}${entry.unlocked ? '' : ` \u00b7 Acting ${entry.level}`}`, enabled: entry.unlocked, disabled: !entry.unlocked,
      title: entry.unlocked ? entry.description : `Reach Acting level ${entry.level}.`,
      reason: entry.unlocked ? '' : `Reach Acting level ${entry.level}.`,
      action: () => { closeDialogue(); act(`acting-emote-${entry.id}`); } })),
    { id: 'leave-acting-practice', label: 'Another time.', action: closeDialogue }],
  });
}
