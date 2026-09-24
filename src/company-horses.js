/**
 * The company's horses. Only people who claimed one of the four saved army remounts
 * have a horse. Riding with a friend never creates a mount or a spare entitlement.
 *
 * Mounted, they follow in file as they always have, at a horse's spacing instead of a man's, and
 * they keep up with whatever the traveler asks for - a canter, or the testing panel's horse that
 * goes twice as fast. Stepped down, their horses are picketed in a line beside his: off to one
 * side, out of the road's middle, and never a ring, because **a line cannot pen anybody in**.
 *
 * Pure: no DOM, no three, no world. The host owns the actors and the footing test.
 */
const freeze = Object.freeze;

/**
 * The coats a company's horses come in. Natural colours only, and no names: these are remounts
 * from the same army stable as the traveler's bay, not characters. Which coat a man's horse has
 * is fixed by his id, so it is the same horse every time the game is loaded and costs nothing to
 * save.
 */
export const COATS = freeze(['bay', 'chestnut', 'grey', 'black', 'dun', 'roan']);

/** A small stable hash: same id, same coat, on every machine and every run. */
function hashOf(id) {
  let hash = 0;
  const text = String(id ?? '');
  for (let index = 0; index < text.length; index++) hash = (Math.imul(hash, 31) + text.charCodeAt(index)) >>> 0;
  return hash;
}
export const coatFor = id => COATS[hashOf(id) % COATS.length];

/**
 * The mounted file. A man on a horse needs more room than a man on his feet: `shoulder` puts the
 * first rider far enough back that his horse's nose is not in the traveler's horse's tail, and
 * `stride` is **a horse's length, not a man's** (compare COMPANION_REACH.stride, 4).
 */
export const RIDE_FILE = freeze({ shoulder: 4.2, side: -1.6, stride: 6.2,
  // **Two horses cannot stand 1.24 m apart.** A rider's collision radius is 0.62, and twice that
  // was all the room the file asked for - a body's width, not a horse's length. A horse is about
  // 2.4 m nose to tail, so that is the least two of them may be from one another, however hard
  // the ground is pushing the file about.
  room: 2.6 });

/**
 * The picket line. `side` is how far off the traveler's horse the line stands - far enough that
 * stepping down on the near side never lands the rider in a horse - and `spacing` is the gap from
 * one horse's centre to the next. A horse's body is BODY.horse (0.5) across the radius, so 2.2 m
 * between centres leaves 1.2 m of open ground between them: **a gap a person walks through**.
 * `lead` keeps the first picketed horse behind the traveler's own.
 *
 * `tries` is how far down the line a horse will look for footing before giving up. A horse with
 * nowhere to stand is not put down at all - the host leaves it out of the frame - rather than
 * shoved somewhere it could box a person in.
 */
export const PICKET = freeze({ side: 2.6, spacing: 2.2, lead: 1.4, tries: 8 });

/** Seconds between one man rising in the saddle and the next: a company mounting, not a snap. */
export const STAGGER = 0.18;
export const staggerFor = place => Math.max(0, Math.floor(Number(place) || 0)) * STAGGER;

/**
 * The mounted/picketed following file. Independent riders are placed by the living route
 * driver. Companions mount with the traveler only if their specific saved horse has been
 * physically claimed. An unredeemed token is not a horse following somebody in the woods.
 */
export function companyHorses({ owned = false, mounted = false, walking = [], allocations = [] } = {}) {
  if (!owned) return freeze({ mounted: false, ids: freeze([]) });
  const entitled = new Set((Array.isArray(allocations) ? allocations : [])
    .filter(horse => horse?.claimed === true && typeof horse.owner === 'string').map(horse => horse.owner));
  const seen = new Set(), ids = [];
  for (const id of Array.isArray(walking) ? walking : []) {
    if (typeof id !== 'string' || !id || seen.has(id) || !entitled.has(id)) continue;
    seen.add(id); ids.push(id);
  }
  return freeze({ mounted: !!mounted, ids: freeze(ids) });
}

/**
 * How fast a mounted companion may come to keep his place in the file. The base is the traveler's
 * own top gait, so a canter is a canter and the testing panel's horse is twice that; past a
 * horse's length he comes harder than the traveler goes, or the gap that opened while both were
 * getting up to speed would never close. The same shape as `companionPace` for men on foot.
 */
export function ridePace(gap, travelerTop) {
  const off = Number(gap) || 0, top = Math.max(0, Number(travelerTop) || 0);
  if (!(off > RIDE_FILE.stride)) return top;
  return top + Math.min(top * 0.35, 0.8 + (off - RIDE_FILE.stride) * 0.4);
}

