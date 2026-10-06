/**
 * **The first cliff of the Lotharn**: the rock the Empire's works on the passes are built into, and the
 * only rock their no-hold rule takes.
 *
 * Both halves of the range are built in courses (src/content/regions/east-lotharn/east-lotharn-world.js and src/content/regions/west-lotharn/west-lotharn-world.js,
 * `BANDS`): a cliff, a ledge, a cliff, a ledge, to the bald at the top. A peak's lift at a point is how far
 * up that stair the point is, and one `period` of lift is one course: under a period the point is on the
 * foot of the mountain or on its first cliff, and from a period on it is on the first ledge or above it.
 *
 * `firstCliff(x, z)` is true below the first ledge, **and off the peaks' own ways**:
 *
 *  - The ledges above the first cliff, and everything higher, are the mountain's and stay climbable. The
 *    eastern peak's way up passes over the back of Varn's east jamb from the first ledge to the second;
 *    the south-west peak's passes fifty metres behind the Vastos Gate's eastern end, two courses up.
 *  - **A ramp keeps its hold** (`RAMPS_KEEP_THEIR_HOLD`). The ways cut slantwise up the cliffs are how each
 *    peak is climbed at all, and one of them starts beside a work: the eastern peak's first ramp, on the
 *    pass floor before Varn's Pass Gate. Taking the hold off it would shut that peak with it. It is left,
 *    on the builder's reading that a fort does not take a mountain's own road away, and what a climber can
 *    do by it is measured and reported (docs/varn-report.md). It is the user's call, and it is this one
 *    constant: `false` makes every ramp inside a work's reach no-hold rock like the cliff beside it. (The
 *    Reach Gate was first built under the south rampart's first ramp, which went over its southern end; it
 *    was moved rather than have the choice made there.)
 *
 * Ground no peak stands over has no lift, and counts as below the first ledge: a jamb's own face is that.
 *
 * Pure: no three, no DOM.
 */
import { BANDS as EAST_BANDS, peakUplift as eastUplift, onRamp as onEastRamp, RAMPS as EAST_RAMPS } from '../east-lotharn/east-lotharn-world.js';
import { BANDS as WEST_BANDS, peakUplift as westUplift, onRamp as onWestRamp, RAMPS as WEST_RAMPS } from './west-lotharn-world.js';

export const RAMPS_KEEP_THEIR_HOLD = true;
/** How far beside a ramp's own tread the rock still takes a hand, in metres. */
const RAMP_MARGIN = 2;

/** Below the first ledge of whichever range's peak stands over the point. */
export const belowFirstLedge = (x, z) => eastUplift(x, z) < EAST_BANDS.period && westUplift(x, z) < WEST_BANDS.period;
/**
 * How far round the foot of a peak's first ramp the rock still takes a hand. A first ramp starts at the top of the
 * mountain's foot slope, a few metres over the floor beside it, and that slope is steeper than a walker's grade: the
 * way is reached by a short climb of it, as it always was, so the slope under the ramp's start keeps its hold.
 */
const RAMP_FOOT_REACH = 16;
const FIRST_RAMP_FEET = Object.freeze([...EAST_RAMPS, ...WEST_RAMPS].filter(ramp => ramp.kind === 'ramp' && ramp.band === 0).map(ramp => ramp.line.points[0]));
const nearRampFoot = (x, z) => FIRST_RAMP_FEET.some(foot => Math.hypot(foot.x - x, foot.z - z) <= RAMP_FOOT_REACH);
/** On one of the peaks' own ways up, or close beside it, or on the slope under a first ramp's start. */
export const onPeakWay = (x, z) => onEastRamp(x, z, RAMP_MARGIN) || onWestRamp(x, z, RAMP_MARGIN) || nearRampFoot(x, z);
/** The rock a work's no-hold rule takes, where the work reaches: the first cliff, off the peaks' own ways. */
export const firstCliff = (x, z) => belowFirstLedge(x, z) && !(RAMPS_KEEP_THEIR_HOLD && onPeakWay(x, z));
