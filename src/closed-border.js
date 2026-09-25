/**
 * Closed regions: ground the traveler may not enter yet.
 *
 * East Suval is closed. Elod has locked its country down to stay out of the war,
 * and its pickets turn back anyone who crosses from Luscia or the hills. A move
 * that would carry the traveler from outside a closed region to inside it is
 * refused wherever along the border it happens, not only at the gate. Somebody
 * already inside (a tester sent there by the F8 tools, an old save) moves about
 * freely; ordinary walls and locked gates still apply. Pure: no three, no DOM.
 */
import { insideRegion } from './region-world.js';

export const CLOSED_REGIONS = Object.freeze(['East Suval']);

/** The toast the traveler sees when turned back, and how often it may repeat. */
export const CLOSED_BORDER_TITLE = 'EAST SUVAL · CLOSED BY ELOD';
export const CLOSED_BORDER_LINES = Object.freeze([
  'An Elodi picket steps out of the heather, spear level. “No crossing. Turn back.”',
  'Black-clad pickets watch you from the rocks. The border of Elod is closed, and they mean it.',
  'A horn sounds from the ridge and two Elodi riders come down to meet you. You turn back before they reach you.',
]);
export const CLOSED_BORDER_COOLDOWN = 6;

/** The closed region a move from `from` to `to` would enter, or null. */
export function closedRegionEntered(from, to, closed = CLOSED_REGIONS, inside = insideRegion) {
  if (!from || !to || ![from.x, from.z, to.x, to.z].every(Number.isFinite)) return null;
  for (const name of closed) if (!inside(name, from.x, from.z) && inside(name, to.x, to.z)) return name;
  return null;
}

/**
 * A watch on the closed borders for one traveler. `step(from, to, now)` says
 * whether the move is refused and, at most once per cooldown, the line to show.
 */
export function createBorderWatch({ closed = CLOSED_REGIONS, inside = insideRegion, cooldown = CLOSED_BORDER_COOLDOWN, lines = CLOSED_BORDER_LINES } = {}) {
  let lastToast = -Infinity, turned = 0, toasts = 0;
  return {
    step(from, to, now = 0) {
      const region = closedRegionEntered(from, to, closed, inside);
      if (!region) return { refused: false, region: null, toast: null };
      turned++;
      let toast = null;
      if (now - lastToast >= cooldown) { lastToast = now; toast = lines[toasts++ % lines.length]; }
      return { refused: true, region, toast };
    },
    get turnedBack() { return turned; },
  };
}
