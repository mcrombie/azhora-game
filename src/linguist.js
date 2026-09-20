/**
 * Linguist: what the traveler understands of what is said to him.
 *
 * He lands knowing nothing. Not one word of Ambroni, which is the language of
 * the contract he came on, and nothing at all of Drentish, which is what the
 * village speaks. Every line anybody says to him arrives in their own tongue,
 * and the only reason the first hour of the game is followable is that Chris
 * Gotwood stepped off the same boat, has enough of the local speech to get two
 * men up a road, and stands close enough to say what it meant.
 *
 * Then it is exposure. Every line heard in a tongue teaches a little of it,
 * less each time from the same mouth, and what you have heard is what you
 * understand. That is one number per tongue, 0 to 99, and the whole of the
 * rendering hangs off it:
 *
 *   - the commonest words of this game's own speech come first, in the order
 *     `src/word-frequency.js` counted them, so twenty means you read the
 *     scaffolding — "The … and … you … road …" — and the sense arrives before
 *     the words do;
 *   - how much of a line is English is `comprehension(level)`, a curve that is
 *     nearly nothing at first and reaches all of it only at 99;
 *   - a name is a name in every language, and so are numbers and punctuation;
 *   - a word once known stays known, because knowing is by rank and not by
 *     chance.
 *
 * The *linguist* skill is the traveler's own, on the 99-level table with the
 * rest of them, and it is fed by the same exposures: a little for every line,
 * much more for every level any single tongue climbs. Level 99 in the skill is
 * about what it says on the tin — every tongue in Azhora, carried to fluency.
 *
 * Nothing here is a puzzle. The player's own words are always English, and so
 * are the quest panel, the journal and every toast: those are his own notes.
 * What changes is only what other people sound like. Pure: no DOM, no three.
 */
import {
  LANGUAGES, LANGUAGE_IDS, DIALECTS, KINSHIP, CANT_SHARE, STARTING_PROFICIENCY,
  PLACE_NAMES, NEVER_A_NAME, INTERPRETER, PHRASEBOOK_EXPOSURE, SIGN_READING_LEVEL, SIGN_TRANSLATION,
  regionSpeech, speechFor, wordIn,
} from './languages.js';
import { FREQUENT_WORDS, WORD_TALLIES, CORPUS_WORDS } from './word-frequency.js';

export const LINGUIST_VERSION = 1;
export const LINGUIST_SKILL = 'linguist';
/** Every tongue is capped where every other skill is capped. */
export const MAX_PROFICIENCY = 99;

/* ------------------------------------------------------------------ *
 * How much of a line you understand
 * ------------------------------------------------------------------ */

/**
 * The fraction of the running words in a line that reach you in English, at
 * proficiency `level`. Smoothstep on level/99: almost nothing for the first
 * twenty, most of the ground between forty and eighty, and the whole of it only
 * at 99, because the last words anybody learns are the ones nobody says twice.
 */
export function comprehension(level) {
  const t = Math.min(1, Math.max(0, level / MAX_PROFICIENCY));
  return t * t * (3 - 2 * t);
}

/**
 * Running-text coverage by rank: what share of everything said in this game the
 * commonest `n` words account for. The ten commonest are a quarter of it; the
 * first hundred are half. This is the ladder a learner climbs, and it is why
 * twenty per cent of a line is readable rather than random.
 */
const COVERAGE = (() => {
  const table = new Float64Array(FREQUENT_WORDS.length);
  let running = 0;
  for (let i = 0; i < FREQUENT_WORDS.length; i++) { running += WORD_TALLIES[i]; table[i] = running / CORPUS_WORDS; }
  return table;
})();

/** Where a word stands in the game's own talk, and 1 — the last thing learned — for a word it never counted. */
const RANK = new Map(FREQUENT_WORDS.map((word, index) => [word, index]));
/**
 * What share of everything said you must already understand before this word is
 * the next one you learn. The commonest word of all costs nothing, so the first
 * level of a tongue is worth something; the words nobody repeats cost the lot.
 */
