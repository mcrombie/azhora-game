import {createSceneryBuilder as sceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {STONEFIST,STONEFIST_ASCENT,stonePoint,pathSample} from './lond-layout.js';
import {londHouse,crown,LOND_PALETTE as P} from './lond-architecture.js';

export function* createStonefistSteps({parent,heightAt,colliders}){
  const rock=sceneryBuilder('Stonefist / the five natural crags'),b=sceneryBuilder('Stonefist / royal stonework');
  // A fine local skin resolves the tall fractures independently of the broad
  // countryside's mesh spacing. It samples the same walkable heightfield.
  const point=(u,v)=>{const p=stonePoint(u,v);return [p.x,heightAt(p.x,p.z)+.045,p.z];};
  for(let z=-83;z<83;z+=1.8){yield;for(let x=-83;x<83;x+=1.8){
    if(Math.hypot(x+.9,z+.9)>81)continue;
    const a=point(x,z),c=point(x+1.8,z+1.8),d=point(x+1.8,z),e=point(x,z+1.8),h=(a[1]+c[1])/2;
    const slope=Math.max(Math.abs(a[1]-c[1]),Math.abs(d[1]-e[1]));
    const tint=h<29?'#969879':slope>6?'#6f7976':h>112?'#a5aaa0':slope>2?'#838c84':'#9ca494';
    rock.quad(tint,a,e,c,d);
  }}
  yield* rock.finishSteps(parent);
  // Paved ascent and a low protective outer rail follow every bend. Keep the
  // centre clear for movement; gates are real openings between their piers.
  for(let i=1;i<STONEFIST_ASCENT.length;i++){
    const a=STONEFIST_ASCENT[i-1],c=STONEFIST_ASCENT[i],dx=c.x-a.x,dz=c.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
    b.sheet('#b4b09a',[a.x-nx*2.3,a.y+.1,a.z-nz*2.3],[c.x-nx*2.3,c.y+.1,c.z-nz*2.3],[c.x+nx*2.3,c.y+.1,c.z+nz*2.3],[a.x+nx*2.3,a.y+.1,a.z+nz*2.3]);
    const outer=[a.x+nx*2.55,a.y+.8,a.z+nz*2.55],end=[c.x+nx*2.55,c.y+.8,c.z+nz*2.55];
    b.beam(P.stone,outer,end,.5,1.4);
    colliders.push({x:(outer[0]+end[0])/2,z:(outer[2]+end[2])/2,r:.34,minY:a.y,maxY:c.y+1.5,kind:'wall'});
    if(i%3===0)b.block(P.trim,...[outer[0],a.y+.2,outer[2]],.75,1.5,.75);
    if(i%18===0){const p=stonePoint(0,0),vx=c.x-p.x,vz=c.z-p.z,r=Math.hypot(vx,vz),x=c.x+vx/r*5,z=c.z+vz/r*5;
      crown(b,x,heightAt(x,z)-1,z,2.7,{height:7,colliders});
    }
    if(i%20===0)yield;
  }
  for(const i of [9,48,87]){
    const a=STONEFIST_ASCENT[i],c=STONEFIST_ASCENT[i+1],angle=Math.atan2(c.x-a.x,c.z-a.z);
    b.frame(a.x,a.y,a.z,angle,()=>{
      for(const s of [-1,1]){b.block(P.stone,s*3.1,-1,0,1.25,7,2.2);b.block(P.trim,s*3.1,4.6,0,1.7,.5,2.5);}
      b.block(P.trim,0,5.8,0,7.5,1.1,2.3);b.block(P.dark,0,6.9,0,8,.35,2.7);
      b.block(P.flag,2.9,2.5,1.2,.8,2.5,.04);
    });
  }
  // Royal hall nestles between the natural fingers, with smaller inhabited
  // terraces below. The capital is recognisably human without hiding its rock.
  const hall={...stonePoint(0,4),w:13,d:18,height:17,yaw:0,base:96,seed:.25};
  londHouse(b,hall,heightAt,{grand:true,colliders});
  b.frame(STONEFIST.x,96,STONEFIST.z+4,0,()=>{
    for(const s of [-1,1]){b.block(P.trim,s*7,0,-5,1.2,19,1.7);b.cone(P.roof,s*7,19,-5,1.1,4,Math.PI/4,4);}
    b.block(P.dark,0,4,9.02,2.1,6,.1);b.block(P.gold,0,3.9,9.14,2.4,.25,.3);
    for(const s of [-1,1])b.sheet(P.flag,[s*5-1,10,9.15],[s*5+1,10,9.15],[s*5+1,4,9.15],[s*5-1,4,9.15]);
    b.cylinder(P.gold,0,27,0,.12,7);b.sheet(P.flag,[0,33,0],[4,32.8,0],[4,30.9,0],[0,31,0]);
  });
  for(const u of [-6.7,6.7])for(const v of [-3.7,11.7]){
    const p=stonePoint(u,v);crown(b,p.x,95,p.z,1.7,{height:21,colliders});
  }
  // A carved entrance arcade and balcony below the banners.
  b.frame(STONEFIST.x,96,STONEFIST.z+13.6,0,()=>{
    b.block(P.trim,0,4,0,10,.5,2.6);
    for(const x of [-4.3,-2.6,2.6,4.3]){b.cylinder(P.trim,x,0,0,.22,4);b.block(P.gold,x,3.7,0,.75,.35,.7);}
    for(let x=-4.4;x<=4.4;x+=.8)b.block(P.trim,x,4.5,1.2,.2,1.2,.2);
    b.block(P.trim,0,5.6,1.2,9.2,.2,.3);
  });
  let halls=1;
  for(const [u,v,yaw] of [[26,9,.4],[-24,11,-.5],[1,25,0],[-33,22,-.7],[32,24,.4]]){
    const site=stonePoint(u,v),h=heightAt(site.x,site.z);
    if(pathSample(site.x,site.z,STONEFIST_ASCENT).distance<8)continue;
    londHouse(b,{...site,w:7,d:10,height:6.4,yaw,base:h,seed:.3},heightAt,{colliders});halls++;
  }
  // Buttresses emerge from existing rock shoulders, not a second artificial
  // enclosure around the countryside. Strong verticals carry delicate tops.
  for(const [u,v] of [[-38,-5],[39,-3],[-25,32],[24,36]]){
    const p=stonePoint(u,v),y=heightAt(p.x,p.z);
    if(pathSample(p.x,p.z,STONEFIST_ASCENT).distance<6)continue;
    crown(b,p.x,y-5,p.z,3.4,{height:16,colliders});
    for(const s of [-1,1])b.block(P.trim,p.x+s*2.9,y-9,p.z,.55,17,1.2);
  }
  yield* b.finishSteps(parent);
  return {halls,ascentLength:STONEFIST_ASCENT.length};
}
