import {prepare as prepareMarches,openingWest,laterEast,retreat} from './marching-columns-smoke.js';
import {LIZEEM_BRIDGES,lizeemBridgeDeckHeight} from '../../content/regions/minora-frontier/lizeem-crossings.js';
import {createColumnRoutes,columnGroundClear} from '../../app/exploration/war-column-routes.js';
import {LIZEEM_SCENARIO} from '../../content/scenarios/lizeem.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
const checks=[];
const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);console.log('EXPLORATION_BRIDGE_CHECK '+label);};
const frames=async(n=2)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
export {openingWest,laterEast,retreat};
export async function prepare(a){
  await prepareMarches(a);
  // Complete the ordinary one-click horse gift before moving the test camera.
  for(let i=0;i<100&&document.getElementById('stable-lesson')?.hidden;i++)a.step(.04);
  if(!document.getElementById('stable-lesson')?.hidden)document.getElementById('stable-next').click();
  for(const id of [13,14,17,25])await a.testWorld.prepareRegion(id);
  a.war.pause();return {ready:true};
}
export async function routes(a){
  const world=a.testWorld,planner=createColumnRoutes(world);
  for(const {regions:[from,to]} of LIZEEM_SCENARIO.routes)planner.get(from,to);
  for(let i=0;i<4000&&planner.state().pending.length;i++){
    planner.step({budgetMs:25,maxSteps:1000});
    if(i%10===0)await frames(1);
    if(i%400===0)console.log('EXPLORATION_BRIDGE_ROUTE_PROGRESS '+JSON.stringify(planner.state()));
  }
  assert(!planner.state().pending.length&&!planner.state().failed.length,'All seven links plan against actual scenery and collisions: '+JSON.stringify(planner.state()));
  const result=[];
  for(const {regions:[from,to]} of LIZEEM_SCENARIO.routes){
    const route=planner.get(from,to),reverse=planner.get(to,from);assert(route&&reverse,'Both directions: '+from+' / '+to);
    for(let i=1;i<route.points.length;i++){
      const p=route.points[i-1],q=route.points[i],n=Math.ceil(Math.hypot(q.x-p.x,q.z-p.z));
      for(let j=0;j<=n;j++){const t=j/n,x=p.x+(q.x-p.x)*t,z=p.z+(q.z-p.z)*t;
        if(!columnGroundClear(world,{x,z}))throw Error('Blocked route '+from+' / '+to+' at '+JSON.stringify({x,z,probe:a.groundProbe(x,z)}));
      }
    }
    const bridge=LIZEEM_BRIDGES.find(b=>b.id===`${from}-${to}-bridge`);
    if(bridge){assert(route.points.some(p=>Math.hypot(p.x-bridge.x,p.z-bridge.z)<6),'March uses '+bridge.name);assert(route.points.every(p=>p.z>220),'March stays south of Minora: '+bridge.name);}
    result.push({from,to,length:Math.round(route.length),points:route.points.length});
  }
  return {checks:checks.splice(0),routes:result};
}
async function crossing(a,index){
  const b=LIZEEM_BRIDGES[index],world=a.testWorld;
  for(let x=b.x-b.length/2;x<=b.x+b.length/2;x+=.75){
    for(const dz of [-3,0,3]){
      if(!canStand(x,b.z+dz,world,.65))throw Error('Blocked bridge deck '+index+' / '+x.toFixed(1)+' / '+dz+' '+JSON.stringify(a.groundProbe(x,b.z+dz)));
      if(Math.abs(world.heightAt(x,b.z+dz)-lizeemBridgeDeckHeight(x,b.z+dz))>.03)throw Error('Visible deck and walking height disagree');
    }
  }
  assert(true,'Full deck width and height checked along '+b.name);
  assert(!canStand(b.x,b.z+b.width/2,world,.4),'Parapet prevents walking through the rail');
  assert(world.minimapData({x:b.x,z:b.z},150).mapBridges.some(m=>m.id===b.id),'Minimap has the real bridge span');
  // Ordinary input walks the bank joins and both ramp slopes, in both directions.
  for(const mount of ['foot','horse'])for(const side of [-1,1]){
    await a.visit({x:b.x+side*(b.length/2+2),z:b.z});
    if(!document.getElementById('stable-lesson')?.hidden)document.getElementById('stable-next').click();
    assert(a.selectMount(mount).ok&&a.state().mount.kind===mount,'Crossing starts with the requested mount: '+mount);
    a.war.pause();a.look({yaw:side*Math.PI/2,pitch:.35,distance:12});
    a.hold('KeyW',true);a.hold('ShiftLeft',true);
    try{for(let i=0;i<1200&&side*(a.state().position[0]-b.x)>-b.length/2-2;i++){a.step(.04);if(i%50===0)await frames(1);}}
    finally{a.hold('KeyW',false);a.hold('ShiftLeft',false);}
    assert(side*(a.state().position[0]-b.x)<=-b.length/2-1,'Player crosses both banks: '+b.name+' / '+mount+' / '+side+' '+JSON.stringify(a.state().position));
  }
  a.selectMount('foot');await a.visit({x:b.x,z:b.z});a.war.pause();a.look({yaw:-.5,pitch:.78,distance:220});await frames(5);
  if(!document.getElementById('stable-lesson')?.hidden)document.getElementById('stable-next').click();
  await frames(2);
  assert(!a.state().frameErrors.length,'No rendering errors at '+b.name);
  return {checks:checks.splice(0),bridge:b.name,render:a.renderStats()};
}
export const upper=a=>crossing(a,0);
export const lower=a=>crossing(a,1);
