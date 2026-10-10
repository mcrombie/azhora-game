import {prepareWarExterior} from './tower-smoke.js';
import {LIZEEM_RESIDENTS} from '../../content/regions/minora-frontier/lizeem-residents.js';
import {residentWords} from '../../app/exploration/resident-dialogue.js';
import {createWorldWar} from '../../app/exploration/world-war.js';
import {localSight} from '../../app/exploration/local-sight.js';
import {FARMSTEADS} from '../../world/scenery/regional-farmland.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const frame=()=>new Promise(r=>requestAnimationFrame(r));
const key=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
const tick=(a,n)=>{for(let i=0;i<n;i++)a.step(.04);};
const state=a=>a.tower.state().residents;
const person=(a,id)=>state(a).people.find(p=>p.id===id);
let baseline,war,foot;

export async function survey(a){
  await prepareWarExterior(a);window.dispatchEvent(new Event('focus'));a.war.pause();baseline=a.war.save();
  const rows=[];
  for(const d of LIZEEM_RESIDENTS){
    await a.visit({x:d.x,z:d.z+5});tick(a,20);const p=person(a,d.id);assert(p,d.id+' constructs');
    const [x,y,z]=p.position;assert(a.groundProbe(x,z).clear,d.id+' stands clear '+JSON.stringify(a.groundProbe(x,z)));
    if(d.shelter&&!p.shelterValid){
      const points=[{x,z},...d.shelter.map(([x,z])=>({x,z}))],probes=[];
      for(let j=1;j<points.length;j++){const from=points[j-1],to=points[j],n=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)*2);for(let i=0;i<=n;i++)probes.push(a.groundProbe(from.x+(to.x-from.x)*i/n,from.z+(to.z-from.z)*i/n));}
      console.log('EXPLORATION_SHELTER_ROUTE '+JSON.stringify({id:d.id,probes}));throw Error(d.id+' has no safe shelter route');
    }
    let at;
    for(const r of [2.4,3,3.5])for(let i=0;i<32&&!at;i++){
      const v={x:x+Math.sin(i*Math.PI/16)*r,z:z+Math.cos(i*Math.PI/16)*r};
      if(a.groundProbe(v.x,v.z).clear&&localSight(a.testWorld,{...v,y:y+1.5},{x,z,y:y+1.5}))at=v;
    }
    assert(at,d.id+' reachable');await a.visit(at);tick(a,10);a.look({yaw:Math.atan2(at.x-x,at.z-z),pitch:.2,distance:6});
    const before=JSON.stringify(a.war.state().campaign);key('KeyF');
    assert(a.residentHost.state().speaking===d.id,'F speaks with '+d.id+'; mode='+a.state().mode);
    assert(document.getElementById('resident-words').textContent===residentWords(d.id,'hello',a.war.state().campaign),d.id+' greeting');
    for(const topic of ['work','war','news']){document.querySelector('#resident-dialog [data-topic="'+topic+'"]').click();assert(document.getElementById('resident-words').textContent===residentWords(d.id,topic,a.war.state().campaign),d.id+' '+topic);}
    const stopped=JSON.stringify(person(a,d.id).position);tick(a,90);assert(JSON.stringify(person(a,d.id).position)===stopped,'Speaker holds position');
    assert(JSON.stringify(a.war.state().campaign)===before,'Conversations leave the war untouched');key('Escape');
    rows.push({id:d.id,position:p.position,walking:p.walking,shelterValid:p.shelterValid});console.log('EXPLORATION_RESIDENT '+JSON.stringify(rows.at(-1)));assert(state(a).constructed<=12,'Cache capped');
  }
  await a.visit({x:-2014,z:313});a.look({yaw:.9,pitch:.28,distance:12});await frame();
  const regionalFarmIds=new Set(FARMSTEADS.map(f=>f.id));
  const farms=[...new Set(a.testWorld.colliders.filter(c=>regionalFarmIds.has(c.farmId)).map(c=>c.farmId))];
  assert(farms.length===5&&farms.every(id=>id.startsWith('caricas-')),'Only the five authored Caricas farms load: '+JSON.stringify(farms));
  return {checks:['All eighteen civilians reachable and talkable with F','All occupations and war topics readable','Conversations hold position and preserve campaign state','Three town shelter routes clear','Twelve-rig cache never exceeded','Existing Caricas farm scenery loads without Feradom or Elagos'],farms,rows,state:state(a)};
}
export async function contact(a){
  window.dispatchEvent(new Event('focus'));const d=LIZEEM_RESIDENTS.find(p=>p.id==='melka');
  await a.visit({x:d.x,z:d.z+4});tick(a,15);const p=person(a,d.id),[x,,z]=p.position;foot={x,z};
  a.testWorld.setResidentTalking(d.id,{x,z:z+4});await a.visit({x,z:z+4});a.look({yaw:0,pitch:.25,distance:8});
  a.hold('KeyW',true);tick(a,60);a.hold('KeyW',false);assert(a.state().position[2]>=z+.98,'On-foot approach stops at civilian');
  a.hold('KeyD',true);tick(a,25);a.hold('KeyD',false);assert(a.state().position[0]>x+1.5,'Player can pass beside civilian');
  await a.visit({x,z:z+4});a.stable.restore({owned:true,taught:true,horse:{x,z:z+4,yaw:Math.PI},version:1});key('KeyG');assert(a.stable.mounted,'Ordinary horse mounted');
  a.look({yaw:0,pitch:.25,distance:8});a.hold('KeyW',true);a.hold('ShiftLeft',true);tick(a,60);a.hold('KeyW',false);a.hold('ShiftLeft',false);
  assert(a.state().position[2]>=z+1.43,'Cantering cannot tunnel through a civilian');a.testWorld.setResidentTalking(null);
  await frame();return {checks:['Walking and cantering cannot pass through civilians','Player can steer around them'],position:a.state().position};
}
export async function town(a){
  await a.visit({x:-2092,z:281});a.war.pause();tick(a,100);a.look({yaw:0,pitch:.32,distance:12});await frame();return {checks:['Peacetime Caricas grain court populated'],residents:state(a)};
}
export async function shelter(a){
  war=createWorldWar();war.advance(3);a.war.restore(war.checkpoint());a.war.pause();
  // Keep this fixture's camera in place without invoking the player's perimeter
  // controller: advance the actual resident renderer with the real campaign.
  for(let i=0;i<1200;i++)a.testWorld.update(i*.04,.04,{x:-2092,y:a.groundProbe(-2092,290).height,z:290});
  for(const id of ['egeria','consus','ilmarinen'])assert(person(a,id)?.phase==='sheltered',id+' went inside '+JSON.stringify(person(a,id)));
  assert(!a.testWorld.residentPeople().some(p=>['egeria','consus','ilmarinen'].includes(p.id)),'Sheltered people have no collision or interaction');
  assert(person(a,'pomona')?.phase==='watchful','Orchard worker waits outside the battlefield');
  await frame();a.renderStats();return {checks:['Battle clears grain court as residents walk to house doors','Sheltered civilians remove contact and dialogue','Farm workers stop their routines during nearby fighting'],residents:state(a)};
}
export async function returned(a){
  war.advance(3);assert(!war.snapshot().engagements.some(b=>b.region==='caricas'&&b.status==='active'),'Fixture battle resolved naturally');a.war.restore(war.checkpoint());a.war.pause();
  for(let i=0;i<1400;i++)a.testWorld.update(i*.04,.04,{x:-2092,y:a.groundProbe(-2092,290).height,z:290});
  for(const id of ['egeria','consus','ilmarinen'])assert(person(a,id)?.phase==='working',id+' returned '+JSON.stringify(person(a,id)));
  await a.visit({x:-2092,z:281});a.look({yaw:0,pitch:.32,distance:12});a.war.restore(baseline);await frame();
  return {checks:['Civilians emerge after the battle and resume work without a region reload'],residents:state(a)};
}
const percentile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)];
async function profile(a,on){
  a.testWorld.setResidents(on);tick(a,20);for(let i=0;i<12;i++)await frame();
  const gaps=[],cpu=[],updates=[];let last=performance.now(),render;
  for(let i=0;i<90;i++){
    await frame();const now=performance.now();gaps.push(now-last);last=now;updates.push(state(a).lastUpdateMs);
  }
  for(let i=0;i<30;i++){render=a.renderStats();cpu.push(render.cpuMs);}
  return {calls:render.calls,triangles:render.triangles,geometries:render.geometries,frameMedianMs:percentile(gaps,.5),frameP95Ms:percentile(gaps,.95),renderCpuMedianMs:percentile(cpu,.5),residentUpdateMedianMs:percentile(updates,.5)};
}
async function movingProfile(a,on,mounted){
  a.testWorld.setResidents(on);await a.visit({x:-2092,z:285});tick(a,30);
  if(mounted){a.stable.restore({owned:true,taught:true,horse:{x:-2092,z:285,yaw:0},version:1});key('KeyG');assert(a.stable.mounted,'Performance sample uses ordinary horse');}
  a.look({yaw:Math.PI,pitch:.25,distance:9});const before=a.state().position;
  const gaps=[],updates=[];let last=performance.now();a.hold('KeyW',true);
  try{for(let i=0;i<45;i++){await frame();const now=performance.now();gaps.push(now-last);last=now;updates.push(state(a).lastUpdateMs);}}finally{a.hold('KeyW',false);}
  const after=a.state().position,distance=Math.hypot(after[0]-before[0],after[2]-before[2]);assert(distance>1,'Moving sample made progress');
  return {frameMedianMs:percentile(gaps,.5),frameP95Ms:percentile(gaps,.95),residentUpdateMedianMs:percentile(updates,.5),distance};
}
export async function performanceCheck(a){
  a.war.restore(baseline);a.war.pause();window.dispatchEvent(new Event('focus'));await a.visit({x:-2365,z:147});tick(a,150);a.look({yaw:Math.PI,pitch:.22,distance:10});
  const off=await profile(a,false),on=await profile(a,true),offAgain=await profile(a,false),onAgain=await profile(a,true);
  assert(on.calls>off.calls&&on.calls-off.calls<=240,'Population draw-call ceiling: '+(on.calls-off.calls));
  const walking={off:await movingProfile(a,false,false),on:await movingProfile(a,true,false),onAgain:await movingProfile(a,true,false),offAgain:await movingProfile(a,false,false)};
  const riding={off:await movingProfile(a,false,true),on:await movingProfile(a,true,true),onAgain:await movingProfile(a,true,true),offAgain:await movingProfile(a,false,true)};a.testWorld.setResidents(true);
  const cache=[];for(let lap=0;lap<2;lap++)for(const p of [{x:-2414,z:65},{x:-2350,z:145},{x:-2254,z:135},{x:-2140,z:160},{x:-2092,z:280},{x:-2014,z:313}]){
    await a.visit(p);tick(a,30);cache.push({lap,at:p,constructed:state(a).constructed,geometries:a.renderStats().geometries});assert(state(a).constructed<=12,'Travel keeps twelve-rig cap');
  }
  assert(!a.state().frameErrors.length,'No population renderer errors');assert(a.save().ok,'Population remains compatible with scenario saving');
  await a.loadSaved();a.war.pause();tick(a,40);assert(person(a,'nera'),'Local civilians reconstruct after Continue');
  assert(!a.state().frameErrors.length,'No errors after reload');await frame();
  return {checks:['Alternating on/off measurements at identical camera','Walking and riding measured in both on/off orders','Incremental population bounded during repeated region travel','Save and reload reconstruct local people','No renderer errors'],off,on,offAgain,onAgain,addedCalls:on.calls-off.calls,walking,riding,cache};
}
export async function conversation(a){
  await a.visit({x:-2014,z:290});tick(a,25);const p=person(a,'pomona');assert(p,'Orchard keeper present');
  const [x,,z]=p.position;await a.visit({x:x+2.5,z});a.look({yaw:.8,pitch:.15,distance:6});tick(a,5);key('KeyF');
  assert(a.residentHost.state().speaking==='pomona','Orchard conversation opens');await frame();return {checks:['Orchard conversation presented with local heading'],position:a.state().position};
}
