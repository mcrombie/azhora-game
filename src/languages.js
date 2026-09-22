/**
 * The tongues of Azhora, and how a word sounds in each of them.
 *
 * Nobody in this world speaks the traveler's language. What a person says to
 * you arrives in their own tongue and stays there until you have heard enough
 * of it, which is what `src/linguist.js` keeps count of. This module is the
 * other half: what those tongues *are* — who speaks them, where, and the sound
 * of them — and one pure function, `foreignWord`, that turns an English word
 * into that tongue's word for it, the same way every time.
 *
 * Fourteen tongues. Seven of them belong to the ten playable regions; the other
 * seven came ashore with the hired company, which was called from abroad and
 * brought abroad with it. Several of the fourteen carry dialects — Peblos is
 * Drentish folded down, Amodian is Mittoli with a terrace-country substrate —
 * and a dialect shares its parent's proficiency, because a Pebble pilot and a
 * Drent carter understand each other. What a dialect changes is only the sound.
 *
 * The sound of each tongue comes from the world-builder's own naming profiles
 * (`../world-builder/azhoran_language_profiles.py`, sixteen of them) where a
 * profile exists for it, and is derived from the lore's description plus the
 * region's authored place names where one does not. `from` says which, per
 * tongue, and `docs/languages.md` sets out the whole of it for the user.
 *
 * Seeded words come first. Where the lore glosses a real root — *cael* (water,
 * to flow) and *azh* (to endure) in `src/winery.js`, *ael* (speech) in the name
 * Talaelos, *veth* (the bond that holds) in every Izoli town — that root makes
 * the tongue's real word, and the generator never sees that English word again.
 *
 * Pure: no DOM, no three, no state. Everything here is frozen.
 */
import { mercenaryById } from './mercenaries.js';
import { SUBREGIONS } from './map-fog.js';
import { PLAYABLE_REGIONS } from './region-layout.js';
import { FREQUENT_WORDS } from './word-frequency.js';

export const LANGUAGES_VERSION = 1;

const freeze = Object.freeze;

/* ------------------------------------------------------------------ *
 * The word forge
 * ------------------------------------------------------------------ */

/** FNV-1a, 32 bits. The same English word in the same tongue always lands on the same seed. */
export function hashWord(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Four independent draws off one seed, so a word's syllables do not all follow its first letter. */
function roller(seed) {
  let s = (seed || 1) >>> 0;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s; };
}

/** Consonant pairs a mouth will take at the end of a word without a vowel between them. */
const CLOSING_PAIRS = /(th|ss|sh|ch|ll|rr|tt|st|nd|rd|rn|rl|rt|sk|ng|nt|mp|lt|lm|ft|ct|lk|nk|ph|zh|mb)$/;

/** Tidy a forged word: no letter three times running, no repeated seam, nothing unsayable at the end. */
function settle(word) {
  let out = word
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/([a-z]{2})\1/g, '$1')
    .replace(/[aeiou]{4,}/g, match => match.slice(0, 2));
  if (/[^aeiou]{2}$/.test(out) && !CLOSING_PAIRS.test(out)) out = `${out.slice(0, -1)}a${out.slice(-1)}`;
  if (!/[^aeiou]/.test(out)) out += 'l';
  return out.length > 1 ? out : `${out}a`;
}

/**
 * How many syllables an English word becomes. The rhythm of the line survives
 * translation — a short word stays short — which is most of what makes a
 * rendered sentence read as speech rather than as a heap of syllables.
 */
function syllablesFor(word, draw) {
  if (word.length <= 2) return 1;
  if (word.length <= 6) return 2;
  if (word.length <= 10) return 2 + (draw() % 2);
  return 3;
}
/** No tongue here says anything in fewer than about six letters; the short English words stretch. */
const SHORTEST = 6;

const pick = (list, n) => list[n % list.length];

/**
 * A word in `language`, built from its phonotactics and cached by the caller.
 * Deterministic: the seed is the tongue's id and the lowercase English word.
 * The word is kept near the length of the English it stands for, so a line of
 * it still has the shape of the sentence somebody actually said.
 */
export function forgeWord(language, word, salt = 0) {
  const draw = roller(hashWord(`${language.id}\u0000${word}\u0000${salt}`));
  // A high salt takes the word up a syllable, which is how a tongue finds room
  // for two hundred short English words in one short shape.
  const syllables = Math.min(3, syllablesFor(word, draw) + (salt >= 8 ? 1 : 0));
  let stem = pick(language.onsets, draw());
  if (syllables >= 2) {
    stem += pick(language.middles, draw());
    if (syllables >= 3) stem += pick(language.onsets, draw()).slice(0, 3);
  }
  const room = Math.max(1, Math.min(10, Math.max(SHORTEST, word.length + 2) - stem.length));
  return settle(stem + pick(language.suffixesByRoom[room], draw()));
}

/* ------------------------------------------------------------------ *
 * The tongues
 * ------------------------------------------------------------------ */

const tongue = entry => {
  const shortest = Math.min(...entry.suffixes.map(item => item.length));
  const short = freeze(entry.suffixes.filter(item => item.length === shortest));
  return freeze({
    dialects: freeze([]), borrows: freeze([]),
    ...entry,
    onsets: freeze(entry.onsets), middles: freeze(entry.middles), suffixes: freeze(entry.suffixes),
    // A suffix short enough to leave the word about as long as the English it stands for.
    suffixesByRoom: freeze(Array.from({ length: 11 }, (unused, room) => {
      const fits = entry.suffixes.filter(item => item.length <= room);
      return fits.length ? freeze(fits) : short;
    })),
    roots: freeze({ ...entry.roots }),
  });
};

/**
 * Every tongue a person in this game speaks. `from` names the world-builder
 * profile the sound is taken from, or says what it was derived out of.
 * `roots` is the seed lexicon: English word to that tongue's real word for it.
 */
