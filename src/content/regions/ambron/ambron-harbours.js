import {AMBRON_CENTRE,ambronGroundLevel} from './ambron-city-layout.js';

/** Pure construction helpers; receiving the basins avoids a terrain/data cycle. */
export function capitalHarbours(lakes){
  const specifications=[['royal-arsenal','The Royal Arsenal',AMBRON_CENTRE],['ela-trade-quay','The Ela Exchange',AMBRON_CENTRE],['ossen-fish-quay','The Ossen Fish Quay',{x:-1050,z:170}]];
  return Object.freeze(lakes.map((lake,i)=>{
    const [id,name,target]=specifications[i];
    const shore=lake.shore.reduce((best,p)=>Math.hypot(p.x-target.x,p.z-target.z)<Math.hypot(best.x-target.x,best.z-target.z)?p:best);
    const length=Math.hypot(shore.x-lake.centre.x,shore.z-lake.centre.z);
    // The exchange approaches diagonally, clear of the older shore cottages.
    const dx=i===1?Math.SQRT1_2:i===2?-.58:(shore.x-lake.centre.x)/length;
    const dz=i===1?-Math.SQRT1_2:i===2?Math.sqrt(1-dx*dx):(shore.z-lake.centre.z)/length;
    const land={x:shore.x+dx*60,z:shore.z+dz*60},tip={x:shore.x-dx*17,z:shore.z-dz*17};
    const store=i===2?{x:-1020,z:107}:{x:land.x+dz*7,z:land.z-dx*7};
    return Object.freeze({id,name,lake:lake.id,shore,land,tip,store,dx,dz,width:5.2,surface:lake.surface,deck:lake.surface+1.9});
  }));
}
function projection(h,x,z){return {along:(x-h.shore.x)*h.dx+(z-h.shore.z)*h.dz,across:Math.abs((x-h.shore.x)*h.dz-(z-h.shore.z)*h.dx)};}
function level(h,along){const t=Math.max(0,Math.min(1,(along-2)/58));return h.deck+(ambronGroundLevel(h.land.x,h.land.z)-h.deck)*t;}
export function harbourDeck(harbours,x,z,margin=0){
  for(const h of harbours){const p=projection(h,x,z);if(p.along>=-18-margin&&p.along<=60+margin&&p.across<=h.width/2+margin)return level(h,p.along);}
  return null;
}
export function harbourGround(harbours,x,z,natural){
  for(const h of harbours){
    const p=projection(h,x,z);if(p.along<0||p.along>70||p.across>12)continue;
    const side=Math.max(0,Math.min(1,(p.across-h.width/2)/9)),end=Math.max(0,Math.min(1,(p.along-60)/10));
    const t=Math.max(side,end),weight=1-t*t*(3-2*t);
    return natural+(level(h,p.along)-.3-natural)*weight;
  }
  return natural;
}
