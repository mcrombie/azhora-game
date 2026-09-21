/**
 * The civil-war campaign: the branching main quest across Azhora's regions.
 *
 * No render or DOM dependencies. The host reports what happened (a chapter
 * finished, a battle won or lost, a side chosen, a regional arc resolved) and
 * this module keeps the story, the map's political control, and the player's
 * standing with each faction consistent. Battle results are never rolled here;
 * `battleOdds` tells the host how the side quests have tilted a fight.
 */
import { FACTIONS, LEVEL_ONE_PROVINCES, REGION_DESIGN, regionDesign, levelInfo } from './campaign-world.js';

export const CAMPAIGN_VERSION = 1;
export const SIDES = Object.freeze(['empire', 'coalition']);
export const BATTLE_OUTCOMES = Object.freeze(['victory', 'defeat']);
export const LOTHARN_SURVEY_POINTS = Object.freeze(['rebel-camp', 'goblin-warrens', 'orc-trail']);
const EXPOSURE_THRESHOLD = 3;

const chapter = (id, region, title, detail, extra = {}) => Object.freeze({ id, region, title, detail, kind: 'story', side: 'both', ...extra });

/** Ordered story chapters. `next` may be a chapter id, an outcome map, or null for the frontier. */
export const CHAPTERS = Object.freeze({
  'drent-road': chapter('drent-road', 'Drent', 'The first shore',
    'Carry the letter of introduction to the army post in the Avrel clearings and make the road sound as far as the Caloss crossing. Drent is the Empire’s quietest province; learn the road while it is quiet.',
    { kind: 'road', next: 'luscia-aftermath' }),
  'luscia-aftermath': chapter('luscia-aftermath', 'Luscia', 'The field at the Lauvel',
    'Cross the Caloss into Luscia. The army has just broken a rebel army near the Lauvel crossing. Walk the aftermath, speak with the wounded and with the people who buried the losers, and learn what the word “rebel” hides. Wolves hunt off the roads at night.',
    { reward: 'horse', next: 'moros-camp' }),
  'moros-camp': chapter('moros-camp', 'Moros Plain', 'The army on the plain',
    'Take the horse the army lends you and ride southwest out of the last trees onto the Moros. The army is camped on the open plain, hunting the rebels who fled. Report to the Marshal and see the army whole.',
    { next: 'suval-envoy' }),
  'suval-envoy': chapter('suval-envoy', 'West Suval', 'A message for the Coalition',
    'Carry the Marshal’s message southeast into West Suval, to the Coalition army at Solis: Izoli soldiers, Suvali companies, the renounced prince’s followers, Luscia’s own rebels, a handful of Pyrosi, and men from Selemis, Marosh and the southern islands. Deliver it, hear their offer, and decide whose sellsword you are.',
    { kind: 'fork', choices: SIDES }),
  'border-battle': chapter('border-battle', 'Moros Plain', 'The border battle',
    'The army and the Coalition meet on the border of the Moros Plain and West Suval. Fight on the side you chose: hold your corner of the field and your side wins the day. Their soldiers are trained men with shields; strike when they have swung.',
    { kind: 'battle', side: 'chosen', outcomes: { empire: { victory: 'solis-sweep', defeat: 'moros-fallback' }, coalition: { victory: 'moros-outpost', defeat: 'solis-fallback' } } }),
  // Empire branch
  'solis-sweep': chapter('solis-sweep', 'West Suval', 'Solis, taken',
    'The Coalition broke. Ride with the army to Solis and clear the rebels and Coalition stragglers who hold out inside the walls. West Suval becomes an imperial province.',
    { side: 'empire', control: { 'West Suval': 'empire' }, next: 'report-ambron' }),
  'moros-fallback': chapter('moros-fallback', 'Moros Plain', 'The line at the Moros',
    'The army lost the field and pulled back across the plain to its outpost. The Coalition holds the border now. Hold the outpost’s gate for the wounded, then carry the news to Ambron; the war goes on.',
    { side: 'empire', next: 'report-ambron' }),
  'report-ambron': chapter('report-ambron', 'Elagos', 'The city on the narrows',
    'Ride northwest across the Moros into Elagos and enter Ambron, the walled lake city where the emperor rules. The Lord Marshal pays you, arms you better, and gives you the Empire’s next use for a sellsword.',
    { side: 'empire', next: 'first-pacification' }),
  'first-pacification': chapter('first-pacification', null, 'One province made quiet',
    'Ambron wants proof. Choose one of the five level-one provinces (Luscia, Peblos, Pueth, Vastos or Meneth) and finish its Empire arc: break the rebel presence there. Do more of the five for bonuses; do all five to rise in the Empire’s service.',
    { kind: 'arc', side: 'empire', next: 'amod-hill-chief' }),
  'amod-hill-chief': chapter('amod-hill-chief', 'Amod', 'The hill goblin chief',
    'Ride north to Mavren, the terraced fortress town of Amod. The garrison fights goblins more than rebels here, and these goblins answer to something in the northwest. Join the army’s attack on the hill goblin outpost and kill its chief. A truce with the local rebels helps.',
    { kind: 'battle', side: 'empire', outcomes: { empire: { victory: 'lotharn-scout', defeat: null } } }),
  'lotharn-scout': chapter('lotharn-scout', 'East Lotharn Mountains', 'Something in the mountains',
    'Amod’s commander sends you into the East Lotharn to scout what he believes are mountain goblins pushing south. You see orcs. Confront them or stay hidden; either way, get back alive and report.',
    { side: 'empire', next: 'lotharn-survey' }),
  'lotharn-survey': chapter('lotharn-survey', 'East Lotharn Mountains', 'Three corners of the Lotharn',
    'Gather word from three corners of the range: the rebel camp, the goblin warrens, and the orcs’ trail. Wolves hunt in packs here, and trolls and giants are rare but real. Report to Mavren.',
    { kind: 'survey', side: 'empire', points: LOTHARN_SURVEY_POINTS, next: 'west-lotharn-outpost' }),
  'west-lotharn-outpost': chapter('west-lotharn-outpost', 'West Lotharn Mountains', 'The outpost in the west',
    'Cross into the West Lotharn, harder and higher. Find the main mountain-goblin base and confirm the news: orcs are stationed inside it, allied, far south of anywhere they belong. Report back to Mavren and survive doing it.',
    { side: 'empire', next: 'orc-chief-lotharn' }),
  'orc-chief-lotharn': chapter('orc-chief-lotharn', 'West Lotharn Mountains', 'The orc chief',
    'Infiltrate the mountain-goblin base and kill the orc chief. You cannot fight the whole warren; do it fast and flee. Get back to Mavren.',
    { kind: 'assassination', side: 'empire', outcomes: { empire: { victory: 'mithala-scout', defeat: null } } }),
  'mithala-scout': chapter('mithala-scout', 'South Mithala', 'The river-city',
    'Scout northwest into South Mithala. The Mithalan Empire has a rebellion of its own. Reach the river-city where the three Mithalas meet, talk to a few people, and carry what you learn back to Mavren.',
    { side: 'empire', next: 'oremindi-convergence' }),
  // Coalition branch
  'moros-outpost': chapter('moros-outpost', 'Moros Plain', 'The outpost on the plain',
    'The army broke. The Coalition storms the imperial outpost at the centre of the Moros, and Solis is safe behind you. West Suval and the plain belong to the Republic for now.',
    { side: 'coalition', control: { 'Moros Plain': 'coalition', 'West Suval': 'coalition' }, next: 'sail-west-izol' }),
  'solis-fallback': chapter('solis-fallback', 'West Suval', 'Back to Solis',
    'The Coalition lost the field and fell back on Solis. The army holds the border. The Republic needs its sellsword more, not less.',
    { side: 'coalition', next: 'sail-west-izol' }),
  'sail-west-izol': chapter('sail-west-izol', 'West Izol', 'The republic across the water',
    'Take ship from Solis to West Izol, the Izoli Republic’s stable heart, where most of the Coalition army waits to move on the Moros. Meet the people who raised this war.',
    { side: 'coalition', next: 'first-liberation' }),
  'first-liberation': chapter('first-liberation', null, 'One province set free',
    'Izolveth wants proof. Choose one of the five level-one provinces (Luscia, Peblos, Pueth, Vastos or Meneth) and finish its Coalition arc: break the Empire’s hold there. Do more of the five for bonuses; do all five, and Nesdor and the Moros, to open the road to Ambron.',
    { kind: 'arc', side: 'coalition', next: 'nesdor-sand-chief' }),
  'nesdor-sand-chief': chapter('nesdor-sand-chief', 'Nesdor', 'The sand goblin chief',
    'Ride west to Nesdor. The rebels there fight sand goblins more than the Empire, and the goblins answer to something in the northwest. Join the attack on the sand goblin camp and kill its chief. A truce with the imperial garrison helps.',
    { kind: 'battle', side: 'coalition', outcomes: { coalition: { victory: 'ovesos-scout', defeat: null } } }),
  'ovesos-scout': chapter('ovesos-scout', 'Ovesos', 'Something in the dry country',
    'Nesdor sends you into Ovesos to scout what they believe are sand goblins pushing east. You see orcs. Confront them or stay hidden; either way, get back alive and report.',
    { side: 'coalition', next: 'oves-outpost' }),
  'oves-outpost': chapter('oves-outpost', 'Oves Desert', 'The base in the desert',
    'Cross into the Oves Desert. Find the sand goblin base and confirm the news: orcs are stationed inside it, allied, far south of anywhere they belong. Report back to Nesdor and survive doing it.',
    { side: 'coalition', next: 'orc-chief-oves' }),
  'orc-chief-oves': chapter('orc-chief-oves', 'Oves Desert', 'The orc chief',
    'Join a party of rangers, infiltrate the sand goblin base, and kill the orc chief. Do it fast and flee. Get back to Nesdor.',
    { kind: 'assassination', side: 'coalition', outcomes: { coalition: { victory: 'pyros-scout', defeat: null } } }),
  'pyros-scout': chapter('pyros-scout', 'East Pyros', 'The other empire',
    'Scout west into East Pyros. Pyros, the one empire that rules both East and West Pyros, is falling apart faster than Ambron: goblins in the fields, a rebellion in the towns, and almost no soldiers to spare for the Coalition. Reach Gala above the river confluence, talk to a few people, and carry what you learn back to Nesdor.',
    { side: 'coalition', next: 'oremindi-convergence' }),
  // Convergence
  'oremindi-convergence': chapter('oremindi-convergence', 'South Oremindi Mountains', 'The sage of the Oremindi',
    'Both roads lead here. Cross the regions between you and the South Oremindi by whatever path you choose and find the sage who knows what the orcs are and who sent them. The brief for this chapter ends mid-sentence; it is the frontier of the written story.',
    { kind: 'frontier', next: null }),
});

