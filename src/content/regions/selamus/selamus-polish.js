import {cityLantern,flowerBox,stripedAwning,createCityStreetDetail} from '../../../world/scenery/city-detail.js';
import {SELAMUS_PLAZAS,SELAMUS_BRIDGES,selamusPoint,selamusLocal,selamusUrban,selamusCanalAt} from './selamus-city.js';
const P={stone:'#c4b294',trim:'#efe0bf',metal:'#607c72',wood:'#6d5743',leaf:'#5b7b59',leafLight:'#829563',flower:'#b85076',pot:'#b47759',cloth:'#598786',tree:'citrus'};

export function decorateSelemisFacade(b,home){
  const w=home.width,d=home.depth,h=home.height;
  if(home.kind==='campanile'||home.kind==='temple')return;
  // Work in the palazzo's established street-facing frame (-Z), preserving
  // the walk-through arcade below and the narrow lanes between its neighbours.
  b.frame(0,0,0,Math.PI,()=>{
    const bays=Math.max(2,Math.floor((w-1)/4));
    for(let floor=0;floor<Math.max(1,Math.floor((h-4.8)/3.6));floor++){
      for(let k=0;k<bays;k++){
        const x=(k-(bays-1)/2)*(w-1.8)/bays,y=5.3+floor*3.6;
        if((floor+k+home.palette)%2===0)flowerBox(b,P,x,y-.28,d/2+.4,1.45);
      }
    }
    cityLantern(b,P,-w/2+.48,3.45,d/2+.5,.7);
    if(home.kind==='house'||home.kind==='palazzo')stripedAwning(b,{...P,cloth:['#497d79','#b56c50','#91825b'][home.palette%3]},0,4.85,d/2+.08,w*.67,.95);
    for(let x=-w/2+.65;x<w/2;x+=.8)b.box(P.trim,x,h-.5,d/2+.22,.26,.35,.32);
  });
}
const paths=[-145,-81,0,90,140].map(u=>({width:4,points:[selamusPoint(u,-80),selamusPoint(u,76)]}));
for(const s of SELAMUS_PLAZAS){
  for(const side of [-1,1])paths.push({width:3,points:[selamusPoint(s.u-s.width/2+2,s.v+side*(s.depth/2-3)),selamusPoint(s.u+s.width/2-2,s.v+side*(s.depth/2-3))]});
}
export function* polishSelemis(options){
  return yield* createCityStreetDetail({...options,id:'selemis',palette:P,paths,spacing:13,
    inside:(x,z,r)=>{
      const {u,v}=selamusLocal(x,z);
      return selamusUrban(x,z)&&!SELAMUS_PLAZAS.some(s=>Math.abs(u-s.u)<s.width*.36+r+.6&&Math.abs(v-s.v)<s.depth*.32+r+.6);
    },dry:(x,z,r)=>selamusCanalAt(x,z)?.edge>r+3,
    protectedPoints:SELAMUS_BRIDGES.flatMap(b=>[b.a,b.b].map(p=>({...p,radius:b.width/2+4})))});
}
