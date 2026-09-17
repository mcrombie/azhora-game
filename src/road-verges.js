import * as THREE from 'three';
import { canStand } from './game-state.js';
import { WORLD_SCALE } from './world-scale.js';

const TAU=Math.PI*2;
const botanicalMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.98,side:THREE.DoubleSide,flatShading:true});

function distanceToSegment(x,z,a,b) {
  const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/length)):0;
  return {distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t),x:a.x+dx*t,z:a.z+dz*t};
}

function plantGeometry(kind) {
  const vertices=[],colors=[];
  function triangle(a,b,c,color) {
    vertices.push(...a,...b,...c);const tint=new THREE.Color(color);
    for(let i=0;i<3;i++)colors.push(tint.r,tint.g,tint.b);
  }
  function stem(x,z,height,color=0x657346) {
    const w=.008;
    triangle([x-w,0,z],[x+w,0,z],[x+w,height,z],color);triangle([x-w,0,z],[x+w,height,z],[x-w,height,z],color);
    triangle([x,0,z-w],[x,0,z+w],[x,height,z+w],color);triangle([x,0,z-w],[x,height,z+w],[x,height,z-w],color);
  }
  function leaf(origin,angle,length,width,lift,color) {
    const [x,y,z]=origin,dx=Math.sin(angle),dz=Math.cos(angle),sx=Math.cos(angle)*width,sz=-Math.sin(angle)*width;
    const points=[[x,y,z],[x+dx*length*.5+sx,y+lift*.65,z+dz*length*.5+sz],
      [x+dx*length,y+lift,z+dz*length],[x+dx*length*.5-sx,y+lift*.65,z+dz*length*.5-sz]];
    const center=[x+dx*length*.48,y+lift*.65+.027,z+dz*length*.48];
    for(let i=0;i<4;i++)triangle(center,points[i],points[(i+1)%4],color);
  }
  if(kind==='clover-flowers') {
    for(let i=0;i<3;i++)leaf([0,.035,0],i*TAU/3,.26,.115,.045,i%2?0x85935b:0x75884f);
    stem(.028,.015,.31,0x7d8b58);
    for(let i=0;i<5;i++)leaf([.028,.31,.015],i*TAU/5,.098,.027,.018,i%2?0xd8d1a5:0xe9dfb5);
    for(let i=0;i<5;i++)triangle([.028,.341,.015],[.028+Math.sin(i*TAU/5)*.032,.334,.015+Math.cos(i*TAU/5)*.032],
      [.028+Math.sin((i+1)*TAU/5)*.032,.334,.015+Math.cos((i+1)*TAU/5)*.032],0xb99e58);
  } else if(kind==='bank-leaves') {
    for(let i=0;i<7;i++)leaf([0,.015,0],i*2.399,.30+(i%3)*.045,.067+(i%2)*.018,.12+(i%3)*.075,i%2?0x597a5f:0x789367);
  } else {
    for(let i=0;i<3;i++) {
      const x=(i-1)*.08,z=Math.sin(i*2.1)*.055,height=.25+i*.06;stem(x,z,height,0x716f4e);
      for(let j=0;j<2;j++)leaf([x,.06+j*.085,z],i*2.3+j*Math.PI,.19,.036,.055,(i+j)%2?0x8b8d65:0x767e59);
      for(let j=0;j<3;j++) {
        const y=height-.09+j*.035,w=.025;
        triangle([x-w,y,z],[x+w,y,z],[x,y+.041,z+.018],j%2?0xa98b85:0xc0a79a);
      }
    }
  }
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));result.computeVertexNormals();result.computeBoundingSphere();return result;
}

