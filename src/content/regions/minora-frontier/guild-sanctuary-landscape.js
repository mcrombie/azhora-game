import {createSpeciesTrees} from '../../../world/scenery/species-trees.js';
import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {SANCTUARY as S,SANCTUARY_ENTRY as ENTRY,SANCTUARY_HABITATS as HABITATS,sanctuaryPathDistance} from './guild-sanctuary-layout.js';

const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};

// The rendered triangles and the walking surface share precisely the same grid.
// Biome landmarks are scenery, rather than another region simulation to load.
export function sanctuaryGround(pools){
  const step=8,cache=new Map();
  const poolAt=(x,z)=>pools.find(p=>Math.hypot(x-p.x,z-p.z)<p.r);
  function raw(x,z){
    const dx=x-S.x,dz=z-S.z;
    const central=smooth((Math.hypot(x-ENTRY.x,z-ENTRY.z)-24)/35),path=.68+.32*smooth(sanctuaryPathDistance(x,z)/16);
    let hill=2+2*Math.sin(dx*.019)+1.6*Math.cos(dz*.024)+Math.sin(dx*.041+dz*.027);
    // Overlapping smooth influences keep habitat transitions walkable. Selecting
    // only the nearest habitat produced abrupt cliffs along its Voronoi edge.
    for(const h of HABITATS){
      const influence=Math.exp(-((Math.hypot(dx-h.x,dz-h.z)/230)**2));
      if(h.id==='alpine')hill+=influence*(18+7*Math.sin(dx*.014)+6*Math.cos(dz*.012));
      if(h.id==='woodland')hill+=influence*4;
    }
    hill*=central*Math.min(1,path)*(.25+.75*smooth((Math.hypot(x-ENTRY.x,z-ENTRY.z)-120)/160));
    // Each pool has a shallow, graded bank and a submerged bowl.
    for(const p of pools){const d=Math.hypot(x-p.x,z-p.z),t=d/p.r;if(t<1)return S.y-3*Math.min(1,(1-t)*4);if(d<p.r+16)hill*=smooth((d-p.r)/16);}
    // Leave a broad, open meadow in front of the entrance. A perimeter ridge
    // here would turn the first view into a steep bowl and hide the bison.
    const edge=smooth((Math.max(Math.abs(dx),Math.abs(dz))-570)/150)*(dx>0?smooth((Math.abs(dz)-160)/160):1);
    return S.y+hill+edge*central*(25+16*Math.sin(dx*.017)*Math.sin(dz*.019));
  }
  function vertex(ix,iz){const key=ix+','+iz;if(!cache.has(key))cache.set(key,raw(S.x+ix*step,S.z+iz*step));return cache.get(key);}
  function heightAt(x,z){
    const gx=(x-S.x)/step,gz=(z-S.z)/step,ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz;
    const a=vertex(ix,iz),c=vertex(ix+1,iz+1);
    return v>=u?a*(1-v)+vertex(ix,iz+1)*(v-u)+c*u:a*(1-u)+c*v+vertex(ix+1,iz)*(u-v);
  }
  function supportAt(x,z){const dx=(heightAt(x+.1,z)-heightAt(x-.1,z))/.2,dz=(heightAt(x,z+.1)-heightAt(x,z-.1))/.2;return {id:'guild-sanctuary',height:heightAt(x,z),slope:Math.hypot(dx,dz),gradient:{x:dx,z:dz}};}
  function* buildSteps(finish){
    const colors=HABITATS.map(h=>new THREE.Color(h.color));
    for(let cx=-3;cx<3;cx++)for(let cz=-3;cz<3;cz++){
      const b=createSceneryBuilder('Folded landscape / terrain sector');
      for(let x=cx*240;x<(cx+1)*240;x+=step)for(let z=cz*240;z<(cz+1)*240;z+=step){
        const tint=new THREE.Color(0,0,0);let total=0;
        for(let i=0;i<HABITATS.length;i++){const h=HABITATS[i],w=1/(1+(Math.hypot(x-h.x,z-h.z)/180)**6);tint.r+=colors[i].r*w;tint.g+=colors[i].g*w;tint.b+=colors[i].b*w;total+=w;}
        tint.multiplyScalar((.96+.035*Math.sin(x*.022+z*.013)+.015*Math.sin(x*.037-z*.019))/total);
        tint.lerp(new THREE.Color('#baae83'),.7*(1-smooth((sanctuaryPathDistance(S.x+x+4,S.z+z+4)-2)/7)));
        const pt=(a,c)=>[S.x+x+a,heightAt(S.x+x+a,S.z+z+c),S.z+z+c];b.quad(tint,pt(0,0),pt(0,step),pt(step,step),pt(step,0));
      }finish(b);yield;
    }
  }
  return {heightAt,supportAt,poolAt,buildSteps,build(finish){for(const step of buildSteps(finish))void step;}};
}