export const LANGUAGES = freeze({
  /* ---- the seven tongues of the atlas ---- */
  ambroni: tongue({
    id: 'ambroni', name: 'Ambroni', endonym: 'Elagosi', family: 'Elagosi',
    where: 'Elagos and the Lake Lands; and wherever the Empire keeps a clerk, a prefect or a soldier',
    sound: 'Liquid lake roots and formal civic endings: ela, ambr, thel, oss, brul, closing on -os, -eth, -ar.',
    from: 'the world-builder profile `elagosi`',
    note: 'Its own family, related to nothing else on the continent that anyone has proved. In a strong imperial period it is the prestige administrative tongue of eastern Azhora, which is why the traveler hears it from every soldier on the road and every clerk at a gate.',
    borrows: ['drentish'],
    onsets: ['am', 'amb', 'brul', 'dre', 'el', 'ela', 'lag', 'men', 'oss', 'thel', 'vast', 'ven', 'zel'],
    middles: ['a', 'ae', 'e', 'i', 'o', 'u'],
    suffixes: ['an', 'ar', 'el', 'en', 'eth', 'i', 'on', 'or', 'os', 'um'],
    roots: {
      town: 'ambrel', village: 'elamen', river: 'elathel', water: 'elath', lake: 'elavor', sea: 'rosel',
      forest: 'menvar', wood: 'menar', hill: 'vastor', field: 'morel', plain: 'moros', marsh: 'ossen',
      border: 'vastmen', market: 'ambrthel', fort: 'ambrvast', holy: 'elabrul', sun: 'zelan',
      father: 'ambror', lord: 'thelar', house: 'ambreth', empire: 'ambronum', law: 'theleth', ice: 'brulos',
    },
  }),
  drentish: tongue({
    id: 'drentish', name: 'Drentish', endonym: 'Drent', family: 'Drentish',
    where: 'Drent, and north over the Tessen into Pueth; the Pebbles speak it folded down',
    sound: 'A coast tongue: hard heads — dren, tor, kar, bren — running out through -en, -oss, -eth and -wyn.',
    from: 'derived — the lore gives no profile, so the sound is taken from Drent’s own authored names (Drent, Rena, Avrel, Caloss, the Torn) and from Elagosi, which it has stood beside for centuries',
    note: 'Its own thing. An Elagosi speaker and a Drentish speaker reach each other with effort and goodwill and cannot follow each other’s formal proceedings without a translator. Centuries of Ambronite administration have left Elagosi loanwords in the legal and commercial registers, which is why the congress minutes read the way they do.',
    borrows: ['ambroni'],
    dialects: ['pueth', 'pebble'],
    onsets: ['av', 'bren', 'cal', 'dren', 'fal', 'hal', 'kar', 'mel', 'nar', 'oss', 'ren', 'sel', 'tav', 'tor', 'vren', 'wel'],
    middles: ['a', 'e', 'i', 'o', 'ae', 'ea'],
    suffixes: ['a', 'en', 'er', 'eth', 'ith', 'oll', 'on', 'oss', 'ren', 'th', 'ven', 'wyn'],
    roots: {
      town: 'renoss', village: 'haloll', river: 'calven', water: 'calen', sea: 'oswyn', shore: 'oseth',
      forest: 'brenwyn', wood: 'brenth', tree: 'brena', hill: 'toreth', field: 'meloll', marsh: 'osdren',
      border: 'trenwyn', market: 'melven', fort: 'karoth', holy: 'avren', sun: 'salen',
      father: 'narren', lord: 'karven', house: 'haleth', boat: 'oskar', fish: 'oswen', road: 'drenwyn',
    },
  }),
  mittoli: tongue({
    id: 'mittoli', name: 'Mittoli', endonym: 'Mittoli', family: 'Mittoli',
    where: 'Luscia, the Moros Plain and Amod, and most of the continent west of them',
    sound: 'More vowels than consonants, long words, liquid heads — cael, vel, thal, trel — closing on -oss, -ith, -eth, -om.',
    from: 'the world-builder profile `mittoli`',
    note: 'The great western family and the tongue of commerce, governance and scholarship. The traveler meets three of its dialects: Luscian, thick with Elagosi and plains loanwords; the Plain’s eastern Mittoli, with an older layer under its place names that nobody has traced; and Amodian, a foothill dialect carrying a terrace-country substrate and a set of water-measure words Standard Mittoli lacks.',
    borrows: ['ambroni', 'pyrosi'],
    dialects: ['luscian', 'plain', 'amodian', 'vastos', 'meneth', 'caricas', 'nesdor', 'eer', 'isareos', 'nethrani'],
    onsets: ['al', 'ar', 'azh', 'bel', 'cael', 'dael', 'dor', 'el', 'gal', 'hom', 'kael', 'mel', 'mir', 'nil', 'sor', 'tal', 'thal', 'trel', 'vel', 'zael'],
    middles: ['a', 'ae', 'e', 'i', 'o', 'oe', 'u'],
    suffixes: ['a', 'ael', 'an', 'ath', 'el', 'eth', 'in', 'ith', 'oe', 'ol', 'om', 'on', 'or', 'os', 'oss', 'um'],
    roots: {
      water: 'cael', river: 'caeloss', flow: 'caelin', town: 'homel', village: 'homin', settlement: 'mittol',
      forest: 'nothael', wood: 'ibeth', hill: 'thalor', field: 'galoss', plain: 'galom', marsh: 'acith',
      sea: 'velis', border: 'trelith', crossing: 'gal', market: 'legeth', fort: 'doroth', holy: 'azhael',
      sun: 'solael', father: 'mittor', lord: 'talor', house: 'daelith', word: 'aelos', speech: 'aelan',
      old: 'azhin', endure: 'azhael', measure: 'nessar', counted: 'nessaroth',
    },
  }),
  koleth: tongue({
    id: 'koleth', name: 'Koleth', endonym: 'Koleth', family: 'Elodi',
    where: 'East Suval: Elod, its harbour quarter, and every Elodi household on the continent',
    sound: 'Eastern and unrelated: kol, bal, erath, thal, nem, closing hard on -eth, -ath, -ol, -ik.',
    from: 'the world-builder profile `elodi`',
    note: 'Not an Azhoran language at all. It came across the Iberos Sea with a migration whose own texts call the place they left the Old Kingdom, and it shares neither sound nor grammar with anything around it. *Koleth* means the common tongue; the scriptural form kept in the Threshold is old enough that the priesthood spends years on it. The Elodi do not offer the language to outsiders — they translate instead — so the traveler learns it slowly and by ear.',
    onsets: ['bal', 'dar', 'el', 'er', 'eth', 'kel', 'kol', 'lod', 'nem', 'od', 'sov', 'thal', 'vel', 'zar'],
    middles: ['a', 'e', 'i', 'o', 'u', 'ae', 'ia'],
    suffixes: ['ag', 'an', 'ath', 'el', 'eth', 'i', 'ik', 'od', 'ol', 'on', 'th', 'um'],
    roots: {
      word: 'koleth', speech: 'kolan', tongue: 'kolik', town: 'elodik', village: 'elodan', river: 'velod',
      water: 'velik', sea: 'kolvel', forest: 'lodthal', hill: 'erathol', field: 'erlod', marsh: 'odvel',
      border: 'thaleth', threshold: 'thaleth', market: 'kolbal', fort: 'balerath', holy: 'balkol',
      sun: 'sovel', father: 'erathod', lord: 'balogath', house: 'kolerath', stranger: 'darzan', oath: 'balath',
    },
  }),
  suvalen: tongue({
    id: 'suvalen', name: 'Suvalen', endonym: 'Suvali', family: 'Mittoli (Iberos coastal)',
    where: 'West Suval and the whole southern peninsula: Solis, the downs, the fishing coast',
    sound: 'Coastal Mittoli gone soft and southern: vaer, velm, sol, thar, mar, ending in open -a, -o, -on, -azh.',
    from: 'derived — a coastal contact variety of Mittoli, with the glosses the game already uses at Vaervelm Caelazh (`src/winery.js`)',
    note: 'A variety of the Iberos coastal contact language, related to mainland trade Mittoli but shaped by a peninsula that has dealt with sea traffic from every direction for a long time. It has taken commercial vocabulary from Selemi, administrative words from Elagosi through the Moros, and product names from the Elodi. The South Suval fishing dialect, which the traveler does not reach, is older and keeps its own words for the water.',
    borrows: ['mittoli', 'selemi', 'ambroni', 'koleth'],
    onsets: ['cael', 'cal', 'lov', 'mar', 'sar', 'sol', 'sor', 'tar', 'thar', 'vaer', 'vel', 'velm', 'ver', 'zan'],
    middles: ['a', 'ae', 'e', 'i', 'o'],
    suffixes: ['a', 'al', 'an', 'as', 'el', 'o', 'on', 'os', 'oth', 'um', 'azh'],
    roots: {
      good: 'vaer', green: 'velm', water: 'cael', spring: 'caelazh', flow: 'caelo', endure: 'azh',
      house: 'hom', town: 'solon', village: 'soran', river: 'caelos', sea: 'velmar', shore: 'maras',
      forest: 'lovan', hill: 'tarel', field: 'salon', market: 'marcal', fort: 'tarvas', holy: 'zanos',
      sun: 'solaz', father: 'saror', lord: 'solar', wine: 'vinazh', gate: 'portal', sea_road: 'velmaras',
    },
  }),
  izoli: tongue({
    id: 'izoli', name: 'Izoli', endonym: 'Izolveth', family: 'Izoli',
    where: 'the island of Izol: the coastal towns, and the highland tribes who keep an older form of it',
    sound: 'Island rock: short hard heads — ard, kel, vos, ser, tav — and the -veth and -vath endings every Izoli town carries.',
    from: 'derived — the island’s own authored names (Izolveth, Ardveth, Kelvath, Anvath, Andreth, Doreth) and the goddess’s domain, *the bond that holds*',
    note: 'The coastal dialect trades; the highland variety is conservative, and the shrine-keeping vocabulary in it is not translated for outside use, which the tribes find useful whether or not it is a real divergence. *Veth* is the whole of the island in one syllable: what keeps rock from becoming sand and a promise from becoming words.',
    dialects: ['highland'],
    borrows: ['selemi'],
    onsets: ['ard', 'anv', 'dor', 'hes', 'izl', 'kel', 'mar', 'orw', 'rel', 'ruv', 'ser', 'tav', 'tov', 'vos', 'ys'],
    middles: ['a', 'e', 'o', 'u'],
    suffixes: ['ath', 'en', 'eth', 'ne', 'os', 'reth', 'th', 'vath', 'veth'],
    roots: {
      hold: 'veth', keep: 'veth', bond: 'vethos', oath: 'vethreth', promise: 'vethen', stone: 'izlath',
      rock: 'izlath', island: 'izlveth', town: 'orwveth', village: 'relne', harbour: 'marvath',
      sea: 'marveth', boat: 'marne', water: 'serath', hill: 'tovreth', peak: 'tovath',
      assembly: 'vosreth', speaker: 'vosen', kin: 'ardeth', father: 'ardos', lord: 'hesreth', house: 'anvath',
    },
  }),
  /* ---- the seven tongues the hired company brought with it ---- */
  feradom: tongue({
    id: 'feradom', name: 'Feradom speech', endonym: 'Ferdom', family: 'Drentish',
    where: 'Feradom, north beyond the shut road at the edge of Pueth',
    sound: 'Drentish gone cold: heavy heads — skar, thorn, grim, vend — on endings borrowed from the domains themselves, -dom, -holt, -mund, -und.',
    from: 'derived — Drentish, diverged, with the cold consonant clusters of the world-builder profile `crefs`',
    note: 'Related to Drentish the way long-separated cousins are: recognisably the same source, significantly diverged, and no longer followable across. The *-dom* of Feradom is the Drentish word for a lordly holding, which may mean the country is simply named the domain country. Its terrain vocabulary is rich where Drentish is thin — passes, ridges, northern sea approaches — and its words for sea conditions are not Drent’s words, because they are not Drent’s waters.',
    borrows: ['drentish', 'ambroni'],
    onsets: ['brand', 'fer', 'gar', 'grim', 'harl', 'kord', 'mor', 'ost', 'rand', 'skar', 'thorn', 'ulf', 'vend', 'wald'],
    middles: ['a', 'e', 'i', 'o', 'u'],
    suffixes: ['ald', 'and', 'ar', 'dom', 'erd', 'holt', 'ik', 'mund', 'orn', 'und', 'ulf'],
    roots: {
      holding: 'ferdom', domain: 'ferdom', lord: 'ferdar', house: 'waldholt', town: 'kordholt', village: 'randerd',
      pass: 'skarund', ridge: 'skarorn', hill: 'garald', forest: 'thornholt', wood: 'thornar',
      river: 'ulfand', water: 'ulfik', sea: 'morund', shore: 'morerd', cold: 'grimik', winter: 'grimund',
      road: 'vendorn', border: 'harlund', father: 'brandar', stone: 'kordik',
    },
  }),
  maroshi: tongue({
    id: 'maroshi', name: 'Maroshi', endonym: 'Mariışi', family: 'Moreshi',
    where: 'the Marosh fens and the coast beyond them, and inland to the canyon country',
    sound: 'Long vowels and hissing consonants on compact endings: maan, nur, qad, sax, waa, rih, closing -ah, -at, -iim, -ub.',
    from: 'the world-builder profile `moreshi`',
    note: 'A separate lineage, older than the western families and possibly older than their common ancestor, and of no practical use to anyone trying to get directions in the Moroshe. The court form is a dialect of Coastal Trade Moreshi; the deep-desert forms are the conservative ones. There is a ritual register nobody has been able to analyse, and the desert peoples do not discuss it in terms that help.',
    onsets: ['al', 'ar', 'bar', 'ghay', 'ha', 'kal', 'maan', 'mar', 'naj', 'nur', 'qad', 'rih', 'sab', 'sar', 'sax', 'waa', 'zar'],
    middles: ['a', 'aa', 'i', 'ii', 'u', 'uu'],
    suffixes: ['ah', 'an', 'as', 'at', 'b', 'iim', 'l', 'm', 'n', 'r', 't', 'ub'],
    roots: {
      town: 'waahan', village: 'maanah', water: 'nahriim', river: 'nahr', well: 'wadiib', sea: 'bahran',
      forest: 'ghabat', hill: 'saxar', plain: 'muruut', marsh: 'sabwadii', border: 'haddan', market: 'suqah',
      fort: 'hisnat', holy: 'qadiim', sun: 'shamsah', light: 'nuurat', father: 'sabrah', lord: 'malikat',
      house: 'ghayrat', wind: 'rihah', stone: 'saxriim', salt: 'malhat',
    },
  }),
  pyrosi: tongue({
    id: 'pyrosi', name: 'Pyrosi', endonym: 'Pyrossel', family: 'Pyrosi',
    where: 'the Pyros hills, west and east, and the transit towns between them',
    sound: 'Strong heads on volcanic stems — pyr, vor, vel, neth, kael — running out through -oss, -ell, -marr, -ith.',
    from: 'the world-builder profile `pyrosi`',
    note: 'Mittoli’s sister off a common ancestor older than any surviving record, and in contact with it ever since. West Pyrosi is formal and layered, and encodes social relationship in the verb in a way that gives Mittoli speakers continuous trouble: the politeness registers are not optional, and using the wrong one is not rude exactly, but it is noticed. East Pyrosi is the trade form — more vocabulary, less grammar, maximum utility.',
    borrows: ['mittoli'],
    onsets: ['bass', 'dre', 'fell', 'gel', 'kael', 'kel', 'llaer', 'moss', 'neth', 'nor', 'pyr', 'rael', 'tael', 'tal', 'vaell', 'vel', 'vor'],
    middles: ['a', 'ae', 'e', 'i', 'o', 'u'],
    suffixes: ['ael', 'an', 'ell', 'eth', 'iel', 'in', 'ir', 'ith', 'marr', 'om', 'oss', 'ov', 'van'],
    roots: {
      fire: 'pyrell', ash: 'pyross', town: 'navith', village: 'pyran', river: 'vaellir', water: 'vaellan',
      sea: 'raeliss', forest: 'mossel', wood: 'gelmarr', hill: 'fellov', plain: 'taeloss', marsh: 'nethin',
      border: 'vorith', market: 'carell', fort: 'bassmarr', holy: 'pyrael', sun: 'taelan',
      father: 'navel', lord: 'kelith', house: 'nethoss', stone: 'vorell',
    },
  }),
  selemi: tongue({
    id: 'selemi', name: 'Selemi', endonym: 'Selanoc', family: 'Iberos maritime',
    where: 'Selemis and every Selemi outpost from the Izoli Channel to the far coast',
    sound: 'Flowing vowels on sailing stems — sel, cal, ser, noc, ver — ending soft in -oc, -el, -an, -eth.',
    from: 'derived — the world-builder profile `tennoca`, whose coastal trading sound fits the Iberos Sea’s own maritime power',
    note: 'The least documented family in the survey and the most consequential for what the gap implies: it has shaped East Pyrosi, given Coastal Trade Moreshi its vocabulary, and put nautical and commercial terms into three Azhoran families, without a single Azhoran linguist having studied it on its own terms. The Selemi have not offered.',
    borrows: ['suvalen', 'izoli'],
    onsets: ['cal', 'can', 'cel', 'mon', 'noc', 'sel', 'ser', 'tan', 'ten', 'vel', 'ver'],
    middles: ['a', 'e', 'i', 'o'],
    suffixes: ['a', 'ac', 'al', 'an', 'ar', 'el', 'en', 'eth', 'oc', 'on', 'oca'],
    roots: {
      sea: 'noca', ship: 'nocel', boat: 'nocan', harbour: 'seloca', outpost: 'tenar', town: 'tenel',
      village: 'selan', water: 'calen', river: 'calvel', shore: 'sereth', wind: 'veren', rope: 'moncal',
      market: 'monel', trade: 'monoc', fort: 'canver', holy: 'celoc', sun: 'seran',
      father: 'tenoc', lord: 'calmon', house: 'selon', crossing: 'nocveth',
    },
  }),
  kellith: tongue({
    id: 'kellith', name: 'Kellith', endonym: 'Kellith', family: 'Telemon highland',
    where: 'the highland passes and their valley halls, Zorkys among them',
    sound: 'Compact and closed, hard on k, t, r and th: kel, keth, tarn, roth, vorn, ending -kar, -mon, -orn, -ith.',
    from: 'the world-builder profile `kellith`',
    note: 'A highland tongue for ground known too precisely for outsiders: passes, endurance, bands, borders, and what a hall owes the four hundred people in its valley. Matt of Zorkys speaks it, and says prince in it, and it does not mean what a lowlander hears.',
    borrows: ['pyrosi'],
    onsets: ['bel', 'gal', 'kel', 'kell', 'keth', 'morn', 'roth', 'tarn', 'tel', 'tor', 'ver', 'vorn'],
    middles: ['a', 'e', 'i', 'o', 'u'],
    suffixes: ['an', 'ath', 'el', 'eth', 'ith', 'k', 'kar', 'mon', 'n', 'orn', 'th'],
    roots: {
      hall: 'kellmon', valley: 'galorn', pass: 'kethkar', town: 'kelmon', village: 'telan', river: 'vergal',
      water: 'veren', hill: 'tarnith', forest: 'mornel', border: 'verketh', fort: 'kethkar', market: 'galtel',
      holy: 'kelver', sun: 'torkel', father: 'kellmon', lord: 'torketh', house: 'kellith',
      oath: 'rothath', band: 'rothorn', stone: 'tarnk', snow: 'vornith',
    },
  }),
  boueni: tongue({
    id: 'boueni', name: 'Bouéni', endonym: 'Bouenel', family: 'Bouéni',
    where: 'Bouén and the southern islands, and every Azner deck between them',
    sound: 'Soft vowel bridges into clipped endings: bou, vel, wis, srel, sev, mes, closing -el, -em, -un, -ves.',
    from: 'the world-builder profile `boueni`',
    note: 'A small family of its own, Mittoli’s most distant living relative, diverged so early that the relationship shows only under systematic comparison. Its mystery is its substrate, a layer of words that comes from neither ancestor. The Bouéni explain it readily: their forebears came from the sea. Outside linguists have not disproved this and find it unsatisfying.',
    borrows: ['mittoli'],
    onsets: ['az', 'belv', 'bou', 'bren', 'di', 'grond', 'ia', 'kuv', 'mes', 'no', 'sev', 'srel', 'sri', 'te', 'vel', 'veln', 'wis'],
    middles: ['a', 'an', 'e', 'en', 'i', 'o', 'on', 'u'],
    suffixes: ['el', 'em', 'i', 'o', 'on', 'oul', 'srel', 'un', 'ves'],
    roots: {
      sea: 'aurvel', star: 'aurves', island: 'bouves', town: 'bouel', village: 'celun', water: 'orevel',
      river: 'oreun', forest: 'wisel', hill: 'grondem', plain: 'sevel', marsh: 'srelon', border: 'grondun',
      market: 'mesel', fort: 'brenoul', holy: 'azves', sun: 'aurem', father: 'bouon', lord: 'belvun',
      house: 'kuvel', boat: 'wisves', night: 'sevoul',
    },
  }),
  ibnael: tongue({
    id: 'ibnael', name: 'Ibnael', endonym: 'Ibnael', family: 'Forest Mittoli, and whatever is under it',
    where: 'the western deep forest, and nowhere on this road but one man walking through the trees',
    sound: 'Unusual heads and dense codas: ibn, thren, glom, morn, vorn, ond, ending flat on -th, -oss, -yr, -eth.',
    from: 'the world-builder profile `ibnael`',
    note: 'Forest Mittoli, and under it a substrate nobody has placed: words for particular qualities of forest light, categories of forest silence, the behaviour of old trees, the felt presence of unseen things, with no cognates in any other language. The Academy’s position is that field research in the deep-forest communities presents logistical challenges, and has been its position for a century and a half. Mus speaks it. He does not say where he is from.',
    borrows: ['mittoli'],
    onsets: ['ael', 'dren', 'glom', 'ib', 'iben', 'ibn', 'morn', 'noth', 'ond', 'oss', 'thal', 'thren', 'vel', 'vorn', 'wyr'],
    middles: ['a', 'ae', 'e', 'i', 'o', 'oe', 'u', 'y'],
    suffixes: ['ael', 'ath', 'd', 'el', 'en', 'eth', 'ib', 'il', 'n', 'oss', 'th', 'um', 'yr'],
    roots: {
      speech: 'ael', word: 'aelyr', sky: 'vorn', lake: 'ond', water: 'ondel', river: 'ondyr',
      forest: 'ibenoss', wood: 'ibenth', tree: 'ibnael', silence: 'glometh', light: 'glomael',
      old: 'nothyr', hill: 'thaldren', town: 'ibnoss', village: 'ibnil', border: 'threneth',
      father: 'nothib', lord: 'ossael', house: 'dreneth', road: 'wyrath', dark: 'mornoss',
    },
  }),
  cant: tongue({
    id: 'cant', name: 'Harbour Cant', endonym: 'the Cant', family: 'pidgin',
    where: 'every quay on the Iberos Sea, and no country at all',
    sound: 'Everybody’s. Each word is that word in whichever tongue the quay happened to be speaking, held together by a dozen of its own.',
    from: 'derived — a pidgin: every word is forged in a donor tongue chosen by the word itself, over a small core of its own',
    note: 'Not a language with a country. It is what four centuries of Iberos coastal trade left behind in the ports, and it is the reason a Mittoli merchant and an Iberos factor have always managed to negotiate better than either manages with a Moreshi speaker. A traveler who has been anywhere half-understands it, which is the whole point of it. Ed the Word speaks it, and will not say which port taught him.',
    borrows: ['drentish', 'mittoli', 'suvalen', 'selemi', 'izoli', 'pyrosi', 'maroshi', 'boueni'],
    donors: freeze(['drentish', 'mittoli', 'suvalen', 'selemi', 'izoli', 'pyrosi', 'maroshi', 'boueni', 'koleth', 'ambroni']),
    onsets: ['bar', 'dok', 'gan', 'hav', 'kan', 'mar', 'pol', 'sav', 'tik', 'vor'],
    middles: ['a', 'e', 'i', 'o'],
    suffixes: ['a', 'ee', 'im', 'o', 'ok', 'um'],
    roots: {
      yes: 'savo', no: 'nok', good: 'bono', bad: 'malo', money: 'dokum', price: 'dokee', ship: 'barko',
      water: 'aqua', bread: 'pana', work: 'travo', friend: 'kamo', stranger: 'forim', trade: 'kambee',
      quay: 'molo', captain: 'kapo', rope: 'kabo', wind: 'ventim', salt: 'salim',
    },
  }),
});

