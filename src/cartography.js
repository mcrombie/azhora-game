/**
 * The traveler's own chart of Azhora. Unknown country is dark; a coast you have
 * been shown is a lighter silhouette against the sea; a country somebody has
 * named for you carries its name and nothing else; ground you have walked shows
 * the real atlas. docs/cartography.md is the whole design.
 *
 * Four states, and a chart only ever goes forward:
 *
 *   unknown   dark
 *   heard     the name and a rough bearing, from asking somebody who knows
 *   charted   the shape of it, coast against sea, no interior
 *   explored  six of its hexes under your own boots
 *
 * They are a ladder with one exception that matters: `charted` does not imply
 * `heard`. You can be shown a coast without being told whose it is, and told a
 * name for country you will never see. So a region carries a rank *and* a
 * `named` flag, and the chart draws a label whenever a region is named, however
 * it came to be.
 *
 * Pure: no DOM, no three, no atlas. `src/world-map.js` draws what is described
 * here and `src/region-levels.js` says how hard each country is.
 */
import { regionLevel, levelWords } from './region-levels.js';

export const CARTOGRAPHY_VERSION = 1;
export const CARTOGRAPHY_SKILL = 'cartography';

/** The four states, weakest first. */
export const CHART_STATES = Object.freeze(['unknown', 'heard', 'charted', 'explored']);
const RANK = Object.freeze({ unknown: 0, heard: 1, charted: 2, explored: 3 });

/**
 * How many hexes of a region have to be under the traveler's own boots before the region as a
 * whole counts as explored. Six: enough to be a walk through a country rather than a toe over
 * its border, and few enough that a chapter's ground qualifies without a grand tour.
 */
export const EXPLORED_HEXES = 6;

/** What each thing a chart can learn is worth. */
export const CHART_XP = Object.freeze({ firstHex: 15, heard: 10, charted: 25, explored: 40 });

/**
 * The rough chart Tidehaven keeps, which Jojo hands over on the landing. The coast from Feradom
 * down through Pueth to Drent, and the coasts of Luscia and the two Suvals - shapes against the
 * sea, no interiors. Only Drent is named: you can see what the country you are standing in is
 * called, and nothing that is in it.
 */
/**
 * **Nothing.** (The user, 22 September 2026: you start with no map, and the chart is dark until
 * you discover it - the coastlines too.)
 *
 * The traveler used to land holding six countries already charted: this whole coast from Feradom
 * down past Pueth, Luscia and the two Suvals as shapes against the sea, and Drent written across
 * the only ground anybody here had walked. It was Jojo's rough chart, handed over with the
 * letter, and it meant the map was three-quarters answered before the player had walked
 * anywhere. Now there is no chart at all until Glun gives him one, and every coast on it is
 * drawn by walking.
 */
export const STARTING_CHART = Object.freeze({});

/** A fresh copy of the starting chart, with nothing walked yet. */
export const startingChart = () => Object.fromEntries(
  Object.entries(STARTING_CHART).map(([name, entry]) => [name, { state: entry.state, named: entry.named, hexes: 0 }]));

/**
 * Who borders whom, for the regions the built world can reach. Computed once from the atlas's own
 * cells (`computeAdjacency` in src/campaign-world.js) and written down here so the model stays
 * pure; only borders of two hexes or more count, so a corner touch is not a direction. Peblos is
 * the exception: it is islands and borders nobody, so Drent's coast people carry it.
 */
