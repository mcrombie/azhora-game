/** Troy's visible passage home. This is a view of the saved ferry clock, never
 * a second actor or a second movement simulation. The middle of the sea leg is
 * out of view; only the two harbor approaches are rendered. */
import * as THREE from 'three';
import { HOME_FERRY_SECONDS } from './home-residents.js';
import { FERRY_LANDINGS } from './ferry.js';
import { COBBLE_QUAY } from './peblos-world.js';
import { PORT_CALOS_QUAY } from './port-calos-world.js';

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const mix = (a, b, t) => a + (b - a) * t;
const point = (x, y, z) => ({ x, y, z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const BOAT_Y = .38, BOARD_END = 7, DEPART_END = 15;
const ARRIVE_START = HOME_FERRY_SECONDS - 17, DOCK_TIME = HOME_FERRY_SECONDS - 10;
export const HOME_FERRY_BERTHS = Object.freeze({
  peblos: Object.freeze({ x: 308, z: 422.5, yaw: Math.PI / 2 }),
  'port-calos': Object.freeze({ x: -400, z: 296, yaw: -Math.PI / 2 }),
});
const start = HOME_FERRY_BERTHS.peblos, end = HOME_FERRY_BERTHS['port-calos'];
const ashore = (landing, y) => point(landing.ashore.x, y, landing.ashore.z);
const boardingPath = [ashore(FERRY_LANDINGS.peblos, COBBLE_QUAY.deckY),
  point(start.x, COBBLE_QUAY.deckY, 428), point(start.x, COBBLE_QUAY.deckY, 425.3),
  point(start.x, BOAT_Y, 423.5), point(start.x + .7, BOAT_Y, start.z)];
const landingPath = [point(end.x - .7, BOAT_Y, end.z), point(end.x, BOAT_Y, 294.7),
  point(end.x, PORT_CALOS_QUAY.deckY, 291.6), point(end.x, PORT_CALOS_QUAY.deckY, 286),
  ashore(FERRY_LANDINGS['port-calos'], PORT_CALOS_QUAY.deckY)];

function along(points, progress, duration) {
  const lengths = points.slice(1).map((p, i) => distance(points[i], p));
  const total = lengths.reduce((a, b) => a + b, 0);
  let remaining = clamp(progress) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const a = points[i], b = points[i + 1], fraction = clamp(remaining / lengths[i]);
      return { position: point(mix(a.x, b.x, fraction), mix(a.y, b.y, fraction), mix(a.z, b.z, fraction)),
        yaw: Math.atan2(b.x - a.x, b.z - a.z), pace: total / duration, pose: { armed: false } };
    }
    remaining -= lengths[i];
  }
}
function boatPose(berth, x = berth.x, z = berth.z, yaw = berth.yaw, opacity = 1) {
  return { position: point(x, BOAT_Y, z), yaw, opacity, visible: opacity > .001 };
}
function passenger(boat) {
  return { position: point(boat.position.x + Math.sin(boat.yaw) * .7, BOAT_Y,
    boat.position.z + Math.cos(boat.yaw) * .7), yaw: boat.yaw, pace: 0, pose: { armed: false },
  opacity: boat.opacity, visible: boat.visible };
}

/** Deterministic across save/load and pause. Null passenger leaves the normal
 * walking actor under the resident host's control. */