export const LANGUAGE_IDS = freeze(Object.keys(LANGUAGES));
export const language = id => LANGUAGES[id] ?? null;

/* ------------------------------------------------------------------ *
 * The lexicons
 * ------------------------------------------------------------------ */

/**
 * How many of the game's commonest words are given their word in a tongue up
 * front, in rank order, with collisions settled as they are found. Two English
 * words never share a word among these, which matters because these are the
 * words a traveler hears all day and learns first. Rarer words are forged on
 * demand against the same reserved set, so every word is still the same word
 * every time whatever order the traveler happens to meet them in.
 */
export const SEEDED_WORDS = 512;
/** How many shapes a word is allowed before the tongue accepts a rhyme. */
const SALTS = 24;

const lexicons = new Map();

/** The tongue a Cant word comes out of: the quay was speaking somebody's language that day. */
function donorFor(word) {
  const donors = LANGUAGES.cant.donors;
  return LANGUAGES[donors[hashWord(`cant-donor\u0000${word}`) % donors.length]];
}

function buildLexicon(id) {
  const tongue = LANGUAGES[id];
  const words = new Map(Object.entries(tongue.roots));
  const taken = new Set(words.values());
  const forge = word => {
    const source = id === 'cant' ? donorFor(word) : tongue;
    for (let salt = 0; salt < SALTS; salt++) {
      const made = forgeWord(source, word, salt);
      if (!taken.has(made)) return made;
    }
    return forgeWord(source, word, SALTS);
  };
  for (let rank = 0; rank < Math.min(SEEDED_WORDS, FREQUENT_WORDS.length); rank++) {
    const word = FREQUENT_WORDS[rank];
    if (words.has(word)) continue;
    const made = forge(word);
    words.set(word, made); taken.add(made);
  }
  const reserved = new Set(taken);
  return {
    /** That tongue's word for an English word. Cached, and the same every time. */
    word(english) {
      const held = words.get(english);
      if (held !== undefined) return held;
      const source = id === 'cant' ? donorFor(english) : tongue;
      let made = forgeWord(source, english, 0);
      for (let salt = 1; salt < SALTS && reserved.has(made); salt++) made = forgeWord(source, english, salt);
      words.set(english, made);
      return made;
    },
    size: () => words.size,
  };
}

