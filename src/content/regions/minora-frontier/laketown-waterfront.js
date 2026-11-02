/** Merged, physical shore work: a fisher's house, drying nets and supported
 * landing. The working skiff is built separately by laketown-fishing.js. */
import {LAKETOWN_FISHING as F} from './laketown-waterfront-layout.js';

const wood='#80694c',dark='#4d4c3c',pale='#ac9971',stone='#aaa78e',rope='#b5ad88';
function coil(b,x,y,z,r=.36){
 for(let j=0;j<3;j++)for(let i=0;i<12;i++){
  const a=i*Math.PI/6,c=(i+1)*Math.PI/6,rr=r-j*.07;
  b.beam(rope,[x+Math.cos(a)*rr,y+j*.025,z+Math.sin(a)*rr],[x+Math.cos(c)*rr,y+j*.025,z+Math.sin(c)*rr],.035);
 }
}
function fish(b,x,y,z,s=1,yaw=0){
 b.frame(x,y,z,yaw,()=>{
  b.rock('#a6b7a0',0,0,0,.25*s,.065*s,.09*s);
  b.sheet('#788d7e',[-.18*s,0,-.02*s],[-.35*s,0,-.13*s],[-.35*s,0,.13*s],[-.18*s,0,.02*s]);
  b.rock('#374b43',.15*s,.025*s,.05*s,.018*s,.018*s,.018*s);
 });
}
function pile(b,x,z,top,heightAt){
 const low=Math.min(top-.4,heightAt(x,z)-.35);
 b.block(dark,x,low,z,.4,top-low,.4);b.block('#525d4d',x,F.surface-.2,z,.45,.4,.45);
}
export function buildLaketownWaterfront(b,{heightAt,walkSurfaces,colliders,metrics}){
 const y=F.deckY,A=F.apron,H=F.hut,G=F.gangway;
 walkSurfaces.push({id:'laketown-fisher-gangway',kind:'deck',a:{...G.a,y},b:{...G.b,y},width:G.width});
 walkSurfaces.push({id:'laketown-fisher-apron',kind:'deck',a:{x:A.x,z:A.z-A.d/2,y},b:{x:A.x,z:A.z+A.d/2,y},width:A.w});
 // A broad shore work apron sits on the natural bank, continuing on timber
 // piles over its wet edge. Its height is shared with the existing pier.
 for(let dz=-A.d/2+.3;dz<A.d/2;dz+=.6)b.box('#a38e68',A.x,y-.14,A.z+dz,A.w,.28,.58);
 for(const dx of [-A.w/2+.3,A.w/2-.3]){
  for(const dz of [-A.d/2+.3,0,A.d/2-.3])pile(b,A.x+dx,A.z+dz,y,heightAt);
  b.beam(wood,[A.x+dx,y-.45,A.z-A.d/2],[A.x+dx,y-.45,A.z+A.d/2],.3,.45);
 }
 for(let z=G.a.z;z<G.b.z;z+=.6)b.box('#a38e68',G.a.x,y-.14,z+.3,G.width,.28,.58);
 for(const side of [-1,1]){
  const x=G.a.x+side*(G.width/2-.16);
  for(const z of [G.a.z+3,G.b.z-1]){pile(b,x,z,y,heightAt);b.block(wood,x,y,z,.17,.95,.17);}
  b.beam(wood,[x,y+.83,G.a.z+2],[x,y+.83,G.b.z-1],.13);
 }
 // The front door faces the approach; the western side remains a working aisle.
 b.frame(H.x,y,H.z,H.yaw,()=>{
  b.block(stone,0,-.1,0,H.w+.15,.43,H.d+.15);
  b.block('#b6af8f',0,.3,0,H.w,4.15,H.d);
  for(const side of [-1,1]){
   for(const end of [-1,1])b.block(dark,side*(H.w/2-.14),.28,end*(H.d/2+.05),.26,4.2,.22);
   for(let i=0;i<11;i++)b.block(i%3?'#8d7b55':'#9b8861',side*(H.w/2+.025),.42,-H.d/2+.35+i*.63,.08,1.55,.6);
   b.block(wood,side*(H.w/2+.08),2.01,0,.12,.14,H.d+.2);
   b.block(dark,side*(H.w/2+.06),2.55,.3,.12,1.1,2.5);
   b.block('#7a9180',side*(H.w/2+.14),2.66,.3,.05,.88,2.22);
   for(const z of [-.45,.3,1.05])b.block(pale,side*(H.w/2+.18),2.66,z,.06,.88,.055);
   b.block(pale,side*(H.w/2+.18),3.08,.3,.06,.055,2.22);
   b.beam(pale,[side*(H.w/2-.2),3.1,H.d/2+.15],[side*(H.w/2-1),4.4,H.d/2+.15],.14);
  }
  const front=H.d/2+.12;
  b.block(dark,-.8,.35,front,1.9,2.8,.14);b.block(wood,-.8,.4,front+.1,1.65,2.65,.12);
  for(const k of [.9,2.4])b.block('#53594a',-.8,k,front+.18,1.55,.075,.06);
  b.rock(pale,-.23,1.6,front+.24,.07,.07,.05);
  b.block(dark,1.8,1.5,front,1.6,1.45,.15);b.block('#809e8c',1.8,1.63,front+.1,1.35,1.19,.06);
  b.block(pale,1.8,1.6,front+.17,.075,1.25,.06);b.block(pale,1.8,2.2,front+.17,1.4,.065,.06);
  b.block(pale,1.8,1.42,front+.2,1.8,.13,.33);
  b.roof('#526e61',0,4.48,0,H.w+1.4,H.d+1.5,2.65,0,'#ada98b');
  for(const side of [-1,1])for(let i=1;i<6;i++){
   const t=i/6;b.beam('#7d9072',[side*(H.w/2+.7)*t,4.51+2.65*(1-t),-H.d/2-.76],[side*(H.w/2+.7)*t,4.51+2.65*(1-t),H.d/2+.76],.05);
  }
  b.beam(dark,[0,7.19,-H.d/2-.9],[0,7.19,H.d/2+.9],.18);
  b.beam(pale,[-H.w/2-.6,4.5,front+.68],[0,7.17,front+.68],.17);
  b.beam(pale,[0,7.17,front+.68],[H.w/2+.6,4.5,front+.68],.17);
  // Worked wooden fish on the gable identifies the trade without a title card.
  b.rock('#a6a17b',0,5.65,front+.73,1.1,.32,.12);
  b.sheet(pale,[-.8,5.65,front+.76],[-1.45,6.12,front+.76],[-1.45,5.18,front+.76],[-.8,5.65,front+.76]);
  b.rock(dark,.65,5.74,front+.86,.07,.07,.035);
  b.roof('#7a8060',0,3.1,front+1.15,H.w-.4,2.8,.8);
  for(const side of [-1,1])b.block(wood,side*(H.w/2-.55),0,front+2.3,.19,3.1,.19);
  b.block('#919581',-2.5,4.45,-2,1,2.4,1);b.block(stone,-2.5,6.72,-2,1.2,.22,1.2);
 });
 colliders?.push({x:H.x,z:H.z,r:4.2,minY:y,maxY:y+7.4,kind:'building'});
 // Net drying rack beside the house, above a clear west-side passage.
 const rx=A.x-4.75,rz=A.z+2.4;
 for(const dz of [-2,2])b.block(wood,rx,y,rz+dz,.18,3.5,.18);
 b.beam(wood,[rx,y+3.5,rz-2.2],[rx,y+3.5,rz+2.2],.18);
 for(let i=0;i<9;i++){
  const z=rz-1.8+i*.45,drop=.3*Math.sin(i*Math.PI/8);
  b.beam(rope,[rx,y+3.35-drop,z],[rx,y+1.05-drop,z],.025);
 }
 for(let k=0;k<7;k++)for(let i=0;i<8;i++){
  const z=rz-1.8+i*.45,drop=.3*Math.sin(i*Math.PI/8),next=.3*Math.sin((i+1)*Math.PI/8);
  b.beam(rope,[rx,y+1.05+k*.37-drop,z],[rx,y+1.05+k*.37-next,z+.45],.022);
 }
 // Sorting table, slatted baskets, fish and floats occupy the outer edge only.
 const tx=A.x+4.7,tz=A.z+4.9;
 b.block(pale,tx,y+1,tz,1.6,.18,2.4);
 for(const dx of [-.6,.6])for(const dz of [-.9,.9])b.block(wood,tx+dx,y,tz+dz,.12,1,.12);
 for(let i=0;i<5;i++)fish(b,tx+(i%2-.5)*.65,y+1.24,tz-.75+i*.36,.8,.2);
 for(let i=0;i<3;i++){
  const x=A.x+3.4-i*1.3,z=A.z+5.4;b.cylinder('#9f895c',x,y,z,.43,.65);b.cylinder('#4d4f3c',x,y+.65,z,.35,.025);
  for(let j=0;j<5;j++)b.cylinder(rope,x,y+.08+j*.12,z,.44,.035);
 }
 coil(b,G.a.x-.65,y+.04,G.a.z+4.5);coil(b,A.x-3.8,y+.04,A.z-4.8,.46);
 for(let i=0;i<5;i++)b.rock(i%2?'#a39a6d':'#b3ac87',A.x-4.8,y+.27,A.z-3+i*.55,.15,.22,.18);
 // Mooring cleats are at the working berth; there is deliberately no static
 // hull here because the resident fisherman uses this exact physical space.
 for(const dx of [-2,2]){
  b.block(dark,F.unload.x+dx,y,F.unload.z-.35,.16,.4,.16);
  b.block(pale,F.unload.x+dx,y+.35,F.unload.z-.35,.6,.1,.13);
 }
 metrics.fishingHuts=1;metrics.fishingWorkAprons=1;
}