const costOf = word => { const rank = RANK.get(word); return rank === undefined ? 1 : rank === 0 ? 0 : COVERAGE[rank - 1]; };

/**
 * Words the game says so often that a capital letter on one proves nothing
 * about it: at the head of a sentence, after a dash, in a shout. Anything
 * rarer than this, capitalised away from the start of a sentence, is a name.
 */
const NAME_FLOOR = 45;

/* ------------------------------------------------------------------ *
 * How fast you learn
 * ------------------------------------------------------------------ */

/** Exposure worth a whole tongue: about nine hundred lines heard from people who are not repeating themselves. */
export const FLUENT_EXPOSURE = 900;
/** The shape of the climb. Small and the first levels come fast; this is set so thirty lines is a beginning and not a language. */
const EXPOSURE_SCALE = 60;
const FULL_LOG = Math.log(1 + FLUENT_EXPOSURE / EXPOSURE_SCALE);

/** The proficiency `exposure` in one tongue is worth: steep at the start, and a long tail. */
export function proficiencyForExposure(exposure) {
  if (!(exposure > 0)) return 0;
  const level = MAX_PROFICIENCY * Math.log(1 + exposure / EXPOSURE_SCALE) / FULL_LOG;
  return Math.min(MAX_PROFICIENCY, Math.floor(level + 1e-9));
}
/** The least exposure that reaches `level`; the inverse of the above, so a seeded table round-trips. */
export function exposureForProficiency(level) {
  const want = Math.min(MAX_PROFICIENCY, Math.max(0, Math.floor(level)));
  if (want <= 0) return 0;
  return EXPOSURE_SCALE * (Math.exp(want * FULL_LOG / MAX_PROFICIENCY) - 1);
}

/**
 * What the k-th line from one mouth is worth. The first is worth all of it and
 * the fiftieth very little: one person cannot teach you their language, which
 * is the point — you learn Elagosi by talking to Elagosi, plural.
 */
const FLOOR_PER_SPEAKER = .12;
export const exposureWeight = heard => Math.max(FLOOR_PER_SPEAKER, 1 / Math.sqrt(Math.max(1, heard)));

/** Linguist experience for the traveler's own skill: a little for every line, a great deal for every level a tongue climbs. */
export const XP_PER_EXPOSURE = 120;
export const XP_PER_LEVEL = 200;

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