/** The lexicon of a tongue, built the first time anybody speaks it and kept. */
export function lexiconFor(id) {
  if (!LANGUAGES[id]) return null;
  let lexicon = lexicons.get(id);
  if (!lexicon) { lexicon = buildLexicon(id); lexicons.set(id, lexicon); }
  return lexicon;
}

/** One English word in one tongue, through that tongue's lexicon. */
export const wordIn = (id, english) => lexiconFor(id)?.word(english) ?? english;

/* ------------------------------------------------------------------ *
 * Dialects
 * ------------------------------------------------------------------ */

/**
 * A dialect shares its parent's proficiency — a Pebble pilot and a Drent carter
 * understand each other — and changes only the sound. `twist` is a pure
 * function on an already-forged word, and every one of them is light: the lore
 * describes these as accents, not as other languages, and word order never moves.
 */
const dialect = (id, name, parent, of, twist) => freeze({ id, name, language: parent, of, twist });

export const DIALECTS = freeze({
  pueth: dialect('pueth', 'the Pueth accent', 'drentish',
    'Drentish north of the Tessen, with fewer Elagosi loanwords than Drent’s own, because the occupation there was shorter.',
    word => word.replace(/en$/, 'in').replace(/oss$/, 'os')),
  pebble: dialect('pebble', 'Pebble Drentish', 'drentish',
    'The same words folded down: the redundancy squeezed out by a community that talks in known contexts. Intelligible word by word and hard to follow at speed.',
    word => (word.length > 5 ? word.replace(/([bcdfghklmnprstvwz])[aeiou]([bcdfghklmnprstvwz])/, '$1$2') : word)),
  luscian: dialect('luscian', 'Luscian Mittoli', 'mittoli',
    'Standard Mittoli under a surface of Elagosi administrative loanwords, Moros commercial vocabulary and steppe terms for land use.',
    word => word.replace(/oss$/, 'os').replace(/^cael/, 'cel')),
  plain: dialect('plain', 'the Plain’s Mittoli', 'mittoli',
    'The eastern Mittoli of the Ros estuary and the grain country, with an older layer beneath its place names that derives from no identified neighbour.',
    word => word.replace(/([aeiou])$/, '$1$1')),
  amodian: dialect('amodian', 'Amodian', 'mittoli',
    'A foothill dialect with a heavy terrace-country substrate in its place names, water vocabulary and terrace terms, and words for water that describe behaviour and not only quantity.',
    word => word.replace(/([aeiou])([aeiou])/, '$1’$2')),
  vastos: dialect('vastos', 'Vastos Mittoli', 'mittoli',
    'The upland plain’s Mittoli-contact speech, between the Pyrosi west and the Elagosi east and owing a strong claim to neither, over a pastoral core: the *vel-vastos*, the year’s movement of herds, is its own body of words.',
    word => word.replace('o', 'ou')),
  meneth: dialect('meneth', 'Meneth Mittoli', 'mittoli',
    'Upland Mittoli of the Lotharn margin, thick with Elagosi loanwords from the prefectures, and carrying the pre-Mittoli Lotharn substrate that the name Meneth itself comes out of.',
    word => word.replace(/th$/, 'nth')),
  caricas: dialect('caricas', 'Carican Mittoli', 'mittoli',
    'Inner-branch Mittoli, plain to any Standard speaker and distinct in its vocabulary for woodland management, fox-corridor practice and the register a sighting record is written in.',
    word => word.replace(/as$/, 'ac').replace(/os$/, 'oc')),
  nesdor: dialect('nesdor', 'Nesdor Mittoli', 'mittoli',
    'Plains Mittoli facing the Moros approaches, with Compact legal terms off the branch country and pastoral words off the steppe. The name is the older layer: *nessar*, counted, and *dorath*, water-place.',
    word => word.replace('r', 'rr')),
  eer: dialect('eer', 'Eer Mittoli', 'mittoli',
    'Coastal-transitional Mittoli, nearer the Lizeem valley’s standard than the Iberos coast’s, and a stratigraphic record of every power that has administered the place: Pyrosi administrative terms, Iberos commercial vocabulary, Ascarth farming words, and an old layer for land, water and soil that belongs to no identified family. Its place names describe the ground and commemorate nobody.',
    word => word.replace(/ee/, 'e').replace(/([aeiou])r$/, '$1er')),
  isareos: dialect('isareos', 'Isareos Mittoli', 'mittoli',
    'The western-interior Mittoli of the valley heads: unstressed syllables compressed, Elagosi loanwords kept in the formal registers of dispute and contract, and above all **the ford vocabulary** — single terms for water heights and crossing conditions that Standard Mittoli needs a compound for, and which grows every season anybody tries to finish writing it down.',
    word => word.replace(/os$/, 'eos').replace(/([aeiou])([bcdfgklmnprstvz])([aeiou])\2/, '$1$2$3')),
  nethrani: dialect('nethrani', 'Nethrani', 'mittoli',
    'An inner-branch Mittoli variant, plain to any Standard speaker, whose whole distinctive vocabulary is the flood: *nethvel*, "the return of the deep water", against *nethmorr* for one that exceeds its bounds and *nethgell* for one that fails to come; *haethoss*, the reliable line a family builds above; *nethoss*, the deep basin, used of any situation that cannot get worse. It borrows the Pyrosi elevated register *kael-* for the Flood Recall alone, which linguists find remarkable and the Nethrani explain by saying the flood has the standing of the land.',
    word => word.replace(/e([bcdfgklmnprstvz])/, 'eh$1')),
  highland: dialect('highland', 'the highland Izoli', 'izoli',
    'Conservative where the coastal towns have moved on, and carrying shrine-keeping vocabulary the towns do not have and the tribes do not translate.',
    word => word.replace(/([bcdfgklmnprstvz])$/, '$1$1')),
});

