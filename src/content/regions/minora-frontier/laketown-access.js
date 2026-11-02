import {YUNETHRE_TOWN as T} from './yunethre-world.js';
import {LAKETOWN_FISHING as F} from './laketown-waterfront-layout.js';

const distance=(x,z,a,b)=>{
  const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
};
const promenade=[{x:T.x-23,z:T.z},{x:T.x-43,z:T.z+9},{x:T.x-62,z:T.z+9},{x:T.x-86,z:T.z+9}];
// Yunethre constructs these shore works, although the atlas puts their upper
// end in South Oremindi. A bounded chapter can visit/save on its own decks
// without enabling the rest of the mountain region or changing the atlas.
export function laketownShoreAccess(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  if(promenade.some((b,i)=>i>0&&distance(x,z,promenade[i-1],b)<=2.15))return true;
  if(distance(x,z,F.gangway.a,F.gangway.b)<=F.gangway.width/2+.25)return true;
  return Math.abs(x-F.apron.x)<=F.apron.w/2+.15&&Math.abs(z-F.apron.z)<=F.apron.d/2+.15;
}
