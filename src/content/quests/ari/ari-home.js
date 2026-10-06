import { APPLEGARTH_BUILDINGS, OLD_ROAD_YAW, applePoint } from '../rena/rena.js';

// The existing cottage on Ari's left when she faces the village street.
// Reuse its footprint: assigning her a home does not add another village house.
const building = APPLEGARTH_BUILDINGS.find(house => house.id === 'house-3');
export const ARI_HOME = Object.freeze({
  id: 'ari-home', resident: 'cobble-ari', name: "Ari's sunflower cottage", buildingId: building.id,
  house: Object.freeze({ ...building, yaw: OLD_ROAD_YAW + Math.PI * 1.5, roof: '#626384', wall: '#e0d2b3' }),
  door: Object.freeze({ ...applePoint(3, 9.7) }),
  approach: Object.freeze({ ...applePoint(3, 7.7) }),
  mailbox: Object.freeze({ ...applePoint(5.25, 6.2), name: 'Ari', yaw: OLD_ROAD_YAW + Math.PI * 1.5 }),
  planters: Object.freeze([applePoint(1.25, 9.1), applePoint(4.75, 9.1)]),
  stones: Object.freeze([4.8, 6, 7.2, 8.4, 9.3].map((b, i) => Object.freeze({ ...applePoint(3 + (i % 2 ? .12 : -.08), b), yaw: OLD_ROAD_YAW + .12 * (i % 2) }))),
});