export const DIALECT_IDS = freeze(Object.keys(DIALECTS));
export const dialectOf = id => DIALECTS[id] ?? null;

/* ------------------------------------------------------------------ *
 * Who speaks what
 * ------------------------------------------------------------------ */

const spoken = (language, dialect = null) => freeze({ language, dialect });

/**
 * Every playable region on the atlas, and the tongue its people speak in it.
 *
 * **A new region needs an entry here.** `tests/languages.test.js` walks the playable regions and
 * asks each one what is spoken in it, so a region added to the atlas without a line below turns
 * that test red — which is the point: it is a question for the lore, not a default. Nethereum,
 * Ovesos, the Oves Desert and Gala are coming, and each of them wants its own line. Take the
 * tongue from the country's own lore file (`azhora_lore/geography/regions/<name>.md`, the
 * "Language" section), and if what the lore names is not a tongue `LANGUAGES` already has, map it
 * to the nearest one the lore itself calls its parent or its neighbour and say so in the comment
 * rather than inventing a language.
 */
export const REGION_LANGUAGE = freeze({
  Drent: spoken('drentish'),
  Pueth: spoken('drentish', 'pueth'),
  Peblos: spoken('drentish', 'pebble'),
  Luscia: spoken('mittoli', 'luscian'),
  'Moros Plain': spoken('mittoli', 'plain'),
  Amod: spoken('mittoli', 'amodian'),
  'East Suval': spoken('koleth'),
  'West Suval': spoken('suvalen'),
  'West Izol': spoken('izoli'),
  Elagos: spoken('ambroni'),
  // The four western regions. The lore is specific: all four are Mittoli-speaking
  // country, each with its own dialect, inside the Empire's reach — so the people
  // speak Mittoli and the prefect, the clerk and the soldier answer in Ambroni.
  Vastos: spoken('mittoli', 'vastos'),
  Meneth: spoken('mittoli', 'meneth'),
  Caricas: spoken('mittoli', 'caricas'),
  Nesdor: spoken('mittoli', 'nesdor'),
  // Regions fifteen and sixteen, from their own lore files and not from invention. Both are
  // Mittoli country with a dialect of their own: Eer's is "a Mittoli dialect that linguists
  // categorize as coastal-transitional", Isareos's "the western-interior dialect of Standard
  // Mittoli, with the ford vocabulary". Neither needed a new language.
  Eer: spoken('mittoli', 'eer'),
  Isareos: spoken('mittoli', 'isareos'),
  // Seventeen, from its own lore file's Language section: "Nethrani is an inner-branch
  // Mittoli variant, recognizable to any Standard Mittoli speaker, with a vocabulary shaped
  // by the basin environment and the flood tradition." Mittoli again, and no new language.
  Nethereum: spoken('mittoli', 'nethrani'),
});

