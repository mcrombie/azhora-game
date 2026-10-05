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
    dialects: ['luscian', 'plain', 'amodian', 'vastos', 'meneth', 'caricas', 'nesdor', 'eer', 'gala', 'avite', 'isareos', 'nethrani', 'lotharn', 'ovesos', 'mithali'],
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
    dialects: ['ganesh', 'plateau', 'haman', 'fogspeech'],
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
    dialects: ['west-pyrosi'],
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
    where: 'Telemonia: the Galmeth and Kethorn on its rock, the rim and the passes through it, and the translators at the border markets',
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
  // Gala's own name for it is the lore's: "several words ... that Galan has no independent term for".
  // The accent is the Lizeem valley's speech opened out toward the coast: a closing -oss softened to -os
  // as the Iberos commercial speech has it, and a -th- let go to -t- in the Avite way.
  gala: dialect('gala', 'Galan', 'mittoli',
    'A Mittoli-derived mainland dialect, related to the speech of the Lizeem valley upstream and distinct from Nylon’s coastal variant across the river, leavened with every contact the country has sustained: Avite borrowings in its legal and administrative registers — tribute, garrison, the protocols of royal acknowledgment, and words for kinds of military obligation it had no need of before — and Iberos Sea vocabulary in the maritime and commercial ones. Its names for rivers, inlets and soils are from an older layer than Mittoli, and so is the name Gala.',
    word => word.replace(/oss$/, 'os').replace(/th/, 't')),
  // The Avites of the Ascarth Peninsula. The lore names their speech as a tongue of its own - the
  // southern cities "speak a dialect of Avite that the northern cities consider archaic" - and gives it
  // no family, no grammar and no words beyond a handful of glosses (*veth*, the rememberers;
  // *Thareveth*, the wine god in the epics), and the World Builder has no Avite naming profile. So it
  // is not invented here: it is carried as an accent of Mittoli, the tongue of Gala next door, whose
  // own lore says Avite borrowings sit in its legal and administrative registers, until the lore gives
  // Avite a family. The accent is the one sound every Avite word the lore has shares, the hard *-th*
  // close - Ascarth, veth, Thareveth - and a *v* where Mittoli has a *b*. It coins nothing.
  avite: dialect('avite', 'Avite', 'mittoli',
    'The speech of the Ascarth Peninsula, a tongue of its own that the lore has never catalogued, heard here through the Mittoli of the mainland it trades with: hard at the close, *-th* where Mittoli ends soft, and old enough in the south of the peninsula that the north calls it archaic. What the epics say in it is for the *veth*, the rememberers, to say.',
    word => word.replace(/b/, 'v').replace(/([aeiou])l$/, '$1th')),
  isareos: dialect('isareos', 'Isareos Mittoli', 'mittoli',
    'The western-interior Mittoli of the valley heads: unstressed syllables compressed, Elagosi loanwords kept in the formal registers of dispute and contract, and above all **the ford vocabulary** — single terms for water heights and crossing conditions that Standard Mittoli needs a compound for, and which grows every season anybody tries to finish writing it down.',
    word => word.replace(/os$/, 'eos').replace(/([aeiou])([bcdfgklmnprstvz])([aeiou])\2/, '$1$2$3')),
  nethrani: dialect('nethrani', 'Nethrani', 'mittoli',
    'An inner-branch Mittoli variant, plain to any Standard speaker, whose whole distinctive vocabulary is the flood: *nethvel*, "the return of the deep water", against *nethmorr* for one that exceeds its bounds and *nethgell* for one that fails to come; *haethoss*, the reliable line a family builds above; *nethoss*, the deep basin, used of any situation that cannot get worse. It borrows the Pyrosi elevated register *kael-* for the Flood Recall alone, which linguists find remarkable and the Nethrani explain by saying the flood has the standing of the land.',
    word => word.replace(/e([bcdfgklmnprstvz])/, 'eh$1')),
  lotharn: dialect('lotharn', 'Lotharn valley Mittoli', 'mittoli',
    'Mittoli-derived valley speech, recognisably the family and a little different in every valley, over an older substrate that is most of the place names - Kemrath, Olveth - and some of the craft terms of the mines, and that resists every Mittoli root. The pass inns speak a mix of it with the Plains languages and the Iberos trade vocabulary.',
    word => word.replace(/v/, 'w').replace(/([aeiou])th$/, '$1rth')),
  // Ovesos, and with it the Oves Desert. ovesos.md's Language section names it outright —
  // "Inner-branch Mittoli. A variant of Standard Mittoli fully intelligible to any downstream speaker,
  // differing in vocabulary for valley terrain, water administration, and the specific practices of
  // the branch-country environment" — so it is Mittoli and no new tongue is invented. What is
  // distinctive is all water: *oves*, the lower valley; *thris-kael*, the inner tributary;
  // *vel-sorten*, the bottomland allocation; *osk-milis*, water-right seniority, which the lore says
  // has no clear etymology in Standard Mittoli and may predate it. The accent is the *-os* collective
  // the country's own name ends in, and the *thr-* cluster its legal vocabulary is full of.
  //
  // **The Oves Desert has no speech of its own**, and that is the lore's position rather than a gap:
  // oves_desert.md gives the country no language section at all, and everybody who is ever in it is
  // from somewhere else — the Ovesos pastoral communities in wet years and the Telemon bands on the
  // southern routes. So it is carried as Ovesos's, which is whose water-right claim it is.
  ovesos: dialect('ovesos', 'Inner-branch Mittoli', 'mittoli',
    'A variant of Standard Mittoli plain to any downstream speaker, whose whole distinctive vocabulary is water and who may use it: *oves*, the lower valley where hill country opens into farming ground and the root the country\u2019s own name is built on; *thris-kael*, "the returning inside water", the inner tributary, used in writing to Minora and never between neighbours; *vel-sorten*, the division of flood-renewed bottomland among farming claims; and *osk-milis*, water-right seniority, old enough to appear in the oldest land records and with no clear etymology in Standard Mittoli at all. Its legal speech runs to the genealogical where Minora\u2019s runs to the measured, and its submissions to the Branch Court are twice as long as anybody else\u2019s.',
    word => word.replace(/oss$/, 'os').replace(/th/, 'thr')),
  // **The Mithala plain, all four countries, one dialect** (src/mithala-world.js). mithala.md's
  // Language section names it: "The Mithali dialects are Mittoli in family - the grammar, the core
  // vocabulary, the fundamental structure are recognizable to a speaker of Standard Mittoli - but
  // old enough in their divergence to cause significant comprehension problems in rapid speech. A
  // Caeras valley merchant and a Mithala channel farmer can communicate slowly and carefully; in
  // casual speech at ordinary speed they often cannot." So it is Mittoli and no new tongue is
  // invented - but it is the most divergent Mittoli in the game, and the only one that is hard to
  // follow at speed rather than merely marked.
  //
  // **One dialect for the four countries, and dividing it by country would be inventing a division
  // the lore denies.** "Mithala people do not generally call themselves Mithala people; they call
  // themselves people of the Olveth Arm or the Minoran plain or whichever river-section describes
  // their actual location... your identity is your channel, because your channel is your flood
  // timing, your water rights, your grain calendar, your neighbors." The divisions here are
  // channels, which run across all four borders and none of which is a country; a per-country
  // dialect would cut the plain the one way its own people never cut it. It is the same argument the
  // West Lotharn made for sharing the East's: the lore's unit is not the map's.
  //
  // What is distinctive is **the sky and the flood**, and both are the lore's own: "The astronomical
  // and meteorological vocabulary in the Mithala dialects is extensive and specific. There are terms
  // for sky conditions that Standard Mittoli must describe in phrases - kinds of cloud at specific
  // heights, kinds of evening color that indicate specific weather patterns, the appearance of
  // certain stars in specific positions at specific seasons." The two words written down anywhere
  // are *moravel*, "the grain-attention", for a period of outside interest in the harvest, and the
  // proverb *Vet mithalan, vel noreth* - "the flood returns, the grain does not ask".
  mithali: dialect('mithali', 'Mithali', 'mittoli',
    'The most divergent Mittoli anybody still calls Mittoli: the grammar and the core vocabulary are Standard, and at ordinary speed a Caeras merchant and a channel farmer cannot follow one another. Its weight is in two places. **The sky**, because on a plain with nothing to interrupt it the western horizon tells you about the next three days, and there are single terms here for cloud at a stated height, for kinds of evening colour and for a star in a stated place in a stated season that Standard Mittoli needs a phrase for; the continent’s oldest astronomy came out of them and cannot be read without them. **And the flood**, whose calendar is kept in parallel with the astronomical one and causes steady friction with anybody administering by the other: *moravel*, "the grain-attention", said of a period of outside interest in the harvest with resigned familiarity rather than alarm, and the proverb every variant of which says the same thing - *Vet mithalan, vel noreth*, "the flood returns, the grain does not ask". The name *Mithala* itself is older than Mittoli and does not decompose in it.',
    word => word.replace(/ae/, 'a').replace(/([aeiou])l$/, '$1ln').replace(/^th/, 't')),
  // **The southwestern block** (src/southwest-world.js): two dialects over four countries, and the
  // first tongue in the west whose profile is actually in the World Builder
  // (`world-builder/azhoran_language_profiles.py` has `pyrosi` where it has no Mithali, no Ovesi and
  // no Lothi), so the Pyrosi lexicon above is authored rather than derived.
  //
  // **Navarth and West Pyros speak Pyrosi**, and the tongue entry above already draws the line this
  // dialect is: "West Pyrosi is formal and layered, and encodes social relationship in the verb in
  // a way that gives Mittoli speakers continuous trouble: the politeness registers are not
  // optional." pyros.md adds that the people of West Pyros "speak a dialect that mixes Mittoli
  // grammar with Pyrosi vocabulary in roughly equal measure", which is what the twist does here.
  //
  // **Navarth is not given a dialect of its own**, and that is the lore's own position rather than
  // a gap. navarth.md makes Navarth's distinctiveness ceremonial and economic and never linguistic:
  // its whole project is keeping the heartland's practice exactly - "they keep better ceremonial
  // records. They send more practitioners to the heartland training centers. They are more
  // scrupulous, in formal terms, about the correct conduct of the fire ceremonies than communities
  // that have live fumaroles to improvise around." A community that scrupulous about the centre's
  // forms is not the community that lets its speech drift, and the pilgrimage traffic to the great
  // western sites keeps the contact continuous. It is the argument the West Lotharn made for
  // sharing the East's dialect.
  'west-pyrosi': dialect('west-pyrosi', 'West Pyrosi', 'pyrosi',
    'The formal half of Pyros: Pyrosi vocabulary on grammar that is half Mittoli, with politeness registers that are not optional and that a Mittoli speaker gets wrong for years without being told. Its ordinary speech is layered with the volcanic lexicon even where there is no volcano — *pyross*, the ash, is the word for good soil, and a Navarth farmer uses it of ground that has never seen any — and the fire-ceremony vocabulary is common property rather than priestly, so a dispute over a boundary and a dispute over a rite are argued in the same words. Navarth speaks it a little slower, a little more carefully, and with the ceremonial forms kept more exactly than the heartland keeps them.',
    word => word.replace(/oss$/, 'ossel').replace(/^pyr/, 'pyrr')),
  // **The Ganesh Plain and the Ganesh Desert speak the contact speech of the junction.**
  // ganesh_plain.md is explicit that the plain is not one people and never has been: "Moreshi-speaking
  // groups whose traditions are continuous with the broader desert pastoral traditions... Mittoli-speaking
  // groups from the north whose seasonal range extends south into the plain in good years; and
  // communities whose mixed linguistic and cultural character reflects generations of contact
  // between these two traditions at the plain's geographic midpoint. This linguistic diversity is
  // not a recent development." A single `spoken()` line cannot say "two families meet here", so the
  // dialect says it: Moreshi in the frame, because the desert side is Moreshi and the caravan
  // vocabulary is, with the Mittoli half carried in the twist and in the note.
  //
  // **The Ganesh Desert has no speech of its own**, which is the same finding the Oves Desert gave:
  // ganesh_desert.md has no language section at all, and says outright that the country "is crossed
  // but not, in the full sense, inhabited" - the waystation families "are defined by their function
  // on the route rather than by the desert as their home territory". So it carries the plain's,
  // whose pastoral communities come down into it in the wet years. And the one word the desert does
  // own is a word nobody can parse: "Ganesh" is pre-Moreshi, the G-N-Sh sequence "does not
  // correspond to any known root in the standard triconsonantal inventory", and the lore's
  // conclusion is that "whoever named this desert named it in a way that no current language on the
  // peninsula can explain."
  ganesh: dialect('ganesh', 'the Ganesh contact speech', 'maroshi',
    'Not a dialect of one language so much as the seam between two: Moreshi in its frame and its whole caravan vocabulary, with Mittoli grammar showing through wherever the speaker’s people came down from the north, and households at the plain’s midpoint in which the older generation and the younger one do not agree which language they are speaking. What it is rich in is terrain at a scale no map records - the names of the depressions and the shallow channels and the springs, and the names of the specific plants that say how deep the water is under a given piece of ground, which is knowledge that only transmits by walking the routes with somebody who has them. Its one unparsable word is the country itself: *Ganesh* is older than Moreshi and no living language on the peninsula can decompose it.',
    word => word.replace(/aa/, 'a').replace(/([bcdfghklmnprstvz])$/, '$1ah')),
  highland: dialect('highland', 'the highland Izoli', 'izoli',
    'Conservative where the coastal towns have moved on, and carrying shrine-keeping vocabulary the towns do not have and the tribes do not translate.',
    word => word.replace(/([bcdfgklmnprstvz])$/, '$1$1')),
  // **The Dinelv plateau's Moreshi**, and it is the most closely described dialect in the whole archive.
  // `dinelv_highlands.md`: "These communities are Moreshi-speaking, but their dialect sits closer to the
  // canyon communities' speech than to the Coastal Trade Moreshi of the city. The [r]/[ʀ] distinction
  // that the canyon traditions maintain is preserved in the highland dialect; the specific lexical
  // contrasts that the distinction marks in canyon Moreshi are present in the highland speech, though
  // with different distribution. Coastal Maroshi scholars who have studied the highland dialect classify
  // it as transitional between canyon and coastal registers, which is accurate as a description and
  // tells one nothing about how the highland speakers understand their own speech."
  //
  // It is called `plateau` and not `highland` because `highland` is already the Izoli one above. The
  // transform doubles the r, which is the one sound change the lore actually specifies.
  plateau: dialect('plateau', 'the plateau Moreshi', 'maroshi',
    'The speech of people who were on the plateau before the city below it was administered and expect to be there after: Moreshi with the canyon country’s [r]/[ʀ] distinction kept where the coast has let it go, and the lexical contrasts that distinction marks still doing work, though not always the same work the canyons give them. Coastal scholars file it as transitional between canyon and coastal registers, which describes it and says nothing about how it is understood by the people speaking it. What it is rich in is stone and water: the kinds of bed in an escarpment and which of them will bear a load, and the names of the water points, in an order that is also a route and a season. The garrisons at the passes do not learn it, and their commanders’ reports say so without noticing that they are saying it.',
    word => word.replace(/r/, 'rr').replace(/aa/, 'a')),
  // **Hama's merchant dialect**, which `hama.md` names in its own tags and describes at length: "Hama's
  // merchant dialect is a further-evolved form of Maroshi that has diverged specifically in its
  // commercial and legal registers... developing compound roots and novel Form VIII reflexive
  // constructions for specific contract conditions that do not occur in standard Coastal Trade
  // correspondence. A treaty drafted in formal Haman commercial Moreshi requires a specialist to
  // interpret if the reader's background is standard Dinelv administrative Moreshi."
  //
  // **The register the lore is about belongs to the Council of Merchant Houses and is not built.** What
  // the dialect is here is the speech of the corner - the ordinary words of a green two hexes with an
  // ocean on each side of it - and its famous contract grammar is named and left where it belongs.
  haman: dialect('haman', 'the Haman merchant speech', 'maroshi',
    'Coastal Trade Moreshi pushed further than the coast has pushed it, and pushed in one direction only: the derived stem forms that let a Moreshi contract say exactly which obligation falls when have been extended here into compound roots and reflexive constructions that no other Moreshi correspondence uses, and the Dinelv court has kept specialist translators for Haman documents since the early archives. Outside a contract it is ordinary enough - the words for the two winds, the words for the state of the sward in a dry winter, and a whole vocabulary for weather that arrives having crossed an ocean. The seven houses whose registers made it what it is, and every treaty in it, are theirs.',
    word => word.replace(/at$/, 'aat').replace(/ii/, 'i')),
  // **The transition zone's contact register, and it has a grammatical category no other language in
  // Azhora has.** `trogo.md`: "One feature of the transition language that has drawn attention: it has a
  // grammatical category that neither Moreshi nor any Azhoran mainland language possesses - a verb aspect
  // marking actions that are conditional on the current state of the fog. Whether the fog is present or
  // not changes the form of certain verbs describing movement, visibility, and resource access. The
  // category is semantically precise and grammatically regular, which means it was not invented recently.
  // It names a distinction that is genuinely important to people whose decisions depend on whether the fog
  // wall is up. The canyon Moreshi find it unnecessary. The coastal forest people find it imprecise."
  //
  // **It is filed as a dialect of Maroshi and that is a compromise the comment has to own.** Half of what
  // this register is made of is canyon Moreshi and the other half is the forest language of the mid-slope
  // and the coast, "whose ancestry does not trace to the Moreshi tradition and whose language belongs to
  // neither the Moreshi family nor any Azhoran mainland family that has been classified". That second half
  // is not in `LANGUAGES` and inventing a tongue for it is not a builder's decision - so this entry is
  // the half that has a parent, the way Cape Heth carries plain Maroshi as a stand-in (job 3), and the
  // forest peoples' own tongue is an open question for whoever builds them. Filing it under Moreshi is
  // exactly the Maroshi court's own mistake, which the lore is dry about, and it is named here so that
  // nobody mistakes it for a finding.
  //
  // The transform is the fog aspect itself, made audible on one class of verb: a movement word takes a
  // -zh when the fog is up. Nothing in the game asks yet.
  fogspeech: dialect('fogspeech', 'the fog speech', 'maroshi',
    'The register of the people who live where the desert stops and the forest starts, and it is made of both: canyon Moreshi roots on a grammar that has taken enough from the forest language below it to have a shape of its own. What it has that nothing else in Azhora has is an aspect for the fog - every verb of going, seeing or fetching takes one form while the fog wall is up and another while it is down, and the distinction is regular, old and not optional. The canyon speakers upriver call it unnecessary and the forest speakers downslope call it imprecise, and the people who use it find both complaints unsurprising. What it is rich in is the state of a way: which gullies are walkable this week, how far a thing can be seen, which resin is running. The three peoples whose arrangements it carries, and every one of those arrangements, are theirs.',
    word => word.replace(/([aeiou])n$/, '$1zh').replace(/uu/, 'u')),
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
  // "The language of West and South Suval is a variety of the Iberos coastal contact language"
  // (suval.md): the same tongue as Solis. The lore adds that "the South Suval fishing dialect is
  // more conservative", and there is no dialect of it to name, so none is invented here.
  'South Suval': spoken('suvalen'),
  'West Izol': spoken('izoli'),
  'East Izol': spoken('izoli'),
  'Alezhor': spoken('ibnael'),
  'South Ibenal': spoken('ibnael'),
  'North Ibenal': spoken('ibnael'),
  'Henborth': spoken('mittoli'),
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
  // Twenty-one, from its own lore file's Language section: "Gala speaks a Mittoli-derived mainland
  // dialect — related to the speech of the Lizeem valley communities upstream". Mittoli again, with the
  // lore's own name for the dialect, and no new language.
  Gala: spoken('mittoli', 'gala'),
  // Seventeen, from its own lore file's Language section: "Nethrani is an inner-branch
  // Mittoli variant, recognizable to any Standard Mittoli speaker, with a vocabulary shaped
  // by the basin environment and the flood tradition." Mittoli again, and no new language.
  Nethereum: spoken('mittoli', 'nethrani'),
  // From the Lotharn lore's Language section: "The valley peoples speak Mittoli-derived
  // languages... but each valley has had enough isolation to develop distinctive features", over
  // "an older system... most visible in place names". One dialect for the range; its valleys'
  // own differences are for the day there are people in them to speak.
  'East Lotharn Mountains': spoken('mittoli', 'lotharn'),
  // Twenty-seven, and **the same dialect**: the West Lotharn is the same range and the same valley
  // people, and the lore's own unit is the range - "the sum total of Lotharn dialect variation is
  // wider than the variation between any two standard regional Mittoli dialects", which makes the
  // valleys the divisions and not the halves. If anything the West is the deeper half of the two:
  // the atlas gives it no pass and no road, where the East has both, and "the deepest valley
  // communities, those with the least external contact, preserve the most substrate". That is a
  // note about the same dialect, not a second one, and a second one would need words nobody has
  // written down.
  'West Lotharn Mountains': spoken('mittoli', 'lotharn'),
  // Twenty-eight to thirty-one: the four Mithala countries, and **one dialect across all four**, for
  // the reason given at `mithali` above - the lore's own divisions on this plain are channels and
  // not countries, and the channels cross every one of the four borders.
  'South Mithala': spoken('mittoli', 'mithali'),
  'West Mithala': spoken('mittoli', 'mithali'),
  'East Mithala': spoken('mittoli', 'mithali'),
  'North Mithala': spoken('mittoli', 'mithali'),
  // Celder speaks the upper plain's Mittoli (celder.md, Language); no dialect of its own is drawn yet.
  'South Celder': spoken('mittoli'),
  'North Celder': spoken('mittoli'),
  // Feradom speech, the Drentish of the domain country, which already had its entry above
  // for the company's men who came from there.
  Feradom: spoken('feradom'),
  // Iscare's lore describes the Iberos coastal trade contact language. Use its existing
  // coastal relative until Iscari vocabulary is authored, rather than inventing a tongue.
  'Iscare Archipeligo': spoken('suvalen'),
  // Twenty-two and twenty-three, the Ascarth Peninsula: the Avites' speech (the `avite` entry above
  // says why it is an accent of Mittoli and not a tongue of its own yet). One entry for both halves;
  // the south's archaic form is the lore's and has no words to give it, so none is invented.
  'Northern Ascarth': spoken('mittoli', 'avite'),
  'Southern Ascarth': spoken('mittoli', 'avite'),
  // Twenty-five and twenty-six. ovesos.md: "Inner-branch Mittoli. A variant of Standard Mittoli fully
  // intelligible to any downstream speaker." Mittoli again, and no new tongue. The Oves Desert has no
  // speech section in its own lore file and nobody in it who is from it, so it takes Ovesos's — whose
  // Water Council claims the desert margin — and nothing is coined for it.
  Ovesos: spoken('mittoli', 'ovesos'),
  'Oves Desert': spoken('mittoli', 'ovesos'),
  // Thirty-two to thirty-five, the southwestern block (src/southwest-world.js). navarth.md: "Navarth
  // is Pyrosi in affiliation, in cultural practice, in self-identification"; pyros.md gives West
  // Pyros the dialect that "mixes Mittoli grammar with Pyrosi vocabulary in roughly equal measure".
  // The two Ganesh countries take the contact speech of the language junction the plain sits on, and
  // the desert takes the plain's because it has none and no lore section to give it one. See the
  // dialect notes above for the whole argument.
  Navarth: spoken('pyrosi', 'west-pyrosi'),
  'West Pyros': spoken('pyrosi', 'west-pyrosi'),
  'Ganesh Plain': spoken('maroshi', 'ganesh'),
  'Ganesh Desert': spoken('maroshi', 'ganesh'),
  // Thirty-six to thirty-nine, the four Meroshe deserts. **Plain Maroshi, and no dialect, and that is
  // a decision rather than a gap.** moroshe_desert.md is emphatic that the desert peoples' own speech
  // is the centre of this family and not a margin of it - "the desert languages are related to each
  // other but not to the Mittoli family at all... a completely separate linguistic lineage that
  // predates any contact with the western continent" - and the tongue entry above already says which
  // end of Maroshi that is: "the court form is a dialect of Coastal Trade Moreshi; the deep-desert
  // forms are the conservative ones."
  //
  // A dialect in this file marks a deviation from a centre. Both Maroshi dialects available are
  // margins - the coastal court form the base tongue carries, and `ganesh`, the northern contact seam
  // where Moreshi meets Mittoli on the Ganesh Plain - and the Meroshe is neither. So the four
  // countries the atlas names after the desert itself speak the tongue without a twist on it, and the
  // Ganesh Desert keeps `ganesh` because its own lore gives it to the plain's people rather than to
  // the desert's. It is the argument Navarth got for sharing West Pyros's dialect, run the other way.
  //
  // **Nothing is coined.** The one Moreshi word this job uses is *malhat*, `maroshi.roots.salt`
  // above, for the salt pan in the West Meroshe (src/southwest-world.js, `MEROSHE_SALT`) - the
  // tongue's own word taken as a name, exactly as job 1 took *vaellir* from the Pyrosi lexicon for
  // the river. The lore's own note on what "Moroshé" means is worth keeping in view while reading
  // any of this: the Mittoli rendering is variously translated as "the wide nothing", "the place of
  // patient waiting" or, in the oldest dialect still spoken in the deep interior, simply "home".
  'North Meroshe Desert': spoken('maroshi'),
  'West Meroshe Desert': spoken('maroshi'),
  'Central Meroshe Desert': spoken('maroshi'),
  'South Meroshe Desert': spoken('maroshi'),
  // Forty to forty-two, the block's western edge (src/southwest-world.js). **Two new dialects and one
  // adjustment, and all three are the lore's own words rather than a builder's guess.**
  //
  //  - **Cape Heth is the adjustment, and the lore states the problem itself.** `cape_heth.md` is at
  //    pains to say who these people are *not*: "They are not related by language or cultural tradition
  //    to the Boueni, despite the cape's position at the cold-current margin; they are a southwestern
  //    Azhoran coastal people, related by language and material culture to the communities of the
  //    Alezhor coast and Ibenale to the north." So the tongue wanted here is the Alezhor coast's - and
  //    the Alezhor coast is not built, has no lore file of its own and has no entry in `LANGUAGES`. The
  //    rule this table sets for that case is to "map it to the nearest one the lore itself calls its
  //    parent or its neighbour and say so in the comment rather than inventing a language". The lore
  //    names two neighbours and the atlas names two more: Alezhor and Ibenale to the north, which are
  //    unbuilt, and the Ganesh Desert and the Dinelv Highlands to the east, which are built and speak
  //    Moreshi. Alezhor is the Ganesh Desert's own northern neighbour and its water crosses the desert;
  //    the Pyrosi profile is the only other western tongue within reach, and `pyrosi` belongs to the
  //    hill empire and not to this coast. So the cape carries **plain Maroshi with no dialect** - the
  //    nearest built speech, marked as a stand-in here rather than as a finding - and `boueni` is
  //    explicitly *not* used, because the file it would have come from spends four paragraphs saying it
  //    would be wrong. Whoever builds Alezhor or Ibenale should revisit this line first.
  //  - **The Dinelv Highlands get `plateau`**, which the lore describes in more detail than it gives any
  //    other dialect in the archive, down to a named phonemic contrast.
  //  - **Hama gets `haman`**, which the lore names in its own tags as the "merchant dialect" and
  //    describes in a paragraph of its own.
  'Cape Heth': spoken('maroshi'),
  'Dinelv Highlands': spoken('maroshi', 'plateau'),
  Hama: spoken('maroshi', 'haman'),
  //  - **Marosh gets plain `maroshi`, and for once that is the reading and not the stand-in.** Every other
  //    Moreshi-speaking country in this block carries a dialect because it is a margin of the language;
  //    this one is the centre of it. `marosh.md`: "The court language is Maroshi, a dialect of Coastal
  //    Trade Moreshi - the triconsonantal-root language family that descends from the older Moreshi spoken
  //    across the desert interior... Maroshi is its eastern-coast peninsular form." Marosh *is* the
  //    eastern coast of the peninsula: twenty of its hex edges are the Iberos and the lore puts the court
  //    at Dinelv on this shore. A dialect marks a deviation from a centre and there is no deviation to
  //    mark. It is the argument job 2 gave the Meroshe for speaking the tongue with no twist on it, run
  //    from the other end of the same language.
  //  - **Trogo gets `fogspeech`**, the transition zone's contact register, whose fog-conditional verb
  //    aspect is the single best piece of language in the archive. It is filed under Moreshi because half
  //    of it is Moreshi and the other half has no tongue in this file; the dialect's own comment says so,
  //    and the forest peoples' unclassified language is an open question rather than a gap.
  Marosh: spoken('maroshi'),
  Trogo: spoken('maroshi', 'fogspeech'),
  // The island of Selemis, after everything above. **Selemi, and no dialect** - and this is the first country built
  // whose tongue was in this file before its ground was. `selemi` has been here since the company was
  // (Kristen is "of the Selemi coast"), with its endonym Selanoc and its lexicon, and its own `where`
  // says "Selemis and every Selemi outpost": this is the Selemis in that sentence. Neither lore file
  // for the island has a Language section. What they do have is that the Selemi "have been absorbing
  // foreign vocabulary... for long enough that the question of what is originally Selemi culture is
  // genuinely difficult to answer" (the_selemi.md), and from the other side that Sorveth's commercial
  // register "has absorbed vocabulary from Selemi" (suval.md) - so it is a tongue of its own that both
  // lends and borrows, which is what the entry above already says of it. A dialect in this table
  // marks a deviation from a centre, and the island is the centre.
  Selemi: spoken('selemi'),
  // Telemonia, the Telemon highland (stage 1, docs/telemonia-stage1-brief.md). **Kellith, and no dialect.** The lore
  // names it outright: "They speak their own language - Kellith, in their own name for it" (telemonia.md, the_telemon.md),
  // unstudied because outside linguists have not been let in, and spoken to outsiders only through the
  // border-market translators. The tongue has been in this file since the company was hired; its `where` used to
  // say "Zorkys among them", which is Matt's home and is not in Telemonia, and now says Telemonia. Matt's own
  // tongue (`ORIGIN_LANGUAGE`, below) is left as it was: it changes in a later job.
  Telemonia: spoken('kellith'),
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
 * Chris Scotwood is not special here any more. He still interprets the *locals* for
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
 * not one word of the contract's language, which is what Chris Scotwood is for.
 * Kept as a table so it can be tuned in one place without touching the rules.
 */
