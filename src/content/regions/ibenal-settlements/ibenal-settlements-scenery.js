import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createSpeciesTreesSteps} from '../../../world/scenery/species-trees.js';
import {worldTreeId} from '../../../world/scenery/tree-registry.js';
import {createSelamusShip} from '../selamus/selamus-ships.js';
import {ibenalWaterRibbons} from '../south-ibenal/south-ibenal-world.js';
import {SEA_LEVEL,hexOwnerAt} from '../../../world/terrain/region-world.js';
import {IBEN_TOWN,IBENAL_TURN,ibenPoint,ibenBuildings,ibenFields,ibenLanes,ibenDecks,ibenBoats} from './ibenal-settlements-layout.js';
import {IBEN_PALETTE as C,ibenBuilding,pointedArch} from './ibenal-architecture.js';

export function* createIbenalSettlementSteps({parent,heightAt,renderedGroundHeight=heightAt,colliders,site=IBEN_TOWN}){
  const root=new THREE.Group();root.name=site.name;parent.add(root);
  const town=site===IBEN_TOWN,buildings=ibenBuildings(site),fields=ibenFields(site),decks=ibenDecks(site),walkSurfaces=[...decks];
  const metrics={buildings:buildings.length,fields:fields.length,boats:0,batches:0,vertices:0};
  const finish=function*(b){const m=yield* b.finishSteps(root);if(m){metrics.batches++;metrics.vertices+=m.geometry.attributes.position.count;}};
  const ground=renderedGroundHeight;
  const paving=createSceneryBuilder(site.name+' / paths and green');
  for(const lane of ibenLanes(site))for(let i=1;i<lane.length;i++){
    const a=lane[i-1],b=lane[i],len=Math.hypot(b.x-a.x,b.z-a.z),count=Math.ceil(len/3),yaw=Math.atan2(b.x-a.x,b.z-a.z);
    for(let j=0;j<count;j++){
      const x=a.x+(b.x-a.x)*(j+.5)/count,z=a.z+(b.z-a.z)*(j+.5)/count;
      yield* paving.patchSteps(town?'#b8bda5':'#b4aa88',ground,x,z,town?3.6:2.6,len/count+.12,yaw,.12,2);
    }
  }
  const green=ibenPoint(site,town?-9:0,town?12:4);
  yield* paving.patchSteps('#93a985',ground,green.x,green.z,town?17:11,town?9:8,IBENAL_TURN,.14,6);
  yield* finish(paving);

  const blocks=new Map();
  for(const h of buildings){
    const key=town?Math.floor(h.u/25)+','+Math.floor(h.v/25):'cottages';
    if(!blocks.has(key))blocks.set(key,createSceneryBuilder(site.name+' / '+key));
    ibenBuilding(blocks.get(key),h,heightAt,colliders);yield;
  }
  for(const b of blocks.values())yield* finish(b);

  const detail=createSceneryBuilder(site.name+' / gardens and shore craft');
  const local=(u,v,fn)=>{const p=ibenPoint(site,u,v);detail.frame(p.x,heightAt(p.x,p.z),p.z,IBENAL_TURN,fn);};
  // Clipped trees in stone seats soften the open square without hiding streets.
  const trees=[];
  for(const [u,v]of town?[[-23,10],[4,17],[-34,34],[-10,49]]:[[-8,8],[21,6]]){
    local(u,v,()=>{
      detail.cylinder(C.shade,0,0,0,1.5,.38);
    });
    const p=ibenPoint(site,u,v),y=heightAt(p.x,p.z);trees.push({id:worldTreeId(site.id+'-alder',p.x,p.z),species:'black-alder',...p,y:y+.3,height:6.7,crownRadius:1.8,trunkRadius:.16,collisionRadius:.25,collisionMinY:y,collisionMaxY:y+4,rotation:IBENAL_TURN,
      region:hexOwnerAt(p.x,p.z),habitat:'garden',locationName:site.name+' gardens',harvestable:false});
  }
  if(town){
    local(-8,13,()=>{
      detail.cylinder(C.light,0,0,0,1.7,.4);detail.cylinder(C.shade,0,.4,0,1.5,.32);
      detail.cylinder('#79a5a0',0,.73,0,1.3,.03);detail.cylinder(C.light,0,.7,0,.16,1.4);
      for(const side of [-1,1])detail.beam(C.trim,[0,2,0],[side*.45,2.45,0],.1);
    });
    const p=ibenPoint(site,-8,13);colliders.push({kind:'building',...p,r:1.8,minY:heightAt(p.x,p.z),maxY:heightAt(p.x,p.z)+3});
    // A small market, kept beside rather than across the through road.
    for(const [i,[u,v]]of [[-18,13],[-28,10],[5,24]].entries()){
      local(u,v,()=>{
      for(const side of [-1,1])detail.block(C.wood,side*1.5,0,0,.13,2.5,.13);
      detail.block(C.timber,0,.2,0,3,.8,1.4);
      detail.sheet(i%2?'#b5bda1':'#6b9687',[-1.9,2.6,-.8],[1.9,2.6,-.8],[1.9,2.15,1],[-1.9,2.15,1]);
      for(const u of [-1,0,1])detail.rock('#bdad69',u,1.1,0,.35,.23,.4);
      });
      const p=ibenPoint(site,u,v);colliders.push({kind:'building',...p,r:1.7,minY:heightAt(p.x,p.z),maxY:heightAt(p.x,p.z)+2.5});
    }
    // A modest welcome arch on the harbor path, made of curved stone ribs.
    local(20,-14,()=>{pointedArch(detail,0,0,0,4.5,5.4);});
  }else{
    local(5,6,()=>{detail.cylinder(C.shade,0,0,0,.9,.65);detail.cylinder('#597b78',0,.66,0,.65,.03);});
    const well=ibenPoint(site,5,6);colliders.push({kind:'building',...well,r:.95,minY:heightAt(well.x,well.z),maxY:heightAt(well.x,well.z)+.7});
    local(-16,24,()=>{
      detail.block('#ab9765',0,0,0,3,1.3,2.5);
      detail.beam(C.wood,[-1.7,1.35,0],[1.7,1.35,0],.1);
    });
  }
  // Boathouse surroundings: real nets, supported racks, stacked crates and a canoe.
  const shoreU=town?5:site.dockU>0?18:-22;
  local(shoreU,-19,()=>{
    for(const u of [-2,2])detail.block(C.wood,u,0,0,.14,2.2,.14);
    detail.beam(C.wood,[-2,2.2,0],[2,2.2,0],.14);
    for(let u=-1.9;u<2;u+=.32)detail.beam('#929779',[u,.5,0],[u,2.1,0],.023);
    for(let y=.5;y<2.2;y+=.3)detail.beam('#929779',[-1.9,y,0],[1.9,y,0],.023);
    for(const u of [-3.2,3.3])detail.block(C.timber,u,0,0,1,.9,1.1);
  });
  yield* finish(detail);

  // Small visible working plots, kept separate from the campaign food model.
  // Future Ibenal production targets can replace this authored field layout.
  const farm=createSceneryBuilder(site.name+' / smallholder fields');
  for(const f of fields){
    yield* farm.patchSteps(f.crop==='grain'?'#94895b':'#796e50',ground,f.x,f.z,f.w,f.d,f.yaw,.085,10);
    const c=Math.cos(f.yaw),s=Math.sin(f.yaw),p=(u,v)=>({x:f.x+c*u+s*v,z:f.z-s*u+c*v});
    for(let u=-f.w/2+1;u<f.w/2;u+=1.4)for(let v=-f.d/2+1;v<f.d/2;v+=1.25){
      const q=p(u,v),y=ground(q.x,q.z)+.11;
      if(f.crop==='grain'){
        farm.beam('#b5ad6b',[q.x,y,q.z],[q.x+.1,y+.66,q.z+.08],.045);
        farm.rock('#c9ba77',q.x+.1,y+.66,q.z+.08,.11,.23,.1);
      }else farm.rock('#6b925c',q.x,y+.19,q.z,.38,.25,.35);
    }
    for(const side of [-1,1])for(let u=-f.w/2;u<=f.w/2;u+=3){const q=p(u,side*f.d/2);farm.rock('#879b73',q.x,ground(q.x,q.z)+.32,q.z,1.2,.55,.5,f.yaw);}
    yield;
  }
  yield* finish(farm);

  const quay=createSceneryBuilder(site.name+' / timber landing');
  for(const d of decks){
    const dx=d.b.x-d.a.x,dz=d.b.z-d.a.z,len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),count=Math.ceil(len/.55);
    const p=(along,across)=>({x:d.a.x+dx*along/len+dz*across/len,z:d.a.z+dz*along/len-dx*across/len});
    for(let j=0;j<count;j++){
      const q=p((j+.5)*len/count,0);quay.block(j%4?'#9f987b':'#aaa68c',q.x,d.a.y-.16,q.z,d.width,.16,len/count-.025,yaw);
    }
    for(const side of [-1,1])for(let a=0;a<=len;a+=4.5){
      const q=p(a,side*(d.width/2-.15)),base=Math.min(-1,heightAt(q.x,q.z)-.2);
      quay.cylinder(C.wood,q.x,base,q.z,.15,d.a.y-base+.5);
    }
  }
  yield* finish(quay);
  for(const boat of ibenBoats(site)){
    const ship=createSelamusShip({kind:boat.kind==='merchant'?'merchant':'gondola',length:boat.length,accent:0x89a69a,name:site.name+' '+boat.kind});
    ship.position.set(boat.x,SEA_LEVEL,boat.z);ship.rotation.y=boat.yaw;root.add(ship);metrics.boats++;
    metrics.batches+=ship.userData.metrics.meshes;metrics.vertices+=ship.userData.metrics.triangles*3;
    for(const t of [-.25,0,.25])colliders.push({kind:'ship',x:boat.x+Math.sin(boat.yaw)*boat.length*t,z:boat.z+Math.cos(boat.yaw)*boat.length*t,r:boat.beam*.45,minY:-1,maxY:2});
    yield;
  }
  const treeView=yield* createSpeciesTreesSteps({parent:root,colliders,trees,heightAt:(x,z)=>heightAt(x,z)+.3,chunkSize:1e6,name:site.name+' / garden alders'});
  metrics.trees=trees.length;metrics.batches+=treeView.batches;metrics.vertices+=treeView.vertices;
  root.userData.ibenalSettlement=metrics;
  return {root,metrics,walkSurfaces};
}
export function* createIbenalSettlementReviewWaterSteps({parent,site=IBEN_TOWN}){
  for(const r of ibenalWaterRibbons()){
    if(!r.positions.some((v,i)=>i%3===0&&Math.abs(v-site.x)<150&&Math.abs(r.positions[i+2]-site.z)<150))continue;
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(r.positions,3));g.setIndex([...r.indices]);g.computeVertexNormals();
    parent.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#6b9ea4',roughness:.4,side:THREE.DoubleSide})));yield;
  }
}
