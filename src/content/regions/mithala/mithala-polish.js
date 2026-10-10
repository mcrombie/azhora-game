import {cityLantern,cityMedallion,flowerBox,createCityStreetDetail} from '../../../world/scenery/city-detail.js';
import {MITHALA_STREETS,MITHALA_GATES,MITHALA_DISTRICTS,polygonDepth,mithalaCityWaterClearance} from './mithala-city.js';
const P={stone:'#8e7f66',trim:'#d8c79f',metal:'#75644d',wood:'#846344',leaf:'#536e50',leafLight:'#889568',flower:'#caad77',pot:'#a0754d',tree:'round'};
export function decorateMithalaBuilding(b,s){
  const {bd,W,D}=s;
  if(!['house','hall','inn','court'].includes(bd.kind))return;
  const h=Math.min(bd.height,9),z=D/2+.06;
  cityLantern(b,P,-W*.32,3.5,z+.32,.72);
  for(const side of [-1,1]){
    // Reed-carved lintel ends and pale joint pegs, native to Mithali timberwork.
    for(let yy=2.2;yy<h-.5;yy+=1.5)b.box(P.trim,side*(W/2-.35),yy,z,.14,.16,.07);
    flowerBox(b,P,side*W*.32,3.15,z+.18,1.25);
  }
  if(W>12){
    b.box('#70513a',W*.33,h-1.25,z+.05,1.7,1.8,.14);
    cityMedallion(b,P,W*.33,h-1.25,z+.17,.65,'reed');
  }
}
export function* polishMithala(options){
  return yield* createCityStreetDetail({...options,id:'mithala',palette:P,paths:MITHALA_STREETS,spacing:15,
    inside:(x,z,r)=>MITHALA_DISTRICTS.some(d=>polygonDepth(d.outline,x,z)>r+8),
    dry:(x,z,r)=>mithalaCityWaterClearance(x,z)>r+5,
    protectedPoints:MITHALA_GATES.map(g=>({...g,radius:g.width/2+4}))});
}
