/** A first useful fire, followed by ordinary repeatable fire-making practice. */
export const FIRE_MAKING_SKILL = 'firemaking';
export const FIRE_MAKING_XP = 18;
export const FIRE_LESSON_FIRE = 'village-fire';
/** Opposite Mark, and outside the fire's interaction approach. */
export function fireMakingStands(fire) {
  const teacher = { x: fire.x - 3.8, z: fire.z - .8, yaw: Math.PI / 2 };
  return { teacher, guide: { x: teacher.x, z: teacher.z + 2.5 } };
}
export const LEE_ANNE = Object.freeze({
  id: 'lee-anne', name: 'Lee Anne', role: 'Fire Making teacher', modelRole: 'town-worker',
  color: 0x8c694b, skin: 0xe0bf98,
  look: Object.freeze({ hair: 0xd4b45e, hairStyle: 'cropped', slight: true, beard: false }),
});
export function validateFireMakingSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  return !!data && typeof data === 'object' && !Array.isArray(data) && data.version === 1
    && ['offered', 'practice', 'complete'].includes(data.stage)
    && typeof data.suppliesGiven === 'boolean'
    && ['none', 'leading', 'arrived'].includes(data.jojoReferral)
    && Number.isSafeInteger(data.firesLit) && data.firesLit >= 0 && data.firesLit <= 1e8
    && (data.stage !== 'practice' || data.suppliesGiven);
}
export function createFireMaking({ inventory, skills, onEvent = () => {} } = {}) {
  let stage = 'offered', suppliesGiven = false, jojoReferral = 'none', firesLit = 0;
  const ready = () => stage === 'complete' || !!skills?.taught?.(FIRE_MAKING_SKILL);
  function refer() {
    if (ready()) return { ok: true, needed: false };
    if (jojoReferral === 'none') jojoReferral = 'leading';
    return { ok: true, needed: true };
  }
  function arrived() {
    if (jojoReferral !== 'leading') return false;
    jojoReferral = 'arrived'; return true;
  }
  function begin() {
    if (ready()) return { ok: true, first: false };
    if (!suppliesGiven) {
      const needsTinder = !inventory.has('tinderbox');
      if (needsTinder && !inventory.grant('tinderbox')) return { ok: false, reason: 'Make room for the tinderbox, then speak to Lee Anne again.' };
      if (!inventory.add('forest-stick', 2)) {
        if (needsTinder) inventory.remove('tinderbox', 1);
        return { ok: false, reason: 'Make room for the two dry sticks, then try again.' };
      }
      suppliesGiven = true;
    }
    const first = stage === 'offered'; stage = 'practice';
    return { ok: true, first };
  }
  const mayLight = id => ready() || (stage === 'practice' && id === FIRE_LESSON_FIRE);
  function lit(id) {
    if (!mayLight(id)) return { ok: false };
    const first = !ready();
    stage = 'complete'; firesLit++;
    skills?.learn?.(FIRE_MAKING_SKILL);
    const gained = skills?.gain?.(FIRE_MAKING_SKILL, FIRE_MAKING_XP);
    onEvent({ type: first ? 'fire-making-learned' : 'fire-making-practised', id, xp: gained?.ok ? FIRE_MAKING_XP : 0 });
    return { ok: true, first, xp: gained?.ok ? FIRE_MAKING_XP : 0 };
  }
  function snapshot() { return { version: 1, stage, suppliesGiven, jojoReferral, firesLit }; }
  function restore(data, { legacyCooking = false } = {}) {
    if (data !== undefined && !validateFireMakingSnapshot(data, { allowMissing: false })) return false;
    stage = 'offered'; suppliesGiven = false; jojoReferral = 'none'; firesLit = 0;
    if (data) ({ stage, suppliesGiven, jojoReferral, firesLit } = data);
    if (data === undefined && legacyCooking) {
      stage = 'complete'; suppliesGiven = true;
      // The older save already taught cooking over a fire. Preserve that knowledge,
      // without announcing a newly earned lesson during checkpoint loading.
      if (skills && !skills.taught(FIRE_MAKING_SKILL)) {
        const saved = skills.snapshot(); saved.skills[FIRE_MAKING_SKILL] ??= { xp: 0 };
        saved.taught = [...new Set([...(saved.taught ?? []), FIRE_MAKING_SKILL])]; skills.restore(saved);
      }
    }
    return true;
  }
  return { begin, refer, arrived, lit, mayLight, snapshot, restore,
    get stage() { return stage; }, get ready() { return ready(); }, get referral() { return jojoReferral; } };
}

export function fireMakingConversation(npc, { lesson, openDialogue, closeDialogue, onChange = () => {} }) {
  if (npc?.id !== LEE_ANNE.id) return false;
  const ready = lesson.ready;
  openDialogue(npc, [ready
    ? 'A little dry tinder, space for air, and fuel added slowly. That is Fire Making. I teach the fire; Jojo and Stanley teach what to cook over it.'
    : 'Lee Anne. Before you can cook on the road, you need to make a fire that stays alight. This empty stone ring is a good place to start.'], null, 'Back to the village', { choices: [
    { id: 'lee-anne-firemaking', label: ready ? 'Remind me how to make a fire.' : lesson.stage === 'practice' ? 'About my first fire…' : 'Teach me Fire Making · optional lesson', action: () => {
      openDialogue(npc, [
        'Keep the fire inside the stone ring. Lay down dry tinder and two branches with gaps between them, strike the tinderbox, and let the flame catch before adding anything else.',
        ready ? 'Use F beside any prepared fire ring. A tinderbox and two sticks, or one log, are enough. Every new fire you actually light earns Fire Making experience.'
          : 'Here are a tinderbox and two dry sticks. Walk to this empty fire ring and press F, then choose Light fire. You must light it yourself to finish the lesson. The tinderbox stays in your satchel; gather more branches for later fires.',
        'Once your first fire is burning, you are ready for a cooking lesson. Jojo can teach you fish, and Stanley has recipes for the farm harvest.'
      ], null, ready ? 'Back to the village' : 'Take the tinder and light the fire', { noWayfinding: true, onComplete: () => {
        const result = lesson.begin(); onChange();
        if (!result.ok) openDialogue(npc, [result.reason], null, 'Try again later');
      } });
    } },
    { id: 'leave-lee-anne', label: 'Another time.', action: closeDialogue },
  ] });
  return true;
}
