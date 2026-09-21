/** Equipment condition is separate from combat checkpoints and quest progress. */
export const WEAPON_TYPES = Object.freeze({
  'simple-sword': Object.freeze({
    name: 'Simple sword', damage: Object.freeze([24, 26, 34]),
    reachMultiplier: 1, maxDurability: 24, wornAt: 6,
  }),
  'forest-stick': Object.freeze({
    name: 'Forest stick', damage: Object.freeze([14, 16, 20]),
    reachMultiplier: .8, maxDurability: 6, wornAt: 2,
  }),
  // Weapons the hired swords carry and will trade for. Same three-swing rhythm; different weight and reach.
  'iron-mace': Object.freeze({ name: 'Iron mace', damage: Object.freeze([30, 32, 44]), reachMultiplier: 1, maxDurability: 30, wornAt: 8 }),
  'long-dagger': Object.freeze({ name: 'Long dagger', damage: Object.freeze([16, 18, 24]), reachMultiplier: .72, maxDurability: 28, wornAt: 6 }),
  'bearded-axe': Object.freeze({ name: 'Bearded axe', damage: Object.freeze([28, 30, 42]), reachMultiplier: 1.05, maxDurability: 20, wornAt: 5 }),
  greatsword: Object.freeze({ name: 'Greatsword', damage: Object.freeze([34, 36, 50]), reachMultiplier: 1.3, maxDurability: 26, wornAt: 6 }),
});

/** Weapons that change hands in a trade; sticks and the ranged or planted kits do not. */
export const TRADEABLE_WEAPONS = Object.freeze(['simple-sword', 'iron-mace', 'long-dagger', 'bearded-axe', 'greatsword']);
const EXTRA_WEAPONS = Object.freeze(Object.keys(WEAPON_TYPES).filter(id => id !== 'simple-sword' && id !== 'forest-stick'));

/** Validate against the inventory being restored; never manufacture equipment. */
export function validateWeaponSnapshot(data, inventory) {
  if (!data || data.version !== 1 || !Object.hasOwn(WEAPON_TYPES, data.equippedId)
    || typeof inventory?.has !== 'function') return false;
  for (const [key, id] of [['sword', 'simple-sword'], ['stick', 'forest-stick']]) {
    const item = data[key], type = WEAPON_TYPES[id];
    if (!item || item.id !== id || item.maxDurability !== type.maxDurability
      || typeof item.owned !== 'boolean' || item.owned !== inventory.has(id)
      || typeof item.equipped !== 'boolean' || item.equipped !== (data.equippedId === id)
      || !Number.isInteger(item.durability) || item.durability < 0 || item.durability > type.maxDurability
      || (!item.owned && item.durability !== 0)
      || (id === 'forest-stick' && item.owned && item.durability === 0)
      || typeof item.usable !== 'boolean' || item.usable !== (item.owned && item.durability > 0)) return false;
  }
  // Any other weapon carried must be listed with its condition, and nothing listed may be uncarried.
  const extra = data.extra ?? {};
  if (typeof extra !== 'object' || Array.isArray(extra)) return false;
  for (const [id, durability] of Object.entries(extra)) {
    const type = WEAPON_TYPES[id];
    if (!type || !EXTRA_WEAPONS.includes(id) || !Number.isInteger(durability) || durability < 0 || durability > type.maxDurability || !inventory.has(id)) return false;
  }
  if (EXTRA_WEAPONS.some(id => inventory.has(id) && !Object.hasOwn(extra, id))) return false;
  return true;
}

/**
 * Temporary, for testing and development: no weapon wears, so none breaks. Condition, the
 * satchel's readout and the repair benches all still work; set this back to true to restore wear.
 */
export const WEAPON_WEAR = false;

/**
 * `damageScale(weaponId)` is how hard the traveler hits with that weapon, given his skill in its
 * family. The default is the game as it was: one, for everybody, forever.
 */
