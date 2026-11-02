/** Shared physical places for the camp, its residents and Chapter 2 staging.
 * These are scenery coordinates, never population or economic quantities. */
import { YUNETHRE_CAMP as C, YUNETHRE_CAMP_MEADOW } from './yunethre-world.js';
const f=Object.freeze;
const at=(dx,dz,rest={})=>f({x:C.x+dx,z:C.z+dz,...rest});
export const CENTAUR_BATTLEFIELD=YUNETHRE_CAMP_MEADOW;
export const CAMP_COUNCIL=at(-12,-29,{w:18,d:11});
export const CAMP_HEARTH=at(7,10);
export const CAMP_SHELTERS=f([
 ['west-house',-38,-22,5.7,'#c6b797','#6f8a7b'],
 ['weavers-house',-35,27,5.8,'#b8ac89','#987052'],
 ['south-house',-13,37,5.6,'#d0c19d','#697b72'],
 ['stores-house',15,35,6.1,'#b2a281','#986b51'],
 ['craft-house',41,-3,5.5,'#c8b993','#5e7e75'],
 ['east-house',40,14,5.3,'#bcae8b','#89664e'],
].map(([id,dx,dz,r,cloth,band])=>at(dx,dz,{id,r,cloth,band,yaw:Math.atan2(-dx,-dz)})));
export const CAMP_WORKPLACES=f(Object.fromEntries([
 ['saera',-13,-16,0,[3,0]],['varek',27,-23,Math.PI,[3,0]],
 ['delan',-20,22,-Math.PI/2,[0,3]],['arven',1,19,.7,[3,0]],
 ['ilyra',27,14,.5,[3,0]],['kesh',-29,5,1.8,[3,0]],
].map(([id,dx,dz,yaw,walk])=>[id,at(dx,dz,{yaw,walk:f(walk)})])));
export const CAMP_ARCHERY_TARGETS=f([[27,-36],[33,-34],[38,-30]].map(([x,z])=>at(x,z)));
export const CAMP_WAGONS=f([[24,24],[31,27],[36,28]].map(([x,z],i)=>at(x,z,{yaw:.14+i*.14})));
export const CAMP_MEADOW_APPROACH=f([at(-5,6),at(-5,28),CENTAUR_BATTLEFIELD.approach,
 at(0,85)]);
