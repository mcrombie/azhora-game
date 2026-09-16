/** Food changes health only; it does not reset combat or grant protection. */
const FOODS = Object.freeze({
  pawpaw: Object.freeze({ healing: 25, missing: 'You have no pawpaw fruit. Gather some in the forest.' }),
  'cooked-fish': Object.freeze({ healing: 40, missing: 'You have no cooked fish. Cook a fresh catch at a lit firepit.' }),
});

export function createConsumables({ inventory, combat, onEvent = () => {} }) {
  function status(id) {
    if (!Object.hasOwn(FOODS, id)) return null;
    const food = FOODS[id];
    const player = combat.state.player;
    const owned = inventory.has(id);
    let reason = '';
    if (!owned) reason = food.missing;
    else if (combat.state.phase === 'defeated' || player.action === 'dead' || player.hp <= 0)
      reason = 'You cannot eat while defeated. Retry to return to the road.';
    else if (!Number.isFinite(player.hp) || !Number.isFinite(player.maxHp) || player.maxHp <= 0)
      reason = 'You cannot eat right now. No food will be used.';
    else if (player.action !== 'idle') reason = player.action === 'hurt'
      ? 'Close the satchel and recover from the hit before eating.'
      : 'Close the satchel and finish your swing or dodge before eating.';
    else if (player.hp >= player.maxHp) reason = 'Health is full. No food will be used.';
    return {
      owned, canUse: !reason, healing: food.healing,
      health: player.hp, maxHealth: player.maxHp, reason,
    };
  }

  function consume(id) {
    const current = status(id);
    if (!current?.canUse) return {
      ok: false, healed: 0,
      reason: current?.reason ?? 'This item cannot be eaten.',
    };
    // The checks, removal, and health change are synchronous. A failed removal
    // cannot grant free health; a refused heal returns the untouched portion.
    if (!inventory.remove(id, 1)) return {
      ok: false, healed: 0, reason: 'No food was used. Select your food and try again.',
    };
    const healed = combat.heal(current.healing);
    if (!Number.isFinite(healed) || healed <= 0) {
      inventory.add(id, 1);
      return { ok: false, healed: 0, reason: 'You cannot eat right now. No food was used.' };
    }
    onEvent({ type: 'consume', id, healed });
    return { ok: true, healed, reason: '' };
  }

  return { status, consume };
}
