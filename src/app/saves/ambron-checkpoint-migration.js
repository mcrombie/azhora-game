import { AMBRON_LAYOUT_VERSION, AMBRON_LEGACY_BOUNDS, AMBRON_SAFE_ARRIVAL } from '../../content/regions/ambron/ambron-city-layout.js';
import { CAGNEY_START, CAGNEY_HOME, CAGNEY_ROUTE, CAGNEY_WAVES } from '../../content/quests/cagney/cagney-quest.js';

/** Reopen old capital saves at a safe gate instead of the removed riverfront.
 * All quest rewards and inventory remain the original checkpoint's business. */
export function migrateAmbronPlayer(position, layoutVersion) {
  if (!position || layoutVersion === AMBRON_LAYOUT_VERSION) return position;
  const b=AMBRON_LEGACY_BOUNDS;
  if(position.x>=b.minX&&position.x<=b.maxX&&position.z>=b.minZ&&position.z<=b.maxZ)
    return { ...AMBRON_SAFE_ARRIVAL };
  return position;
}

export function migrateAmbronCagney(saved) {
  if (!saved || saved.layoutVersion === AMBRON_LAYOUT_VERSION) return saved;
  // Only upgrade structurally plausible old routes; malformed saves still fail
  // the ordinary quest validation rather than being repaired into rewards.
  const p=saved.walk;
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isInteger(p.waypoint)
    ||p.waypoint<0||p.waypoint>60||!Number.isInteger(saved.wave)||saved.wave<0||saved.wave>3)return saved;
  let at,waypoint;
  if(['home','complete'].includes(saved.stage)){at=CAGNEY_HOME;waypoint=CAGNEY_ROUTE.length-1;}
  else if(['unmet','asked'].includes(saved.stage)){at=CAGNEY_START;waypoint=0;}
  else if(['escorting','ambushed'].includes(saved.stage)){
    at=saved.wave<3?CAGNEY_WAVES[saved.wave].checkpoint:CAGNEY_ROUTE[CAGNEY_WAVES[2].waypoint];
    let best=Infinity;
    for(let i=1;i<CAGNEY_ROUTE.length;i++){
      const a=CAGNEY_ROUTE[i-1],b=CAGNEY_ROUTE[i],dx=b.x-a.x,dz=b.z-a.z;
      const t=Math.max(0,Math.min(1,((at.x-a.x)*dx+(at.z-a.z)*dz)/(dx*dx+dz*dz||1)));
      const gap=Math.hypot(at.x-a.x-t*dx,at.z-a.z-t*dz);
      if(gap<best){best=gap;waypoint=i;}
    }
  }else return {...saved,layoutVersion:AMBRON_LAYOUT_VERSION};
  return {...saved,layoutVersion:AMBRON_LAYOUT_VERSION,walk:{...p,x:at.x,z:at.z,waypoint}};
}
