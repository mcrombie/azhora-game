/**
 * The traveler's skills: things learned from people along the road that grow with
 * practice. Each skill has experience and a level read from a table of thresholds.
 *
 * One table for all of them, RuneScape's own, to 99: each level a little further
 * off than the last, level 2 at 83 experience and level 99 at 13,034,431.
 *
 * Two kinds earn it differently. The knowing skills (birding, botany, fishing and
 * the rest) are paid for finding a thing for the first time, so one country's
 * worth of birds is a few levels and the rest of the table waits on the rest of
 * the world. The working skills (woodcutting, construction) are paid per log and
 * per plank, over and over, and what each level opens is written in the skill's
 * guide. Pure: no DOM, no three.
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
    teacher: 'Perrin, who keeps the bird garden on the eastern side of Tidehaven',
    // Drent's five birds together are worth 90: level 2. A country is a few levels; the table is the world's.
    thresholds: RUNESCAPE_TABLE,
  }),
  fishing: Object.freeze({
    id: 'fishing', name: 'Fishing',
    blurb: 'Reading water, waiting out a float, and knowing what you have landed. Every kind of fish you land for the first time teaches you something.',
    teacher: 'Bran at Willowmere Pond, and Hollis at the Caloss crossing',
    // The ten fish of Drent, Luscia and Pueth together are worth 200: level 3.
    thresholds: RUNESCAPE_TABLE,
  }),
  botany: Object.freeze({
    id: 'botany', name: 'Botany',
    blurb: 'Everything that grows, from the plantain on the path to the oldest oak in the wood: what it is, where it stands, and what it is for. Every plant and tree you name for the first time teaches you something.',
    teacher: 'Nell Harrow, at the Sunken Lane where the old drove crosses the Caloss road',
    // Drent's thirty-four plants and trees together are worth 625: level 6.
    thresholds: RUNESCAPE_TABLE,
  }),
  geology: Object.freeze({
    id: 'geology', name: 'Geology',
    blurb: 'Picking a stone up, weighing it, scratching it and asking where it is lying. Every kind of stone you name for the first time teaches you something about the country it came from.',
    teacher: 'Silas Garrow, with his marl cart at the Toll House stream on the Caloss road',
    // The eleven finds of Drent's coast together are worth 210: level 3.
    thresholds: RUNESCAPE_TABLE,
  }),
  mycology: Object.freeze({
    id: 'mycology', name: 'Mycology',
    blurb: 'Wood or ground, gills or folds, and what it smells of. Every kind of mushroom you name for the first time teaches you something — including the two you must never eat.',
    teacher: 'Odger Pell, at Fernway Rest, where the woodland paths meet',
    // The eleven mushrooms of Drent's woods together are worth 225: level 3.
    thresholds: RUNESCAPE_TABLE,
  }),
  archaeology: Object.freeze({
    id: 'archaeology', name: 'Archaeology',
    blurb: 'Reading what people and older things left in the ground, where it lies, and leaving it there. Old towns and older bones: every find written up for the first time teaches you something.',
    teacher: 'Lakota, the seventh hired sword up the road, who digs as well as he watches',
    // Rena's seven finds are worth 125, and the report to Lakota 40 more: level 2.
    thresholds: RUNESCAPE_TABLE,
  }),
  wine: Object.freeze({
    id: 'wine', name: 'Wine',
    blurb: 'Looking, smelling and tasting properly instead of drinking. Every wine tasted for the first time teaches you something about the grape, the ground it grew in, and what was done to it indoors; the words for what is in the glass arrive as you go.',
    teacher: 'Lakota on the road, Livia Seravo at Vaervelm Caelazh (Paradise Springs) in West Suval, and Juan at Tharganhom, the Wine Attic in Solis',
    // The eight wines of Vaervelm Caelazh are worth 120 and the visit 25 more; the five from its
    // cellar 125 again, and Juan's eight 150. A taster who drinks everything the built world pours
    // reaches 420 experience, level 5, and five of the nine words below. The rest wait on more wine.
    thresholds: RUNESCAPE_TABLE,
  }),
  cooking: Object.freeze({
    id: 'cooking', name: 'Cooking',
    blurb: 'What you can make at a lit fire, and why it works. Every dish made for the first time teaches you something.',
    teacher: 'Lakota, somewhere behind you on the road, whose hot chocolate is the first recipe',
    // Hot chocolate is worth 20 and the fish 10: level 1 with both — the first log is the smallest.
    thresholds: RUNESCAPE_TABLE,
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
  construction: Object.freeze({
    id: 'construction', name: 'Construction', kind: 'working',
    blurb: 'Planks, a hammer, a saw, and knowing what goes on first. Every plank you build with is experience, and the better the wood, the more of it.',
    teacher: 'Bowden Koop, King of the Koopwood, who built his own keep',
    thresholds: RUNESCAPE_TABLE,
    // What each level opens (src/construction.js holds the builds; the test keeps the two in step).
    unlocks: Object.freeze([unlock(1, 'Birdhouse, at Bowden’s workbench'), unlock(1, 'Your house: footings and a floor'), unlock(4, 'The frame'), unlock(8, 'Walls'),
      unlock(12, 'The roof'), unlock(15, 'Oak birdhouse'), unlock(15, 'A door and windows'), unlock(20, 'A bed to rest in'), unlock(25, 'A hearth and a chimney'),
      unlock(30, 'A chest'), unlock(45, 'A walnut table')]),
  }),
  cartography: Object.freeze({
    id: 'cartography', name: 'Cartography',
    blurb: 'Keeping your own chart of Azhora: the ground you have walked drawn properly, the coasts you have only been shown as a shape against the sea, and the rest of it dark. Asking somebody the way is worth as much to a chart as walking it.',
    teacher: 'Mara, the harbourmaster at the head of the pier in Tidehaven, with the rough chart the village keeps',
    thresholds: RUNESCAPE_TABLE,
    // A placeholder guide until src/cartography.js lands: the states a region passes through, in order.
    unlocks: Object.freeze([unlock(1, 'Your own chart, and the ground you walk drawn on it'),
      unlock(1, 'Ask the way: a region named and roughly placed before you reach it')]),
  }),
  swimming: Object.freeze({
    id: 'swimming', name: 'Swimming', kind: 'working',
    blurb: 'Crossing water on your own, which is slower than walking, harder than it looks, and the only way to some of this country. Your wind runs out before your arms do, and what happens after that is drowning.',
    teacher: 'Ed the Word, who came ashore at Tidehaven out of a ship that never docked',
    thresholds: RUNESCAPE_TABLE,
    // What each level opens is a crossing; the distances are measured shore to shore in
    // docs/swimming.md and re-measured by tests/swimming.test.js.
    unlocks: Object.freeze([unlock(1, 'Walk in: the ground stops holding you and you swim'),
      unlock(1, 'Drent to Pilot’s Stone · 61 m, and you will feel it'),
      unlock(4, 'Gull Scarp to Cobble · 60 m, on wind alone'),
      unlock(7, 'The nearest skerries without drowning for any of it'),
      unlock(25, 'Pilot’s Stone to Gull Scarp · 98 m, if you are willing to drown for the end of it'),
      unlock(43, 'The same 98 m on wind alone'),
      unlock(99, '280 m on one breath — and the open crossing to Cobble is 355, so you still island-hop')]),
  }),
  farming: Object.freeze({
    id: 'farming', name: 'Farming', kind: 'working',
    blurb: 'Putting a row in and coming back for it. The only skill with a clock of its own: a sown row ripens on the hours of your own game whether you are standing over it or three miles away, which is the first true thing Drent tells you about itself.',
    teacher: 'Enna, at the Mill Commons in the Avrel clearing',
    thresholds: RUNESCAPE_TABLE,
    // What each level opens (src/farming.js holds the crops and the rows; the test keeps the two in step).
    unlocks: Object.freeze([unlock(1, 'Barley · four minutes a row, 24 experience'), unlock(1, 'The four commons rows at the Avrel mill'),
      unlock(1, 'Applegarth’s kept orchard · picked, not sown, and bearing again in ten minutes'),
      unlock(5, 'Drent leaf · eight minutes a row, 45 experience')]),
  }),
  linguist: Object.freeze({
    id: 'linguist', name: 'Linguist',
    blurb: 'Reading the tongues of Azhora. Every conversation in a language you do not have teaches you a little of it, whether or not you understood a word at the time.',
    // A placeholder teacher and a placeholder guide: src/linguist.js is another hand's work and will say who really teaches it.
    teacher: 'Anybody speaking a tongue you do not have — it is learned by listening',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'The shape of a sentence you cannot read'), unlock(25, 'Words you have heard often enough'),
      unlock(50, 'The sense of what is being said'), unlock(75, 'What is being said, plainly'), unlock(99, 'You read it as you read your own')]),
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

/**
 * RuneScape's hover line for a skill: what you have, what the next level wants, and the
 * difference. Takes one entry of `createSkills().view()`.
 */
export function skillTip(view) {
  if (!view?.learned) return `Not yet learned · ${view?.teacher ?? 'nobody has offered to teach it'}`;
  if (view.max) return `${view.name} XP: ${view.xp} · Next level at: — · Remaining XP: 0`;
  return `${view.name} XP: ${view.xp} · Next level at: ${view.next} · Remaining XP: ${view.next - view.xp}`;
}

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