/**
 * Where the hired company came from, and the tongue each of them grew up in. The
 * origins are the strings in `src/mercenaries.js`. This is who they are, and the
 * toggle may still show it, but it is no longer what they say to the traveler:
 * see `speaksTheContract` below. Cromb has no entry and will not get one — he is
 * a blank slate by decision (docs/design-answers.md), and the tongue he thinks in
 * is the traveler's, because by default he is the traveler.
 */
export const ORIGIN_LANGUAGE = freeze({
  Feradom: 'feradom',
  'the Izoli ports': 'izoli',
  'the Selemi coast': 'selemi',
  'the Marosh fens': 'maroshi',
  'the Pyrosi hills': 'pyrosi',
  Zorkys: 'kellith',
  'the southern islands': 'boueni',
  'no port he will name': 'cant',
  'nowhere he has said': 'ibnael',
});

/**
 * The language of the contract: the company's own working tongue.
 *
 * All eleven were hired abroad on the same contract and came here together, by the
 * same boats and roads, and a company that cannot talk to itself does not get as far
 * as the muster. So they have a tongue between them, and it is the one the traveler
 * thinks in. Whoever the player is, their own company is plain from the first minute;
 * it is the locals the traveler cannot follow, which is the whole point of the road
 * (docs/design-answers.md, "the company of eleven").
 *
 * `mercenaryById` knows the ten of the roster and Cromb — the whole company however
 * it is cast, because `companyFor(playerId)` is always ten of those eleven and the
 * eleventh is the player. So this needs no playerId and cannot go stale when the
 * player changes: whoever is standing in whichever slot, he is one of yours.
 *
 * Chris Gotwood is not special here any more. He still interprets the *locals* for
 * you while he is beside you (INTERPRETER), and when you are Chris nobody needs to.
 */