/** Optional regional arcs. Each side settles the province; a truce only helps the goblin battles. */
export const REGIONAL_ARCS = Object.freeze({
  'Luscia': Object.freeze({
    empire: 'Hunt down the rebel rangers hiding along the East Suval border, where Elod’s neutrality shelters them.',
    coalition: 'Find the rangers on the border and help the survivors of the Lauvel get back across Luscia.' }),
  'Peblos': Object.freeze({
    empire: 'Confirm the naval station’s suspicions: find the rebel ship hidden in the sea cave and give it to the fleet.',
    coalition: 'Help the hidden ship strike the Ambroni fleet station before it is found.' }),
  'Pueth': Object.freeze({
    empire: 'Hold the western road with the guard posts and break the rebel camp in the east.',
    coalition: 'Join the rebels in the east and turn the guard posts on the western road.' }),
  'Vastos': Object.freeze({
    empire: 'Break the rebel presence on the upland plain.', coalition: 'Break the Empire’s hold on the upland plain.' }),
  'Meneth': Object.freeze({
    empire: 'Break the rebel presence along the Southern Lotharn Road.', coalition: 'Break the Empire’s hold on the Southern Lotharn Road.' }),
  'Moros Plain': Object.freeze({
    empire: 'Clear the bandits and rebel remnants from the plain roads.', coalition: 'Take the imperial outpost on the plain for the Republic.' }),
  'West Suval': Object.freeze({
    empire: 'Destroy the rebel remnants in the southeast of West Suval.', coalition: 'Help the remnants retake Solis for the Republic.' }),
  'Amod': Object.freeze({
    empire: 'Break the rebel camp in the northwest of Amod.', coalition: 'Help the rebels hold the northwest against the garrison.',
    truce: 'Broker a truce between the garrison and the rebels for the attack on the goblin outpost.' }),
  'Nesdor': Object.freeze({
    empire: 'Break the rebel presence in Nesdor.', coalition: 'Help the rebels hold Nesdor.',
    truce: 'Broker a truce between the rebels and the garrison for the attack on the sand goblin camp.' }),
  'Feradom': Object.freeze({
    empire: 'Keep the duchy loyal: quiet the whispers of an independent crown.', coalition: 'Nurse a small republican movement in a country that loves its duke.' }),
  'Caricas': Object.freeze({ empire: 'Break the rebel presence in Caricas.', coalition: 'Break the Empire’s hold on Caricas.' }),
  'Eer': Object.freeze({ empire: 'Quiet the unrest on the road south.', coalition: 'Turn the unrest on the road south into a rising.' }),
  'East Lotharn Mountains': Object.freeze({
    empire: 'Defeat the rebels of the Lotharn.', coalition: 'Help the rebels of the Lotharn.',
    truce: 'Make a truce against the common enemy in the mountains.' }),
});

