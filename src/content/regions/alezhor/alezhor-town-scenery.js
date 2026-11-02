import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import {createSpeciesTreesSteps} from '../../../world/scenery/species-trees.js';
import {worldTreeId} from '../../../world/scenery/tree-registry.js';
import { drawCircuit } from '../../../world/scenery/fortworks.js';
import { createSelamusShip } from '../selamus/selamus-ships.js';
import { SEA_LEVEL } from '../../../world/terrain/region-world.js';
import { alezhorWaterRibbons } from './alezhor-world.js';
import { ALEZHOR_TOWN_CIRCUIT as circuit, ALEZHOR_TOWN_BUILDINGS as houses,
  ALEZHOR_TOWN_HALL as hall, ALEZHOR_TOWN_LANES as lanes, ALEZHOR_TOWN_MARKET as market,
  ALEZHOR_TOWN_DECKS as decks, ALEZHOR_TOWN_BOATS as boats } from './alezhor-town-layout.js';
import { ALEZHOR_PALETTE as C, alezhorHouse, alezhorRoof, alezhorArch } from './alezhor-town-architecture.js';

export function* createAlezhorTownScenerySteps({ parent, heightAt, renderedGroundHeight=heightAt, colliders }) {
  const root=new THREE.Group(); root.name='Alezhor Town'; parent.add(root);
  const walkSurfaces=[];
  const metrics={buildings:houses.length,gates:circuit.gates.length,towers:circuit.towers.length,boats:0,batches:0,vertices:0};
  const finish=function*(b){const m=yield* b.finishSteps(root);if(m){metrics.batches++;metrics.vertices+=m.geometry.attributes.position.count;}return m;};
  const surface=renderedGroundHeight;
  const walls=drawCircuit(circuit,{parent:root,heightAt,colliders,style:'stone',name:'Alezhor curtain',palette:{
    wall:C.stone,wallDark:C.shade,cap:C.light,tower:C.stone,towerDark:C.shade,roof:C.roof,deck:C.wood,rail:C.wood,
  }});
  metrics.batches++;metrics.vertices+=walls.geometry.attributes.position.count;
  colliders.push(...circuit.colliders);
  yield;

  const paving=createSceneryBuilder('Alezhor / streets and courtyard paving');
  yield* paving.patchSteps('#b8b39a',surface,market.x,market.z,market.w,market.d,0,.15,12);
  for(const lane of lanes)for(let i=1;i<lane.length;i++){
    const a=lane[i-1],c=lane[i],len=Math.hypot(c.x-a.x,c.z-a.z),n=Math.ceil(len/3),yaw=Math.atan2(c.x-a.x,c.z-a.z);
    for(let j=0;j<n;j++){
      const t=(j+.5)/n,x=a.x+(c.x-a.x)*t,z=a.z+(c.z-a.z)*t;
      yield* paving.patchSteps('#b4a58a',surface,x,z,4.6,len/n+.12,yaw,.12,2);
    }
  }
  for(let x=-4057;x<-4027;x+=2.3)for(let z=889;z<903;z+=2.3)
    paving.block('#9b9c89',x,surface(x,z)+.17,z,1.8,.025,.04);
  yield* finish(paving);

  // Civic hall: an arched stone lower storey, timber galleries above, a broad
  // steep roof and a smaller raised lantern. These are roofs, not pagoda spires.
  const civic=createSceneryBuilder('Alezhor / estuary guildhall');
  const y=Math.max(...[[-hall.w/2,-hall.d/2],[hall.w/2,-hall.d/2],[-hall.w/2,hall.d/2],[hall.w/2,hall.d/2]].map(([x,z])=>heightAt(hall.x+x,hall.z+z)))+.15;
  const foot=Math.min(...[[-12,-8],[12,-8],[-12,8],[12,8]].map(([x,z])=>heightAt(hall.x+x,hall.z+z)))-.3;
  civic.frame(hall.x,y,hall.z,0,()=>{
    civic.block(C.shade,0,foot-y,0,24,y+.3-foot,16);
    civic.block(C.plaster,0,0,-2,23,8.2,11);
    civic.block(C.stone,0,0,-2,23,3.6,11);
    for(const x of [-7.5,-2.5,2.5,7.5]){
      civic.block(C.wood,x,.3,3.58,1.8,2.55,.15);
      alezhorArch(civic,x,.3,3.72,1.8,2.6,.16,C.tile);
      civic.block(C.trim,x+.57,1.4,3.81,.12,.12,.08);
    }
    civic.block(C.wood,0,3.65,4.8,24,.28,6);
    for(const x of [-10,-5,0,5,10]){
      civic.block(C.shade,x,0,7,.66,.35,.8);
      civic.block(C.light,x,.3,7,.4,3.4,.55);
      civic.block(C.trim,x,3.1,7,.78,.4,.85);
      civic.block(C.wood,x,3.8,7,.24,3.2,.24);
    }
    for(const x of [-7.5,-2.5,2.5,7.5]){
      alezhorArch(civic,x,.3,7.1,4.4,3.2,.22);
      civic.block(C.dark,x,4.45,3.56,2.3,2.1,.12);
      alezhorArch(civic,x,4.4,3.7,2.3,2.1,.14,C.tile);
    }
    for(let x=-11;x<=11;x+=.6){
      civic.block(C.tile,x,3.12,7.14,.37,.24,.07);
      civic.block(C.wood,x,3.88,7.15,.09,.85,.12);
    }
    civic.beam(C.trim,[-11.6,4.72,7.15],[11.6,4.72,7.15],.14);
    alezhorRoof(civic,0,7.15,0,26,19,6.1,{ceremonial:true});
    civic.block(C.timber,0,11.8,-1,8,3.4,6);
    for(const x of [-2.6,0,2.6])civic.block(C.dark,x,12.7,2.06,1.3,1.7,.1);
    alezhorRoof(civic,0,15.2,-1,9.6,8,3.5,{ceremonial:true,tint:'#2e686a'});
    // Worked-metal estuary emblem, backed by stone, above the entrance.
    civic.cylinder(C.trim,0,5.2,3.8,.35,.28);
    for(const side of [-1,1])civic.beam(C.trim,[0,5.45,3.9],[side*.85,6,3.9],.13);
  });
  colliders.push({id:hall.id,kind:'building',x:hall.x,z:hall.z-2,hx:11.6,hz:5.6,minY:foot,maxY:y+20});
  // Porch columns are real obstacles; the space between them stays accessible.
  for(const x of [-10,-5,0,5,10])colliders.push({kind:'building',x:hall.x+x,z:hall.z+7,r:.45,minY:y,maxY:y+8});
  const stairX=hall.x-2.5,stairEnd=hall.z+8,stairStart=hall.z+14.5;
  const stairLow=heightAt(stairX,stairStart)+.08,stairHigh=y+.3;
  for(let i=0;i<20;i++){
    const top=stairLow+(stairHigh-stairLow)*(i+1)/20;
    civic.block(C.light,stairX,stairLow-.12,stairStart-(i+.5)*(stairStart-stairEnd)/20,4.3,top-stairLow+.12,(stairStart-stairEnd)/20+.02);
  }
  walkSurfaces.push({id:'alezhor-hall-stairs',kind:'ramp',a:{x:stairX,y:stairLow,z:stairStart},b:{x:stairX,y:stairHigh,z:stairEnd},width:4.3},
    {id:'alezhor-hall-porch',kind:'deck',a:{x:hall.x-11.5,y:stairHigh,z:hall.z+5.9},b:{x:hall.x+11.5,y:stairHigh,z:hall.z+5.9},width:4.2});
  yield* finish(civic);

  const byBlock=new Map();
  for(const h of houses){
    if(h===hall)continue;
    const key=Math.floor(h.x/45)+','+Math.floor(h.z/40);
    if(!byBlock.has(key))byBlock.set(key,createSceneryBuilder('Alezhor / houses '+key));
    alezhorHouse(byBlock.get(key),h,heightAt,colliders);yield;
  }
  for(const b of byBlock.values())yield* finish(b);

  const details=createSceneryBuilder('Alezhor / gates, market and gardens');
  for(const gate of circuit.gates){
    const p=gate.centre,edge=circuit.edges[gate.edge],turn=Math.atan2(edge.dir.x,edge.dir.z),g=heightAt(p.x,p.z);
    // The frieze has a carved channel/fish motif, rather than a floating label.
    details.frame(p.x,g,p.z,turn,()=>{
      for(const side of [-1,1]){
        details.block(C.stone,side*1.3,5.3,0,.26,1.2,6.7);
        for(let k=-2.8;k<3;k+=.6)details.block(C.tile,side*1.45,5.62,k,.06,.32,.4);
      }
      alezhorRoof(details,0,7.3,0,4.7,8.8,2.9,{ceremonial:true});
    });
  }
  for(const [i,p] of [[-4056,888],[-4049,888],[-4028,890],[-4056,902],[-4028,902]].entries()){
    const [x,z]=p,g=surface(x,z)+.16,cloth=i%2?'#ad7650':'#547f7a';
    for(const side of [-1,1])details.block(C.wood,x+side*1.7,g,z,.12,2.6,.12);
    details.block(C.timber,x,g+.15,z,3.4,.85,1.5);
    details.sheet(cloth,[x-2,g+2.6,z-.9],[x+2,g+2.6,z-.9],[x+2,g+2.15,z+1.1],[x-2,g+2.15,z+1.1]);
    for(let j=0;j<4;j++){details.block('#a88958',x-1.2+j*.8,g+1.02,z,.56,.23,.65);details.rock(i%2?'#9daa6d':'#ac7943',x-1.2+j*.8,g+1.3,z,.21,.18,.22);}
    colliders.push({id:'alezhor-market-'+i,kind:'building',x,z,hx:1.75,hz:.8,minY:g,maxY:g+2.7});
  }
  const well={x:-4049,z:901},wy=surface(well.x,well.z)+.15;
  details.cylinder(C.shade,well.x,wy,well.z,1.3,.35,0,12);
  details.cylinder(C.tile,well.x,wy+.35,well.z,1.05,.48,0,12);
  details.cylinder('#63999a',well.x,wy+.79,well.z,.88,.035,0,12);
  details.cylinder(C.light,well.x,wy+.4,well.z,.18,1.1);
  colliders.push({kind:'building',id:'alezhor-market-well',...well,r:1.35,minY:wy,maxY:wy+1.5});
  // A small reflecting pool between the bathhouse's wings, fed by carried water.
  const pool={x:-3995,z:882},py=heightAt(pool.x,pool.z)+.16;
  details.block(C.light,pool.x,py,pool.z,6,.28,2.7);
  details.block('#558f92',pool.x,py+.29,pool.z,5.3,.025,2.0);
  colliders.push({kind:'building',id:'alezhor-court-pool',...pool,hx:3,hz:1.4,minY:py,maxY:py+.4});
  const gardenTrees=[];
  for(const [x,z] of [[-4091,868],[-3987,903],[-4064,899]]){
    const g=heightAt(x,z);details.cylinder(C.shade,x,g,z,1,.45,0,8);
    gardenTrees.push({id:worldTreeId('alezhor-town-olive',x,z),species:'olive',x,z,y:g+.3,height:5.7,crownRadius:1.4,trunkRadius:.14,collisionRadius:.22,collisionMinY:g,collisionMaxY:g+4,
      region:'Alezhor',habitat:'garden',locationName:'Alezhor Town gardens',harvestable:false});
  }
  yield* finish(details);
  const treeView=yield* createSpeciesTreesSteps({parent:root,colliders,trees:gardenTrees,heightAt:(x,z)=>heightAt(x,z)+.3,chunkSize:1e6,name:'Alezhor / olive gardens'});
  metrics.trees=gardenTrees.length;metrics.batches+=treeView.batches;metrics.vertices+=treeView.vertices;

  const wharf=createSceneryBuilder('Alezhor / timber quays and moorings');
  for(const d of decks){
    walkSurfaces.push({id:d.id,kind:d.y0===d.y1?'deck':'ramp',a:{x:d.x,y:d.y0,z:d.z-d.d/2},b:{x:d.x,y:d.y1,z:d.z+d.d/2},width:d.w});
    const count=Math.ceil(d.d/.6),level=z=>d.y0+(d.y1-d.y0)*(z-d.z+d.d/2)/d.d;
    for(let i=0;i<count;i++){
      const z0=d.z-d.d/2+d.d*i/count,z1=d.z-d.d/2+d.d*(i+1)/count;
      wharf.sheet(i%4?'#a38d67':'#b29a71',[d.x-d.w/2,level(z0),z0],[d.x-d.w/2,level(z1),z1],[d.x+d.w/2,level(z1),z1],[d.x+d.w/2,level(z0),z0]);
    }
    for(let x=d.x-d.w/2+.25;x<d.x+d.w/2;x+=Math.min(6,d.w-.5))for(let z=d.z-d.d/2+.2;z<d.z+d.d/2;z+=5.5){
      const low=Math.min(-1,heightAt(x,z)-.2),top=level(z);
      wharf.cylinder(C.wood,x,low,z,.18,top-low+.45);
    }
    for(const side of [-1,1])wharf.beam(C.wood,[d.x+side*(d.w/2-.25),d.y0-.2,d.z-d.d/2],[d.x+side*(d.w/2-.25),d.y1-.2,d.z+d.d/2],.24);
  }
  for(const x of [-4077,-4060,-4020,-4003]){
    wharf.cylinder(C.wood,x,3.2,937,.24,.75);wharf.cylinder(C.trim,x,3.8,937,.33,.14);
    wharf.block(C.timber,x+1.2,3.2,936,1.1,.8,1.1);
    colliders.push({kind:'building',x:x+1.2,z:936,hx:.6,hz:.6,minY:3.1,maxY:4.1});
  }
  // Net-drying frames and barrels distinguish the fish landing from cargo berths.
  for(const x of [-4072,-4068]){wharf.block(C.wood,x,3.2,939.1,.15,2.4,.15);}
  wharf.beam(C.wood,[-4072,5.6,939.1],[-4068,5.6,939.1],.16);
  for(let x=-4071.8;x<-4068;x+=.4)wharf.beam('#716d50',[x,5.4,939.1],[x,3.7,939.1],.022);
  for(let y=3.75;y<5.4;y+=.3)wharf.beam('#716d50',[-4071.8,y,939.1],[-4068.1,y,939.1],.022);
  yield* finish(wharf);
  for(const boat of boats){
    const ship=createSelamusShip({kind:boat.kind==='fishing'?'gondola':'merchant',length:boat.length,accent:0x367173,name:'Alezhor '+boat.kind});
    ship.position.set(boat.x,SEA_LEVEL,boat.z);ship.rotation.y=boat.yaw;root.add(ship);metrics.boats++;
    metrics.batches+=ship.userData.metrics.meshes;metrics.vertices+=ship.userData.metrics.triangles*3;
    for(const f of [-.25,0,.25])colliders.push({kind:'ship',x:boat.x+Math.sin(boat.yaw)*boat.length*f,z:boat.z+Math.cos(boat.yaw)*boat.length*f,r:boat.beam*.45,minY:-1.2,maxY:2});
    yield;
  }
  root.userData.alezhorTown=metrics;
  return {root,metrics,walkSurfaces};
}

/** Review uses the same river surface as the region, without building the forest. */
export function* createAlezhorTownReviewWaterSteps({parent}) {
  for(const r of alezhorWaterRibbons().filter(r=>r.id.includes('gold'))){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(r.positions,3));g.setIndex([...r.indices]);g.computeVertexNormals();
    const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#6b9ea4',roughness:.36,side:THREE.DoubleSide}));parent.add(m);yield;
  }
}