export const speaksTheContract = npc => Boolean(npc?.id && mercenaryById(npc.id));

/**
 * The Empire's own people speak Ambroni wherever they stand: soldiers, prefects,
 * clerks, the relay. A role matching one of these takes Ambroni over the region.
 */
export const IMPERIAL_ROLES = freeze(['legion', 'legionary', 'legion-officer', 'marshal', 'prefect', 'quartermaster', 'relay-clerk']);

/**
 * How much one tongue gives you of another, one hop only and never through a
 * third. Knowing Drentish at 60 puts a floor of 27 under Feradom: you catch the
 * shape of it without ever having heard it. The numbers come from the lore's own
 * account of the relationships, and are set out in docs/languages.md.
 */
export const KINSHIP = freeze({
  drentish: freeze({ feradom: .45, ambroni: .2 }),
  feradom: freeze({ drentish: .45, ambroni: .12 }),
  ambroni: freeze({ drentish: .2, feradom: .12, mittoli: .12 }),
  mittoli: freeze({ suvalen: .4, pyrosi: .3, ibnael: .35, ambroni: .12, boueni: .15 }),
  suvalen: freeze({ mittoli: .4, selemi: .25, koleth: .1 }),
  pyrosi: freeze({ mittoli: .3, kellith: .3 }),
  kellith: freeze({ pyrosi: .3 }),
  ibnael: freeze({ mittoli: .35 }),
  selemi: freeze({ suvalen: .25, izoli: .2 }),
  izoli: freeze({ selemi: .2 }),
  boueni: freeze({ mittoli: .15 }),
  koleth: freeze({ suvalen: .1 }),
  maroshi: freeze({}),
  cant: freeze({}),
});

/**
 * The Cant belongs to no country, so it takes its floor from everything you
 * have: a quarter of your best tongue. A traveler who has been anywhere
 * half-understands a quay, which is what a pidgin is for.
 */
export const CANT_SHARE = .25;

/**
 * What the traveler lands knowing. Nothing: he came on an Ambroni contract and
 * not one word of the contract's language, which is what Chris Gotwood is for.
 * Kept as a table so it can be tuned in one place without touching the rules.
 */
export const STARTING_PROFICIENCY = freeze(Object.fromEntries(LANGUAGE_IDS.map(id => [id, 0])));

/**
 * Chris Gotwood stepped off the traveler's boat with the Empire's letter and
 * enough of the local tongue to get two men up a road. While he is beside you he
 * interprets — the speaker's words as you hear them, and under that what they
 * meant — and you learn twice as fast for it. He knows three tongues and not the
 * world: past the heartland you are on your own.
 *
 * `range` is metres. `reached` is the phase at which he has finished walking
 * with anybody; a companion system can replace the predicate without touching
 * the rest of this.
 */
export const INTERPRETER = freeze({
  npcId: 'merc-gotwood', name: 'Chris Gotwood', knows: freeze(['ambroni', 'drentish', 'feradom']),
  range: 12, reached: 'mustered', bonus: 2,
  /** Which of the eleven he is, when the traveler is choosing who to be (src/player-characters.js). */
  playerId: 'gotwood',
});

/**
 * Who interprets for the traveler, given which of the eleven the traveler is: Chris Gotwood's
 * npc id, or **null when the traveler is Chris himself**. That is not a missing interpreter to
 * be worked around — it is the right answer. Chris is not in the world when he is the player,
 * and he does not need to be: the Ambroni is the traveler's own from the first step
 * (`startingLanguages` in src/player-characters.js). A host that looks the id up without asking
 * this first gets `undefined` and the same behaviour by accident, which is worse.
 */
export function interpreterFor(playerId) {
  return String(playerId ?? '').trim().toLowerCase().replace(/^merc-/, '') === INTERPRETER.playerId ? null : INTERPRETER.npcId;
}

/**
 * The key that shows a line the way it was actually said. Free: the road already
 * spends WASD, QE, Shift, Tab, Space, F, R, C, I, J, M, L, K, G, H, B and P.
 */
export const LINGUIST_KEY = 'KeyT';

/** The peddler's phrasebooks: the deliberate road, for anybody who would rather buy the words. */
export const PHRASEBOOK_ITEM = 'phrasebook';
export const PHRASEBOOK_PRICE = 14;
/** What one phrasebook is worth in exposure, whatever tongue it is for. */
export const PHRASEBOOK_EXPOSURE = 60;

/* ------------------------------------------------------------------ *
 * Names
 * ------------------------------------------------------------------ */

/**
 * The ordinary English inside Azhoran place names. "The Ruins of Rena" is Rena
 * and four English words; a sign in Drentish says Rena and four Drentish words.
 * Anything here translates; everything else in a charted name is a name.
 */
const GENERIC_IN_NAMES = freeze(new Set(['the', 'of', 'at', 'a', 'and', 'into', 'on', 'above', 'to',
  'ruins', 'field', 'camp', 'gate', 'crossing', 'bank', 'shore', 'headland', 'harbour', 'quarter',
  'northern', 'southern', 'western', 'eastern', 'north', 'south', 'east', 'west', 'long', 'low', 'old', 'new', 'great', 'little',
  'stone', 'stones', 'island', 'islands', 'rest', 'clearing', 'light', 'landing', 'hamlet', 'town', 'village', 'city',
  'stockade', 'downs', 'fold', 'springs', 'spring', 'beach', 'hills', 'hill', 'mouth', 'road', 'shoulder', 'stair',
  'narrows', 'link', 'cove', 'pasture', 'plain', 'woods', 'wood', 'bridge', 'pass', 'border', 'post', 'army',
  'burned', 'dry', 'cold', 'hearth', 'grey', 'sorrow', 'gull', 'scarp', 'saltings', 'lumber', 'birch', 'bramble',
  'waystation', 'roofless', 'quay', 'lake', 'river', 'sea', 'shepherds', 'reedcutters', 'charcoal', 'burners',
  'pilot', 'pilots', 'rise', 'relay', 'well', 'mill', 'farms', 'yard', 'orchard', 'wall', 'walls', 'valley',
]));