/** Words and everything between them, so punctuation, numbers and spacing come back exactly as they went in. */
const TOKENS = /[A-Za-z][A-Za-z’']*/g;
/** After one of these, a capital letter is the start of a sentence and means nothing. */
const SENTENCE_END = /[.?!:;—–"“(\[]\s*$|^\s*$/;

const lower = word => word.toLowerCase().replace(/’/g, "'");

/** Put the capitalisation of the English word back on the word that replaced it. */
function matchCase(source, made) {
  if (source === source.toUpperCase() && source.length > 1) return made.toUpperCase();
  if (source[0] === source[0].toUpperCase()) return made[0].toUpperCase() + made.slice(1);
  return made;
}

/**
 * One line of speech as the traveler hears it.
 *
 *   `level`   proficiency in that tongue, 0 to 99
 *   `full`    render the whole line in the tongue however much you know: what
 *             was actually said, which is what the toggle in the panel shows
 *   `dialect` a light change of sound over the same words; never word order
 *   `names`   extra names to leave alone, so NPCs keep theirs
 */
export function renderLine(line, languageId, { level = 0, full = false, dialect = null, names = null } = {}) {
  const text = String(line ?? '');
  if (!LANGUAGES[languageId] || (!full && level >= MAX_PROFICIENCY)) return text;
  const known = full ? -1 : comprehension(level);
  if (known >= 1) return text;
  const twist = dialect && DIALECTS[dialect]?.language === languageId ? DIALECTS[dialect].twist : null;

  // Every word, and whether it is a name, decided before anything is rewritten:
  // "Chris Gotwood" opens a sentence, so the capital on Chris proves nothing,
  // and only the Gotwood beside it says he is a person and not a preposition.
  const found = [];
  TOKENS.lastIndex = 0;
  for (let match = TOKENS.exec(text); match; match = TOKENS.exec(text)) {
    const word = match[0], key = lower(word);
    found.push({ word, key, at: match.index,
      capital: word[0] !== word[0].toLowerCase(),
      opens: SENTENCE_END.test(text.slice(0, match.index)) });
  }
  const plainly = token => token.capital && !token.opens && !NEVER_A_NAME.has(token.key) && (RANK.get(token.key) ?? Infinity) >= NAME_FLOOR;
  for (let i = 0; i < found.length; i++) {
    const token = found[i];
    token.name = PLACE_NAMES.has(token.key) || !!names?.has(token.key) || plainly(token)
      || (token.capital && token.opens && !NEVER_A_NAME.has(token.key) && !!found[i + 1] && plainly(found[i + 1]));
  }

  let out = '', at = 0;
  for (const token of found) {
    out += text.slice(at, token.at);
    at = token.at + token.word.length;
    if (token.name || costOf(token.key) < known) { out += token.word; continue; }
    // A possessive keeps its tail: the word is translated, the 's is grammar.
    const possessive = /['’]s$/.test(token.key);
    const stem = possessive ? token.key.slice(0, -2) : token.key;
    let made = wordIn(languageId, stem);
    if (twist) made = twist(made);
    out += matchCase(token.word, made) + (possessive ? token.word.slice(-2) : '');
  }
  return out + text.slice(at);
}

/* ------------------------------------------------------------------ *
 * The traveler's own state
 * ------------------------------------------------------------------ */

const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value);

export function validateLinguistSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!isPlainObject(data) || data.version !== LINGUIST_VERSION) return false;
  if (!isPlainObject(data.exposure) || !isPlainObject(data.heard)) return false;
  const exposures = Object.entries(data.exposure);
  if (exposures.length > LANGUAGE_IDS.length) return false;
  if (!exposures.every(([id, value]) => Object.hasOwn(LANGUAGES, id)
    && Number.isFinite(value) && value >= 0 && value <= 1e7)) return false;
  const heard = Object.entries(data.heard);
  if (heard.length > 4000) return false;
  return heard.every(([id, count]) => typeof id === 'string' && id.length > 0 && id.length <= 80
    && Number.isInteger(count) && count >= 0 && count <= 1e6);
}

/**
 * `skills` is the traveler's skill sheet (`src/skills.js`); the linguist gains
 * experience on it and never reads it back for the rendering, because what you
 * understand of a tongue is that tongue's own number and not the skill's.
 */
