import {createRoadDistanceIndex} from '../../../world/terrain/road-distance-index.js';
import {NETHEREUM_PATHS} from '../nethereum/nethereum-farm.js';
import {NESDOR_PATHS} from '../nesdor/nesdor-farm.js';
import {OVESOS_PATHS} from '../oves/ovesos-farm.js';
import {ISAREOS_HAMLET_PATHS} from './isareos-hamlet.js';
import {YUNETHRE_PATHS} from './yunethre-world.js';

const paths=[...NETHEREUM_PATHS,...NESDOR_PATHS,...OVESOS_PATHS,...ISAREOS_HAMLET_PATHS,...YUNETHRE_PATHS];
const index=createRoadDistanceIndex(paths.flatMap(p=>p.points.slice(1).map((b,i)=>({
  ax:p.points[i].x,az:p.points[i].z,bx:b.x,bz:b.z,width:p.width,
}))).filter(s=>s.ax!==s.bx||s.az!==s.bz));
/** Broad-phase index keeps ground contact aligned to the draped paths, without
 * scanning every farm path on each movement query. Raised works take priority. */
export const ruralPathSurfaceAt=(x,z)=>index.distance(x,z)<.1;
