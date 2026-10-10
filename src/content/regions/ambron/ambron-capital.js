/** Infrastructure only: no named residents, quest flags or campaign rules. */
import { LAKE_ELA, LAKE_BRUL, LAKE_OSSEN, elagosWaterDistance } from './elagos-world.js';

export { AMBRON_FORTRESSES } from './ambron-fortresses.js';

export { AMBRON_HARBOURS, ambronHarbourDeck } from './elagos-world.js';

const ships=[];
for(const [lake,plans] of [[LAKE_BRUL,[['warship',-22,0],['warship',18,10],['trader',0,-23]]],
  [LAKE_ELA,[['warship',-20,-25],['warship',8,0],['trader',30,26],['trader',-20,18],['fishing',-43,-5],['fishing',-4,36]]],
  [LAKE_OSSEN,[['trader',-16,0],['trader',18,-12],['fishing',-2,25],['fishing',24,15],['fishing',-28,-17],['fishing',0,-24]]]]) {
  for(const [kind,dx,dz] of plans){
    const length=kind==='warship'?22:kind==='trader'?15:7,width=kind==='warship'?6.5:kind==='trader'?5:2.3;
    const x=lake.centre.x+dx,z=lake.centre.z+dz,yaw=lake.angle+.3;
    // Full hull footprint, not just its origin, must float inside the basin.
    const dry=[-1,1].some(a=>[-1,1].some(b=>elagosWaterDistance(x+a*width/2*Math.cos(yaw)+b*length/2*Math.sin(yaw),z-a*width/2*Math.sin(yaw)+b*length/2*Math.cos(yaw))>-1));
    if(!dry)ships.push(Object.freeze({id:`${lake.id}-${kind}-${ships.length}`,lake:lake.id,kind,x,z,y:lake.surface,yaw,length,width}));
  }
}
export const AMBRON_SHIPS=Object.freeze(ships);
