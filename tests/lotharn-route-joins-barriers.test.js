import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { regionAt, WORLD_BOUNDS } from '../src/world/terrain/region-world.js';
import { RAMPS, pointOn, lotharnRouteJoinDelta as delta, nearLotharnRouteJoin } from '../src/content/regions/east-lotharn/east-lotharn-world.js';
import { LOTHARN_FORTS } from '../src/content/regions/west-lotharn/lotharn-forts.js';
import { PASS_CASTLES } from '../src/content/regions/feradom/feradom-forts.js';
import { createClimbing, canWalkSlope } from '../src/gameplay/movement/climbing.js';
import { moveCharacter, canStand } from '../src/gameplay/movement/game-state.js';
import { closedRegionEntered } from '../src/world/travel/closed-border.js';
import { unclimbableAt } from '../src/gameplay/movement/no-climb-zones.js';
import { VARN_CIRCUIT, VARN_PASS_GATE, VARN_AMOD_GATE, VARN_SLABS, SLAB, slabFoot, onLanding, varnWicket,
  varnBeforeLips, lipRib, varnUnclimbable, varnRouteJoinSceneryDelta } from '../src/content/regions/varn/varn-world.js';
const oldGround=(x,z)=>groundWithRiver(x,z)-delta(x,z)-varnRouteJoinSceneryDelta(x,z);

test('central join collars retain the closed retaining rims and leave every fort and slab ground unchanged',t=>{
 const oldUnbuilt=(x,z)=>varnBeforeLips(x,z)-delta(x,z);let changed=0,minimum=Infinity,largest=0;
 const bounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
 for(let x=-1320;x<=-1090;x+=.5)for(let z=-960;z<=-880;z+=.5){
  if(!nearLotharnRouteJoin(x,z,5))continue;
  const before=lipRib(x,z,oldUnbuilt),after=lipRib(x,z);if(Math.abs(after-before)<1e-6)continue;
  changed++;minimum=Math.min(minimum,after);largest=Math.max(largest,Math.abs(after-before));
  bounds.minX=Math.min(bounds.minX,x);bounds.maxX=Math.max(bounds.maxX,x);bounds.minZ=Math.min(bounds.minZ,z);bounds.maxZ=Math.max(bounds.maxZ,z);
  assert.ok(before>.05&&after>.05,`rim admission changed at ${x},${z}`);
  assert.ok(varnUnclimbable(x,z),`changed rim offers a hold at ${x},${z}`);
 }
 assert.ok(changed>0);assert.ok(largest<.35);assert.ok(minimum>.25);
 let barrierRays=0;
 for(const ramp of RAMPS.filter(r=>r.peak==='central-peak'))for(let along=0;along<=ramp.line.length;along+=.5){
  const p=pointOn(ramp.line,along);if(p.z< -958||!nearLotharnRouteJoin(p.x,p.z))continue;
  for(const sign of [-1,1]){let crossesRim=false;for(let d=0;d<=4.38;d+=.12)if(lipRib(p.x+p.nx*d*sign,p.z+p.nz*d*sign,oldUnbuilt)>.05)crossesRim=true;
   // The inner ramp/ledge connector has no retaining rim; opening its old
   // weighted-station step is the intended repair, not an outer barrier bypass.
   if(!crossesRim)continue;
   const exits=heightAt=>{const w={heightAt,regionAt};let prior={x:p.x,z:p.z};for(let d=.06;d<=4.38;d+=.06){const next={x:p.x+p.nx*d*sign,z:p.z+p.nz*d*sign};if(!canWalkSlope(prior.x,prior.z,next.x,next.z,w))return false;prior=next;}return true;};
   if(!exits(oldGround)){assert.equal(exits(groundWithRiver),false,`rim walk opened at ${ramp.id} ${along} side ${sign}`);barrierRays++;}
  }
 }
 // Main circuit and its cliff junctions, and all other pass forts, are far from
 // the collars. Include a 15 m surrounding approach in the exact field check.
 const circuits=[VARN_CIRCUIT,...LOTHARN_FORTS.map(f=>f.circuit),...PASS_CASTLES.map(f=>f.circuit)];let fortSamples=0;
 for(const circuit of circuits){
  const points=circuit.corners;
  const minX=Math.min(...points.map(p=>p.x))-15,maxX=Math.max(...points.map(p=>p.x))+15,minZ=Math.min(...points.map(p=>p.z))-15,maxZ=Math.max(...points.map(p=>p.z))+15;
  for(let x=minX;x<=maxX;x+=2)for(let z=minZ;z<=maxZ;z+=2){assert.equal(groundWithRiver(x,z),oldGround(x,z));fortSamples++;}
 }
 for(const ramp of RAMPS.filter(r=>r.peak!=='central-peak'))for(const p of ramp.line.points)assert.equal(groundWithRiver(p.x,p.z),oldGround(p.x,p.z));
 t.diagnostic(JSON.stringify({changed,minimumRim:minimum,largestRimChange:largest,bounds,fortSamples,barrierRays}));
});

