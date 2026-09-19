/**
 * The traveler's skills: things learned from people along the road that grow with
 * practice. Each skill has experience and a level read from a table of thresholds.
 *
 * Two kinds. The knowing skills (birding, botany, fishing and the rest) grow by
 * finding things for the first time, through ten levels. The working skills are
 * done the RuneScape way: you do the thing over and over, experience comes with
 * every log, and the level climbs RuneScape's own table to 99, each level a
 * little further off than the last, with what each level opens written in the
 * skill's guide. Woodcutting is the first of them. Pure: no DOM, no three.
 */
export const SKILLS_VERSION = 1;
/** RuneScape's cap on experience in one skill. */
export const MAX_XP = 200_000_000;
/**
 * RuneScape's experience table, levels 1 to 99: level L wants
 * floor(¼ × Σ over l < L of floor(l + 300 × 2^(l/7))). Level 2 is 83, level 99
 * is 13,034,431, and level 92 is half of 99.
 */
export const RUNESCAPE_TABLE = Object.freeze((() => {
  const table = [0];
  let points = 0;
  for (let l = 1; l < 99; l++) { points += Math.floor(l + 300 * 2 ** (l / 7)); table.push(Math.floor(points / 4)); }
  return table;
})());
const unlock = (level, text) => Object.freeze({ level, text });

export const SKILLS = Object.freeze({
  birding: Object.freeze({
    id: 'birding', name: 'Birding',
    blurb: 'Finding birds, keeping your distance, and looking at them properly. Every kind of bird you see for the first time teaches you something.',
    teacher: 'Lakota, the birder of Tidehaven',
    // Experience needed for levels 1 to 10. Drent's five birds together are worth 90: level 4.
    thresholds: Object.freeze([0, 20, 50, 90, 140, 200, 270, 350, 440, 540]),
  }),
  fishing: Object.freeze({
    id: 'fishing', name: 'Fishing',
    blurb: 'Reading water, waiting out a float, and knowing what you have landed. Every kind of fish you land for the first time teaches you something.',
    teacher: 'Bran at Willowmere Pond, and Hollis at the Caloss crossing',
    // The ten fish of Drent, Luscia and Pueth together are worth 200: level 6.
    thresholds: Object.freeze([0, 20, 50, 90, 140, 200, 270, 350, 440, 540]),
  }),
  botany: Object.freeze({
    id: 'botany', name: 'Botany',
    blurb: 'Everything that grows, from the plantain on the path to the oldest oak in the wood: what it is, where it stands, and what it is for. Every plant and tree you name for the first time teaches you something.',
    teacher: 'Nell Harrow, on the outskirts of Tidehaven',
    // Drent's plants and trees together are worth more than the table holds.
    thresholds: Object.freeze([0, 20, 50, 90, 140, 200, 270, 350, 440, 540]),
  }),
  geology: Object.freeze({
    id: 'geology', name: 'Geology',
    blurb: 'Picking a stone up, weighing it, scratching it and asking where it is lying. Every kind of stone you name for the first time teaches you something about the country it came from.',
    teacher: 'Silas Garrow, digging marl under the Weatherhead',
    // The eleven finds of Drent's coast together are worth 210: level 6.
    thresholds: Object.freeze([0, 20, 50, 90, 140, 200, 270, 350, 440, 540]),
  }),
  mycology: Object.freeze({
    id: 'mycology', name: 'Mycology',
    blurb: 'Wood or ground, gills or folds, and what it smells of. Every kind of mushroom you name for the first time teaches you something — including the two you must never eat.',
    teacher: 'Odger Pell, at the edge of the Greenway outside Tidehaven',
    // The eleven mushrooms of Drent's woods together are worth 225: level 6.
    thresholds: Object.freeze([0, 20, 50, 90, 140, 200, 270, 350, 440, 540]),
  }),
  archaeology: Object.freeze({
    id: 'archaeology', name: 'Archaeology',
    blurb: 'Reading what people and older things left in the ground, where it lies, and leaving it there. Old towns and older bones: every find written up for the first time teaches you something.',
    teacher: 'Lakota, the birder of Tidehaven, who digs as well as he watches',
    // Rena's seven finds are worth 125, and the report to Lakota 40 more: level 4.
    thresholds: Object.freeze([0, 20, 50, 90, 140, 200, 270, 350, 440, 540]),
  }),
  wine: Object.freeze({
    id: 'wine', name: 'Wine',
    blurb: 'Looking, smelling and tasting properly instead of drinking. Every wine tasted properly for the first time teaches you something about the grape and the ground.',
    teacher: 'Lakota in Tidehaven, Livia Seravo at Vaervelm Caelazh (Paradise Springs) in West Suval, and Juan at Tharganhom, the Wine Attic in Solis',
    // The eight wines of Vaervelm Caelazh are worth 120, and the visit 25 more: level 5.
    thresholds: Object.freeze([0, 20, 50, 90, 140, 200, 270, 350, 440, 540]),
  }),
  cooking: Object.freeze({
    id: 'cooking', name: 'Cooking',
    blurb: 'What you can make at a lit fire, and why it works. Every dish made for the first time teaches you something.',
    teacher: 'Lakota in Tidehaven, whose hot chocolate is the first recipe',
    // Hot chocolate is worth 20 and the fish 10: level 2 with both.
    thresholds: Object.freeze([0, 20, 50, 90, 140, 200, 270, 350, 440, 540]),
  }),
  woodcutting: Object.freeze({
    id: 'woodcutting', name: 'Woodcutting', kind: 'working',
    blurb: 'Choosing the tree, reading the grain, and swinging until it gives. Every log you cut is experience, and every tree and every axe has the level it wants from you.',
    teacher: 'Bowden Koop, King of the Koopwood, on the edge of the wood north-west of Tidehaven',
    thresholds: RUNESCAPE_TABLE,
    // What each level opens (src/woodcutting.js holds the trees and axes themselves; the test keeps the two in step).
    unlocks: Object.freeze([unlock(1, 'Loblolly pine · 25 experience a log'), unlock(1, 'Bronze hatchet and iron axe'), unlock(6, 'Steel axe'),
      unlock(15, 'White oak · 38 experience a log'), unlock(30, 'Black willow · 68 experience a log'), unlock(30, 'The King’s axe, from Bowden'),
      unlock(45, 'Red maple · 100 experience a log'), unlock(60, 'Black walnut · 175 experience a log'), unlock(99, 'Bowden stops calling you “worm”')]),
  }),
});

