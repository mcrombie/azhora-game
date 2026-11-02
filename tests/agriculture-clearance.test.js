import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {MENORA_BRIDGES} from '../src/content/regions/minora-frontier/menora-city.js';
import {LIZEEM_BRIDGES,LIZEEM_CROSSING_PATHS} from '../src/content/regions/minora-frontier/lizeem-crossings.js';
import {NETHEREUM_BRIDGES} from '../src/content/regions/nethereum/nethereum-agriculture.js';

// Independent triangle/rectangle intersection, including triangles whose
// vertices sit either side of a bridge. Do not merely retest the spawn centres.
function intersects(points,b){
  const c=Math.cos(b.yaw),s=Math.sin(b.yaw),w=b.width/2-.001,d=b.length/2-.001;
  const p=points.map(([x,z])=>[(x-b.x)*c-(z-b.z)*s,(x-b.x)*s+(z-b.z)*c]);
  const axes=[[1,0],[0,1],...p.map((a,i)=>{const q=p[(i+1)%3];return [q[1]-a[1],a[0]-q[0]];})];
  return axes.every(([x,z])=>{
    const projected=p.map(a=>a[0]*x+a[1]*z),r=w*Math.abs(x)+d*Math.abs(z);
    return Math.min(...projected)<=r&&Math.max(...projected)>=-r;
  });
}
const segment=(a,b,width)=>({x:(a.x+b.x)/2,z:(a.z+b.z)/2,length:Math.hypot(b.x-a.x,b.z-a.z),width,yaw:Math.atan2(b.x-a.x,b.z-a.z)});
const bridges=[...MENORA_BRIDGES.map(b=>({...b,length:b.end-b.start,yaw:b.axis==='x'?Math.PI/2:0})),
  ...LIZEEM_BRIDGES.map(b=>({...b,yaw:Math.PI/2})),...NETHEREUM_BRIDGES];
const approaches=LIZEEM_CROSSING_PATHS.flatMap(p=>p.slice(1).map((b,i)=>segment(p[i],b,p.width)));
function assertClear(mesh,obstacles){
  if(!mesh)return;
  const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i+=3){
    const triangle=[0,1,2].map(n=>[p.getX(i+n),p.getZ(i+n)]);
    const minX=Math.min(...triangle.map(p=>p[0])),maxX=Math.max(...triangle.map(p=>p[0]));
    const minZ=Math.min(...triangle.map(p=>p[1])),maxZ=Math.max(...triangle.map(p=>p[1]));
    for(const b of obstacles){
      const r=(b.length+b.width)/2;
      if(maxX<b.x-r||minX>b.x+r||maxZ<b.z-r||minZ>b.z+r)continue;
      assert(!intersects(triangle,b),`${mesh.name} overlaps ${b.id??'road'} at ${JSON.stringify(triangle)}`);
    }
  }
}

test('all five reviewed farm layouts keep real crop and soil geometry off existing and new bridges',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {FARMLAND_REGIONS}=await sourceModule('../src/app/farmland-review/regions.js');
  for(const layout of Object.values(FARMLAND_REGIONS)){
    const root=new THREE.Group(),parts=[],capacity=layout.capacity();
    // Deliberately omit a host-level reservation: reviews and rebuilds must
    // retain their own protection for neighbouring regions' infrastructure.
    for(const _ of layout.createScenery({parent:root,heightAt:()=>21,colliders:[],onFarmBuilt:p=>parts.push(p)})){}
    const lanes=layout.lanes.flatMap(p=>p.slice(1).map((b,i)=>segment({x:p[i][0],z:p[i][1]},{x:b[0],z:b[1]},4.4)));
    for(const {plants,fields} of parts){assertClear(plants,[...bridges,...approaches,...lanes]);assertClear(fields,[...bridges,...approaches,...lanes]);}
    assert(parts.every(p=>p.plants?.geometry.attributes.position.count>0),'Healthy fields remain planted');
    assert.equal(layout.capacity(),capacity,'Clearance is presentation, not an economic capacity change');
    root.traverse(o=>o.geometry?.dispose());
  }
});

test('field edges and wide crop cards respect added reservations on flat and draped terrain',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createAgricultureSteps}=await sourceModule('../src/world/scenery/agriculture-scenery.js');
  const heightAt=(x,z)=>2+x*.03+z*.05;
  const xs=[-20,0,20],zs=[-20,0,20],surface={xs,zs,positions:zs.flatMap(z=>xs.flatMap(x=>[x,heightAt(x,z),z]))};
  const bridge={x:0,z:0,width:5,length:60,yaw:Math.PI/4},extra={x:10,z:0,width:3,length:60,yaw:0};
  const inside=(b,x,z,r)=>Math.abs((x-b.x)*Math.cos(b.yaw)-(z-b.z)*Math.sin(b.yaw))<=b.width/2+r;
  const layout={farms:[{id:'test',name:'Test field',home:[70,70],fields:[{x:0,z:0,width:32,depth:32,crop:'grain'}]}],buildings:[],lanes:[],reserved:(x,z,r)=>inside(bridge,x,z,r)};
  for(const ground of [null,surface]){
    const root=new THREE.Group();let parts;
    for(const _ of createAgricultureSteps({parent:root,heightAt,surface:ground,layout,reserved:(x,z,r)=>inside(extra,x,z,r),onFarmBuilt:p=>parts=p})){}
    assertClear(parts.plants,[bridge,extra]);assertClear(parts.fields,[bridge,extra]);
    const p=parts.plants.geometry.attributes.position,g=parts.plants.geometry.attributes.cropGround;
    assert(p.count>500,'A road does not erase the surrounding field');
    for(let i=0;i<p.count;i++)assert(Math.abs(g.getX(i)-heightAt(p.getX(i),p.getZ(i))-.065)<.0001,'Crops still follow terrain');
    root.traverse(o=>o.geometry?.dispose());
  }
});

test('planting cannot overrun houses, entrance aprons, farmyards or a market square',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createAgricultureSteps}=await sourceModule('../src/world/scenery/agriculture-scenery.js');
  const root=new THREE.Group();let parts;
  const layout={farms:[{id:'test',name:'Overlapping land use',home:[20,20],fields:[{x:0,z:0,width:100,depth:100,crop:'grain'}]}],
    buildings:[{id:'house',x:-22,z:0,w:10,d:12,h:5,kind:'house'}],lanes:[],town:{market:[0,-25,18,12],stalls:[],carts:[]}};
  for(const _ of createAgricultureSteps({parent:root,heightAt:()=>2,layout,onFarmBuilt:p=>parts=p})){}
  const obstacles=[{x:-22,z:0,width:14,length:16,yaw:0},{x:-22,z:0,width:5,length:24,yaw:0},
    {x:20,z:20,width:24,length:24,yaw:0},{x:0,z:-25,width:22,length:16,yaw:0}];
  assertClear(parts.fields,obstacles);assertClear(parts.plants,obstacles);
  assert(parts.plants.geometry.attributes.position.count>1000,'Remaining cultivated ground stays planted');
  root.traverse(o=>o.geometry?.dispose());
});
