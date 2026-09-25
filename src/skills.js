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
/** The heading the seven fighting skills sit under in the journal's grid. */
export const ARMS_HEADING = 'Arms';
/** The second table, beside Arms: the schools of sorcery (src/sorcery.js). */
export const SORCERY_HEADING = 'Sorcery';

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
    teacher: 'Jean beside the main road just beyond Officer Glun, and other birders along the road',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'Observe birds with B; first sightings and patient repeat observations earn experience'),
      unlock(2, 'Imitate a familiar bird call from Actions (U)'), unlock(4, 'Observe from farther away'), unlock(7, 'Your observation range reaches thirty metres')]),
  }),
  husbandry: Object.freeze({
    id: 'husbandry', name: 'Animal Husbandry', kind: 'working',
    blurb: 'Caring for livestock and working animals. Calm, patient handling earns experience each time an animal needs attention again.',
    teacher: 'Jean beside the main road just beyond Officer Glun; other animal keepers can teach it too',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'Check and calm nearby livestock with F'), unlock(2, 'Care keeps animals calm for longer'),
      unlock(5, 'Practised handling calms animals for sixteen seconds')]),
  }),
  fishing: Object.freeze({
    id: 'fishing', name: 'Fishing',
    blurb: 'Reading water, waiting out a float, and knowing what you have landed. Every kind of fish you land for the first time teaches you something.',
    teacher: 'Glun, Mark or Jean near Tidewater Haven; Stanley at the Avrel farm; Bran at Willowmere and Chip at the Caloss crossing',
    // The ten fish of Drent, Luscia and Pueth together are worth 200: level 3.
    thresholds: RUNESCAPE_TABLE,
  }),
  botany: Object.freeze({
    id: 'botany', name: 'Botany',
    blurb: 'Everything that grows, from the plantain on the path to the oldest oak in the wood: what it is, where it stands, and what it is for. Every plant and tree you name for the first time teaches you something.',
    teacher: 'Mark by the village fire in Tidehaven, and Nell Harrow at the Sunken Lane on the Caloss road',
    // Drent's thirty-four plants and trees together are worth 625: level 6.
    thresholds: RUNESCAPE_TABLE,
  }),
  geology: Object.freeze({
    id: 'geology', name: 'Geology',
    blurb: 'Picking a stone up, weighing it, scratching it and asking where it is lying. Every kind of stone you name for the first time teaches you something about the country it came from.',
    teacher: 'Officer Glun at the training post, Mark by the village fire in Tidehaven, and Silas Garrow at the Toll House stream',
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
    blurb: 'Learn Fire Making first, then turn ingredients into nourishing meals at a lit fire. Every dish you actually cook earns experience.',
    teacher: 'Jojo at the landing, Stanley at the Avrel farm, and Lakota for hot chocolate',
    // Hot chocolate is worth 20 and the fish 10: level 1 with both — the first log is the smallest.
    thresholds: RUNESCAPE_TABLE,
  }),
  firemaking: Object.freeze({
    id: 'firemaking', name: 'Fire Making', kind: 'working',
    blurb: 'Build a useful fire with dry tinder, space for air and a little fuel. Each fire you light earns experience. Learn this before Cooking.',
    teacher: 'Lee Anne beside the empty village fire ring in Tidehaven',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'Light a prepared fire ring with a tinderbox and two sticks or one log'), unlock(1, 'Ready for cooking lessons from Jojo and Stanley')]),
  }),
  smithing: Object.freeze({
    id: 'smithing', name: 'Smithing', kind: 'working',
    blurb: 'Care for an edge and learn to repair worn weapons. Working on actual wear earns experience; polishing a sound blade again does not.',
    teacher: 'Martin, the smith of Tidehaven',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'Repair worn weapons at a repair bench or with Martin for 18 Smithing experience')]),
  }),
  woodcutting: Object.freeze({
    id: 'woodcutting', name: 'Woodcutting', kind: 'working',
    blurb: 'Choosing the tree, reading the grain, and swinging until it gives. Every log you cut is experience, and every tree and every axe has the level it wants from you.',
    teacher: 'Officer Glun at the training post, and Bowden Koop in the Koopwood north-west of Tidehaven',
    thresholds: RUNESCAPE_TABLE,
    // What each level opens (src/woodcutting.js holds the trees and axes themselves; the test keeps the two in step).
    unlocks: Object.freeze([unlock(1, 'Loblolly pine · 25 experience a log'), unlock(1, 'Bronze hatchet and iron axe'), unlock(6, 'Steel axe'),
      unlock(15, 'White oak · 38 experience a log'), unlock(30, 'Black willow · 68 experience a log'), unlock(30, 'The King’s axe, from Bowden'),
      unlock(45, 'Red maple · 100 experience a log'), unlock(60, 'Black walnut · 175 experience a log'), unlock(99, 'Bowden stops calling you “worm”')]),
  }),
  construction: Object.freeze({
    id: 'construction', name: 'Carpentry', kind: 'working',
    blurb: 'Joining timber, bracing what carries weight, and knowing what goes on first. Repairing the Caloss crossing teaches the basics; every plank you build with gives more experience.',
    teacher: 'Chip at the broken Caloss crossing, then Bowden Koop in the Koopwood for tools and a house plot',
    thresholds: RUNESCAPE_TABLE,
    // What each level opens (src/construction.js holds the builds; the test keeps the two in step).
    unlocks: Object.freeze([unlock(1, 'Birdhouse, at Bowden’s workbench'), unlock(1, 'Your house: footings and a floor'), unlock(4, 'The frame'), unlock(8, 'Walls'),
      unlock(12, 'The roof'), unlock(15, 'Oak birdhouse'), unlock(15, 'A door and windows'), unlock(20, 'A bed to rest in'), unlock(25, 'A hearth and a chimney'),
      unlock(30, 'A chest'), unlock(45, 'A walnut table')]),
  }),
  cartography: Object.freeze({
    id: 'cartography', name: 'Cartography',
    blurb: 'Keeping your own chart of Azhora: the ground you have walked drawn properly, the coasts you have only been shown as a shape against the sea, and the rest of it dark. Asking somebody the way is worth as much to a chart as walking it.',
    teacher: 'Officer Glun at the practice post north of Tidehaven, after your combat training',
    thresholds: RUNESCAPE_TABLE,
    // A placeholder guide until src/cartography.js lands: the states a region passes through, in order.
    unlocks: Object.freeze([unlock(1, 'Your own chart, and the ground you walk drawn on it'),
      unlock(1, 'Ask the way: a region named and roughly placed before you reach it')]),
  }),
  swimming: Object.freeze({
    id: 'swimming', name: 'Swimming', kind: 'working',
    blurb: 'Crossing water on your own, which is slower than walking, harder than it looks, and the only way to some of this country. Your wind runs out before your arms do, and what happens after that is drowning.',
    teacher: 'Jess at the Caloss crossing, and Ed the Word in the traveling company',
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
  stealth: Object.freeze({
    id: 'stealth', name: 'Stealth', kind: 'working',
    blurb: 'Moving quietly, keeping out of a watchful eye, and knowing when to wait. Sneaking near danger earns experience; standing still or creeping through an empty wood does not.',
    teacher: 'A discreet contact in Tidehaven',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'X to sneak: move slowly and watch the guards'),
      unlock(1, 'Practice by moving near danger without being caught'),
      unlock(2, 'A first successful theft from the Tidehaven barracks')]),
  }),
  farming: Object.freeze({
    id: 'farming', name: 'Farming', kind: 'working',
    blurb: 'Choose a crop, tend the soil, and bring in food for the road. Plants keep growing while you explore; menus, pause and closing the game stop the clock. Every harvest earns experience.',
    teacher: 'Stanley, beside the Mill Commons rows at the Avrel clearing',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'Carrots: 90 seconds, 22 experience per harvest'),
      unlock(1, 'Barley: four minutes, 24 experience per harvest'),
      unlock(1, 'Water each planting once: 4 experience, earlier growth and one extra crop'),
      unlock(1, 'Four reusable commons rows; Stanley shares seeds and farm recipes'),
      unlock(1, 'Pick Applegarth orchard apples; trees bear again in ten minutes'),
      unlock(2, 'Beets: 150 seconds, 32 experience per harvest'),
      unlock(5, 'Drent leaf: eight minutes, 45 experience per harvest')]),
  }),
  visualarts: Object.freeze({
    id: 'visualarts', name: 'Visual Arts', kind: 'working',
    blurb: 'Look closely, then give what you see a shape. Drawing, painting and calligraphy share one skill; finish studies at an easel to gain experience.',
    teacher: 'Sylvia, painting outside her cottage beside the Sunken Lane',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'Oak sketches: six seconds, 18 experience'),
      unlock(2, 'Woodland paintings: eight seconds, 24 experience'), unlock(3, 'Calligraphic greetings: eight seconds, 24 experience')]),
  }),
  acting: Object.freeze({
    id: 'acting', name: 'Acting', kind: 'working',
    blurb: 'Making a feeling readable through posture and movement. Finish an expression to earn experience; new expressions open as your range grows.',
    teacher: 'Amanda of Talaelos, beside the road west of the Avrel farms',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'Happy and Sad expressions'), unlock(2, 'Surprised expression'),
      unlock(3, 'Angry expression'), unlock(4, 'Afraid expression'), unlock(5, 'Proud expression and a bow')]),
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
  // ---------------------------------------------------------------------------
  // Arms: the seven fighting skills (src/combat-skills.js, docs/combat-brief.md).
  // They sit under their own heading in the grid, and none of them is required.
  // ---------------------------------------------------------------------------
  blades: Object.freeze({
    id: 'blades', name: 'Blades', group: ARMS_HEADING,
    blurb: 'The sword and the dagger: an edge, a point, and the sense to keep both out of bone. Every blow you land with one teaches you a little about the next.',
    teacher: 'Officer Glun at Tidehaven\u2019s practice post, then Chris Scotwood for the sword and Ed the Word for the dagger',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'The sword as it has always been'), unlock(25, 'A third again the damage, and a swing that costs less'),
      unlock(50, 'Half as hard again as the man who landed off the boat'), unlock(75, 'Twice the damage of that first morning'),
      unlock(99, 'Three times it \u2014 and the timing is still the timing')]),
  }),
  'heavy-arms': Object.freeze({
    id: 'heavy-arms', name: 'Heavy arms', group: ARMS_HEADING,
    blurb: 'Weapons that are won by weight rather than by edge: the greatsword, the mace, the axe. Slow to start and impossible to stop once they are going.',
    teacher: 'Eliana, for the greatsword, and Al the Tun, when it comes to the mace',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'All the weight you can already swing'), unlock(25, 'The third blow begins to tell'),
      unlock(50, 'Armour stops being the argument it was'), unlock(75, 'Very little stands through two of these'),
      unlock(99, 'Three times the damage, and the same long wind-up')]),
  }),
  polearms: Object.freeze({
    id: 'polearms', name: 'Polearms', group: ARMS_HEADING,
    blurb: 'Two paces of ash between you and the thing trying to kill you. The spear, the pike, and the one that leaves your hand.',
    teacher: 'Ciar\u00e1n for the spear, Matt for the pike, and Mus for the one that is thrown',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'Reach, which is most of it'), unlock(25, 'The thrust that does not have to be repeated'),
      unlock(50, 'A line nobody walks into twice'), unlock(75, 'The pike as the Empire means it'),
      unlock(99, 'Three times the damage at the end of two paces of ash')]),
  }),
  staves: Object.freeze({
    id: 'staves', name: 'Staves', group: ARMS_HEADING,
    blurb: 'A stick with two ends. It will not cut, so it goes for hands and knees, and no watchman has ever asked you to leave it at a gate.',
    teacher: 'Lakota, who has never once been parted from his',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'A stick, held properly'), unlock(25, 'Two ends, used as two'),
      unlock(50, 'Hands and knees, and the fight going out of people'), unlock(75, 'Faster than anything sharp'),
      unlock(99, 'Three times the damage from a thing that is still only wood')]),
  }),
  bows: Object.freeze({
    id: 'bows', name: 'Bows', group: ARMS_HEADING,
    blurb: 'Settling a thing at thirty paces so you do not have to think about it any more. Useless in a wood, and worth everything in the open.',
    teacher: 'Jerry, who would rather not be close to the fighting',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'A slow draw and an honest arrow'), unlock(25, 'The draw shortens'),
      unlock(50, 'Thirty paces is no longer a guess'), unlock(75, 'Loosed nearly as fast as it is drawn'),
      unlock(99, 'Half the draw and three times the damage')]),
  }),
  shield: Object.freeze({
    id: 'shield', name: 'Shield', group: ARMS_HEADING,
    blurb: 'Taking the first blow on the boards and answering over the rim. Slower than fighting without one, and a great deal harder to kill.',
    teacher: 'Officer Glun for the first guard, then Kristen, who stands in front of people who need it',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'Three fifths of a blow from the front'), unlock(25, 'Catching one costs less wind'),
      unlock(50, 'Three quarters of it, and you are still standing'), unlock(75, 'Very little of a frontal blow reaches you'),
      unlock(99, 'Nine tenths of it \u2014 and nothing at all from behind')]),
  }),
  toughness: Object.freeze({
    id: 'toughness', name: 'Toughness', group: ARMS_HEADING,
    blurb: 'Not a weapon: you. What you can take, how long your wind lasts, and how much of a step aside the world lets you have. Taught by being hit and living.',
    teacher: 'nobody teaches it, and everybody adds to it',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, '100 health, 100 wind, and a step aside worth 0.37 s'), unlock(25, 'Half as much again to lose'),
      unlock(50, 'Twice the man who landed, and a longer step'), unlock(75, 'Three times, and the wind to use it'),
      unlock(99, '400 health, 180 wind, and 0.48 s of a dodge that cannot be touched')]),
  }),
  /**
   * Sorcery has three released schools. Their stable IDs remain fire, mind and
   * beast so existing experience and teacher records survive the display rename.
   * Skill level improves a spell; the teacher's separate spell lesson unlocks it.
   * Frost and Wards are reserved save entries, not choices in the current journal.
   */
  fire: Object.freeze({
    id: 'fire', name: 'Fire Sorcery', group: SORCERY_HEADING,
    blurb: 'A ball of fire thrown at what you are looking at, which is the whole of it and is a great deal. It wants a wand or a staff in your hand, and your hand has room for one thing.',
    teacher: 'Ben, if you stand with him against the spider and ask for the lesson afterward',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'After Ben’s lesson: cast Fireball with a wand or staff'),
      unlock(25, 'Half as much again, and it comes back quicker'), unlock(50, 'Twice the fire and twice the throwing of it'),
      unlock(75, 'A pool deep enough to fight out of'), unlock(99, 'Three times the fire, and sixteen of them')]),
  }),
  mind: Object.freeze({
    id: 'mind', name: 'Mind Sorcery', group: SORCERY_HEADING,
    blurb: 'Hearing the thing somebody decided not to say. It gives you a second way to answer in any conversation, and what it turns up is theirs and not yours.',
    teacher: 'Troy, in Cobble, if you find his murderer for him and ask for the lesson afterward',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'After Troy’s lesson: use Mind Read on someone nearby'),
      unlock(25, 'Cheaper, so you can afford to be curious'), unlock(50, 'Half the focus of that first one'),
      unlock(75, 'You can read a room rather than a man'), unlock(99, 'Ten focus, and almost nobody is closed to you')]),
  }),
  beast: Object.freeze({
    id: 'beast', name: 'Animal Sorcery', group: SORCERY_HEADING,
    blurb: 'Asking something with more legs than you for a favour. At the first level that is bees, who come when called and leave when there is nothing to sting.',
    teacher: 'Liz, in the woods of Pueth, if you bring her cat back alive and ask for the lesson afterward',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'After Liz’s lesson: summon bees to harry an enemy'),
      unlock(25, 'They stay longer and sting harder'), unlock(50, 'Twice the swarm of that first one'),
      unlock(75, 'They come quicker and cost less'), unlock(99, 'Sixteen seconds of them, and they do not lose interest')]),
  }),
  frost: Object.freeze({
    id: 'frost', name: 'Frost', group: SORCERY_HEADING, reserved: true,
    blurb: 'Cold, and what cold does to a thing that was about to move. Nobody in Azhora has offered to show it to anybody yet.',
    teacher: 'nobody yet',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'Unlearned, and unteachable for now')]),
  }),
  wards: Object.freeze({
    id: 'wards', name: 'Wards', group: SORCERY_HEADING, reserved: true,
    blurb: 'Putting something between yourself and what is coming that is not a shield. Nobody in Azhora has offered to show it to anybody yet.',
    teacher: 'nobody yet',
    thresholds: RUNESCAPE_TABLE,
    unlocks: Object.freeze([unlock(1, 'Unlearned, and unteachable for now')]),
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
  // `taught` arrived when knowing a skill stopped meaning anybody had taught it. A save from
  // before that has none, and says the same thing with its keys.
  if (data.taught !== undefined && (!Array.isArray(data.taught)
    || !data.taught.every(id => typeof id === 'string' && Object.hasOwn(SKILLS, canonical(id))))) return false;
  return Object.entries(data.skills).every(([id, entry]) => Object.hasOwn(SKILLS, canonical(id)) && entry && typeof entry === 'object'
    && Number.isInteger(entry.xp) && entry.xp >= 0 && entry.xp <= MAX_XP);
}

/**
 * **Everything at level 1, and nobody's permission needed** (the user, 21 September 2026).
 *
 * A skill used to be locked until the person who teaches it had said so: `gain` refused with
 * "that skill has not been learned", and the sheet showed a tile greyed out with a name under
 * it. That made the teachers gatekeepers rather than teachers, and it meant a traveler who
 * stood in front of a bird on his first morning could not see it.
 *
 * Now `begins` is every skill the mode shows, each at nought experience, which the table reads
 * as **level 1**. Watch a bird, dig a hole, swing at a post, and it pays from the first step.
 * A tool is still a tool: you cannot cut wood without an axe, and nobody hands one over for
 * nothing. What the teachers keep is the teaching — the first time one of them shows you
 * something you have never done, that is still an occasion, and `learn` still says so. It says
 * it by the only honest measure left, which is that you have no experience in it yet, so the
 * answer survives a save without a field to hold it.
 */
export function createSkills({ onEvent = () => {}, begins = [] } = {}) {
  const learned = new Map();
  /** The skills this game begins knowing: seeded silently, because a life lived is not a banner. */
  const seed = () => { for (const id of begins) if (Object.hasOwn(SKILLS, id) && !learned.has(id)) learned.set(id, 0); };
  seed();
  /**
   * **Who has already shown the traveler something.** Knowing a skill is no longer the question
   * - everyone knows everything from the first step - so this is what is left of the old flag,
   * and it is the honest one: has the person who teaches this actually taught it to you. The
   * long road's twelve skill stops read it (src/long-road.js), and it is saved, because a stop
   * that closed on Tuesday must still be closed on Wednesday.
   */
  const taught = new Set();

  /**
   * A teacher shows you something. It is `first` only if you have never done it — which is the
   * question every caller was really asking, and the one the save already answers.
   */
  function learn(id) {
    if (!Object.hasOwn(SKILLS, id)) return { ok: false, reason: 'There is no such skill.' };
    // New the first time this teacher's own lesson lands, and never again: `taught` is saved.
    const first = !taught.has(id);
    if (!learned.has(id)) learned.set(id, 0);
    taught.add(id);
    if (first) onEvent({ type: 'skill-learned', id });
    return { ok: true, first, ...skillLevel(id, learned.get(id)) };
  }

  /** Add experience. Any skill the game has can be practised, taught or not. */
  function gain(id, amount) {
    if (!Object.hasOwn(SKILLS, id)) return { ok: false, reason: 'There is no such skill.' };
    if (!learned.has(id)) learned.set(id, 0);
    const points = Math.max(0, Math.floor(Number(amount) || 0));
    const before = skillLevel(id, learned.get(id)), after = skillLevel(id, Math.min(MAX_XP, before.xp + points));
    learned.set(id, after.xp);
    const levelled = after.level > before.level;
    if (points) onEvent({ type: 'skill-gain', id, gained: points, level: after.level, levelled, before: before.level });
    return { ok: true, gained: points, levelled, ...after };
  }

  // The floor is the law, not the seeding: every skill the game has is known and no lower than
  // level 1, whether or not this game seeded it and whether or not anybody has taught it. A
  // module asking `level` of a skill nobody has touched gets 1, which is what it now is.
  const known = id => Object.hasOwn(SKILLS, id);
  const level = id => learned.has(id) ? skillLevel(id, learned.get(id)).level : (Object.hasOwn(SKILLS, id) ? 1 : 0);

  /** Every skill, learned or not, for the journal, with its guide. */
  function view() {
    return SKILL_IDS.map(id => {
      const read = learned.has(id) ? skillLevel(id, learned.get(id)) : { level: 0, top: SKILLS[id].thresholds.length, xp: 0, floor: 0, next: null, max: false, progress: 0 };
      return { id, name: SKILLS[id].name, blurb: SKILLS[id].blurb, teacher: SKILLS[id].teacher, kind: SKILLS[id].kind ?? 'knowing',
        learned: learned.has(id), taught: taught.has(id), ...read, guide: skillGuide(id, read.level) };
    });
  }
  /** RuneScape's total level: every learned skill's level, added up. */
  const totalLevel = () => [...learned].reduce((sum, [id, xp]) => sum + skillLevel(id, xp).level, 0);

  function snapshot() {
    return { version: SKILLS_VERSION, skills: Object.fromEntries([...learned].map(([id, xp]) => [id, { xp }])),
      taught: [...taught].filter(id => Object.hasOwn(SKILLS, id)).sort() };
  }

  function restore(data) {
    learned.clear(); taught.clear();
    // The floor comes back first, and before the data is judged, so a save written before every
    // skill began at level 1 - or a refused one - leaves the sheet a new game would have rather
    // than an empty one.
    seed();
    if (!validateSkillsSnapshot(data, { allowMissing: false })) return false;
    for (const [id, entry] of Object.entries(data.skills)) learned.set(canonical(id), Math.max(entry.xp, learned.get(canonical(id)) ?? 0));
    // A save written before teaching and knowing were separate says who taught by which skills it
    // holds, which is exactly what the field meant then.
    for (const id of data.taught ?? Object.keys(data.skills)) if (Object.hasOwn(SKILLS, canonical(id))) taught.add(canonical(id));
    return true;
  }

  return { learn, gain, known, level, taught: id => taught.has(canonical(id)), xp: id => learned.get(canonical(id)) ?? 0,
    view, totalLevel, snapshot, restore };
}