export const CAMPAIGN_MISSIONS = Object.freeze({
  'invade-west-izol': Object.freeze({ id: 'invade-west-izol', side: 'empire', region: 'West Izol', title: 'The invasion of West Izol',
    detail: 'With all five provinces pacified, Ambron turns on the republic that armed the rebels. A hard battle; win it and West Izol is imperial.',
    requires: { provinces: LEVEL_ONE_PROVINCES }, control: { 'West Izol': 'empire' }, follow: 'subdue-east-izol' }),
  'subdue-east-izol': Object.freeze({ id: 'subdue-east-izol', side: 'empire', region: 'East Izol', title: 'East Izol',
    detail: 'A side mission: finish the Izoli in the east.', requires: { mission: 'invade-west-izol' }, control: { 'East Izol': 'empire' }, follow: null }),
  'invade-elagos': Object.freeze({ id: 'invade-elagos', side: 'coalition', region: 'Elagos', title: 'The siege of Ambron',
    detail: 'With the five provinces, Nesdor and the Moros in the Republic’s hands, the Coalition marches on the lake city. Bigger and harder than any battle before it; win it and the Republic rules.',
    requires: { provinces: [...LEVEL_ONE_PROVINCES, 'Nesdor', 'Moros Plain'] }, control: { 'Elagos': 'coalition' }, follow: 'liberate-drent' }),
  'liberate-drent': Object.freeze({ id: 'liberate-drent', side: 'coalition', region: 'Drent', title: 'Drent for the Republic',
    detail: 'A side mission: bring the province where you landed over to the Republic.', requires: { mission: 'invade-elagos' }, control: { 'Drent': 'coalition' }, follow: null }),
});