export function createWeapons({ inventory, onEvent = () => {}, wear = WEAPON_WEAR, damageScale = () => 1 }) {
  let equipped = 'simple-sword', wears = wear;
  const condition = Object.fromEntries(Object.entries(WEAPON_TYPES).map(([id, type]) => [id, type.maxDurability]));

  function status(id) {
    const type = WEAPON_TYPES[id];
    if (!type) return null;
    const owned = inventory.has(id);
    // The last stick was consumed on breaking. A later pickup is a fresh stick.
    if (id === 'forest-stick' && owned && condition[id] === 0) condition[id] = type.maxDurability;
    return {
      id, name: type.name, owned, equipped: equipped === id,
      durability: owned ? condition[id] : 0, maxDurability: type.maxDurability,
      // The condition at which this weapon counts as worn. Each kind says its own, and the
      // HUD used to guess it as a quarter of the maximum, which is a different number for
      // the long dagger and the greatsword: the bar went amber a hit before the warning.
      wornAt: type.wornAt, worn: owned && condition[id] > 0 && condition[id] <= type.wornAt,
      usable: owned && condition[id] > 0,
    };
  }

  /**
   * What the equipped weapon does. `damage` is the weapon's own three-swing rhythm multiplied by
   * whatever the traveler's skill in that family is worth (src/combat-skills.js): at level 1 the
   * multiplier is exactly 1, so this is the same three numbers it has always been.
   */
  function profile() {
    const type = WEAPON_TYPES[equipped];
    const scale = damageScale(equipped);
    return { ...status(equipped), damage: type.damage.map(hit => hit * scale), reachMultiplier: type.reachMultiplier };
  }

  function equip(id) {
    if (!status(id)?.usable) return false;
    equipped = id;
    return true;
  }

  /** Charge the weapon that began the swing, even if equipment changed meanwhile. */
  function contact(id = equipped) {
    const before = status(id);
    if (!before?.usable) return null;
    const type = WEAPON_TYPES[id];
    if (!wears) return { type: 'weapon-used', id, name: type.name, durability: condition[id], maxDurability: type.maxDurability };
    condition[id]--;
    let eventType = 'weapon-used';
    if (condition[id] === 0) eventType = 'weapon-broken';
    else if (before.durability > type.wornAt && condition[id] <= type.wornAt) eventType = 'weapon-worn';
    const event = {
      type: eventType, id, name: type.name, durability: condition[id],
      maxDurability: type.maxDurability,
    };
    if (id === 'forest-stick' && condition[id] === 0) {
      inventory.remove(id, 1);
      event.remaining = inventory.count(id);
      // Keep sticks selected; another carried stick becomes the active one.
      // Switching to the sword is always the player's choice.
      if (event.remaining > 0) condition[id] = type.maxDurability;
    }
    if (eventType !== 'weapon-used') onEvent(event);
    return event;
  }

  function repair() {
    let repaired = false;
    for (const [id, type] of Object.entries(WEAPON_TYPES)) {
      if (inventory.has(id) && condition[id] < type.maxDurability) {
        condition[id] = type.maxDurability;
        repaired = true;
      }
    }
    return repaired;
  }

  /** Use spare branches first, retaining the worn active stick when possible. */
  function spendSticks(count) {
    if (!Number.isSafeInteger(count) || count <= 0 || inventory.count('forest-stick') < count) return false;
    if (!inventory.remove('forest-stick', count)) return false;
    // With no stick left, a later pickup must not inherit the old one's wear.
    if (!inventory.has('forest-stick')) condition['forest-stick'] = 0;
    return true;
  }

  function restore(data) {
    if (!validateWeaponSnapshot(data, inventory)) return false;
    equipped = data.equippedId;
    condition['simple-sword'] = data.sword.durability;
    condition['forest-stick'] = data.stick.durability;
    for (const id of EXTRA_WEAPONS) condition[id] = data.extra?.[id] ?? WEAPON_TYPES[id].maxDurability;
    return true;
  }

  /** Set a carried weapon's condition, as when it changes hands. */
  function setCondition(id, durability) {
    const type = WEAPON_TYPES[id];
    if (!type || !Number.isInteger(durability) || durability < 0 || durability > type.maxDurability) return false;
    condition[id] = durability;
    return true;
  }

  /** Hand a weapon away: its condition goes with it, and the empty slot reads as nothing. */
  function take(id) {
    const before = status(id);
    if (!before?.owned) return null;
    condition[id] = 0;
    return before.durability;
  }

  return {
    profile, equip, contact, repair, status, spendSticks, restore, setCondition, take,
    /** Smokes that check wear itself turn it back on. */
    setWear(on) { wears = Boolean(on); },
    get wears() { return wears; },
    get equippedId() { return equipped; },
    snapshot: () => ({ version: 1, equippedId: equipped, sword: status('simple-sword'), stick: status('forest-stick'),
      extra: Object.fromEntries(EXTRA_WEAPONS.filter(id => inventory.has(id)).map(id => [id, condition[id]])) }),
  };
}