export function homeFerryFrame(state) {
  if (!state) return { boat: null, passenger: null, plank: null };
  if (state.phase !== 'sailing') return {
    boat: state.phase === 'walking' && state.leg === 'quay' ? boatPose(start) : null,
    passenger: null, plank: state.phase === 'walking' && state.leg === 'quay' ? 'peblos' : null,
  };
  const t = clamp(Number(state.clock) || 0, 0, HOME_FERRY_SECONDS);
  if (t < BOARD_END) return { boat: boatPose(start), plank: 'peblos',
    passenger: { ...along(boardingPath, t / BOARD_END, BOARD_END), visible: true, opacity: 1 } };
  if (t < DEPART_END) {
    const elapsed = t - BOARD_END, out = FERRY_LANDINGS.peblos.out;
    const length = Math.hypot(out.x, out.z), heading = Math.atan2(out.x, out.z);
    const turn = Math.atan2(Math.sin(heading - start.yaw), Math.cos(heading - start.yaw));
    const boat = boatPose(start, start.x + out.x / length * elapsed * 2.6,
      start.z + out.z / length * elapsed * 2.6, start.yaw + turn * clamp(elapsed / 2),
      1 - clamp((t - (DEPART_END - 3)) / 3));
    return { boat, passenger: passenger(boat), plank: null };
  }
  if (t < ARRIVE_START) return { boat: null, plank: null,
    passenger: { position: point(start.x, BOAT_Y, start.z), yaw: start.yaw,
      visible: false, opacity: 0, pace: 0, pose: { armed: false } } };
  if (t < DOCK_TIME) {
    const remaining = DOCK_TIME - t;
    const boat = boatPose(end, end.x + remaining * 2.6, end.z, end.yaw, clamp((t - ARRIVE_START) / 3));
    return { boat, passenger: passenger(boat), plank: null };
  }
  return { boat: boatPose(end), plank: 'port-calos',
    passenger: { ...along(landingPath, (t - DOCK_TIME) / (HOME_FERRY_SECONDS - DOCK_TIME),
      HOME_FERRY_SECONDS - DOCK_TIME), visible: true, opacity: 1 } };
}

function gangplank(path) {
  const a = new THREE.Vector3(path[0].x, path[0].y - .06, path[0].z);
  const b = new THREE.Vector3(path[1].x, path[1].y - .06, path[1].z);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(.95, .12, a.distanceTo(b)),
    new THREE.MeshLambertMaterial({ color: '#a28554', flatShading: true }));
  plank.position.copy(a).add(b).multiplyScalar(.5);
  plank.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize());
  plank.castShadow = true; plank.receiveShadow = true;
  return plank;
}

/** The returned passenger placement belongs to the existing Troy actor. This
 * module deliberately never changes an NPC, saved position, or player ferry. */
export function createHomeFerryView({ scene } = {}) {
  const source = scene?.getObjectByName('Jess\u2019s boat');
  const group = new THREE.Group(); group.name = 'Troy homeward ferry';
  const boat = source?.clone(true) ?? null;
  const materials = new Map();
  if (boat) {
    boat.name = 'Homeward passage boat'; boat.visible = false;
    boat.traverse(node => {
      if (!node.material) return;
      const own = material => {
        if (!materials.has(material)) {
          const copy = material.clone(); copy.transparent = true; materials.set(material, copy);
        }
        return materials.get(material);
      };
      node.material = Array.isArray(node.material) ? node.material.map(own) : own(node.material);
    });
    group.add(boat);
  }
  const planks = { peblos: gangplank([boardingPath[2], boardingPath[3]]),
    'port-calos': gangplank([landingPath[1], landingPath[2]]) };
  for (const [id, plank] of Object.entries(planks)) { plank.name = `${id} home ferry gangplank`; plank.visible = false; group.add(plank); }
  scene?.add(group);
  let arrived = false;
  function update(state) {
    const frame = homeFerryFrame(state);
    if (!state || (state.phase === 'walking' && state.leg === 'quay')) arrived = false;
    if (state?.phase === 'sailing' && state.clock >= DOCK_TIME) arrived = true;
    // Leave the arriving boat moored after Troy steps ashore. It is scenery,
    // not a duplicate ferry host; resetting the quest removes this berth.
    if (arrived && state?.leg === 'home') { frame.boat = boatPose(end); frame.plank = 'port-calos'; }
    if (boat) {
      boat.visible = !!frame.boat?.visible;
      if (frame.boat) {
        const p = frame.boat.position; boat.position.set(p.x, p.y, p.z); boat.rotation.set(0, frame.boat.yaw, 0);
        for (const material of materials.values()) { material.opacity = frame.boat.opacity; material.depthWrite = frame.boat.opacity >= .98; }
      }
    }
    for (const [id, plank] of Object.entries(planks)) plank.visible = !!boat && id === frame.plank;
    return boat ? frame.passenger : null;
  }
  return Object.freeze({ update, group, dispose: () => {
    group.removeFromParent(); for (const material of materials.values()) material.dispose();
    for (const plank of Object.values(planks)) { plank.geometry.dispose(); plank.material.dispose(); }
  } });
}