export function createLinguist({ skills = null, onEvent = () => {} } = {}) {
  const state = { exposure: new Map(), heard: new Map() };
  /** Not saved: the toggle is a way of looking at the panel, and it lasts as long as the session. */
  let showingFull = false;

  /**
   * The traveler becomes a linguist the first time a word he cannot follow is
   * said to him, which is about four seconds after he steps off the boat. The
   * skill itself lives in src/skills.js; until it is registered there this does
   * nothing at all, and the tongues go on being learned regardless.
   */
  function earn(xp) {
    if (!skills || !(xp > 0)) return null;
    if (!skills.known?.(LINGUIST_SKILL) && skills.learn?.(LINGUIST_SKILL)?.ok !== true) return null;
    return skills.gain?.(LINGUIST_SKILL, xp) ?? null;
  }

  const seed = () => {
    state.exposure.clear(); state.heard.clear();
    for (const [id, level] of Object.entries(STARTING_PROFICIENCY)) {
      if (level > 0) state.exposure.set(id, exposureForProficiency(level));
    }
  };
  seed();

  const rawExposure = id => state.exposure.get(id) ?? 0;
  /** What you have of a tongue from having heard it, before any relative of it is counted. */
  const ownLevel = id => proficiencyForExposure(rawExposure(id));

  /**
   * What you have of a tongue altogether. A relative gives you a floor and
   * never a ceiling, one hop and never through a third: Drentish at 60 puts 27
   * under Feradom. The Cant belongs to nobody, so it takes a quarter of your
   * best, which is what a pidgin is for.
   */
  function level(id) {
    if (!LANGUAGES[id]) return 0;
    let best = ownLevel(id);
    for (const [kin, share] of Object.entries(KINSHIP[id] ?? {})) best = Math.max(best, Math.floor(ownLevel(kin) * share));
    if (id === 'cant') {
      let top = 0;
      for (const other of LANGUAGE_IDS) if (other !== 'cant') top = Math.max(top, ownLevel(other));
      best = Math.max(best, Math.floor(top * CANT_SHARE));
    }
    return Math.min(MAX_PROFICIENCY, best);
  }

  const known = id => level(id) >= MAX_PROFICIENCY;
  /** Signs are all or nothing: see docs/languages.md for why a half-read sign is worse than a foreign one. */
  const canRead = id => !SIGN_TRANSLATION || level(id) >= SIGN_READING_LEVEL;

  /** Which tongue a person is speaking, and in what accent. */
  const speech = (npc, regionName) => speechFor(npc, regionName);

  /**
   * A line heard. `times` is what it counts for — two while Chris Gotwood is
   * interpreting, because somebody telling you what it meant is worth two
   * people saying it at you.
   */
  function hear(npc, line, { region = null, times = 1, language = null, dialect = null } = {}) {
    const spoken = language ? { language, dialect } : speech(npc, region);
    const id = spoken.language;
    if (!LANGUAGES[id] || !line) return { ok: false, language: id, gained: 0, xp: 0 };
    const speaker = String(npc?.id ?? npc?.name ?? 'somebody');
    const before = level(id);
    const count = (state.heard.get(speaker) ?? 0) + 1;
    state.heard.set(speaker, count);
    const gained = exposureWeight(count) * Math.max(0, times);
    state.exposure.set(id, rawExposure(id) + gained);
    const after = level(id);
    const climbed = Math.max(0, after - before);
    const xp = Math.round(gained * XP_PER_EXPOSURE) + climbed * XP_PER_LEVEL * after;
    const gainedSkill = earn(xp);
    if (climbed > 0) onEvent({ type: 'tongue-level', language: id, level: after, from: before, read: after >= SIGN_READING_LEVEL && before < SIGN_READING_LEVEL });
    return { ok: true, language: id, dialect: spoken.dialect, gained, level: after, climbed, xp, levelled: !!gainedSkill?.levelled };
  }

  /** A phrasebook, or a teacher: a lump of a tongue bought rather than overheard. */
  function study(id, exposure = PHRASEBOOK_EXPOSURE) {
    if (!LANGUAGES[id]) return { ok: false, reason: 'Nobody speaks that.' };
    const before = level(id);
    state.exposure.set(id, rawExposure(id) + Math.max(0, exposure));
    const after = level(id);
    const climbed = Math.max(0, after - before);
    const xp = Math.round(exposure * XP_PER_EXPOSURE) + climbed * XP_PER_LEVEL * after;
    const gainedSkill = earn(xp);
    if (climbed > 0) onEvent({ type: 'tongue-level', language: id, level: after, from: before, read: after >= SIGN_READING_LEVEL && before < SIGN_READING_LEVEL });
    return { ok: true, language: id, level: after, climbed, xp, levelled: !!gainedSkill?.levelled };
  }

  /** One line as the traveler hears it. `full` is the toggle: what was actually said. */
  function render(line, spoken, { full = false, names = null } = {}) {
    const id = typeof spoken === 'string' ? spoken : spoken?.language;
    if (!LANGUAGES[id]) return String(line ?? '');
    return renderLine(line, id, { level: level(id), full: full || showingFull, dialect: typeof spoken === 'string' ? null : spoken?.dialect ?? null, names });
  }

  /** Lettering on a sign: all of it in the local tongue, or all of it in yours. */
  function readSign(label, regionName, { names = null } = {}) {
    const spoken = regionSpeech(regionName);
    if (canRead(spoken.language)) return String(label ?? '');
    return renderLine(label, spoken.language, { level: 0, full: true, dialect: spoken.dialect, names });
  }

  /** Whether Chris Gotwood is beside you, still walking, and knows what is being said. */
  function interpreterNearby(npc, { interpreter = null, languageId = null } = {}) {
    if (!interpreter || interpreter.hidden) return false;
    if (interpreter.placement && interpreter.placement.phase === INTERPRETER.reached) return false;
    if (npc && npc.id === INTERPRETER.npcId) return false;
    if (languageId && !INTERPRETER.knows.includes(languageId)) return false;
    const from = interpreter.placement ?? interpreter;
    const to = npc?.placement ?? npc?.stand ?? npc;
    if (!Number.isFinite(from?.x) || !Number.isFinite(to?.x)) return false;
    return Math.hypot(from.x - to.x, from.z - to.z) <= INTERPRETER.range;
  }

  /** The skills panel's line, and the journal's: where every tongue stands. */
  function view() {
    const tongues = LANGUAGE_IDS.map(id => ({
      id, name: LANGUAGES[id].name, where: LANGUAGES[id].where,
      level: level(id), own: ownLevel(id), share: Math.round(100 * comprehension(level(id))), read: canRead(id),
    })).sort((a, b) => b.level - a.level || (a.name < b.name ? -1 : 1));
    const met = tongues.filter(entry => entry.own > 0);
    return { tongues, met: met.length, fluent: tongues.filter(entry => entry.level >= MAX_PROFICIENCY).length, showingFull };
  }

  /** What the traveler would write in his own notes about the tongues, if the panel wants a line. */
  function task() {
    const seen = view();
    if (!seen.met) return { title: 'Not one word', detail: 'Nobody here speaks anything you know. Stay near Chris Gotwood: he has enough of it to get two men up a road, and he will tell you what was said.' };
    const best = seen.tongues[0];
    if (seen.fluent >= LANGUAGE_IDS.length) return { title: 'Every tongue in Azhora', detail: 'There is nothing left on this continent that you cannot follow.' };
    return { title: `${best.name} · ${best.level}`, detail: `You follow about ${Math.round(100 * comprehension(best.level))} words in a hundred of it. ${seen.met} of ${LANGUAGE_IDS.length} tongues have said anything to you at all.` };
  }

  function snapshot() {
    return {
      version: LINGUIST_VERSION,
      exposure: Object.fromEntries([...state.exposure].map(([id, value]) => [id, Math.round(value * 1000) / 1000])),
      heard: Object.fromEntries(state.heard),
    };
  }
  function restore(data) {
    seed();
    if (!validateLinguistSnapshot(data, { allowMissing: false })) return false;
    state.exposure = new Map(Object.entries(data.exposure));
    state.heard = new Map(Object.entries(data.heard));
    return true;
  }

  return {
    level, ownLevel, known, canRead, speech, hear, study, render, readSign, interpreterNearby, view, task,
    snapshot, restore,
    comprehension: id => comprehension(level(id)),
    exposure: id => rawExposure(id),
    heardFrom: speaker => state.heard.get(String(speaker)) ?? 0,
    get showingFull() { return showingFull; },
    /** The toggle in the dialogue panel: show the line as it was actually said. Lasts the session. */
    toggle(force = null) { showingFull = force === null ? !showingFull : !!force; return showingFull; },
  };
}
