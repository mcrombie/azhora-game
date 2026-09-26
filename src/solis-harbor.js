import { SOLIS, solisPoint } from './region-world.js';

const freeze = Object.freeze;
const deck = (id, kind, minA, maxA, minB, maxB) => freeze({ id, kind, minA, maxA, minB, maxB, y: 2 });

/** The made waterfront below Solis's existing quay gate; all dimensions are metres. */
export const SOLIS_HARBOR = freeze({
  ramp: freeze({ id: 'harbour-ramp', minA: -83, maxA: -63, minB: -10.6, maxB: -5.4, low: 2, high: 3.42 }),
  decks: freeze([
    deck('stone-quay', 'stone', -88, -81, -18, 28),
    deck('north-pier', 'timber', -117, -85, -12, -8),
    deck('south-pier', 'timber', -110, -85, 12, 16),
    deck('south-breakwater', 'stone', -123, -85, 24, 28),
  ]),
  boats: freeze([
    freeze({ id: 'wine-coaster', ...solisPoint(-103, -3.8), length: 8.4, width: 2.6, yaw: -Math.PI / 2, mast: true }),
    freeze({ id: 'quay-lighter', ...solisPoint(-99, 8), length: 6.8, width: 2.3, yaw: -Math.PI / 2, mast: false }),
    freeze({ id: 'harbour-skiff', ...solisPoint(-116, 4), length: 4.8, width: 1.8, yaw: -.1, mast: false }),
  ]),
  view: freeze({ ...solisPoint(-102, 6), up: 10, yaw: -1.1, pitch: .5, distance: 55 }),
});

const within = (a, b, box) => a >= box.minA && a <= box.maxA && b >= box.minB && b <= box.maxB;

/** Exact top of the drawn ramp, quay or pier; the ordinary sea floor stays below it. */
export function solisHarborDeckHeight(x, z) {
  const a = x - SOLIS.centre.x, b = z - SOLIS.centre.z, ramp = SOLIS_HARBOR.ramp;
  if (a < -123 || a > -63 || b < -18 || b > 28) return null;
  if (within(a, b, ramp)) return ramp.low + (ramp.high - ramp.low) * (a - ramp.minA) / (ramp.maxA - ramp.minA);
  return SOLIS_HARBOR.decks.find(deck => within(a, b, deck))?.y ?? null;
}

export function inSolisHarbor(x, z) {
  const a = x - SOLIS.centre.x, b = z - SOLIS.centre.z;
  return a >= -127 && a <= -61 && b >= -23 && b <= 32;
}

/** Shared by navigation, charts and the walking checks. */
export const SOLIS_HARBOR_PATHS = freeze([
  freeze([solisPoint(-63, -8), solisPoint(-84.5, -8), solisPoint(-84.5, -10), solisPoint(-115, -10)]),
  freeze([solisPoint(-84.5, -8), solisPoint(-84.5, 14), solisPoint(-108, 14)]),
  freeze([solisPoint(-84.5, 14), solisPoint(-84.5, 26), solisPoint(-121, 26)]),
]);
