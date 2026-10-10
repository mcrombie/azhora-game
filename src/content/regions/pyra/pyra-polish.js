import {cityLantern,cityMedallion,littleBalcony,stripedAwning,createCityStreetDetail} from '../../../world/scenery/city-detail.js';
import {pyraPoint,pyraLocal} from './pyra-world.js';
const P={stone:'#b99a50',trim:'#f0dca2',metal:'#b88839',wood:'#725338',leaf:'#6b7949',leafLight:'#929859',flower:'#d49b66',pot:'#a77349',cloth:'#7d5355',tree:'palm'};

export function decoratePyraHouse(b,u,v,w,d,h,index){
  b.frame(u,30,v,0,()=>{
    for(const side of [-1,1])b.frame(0,0,0,side<0?Math.PI:0,()=>{
      for(const x of [-w/2+.5,w/2-.5]){
        b.block(P.trim,x,.8,d/2+.16,.4,h-1.2,.3);
        b.box(P.metal,x,h-1,d/2+.2,.8,.38,.48);
      }
      b.box(P.metal,0,h-1.1,d/2+.1,w-1,.85,.13);
      for(let x=-w/2+1.3;x<w/2-1;x+=1.8)b.box(P.trim,x,h-1.1,d/2+.23,.5,.5,.1,0,0,Math.PI/4);
      if(side>0){
        cityLantern(b,P,2.1,3.7,d/2+.42,.85);
        if(h>8.5)littleBalcony(b,P,0,5.2,d/2+.12,3);
        else stripedAwning(b,P,0,4.5,d/2+.2,3.8,1.2);
      }else{
        for(const x of [-w*.28,w*.28]){
          b.box('#486569',x,h*.6,d/2+.12,1.25,2.15,.14);
          b.box(P.trim,x,h*.6,d/2+.23,.085,2.2,.07);
          b.box(P.trim,x,h*.6,d/2+.23,1.35,.09,.07);
        }
      }
    });
    if(index%2===0){b.block(P.stone,w*.27,h-1,0,1,4,1.2);b.box(P.trim,w*.27,h+3,0,1.5,.25,1.6);}
  });
}

export function decoratePyraPalace(b){
  // Sunburst soffit and a ribbed main dome; no planting on suspended structures.
  // Keep the stair landing at (20,-8) and the central audience approach open.
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8;
    for(let j=0;j<6;j++){
      const t=j*Math.PI/12,s=(j+1)*Math.PI/12;
      b.beam(P.trim,[Math.cos(a)*12.05*Math.cos(t),83.3+9.06*Math.sin(t),-31.5+Math.sin(a)*12.05*Math.cos(t)],
        [Math.cos(a)*12.05*Math.cos(s),83.3+9.06*Math.sin(s),-31.5+Math.sin(a)*12.05*Math.cos(s)],.11);
    }
  }
  b.frame(0,0,-18.95,0,()=>cityMedallion(b,P,0,78,0,2.6));
  for(const u of [-14,-7,0,7,14]){
    for(const v of [-17,-9]){
      b.box('#6c7c73',u,72.015,v,1.8,.03,1.8,Math.PI/4);
      b.box(P.trim,u,72.036,v,.75,.015,.75,Math.PI/4);
    }
  }
}
const paths=[];
for(const side of [-1,1]){
  paths.push({width:20,points:[pyraPoint(side*88,0),pyraPoint(side*139,0)]});
  paths.push({width:12,points:[pyraPoint(side*81,-80),pyraPoint(side*81,80)]});
  for(const v of [-45,45])paths.push({width:12,points:[pyraPoint(side*83,v),pyraPoint(side*136,v)]});
}
export function* polishPyra(options){
  return yield* createCityStreetDetail({...options,id:'pyra',palette:P,paths,spacing:12,
    inside:(x,z,r)=>{const {u,v}=pyraLocal(x,z);return Math.abs(u)>45+r&&Math.abs(u)<139-r&&Math.abs(v)<85-r
      && !(Math.abs(u)<91+r&&Math.abs(v)<25+r);}});
}
