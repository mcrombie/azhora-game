import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {SOUTH_OREMINDI_EXPEDITION as sites} from './south-oremindi-expedition.js';
import {southOremindiOwns,southOremindiWaterAt,southOremindiPathDistance} from './south-oremindi-world.js';

/** Glacial turf, broken mica slabs and low heather. The fighting ground stays
 * physically open; scattered plants never become hidden collision barriers. */
export function* buildSouthOremindiExpeditionScenery({parent,heightAt}){
 let seed=173018;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const terrain=(x,z)=>heightAt(x,z)+.045;
 const stats={slabs:0,heather:0,turf:0};
 for(const id of ['ambush','highground']){
  const p=sites[id],b=createSceneryBuilder(`South Oremindi / ${id} glacial turf`);
  for(let i=0;i<74;i++){
   const a=i*2.3999632297,r=p.radius+5+random()*18,x=p.x+Math.sin(a)*r,z=p.z+Math.cos(a)*r;
   if(!southOremindiOwns(x,z)||southOremindiWaterAt(x,z)!==null||southOremindiPathDistance(x,z)<7)continue;
   const y=heightAt(x,z),sx=1.2+random()*2.9,sz=.6+random()*1.6,h=.15+random()*.55;
   b.rock(i%3?'#949b98':'#b5b8a6',x,y+h*.16,z,sx,h,sz,a);stats.slabs++;
   // Smaller quartz chips collect beside the large slab, not on the route.
   for(let k=0;k<3;k++){const px=x+Math.sin(a+k)*sx,pz=z+Math.cos(a+k)*sz;b.rock('#b5b6a8',px,terrain(px,pz),pz,.3,.09,.23,a);}
   if(i%12===0)yield;
  }
  for(let i=0;i<105;i++){
   const a=i*2.3999632297+.8,r=Math.sqrt(random())*(p.radius+13),x=p.x+Math.sin(a)*r,z=p.z+Math.cos(a)*r;
   if(!southOremindiOwns(x,z)||southOremindiWaterAt(x,z)!==null||southOremindiPathDistance(x,z)<5)continue;
   // Small uneven patches follow the terrain, with no raised arena floor.
   const rx=1+random()*2.3,rz=.5+random()*1.5,colour=['#929774','#9da085','#868c71','#a7a58b'][i%4];
   const centre=[x,terrain(x,z),z],edge=Array.from({length:6},(_,j)=>{const a=j*Math.PI/3,s=.7+random()*.3,px=x+Math.sin(a)*rx*s,pz=z+Math.cos(a)*rz*s;return[px,terrain(px,pz),pz];});
   for(let j=0;j<6;j++)b.triangle(colour,centre,edge[(j+1)%6],edge[j]);stats.turf++;
   // A few ankle-high tufts in the broad meadow; flowering heather stays at
   // the outside edge so combat silhouettes remain legible.
   for(let k=0;k<3;k++){const px=x+(random()-.5)*rx,pz=z+(random()-.5)*rz;b.cone('#808862',px,terrain(px,pz),pz,.08,.22+random()*.16,k,4);}
   if(r>p.radius-5){for(let k=0;k<4;k++){const px=x+(random()-.5)*1.4,pz=z+(random()-.5)*1.4;b.rock(k%2?'#807587':'#999078',px,terrain(px,pz)+.15,pz,.32,.18,.26,a);}stats.heather++;}
   if(i%18===0)yield;
  }
  yield* b.finishSteps(parent);
 }
 return stats;
}
