/**
 * Normal mode, and a tentative hard mode.
 *
 * The user's decision of 2026-09-21 (`docs/hard-mode.md`, `docs/design-answers.md`): the game we
 * develop and the only one we test is **normal**, and it is all in English. **Hard** is optional
 * and tentative — something a player could set instead of the default — and what it consists of
 * will be worked out over time. One thing is known so far: the linguist skill and everything that
 * came with it. That code is kept, not deleted, and it is reserved here.
 *
 * This module is the whole gate. A feature that belongs to hard mode is listed in
 * `HARD_MODE_FEATURES` and asked for by name — `mode.has('linguist')` — and **nothing anywhere
 * else in the codebase asks which mode is being played**. Nothing here knows what any feature
 * does; it knows only which mode holds it.
 *
 * There is **no player-facing selector**, because hard mode is not yet something worth choosing.
 * The only way in is the launch flag `?mode=hard`, handled beside the testing query in
 * `src/main.js`, which keeps the reserved code reachable with no interface work.
 *
 * Pure: no DOM, no three.
 */
export const GAME_MODE_VERSION = 1;
export const GAME_MODE_NORMAL = 'normal';
export const GAME_MODE_HARD = 'hard';
/** The two, in the order they are offered if anybody ever offers them. */
export const GAME_MODES = Object.freeze([GAME_MODE_NORMAL, GAME_MODE_HARD]);
export const DEFAULT_GAME_MODE = GAME_MODE_NORMAL;
/** The launch flag, beside `test` in the query string: `?mode=hard`. */
export const GAME_MODE_FLAG = 'mode';

/**
 * Everything hard mode holds. One table, and the list in `docs/hard-mode.md` is its prose; when
 * something else is reserved, it is added here and written down there, and nowhere else.
 *
 * `skills` names the skills whose tiles come off the sheet while the feature is off. The registry
 * in `src/skills.js` keeps every one of them, so a save that already holds their experience still
 * validates and that experience is left exactly where it is.
 */
export const HARD_MODE_FEATURES = Object.freeze({
  linguist: Object.freeze({
    id: 'linguist',
    name: 'The tongues of Azhora',
    note: 'Nobody in Azhora speaks the traveler’s language, so what people say arrives in their own tongue and English surfaces as he learns it. With it: the tongue rendering of speech and of signs, a proficiency for each language, Chris Scotwood interpreting while he is with you, his five sittings on the long road, the phrasebook, the drills, and the key that shows a line as it was said (src/linguist.js, src/languages.js, docs/languages.md).',
    skills: Object.freeze(['linguist']),
  }),
});
export const HARD_MODE_FEATURE_IDS = Object.freeze(Object.keys(HARD_MODE_FEATURES));

export const isGameMode = value => GAME_MODES.includes(value);
/**
 * What a launch flag or a saved field means. Anything this build does not know is the default,
 * because the mode we develop is the one a game falls back into.
 */
export const gameModeOf = value => (isGameMode(value) ? value : DEFAULT_GAME_MODE);

/**
 * The checkpoint carries one field. A save with no field at all was written before there were
 * modes, and it is a normal-mode game, which is why missing is allowed.
 */
export function validateGameModeSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined || data === null) return allowMissing;
  return isGameMode(data);
}

/**
 * The skills no sheet shows in `mode`: every hard-mode feature's own, while that feature is off.
 * The registry keeps them all, so this is about what is drawn and never about what is known.
 */
export function hiddenSkillsIn(mode = DEFAULT_GAME_MODE) {
  if (gameModeOf(mode) === GAME_MODE_HARD) return Object.freeze([]);
  return Object.freeze(HARD_MODE_FEATURE_IDS.flatMap(id => HARD_MODE_FEATURES[id].skills));
}

export function createGameMode({ mode = DEFAULT_GAME_MODE } = {}) {
  let current = gameModeOf(mode);

  /**
   * Whether this game has that feature. The only names it answers to are the ones in the table:
   * anything else is false, because a misspelled feature that came back true would switch a
   * reserved thing back on in the mode we ship, which is the one failure worth ruling out.
   */
  const has = feature => Object.hasOwn(HARD_MODE_FEATURES, feature) && current === GAME_MODE_HARD;

  return {
    has,
    get mode() { return current; },
    get hard() { return current === GAME_MODE_HARD; },
    get normal() { return current === GAME_MODE_NORMAL; },
    /** The skills this mode leaves off the sheet. */
    get hiddenSkills() { return hiddenSkillsIn(current); },
    snapshot() { return current; },
    restore(data) {
      current = DEFAULT_GAME_MODE;
      if (!validateGameModeSnapshot(data, { allowMissing: false })) return false;
      current = data;
      return true;
    },
  };
}
