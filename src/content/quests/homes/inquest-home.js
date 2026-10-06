/** The Long Tarn clearing identified by the player's shoreline screenshots.
 * The nearby pale erratic and the surrounding forest remain in place. */
const point = (x, z) => Object.freeze({ x, z });
export const INQUEST_HOME = Object.freeze({
  id: 'inquest-clearlistern-home', name: "Inquest Clearlistern's cottage",
  x: -3464, z: -476,
  house: Object.freeze({ x: -3464, z: -476, width: 7.6, depth: 6.2, height: 3.5, yaw: Math.PI / 2 }),
  door: point(-3459.5, -476), arrival: point(-3458, -469),
  mailbox: Object.freeze({ x: -3455.5, z: -472, yaw: Math.PI / 2, name: 'Inquest Clearlistern' }),
});
export const INQUEST = Object.freeze({
  id: 'inquest-clearlistern', name: 'Inquest Clearlistern', role: 'Resident of the Long Tarn',
  modelRole: 'villager', x: -3457.5, z: -479, yaw: Math.PI / 2,
  look: Object.freeze({ blankSlate: true, hat: false }),
});
export const INQUEST_HOME_PATH = Object.freeze([
  INQUEST_HOME.arrival, point(-3457.5, -474), INQUEST_HOME.door,
]);
export const INQUEST_PLACEHOLDER = 'This person could use more characterization.';

function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}

/** Clear only the house, doorstep, mailbox and short approach. A tree supplies
 * its canopy radius so whole trees are omitted rather than clipped branches. */
export function inquestHomeClear(x, z, margin = 0) {
  const h = INQUEST_HOME.house;
  if (Math.abs(x - h.x) < h.depth / 2 + .65 + margin && Math.abs(z - h.z) < h.width / 2 + .65 + margin) return true;
  if (Math.hypot(x - INQUEST.x, z - INQUEST.z) < 1.1 + margin) return true;
  const mail = INQUEST_HOME.mailbox;
  if (Math.hypot(x - mail.x, z - mail.z) < .85 + margin) return true;
  return INQUEST_HOME_PATH.some((b, i) => i && segmentDistance(x, z, INQUEST_HOME_PATH[i - 1], b) < .8 + margin);
}