const other = side => side === 'empire' ? 'coalition' : 'empire';
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const fail = reason => ({ ok: false, reason });
const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const initialControl = () => Object.fromEntries(REGION_DESIGN.map(entry => [entry.id, entry.control]));

const emptyState = () => ({
  version: CAMPAIGN_VERSION, revision: 0, side: null, chapterId: 'drent-road', completed: [], battles: {}, attempts: {},
  survey: [], arcs: {}, truces: [], control: {}, trust: { empire: 60, coalition: 15 }, crossings: 0, exposed: false, horse: false, missions: {}, early: false,
});

function validateSnapshot(value) {
  if (!isPlainObject(value) || value.version !== CAMPAIGN_VERSION || !Number.isSafeInteger(value.revision) || value.revision < 0) return false;
  if (!(value.side === null || SIDES.includes(value.side)) || !Object.hasOwn(CHAPTERS, value.chapterId)) return false;
  if (!Array.isArray(value.completed) || new Set(value.completed).size !== value.completed.length
    || value.completed.some(id => !Object.hasOwn(CHAPTERS, id)) || value.completed.includes(value.chapterId)) return false;
  if (!isPlainObject(value.battles) || Object.entries(value.battles).some(([id, outcome]) =>
    !['battle', 'assassination'].includes(CHAPTERS[id]?.kind) || !BATTLE_OUTCOMES.includes(outcome))) return false;
  if (!isPlainObject(value.attempts) || Object.entries(value.attempts).some(([id, count]) => !Object.hasOwn(CHAPTERS, id) || !Number.isSafeInteger(count) || count < 0)) return false;
  if (!Array.isArray(value.survey) || new Set(value.survey).size !== value.survey.length || value.survey.some(id => !LOTHARN_SURVEY_POINTS.includes(id))) return false;
  if (!isPlainObject(value.arcs) || Object.entries(value.arcs).some(([id, side]) => !REGIONAL_ARCS[id]?.[side] || !SIDES.includes(side))) return false;
  if (!Array.isArray(value.truces) || new Set(value.truces).size !== value.truces.length || value.truces.some(id => !REGIONAL_ARCS[id]?.truce)) return false;
  if (!isPlainObject(value.control) || Object.entries(value.control).some(([id, faction]) => !regionDesign(id) || !Object.hasOwn(FACTIONS, faction))) return false;
  if (!isPlainObject(value.trust) || SIDES.some(side => !Number.isFinite(value.trust[side]) || value.trust[side] < 0 || value.trust[side] > 100)) return false;
  if (!Number.isSafeInteger(value.crossings) || value.crossings < 0 || typeof value.exposed !== 'boolean' || typeof value.horse !== 'boolean') return false;
  if (!isPlainObject(value.missions) || Object.entries(value.missions).some(([id, outcome]) => !Object.hasOwn(CAMPAIGN_MISSIONS, id) || !BATTLE_OUTCOMES.includes(outcome))) return false;
  // A save from before anybody could be early simply was not (see `earlyMuster`).
  if (Object.hasOwn(value, 'early') && typeof value.early !== 'boolean') return false;
  // Story invariants: a side exists exactly when the fork is behind us; the
  // current chapter belongs to the chosen side; the horse comes from Luscia.
  const chapter = CHAPTERS[value.chapterId];
  const forked = value.completed.includes('suval-envoy');
  if (forked !== (value.side !== null)) return false;
  if (chapter.side !== 'both' && chapter.side !== 'chosen' && chapter.side !== value.side) return false;
  if (value.horse !== value.completed.includes('luscia-aftermath')) return false;
  if (value.chapterId !== 'drent-road' && !value.completed.includes('drent-road')) return false;
  return true;
}

