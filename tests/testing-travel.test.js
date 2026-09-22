import test from 'node:test';
import assert from 'node:assert/strict';
import { travelCountries, travelPlaces, landingSpot, nearestPlace, parsePoint, SEARCH_REACH } from '../src/testing-travel.js';
import { PLAYABLE_REGIONS } from '../src/region-layout.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { regions } from '../src/region-world.js';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';

/** How far past the flat reach a wide ground's own radius lets the search go. */
const RING_SLACK = 8;

/**
 * The panel's whole point is that it is derived. These tests are the law that keeps it derived:
 * the day somebody writes a country or a ground into a list by hand, one of them goes red.
 */
test('every playable country is offered, in the world’s own order, with somewhere to arrive', () => {
  const countries = travelCountries();
  assert.deepEqual(countries.map(one => one.name), [...PLAYABLE_REGIONS],
    'a country the game can be played in that the testing panel cannot reach');
  for (const country of countries) {
    assert.equal(country.id, regions.find(one => one.name === country.name).id, `${country.name} has its own id`);
    assert.ok(country.subtitle.length > 4, `${country.name} says what it is`);
    assert.ok(Number.isFinite(country.spawn.x) && Number.isFinite(country.spawn.z), `${country.name} has a spawn`);
  }
  // The eight built since the last hand-written button, which is why this exists at all.
  for (const name of ['Amod', 'Vastos', 'Meneth', 'Caricas', 'Nesdor', 'Eer', 'Isareos', 'Nethereum'])
    assert.ok(countries.some(one => one.name === name), `${name} is reachable`);
});

test('every named ground on the chart is reachable from its own country, and the spawn leads', () => {
  const seen = new Set();
  for (const country of travelCountries()) {
    const places = travelPlaces(country.name);
    assert.equal(places[0].id, '', `${country.name} offers its usual arrival first`);
    assert.deepEqual({ x: places[0].x, z: places[0].z }, { x: country.spawn.x, z: country.spawn.z },
      `${country.name}'s usual arrival is its spawn`);
    assert.equal(places.length, country.places + 1, `${country.name} counts its own ground`);
    for (const place of places.slice(1)) {
      assert.equal(place.region, country.name, `${place.id} is offered under ${place.region}`);
      assert.ok(place.note.length > 20, `${place.id} says what it is`);
      seen.add(place.id);
    }
  }
  assert.equal(seen.size, SUBREGIONS.length, 'a named ground the panel cannot reach');
  assert.deepEqual(travelPlaces('Nowhere'), [], 'a country that does not exist offers nothing');
});

test('a landing is inside the ground, standable, and the same one every time', () => {
  const place = { x: 100, z: 100, radius: 30 };
  assert.deepEqual({ ...landingSpot(place, () => true) }, { x: 100, z: 100, away: 0 },
    'ground that will hold him is not searched');
  // A ground whose centre is water: the first ring that clears it, at the first bearing that does.
  const wet = (x, z) => Math.hypot(x - 100, z - 100) > 5;
  const found = landingSpot(place, wet);
  assert.ok(wet(found.x, found.z) && found.away === 8, `landed ${found.away} m out`);
  assert.deepEqual(landingSpot(place, wet), { ...found }, 'the same ground twice');
  assert.equal(landingSpot(place, () => false), null, 'a ground that refuses everywhere says so');
  // The reach is the ground's own radius when that is the larger, so a big ground is searched whole.
  const wide = { x: 0, z: 0, radius: 130 };
  assert.ok(landingSpot(wide, (x, z) => Math.hypot(x, z) > SEARCH_REACH + RING_SLACK), 'a wide ground is searched to its rim');
  assert.equal(landingSpot(null, () => true), null);
  assert.equal(landingSpot({ x: NaN, z: 0 }, () => true), null);
});
test('the panel can say where you are standing in the chart’s own words', () => {
  const tidehaven = SUBREGIONS.find(area => area.id === 'eastreena');
  const here = nearestPlace({ x: tidehaven.x, z: tidehaven.z });
  assert.equal(here.id, 'eastreena');
  assert.equal(here.away, 0, 'inside a ground is nought metres from it');
  const out = nearestPlace({ x: tidehaven.x + tidehaven.radius + 40, z: tidehaven.z });
  assert.ok(out.away > 0, 'outside every ground it is a distance');
  assert.equal(nearestPlace({}), null);
});

test('a point written down anywhere in this project reads back', () => {
  assert.deepEqual({ ...parsePoint('-1050, 982') }, { x: -1050, z: 982 });
  assert.deepEqual({ ...parsePoint('(-1050, 982)') }, { x: -1050, z: 982 }, 'a report’s parentheses');
  assert.deepEqual({ ...parsePoint('[-1050, 982]') }, { x: -1050, z: 982 }, 'a log line’s brackets');
  assert.deepEqual({ ...parsePoint('-1050 982') }, { x: -1050, z: 982 }, 'a space is a separator');
  assert.deepEqual({ ...parsePoint('stand-at:-806.1,-521,-1.57') }, { x: -806.1, z: -521, facing: -1.57 },
    'the review runner’s own shot, pasted');
  assert.equal(parsePoint('nowhere'), null);
  assert.equal(parsePoint('12'), null, 'one number is not a place');
  assert.equal(parsePoint(null), null);
});

/**
 * And the whole point of it, on the real ground rather than a pretend country: the panel must
 * be able to put a body down at every place it offers. Measured when this was written: nought
 * refused, seventeen landed off their centre, the furthest 60 m out at Lake Ela, whose middle
 * is water and whose landing is therefore its shore.
 */
test('every place the panel offers has ground a body can stand on', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const standable = (x, z) => canStand(x, z, world, BODY.person);
  const refused = [], far = [];
  for (const country of travelCountries()) for (const place of travelPlaces(country.name)) {
    const spot = place.radius ? landingSpot(place, standable) : { x: place.x, z: place.z, away: 0 };
    if (!spot) { refused.push(`${country.name} · ${place.name}`); continue; }
    if (spot.away > 0) far.push(place.name);
  }
  assert.deepEqual(refused, [], 'a place the panel offers and then refuses to travel to');
  assert.ok(far.length <= 24, `${far.length} places are not standable at their own middle: ${far.join(', ')}`);
});
