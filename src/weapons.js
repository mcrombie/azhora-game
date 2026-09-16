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
});

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
  return true;
}

export function createWeapons({ inventory, onEvent = () => {} }) {
  let equipped = 'simple-sword';
  const condition = { 'simple-sword': 24, 'forest-stick': 6 };

  function status(id) {
    const type = WEAPON_TYPES[id];
    if (!type) return null;
    const owned = inventory.has(id);
    // The last stick was consumed on breaking. A later pickup is a fresh stick.
    if (id === 'forest-stick' && owned && condition[id] === 0) condition[id] = type.maxDurability;
    return {
      id, name: type.name, owned, equipped: equipped === id,
      durability: owned ? condition[id] : 0, maxDurability: type.maxDurability,
      usable: owned && condition[id] > 0,
    };
  }

  function profile() {
    const type = WEAPON_TYPES[equipped];
    return { ...status(equipped), damage: [...type.damage], reachMultiplier: type.reachMultiplier };
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
    return true;
  }

  return {
    profile, equip, contact, repair, status, spendSticks, restore,
    get equippedId() { return equipped; },
    snapshot: () => ({ version: 1, equippedId: equipped, sword: status('simple-sword'), stick: status('forest-stick') }),
  };
}