/**
 * The border battle used to be rolled after the traveler had already won their
 * corner of it, so a won fight could come out as a lost day and send the story
 * down the fallback road. Every 'defeat' a save holds for it was a won fight:
 * this puts such a save on the victory road. A traveler on the fallback chapter,
 * or past it, goes to the conquest instead (the Empire's into Solis, the
 * Republic's against the army's outpost); nothing beyond the fallback's next
 * chapter is built, so nothing that could be played is lost.
 */
export const FALLBACK_CONQUEST = Object.freeze({ 'moros-fallback': 'solis-sweep', 'solis-fallback': 'moros-outpost' });
export function settleBorderBattle(data) {
  if (!isPlainObject(data) || !isPlainObject(data.battles) || data.battles['border-battle'] !== 'defeat' || !Array.isArray(data.completed)) return data;
  const fixed = { ...data, battles: { ...data.battles, 'border-battle': 'victory' }, completed: [...data.completed] };
  const fallback = Object.keys(FALLBACK_CONQUEST).find(id => id === data.chapterId || data.completed.includes(id));
  if (!fallback) return fixed;
  const at = fixed.completed.indexOf(fallback);
  if (at >= 0) fixed.completed = fixed.completed.slice(0, at);
  fixed.chapterId = FALLBACK_CONQUEST[fallback];
  return fixed;
}