/** Small static verge patches; no colliders, interaction targets, or world RNG changes. */
export function createRoadVerges(scene,world) {
  let seed=0x51a37b9d;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const road=world.routeJourney||[],segments=[];
  for(let i=1;i<road.length;i++)segments.push([road[i-1],road[i]]);
  // Verges follow the road itself, wherever it runs, so the same rule works for
  // the westbound road out of Drent and for a straight test route.
  const lengths=segments.map(([a,b])=>Math.hypot(b.x-a.x,b.z-a.z));
  const total=lengths.reduce((sum,value)=>sum+value,0)||1;
  function alongRoad(fraction) {
    let remaining=Math.max(0,Math.min(1,fraction))*total;
    for(const [index,[a,b]] of segments.entries()) {
      if(remaining>lengths[index]&&index<segments.length-1){remaining-=lengths[index];continue;}
      const t=lengths[index]?remaining/lengths[index]:0,dx=b.x-a.x,dz=b.z-a.z,length=lengths[index]||1;
      return {x:a.x+dx*t,z:a.z+dz*t,nx:-dz/length,nz:dx/length};
    }
    return {x:0,z:0,nx:1,nz:0};
  }
  const points=[...Object.values(world.journeySites||{}),...Object.values(world.npcPositions||{}),
    ...(world.repairBenches||[]),...(world.firePits||[]),...(world.fishingSpots||[]).map(s=>s.fishingSpot)]
    .filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)
      &&segments.some(([a,b])=>distanceToSegment(p.x,p.z,a,b).distance<60));
  // Keep the short walking approaches to NPCs and objective markers clear too.
  const approaches=points.map(point=>{
    let closest=null;
    for(const [a,b] of segments){const near=distanceToSegment(point.x,point.z,a,b);if(!closest||near.distance<closest.distance)closest=near;}
    return closest?[point,closest]:null;
  }).filter(Boolean);
  function allowed(x,z) {
    return canStand(x,z,world,.7)
      &&segments.every(([a,b])=>distanceToSegment(x,z,a,b).distance>=4.0)
      &&approaches.every(([a,b])=>distanceToSegment(x,z,a,b).distance>=2.4)
      &&points.every(p=>Math.hypot(x-p.x,z-p.z)>=4.8);
  }
  const batches=[],samples=[];
  // Counts follow the road's length, so a longer road is not a barer one.
  const along = count => Math.round(count * WORLD_SCALE);
  for(const config of [
    {kind:'clover-flowers',region:2,from:.04,to:.34,count:along(156)},
    {kind:'bank-leaves',region:3,from:.34,to:.66,count:along(144)},
    {kind:'heather-scrub',region:4,from:.66,to:.99,count:along(150)},
  ]) {
    const plants=[];
    for(let patch=0;plants.length<config.count&&patch<Math.round(1400*WORLD_SCALE);patch++) {
      const anchor=alongRoad(config.from+random()*(config.to-config.from));
      const side=(random()<.5?-1:1)*(6+random()*21);
      const x=anchor.x+anchor.nx*side,z=anchor.z+anchor.nz*side;
      for(let i=0;i<8&&plants.length<config.count;i++) {
        const angle=random()*TAU,radius=random()*2.9,px=x+Math.sin(angle)*radius,pz=z+Math.cos(angle)*radius;
        if(!allowed(px,pz)||plants.some(p=>Math.hypot(p.x-px,p.z-pz)<.38))continue;
        plants.push({x:px,y:world.heightAt(px,pz)+.015,z:pz,yaw:random()*TAU,scale:.82+random()*.56});
      }
    }
    const shape=plantGeometry(config.kind),mesh=new THREE.InstancedMesh(shape,botanicalMaterial,plants.length);
    mesh.name=`${config.kind} verges`;mesh.receiveShadow=true;mesh.castShadow=false;
    const transform=new THREE.Object3D();
    plants.forEach((plant,index)=>{
      transform.position.set(plant.x,plant.y,plant.z);transform.rotation.set(0,plant.yaw,0);transform.scale.setScalar(plant.scale);transform.updateMatrix();mesh.setMatrixAt(index,transform.matrix);
      samples.push({kind:config.kind,region:config.region,x:plant.x,y:plant.y,z:plant.z});
    });
    mesh.computeBoundingSphere();scene.add(mesh);
    batches.push({kind:config.kind,region:config.region,count:plants.length,triangles:plants.length*shape.attributes.position.count/3});
  }
  return {state:()=>({batches:batches.map(b=>({...b})),triangles:batches.reduce((sum,b)=>sum+b.triangles,0),
    plants:samples.map(p=>({...p}))})};
}
