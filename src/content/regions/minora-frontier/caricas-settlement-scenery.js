import {finishBuild} from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {CARICAS_TOWN,CARICAS_BUILDINGS,CARICAS_ROADS} from './caricas-settlement.js';
/** Local sandstone and limewash, worked timber and red occupation standards. */
export function createCaricasSettlement(...args){return finishBuild(createCaricasSettlementSteps(...args));}

export function* createCaricasSettlementSteps({parent,heightAt,colliders}){
  const root=new THREE.Group();root.name='Caricas occupied market town';parent.add(root);
  const kit=createSceneryBuilder('Caricas buildings and grain court'),earth=createSceneryBuilder('Caricas lanes');
  const C={stone:'#aba88d',wall:'#d8d0ac',timber:'#62523c',roof:'#727359',dark:'#343b30',red:'#9a3937',gold:'#d2b25b'};
  const clothRanges=[];
  for(const [i,b] of CARICAS_BUILDINGS.entries()){
    yield;
    const y=heightAt(b.x,b.z);kit.block(C.stone,b.x,y-.4,b.z,b.w+.5,.65,b.d+.5);
    kit.block(i%3===1?'#c0b994':C.wall,b.x,y,b.z,b.w,b.h,b.d);
    kit.roof(i%2?'#685b49':C.roof,b.x,y+b.h,b.z,b.w+1,b.d+1,2.1,0,C.wall);
    for(const sx of [-1,1])kit.block(C.timber,b.x+sx*(b.w/2-.12),y,b.z,.2,b.h,b.d+.06);
    kit.block(C.timber,b.x,y+b.h*.48,b.z,b.w+.08,.2,b.d+.08);
    for(const side of [-1,1])for(const u of [-.28,.28]){
      const z=b.z+side*(b.d/2+.025),x=b.x+b.w*u;
      for(const v of [.35,.76]){kit.block(C.timber,x,y+b.h*v-.07,z,1.45,1.7,.14);kit.block('#aebcc0',x,y+b.h*v,z+side*.09,1.12,1.42,.045);
        kit.block(C.wall,x,y+b.h*v,z+side*.12,.09,1.42,.07);kit.block(C.wall,x,y+b.h*v+.68,z+side*.12,1.12,.09,.07);}}
    const toward=b.x<CARICAS_TOWN.x?1:-1,dx=b.x+toward*(b.w/2+.03);
    kit.block(C.timber,dx,y,b.z,.16,2.7,1.9);kit.block(C.dark,dx+toward*.1,y+.1,b.z,.04,2.5,1.58);
    yield* kit.patchSteps('#bbae89',heightAt,b.x+toward*(b.w/2+3),b.z,6,2.2,0,.045,5);
    colliders.push({x:b.x,z:b.z,hx:b.w/2,hz:b.d/2,minY:y-.5,maxY:y+b.h+2.2,kind:'building',id:b.id});
  }
  for(const road of CARICAS_ROADS)for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1],b=road.points[i],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(len/5);
    for(let j=0;j<n;j++){yield;const t=(j+.5)/n;yield* earth.patchSteps('#b4a681',heightAt,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,road.width,len/n+.18,Math.atan2(b.x-a.x,b.z-a.z),.05,4);}}
  yield;
  yield* earth.patchSteps('#b6ad8b',heightAt,-2092,265,23,21,0,.055,12);
  for(const [x,z] of [[-2100,271],[-2084,271]]){yield;const y=heightAt(x,z);for(const side of [-1,1])kit.block(C.timber,x+side*2,y,z,.15,2.8,.15);
    kit.roof('#c6ab75',x,y+2.8,z,5.4,3.2,.55);kit.block(C.timber,x,y+.75,z,4.4,.18,1.4);
    for(let n=0;n<5;n++)kit.rock('#c5ac75',x-1.6+n*.8,y+1.2,z,.35,.48,.45);}
  for(const [x,z] of [[-2099,230],[-2080,242],[-2104,250]]){yield;const y=heightAt(x,z);kit.block(C.timber,x,y,z,.13,5,.13);
    const first=kit.vertexCount;kit.sheet(C.red,[x,y+4.8,z],[x+1.7,y+4.8,z],[x+1.7,y+2.6,z],[x,y+2.7,z]);clothRanges.push([first,kit.vertexCount]);kit.block(C.gold,x+.8,y+3.3,z+.02,.15,.85,.06);}
  // Unnamed civic noticeboard records the deferred civil-war thread without starting a quest.
  {const x=-2080,z=258,y=heightAt(x,z);for(const s of [-1,1])kit.block(C.timber,x+s*.75,y,z,.16,2.2,.16);
    kit.block(C.timber,x,y+.85,z,1.85,1.2,.14);for(let n=0;n<3;n++)kit.block('#d6cb9e',x-.56+n*.54,y+1.02,z+.085,.43,.65,.025);}
  for(let i=0;i<9;i++){const x=-2108+(i%3)*1.6,z=242+Math.floor(i/3)*1.6,y=heightAt(x,z);kit.cylinder('#99856a',x,y,z,.57,1.15);}
  const mesh=yield* kit.finishSteps(root);yield* earth.finishSteps(root,{castShadow:false});
  // Cloth vertices alone are mutable; geometry, gold devices and shared material
  // remain unchanged. Ordinary adventure/exploration retain the authored red.
  const standards={setColor(value=null){const color=new THREE.Color(value??C.red),attribute=mesh.geometry.attributes.color;
    for(const [first,end] of clothRanges)for(let i=first;i<end;i++)attribute.setXYZ(i,color.r,color.g,color.b);attribute.needsUpdate=true;
  },state(){const a=mesh.geometry.attributes.color,i=clothRanges[0][0];return {count:clothRanges.length,color:'#'+new THREE.Color().setRGB(a.getX(i),a.getY(i),a.getZ(i)).getHexString()};}};
  return {root,standards,metrics:{buildings:CARICAS_BUILDINGS.length,roads:CARICAS_ROADS.length,marketStalls:2,standards:3},
    mapFeatures:CARICAS_BUILDINGS.map(b=>({...b,kind:'building'}))};
}
