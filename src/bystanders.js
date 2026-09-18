/**
 * When a fight breaks out beside people who live there, they do not stand about.
 * Whoever is caught inside it either takes up what they have and fights, or
 * freezes and then runs for cover. The enemy goes for whoever is nearest, and a
 * villager the traveler does not reach in time can die, for good. Villagers the
 * story still needs are knocked down and left breathing, never killed.
 *
 * Pure: `bystandersFor` turns the villagers standing near an encounter into ally
 * specs for `combat.startEncounter` (src/combat.js: the `bystander` and `villager`
 * kinds); `createFallen` remembers who died.
 */

/** A villager standing this near a fight's centre is caught in it. */
export const CAUGHT = 20;

/** Who fights rather than runs, and with what. Tamsin keeps a felling axe at her belt. */
export const FIGHTERS = Object.freeze({ 'forest-woodcutter': 'bearded-axe' });

/**
 * Who is knocked down but never killed: people a quest, a skill or the main story
 * still needs: the story's own people, the specialists who teach a skill, and those
 * who trade or send the traveler on an errand. Everyone else caught in a fight can die.
 */
export const SPARED = Object.freeze(['forest-woodcutter', 'harbormaster', 'warden', 'acorn-cook', 'doomsayer', 'fisher', 'pond-fisher', 'tide-carter', 'tide-boy', 'rena-lorn',
  'mycologist', 'botanist', 'geologist', 'bird-watcher', 'pipe-smoker', 'jimson-toft', 'peddler']);

/**
 * The ground a fight is fought on, as src/combat.js checks it: where an ally may
 * start, and where an ally may step. Their overlap, inset a little, is where a
 * caught villager can be.
 */
export function fightGround(encounter) {
  const axis = encounter.retreatAxis === 'x' ? 'x' : 'z', across = axis === 'x' ? 'z' : 'x', c = encounter.center;
  const line = encounter.retreatLine ?? encounter.retreatZ;
  // Allies step within x ±12 and z -21..+18 of the centre, whatever the axis.
  const step = { minX: c.x - 12, maxX: c.x + 12, minZ: c.z - 21, maxZ: c.z + 18 };
  const start = { [`min${axis.toUpperCase()}`]: c[axis] - 21, [`max${axis.toUpperCase()}`]: Math.min(c[axis] + 18, line - .01),
    [`min${across.toUpperCase()}`]: c[across] - 12, [`max${across.toUpperCase()}`]: c[across] + 12 };
  const inset = .6;
  return {
    start: { minX: Math.max(step.minX, start.minX) + inset, maxX: Math.min(step.maxX, start.maxX) - inset, minZ: Math.max(step.minZ, start.minZ) + inset, maxZ: Math.min(step.maxZ, start.maxZ) - inset },
    step: { minX: step.minX + 1, maxX: step.maxX - 1, minZ: step.minZ + 1, maxZ: step.maxZ - 1 },
  };
}

const clampTo = (box, p) => ({ x: Math.min(box.maxX, Math.max(box.minX, p.x)), z: Math.min(box.maxZ, Math.max(box.minZ, p.z)) });

/**
 * Where a villager runs: the edge of the fight's ground that lies most directly
 * away from the enemy, and that the villager could stand on.
 */
export function refugeFor(person, enemies, encounter, clear = () => true) {
  const { step } = fightGround(encounter);
  const g = enemies.reduce((sum, e) => ({ x: sum.x + e.x / enemies.length, z: sum.z + e.z / enemies.length }), { x: 0, z: 0 });
  const away = { x: person.x - g.x, z: person.z - g.z }, reach = Math.hypot(away.x, away.z) || 1;
  const mx = (step.minX + step.maxX) / 2, mz = (step.minZ + step.maxZ) / 2;
  const candidates = [
    { x: step.minX, z: step.minZ }, { x: mx, z: step.minZ }, { x: step.maxX, z: step.minZ },
    { x: step.minX, z: mz }, { x: step.maxX, z: mz },
    { x: step.minX, z: step.maxZ }, { x: mx, z: step.maxZ }, { x: step.maxX, z: step.maxZ },
  ].filter(clear);
  let best = null, score = -Infinity;
  for (const c of candidates) {
    const dx = c.x - person.x, dz = c.z - person.z, d = Math.hypot(dx, dz) || 1;
    const s = (dx * away.x + dz * away.z) / (d * reach) - d / 60;
    if (s > score) { score = s; best = c; }
  }
  return best;
}

/**
 * Ally specs for the villagers caught in `encounter`. `people` are the villagers
 * the game has near the fight: { id, name, x, z, model }. `clear(point)` says
 * whether a point is open ground.
 */
export function bystandersFor(encounter, people, { fallen = [], clear = () => true, limit = 6 } = {}) {
  const { start } = fightGround(encounter);
  const c = encounter.center;
  return people
    .filter(person => !fallen.includes(person.id) && Math.hypot(person.x - c.x, person.z - c.z) <= CAUGHT)
    .sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z))
    .slice(0, limit)
    .map(person => {
      const at = clampTo(start, person), fighter = Object.hasOwn(FIGHTERS, person.id);
      const spec = { id: person.id, name: person.name, kind: fighter ? 'villager' : 'bystander', x: at.x, z: at.z,
        spared: SPARED.includes(person.id), armed: fighter };
      if (person.model || fighter) spec.model = { ...person.model, ...(fighter ? { wields: FIGHTERS[person.id] } : {}) };
      if (!fighter) {
        const refuge = refugeFor(at, encounter.enemies, encounter, clear);
        if (refuge) spec.refuge = refuge;
      }
      return spec;
    })
    .filter(spec => spec.kind === 'villager' || spec.refuge);
}

/** Who has died, kept with the road save. */
export function validateFallenSnapshot(data) {
  if (data === undefined) return true;
  return !!data && data.version === 1 && Array.isArray(data.ids) && data.ids.length <= 64
    && data.ids.every(id => typeof id === 'string' && /^[a-z0-9-]{1,64}$/.test(id) && !SPARED.includes(id))
    && new Set(data.ids).size === data.ids.length;
}

export function createFallen() {
  const ids = new Set();
  return {
    fall(id) { if (SPARED.includes(id) || ids.has(id)) return false; ids.add(id); return true; },
    has: id => ids.has(id),
    get ids() { return [...ids]; },
    snapshot: () => ({ version: 1, ids: [...ids] }),
    restore(data) { if (!validateFallenSnapshot(data) || data === undefined) return false; ids.clear(); for (const id of data.ids) ids.add(id); return true; },
  };
}
