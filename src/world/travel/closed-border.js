/**
 * Closed regions: ground the traveler may not enter yet.
 *
 * East Suval is closed. Elod has locked its country down to stay out of the war,
 * and its pickets turn back anyone who crosses from Luscia or the hills. Feradom
 * is closed too: the duchy has shut its passes (src/content/regions/feradom/feradom-forts.js), and the
 * army has barred its own end of the road in Pueth. A move
 * that would carry the traveler from outside a closed region to inside it is
 * refused wherever along the border it happens, not only at the gate. Somebody
 * already inside (a tester sent there by the F8 tools, an old save) moves about
 * freely; ordinary walls and locked gates still apply. Pure: no three, no DOM.
 *
 * **Closed places** are the same rule on a smaller ring: Varn, the Empire's fortress-city on the Lotharn
 * pass, while its gates are shut (src/content/regions/varn/varn-world.js, `VARN_CLOSED`). Its wall line is the border; its
 * wicket is the one gap in its walls a body fits through, and this is what makes the wicket open from
 * inside only.
 */
import { insideRegion } from '../terrain/region-world.js';
import { VARN_CLOSED } from '../../content/regions/varn/varn-world.js';

export const CLOSED_REGIONS = Object.freeze(['East Suval', 'Feradom']);
/** Each closed place: `name`, `inside(x, z)`, and its own `title` and `lines`. Only the ones that are shut. */
export const CLOSED_PLACES = Object.freeze([VARN_CLOSED].filter(place => place.shut));

/** The toast the traveler sees when turned back, and how often it may repeat. */
export const CLOSED_BORDER_TITLE = 'EAST SUVAL · CLOSED BY ELOD';
export const CLOSED_BORDER_LINES = Object.freeze([
  'An Elodi picket steps out of the heather, spear level. “No crossing. Turn back.”',
  'Black-clad pickets watch you from the rocks. The border of Elod is closed, and they mean it.',
  'A horn sounds from the ridge and two Elodi riders come down to meet you. You turn back before they reach you.',
]);
export const CLOSED_BORDER_COOLDOWN = 6;
/** Each closed region's own toast: who turns the traveler back, and how. */
export const CLOSED_BORDERS = Object.freeze({
  'East Suval': Object.freeze({ title: CLOSED_BORDER_TITLE, lines: CLOSED_BORDER_LINES }),
  Feradom: Object.freeze({
    title: 'FERADOM · THE PASSES ARE SHUT',
    lines: Object.freeze([
      'A horn sounds from the tower above the narrows. Spearmen in russet come down through the firs, shields to the chin. You turn back.',
      'The hills are the duchy’s, and the duchy has shut them. A sentry on the ridge watches you all the way back to the road.',
      'Green cloaks move among the trees above you. Feradom’s border is closed, and its passes are held.',
    ]),
  }),
  ...Object.fromEntries(CLOSED_PLACES.map(place => [place.name, Object.freeze({ title: place.title, lines: place.lines })])),
});

/**
 * The closed region or place a move from `from` to `to` would enter, or null. The places are asked whenever
 * the regions are the game's own list; a caller testing the rule with a list of its own is asking about
 * that list alone.
 */
export function closedRegionEntered(from, to, closed = CLOSED_REGIONS, inside = insideRegion) {
  if (!from || !to || ![from.x, from.z, to.x, to.z].every(Number.isFinite)) return null;
  for (const name of closed) if (!inside(name, from.x, from.z) && inside(name, to.x, to.z)) return name;
  if (closed === CLOSED_REGIONS) for (const place of CLOSED_PLACES) if (!place.inside(from.x, from.z) && place.inside(to.x, to.z)) return place.name;
  return null;
}

/**
 * A watch on the closed borders for one traveler. `step(from, to, now)` says
 * whether the move is refused and, at most once per cooldown, the line to show
 * and its title: the region's own (`CLOSED_BORDERS`), or `lines` for any other.
 */
export function createBorderWatch({ closed = CLOSED_REGIONS, inside = insideRegion, cooldown = CLOSED_BORDER_COOLDOWN, lines = CLOSED_BORDER_LINES } = {}) {
  let lastToast = -Infinity, turned = 0, toasts = 0;
  return {
    step(from, to, now = 0) {
      const region = closedRegionEntered(from, to, closed, inside);
      if (!region) return { refused: false, region: null, toast: null, title: null };
      turned++;
      const own = CLOSED_BORDERS[region], said = own?.lines ?? lines;
      let toast = null;
      if (now - lastToast >= cooldown) { lastToast = now; toast = said[toasts++ % said.length]; }
      return { refused: true, region, toast, title: own?.title ?? CLOSED_BORDER_TITLE };
    },
    get turnedBack() { return turned; },
  };
}
