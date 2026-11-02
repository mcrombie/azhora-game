import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {finishBuild} from '../../../world/loading/build-steps.js';
import {outerWaterAt} from '../outer-regions/outer-regions-world.js';
import {LOND_ROADS,LOND_BRIDGES,bridgePoint,bridgeHeight} from './lond-layout.js';
import {LOND_FIELDS,LOND_BUILDINGS,LOND_FARMSTEADS,LOND_CROPS,LOND_MARKET,LOND_MARKET_STALLS} from './lond-country.js';
import {londHouse,LOND_PALETTE as P} from './lond-architecture.js';
import {londTownHouse} from './lond-town-architecture.js';
import {createStonefistSteps} from './stonefist-scenery.js';

export const createLondScenery=options=>finishBuild(createLondScenerySteps(options));
export function* createLondScenerySteps({parent,heightAt,colliders=[],region='Central Lond'}){
  const root=new THREE.Group();root.name=region+' / Tolgufeld';parent.add(root);
  const metrics={region,fields:0,buildings:0,bridges:0,fortressHalls:0,guildhalls:0,merchantHouses:0,timberHouses:0,batches:0};
  const batches=new Map();
  const batch=(x,z)=>{const key=`${Math.floor(x/210)},${Math.floor(z/210)}`;if(!batches.has(key))batches.set(key,createSceneryBuilder('Lond fields / '+key));return batches.get(key);};
  for(const field of LOND_FIELDS.filter(f=>f.region===region)){
    const b=batch(field.x,field.z),[soil,crop]=LOND_CROPS[field.crop],{x,z,w,d}=field;
    yield* b.patchSteps(soil,heightAt,x,z,w,d,0,.09,Math.ceil(w/8));
    // Subtle raised strips, not thousands of separate individual crop meshes.
    for(let u=-w/2+2;u<w/2-1;u+=3.4)yield* b.patchSteps(crop,heightAt,x+u,z,1.8,d-3,0,.16,Math.ceil(d/9));
    // Unequal hedges and gaps show old field boundaries; the gaps remain lanes.
    for(const side of [-1,1])for(let u=-w/2+2;u<w/2-2;u+=5){
      if(Math.abs(u)<5)continue;const px=x+u,pz=z+side*(d/2+.7),y=heightAt(px,pz);
      b.rock('#67794f',px,y+.52,pz,2.7,.65,.75,.1);
    }
    if(field.seed>.7){for(let v=-d/2+7;v<d/2;v+=10){const px=x-w/2+2,pz=z+v,y=heightAt(px,pz);b.cylinder(P.timber,px,y,pz,.17,2.3);b.rock('#6b8052',px,y+3,pz,1.9,1.6,1.8);}}
    metrics.fields++;yield;
  }
  for(const site of LOND_FARMSTEADS.filter(f=>f.region===region)){
    londHouse(batch(site.x,site.z),site,heightAt,{colliders});metrics.buildings++;
  }
  for(const b of batches.values()){yield* b.finishSteps(root);metrics.batches++;}
  if(region==='Central Lond'){
    const fort=yield* createStonefistSteps({parent:root,heightAt,colliders});metrics.fortressHalls=fort.halls;metrics.batches+=2;
    const town=createSceneryBuilder('Lond Town / German timber frames and brick guild fronts');
    for(const site of LOND_BUILDINGS){
      londTownHouse(town,site,heightAt,{colliders});metrics.buildings++;
      metrics[site.kind==='guildhall'?'guildhalls':site.kind==='merchant'?'merchantHouses':'timberHouses']++;yield;
    }
    yield* town.patchSteps('#aba38d',heightAt,LOND_MARKET.x,LOND_MARKET.z,LOND_MARKET.w,LOND_MARKET.d,0,.15,15);
    yield* town.patchSteps('#b3ab95',heightAt,-38.9,-3251,3.2,18,0,.15,9);
    for(const road of LOND_ROADS)for(let i=1;i<road.length;i++){
      const a=road[i-1],b=road[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/3);
      for(let j=0;j<n;j++){
        const x=a.x+(b.x-a.x)*(j+.5)/n,z=a.z+(b.z-a.z)*(j+.5)/n;
        if(outerWaterAt(x,z)!==null)continue;
        yield* town.patchSteps('#b4a586',heightAt,x,z,5,3.5,Math.atan2(b.x-a.x,b.z-a.z),.14,2);
      }
    }
    for(const bridge of LOND_BRIDGES){
      const n=Math.ceil(bridge.length/1.8);
      for(let i=0;i<n;i++){
        const u=-bridge.length/2+bridge.length*i/n,v=-bridge.length/2+bridge.length*(i+1)/n;
        const at=(u,w)=>{const p=bridgePoint(bridge,u,w);return [p.x,bridgeHeight(bridge,u)+.06,p.z];};
        const a=at(u,-bridge.width/2),b=at(v,-bridge.width/2),c=at(v,bridge.width/2),d=at(u,bridge.width/2);
        // Double-sided because axis z reverses the winding relative to axis x.
        town.sheet('#c1b69a',a,b,c,d);
        for(const side of [-1,1]){
          const p=at(u,side*(bridge.width/2+.1)),q=at(v,side*(bridge.width/2+.1));
          town.beam(P.stone,[p[0],p[1]+.65,p[2]],[q[0],q[1]+.65,q[2]],.42,1.1);
          colliders.push({x:(p[0]+q[0])/2,z:(p[2]+q[2])/2,hx:bridge.axis==='x'?(v-u)/2:.23,hz:bridge.axis==='z'?(v-u)/2:.23,minY:Math.min(p[1],q[1]),maxY:Math.max(p[1],q[1])+1.3,kind:'wall'});
          if(i%4===0)town.block(P.trim,p[0],p[1],p[2],.65,1.25,.65);
        }
      }
      // Open spans leave the river flowing under the bridge; piers only near
      // the banks, never a solid wall from bed to deck across the channel.
      for(const u of [-13,13]){const p=bridgePoint(bridge,u),y=heightAt(p.x,p.z);town.block(P.stone,p.x,y,p.z,bridge.axis==='x'?2:bridge.width,Math.max(.3,bridgeHeight(bridge,u)-y-.15),bridge.axis==='z'?2:bridge.width);}
      metrics.bridges++;
    }
    // River stairs, mooring stages and small working boats at the northern bend.
    for(const [x,z,side] of [[26,-3286,1],[72,-3240,-1],[-18,-3172,1]]){
      const y=heightAt(x,z);town.block(P.timber,x,y-.15,z,7,.3,4);
      for(const dx of [-3,3])for(const dz of [-1.6,1.6])town.cylinder(P.timber,x+dx,y-2,z+dz,.18,3);
      const bx=x+side*9,water=outerWaterAt(bx,z);if(water!==null){
        town.frame(bx,water+.1,z,.2,()=>{
          town.quad('#6c5338',[-1,0,-3],[1,0,-3],[.7,0,3],[-.7,0,3]);
          town.sheet('#8d7150',[-1,0,-3],[-.7,0,3],[0,.7,4],[-1.6,.7,-2]);
          town.sheet('#927854',[1,0,-3],[1.6,.7,-2],[0,.7,4],[.7,0,3]);
          for(const v of [-1.5,.5,2])town.block(P.timber,0,.32,v,2,.15,.4);
        });
      }
    }
    // A small market occupies the open west-bank street; no walls or gateway
    // circuit divides the town from the surrounding farms.
    for(const [i,stall] of LOND_MARKET_STALLS.entries()){
      const {x,z}=stall,y=heightAt(x,z);
      town.block(P.timber,x,y,z,3,.8,1.5);
      for(const s of [-1,1])town.cylinder(P.timber,x+s*1.6,y,z,.08,2.8);
      town.roof(i%2?P.flag:'#a48c58',x,y+2.7,z,3.8,2.8,.6);
      for(let j=0;j<3;j++)town.rock('#b5a061',x+(j-1)*.7,y+1,z,.35,.3,.3);
      colliders.push({x,z,hx:1.9,hz:1.4,minY:y-.2,maxY:y+3.4,kind:'building'});
    }
    yield* town.finishSteps(root);metrics.batches++;
  }
  root.userData.lond=metrics;return {root,metrics,update:()=>{}};
}
