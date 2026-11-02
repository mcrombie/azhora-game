import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {canStand,moveCharacter} from '../src/gameplay/movement/locomotion.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createAgricultureLivestock}=await sourceModule('../src/world/life/agriculture-livestock.js');

function fixture(){
  const parent=new THREE.Group(),colliders=[{x:10,z:0,hx:.15,hz:20,minY:0,maxY:4,kind:'fence'}];
  const field={id:'meadow',x:0,z:0,width:40,depth:36};
  const heightAt=(x,z)=>2+.04*x+.06*z,waterAt=(x,z)=>z>12?20:-Infinity;
  const clearAt=(x,z,r)=>Math.abs(x+12)>r+1;
  const positions=Array.from({length:6},(_,i)=>({x:-4+(i%3)*4,z:-5+Math.floor(i/3)*6,seed:i+17}));
  const life=createAgricultureLivestock({parent,colliders,heightAt,waterAt,clearAt,pastures:[{id:'test',field,positions}]});
  const world={heightAt,waterAt,colliders,bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},nearColliders:(x,z,r)=>[colliders[0],...life.nearColliders(x,z,r)]};
  return {parent,life,world,field,clearAt};
}
test('farm sheep graze and walk through shared instance buffers, with bounded draw calls',()=>{
  const {parent,life,world}=fixture(),before=life.state(),meshes=parent.children[0].children;
  assert.equal(before.animals.length,6);assert.equal(meshes.length,3);assert(meshes.every(m=>m.isInstancedMesh));
  const buffers=meshes.map(m=>m.instanceMatrix.array),head=Array.from(buffers[1]);
  for(let i=0;i<500;i++)life.update(.04,{x:0,y:world.heightAt(0,-10),z:-10});
  const after=life.state();assert(after.animals.some((a,i)=>Math.hypot(a.x-before.animals[i].x,a.z-before.animals[i].z)>1));
  assert.notDeepEqual(Array.from(buffers[1]),head);assert(after.animals.some(a=>a.head<.3));assert(after.animals.some(a=>a.head>.9));
  meshes.forEach((m,i)=>{assert.equal(m.instanceMatrix.array,buffers[i]);assert(m.instanceMatrix.array.every(Number.isFinite));});
  assert.equal(after.batches,3);assert(after.updates<=250);life.dispose();
});
test('walking and mounted collision follows sheep, including after they move',()=>{
  const {life,world}=fixture();
  for(let round=0;round<4;round++){
    for(const a of life.state().animals){
      for(const radius of [.34,.62]){
        assert.equal(canStand(a.x,a.z,world,radius),false);
        // Probe along both axes, with a large input split by normal locomotion.
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const p={x:a.x-dx*2.5,z:a.z-dz*2.5};p.y=world.heightAt(p.x,p.z);
          if(!canStand(p.x,p.z,world,radius))continue;
          moveCharacter(p,dx*5,dz*5,world,radius);
          assert((p.x-a.x)*dx+(p.z-a.z)*dz<0,'Cannot tunnel through sheep');
        }
      }
      for(const c of world.colliders.filter(c=>c.animalId===a.id))assert(life.nearColliders(c.x,c.z,.01).includes(c));
    }
    for(let i=0;i<200;i++)life.update(.04,{x:0,y:2,z:-10});
  }
  life.dispose();
});
test('wandering stays on safe pasture, avoids animals and a nearby rider, and grounds each hoof',()=>{
  const {life,world,parent,field,clearAt}=fixture();const player={x:0,y:2,z:-2};
  const matrix=new THREE.Matrix4(),foot=new THREE.Vector3();
  for(let i=0;i<1800;i++){
    life.update(.04,player);const animals=life.state().animals;
    for(const [j,a] of animals.entries()){
      assert(Math.abs(a.x-field.x)<field.width/2-1&&Math.abs(a.z-field.z)<field.depth/2-1);
      assert(clearAt(a.x,a.z,.85));assert(a.x<8.9&&a.z<11.2);assert(Math.hypot(a.x-player.x,a.z-player.z)>=1.65);
      assert.equal(a.y,world.heightAt(a.x,a.z));
      for(const b of animals.slice(j+1))assert(Math.hypot(a.x-b.x,a.z-b.z)>1.4);
      if(i%200===0&&a.speed===0){
        const legs=parent.children[0].children[2];for(let k=0;k<4;k++){
          legs.getMatrixAt(j*4+k,matrix);foot.set(0,0,0).applyMatrix4(matrix);
          assert(Math.abs(foot.y-world.heightAt(foot.x,foot.z))<1e-5,'Resting hoof touches terrain');
        }
      }
    }
  }
  life.dispose();
});
test('hidden, distant and paused flocks sleep without catch-up or loss of solidity; disposal removes only owned bodies',()=>{
  const {life,world,parent}=fixture(),initial=life.state().animals;
  for(let i=0;i<100;i++)life.update(0,{x:0,y:2,z:0});
  parent.visible=false;life.update(100,{x:0,y:2,z:0});parent.visible=true;
  life.update(100,{x:1000,y:2,z:1000});assert.deepEqual(life.state().animals,initial);
  assert.equal(life.state().updates,0);assert.equal(canStand(initial[0].x,initial[0].z,world,.62),false);
  life.update(100,{x:0,y:2,z:0});assert(life.state().animals.every((a,i)=>Math.hypot(a.x-initial[i].x,a.z-initial[i].z)<.15));
  const bodies=world.colliders.length;assert.equal(bodies,13);life.dispose();life.dispose();
  assert.equal(world.colliders.length,1);assert.equal(world.colliders[0].kind,'fence');assert.equal(parent.children.length,0);assert.equal(life.nearColliders(0,0,100).length,0);
});
test('each reviewed region registers living sheep through the shared scenery builder',async()=>{
  const {FARMLAND_REGIONS}=await sourceModule('../src/app/farmland-review/regions.js');
  for(const config of Object.values(FARMLAND_REGIONS)){
    const root=new THREE.Group(),colliders=[];
    const build=config.createScenery({parent:root,heightAt:()=>20,waterAt:()=>-Infinity,colliders});let next;do{next=build.next();}while(!next.done);
    const life=next.value.livestock;assert(life,config.id+' must return its life controller');
    assert.equal(life.state().flocks,config.farms.reduce((n,f)=>n+f.fields.filter(p=>p.crop==='pasture').length,0));
    assert(life.state().animals.length>0);assert.equal(colliders.filter(c=>c.kind==='livestock').length,life.state().animals.length*2);
    life.dispose();root.traverse(o=>o.geometry?.dispose());
  }
});
