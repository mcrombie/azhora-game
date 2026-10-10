import {cityLantern,cityMedallion,flowerBox,createCityStreetDetail} from '../../../world/scenery/city-detail.js';
import {NYLON_PATHS,NYLON_GATES,NYLON_OUTLINE,inNylon,nylonRiverClearance,nylonSegmentDistance} from './nylon-city.js';

const P={stone:'#c6bba0',trim:'#eee3c4',metal:'#a9874b',wood:'#655342',leaf:'#527555',leafLight:'#8d9e65',flower:'#ae7180',pot:'#aa7d60',tree:'blossom'};
export function decorateNylonFacade(b,home){
  const w=home.width,d=home.depth,h=home.height;
  if(home.kind==='palace')return;
  if(home.kind==='library'){
    // Book spines and engraved tablets below the great reading windows.
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const x=side*w*.375+(i-2)*.65,z=d/2-4.4;
      b.box(i%2?'#597b75':'#a88851',x,15.7,z,.42,1.2+(i%3)*.3,.16);
      b.box(P.trim,x,15.3,z+.1,.34,.07,.08);
    }
    for(const x of [-w*.44,w*.44])cityLantern(b,P,x,4.7,d/2-1,1.25);
    return;
  }
  for(const side of [-1,1])b.frame(0,0,0,side<0?Math.PI:0,()=>{
    if(home.kind!=='warehouse'){
      flowerBox(b,P,0,10.45,d/2+1.62,Math.min(w-2,3.1));
      if(h>25)flowerBox(b,P,0,19.45,d/2+1.62,Math.min(w-2,3.1));
    }
    cityLantern(b,P,1.3,3.7,d/2+.38,.75);
    b.beam(P.metal,[-w*.35,6.2,d/2+.15],[-w*.35,6.2,d/2+1.25],.07);
    b.box('#345d62',-w*.35,5.65,d/2+1.1,1,.95,.12);
    cityMedallion(b,P,-w*.35,5.65,d/2+1.19,.36,'book');
    for(const xx of [-w/2+.48,w/2-.48])for(let yy=3;yy<h-7;yy+=2.1)b.box(P.trim,xx,yy,d/2+.1,.45,.7,.15);
  });
}
export function* polishNylon(options){
  return yield* createCityStreetDetail({...options,id:'nylon',palette:P,paths:NYLON_PATHS,spacing:11,
    inside:(x,z,r)=>inNylon(x,z)&&NYLON_OUTLINE.every((a,i)=>nylonSegmentDistance(x,z,a,NYLON_OUTLINE[(i+1)%NYLON_OUTLINE.length])>r+4.5),
    dry:(x,z,r)=>nylonRiverClearance(x,z)>r+6,
    protectedPoints:NYLON_GATES.map(g=>({...g,radius:g.width/2+3}))});
}