export const SKILL_IDS = Object.freeze(Object.keys(SKILLS));

/** Skills that have been renamed: a save from before the rename keeps its experience. */
export const SKILL_ALIASES = Object.freeze({ herbology: 'botany' });
const canonical = id => SKILL_ALIASES[id] ?? id;

/** Level, and progress toward the next one, for `xp` experience in skill `id`. `top` is the highest level the skill has. */
export function skillLevel(id, xp) {
  const table = SKILLS[id]?.thresholds;
  if (!table) return null;
  const points = Math.min(MAX_XP, Math.max(0, Math.floor(Number(xp) || 0)));
  let level = 1;
  while (level < table.length && points >= table[level]) level++;
  const floor = table[level - 1], next = level < table.length ? table[level] : null;
  return { level, top: table.length, xp: points, floor, next, max: next === null, progress: next === null ? 1 : (points - floor) / (next - floor) };
}
/** What a skill's level `level` has opened, and what is still to come. */
export function skillGuide(id, level) {
  return (SKILLS[id]?.unlocks ?? []).map(entry => ({ ...entry, open: level >= entry.level }));
}
/** RuneScape's words for a new level. */
export const levelUpLine = (id, level) => `Congratulations, you’ve just advanced a ${SKILLS[id]?.name ?? id} level. You are now level ${level}.`;

export function validateSkillsSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== SKILLS_VERSION) return false;
  if (!data.skills || typeof data.skills !== 'object' || Array.isArray(data.skills)) return false;
  return Object.entries(data.skills).every(([id, entry]) => Object.hasOwn(SKILLS, canonical(id)) && entry && typeof entry === 'object'
    && Number.isInteger(entry.xp) && entry.xp >= 0 && entry.xp <= MAX_XP);
}

export function createSkills({ onEvent = () => {} } = {}) {
  const learned = new Map();

  function learn(id) {
    if (!Object.hasOwn(SKILLS, id)) return { ok: false, reason: 'There is no such skill.' };
    if (learned.has(id)) return { ok: true, first: false, ...skillLevel(id, learned.get(id)) };
    learned.set(id, 0);
    onEvent({ type: 'skill-learned', id });
    return { ok: true, first: true, ...skillLevel(id, 0) };
  }

  /** Add experience to a learned skill. Reports whether a new level was reached. */
  function gain(id, amount) {
    if (!learned.has(id)) return { ok: false, reason: 'That skill has not been learned.' };
    const points = Math.max(0, Math.floor(Number(amount) || 0));
    const before = skillLevel(id, learned.get(id)), after = skillLevel(id, Math.min(MAX_XP, before.xp + points));
    learned.set(id, after.xp);
    const levelled = after.level > before.level;
    if (points) onEvent({ type: 'skill-gain', id, gained: points, level: after.level, levelled, before: before.level });
    return { ok: true, gained: points, levelled, ...after };
  }

  const known = id => learned.has(id);
  const level = id => learned.has(id) ? skillLevel(id, learned.get(id)).level : 0;

  /** Every skill, learned or not, for the journal, with its guide. */
  function view() {
    return SKILL_IDS.map(id => {
      const read = learned.has(id) ? skillLevel(id, learned.get(id)) : { level: 0, top: SKILLS[id].thresholds.length, xp: 0, floor: 0, next: null, max: false, progress: 0 };
      return { id, name: SKILLS[id].name, blurb: SKILLS[id].blurb, teacher: SKILLS[id].teacher, kind: SKILLS[id].kind ?? 'knowing',
        learned: learned.has(id), ...read, guide: skillGuide(id, read.level) };
    });
  }
  /** RuneScape's total level: every learned skill's level, added up. */
  const totalLevel = () => [...learned].reduce((sum, [id, xp]) => sum + skillLevel(id, xp).level, 0);

  function snapshot() { return { version: SKILLS_VERSION, skills: Object.fromEntries([...learned].map(([id, xp]) => [id, { xp }])) }; }

  function restore(data) {
    learned.clear();
    if (!validateSkillsSnapshot(data, { allowMissing: false })) return false;
    for (const [id, entry] of Object.entries(data.skills)) learned.set(canonical(id), Math.max(entry.xp, learned.get(canonical(id)) ?? 0));
    return true;
  }

  return { learn, gain, known, level, view, totalLevel, snapshot, restore };
}