export const REGION_NEIGHBOURS = Object.freeze({
  Drent: Object.freeze(['Pueth', 'Luscia', 'Elagos', 'Peblos']),
  Luscia: Object.freeze(['Moros Plain', 'Drent', 'Elagos', 'East Suval', 'West Suval']),
  'Moros Plain': Object.freeze(['Luscia', 'Nesdor', 'West Suval', 'Elagos', 'Eer']),
  'East Suval': Object.freeze(['West Suval', 'South Suval', 'Luscia']),
  'West Suval': Object.freeze(['East Suval', 'Moros Plain', 'South Suval', 'Luscia']),
  Pueth: Object.freeze(['Drent', 'Feradom', 'Amod']),
  Peblos: Object.freeze(['Drent']),
  Elagos: Object.freeze(['Vastos', 'Luscia', 'Moros Plain', 'Amod', 'Meneth', 'Nesdor', 'Drent']),
  Amod: Object.freeze(['East Lotharn Mountains', 'Feradom', 'Elagos', 'Vastos', 'Pueth']),
  Feradom: Object.freeze(['Pueth', 'East Lotharn Mountains', 'Amod']),
  Vastos: Object.freeze(['Meneth', 'Elagos', 'West Lotharn Mountains', 'Amod', 'East Lotharn Mountains']),
  Meneth: Object.freeze(['Caricas', 'Vastos', 'West Lotharn Mountains', 'Elagos']),
  Caricas: Object.freeze(['Meneth', 'Isareos', 'Nesdor', 'Ovesos', 'Nethereum']),
  Nesdor: Object.freeze(['Moros Plain', 'Caricas', 'Eer', 'Ovesos', 'Elagos']),
  'West Izol': Object.freeze(['East Izol']),
  'East Izol': Object.freeze(['West Izol']),
  'South Suval': Object.freeze(['East Suval', 'West Suval']),
});

/**
 * What somebody says when they point the way. One line apiece, in a neutral voice: a bearing and
 * what you will find, not a lecture. `src/main.js` adds a per-NPC override where an obvious one
 * exists; this is what anybody would say.
 */
export const CARTOGRAPHY_DIRECTIONS = Object.freeze({
  Drent: 'East to the sea and the landing; the Greenway runs north-west under the trees, and the Caloss is its far edge.',
  Luscia: 'Over the Caloss, west and south. Sparse woods, reedcutters on the banks, and Lumber Town in the middle of it.',
  'Moros Plain': 'South-west past Lumber Town, where the trees give out. Open grass the whole way to the border ditch.',
  'East Suval': 'South, beyond the Suval border. Elod keeps the gate shut and the lowland quiet.',
  'West Suval': 'South-west, over the Moros. Vineyards on the hills, and an army on them at the moment.',
  Pueth: 'North from the Caloss Gate, up the Tessen road. Wooded in the south, bare hills at the top.',
  Peblos: 'Off Drent’s coast, east. Islands. You want a boat, or a very good opinion of your own swimming.',
  Feradom: 'North again past Pueth, along the coast. A duchy, and one that talks about not being one.',
  Elagos: 'Inland, south-east of the Caloss: the heartland, and Ambron in the middle of its lake.',
  Amod: 'East of Pueth and over the shoulder of the Lotharn. Terraces, and an ogre on the road in.',
  Vastos: 'South-east beyond Elagos. Cold tableland; the goblins there are the bramble kind.',
  Meneth: 'South of Vastos along the ridges. Same goblins, worse footing.',
  Caricas: 'South again past Meneth. The Lizeem runs through it — that is the river, not the country.',
  Nesdor: 'West off the Moros, toward the sand. Goblins with a chief, and a long way between wells.',
  'West Izol': 'Across the western sea. You do not walk there; you take a ship from a port that will admit it.',
  'East Izol': 'The far side of Izol from the Republic’s own country. Wolves, and nothing else that matters.',
  'South Suval': 'South of the two Suvals, round the lake. Bandits in the hills above Lamdris.',
  'East Lotharn Mountains': 'East, and up. Rebels, hill goblins, and the first orcs anybody has seen scouting.',
  Eer: 'West beyond the Moros. Quiet enough, if you keep off it at night.',
});

/**
 * What a dark chart has to draw over the atlas for a given chart, from the atlas’s own cells
 * (assets/azhora-dev-regions.json): the shape of every country whose coast is known, and the name
 * of every country somebody has named. Feradom is not one of the built regions and has no entry in
 * REGION_OUTLINES, so taking both from the atlas is what lets its coast be drawn at all.
 *
 * Ground the traveler has walked is already cut out of the dark by the hex fog, so a silhouette
 * under an explored country costs nothing and keeps the shape whole where the walking stops.
 */
