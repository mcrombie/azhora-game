import {ISAREOS_BECKS,NETHEREUM_STREAMS,MENETH_BECKS,LIZEEM_HEAD} from './west-regions.js';
import {refineWestLotharnRiverGroundSteps} from '../west-lotharn/west-lotharn-river-ground.js';

export const MEADOW_RIVER_REGIONS=Object.freeze([11,12,13,16,17]);

/** Only replace the coarse faces along narrow channels. A finer water ribbon
 * cannot expose a stream hidden under the old seven-metre terrain triangles. */
export function* createMeadowRiverGroundSteps(kit){
  const enabled=id=>!kit.enabledRegions||kit.enabledRegions.includes(id);
  const courses=[...(enabled(16)?ISAREOS_BECKS:[]),...(enabled(17)?NETHEREUM_STREAMS:[]),
    ...(enabled(12)?MENETH_BECKS:[]),...((enabled(13)||enabled(16))?[LIZEEM_HEAD]:[])];
  if(kit.streamTerrain)for(const course of courses)yield* kit.streamTerrain.buildBounds(course.bounds,18);
  return yield* refineWestLotharnRiverGroundSteps({...kit,courses,spacing:1.6,tag:'meadowRiver',label:'Meadow stream'});
}
