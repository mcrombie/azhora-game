/**
 * The traveler's skills: things learned from people along the road that grow with
 * practice. Each skill has experience and a level read from a table of thresholds.
 * Birding is the first; the table is meant to take more. Pure: no DOM, no three.
 */
export const SKILLS_VERSION = 1;

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
    teacher: 'Lakota in Tidehaven, and Livia Seravo at Vaervelm Caelazh (Paradise Springs) in West Suval',
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
});

export const SKILL_IDS = Object.freeze(Object.keys(SKILLS));

/** Skills that have been renamed: a save from before the rename keeps its experience. */
export const SKILL_ALIASES = Object.freeze({ herbology: 'botany' });
const canonical = id => SKILL_ALIASES[id] ?? id;

/** Level, and progress toward the next one, for `xp` experience in skill `id`. */
export function skillLevel(id, xp) {
  const table = SKILLS[id]?.thresholds;
  if (!table) return null;
  const points = Math.max(0, Math.floor(Number(xp) || 0));
  let level = 1;
  while (level < table.length && points >= table[level]) level++;
  const floor = table[level - 1], next = level < table.length ? table[level] : null;
  return { level, xp: points, floor, next, max: next === null, progress: next === null ? 1 : (points - floor) / (next - floor) };
}

export function validateSkillsSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== SKILLS_VERSION) return false;
  if (!data.skills || typeof data.skills !== 'object' || Array.isArray(data.skills)) return false;
  return Object.entries(data.skills).every(([id, entry]) => Object.hasOwn(SKILLS, canonical(id)) && entry && typeof entry === 'object'
    && Number.isInteger(entry.xp) && entry.xp >= 0 && entry.xp <= 1e6);
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
    const before = skillLevel(id, learned.get(id)), after = skillLevel(id, before.xp + points);
    learned.set(id, after.xp);
    const levelled = after.level > before.level;
    if (points) onEvent({ type: 'skill-gain', id, gained: points, level: after.level, levelled });
    return { ok: true, gained: points, levelled, ...after };
  }

  const known = id => learned.has(id);
  const level = id => learned.has(id) ? skillLevel(id, learned.get(id)).level : 0;

  /** Every skill, learned or not, for the journal. */
  function view() {
    return SKILL_IDS.map(id => ({ id, name: SKILLS[id].name, blurb: SKILLS[id].blurb, teacher: SKILLS[id].teacher,
      learned: learned.has(id), ...(learned.has(id) ? skillLevel(id, learned.get(id)) : { level: 0, xp: 0, floor: 0, next: null, max: false, progress: 0 }) }));
  }

  function snapshot() { return { version: SKILLS_VERSION, skills: Object.fromEntries([...learned].map(([id, xp]) => [id, { xp }])) }; }

  function restore(data) {
    learned.clear();
    if (!validateSkillsSnapshot(data, { allowMissing: false })) return false;
    for (const [id, entry] of Object.entries(data.skills)) learned.set(canonical(id), Math.max(entry.xp, learned.get(canonical(id)) ?? 0));
    return true;
  }

  return { learn, gain, known, level, view, snapshot, restore };
}
