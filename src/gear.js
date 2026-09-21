/**
 * What a weapon is made of, and what the traveler is wearing (docs/combat-brief.md, phase 3).
 *
 * Two ideas, and they are the same idea from both ends. A **tier** is the material: it multiplies
 * what a weapon does and what a piece of armour turns, from ×1 at tier 0 to ×1.9 at tier 6.
 * **Armour** is three pieces - body, head, and the shield hand - in three weights, and the heavier
 * it is the more it turns and the more it costs you in movement and in water.
 *
 * **Tier 0 with nothing on is today's game, to the digit.** Every multiplier below is 1 at tier 0,
 * and a traveler wearing nothing turns nothing, so the fights already built are untouched.
 *
 * **Tiers 5 and 6 have no names.** The brief asks for them to come from Azhora's own registers and
 * the user has not answered, so they are slots: nothing sells them, nothing drops them, and
 * nothing mentions them. The arithmetic is here so that naming them later is a naming and not a
 * build.
 *
 * Pure: no DOM, no three, no world.
 */
const freeze = Object.freeze;

export const GEAR_VERSION = 1;

/**
 * The seven materials. `sold` is the country level a smith will sell it at - the brief's own
 * table - and `null` means nobody sells it at any price. `name` null is a tier that has not been
 * named yet and must not be shown to anybody.
 */
export const TIERS = freeze([
  freeze({ tier: 0, name: 'wood and bone', sold: 0, from: 'anywhere; what you land with' }),
  freeze({ tier: 1, name: 'bog iron', sold: 1, from: 'village smiths in Drent and its like' }),
  freeze({ tier: 2, name: 'wrought iron', sold: 3, from: 'level 2-3 country' }),
  freeze({ tier: 3, name: 'steel', sold: 5, from: 'level 4-5 country; Ambroni issue' }),
  freeze({ tier: 4, name: 'fine steel', sold: 7, from: 'level 6-7 country; officers, and gifts from a side you have served' }),
  // Named from Azhora's own registers when the user answers. Until then: slots.
  freeze({ tier: 5, name: null, sold: null, from: 'found and given only' }),
  freeze({ tier: 6, name: null, sold: null, from: 'never sold: the barrows, the sage, the hidden island' }),
]);
/** The highest tier that has a name, and so the highest anything may hand the player today. */
export const NAMED_TIERS = TIERS.filter(entry => entry.name).length - 1;
export const TOP_TIER = TIERS.length - 1;

/** ×1 at tier 0, ×1.9 at tier 6, evenly. One line for weapons and armour both. */
export const TIER_TOP = 1.9;
const clampTier = tier => Math.max(0, Math.min(TOP_TIER, Math.floor(Number(tier) || 0)));
export const tierScale = tier => 1 + (TIER_TOP - 1) * (clampTier(tier) / TOP_TIER);
export const tiernamed = tier => TIERS[clampTier(tier)].name;
/** What a smith in a country of this level will sell, or -1 for nowhere that sells anything. */
export function tierSoldAt(countryLevel) {
  const level = Math.max(0, Math.floor(Number(countryLevel) || 0));
  let best = -1;
  for (const entry of TIERS) if (entry.sold !== null && entry.sold <= level) best = Math.max(best, entry.tier);
  return best;
}

/**
 * The three weights. `turns` is the share of a blow the piece takes at tier 0, before the material
 * multiplies it; `dodge` is what it does to how far a dodge travels; `wind` is what it costs in
 * the water. **Armour drowns people**: the swim to Peblos is a reason to take it off, and that is
 * a decision the player should feel.
 */
export const WEIGHTS = freeze({
  light: freeze({ id: 'light', name: 'Light', turns: .06, dodge: 1, wind: 1, fromTier: 0 }),
  medium: freeze({ id: 'medium', name: 'Medium', turns: .10, dodge: .9, wind: 1, fromTier: 1 }),
  heavy: freeze({ id: 'heavy', name: 'Heavy', turns: .14, dodge: .75, wind: 2, fromTier: 3 }),
});
export const WEIGHT_IDS = freeze(Object.keys(WEIGHTS));
/** The three places a piece can go. Nothing else is armour. */
export const SLOTS = freeze(['body', 'head', 'hand']);
/** Armour never turns a whole blow. At its best - heavy, tier 6, all three - it turns half. */
export const MOST_TURNED = .5;

const pieceOf = worn => (worn && WEIGHTS[worn.weight] ? worn : null);

/**
 * What the traveler is wearing, as one set of numbers. `worn` is `{ body, head, hand }`, each
 * `{ weight, tier }` or nothing at all.
 */
export function armourOf(worn = {}) {
  let turns = 0, dodge = 1, wind = 1;
  for (const slot of SLOTS) {
    const piece = pieceOf(worn[slot]);
    if (!piece) continue;
    const weight = WEIGHTS[piece.weight];
    turns += weight.turns * tierScale(piece.tier);
    dodge = Math.min(dodge, weight.dodge);
    wind = Math.max(wind, weight.wind);
  }
  return freeze({ turns: Math.min(MOST_TURNED, turns), dodge, wind });
}

