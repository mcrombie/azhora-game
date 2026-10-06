/** Independent civic service and visitor permission for the two Baldro kingdoms.
 * Pure state: repairs use the material already at each exterior work site. The
 * composition root awards a returned reward and saves it with the skills state. */
export const BALDRO_STATE_VERSION = 1;
export const BALDRO_CITY_IDS = Object.freeze(['west', 'east']);
const freeze = Object.freeze;
const service = (id, region, title, noun, request, completion) => freeze({
  id, region, title, noun, request, completion,
  siteIds: freeze([1, 2, 3].map(n => `${id}-${id === 'west' ? 'cairn' : 'sluice'}-${n}`)),
  reward: freeze({ skill: 'construction', xp: 30 }),
});

export const BALDRO_SERVICES = freeze({
  west: service('west', 'West Baldro Mountains', 'Set the pass markers right', 'route cairn',
    'Our kingdom keeps its own gate. Inspect the three route cairns on this approach and reset their loose stones. Everything you need is beside them. Return here when the way is clear, and I can admit you.',
    'The pass markers stand true. You have earned passage into our city. This permission belongs to the western kingdom; the eastern gate keeps its own record.'),
  east: service('east', 'East Baldro Mountains', 'Restore the spring conduits', 'spring sluice',
    'Our kingdom decides who passes this gate. Clear and reset the three spring sluices on the approach, then report back. The fittings are already there; bring no supplies from elsewhere.',
    'The spring feeds all three conduits again. You have earned passage into our city. This permission belongs to the eastern kingdom; the western gate keeps its own record.'),
});
export const DWARF_INTRODUCTION = freeze({ id: 'dwarf-introduction', title: 'A Place at the Forge',
  technique: 'fitted-repair-rivet', techniqueName: 'Fitted repair rivet',
  rewards: freeze([freeze({ skill: 'smithing', xp: 45 }), freeze({ skill: 'dwarvenSmithing', xp: 30 })]),
});
export const DWARF_FORGE_STEPS = freeze([
  freeze({ id: 'heat', label: 'Heat the repair rivet', detail: 'Bring the rivet to an even dull-red heat. Watch the colour along the shank; do not leave its head cold.',
    done: 'The repair rivet reaches an even dull red. It is ready to fit into the practice joint.' }),
  freeze({ id: 'fit-peen', label: 'Fit and peen the rivet', detail: 'Seat the warm rivet in the matched hole, then peen its tail with short, even blows. Let the metal fill the joint.',
    done: 'You fit the rivet and peen its tail into a close, even head. The practice joint no longer rattles.' }),
  freeze({ id: 'quench', label: 'Quench the fitted joint', detail: 'Cool the fitted joint in the shallow trough, then check both faces for a gap. Bring the finished piece back to the artisan.',
    done: 'The fitted joint cools in the trough. Both rivet heads sit flush. Show the finished work to the artisan.' }),
]);

/** UI labels, atlas names and saved aliases all resolve to the same two gates. */
export function normalizeBaldroCityId(value) {
  if (typeof value !== 'string') return null;
  const id = value.trim().toLowerCase().replace(/[\s_]+/g, '-');
  for (const city of BALDRO_CITY_IDS) {
    if ([city, `${city}-baldro`, `baldro-${city}`, `${city}-baldro-mountains`].includes(id)) return city;
  }
  return null;
}

const siteId = value => typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s_]+/g, '-') : null;
const initialCity = () => ({ accepted: false, repaired: [], admitted: false });
const initialIntroduction = () => ({ accepted: false, entered: false, lessonStarted: false, forgeStep: 0, completed: false });
const initial = () => ({ version: BALDRO_STATE_VERSION, cities: { west: initialCity(), east: initialCity() }, introduction: initialIntroduction() });
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
const unchanged = (ok, reason = '') => ({ ok, changed: false, reason, reward: null, rewards: [] });

function sanitizedCity(value, city) {
  if (!isRecord(value)) return initialCity();
  const accepted = value.accepted === true;
  const offered = Array.isArray(value.repaired) ? value.repaired.map(siteId) : [];
  const repaired = accepted ? BALDRO_SERVICES[city].siteIds.filter(id => offered.includes(id)) : [];
  return { accepted, repaired, admitted: accepted && repaired.length === 3 && value.admitted === true };
}
function sanitizedIntroduction(value, west) {
  if (!isRecord(value)) return initialIntroduction();
  const accepted = west.accepted && value.accepted === true;
  const entered = accepted && west.admitted && value.entered === true;
  const lessonStarted = entered && value.lessonStarted === true;
  const forgeStep = lessonStarted && Number.isInteger(value.forgeStep) && value.forgeStep >= 0 && value.forgeStep <= 3 ? value.forgeStep : 0;
  return { accepted, entered, lessonStarted, forgeStep, completed: lessonStarted && forgeStep === 3 && value.completed === true };
}