export function sanctuaryHabitatScenery({parent,h,records,ground,finish,colliders,library}){
  const trees=[],height=ground.heightAt,b=createSceneryBuilder(h.name+' / trees, rocks and ground cover');
  const homeRanges=records.filter(r=>r.habitat===h.id);
  const clear=(x,z)=>sanctuaryPathDistance(x,z)<9||Math.hypot(x-ENTRY.x,z-ENTRY.z)<32;
  const rock=(tone,x,y,z,sx,sy,sz,yaw)=>{
    b.rock(tone,x,y,z,sx,sy,sz,yaw);
    colliders.push({x,z,r:Math.min(sx,sz)*.72,minY:y-sy,maxY:y+sy,kind:'sanctuary-rock'});
  };
  const tree=(x,z,n,scale=1)=>{
    if(ground.poolAt(x,z)||clear(x,z))return;
    const y=height(x,z),tall=(6+random(n+4)*6)*scale,r=.23*scale;
    const species=(h.id==='wetland'?['black-willow','bald-cypress','sycamore']:['white-oak','red-maple','beech'])[n%3];
    trees.push({id:`sanctuary-${h.id}-${n}`,species,x,z,y,height:tall+3*scale,trunkRadius:r,crownRadius:4.2*scale,
      region:'The Folded Sanctuary',harvestable:false,protectedReason:'A living specimen in Bolbur?s sanctuary.',colliderKind:'sanctuary-tree'});
  };
  const count=h.id==='woodland'?270:h.id==='wetland'?110:80;
  for(let i=0;i<count;i++){
    const a=i*2.399,r=30+Math.sqrt(random(i+11))*205,x=S.x+h.x+Math.sin(a)*r,z=S.z+h.z+Math.cos(a)*r,y=height(x,z);
    if(clear(x,z)||ground.poolAt(x,z))continue;
    const safe=!homeRanges.some(rec=>Math.hypot(x-rec.x,z-rec.z)<rec.r+5);
    if((h.id==='woodland'||h.id==='wetland')&&safe)tree(x,z,i,h.id==='wetland'?.8:1);
    else if(h.id==='alpine'&&safe){
      if(i%3)trees.push({id:`sanctuary-${h.id}-${i}`,species:'silver-fir',x,z,y,height:10+random(i)*8,trunkRadius:.22,crownRadius:3.1,
        region:'The Folded Sanctuary',harvestable:false,protectedReason:'A living specimen in Bolbur?s sanctuary.',colliderKind:'sanctuary-tree'});
      else{const size=2+random(i)*5;rock('#8b9696',x,y+size*.3,z,size,size*.65,size*.8,a);}
    }
    else if(h.id==='desert'&&safe)rock(i%3?'#b39973':'#d5bd8d',x,y+.5,z,1+random(i)*3,1+random(i+1)*2,1.6,a);
    else if(h.id==='coast'&&safe)rock('#8c9d9c',x,y+.7,z,1.5+random(i)*3,1.3,2.3,a);
    // Tufts and low shrubs make the observation clearings part of each habitat.
    if(i%2===0){const green=h.id==='desert'?'#93915e':h.id==='alpine'?'#7f927d':'#839759';b.rock(green,x+.6,y+.24,z,.7,.4,.8,a);}
    for(let k=0;k<3;k++){const tx=x+k*.5,tz=z+Math.sin(i+k);b.beam(h.id==='desert'?'#b49b60':'#9baa6a',[tx,height(tx,tz),tz],[tx+.16,height(tx,tz)+.45,tz+.1],.045);}
  }
  // Low, merged ground-cover patches add detail without obstructing the animals.
  for(let i=0;i<320;i++){
    const x=S.x+h.x+(random(i+712)-.5)*340,z=S.z+h.z+(random(i+3317)-.5)*340,y=height(x,z);
    if(ground.poolAt(x,z)||clear(x,z))continue;
    const dry=h.id==='desert',cold=h.id==='alpine',tone=dry?'#b4a071':cold?'#8f9d88':'#80945a';
    for(let k=0;k<3;k++){const xx=x+k*.16,zz=z+k*.13;b.beam(tone,[xx,y,zz],[xx+.14,y+.28+random(i+k)*.25,zz],.045);}
    if(i%9===0&&!dry&&!cold)for(let k=0;k<4;k++)b.rock(i%2?'#d3c28d':'#b0a2bd',x+Math.sin(k*2.4)*.18,y+.38,z+Math.cos(k*2.4)*.18,.12,.035,.12);
  }
  if(h.id==='woodland')for(let i=0;i<8;i++){
    const x=S.x+h.x-110+i*30,z=S.z+h.z-115,y=height(x,z);b.beam('#6d5b43',[x,y+.35,z],[x+7,y+.45,z+2],.7);b.rock('#8b9d63',x+3,y+.7,z+1,2,.3,.6);
  }
  finish(b);
  return createSpeciesTrees({parent,colliders,trees,heightAt:height,library,name:`Sanctuary ${h.id} tree species`});
}
