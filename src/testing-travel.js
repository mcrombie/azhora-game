/**
 * **Where a tester can jump to — derived, never authored.**
 *
 * The F8 panel grew one hand-written button per place, and by the seventeenth country it had
 * buttons for four of them. Eight countries built since — Amod, Vastos, Meneth, Caricas, Nesdor,
 * Eer, Isareos, Nethereum — could not be reached from the panel at all, so the only way to stand
 * in the newest ground in the game was a review render or a very long walk.
 *
 * So nothing here is a list. The countries are the region table (`regions`) and the places are
 * the chart's own named ground (`SUBREGIONS`), which means a country or a ground built tomorrow
 * is in the menu tomorrow, and nobody has to remember a button. `tests/testing-travel.test.js`
 * holds that: every playable region is offered, and every named ground is reachable.
 *
 * Pure: no DOM, no three, no world. The one thing this cannot know — whether a body fits on a
 * given patch of ground — is handed in as a predicate, so the search is testable against a
 * pretend country and the host passes it the real `canStand`.
 */
import { regions } from './region-world.js';
import { SUBREGIONS } from './map-fog.js';

const freeze = Object.freeze;

/** Every country a tester can be put in, in the order the world lists them. */
export function travelCountries() {
  return freeze(regions.map(region => freeze({
    id: region.id, name: region.name, subtitle: region.subtitle,
    spawn: freeze({ x: region.spawn.x, z: region.spawn.z }),
    places: SUBREGIONS.filter(area => area.region === region.name).length,
  })));
}

/**
 * The named ground inside one country, as the chart records it. The country's own spawn comes
 * first under its own name, because that is where every region button has always put you and a
 * tester looking for "the usual place" should not have to know which ground it stands in.
 */
export function travelPlaces(regionName) {
  const region = regions.find(one => one.name === regionName);
  if (!region) return freeze([]);
  const spawn = freeze({ id: '', name: 'The usual arrival', region: regionName, x: region.spawn.x, z: region.spawn.z,
    radius: 0, note: `Where the region button has always put you: ${region.subtitle.toLowerCase()}.` });
  return freeze([spawn, ...SUBREGIONS.filter(area => area.region === regionName).map(area => freeze({
    id: area.id, name: area.name, region: area.region, x: area.x, z: area.z, radius: area.radius, note: area.note,
  }))]);
}

/** Bearings tried at each ring, in a fixed order, so a landing is the same landing every time. */
const BEARINGS = 12;
/** How far apart the rings are, and how far out the search gives up (a ground's radius, at least this). */
const RING = 4;
export const SEARCH_REACH = 60;

/**
 * **Somewhere inside `place` that a body actually fits.** A ground's centre is a chart fact, not
 * a standing place: the middle of the Caloss Bank is the river, and the middle of a smithy is the
 * smithy. So the centre is tried first and then rings of twelve bearings outward, and the first
 * point the host's own `canStand` accepts is the answer. `null` means the whole ground refused,
 * which is worth seeing rather than papering over — the host says so and stays put.
 */
export function landingSpot(place, standable) {
  if (!place || !Number.isFinite(place.x) || !Number.isFinite(place.z)) return null;
  if (standable(place.x, place.z)) return freeze({ x: place.x, z: place.z, away: 0 });
  const reach = Math.max(SEARCH_REACH, Number(place.radius) || 0);
  for (let radius = RING; radius <= reach; radius += RING) {
    for (let step = 0; step < BEARINGS; step++) {
      const bearing = (step / BEARINGS) * Math.PI * 2;
      const x = place.x + Math.sin(bearing) * radius, z = place.z + Math.cos(bearing) * radius;
      if (standable(x, z)) return freeze({ x, z, away: radius });
    }
  }
  return null;
}

/**
 * **The nearest named ground to a point**, so the panel can say where the traveler is standing in
 * the words the chart uses. Distance is to the edge of the ground, not its centre: inside it the
 * answer is nought, which is what a tester means by "I am at the Toll House".
 */
export function nearestPlace({ x, z } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  let best = null;
  for (const area of SUBREGIONS) {
    const away = Math.max(0, Math.hypot(area.x - x, area.z - z) - area.radius);
    if (!best || away < best.away) best = { id: area.id, name: area.name, region: area.region, away };
  }
  return best && freeze(best);
}

/**
 * **A point written down anywhere in this project, read back.** Agents report coordinates as
 * `(-1050, 982)`, the review runner takes them as `stand-at:-1050,982,-1.57`, and a log line
 * gives them as `[-1050, 982]`. All three paste into the box and mean the same thing. A third
 * number is the facing, which is what `stand-at:` puts there.
 */
export function parsePoint(text) {
  if (typeof text !== 'string') return null;
  const numbers = text.replace(/^\s*stand-at:/i, ' ').match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return null;
  const [x, z, facing] = numbers.map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return freeze(Number.isFinite(facing) && numbers.length > 2 ? { x, z, facing } : { x, z });
}