export function chartShapes(entries, atlasRegions) {
  const byName = new Map((atlasRegions ?? []).map(region => [region.name ?? region.id, region]));
  const silhouettes = [], labels = [];
  for (const country of entries ?? []) {
    const atlas = byName.get(country?.name);
    if (!atlas) continue;
    if (country.state === 'charted' || country.state === 'explored') silhouettes.push({ name: country.name, cells: atlas.cells ?? [] });
    // A big country wants a bigger hand; the atlas gives the hex count to size it by.
    if (country.named) labels.push({ name: country.name, x: atlas.centerX, y: atlas.centerY,
      size: Math.max(22, Math.min(46, Math.round(Math.sqrt(atlas.hexCount ?? 9) * 11))) });
  }
  return { silhouettes, labels };
}

export function validateCartographySnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== CARTOGRAPHY_VERSION) return false;
  if (!data.regions || typeof data.regions !== 'object' || Array.isArray(data.regions)) return false;
  if (typeof data.met !== 'boolean') return false;
  return Object.entries(data.regions).every(([name, entry]) => typeof name === 'string' && name
    && entry && typeof entry === 'object' && !Array.isArray(entry)
    && CHART_STATES.includes(entry.state) && typeof entry.named === 'boolean'
    && Number.isInteger(entry.hexes) && entry.hexes >= 0);
}

