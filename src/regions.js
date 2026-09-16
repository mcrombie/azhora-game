/**
 * The four playable regions and the places along their road.
 *
 * Everything here is derived in `region-world.js` from the authored atlas, so a
 * region's shape, size and position are the ones the World Builder drew. This
 * module keeps the export names the rest of the game already uses.
 *
 * Ids: 1 Drent, 2 Luscia, 3 Moros Plain, 4 East Suval.
 */
export {
  regions, regionAt, regionNpcPositions, journeySites, regionRepairBenches, regionFirePits, regionLandmarks,
  REGION_IDS, REGION_NAME_BY_ID, ANCHORS, WORLD_BOUNDS, MAIN_ROAD, SUVAL_ROAD, ONWARD_ROAD,
  CALOSS, CALOSS_GATE, CALOSS_BANK, FERNWAY_REST, FRONTIER, STORY_SITES, AVREL_CLEARING,
  VILLAGE, villageToWorld, worldToVillage, insideRegion, regionInfo,
} from './region-world.js';

import { ONWARD_ROAD } from './region-world.js';

/** The onward road out of Tidehaven's wood, kept under its historical name. */
export const northernRoad = ONWARD_ROAD.map(point => Object.freeze({ x: point.x, z: point.z }));