export function createCampaign({ onEvent = () => {} } = {}) {
  let state = emptyState();

  const snapshot = () => ({
    ...state, completed: [...state.completed], battles: { ...state.battles }, attempts: { ...state.attempts }, survey: [...state.survey],
    arcs: { ...state.arcs }, truces: [...state.truces], control: { ...state.control }, trust: { ...state.trust }, missions: { ...state.missions }, early: state.early,
  });

  function emit(actionId, detail = {}) {
    state.revision++;
    const event = { type: 'campaign-progress', sequence: state.revision, actionId, chapterId: state.chapterId, side: state.side, ...detail };
    onEvent(event);
    return { ok: true, reason: '', ...event };
  }

  const current = () => CHAPTERS[state.chapterId];

  function arcCount(side, regions = null) {
    return Object.entries(state.arcs).filter(([id, owner]) => owner === side && (!regions || regions.includes(id))).length;
  }

  /** Map control after the story and the regional arcs. */
  function mapControl() {
    return { ...initialControl(), ...state.control };
  }

  function applyControl(changes = {}) {
    for (const [id, faction] of Object.entries(changes)) if (regionDesign(id)) state.control[id] = faction;
  }

  /** How the side quests tilt a fight. Even at 50; capped so a fight is never certain. */
  function battleOdds(chapterId = state.chapterId) {
    const chapter = CHAPTERS[chapterId];
    if (!chapter || !['battle', 'assassination'].includes(chapter.kind)) return null;
    const side = chapter.side === 'chosen' ? state.side : chapter.side;
    if (!side) return null;
    const truce = chapter.kind === 'battle' && chapter.region && state.truces.includes(chapter.region) ? 15 : 0;
    const tilt = 10 * (arcCount(side) - arcCount(other(side))) + truce;
    return { side, chance: clamp(50 + tilt, 15, 85), tilt, truce: truce > 0 };
  }

  function advanceTo(nextId, actionId, detail = {}) {
    const finished = state.chapterId;
    state.completed.push(finished);
    const reward = CHAPTERS[finished].reward ?? null;
    if (reward === 'horse') state.horse = true;
    applyControl(CHAPTERS[finished].control);
    state.chapterId = nextId;
    return emit(actionId, { completedChapter: finished, reward, ...detail });
  }

  function chooseSide(side) {
    if (current().kind !== 'fork') return fail('There is no offer on the table yet. Reach the Coalition army at Solis first.');
    if (!SIDES.includes(side)) return fail('Choose the Empire or the Coalition.');
    state.side = side;
    state.trust[side] = clamp(state.trust[side] + 15, 0, 100);
    return advanceTo('border-battle', 'choose-side', { side });
  }

  /** Report a finished chapter. Battles and assassinations need an outcome; surveys need every point. */
  function completeChapter(chapterId, outcome = null) {
    const chapter = current();
    if (chapterId !== chapter.id) return fail(`Your current chapter is “${chapter.title}”.`);
    if (chapter.kind === 'fork') return fail('Decide whose sellsword you are before the story moves on.');
    if (chapter.kind === 'frontier') return fail('The written story ends at the Oremindi. The next chapter has not been designed yet.');
    if (chapter.kind === 'arc') {
      const side = chapter.side;
      if (arcCount(side, LEVEL_ONE_PROVINCES) < 1) return fail(`Finish one level-one province for the ${FACTIONS[side].short} first.`);
      return advanceTo(chapter.next, 'complete-chapter');
    }
    if (chapter.kind === 'survey') {
      if (chapter.points.some(point => !state.survey.includes(point))) return fail('Visit every survey point before reporting.');
      return advanceTo(chapter.next, 'complete-chapter');
    }
    if (['battle', 'assassination'].includes(chapter.kind)) {
      if (!BATTLE_OUTCOMES.includes(outcome)) return fail('A battle ends in victory or defeat.');
      const side = chapter.side === 'chosen' ? state.side : chapter.side;
      const nextId = chapter.outcomes[side]?.[outcome];
      if (nextId === undefined) return fail('This battle does not belong to your side.');
      state.attempts[chapter.id] = (state.attempts[chapter.id] ?? 0) + 1;
      if (nextId === null) return emit('battle-retry', { outcome, attempts: state.attempts[chapter.id] });
      state.battles[chapter.id] = outcome;
      return advanceTo(nextId, 'complete-chapter', { outcome });
    }
    return advanceTo(chapter.next, 'complete-chapter');
  }

  function surveyPoint(pointId) {
    if (current().kind !== 'survey') return fail('There is nothing to survey in this chapter.');
    if (!LOTHARN_SURVEY_POINTS.includes(pointId)) return fail('That is not one of the three survey points.');
    if (state.survey.includes(pointId)) return fail('You have already surveyed that corner.');
    state.survey.push(pointId);
    return emit('survey-point', { pointId, remaining: LOTHARN_SURVEY_POINTS.filter(id => !state.survey.includes(id)) });
  }

  /**
   * Settle a regional arc for a side. Working against your chosen side is
   * double-dealing: it pays, it flips the province, and after enough of it
   * the faction you serve finds out.
   */
  function resolveArc(regionId, side) {
    const arc = REGIONAL_ARCS[regionId];
    if (!arc) return fail('No regional arc is written for that region.');
    if (!arc[side]) return fail(`That region has no ${side} arc.`);
    if (state.chapterId === 'drent-road') return fail('Drent has no militia to join. The war begins beyond the Caloss.');
    if (side === 'truce') {
      if (state.truces.includes(regionId)) return fail('A truce already holds there.');
      state.truces.push(regionId);
      for (const faction of SIDES) state.trust[faction] = clamp(state.trust[faction] + 6, 0, 100);
      return emit('resolve-truce', { regionId });
    }
    if (state.arcs[regionId] === side) return fail('That province is already settled for that side.');
    state.arcs[regionId] = side;
    state.control[regionId] = side;
    state.trust[side] = clamp(state.trust[side] + 12, 0, 100);
    state.trust[other(side)] = clamp(state.trust[other(side)] - 8, 0, 100);
    const served = state.side ?? (arcCount(other(side)) > arcCount(side) ? other(side) : null);
    let exposedNow = false;
    if (served && served !== side) {
      state.crossings++;
      if (!state.exposed && state.crossings >= EXPOSURE_THRESHOLD) {
        state.exposed = exposedNow = true;
        state.trust[served] = clamp(state.trust[served] - 30, 0, 100);
      }
    }
    const result = emit('resolve-arc', { regionId, side, exposed: exposedNow, provinces: arcCount(side, LEVEL_ONE_PROVINCES) });
    // Ambron's or Izolveth's proof-of-service chapter completes itself.
    if (current().kind === 'arc' && current().side === side && arcCount(side, LEVEL_ONE_PROVINCES) >= 1) advanceTo(current().next, 'complete-chapter');
    return result;
  }

  function missionAvailable(mission) {
    if (state.side !== mission.side || state.missions[mission.id] === 'victory') return false;
    if (mission.requires.mission) return state.missions[mission.requires.mission] === 'victory';
    return mission.requires.provinces.every(id => state.arcs[id] === mission.side);
  }

  function availableMissions() {
    return Object.values(CAMPAIGN_MISSIONS).filter(missionAvailable);
  }

  function resolveMission(missionId, outcome) {
    const mission = CAMPAIGN_MISSIONS[missionId];
    if (!mission || !missionAvailable(mission)) return fail('That campaign mission is not open to you.');
    if (!BATTLE_OUTCOMES.includes(outcome)) return fail('A battle ends in victory or defeat.');
    state.missions[missionId] = outcome;
    if (outcome === 'victory') { applyControl(mission.control); state.trust[mission.side] = clamp(state.trust[mission.side] + 20, 0, 100); }
    return emit('resolve-mission', { missionId, outcome });
  }

  /**
   * The traveler reached the muster before the company did. Venmor remembers who came first,
   * and that is the one thing the short road has that the long road cannot get
   * (docs/drent-long-road.md §9). A small gain in the army's trust, once and once only.
   */
  function earlyMuster() {
    if (state.early) return { ok: true, first: false, trust: state.trust.empire };
    state.early = true;
    state.trust.empire = clamp(state.trust.empire + 4, 0, 100);
    return emit('early-muster', { trust: state.trust.empire, first: true });
  }

  function milestones(side = state.side) {
    if (!side) return { side: null, provinces: 0, threeOfFive: false, fiveOfFive: false };
    const provinces = arcCount(side, LEVEL_ONE_PROVINCES);
    return { side, provinces, threeOfFive: provinces >= 3, fiveOfFive: provinces >= 5 };
  }

  function view() {
    const chapter = current(), design = chapter.region ? regionDesign(chapter.region) : null;
    const odds = battleOdds();
    const standing = milestones();
    return {
      chapterId: chapter.id, title: chapter.title, detail: chapter.detail, kind: chapter.kind,
      region: chapter.region, level: design?.level ?? null, levelName: design ? levelInfo(design.level).name : null,
      side: state.side, sideName: state.side ? FACTIONS[state.side].name : 'Undecided', horse: state.horse, exposed: state.exposed,
      trust: { ...state.trust }, arcs: { empire: arcCount('empire'), coalition: arcCount('coalition') }, milestones: standing,
      odds, missions: availableMissions().map(mission => ({ id: mission.id, title: mission.title, region: mission.region })),
      destinations: chapter.region ? [chapter.region] : [...LEVEL_ONE_PROVINCES],
      completed: [...state.completed], frontier: chapter.kind === 'frontier', surveyed: [...state.survey],
    };
  }

  function restore(saved) {
    const data = settleBorderBattle(saved);
    if (!validateSnapshot(data)) return false;
    state = { version: CAMPAIGN_VERSION, revision: data.revision, side: data.side, chapterId: data.chapterId,
      completed: [...data.completed], battles: { ...data.battles }, attempts: { ...data.attempts }, survey: [...data.survey],
      arcs: { ...data.arcs }, truces: [...data.truces], control: { ...data.control }, trust: { empire: data.trust.empire, coalition: data.trust.coalition },
      crossings: data.crossings, exposed: data.exposed, horse: data.horse, missions: { ...data.missions }, early: data.early ?? false };
    return true;
  }

  return {
    chooseSide, completeChapter, surveyPoint, resolveArc, resolveMission, availableMissions, battleOdds, mapControl, milestones, earlyMuster, view, snapshot, restore,
    get state() { return { ...snapshot(), chapter: current().id }; },
  };
}

export function validateCampaignSnapshot(data) {
  return validateSnapshot(data);
}

/** Every chapter is reachable and every `next` points at a real chapter. Used by tests and the doc generator. */
export function campaignGraphIssues() {
  const issues = [];
  for (const chapter of Object.values(CHAPTERS)) {
    const targets = chapter.kind === 'fork' ? ['border-battle']
      : ['battle', 'assassination'].includes(chapter.kind) ? Object.values(chapter.outcomes).flatMap(map => Object.values(map)).filter(Boolean)
        : chapter.next ? [chapter.next] : [];
    for (const target of targets) if (!Object.hasOwn(CHAPTERS, target)) issues.push(`${chapter.id} → ${target} is missing`);
    if (chapter.region && !regionDesign(chapter.region)) issues.push(`${chapter.id} names an undesigned region ${chapter.region}`);
  }
  for (const id of Object.keys(REGIONAL_ARCS)) if (!regionDesign(id)) issues.push(`arc region ${id} is undesigned`);
  return issues;
}