/** What a blow of `damage` actually costs a traveler wearing this. Never nothing. */
export const throughArmour = (damage, worn = {}) => Math.max(0, damage) * (1 - armourOf(worn).turns);

/** Whether a piece is one the game has: a real slot, a real weight, a real tier. */
export function validPiece(piece, { allowUnnamed = false } = {}) {
  if (!piece || typeof piece !== 'object' || Array.isArray(piece)) return false;
  if (!WEIGHTS[piece.weight]) return false;
  if (!Number.isInteger(piece.tier) || piece.tier < 0 || piece.tier > TOP_TIER) return false;
  if (piece.tier < WEIGHTS[piece.weight].fromTier) return false;
  return allowUnnamed || TIERS[piece.tier].name !== null;
}

export function validateGearSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== GEAR_VERSION) return false;
  if (!data.worn || typeof data.worn !== 'object' || Array.isArray(data.worn)) return false;
  for (const [slot, piece] of Object.entries(data.worn)) {
    if (!SLOTS.includes(slot)) return false;
    // A save may carry an unnamed tier: it is the naming that is missing, not the thing.
    if (!validPiece(piece, { allowUnnamed: true })) return false;
  }
  return true;
}

/**
 * What a smith sells, and for how much. Prices rise about fourfold a tier, which is what gives
 * money something to be for; a smith sells the tier his country's level allows and nothing above
 * it, so the best iron in Drent is bog iron and always will be.
 *
 * **Nothing sells tier 5 or 6.** They have no names yet and `tierSoldAt` never reaches them.
 */
export const PRICES = freeze({ body: 40, head: 18, hand: 26, perTier: 4,
  // A coat of plate is not a leather cap with a better tier on it: the weight is paid for too.
  byWeight: freeze({ light: 1, medium: 1.8, heavy: 3 }) });
export const priceOf = (slot, tier, weight = 'light') =>
  Math.round((PRICES[slot] ?? PRICES.body) * (PRICES.byWeight[weight] ?? 1) * PRICES.perTier ** clampTier(tier));

/**
 * Everything that can be made of one material, dearest last. This is the unit a board is built
 * from: a smith's board is one of these, and a capital's armourer sells two (`SELLER_TIERS`,
 * `src/smith.js`). An unnamed tier makes nothing, so 5 and 6 stay empty however they are asked for.
 */
export function stockOfTier(tier) {
  const top = clampTier(tier);
  if (TIERS[top].name === null) return freeze([]);
  const stock = [];
  for (const slot of SLOTS) {
    for (const weight of WEIGHT_IDS) {
      const piece = { weight, tier: top };
      if (!validPiece(piece)) continue;
      stock.push(freeze({ slot, weight, tier: top, name: `${WEIGHTS[weight].name} ${tiernamed(top)}`,
        price: priceOf(slot, top, weight), ...armourOf({ [slot]: piece }) }));
    }
  }
  return freeze(stock.sort((a, b) => a.price - b.price || a.slot.localeCompare(b.slot)));
}

/** The list a smith in a country of this level puts in front of you, dearest last. */
export function smithStock(countryLevel) {
  const top = tierSoldAt(countryLevel);
  return top < 0 ? freeze([]) : stockOfTier(top);
}

/** What the traveler has on, and what it is worth. */
export function createGear({ onEvent = () => {} } = {}) {
  const worn = {};

  function wear(slot, piece) {
    if (!SLOTS.includes(slot) || !validPiece(piece)) return { ok: false };
    worn[slot] = freeze({ weight: piece.weight, tier: piece.tier });
    onEvent({ type: 'worn', slot, ...worn[slot] });
    return { ok: true, slot, ...armourOf(worn) };
  }
  function takeOff(slot) {
    if (!worn[slot]) return { ok: false };
    delete worn[slot];
    onEvent({ type: 'taken-off', slot });
    return { ok: true, slot, ...armourOf(worn) };
  }

  const view = () => freeze({ worn: freeze({ ...worn }), ...armourOf(worn) });
  const snapshot = () => ({ version: GEAR_VERSION, worn: { ...worn } });
  function restore(data) {
    for (const slot of SLOTS) delete worn[slot];
    if (!validateGearSnapshot(data, { allowMissing: false })) return false;
    for (const [slot, piece] of Object.entries(data.worn)) worn[slot] = freeze({ ...piece });
    return true;
  }

  return { wear, takeOff, view, snapshot, restore,
    get turns() { return armourOf(worn).turns; },
    get dodgeScale() { return armourOf(worn).dodge; },
    get windScale() { return armourOf(worn).wind; },
    wearing: slot => worn[slot] ?? null };
}
