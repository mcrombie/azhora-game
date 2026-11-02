import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {MINORA_CIVIC_RESIDENTS,MINORA_AMBASSADOR_ROUTE} from '../src/content/regions/minora-frontier/minora-civic-residents.js';
import {MENORA_BUILDINGS,MENORA_NPC_ANCHORS,menoraGround,menoraDeckHeight,menoraRiverClearance} from '../src/content/regions/minora-frontier/menora-city.js';
import {residentWords} from '../src/app/exploration/resident-dialogue.js';
import {canStand} from '../src/gameplay/movement/locomotion.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createMenoraScenery}=await sourceModule('../src/content/regions/minora-frontier/menora-scenery.js');
const {createMinoraResidents,RESIDENT_BUDGET}=await sourceModule('../src/app/exploration/resident-view.js');
const colliders=[];
createMenoraScenery({parent:new THREE.Group(),colliders,heightAt:(x,z)=>menoraGround(x,z,21.3)});
const world={bounds:{minX:-5000,maxX:5000,minZ:-5000,maxZ:5000},readyAt:()=>true,
  heightAt:(x,z)=>menoraDeckHeight(x,z)??menoraGround(x,z,21.3),waterAt:(x,z)=>menoraRiverClearance(x,z)<0?21:0,
  nearColliders:(x,z,r)=>colliders.filter(c=>Math.abs(c.x-x)<(c.hx??c.r??0)+r+1&&Math.abs(c.z-z)<(c.hz??c.r??0)+r+1)};
const at=(x,z)=>new THREE.Vector3(x,world.heightAt(x,z),z);
const tick=(view,p,n=20)=>{for(let i=0;i<n;i++)view.update(i*.1,.1,p);};

test('civic representatives have real homes, a lone elf and equal shelter for both leagues',()=>{
  const ids=new Set(MENORA_BUILDINGS.map(b=>b.id));
  for(const d of MINORA_CIVIC_RESIDENTS){if(d.home)assert(ids.has(d.home),d.id+' home');if(d.work)assert(ids.has(d.work),d.id+' work');}
  const elves=MINORA_CIVIC_RESIDENTS.filter(d=>d.look.elven);assert.equal(elves.length,1);assert.equal(elves[0].home,'menora-house-8');
  assert.deepEqual(MINORA_CIVIC_RESIDENTS.filter(d=>d.origin).map(d=>[d.origin,d.home]),[['west','menora-house-1'],['east','menora-house-1']]);
  assert.equal(MINORA_CIVIC_RESIDENTS.filter(d=>d.guard).length,10);
  assert.deepEqual(MINORA_CIVIC_RESIDENTS.filter(d=>d.guard).slice(0,8).map(d=>[d.x,d.z]),MENORA_NPC_ANCHORS.guards.map(p=>[p.x,p.z]));
});

test('every civic anchor and complete closed street routine clears actual city geometry and water',()=>{
  for(const d of MINORA_CIVIC_RESIDENTS){
    assert(canStand(d.x,d.z,world,.42,world.heightAt(d.x,d.z)),d.id+' anchor');
    if(!d.routine)continue;
    for(let i=0;i<d.routine.length;i++){
      const a=d.routine[i],b=d.routine[(i+1)%d.routine.length],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*4);let y=world.heightAt(a.x,a.z);
      for(let j=0;j<=n;j++){
        const x=a.x+(b.x-a.x)*j/n,z=a.z+(b.z-a.z)*j/n,h=world.heightAt(x,z);
        assert(canStand(x,z,world,.42,h),`${d.id} route ${i} at ${x},${z}`);
        assert(Math.abs(h-y)<=.4,`${d.id} step at ${x},${z}`);y=h;
      }
    }
  }
});

test('ambassador walks to all three institutions with bounded rigs and retains position after culling',()=>{
  const scene=new THREE.Scene(),view=createMinoraResidents(scene,world),id='minora-elf-ambassador';
  let p=at(-2358,38);tick(view,p);let r=view.state().people.find(r=>r.id===id);
  assert(r?.routineValid,'Complete routine validated before starting');
  const seen=new Set([r.currentPlace]);let previous=r.position;
  for(let i=0;i<5000&&!['Wizards’ Guild','Shay’s Temple','Mayor’s office'].every(s=>seen.has(s));i++){
    p=at(r.position[0]+8,r.position[2]+6);view.update(i*.1,.1,p);r=view.state().people.find(r=>r.id===id);assert(r);
    assert(Math.hypot(r.position[0]-previous[0],r.position[2]-previous[2])<=.49,'No jump between routine points');
    assert.equal(r.position[1],world.heightAt(r.position[0],r.position[2]));
    assert(view.state().constructed<=RESIDENT_BUDGET);seen.add(r.currentPlace);previous=r.position;
  }
  for(const place of ['Wizards’ Guild','Shay’s Temple','Mayor’s office'])assert(seen.has(place),`Visited ${place}: ${[...seen]}`);
  view.setTalking(id,at(r.position[0]+2,r.position[2]));const before=[...r.position];tick(view,p,30);
  assert.deepEqual(view.state().people.find(r=>r.id===id).position,before,'Conversation stops the diplomat');view.setTalking(null);
  view.update(999,.3,at(0,0));assert.equal(view.state().constructed,0);
  tick(view,at(before[0]+2,before[2]),12);r=view.state().people.find(r=>r.id===id);assert(r);
  assert(Math.hypot(r.position[0]-before[0],r.position[2]-before[2])<2,'Culling retains logical position instead of teleporting home');view.dispose();
});

test('a newly blocked ambassador route stops safely rather than crossing a barrier',()=>{
  let blocked=false;const dynamic={...world,nearColliders:(x,z,r)=>[...world.nearColliders(x,z,r),...(blocked?[{x:-2360,z:42,hx:5,hz:.4,minY:0,maxY:100}]:[])]};
  const view=createMinoraResidents(new THREE.Scene(),dynamic),id='minora-elf-ambassador',p=at(-2351,42);tick(view,p,20);
  assert(view.state().people.find(r=>r.id===id).routineValid);blocked=true;tick(view,p,800);
  const r=view.state().people.find(r=>r.id===id);assert(r.position[2]<41.3);assert(r.position[2]>36);view.dispose();
});

test('watch is visibly equipped and civic speech reveals no secret stores or private doubts',()=>{
  const scene=new THREE.Scene(),view=createMinoraResidents(scene,world),guard=MINORA_CIVIC_RESIDENTS.find(d=>d.guard);
  tick(view,at(guard.x,guard.z+3));assert(scene.getObjectByName('Minora watch: river-green civic tabard'));
  assert(scene.getObjectByName('Ash spear'));
  for(const d of MINORA_CIVIC_RESIDENTS)for(const topic of ['hello','work','war','future']){
    const text=residentWords(d.id,topic,{});assert(text?.length>20,d.id+' '+topic);assert.doesNotMatch(text,/secret reserve|concealed reserve|private doubts/i);
  }
  const context=Object.freeze({reliefText:'There are still beds available for displaced civilians from either league.',supplyText:'The granary is receiving normal supplies.'});
  assert.equal(residentWords('minora-lodging-keeper','news',{},context),context.reliefText);
  assert.equal(residentWords('nepri','news',{},context),context.supplyText);
  for(const winner of ['west','east'])for(const id of ['minora-watch-0','rudiger']){
    assert.match(residentWords(id,'work',{winner}),/High Councilor/);
    assert.doesNotMatch(residentWords(id,'work',{winner}),/Taleth/,'Watch duties remain accurate after either leadership change');
  }
  view.dispose();
});
