import {cityLantern,cityMedallion,createCityStreetDetail} from '../../../world/scenery/city-detail.js';
import {AEVIS_PATHS,AEVIS_GATES,AEVIS_SOLDIERS,AEVIS_OUTLINE,AEVIS_DRILL_RACKS,inAevis,aevisSegmentDistance} from './aevis-city.js';
import {landDistance} from '../../../world/terrain/region-world.js';

const P={stone:'#857f68',trim:'#c2b48d',metal:'#b3874b',wood:'#65503a',leaf:'#516b48',leafLight:'#798559',flower:'#d5b56e',pot:'#91634a',tree:'cypress'};

/** Aevis keeps its massive bronze plates and bull guardians. Fluted roof vents,
 * riveted shields and inlaid red/ochre bands add craft at walking distance. */
export function decorateAevisFacade(b,home){
  const w=home.width,d=home.depth,h=home.height;
  if(!['palace','archive'].includes(home.kind)){
    for(const side of [-1,1])b.frame(0,0,0,side*Math.PI/2,()=>{
      b.box(P.trim,0,h-1.1,w/2+.16,d-.8,.55,.16);
      for(let x=-d/2+1.1;x<d/2-1;x+=1.7){
        b.box('#8b4937',x,h-1.1,w/2+.28,.48,.42,.09,0,0,Math.PI/4);
        b.box('#374e43',x,h*.65,w/2+.13,.68,1.9,.1);
        b.box(P.metal,x,h*.65+1.05,w/2+.2,1,.14,.16);
      }
    });
    for(const s of [-1,1])b.frame(0,0,0,s<0?Math.PI:0,()=>{
      cityLantern(b,P,2.1,3.6,d/2+.42,.8);
      for(const x of [-w*.28,w*.28]){
        b.rock('#3b6354',x,h*.6,d/2+.3,.72,.85,.13);
        cityMedallion(b,P,x,h*.6,d/2+.46,.56);
      }
    });
    const rise=Math.min(4.5,w*.22);
    b.block(P.stone,0,h+rise-.5,0,2.4,1.5,2.8);
    for(const x of [-.65,0,.65])b.box('#364637',x,h+rise+.3,1.43,.27,.68,.08);
    b.roof('#4c7866',0,h+rise+1,0,2.9,3.3,.8);
  }else{
    // The portico projects beyond the enclosed facade. Mount these on that
    // facade, not in the open air between its columns.
    const z=home.kind==='palace'?d*.295+.2:-d*.305-.2;
    for(const x of [-w*.42,w*.42]){
      cityLantern(b,P,x,4.5,z,1.2);
      for(let yy=6.5;yy<h-1;yy+=2.1)b.box(P.metal,x,yy,z,.55,.55,.22,0,0,Math.PI/4);
    }
  }
}

export function* polishAevis(options){
  return yield* createCityStreetDetail({...options,id:'aevis',palette:P,paths:AEVIS_PATHS,spacing:10,
    inside:(x,z,r)=>inAevis(x,z)&&AEVIS_OUTLINE.every((a,i)=>aevisSegmentDistance(x,z,a,AEVIS_OUTLINE[(i+1)%AEVIS_OUTLINE.length])>r+2),
    dry:(x,z,r)=>landDistance(x,z)>r+7,
    protectedPoints:[...AEVIS_GATES.map(g=>({...g,radius:g.width/2+3})),...AEVIS_SOLDIERS.map(p=>({...p,radius:3})),...AEVIS_DRILL_RACKS.map(p=>({...p,radius:3}))]});
}
