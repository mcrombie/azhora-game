const WAIT_SECONDS = 3;
const BITE_SECONDS = 2.2;
const FIRE_SECONDS = 120;

/** Fishing and cooking share inventory, but never advance combat or quests. */
export function createCampcraft({ inventory, weapons, onEvent = () => {}, fireIds = ['village-fire', 'pond-fire'] }) {
  let taught = false;
  let phase = 'idle';
  let waitRemaining = 0;
  let biteRemaining = 0;
  let catches = 0;
  const fires = new Map(fireIds.map(id => [id, { fuel: 0 }]));

  function snapshot() {
    return {
      taught, phase,
      progress: phase === 'waiting' ? 1 - waitRemaining / WAIT_SECONDS
        : phase === 'bite' ? 1 - biteRemaining / BITE_SECONDS : 0,
      waitRemaining, biteRemaining, catches,
      fires: Object.fromEntries([...fires].map(([id, fire]) => [id, { fuel: fire.fuel }])),
    };
  }

  function resetFishing() {
    phase = 'idle'; waitRemaining = 0; biteRemaining = 0;
  }

  function teachFishing() {
    if (taught) return { ok: true, reason: '', alreadyTaught: true };
    if (!inventory.has('fishing-rod') && !inventory.grant('fishing-rod'))
      return { ok: false, reason: 'The fishing rod could not be added. Speak to Bran again.' };
    taught = true;
    onEvent({ type: 'fishing-taught' });
    return { ok: true, reason: '', alreadyTaught: false };
  }

  function cast() {
    if (!inventory.has('fishing-rod')) return { ok: false, reason: 'Speak to Bran beside the forest pond to get a fishing rod.' };
    if (phase !== 'idle') return { ok: false, reason: 'Your line is already in the water. Wait for a bite, then reel it in.' };
    phase = 'waiting'; waitRemaining = WAIT_SECONDS; biteRemaining = 0;
    onEvent({ type: 'cast' });
    return { ok: true, reason: '' };
  }

  function reel() {
    if (phase === 'idle') return { ok: false, reason: 'Cast your line first, then wait for the float to dip.' };
    if (phase === 'waiting') {
      resetFishing();
      const reason = 'A little too soon. Cast again and wait for the float to dip.';
      onEvent({ type: 'miss', reason, early: true });
      return { ok: false, reason };
    }
    if (!inventory.add('raw-fish', 1)) return { ok: false, reason: 'The fish could not be added to your satchel. Try reeling again.' };
    catches++;
    resetFishing();
    onEvent({ type: 'catch', id: 'raw-fish', catches });
    return { ok: true, reason: '', id: 'raw-fish', catches };
  }

  function cancelFishing() {
    if (phase === 'idle') return { ok: false, reason: 'There is no line to reel in.' };
    resetFishing();
    onEvent({ type: 'cancel' });
    return { ok: true, reason: '' };
  }

  function fireStatus(id) {
    const fire = fires.get(id);
    const lit = !!fire && fire.fuel > 0;
    let lightReason = '', cookReason = '';
    if (!fire) lightReason = cookReason = 'Choose a prepared fire ring.';
    else {
      if (lit) lightReason = 'This fire is already burning. Save your sticks for later.';
      else if (!inventory.has('tinderbox')) lightReason = 'Bring a tinderbox to light the fire.';
      else if (inventory.count('forest-stick') < 2) lightReason = 'Gather two forest sticks to fuel the fire.';
      if (!lit) cookReason = 'Light the fire before cooking.';
      else if (!inventory.has('raw-fish')) cookReason = 'Catch a fish first. There is no raw fish in your satchel.';
    }
    return { lit, fuel: fire?.fuel ?? 0, canLight: !lightReason, canCook: !cookReason, lightReason, cookReason };
  }

  function light(id) {
    const current = fireStatus(id);
    if (!current.canLight) return { ok: false, reason: current.lightReason };
    if (!weapons.spendSticks(2)) return { ok: false, reason: 'Two sticks are needed. No fire was lit; check your satchel.' };
    fires.get(id).fuel = FIRE_SECONDS;
    onEvent({ type: 'fire-lit', id, fuel: FIRE_SECONDS });
    return { ok: true, reason: '', fuel: FIRE_SECONDS };
  }

  function cook(id) {
    const current = fireStatus(id);
    if (!current.canCook) return { ok: false, reason: current.cookReason };
    if (!inventory.remove('raw-fish', 1)) return { ok: false, reason: 'No fish was used. Check your satchel and try again.' };
    if (!inventory.add('cooked-fish', 1)) {
      inventory.add('raw-fish', 1);
      return { ok: false, reason: 'The fish could not be cooked. Your raw fish has been kept.' };
    }
    onEvent({ type: 'cook', id, itemId: 'cooked-fish' });
    return { ok: true, reason: '', itemId: 'cooked-fish' };
  }

  function update(dt, active = true) {
    if (!active || !Number.isFinite(dt) || dt <= 0) return;
    for (const fire of fires.values()) fire.fuel = Math.max(0, fire.fuel - dt);
    let remaining = dt;
    if (phase === 'waiting') {
      if (remaining + 1e-9 < waitRemaining) { waitRemaining -= remaining; return; }
      remaining = Math.max(0, remaining - waitRemaining);
      waitRemaining = 0; biteRemaining = BITE_SECONDS; phase = 'bite';
      onEvent({ type: 'bite' });
    }
    if (phase === 'bite') {
      biteRemaining = Math.max(0, biteRemaining - remaining);
      if (biteRemaining <= 1e-9) {
        resetFishing();
        onEvent({ type: 'miss', reason: 'The fish got away. Cast again and reel when the float dips.', early: false });
      }
    }
  }

  return {
    get state() { return snapshot(); }, snapshot,
    checkpoint() { return { version: 1, taught, catches, fires: Object.fromEntries([...fires].map(([id, fire]) => [id, fire.fuel])) }; },
    restore(saved) {
      if (!saved || saved.version !== 1 || typeof saved.taught !== 'boolean'
        || !Number.isSafeInteger(saved.catches) || saved.catches < 0
        || !saved.fires || typeof saved.fires !== 'object' || Array.isArray(saved.fires)
        || Object.entries(saved.fires).some(([id, fuel]) => !fires.has(id) || !Number.isFinite(fuel) || fuel < 0 || fuel > FIRE_SECONDS)
        || (saved.taught && !inventory.has('fishing-rod'))) return false;
      taught = saved.taught; catches = saved.catches; resetFishing();
      for (const [id, fire] of fires) fire.fuel = saved.fires[id] ?? 0;
      return true;
    },
    teachFishing, cast, reel, cancelFishing, fireStatus, light, cook, update,
  };
}