export const STARTING_PROFICIENCY = freeze(Object.fromEntries(LANGUAGE_IDS.map(id => [id, 0])));

/**
 * Chris Scotwood stepped off the traveler's boat with the Empire's letter and
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
  npcId: 'merc-gotwood', name: 'Chris Scotwood', knows: freeze(['ambroni', 'drentish', 'feradom']),
  range: 12, reached: 'mustered', bonus: 2,
  /** Which of the eleven he is, when the traveler is choosing who to be (src/player-characters.js). */
  playerId: 'gotwood',
});

/**
 * Who interprets for the traveler, given which of the eleven the traveler is: Chris Scotwood's
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
  [spoken('drentish'), ['Tidehaven', 'Tidehaven Landing', 'The Greenway', 'Fernway Rest', 'Village road',
    'Old Charcoal Hearth', 'The Bee Fold', 'Stormfall Oak', 'Mosskeeper’s Shrine', 'Fern Hollow', 'Saltwind Lookout',
    'The Avrel Clearing', 'Clearing mill & farms', 'Caloss Crossing', 'The Caloss Bridge', 'Charcoal Burners',
    'The Forester’s Hut', 'The Wayside Shrine', 'The Timber Landing', 'Drent', 'The Ruins of Rena', 'Applegarth',
    'Rena', 'East Rena', 'Westerina', 'Brandy Frank, Dyer', 'The Koopwood']],
  [spoken('drentish', 'pueth'), ['The Tessen Bridge', 'Rimeholt']],
  [spoken('drentish', 'pebble'), ['Peblos', 'Cobble', 'The Quay']],
  [spoken('mittoli', 'luscian'), ['Luscia', 'Reedcutters’ Camp', 'Sava’s Shrine', 'The Waymarkers', 'The Lauvel Relay',
    'Quiet fishing bank', 'Return to bridge', 'The Lauvel', 'The Burned Hamlet', 'Nothom', 'The Stable Yard', 'Notices', 'Elagos', 'Port Calos']],
  [spoken('mittoli', 'plain'), ['Moros Plain', 'The Moros Road', 'The Shepherd’s Fold']],
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
