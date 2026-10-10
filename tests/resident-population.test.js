import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {residentWords,residentThreat} from '../src/app/exploration/resident-dialogue.js';
import {LIZEEM_RESIDENTS,CORRIDOR_RESIDENTS} from '../src/content/regions/minora-frontier/lizeem-residents.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createMinoraResidents,RESIDENT_BUDGET}=await sourceModule('../src/app/exploration/resident-view.js');
const world={bounds:{minX:-5000,maxX:5000,minZ:-5000,maxZ:5000},readyAt:()=>true,heightAt:()=>2,waterAt:()=>0,nearColliders:()=>[]};
const battle={engagements:[{id:'test',region:'caricas',status:'active'}]};
const player=(x,z)=>new THREE.Vector3(x,2,z);
const tick=(view,p,count=200)=>{for(let i=0;i<count;i++)view.update(i*.1,.1,p);};

test('twelve added residents have individual local and postwar speech without mutating the campaign',()=>{
 assert.equal(CORRIDOR_RESIDENTS.length,12);assert.equal(new Set(LIZEEM_RESIDENTS.map(d=>d.id)).size,18);
 for(const d of LIZEEM_RESIDENTS)for(const state of [{},battle,{winner:'west',engagements:[]},{winner:'east',engagements:[]}]){
  const before=JSON.stringify(state);for(const topic of ['hello','work','war','news'])assert(residentWords(d.id,topic,state)?.length>20,d.id+topic);
  if(state.winner)for(const topic of ['future','memory'])assert(residentWords(d.id,topic,state)?.length>20,d.id+topic);
  assert.equal(JSON.stringify(state),before);
 }
 assert.match(residentWords('egeria','war',{winner:'west'}),/My side lost/);
 assert.match(residentWords('egeria','war',{winner:'east'}),/My side won/);
 assert(!residentThreat(LIZEEM_RESIDENTS[0],battle));assert(residentThreat(CORRIDOR_RESIDENTS.find(d=>d.id==='egeria'),battle));
});

test('a stationary worker turns toward a speaker and returns to the work heading after goodbye',()=>{
 const d=CORRIDOR_RESIDENTS.find(d=>d.id==='nera'),p=player(d.x+3,d.z),view=createMinoraResidents(new THREE.Scene(),world);
 tick(view,p,20);const before=view.state().people.find(r=>r.id===d.id);
 view.setTalking(d.id,p);tick(view,p,60);const talking=view.state().people.find(r=>r.id===d.id);
 assert(Math.abs(talking.yaw-Math.PI/2)<.01);assert.deepEqual(talking.position,before.position);
 view.setTalking(null);tick(view,p,60);const after=view.state().people.find(r=>r.id===d.id);
 assert(Math.abs(after.yaw-d.yaw)<.01);assert.equal(after.phase,'working');assert.deepEqual(after.position,before.position);view.dispose();
});

test('repeated travel evicts rigs and keeps the local cache bounded; rooms and toggle have no contacts',()=>{
 const scene=new THREE.Scene(),view=createMinoraResidents(scene,world);let max=0;
 for(let trip=0;trip<3;trip++)for(const d of LIZEEM_RESIDENTS){
   tick(view,player(d.x,d.z+5),15);max=Math.max(max,view.state().constructed);
   assert(view.state().constructed<=RESIDENT_BUDGET);assert(view.state().people.some(p=>p.id===d.id));
 }
 assert(max>=6);assert(view.state().evictions>15);
 view.update(99,.3,player(0,0));assert.equal(view.state().constructed,0);assert.equal(view.people().length,0);
 tick(view,player(-2350,145),30);view.setEnabled(false);assert.equal(view.people().length,0);assert.equal(view.target(player(-2350,145)),null);
 view.setEnabled(true);view.update(99,.3,player(-2350,145),false);assert.equal(view.people().length,0);
 view.dispose();assert.equal(scene.children.length,0);
});

test('townspeople walk into shelter, stay inside during battle, then return; late arrival starts sheltered',()=>{
 const view=createMinoraResidents(new THREE.Scene(),world),p=player(-2092,290);
 tick(view,p,30);const start=view.state().people.find(d=>d.id==='egeria');assert(start.visible);
 view.setCampaign(battle);tick(view,p,8);assert.equal(view.state().people.find(d=>d.id==='egeria').phase,'seeking-shelter');
 tick(view,p,300);for(const id of ['egeria','consus','ilmarinen']){const d=view.state().people.find(p=>p.id===id);assert.equal(d.phase,'sheltered',id);assert(!d.visible);assert(!view.people().some(p=>p.id===id));}
 view.setCampaign({engagements:[{region:'caricas',status:'resolved'}]});tick(view,p,350);
 assert.equal(view.state().people.find(d=>d.id==='egeria').phase,'working');assert.deepEqual(view.state().people.find(d=>d.id==='egeria').position,start.position);
 view.dispose();const late=createMinoraResidents(new THREE.Scene(),world);late.setCampaign(battle);tick(late,p,20);assert.equal(late.state().people.find(d=>d.id==='egeria').phase,'sheltered');late.dispose();
});

test('a conversation holds its speaker still and validated local walks cannot cross obstructions',()=>{
 const wallWorld={...world,nearColliders:()=>[{x:-2110,z:137,hx:.3,hz:1,minY:0,maxY:6}]};
 const view=createMinoraResidents(new THREE.Scene(),wallWorld),d=CORRIDOR_RESIDENTS.find(d=>d.id==='messor'),p=player(d.x,d.z-4);
 tick(view,p,30);const r=view.state().people.find(p=>p.id===d.id);assert.equal(r.walking,false,'Blocked field route stays at its clear anchor');
 view.setTalking(d.id,p);tick(view,p,300);assert.deepEqual(view.state().people.find(p=>p.id===d.id).position,r.position);view.dispose();
});
