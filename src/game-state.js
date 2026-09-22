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
function clearHere(x, z, world, radius) {
  const b = world.bounds;
  if (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius) return false;
  // The shapes that could reach this point, from the world's grid (src/collider-grid.js);
  // a world without one — a test's stand-in — is asked for its whole list, as before.
  const near = world.nearColliders ? world.nearColliders(x, z, radius) : world.colliders;
  for (let i = 0; i < near.length; i++) {
    const c = near[i];
    if (c.r !== undefined) { const dx = x - c.x, dz = z - c.z, reach = c.r + radius; if (dx * dx + dz * dz < reach * reach) return false; }
    else if (Math.abs(x - c.x) < c.hx + radius && Math.abs(z - c.z) < c.hz + radius) return false;
  }
  return true;
}

export function canStand(x, z, world, radius = 0.34) {
  return clearHere(x, z, world, radius) && world.heightAt(x, z) >= WATERLINE;
}

/**
 * Water a person can be in: inside the world, clear of every hull, pier and rock, and under the
 * waterline. It is `canStand`'s exact complement, which is the point of writing it this way - every
 * point of the world is standable, swimmable, or solid, and never two of those (docs/swimming.md).
 * Depth is not a gate: nothing is too deep to enter. Distance is what refuses you, and it refuses
 * you by drowning you.
 */
export function canSwim(x, z, world, radius = 0.34) {
  return clearHere(x, z, world, radius) && world.heightAt(x, z) < WATERLINE;
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
export const questSteps = [
  {title:'Goblins on the road', detail:'A goblin attack threatens the village. Walk ashore and find Jojo, the harbourmaster, at the head of the pier.', lesson:'A first step', hint:'WASD to walk · Q forward-left · E forward-right. Hold Shift or Tab to run.'},
  {title:'An urgent message', detail:'Speak to Jojo at the head of the pier about the goblin attack.', lesson:'Meet your neighbors', hint:'Approach Jojo and press F to speak. F or Enter continues a conversation.'},
  {title:'A little preparation', detail:'Report to Officer Glun at the straw post at the village crossroads. He decides whether a hired sword goes up that road.', lesson:'Learn at your own pace', hint:'Left-click or R to swing. Hold a direction and press C to dodge. Land two hits on the post and try one dodge.'},
  {title:'Into the Greenway', detail:'Follow the road inland toward the woodland bell.', lesson:'The road ahead', hint:'Right-drag to look around; scroll to zoom. Your next destination glows on the map.'},
  {title:'Trouble in the trees', detail:'Drive off the three goblin raiders.', lesson:'Watch the windup', hint:'An amber arc warns of a strike. C and a direction to dodge; then left-click or R to counter. Space still jumps.'},
  {title:'The road is safe', detail:'Report the three goblins to Eren at the Greenway Watch, farther along the road.', lesson:'Catch your breath', hint:'Follow the gold marker and press F to tell Eren what happened.'},
  {title:'What you carry', detail:'Open your satchel and read the letter of introduction. Eren has given you a road token.', lesson:'Your inventory', hint:'Press I for your satchel. Hover over an item for a hint, then select the letter of introduction to read it.'},
  {title:'Ready for the road', detail:'Dismiss your satchel to see the path ahead.', lesson:'Return to the world', hint:'Press I or Esc, or use Close, to dismiss your inventory.'},
  // The fork: the road west, or the country either side of it. The company is eleven and the
  // Marshal marches when the eleventh reports, so neither road is the late one (docs/drent-long-road.md).
  {title:'Through the northern forest', detail:'Follow the forest road to Fernway Rest — or take Drent at walking pace. The company is eleven, the Marshal marches when the eleventh has reported, and the open gold marks what Drent will teach you on the way.', lesson:'Find your way', hint:'Follow the gold marker along the road. L shows local trails and lets you mark a known place; M opens the wider world.'},
  {title:'Where the forest opens', detail:'Continue to the Caloss Gate and look out across the Avrel clearing.', lesson:'The edge of the wood', hint:'Keep following the road south-west as the trees thin. The farm clearing marks the next leg.'},
  {title:'Drent, from shore to gate', detail:'The tutorial is complete. Follow the open road through the Avrel clearing, cross the Caloss, and go on into Luscia — and nothing behind you closes. Every teacher and errand in Drent stays where it is, and the road back is a minute and a half.', lesson:'A journey begun', hint:'Find Corvan at the clearing. Press J to review the road ahead; you can return to Tidehaven at any time.'}
];
export function advanceQuest(stage, event) {
  if(stage===0 && event==='ashore') return 1;
  if(stage===1 && event==='accept-letter') return 2;
  if(stage===2 && event==='trained') return 3;
  if(stage===3 && event==='ambush') return 4;
  if(stage===4 && event==='retreat') return 3;
  if(stage===4 && event==='victory') return 5;
  if(stage===5 && event==='meet-waykeeper') return 6;
  if(stage===6 && event==='inspect-letter') return 7;
  if(stage===7 && event==='close-inventory') return 8;
  if(stage===8 && event==='reach-north-trail') return 9;
  if(stage===9 && event==='reach-border') return 10;
  return stage;
}