export function createCartography({ skills = null, onEvent = () => {} } = {}) {
  let regions = startingChart(), met = false;

  const entry = name => regions[name] ?? null;
  const rankOf = name => RANK[entry(name)?.state ?? 'unknown'];
  const ensure = name => (regions[name] ??= { state: 'unknown', named: false, hexes: 0 });

  const gain = amount => {
    if (!met || !amount) return { levelled: false, level: skills?.level?.(CARTOGRAPHY_SKILL) ?? 1 };
    // eslint-disable-next-line no-unreachable -- kept above for clarity: nothing banks unmapped.
    const result = skills?.gain?.(CARTOGRAPHY_SKILL, amount);
    return { levelled: !!result?.levelled, level: result?.level ?? skills?.level?.(CARTOGRAPHY_SKILL) ?? 1 };
  };

  /** Jojo's rough chart, and the lesson that goes with it. Learned once. */
  function learn() {
    if (met) return { ok: true, first: false };
    met = true;
    skills?.learn?.(CARTOGRAPHY_SKILL);
    onEvent({ type: 'cartography-learned' });
    return { ok: true, first: true };
  }

  /** Move a region to at least `state`, and optionally put its name on the chart. */
  function raise(name, state, { named = false, xp = 0 } = {}) {
    if (typeof name !== 'string' || !name || !RANK[state]) return { ok: false, reason: 'There is no such country.' };
    // **A man with no chart draws nothing.** Walking, asking the way and being shown a coast all
    // record on a chart, and until Glun hands one over there is none to record on: otherwise the
    // country would fill itself in while the traveler was still being taught which end of a
    // sword to hold, and the map would open already half answered.
    if (!met) return { ok: true, first: false, xp: 0, state: entry(name)?.state ?? 'unknown', named: !!entry(name)?.named, levelled: false };
    const it = ensure(name);
    const rose = RANK[state] > RANK[it.state], naming = named && !it.named;
    if (!rose && !naming) return { ok: true, first: false, xp: 0, state: it.state, named: it.named, levelled: false };
    if (rose) it.state = state;
    if (named) it.named = true;
    const paid = rose ? xp : 0;
    const result = gain(paid);
    onEvent({ type: 'chart-changed', region: name, state: it.state, named: it.named, xp: paid, ...result });
    return { ok: true, first: true, xp: paid, state: it.state, named: it.named, ...result };
  }

  /** Somebody told you where it is and what it is called. */
  const hear = name => raise(name, 'heard', { named: true, xp: CHART_XP.heard });
  /** The shape of it is on the chart now: a coast against the sea, and no more than that. */
  const chart = name => raise(name, 'charted', { xp: CHART_XP.charted });
  /** Enough of it is under your own boots to call it yours. */
  const explore = name => raise(name, 'explored', { named: true, xp: CHART_XP.explored });

  /**
   * One hex of `name` charted. The first hex in a country pays, puts its shape on the chart and
   * its name with it - you are standing in it, after all - and the sixth makes it explored.
   */
  function noteHex(name) {
    if (typeof name !== 'string' || !name) return { ok: false, reason: 'That ground belongs to no country.' };
    if (!met) return { ok: true, first: false, xp: 0, hexes: 0, state: entry(name)?.state ?? 'unknown', named: !!entry(name)?.named, levelled: false };
    const it = ensure(name), first = it.hexes === 0;
    it.hexes += 1;
    let result = { ok: true, first, xp: 0, hexes: it.hexes, state: it.state, named: it.named, levelled: false };
    if (first) {
      const paid = gain(CHART_XP.firstHex);
      it.state = RANK.charted > RANK[it.state] ? 'charted' : it.state;
      it.named = true;
      // What was actually banked, not what the table is worth: this used to report fifteen
      // whether or not a single point had been given, so the banner on the pier said
      // "Cartography +15" to a traveler who had never been taught it.
      const worth = met ? CHART_XP.firstHex : 0;
      result = { ...result, xp: worth, state: it.state, named: true, ...paid };
      onEvent({ type: 'chart-changed', region: name, state: it.state, named: true, xp: worth, ...paid });
    }
    if (it.hexes >= EXPLORED_HEXES && it.state !== 'explored') {
      const risen = explore(name);
      result = { ...result, state: 'explored', xp: result.xp + risen.xp, levelled: result.levelled || risen.levelled, level: risen.level };
    }
    return result;
  }

  const state = name => entry(name)?.state ?? 'unknown';
  const named = name => !!entry(name)?.named;
  const hexes = name => entry(name)?.hexes ?? 0;
  const knows = name => rankOf(name) > 0 || named(name);

  /** The regions somebody living in `home` can point the traveler at, and has words for. */
  const directionsFrom = home => (REGION_NEIGHBOURS[home] ?? []).filter(name => CARTOGRAPHY_DIRECTIONS[name]);

  /**
   * The chart for the journal. A region's level is part of having charted it, so the number only
   * comes out at `charted` or better; before that there is a name at best.
   */
  function view() {
    const entries = Object.entries(regions)
      .filter(([, it]) => RANK[it.state] > 0 || it.named)
      .map(([name, it]) => ({
        name, state: it.state, named: it.named, hexes: it.hexes,
        level: RANK[it.state] >= RANK.charted ? regionLevel(name) : null,
        words: levelWords(regionLevel(name)),
      }))
      .sort((a, b) => RANK[b.state] - RANK[a.state] || a.name.localeCompare(b.name));
    const count = state => entries.filter(item => item.state === state).length;
    return { met, entries, total: entries.length, charted: count('charted'), explored: count('explored'), heard: count('heard') };
  }

  function snapshot() {
    return { version: CARTOGRAPHY_VERSION, met,
      regions: Object.fromEntries(Object.entries(regions).map(([name, it]) => [name, { state: it.state, named: it.named, hexes: it.hexes }])) };
  }

  function restore(data) {
    regions = startingChart(); met = false;
    if (!validateCartographySnapshot(data, { allowMissing: false })) return false;
    met = data.met;
    for (const [name, it] of Object.entries(data.regions)) {
      const kept = ensure(name);
      if (RANK[it.state] > RANK[kept.state]) kept.state = it.state;
      kept.named = kept.named || it.named;
      kept.hexes = Math.max(kept.hexes, it.hexes);
    }
    return true;
  }

  return { learn, hear, chart, explore, noteHex, state, named, hexes, knows, directionsFrom, view, snapshot, restore,
    get met() { return met; } };
}
