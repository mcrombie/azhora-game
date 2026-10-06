import { applePoint, OLD_ROAD_YAW } from '../rena/rena.js';

// Ari keeps her established identity and appearance when she moves from Port Calos.
export const ARI_STAND = Object.freeze({ ...applePoint(11, 6), yaw: OLD_ROAD_YAW + Math.PI / 2 });
export const ARI = Object.freeze({ id: 'cobble-ari', name: 'Ari', role: 'Sunflower grower of Applegarth',
  modelRole: 'rise-custodian', color: 0x6a5f7d, skin: 0xa9713f,
  look: Object.freeze({ hair: 0x1d1a18, hairStyle: 'long-curly', slight: true, dress: true,
    beard: false, glasses: false, cloak: false, staff: false, hat: false }), yaw: ARI_STAND.yaw });

// Between the two existing north-side cottages, approached directly from the village street.
export const SUNFLOWER_ROWS = Object.freeze([
  Object.freeze({ id: 'ari-sunflower-row-1', name: "Ari's near garden bed", ...applePoint(10, 12) }),
  Object.freeze({ id: 'ari-sunflower-row-2', name: "Ari's far garden bed", ...applePoint(14, 12) }),
]);
export const ARI_GARDEN_SUPPLIES = Object.freeze({ ...applePoint(15, 6.5) });