/**
 * Where the company's horses stand when everybody is on foot: a line beside the traveler's own
 * horse, running back along the way it is facing, on the off side first and the near side only
 * when the off side is not ground.
 *
 * The line is derived entirely from `horse` - the one thing already saved - so a reload puts
 * every horse back exactly where it was without anything being written down.
 *
 * Returns one entry per id, in order; `null` for a horse with nowhere to stand.
 */
export function picketSpots(horse, ids = [], canStand = () => true) {
  if (!horse || !Number.isFinite(horse.x) || !Number.isFinite(horse.z)) return freeze([]);
  const yaw = Number.isFinite(horse.yaw) ? horse.yaw : 0;
  // The same frame `dismountSpot` uses: forward is (sin, cos) and the rider's left is (cos, -sin).
  const at = (side, back) => ({ x: horse.x + Math.cos(yaw) * side + Math.sin(yaw) * back,
    z: horse.z - Math.sin(yaw) * side + Math.cos(yaw) * back, yaw });
  const taken = [{ x: horse.x, z: horse.z }];
  const clear = spot => canStand(spot.x, spot.z)
    && taken.every(other => Math.hypot(other.x - spot.x, other.z - spot.z) >= PICKET.spacing - 0.01);
  const out = [];
  for (let index = 0; index < ids.length; index++) {
    let placed = null;
    for (let step = 0; step < PICKET.tries && !placed; step++) {
      const back = -(PICKET.lead + (index + step) * PICKET.spacing);
      // The off side is the far side from where a rider steps down (`dismountSpot` takes the
      // near side first), so a company stepping down never lands in its own picket line.
      for (const side of [-PICKET.side, PICKET.side]) {
        const spot = at(side, back);
        if (clear(spot)) { placed = spot; break; }
      }
    }
    if (placed) taken.push(placed);
    out.push(placed ? freeze({ id: ids[index], ...placed }) : null);
  }
  return freeze(out);
}

/** How many strides a file will trail before it gives up: single and long beats doubled up. */
export const FILE_RETREAT = 6;

/**
 * Where the n-th man of a file stands: **his own shoulder, then the centreline, then further and
 * further back down the centreline.** A file that cannot spread goes single and long, and never
 * doubles up, because two men on one stone is worse than a file that trails.
 *
 * `taken` is the ground the men in front of him have already been given, and a spot inside `room`
 * of one of them is not ground, exactly as a wall is not. Without it the men cannot see each
 * other: each is placed on his own, so two whose shoulder spots do not stand both fall back on
 * the same piece of ground and stand inside one another.
 *
 * **An entry may carry its own `room`**, and the horses do. A picketed horse's place is a
 * function of the traveler's own horse, which the save carries, while a man's is recomputed every
 * frame - so the horses are laid first and handed to the file as ground that is taken, and a man
 * needs more room from a horse than from another man. Without that the two layouts were blind to
 * each other and a man on foot was given a place inside a horse.
 *
 * `reach` is COMPANION_REACH for men on foot and RIDE_FILE for a mounted file. Returns null when
 * even the trailing centreline has nowhere to put him - the caller then leaves him where he is,
 * which is honest, rather than stacking him on somebody.
 */
export function fileSpotFor({ at, yaw = 0, place = 0, reach, room = 0, taken = [], canStand = () => true, retreat = FILE_RETREAT }) {
  if (!at || !Number.isFinite(at.x) || !Number.isFinite(at.z) || !reach) return null;
  const turn = Number.isFinite(yaw) ? yaw : 0, n = Math.max(0, Math.floor(Number(place) || 0));
  const side = reach.side * (n % 2 ? -1 : 1);
  const spot = (off, back) => ({ x: at.x - Math.sin(turn) * back + Math.cos(turn) * off,
    z: at.z - Math.cos(turn) * back - Math.sin(turn) * off });
  const free = one => canStand(one.x, one.z)
    && taken.every(other => Math.hypot(other.x - one.x, other.z - one.z) >= (Number.isFinite(other.room) ? other.room : room));
  for (let step = 0; step <= retreat; step++) {
    const back = reach.shoulder + (n + step) * reach.stride;
    // His own shoulder only at his own place; trailing back, the file closes to the centre.
    if (step === 0) { const shoulder = spot(side, back); if (free(shoulder)) return shoulder; }
    const middle = spot(0, back);
    if (free(middle)) return middle;
  }
  return null;
}