const nameTokens = text => text.split(/[^A-Za-z’']+/).filter(Boolean);

/**
 * Names the road letters that no chart records: a dyer and a wood in Tidehaven,
 * the shrine on the Rise, the wine attic in Solis, the places west of Ostel the
 * game has not built, and the eight grapes on the plates at Vaervelm Caelazh.
 * A grape is that grape in every language.
 */
export const EXTRA_NAMES = freeze(['Brandy', 'Frank', 'Koopwood', 'Stormfall', 'Mosskeeper', 'Saltwind',
  'Sava', 'Tharganhom', 'Kelmod', 'Mavren', 'Sareth', 'Vel', 'Westerina', 'Elodi',
  'Viognier', 'Chardonnay', 'Vidal', 'Blanc', 'Cabernet', 'Franc', 'Merlot', 'Petit', 'Verdot', 'Tannat', 'Norton']);

/**
 * Every name on the atlas that is a name and not a word: the regions, the
 * charted subregions, and the tongues themselves. A name is a name in every
 * language, so these pass through the renderer untouched wherever they stand,
 * including at the head of a sentence where capitalisation proves nothing.
 */
export const PLACE_NAMES = freeze(new Set([
  ...PLAYABLE_REGIONS.flatMap(nameTokens),
  ...SUBREGIONS.flatMap(area => nameTokens(area.name)),
  ...LANGUAGE_IDS.flatMap(id => nameTokens(LANGUAGES[id].name).concat(nameTokens(LANGUAGES[id].endonym))),
  ...EXTRA_NAMES,
].map(token => token.toLowerCase().replace(/’/g, "'")).filter(token => !GENERIC_IN_NAMES.has(token) && token.length > 2)));

/**
 * Words the game capitalises that are not names: a capital here proves nothing.
 * Everything else in the top ranks of the corpus is caught by rank in
 * src/linguist.js; these are the ones a capital would otherwise protect forever.
 */
export const NEVER_A_NAME = freeze(new Set(['i', "i'm", "i'll", "i've", "i'd", 'a', 'an', 'the', 'o', 'oh', 'no', 'yes']));

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

/** The tongue and dialect of a region, by the name `regionAt` gives. */
export function regionSpeech(regionName) {
  return REGION_LANGUAGE[regionName] ?? REGION_LANGUAGE.Drent;
}

/** The tongue somebody from `origin` grew up in, or null if the roster has not said. */
export const originLanguage = origin => ORIGIN_LANGUAGE[origin] ?? null;

/**
 * What a person speaks. An explicit `npc.language` wins; then a mercenary's
 * origin; then the Empire's own people, who speak Ambroni anywhere; then the
 * ground they are standing on.
 */
export function speechFor(npc, regionName) {
  if (speaksTheContract(npc)) return spoken(null);
  if (npc?.language && LANGUAGES[npc.language]) return spoken(npc.language, npc.dialect ?? null);
  const origin = npc?.origin ? originLanguage(npc.origin) : null;
  if (origin) return spoken(origin);
  if (npc?.modelRole && IMPERIAL_ROLES.includes(npc.modelRole)) return spoken('ambroni');
  return regionSpeech(regionName);
}

/**
 * What tongue each sign on the road is lettered in. Mostly the country it stands
 * in; the Empire's own furniture — the camp, the outpost, the stockade, the
 * orders nailed to it and the miles counted along its road — is Ambroni
 * wherever it stands, because the Empire laid it.
 *
 * A label with no entry letters in English. That is deliberate: a new sign put
 * up by somebody working elsewhere in the game reads plainly until whoever
 * knows the country says what it should say, rather than breaking the road.
 */
export const SIGN_LANGUAGE = freeze(Object.fromEntries([
  [spoken('drentish'), ['Tidehaven', 'Tidehaven Landing', 'The Greenway', 'Fernway Rest', 'The Caloss Gate', 'Village road',
    'Old Charcoal Hearth', 'The Bee Fold', 'Stormfall Oak', 'Mosskeeper’s Shrine', 'Fern Hollow', 'Saltwind Lookout',
    'The Avrel Clearing', 'Clearing mill & farms', 'Caloss Crossing', 'The Caloss Bridge', 'Avrel', 'Charcoal Burners',
    'The Forester’s Hut', 'The Wayside Shrine', 'The Timber Landing', 'Drent', 'The Ruins of Rena', 'Applegarth',
    'Rena', 'East Rena', 'Westerina', 'Brandy Frank, Dyer', 'The Koopwood']],
  [spoken('drentish', 'pueth'), ['The Tessen Bridge', 'Rimeholt']],
  [spoken('drentish', 'pebble'), ['Peblos', 'Cobble', 'The Quay']],
  [spoken('mittoli', 'luscian'), ['Luscia', 'Reedcutters’ Camp', 'Sava’s Shrine', 'The Waymarkers', 'The Lauvel Relay',
    'Quiet fishing bank', 'Return to bridge', 'The Lauvel', 'The Burned Hamlet', 'Nothom', 'The Stable Yard', 'Notices']],
  [spoken('mittoli', 'plain'), ['Moros Plain', 'The Moros Gate', 'The Shepherd’s Fold']],
  [spoken('mittoli', 'amodian'), ['Amod', 'Ostel', 'The Pass Stones', 'Kelmod & Mavren', 'Sareth-am-Vel']],
  [spoken('ambroni'), ['The Army Camp', 'The Moros Outpost', 'The Border Stockade', 'Orders', 'The Army Picket', 'Truce',
    'Ambron', 'Nemmel', 'The Stair', 'The Lake Shrine']],
  [spoken('koleth'), ['East Suval', 'Elod', 'The Elodi Frontier', 'Elod’s Border Post', 'Closed by Elod', 'The Elod Light']],
  [spoken('suvalen'), ['West Suval', 'Solis', 'The Gate of Sun Horses', 'The Coalition camp', 'The border stockade',
    'Tharganhom', 'The Suval Light', 'Vaervelm Caelazh',
    'Viognier', 'Chardonnay', 'Vidal Blanc', 'Cabernet Franc', 'Merlot', 'Petit Verdot', 'Tannat', 'Norton']],
  [spoken('izoli'), ['Izolveth', 'The Hearth Road', 'Ardveth', 'Kelvath Cove', 'The camp']],
].flatMap(([speech, labels]) => labels.map(label => [label, speech]))));

/** Signs letter in the local tongue until you can read it; one constant turns the whole of it off. */
export const SIGN_TRANSLATION = true;
/**
 * The proficiency at which the lettering on a sign turns into words you know.
 * A sign is three words with nobody standing beside it, so it is all or nothing
 * rather than the spectrum a spoken line gets — see docs/languages.md.
 */
export const SIGN_READING_LEVEL = 50;
