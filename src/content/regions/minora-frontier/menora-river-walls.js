import {MENORA, MENORA_OUTLINE} from './menora-city.js';

// The riverbed is a footing, never the datum for the city's battlements.
export const menoraWallDatum=(heightAt,x,z)=>Math.max(MENORA.elevation,heightAt(x,z));
export const MENORA_BECK_ARCH=Object.freeze({edge:6,along:36,radius:6,spring:20.5,crown:26.5});

/** One real culvert through the south-west curtain for the garden beck. */
export function addMenoraBeckArch(b){
  const arch=MENORA_BECK_ARCH,a=MENORA_OUTLINE[arch.edge],c=MENORA_OUTLINE[arch.edge+1];
  const yaw=Math.atan2(c.x-a.x,c.z-a.z),top=MENORA.elevation+18,W=1.8,N=20;
  b.frame(a.x,0,a.z,yaw,()=>{
    for(let i=0;i<N;i++){
      const angle=k=>Math.PI*(1-k/N),point=(k,r)=>[arch.spring+r*Math.sin(angle(k)),arch.along+r*Math.cos(angle(k))];
      const [y0,z0]=point(i,arch.radius),[y1,z1]=point(i+1,arch.radius);
      const [v0,s0]=point(i,arch.radius+.55),[v1,s1]=point(i+1,arch.radius+.55);
      b.quad('#b9c4bd',[-W,y0,z0],[W,y0,z0],[W,y1,z1],[-W,y1,z1]);
      for(const side of [-1,1]){
        const x=side*W,face=[[x,y0,z0],[x,top,z0],[x,top,z1],[x,y1,z1]],ring=[[x+side*.035,y0,z0],[x+side*.035,v0,s0],[x+side*.035,v1,s1],[x+side*.035,y1,z1]];
        b.quad('#e2e2d2',...(side>0?face:face.reverse()));b.quad('#eee9d4',...(side>0?ring:ring.reverse()));
      }
    }
  });
}