/** Strict checkpoint validation; restore also safely sanitizes partial version-1 data. */
export function validateBaldroSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!isRecord(data) || data.version !== BALDRO_STATE_VERSION || !isRecord(data.cities)) return false;
  const citiesValid = BALDRO_CITY_IDS.every(city => {
    const value = data.cities[city];
    if (!isRecord(value) || typeof value.accepted !== 'boolean' || typeof value.admitted !== 'boolean'
      || !Array.isArray(value.repaired) || value.repaired.length > 3) return false;
    const cleaned = sanitizedCity(value, city);
    return cleaned.admitted === value.admitted && cleaned.repaired.length === value.repaired.length
      && new Set(value.repaired).size === value.repaired.length
      && value.repaired.every(id => BALDRO_SERVICES[city].siteIds.includes(id));
  });
  if (!citiesValid) return false;
  if (data.introduction === undefined) return true;
  if (!isRecord(data.introduction)) return false;
  const clean = sanitizedIntroduction(data.introduction, data.cities.west);
  return Object.keys(clean).every(key => clean[key] === data.introduction[key]);
}

export function createBaldroState({ onEvent = () => {} } = {}) {
  let progress = initial();
  const snapshot = () => ({ version: BALDRO_STATE_VERSION, cities: Object.fromEntries(BALDRO_CITY_IDS.map(city =>
    [city, { ...progress.cities[city], repaired: [...progress.cities[city].repaired] }])), introduction: { ...progress.introduction } });

  function introduction() {
    const intro = progress.introduction, west = progress.cities.west;
    const stage = !intro.accepted ? 'unoffered' : intro.completed ? 'complete' : !west.admitted
      ? west.repaired.length < 3 ? 'service' : 'report' : !intro.entered ? 'enter'
        : !intro.lessonStarted ? 'smith' : intro.forgeStep < 3 ? 'forge' : 'reward';
    const detail = {
      unoffered: 'Ask the West Hold gatekeeper for a chance to earn a place at the forge. Visitors first help keep the mountain approach safe.',
      service: `Restore the three western route cairns, then report to the gatekeeper. ${west.repaired.length} of 3 restored.`,
      report: 'All three western cairns stand true. Report to the West Hold gatekeeper to earn admission.',
      enter: 'Your passage into West Hold is earned. Enter through the guarded gate and meet the artisan in the working district.',
      smith: 'Speak with the West Hold artisan about your first lesson in Dwarven Smithing.',
      forge: DWARF_FORGE_STEPS[intro.forgeStep]?.detail ?? '',
      reward: 'The fitted repair rivet is finished. Return to the West Hold artisan to have the joint checked.',
      complete: 'The West Hold artisan has taught you the fitted repair rivet: one carefully matched joint, and your first lesson in Dwarven Smithing.',
    }[stage];
    return { id: DWARF_INTRODUCTION.id, title: DWARF_INTRODUCTION.title, type: 'secondary', stage,
      active: intro.accepted && !intro.completed, complete: intro.completed, forgeStep: intro.forgeStep,
      detail, technique: intro.completed ? DWARF_INTRODUCTION.technique : null,
      forgeAction: stage === 'forge' ? DWARF_FORGE_STEPS[intro.forgeStep].id : null };
  }

  function view(value) {
    const city = normalizeBaldroCityId(value);
    if (!city) return null;
    const state = progress.cities[city], definition = BALDRO_SERVICES[city];
    const remaining = definition.siteIds.filter(id => !state.repaired.includes(id));
    const stage = state.admitted ? 'admitted' : !state.accepted ? 'unoffered' : remaining.length ? 'working' : 'report';
    return { cityId: city, title: definition.title, region: definition.region, stage, accepted: state.accepted,
      admitted: state.admitted, canEnter: state.admitted, complete: state.admitted,
      repaired: [...state.repaired], remaining, count: state.repaired.length, required: definition.siteIds.length,
      detail: state.admitted ? definition.completion : !state.accepted ? definition.request
        : remaining.length ? `${state.repaired.length} of 3 ${definition.noun}s restored. The remaining work is outside the city gate.`
          : 'All three sites are restored. Report to this city\'s gate guard to earn entry.' };
  }

  function emit(cityId, action, message, extra = {}) {
    const event = { type: 'baldro-progress', cityId, action, message, reward: null, ...extra };
    onEvent(event);
    return { ok: true, changed: true, reason: '', ...event };
  }

  function accept(value) {
    const city = normalizeBaldroCityId(value);
    if (!city) return unchanged(false, 'Unknown Baldro kingdom.');
    if (progress.cities[city].accepted) return unchanged(true);
    progress.cities[city].accepted = true;
    return emit(city, 'accept', BALDRO_SERVICES[city].request);
  }

  function repair(value, target) {
    const city = normalizeBaldroCityId(value), id = siteId(target);
    if (!city) return unchanged(false, 'Unknown Baldro kingdom.');
    const definition = BALDRO_SERVICES[city], state = progress.cities[city];
    if (!definition.siteIds.includes(id)) return unchanged(false, 'That work site belongs to another approach.');
    if (!state.accepted) return unchanged(false, 'Speak to this city\'s gate guard before beginning the work.');
    if (state.repaired.includes(id)) return unchanged(true, 'This site is already restored.');
    state.repaired = definition.siteIds.filter(known => known === id || state.repaired.includes(known));
    return emit(city, 'repair', city === 'west' ? 'You inspect the cairn and reset its loose capstones.'
      : 'You clear the spring sluice and reseat its conduit fitting.', { siteId: id });
  }

  function report(value) {
    const city = normalizeBaldroCityId(value);
    if (!city) return unchanged(false, 'Unknown Baldro kingdom.');
    const definition = BALDRO_SERVICES[city], state = progress.cities[city];
    if (state.admitted) return unchanged(true, 'Your permission is already recorded at this gate.');
    if (!state.accepted) return unchanged(false, 'Ask this guard how to earn entry first.');
    if (state.repaired.length !== definition.siteIds.length) return unchanged(false, 'Finish all three sites on this approach before reporting.');
    // Admission records the reward claim in the same transition. A repeated
    // report, including after restore, can never offer that reward again.
    state.admitted = true;
    return emit(city, 'report', definition.completion, { reward: { ...definition.reward } });
  }

  function acceptIntroduction() {
    if (progress.introduction.accepted) return unchanged(true);
    progress.introduction.accepted = true;
    progress.cities.west.accepted = true;
    return emit('west', 'accept-introduction', progress.cities.west.admitted
      ? 'Your admission already stands. The West Hold artisan can offer you a first lesson.'
      : 'Restore the western cairns and report to the gatekeeper. Earned passage will bring you to the West Hold artisan.');
  }
  function enterIntroduction() {
    if (!progress.introduction.accepted || !progress.cities.west.admitted) return unchanged(false, 'Earn admission to West Hold first.');
    if (progress.introduction.entered) return unchanged(true);
    progress.introduction.entered = true;
    return emit('west', 'enter-introduction', 'You have entered West Hold. Find its artisan in the working district.');
  }
  function beginLesson() {
    const intro = progress.introduction;
    if (!intro.accepted || !progress.cities.west.admitted) return unchanged(false, 'Earn admission and ask for a place at the forge first.');
    if (intro.lessonStarted) return unchanged(true);
    intro.entered = true; intro.lessonStarted = true;
    return emit('west', 'begin-lesson', 'The artisan sets out a matched practice joint and rivet. Heat, fit and peen, then quench it under their instruction.');
  }
  function workForge() {
    const intro = progress.introduction;
    if (!intro.lessonStarted || !progress.cities.west.admitted) return unchanged(false, 'Ask the West Hold artisan to show you the method first.');
    if (intro.forgeStep === DWARF_FORGE_STEPS.length) return unchanged(true, intro.completed ? 'Your first lesson is complete.' : 'Show the finished joint to the artisan.');
    const step = DWARF_FORGE_STEPS[intro.forgeStep++];
    return emit('west', 'work-forge', step.done, { forgeAction: step.id, forgeStep: intro.forgeStep });
  }
  function finishLesson() {
    const intro = progress.introduction;
    if (intro.completed) return unchanged(true, 'The artisan has already recognized your first lesson.');
    if (!intro.lessonStarted || intro.forgeStep !== DWARF_FORGE_STEPS.length) return unchanged(false, 'Finish all three operations at the practice forge first.');
    intro.completed = true;
    return emit('west', 'finish-lesson', introduction().detail, { lesson: { id: DWARF_INTRODUCTION.technique, name: DWARF_INTRODUCTION.techniqueName },
      rewards: DWARF_INTRODUCTION.rewards.map(reward => ({ ...reward })) });
  }

  function restore(data) {
    if (data === undefined) { progress = initial(); return true; }
    if (!isRecord(data) || data.version !== BALDRO_STATE_VERSION || !isRecord(data.cities)) return false;
    const next = initial();
    for (const city of BALDRO_CITY_IDS) {
      const key = Object.hasOwn(data.cities, city) ? city : Object.keys(data.cities).find(value => normalizeBaldroCityId(value) === city);
      next.cities[city] = sanitizedCity(key ? data.cities[key] : null, city);
    }
    next.introduction = sanitizedIntroduction(data.introduction, next.cities.west);
    progress = next;
    return true;
  }

  return { accept, repair, report, view, introduction, acceptIntroduction, enterIntroduction, beginLesson, workForge, finishLesson, state: snapshot, snapshot, restore,
    canEnter(value) { const city = normalizeBaldroCityId(value); return !!city && progress.cities[city].admitted; },
    resetIntroductionForTesting() { progress.cities.west = initialCity(); progress.introduction = initialIntroduction(); return snapshot(); },
    reset() { progress = initial(); return snapshot(); } };
}
