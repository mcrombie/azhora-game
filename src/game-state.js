// Q/E are single-key shortcuts for the existing W+A / W+D diagonals.
// Merge directional intent before normalization so overlapping keys never
// change the angle or make diagonal travel faster than ordinary walking.
export function getMovementInput(keys) {
  const forward = Number(keys.has('KeyW') || keys.has('ArrowUp') || keys.has('KeyQ') || keys.has('KeyE'))
    - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const side = Number(keys.has('KeyD') || keys.has('ArrowRight') || keys.has('KeyE'))
    - Number(keys.has('KeyA') || keys.has('ArrowLeft') || keys.has('KeyQ'));
  const length = Math.hypot(forward, side);
  return length ? { forward: forward / length, side: side / length } : { forward: 0, side: 0 };
}

/** The height at which ground stops holding a person up. Above it you walk; below it you swim. */
export const WATERLINE = 0.45;

/** Inside the world, and clear of everything solid in it. Both halves of the waterline need this. */
/**
 * **The shapes that are there to keep walkers out of water.** They line every river in the world
 * and they are what made a river a wall rather than a thing you could be in. A swimmer is already
 * in the water and is not stopped by them; everything else still is.
 */
const WATER_COLLIDERS = new Set(['river-water', 'pond-water']);

function clearHere(x, z, world, radius, afloat = false) {
  const b = world.bounds;
  if (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius) return false;
  // The shapes that could reach this point, from the world's grid (src/collider-grid.js);
  // a world without one — a test's stand-in — is asked for its whole list, as before.
  const near = world.nearColliders ? world.nearColliders(x, z, radius) : world.colliders;
  for (let i = 0; i < near.length; i++) {
    const c = near[i];
    if (afloat && WATER_COLLIDERS.has(c.kind)) continue;
    if (c.r !== undefined) { const dx = x - c.x, dz = z - c.z, reach = c.r + radius; if (dx * dx + dz * dz < reach * reach) return false; }
    else if (Math.abs(x - c.x) < c.hx + radius && Math.abs(z - c.z) < c.hz + radius) return false;
  }
  return true;
}

/**
 * **Water has a surface, and it is not all at one height** (the user, 22 September 2026: all
 * rivers should be real swimmable water). The sea lies at `WATERLINE`; a river lies wherever its
 * own bed carried it, which for the Caloss is about two and three quarter metres above the sea
 * and for one reach of hill country is twenty-eight. Asking one global line whether a point is
 * wet answered "dry" for every river in the world, which is why they were walled instead.
 *
 * A world that does not know about water bodies — a test's stand-in — answers the sea, which is
 * exactly what this did before.
 */
export const waterAt = (x, z, world) => world?.waterAt?.(x, z) ?? WATERLINE;

export function canStand(x, z, world, radius = 0.34) {
  return clearHere(x, z, world, radius) && world.heightAt(x, z) >= waterAt(x, z, world);
}

/**
 * Water a person can be in: inside the world, clear of every hull, pier and rock, and under the
 * waterline. It is `canStand`'s exact complement, which is the point of writing it this way - every
 * point of the world is standable, swimmable, or solid, and never two of those (docs/swimming.md).
 * Depth is not a gate: nothing is too deep to enter. Distance is what refuses you, and it refuses
 * you by drowning you.
 */
export function canSwim(x, z, world, radius = 0.34) {
  return clearHere(x, z, world, radius, true) && world.heightAt(x, z) < waterAt(x, z, world);
}

/**
 * `radius` is the mover's footprint: a person by default, wider for a rider on a horse. A swimmer
 * may cross the waterline in either direction, which is what lets somebody swim to a beach and
 * walk out of the sea without a prompt or a key.
 */
export function moveCharacter(position, dx, dz, world, radius, { swimming = false } = {}) {
  const passable = swimming
    ? (x, z) => canStand(x, z, world, radius) || canSwim(x, z, world, radius)
    : (x, z) => canStand(x, z, world, radius);
  const steps = Math.max(1, Math.ceil(Math.hypot(dx,dz)/0.18));
  for(let i=0;i<steps;i++) {
    if(passable(position.x+dx/steps,position.z)) position.x+=dx/steps;
    if(passable(position.x,position.z+dz/steps)) position.z+=dz/steps;
  }
  return position;
}
/**
 * **Chapter 1, in three subquests** (the user, 22 September 2026): report to Jojo, train with
 * Glun, report to Nothom. That is the whole of it. What came out of the main quest: the goblins
 * in the Greenway, the report to Quartermaster Corvan in the Avrel clearing, the supply parcels
 * and the second goblin fight, the wolves at the cart, and the bridge over the Caloss - which is
 * not gone from the game but is a side quest now, and an optional one (src/journey.js).
 *
 * A subquest is a **title**, and a title can span two steps: walking up the pier to Jojo and
 * speaking to her are both `Report to Harbourmaster Jojo`, because the player has one thing to do
 * and the second half of it is only the first half arrived at. The house spelling is harbour with
 * a u, as everywhere else the game writes it.
 *
 * **These numbers are read in six places** - the save validator (src/road-checkpoint.js), the
 * autopilot's ladder (src/autopilot.js), `TUTORIAL_DONE` in the marker rules
 * (src/quest-markers.js), the road smoke, the chapter list (src/story-chapters.js) and every
 * save. Renumbering means visiting all six, which is what going from eleven steps to four cost.
 */
export const questSteps = [
  {title:'Report to Harbourmaster Jojo', detail:'Goblins have come down the northern road. Walk ashore and find Jojo, the harbourmaster, at the head of the pier.', lesson:'A first step', hint:'WASD to walk · Q forward-left · E forward-right. Hold Shift or Tab to run.'},
  {title:'Report to Harbourmaster Jojo', detail:'Speak to Jojo at the head of the pier. She has the Empire’s letter, and she will tell you who to see before you take the road.', lesson:'Meet your neighbours', hint:'Approach Jojo and press F to speak. F or Enter continues a conversation.'},
  {title:'Training with Officer Glun', detail:'Report to Officer Glun at the straw post by the village crossroads. He decides whether a hired sword goes up that road, and he will have all three of sword, shield and feet out of you first.', lesson:'Sword, shield and feet', hint:'Left-click or R to swing. Hold V to take a blow on your shield. Hold a direction and press C to step out of the way.'},
  {title:'Report to Nothom', detail:'Glun has given you the chart and your orders: west out of Drent, over the Caloss, and on to Nothom in Luscia. Find Iven at the army’s relay post on the town square; he holds your assignment. Nothing behind you closes — Tidehaven and the whole of Drent stay where they are, and the road back is a minute and a half.', lesson:'A journey begun', hint:'Follow the gold marker west. Press J to review the road ahead; M opens the chart Glun gave you.'},
];
/** The three by name, for anything that would rather name a subquest than count steps. */
export const SUBQUESTS = Object.freeze([
  Object.freeze({ id: 'report-jojo', title: questSteps[0].title, from: 0, to: 1 }),
  Object.freeze({ id: 'train-glun', title: questSteps[2].title, from: 2, to: 2 }),
  Object.freeze({ id: 'report-nothom', title: questSteps[3].title, from: 3, to: 3 }),
]);
/** The last step, which the tutorial does not close: the journey and the chapters take it from here. */
export const QUEST_DONE = questSteps.length - 1;
export function advanceQuest(stage, event) {
  if(stage===0 && event==='ashore') return 1;
  if(stage===1 && event==='accept-letter') return 2;
  if(stage===2 && event==='trained') return 3;
  return stage;
}