// Build the actual fortress and all its admission colliders on the composed
// terrain, without rebuilding unrelated regional vegetation or a flood lattice.
const {createVarnScenery}=await sourceModule('../src/content/regions/varn/varn-scenery.js');
const root=new THREE.Group(),colliders=[];
createVarnScenery({root,scene:root,colliders,groundHeight:groundWithRiver,material:(color,extra={})=>new THREE.MeshStandardMaterial({color,...extra})});
const world={bounds:WORLD_BOUNDS,heightAt:groundWithRiver,groundHeight:groundWithRiver,regionAt,unclimbableAt,colliders,waterAt:()=>.45,
 nearColliders:()=>colliders};
const permitted=(x,z,nx,nz)=>canWalkSlope(x,z,nx,nz,world)&&!closedRegionEntered({x,z},{x:nx,z:nz});
test('ordinary movement still stops at both closed Varn gates and the inward-only wicket',()=>{
 for(const id of [VARN_PASS_GATE,VARN_AMOD_GATE]){
  const gate=VARN_CIRCUIT.gates.find(g=>g.id===id),starts=[gate.centre];
  if(id===VARN_AMOD_GATE)starts.push(varnWicket());
  for(const p of starts){const at={x:p.x-gate.inward.x*10,z:p.z-gate.inward.z*10};at.y=world.heightAt(at.x,at.z);
   assert.ok(canStand(at.x,at.z,world,.34));
   for(let i=0;i<200;i++){moveCharacter(at,gate.inward.x*.12,gate.inward.z*.12,world,.34,{canTraverse:permitted});at.y=world.heightAt(at.x,at.z);}
   assert.ok(!VARN_CIRCUIT.inside(at.x,at.z),`${id} admitted an outside walker`);
  }
 }
});
test('both Varn slabs retain their real level-17 stamina threshold',t=>{
 for(const slab of VARN_SLABS){const rows=[];
  for(const level of [16,17]){const foot=slabFoot(slab),from={...foot,y:world.heightAt(foot.x,foot.z)},climb=createClimbing({world});let wind=100,seconds=0,damage=0,view;
   assert.ok(climb.grab(from,Math.atan2(0,-slab.dir),{stamina:wind,level}));
   while(climb.active&&seconds<600){view=climb.tick(.05,{up:1,side:0,stamina:wind,level});wind=Math.max(0,wind-view.staminaSpent);damage+=view.damage;seconds+=.05;}
   if(level===17){assert.equal(damage,0);assert.ok(onLanding(view.position.x,view.position.z));assert.ok(wind>1);}
   else{assert.equal(damage,100);assert.ok(Math.abs(view.position.y-SLAB.foot)<2);}
   rows.push({level,wind,damage,seconds});
  }t.diagnostic(JSON.stringify({slab:slab.id,rows}));
 }
});
