/**
 * Weapons lying in the world to be found (docs/combat-brief.md: gear is bought, found and given).
 * This is the **found** half, and its first case is the one that already exists: a companion's
 * weapon, lying where he fell, named for him.
 *
 * **It owns nothing.** A weapon lying on the ground is already a fact somebody else is keeping -
 * a dead man's is in `src/companions.js`, with where he fell and whether it has been taken, in
 * that module's own save. Copying it here would make two records of one fact and two chances to
 * disagree, so this is a presenter: sources hand it what is lying and it hands back what is in
 * reach. A barrow, a gift, a battlefield can each be a source later without any of them learning
 * about the others.
 *
 * A source is `{ lying(): [{ id, weapon, name, x, z }], take(id): { ok } }`.
 *
 * Pure: no DOM, no three, no world.
 */
const freeze = Object.freeze;

/** How close the traveler must be to pick one up, in metres. A weapon is not a fruit. */
export const REACH = 2.2;

export function createFoundWeapons({ sources = [] } = {}) {
  const all = () => sources.flatMap(source => {
    const lying = source?.lying?.() ?? [];
    return Array.isArray(lying) ? lying.filter(one => one && one.id && one.weapon && Number.isFinite(one.x) && Number.isFinite(one.z)) : [];
  });

  /** Everything lying anywhere, in whatever order the sources give it. */
  const lying = () => all().map(one => freeze({ ...one }));

  /**
   * The nearest one within reach, or null. Ties are broken by distance and then by id, so two
   * weapons on one spot are always offered in the same order and the second is never unreachable.
   */
  function nearest(x, z, reach = REACH) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    let best = null, bestAt = Infinity;
    for (const one of all()) {
      const away = Math.hypot(one.x - x, one.z - z);
      if (away > reach) continue;
      if (away < bestAt || (away === bestAt && best && one.id < best.id)) { best = one; bestAt = away; }
    }
    return best ? freeze({ ...best, away: bestAt }) : null;
  }

  /** Picked up. The source that owns it is the one that stops offering it. */
  function take(id) {
    for (const source of sources) {
      const mine = (source?.lying?.() ?? []).some(one => one?.id === id);
      if (!mine) continue;
      const taken = source.take?.(id);
      return taken?.ok ? { ok: true, ...taken } : { ok: false };
    }
    return { ok: false };
  }

  return { lying, nearest, take, get count() { return all().length; } };
}

/**
 * The first source: a companion's weapon, lying where he fell. `companions` is
 * `createCompanions()` from src/companions.js, which already keeps all of it.
 */
export const fallenCompanions = companions => ({
  lying: () => companions?.weaponsOnTheGround?.() ?? [],
  take: id => companions?.takeWeapon?.(id) ?? { ok: false },
});
